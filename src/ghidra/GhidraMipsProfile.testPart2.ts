export const __stub = 1;
//     const ida = new IdaProvider(config, {});
//     expect(ida.inspectTargetSupport(target()).status).toBe("unsupported");
//   });
// });
//
// describe("recordless legacy MIPS32 admission", () => {
//   it("keeps recordless relocatable objects off the inferred-o32 lane", async () => {
//     const ghidra = new GhidraProvider(config, silentLogger, {}, host);
//     const object = target({
//       flags: 0x50000001,
//       abiFlags: null,
//       type: 1,
//     });
//     expect(ghidra.inspectTargetSupport(object)).toMatchObject({
//       status: "unsupported",
//     });
//     const resolved = await ghidra.resolveAnalysisProfile(object);
//     expect(resolved).toMatchObject({
//       ok: false,
//       error: {
//         _tag: "AnalysisUnsupportedTargetError",
//         reason: expect.stringContaining("ET_EXEC"),
//       },
//     });
//   });
//
//   it.each([
//     [{ flags: 0x50000001 }, "EF_MIPS_ARCH_32"],
//     [{ flags: 0x70000001 }, "EF_MIPS_ARCH_32R2"],
//   ] satisfies [Partial<MipsElfMetadata>, string][])(
//     "admits a recordless legacy header (%s) with a pinned 32-bit language",
//     async (change) => {
//       const ghidra = new GhidraProvider(config, silentLogger, {}, host);
//       const little = target({ ...change, abiFlags: null });
//       const big = target({ ...change, abiFlags: null, byteOrder: "big" });
//       expect(ghidra.inspectTargetSupport(little).status).toBe("supported");
//       expect(ghidra.inspectTargetSupport(big).status).toBe("supported");
//       const resolved = await ghidra.resolveAnalysisProfile(little);
//       if (!resolved.ok) throw resolved.error;
//       expect(resolved.value.profile?.parameters).toMatchObject({
//         mips_support_lane: "elf32-exec-arch32-legacy-pinned-v1",
//         mips_abi_basis: "inferred-o32-assumption-v1",
//         language_id: "MIPS:LE:32:default",
//         compiler_spec_id: "default",
//         language_selection: "provider-pinned-v1",
//       });
//       const resolvedBig = await ghidra.resolveAnalysisProfile(big);
//       if (!resolvedBig.ok) throw resolvedBig.error;
//       expect(resolvedBig.value.profile?.parameters).toMatchObject({
//         language_id: "MIPS:BE:32:default",
//       });
//     },
//   );
//
//   it("requires an inspected absence; a merely unobserved record stays refused", () => {
//     const ghidra = new GhidraProvider(config, silentLogger, {}, host);
//     const withRecord = target({ flags: 0x50000001 }) as BinaryTarget & {
//       mips: MipsElfMetadata;
//     };
//     const { abiFlags: _record, ...unobservedMips } = withRecord.mips;
//     void _record;
//     expect(
//       ghidra.inspectTargetSupport({
//         ...withRecord,
//         mips: unobservedMips,
//       } as BinaryTarget),
//     ).toMatchObject({
//       status: "unsupported",
//       reason: expect.stringContaining("recordless legacy header"),
//     });
//   });
//
//   it.each([
//     [{ flags: 0x50000021 }, "n32"],
//     [{ flags: 0x50000041 }, "EF_MIPS_ABI_ON32"],
//     [{ flags: 0x50000101 }, "EF_MIPS_32BITMODE"],
//     [{ flags: 0x70000101 }, "EF_MIPS_32BITMODE"],
//     [
//       { flags: 0x50001001 },
//       "EF_MIPS_ARCH_32R2 for headers that declare an ABI",
//     ],
//     [{ flags: 0x50000201 }, "EF_MIPS_FP64"],
//     [{ flags: 0x50000401 }, "EF_MIPS_NAN2008"],
//     [{ flags: 0x60000001 }, "32R2"],
//     [
//       {
//         flags: 0x50000001,
//         limitations: [
//           "MIPS section header table at file offset 96 extends beyond the captured file: examined 2 of 5 complete headers. ABI declarations in unavailable headers remain unknown.",
//         ],
//       },
//       "complete ABI-record inspection",
//     ],
//   ] satisfies [Partial<MipsElfMetadata>, string][])(
//     "keeps refusing unverified recordless variants %j",
//     (change, reason) => {
//       const ghidra = new GhidraProvider(config, silentLogger, {}, host);
//       expect(
//         ghidra.inspectTargetSupport(target({ ...change, abiFlags: null })),
//       ).toMatchObject({
//         status: "unsupported",
//         reason: expect.stringContaining(reason),
//       });
//     },
//   );
//
//   it("a caller-selected language wins over the provider pin", () => {
//     const parameters = ghidraMipsProfileParameters(
//       target({ flags: 0x50000001, abiFlags: null }),
//       { languageId: "MIPS:LE:32:default", compilerSpecId: "default" },
//     );
//     expect(parameters.language_selection).toBeUndefined();
//     expect(parameters.language_id).toBeUndefined();
//     expect(parameters).toMatchObject({
//       mips_support_lane: "elf32-exec-arch32-legacy-pinned-v1",
//     });
//   });
//
//   it("reads the pinned import language back only from pinned profiles", () => {
//     const pinned = ghidraMipsProfileParameters(
//       target({ flags: 0x50000001, abiFlags: null }),
//     );
//     expect(ghidraPinnedMipsLanguage(pinned)).toEqual({
//       languageId: "MIPS:LE:32:default",
//       compilerSpecId: "default",
//     });
//     const standard = ghidraMipsProfileParameters(target());
//     expect(ghidraPinnedMipsLanguage(standard)).toBeUndefined();
//   });
// });
//
// const report: GhidraMipsSoftFloatReport = {
//   policy: "o32-soft-float-prototype-v1",
//   functions: 5,
//   definitions: 1,
// };
// const session = async (
//   value: BinaryTarget,
//   reported: GhidraMipsSoftFloatReport | undefined,
//   profileFor: BinaryTarget = value,
// ) => {
//   const counts = { starts: 0, calls: 0, closes: 0 };
//   const ghidra = new GhidraProvider(config, silentLogger, {}, host, () => ({
//     start: () => {
//       counts.starts++;
//       return Promise.resolve(
//         ok({
//           name: "REA Ghidra bridge" as const,
//           run_id: "11111111-1111-4111-8111-111111111111",
//           profile_digest: "a".repeat(64),
//           provider: { id: "ghidra" as const, version: "12.1.4" },
//           read_only: false,
//           analysis_complete: true,
//           analysis_timed_out: false,
//           capabilities: [...GHIDRA_SESSION_CAPABILITIES],
//           target: {
//             name: "fixture.elf",
//             language_id: "MIPS:LE:32:default",
//             compiler_spec_id: "default",
export const _l = 159;
