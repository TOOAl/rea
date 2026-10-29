export const __stub = 1;
//       reason: "target_required",
//       remediation: "open_binary",
//     },
//     {
//       label: "rejects an incompatible target family",
//       name: "current_address",
//       sessionStatus: status({ open: true, kind: "archive" }),
//       reason: "target_unsupported",
//       remediation: "native executable",
//     },
//     {
//       label: "reports a missing provider operation",
//       name: "current_address",
//       sessionStatus: status({ open: true, kind: "executable" }),
//       reason: "provider_missing",
//       remediation: "provider",
//     },
//     {
//       label: "distinguishes an unsupported host",
//       name: "current_address",
//       sessionStatus: status({
//         open: true,
//         kind: "executable",
//         capabilities: [
//           {
//             operation: "current_address",
//             available: false,
//             availability_code: "unsupported_host",
//             reason: "Operation requires macOS",
//           },
//         ],
//       }),
//       reason: "unsupported_host",
//       remediation: "macOS",
//     },
//     {
//       label: "retains a provider failure",
//       name: "current_address",
//       sessionStatus: status({
//         open: true,
//         kind: "executable",
//         capabilities: [
//           {
//             operation: "current_address",
//             available: false,
//             reason: "Provider session is unhealthy",
//           },
//         ],
//       }),
//       reason: "provider_unavailable",
//       remediation: "unhealthy",
//     },
//     {
//       label: "reports an available provider operation",
//       name: "current_address",
//       sessionStatus: status({
//         open: true,
//         kind: "executable",
//         capabilities: [
//           {
//             operation: "current_address",
//             available: true,
//             reason: null,
//           },
//         ],
//       }),
//       reason: "available",
//       remediation: null,
//     },
//   ])("$label", ({ name, sessionStatus, reason, remediation }) => {
//     const availability = entry(name, sessionStatus);
//     expect(availability).toMatchObject({
//       reason,
//       available: reason === "available",
//     });
//     if (remediation === null) expect(availability.remediation).toBeNull();
//     else expect(availability.remediation).toContain(remediation);
//   });
// });
//
// describe("compact tool availability", () => {
//   it("round-trips complete facts, omitted modes, and per-group client requirements", () => {
//     const full = buildCapabilityInventory(status(), enabledPolicy);
//     const alternateRequirements = {
//       required: ["roots"],
//       optional: [],
//       missing_required: ["roots"],
//       missing_optional: [],
//     } satisfies ToolAvailability["client_requirements"];
//     const withOverride = full.map((entry, index) =>
//       index === 1
//         ? {
//             ...entry,
//             available: false as const,
//             reason: "client_capability_missing" as const,
//             remediation: "Use an MCP client with roots support.",
//             client_requirements: alternateRequirements,
//           }
//         : entry,
//     );
//     const compact = compactToolAvailability(withOverride);
//     const expanded = expandToolAvailability(compact).toSorted((left, right) =>
//       left.name.localeCompare(right.name),
//     );
//
//     expect(expanded).toEqual(
//       withOverride.toSorted((left, right) =>
//         left.name.localeCompare(right.name),
//       ),
//     );
//     expect(compact.client_requirements).toEqual(
//       withOverride[0]?.client_requirements,
//     );
//     expect(
//       compact.groups.find((group) => group.client_requirements !== undefined)
//         ?.client_requirements,
//     ).toEqual(alternateRequirements);
//     expect(compact.groups.every((group) => group.names.length > 0)).toBe(true);
//     const names = compact.groups.flatMap((group) => group.names).sort();
//     expect(names).toEqual(TOOL_CONTRACTS.map(({ name }) => name).sort());
//     expect(new Set(names).size).toBe(names.length);
//     expect(expanded.some((entry) => !Object.hasOwn(entry, "modes"))).toBe(true);
//   });
//
//   it("preserves an empty inventory with an explicit empty client baseline", () => {
//     const compact = compactToolAvailability([]);
//     expect(compact).toEqual({
//       client_requirements: {
//         required: [],
//         optional: [],
//         missing_required: [],
//         missing_optional: [],
//       },
//       groups: [],
//     });
//     expect(expandToolAvailability(compact)).toEqual([]);
//   });
//
//   it("rejects malformed compact facts and accepts an equivalent explicit baseline", () => {
//     const compact = compactToolAvailability(
//       buildCapabilityInventory(status(), enabledPolicy),
//     );
//     const firstGroup = compact.groups[0];
//     expect(firstGroup).toBeDefined();
//     if (firstGroup === undefined) throw new Error("Expected tool groups");
//     const availableIndex = compact.groups.findIndex((group) => group.available);
//     if (availableIndex < 0) throw new Error("Expected an available tool group");
//
//     const malformedInventories = [
//       {
//         ...compact,
//         groups: compact.groups.map((group, index) =>
//           index === 0
//             ? { ...group, effects: [...group.effects, "unknown_effect"] }
//             : group,
//         ),
//       },
//       {
//         ...compact,
//         groups: compact.groups.map((group, index) =>
//           index === 0
//             ? {
//                 ...group,
//                 annotations: [...group.annotations, "unknown_hint"],
//               }
//             : group,
//         ),
//       },
//       {
//         ...compact,
//         groups: compact.groups.map((group, index) =>
//           index === 0 ? { ...group, names: [] } : group,
//         ),
//       },
//       {
//         ...compact,
//         groups: compact.groups.map((group, index) =>
//           index === 0 ? { ...group, names: [""] } : group,
//         ),
//       },
//       {
//         ...compact,
//         groups: compact.groups.map((group, index) =>
//           index === availableIndex
//             ? { ...group, reason: "provider_missing" }
//             : group,
//         ),
export const _l = 187;
