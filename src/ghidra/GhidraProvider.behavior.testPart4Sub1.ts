export const __stub = 1;
//         },
//         callTool: () => Promise.resolve(ok([])),
//         close: () => Promise.resolve(ok(null)),
//       }));
//       const target = executableTarget("pe", "x86_64");
//       const resolved = await ghidra.resolveAnalysisProfile(target);
//       if (!resolved.ok || resolved.value.profile === null)
//         throw new Error("Expected a PE profile");
//       const client = ghidra.createClient(target, resolved.value.profile);
//       // No preceding health call: a name search must establish symbol coverage itself.
//       const searched = await client.execute("search_procedures", {
//         pattern: "add_numbers",
//       });
//       expect(starts).toBe(1);
//       if (!searched.ok) throw searched.error;
//       expect(searched.value.result).toEqual([]);
//       const health = await client.execute("health", {});
//       if (!health.ok) throw health.error;
//       expect(health.value.result).toMatchObject({ pdb: { ...pdb, loaded } });
//       for (const observation of [searched.value, health.value]) {
//         const limitations = observation.limitations.join("\n");
//         if (loaded === true) {
//           expect(limitations).toContain("loaded PDB");
//           expect(limitations).toContain("not an independent PDB identity");
//           expect(limitations).toContain("empty name search does not prove");
//         } else {
//           expect(limitations).toContain(pdb.file);
//           expect(limitations).toContain(pdb.guid);
//           expect(limitations).toContain("age (hex) a");
//           expect(limitations).toContain("list_procedures");
//           expect(limitations).toContain(
//             loaded === null ? "unknown" : "not loaded",
//           );
//         }
//       }
//       await client.close();
//     },
//   );
// });
//
// const executableTarget = (
//   format: "mach-o" | "elf" | "pe",
//   architecture: Extract<BinaryTarget, { format: "pe" }>["architecture"],
// ): BinaryTarget =>
//   format === "pe"
//     ? peTarget(architecture)
//     : {
//         path: "/tmp/fixture",
//         sha256: "a".repeat(64),
//         kind: "executable",
//         format,
//         architecture,
//         availableArchitectures: [architecture],
//       };
//
// const peTarget = (
//   architecture: Extract<BinaryTarget, { format: "pe" }>["architecture"],
// ): Extract<BinaryTarget, { format: "pe" }> => ({
//   path: "/tmp/fixture",
//   sha256: "a".repeat(64),
//   kind: "executable",
//   format: "pe",
//   peMachine: { x86: 0x014c, x86_64: 0x8664, arm: 0x01c4, arm64: 0xaa64 }[
//     architecture
//   ],
//   architecture,
//   availableArchitectures: [architecture],
//   executableRole: "application",
//   managed: false,
// });
//
// describe("Ghidra extension failures", () => {
//   it.each(["unsupported", "failed", "malformed"] as const)(
//     "preserves %s recovery diagnostics and closes without restarting",
//     async (status) => {
//       const directory = await mkdtemp(
//         join(tmpdir(), "rea-provider-extension-"),
//       );
//       try {
//         const jar = join(directory, "addon.jar");
//         await writeFile(jar, Buffer.from([0x50, 0x4b, 3, 4]));
//         const config = parseConfig({
//           GHIDRA_INSTALL_DIR: INSTALL,
//           REA_GHIDRA_NATIVEAOT_JAR: jar,
//         });
//         if (!config.ok) throw config.error;
//         let starts = 0,
//           calls = 0,
//           closes = 0;
//         const ghidra = new GhidraProvider(
//           config.value,
//           silentLogger,
//           {},
//           installationHost(),
//           () => ({
//             start: () => {
//               starts++;
//               return Promise.resolve(
//                 ok({
//                   ...sessionInfo(),
//                   analysis_extensions: [
//                     {
//                       id: "nativeaot",
//                       sha256:
//                         status === "malformed"
//                           ? "0".repeat(64)
//                           : createHash("sha256")
//                               .update(Buffer.from([0x50, 0x4b, 3, 4]))
//                               .digest("hex"),
//                       status: status === "malformed" ? "failed" : status,
//                       reason:
//                         "directory-discovery: Unsupported layout at 0x401000",
//                       result: {
//                         id: "nativeaot",
//                         integration_api: 1,
//                         source_revision:
//                           "effeb734fc570c32650f88b159608979dc7b423e",
//                         source_revision_authority: "build-reported-unattested",
//                         status: status === "malformed" ? "failed" : status,
//                         reason:
//                           "directory-discovery: Unsupported layout at 0x401000",
//                         method_tables: 0,
//                         diagnostics: ["exact producer diagnostic"],
//                       },
//                     },
//                   ],
//                 }),
//               );
//             },
//             callTool: () => {
//               calls++;
//               return Promise.resolve(ok(null));
//             },
//             close: () => {
//               closes++;
//               return Promise.resolve(ok(null));
//             },
//           }),
//         );
//         const target = executableTarget("elf", "x86_64");
//         const resolved = await ghidra.resolveAnalysisProfile(target);
//         if (!resolved.ok || resolved.value.profile === null)
//           throw new Error("expected extension profile");
//         const client = ghidra.createClient(target, resolved.value.profile);
//         const failed = await client.execute("health", {});
//         expect(failed.ok).toBe(false);
//         if (!failed.ok) {
//           expect(failed.error._tag).toBe(
//             status === "unsupported"
//               ? "AnalysisCapabilityUnavailableError"
//               : "ProviderAdapterError",
//           );
//           expect(JSON.stringify(failed.error)).toContain(
//             status === "malformed"
//               ? "identity mismatch"
//               : "Unsupported layout at 0x401000",
//           );
//         }
//         expect(await client.execute("list_procedures", {})).toEqual(failed);
//         expect({ starts, calls, closes }).toEqual({
//           starts: 1,
//           calls: 0,
//           closes: 1,
//         });
//       } finally {
//         await rm(directory, { recursive: true, force: true });
//       }
//     },
//   );
// });
//
// describe("compatible Ghidra builds", () => {
//   it("accepts the build and reports that it is unverified", async () => {
//     const ghidra = provider(
//       {
//         ...installationHost(),
//         readText: () =>
//           "application.version=12.1.2\napplication.java.min=21\napplication.java.max=\n",
//         probeJava: () => ({
//           osArch: "amd64",
//           osName: "Linux",
//           version: "27",
//           major: 27,
//           home: "/usr/lib/jvm/java-27-openjdk",
//           bits: 64,
//           runtime: "jdk",
//         }),
//       },
//       () => ({
//         start: () =>
//           Promise.resolve(
//             ok({
//               ...sessionInfo(),
//               provider: { id: "ghidra", version: "12.1.2" },
//             }),
//           ),
//         callTool: () =>
//           Promise.resolve(
//             ok([
//               {
//                 address: "0x1000",
//                 value: "fixture_main",
//                 procedure: {
//                   external: false,
//                   thunk: false,
//                   thunk_target: null,
//                 },
//               },
//             ]),
//           ),
//         close: () => Promise.resolve(ok(null)),
//       }),
//     );
//     const resolved = await ghidra.resolveAnalysisProfile(
//       executableTarget("elf", "x86_64"),
//     );
//     if (!resolved.ok || resolved.value.profile === null)
//       throw new Error("expected a compatible Ghidra profile");
//     const client = ghidra.createClient(
//       executableTarget("elf", "x86_64"),
//       resolved.value.profile,
//     );
//     const health = await client.execute("health", {});
//     const procedures = await client.execute("list_procedures", {});
//     expect(ghidra.inspectAvailability()).toMatchObject({
//       status: "available",
//       diagnostics: { provider_version: "12.1.2", java_version: "27" },
//     });
//     expect(health.ok && health.value.provider.version).toBe("12.1.2");
//     const unverified = expect.stringContaining("12.1.2");
//     expect(health.ok && health.value.limitations).toEqual(
//       expect.arrayContaining([unverified]),
//     );
//     expect(procedures.ok && procedures.value.limitations).toEqual(
//       expect.arrayContaining([unverified]),
//     );
//     expect(procedures.ok && procedures.value.provider.version).toBe("12.1.2");
//   });
// });
//
// it("projects Ghidra startup failure and its incomplete cleanup together", async () => {
//   const cleanup = new ProviderCleanupError("ghidra", ["owned-ghidra-process"], {
//     reason: "process cleanup unconfirmed",
//   });
//   const ghidra = provider(installationHost(), () => ({
//     start: async () =>
//       err(
//         new GhidraSessionError(
//           "timeout",
//           "Ghidra startup deadline elapsed",
//           { failure_kind: "timeout" },
//           { timeoutMs: 250, cleanupFailure: cleanup },
//         ),
//       ),
//     callTool: async () => ok(null),
//     close: async () => err(cleanup),
//   }));
//   const target = executableTarget("elf", "x86_64");
//   const profile = await ghidra.resolveAnalysisProfile(target);
//   if (!profile.ok || profile.value.profile === null)
//     throw new Error("Expected Ghidra analysis profile");
//   const result = await ghidra
//     .createClient(target, profile.value.profile)
//     .execute("health", {});
//   expect(result.ok).toBe(false);
//   if (!result.ok)
//     expect(projectAnalysisError(result.error)).toMatchObject({
//       code: "cleanup_incomplete",
//       details: {
//         resources: ["owned-ghidra-process"],
//         diagnostics: {
//           primary_error: {
//             code: "provider_timeout",
//             details: {
//               timeout_ms: 250,
//               diagnostics: { failure_kind: "timeout" },
//             },
//           },
//           cleanup_error: { code: "cleanup_incomplete" },
//         },
//       },
//     });
// });
//
// describe("Ghidra analysis seeds and configured language", () => {
//   const seedSession = async (
//     report: (sha256: string) => GhidraSeedReport | undefined,
//   ) => {
//     const directory = await mkdtemp(join(tmpdir(), "rea-provider-seeds-"));
//     const seeds = join(directory, "seeds.tsv");
//     await writeFile(seeds, "0x401000\tfunction\tentry\n0x401010\tcode\n");
//     const config = parseConfig({
//       GHIDRA_INSTALL_DIR: INSTALL,
//       REA_GHIDRA_SEED_FILE: seeds,
//     });
//     if (!config.ok) throw config.error;
//     const counts = { starts: 0, calls: 0, closes: 0 };
//     const ghidra = new GhidraProvider(
//       config.value,
//       silentLogger,
//       {},
//       installationHost(),
//       () => ({
//         start: () => {
//           counts.starts++;
//           const seedReport = report(
//             createHash("sha256")
//               .update("0x401000\tfunction\tentry\n0x401010\tcode\n")
//               .digest("hex"),
//           );
//           return Promise.resolve(
//             ok({
//               ...sessionInfo(),
//               ...(seedReport === undefined
//                 ? {}
//                 : { analysis_seeds: seedReport }),
//             }),
//           );
//         },
//         callTool: () => {
//           counts.calls++;
//           return Promise.resolve(ok(null));
//         },
//         close: () => {
//           counts.closes++;
//           return Promise.resolve(ok(null));
//         },
//       }),
//     );
//     const target = executableTarget("elf", "x86_64");
//     const resolved = await ghidra.resolveAnalysisProfile(target);
//     if (!resolved.ok || resolved.value.profile === null)
//       throw new Error("expected seed profile");
//     return {
//       directory,
//       counts,
//       client: ghidra.createClient(target, resolved.value.profile),
//     };
//   };
//   const applied = (sha256: string): GhidraSeedReport => ({
//     format: "rea-ghidra-seeds-v1",
//     sha256,
export const _l = 342;
