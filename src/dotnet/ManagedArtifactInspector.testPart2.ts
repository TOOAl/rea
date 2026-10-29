export const __stub = 1;
//
// describe("managed artifact inventory", () => {
//   it.each([
//     { moduleRowCount: 0, assemblyRowCount: 1, scope: "metadata.Module" },
//     { moduleRowCount: 2, assemblyRowCount: 1, scope: "metadata.Module" },
//     { moduleRowCount: 1, assemblyRowCount: 2, scope: "metadata.Assembly" },
//   ])("marks invalid identity table cardinality partial: %j", (options) => {
//     const bytes = buildManagedPeFixture(options);
//     const target = managedPeFixtureTarget(bytes);
//     const results = [
//       inspectManagedArtifactBytes(bytes, target),
//       inspectManagedMembersBytes(bytes, target),
//       inspectManagedNativeBoundariesBytes(bytes, target),
//     ];
//
//     for (const result of results) {
//       expect(result.metadata.status).toBe("partial");
//       expect(result.coverage).toMatchObject({
//         state: "partial",
//         issues: [
//           expect.objectContaining({
//             code: "invalid-row",
//             scope: options.scope,
//           }),
//         ],
//       });
//     }
//     if (options.moduleRowCount === 0) expect(results[0]?.module).toBeNull();
//     else expect(results[0]?.module?.name).toBe("Fixture.dll");
//   });
//
//   it.each([
//     { moduleRowCount: 1, assemblyRowCount: 0, targetFramework: null },
//     { moduleRowCount: 1, assemblyRowCount: 1 },
//   ])("keeps valid identity table cardinalities complete: %j", (options) => {
//     const bytes = buildManagedPeFixture(options);
//     const result = inspectManagedArtifactBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.metadata.status).toBe("complete");
//     expect(result.coverage).toMatchObject({ state: "complete", issues: [] });
//     expect(result.assembly?.name ?? null).toBe(
//       options.assemblyRowCount === 0 ? null : "Fixture.Managed",
//     );
//   });
//
//   it("statically inspects PE files with more than 96 sections", () => {
//     const fixture = buildManagedPeFixture();
//     const peOffset = fixture.readUInt32LE(0x3c);
//     const coffOffset = peOffset + 4;
//     const optionalHeaderSize = fixture.readUInt16LE(coffOffset + 16);
//     const sectionOffset = coffOffset + 20 + optionalHeaderSize;
//     const sectionDataOffset = 0x1200;
//     const bytes = Buffer.alloc(sectionDataOffset + 0x0e00);
//     fixture.copy(bytes, 0, 0, 0x0200);
//     fixture.copy(bytes, sectionDataOffset, 0x0200, 0x1000);
//     bytes.writeUInt16LE(97, coffOffset + 2);
//     bytes.writeUInt32LE(sectionDataOffset, sectionOffset + 20);
//
//     const result = inspectManagedArtifactBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.classification.status).toBe("managed");
//     expect(result.pe.section_count).toBe(97);
//     expect(sectionOffset + 97 * 40).toBeLessThanOrEqual(sectionDataOffset);
//   });
//
//   it("inventories module, assembly, framework, references, and resources without loading CLR code", () => {
//     const resource = Buffer.from("source-owned resource");
//     const bytes = buildManagedPeFixture({ resourceData: resource });
//     const result = inspectManagedArtifactBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.classification).toMatchObject({
//       status: "managed",
//       runtime_family: "modern-dotnet",
//       implementation: "cil",
//       managed_architecture: "anycpu",
//     });
//     expect(result.pe.cli).toMatchObject({
//       flag_names: ["il-only"],
//       entry_point: { kind: "metadata-token", value: "0x06000001" },
//     });
//     expect(result.module).toMatchObject({
//       name: "Fixture.dll",
//       mvid: "00112233-4455-6677-8899-aabbccddeeff",
//       token: "0x00000001",
//     });
//     expect(result.assembly).toMatchObject({
//       name: "Fixture.Managed",
//       version: "1.2.3.4",
//       token: "0x20000001",
//     });
//     expect(result.target_frameworks).toEqual([".NETCoreApp,Version=v8.0"]);
//     expect(result.references).toEqual([
//       expect.objectContaining({ name: "System.Runtime" }),
//     ]);
//     expect(result.resources).toEqual([
//       expect.objectContaining({
//         name: "Fixture.resources",
//         embedded: true,
//         visibility: "private",
//         data_length: resource.length,
//         data_sha256: createHash("sha256").update(resource).digest("hex"),
//       }),
//     ]);
//     expect(result.coverage).toMatchObject({ state: "complete", issues: [] });
//   });
//
//   // dotnet/runtime corhdr.h: 32BITREQUIRED and 32BITPREFERRED form one
//   // two-bit field, so neither bit can be read on its own.
//   it.each([
//     ["neither bit", 0x0000_0001, "anycpu", false],
//     ["32BITREQUIRED alone", 0x0000_0003, "x86", true],
//     ["both bits", 0x0002_0003, "anycpu-prefer-32", false],
//     ["the reserved 32BITPREFERRED alone", 0x0002_0001, "anycpu", false],
//   ] as const)(
//     "reads %s as one 32-bit requirement",
//     (_label, cliFlags, architecture, requires32Bit) => {
//       const bytes = buildManagedPeFixture({ cliFlags });
//       const target = managedPeFixtureTarget(bytes);
//
//       expect(
//         inspectManagedArtifactBytes(bytes, target).classification
//           .managed_architecture,
//       ).toBe(architecture);
//       expect(
//         inspectManagedNativeBoundariesBytes(bytes, target).cli_native
//           ?.requires_32bit,
//       ).toBe(requires32Bit);
//     },
//   );
// });
//
// describe("managed artifact coded indexes", () => {
//   it("reports an invalid ManifestResource implementation while retaining the resource", () => {
//     const bytes = buildManagedPeFixture({ resourceImplementationRaw: 9 });
//     const target = managedPeFixtureTarget(bytes);
//     const result = inspectManagedArtifactBytes(bytes, target);
//     const boundaries = inspectManagedNativeBoundariesBytes(bytes, target);
//
//     expect(result.resources).toMatchObject([
//       {
//         name: "Fixture.resources",
//         implementation_token: null,
//         embedded: false,
//       },
//     ]);
//     expect(result.coverage).toMatchObject({
//       state: "partial",
//       issues: [
//         expect.objectContaining({
//           code: "invalid-row",
//           scope: "metadata.ManifestResource:0x28000001",
//           detail: expect.stringContaining(
//             "coded index 0x9 is invalid: coded index selects row 2 in table 35, which has 1 rows",
//           ),
//         }),
//       ],
//     });
//     const layout = metadataLayoutFor(bytes);
//     expect(result.coverage.issues[0]?.offset).toBe(
//       (result.resources[0]?.row_offset ?? 0) + 8 + layout.stringIndexSize,
//     );
//     expect(boundaries.coverage).toMatchObject({
//       state: "partial",
//       issues: [
//         expect.objectContaining({
//           scope: "metadata.ManifestResource:0x28000001",
//         }),
//       ],
//     });
//   });
//
export const _l = 180;
