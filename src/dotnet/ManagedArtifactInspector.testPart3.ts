export const __stub = 1;
//   it.each([
//     [
//       0,
//       "CustomAttribute constructor coded index 0x0 is null, but Type must reference a MethodDef or MemberRef row",
//     ],
//     [
//       19,
//       "coded index 0x13 is invalid: coded index selects row 2 in table 10, which has 1 rows",
//     ],
//   ] as const)(
//     "preserves readable attribute facts for constructor index %s",
//     (rawType, detail) => {
//       const bytes = buildManagedPeFixture({ customAttributeTypeRaw: rawType });
//       const result = inspectManagedArtifactBytes(
//         bytes,
//         managedPeFixtureTarget(bytes),
//       );
//       const text = Buffer.from(".NETCoreApp,Version=v8.0", "utf8");
//       const attributeValue = Buffer.concat([
//         Buffer.from([1, 0, text.length]),
//         text,
//         Buffer.alloc(2),
//       ]);
//
//       expect(result.attributes).toMatchObject([
//         {
//           parent_token: "0x20000001",
//           constructor_token: null,
//           type_name: null,
//           value_length: attributeValue.length,
//           value_sha256: createHash("sha256")
//             .update(attributeValue)
//             .digest("hex"),
//           token: "0x0c000001",
//         },
//       ]);
//       expect(result.coverage).toMatchObject({
//         state: "partial",
//         issues: [
//           expect.objectContaining({
//             code: "invalid-row",
//             scope: "metadata.CustomAttribute:0x0c000001",
//             detail: expect.stringContaining(detail),
//           }),
//         ],
//       });
//     },
//   );
//
//   it("reports coded-index column offsets after widened string and coded-index columns", () => {
//     const references = Array.from(
//       { length: 2_500 },
//       (_, index) => `Reference.${"r".repeat(24)}.${String(index)}`,
//     );
//     const bytes = buildManagedPeFixture({
//       references,
//       extendsRaw: 9,
//       customAttributeTypeRaw: 0,
//     });
//     const layout = metadataLayoutFor(bytes);
//     const artifact = inspectManagedArtifactBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     const members = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     const extendsIssue = members.coverage.issues.find((issue) =>
//       issue.scope.startsWith("metadata.TypeDef:"),
//     );
//     const attributeIssue = artifact.coverage.issues.find((issue) =>
//       issue.scope.startsWith("metadata.CustomAttribute:"),
//     );
//     const typeDef = members.types[0];
//     const attributeTable = layout.table(12);
//
//     expect(layout.stringIndexSize).toBe(4);
//     expect(layout.codedIndexSize("HasCustomAttribute")).toBe(4);
//     expect(typeDef).toBeDefined();
//     expect(extendsIssue?.offset).toBe(
//       (typeDef?.row_offset ?? 0) + 4 + 2 * layout.stringIndexSize,
//     );
//     expect(attributeTable).toBeDefined();
//     expect(attributeIssue?.offset).toBe(
//       (attributeTable?.offset ?? 0) +
//         layout.codedIndexSize("HasCustomAttribute"),
//     );
//   });
//
//   it("resolves local attribute constructors without rescanning TypeDef rows", () => {
//     // The owning type follows every empty type. A per-attribute TypeDef scan
//     // took about 38 s here; the owner index is built once per layout.
//     const bytes = buildManagedPeFixture({
//       additionalEmptyTypes: 16_000,
//       customAttributeRowCount: 16_000,
//       customAttributeTypeRaw: (1 << 3) | 2,
//       typeName: "LookupAttribute",
//       extendsRaw: 0,
//       methodName: ".ctor",
//       methodFlags: 0x1886,
//       methodSignature: Buffer.from([0x20, 0x01, 0x01, 0x0e]),
//     });
//     const start = performance.now();
//     const artifact = inspectManagedArtifactBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(performance.now() - start).toBeLessThan(2000);
//     expect(artifact.coverage).toEqual({ state: "complete", issues: [] });
//     expect(artifact.attributes).toHaveLength(16_000);
//     expect(
//       artifact.attributes.every(
//         (attribute) => attribute.type_name === "Fixture.LookupAttribute",
//       ),
//     ).toBe(true);
//   }, 30_000);
// });
//
// describe("managed artifact reference inventory", () => {
//   it("returns all references inline while classifying from the full inventory", () => {
//     const bytes = buildManagedPeFixture({
//       references: ["System.Runtime", "UnityEngine.CoreModule"],
//     });
//     const result = inspectManagedArtifactBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.classification.runtime_family).toBe("unity-mono");
//     expect(result.references).toHaveLength(2);
//     expect(result.coverage.state).toBe("complete");
//     expect(result.coverage.issues).toEqual([]);
//   });
//
//   it("preserves duplicate AssemblyRef rows in metadata order", () => {
//     const bytes = buildManagedPeFixture({
//       references: [
//         "UnityEngine.CoreModule",
//         "UnityEngine.CoreModule",
//         "System.Runtime",
//       ],
//     });
//     const result = inspectManagedArtifactBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.references.map(({ name }) => name)).toEqual([
//       "UnityEngine.CoreModule",
//       "UnityEngine.CoreModule",
//       "System.Runtime",
//     ]);
//     expect(result.classification.runtime_family).toBe("unity-mono");
//   });
// });
//
// describe("managed fixture data layout", () => {
//   it("keeps ReadyToRun metadata and resources intact with large metadata", () => {
//     const resource = Buffer.alloc(2_048, 0x52);
//     const fieldSignature = Buffer.concat([
//       Buffer.from([0x06]),
//       Buffer.alloc(8_000, 0x0f),
//       Buffer.from([0x08]),
//     ]);
//     const bytes = buildManagedPeFixture({
//       fieldSignature,
//       readyToRun: true,
//       resourceData: resource,
//     });
//     const result = inspectManagedArtifactBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.classification).toMatchObject({
//       status: "managed",
//       implementation: "cil-and-ready-to-run",
//     });
export const _l = 180;
