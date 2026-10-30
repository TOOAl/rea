import { z } from "zod";
import type {
  OptionalProviderLoadFailures,
  OptionalProviderLoadFailure,
} from "./OptionalObservationProviders.js";

import {
  expandProviderCapabilities,
  providerCapabilitySet,
  toolAvailabilityInventory,
  TOOL_ANNOTATION_NAMES,
  TOOL_EFFECT_NAMES,
  type ClientFeatureAvailability,
  type ProviderCapability,
  type ToolAvailabilityInventory,
  type ToolAvailability,
  type ToolAvailabilityMode,
  type ToolUnavailabilityReason,
} from "../contracts/toolOutputSchemaPrimitives.js";
import type { ToolKind } from "../contracts/toolContractTypes.js";
import type { JsonValue } from "../domain/jsonValue.js";
import type { ProviderAvailability } from "./AnalysisProvider.js";
import type { JebAnalysisAvailability } from "./jeb/JebAnalysisPort.js";
import { TOOL_CONTRACTS } from "../contracts/toolContracts.js";
import { FRIDA_TOOL_CONTRACTS } from "../contracts/fridaToolContracts.js";
import {
  clientRequirementsFor,
  NO_CLIENT_FEATURES,
} from "./CapabilityClientRequirements.js";
import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";

const statusSchema = z.object({
  open: z.boolean(),
  kind: z.enum(["executable", "database", "archive", "artifact"]).optional(),
  format: z.string().optional(),
  capabilities: z
    .array(providerCapabilitySet)
    .transform(expandProviderCapabilities),
});

type ToolAvailabilityReason = "available" | ToolUnavailabilityReason;

type ProviderDescriptor = ProviderCapability;
export type AvailabilityPolicy = {
  readonly packetCaptureEnabled?: boolean;
  readonly signalRecordingEnabled?: boolean;
  readonly wasmArtifactEnabled?: boolean;
  readonly evmInterfaceEnabled?: boolean;
  readonly processCaptureEnabled: boolean;
  readonly optionalProviderLoadFailures?: OptionalProviderLoadFailures;
  readonly binaryLayoutEnabled?: boolean;
  readonly recordedCrashEnabled?: boolean;
  readonly firmwareInspectionEnabled?: boolean;
  readonly firmwareExtractionEnabled?: boolean;
  readonly androidAnalysisAvailability?: ProviderAvailability;
  readonly adbAnalysisAvailability?: ProviderAvailability;
  readonly apktoolAnalysisAvailability?: ProviderAvailability;
  readonly jebAnalysisAvailability?: JebAnalysisAvailability;
  readonly javascriptRecoveryEnabled?: boolean;
  readonly webModuleResolutionEnabled?: boolean;
  readonly browserObservationEnabled?: boolean;
  readonly browserScenarioEnabled?: boolean;
  readonly electronObservationEnabled?: boolean;
  readonly electronAutomationEnabled?: boolean;
  readonly v8InspectorObservationEnabled?: boolean;
};

type AvailabilityFacts = {
  readonly defaultModeAvailable?: boolean;
  readonly modes?: readonly ToolAvailabilityMode[];
};
type Availability = AvailabilityFacts &
  (
    | { readonly reason: "available"; readonly remediation: null }
    | {
        readonly reason: ToolUnavailabilityReason;
        readonly remediation: string | null;
      }
  );
type NavigationModeResult =
  | (Extract<ToolAvailabilityMode, { available: true }> & {
      readonly reason: "available";
    })
  | (Extract<ToolAvailabilityMode, { available: false }> & {
      readonly reason: ToolUnavailabilityReason;
    });
type AvailabilityContext = {
  readonly name: string;
  readonly kind: ToolKind;
  readonly targetOpen: boolean;
  readonly targetKind:
    | "executable"
    | "database"
    | "archive"
    | "artifact"
    | undefined;
  readonly targetFormat: string | undefined;
  readonly descriptors: ReadonlyMap<string, ProviderDescriptor>;
  readonly policy: AvailabilityPolicy;
};

const ENHANCED_REQUIREMENTS: Readonly<
  Record<string, readonly (string | readonly string[])[]>
