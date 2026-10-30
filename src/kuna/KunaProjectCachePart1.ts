export const __stub = 1;
// import { createHash, randomUUID } from "node:crypto";
// import {
//   mkdir,
//   mkdtemp,
//   readdir,
//   readFile,
//   rename,
//   rm,
//   stat,
//   utimes,
// } from "node:fs/promises";
// import { join } from "node:path";
//
// import canonicalize from "canonicalize";
// import writeFileAtomic from "write-file-atomic";
// import { z } from "zod";
//
// import type { AnalysisError } from "../domain/analysisErrorBase.js";
// import {
//   AnalysisCancelledError,
//   AnalysisResourceConstraintError,
// } from "../domain/analysisErrorCore.js";
// import { ProviderCleanupError } from "../domain/providerCleanupError.js";
// import { err, ok, type Result } from "../domain/result.js";
// import { hashStableFile } from "../filesystem/StableFileHash.js";
// import type { KunaInstallation } from "./KunaInstallation.js";
// import {
//   exportKunaProject,
//   KUNA_EXPORT_OPERATION,
//   kunaExportFailure,
//   readKunaExport,
//   type KunaExport,
//   type KunaExportStatus,
// } from "./KunaProjectExport.js";
// import type { ProviderProcessSupervisor } from "../process/ProviderProcess.js";
// import type { KunaProcessLauncher } from "./KunaCommand.js";
// import type {
//   KunaInventoryFunction,
//   KunaProjectFunction,
// } from "./KunaProjectFiles.js";
// import { KUNA_PROVIDER_ID } from "./KunaRelease.js";
//
// /** Bumped whenever the entry layout or manifest meaning changes. */
// const CACHE_LAYOUT = 1;
//
// /** A manifest names five files and their digests; anything larger is not ours. */
// const MANIFEST_MAX_BYTES = 64 * 1024;
//
// const KEY_PATTERN = /^[0-9a-f]{64}$/u;
//
// const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
//
// /** Inputs that determine an export's content. Each one is part of the cache key. */
// export interface KunaProjectKeyInputs {
//   readonly targetSha256: string;
//   readonly kunaSha256: string;
//   readonly kunaVersion: string;
//   /**
//    * `--jobs 1` is Kuna's reference answer; more jobs decompile without
//    * callee-first prototypes and change some bodies.
//    */
//   readonly jobs: number;
// }
//
// /** Content address of one export: every input that can change its bytes. */
// export const kunaProjectKey = (inputs: KunaProjectKeyInputs): string =>
//   createHash("sha256")
//     .update(
//       canonicalize({
//         layout: CACHE_LAYOUT,
//         target_sha256: inputs.targetSha256,
//         kuna_sha256: inputs.kunaSha256,
//         kuna_version: inputs.kunaVersion,
//         export: { command: "decompile-project", jobs: inputs.jobs },
//       }) ?? "",
//     )
//     .digest("hex");
//
// const fileSchema = z.strictObject({
//   path: z.string().min(1),
//   bytes: z.number().int().nonnegative(),
//   sha256: z.string().regex(SHA256_PATTERN),
// });
//
// const manifestSchema = z.strictObject({
//   layout: z.literal(CACHE_LAYOUT),
//   key: z.string().regex(KEY_PATTERN),
//   inputs: z.strictObject({
//     target_sha256: z.string().regex(SHA256_PATTERN),
//     kuna_sha256: z.string().regex(SHA256_PATTERN),
//     kuna_version: z.string().min(1),
//     jobs: z.number().int().positive(),
//   }),
//   files: z.strictObject({
//     c: fileSchema,
//     h: fileSchema,
//     asm: fileSchema,
//     readme: fileSchema,
//     inventory: fileSchema,
//   }),
//   summary: z.strictObject({
//     decompiled: z.number().int().nonnegative(),
//     failed: z.number().int().nonnegative(),
//   }),
//   created_at: z.string().datetime(),
// });
//
// /** Immutable description of one published export, written once at publish. */
// export type KunaProjectManifest = z.infer<typeof manifestSchema>;
//
// /** One verified, published export. */
// export interface KunaProject {
//   readonly key: string;
//   /** Directory holding the export's `.c`, `.h`, `.asm`, README and inventory. */
//   readonly directory: string;
//   readonly manifest: KunaProjectManifest;
//   /** Decompiled function blocks in `.c` order. */
//   readonly functions: readonly KunaProjectFunction[];
//   /** Every callable entry Kuna found, including imports it does not decompile. */
//   readonly inventory: readonly KunaInventoryFunction[];
// }
//
// /** One request to produce or reuse the export for a target. */
// export interface KunaProjectRequest {
//   readonly installation: KunaInstallation;
//   /** Caller-selected target path; REA decompiles a verified copy of it. */
//   readonly targetPath: string;
//   readonly targetSha256: string;
//   readonly signal?: AbortSignal;
//   readonly onStatus?: (status: KunaExportStatus) => void;
// }
//
// /** One build whose process tree REA could not prove stopped. */
// interface RetainedProcess {
//   readonly key: string;
//   readonly error: ProviderCleanupError;
//   /** Retries stopping the process tree, when the launcher left one. */
//   readonly owner: ProviderProcessSupervisor | undefined;
//   readonly staging: string;
// }
//
// interface StagedResult {
//   readonly result: Result<KunaProject, AnalysisError>;
//   /** Set when an owned process may still write into staging. */
//   readonly retainStaging: boolean;
// }
//
// interface InflightBuild {
//   readonly key: string;
//   readonly promise: Promise<Result<KunaProject, AnalysisError>>;
//   readonly controller: AbortController;
//   readonly listeners: Set<(status: KunaExportStatus) => void>;
//   /** The latest status, replayed to requests that join after it was reported. */
//   status: KunaExportStatus | undefined;
//   waiters: number;
// }
//
// const isMissing = (cause: unknown): boolean =>
//   cause instanceof Error &&
//   "code" in cause &&
//   (cause.code === "ENOENT" || cause.code === "ENOTDIR");
//
// /** A file an entry's manifest names is gone, replaced or changed under it. */
// const isDamaged = (cause: unknown): boolean =>
//   cause instanceof Error &&
//   "code" in cause &&
//   ["ENOENT", "ENOTDIR", "EISDIR", "ENOTFILE", "ESTALE"].includes(
//     String(cause.code),
//   );
//
// const isPublishedByAnother = (cause: unknown): boolean =>
//   cause instanceof Error &&
//   "code" in cause &&
//   (cause.code === "EEXIST" || cause.code === "ENOTEMPTY");
//
// const parseManifest = (text: string): KunaProjectManifest | undefined => {
//   try {
//     const parsed = manifestSchema.safeParse(JSON.parse(text));
//     return parsed.success ? parsed.data : undefined;
//   } catch {
//     return undefined;
//   }
// };
//
// const manifestBytes = (manifest: KunaProjectManifest): number =>
//   Object.values(manifest.files).reduce((sum, file) => sum + file.bytes, 0);
//
// /**
//  * REA-owned on-disk cache of `kuna decompile-project` exports.
//  *
//  * Layout under the root: `projects/<key>/` holds published entries
//  * (`manifest.json` plus the export and inventory in `project/`), `staging/`
//  * holds builds whose processes may still be live, `trash/` holds retired
//  * workspaces and evicted entries awaiting removal,
//  * and `home/` is Kuna's own HOME so its spec cache stays inside REA's
//  * ownership.
//  *
export const _l = 197;
