import { z } from "zod";
import type {
  RustAuditableMetadata,
  RustPackage,
} from "../domain/rust/rustBinary.js";

/** Selected-file admission limit shared with the stable artifact reader. */

const parseDocument = (bytes: Buffer): z.infer<typeof documentSchema> => {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new RustAuditableFormatFailure(
      "malformed",
      "Dependency JSON is not valid UTF-8",
      { cause },
    );
  }
  assertDepth(text);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (cause) {
    throw new RustAuditableFormatFailure(
      "malformed",
      "Dependency section JSON is invalid",
      { cause },
    );
  }
  const version = documentVersionSchema.safeParse(value);
  if (!version.success)
    throw new RustAuditableFormatFailure(
      "malformed",
      "Dependency JSON does not match the format schema",
      { cause: version.error },
    );
  admitGraphExpansion(value);
  // One malformed package must fail before Zod retains an issue for every field.
  rejectMalformedPackages(value);
  const parsed = documentSchema.safeParse(value);
  if (!parsed.success)
    throw new RustAuditableFormatFailure(
      "malformed",
      "Dependency JSON does not match the package schema",
      { cause: parsed.error },
    );
  return parsed.data;
};

// These are lower bounds on the required normalized representation, not
// guessed per-object heap sizes. Count source arrays before Zod clones them,
// normalization builds edge objects, or SCC analysis creates reverse edges.
const MIN_PACKAGE_OUTPUT_BYTES = JSON.stringify({
  name: "a",
  version: "a",
  source: "a",
  kind: null,
  dependencies: [],
  root: true,
}).length;
const MIN_EDGE_OUTPUT_BYTES = JSON.stringify({
  from_index: 0,
  to_index: 0,
}).length;
const admitGraphExpansion = (value: unknown): void => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("packages" in value) ||
    !Array.isArray(value.packages)
  )
    return;
  const packages: readonly unknown[] = value.packages;
  let minimumBytes =
    packages.length * MIN_PACKAGE_OUTPUT_BYTES +
    Math.max(0, packages.length - 1);
  let edges = 0;
  const admit = () => {
    const edgeBytes = edges * MIN_EDGE_OUTPUT_BYTES + Math.max(0, edges - 1);
    if (minimumBytes + edgeBytes > RUST_OUTPUT_BYTES)
      throw new RustAuditableResourceFailure(
        {
          resource: "transport",
          reported_limits: { maximum_output_bytes: RUST_OUTPUT_BYTES },
        },
        "Dependency graph exceeds the complete report byte budget before expansion",
      );
  };
  admit();
  for (const pkg of packages) {
    // Shape and index validity remain owned by documentSchema/rootIndex.
    if (
      typeof pkg !== "object" ||
      pkg === null ||
      !("dependencies" in pkg) ||
      !Array.isArray(pkg.dependencies)
    )
      continue;
    const count = pkg.dependencies.length;
    edges += count;
    minimumBytes += Math.max(0, count * 2 - 1);
    admit();
  }
};

const PACKAGE_FIELDS = new Set([
  "name",
  "version",
  "source",
  "kind",
  "dependencies",
  "root",
]);

const rejectMalformedPackages = (value: unknown): void => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("packages" in value) ||
    !Array.isArray(value.packages)
  )
    return;
  for (const [index, pkg] of value.packages.entries()) {
    if (!packageRecord(pkg))
      throw new RustAuditableFormatFailure(
        "malformed",
        `Dependency package ${String(index)} does not match the package schema`,
      );
  }
};

const packageRecord = (
  pkg: unknown,
): pkg is {
  readonly dependencies?: readonly unknown[];
} => {
  if (typeof pkg !== "object" || pkg === null || Array.isArray(pkg))
    return false;
  const record = pkg as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!PACKAGE_FIELDS.has(key)) return false;
  }
  if (
    !nonEmptyString(record.name) ||
    !nonEmptyString(record.version) ||
    !nonEmptyString(record.source)
  )
    return false;
  if (
    record.kind !== undefined &&
    record.kind !== "runtime" &&
    record.kind !== "build"
  )
    return false;
  if (record.root !== undefined && typeof record.root !== "boolean")
    return false;
  const dependencies = record.dependencies;
  if (dependencies === undefined) return true;
  return (
    Array.isArray(dependencies) &&
    dependencies.every(
      (entry) =>
        typeof entry === "number" && Number.isInteger(entry) && entry >= 0,
    )
  );
};

const nonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const assertDepth = (text: string): void => {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (const char of text) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === "{" || char === "[") {
      depth += 1;
      if (depth > JSON_DEPTH)
        throw new RustAuditableFormatFailure(
          "malformed",
          "Dependency JSON nesting exceeds 32 levels",
        );
    } else if ((char === "}" || char === "]") && depth > 0) depth -= 1;
  }
};

const normalizePackages = (
  packages: z.infer<typeof documentSchema>["packages"],
): RustPackage[] =>
  packages.map((pkg) => ({
    name: pkg.name,
    version: pkg.version,
    source: pkg.source,
    kind: pkg.kind ?? null,
    dependencies: pkg.dependencies ?? [],
    root: pkg.root ?? false,
  }));

const rootIndex = (packages: readonly RustPackage[]): number | null => {
  const roots = packages.flatMap((pkg, index) => (pkg.root ? [index] : []));
  if (roots.length > 1)
    throw new RustAuditableFormatFailure(
      "malformed",
      "Dependency JSON declares more than one root package",
    );
  for (const [index, pkg] of packages.entries()) {
    const outside = pkg.dependencies.find(
      (target) => target >= packages.length,
    );
    if (outside !== undefined)
      throw new RustAuditableFormatFailure(
        "malformed",
        `Dependency index ${String(outside)} from package ${String(index)} is outside the package list`,
      );
  }
  return roots[0] ?? null;
};
