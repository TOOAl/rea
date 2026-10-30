export const __stub = 1;
//     expect(result.resources[0]).toMatchObject({
//       embedded: true,
//       data_length: resource.length,
//       data_sha256: createHash("sha256").update(resource).digest("hex"),
//     });
//     expect(result.coverage).toMatchObject({ state: "complete", issues: [] });
//   });
// });
//
// describe("managed implementation classification", () => {
//   it("classifies crossgen2 ReadyToRun output without ILONLY as modern .NET", () => {
//     // crossgen2 writes IL_LIBRARY | STRONGNAMESIGNED and clears ILONLY.
//     const bytes = buildManagedPeFixture({ readyToRun: true, cliFlags: 0xc });
//     const result = inspectManagedArtifactBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.classification).toMatchObject({
//       runtime_family: "modern-dotnet",
//       implementation: "cil-and-ready-to-run",
//     });
//     expect(result.classification.evidence).toContainEqual(
//       expect.objectContaining({ code: "ready-to-run-signature-observed" }),
//     );
//     expect(result.classification.evidence).not.toContainEqual(
//       expect.objectContaining({ code: "cli-il-only-clear" }),
//     );
//   });
//
//   it("preserves ReadyToRun runtime identity after metadata capacity is exhausted", () => {
//     const bytes = buildManagedPeFixture({
//       readyToRun: true,
//       cliFlags: 0xc,
//       references: ["x".repeat(12 * 1024 * 1024)],
//     });
//     const result = inspectManagedArtifactBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     expect(result.classification).toMatchObject({
//       status: "managed",
//       runtime_family: "modern-dotnet",
//     });
//     expect(result.coverage.issues).toContainEqual(
//       expect.objectContaining({ code: "resource-limit" }),
//     );
//   });
//
//   it("keeps a clear ILONLY flag without ReadyToRun as mixed CLR/native", () => {
//     const bytes = buildManagedPeFixture({ cliFlags: 0 });
//     const result = inspectManagedArtifactBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.classification).toMatchObject({
//       runtime_family: "mixed-clr-native",
//       implementation: "cpp-cli-mixed",
//     });
//     expect(result.classification.evidence).toContainEqual(
//       expect.objectContaining({ code: "cli-il-only-clear" }),
//     );
//   });
// });
//
// describe("managed artifact metadata identity", () => {
//   it("accepts CLI metadata GUIDs without RFC UUID version or variant bits", () => {
//     const bytes = buildManagedPeFixture({
//       mvid: Buffer.from("3aebc60edc4a544b1f458b4ed40b33b1", "hex"),
//     });
//     const result = inspectManagedArtifactBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     const members = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     const boundaries = inspectManagedNativeBoundariesBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.module?.mvid).toBe("0ec6eb3a-4adc-4b54-1f45-8b4ed40b33b1");
//     expect(result.classification.status).toBe("managed");
//     expect(members.identity_scope.requires_mvid).toBe(result.module?.mvid);
//     expect(boundaries.identity_scope.requires_mvid).toBe(result.module?.mvid);
//   });
//
//   it("decodes ECMA-335 pointer and byref element types without swapping them", () => {
//     const bytes = buildManagedPeFixture({
//       fieldSignature: Buffer.from([0x06, 0x1d, 0x0f, 0x0f, 0x08]),
//       methodSignature: Buffer.from([
//         0x00, 0x02, 0x10, 0x08, 0x0f, 0x08, 0x10, 0x0e,
//       ]),
//     });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.fields[0]?.signature).toMatchObject({
//       parse_status: "decoded",
//       field_type: "i4**[]",
//     });
//     expect(result.methods[0]?.signature).toMatchObject({
//       parse_status: "decoded",
//       return_type: "i4&",
//       parameter_types: ["i4*", "string&"],
//     });
//   });
// });
//
// it("derives the string heap width after expanded AssemblyRef names", () => {
//   const references = Array.from(
//     { length: 5_000 },
//     (_, index) => `Reference.${String(index).padStart(4, "0")}`,
//   );
//   const bytes = buildManagedPeFixture({ references });
//   const result = inspectManagedArtifactBytes(
//     bytes,
//     managedPeFixtureTarget(bytes),
//   );
//
//   expect(result.references).toHaveLength(references.length);
//   expect(result.references.at(-1)?.name).toBe("Reference.4999");
//   expect(result.coverage).toMatchObject({ state: "complete", issues: [] });
//
//   const malformedBytes = buildManagedPeFixture({
//     references,
//     malformedAssemblyReferenceRows: [5_000],
//   });
//   const malformedResult = inspectManagedArtifactBytes(
//     malformedBytes,
//     managedPeFixtureTarget(malformedBytes),
//   );
//   expect(malformedResult.references).toHaveLength(4_999);
//   expect(malformedResult.coverage).toMatchObject({
//     state: "partial",
//     issues: [expect.objectContaining({ code: "invalid-heap-index" })],
//   });
// });
//
// it("derives ResolutionScope and Implementation widths at 16,384 AssemblyRefs", () => {
//   const references = Array.from(
//     { length: 16_384 },
//     (_, index) => `Reference.${String(index).padStart(5, "0")}`,
//   );
//   const bytes = buildManagedPeFixture({ references });
//   const result = inspectManagedArtifactBytes(
//     bytes,
//     managedPeFixtureTarget(bytes),
//   );
//
//   expect(result.references).toHaveLength(references.length);
//   expect(result.references.at(-1)?.name).toBe("Reference.16383");
//   expect(result.resources).toMatchObject([
//     { name: "Fixture.resources", embedded: true, data_length: 13 },
//   ]);
//   expect(result.coverage).toMatchObject({ state: "complete", issues: [] });
// });
//
// it("preserves U+FEFF in references and fixed attribute strings", () => {
//   const bytes = buildManagedPeFixture({
//     references: ["\uFEFFSystem.Runtime", "System.\uFEFFRuntime"],
//     targetFramework: "\uFEFF.NETCoreApp,Version=v8.0",
//   });
//   const result = inspectManagedArtifactBytes(
//     bytes,
//     managedPeFixtureTarget(bytes),
//   );
//   expect(result.references.map((reference) => reference.name)).toEqual([
//     "\uFEFFSystem.Runtime",
//     "System.\uFEFFRuntime",
//   ]);
//   expect(result.target_frameworks).toEqual(["\uFEFF.NETCoreApp,Version=v8.0"]);
// });
export const _l = 178;
