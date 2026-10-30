import { deflateSync, inflateSync } from "node:zlib";
import { z } from "zod";
import {
  cyclicDependencyIndices,
  type RustAuditableMetadata,
} from "../domain/rust/rustBinary.js";

/** Selected-file admission limit shared with the stable artifact reader. */
export const RUST_BINARY_INPUT_BYTES = 256 * 1024 * 1024;
/** Compressed `.dep-v0` section limit. */
export const RUST_SECTION_BYTES = 1024 * 1024;
/** Inflated JSON may grow by at most this multiple of the section size. */
export const RUST_INFLATE_RATIO = 64;
/** Absolute inflated JSON limit, applied together with the ratio. */
export const RUST_UNCOMPRESSED_BYTES = 8 * 1024 * 1024;
/** Complete normalized report limit. */
export const RUST_OUTPUT_BYTES = 8 * 1024 * 1024;

const JSON_DEPTH = 32;
const packageSchema = z.strictObject({
  name: z.string().min(1),
  version: z.string().min(1),
  source: z.string().min(1),
  kind: z.enum(["runtime", "build"]).optional(),
  dependencies: z.array(z.number().int().nonnegative()).optional(),
  root: z.boolean().optional(),
});
const documentVersionSchema = z.object({
  format: z.number().int().nonnegative().max(0xffff_ffff).optional(),
});
const documentSchema = documentVersionSchema
  .extend({
    packages: z.array(packageSchema),
  })
  .strict();

/** Malformed or unsupported dependency-section bytes. */
export class RustAuditableFormatFailure extends Error {
  constructor(
    readonly kind: "malformed" | "unsupported",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "RustAuditableFormatFailure";
  }
}

/** A resource admission limit with explicit semantic units. */
export type RustAuditableConstraint =
  | {
      readonly resource: "memory";
      readonly reported_limits: { readonly maximum_bytes: number };
    }
  | {
      readonly resource: "transport";
      readonly reported_limits: { readonly maximum_output_bytes: number };
    }
  | {
      readonly resource: "capacity";
      readonly reported_limits: { readonly maximum_rustc_hashes: number };
    };

/** Admission refused before retained output or graph expansion. */
export class RustAuditableResourceFailure extends Error {
  constructor(
    readonly constraint: RustAuditableConstraint,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "RustAuditableResourceFailure";
  }
}

/** Parsed section payload. Cycles are listed and are not walked. */
export const readAuditableSection = (
  sectionName: RustAuditableMetadata["section_name"],
  fileOffset: number,
  bytes: Buffer,
): RustAuditableMetadata => {
  if (bytes.length === 0)
    throw new RustAuditableFormatFailure(
      "malformed",
      "Dependency section is empty",
    );
  if (bytes.length > RUST_SECTION_BYTES)
    throw new RustAuditableResourceFailure(
      {
        resource: "memory",
        reported_limits: { maximum_bytes: RUST_SECTION_BYTES },
      },
      "Dependency section exceeds the 1 MiB compressed limit",
    );
  const inflated = inflateSection(bytes);
  const document = parseDocument(inflated);
  const packages = normalizePackages(document.packages);
  const root = rootIndex(packages);
  return {
    section_name: sectionName,
    file_offset: fileOffset,
    section_bytes: bytes.length,
    compressed_bytes: bytes.length,
    uncompressed_bytes: inflated.length,
    format_version: document.format ?? null,
    packages,
    root_package_index: root,
    dependency_edges: packages.flatMap((pkg, fromIndex) =>
      pkg.dependencies.map((toIndex) => ({
        from_index: fromIndex,
        to_index: toIndex,
      })),
    ),
    cyclic_dependency_indices: cyclicDependencyIndices(packages),
  };
};

const inflateSection = (bytes: Buffer): Buffer => {
  const maximum = Math.min(
    RUST_UNCOMPRESSED_BYTES,
    bytes.length * RUST_INFLATE_RATIO,
  );
  try {
    const inflated = inflateSync(bytes, {
      maxOutputLength: maximum,
      ...(rejectsTrailingJunk() ? { rejectGarbageAfterEnd: true } : {}),
    });
    if (
      !rejectsTrailingJunk() &&
      shortestPrefix(bytes, inflated, maximum) !== bytes.length
    )
      throw new RustAuditableFormatFailure(
        "malformed",
        "Dependency section has bytes after the zlib stream",
      );
    return inflated;
  } catch (cause) {
    if (cause instanceof RustAuditableFormatFailure) throw cause;
    throw inflateFailure(cause, maximum);
  }
};

let trailingJunkRejected: boolean | undefined;

const rejectsTrailingJunk = (): boolean => {
  if (trailingJunkRejected !== undefined) return trailingJunkRejected;
  const trailed = Buffer.concat([
    deflateSync(Buffer.from("a")),
    Buffer.from([0]),
  ]);
  try {
    inflateSync(trailed, { rejectGarbageAfterEnd: true });
    trailingJunkRejected = false;
  } catch (cause) {
    trailingJunkRejected =
      cause instanceof Error &&
      "code" in cause &&
      cause.code === "ERR_TRAILING_JUNK_AFTER_STREAM_END";
  }
  return trailingJunkRejected;
};

const shortestPrefix = (
  input: Buffer,
  output: Buffer,
  maximum: number,
): number => {
  let low = 0;
  let high = input.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (prefixMatches(input.subarray(0, mid), output, maximum)) high = mid;
    else low = mid + 1;
  }
  return high;
};

const prefixMatches = (
  prefix: Buffer,
  output: Buffer,
  maximum: number,
): boolean => {
  try {
    return inflateSync(prefix, { maxOutputLength: maximum }).equals(output);
  } catch {
    return false;
  }
};

const inflateFailure = (cause: unknown, maximum: number): Error => {
  const code =
    cause instanceof Error && "code" in cause ? String(cause.code) : "";
  if (code === "ERR_BUFFER_TOO_LARGE")
    return new RustAuditableResourceFailure(
      { resource: "memory", reported_limits: { maximum_bytes: maximum } },
      "Inflated dependency JSON exceeds the size limit",
    );
  if (
    code === "ERR_TRAILING_JUNK_AFTER_STREAM_END" ||
    code.startsWith("Z_") ||
    code === "ERR_INVALID_ARG_TYPE"
  )
    return new RustAuditableFormatFailure(
      "malformed",
      "Dependency section is not a complete zlib stream",
    );
  return cause instanceof Error ? cause : new Error(String(cause));
};
