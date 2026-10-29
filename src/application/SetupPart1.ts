export const __stub = 1;
// import type {
//   ClientConfigurationResult,
//   SetupAction,
//   SetupClientState,
//   SetupConfirmation,
//   SetupConfirmationDecision,
//   SetupDoctorSummary,
//   SetupHost,
//   SetupOptions,
//   SetupProgressEvent,
//   SetupProviderEnvironment,
//   SetupResult,
// } from "./SetupTypes.js";
// import {
//   manualRegistrationRemediation,
//   type SetupClient,
// } from "./SupportedClients.js";
// import type { DoctorReport, DoctorScope } from "./Doctor.js";
// import { configureDetectedClients } from "./SetupClients.js";
// import { discoverSetupState, planSetupActions } from "./SetupPlan.js";
// import {
//   filterClientsNeedingConfigure,
//   hostRemediation,
//   systemSetupHost,
// } from "./SetupHost.js";
// import { AnalysisError } from "../domain/analysisErrorBase.js";
// import { analysisErrorWithCleanupFailure } from "../domain/analysisErrorCleanup.js";
// import { ProviderCleanupError } from "../domain/providerCleanupError.js";
// import type { SetupSkillInstallError } from "./SetupSkill.js";
//
// /** Discover, approve, and apply setup actions idempotently. */
// export const runSetup = async (
//   options: SetupOptions,
//   host: SetupHost = systemSetupHost(),
//   confirm?: SetupConfirmation,
// ): Promise<SetupResult> => {
//   let result: SetupResult | undefined;
//   let primaryFailure: unknown;
//   let threw = false;
//   try {
//     result = await runSetupWorkflow(options, host, confirm);
//   } catch (cause: unknown) {
//     threw = true;
//     primaryFailure = cause;
//   }
//
//   let cleanupFailure: string | undefined;
//   try {
//     cleanupFailure = await host.close?.();
//   } catch (cause: unknown) {
//     cleanupFailure = `Setup resource cleanup failed: ${failureMessage(cause)}`;
//   }
//
//   if (threw) {
//     if (cleanupFailure !== undefined && primaryFailure instanceof AnalysisError)
//       throw analysisErrorWithCleanupFailure(
//         primaryFailure,
//         new ProviderCleanupError(
//           "setup",
//           primaryFailure.cleanupResources,
//           { reason: cleanupFailure },
//           { operation: "setup" },
//         ),
//         "setup",
//       );
//     if (cleanupFailure !== undefined)
//       throw new AggregateError(
//         [primaryFailure, new Error(cleanupFailure)],
//         "Setup and resource cleanup failed.",
//         { cause: primaryFailure },
//       );
//     throw primaryFailure;
//   }
//   if (result === undefined) throw new Error("Setup returned no result.");
//   if (cleanupFailure === undefined) return result;
//   return {
//     ...result,
//     status: "needs_human",
//     code: result.code ?? "cleanup_failed",
//     remediation: result.remediation
//       ? `${result.remediation} ${cleanupFailure}`
//       : cleanupFailure,
//   };
// };
//
// const runSetupWorkflow = async (
//   options: SetupOptions,
//   host: SetupHost,
//   confirm?: SetupConfirmation,
// ): Promise<SetupResult> => {
//   const appliedActions: string[] = [];
//   let plannedActions: readonly SetupAction[] = [];
//   const clients: Record<string, ClientConfigurationResult> = {};
//   let clientStates: readonly SetupClientState[] = [];
//   let readinessScope = options.readinessScope;
//   const fail = (remediation: string) =>
//     setupFailure(
//       remediation,
//       [host, plannedActions, appliedActions, clients, clientStates],
//       readinessScope,
//     );
//   const failSkill = async (
//     error: SetupSkillInstallError,
//   ): Promise<SetupResult> => ({
//     ...(await fail(error.remediation)),
//     code: "skill_install_failed",
//   });
//   const unsupported = await hostRemediation(host, false);
//   if (unsupported !== undefined) return fail(unsupported);
//   const initialState = await host.initialSetupState(options.readinessScope);
//   let { hopperPath, providerEnvironment } = initialState;
//   const discovery = await discoverSetupState({
//     host,
//     providerConfigured: initialState.providerConfigured,
//     forceHopperInstall: options.installHopper,
//     hopperLauncherConfigured: initialState.hopperLauncherConfigured === true,
//     proposeHopper:
//       options.proposeHopper ?? (confirm !== undefined && !options.structured),
//     initialDoctor: initialState.doctor,
//   });
//   clientStates = discovery.clientStates;
//   const clientSelectionAllowed =
//     options.clientIds === undefined &&
//     options.readinessScope?.clients === undefined &&
//     options.allDetectedClients !== true &&
//     options.installHopper !== true &&
//     options.skillClientIds === undefined &&
//     options.installSkill === undefined;
//   const interactiveSelection =
//     confirm !== undefined && !options.structured && clientSelectionAllowed;
//   let selectedClientIds = options.allDetectedClients
//     ? discovery.detectedClientIds
//     : (options.clientIds ??
//       options.readinessScope?.clients ??
//       discovery.defaultClientIds);
//   let selectedSkillClientIds =
//     options.skillClientIds ??
//     options.readinessScope?.skillClients ??
//     selectedClientIds;
//   let skillNeedsInstall = await host.skillNeedsInstall(selectedSkillClientIds);
//   let skillSelected =
//     options.installSkill === true ||
//     (options.installSkill !== false &&
//       (selectedClientIds.length > 0 || selectedSkillClientIds.length > 0));
//   let installSkill = skillSelected && skillNeedsInstall;
//   let planDiscovery = discovery;
//   if (interactiveSelection) {
//     const selectionSkillClientIds = [
//       ...new Set([
//         ...discovery.defaultClientIds,
//         ...discovery.detectedClientIds,
export const _l = 151;
