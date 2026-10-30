export const __stub = 1;
//   it("validates configuration paths rather than ignoring an unsupported value", () => {
//     expect(parseConfig({ REA_GHIDRA_NATIVEAOT_JAR: "relative.jar" }).ok).toBe(
//       false,
//     );
//   });
//   it("commits the actual regular artifact bytes and caller path", async () => {
//     const { extension, bytes, path } = await artifact();
//     expect(extension).toMatchObject({
//       configured_path: path,
//       path,
//       sha256: createHash("sha256").update(bytes).digest("hex"),
//       integration_api: 1,
//     });
//   });
//   it("snapshots identical bytes exclusively into the private runtime", async () => {
//     const { extension, bytes } = await artifact();
//     const runtime = await root();
//     const snapshots = await snapshotGhidraExtensions([extension], runtime);
//     expect(snapshots[0]?.path).toBe(join(runtime, "extensions/nativeaot.jar"));
//     expect(await readFile(join(runtime, "extensions/nativeaot.jar"))).toEqual(
//       bytes,
//     );
//     await expect(
//       snapshotGhidraExtensions([extension], runtime),
//     ).rejects.toMatchObject({ code: "EEXIST" });
//   });
//   it("rejects artifact changes after the profile commitment", async () => {
//     const { extension, path } = await artifact();
//     await writeFile(path, Buffer.from([0x50, 0x4b, 3, 4, 9, 9, 9, 9]));
//     await expect(
//       snapshotGhidraExtensions([extension], await root()),
//     ).rejects.toThrow("digest differs");
//   });
//   it("rejects nonexistent, empty and non-JAR artifacts with useful reasons", async () => {
//     const directory = await root();
//     for (const bytes of [Buffer.alloc(0), Buffer.from("invalid jar")]) {
//       const path = join(directory, "invalid.jar");
//       await writeFile(path, bytes);
//       const resolved = await resolveGhidraExtensions(
//         config(path),
//         target,
//         "linux",
//       );
//       expect(resolved.ok).toBe(false);
//       if (!resolved.ok)
//         expect(resolved.error).toMatchObject({
//           diagnostics: { path, extension: "nativeaot" },
//         });
//     }
//     const absentPath = join(directory, "absent.jar");
//     const absent = await resolveGhidraExtensions(
//       config(absentPath),
//       target,
//       "linux",
//     );
//     expect(absent.ok).toBe(false);
//     if (!absent.ok)
//       expect(absent.error).toMatchObject({
//         diagnostics: {
//           path: absentPath,
//           extension: "nativeaot",
//           reason: expect.stringContaining("ENOENT"),
//         },
//       });
//   });
//   it.skipIf(process.platform === "win32")(
//     "rejects a FIFO without requiring another process to open its writer",
//     async () => {
//       const path = join(await root(), "not-a-jar.fifo");
//       await promisify(execFile)("mkfifo", [path]);
//       let writerRequired = false;
//       let rescueTimer: ReturnType<typeof setTimeout> | undefined;
//       // Release a broken blocking-open implementation so regression failures
//       // do not strand a libuv filesystem worker. Success needs no FIFO peer.
//       const rescue = new Promise<void>((resolve) => {
//         rescueTimer = setTimeout(() => {
//           writerRequired = true;
//           void open(path, constants.O_WRONLY | constants.O_NONBLOCK)
//             .then((file) => file.close())
//             .then(resolve, () => resolve());
//         }, 1000);
//       });
//       try {
//         const resolved = await resolveGhidraExtensions(
//           config(path),
//           target,
//           "linux",
//         );
//         expect(resolved.ok).toBe(false);
//         if (!resolved.ok)
//           expect(resolved.error).toMatchObject({
//             diagnostics: { reason: expect.stringContaining("regular JAR") },
//           });
//         expect(writerRequired).toBe(false);
//       } finally {
//         clearTimeout(rescueTimer);
//         if (writerRequired) await rescue;
//       }
//     },
//   );
//   it("honors cancellation before artifact I/O", async () => {
//     const controller = new AbortController();
//     controller.abort();
//     const resolved = await resolveGhidraExtensions(
//       config("/absent.jar"),
//       target,
//       "linux",
//       controller.signal,
//     );
//     expect(resolved.ok).toBe(false);
//     if (!resolved.ok)
//       expect(resolved.error._tag).toBe("AnalysisCancelledError");
//   });
//   it("refuses traversal identities in an imported extension profile", () => {
//     expect(
//       ghidraExtensionSchema.safeParse({
//         id: "../escape",
//         path: "/fixture.jar",
//         configured_path: "/fixture.jar",
//         sha256: "a".repeat(64),
//         integration_api: 1,
//         entry_class: "ignored",
//       }).success,
//     ).toBe(false);
//   });
// });
//
export const _l = 127;
