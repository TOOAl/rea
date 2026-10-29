export const __stub = 1;
//         paths: installationPaths,
//         state: installationState(installationPaths),
//       },
//       skill: {
//         installed_version: installedSkillIdentity?.version ?? null,
//         installed_tool_count: installedSkillIdentity?.toolCount ?? null,
//         state: skillIdentityState(installedSkillIdentity),
//         ...(installedSkillIdentity?.issues === undefined
//           ? {}
//           : { issues: installedSkillIdentity.issues }),
//         remediation: skillAligned
//           ? null
//           : skillIdentityRemediation(installedSkillIdentity),
//       },
//       registrations,
//     },
//   };
// };
//
// const skillIdentityAligned = (
//   identity: InstalledSkillIdentity | undefined,
// ): boolean =>
//   identity?.version === PRODUCT_IDENTITY.skillVersion &&
//   identity.toolCount === CATALOG_IDENTITY.counts.mcp_tools &&
//   identity.canonical;
//
// const skillIdentityState = (
//   identity: InstalledSkillIdentity | undefined,
// ): DoctorSkillState => {
//   if (identity?.issues?.some(({ kind }) => kind === "unreadable"))
//     return "unknown";
//   if ((identity?.issues?.length ?? 0) > 0) return "unmanaged";
//   return identity === undefined
//     ? "missing"
//     : skillIdentityAligned(identity)
//       ? "aligned"
//       : "stale";
// };
//
// const skillIdentityRemediation = (
//   identity: InstalledSkillIdentity | undefined,
// ): string => {
//   const issues = identity?.issues;
//   if (issues !== undefined && issues.length > 0)
//     return `${issues.map(({ path, detail }) => `${detail} (${path})`).join(" ")} Verify the reported paths and use regular skill directories, or run rea setup with --skill=false to configure the client without installing the skill.`;
//   return "Run rea setup to update the installed REA skill.";
// };
//
// const skillIdentityCheck = (
//   identity: InstalledSkillIdentity | undefined,
// ): DoctorCheck => {
//   const issues = identity?.issues;
//   return {
//     name: "skill:identity",
//     ok: false,
//     classification: "config_drift",
//     detail:
//       issues !== undefined && issues.length > 0
//         ? `Selected skill identity is ${skillIdentityState(identity)}: ${issues.map(({ path }) => path).join(", ")}.`
//         : identity === undefined
//           ? "Installed REA skill identity is missing."
//           : "Installed REA skill identity is stale.",
//     remediation: skillIdentityRemediation(identity),
//   };
// };
//
// const registrationCheck = (
//   registration: UnhealthyClientRegistrationStatus,
// ): DoctorCheck => ({
//   name: `registration:${registration.client}`,
//   ok: false,
//   classification: registration.state === "unknown" ? "unknown" : "config_drift",
//   detail: registration.config_path,
//   remediation: registration.remediation,
// });
//
// const installationState = (
//   paths: readonly string[],
// ): DoctorIdentity["installations"]["state"] =>
//   paths.length === 0 ? "unknown" : paths.length === 1 ? "single" : "multiple";
//
// /** Optional outer-adapter diagnostics composed without reversing dependencies. */
// export interface SystemDoctorHostOptions {
//   readonly platform?: NodeJS.Platform;
//   readonly architecture?: NodeJS.Architecture;
//   readonly environment?: NodeJS.ProcessEnv;
//   readonly execFileOutput?: typeof execFileOutput;
//   readonly providerInspections?: () => Promise<
//     readonly DoctorProviderInspection[]
//   >;
//   readonly providerRegistrationEnvironment?: () => Readonly<
//     Record<string, string>
//   >;
//   readonly resolveProviderRequestBudget?: ProviderRequestBudgetResolver;
//   readonly linuxDemoRuntimeCheck?: () => Promise<DoctorCheck>;
// }
//
// /** Create diagnostics backed by the current process and host commands. */
// export const systemDoctorHost = (
//   options: SystemDoctorHostOptions = {},
// ): DoctorHost => {
//   const resources = new ArtifactResourceScope();
//   const platform = options.platform ?? process.platform;
//   const architecture = options.architecture ?? process.arch;
//   const environment = options.environment ?? process.env;
//   const hostExecFileOutput = options.execFileOutput ?? execFileOutput;
//   const homeDirectory = homeDirectoryFromEnvironment(environment, platform);
//   const commandEnvironment = { env: environment };
//   return {
//     platform,
//     architecture,
//     runtime: javaScriptRuntime(process.versions),
//     homeDirectory,
//     ...(environment.HOPPER_LAUNCHER_PATH === undefined
//       ? {}
//       : { configuredHopperPath: environment.HOPPER_LAUNCHER_PATH }),
//     ...(environment.REA_ILSPY_CMD_PATH === undefined
//       ? {}
//       : { configuredIlspyCmdPath: environment.REA_ILSPY_CMD_PATH }),
//     macosVersion: () =>
//       readMacosVersion(hostExecFileOutput, commandEnvironment),
//     linuxDistribution: readLinuxDistribution,
//     async validTarget(path) {
//       return (
//         await parseBinaryTarget(path, {
//           cwd: process.cwd(),
//           hostArchitecture: architecture,
//         })
//       ).ok;
//     },
//     async inspectTarget(path) {
//       const result = await parseBinaryTarget(path, {
//         cwd: process.cwd(),
//         hostArchitecture: architecture,
//       });
//       if (result.ok)
//         return {
//           name: "target",
//           ok: true,
//           classification: "healthy",
//           detail: path,
//         };
//       const error = result.error;
//       const targetError =
//         error instanceof BinaryTargetError ? error : undefined;
//       return {
//         name: "target",
//         ok: false,
//         classification:
//           targetError?.constraint !== undefined
//             ? "unsupported_target"
//             : "config_drift",
//         detail: path,
//         details: {
//           reason: targetError?.reason ?? error.message,
//           ...(targetError?.constraint === undefined
//             ? {}
//             : { constraint: targetError.constraint }),
//         },
//         remediation: analysisErrorRemediationAction(error),
//       };
//     },
//     executable: (path) =>
//       executableAvailable(
//         path,
//         platform,
//         hostExecFileOutput,
//         commandEnvironment,
//       ),
//     linuxDemoRuntimeCheck:
//       options.linuxDemoRuntimeCheck ?? uncomposedLinuxDemoRuntimeCheck,
//     inspectLinuxHopper: (path) => inspectLinuxHopperLauncher(path, environment),
//     async brewHopperPath() {
//       return probeHomebrew(async (command) => {
export const _l = 174;
