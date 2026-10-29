export const __stub = 1;
//       selectedSkillClientIds,
//     );
//     if (!admission.ok) return failSkill(admission.error);
//   }
//   let selectedClients: readonly SetupClient[] =
//     planSelection.clientsToConfigure;
//   let hopperWarning: string | undefined;
//   if (
//     planSelection.installHopper &&
//     (interactiveApproval || options.installHopper)
//   ) {
//     const install = await installHopperAction({
//       host,
//       options,
//       plannedActions,
//       appliedActions,
//       clients,
//       selectedClients,
//       providerEnvironment,
//       doctorScope: readinessScope,
//       clientStates,
//     });
//     if ("failure" in install) return install.failure;
//     ({
//       hopperPath,
//       providerEnvironment,
//       selectedClients,
//       warning: hopperWarning,
//     } = install);
//   }
//   const clientFailure = await configureDetectedClients({
//     host,
//     detectedClients: selectedClients,
//     providerEnvironment,
//     command: host.registrationCommand,
//     clients,
//     appliedActions,
//     ...(options.onProgress === undefined
//       ? {}
//       : { onProgress: options.onProgress }),
//   });
//   if (clientFailure !== undefined) return fail(clientFailure);
//   if (planSelection.installSkill) {
//     const skillFailure = await installSkillAction(
//       host,
//       options,
//       appliedActions,
//       selectedSkillClientIds,
//     );
//     if (skillFailure !== undefined) {
//       return failSkill(skillFailure);
//     }
//   }
//   const doctor = summarizeDoctor(await host.doctor(readinessScope));
//   const remediation = combineRemediation(
//     finalSetupRemediation(
//       host.platform,
//       appliedActions.includes("installed_hopper"),
//       doctor.healthy,
//       hopperPath,
//     ),
//     hopperWarning,
//     manualRemediation,
//   );
//   return {
//     status: remediation === undefined ? "ready" : "needs_human",
//     plannedActions,
//     appliedActions,
//     clients,
//     doctor,
//     clientStates,
//     ...(remediation === undefined ? {} : { remediation }),
//   };
// };
//
// const installHopperAction = async (input: {
//   readonly host: SetupHost;
//   readonly options: SetupOptions;
//   readonly plannedActions: readonly SetupAction[];
//   readonly appliedActions: string[];
//   readonly clients: Readonly<Record<string, ClientConfigurationResult>>;
//   readonly selectedClients: readonly SetupClient[];
//   readonly providerEnvironment: SetupProviderEnvironment;
//   readonly doctorScope: DoctorScope | undefined;
//   readonly clientStates: readonly SetupClientState[];
// }) => {
//   const label = "Hopper deep-analysis provider";
//   emitProgress(input.options, {
//     actionId: "install_hopper",
//     label,
//     state: "started",
//   });
//   const installed = await input.host.installHopper(input.options.installHopper);
//   if (installed.status === "failed") {
//     emitProgress(input.options, {
//       actionId: "install_hopper",
//       label,
//       state: "failed",
//       detail: installed.remediation,
//     });
//     return {
//       failure: {
//         status: "needs_human" as const,
//         plannedActions: input.plannedActions,
//         appliedActions: input.appliedActions,
//         clients: input.clients,
//         doctor: summarizeDoctor(await input.host.doctor(input.doctorScope)),
//         clientStates: input.clientStates,
//         code: installed.code,
//         remediation: installed.remediation,
//       },
//     };
//   }
//   input.appliedActions.push("installed_hopper");
//   const warning = [installed.warning, installed.cleanupFailure]
//     .filter((value): value is string => value !== undefined)
//     .join(" ");
//   emitProgress(input.options, {
//     actionId: "install_hopper",
//     label,
//     state: warning === "" ? "completed" : "warning",
//     detail:
//       warning === ""
//         ? installed.launcherPath
//         : `${installed.launcherPath}; ${warning}`,
//   });
//   const providerEnvironment = {
//     ...input.providerEnvironment,
//     HOPPER_LAUNCHER_PATH: installed.launcherPath,
//   };
//   return {
//     hopperPath: installed.launcherPath,
//     providerEnvironment,
//     ...(warning === "" ? {} : { warning }),
//     selectedClients: await filterClientsNeedingConfigure(
//       input.host,
//       input.selectedClients,
//       providerEnvironment,
//       input.host.registrationCommand,
//     ),
//   };
// };
//
// const installSkillAction = async (
//   host: SetupHost,
//   options: SetupOptions,
//   appliedActions: string[],
//   skillClientIds: readonly string[],
// ): Promise<SetupSkillInstallError | undefined> => {
//   const label = "REA reverse-engineering skill";
//   emitProgress(options, {
export const _l = 151;
