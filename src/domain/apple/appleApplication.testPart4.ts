export const __stub = 1;
//     const result = project(
//       inventoryEvidence("zip", "Fixture.zip", [...scripts, ...native]),
//     );
//
//     expect(result.components.javascript).toHaveLength(129);
//     expect(result.components.native_libraries).toHaveLength(128);
//     expect(result.bridge_candidate_coverage).toMatchObject({
//       status: "partial",
//       total_candidates: 129 * 128,
//       emitted_candidates: result.bridge_candidates.length,
//       omitted_candidates: 129 * 128 - result.bridge_candidates.length,
//     });
//     expect(result.bridge_candidates.length).toBeGreaterThan(0);
//     expect(result.bridge_candidates.length).toBeLessThan(129 * 128);
//     expect(
//       Buffer.byteLength(JSON.stringify(result.bridge_candidates)),
//     ).toBeLessThanOrEqual(2 * 1024 * 1024);
//     expect(result.coverage).toMatchObject({
//       status: "partial",
//       inventory_complete: true,
//     });
//     expect(result.limitations).toContain(
//       `Bridge candidate pairs exceeded the projection safety budget; ${result.bridge_candidate_coverage.omitted_candidates} hypotheses are omitted. Component arrays still include every component from the supplied inventory pages.`,
//     );
//   });
//
//   it("preserves candidate pairing for components without an application root", () => {
//     const result = project(
//       inventoryEvidence("ipa", "Fixture.ipa", [
//         { path: "Payload/Fixture.app/Info.plist" },
//         {
//           path: "Payload/Fixture.app/Resources/app.js",
//           format: "javascript-bundle",
//         },
//         { path: "SwiftSupport/outside.js", format: "javascript-bundle" },
//         { path: "SwiftSupport/liboutside.dylib", format: "mach-o" },
//       ]),
//     );
//
//     expect(result.bridge_candidates).toContainEqual({
//       source_path: "SwiftSupport/outside.js",
//       native_path: "SwiftSupport/liboutside.dylib",
//       basis: "javascript-and-native-content",
//     });
//     expect(result.bridge_candidate_coverage).toMatchObject({
//       status: "complete",
//     });
//   });
//
//   it("keeps an extensionless Mach-O without an application root as a native component", () => {
//     const result = project(
//       inventoryEvidence("ipa", "Fixture.ipa", [
//         { path: "Payload/Fixture.app/Info.plist" },
//         macho("Payload/Fixture.app/Fixture"),
//         { path: "SwiftSupport/outside.js", format: "javascript-bundle" },
//         macho("SwiftSupport/HelperTool"),
//         macho("SwiftSupport/iphoneos/libswiftCore.dylib"),
//       ]),
//     );
//
//     expect(result.components.executables.map(({ path }) => path)).toEqual([
//       "Payload/Fixture.app/Fixture",
//       "SwiftSupport/HelperTool",
//     ]);
//     expect(result.bridge_candidates).toEqual([
//       {
//         source_path: "SwiftSupport/outside.js",
//         native_path: "SwiftSupport/HelperTool",
//         basis: "javascript-and-native-content",
//       },
//       {
//         source_path: "SwiftSupport/outside.js",
//         native_path: "SwiftSupport/iphoneos/libswiftCore.dylib",
//         basis: "javascript-and-native-content",
//       },
//     ]);
//   });
// });
//
// describe("Apple path conventions", () => {
//   it("recognizes anatomy names by English case and reports the archive spelling", () => {
//     const result = project(
//       inventoryEvidence("directory", "Fixture.app", [
//         { path: "contents/info.plist" },
//         macho("contents/macos/Fixture"),
//         { path: "contents/_codesignature/coderesources" },
//       ]),
//     );
//     expect(result.bundles[0]).toMatchObject({
//       layout: "macos-deep",
//       info_plist_path: "contents/info.plist",
//       executable_candidates: ["contents/macos/Fixture"],
//       signing_paths: ["contents/_codesignature/coderesources"],
//     });
//     expect(result.components.bundle_metadata.map(({ path }) => path)).toEqual([
//       "contents/info.plist",
//     ]);
//     expect(result.components.signing.map(({ path }) => path)).toEqual([
//       "contents/_codesignature/coderesources",
//     ]);
//   });
//
//   it("limits runtime families and bridge bases to path segments", () => {
//     const result = project(
//       inventoryEvidence("ipa", "Fixture.ipa", [
//         { path: "Payload/Fixture.app/Info.plist" },
//         macho("Payload/Fixture.app/Fixture"),
//         macho("Payload/Fixture.app/Frameworks/libfoo.dylib"),
//         macho("SwiftSupport/libswiftCore.dylib"),
//         macho("Payload/Fixture.app/Frameworks/MyApp.framework/MyApp"),
//         macho("Payload/Fixture.app/community/libcommunity.so"),
//         {
//           path: "Payload/Fixture.app/main.js",
//           format: "javascript-bundle",
//         },
//       ]),
//     );
//     expect(result.runtime_families).toEqual(
//       expect.arrayContaining(["javascript", "native", "swift-objective-c"]),
//     );
//     expect(result.runtime_families).not.toContain("flutter");
//     expect(result.runtime_families).not.toContain("unity");
//     expect(result.runtime_families).not.toContain("react-native");
//     expect(
//       result.bridge_candidates.every(
//         ({ basis }) => basis === "javascript-and-native-content",
//       ),
//     ).toBe(true);
//     expect(result.limitations).toEqual(
//       expect.arrayContaining([
//         "Runtime families are inferred from inventory formats and bounded framework path conventions, not observed runtime loading.",
//         "A bridge basis is inferred from the native path and is repeated for every managed component.",
//       ]),
//     );
//   });
//
//   it("recognizes framework segments and does not treat a bare dylib as Swift", () => {
//     const result = project(
//       inventoryEvidence("ipa", "Fixture.ipa", [
//         { path: "Payload/Fixture.app/Info.plist" },
//         macho("Payload/Fixture.app/Fixture"),
//         macho("Payload/Fixture.app/Frameworks/Flutter.framework/Flutter"),
//         macho(
//           "Payload/Fixture.app/Frameworks/UnityFramework.framework/UnityFramework",
//         ),
//         macho("Payload/Fixture.app/Frameworks/hermes.framework/hermes"),
//         macho("Payload/Fixture.app/Frameworks/libfoo.dylib"),
//       ]),
//     );
//     expect(result.runtime_families).toEqual(
//       expect.arrayContaining(["flutter", "unity", "react-native", "native"]),
//     );
//     expect(result.runtime_families).not.toContain("swift-objective-c");
//   });
//
//   it.each([
//     // U+10000 sorts before U+FFFD by UTF-16 code unit, after it by code point.
//     ["an astral and a BMP name", "\uFFFD", "\u{10000}"],
//     ["two BMP names", "\uE000", "\uFFFD"],
//   ])(
//     "orders roots, bundles and symlinks by code point for %s",
//     (_label, low, high) => {
//       const result = project(
//         inventoryEvidence(
//           "zip",
//           "Fixture.zip",
//           [high, low].flatMap((name) => [
//             { path: `A${name}.app/Contents/Info.plist` },
//             { path: `A${name}.app/Contents/Resources/link`, kind: "symlink" },
//           ]),
//         ),
//       );
//       const roots = [`A${low}.app`, `A${high}.app`];
//       expect(result.application_roots).toEqual(roots);
//       expect(result.bundles.map(({ path }) => path)).toEqual(roots);
//       expect(result.symlinks).toEqual(
//         roots.map((root) => `${root}/Contents/Resources/link`),
//       );
//     },
//   );
// });
export const _l = 181;
