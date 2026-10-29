export const __stub = 1;
//             image_base: "0x0",
//             default_address_space: "ram",
//             sha256: "a".repeat(64),
//           },
//           ...(reported === undefined
//             ? {}
//             : { mips_soft_float_storage: reported }),
//         }),
//       );
//     },
//     callTool: () => {
//       counts.calls++;
//       return Promise.resolve(ok(null));
//     },
//     close: () => {
//       counts.closes++;
//       return Promise.resolve(ok(null));
//     },
//   }));
//   const resolved = await ghidra.resolveAnalysisProfile(profileFor);
//   if (!resolved.ok || resolved.value.profile === null)
//     throw new Error("expected a MIPS profile");
//   return {
//     counts,
//     profile: resolved.value.profile,
//     client: ghidra.createClient(value, resolved.value.profile),
//   };
// };
//
// describe("legacy profile bindings", () => {
//   it("refuses a legacy endian pin committed for a different target", async () => {
//     const { counts, client } = await session(
//       target({ flags: 0x50000001, abiFlags: null, byteOrder: "big" }),
//       undefined,
//       target({ flags: 0x50000001, abiFlags: null, byteOrder: "little" }),
//     );
//     expect((await client.execute("health", {})).ok).toBe(false);
//     expect(counts.starts).toBe(0);
//   });
//   it.each([0x50000201, 0x50000401, 0x54000001, 0x50910001])(
//     "refuses unsupported same-endian legacy flags %i before startup",
//     async (flags) => {
//       const value = target({ flags, abiFlags: null });
//       expect(ghidraPinnedLanguage(value)).toBeUndefined();
//       const { counts, client } = await session(
//         value,
//         undefined,
//         target({ flags: 0x50000001, abiFlags: null }),
//       );
//       expect((await client.execute("health", {})).ok).toBe(false);
//       expect(counts.starts).toBe(0);
//     },
//   );
//   const unpinnedTargets: BinaryTarget[] = [
//     target(),
//     {
//       path: "/fixture.elf",
//       sha256: "a".repeat(64),
//       kind: "executable",
//       format: "elf",
//       architecture: "x86_64",
//       availableArchitectures: ["x86_64"],
//     },
//   ];
//   it.each(unpinnedTargets)(
//     "refuses a pinned profile for an unpinned target $architecture",
//     async (value) => {
//       expect(ghidraPinnedLanguage(value)).toBeUndefined();
//       const { counts, client } = await session(
//         value,
//         undefined,
//         target({ flags: 0x50000001, abiFlags: null }),
//       );
//       expect((await client.execute("health", {})).ok).toBe(false);
//       expect(counts.starts).toBe(0);
//     },
//   );
// });
//
// describe("MIPS16 shared-image profile", () => {
//   const shared = (change: Partial<MipsElfMetadata> = {}) =>
//     target({
//       type: 3,
//       flags: 0x74001005,
//       abiFlags: null,
//       sharedLoad: {
//         status: "complete",
//         relocationCount: 14,
//         relocationTypes: [0, 3],
//         symbolRelativeCount: 0,
//       },
//       ...change,
//     });
//   it.each(["little", "big"] as const)(
//     "pins a generic 32-bit %s language and retains the source ABI uncertainty",
//     async (byteOrder) => {
//       const ghidra = new GhidraProvider(config, silentLogger, {}, host);
//       const value = shared({ byteOrder });
//       expect(ghidra.inspectTargetSupport(value).status).toBe("supported");
//       const resolved = await ghidra.resolveAnalysisProfile(value);
//       if (!resolved.ok || resolved.value.profile === null)
//         throw new Error("expected shared profile");
//       const parameters = resolved.value.profile.parameters;
//       expect(parameters).toMatchObject({
//         language_id: `MIPS:${byteOrder === "little" ? "LE" : "BE"}:32:default`,
//         compiler_spec_id: "default",
//         language_selection: "provider-pinned-v1",
//         mips_support_lane: "elf32-dyn-o32-arch32r2-mips16-local-rel32-v1",
//         mips_elf: { abi_flags: null },
//       });
//       expect(ghidraProfileLanguageOverride(parameters)).toEqual({
//         languageId: parameters.language_id,
//         compilerSpecId: "default",
//       });
//     },
//   );
//   it("retains shared-image and unknown floating-point limitations on the session", async () => {
//     const { client } = await session(shared(), undefined);
//     const health = await client.execute("health", {});
//     if (!health.ok) throw health.error;
//     expect(health.value.limitations).toEqual(
//       expect.arrayContaining([
//         expect.stringContaining("External GOT bindings"),
//         expect.stringContaining("does not establish the floating-point ABI"),
//       ]),
//     );
//   });
//   it("continues to admit a declared FPXX record only when its MIPS16 ASE agrees", () => {
//     const ghidra = new GhidraProvider(config, silentLogger, {}, host);
//     expect(
//       ghidra.inspectTargetSupport(shared(abi({ ases: 0x400 }))).status,
//     ).toBe("supported");
//     expect(ghidra.inspectTargetSupport(shared(abi({ ases: 0 }))).status).toBe(
//       "unsupported",
//     );
//   });
//   it.each([
//     { flags: 0x74001045 },
//     { limitations: ["Unexamined section declarations"] },
//     {
//       sharedLoad: {
//         status: "complete",
//         relocationCount: 1,
//         relocationTypes: [3],
//         symbolRelativeCount: 1,
//       },
//     },
//   ] satisfies Partial<MipsElfMetadata>[])(
//     "refuses incomplete or unverified source declarations %j",
//     (change) => {
//       const ghidra = new GhidraProvider(config, silentLogger, {}, host);
//       expect(ghidra.inspectTargetSupport(shared(change)).status).toBe(
//         "unsupported",
//       );
//     },
//   );
//   it.each(["sharedLoad", "abiFlags", "gnuAttributes"] as const)(
//     "refuses an uninspected %s declaration",
//     (declaration) => {
export const _l = 159;
