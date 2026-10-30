import { createHash } from "node:crypto";
import { open } from "node:fs/promises";
import { z } from "zod";
import { AnalysisResourceConstraintError } from "../../domain/analysisErrorCore.js";

import type { JavaScriptArtifactFile } from "../../domain/javascript/javascriptArtifactFiles.js";
import type { JavaScriptModuleSemanticIr } from "../../domain/javascript/javascriptModuleSemanticIr.js";
import type { JavaScriptSemanticFileProjection } from "../../domain/javascript/javascriptSemanticFileProjection.js";
import { digestSchema } from "../../domain/digests.js";
import {
  javaScriptWorkerGraphRecordSchema,
  javaScriptWorkerModuleHeaderSchema,
  javaScriptWorkerModuleRecordSchema,
  javaScriptWorkerProjectionHeaderSchema,
} from "./JavaScriptAnalysisWorkerSchemas.js";

// Budgets bound transfer representation, independently of source length.
/** Record bound whose transient decoding expansion is reserved by the consumer. */
export const JAVASCRIPT_ANALYSIS_TRANSFER_RECORD_BYTES = 8 * 1024 * 1024;
const FRAME_BYTES = JAVASCRIPT_ANALYSIS_TRANSFER_RECORD_BYTES;
const TRANSFER_BYTES = 512 * 1024 * 1024;
const MAX_TRANSFER_BYTES = 2 * 1024 * 1024 * 1024;
const BATCH_BYTES = 1024 * 1024;
const recordSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("projection-header"),
    value: javaScriptWorkerProjectionHeaderSchema,
  }),
  z.strictObject({
    kind: z.literal("module-header"),
    value: javaScriptWorkerModuleHeaderSchema,
  }),
  ...javaScriptWorkerGraphRecordSchema.options,
  ...javaScriptWorkerModuleRecordSchema.options,
]);

/** Complete-file coordinates authenticated before adopting any worker facts. */
export const javaScriptAnalysisTransferDescriptorSchema = z.strictObject({
  bytes: z.number().int().nonnegative().max(MAX_TRANSFER_BYTES),
  sha256: digestSchema,
  records: z.number().int().nonnegative(),
  module_bytes: z.number().int().nonnegative(),
  module_records: z.number().int().nonnegative(),
  graph_bytes: z.number().int().nonnegative(),
  graph_records: z.number().int().nonnegative(),
});
type Descriptor = z.output<typeof javaScriptAnalysisTransferDescriptorSchema>;

/** Conservative retained-object and sealing expansion for validated transfer rows. */
export const javaScriptTransferRetentionBytes = (
  bytes: number,
  records: number,
): number => bytes * 8 + records * 64;

/** Larger streamed files require corresponding parent admission capacity. */
export const javaScriptTransferByteBudget = (
  resultBudgetBytes: number,
): number =>
  Math.min(
    MAX_TRANSFER_BYTES,
    Math.max(TRANSFER_BYTES, Math.floor(resultBudgetBytes / 8)),
  );

const assertTransferByteBudget = (transferBytes: number): void => {
  if (
    !Number.isSafeInteger(transferBytes) ||
    transferBytes < 1 ||
    transferBytes > MAX_TRANSFER_BYTES
  )
    throw new RangeError(
      "JavaScript transfer requires a valid complete-file byte budget",
    );
};

const encodeTransferRecord = (
  input: unknown,
  previousBytes: number,
  transferBytes = TRANSFER_BYTES,
) => {
  const record = recordSchema.parse(input);
  const line = `${JSON.stringify(record)}\n`;
  const size = Buffer.byteLength(line);
  if (size > FRAME_BYTES || previousBytes + size > transferBytes)
    throw new AnalysisResourceConstraintError(
      "analyze_javascript_application",
      "transport",
      size > FRAME_BYTES
        ? "A complete JavaScript fact exceeds the transfer record byte budget"
        : "Complete JavaScript file facts exceed the transfer byte budget",
      {
        transfer_record_bytes: FRAME_BYTES,
        transfer_file_bytes: transferBytes,
        record_bytes: size,
        transfer_bytes_at_least: previousBytes + size,
      },
    );
  return { line, size, kind: record.kind };
};

