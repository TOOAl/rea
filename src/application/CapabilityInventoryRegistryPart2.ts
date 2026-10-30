import type { ToolKind } from "../contracts/toolContractTypes.js";

// CapabilityInventoryRegistry.ts 345-750

const ownerProbeAvailability = (
  observation: ProviderAvailability | undefined,
  missingRemediation: string,
): Availability => {
  if (observation === undefined)
    return { reason: "provider_missing", remediation: missingRemediation };
  if (observation.status === "available")
    return { reason: "available", remediation: null };
  return {
    reason:
      observation.code === "unsupported_host"
        ? "unsupported_host"
        : observation.code === "not_configured"
          ? "provider_missing"
          : "provider_unavailable",
    remediation: observation.reason,
  };
};

const electronProviderAvailability = (
  name: string,
  kind: ToolKind,
  policy: AvailabilityPolicy,
): Availability | null => {
  if (kind !== "electron-provider") return null;
  if (name === "capture_electron_scenario")
    return policy.electronAutomationEnabled === true
      ? { reason: "available", remediation: null }
      : {
          reason: "provider_missing",
          remediation:
            "Start REA with the Electron scenario provider available.",
        };
  return policy.electronObservationEnabled === true
    ? { reason: "available", remediation: null }
    : {
        reason: "provider_missing",
        remediation:
          "Start REA with its Electron observation provider available.",
      };
};

const browserProviderAvailability = (
  name: string,
  kind: ToolKind,
  policy: AvailabilityPolicy,
): Availability | null => {
  if (name === "capture_browser_scenario")
    return policy.browserScenarioEnabled === true
      ? { reason: "available", remediation: null }
      : {
          reason: "provider_missing",
          remediation:
            "Start REA with its browser scenario provider available.",
        };
  if (kind !== "browser-provider") return null;
  return policy.browserObservationEnabled === true
    ? { reason: "available", remediation: null }
    : {
        reason: "provider_missing",
        remediation:
          "Start REA with its browser observation provider available.",
      };
};

/**
 * Opening another target cannot make an operation run on an unsupported host.
 * Composed operations are decided by their requirements, which another
 * provider may satisfy.
 */
const hostAvailability = ({
  descriptors,
  kind,
  name,
}: AvailabilityContext): Availability | null => {
  if (kind === "enhanced") return null;
  const descriptor = descriptors.get(name);
  return descriptor?.available === false &&
    descriptor.availability_code === "unsupported_host"
    ? { reason: "unsupported_host", remediation: descriptor.reason }
    : null;
};

const targetAvailability = ({
  name,
  kind,
  targetKind,
  targetFormat,
  targetOpen,
}: AvailabilityContext): Availability | null => {
  if (FRIDA_OPERATION_NAMES.has(name)) return null;
  if (!targetOpen && ACTIVE_TARGET_KINDS.has(kind))
    return {
      reason: "target_required",
      remediation: "Call open_binary with a supported local target.",
    };
  if (
    targetKind !== undefined &&
    targetKind !== "executable" &&
    targetKind !== "database" &&
    (kind === "official-proxy" || kind === "enhanced")
  )
    return {
      reason: "target_unsupported",
      remediation:
        "Inventory or extract a native executable, then call open_binary on that executable.",
    };
  if (
    targetOpen &&
    MACHO_TARGET_OPERATIONS.has(name) &&
    (targetKind !== "executable" || !isMachOFormat(targetFormat))
  )
    return {
      reason: "target_unsupported",
      remediation:
        "Call open_binary with a Mach-O executable or an app bundle whose main executable is Mach-O.",
    };
  return null;
};

const providerAvailability = ({
  descriptors,
  kind,
  name,
}: AvailabilityContext): Availability => {
  if (kind === "enhanced") return composedAvailability(name, descriptors);
  const descriptor = descriptors.get(name);
  if (
    descriptor === undefined &&
    (kind === "artifact-provider" ||
      kind === "managed-provider" ||
      kind === "native-provider")
  )
    return { reason: "available", remediation: null };
  if (descriptor === undefined)
    return {
      reason: "provider_missing",
      remediation:
        "Install or configure a provider that declares this operation.",
    };
  return descriptor.available
    ? { reason: "available", remediation: null }
    : {
        reason: "provider_unavailable",
        remediation:
          descriptor.reason ?? "Choose another target or configured provider.",
      };
};

const composedAvailability = (
  name: string,
  descriptors: ReadonlyMap<string, ProviderDescriptor>,
): Availability => {
  const requirements = ENHANCED_REQUIREMENTS[name];
  if (requirements === undefined)
    return {
      reason: "provider_missing",
      remediation: "No provider composition is declared for this operation.",
    };
  return composedAvailabilityFor(requirements, descriptors);
};

const composedAvailabilityFor = (
  requirements: readonly (string | readonly string[])[],
  descriptors: ReadonlyMap<string, ProviderDescriptor>,
): Availability => {
  for (const requirement of requirements) {
    if (typeof requirement === "string") {
      if (!descriptors.has(requirement))
        return {
          reason: "provider_missing",
          remediation: `Configure a provider for required operation ${requirement}.`,
        };
    } else {
      const declared = requirement.some((operation) =>
        descriptors.has(operation),
      );
      if (!declared)
        return {
          reason: "provider_missing",
          remediation: `Configure a provider for one of: ${requirement.join(", ")}.`,
        };
    }
  }

  for (const requirement of requirements) {
    if (typeof requirement === "string") {
      const descriptor = descriptors.get(requirement);
      if (descriptor?.available === false)
        return {
          reason:
            descriptor.availability_code === "unsupported_host"
              ? "unsupported_host"
              : "provider_unavailable",
          remediation:
            descriptor.reason ??
            "Choose another target or configured provider.",
        };
    } else {
      const anyAvailable = requirement.some(
        (operation) => descriptors.get(operation)?.available === true,
      );
      if (!anyAvailable) {
        const unavailable = requirement
          .map((operation) => descriptors.get(operation))
          .find((descriptor) => descriptor?.available === false);
        if (unavailable !== undefined)
          return {
            reason:
              unavailable.availability_code === "unsupported_host"
                ? "unsupported_host"
                : "provider_unavailable",
            remediation:
              unavailable.reason ??
              "Choose another target or configured provider.",
          };
      }
    }
  }
  return { reason: "available", remediation: null };
};