> = {
  trace_native_values: ["analyze_function", "resolve_native_call_targets"],
  trace_native_ui_action: [
    "decode_interface_builder",
    "list_names",
    "procedure_callees",
  ],
  inspect_native_dispatch_metadata: ["list_names"],
  get_objc_classes: ["list_names"],
  get_objc_protocols: ["list_names"],
  batch_decompile: ["procedure_pseudo_code"],
  get_call_graph: ["procedure_callees", "procedure_callers"],
  analyze_swift_types: ["list_procedures"],
  find_xrefs_to_name: ["list_names", "xrefs"],
  binary_overview: [
    ["current_document", "list_documents"],
    "list_procedures",
    "list_strings",
  ],
  analyze_function: ["analyze_function"],
  inspect_native_api: ["analyze_function"],
  trace_feature: [
    "search_strings",
    "search_procedures",
    "xrefs",
    "resolve_containing_procedure",
  ],
};

/** Contract kinds whose operations run on the active session target. */
const ACTIVE_TARGET_KINDS: ReadonlySet<ToolKind> = new Set([
  "official-proxy",
  "enhanced",
  "native-provider",
  "artifact-provider",
]);
const FRIDA_OPERATION_NAMES: ReadonlySet<string> = new Set(
  FRIDA_TOOL_CONTRACTS.map(({ name }) => name),
);

/** Native contracts defined only for an active Mach-O executable. */
const MACHO_TARGET_OPERATIONS: ReadonlySet<string> = new Set([
  "inspect_signature",
  "inspect_macho",
  "list_architectures",
  "observe_native_calls",
  "observe_native_ui",
  "capture_native_ui_scenario",
]);

const NAVIGATION_CONTEXT_MODES = [
  {
    name: "current_selection",
    requirements: [
      "current_document",
      "current_address",
      "resolve_containing_procedure",
    ],
  },
  {
    name: "explicit_document",
    requirements: ["current_address", "resolve_containing_procedure"],
  },
] as const;

/** Build stable per-operation availability for discovery and tool visibility. */
export const buildCapabilityInventory = (
  sessionStatus: JsonValue,
  policy: AvailabilityPolicy,
  clientFeatures: ClientFeatureAvailability = NO_CLIENT_FEATURES,
): readonly ToolAvailability[] => {
  const status = statusSchema.parse(sessionStatus);
  const descriptors = new Map<string, ProviderDescriptor>(
    status.capabilities.map((descriptor) => [descriptor.operation, descriptor]),
  );
  return TOOL_CONTRACTS.map((contract): ToolAvailability => {
    const availability = availabilityFor({
      name: contract.name,
      kind: contract.kind,
      targetOpen: status.open,
      targetKind: status.kind,
      targetFormat: status.format,
      descriptors,
      policy,
    });
    const clientRequirements = clientRequirementsFor(
      contract.name,
      clientFeatures,
    );
    const clientBlocked = clientRequirements.missing_required.length > 0;
    const facts = {
      name: contract.name,
      surface: contract.kind,
      ...(availability.defaultModeAvailable === undefined
        ? {}
        : { default_mode_available: availability.defaultModeAvailable }),
      ...(availability.modes === undefined
        ? {}
        : { modes: [...availability.modes] }),
      client_requirements: clientRequirements,
      effects: { ...contract.effects },
      annotations: {
        read_only: contract.annotations.readOnlyHint ?? false,
        destructive: contract.annotations.destructiveHint ?? false,
        idempotent: contract.annotations.idempotentHint ?? false,
        open_world: contract.annotations.openWorldHint ?? true,
      },
    };
    if (clientBlocked)
      return {
        ...facts,
        available: false,
        reason: "client_capability_missing",
        remediation: `Use an MCP client that supports: ${clientRequirements.missing_required.join(", ")}.`,
      };
    return availability.reason === "available"
      ? {
          ...facts,
          available: true,
          reason: availability.reason,
          remediation: null,
        }
      : {
          ...facts,
          available: false,
          reason: availability.reason,
          remediation: availability.remediation,
        };
  }).sort((left, right) => compareUnicodeCodePoints(left.name, right.name));
};

