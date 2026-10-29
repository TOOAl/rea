export const __stub = 1;
//       result.bundles.map(({ path, role, layout, parent_path: parent }) => ({
//         path,
//         role,
//         layout,
//         parent,
//       })),
//     ).toEqual([
//       { path: ".", role: "application", layout: "macos-deep", parent: null },
//       {
//         path: "Contents/Helpers/Assistant.app",
//         role: "helper-application",
//         layout: "macos-deep",
//         parent: ".",
//       },
//       {
//         path: "Contents/Library/SystemExtensions/com.example.driver.dext",
//         role: "driver-extension",
//         layout: "shallow",
//         parent: ".",
//       },
//       {
//         path: "Contents/Library/SystemExtensions/com.example.filter.systemextension",
//         role: "system-extension",
//         layout: "macos-deep",
//         parent: ".",
//       },
//       {
//         path: "Contents/PlugIns/Bridge.bundle",
//         role: "plug-in",
//         layout: "macos-deep",
//         parent: ".",
//       },
//       {
//         path: "Contents/PlugIns/Preview.qlgenerator",
//         role: "plug-in",
//         layout: "shallow",
//         parent: ".",
//       },
//       {
//         path: "Contents/Resources/Embedded.app",
//         role: "nested-application",
//         layout: "macos-deep",
//         parent: ".",
//       },
//       {
//         path: "Contents/Resources/Strings.bundle",
//         role: "resource-bundle",
//         layout: "shallow",
//         parent: ".",
//       },
//       {
//         path: "Contents/SharedSupport/Data.bundle",
//         role: "bundle",
//         layout: "shallow",
//         parent: ".",
//       },
//     ]);
//     expect(result.bundles[0]).toMatchObject({
//       info_plist_path: "Contents/Info.plist",
//       executable_candidates: ["Contents/MacOS/Fixture"],
//       signing_paths: [
//         "Contents/_CodeSignature/CodeResources",
//         "Contents/embedded.provisionprofile",
//       ],
//     });
//     expect(
//       result.components.privileged_helpers.map(({ path }) => path),
//     ).toEqual(["Contents/Library/LaunchServices/com.example.helper"]);
//     expect(
//       result.components.launchd_plists.map(({ path, domain }) => [
//         path,
//         domain,
//       ]),
//     ).toEqual([
//       ["Contents/Library/LaunchAgents/com.example.agent.plist", "agent"],
//       ["Contents/Library/LaunchDaemons/com.example.helper.plist", "daemon"],
//     ]);
//     expect(result.components.helpers.map(({ path }) => path)).toEqual([
//       "Contents/Helpers/tool",
//     ]);
//   });
//
//   it("does not make a non-application bundle directory an application root", () => {
//     const result = project(
//       inventoryEvidence("directory", "Service.xpc", [
//         { path: "Contents/Info.plist" },
//         macho("Contents/MacOS/Service"),
//       ]),
//     );
//     expect(result.application_roots).toEqual([]);
//     expect(result.bundles).toEqual([]);
//     expect(result.limitations).toContain(
//       "No application bundle (Payload/*.app or *.app/Contents) was present in the supplied inventory pages.",
//     );
//   });
// });
//
// describe("Apple bundle layouts and containers", () => {
//   it("follows versioned frameworks without resolving Versions/Current", () => {
//     const framework = "Fixture.app/Contents/Frameworks/Core.framework";
//     const result = project(
//       inventoryEvidence("zip", "Fixture.zip", [
//         macho("Fixture.app/Contents/MacOS/Fixture"),
//         { path: `${framework}/Core`, kind: "symlink" },
//         { path: `${framework}/Versions/Current`, kind: "symlink" },
//         macho(`${framework}/Versions/A/Core`),
//         { path: `${framework}/Versions/A/Resources/Info.plist` },
//         { path: `${framework}/Versions/A/_CodeSignature/CodeResources` },
//         macho(
//           `${framework}/Versions/A/XPCServices/Fetch.xpc/Contents/MacOS/Fetch`,
//         ),
//       ]),
//     );
//     const core = result.bundles.find(({ path }) => path === framework);
//     expect(core).toEqual({
//       path: framework,
//       parent_path: "Fixture.app",
//       layout: "versioned-framework",
//       role: "framework",
//       role_basis: "path-convention",
//       info_plist_path: `${framework}/Versions/A/Resources/Info.plist`,
//       executable_candidates: [`${framework}/Versions/A/Core`],
//       signing_paths: [`${framework}/Versions/A/_CodeSignature/CodeResources`],
//     });
//     expect(
//       result.bundles.find(({ role }) => role === "xpc-service")?.parent_path,
//     ).toBe(framework);
//     expect(result.symlinks).toEqual([
//       `${framework}/Core`,
//       `${framework}/Versions/Current`,
//     ]);
//   });
//
//   it("reports an unknown Info.plist when several framework versions exist", () => {
//     const framework = "Fixture.app/Contents/Frameworks/Core.framework";
//     const result = project(
//       inventoryEvidence("zip", "Fixture.zip", [
//         macho("Fixture.app/Contents/MacOS/Fixture"),
//         { path: `${framework}/Versions/A/Resources/Info.plist` },
//         { path: `${framework}/Versions/B/Resources/Info.plist` },
//       ]),
//     );
//     expect(
//       result.bundles.find(({ path }) => path === framework)?.info_plist_path,
//     ).toBeNull();
//     // Files beside the only real version are not versions.
//     const withFiles = project(
//       inventoryEvidence("zip", "Fixture.zip", [
//         macho("Fixture.app/Contents/MacOS/Fixture"),
//         { path: `${framework}/Versions/A/Resources/Info.plist` },
//         { path: `${framework}/Versions/.DS_Store` },
//         { path: `${framework}/Versions/Current`, kind: "symlink" },
//       ]),
//     );
//     expect(
//       withFiles.bundles.find(({ path }) => path === framework)?.info_plist_path,
//     ).toBe(`${framework}/Versions/A/Resources/Info.plist`);
//     // Only A has a plist, but Versions/Current may select B.
//     const onlyA = project(
//       inventoryEvidence("zip", "Fixture.zip", [
//         macho("Fixture.app/Contents/MacOS/Fixture"),
//         { path: `${framework}/Versions/A/Resources/Info.plist` },
//         macho(`${framework}/Versions/B/Core`),
//       ]),
//     );
//     expect(
//       onlyA.bundles.find(({ path }) => path === framework)?.info_plist_path,
//     ).toBeNull();
//     expect(result.limitations).toContainEqual(
//       expect.stringContaining("Versions/Current selects is unknown"),
//     );
//   });
//
//   it("excludes AppleDouble sidecars from roots and roles", () => {
//     const result = project(
//       inventoryEvidence("zip", "Fixture.zip", [
//         macho("Fixture.app/Contents/MacOS/Fixture"),
//         { path: "Fixture.app/Contents/Library/LaunchDaemons/._helper.plist" },
//         { path: "Fixture.app/Contents/Library/LaunchDaemons/helper.plist" },
//         { path: "__MACOSX/Other.app/Contents/._Info.plist" },
//       ]),
//     );
//     expect(result.application_roots).toEqual(["Fixture.app"]);
//     expect(result.components.launchd_plists.map(({ path }) => path)).toEqual([
//       "Fixture.app/Contents/Library/LaunchDaemons/helper.plist",
export const _l = 185;
