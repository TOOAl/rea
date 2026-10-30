export const __stub = 1;
//     ]);
//     expect(result.limitations).toContainEqual(
//       expect.stringContaining("AppleDouble sidecar entries"),
//     );
//   });
//
//   it("reports a DMG without inventoried contents as partial", () => {
//     const result = project(inventoryEvidence("dmg", "Fixture.dmg", []));
//     expect(result.coverage).toEqual({
//       status: "partial",
//       inventory_complete: true,
//     });
//     expect(result.limitations).toContain(
//       "The DMG's contents were not inventoried on this host; bundle absence is unknown.",
//     );
//   });
//
//   it("keeps IPA applications shallow and iOS", () => {
//     const result = project(
//       inventoryEvidence("ipa", "Fixture.ipa", [
//         { path: "Payload/Fixture.app/Info.plist" },
//         macho("Payload/Fixture.app/Fixture"),
//         { path: "Payload/Fixture.app/embedded.mobileprovision" },
//         macho("Payload/Fixture.app/PlugIns/Share.appex/Share"),
//         macho("SwiftSupport/iphoneos/libswiftCore.dylib"),
//       ]),
//     );
//     expect(result.platforms).toEqual(["ios"]);
//     // IPA projection still lists archive components outside Payload/.
//     expect(result.components.native_libraries.map(({ path }) => path)).toEqual([
//       "SwiftSupport/iphoneos/libswiftCore.dylib",
//     ]);
//     expect(
//       result.bundles.map(({ path, role, layout }) => [path, role, layout]),
//     ).toEqual([
//       ["Payload/Fixture.app", "application", "shallow"],
//       ["Payload/Fixture.app/PlugIns/Share.appex", "app-extension", "shallow"],
//     ]);
//     expect(result.bundles[0]?.executable_candidates).toEqual([
//       "Payload/Fixture.app/Fixture",
//     ]);
//   });
//
//   it("rejects inventories that cannot contain an Apple application", () => {
//     expect(() => project(inventoryEvidence("asar", "app.asar", []))).toThrow(
//       "Apple application projection requires IPA, directory, ZIP, or DMG inventory Evidence (got asar)",
//     );
//   });
// });
//
// describe("Apple IPA components", () => {
//   it("excludes AppleDouble sidecars from IPA components", () => {
//     const result = project(
//       inventoryEvidence("ipa", "Fixture.ipa", [
//         { path: "Payload/Fixture.app/Info.plist" },
//         macho("Payload/Fixture.app/Fixture"),
//         { path: "Payload/Fixture.app/Contents/Resources/._libfoo.dylib" },
//         { path: "Payload/Fixture.app/Frameworks/Foo.framework/._Foo" },
//         { path: "__MACOSX/Payload/Fixture.app/libghost.dylib" },
//         macho("Payload/Fixture.app/Contents/Resources/libreal.dylib"),
//         macho("SwiftSupport/iphoneos/libswiftCore.dylib"),
//       ]),
//     );
//     expect(result.components.native_libraries.map(({ path }) => path)).toEqual([
//       "Payload/Fixture.app/Contents/Resources/libreal.dylib",
//       "SwiftSupport/iphoneos/libswiftCore.dylib",
//     ]);
//     expect(result.components.frameworks).toEqual([]);
//     expect(result.components.executables.map(({ path }) => path)).toEqual([
//       "Payload/Fixture.app/Contents/Resources/libreal.dylib",
//       "Payload/Fixture.app/Fixture",
//     ]);
//     expect(result.limitations).toContainEqual(
//       expect.stringContaining("AppleDouble sidecar entries"),
//     );
//   });
// });
//
// describe("macOS application scope", () => {
//   it("attributes only components inside the application roots", () => {
//     const result = project(
//       inventoryEvidence("zip", "Distribution.zip", [
//         macho("Fixture.app/Contents/MacOS/Fixture"),
//         macho("Fixture.app/Contents/Frameworks/Core.framework/Versions/A/Core"),
//         {
//           path: "Fixture.app/Contents/Resources/app.js",
//           format: "javascript-bundle",
//         },
//         macho("Extras/Plugin.framework/Versions/A/Plugin"),
//         macho("Extras/libextra.dylib"),
//         { path: "Extras/installer.js", format: "javascript-bundle" },
//         { path: "Extras/Info.plist" },
//       ]),
//     );
//     const paths = (components: readonly { readonly path: string }[]) =>
//       components.map(({ path }) => path);
//     expect(paths(result.components.frameworks)).toEqual([
//       "Fixture.app/Contents/Frameworks/Core.framework/Versions/A/Core",
//     ]);
//     expect(paths(result.components.native_libraries)).toEqual([]);
//     expect(paths(result.components.javascript)).toEqual([
//       "Fixture.app/Contents/Resources/app.js",
//     ]);
//     expect(paths(result.components.bundle_metadata)).toEqual([]);
//     expect(
//       result.bridge_candidates.every(
//         ({ source_path: source, native_path: target }) =>
//           [source, target].every((path) => path.startsWith("Fixture.app/")),
//       ),
//     ).toBe(true);
//     expect(result.limitations).toContain(
//       "4 inventoried entries outside every application root are not attributed to the application.",
//     );
//   });
//
//   it("keeps a selected .app directory as the root when its contents are missing", () => {
//     const empty = project(inventoryEvidence("directory", "Fixture.app", []));
//     expect(empty).toMatchObject({
//       application_roots: ["."],
//       platforms: [],
//       bundles: [
//         {
//           path: ".",
//           role: "application",
//           layout: "shallow",
//           info_plist_path: null,
//         },
//       ],
//     });
//     const partial = project(
//       inventoryEvidence("directory", "Fixture.app", [
//         { path: "Contents/Resources/Localizable.strings" },
//       ]),
//     );
//     expect(partial).toMatchObject({
//       application_roots: ["."],
//       platforms: ["macos"],
//     });
//   });
// });
//
// describe("Apple application bridge candidates", () => {
//   it("pairs scripts and native code only within one application root", () => {
//     const result = project(
//       inventoryEvidence("zip", "Suite.zip", [
//         macho("First.app/Contents/MacOS/First"),
//         {
//           path: "First.app/Contents/Resources/first.js",
//           format: "javascript-bundle",
//         },
//         macho("Second.app/Contents/MacOS/Second"),
//         {
//           path: "Second.app/Contents/Resources/second.js",
//           format: "javascript-bundle",
//         },
//       ]),
//     );
//     expect(result.application_roots).toEqual(["First.app", "Second.app"]);
//     expect(
//       result.bridge_candidates.map(
//         ({ source_path: source, native_path: target }) => [source, target],
//       ),
//     ).toEqual([
//       [
//         "First.app/Contents/Resources/first.js",
//         "First.app/Contents/MacOS/First",
//       ],
//       [
//         "Second.app/Contents/Resources/second.js",
//         "Second.app/Contents/MacOS/Second",
//       ],
//     ]);
//   });
//
//   it("reports candidate omission when one root expands beyond the bridge safety budget", () => {
//     const escapedDirectory = `${"é".repeat(100)}${'"'.repeat(120)}`;
//     const scripts = Array.from({ length: 129 }, (_, index) => ({
//       path: `Payload/Fixture.app/${escapedDirectory}/script-${String(index).padStart(3, "0")}.js`,
//       format: "javascript-bundle",
//     }));
//     const native = Array.from({ length: 128 }, (_, index) =>
//       macho(
//         `Payload/Fixture.app/${escapedDirectory}/lib${String(index).padStart(3, "0")}.dylib`,
//       ),
//     );
export const _l = 185;
