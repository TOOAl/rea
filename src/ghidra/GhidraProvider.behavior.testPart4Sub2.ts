export const __stub = 1;
//     entries: 2,
//     function_created: 1,
//     function_existing: 0,
//     function_failed: 0,
//     code_decoded: 0,
//     code_failed: 1,
//     label_applied: 0,
//     label_failed: 0,
//     unmapped: 0,
//   });
//
//   it("reports the verified seed outcome as a session limitation", async () => {
//     const { directory, client } = await seedSession(applied);
//     try {
//       const health = await client.execute("health", {});
//       if (!health.ok) throw health.error;
//       expect(health.value.limitations).toEqual(
//         expect.arrayContaining([
//           expect.stringContaining("caller assertions, not Ghidra discoveries"),
//           expect.stringContaining(
//             "1 functions created, 0 already present, 0 failed; 0 code seeds decoded, 1 failed",
//           ),
//         ]),
//       );
//     } finally {
//       await rm(directory, { recursive: true, force: true });
//     }
//   });
//
//   it.each([
//     ["no seed report", () => undefined],
//     [
//       "a report for other seeds",
//       (sha256: string): GhidraSeedReport => ({
//         ...applied(sha256),
//         sha256: "0".repeat(64),
//       }),
//     ],
//   ])("fails closed on %s before any analysis call", async (_label, report) => {
//     const { directory, counts, client } = await seedSession(report);
//     try {
//       const failed = await client.execute("list_procedures", {});
//       expect(failed.ok).toBe(false);
//       if (!failed.ok) expect(failed.error._tag).toBe("ProviderAdapterError");
//       expect(counts).toEqual({ starts: 1, calls: 0, closes: 1 });
//     } finally {
//       await rm(directory, { recursive: true, force: true });
//     }
//   });
//
//   it("refuses a profile resolved without the configured seeds or language", async () => {
//     const plain = parseConfig({ GHIDRA_INSTALL_DIR: INSTALL });
//     if (!plain.ok) throw plain.error;
//     const target = executableTarget("elf", "x86_64");
//     const resolved = await new GhidraProvider(
//       plain.value,
//       silentLogger,
//       {},
//       installationHost(),
//     ).resolveAnalysisProfile(target);
//     if (!resolved.ok || resolved.value.profile === null)
//       throw new Error("expected profile");
//     for (const environment of [
//       { REA_GHIDRA_SEED_FILE: "/seeds.tsv" },
//       { REA_GHIDRA_LANGUAGE_ID: "x86:LE:32:default" },
//     ]) {
//       const configured = parseConfig({
//         GHIDRA_INSTALL_DIR: INSTALL,
//         ...environment,
//       });
//       if (!configured.ok) throw configured.error;
//       let starts = 0;
//       const client = new GhidraProvider(
//         configured.value,
//         silentLogger,
//         {},
//         installationHost(),
//         () => ({
//           start: () => {
//             starts++;
//             return Promise.resolve(ok(sessionInfo()));
//           },
//           callTool: () => Promise.resolve(ok(null)),
//           close: () => Promise.resolve(ok(null)),
//         }),
//       ).createClient(target, resolved.value.profile);
//       const failed = await client.execute("health", {});
//       expect(failed.ok).toBe(false);
//       expect(starts).toBe(0);
//     }
//   });
// });
//
// describe("Ghidra disabled analyzer options", () => {
//   const configuredProvider = (
//     environment: Record<string, string>,
//     clientFactory?: GhidraProviderClientFactory,
//   ) => {
//     const config = parseConfig({ GHIDRA_INSTALL_DIR: INSTALL, ...environment });
//     if (!config.ok) throw config.error;
//     return new GhidraProvider(
//       config.value,
//       silentLogger,
//       {},
//       installationHost(),
//       clientFactory,
//     );
//   };
//
//   it("records the configured analyzer options in the analysis profile", async () => {
//     const ghidra = configuredProvider({
//       REA_GHIDRA_DISABLED_ANALYZERS:
//         "Objective-C Message Analyzer,Decompiler Switch Analysis",
//     });
//     const resolved = await ghidra.resolveAnalysisProfile(
//       executableTarget("elf", "x86_64"),
//     );
//     if (!resolved.ok || resolved.value.profile === null)
//       throw new Error("expected a bound Ghidra profile");
//     expect(resolved.value.profile.parameters).toMatchObject({
//       analyzer_preset:
//         "ghidra-default+disabled:Objective-C Message Analyzer,Decompiler Switch Analysis",
//       analysis_options: {
//         disabled_analyzers: [
//           "Objective-C Message Analyzer",
//           "Decompiler Switch Analysis",
//         ],
//       },
//     });
//   });
//
//   it("hands the configured analyzers to the launcher for a matching profile", async () => {
//     const launchers: GhidraHeadlessLauncher[] = [];
//     const ghidra = configuredProvider(
//       { REA_GHIDRA_DISABLED_ANALYZERS: "Objective-C Message Analyzer" },
//       (options) => {
//         launchers.push(options.launcher as GhidraHeadlessLauncher);
//         return {
//           start: () => Promise.resolve(ok(sessionInfo())),
//           callTool: () => Promise.resolve(ok(null)),
//           close: () => Promise.resolve(ok(null)),
//         };
//       },
//     );
//     const target = executableTarget("elf", "x86_64");
//     const resolved = await ghidra.resolveAnalysisProfile(target);
//     if (!resolved.ok || resolved.value.profile === null)
//       throw new Error("expected a bound Ghidra profile");
//     const client = ghidra.createClient(target, resolved.value.profile);
//     const health = await client.execute("health", {});
//     expect(health.ok).toBe(true);
//     expect(launchers).toHaveLength(1);
//     expect(launchers[0]?.options.disabledAnalyzers).toEqual([
//       "Objective-C Message Analyzer",
//     ]);
//   });
//
//   it("binds analyzer overrides and raw import settings in one profile", async () => {
//     const launchers: GhidraHeadlessLauncher[] = [];
//     const ghidra = configuredProvider(
//       { REA_GHIDRA_DISABLED_ANALYZERS: "Decompiler Switch Analysis" },
//       (options) => {
//         launchers.push(options.launcher as GhidraHeadlessLauncher);
//         return {
//           start: () => Promise.resolve(ok(sessionInfo())),
//           callTool: () => Promise.resolve(ok(null)),
//           close: () => Promise.resolve(ok(null)),
//         };
//       },
//     );
//     const target: BinaryTarget = {
//       path: "/tmp/entry.bin",
//       sha256: "a".repeat(64),
//       kind: "executable",
//       format: "raw-binary",
//       architecture: "x86",
//       availableArchitectures: ["x86"],
//       entryPoint: "0x1000",
//       entryPointSource: "0x1000",
//     };
//     const resolved = await ghidra.resolveAnalysisProfile(target);
//     if (!resolved.ok || resolved.value.profile === null)
//       throw new Error("expected a bound raw-binary profile");
//     expect(resolved.value.profile.parameters).toMatchObject({
//       target_format: "raw-binary",
//       entry_point: "0x1000",
//       analyzer_preset: "ghidra-default+disabled:Decompiler Switch Analysis",
//       analysis_options: { disabled_analyzers: ["Decompiler Switch Analysis"] },
//     });
//     const client = ghidra.createClient(target, resolved.value.profile);
//     expect(launchers).toHaveLength(1);
//     expect(launchers[0]?.options).toMatchObject({
//       disabledAnalyzers: ["Decompiler Switch Analysis"],
//       rawBinary: {
//         languageId: "x86:LE:32:default",
//         compilerSpecId: "gcc",
//         baseAddr: "0x1000",
//       },
//     });
//     await client.close();
//   });
//
//   it("refuses a profile resolved without or with other analyzer options", async () => {
//     const target = executableTarget("elf", "x86_64");
//     const plainProvider = configuredProvider({});
//     const plain = await plainProvider.resolveAnalysisProfile(target);
//     if (!plain.ok || plain.value.profile === null)
//       throw new Error("expected profile");
//     const configuredProvider2 = configuredProvider({
//       REA_GHIDRA_DISABLED_ANALYZERS: "Objective-C Message Analyzer",
//     });
//     const configured = await configuredProvider2.resolveAnalysisProfile(target);
//     if (!configured.ok || configured.value.profile === null)
//       throw new Error("expected configured profile");
//     for (const [profile, environment] of [
//       [
//         plain.value.profile,
//         { REA_GHIDRA_DISABLED_ANALYZERS: "Objective-C Message Analyzer" },
//       ],
//       [configured.value.profile, {}],
//       [
//         configured.value.profile,
//         { REA_GHIDRA_DISABLED_ANALYZERS: "Decompiler Switch Analysis" },
//       ],
//     ] as const) {
//       let starts = 0;
//       const client = configuredProvider(environment, () => ({
//         start: () => {
//           starts++;
//           return Promise.resolve(ok(sessionInfo()));
//         },
//         callTool: () => Promise.resolve(ok(null)),
//         close: () => Promise.resolve(ok(null)),
//       })).createClient(target, profile);
//       const failed = await client.execute("health", {});
//       expect(failed.ok).toBe(false);
//       if (!failed.ok) expect(failed.error._tag).toBe("ProviderAdapterError");
//       expect(starts).toBe(0);
//     }
//   });
// });
//
// describe("Ghidra queries after the owned provider is lost", () => {
//   const lostProviderSession = async (
//     state: "exited" | "unreachable" | "idle",
//     failureKind: "process" | "protocol" | "remote" = "process",
//     answeredBeforeLoss = true,
//   ) => {
//     let calls = 0;
//     const ghidra = provider(installationHost(), () => ({
//       start: async () =>
//         err(new GhidraSessionError("start", "startup is not exercised")),
//       callTool: async () => {
//         calls += 1;
//         if (answeredBeforeLoss && calls === 1) return ok(null);
//         return err(
//           new GhidraSessionError(
//             failureKind,
//             "Ghidra bridge socket closed",
//             { failure_kind: failureKind },
//             failureKind === "remote" ? { remoteCode: "internal" } : {},
//           ),
//         );
//       },
//       close: async () => ok(null),
//       operationHealthSnapshot: () =>
//         state === "idle"
//           ? undefined
//           : {
//               state,
//               stage: null,
//               retryAction: "restart_provider",
//               exitCode: state === "exited" ? 137 : null,
//               requests: [],
//             },
//     }));
//     const target = executableTarget("elf", "x86_64");
//     const profile = await ghidra.resolveAnalysisProfile(target);
//     if (!profile.ok || profile.value.profile === null)
//       throw new Error("Expected Ghidra analysis profile");
//     const client = ghidra.createClient(target, profile.value.profile);
//     if (answeredBeforeLoss) await client.execute("list_documents", {});
//     return client;
//   };
//
//   it("tells the caller to reopen the target when Ghidra exited", async () => {
//     const client = await lostProviderSession("exited");
//     const result = await client.execute("list_documents", {});
//     expect(result.ok).toBe(false);
//     if (result.ok) return;
//     const projected = projectAnalysisError(result.error);
//     expect(projected).toMatchObject({
//       code: "execution_failure",
//       retryable: false,
//       details: { provider_id: "ghidra", operation: "list_documents" },
//     });
//     expect(projected.message).toContain("exited with code 137");
//     expect(projected.message).toContain("Call open_binary");
//     expect(projected.remediation.action).toContain("Call open_binary");
//     expect(projected.remediation.action).not.toContain("rea doctor");
//   });
//
//   it("tells the caller to reopen the target when the bridge became unreachable", async () => {
//     const client = await lostProviderSession("unreachable", "protocol");
//     const result = await client.execute("list_procedures", {});
//     expect(result.ok).toBe(false);
//     if (result.ok) return;
//     const projected = projectAnalysisError(result.error);
//     expect(projected.message).toContain("became unreachable");
//     expect(projected.remediation.action).toContain("Call open_binary");
//   });
//
//   it("keeps installation guidance when Ghidra dies before it ever answered", async () => {
//     const client = await lostProviderSession("exited", "process", false);
//     const result = await client.execute("list_documents", {});
//     expect(result.ok).toBe(false);
//     if (result.ok) return;
//     const projected = projectAnalysisError(result.error);
//     expect(projected.message).not.toContain("Call open_binary");
//     expect(projected.remediation.action).toContain("rea doctor");
//   });
//
//   it("keeps the generic failure when the provider is not known to be lost", async () => {
//     const client = await lostProviderSession("idle");
//     const result = await client.execute("list_documents", {});
//     expect(result.ok).toBe(false);
//     if (result.ok) return;
//     expect(projectAnalysisError(result.error).remediation.action).toContain(
//       "rea doctor",
//     );
//   });
//
//   it("does not reinterpret a bridge-reported failure as a lost provider", async () => {
//     const client = await lostProviderSession("exited", "remote");
//     const result = await client.execute("list_documents", {});
//     expect(result.ok).toBe(false);
//     if (result.ok) return;
//     expect(projectAnalysisError(result.error).message).not.toContain(
//       "Call open_binary",
//     );
//   });
// });
export const _l = 342;