function* moduleTransferRecords(
  module: JavaScriptModuleSemanticIr,
): Generator<unknown> {
  yield {
    kind: "module-header",
    value: { coverage: module.coverage, limitations: module.limitations },
  };
  for (const value of module.scopes) yield { kind: "scope", value };
  for (const value of module.bindings) yield { kind: "binding", value };
  for (const value of module.callables) yield { kind: "callable", value };
  for (const value of module.moduleLinks) yield { kind: "module-link", value };
}

/** Measure actual validated module rows before allocating an unadmittable graph. */
export const measureJavaScriptModuleTransfer = (
  module: JavaScriptModuleSemanticIr,
  transferBytes = TRANSFER_BYTES,
) => {
  assertTransferByteBudget(transferBytes);
  let bytes = 0;
  let records = 0;
  for (const record of moduleTransferRecords(module)) {
    bytes += encodeTransferRecord(record, bytes, transferBytes).size;
    records += 1;
  }
  return {
    bytes,
    records,
    retentionBytes: javaScriptTransferRetentionBytes(bytes, records),
  };
};

/** Encode validated facts in bounded records, without serializing a whole graph or IR. */
export const writeJavaScriptAnalysisTransfer = async (
  path: string,
  module: JavaScriptModuleSemanticIr,
  projection: JavaScriptSemanticFileProjection,
  transferBytes = TRANSFER_BYTES,
): Promise<Descriptor> => {
  assertTransferByteBudget(transferBytes);
  const output = await open(path, "wx", 0o600);
  const digest = createHash("sha256");
  let bytes = 0;
  let records = 0;
  let moduleBytes = 0;
  let moduleRecords = 0;
  let graphBytes = 0;
  let graphRecords = 0;
  let batch: string[] = [];
  let batchBytes = 0;
  const flush = async (): Promise<void> => {
    if (batch.length === 0) return;
    const buffer = Buffer.from(batch.join(""));
    // FileHandle.write can be short; writeFile completes the buffer.
    await output.writeFile(buffer);
    digest.update(buffer);
    batch = [];
    batchBytes = 0;
  };
  const append = async (input: unknown): Promise<void> => {
    const { line, size, kind } = encodeTransferRecord(
      input,
      bytes,
      transferBytes,
    );
    bytes += size;
    records += 1;
    if (
      ["module-header", "scope", "binding", "callable", "module-link"].includes(
        kind,
      )
    ) {
      moduleBytes += size;
      moduleRecords += 1;
    } else {
      graphBytes += size;
      graphRecords += 1;
    }
    batch.push(line);
    batchBytes += size;
    if (batchBytes >= BATCH_BYTES) await flush();
  };
  try {
    await append({
      kind: "projection-header",
      value: { roots: projection.roots, truncated: projection.truncated },
    });
    for (const record of moduleTransferRecords(module)) await append(record);
    for (const value of projection.evidenceContexts)
      await append({ kind: "evidence-context", value });
    for (const value of projection.nodes) await append({ kind: "node", value });
    for (const value of projection.relations)
      await append({ kind: "relation", value });
    for (const value of projection.unknowns)
      await append({ kind: "unknown", value });
    for (const value of projection.fingerprints)
      await append({ kind: "fingerprint", value });
    await flush();
    return {
      bytes,
      sha256: digest.digest("hex"),
      records,
      module_bytes: moduleBytes,
      module_records: moduleRecords,
      graph_bytes: graphBytes,
      graph_records: graphRecords,
    };
  } finally {
    await output.close();
  }
};

/** Decode producer records into realm-local, source-bound facts; sealing follows in the consumer. */
export function readJavaScriptAnalysisTransfer(
  path: string,
  descriptor: Descriptor,
  source: Pick<JavaScriptArtifactFile, "path" | "sha256">,
  signal?: AbortSignal,
): Promise<{
  readonly module: JavaScriptModuleSemanticIr;
  readonly projection: JavaScriptSemanticFileProjection;
}>;
/** Validate the transfer while retaining only module facts when graph admission fails. */
