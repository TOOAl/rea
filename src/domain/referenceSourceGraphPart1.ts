export const __stub = 1;
// import { posix } from "node:path";
//
// import { z } from "zod";
//
// import { canonicalJson } from "./comparisonSemantics.js";
// import { digestCanonicalValue } from "./canonicalDigest.js";
// import {
//   createReferenceSourcePathLookup,
//   isPortableAbsoluteReferenceTarget,
// } from "./referenceSourcePathIdentity.js";
// import { compareUnicodeCodePoints } from "./unicodeCodePointOrder.js";
// import { digestSchema } from "./../domain/digests.js";
// import { prefixedDigestSchema } from "./../domain/digests.js";
// const boundedTextSchema = z.string().min(1);
// const relativePathSchema = z
//   .string()
//   .min(1)
//   .refine(
//     (path) =>
//       !path.startsWith("/") &&
//       !path.includes("\0") &&
//       path
//         .split("/")
//         .every((part) => part !== "" && part !== "." && part !== ".."),
//     "Expected a normalized relative POSIX path without traversal",
//   );
//
// const classificationSchema = z.enum([
//   "source",
//   "test",
//   "config",
//   "manifest",
//   "generated",
//   "vendor",
//   "documentation",
//   "unknown",
// ]);
//
// const entryBaseShape = {
//   path: relativePathSchema,
//   classifications: z.array(classificationSchema).min(1),
//   limitations: z.array(boundedTextSchema),
// };
//
// const sourceFileBaseShape = {
//   ...entryBaseShape,
//   kind: z.literal("file"),
//   language: z.string().min(1).nullable(),
// };
//
// const sourceFileSchema = z.union([
//   z.strictObject({
//     ...sourceFileBaseShape,
//     sha256: digestSchema,
//     size: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
//     content_state: z.literal("hashed"),
//   }),
//   z.strictObject({
//     ...sourceFileBaseShape,
//     sha256: z.null(),
//     size: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable(),
//     content_state: z.enum([
//       "redacted-secret",
//       "excluded",
//       "unreadable",
//       "unknown",
//     ]),
//   }),
// ]);
//
// const sourceDirectorySchema = z.strictObject({
//   ...entryBaseShape,
//   kind: z.literal("directory"),
//   tree_state: z.enum([
//     "enumerated",
//     "partial",
//     "excluded",
//     "unreadable",
//     "unknown",
//   ]),
// });
//
// const symlinkTargetSchema = z
//   .string()
//   .min(1)
//   .refine(
//     (target) =>
//       !target.includes("\0") &&
//       (isPortableAbsoluteReferenceTarget(target) ||
//         (!target.startsWith("/") && posix.normalize(target) === target)),
//     "Expected a normalized POSIX symlink target",
//   );
//
// const sourceSymlinkSchema = z.union([
//   z.strictObject({
//     ...entryBaseShape,
//     kind: z.literal("symlink"),
//     target: symlinkTargetSchema,
//     target_state: z.enum(["internal", "external", "missing"]),
//   }),
//   z.strictObject({
//     ...entryBaseShape,
//     kind: z.literal("symlink"),
//     target: z.null(),
//     target_state: z.enum(["unreadable", "unknown"]),
//   }),
// ]);
//
// const sourceEntrySchema = z.union([
//   sourceFileSchema,
//   sourceDirectorySchema,
//   sourceSymlinkSchema,
//   z.strictObject({
//     ...entryBaseShape,
//     kind: z.literal("unknown"),
//   }),
// ]);
//
// const sourceRelationshipSchema = z.strictObject({
//   from_path: relativePathSchema,
//   to: z.string().min(1),
//   kind: z.enum(["imports", "requires", "references", "declares-module"]),
//   resolution: z.enum(["internal", "external", "unresolved", "unknown"]),
//   parse_state: z.enum(["parsed", "partial", "unknown"]),
// });
//
// const parseFailureSchema = z.strictObject({
//   path: relativePathSchema,
//   parser: z.string().min(1),
//   reason: boundedTextSchema,
// });
//
// const exclusionSchema = z.discriminatedUnion("reason", [
//   z.strictObject({
//     path: relativePathSchema,
//     entry_kind: z
//       .enum(["file", "directory", "symlink", "other", "unknown"])
//       .exactOptional(),
//     reason: z.enum([
//       "configured-secret",
//       "project-ignored",
//       "default-ignored",
//       "caller-excluded",
//     ]),
//     pattern: boundedTextSchema,
//   }),
//   z.strictObject({
//     path: relativePathSchema,
//     entry_kind: z
//       .enum(["file", "directory", "symlink", "other", "unknown"])
export const _l = 150;
