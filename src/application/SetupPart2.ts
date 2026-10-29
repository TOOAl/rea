export const __stub = 1;
//       ]),
//     ];
//     const selectionSkillNeedsInstall = await host.skillNeedsInstall(
//       selectionSkillClientIds,
//     );
//     const offerSkillAction =
//       options.installSkill !== false && selectionSkillNeedsInstall;
//     const selectionActions = await planSetupActions({
//       discovery,
//       host,
//       providerEnvironment,
//       command: host.registrationCommand,
//       clientIds: [],
//       skillClientIds: selectionSkillClientIds,
//       installSkill: offerSkillAction,
//     });
//     const decision = await confirm(selectionActions.plannedActions, {
//       stage: "select",
//       clientStates,
//       selectedClientIds: discovery.defaultClientIds,
//       clientSelectionAllowed,
//     });
//     if (isSetupDecisionCancelled(decision))
//       return setupCancelled(
//         selectionActions.plannedActions,
//         clients,
//         clientStates,
//         discovery.initialDoctor,
//       );
//     const selectedActionIds = new Set(
//       typeof decision === "boolean"
//         ? decision
//           ? [
//               ...selectionActions.plannedActions.map(({ id }) => id),
//               ...discovery.defaultClientIds.map(
//                 (id) => `configure_client:${id}`,
//               ),
//             ]
//           : []
//         : decision.selectedActionIds,
//     );
//     selectedClientIds = [...selectedActionIds]
//       .filter((id) => id.startsWith("configure_client:"))
//       .map((id) => id.slice("configure_client:".length));
//     skillNeedsInstall = await host.skillNeedsInstall(selectedClientIds);
//     const proposedInstallAction = selectionActions.plannedActions.some(
//       ({ id }) => id === "install_hopper",
//     );
//     planDiscovery = {
//       ...discovery,
//       installHopper:
//         options.installHopper ||
//         (proposedInstallAction && selectedActionIds.has("install_hopper")),
//     };
//     skillSelected =
//       options.installSkill === true ||
//       (selectedActionIds.has("install_skill") &&
//         selectedClientIds.length === 0) ||
//       (options.installSkill !== false && selectedClientIds.length > 0);
//     installSkill = skillSelected && skillNeedsInstall;
//     selectedSkillClientIds = selectedClientIds;
//   }
//   const planned = await planSetupActions({
//     discovery: planDiscovery,
//     host,
//     providerEnvironment,
//     command: host.registrationCommand,
//     clientIds: selectedClientIds,
//     skillClientIds: selectedSkillClientIds,
//     installSkill,
//   });
//   plannedActions = planned.plannedActions;
//   if (planned.blocker !== undefined) return fail(planned.blocker);
//   const hopperBlocker = await hostRemediation(
//     host,
//     planDiscovery.installHopper,
//   );
//   if (hopperBlocker !== undefined) return fail(hopperBlocker);
//   const planSelection = {
//     installHopper: planDiscovery.installHopper,
//     installSkill,
//     skillSelected,
//     selectedSkillClientIds,
//     selectedClients: planned.selectedClients,
//     clientsToConfigure: planned.clientsToConfigure,
//   };
//   readinessScope = resolvedReadinessScope(
//     options.readinessScope,
//     planSelection,
//   );
//
//   const manualRemediation = manualClientsRemediation(planned.selectedClients);
//   if (skillSelected) {
//     const admission = await host.validateSkillDirectories(
//       selectedSkillClientIds,
//     );
//     if (!admission.ok) return failSkill(admission.error);
//   }
//   if (options.dryRun === true)
//     return {
//       status: "planned",
//       plannedActions,
//       appliedActions,
//       clients,
//       doctor: summarizeDoctor(discovery.initialDoctor),
//       clientStates,
//       ...(manualRemediation === undefined
//         ? {}
//         : { remediation: manualRemediation }),
//     };
//
//   let approved = options.approved || plannedActions.length === 0;
//   let interactiveApproval = false;
//   if (!approved && confirm !== undefined && !options.structured) {
//     const decision = await confirm?.(plannedActions, {
//       stage: "confirm",
//       clientStates,
//       selectedClientIds,
//       clientSelectionAllowed: false,
//     });
//     if (decision !== undefined) {
//       if (isSetupDecisionCancelled(decision))
//         return setupCancelled(
//           plannedActions,
//           clients,
//           clientStates,
//           discovery.initialDoctor,
//         );
//       approved = typeof decision === "boolean" ? decision : decision.approved;
//       interactiveApproval = approved;
//     }
//   }
//   if (!approved)
//     return {
//       status: confirm === undefined ? "needs_confirmation" : "cancelled",
//       plannedActions,
//       appliedActions,
//       clients,
//       doctor: summarizeDoctor(discovery.initialDoctor),
//       clientStates,
//       ...(confirm === undefined
//         ? {
//             remediation:
//               "Review the setup plan, then rerun interactively or with --yes.",
//           }
//         : {}),
//     };
//
//   // Approval may pause while a skill manager changes a selected directory.
//   if (planSelection.skillSelected) {
//     const admission = await host.validateSkillDirectories(
export const _l = 151;
