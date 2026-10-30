export const __stub = 1;
//       },
//       {
//         ...compact,
//         groups: compact.groups.map((group, index) =>
//           index === availableIndex
//             ? { ...group, remediation: "unexpected remediation" }
//             : group,
//         ),
//       },
//     ];
//     for (const malformed of malformedInventories)
//       expect(toolAvailabilityInventory.safeParse(malformed).success).toBe(
//         false,
//       );
//
//     const inheritedGroup = compact.groups.find(
//       (group) => group.client_requirements === undefined,
//     );
//     expect(inheritedGroup).toBeDefined();
//     if (inheritedGroup === undefined)
//       throw new Error("Expected an inherited client-requirements group");
//     const explicitBaseline = {
//       ...compact,
//       groups: compact.groups.map((group) =>
//         group === inheritedGroup
//           ? { ...group, client_requirements: compact.client_requirements }
//           : group,
//       ),
//     };
//     const parsedOverride =
//       toolAvailabilityInventory.safeParse(explicitBaseline);
//     expect(parsedOverride.success).toBe(true);
//     if (parsedOverride.success)
//       expect(expandToolAvailability(parsedOverride.data)).toEqual(
//         expandToolAvailability(compact),
//       );
//   });
// });
//
// describe("partial navigation availability", () => {
//   it("allows explicit documents when the provider has no current-document getter", () => {
//     const capabilities = [
//       "current_document",
//       "current_address",
//       "resolve_containing_procedure",
//     ].map((operation) => ({
//       operation,
//       available: true,
//       reason: null,
//     }));
//     expect(
//       entry(
//         "get_navigation_context",
//         status({ open: true, kind: "executable", capabilities }),
//       ),
//     ).toMatchObject({
//       available: true,
//       reason: "available",
//       default_mode_available: true,
//       modes: [
//         { name: "current_selection", available: true },
//         { name: "explicit_document", available: true },
//       ],
//     });
//     expect(
//       entry(
//         "get_navigation_context",
//         status({
//           open: true,
//           kind: "executable",
//           capabilities: capabilities.slice(1),
//         }),
//       ),
//     ).toMatchObject({
//       available: true,
//       reason: "available",
//       default_mode_available: false,
//       modes: [
//         { name: "current_selection", available: false },
//         { name: "explicit_document", available: true },
//       ],
//     });
//     expect(
//       entry(
//         "get_navigation_context",
//         status({
//           open: true,
//           kind: "executable",
//           capabilities: capabilities.slice(1, 2),
//         }),
//       ),
//     ).toMatchObject({
//       available: false,
//       reason: "provider_missing",
//       remediation: expect.stringContaining("resolve_containing_procedure"),
//     });
//   });
//
//   it("preserves the most specific navigation mode failure", () => {
//     expect(
//       entry(
//         "get_navigation_context",
//         status({
//           open: true,
//           kind: "executable",
//           capabilities: [
//             {
//               operation: "current_address",
//               available: false,
//               availability_code: "unsupported_host",
//               reason: "Navigation requires macOS.",
//             },
//             {
//               operation: "resolve_containing_procedure",
//               available: true,
//               reason: null,
//             },
//           ],
//         }),
//       ),
//     ).toMatchObject({
//       available: false,
//       reason: "unsupported_host",
//       remediation: "Navigation requires macOS.",
//     });
//   });
//
//   it("lists shared missing operations once in combined remediation", () => {
//     const availability = entry(
//       "get_navigation_context",
//       status({ open: true, kind: "executable" }),
//     );
//
//     expect(availability).toMatchObject({
//       reason: "provider_missing",
//       remediation:
//         "Configure a provider for one of: current_document, current_address, resolve_containing_procedure.",
//       modes: [
//         {
//           name: "current_selection",
//           missing_operations: [
//             "current_document",
//             "current_address",
//             "resolve_containing_procedure",
//           ],
//         },
//         {
//           name: "explicit_document",
//           missing_operations: [
//             "current_address",
//             "resolve_containing_procedure",
//           ],
//         },
//       ],
//     });
//   });
// });
//
// it("reports host denial before target mismatch but keeps composed workflow prerequisites", () => {
//   const capability = {
//     operation: "inspect_macho",
//     available: false,
//     availability_code: "unsupported_host" as const,
//     reason: "Native macOS utilities require macOS.",
//   };
//   for (const target of [
//     {},
//     { open: true, kind: "archive" as const, format: "zip" },
//   ]) {
//     expect(
//       entry("inspect_macho", status({ ...target, capabilities: [capability] })),
//     ).toMatchObject({
//       reason: "unsupported_host",
//       remediation: capability.reason,
//     });
//   }
//   expect(
//     entry(
//       "inspect_native_dispatch_metadata",
//       status({
//         capabilities: [
//           { ...capability, operation: "inspect_native_dispatch_metadata" },
//         ],
//       }),
//     ).reason,
//   ).toBe("target_required");
// });
export const _l = 187;
