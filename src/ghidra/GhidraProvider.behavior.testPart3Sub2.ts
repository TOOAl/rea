export const __stub = 1;
//     "inspect_native_load_image",
//     {},
//     {
//       signal: secondCaller.signal,
//     },
//   );
//   await snapshotStarted;
//   expect(snapshotReads).toBe(1);
//   expect(snapshotSignal).toBeDefined();
//   expect(snapshotSignal).not.toBe(firstCaller.signal);
//   expect(snapshotSignal).not.toBe(secondCaller.signal);
//   firstCaller.abort();
//   await expect(first).resolves.toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisCancelledError" },
//   });
//   releaseSnapshot?.(ok({ kind: "captured", bytes }));
//   const secondResult = await second;
//   expect(secondResult).toMatchObject({
//     ok: true,
//     value: {
//       rawResult: {
//         source_files: [{ name: "caller-2" }],
//       },
//       result: {
//         observations: {
//           source_files: [{ name: "caller-2" }],
//         },
//       },
//     },
//   });
//   expect(snapshotReads).toBe(1);
//   expect(calls).toBe(2);
//
//   baseObservation.image_base = "0x150000000";
//   const conflictingBase = await client.execute("inspect_native_load_image", {});
//   expect(conflictingBase).toMatchObject({
//     ok: false,
//     error: {
//       _tag: "ProviderAdapterError",
//       diagnostics: {
//         reason: expect.stringContaining("different loaded image base"),
//       },
//     },
//   });
//   expect(snapshotReads).toBe(1);
//   await client.close();
//   expect(snapshotSignal?.aborted).toBe(true);
// });
//
// it("retries a failed NativeAOT snapshot read without retaining a failed derivation", async () => {
//   const bytes = nativeAotPeFixture();
//   const observations = fixtureDosLoadImage().observation;
//   observations.image_base = "0x140000000";
//   let snapshotReads = 0;
//   const factory: GhidraProviderClientFactory = () => ({
//     start: () => Promise.resolve(ok(sessionInfo())),
//     callTool: () => Promise.resolve(ok(jsonValueSchema.parse(observations))),
//     readTargetSnapshot: () => {
//       snapshotReads += 1;
//       return Promise.resolve(
//         snapshotReads === 1
//           ? err(
//               new GhidraSessionError(
//                 "process",
//                 "temporary snapshot read failure",
//               ),
//             )
//           : ok({ kind: "captured", bytes }),
//       );
//     },
//     close: () => Promise.resolve(ok(null)),
//   });
//   const ghidra = provider(installationHost(), factory);
//   const target = { ...peTarget("x86_64"), sha256: nativeAotPeDigest(bytes) };
//   const profile = await ghidra.resolveAnalysisProfile(target);
//   if (!profile.ok || profile.value.profile === null)
//     throw new Error("Expected admitted PE profile");
//   const client = ghidra.createClient(target, profile.value.profile);
//   await expect(
//     client.execute("inspect_native_load_image", {}),
//   ).resolves.toMatchObject({
//     ok: false,
//     error: { _tag: "ProviderAdapterError" },
//   });
//   await expect(
//     client.execute("inspect_native_load_image", {}),
//   ).resolves.toMatchObject({
//     ok: true,
//     value: {
//       result: {
//         observations: {
//           metadata_recovery: [{ status: "complete" }],
//         },
//       },
//     },
//   });
//   expect(snapshotReads).toBe(2);
//   await client.close();
// });
//
// it("rejects all waiters when the loaded image base changes during derivation", async () => {
//   const bytes = nativeAotPeFixture();
//   const observation = fixtureDosLoadImage().observation;
//   let calls = 0;
//   let resolveSnapshot:
//     | ((value: Result<GhidraTargetSnapshot, GhidraSessionError>) => void)
//     | undefined;
//   let markSnapshotStarted: (() => void) | undefined;
//   const snapshotStarted = new Promise<void>((resolve) => {
//     markSnapshotStarted = resolve;
//   });
//   const snapshot = new Promise<
//     Result<GhidraTargetSnapshot, GhidraSessionError>
//   >((resolve) => {
//     resolveSnapshot = resolve;
//   });
//   const factory: GhidraProviderClientFactory = () => ({
//     start: () => Promise.resolve(ok(sessionInfo())),
//     callTool: () => {
//       calls += 1;
//       return Promise.resolve(
//         ok(
//           jsonValueSchema.parse({
//             ...observation,
//             image_base: calls === 1 ? "0x140000000" : "0x150000000",
//           }),
//         ),
//       );
//     },
//     readTargetSnapshot: () => {
//       markSnapshotStarted?.();
//       return snapshot;
//     },
//     close: () => Promise.resolve(ok(null)),
//   });
//   const ghidra = provider(installationHost(), factory);
//   const target = { ...peTarget("x86_64"), sha256: nativeAotPeDigest(bytes) };
//   const profile = await ghidra.resolveAnalysisProfile(target);
//   if (!profile.ok || profile.value.profile === null)
//     throw new Error("Expected admitted PE profile");
//   const client = ghidra.createClient(target, profile.value.profile);
//   const originalBase = client.execute("inspect_native_load_image", {});
//   await snapshotStarted;
//   const changedBase = await client.execute("inspect_native_load_image", {});
//   expect(changedBase).toMatchObject({
//     ok: false,
//     error: {
//       _tag: "ProviderAdapterError",
//       diagnostics: {
//         observed_image_base: "0x150000000",
//         measured_observation: { image_base: "0x150000000" },
//       },
//     },
//   });
//   resolveSnapshot?.(ok({ kind: "captured", bytes }));
//   await expect(originalBase).resolves.toMatchObject({
//     ok: false,
//     error: {
//       _tag: "ProviderAdapterError",
//       diagnostics: {
//         reason: expect.stringContaining("conflicting loaded image bases"),
//         measured_observation: { image_base: "0x140000000" },
//         conflicting_observation: { image_base: "0x150000000" },
//       },
//     },
//   });
//   expect(calls).toBe(2);
//   await client.close();
// });
//
// it("cancels an in-flight NativeAOT waiter when its owning session closes", async () => {
//   const bytes = nativeAotPeFixture();
//   const observations = fixtureDosLoadImage().observation;
//   observations.image_base = "0x140000000";
//   let resolveSnapshot:
//     | ((value: Result<GhidraTargetSnapshot, GhidraSessionError>) => void)
//     | undefined;
//   let snapshotSignal: AbortSignal | undefined;
//   let markSnapshotStarted: (() => void) | undefined;
//   const snapshotStarted = new Promise<void>((resolve) => {
//     markSnapshotStarted = resolve;
//   });
//   const snapshot = new Promise<
//     Result<GhidraTargetSnapshot, GhidraSessionError>
//   >((resolve) => {
//     resolveSnapshot = resolve;
//   });
//   const factory: GhidraProviderClientFactory = () => ({
//     start: () => Promise.resolve(ok(sessionInfo())),
//     callTool: () => Promise.resolve(ok(jsonValueSchema.parse(observations))),
//     readTargetSnapshot: (_maximumBytes, signal) => {
//       snapshotSignal = signal;
//       markSnapshotStarted?.();
//       return snapshot;
//     },
//     close: () => Promise.resolve(ok(null)),
//   });
//   const ghidra = provider(installationHost(), factory);
//   const target = { ...peTarget("x86_64"), sha256: nativeAotPeDigest(bytes) };
//   const profile = await ghidra.resolveAnalysisProfile(target);
//   if (!profile.ok || profile.value.profile === null)
//     throw new Error("Expected admitted PE profile");
//   const client = ghidra.createClient(target, profile.value.profile);
//   const pending = client.execute("inspect_native_load_image", {});
//   await snapshotStarted;
//   await client.close();
//   expect(snapshotSignal?.aborted).toBe(true);
//   resolveSnapshot?.(ok({ kind: "captured", bytes }));
//   await expect(pending).resolves.toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisCancelledError" },
//   });
// });
//
// describe("Ghidra NativeAOT snapshot budget", () => {
//   it("reports snapshot-capacity omissions inline through the load-image result", async () => {
//     const observations = fixtureDosLoadImage().observation;
//     const target = peTarget("x86_64");
//     const factory: GhidraProviderClientFactory = () => ({
//       start: () => Promise.resolve(ok(sessionInfo())),
//       callTool: () => Promise.resolve(ok(jsonValueSchema.parse(observations))),
//       readTargetSnapshot: () =>
//         Promise.resolve(
//           ok({
//             kind: "over-capacity",
//             sourceBytesAtLeast: 128 * 1024 * 1024 + 1,
//             maximumBytes: 128 * 1024 * 1024,
//           }),
//         ),
//       close: () => Promise.resolve(ok(null)),
//     });
//     const ghidra = provider(installationHost(), factory);
//     const profile = await ghidra.resolveAnalysisProfile(target);
//     if (!profile.ok || profile.value.profile === null)
//       throw new Error("Expected admitted PE profile");
//     const client = ghidra.createClient(target, profile.value.profile);
//     const image = await client.execute("inspect_native_load_image", {});
//     expect(image).toMatchObject({
//       ok: true,
//       value: {
//         result: {
//           observations: {
//             metadata_recovery: [
//               {
//                 status: "partial",
//                 truncated: true,
//                 coverage: { truncation_reason: "source-byte-budget" },
//               },
//             ],
//           },
//         },
//       },
//     });
//     await client.close();
//   });
// });
//
// const sessionInfo = () => ({
//   name: "REA Ghidra bridge" as const,
//   run_id: "11111111-1111-4111-8111-111111111111",
//   profile_digest: "a".repeat(64),
//   provider: { id: "ghidra" as const, version: "12.1.4" },
//   read_only: false as const,
//   analysis_complete: true,
//   analysis_timed_out: false,
//   capabilities: [...GHIDRA_SESSION_CAPABILITIES],
//   target: {
//     name: "fixture",
//     language_id: "x86:LE:64:default",
//     compiler_spec_id: "gcc",
//     image_base: "0x1000",
//     default_address_space: "ram",
//     sha256: "a".repeat(64),
//   },
// });
//
// describe("Ghidra PDB coverage", () => {
//   it.each([
//     { name: "missing bridge report", pdb: undefined, warns: true },
//     {
//       name: "report without a PDB reference",
//       pdb: {
//         file: null,
//         guid: null,
//         age: null,
//         signature: null,
//         version: null,
//         loaded: null,
//       },
//       warns: false,
//     },
//   ])("distinguishes $name in direct PE searches", async ({ pdb, warns }) => {
//     const ghidra = provider(installationHost(), () => ({
//       start: () =>
//         Promise.resolve(
//           ok(pdb === undefined ? sessionInfo() : { ...sessionInfo(), pdb }),
//         ),
//       callTool: () => Promise.resolve(ok([])),
//       close: () => Promise.resolve(ok(null)),
//     }));
//     const target = executableTarget("pe", "x86_64");
//     const resolved = await ghidra.resolveAnalysisProfile(target);
//     if (!resolved.ok || resolved.value.profile === null)
//       throw new Error("Expected a PE profile");
//     const client = ghidra.createClient(target, resolved.value.profile);
//     try {
//       const searched = await client.execute("search_procedures", {
//         pattern: "add_numbers",
//       });
//       if (!searched.ok) throw searched.error;
//       expect(searched.value.result).toEqual([]);
//       const warnings = searched.value.limitations.filter((limitation) =>
//         limitation.includes("PDB"),
//       );
//       expect(warnings).toEqual(
//         warns
//           ? [
//               "Ghidra did not report PDB attributes; debug-symbol coverage is unknown.",
//             ]
//           : [],
//       );
//     } finally {
//       await client.close();
//     }
//   });
//   const pdb = {
//     file: "C:\\build\\fixture.pdb",
//     guid: "01234567-89AB-CDEF-0123-456789ABCDEF",
//     age: "a",
//     signature: null,
//     version: "RSDS",
//     loaded: false as boolean | null,
//   };
//   it.each([false, null, true])(
//     "carries PDB load state %s into direct search and health Evidence",
//     async (loaded) => {
//       let starts = 0;
//       const ghidra = provider(installationHost(), () => ({
//         start: () => {
//           starts += 1;
//           return Promise.resolve(
//             ok({ ...sessionInfo(), pdb: { ...pdb, loaded } }),
//           );
export const _l = 344;
