export const __stub = 1;
//     targetKind !== "database" &&
//     (kind === "official-proxy" || kind === "enhanced")
//   )
//     return {
//       reason: "target_unsupported",
//       remediation:
//         "Inventory or extract a native executable, then call open_binary on that executable.",
//     };
//   if (
//     targetOpen &&
//     MACHO_TARGET_OPERATIONS.has(name) &&
//     (targetKind !== "executable" || !isMachOFormat(targetFormat))
//   )
//     return {
//       reason: "target_unsupported",
//       remediation:
//         "Call open_binary with a Mach-O executable or an app bundle whose main executable is Mach-O.",
//     };
//   return null;
// };
//
// const providerAvailability = ({
//   descriptors,
//   kind,
//   name,
// }: AvailabilityContext): Availability => {
//   if (kind === "enhanced") return composedAvailability(name, descriptors);
//   const descriptor = descriptors.get(name);
//   if (
//     descriptor === undefined &&
//     (kind === "artifact-provider" ||
//       kind === "managed-provider" ||
//       kind === "native-provider")
//   )
//     return { reason: "available", remediation: null };
//   if (descriptor === undefined)
//     return {
//       reason: "provider_missing",
//       remediation:
//         "Install or configure a provider that declares this operation.",
//     };
//   return descriptor.available
//     ? { reason: "available", remediation: null }
//     : {
//         reason: "provider_unavailable",
//         remediation:
//           descriptor.reason ?? "Choose another target or configured provider.",
//       };
// };
//
// const composedAvailability = (
//   name: string,
//   descriptors: ReadonlyMap<string, ProviderDescriptor>,
// ): Availability => {
//   const requirements = ENHANCED_REQUIREMENTS[name];
//   if (requirements === undefined)
//     return {
//       reason: "provider_missing",
//       remediation: "No provider composition is declared for this operation.",
//     };
//   return composedAvailabilityFor(requirements, descriptors);
// };
//
// const composedAvailabilityFor = (
//   requirements: readonly (string | readonly string[])[],
//   descriptors: ReadonlyMap<string, ProviderDescriptor>,
// ): Availability => {
//   for (const requirement of requirements) {
//     if (typeof requirement === "string") {
//       if (!descriptors.has(requirement))
//         return {
//           reason: "provider_missing",
//           remediation: `Configure a provider for required operation ${requirement}.`,
//         };
//     } else {
//       const declared = requirement.some((operation) =>
//         descriptors.has(operation),
//       );
//       if (!declared)
//         return {
//           reason: "provider_missing",
//           remediation: `Configure a provider for one of: ${requirement.join(", ")}.`,
//         };
//     }
//   }
//
//   for (const requirement of requirements) {
//     if (typeof requirement === "string") {
//       const descriptor = descriptors.get(requirement);
//       if (descriptor?.available === false)
//         return {
//           reason:
//             descriptor.availability_code === "unsupported_host"
//               ? "unsupported_host"
//               : "provider_unavailable",
//           remediation:
//             descriptor.reason ??
//             "Choose another target or configured provider.",
//         };
//     } else {
//       const anyAvailable = requirement.some(
//         (operation) => descriptors.get(operation)?.available === true,
//       );
//       if (!anyAvailable) {
//         const unavailable = requirement
//           .map((operation) => descriptors.get(operation))
//           .find((descriptor) => descriptor?.available === false);
//         if (unavailable !== undefined)
//           return {
//             reason:
//               unavailable.availability_code === "unsupported_host"
//                 ? "unsupported_host"
//                 : "provider_unavailable",
//             remediation:
//               unavailable.reason ??
//               "Choose another target or configured provider.",
//           };
//       }
//     }
//   }
//   return { reason: "available", remediation: null };
// };
//
// const navigationContextAvailability = (
//   descriptors: ReadonlyMap<string, ProviderDescriptor>,
// ): Availability => {
//   const modeResults: NavigationModeResult[] = NAVIGATION_CONTEXT_MODES.map(
//     (mode) => {
//       const availability = composedAvailabilityFor(
//         mode.requirements,
//         descriptors,
//       );
//       if (availability.reason === "available")
//         return {
//           name: mode.name,
//           available: true,
//           reason: availability.reason,
//           missing_operations: [],
//           remediation: null,
//         };
//       return {
//         name: mode.name,
//         available: false,
//         reason: availability.reason,
//         missing_operations: mode.requirements.filter((operation) => {
//           const descriptor = descriptors.get(operation);
//           return descriptor === undefined || descriptor.available === false;
//         }),
//         remediation: availability.remediation,
//       };
//     },
//   );
//   const modes: ToolAvailabilityMode[] = modeResults.map((mode) =>
//     mode.available
//       ? {
//           name: mode.name,
//           available: true,
//           missing_operations: [],
//           remediation: null,
//         }
//       : {
//           name: mode.name,
//           available: false,
//           missing_operations: [...mode.missing_operations],
//           remediation: mode.remediation,
//         },
//   );
//   const availableMode = modeResults.find((mode) => mode.available);
//   const failures = modeResults.flatMap((mode) =>
//     mode.available ? [] : [mode],
//   );
//   const failure = failures.sort(
//     (left, right) =>
//       navigationFailurePriority(left.reason) -
//       navigationFailurePriority(right.reason),
//   )[0];
//   const specificFailureRemediation =
//     failure?.reason === "provider_missing" ? undefined : failure?.remediation;
//   const facts = {
//     defaultModeAvailable: modes[0]?.available ?? false,
//     modes,
//   };
//   if (availableMode !== undefined)
//     return { ...facts, reason: "available", remediation: null };
//   const missingOperations = [
//     ...new Set(modes.flatMap((mode) => mode.missing_operations)),
//   ];
//   return {
//     ...facts,
//     reason: failure?.reason ?? "provider_missing",
//     remediation:
//       specificFailureRemediation ??
//       `Configure a provider for one of: ${missingOperations.join(", ")}.`,
//   };
// };
//
// const navigationFailurePriority = (reason: ToolAvailabilityReason): number => {
//   switch (reason) {
//     case "unsupported_host":
//       return 0;
//     case "provider_unavailable":
//       return 1;
//     case "provider_missing":
//       return 2;
//     default:
//       return 3;
//   }
// };
export const _l = 208;
