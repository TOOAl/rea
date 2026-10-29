export const __stub = 1;
//         idempotent: contract.annotations.idempotentHint ?? false,
//         open_world: contract.annotations.openWorldHint ?? true,
//       },
//     };
//     if (clientBlocked)
//       return {
//         ...facts,
//         available: false,
//         reason: "client_capability_missing",
//         remediation: `Use an MCP client that supports: ${clientRequirements.missing_required.join(", ")}.`,
//       };
//     return availability.reason === "available"
//       ? {
//           ...facts,
//           available: true,
//           reason: availability.reason,
//           remediation: null,
//         }
//       : {
//           ...facts,
//           available: false,
//           reason: availability.reason,
//           remediation: availability.remediation,
//         };
//   }).sort((left, right) => compareUnicodeCodePoints(left.name, right.name));
// };
//
// type ClientRequirements = ToolAvailability["client_requirements"];
// type MutableAvailabilityGroup = Omit<
//   ToolAvailabilityInventory["groups"][number],
//   "names"
// > & { names: string[] };
//
// const EMPTY_CLIENT_REQUIREMENTS: ClientRequirements = {
//   required: [],
//   optional: [],
//   missing_required: [],
//   missing_optional: [],
// };
//
// /** Compact repeated metadata while retaining every operation's current availability inline. */
// export const compactToolAvailability = (
//   availability: readonly ToolAvailability[],
// ): ToolAvailabilityInventory => {
//   const clientRequirements =
//     availability[0]?.client_requirements ?? EMPTY_CLIENT_REQUIREMENTS;
//   const groups = new Map<string, MutableAvailabilityGroup>();
//
//   for (const entry of availability) {
//     const effects = TOOL_EFFECT_NAMES.filter((name) => entry.effects[name]);
//     const annotations = TOOL_ANNOTATION_NAMES.filter(
//       (name) => entry.annotations[name],
//     );
//     const groupFacts = {
//       surface: entry.surface,
//       effects,
//       annotations,
//       available: entry.available,
//       reason: entry.reason,
//       remediation: entry.remediation,
//       ...(entry.default_mode_available === undefined
//         ? {}
//         : { default_mode_available: entry.default_mode_available }),
//       ...(entry.modes === undefined ? {} : { modes: [...entry.modes] }),
//       ...(JSON.stringify(entry.client_requirements) ===
//       JSON.stringify(clientRequirements)
//         ? {}
//         : { client_requirements: entry.client_requirements }),
//     };
//     const key = JSON.stringify(groupFacts);
//     const existing = groups.get(key);
//     if (existing) existing.names.push(entry.name);
//     else groups.set(key, { ...groupFacts, names: [entry.name] });
//   }
//
//   return toolAvailabilityInventory.parse({
//     client_requirements: clientRequirements,
//     groups: [...groups.values()],
//   });
// };
//
// const availabilityFor = (context: AvailabilityContext): Availability => {
//   // These built-in workflows accept a caller-selected endpoint; they do not load the optional passive provider.
//   if (
//     context.name === "observe_web_execution" ||
//     context.name === "inspect_web_event_listeners"
//   )
//     return { reason: "available", remediation: null };
//   if (context.name === "get_navigation_context")
//     return navigationContextAvailability(context.descriptors);
//   const javascriptApplication = javascriptApplicationAvailability(context);
//   if (javascriptApplication !== null) return javascriptApplication;
//   const failure = optionalProviderFailureFor(context);
//   if (failure !== undefined)
//     return {
//       reason: "provider_unavailable",
//       remediation: `Adapter ${failure.providerId} could not load: ${failure.reason}. Repair the adapter installation and restart REA; other capabilities remain available.`,
//     };
//   const workflowAvailability = workflowAvailabilityFor(context);
//   if (workflowAvailability !== null) return workflowAvailability;
//   const hostDecision = hostAvailability(context);
//   if (hostDecision !== null) return hostDecision;
//   const targetDecision = targetAvailability(context);
//   if (targetDecision !== null) return targetDecision;
//   return providerAvailability(context);
// };
//
// const optionalProviderFailureFor = ({
//   name,
//   kind,
//   policy,
// }: AvailabilityContext): OptionalProviderLoadFailure | undefined => {
//   const failures = policy.optionalProviderLoadFailures;
//   if (name === "capture_browser_scenario")
//     return failures?.browserScenarioCapture;
//   if (kind === "browser-provider") return failures?.browserObservation;
//   if (name === "capture_electron_scenario")
//     return failures?.electronActiveObservation;
//   if (kind === "electron-provider") return failures?.electronObservation;
//   if (kind === "runtime-provider")
//     return failures?.javascriptRuntimeObservation;
//   if (FRIDA_OPERATION_NAMES.has(name)) return failures?.fridaInstrumentation;
//   return undefined;
// };
//
// const javascriptApplicationAvailability = ({
//   name,
// }: AvailabilityContext): Availability | null => {
//   if (name === "analyze_javascript_application")
//     return { reason: "available", remediation: null };
//   return name === "reconcile_javascript_runtime"
//     ? { reason: "available", remediation: null }
//     : null;
// };
//
// const workflowAvailabilityFor = ({
//   name,
//   kind,
//   policy,
// }: AvailabilityContext): Availability | null => {
//   if (
//     name === "inspect_go_binary" ||
//     name === "inspect_rust_binary" ||
//     name === "inspect_electron_fuses"
//   )
//     return { reason: "available", remediation: null };
//   if (name === "inspect_sqlite_database") {
//     const capability = sqliteDatabaseCapability(process.versions.node);
//     return capability.available
//       ? { reason: "available", remediation: null }
//       : {
//           reason: "provider_unavailable",
//           remediation: capability.reason,
//         };
//   }
//   if (name === "trace_web_module_imports")
//     return {
//       reason: "available",
//       remediation: null,
//       defaultModeAvailable: policy.webModuleResolutionEnabled === true,
//       modes: [
//         {
//           name: "sources-without-literal-imports",
//           available: true,
//           missing_operations: [],
//           remediation: null,
//         },
//         policy.webModuleResolutionEnabled === true
//           ? {
//               name: "native-literal-resolution",
//               available: true,
//               missing_operations: [],
//               remediation: null,
//             }
//           : {
//               name: "native-literal-resolution",
//               available: false,
//               missing_operations: ["native-module-resolver"],
//               remediation:
//                 "Provide an absolute REA_BROWSER_EXECUTABLE supporting import.meta.resolve; no binary target is required.",
//             },
//       ],
//     };
//   if (name === "recover_javascript_sources")
//     return policy.javascriptRecoveryEnabled === true
//       ? { reason: "available", remediation: null }
//       : {
//           reason: "provider_missing",
//           remediation:
//             "On Linux x64, provide an absolute REA_WAKARU_COMMAND for Wakaru ^1.13.0 (verified with 1.14.0) and util-linux prlimit; see docs/javascript-recovery.md#install-wakaru. No binary target is required.",
//         };
//   if (name === "inspect_binary_layout")
//     return policy.binaryLayoutEnabled === true
//       ? { reason: "available", remediation: null }
//       : {
//           reason: "provider_missing",
//           remediation:
//             "On Linux x64, set absolute REA_PWNTOOLS_PYTHON to caller-supplied Python with pwntools 4.15.0. No active binary target is required.",
//         };
//   if (name === "inspect_packet_capture" || name === "inspect_packet_fields")
//     return policy.packetCaptureEnabled === true
//       ? { reason: "available", remediation: null }
//       : {
//           reason: "provider_missing",
//           remediation:
//             "On Linux, supply TShark 4.x via absolute REA_TSHARK_COMMAND and util-linux prlimit (REA_TSHARK_PRLIMIT_COMMAND, default /usr/bin/prlimit). No active binary target or hardware is required; the tool is checked at execution.",
//         };
//   if (name === "decode_signal_recording" || name === "inspect_signal_decoders")
//     return policy.signalRecordingEnabled === true
export const _l = 209;
