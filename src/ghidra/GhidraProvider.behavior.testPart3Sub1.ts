export const __stub = 1;
//       const target: BinaryTarget = {
//         path: "/tmp/source-owned-fixture.exe",
//         sha256: fixture.sha256,
//         kind: "executable",
//         format: state === "unsupported" ? "elf" : "dos-mz",
//         architecture: "x86",
//         availableArchitectures: ["x86"],
//       };
//       const profile = await ghidra.resolveAnalysisProfile(target);
//       if (!profile.ok || profile.value.profile === null)
//         throw new Error("Expected admitted profile");
//       const result = await ghidra
//         .createClient(target, profile.value.profile)
//         .execute("inspect_native_load_image", {});
//       if (state === "changed-snapshot" || state === "missing-snapshot") {
//         expect(result).toMatchObject({
//           ok: false,
//           error: {
//             _tag: "ProviderAdapterError",
//             diagnostics: { reason: expect.stringContaining("snapshot") },
//           },
//         });
//       } else {
//         expect(result).toMatchObject({
//           ok: true,
//           value: {
//             result: { status: state, observations: fixture.observation },
//             rawResult: fixture.observation,
//             analysisProfile: profile.value.profile,
//           },
//         });
//       }
//     },
//   );
// });
//
// const unavailableNativeAotDatabaseType = (address: string | null) => ({
//   status: "unavailable",
//   reason:
//     "No exact database type or defined typed data exists at the selected identity",
//   id: null,
//   name: null,
//   kind: "unavailable",
//   source: "analysis-database",
//   source_archive: null,
//   address,
//   size_bytes: null,
//   alignment_bytes: null,
//   packing_enabled: null,
//   referenced_type: null,
//   array_count: null,
//   array_stride_bytes: null,
//   fields: [],
//   members: [],
//   total_fields: 0,
//   truncated: false,
//   limitations: [],
// });
//
// it("returns read-only NativeAOT metadata inline and drills down by derived MethodTable address", async () => {
//   const bytes = nativeAotPeFixture();
//   const readSnapshot = vi.fn(async () =>
//     ok({ kind: "captured" as const, bytes }),
//   );
//   const observations = fixtureDosLoadImage().observation;
//   observations.image_base = "0x140000000";
//   const factory: GhidraProviderClientFactory = () => ({
//     start: () =>
//       Promise.resolve(
//         ok({
//           ...sessionInfo(),
//           target: { ...sessionInfo().target, image_base: "0x140000000" },
//         }),
//       ),
//     callTool: (operation) =>
//       Promise.resolve(
//         ok(
//           jsonValueSchema.parse(
//             operation === "inspect_native_load_image"
//               ? observations
//               : unavailableNativeAotDatabaseType("0x140002280"),
//           ),
//         ),
//       ),
//     readTargetSnapshot: readSnapshot,
//     close: () => Promise.resolve(ok(null)),
//   });
//   const ghidra = provider(installationHost(), factory);
//   const target = { ...peTarget("x86_64"), sha256: nativeAotPeDigest(bytes) };
//   const profile = await ghidra.resolveAnalysisProfile(target);
//   if (!profile.ok || profile.value.profile === null)
//     throw new Error("Expected admitted PE profile");
//   const client = ghidra.createClient(target, profile.value.profile);
//   const image = await client.execute("inspect_native_load_image", {});
//   expect(image).toMatchObject({
//     ok: true,
//     value: {
//       result: {
//         status: "unsupported",
//         observations: {
//           metadata_recovery: [
//             {
//               status: "complete",
//               analysis_mode: "read-only-derived-overlay",
//               method_tables: 3,
//               frozen_strings: [{ value: "REA_NATIVEAOT_FROZEN" }],
//             },
//           ],
//         },
//       },
//       rawResult: observations,
//     },
//   });
//   for (const address of [
//     "0x140002280",
//     "140002280",
//     "ram:0x140002280",
//     "%72am:0x140002280",
//     "0X0140002280",
//   ]) {
//     const detail = await client.execute("inspect_native_data_type", {
//       address,
//     });
//     expect(detail).toMatchObject({
//       ok: true,
//       value: {
//         result: {
//           status: "unavailable",
//           source: "analysis-database",
//           metadata_recovery: {
//             source: "read-only-derived-overlay",
//             method_table_address: "0x140002280",
//             related_type: { address: "0x140002200", type: null },
//           },
//         },
//       },
//     });
//   }
//   expect(readSnapshot).toHaveBeenCalledOnce();
//   await client.close();
// });
//
// it.each([
//   ["0x140002280", "0x140002280", "0x140002280"],
//   ["140002280", "0x140002280", "0x140002280"],
//   ["ram:0x140002280", "0x140002280", "0x140002280"],
//   ["%72am:0x140002280", "0x140002280", "0x140002280"],
//   ["0X0140002280", "0x140002280", "0x140002280"],
//   ["0x140002280", "0x140002200", "0x140002200"],
//   ["0x140002280", null, null],
//   ["0x140002280", "register:0x140002280", null],
//   ["0x140002280", "overlay%3Aspace:0x140002280", null],
//   ["0x140002280", "0x140002288", null],
//   ["register:0x140002280", "register:0x140002280", null],
// ] as const)(
//   "looks up NativeAOT type %s using resolved identity %s",
//   async (address, resolvedAddress, expectedTable) => {
//     const bytes = nativeAotPeFixture();
//     const operations: string[] = [];
//     const callerAddresses: unknown[] = [];
//     const readSnapshot = vi.fn(async () =>
//       ok({ kind: "captured" as const, bytes }),
//     );
//     const factory: GhidraProviderClientFactory = () => ({
//       start: () =>
//         Promise.resolve(
//           ok({
//             ...sessionInfo(),
//             target: { ...sessionInfo().target, image_base: "0x140000000" },
//           }),
//         ),
//       callTool: (operation, parameters) => {
//         operations.push(operation);
//         callerAddresses.push(parameters.address);
//         return Promise.resolve(
//           ok(
//             jsonValueSchema.parse(
//               unavailableNativeAotDatabaseType(resolvedAddress),
//             ),
//           ),
//         );
//       },
//       readTargetSnapshot: readSnapshot,
//       close: () => Promise.resolve(ok(null)),
//     });
//     const ghidra = provider(installationHost(), factory);
//     const target = { ...peTarget("x86_64"), sha256: nativeAotPeDigest(bytes) };
//     const profile = await ghidra.resolveAnalysisProfile(target);
//     if (!profile.ok || profile.value.profile === null)
//       throw new Error("Expected admitted PE profile");
//     const client = ghidra.createClient(target, profile.value.profile);
//     const detail = await client.execute("inspect_native_data_type", {
//       address,
//     });
//     expect(detail.ok).toBe(true);
//     if (!detail.ok) throw detail.error;
//     expect(detail.value.result).toMatchObject({ address: resolvedAddress });
//     if (expectedTable === null) {
//       expect(detail.value.result).not.toHaveProperty("metadata_recovery");
//     } else {
//       expect(detail.value.result).toMatchObject({
//         metadata_recovery: {
//           source: "read-only-derived-overlay",
//           method_table_address: expectedTable,
//         },
//       });
//     }
//     expect(callerAddresses).toEqual([address]);
//     expect(readSnapshot).toHaveBeenCalledTimes(
//       resolvedAddress === null ? 0 : 1,
//     );
//     expect(operations).toEqual(["inspect_native_data_type"]);
//     await client.close();
//   },
// );
//
// it("retains engine-provided NativeAOT metadata without deriving another snapshot", async () => {
//   const bytes = nativeAotPeFixture();
//   const metadata = {
//     format: "dotnet-nativeaot",
//     source: "analysis-database",
//     status: "partial",
//     header_address: "0x140002000",
//     format_major: 9,
//     format_minor: 1,
//     method_table_address: "0x140002280",
//     name_origin: "generated",
//     original_name: null,
//     base_size_bytes: 32,
//     related_type: null,
//     interfaces: [],
//     virtual_slots: [],
//     derived_memory: null,
//     diagnostics: ["Engine-provided fixture metadata"],
//     limitations: ["Fixture has no original managed names"],
//   };
//   const readSnapshot = vi.fn(async () => {
//     throw new Error("Unexpected source snapshot read");
//   });
//   const factory: GhidraProviderClientFactory = () => ({
//     start: async () =>
//       ok({
//         ...sessionInfo(),
//         target: { ...sessionInfo().target, image_base: "0x140000000" },
//       }),
//     callTool: async () =>
//       ok(
//         jsonValueSchema.parse({
//           ...unavailableNativeAotDatabaseType("0x140002280"),
//           status: "available",
//           reason: null,
//           id: "/NativeAOT/Example_MT",
//           name: "Example_MT",
//           kind: "struct",
//           size_bytes: 32,
//           alignment_bytes: 8,
//           packing_enabled: false,
//           metadata_recovery: metadata,
//         }),
//       ),
//     readTargetSnapshot: readSnapshot,
//     close: async () => ok(null),
//   });
//   const ghidra = provider(installationHost(), factory);
//   const target = { ...peTarget("x86_64"), sha256: nativeAotPeDigest(bytes) };
//   const profile = await ghidra.resolveAnalysisProfile(target);
//   if (!profile.ok || profile.value.profile === null)
//     throw new Error("Expected admitted PE profile");
//   const client = ghidra.createClient(target, profile.value.profile);
//   const detail = await client.execute("inspect_native_data_type", {
//     address: "0x140002280",
//   });
//   expect(detail).toMatchObject({
//     ok: true,
//     value: { result: { status: "available", metadata_recovery: metadata } },
//   });
//   expect(readSnapshot).not.toHaveBeenCalled();
//   await client.close();
// });
//
// it("shares one session snapshot across callers while isolating cancellation and rejecting a changed base", async () => {
//   const bytes = nativeAotPeFixture();
//   const baseObservation = fixtureDosLoadImage().observation;
//   baseObservation.image_base = "0x140000000";
//   let calls = 0;
//   let snapshotReads = 0;
//   let snapshotSignal: AbortSignal | undefined;
//   let releaseSnapshot:
//     | ((value: Result<GhidraTargetSnapshot, GhidraSessionError>) => void)
//     | undefined;
//   let markSnapshotStarted: (() => void) | undefined;
//   const snapshotStarted = new Promise<void>((resolve) => {
//     markSnapshotStarted = resolve;
//   });
//   const snapshotResult = new Promise<
//     Result<GhidraTargetSnapshot, GhidraSessionError>
//   >((resolve) => {
//     releaseSnapshot = resolve;
//   });
//   const factory: GhidraProviderClientFactory = () => ({
//     start: () => Promise.resolve(ok(sessionInfo())),
//     callTool: (operation) => {
//       calls += 1;
//       const observation = {
//         ...baseObservation,
//         source_files: [
//           { ...baseObservation.source_files[0]!, name: `caller-${calls}` },
//         ],
//       };
//       return Promise.resolve(
//         ok(
//           jsonValueSchema.parse(
//             operation === "inspect_native_load_image"
//               ? observation
//               : unavailableNativeAotDatabaseType("0x140002280"),
//           ),
//         ),
//       );
//     },
//     readTargetSnapshot: (_maximumBytes, signal) => {
//       snapshotReads += 1;
//       snapshotSignal = signal;
//       markSnapshotStarted?.();
//       return snapshotResult;
//     },
//     close: () => Promise.resolve(ok(null)),
//   });
//   const ghidra = provider(installationHost(), factory);
//   const target = { ...peTarget("x86_64"), sha256: nativeAotPeDigest(bytes) };
//   const profile = await ghidra.resolveAnalysisProfile(target);
//   if (!profile.ok || profile.value.profile === null)
//     throw new Error("Expected admitted PE profile");
//   const client = ghidra.createClient(target, profile.value.profile);
//   const firstCaller = new AbortController();
//   const secondCaller = new AbortController();
//   const first = client.execute(
//     "inspect_native_load_image",
//     {},
//     {
//       signal: firstCaller.signal,
//     },
//   );
//   const second = client.execute(
export const _l = 343;
