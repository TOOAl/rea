export const __stub = 1;
// import { createHash } from "node:crypto";
//
// import canonicalize from "canonicalize";
// import { z } from "zod";
//
// import {
//   compareUnicodeCodePoints,
//   compositeKey,
// } from "./unicodeCodePointOrder.js";
// import { localPathStringSchema } from "./localPath.js";
//
// import {
//   analysisProfileSchema,
//   analysisProfilesEqual,
//   committedProviderSchema,
//   type AnalysisProfileCommitment,
// } from "./analysisProfile.js";
// import {
//   BINARY_ARCHITECTURES,
//   type BinaryTarget,
// } from "./binaryTargetTypes.js";
// import {
//   evidenceBundleForTarget,
//   evidenceBundleSchema,
//   parseEvidenceBundle,
//   parseImmutableEvidenceBundle,
// } from "./evidenceBundle.js";
// import {
//   evidenceLocationSchema,
//   rebindEvidenceToTargetPath,
//   type Evidence,
//   type EvidenceLocation,
//   type EvidenceSubjectTarget,
// } from "./evidence.js";
// import {
//   jsonObjectSchema,
//   jsonValueSchema,
//   type JsonValue,
// } from "./jsonValue.js";
// import { digestSchema } from "./../domain/digests.js";
// import { prefixedDigestSchema } from "./../domain/digests.js";
// import { canonicalJsonDigestSteps } from "./canonicalJsonDigestSteps.js";
// import { freezeJsonSnapshot } from "./immutableJson.js";
// import {
//   binaryArchitectureSchema,
//   rawBinaryEntryPointSchema,
// } from "./rawBinary.js";
// import {
//   relationshipCoverageSchema,
//   type RelationshipCoverage,
// } from "./relationshipCoverage.js";
//
// const architectureSchema = z.enum(BINARY_ARCHITECTURES);
// const formatSchema = z.enum([
//   "analysis-database",
//   "mach-o",
//   "mach-o-universal",
//   "elf",
//   "pe",
//   "dos-mz",
//   "dos-com",
//   "raw-binary",
//   "zip",
//   "ipa",
//   "apk",
//   "msix",
//   "appx",
//   "hap",
//   "hsp",
//   "app-pack",
//   "asar",
//   "dmg",
//   "pkg",
//   "plist",
//   "javascript",
//   "source-map",
// ]);
// const kindSchema = z.enum(["executable", "database", "archive", "artifact"]);
// const subjectBaseSchema = z.object({
//   path: localPathStringSchema,
//   sha256: digestSchema,
// });
// const subjectFormatSchema = z.enum([
//   ...formatSchema.options,
//   "hopper",
//   "directory",
//   "file",
//   "unknown",
//   "javascript-bundle",
//   "entitlements",
// ]);
// // Snapshot entries retain the same raw-only architecture boundary as targets.
// const subjectSchema = z.discriminatedUnion("format", [
//   subjectBaseSchema.extend({
//     format: subjectFormatSchema.exclude(["raw-binary"]),
//     architecture: architectureSchema.exclude(["6502"]).nullable(),
//   }),
//   subjectBaseSchema.extend({
//     format: z.literal("raw-binary"),
//     architecture: architectureSchema.nullable(),
//   }),
// ]);
// const targetIdentitySchema = z.object({
//   sha256: digestSchema,
//   kind: kindSchema,
//   architecture: architectureSchema.nullable(),
// });
// const targetSchema = z.discriminatedUnion("format", [
//   targetIdentitySchema.extend({
//     format: z.enum(
//       formatSchema.options.filter((format) => format !== "raw-binary"),
//     ),
//     architecture: architectureSchema.exclude(["6502"]).nullable(),
//   }),
//   targetIdentitySchema.extend({
//     format: z.literal("raw-binary"),
//     kind: z.literal("executable"),
//     architecture: binaryArchitectureSchema,
//     entry_point: rawBinaryEntryPointSchema,
//   }),
// ]);
// const bindingSchema = z
//   .object({
//     provider: committedProviderSchema,
//     analysis_profile: analysisProfileSchema,
//   })
//   .superRefine((binding, context) => {
//     if (
//       binding.provider.id !== binding.analysis_profile.provider.id ||
//       binding.provider.name !== binding.analysis_profile.provider.name ||
//       binding.provider.version !== binding.analysis_profile.provider.version
//     )
//       context.addIssue({
//         code: "custom",
//         path: ["provider"],
//         message: "Snapshot binding provider does not match analysis profile",
//       });
//   });
// const entrySchema = z.object({
//   query_id: prefixedDigestSchema("query"),
//   operation: z.string().min(1),
//   parameters: jsonObjectSchema,
//   execution: z.object({
//     result: jsonValueSchema,
//     raw_result: jsonValueSchema.nullable(),
//     provider: committedProviderSchema,
//     limitations: z.array(z.string()),
//     relationship_coverage: relationshipCoverageSchema.nullable(),
//     locations: z.array(evidenceLocationSchema),
//     subject: subjectSchema.nullable(),
//   }),
// });
// const workflowEntrySchema = z.object({
//   query_id: prefixedDigestSchema("query"),
//   operation: z.string().min(1),
//   parameters: jsonObjectSchema,
//   execution: z.object({
//     result: jsonValueSchema,
//     raw_result: jsonValueSchema.nullable(),
//     provider: committedProviderSchema,
//     analysis_profile: analysisProfileSchema,
//     limitations: z.array(z.string()),
//     relationship_coverage: relationshipCoverageSchema.nullable(),
//     locations: z.array(evidenceLocationSchema),
//     subject: subjectSchema.nullable(),
//   }),
// });
//
// /** Provider- and profile-exact cache of successful immutable analysis calls. */
// export const analysisSnapshotSchema = z.object({
//   target: targetSchema,
//   binding: bindingSchema,
//   entries: z.array(entrySchema),
//   workflow_entries: z.array(workflowEntrySchema),
//   evidence_bundle: evidenceBundleSchema,
// });
//
// export type AnalysisSnapshot = z.infer<typeof analysisSnapshotSchema>;
// export type AnalysisSnapshotEntry = z.infer<typeof entrySchema>;
// export type AnalysisSnapshotWorkflowEntry = z.infer<typeof workflowEntrySchema>;
// export type AnalysisSnapshotTarget = z.infer<typeof targetSchema>;
// export type AnalysisSnapshotBinding = z.infer<typeof bindingSchema>;
//
// // These handles only represent entries parsed in this realm. File readers can
// // release their payloads while retaining an authenticated comparison operand.
// const preparedEntryBrand = Symbol("prepared-snapshot-entry");
// export interface PreparedSnapshotEntry {
//   readonly [preparedEntryBrand]: true;
// }
// type EntryMetadata = Omit<AnalysisSnapshotEntry, "execution"> & {
//   readonly execution: Omit<
//     AnalysisSnapshotEntry["execution"],
//     "result" | "raw_result"
//   >;
// };
// type WorkflowMetadata = Omit<AnalysisSnapshotWorkflowEntry, "execution"> & {
//   readonly execution: Omit<
//     AnalysisSnapshotWorkflowEntry["execution"],
//     "result" | "raw_result"
//   >;
// };
// type PreparedEntry =
//   | {
//       readonly kind: "provider";
//       readonly entry: EntryMetadata;
//       readonly digest: string;
//     }
//   | {
//       readonly kind: "workflow";
//       readonly entry: WorkflowMetadata;
//       readonly digest: string;
//     };
// const preparedEntries = new WeakMap<PreparedSnapshotEntry, PreparedEntry>();
//
// /** Capture a cache entry without retaining a second copy of its full payload. */
// export const prepareSnapshotEntry = (
//   input: unknown,
//   kind: "provider" | "workflow",
// ): PreparedSnapshotEntry => {
//   const handle: PreparedSnapshotEntry = Object.freeze({
//     [preparedEntryBrand]: true as const,
//   });
//   if (kind === "provider") {
export const _l = 223;