type ClientRequirements = ToolAvailability["client_requirements"];
type MutableAvailabilityGroup = Omit<
  ToolAvailabilityInventory["groups"][number],
  "names"
> & { names: string[] };

const EMPTY_CLIENT_REQUIREMENTS: ClientRequirements = {
  required: [],
  optional: [],
  missing_required: [],
  missing_optional: [],
};

/** Compact repeated metadata while retaining every operation's current availability inline. */
export const compactToolAvailability = (
  availability: readonly ToolAvailability[],
): ToolAvailabilityInventory => {
  const clientRequirements =
    availability[0]?.client_requirements ?? EMPTY_CLIENT_REQUIREMENTS;
  const groups = new Map<string, MutableAvailabilityGroup>();

  for (const entry of availability) {
    const effects = TOOL_EFFECT_NAMES.filter((name) => entry.effects[name]);
    const annotations = TOOL_ANNOTATION_NAMES.filter(
      (name) => entry.annotations[name],
    );
    const groupFacts = {
      surface: entry.surface,
      effects,
      annotations,
      available: entry.available,
      reason: entry.reason,
      remediation: entry.remediation,
      ...(entry.default_mode_available === undefined
        ? {}
        : { default_mode_available: entry.default_mode_available }),
      ...(entry.modes === undefined ? {} : { modes: [...entry.modes] }),
      ...(JSON.stringify(entry.client_requirements) ===
      JSON.stringify(clientRequirements)
        ? {}
        : { client_requirements: entry.client_requirements }),
    };
    const key = JSON.stringify(groupFacts);
    const existing = groups.get(key);
    if (existing) existing.names.push(entry.name);
    else groups.set(key, { ...groupFacts, names: [entry.name] });
  }

  return toolAvailabilityInventory.parse({
    client_requirements: clientRequirements,
    groups: [...groups.values()],
  });
};

const availabilityFor = (context: AvailabilityContext): Availability => {
  // These built-in workflows accept a caller-selected endpoint; they do not load the optional passive provider.
  if (
    context.name === "observe_web_execution" ||
    context.name === "inspect_web_event_listeners"
  )
    return { reason: "available", remediation: null };
  if (context.name === "get_navigation_context")
    return navigationContextAvailability(context.descriptors);
  const javascriptApplication = javascriptApplicationAvailability(context);
  if (javascriptApplication !== null) return javascriptApplication;
  const failure = optionalProviderFailureFor(context);
  if (failure !== undefined)
    return {
      reason: "provider_unavailable",
      remediation: `Adapter ${failure.providerId} could not load: ${failure.reason}. Repair the adapter installation and restart REA; other capabilities remain available.`,
    };
  const workflowAvailability = workflowAvailabilityFor(context);
  if (workflowAvailability !== null) return workflowAvailability;
  const hostDecision = hostAvailability(context);
  if (hostDecision !== null) return hostDecision;
  const targetDecision = targetAvailability(context);
  if (targetDecision !== null) return targetDecision;
  return providerAvailability(context);
};

const optionalProviderFailureFor = ({
  name,
  kind,
  policy,
}: AvailabilityContext): OptionalProviderLoadFailure | undefined => {
  const failures = policy.optionalProviderLoadFailures;
  if (name === "capture_browser_scenario")
    return failures?.browserScenarioCapture;
  if (kind === "browser-provider") return failures?.browserObservation;
  if (name === "capture_electron_scenario")
    return failures?.electronActiveObservation;
  if (kind === "electron-provider") return failures?.electronObservation;
  if (kind === "runtime-provider")
    return failures?.javascriptRuntimeObservation;
  if (FRIDA_OPERATION_NAMES.has(name)) return failures?.fridaInstrumentation;
  return undefined;
};

const javascriptApplicationAvailability = ({
  name,
}: AvailabilityContext): Availability | null => {
  if (name === "analyze_javascript_application")
    return { reason: "available", remediation: null };
  return name === "reconcile_javascript_runtime"
    ? { reason: "available", remediation: null }
    : null;
};
