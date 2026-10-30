export const __stub = 1;
//       const value = shared();
//       if (value.kind !== "executable" || value.architecture !== "mips")
//         throw new Error("expected MIPS target");
//       const facts = { ...value.mips };
//       delete facts[declaration];
//       const ghidra = new GhidraProvider(config, silentLogger, {}, host);
//       expect(
//         ghidra.inspectTargetSupport({ ...value, mips: facts }),
//       ).toMatchObject({
//         status: "unsupported",
//         reason: expect.stringContaining(
//           {
//             abiFlags: "inspected ABI flags",
//             gnuAttributes: "GNU MIPS ABI attribute inspection is unavailable",
//             sharedLoad: "have not been inspected",
//           }[declaration],
//         ),
//       });
//     },
//   );
//   it("refuses an endian pin committed for a different target", async () => {
//     const { counts, client } = await session(
//       shared({ byteOrder: "big" }),
//       undefined,
//       shared(),
//     );
//     const health = await client.execute("health", {});
//     expect(health.ok).toBe(false);
//     expect(counts.starts).toBe(0);
//   });
//   it("rejects a caller-selected global MIPS16 processor without replacing the request", async () => {
//     const parsed = parseConfig({
//       GHIDRA_INSTALL_DIR: "/ghidra",
//       REA_GHIDRA_LANGUAGE_ID: "MIPS:LE:32:16e",
//     });
//     if (!parsed.ok) throw parsed.error;
//     const ghidra = new GhidraProvider(parsed.value, silentLogger, {}, host);
//     const resolved = await ghidra.resolveAnalysisProfile(shared());
//     expect(resolved.ok).toBe(false);
//     if (!resolved.ok)
//       expect(resolved.error.message).toContain(
//         "requested override has not been changed",
//       );
//   });
// });
//
// describe("soft-float MIPS storage", () => {
//   it("admits soft-float o32 and commits its storage policy only for it", async () => {
//     const soft = target(softFloat);
//     const ghidra = new GhidraProvider(config, silentLogger, {}, host);
//     expect(ghidra.inspectTargetSupport(soft).status).toBe("supported");
//     const { profile } = await session(soft, report);
//     expect(profile.parameters.mips_soft_float_storage).toBe(
//       "o32-soft-float-prototype-v1",
//     );
//     const hard = await session(target(), undefined);
//     expect(hard.profile.parameters).not.toHaveProperty(
//       "mips_soft_float_storage",
//     );
//   });
//
//   it("admits the ODDSPREG default that soft-float toolchains emit, but no other flags", () => {
//     const ghidra = new GhidraProvider(config, silentLogger, {}, host);
//     // GCC 5.2 kernel modules and LLVM/Rust firmware both record flags1 = 1.
//     expect(
//       ghidra.inspectTargetSupport(
//         target(abi({ cpr1Size: 0, fpAbi: 3, flags1: 1 })),
//       ).status,
//     ).toBe("supported");
//     expect(
//       ghidra.inspectTargetSupport(
//         target(abi({ cpr1Size: 0, fpAbi: 3, flags1: 2 })),
//       ),
//     ).toMatchObject({
//       status: "unsupported",
//       reason: expect.stringContaining("general flags"),
//     });
//   });
//
//   it("reports the prototype outcome as session limitations", async () => {
//     const { client } = await session(target(softFloat), report);
//     const health = await client.execute("health", {});
//     if (!health.ok) throw health.error;
//     expect(health.value.limitations).toEqual(
//       expect.arrayContaining([
//         expect.stringContaining("model hard-float o32 only"),
//         expect.stringContaining(
//           "5 functions and 1 function-pointer definitions use __rea_soft_float.",
//         ),
//       ]),
//     );
//   });
//
//   it("admits relocatable objects under their own lane with coordinate limitations", async () => {
//     const relocatable = target({ type: 1 });
//     const { profile, client } = await session(relocatable, undefined);
//     expect(profile.parameters.mips_support_lane).toBe(
//       "elf32-rel-o32-arch32r2-standard-v1",
//     );
//     const executable = await session(target(), undefined);
//     expect(executable.profile.parameters.mips_support_lane).toBe(
//       "elf32-exec-o32-arch32r2-standard-v3",
//     );
//     const health = await client.execute("health", {});
//     if (!health.ok) throw health.error;
//     expect(health.value.limitations).toEqual(
//       expect.arrayContaining([
//         expect.stringContaining("analysis coordinates"),
//         expect.stringContaining("EXTERNAL block"),
//       ]),
//     );
//     const executableHealth = await executable.client.execute("health", {});
//     if (!executableHealth.ok) throw executableHealth.error;
//     expect(executableHealth.value.limitations.join(" ")).not.toContain(
//       "Relocatable MIPS ELF",
//     );
//   });
//
//   it.each([
//     {
//       reason:
//         "a soft-float session without a storage report before any analysis call",
//       value: target(softFloat),
//       storageReport: undefined,
//       operation: "list_procedures",
//     },
//     {
//       reason: "soft-float storage reported by a hard-float session",
//       value: target(),
//       storageReport: report,
//       operation: "health",
//     },
//   ] as const)(
//     "rejects $reason",
//     async ({ value, storageReport, operation }) => {
//       const { counts, client } = await session(value, storageReport);
//       const failed = await client.execute(operation, {});
//       expect(failed.ok).toBe(false);
//       if (!failed.ok) expect(failed.error._tag).toBe("ProviderAdapterError");
//       expect(counts).toEqual({ starts: 1, calls: 0, closes: 1 });
//     },
//   );
//
//   it("refuses a profile whose storage policy disagrees with the target", async () => {
//     for (const [value, profileFor] of [
//       [target(softFloat), target()],
//       [target(), target(softFloat)],
//     ] as const) {
//       const { counts, client } = await session(value, report, profileFor);
//       const failed = await client.execute("health", {});
//       expect(failed.ok).toBe(false);
//       expect(counts.starts).toBe(0);
//     }
//   });
// });
export const _l = 155;
