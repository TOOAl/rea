export const __stub = 1;
// import { createHash } from "node:crypto";
//
// import { describe, expect, it } from "vitest";
//
// import { inspectManagedArtifactBytes } from "./ManagedArtifactInspector.js";
// import { inspectManagedMembersBytes } from "./ManagedMemberInspector.js";
// import { inspectManagedNativeBoundariesBytes } from "./ManagedNativeBoundaryInspector.js";
// import {
//   buildManagedPeFixture,
//   managedPeFixtureTarget,
// } from "./ManagedPe.fixture.js";
// import { readManagedMetadataLayout } from "./ManagedMetadataLayout.js";
// import { readManagedPeLayout } from "./ManagedPeReader.js";
//
// const metadataLayoutFor = (bytes: Buffer) => {
//   const pe = readManagedPeLayout(bytes);
//   if (pe.cli === null) throw new Error("fixture omitted CLI metadata");
//   return readManagedMetadataLayout(
//     bytes,
//     pe.rvaToOffset(pe.cli.metadata.rva, pe.cli.metadata.size, "cli.metadata"),
//     pe.cli.metadata.size,
//   );
// };
//
// const resizedOptionalHeader = (
//   size: number,
//   magic: number,
// ): { readonly bytes: Buffer; readonly optional: number } => {
//   const bytes = buildManagedPeFixture();
//   const coff = bytes.readUInt32LE(0x3c) + 4;
//   const optional = coff + 20;
//   const originalSize = bytes.readUInt16LE(coff + 16);
//   const section = Buffer.from(
//     bytes.subarray(optional + originalSize, optional + originalSize + 40),
//   );
//   section.copy(bytes, optional + size);
//   bytes.writeUInt16LE(size, coff + 16);
//   bytes.writeUInt16LE(magic, optional);
//   return { bytes, optional };
// };
//
// describe("managed PE optional-header directory count", () => {
//   it.each([96, 108, 111])(
//     "retains an unreadable PE32+ directory count at optional size %i",
//     (optionalSize) => {
//       const { bytes, optional } = resizedOptionalHeader(optionalSize, 0x020b);
//       // The section's first four bytes look like a count that excludes CLI.
//       bytes.writeUInt32LE(14, optional + optionalSize);
//
//       const layout = readManagedPeLayout(bytes);
//       expect(layout).toMatchObject({
//         optionalHeader: "pe32-plus",
//         machine: 0x014c,
//         cli: null,
//         cliDirectoryState: "unreadable",
//         cliIssue: {
//           code: "invalid-directory",
//           scope: "pe.optional-header",
//         },
//       });
//       const result = inspectManagedArtifactBytes(
//         bytes,
//         managedPeFixtureTarget(bytes),
//       );
//       expect(result.classification.status).toBe("malformed");
//       expect(result.metadata.status).toBe("malformed");
//       expect(result.coverage.issues).toContainEqual(
//         expect.objectContaining({
//           code: "invalid-directory",
//           scope: "pe.optional-header",
//         }),
//       );
//     },
//   );
//
//   it.each([
//     { size: 96, magic: 0x010b, countOffset: 92, header: "pe32" },
//     { size: 112, magic: 0x020b, countOffset: 108, header: "pe32-plus" },
//   ])("accepts a minimum $header header with no CLI directory", (fixture) => {
//     const { bytes, optional } = resizedOptionalHeader(
//       fixture.size,
//       fixture.magic,
//     );
//     bytes.writeUInt32LE(0, optional + fixture.countOffset);
//
//     expect(readManagedPeLayout(bytes)).toMatchObject({
//       optionalHeader: fixture.header,
//       cli: null,
//       cliDirectoryState: "absent",
//       cliIssue: null,
//     });
//   });
// });
//
// describe("managed CLI directory availability", () => {
//   it("keeps a declared but truncated CLI directory malformed", () => {
//     const bytes = buildManagedPeFixture();
//     const peOffset = bytes.readUInt32LE(0x3c);
//     const coff = peOffset + 4;
//     const optional = coff + 20;
//     const originalOptionalSize = bytes.readUInt16LE(coff + 16);
//     const truncatedOptionalSize = 96 + 14 * 8 + 7;
//     const sectionHeader = Buffer.from(
//       bytes.subarray(
//         optional + originalOptionalSize,
//         optional + originalOptionalSize + 40,
//       ),
//     );
//     sectionHeader.copy(bytes, optional + truncatedOptionalSize);
//     bytes.writeUInt16LE(truncatedOptionalSize, coff + 16);
//     bytes.writeUInt32LE(15, optional + 92);
//
//     const layout = readManagedPeLayout(bytes);
//     expect(layout).toMatchObject({
//       cli: null,
//       cliDirectoryState: "unreadable",
//       cliIssue: {
//         code: "invalid-directory",
//         scope: "pe.data-directories",
//       },
//     });
//
//     const target = managedPeFixtureTarget(bytes);
//     const results = [
//       inspectManagedArtifactBytes(bytes, target),
//       inspectManagedMembersBytes(bytes, target),
//       inspectManagedNativeBoundariesBytes(bytes, target),
//     ];
//     for (const [index, result] of results.entries()) {
//       expect(result.metadata.status).toBe("malformed");
//       expect(result.coverage).toMatchObject({
//         state: index === 0 ? "partial" : "unavailable",
//         issues: [
//           expect.objectContaining({
//             code: "invalid-directory",
//             scope: "pe.data-directories",
//           }),
//         ],
//       });
//     }
//   });
//
//   it("treats a CLI directory excluded by NumberOfRvaAndSizes as absent", () => {
//     const bytes = buildManagedPeFixture();
//     const peOffset = bytes.readUInt32LE(0x3c);
//     const optional = peOffset + 4 + 20;
//     bytes.writeUInt32LE(14, optional + 92);
//
//     const layout = readManagedPeLayout(bytes);
//     expect(layout).toMatchObject({
//       cli: null,
//       cliDirectoryState: "absent",
//       cliIssue: null,
//     });
//     const result = inspectManagedArtifactBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     expect(result.classification.status).toBe("not-managed");
//     expect(result.metadata.status).toBe("absent");
//   });
//
//   it("retains an in-range CLI directory when the count overstates later entries", () => {
//     const bytes = buildManagedPeFixture();
//     const peOffset = bytes.readUInt32LE(0x3c);
//     const optional = peOffset + 4 + 20;
//     bytes.writeUInt32LE(17, optional + 92);
//
//     const layout = readManagedPeLayout(bytes);
//     expect(layout.cliDirectoryState).toBe("present");
//     expect(layout.cliIssue).toBeNull();
//     expect(layout.cli).not.toBeNull();
//     const result = inspectManagedArtifactBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     expect(result.classification.status).toBe("managed");
//     expect(result.metadata.status).toBe("complete");
//   });
// });
export const _l = 180;
