export const __stub = 1;
//   for (const tool of ["wasm-validate", "wasm-objdump", "wasm2wat"])
//     await writeFile(
//       join(selectedRoot, tool + (process.platform === "win32" ? ".exe" : "")),
//       "source-owned executable seam",
//       { mode: 0o700 },
//     );
//   const dump = await readFile(
//     new URL("../../tests/fixtures/wasm/objdump.txt", import.meta.url),
//     "utf8",
//   );
//   const provider = new WabtArtifactProvider(
//     { REA_WABT_BIN_DIRECTORY: selectedRoot },
//     (input) => {
//       const version = input.arguments[0] === "--version";
//       if (!version && input.command.includes("wasm2wat"))
//         throw outputLimitFailure({ stdout: "(module" + "a".repeat(5000) });
//       const script = version
//         ? 'process.stdout.write("1.0.42\\n")'
//         : input.command.includes("objdump")
//           ? `process.stdout.write(${JSON.stringify(dump)})`
//           : "";
//       return spawnOwnedProviderProcess({
//         ...input,
//         command: process.execPath,
//         arguments: ["-e", script],
//         expectedCommand: null,
//       });
//     },
//   );
//   const result = await provider.inspect({
//     path,
//     glue_paths: [],
//     candidate_paths: [],
//   });
//   if (result.ok) throw new Error("Expected the output budget to fail");
//   expect(result.error).toMatchObject({
//     _tag: "AnalysisResourceConstraintError",
//     resource: "memory",
//     reportedLimits: { max_output_bytes: WABT_LIMITS.outputBytes },
//   });
//   const projection = projectAnalysisError(result.error);
//   expect(projection).toMatchObject({
//     code: "resource_constraint",
//     message: expect.stringContaining(
//       `${String(WABT_LIMITS.outputBytes)}-byte output budget`,
//     ),
//     remediation: {
//       action: expect.stringContaining("retrying with the same input"),
//     },
//   });
//   expect(projection.details?.captured_output).toEqual({
//     stdout: "(module" + "a".repeat(4089),
//     stderr: "",
//     truncated: true,
//     stdout_bytes: 5007,
//     stderr_bytes: 0,
//     exit_code: null,
//     signal: "SIGKILL",
//   });
// });
// it("does not attribute wasm-objdump output to a wasm2wat launch failure", async () => {
//   const selectedRoot = await createTestTempDirectory("rea-wabt-launch-");
//   const path = join(selectedRoot, "selected.wasm");
//   await writeFile(path, Buffer.alloc(76, 1));
//   for (const tool of ["wasm-validate", "wasm-objdump", "wasm2wat"])
//     await writeFile(
//       join(selectedRoot, tool + (process.platform === "win32" ? ".exe" : "")),
//       "source-owned executable seam",
//       { mode: 0o700 },
//     );
//   const dump = await readFile(
//     new URL("../../tests/fixtures/wasm/objdump.txt", import.meta.url),
//     "utf8",
//   );
//   const provider = new WabtArtifactProvider(
//     { REA_WABT_BIN_DIRECTORY: selectedRoot },
//     (input) => {
//       const version = input.arguments[0] === "--version";
//       if (!version && input.command.includes("wasm2wat"))
//         throw Object.assign(new Error("spawn E2BIG"), { code: "E2BIG" });
//       const script = version
//         ? 'process.stdout.write("1.0.42\\n")'
//         : input.command.includes("objdump")
//           ? `process.stdout.write(${JSON.stringify(dump)})`
//           : "";
//       return spawnOwnedProviderProcess({
//         ...input,
//         command: process.execPath,
//         arguments: ["-e", script],
//         expectedCommand: null,
//       });
//     },
//   );
//   const result = await provider.inspect({
//     path,
//     glue_paths: [],
//     candidate_paths: [],
//   });
//   if (result.ok) throw new Error("Expected the wasm2wat launch to fail");
//   expect(result.error.message).toContain("spawn E2BIG");
//   expect(result.error.capturedOutput).toBeUndefined();
// });
//
// it("bounds an oversized stderr to an excerpt", () => {
//   expect(
//     projectAnalysisError(
//       wabtFailure(
//         outputLimitFailure({ stderr: "w".repeat(5000) }),
//         "producer",
//         "/module.wasm",
//       ),
//     ).details?.captured_output,
//   ).toEqual({
//     stdout: "(module",
//     stderr: "w".repeat(4096),
//     truncated: true,
//     stdout_bytes: 7,
//     stderr_bytes: 5000,
//     exit_code: null,
//     signal: "SIGKILL",
//   });
// });
// it("cuts the excerpt on a code point boundary", () => {
//   const failure = wabtFailure(
//     outputLimitFailure({ stdout: "a".repeat(4095) + "\u{1F600}b" }),
//     "producer",
//     "/module.wasm",
//   );
//   expect(failure.capturedOutput?.stdout).toBe("a".repeat(4095));
// });
// it("bounds the excerpt when cleanup also fails after the output budget", () => {
//   expect(
//     projectAnalysisError(
//       wabtFailure(
//         outputLimitFailure({
//           stderr: "w".repeat(5000),
//           cleanupFailure: "Source-owned cleanup uncertainty",
//         }),
//         "producer",
//         "/module.wasm",
//       ),
//     ),
//   ).toMatchObject({
//     code: "cleanup_incomplete",
//     details: {
//       diagnostics: {
//         previous_error: {
//           failure_kind: "output-limit",
//           message: `WABT output exceeded the ${String(WABT_LIMITS.outputBytes)}-byte output budget`,
//           max_output_bytes: WABT_LIMITS.outputBytes,
//         },
//         captured_output: { stdout: "(module", stderr: "w".repeat(4096) },
//       },
//     },
//   });
// });
// it("does not blame the input when a version probe exceeds the budget", () => {
//   expect(
//     wabtFailure(outputLimitFailure(), "configuration", "/module.wasm"),
//   ).toMatchObject({ _tag: "AnalysisOutputError" });
// });
export const _l = 161;
