import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { z } from "zod";

import type { JavaScriptArtifactFile } from "../../domain/javascript/javascriptArtifactFiles.js";
import type { JavaScriptModuleSemanticIr } from "../../domain/javascript/javascriptModuleSemanticIr.js";
import type { JavaScriptSemanticFileProjection } from "../../domain/javascript/javascriptSemanticFileProjection.js";
import {
  javaScriptWorkerModuleHeaderSchema,
  javaScriptWorkerProjectionHeaderSchema,
} from "./JavaScriptAnalysisWorkerSchemas.js";

// Budgets bound transfer representation, independently of source length.
/** Record bound whose transient decoding expansion is reserved by the consumer. */

export function readJavaScriptAnalysisTransfer(
  path: string,
  descriptor: Descriptor,
  source: Pick<JavaScriptArtifactFile, "path" | "sha256">,
  signal: AbortSignal | undefined,
  retainGraph: boolean,
): Promise<{
  readonly module: JavaScriptModuleSemanticIr;
  readonly projection: JavaScriptSemanticFileProjection | null;
}>;
export async function readJavaScriptAnalysisTransfer(
  path: string,
  descriptor: Descriptor,
  source: Pick<JavaScriptArtifactFile, "path" | "sha256">,
  signal?: AbortSignal,
  retainGraph = true,
): Promise<{
  readonly module: JavaScriptModuleSemanticIr;
  readonly projection: JavaScriptSemanticFileProjection | null;
}> {
  const expected = javaScriptAnalysisTransferDescriptorSchema.parse(descriptor);
  if ((await stat(path)).size !== expected.bytes)
    throw new TypeError(
      "JavaScript analysis transfer byte count does not match",
    );
  const scopes: JavaScriptModuleSemanticIr["scopes"][number][] = [];
  const bindings: JavaScriptModuleSemanticIr["bindings"][number][] = [];
  const callables: JavaScriptModuleSemanticIr["callables"][number][] = [];
  const moduleLinks: JavaScriptModuleSemanticIr["moduleLinks"][number][] = [];
  const evidenceContexts: JavaScriptSemanticFileProjection["evidenceContexts"][number][] =
    [];
  const nodes: JavaScriptSemanticFileProjection["nodes"][number][] = [];
  const relations: JavaScriptSemanticFileProjection["relations"][number][] = [];
  const unknowns: JavaScriptSemanticFileProjection["unknowns"][number][] = [];
  const fingerprints: JavaScriptSemanticFileProjection["fingerprints"][number][] =
    [];
  let projectionHeader:
    | z.output<typeof javaScriptWorkerProjectionHeaderSchema>
    | undefined;
  let moduleHeader:
    | z.output<typeof javaScriptWorkerModuleHeaderSchema>
    | undefined;
  const identities = new Map<string, Set<string>>();
  const retainIdentity = (kind: string, identifier: string): void => {
    let seen = identities.get(kind);
    if (seen === undefined) {
      seen = new Set();
      identities.set(kind, seen);
    }
    if (seen.has(identifier))
      throw new TypeError(
        `Duplicate JavaScript transfer ${kind} identity: ${identifier}`,
      );
    seen.add(identifier);
  };
  let records = 0;
  let moduleBytes = 0;
  let moduleRecords = 0;
  let graphBytes = 0;
  let graphRecords = 0;
  const digest = createHash("sha256");
  const stream = createReadStream(path, {
    highWaterMark: 64 * 1024,
    ...(signal === undefined ? {} : { signal }),
  });
  let bytes = 0;
  let pending = "";
  stream.setEncoding("utf8");
  try {
    for await (const chunk of stream) {
      signal?.throwIfAborted();
      if (typeof chunk !== "string")
        throw new TypeError("JavaScript transfer stream is not UTF-8 text");
      bytes += Buffer.byteLength(chunk);
      if (bytes > expected.bytes)
        throw new RangeError("JavaScript transfer grew while being read");
      digest.update(chunk);
      pending += chunk;
      let newline: number;
      while ((newline = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, newline);
        pending = pending.slice(newline + 1);
        if (Buffer.byteLength(line) + 1 > FRAME_BYTES)
          throw new RangeError(
            "JavaScript transfer record exceeds its byte budget",
          );
        const input: unknown = JSON.parse(line);
        const record = recordSchema.parse(input);
        if (
          [
            "module-header",
            "scope",
            "binding",
            "callable",
            "module-link",
          ].includes(record.kind)
        ) {
          moduleBytes += Buffer.byteLength(line) + 1;
          moduleRecords += 1;
        } else {
          graphBytes += Buffer.byteLength(line) + 1;
          graphRecords += 1;
        }
        if (record.kind === "projection-header") {
          if (records !== 0 || projectionHeader !== undefined)
            throw new TypeError(
              "Duplicate or late JavaScript projection header",
            );
          projectionHeader = record.value;
        } else if (record.kind === "module-header") {
          if (records !== 1 || moduleHeader !== undefined)
            throw new TypeError("Duplicate or late JavaScript module header");
          moduleHeader = record.value;
        } else {
          if (projectionHeader === undefined || moduleHeader === undefined)
            throw new TypeError(
              "JavaScript transfer facts precede their headers",
            );
          if (
            !retainGraph &&
            [
              "evidence-context",
              "node",
              "relation",
              "unknown",
              "fingerprint",
            ].includes(record.kind)
          ) {
            if (
              record.kind === "node" &&
              (record.value.identity.artifact_sha256 !== source.sha256 ||
                record.value.identity.module_path !== source.path)
            )
              throw new TypeError(
                "JavaScript transfer node belongs to a different artifact source",
              );
            records += 1;
            continue;
          }
          switch (record.kind) {
            case "scope":
              retainIdentity(record.kind, record.value.scopeId);
              scopes.push(record.value);
              break;
            case "binding":
              retainIdentity(record.kind, record.value.bindingId);
              bindings.push(record.value);
              break;
            case "callable":
              retainIdentity(record.kind, record.value.callableId);
              callables.push(record.value);
              break;
            case "module-link":
              moduleLinks.push(record.value);
              break;
            case "evidence-context":
              retainIdentity(record.kind, record.value.context_id);
              evidenceContexts.push(record.value);
              break;
            case "node": {
              retainIdentity(record.kind, record.value.node_id);
              if (
                record.value.identity.artifact_sha256 !== source.sha256 ||
                record.value.identity.module_path !== source.path
              )
                throw new TypeError(
                  "JavaScript transfer node belongs to a different artifact source",
                );
              nodes.push(record.value);
              break;
            }
            case "relation":
              retainIdentity(record.kind, record.value.relation_id);
              relations.push(record.value);
              break;
            case "unknown":
              retainIdentity(record.kind, record.value.unknown_id);
              unknowns.push(record.value);
              break;
            case "fingerprint":
              retainIdentity(record.kind, record.value.fingerprint_id);
              fingerprints.push(record.value);
              break;
          }
        }
        records += 1;
      }
      if (Buffer.byteLength(pending) + 1 > FRAME_BYTES)
        throw new RangeError(
          "Unterminated JavaScript transfer record exceeds its byte budget",
        );
    }
  } finally {
    stream.destroy();
  }
  if (
    pending !== "" ||
    records !== expected.records ||
    bytes !== expected.bytes ||
    moduleBytes !== expected.module_bytes ||
    moduleRecords !== expected.module_records ||
    graphBytes !== expected.graph_bytes ||
    graphRecords !== expected.graph_records ||
    digest.digest("hex") !== expected.sha256
  )
    throw new TypeError(
      "JavaScript analysis transfer is incomplete or its digest does not match",
    );
  if (projectionHeader === undefined || moduleHeader === undefined)
    throw new TypeError("JavaScript analysis transfer is missing its headers");
  return {
    module: { ...moduleHeader, scopes, bindings, callables, moduleLinks },
    projection: retainGraph
      ? {
          ...projectionHeader,
          evidenceContexts,
          nodes,
          relations,
          unknowns,
          fingerprints,
        }
      : null,
  };
}
