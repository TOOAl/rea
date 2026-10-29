export const __stub = 1;
//     readonly remediation: string | null;
//   };
//   readonly registrations: readonly ClientRegistrationStatus[];
// }
//
// /**
//  * Check requirements and an optional target without mutating the host.
//  * Every failed check includes remediation suitable for either the one-shot CLI
//  * or an agent consuming the structured result.
//  */
// export const runDoctor = async (
//   target?: string,
//   selectedHost?: DoctorHost,
//   requestedScope?: DoctorScope,
// ): Promise<DoctorReport> =>
//   selectedHost === undefined
//     ? runDoctorOwned(target, systemDoctorHost(), requestedScope)
//     : inspectDoctor(target, selectedHost, requestedScope);
//
// /** Inspect with a host whose lifetime belongs to this operation. */
// export const runDoctorOwned = async (
//   target: string | undefined,
//   host: DoctorHost,
//   requestedScope?: DoctorScope,
// ): Promise<DoctorReport> => {
//   let report: DoctorReport;
//   try {
//     report = await inspectDoctor(target, host, requestedScope);
//   } catch (cause: unknown) {
//     const cleanup = await closeDoctorHost(host);
//     if (cleanup !== undefined)
//       throw new AggregateError(
//         [cause, new Error(cleanup)],
//         "Doctor failed and its resource cleanup remains incomplete.",
//         { cause },
//       );
//     throw cause;
//   }
//   const cleanup = await closeDoctorHost(host);
//   return cleanup === undefined
//     ? report
//     : doctorReportWithCleanup(report, cleanup);
// };
//
// const inspectDoctor = async (
//   target: string | undefined,
//   host: DoctorHost,
//   requestedScope?: DoctorScope,
// ): Promise<DoctorReport> => {
//   const scope = normalizeDoctorScope(requestedScope, target);
//   const {
//     checks: diagnosticChecks,
//     hopperPath,
//     providerInspections,
//   } = await collectDoctorDiagnostics(target, host);
//   const identity = await collectDoctorIdentity(host, scope);
//   const checks = [
//     ...diagnosticChecks,
//     ...identity.checks,
//     ...registrationAdvisoryChecks(identity.value.registrations),
//   ];
//   const providers = {
//     hopperAvailable:
//       hopperPath !== undefined &&
//       checks
//         .filter(({ name }) => name.startsWith("hopper"))
//         .every(({ ok }) => ok),
//     hopperConfigured: host.configuredHopperPath !== undefined,
//     providerInspections,
//   };
//   const environmentHealthy = doctorHealthy(checks, providers);
//   const scoped = scopeDoctorChecks({
//     checks,
//     registrations: identity.value.registrations,
//     skillState: identity.value.skill.state,
//     providers,
//     scope,
//   });
//   return {
//     healthy: scope.mode === "audit-wide" ? environmentHealthy : scoped.healthy,
//     environment_healthy: environmentHealthy,
//     scope,
//     scope_checks: scope.mode === "audit-wide" ? checks : scoped.scopeChecks,
//     informational_checks:
//       scope.mode === "audit-wide" ? [] : scoped.informationalChecks,
//     ...(hopperPath === undefined ? {} : { hopperPath }),
//     ...(providerInspections === undefined ? {} : { providerInspections }),
//     checks,
//     identity: identity.value,
//   };
// };
//
// const registrationAdvisoryChecks = (
//   registrations: readonly ClientRegistrationStatus[],
// ): readonly DoctorCheck[] =>
//   registrations.flatMap(({ client, advisory }) =>
//     advisory === undefined
//       ? []
//       : [
//           {
//             name: `registration_timeout:${client}`,
//             ok: true,
//             classification: "healthy" as const,
//             detail: advisory,
//           },
//         ],
//   );
//
// const closeDoctorHost = async (
//   host: DoctorHost,
// ): Promise<string | undefined> => {
//   try {
//     return await host.close?.();
//   } catch (cause: unknown) {
//     return `Doctor host cleanup failed: ${cause instanceof Error ? cause.message : String(cause)}`;
//   }
// };
//
// const doctorReportWithCleanup = (
//   report: DoctorReport,
//   detail: string,
// ): DoctorReport => {
//   const check: DoctorCheck = {
//     name: "doctor-resource-cleanup",
//     ok: false,
//     classification: "config_drift",
//     detail,
//     remediation: "Resolve the reported cleanup failure, then rerun rea doctor.",
//   };
//   return {
//     ...report,
//     healthy: false,
//     environment_healthy: false,
//     checks: [...report.checks, check],
//     scope_checks: [...report.scope_checks, check],
//   };
// };
//
// const collectDoctorIdentity = async (
//   host: DoctorHost,
//   scope: DoctorScopeReport,
// ): Promise<{
//   readonly checks: readonly DoctorCheck[];
//   readonly value: DoctorIdentity;
// }> => {
//   const installationPaths = (await host.installationPaths?.()) ?? [];
//   const registrations = (await host.clientRegistrations?.()) ?? [];
//   const skillClientIds =
//     scope.skill_clients ??
//     (scope.clients.length > 0 ? scope.clients : undefined);
//   const installedSkillIdentity =
//     await host.installedSkillIdentity?.(skillClientIds);
//   const skillAligned = skillIdentityAligned(installedSkillIdentity);
//   return {
//     checks: [
//       ...(skillAligned ? [] : [skillIdentityCheck(installedSkillIdentity)]),
//       ...registrations
//         .filter(
//           (registration): registration is UnhealthyClientRegistrationStatus =>
//             registration.state !== "aligned" && registration.state !== "manual",
//         )
//         .map(registrationCheck),
//     ],
//     value: {
//       cli_package_version: PRODUCT_IDENTITY.packageVersion,
//       expected_skill_version: PRODUCT_IDENTITY.skillVersion,
//       sdk: SDK_IDENTITY,
//       catalog: CATALOG_IDENTITY,
//       live_server: {
//         state: "unknown",
//         remediation:
//           "Call binary_session in the active client to inspect the running server identity.",
//       },
//       installations: {
export const _l = 174;
