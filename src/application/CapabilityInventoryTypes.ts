import {
  providerCapabilitySet,
  TOOL_ANNOTATION_NAMES,
  type ClientFeatureAvailability,
  type ToolAvailabilityInventory,
  type ToolAvailabilityMode,
} from "../contracts/toolOutputSchemaPrimitives.js";

// CapabilityInventoryTypes.ts 751-835

const navigationContextAvailability = (
  descriptors: ReadonlyMap<string, ProviderDescriptor>,
): Availability => {
  const modeResults: NavigationModeResult[] = NAVIGATION_CONTEXT_MODES.map(
    (mode) => {
      const availability = composedAvailabilityFor(
        mode.requirements,
        descriptors,
      );
      if (availability.reason === "available")
        return {
          name: mode.name,
          available: true,
          reason: availability.reason,
          missing_operations: [],
          remediation: null,
        };
      return {
        name: mode.name,
        available: false,
        reason: availability.reason,
        missing_operations: mode.requirements.filter((operation) => {
          const descriptor = descriptors.get(operation);
          return descriptor === undefined || descriptor.available === false;
        }),
        remediation: availability.remediation,
      };
    },
  );
  const modes: ToolAvailabilityMode[] = modeResults.map((mode) =>
    mode.available
      ? {
          name: mode.name,
          available: true,
          missing_operations: [],
          remediation: null,
        }
      : {
          name: mode.name,
          available: false,
          missing_operations: [...mode.missing_operations],
          remediation: mode.remediation,
        },
  );
  const availableMode = modeResults.find((mode) => mode.available);
  const failures = modeResults.flatMap((mode) =>
    mode.available ? [] : [mode],
  );
  const failure = failures.sort(
    (left, right) =>
      navigationFailurePriority(left.reason) -
      navigationFailurePriority(right.reason),
  )[0];
  const specificFailureRemediation =
    failure?.reason === "provider_missing" ? undefined : failure?.remediation;
  const facts = {
    defaultModeAvailable: modes[0]?.available ?? false,
    modes,
  };
  if (availableMode !== undefined)
    return { ...facts, reason: "available", remediation: null };
  const missingOperations = [
    ...new Set(modes.flatMap((mode) => mode.missing_operations)),
  ];
  return {
    ...facts,
    reason: failure?.reason ?? "provider_missing",
    remediation:
      specificFailureRemediation ??
      `Configure a provider for one of: ${missingOperations.join(", ")}.`,
  };
};

const navigationFailurePriority = (reason: ToolAvailabilityReason): number => {
  switch (reason) {
    case "unsupported_host":
      return 0;
    case "provider_unavailable":
      return 1;
    case "provider_missing":
      return 2;
    default:
      return 3;
  }
};
