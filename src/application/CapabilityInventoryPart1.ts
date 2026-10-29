export const __stub = 1;
// import { z } from "zod";
// import { sqliteDatabaseCapability } from "./sqlite/SqliteDatabaseCapability.js";
// import type {
//   OptionalProviderLoadFailures,
//   OptionalProviderLoadFailure,
// } from "./OptionalObservationProviders.js";
//
// import {
//   expandProviderCapabilities,
//   providerCapabilitySet,
//   toolAvailabilityInventory,
//   TOOL_ANNOTATION_NAMES,
//   TOOL_EFFECT_NAMES,
//   type ClientFeatureAvailability,
//   type ProviderCapability,
//   type ToolAvailabilityInventory,
//   type ToolAvailability,
//   type ToolAvailabilityMode,
//   type ToolUnavailabilityReason,
// } from "../contracts/toolOutputSchemaPrimitives.js";
// import type { ToolKind } from "../contracts/toolContractTypes.js";
// import type { JsonValue } from "../domain/jsonValue.js";
// import { isMachOFormat } from "../domain/binaryTargetTypes.js";
// import type { ProviderAvailability } from "./AnalysisProvider.js";
// import type { JebAnalysisAvailability } from "./jeb/JebAnalysisPort.js";
// import { TOOL_CONTRACTS } from "../contracts/toolContracts.js";
// import { FRIDA_TOOL_CONTRACTS } from "../contracts/fridaToolContracts.js";
// import {
//   clientRequirementsFor,
//   NO_CLIENT_FEATURES,
// } from "./CapabilityClientRequirements.js";
// import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";
//
// const statusSchema = z.object({
//   open: z.boolean(),
//   kind: z.enum(["executable", "database", "archive", "artifact"]).optional(),
//   format: z.string().optional(),
//   capabilities: z
//     .array(providerCapabilitySet)
//     .transform(expandProviderCapabilities),
// });
//
// type ToolAvailabilityReason = "available" | ToolUnavailabilityReason;
//
// type ProviderDescriptor = ProviderCapability;
// export type AvailabilityPolicy = {
//   readonly packetCaptureEnabled?: boolean;
//   readonly signalRecordingEnabled?: boolean;
//   readonly wasmArtifactEnabled?: boolean;
//   readonly evmInterfaceEnabled?: boolean;
//   readonly processCaptureEnabled: boolean;
//   readonly optionalProviderLoadFailures?: OptionalProviderLoadFailures;
//   readonly binaryLayoutEnabled?: boolean;
//   readonly recordedCrashEnabled?: boolean;
//   readonly firmwareInspectionEnabled?: boolean;
//   readonly firmwareExtractionEnabled?: boolean;
//   readonly androidAnalysisAvailability?: ProviderAvailability;
//   readonly adbAnalysisAvailability?: ProviderAvailability;
//   readonly apktoolAnalysisAvailability?: ProviderAvailability;
//   readonly jebAnalysisAvailability?: JebAnalysisAvailability;
//   readonly javascriptRecoveryEnabled?: boolean;
//   readonly webModuleResolutionEnabled?: boolean;
//   readonly browserObservationEnabled?: boolean;
//   readonly browserScenarioEnabled?: boolean;
//   readonly electronObservationEnabled?: boolean;
//   readonly electronAutomationEnabled?: boolean;
//   readonly v8InspectorObservationEnabled?: boolean;
// };
//
// type AvailabilityFacts = {
//   readonly defaultModeAvailable?: boolean;
//   readonly modes?: readonly ToolAvailabilityMode[];
// };
// type Availability = AvailabilityFacts &
//   (
//     | { readonly reason: "available"; readonly remediation: null }
//     | {
//         readonly reason: ToolUnavailabilityReason;
//         readonly remediation: string | null;
//       }
//   );
// type NavigationModeResult =
//   | (Extract<ToolAvailabilityMode, { available: true }> & {
//       readonly reason: "available";
//     })
//   | (Extract<ToolAvailabilityMode, { available: false }> & {
//       readonly reason: ToolUnavailabilityReason;
//     });
// type AvailabilityContext = {
//   readonly name: string;
//   readonly kind: ToolKind;
//   readonly targetOpen: boolean;
//   readonly targetKind:
//     | "executable"
//     | "database"
//     | "archive"
//     | "artifact"
//     | undefined;
//   readonly targetFormat: string | undefined;
//   readonly descriptors: ReadonlyMap<string, ProviderDescriptor>;
//   readonly policy: AvailabilityPolicy;
// };
//
// const ENHANCED_REQUIREMENTS: Readonly<
//   Record<string, readonly (string | readonly string[])[]>
// > = {
//   trace_native_values: ["analyze_function", "resolve_native_call_targets"],
//   trace_native_ui_action: [
//     "decode_interface_builder",
//     "list_names",
//     "procedure_callees",
//   ],
//   inspect_native_dispatch_metadata: ["list_names"],
//   get_objc_classes: ["list_names"],
//   get_objc_protocols: ["list_names"],
//   batch_decompile: ["procedure_pseudo_code"],
//   get_call_graph: ["procedure_callees", "procedure_callers"],
//   analyze_swift_types: ["list_procedures"],
//   find_xrefs_to_name: ["list_names", "xrefs"],
//   binary_overview: [
//     ["current_document", "list_documents"],
//     "list_procedures",
//     "list_strings",
//   ],
//   analyze_function: ["analyze_function"],
//   inspect_native_api: ["analyze_function"],
//   trace_feature: [
//     "search_strings",
//     "search_procedures",
//     "xrefs",
//     "resolve_containing_procedure",
//   ],
// };
//
// /** Contract kinds whose operations run on the active session target. */
// const ACTIVE_TARGET_KINDS: ReadonlySet<ToolKind> = new Set([
//   "official-proxy",
//   "enhanced",
//   "native-provider",
//   "artifact-provider",
// ]);
// const FRIDA_OPERATION_NAMES: ReadonlySet<string> = new Set(
//   FRIDA_TOOL_CONTRACTS.map(({ name }) => name),
// );
//
// /** Native contracts defined only for an active Mach-O executable. */
// const MACHO_TARGET_OPERATIONS: ReadonlySet<string> = new Set([
//   "inspect_signature",
//   "inspect_macho",
//   "list_architectures",
//   "observe_native_calls",
//   "observe_native_ui",
//   "capture_native_ui_scenario",
// ]);
//
// const NAVIGATION_CONTEXT_MODES = [
//   {
//     name: "current_selection",
//     requirements: [
//       "current_document",
//       "current_address",
//       "resolve_containing_procedure",
//     ],
//   },
//   {
//     name: "explicit_document",
//     requirements: ["current_address", "resolve_containing_procedure"],
//   },
// ] as const;
//
// /** Build stable per-operation availability for discovery and tool visibility. */
// export const buildCapabilityInventory = (
//   sessionStatus: JsonValue,
//   policy: AvailabilityPolicy,
//   clientFeatures: ClientFeatureAvailability = NO_CLIENT_FEATURES,
// ): readonly ToolAvailability[] => {
//   const status = statusSchema.parse(sessionStatus);
//   const descriptors = new Map<string, ProviderDescriptor>(
//     status.capabilities.map((descriptor) => [descriptor.operation, descriptor]),
//   );
//   return TOOL_CONTRACTS.map((contract): ToolAvailability => {
//     const availability = availabilityFor({
//       name: contract.name,
//       kind: contract.kind,
//       targetOpen: status.open,
//       targetKind: status.kind,
//       targetFormat: status.format,
//       descriptors,
//       policy,
//     });
//     const clientRequirements = clientRequirementsFor(
//       contract.name,
//       clientFeatures,
//     );
//     const clientBlocked = clientRequirements.missing_required.length > 0;
//     const facts = {
//       name: contract.name,
//       surface: contract.kind,
//       ...(availability.defaultModeAvailable === undefined
//         ? {}
//         : { default_mode_available: availability.defaultModeAvailable }),
//       ...(availability.modes === undefined
//         ? {}
//         : { modes: [...availability.modes] }),
//       client_requirements: clientRequirements,
//       effects: { ...contract.effects },
//       annotations: {
//         read_only: contract.annotations.readOnlyHint ?? false,
//         destructive: contract.annotations.destructiveHint ?? false,
export const _l = 209;
