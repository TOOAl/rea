export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import { runSetup } from "./Setup.js";
// import type { SetupProgressEvent } from "./SetupTypes.js";
// import { FakeSetupHost, options } from "./Setup.fixture.js";
// import { SetupSkillInstallError } from "./SetupSkill.js";
// import { err, ok } from "../domain/result.js";
// import { HopperReleaseError } from "./HopperReleaseFeed.js";
//
// const linkedSkillFailure = () =>
//   new SetupSkillInstallError({
//     path: "/fixture/home/.claude/skills/reverse-engineer-anything",
//     stage: "prepare",
//     reason: "Skill directory is a symbolic link",
//     rollbackFailures: [],
//     recoveryBackupPaths: [],
//     cause: undefined,
//   });
//
// describe("Linux publisher cache approval", () => {
//   it.each([true, false])(
//     "discloses the selected cache or blocks an unresolved path before approval: %s",
//     async (valid) => {
//       const host = Object.assign(new FakeSetupHost("linux"), {
//         linuxHopperReleaseCache: valid
//           ? ok("/caller/cache/rea/hopper-releases")
//           : err(
//               new HopperReleaseError(
//                 "verification_unavailable",
//                 "Invalid selected cache path",
//               ),
//             ),
//       });
//       host.distribution = {
//         id: "ubuntu",
//         versionId: "24.04",
//         packageFamily: "deb",
//         hopperSetupSupported: true,
//       };
//       const result = await runSetup(options(false, true), host);
//       if (valid)
//         expect(
//           result.plannedActions.find(({ kind }) => kind === "install_hopper")
//             ?.detail,
//         ).toContain("/caller/cache/rea/hopper-releases/<launcher-sha256>");
//       else
//         expect(result).toMatchObject({
//           status: "needs_human",
//           plannedActions: [],
//         });
//       expect(host.hopperInstalls).toBe(0);
//       expect(host.configurations).toBe(0);
//       expect(host.skillInstalls).toBe(0);
//     },
//   );
// });
//
// describe("selected skill admission", () => {
//   it.each(["codex", "shared"] as const)(
//     "keeps %s choices when an unselected client is linked",
//     async (choice) => {
//       const host = new FakeSetupHost();
//       host.hopper = "/Applications/Hopper";
//       host.clients = [
//         { name: "claude_code", configPath: "/claude.json" },
//         { name: "codex", configPath: "/codex.toml", format: "toml" },
//       ];
//       host.validateSkillDirectories = async (ids) => {
//         host.skillDirectoryValidations.push(ids);
//         return ids.includes("claude_code")
//           ? err(linkedSkillFailure())
//           : ok(undefined);
//       };
//       const result = await runSetup(
//         { ...options(false), structured: false },
//         host,
//         async (actions, context) => {
//           if (context?.stage === "select") {
//             expect(actions.some(({ kind }) => kind === "install_skill")).toBe(
//               true,
//             );
//             return {
//               approved: false,
//               selectedActionIds:
//                 choice === "codex"
//                   ? ["configure_client:codex"]
//                   : ["install_skill"],
//             };
//           }
//           return true;
//         },
//       );
//       expect(result.status).toBe("ready");
//       expect(host.skillInstalls).toBe(1);
//       expect(host.configurations).toBe(choice === "codex" ? 1 : 0);
//       expect(host.skillDirectoryValidations).toEqual(
//         choice === "codex" ? [["codex"], ["codex"]] : [[], []],
//       );
//     },
//   );
//
//   it("rechecks directory admission after approval before changing clients or Hopper", async () => {
//     const host = new FakeSetupHost("linux");
//     host.distribution = {
//       id: "ubuntu",
//       versionId: "24.04",
//       packageFamily: "deb",
//       hopperSetupSupported: true,
//     };
//     host.clients = [{ name: "claude_code", configPath: "/claude.json" }];
//     let linked = false;
//     host.validateSkillDirectories = async () =>
//       linked ? err(linkedSkillFailure()) : ok(undefined);
//     const result = await runSetup(
//       {
//         ...options(false, true),
//         clientIds: ["claude_code"],
//         structured: false,
//       },
//       host,
//       async () => {
//         linked = true;
//         return true;
//       },
//     );
//     expect(result).toMatchObject({
//       status: "needs_human",
//       code: "skill_install_failed",
//       appliedActions: [],
//     });
//     expect(host.configurations).toBe(0);
//     expect(host.hopperInstalls).toBe(0);
export const _l = 132;
