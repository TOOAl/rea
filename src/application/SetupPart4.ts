export const __stub = 1;
//     actionId: "install_skill",
//     label,
//     state: "started",
//   });
//   const skill = await host.installSkill(skillClientIds);
//   if (!skill.ok) {
//     emitProgress(options, {
//       actionId: "install_skill",
//       label,
//       state: "failed",
//       detail: skill.error.message,
//     });
//     return skill.error;
//   }
//   if (skill.value === "installed") appliedActions.push("installed_skill");
//   emitProgress(options, {
//     actionId: "install_skill",
//     label,
//     state: skill.value === "installed" ? "completed" : "warning",
//     ...(skill.value === "unchanged" ? { detail: "Already current" } : {}),
//   });
//   return undefined;
// };
//
// const setupFailure = async (
//   remediation: string,
//   [host, plannedActions, appliedActions, clients, clientStates]: readonly [
//     SetupHost,
//     readonly SetupAction[],
//     readonly string[],
//     Readonly<Record<string, ClientConfigurationResult>>,
//     readonly SetupClientState[],
//   ],
//   scope?: DoctorScope,
// ): Promise<SetupResult> => {
//   return {
//     status: "needs_human",
//     plannedActions,
//     appliedActions,
//     clients,
//     doctor: summarizeDoctor(await host.doctor(scope)),
//     clientStates,
//     remediation,
//   };
// };
//
// const emitProgress = (options: SetupOptions, event: SetupProgressEvent): void =>
//   options.onProgress?.(event);
//
// const manualClientsRemediation = (
//   clients: readonly SetupClient[],
// ): string | undefined =>
//   clients
//     .map((client) => manualRegistrationRemediation(client.name))
//     .find((remediation) => remediation !== undefined);
//
// const combineRemediation = (
//   ...parts: readonly (string | undefined)[]
// ): string | undefined => {
//   const present = parts.filter(
//     (part): part is string => part !== undefined && part !== "",
//   );
//   return present.length === 0 ? undefined : present.join(" ");
// };
//
// const finalSetupRemediation = (
//   platform: NodeJS.Platform,
//   installedHopper: boolean,
//   healthy: boolean,
//   hopperPath: string | undefined,
// ): string | undefined => {
//   if (platform === "darwin" && installedHopper)
//     return "Open Hopper, choose its demo mode or activate a license, then rerun rea doctor --json.";
//   if (healthy) return undefined;
//   return hopperPath === undefined
//     ? "Hopper is optional for non-Hopper providers. Rerun with --yes --install-hopper for deep native analysis."
//     : "Run rea doctor and apply each reported remediation.";
// };
//
// const isSetupDecisionCancelled = (
//   decision: boolean | SetupConfirmationDecision,
// ): boolean =>
//   typeof decision === "boolean" ? !decision : decision.cancelled === true;
//
// const setupCancelled = (
//   plannedActions: readonly SetupAction[],
//   clients: Readonly<Record<string, ClientConfigurationResult>>,
//   clientStates: readonly SetupClientState[],
//   doctor: DoctorReport,
// ): SetupResult => ({
//   status: "cancelled",
//   plannedActions,
//   appliedActions: [],
//   clients,
//   doctor: summarizeDoctor(doctor),
//   clientStates,
// });
//
// const resolvedReadinessScope = (
//   requested: DoctorScope | undefined,
//   selection: {
//     readonly selectedClients: readonly SetupClient[];
//     readonly installHopper: boolean;
//     readonly skillSelected?: boolean;
//     readonly selectedSkillClientIds: readonly string[];
//   },
// ): DoctorScope => ({
//   clients: selection.selectedClients.map(({ name }) => name),
//   providers: selection.installHopper
//     ? ["hopper"]
//     : (requested?.providers ?? []),
//   skill: selection.skillSelected === true || requested?.skill === true,
//   ...(selection.skillSelected === true || requested?.skill === true
//     ? { skillClients: selection.selectedSkillClientIds }
//     : {}),
// });
//
// const summarizeDoctor = (report: DoctorReport): SetupDoctorSummary => ({
//   healthy: report.healthy,
//   environment_healthy: report.environment_healthy,
//   scope: report.scope,
//   availableProviders: [
//     ...(report.hopperPath !== undefined &&
//     report.checks
//       .filter(({ name }) => name.startsWith("hopper"))
//       .every(({ ok }) => ok)
//       ? ["hopper"]
//       : []),
//     ...(report.providerInspections ?? [])
//       .filter(({ available }) => available)
//       .map(({ id }) => id),
//   ],
//   ...(report.hopperPath === undefined ? {} : { hopperPath: report.hopperPath }),
//   ...(report.providerInspections === undefined
//     ? {}
//     : { providerInspections: report.providerInspections }),
//   ...(report.identity === undefined
//     ? {}
//     : {
//         identity: {
//           skill: report.identity.skill,
//           registrations: report.identity.registrations,
//         },
//       }),
// });
//
// const failureMessage = (cause: unknown): string =>
//   cause instanceof Error ? cause.message : String(cause);
export const _l = 148;
