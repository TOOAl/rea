export const __stub = 1;
// import { z } from "zod";
// import { AnalysisOutputError } from "../domain/analysisErrorCore.js";
// import { jsonValueSchema, type JsonValue } from "../domain/jsonValue.js";
// import { digestSchema } from "../domain/digests.js";
// import { uniqueSorted } from "../domain/canonicalOrdering.js";
// import { firmwareLogicalPath } from "./FirmwareFiles.js";
//
// const integer = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
// const signature = z.object({
//   id: z.string().min(1),
//   offset: integer,
//   size: integer,
//   name: z.string(),
//   description: z.string(),
//   confidence: z.number().int().min(0).max(255),
//   always_display: z.boolean(),
//   extraction_declined: z.boolean(),
// });
// const scan = z.array(
//   z.object({
//     Analysis: z.object({
//       file_path: z.string(),
//       file_map: z.array(signature),
//       extractions: z.record(z.string(), jsonValueSchema),
//     }),
//   }),
// );
// const report = z.object({ __typename__: z.string() }).catchall(jsonValueSchema);
// const task = z.object({
//   path: z.string(),
//   depth: integer,
//   blob_id: z.string(),
//   is_multi_file: z.boolean(),
// });
// const extraction = z.array(
//   z.object({ task, reports: z.array(report), subtasks: z.array(task) }),
// );
// const stat = z.object({
//   __typename__: z.literal("StatReport"),
//   path: z.string(),
//   size: integer,
//   is_dir: z.boolean(),
//   is_file: z.boolean(),
//   is_link: z.boolean(),
//   link_target: z.string().nullable(),
// });
// const multiFile = z.object({
//   id: z.string(),
//   handler_name: z.string(),
//   name: z.string(),
//   paths: z.array(z.string()),
//   extraction_reports: z.array(jsonValueSchema),
// });
// const hashes = z.object({ sha256: digestSchema });
// /**
//  * The provider's structured missing-dependency report. Non-strict on purpose:
//  * unfamiliar extra fields stay in retained diagnostics, only the dependency
//  * names are derived here.
//  */
// const missingDependency = z.object({
//   __typename__: z.literal("ExtractorDependencyNotFoundReport"),
//   dependencies: z.array(z.string()),
// });
// const region = z.object({
//   id: z.string(),
//   start_offset: integer,
//   end_offset: integer,
//   size: integer,
// });
// type BlobOrigin = {
//   readonly handler: string | null;
//   readonly range: { readonly offset: number; readonly length: number } | null;
// };
// const known = new Set([
//   "StatReport",
//   "HashReport",
//   "FileMagicReport",
//   "RandomnessReport",
//   "ChunkReport",
//   "UnknownChunkReport",
//   "CarveDirectoryReport",
//   "MultiFileReport",
// ]);
//
// const dependencyFailure = z.object({
//   __typename__: z.literal("ExtractorDependencyNotFoundReport"),
//   dependencies: z.array(z.string().min(1)).min(1),
// });
//
// /** Collect the named extractors from any dependency report nested in one value. */
// const missingDependencies = (value: unknown): string[] => {
//   // Producer-controlled name volume must not make deduplication quadratic;
//   // a Set keeps collection linear and uniqueSorted restores canonical order.
//   const found = new Set<string>();
//   const visit = (node: unknown): void => {
//     if (Array.isArray(node)) {
//       for (const item of node) visit(item);
//       return;
//     }
//     if (typeof node !== "object" || node === null) return;
//     const failure = dependencyFailure.safeParse(node);
//     if (failure.success) {
//       for (const dependency of failure.data.dependencies) found.add(dependency);
//       return;
//     }
//     for (const child of Object.values(node)) visit(child);
//   };
//   visit(value);
//   return [...found];
// };
//
// /**
//  * Name the missing extractors and the producing stage for one extraction
//  * problem so a caller can act without decoding the raw report. The original
//  * report stays retained alongside the normalized fields.
//  */
// const extractionDiagnostic = (
//   inputPath: string,
//   stage: string | null,
//   report: JsonValue,
// ): JsonValue => {
//   const dependencies = missingDependencies(report);
//   return {
//     input_path: inputPath,
//     ...(stage === null ? {} : { stage }),
//     ...(dependencies.length === 0
//       ? {}
//       : { missing_dependencies: dependencies }),
//     report,
//   };
// };
//
// /** Interpret the pinned Binwalk report without inventing validated region lengths. */
// export const normalizeBinwalkReport = (
//   raw: unknown,
//   inputPath: string,
//   size: number,
// ) => {
//   const records = scan.parse(raw);
//   const analysis = records[0]?.Analysis;
//   if (
//     records.length !== 1 ||
//     analysis?.file_path !== inputPath ||
//     Object.keys(analysis.extractions).length !== 0
//   )
//     throw new AnalysisOutputError(
export const _l = 146;
