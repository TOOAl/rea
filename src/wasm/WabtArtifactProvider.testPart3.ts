export const __stub = 1;
//     );
//   const dump = await readFile(
//     new URL("../../tests/fixtures/wasm/objdump.txt", import.meta.url),
//     "utf8",
//   );
//   let runtimePath = "";
//   let runtimeCreations = 0;
//   let acquiredPid: number | undefined;
//   let cleanupAttempts = 0;
//   const controller = new AbortController();
//   const provider = new WabtArtifactProvider(
//     { REA_WABT_BIN_DIRECTORY: selectedRoot },
//     async (input) => {
//       const version = input.arguments[0] === "--version";
//       if (!version) {
//         expect(await readFile(join(input.cwd ?? "", "module.wasm"))).toEqual(
//           bytes,
//         );
//         if (mode === "changed-snapshot") {
//           const snapshot = join(input.cwd ?? "", "module.wasm");
//           await chmod(snapshot, 0o600);
//           await writeFile(snapshot, Buffer.alloc(76, 2));
//         }
//         if (mode === "timeout")
//           throw new OwnedCommandFailure(
//             "timeout",
//             "Source-owned deadline seam",
//           );
//       }
//       const stdout = version
//         ? "1.0.42\n"
//         : input.command.includes("objdump")
//           ? mode === "malformed"
//             ? "unexpected producer output"
//             : dump
//           : input.command.includes("wasm2wat")
//             ? mode === "malformed-wat"
//               ? "unexpected decoder output\n"
//               : '(module (@custom "test" "payload"))\n'
//             : "";
//       const invalid = !version && mode === "invalid";
//       const stderr = invalid
//         ? "module.wasm: invalid bytes\n"
//         : !version &&
//             input.command.includes("wasm2wat") &&
//             mode === "wat-warning"
//           ? "decoder warning\n"
//           : "";
//       const script =
//         !version && mode === "cancelled"
//           ? "setInterval(() => undefined, 1000)"
//           : `process.stdout.write(${JSON.stringify(stdout)}); process.stderr.write(${JSON.stringify(stderr)}); process.exit(${invalid ? 1 : 0});`;
//       const launched = await spawnOwnedProviderProcess({
//         ...input,
//         command: process.execPath,
//         arguments: ["-e", script],
//         expectedCommand: null,
//       });
//       if (!version && mode === "cancelled") {
//         acquiredPid = launched.process.pid;
//         setImmediate(() => controller.abort());
//       }
//       return launched;
//     },
//     async () => {
//       runtimeCreations += 1;
//       const root = await PrivateRuntimeRoot.create({
//         prefix: "rea-wabt-owned-test-",
//       });
//       runtimePath = root.path;
//       return {
//         path: root.path,
//         close: async () => {
//           if (mode === "cleanup" && ++cleanupAttempts <= 2)
//             throw new Error("Source-owned cleanup uncertainty");
//           await root.close();
//         },
//       };
//     },
//   );
//   const literal = 'fetch("./selected.wasm");';
//   const glueInputs = (
//     mode === "success"
//       ? [
//           literal,
//           `\uFEFF${literal}`,
//           `\uFEFF\n${literal}`,
//           `#!/usr/bin/env node\n${literal}`,
//           `\uFEFF#!/usr/bin/env node\n${literal}`,
//         ]
//       : []
//   ).map((source, index) => ({
//     path: join(selectedRoot, `glue-${index}.js`),
//     source,
//   }));
//   await Promise.all(
//     glueInputs.map(({ path, source }) => writeFile(path, source)),
//   );
//   const result = await provider.inspect(
//     {
//       path,
//       glue_paths: glueInputs.map(({ path }) => path),
//       candidate_paths: [],
//     },
//     { signal: controller.signal },
//   );
//   if (mode === "success" && result.ok)
//     assertGlueObservations(result.value.result, glueInputs, path);
//   assertModeOutcome(mode, result, path);
//   if (mode === "cleanup") {
//     await assertCleanupRecovery({
//       provider,
//       result,
//       path,
//       runtimePath,
//       cleanupAttempts: () => cleanupAttempts,
//       runtimeCreations: () => runtimeCreations,
//     });
//   }
//   await expect(access(runtimePath)).rejects.toMatchObject({ code: "ENOENT" });
//   expect(await readFile(path)).toEqual(bytes);
//   if (acquiredPid !== undefined) {
//     const pid = acquiredPid;
//     expect(() => process.kill(pid, 0)).toThrow();
//   }
// });
// const outputLimitFailure = ({
//   stdout = "(module",
//   stderr = "",
//   cleanupFailure = null,
// }: {
//   readonly stdout?: string;
//   readonly stderr?: string;
//   readonly cleanupFailure?: string | null;
// } = {}) =>
//   new OwnedCommandFailure(
//     "output-limit",
//     "Command diagnostic output exceeded its complete-output budget.",
//     {
//       diagnosticTruncated: true,
//       // Observed sizes differ from retained sizes, as after a real overflow.
//       stdout: {
//         text: stdout,
//         bytes: Buffer.byteLength(stdout),
//         observedBytes: Buffer.byteLength(stdout) + 1000,
//       },
//       stderr: {
//         text: stderr,
//         bytes: Buffer.byteLength(stderr),
//         observedBytes: Buffer.byteLength(stderr) + 1000,
//       },
//       exitCode: null,
//       signal: "SIGKILL",
//     },
//     cleanupFailure,
//     undefined,
//     cleanupFailure === null ? [] : ["/owned/runtime"],
//   );
// it("reports WABT output beyond the budget as a resource constraint with a bounded excerpt", async () => {
//   const selectedRoot = await createTestTempDirectory("rea-wabt-budget-");
//   const path = join(selectedRoot, "selected.wasm");
//   await writeFile(path, Buffer.alloc(76, 1));
export const _l = 162;
