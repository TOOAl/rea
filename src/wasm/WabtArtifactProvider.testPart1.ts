export const __stub = 1;
// import { createHash } from "node:crypto";
// import { access, chmod, readFile, writeFile } from "node:fs/promises";
// import { join } from "node:path";
// import { expect, it, vi } from "vitest";
// import { createTestTempDirectory } from "../../tests/fixtures/temporaryDirectory.js";
// import { WabtArtifactProvider } from "./WabtArtifactProvider.js";
// import { wasmArtifactSchema } from "../domain/wasm/wasmArtifact.js";
// import { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
// import { PrivateRuntimeRootUnavailableError } from "../process/PrivateRuntimeRootUnavailableError.js";
// import { spawnOwnedProviderProcess } from "../process/ProviderProcess.js";
// import { OwnedCommandFailure } from "../process/OwnedCommand.js";
// import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
// import { WABT_LIMITS } from "./WabtRelease.js";
// import { wabtFailure } from "./WabtFailures.js";
//
// const fileCloseFailure = vi.hoisted(() => ({
//   selectedPath: "",
//   attempts: 0,
//   failFirst: false,
// }));
//
// vi.mock("node:fs/promises", async (importOriginal) => {
//   const fs = await importOriginal<typeof import("node:fs/promises")>();
//   return {
//     ...fs,
//     open: async (...args: Parameters<typeof fs.open>) => {
//       const handle = await fs.open(...args);
//       if (String(args[0]) !== fileCloseFailure.selectedPath) return handle;
//       const close = handle.close.bind(handle);
//       handle.close = async () => {
//         fileCloseFailure.attempts += 1;
//         if (fileCloseFailure.failFirst) {
//           fileCloseFailure.failFirst = false;
//           throw new Error("injected WABT input close failure");
//         }
//         return close();
//       };
//       return handle;
//     },
//   };
// });
//
// const failureTags: Readonly<Record<string, string>> = {
//   invalid: "AnalysisInputError",
//   timeout: "AnalysisTimeoutError",
//   cancelled: "AnalysisCancelledError",
//   "changed-snapshot": "AnalysisArtifactChangedError",
//   cleanup: "ProviderAdapterError",
//   malformed: "AnalysisOutputError",
//   "malformed-wat": "AnalysisOutputError",
//   "wat-warning": "AnalysisOutputError",
// };
//
// const assertCleanupRecovery = async (options: {
//   readonly provider: WabtArtifactProvider;
//   readonly result: Awaited<ReturnType<WabtArtifactProvider["inspect"]>>;
//   readonly path: string;
//   readonly runtimePath: string;
//   readonly cleanupAttempts: () => number;
//   readonly runtimeCreations: () => number;
// }): Promise<void> => {
//   expect(options.result).toMatchObject({
//     error: {
//       cleanupIncomplete: true,
//       cleanupResources: [options.runtimePath],
//       partialObservation: { normalized_result: { validation: "valid" } },
//     },
//   });
//   await expect(access(options.runtimePath)).resolves.toBeUndefined();
//   const blocked = await options.provider.inspect({
//     path: options.path,
//     glue_paths: [],
//     candidate_paths: [],
//   });
//   expect(blocked).toMatchObject({
//     ok: false,
//     error: {
//       cleanupIncomplete: true,
//       cleanupResources: [options.runtimePath],
//     },
//   });
//   expect(options.cleanupAttempts()).toBe(2);
//   expect(options.runtimeCreations()).toBe(1);
//   await options.provider.close();
//   expect(options.cleanupAttempts()).toBe(3);
//   await expect(access(options.runtimePath)).rejects.toMatchObject({
//     code: "ENOENT",
//   });
// };
//
// const assertModeOutcome = (
//   mode: string,
//   result: Awaited<ReturnType<WabtArtifactProvider["inspect"]>>,
//   path: string,
// ): void => {
//   if (mode === "success")
//     expect(result).toMatchObject({
//       ok: true,
//       value: {
//         result: {
//           artifact: { path, bytes: 76 },
//           validation: "valid",
//           runtime_execution: "not-performed",
//         },
//       },
//     });
//   else
//     expect(result).toMatchObject({
//       ok: false,
//       error: { _tag: failureTags[mode] },
//     });
//   if (mode === "invalid")
//     expect(result).toMatchObject({
//       error: { capturedOutput: { stderr: "module.wasm: invalid bytes\n" } },
//     });
//   if (mode === "malformed-wat" || mode === "wat-warning")
//     expect(result).toMatchObject({
//       error: {
//         capturedOutput: {
//           stdout:
//             mode === "malformed-wat"
//               ? "unexpected decoder output\n"
//               : '(module (@custom "test" "payload"))\n',
//           stderr: mode === "wat-warning" ? "decoder warning\n" : "",
//         },
//       },
//     });
// };
//
// it("returns actionable unavailable without creating a workspace when tools are absent", async () => {
//   const provider = new WabtArtifactProvider({}, undefined, () => {
//     throw new Error("Must not allocate");
//   });
//   expect(
//     await provider.inspect({
//       path: "/module.wasm",
//       glue_paths: [],
//       candidate_paths: [],
//     }),
//   ).toMatchObject({
//     ok: false,
//     error: {
//       _tag: "AnalysisCapabilityUnavailableError",
//       userMessage: expect.stringContaining("REA_WABT_BIN_DIRECTORY"),
//     },
//   });
// });
//
// it("retries a retained input descriptor before admitting the next WABT operation", async () => {
//   const root = await createTestTempDirectory("rea-wabt-read-cleanup-");
//   const path = join(root, "selected.wasm");
//   await writeFile(path, Buffer.alloc(76, 1));
//   for (const tool of ["wasm-validate", "wasm-objdump", "wasm2wat"])
//     await writeFile(join(root, tool), "source-owned executable seam", {
//       mode: 0o700,
//     });
//   const dump = await readFile(
//     new URL("../../tests/fixtures/wasm/objdump.txt", import.meta.url),
//     "utf8",
//   );
//   const provider = new WabtArtifactProvider(
//     { REA_WABT_BIN_DIRECTORY: root },
export const _l = 162;
