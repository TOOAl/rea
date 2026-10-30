export const __stub = 1;
//         callTool: () =>
//           Promise.resolve(
//             err(
//               new GhidraSessionError(
//                 "remote",
//                 "Fixture remote failure",
//                 { remote_code: code },
//                 { remoteCode: code },
//               ),
//             ),
//           ),
//         close: () => Promise.resolve(ok(null)),
//       }));
//       const client = await createElfClient(ghidra);
//       await expect(
//         client.execute("list_procedures", {}),
//       ).resolves.toMatchObject({
//         ok: false,
//         error: { _tag: tag },
//       });
//     },
//   );
//
//   it("preserves the rejected name constraint and function address", async () => {
//     const message =
//       "Invalid function name at 0x10100: Symbol name contains invalid characters";
//     const ghidra = provider(installationHost(), () => ({
//       start: () => Promise.resolve(ok(sessionInfo())),
//       callTool: () =>
//         Promise.resolve(
//           err(
//             new GhidraSessionError(
//               "remote",
//               message,
//               {},
//               { remoteCode: "invalid_function_name" },
//             ),
//           ),
//         ),
//       close: () => Promise.resolve(ok(null)),
//     }));
//     const client = await createElfClient(ghidra);
//     await expect(
//       client.execute("annotate_native_function", {
//         procedure: "0x10100",
//         name: "bad name",
//       }),
//     ).resolves.toMatchObject({
//       ok: false,
//       error: {
//         _tag: "AnalysisInputError",
//         issues: [{ path: ["name"], reason: "invalid_value", message }],
//       },
//     });
//   });
//
//   it("projects remote decompile cancellation as a provider-neutral interruption", async () => {
//     const code = "decompile_cancelled";
//     const tag = "AnalysisCancelledError";
//     const ghidra = provider(installationHost(), () => ({
//       start: () => Promise.resolve(ok(sessionInfo())),
//       callTool: () =>
//         Promise.resolve(
//           err(
//             new GhidraSessionError(
//               "remote",
//               "Fixture decompiler interruption",
//               { remote_code: code },
//               { remoteCode: code },
//             ),
//           ),
//         ),
//       close: () => Promise.resolve(ok(null)),
//     }));
//     const client = await createElfClient(ghidra);
//     const result = await client.execute("procedure_pseudo_code", {
//       procedure: "main",
//     });
//     expect(result).toMatchObject({
//       ok: false,
//       error: { _tag: tag },
//     });
//     if (!result.ok)
//       expect(projectAnalysisError(result.error)).toMatchObject({
//         code: "cancelled",
//         details: { diagnostics: { remote_code: code } },
//       });
//   });
//
//   it("returns cancellation before profile work", async () => {
//     const controller = new AbortController();
//     controller.abort();
//     await expect(
//       provider().resolveAnalysisProfile(executableTarget("elf", "x86_64"), {
//         signal: controller.signal,
//       }),
//     ).resolves.toMatchObject({
//       ok: false,
//       error: { _tag: "AnalysisCancelledError", operation: "open_binary" },
//     });
//   });
// });
//
// describe("Ghidra PE CodeView debug symbol limitations", () => {
//   it.each([
//     ["absent report", undefined, "load state unknown"],
//     ["unknown load", null, "load state unknown"],
//     ["not loaded", false, "reports not loaded"],
//     ["loaded", true, "reports a loaded PDB"],
//   ] as const)(
//     "preserves %s in operation and health Evidence without duplicate caveats",
//     async (_, loaded, expected) => {
//       const ghidra = provider(installationHost(), () => ({
//         start: () =>
//           Promise.resolve(
//             ok({
//               ...sessionInfo(),
//               ...(loaded === undefined
//                 ? {}
//                 : {
//                     pdb: {
//                       file: "test.pdb",
//                       guid: "01234567-89ab-cdef-0123-456789abcdef",
//                       age: "1",
//                       signature: null,
//                       version: "RSDS",
//                       loaded,
//                     },
//                   }),
//             }),
//           ),
//         callTool: () => Promise.resolve(ok([])),
//         close: () => Promise.resolve(ok(null)),
//       }));
//       const target = {
//         ...peTarget("x86_64"),
//         codeView: {
//           pdbPath: "test.pdb",
//           pdbFileName: "test.pdb",
//           guid: "01234567-89ab-cdef-0123-456789abcdef",
//           age: 1,
//         },
//       };
//       const profile = await ghidra.resolveAnalysisProfile(target);
//       if (!profile.ok || profile.value.profile === null)
//         throw new Error("expected PE profile");
//       const client = ghidra.createClient(target, profile.value.profile);
//       try {
//         const search = await client.execute("search_procedures", {
//           pattern: "add_numbers",
//         });
//         if (!search.ok) throw search.error;
//         const health = await client.execute("health", {});
//         if (!health.ok) throw health.error;
//         for (const observation of [search.value, health.value]) {
//           const caveats = observation.limitations.filter((limit) =>
//             limit.includes("PDB"),
//           );
//           expect(caveats).toHaveLength(1);
//           expect(caveats[0]).toContain(expected);
//           expect(caveats[0]).not.toContain("names are analysis-generated");
//           expect(caveats[0]).not.toContain("that were not applied");
//         }
//       } finally {
//         await client.close();
//       }
//     },
//   );
// });
//
// describe("Ghidra relationship coverage", () => {
//   it("marks the full direct call-reference response complete while keeping static caveats", async () => {
//     const ghidra = provider(installationHost(), () => ({
//       start: () => Promise.resolve(ok(sessionInfo())),
//       callTool: (operation) =>
//         Promise.resolve(
//           ok(
//             operation === "procedure_callees"
//               ? {
//                   value: ["0x2000"],
//                   limitations: [],
//                   relationship_coverage: {
//                     status: "complete",
//                     diagnostics: [
//                       "Only resolved Ghidra call references are returned; unresolved computed or indirect calls remain unknown, while function classifications distinguish thunks and externals.",
//                     ],
//                   },
//                 }
//               : { value: [], limitations: [] },
//           ),
//         ),
//       close: () => Promise.resolve(ok(null)),
//     }));
//     const client = await createElfClient(ghidra);
//     const execution = await client.execute("procedure_callees", {
//       procedure: "0x1000",
//       document: "fixture",
//     });
//     if (!execution.ok) throw execution.error;
//     expect(execution.value.relationshipCoverage).toEqual({
//       status: "complete",
//       diagnostics: [
//         "Only resolved Ghidra call references are returned; unresolved computed or indirect calls remain unknown, while function classifications distinguish thunks and externals.",
//       ],
//     });
//     expect(execution.value.limitations).not.toContain(
//       "Only resolved Ghidra call references are returned; unresolved computed or indirect calls remain unknown, while function classifications distinguish thunks and externals.",
//     );
//     await client.close();
//   });
// });
//
// describe("Ghidra measured raw load-image projection", () => {
//   it.each([
//     "verified",
//     "mapping-mismatch",
//     "changed-snapshot",
//     "cancelled",
//   ] as const)(
//     "streams raw snapshot identity and preserves %s outcomes",
//     async (state) => {
//       const fixture = fixtureRawBinaryLoadImage();
//       if (state === "mapping-mismatch") {
//         const mapping = fixture.observation.mappings[0];
//         if (mapping === undefined)
//           throw new Error("Missing source mapping fixture");
//         mapping.overlay = true;
//       }
//       const controller = new AbortController();
//       const signals: (AbortSignal | undefined)[] = [];
//       const ghidra = provider(installationHost(), () => ({
//         start: () => Promise.resolve(ok(sessionInfo())),
//         callTool: (operation) => {
//           if (operation !== "inspect_native_load_image")
//             throw new Error(`unexpected operation ${operation}`);
//           return Promise.resolve(
//             ok(jsonValueSchema.parse(fixture.observation)),
//           );
//         },
//         readTargetSnapshot: () => {
//           throw new Error(
//             "raw verification must not capture the complete file",
//           );
//         },
//         hashTargetSnapshot: (signal) => {
//           signals.push(signal);
//           if (state === "cancelled") {
//             controller.abort();
//             return Promise.resolve(
//               err(
//                 new GhidraSessionError(
//                   "cancelled",
//                   "Snapshot hashing cancelled",
//                 ),
//               ),
//             );
//           }
//           return Promise.resolve(
//             ok({
//               ...fixture.snapshot,
//               ...(state === "changed-snapshot"
//                 ? { sha256: "f".repeat(64) }
//                 : {}),
//             }),
//           );
//         },
//         close: () => Promise.resolve(ok(null)),
//       }));
//       const resolved = await ghidra.resolveAnalysisProfile(fixture.target);
//       if (!resolved.ok) throw resolved.error;
//       if (resolved.value.profile === null)
//         throw new Error("expected raw profile");
//       const client = ghidra.createClient(
//         fixture.target,
//         resolved.value.profile,
//       );
//       try {
//         const result = await client.execute(
//           "inspect_native_load_image",
//           {},
//           { signal: controller.signal },
//         );
//         expect(signals).toEqual([controller.signal]);
//         if (state === "verified" || state === "mapping-mismatch") {
//           if (!result.ok) throw result.error;
//           expect(result.value.result).toMatchObject({
//             status: state === "verified" ? "verified" : "mismatch",
//             observations: fixture.observation,
//           });
//           if (state === "mapping-mismatch") {
//             expect(result.value.result).toMatchObject({
//               checks: expect.arrayContaining([
//                 expect.objectContaining({
//                   name: "mapping.overlay",
//                   observed: true,
//                   matched: false,
//                 }),
//               ]),
//             });
//           }
//         } else {
//           expect(result).toMatchObject({
//             ok: false,
//             error: {
//               _tag:
//                 state === "cancelled"
//                   ? "AnalysisCancelledError"
//                   : "ProviderAdapterError",
//             },
//           });
//         }
//       } finally {
//         await client.close();
//       }
//     },
//   );
// });
//
// describe("Ghidra measured DOS load-image projection", () => {
//   it.each([
//     "verified",
//     "mismatch",
//     "changed-snapshot",
//     "unsupported",
//     "missing-snapshot",
//   ] as const)(
//     "preserves %s state and producing observations",
//     async (state) => {
//       const fixture = fixtureDosLoadImage();
//       if (state === "mismatch") fixture.observation.entry_points = ["0x10001"];
//       if (state === "changed-snapshot") fixture.bytes[0] = 0;
//       const factory: GhidraProviderClientFactory = () => ({
//         start: () => Promise.resolve(ok(sessionInfo())),
//         callTool: () =>
//           Promise.resolve(ok(jsonValueSchema.parse(fixture.observation))),
//         close: () => Promise.resolve(ok(null)),
//         ...(state === "missing-snapshot"
//           ? {}
//           : {
//               readTargetSnapshot: () =>
//                 Promise.resolve(ok({ kind: "captured", bytes: fixture.bytes })),
//             }),
//       });
//       const ghidra = provider(installationHost(), factory);
export const _l = 344;
