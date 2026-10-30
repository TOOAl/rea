export const __stub = 1;
//         }),
//       ).toMatchObject({
//         status: "unsupported",
//         code: "target_role_unsupported",
//       });
//       expect(
//         ghidra.inspectTargetSupport({ ...nativeApplication, managed: true }),
//       ).toMatchObject({
//         status: "unsupported",
//         code: "managed_target_unsupported",
//       });
//       expect(
//         ghidra.inspectTargetSupport(executableTarget("elf", "x86_64")),
//       ).toMatchObject({
//         status: "unsupported",
//         code: "target_format_unsupported",
//       });
//       const client = ghidra.createClient(nativeApplication);
//       const health = await client.execute("health", {});
//       if (health.ok)
//         throw new Error(
//           "Failed native admission must not create a ready client",
//         );
//       expect(projectAnalysisError(health.error)).toMatchObject({
//         code: "capability_unavailable",
//         details: {
//           reason: "Windows native controls are unavailable: missing manifest",
//         },
//       });
//       expect(load).toHaveBeenCalledTimes(3);
//     },
//   );
// });
//
// describe("Ghidra Windows PE fixture admission", () => {
//   it.each(["arm", "arm64"] as const)(
//     "does not infer a COFF machine from an unobserved %s family",
//     (architecture) => {
//       const { peMachine, ...unobserved } = peTarget(architecture);
//       expect(peMachine).toBeDefined();
//       expect(
//         provider(installationHost("win32")).inspectTargetSupport(unobserved),
//       ).toMatchObject({
//         status: "unsupported",
//         code: "architecture_unsupported",
//         diagnostics: { pe_machine: null },
//       });
//     },
//   );
//
//   it("admits generated PE32 and PE32+ DLLs and applications while preserving native-only Windows admission", async () => {
//     const root = fileURLToPath(new URL("../../", import.meta.url));
//     await promisify(execFile)(process.execPath, [
//       join(root, "scripts/create-ghidra-windows-fixture.mjs"),
//     ]);
//     const ghidra = provider(installationHost("win32"));
//     for (const architecture of ["x86", "x86_64", "arm", "arm64"] as const) {
//       for (const dll of [false, true]) {
//         const suffix = architecture === "x86_64" ? "" : `-${architecture}`;
//         const path = join(
//           root,
//           "build/fixtures",
//           `rea-ghidra-windows${suffix}.${dll ? "dll" : "exe"}`,
//         );
//         const bytes = await readFile(path);
//         const metadata = parseExecutableHeader(bytes, "x64");
//         const role = dll ? "shared-library" : "application";
//         expect(metadata).toMatchObject({
//           ok: true,
//           value: {
//             format: "pe",
//             architecture,
//             executableRole: role,
//             managed: false,
//           },
//         });
//         if (!metadata.ok) throw new Error(metadata.error);
//         if (metadata.value.format !== "pe")
//           throw new Error("Expected a PE fixture");
//         const target: BinaryTarget = {
//           path,
//           sha256: createHash("sha256").update(bytes).digest("hex"),
//           kind: "executable",
//           ...metadata.value,
//         };
//         expect(ghidra.inspectTargetSupport(target).status).toBe("supported");
//         if (architecture === "arm") {
//           for (const peMachine of [0x01c0, 0x01c2]) {
//             const legacy = Buffer.from(bytes);
//             legacy.writeUInt16LE(peMachine, legacy.readUInt32LE(0x3c) + 4);
//             const parsed = parseExecutableHeader(legacy, "x64");
//             if (!parsed.ok) throw new Error(parsed.error);
//             if (parsed.value.format !== "pe")
//               throw new Error("Expected a PE fixture");
//             expect(parsed.value).toMatchObject({ architecture, peMachine });
//             expect(
//               ghidra.inspectTargetSupport({
//                 ...target,
//                 ...parsed.value,
//                 sha256: createHash("sha256").update(legacy).digest("hex"),
//               }),
//             ).toMatchObject({
//               status: "unsupported",
//               code: "architecture_unsupported",
//               diagnostics: { pe_machine: peMachine },
//             });
//           }
//         }
//         for (const [candidate, code] of [
//           [
//             { ...target, executableRole: "non-executable" },
//             "target_role_unsupported",
//           ],
//           [{ ...target, managed: true }, "managed_target_unsupported"],
//         ] as const) {
//           expect(ghidra.inspectTargetSupport(candidate)).toMatchObject({
//             status: "unsupported",
//             code,
//           });
//         }
//       }
//     }
//   });
// });
//
// describe("Ghidra startup configuration", () => {
//   it("carries supplied startup settings through configuration, the provider, the timer and timeout diagnostics", async () => {
//     const target = executableTarget("elf", "x86_64");
//     for (const [raw, expected] of [
//       [undefined, 330_000],
//       ["900000", 900_000],
//       ["1260000", 1_260_000],
//       ["2147483647", 2_147_483_647],
//     ] as const) {
//       const config = parseConfig({
//         GHIDRA_INSTALL_DIR: INSTALL,
//         ...(raw === undefined ? {} : { REA_GHIDRA_STARTUP_TIMEOUT_MS: raw }),
//       });
//       if (!config.ok) throw config.error;
//       let timeout: number | undefined;
//       const ghidra = new GhidraProvider(
//         config.value,
//         silentLogger,
//         {},
//         installationHost(),
//         (options) => {
//           timeout = options.startupTimeoutMs;
//           return {
//             start: () =>
//               Promise.resolve(
//                 err(
//                   new GhidraSessionError(
//                     "timeout",
//                     "Startup deadline elapsed",
//                     {},
//                   ),
//                 ),
//               ),
//             callTool: () => Promise.resolve(ok([])),
//             close: () => Promise.resolve(ok(null)),
//           };
//         },
//       );
//       const profile = await ghidra.resolveAnalysisProfile(target);
//       if (!profile.ok) throw profile.error;
//       if (profile.value.profile === null)
//         throw new Error("Expected a bound profile");
//       const client = ghidra.createClient(target, profile.value.profile);
//       try {
//         const failure = await client.execute("health", {});
//         expect(timeout, String(raw)).toBe(expected);
//         expect(failure).toMatchObject({
//           ok: false,
//           error: { _tag: "AnalysisTimeoutError", timeoutMs: expected },
//         });
//         if (timeout === undefined)
//           throw new Error("Provider omitted startup deadline");
//         const deadline = new ProviderStartupDeadline(timeout);
//         try {
//           expect(await deadline.wait(20)).toBe("elapsed");
//           expect(deadline.signal.aborted).toBe(false);
//         } finally {
//           deadline.dispose();
//         }
//       } finally {
//         await client.close();
//       }
//     }
//   });
// });
//
// describe("Ghidra client projection", () => {
//   it("commits exact provider, isolation, and resource semantics", async () => {
//     const toolCalls: Array<{
//       readonly operation: string;
//       readonly input: unknown;
//       readonly options: unknown;
//     }> = [];
//     let startCount = 0;
//     const factoryOptions: unknown[] = [];
//     const callTool: ReturnType<GhidraProviderClientFactory>["callTool"] = (
//       operation,
//       input,
//       options,
//     ) => {
//       toolCalls.push({ operation, input, options });
//       return Promise.resolve(
//         ok([
//           {
//             address: "0x1000",
//             value: "fixture_main",
//             procedure: {
//               external: false,
//               thunk: false,
//               thunk_target: null,
//             },
//           },
//         ]),
//       );
//     };
//     const clientFactory: GhidraProviderClientFactory = (options) => {
//       factoryOptions.push(options);
//       return {
//         start: () => {
//           startCount += 1;
//           return Promise.resolve(ok(sessionInfo()));
//         },
//         callTool,
//         close: () => Promise.resolve(ok(null)),
//       };
//     };
//     const ghidra = provider(installationHost(), clientFactory);
//     const resolved = await ghidra.resolveAnalysisProfile(
//       executableTarget("elf", "x86_64"),
//     );
//
//     if (!resolved.ok) throw resolved.error;
//     if (resolved.value.profile === null)
//       throw new Error("Expected a bound Ghidra profile");
//     expect(resolved.value.profile).toMatchObject({
//       provider: { id: "ghidra", name: "Ghidra", version: "12.1.4" },
//       parameters: {
//         import_mode: "ephemeral-source-immutable",
//         annotation_policy: "atomic-function-entry-metadata-v1",
//         analyzer_preset: "ghidra-default",
//       },
//     });
//     expect(resolved.value.profile.parameters).toMatchObject({
//       language_id: "auto-from-header",
//       compiler_spec_id: "auto-default",
//       call_relationship_coverage: "function-body-call-coverage-v5",
//       function_dossier_coverage: "observed-facets-and-call-relationships-v1",
//     });
//
//     const result = await ghidra
//       .createClient(executableTarget("elf", "x86_64"), resolved.value.profile, {
//         runId: "11111111-1111-4111-8111-111111111111",
//       })
//       .execute("list_procedures", {});
//     expect(factoryOptions).toEqual([
//       expect.objectContaining({
//         runId: "11111111-1111-4111-8111-111111111111",
//         platform: "linux",
//         launcher: expect.objectContaining({
//           options: expect.objectContaining({
//             javaVmName: "OpenJDK 64-Bit Server VM",
//           }),
//         }),
//       }),
//     ]);
//     expect(toolCalls).toEqual([
//       {
//         operation: "list_procedures",
//         input: { document: null },
//         options: {},
//       },
//     ]);
//     expect(result).toMatchObject({
//       ok: true,
//       value: {
//         provider: {
//           id: "ghidra",
//           name: "Ghidra",
//           version: "12.1.4",
//         },
//         analysisProfile: resolved.value.profile,
//         result: [{ address: "0x1000", value: "fixture_main" }],
//         rawResult: [{ procedure: { external: false, thunk: false } }],
//       },
//     });
//     expect(startCount).toBe(0);
//   });
// });
//
// describe("Ghidra result projection", () => {
//   it("rejects malformed inventory output before Evidence creation", async () => {
//     const ghidra = provider(installationHost(), () => ({
//       start: () => Promise.resolve(ok(sessionInfo())),
//       callTool: () => Promise.resolve(ok({ items: "not-an-inventory" })),
//       close: () => Promise.resolve(ok(null)),
//     }));
//     const client = await createElfClient(ghidra);
//     await expect(client.execute("list_procedures", {})).resolves.toMatchObject({
//       ok: false,
//       error: { _tag: "AnalysisOutputError" },
//     });
//   });
//
//   it("projects terminal-call facts from the function bridge into execution limitations", async () => {
//     const limitation =
//       "Ghidra Listing reports a terminal call at 0x401020 to 0x7f001000 __tls_get_addr (external=true, thunk=false, hasNoReturn=true); fallthrough is excluded by Ghidra's flow model. This records Ghidra's FunctionManager flag, not an independent verification that the callee cannot return.";
//     const ghidra = provider(installationHost(), () => ({
//       start: () => Promise.resolve(ok(sessionInfo())),
//       callTool: () =>
//         Promise.resolve(
//           ok({ value: "void main() {}", limitations: [limitation] }),
//         ),
//       close: () => Promise.resolve(ok(null)),
//     }));
//     const client = await createElfClient(ghidra);
//     const execution = await client.execute("procedure_pseudo_code", {
//       procedure: "main",
//     });
//     if (!execution.ok) throw execution.error;
//     expect(execution.value.result).toBe("void main() {}");
//     expect(execution.value.limitations).toContain(limitation);
//     expect(execution.value.rawResult).toEqual({
//       value: "void main() {}",
//       limitations: [limitation],
//     });
//     await client.close();
//   });
//
//   it.each([
//     ["invalid_request", "AnalysisInputError"],
//     ["not_found", "AnalysisInputError"],
//     ["ambiguous", "AnalysisInputError"],
//     ["method_unavailable", "AnalysisCapabilityUnavailableError"],
//   ] as const)(
//     "projects remote %s without losing its typed meaning",
//     async (code, tag) => {
//       const ghidra = provider(installationHost(), () => ({
//         start: () => Promise.resolve(ok(sessionInfo())),
export const _l = 343;
