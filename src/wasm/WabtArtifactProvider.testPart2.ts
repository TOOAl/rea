export const __stub = 1;
//     async (input) => {
//       const version = input.arguments[0] === "--version";
//       const stdout = version
//         ? "1.0.42\n"
//         : input.command.includes("wasm-objdump")
//           ? dump
//           : input.command.includes("wasm2wat")
//             ? '(module (@custom "test" "payload"))\n'
//             : "";
//       const launched = await spawnOwnedProviderProcess({
//         ...input,
//         command: process.execPath,
//         arguments: [
//           "-e",
//           `process.stdout.write(${JSON.stringify(stdout)}); process.exit(0);`,
//         ],
//         expectedCommand: null,
//       });
//       return launched;
//     },
//   );
//   fileCloseFailure.selectedPath = path;
//   fileCloseFailure.attempts = 0;
//   fileCloseFailure.failFirst = true;
//   try {
//     const first = await provider.inspect({
//       path,
//       candidate_paths: [],
//       glue_paths: [],
//     });
//     expect(first).toMatchObject({
//       ok: false,
//       error: {
//         cleanupIncomplete: true,
//         cleanupResources: [path],
//         cause: { message: "injected WABT input close failure" },
//       },
//     });
//     expect(fileCloseFailure.attempts).toBe(1);
//
//     const retried = await provider.inspect({
//       path,
//       candidate_paths: [],
//       glue_paths: [],
//     });
//     expect(retried.ok).toBe(true);
//     expect(fileCloseFailure.attempts).toBeGreaterThan(1);
//
//     fileCloseFailure.failFirst = true;
//     const closeRetry = await provider.inspect({
//       path,
//       candidate_paths: [],
//       glue_paths: [],
//     });
//     expect(closeRetry).toMatchObject({
//       ok: false,
//       error: { cleanupIncomplete: true, cleanupResources: [path] },
//     });
//     const beforeClose = fileCloseFailure.attempts;
//     await provider.close();
//     expect(fileCloseFailure.attempts).toBeGreaterThan(beforeClose);
//   } finally {
//     fileCloseFailure.selectedPath = "";
//     fileCloseFailure.failFirst = false;
//     await provider.close();
//   }
// });
//
// it.each([false, true])(
//   "reports an unavailable private runtime root with retryable=%s without a misleading WABT remediation",
//   async (retryable) => {
//     const toolRoot = await createTestTempDirectory("rea-wabt-tool-root-");
//     for (const tool of ["wasm-validate", "wasm-objdump", "wasm2wat"])
//       await writeFile(
//         join(toolRoot, tool + (process.platform === "win32" ? ".exe" : "")),
//         "source-owned executable seam",
//         { mode: 0o700 },
//       );
//     const provider = new WabtArtifactProvider(
//       { REA_WABT_BIN_DIRECTORY: toolRoot },
//       undefined,
//       () => {
//         throw new PrivateRuntimeRootUnavailableError(
//           "REA Windows native controls are unavailable: probe failure",
//           { retryable },
//         );
//       },
//     );
//     const result = await provider.inspect({
//       path: "/module.wasm",
//       glue_paths: [],
//       candidate_paths: [],
//     });
//     expect(result).toMatchObject({
//       ok: false,
//       error: {
//         _tag: "AnalysisCapabilityUnavailableError",
//         retryable,
//         userMessage: undefined,
//         message: expect.stringContaining(
//           "REA Windows native controls are unavailable",
//         ),
//       },
//     });
//     if (result.ok)
//       throw new Error("Unavailable runtime must refuse inspection");
//     expect(projectAnalysisError(result.error)).toMatchObject({
//       code: "capability_unavailable",
//       retryable,
//       category: retryable ? "unavailable" : "unsupported_provider",
//     });
//   },
// );
// const assertGlueObservations = (
//   value: unknown,
//   inputs: readonly { readonly path: string; readonly source: string }[],
//   selectedPath: string,
// ): void => {
//   const glue = wasmArtifactSchema.parse(value).glue;
//   expect(glue).toHaveLength(inputs.length);
//   for (const [index, { path, source }] of inputs.entries()) {
//     expect(glue[index]).toMatchObject({
//       artifact: {
//         path,
//         sha256: createHash("sha256").update(source).digest("hex"),
//         bytes: Buffer.byteLength(source),
//       },
//       parse_status: "complete",
//       references: [
//         {
//           value: "./selected.wasm",
//           line: source.includes("\n") ? 2 : 1,
//           column: source.startsWith("\uFEFFfetch") ? 7 : 6,
//           candidate_paths: [selectedPath],
//           association: "local-path-candidate",
//           evidence_kind: "static-literal",
//         },
//       ],
//     });
//   }
// };
//
// it.each([
//   "success",
//   "invalid",
//   "malformed",
//   "timeout",
//   "cancelled",
//   "cleanup",
//   "changed-snapshot",
//   "malformed-wat",
//   "wat-warning",
// ])("owns private artifact bytes and retains %s outcome", async (mode) => {
//   const selectedRoot = await createTestTempDirectory("rea-wabt-seam-");
//   const path = join(selectedRoot, "selected.wasm");
//   const bytes = Buffer.alloc(76, 1);
//   await writeFile(path, bytes);
//   for (const tool of ["wasm-validate", "wasm-objdump", "wasm2wat"])
//     await writeFile(
//       join(selectedRoot, tool + (process.platform === "win32" ? ".exe" : "")),
//       "source-owned executable seam",
//       { mode: 0o700 },
export const _l = 162;
