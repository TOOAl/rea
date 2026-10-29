export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import {
//   buildCapabilityInventory,
//   compactToolAvailability,
// } from "./CapabilityInventory.js";
// import { TOOL_CONTRACTS } from "../contracts/toolContracts.js";
// import {
//   expandToolAvailability,
//   toolAvailabilityInventory,
//   type ToolAvailability,
// } from "../contracts/toolOutputSchemaPrimitives.js";
//
// it("reports module syntax and native resolution availability separately", () => {
//   const input = { open: false, capabilities: [] };
//   const unavailable = buildCapabilityInventory(input, {
//     processCaptureEnabled: false,
//   }).find((tool) => tool.name === "trace_web_module_imports");
//   expect(unavailable).toMatchObject({
//     available: true,
//     default_mode_available: false,
//     modes: [
//       expect.objectContaining({
//         name: "sources-without-literal-imports",
//         available: true,
//       }),
//       expect.objectContaining({
//         name: "native-literal-resolution",
//         available: false,
//       }),
//     ],
//   });
//   const enabled = buildCapabilityInventory(input, {
//     processCaptureEnabled: false,
//     webModuleResolutionEnabled: true,
//   }).find((tool) => tool.name === "trace_web_module_imports");
//   expect(enabled).toMatchObject({
//     available: true,
//     default_mode_available: true,
//   });
// });
//
// const enabledPolicy: Parameters<typeof buildCapabilityInventory>[1] = {
//   processCaptureEnabled: true,
//   browserObservationEnabled: true,
//   browserScenarioEnabled: true,
//   electronObservationEnabled: true,
//   v8InspectorObservationEnabled: true,
// };
//
// const status = (
//   options: {
//     readonly open?: boolean;
//     readonly kind?: "executable" | "database" | "archive" | "artifact";
//     readonly format?: string;
//     readonly capabilities?: readonly {
//       readonly operation: string;
//       readonly available: boolean;
//       readonly reason: string | null;
//       readonly availability_code?: "unsupported_host";
//     }[];
//   } = {},
// ) => ({
//   open: options.open ?? false,
//   ...(options.kind === undefined ? {} : { kind: options.kind }),
//   ...(options.format === undefined ? {} : { format: options.format }),
//   capabilities:
//     options.capabilities === undefined || options.capabilities.length === 0
//       ? []
//       : [
//           {
//             provider: { id: "fixture", name: "Fixture", version: "1" },
//             shared_limitations: [],
//             groups: options.capabilities.map((capability) => ({
//               operations: [capability.operation],
//               effects: [],
//               limitations: [],
//               available: capability.available,
//               reason: capability.reason,
//               availability_code: capability.available
//                 ? null
//                 : (capability.availability_code ?? null),
//             })),
//           },
//         ],
// });
//
// const entry = (
//   name: string,
//   sessionStatus: ReturnType<typeof status>,
//   policy = enabledPolicy,
// ) => {
//   const found = buildCapabilityInventory(sessionStatus, policy).find(
//     (candidate) => candidate.name === name,
//   );
//   if (found === undefined) throw new Error(`missing capability ${name}`);
//   return found;
// };
//
// describe("ADB and Apktool host availability", () => {
//   it("uses only their selected owner probes", () => {
//     const ready = {
//       status: "available" as const,
//       code: null,
//       reason: null,
//       diagnostics: {},
//     };
//     const configuredButInvalid = {
//       status: "unavailable" as const,
//       code: "not_configured" as const,
//       reason: "REA_ADB_PATH is invalid",
//       diagnostics: {},
//     };
//     const readyInventory = buildCapabilityInventory(status(), {
//       ...enabledPolicy,
//       adbAnalysisAvailability: ready,
//       apktoolAnalysisAvailability: ready,
//     });
//     expect(
//       readyInventory.find(({ name }) => name === "inspect_adb_client"),
//     ).toMatchObject({ available: true, reason: "available" });
//     expect(
//       readyInventory.find(({ name }) => name === "inspect_apktool_client"),
//     ).toMatchObject({ available: true, reason: "available" });
//
//     const unavailableInventory = buildCapabilityInventory(status(), {
//       ...enabledPolicy,
//       adbAnalysisAvailability: configuredButInvalid,
//       apktoolAnalysisAvailability: {
//         status: "unavailable",
//         code: "unsupported_version",
//         reason: "Apktool 2.6.3 is older than 2.7.0",
//         diagnostics: {},
//       },
//     });
//     expect(
//       unavailableInventory.find(({ name }) => name === "inspect_adb_client"),
//     ).toMatchObject({ available: false, reason: "provider_missing" });
//     expect(
//       unavailableInventory.find(
//         ({ name }) => name === "decode_android_resources",
//       ),
//     ).toMatchObject({ available: false, reason: "provider_unavailable" });
//   });
// });
//
// describe("capability failure reasons", () => {
//   it("keeps an unavailable Android runtime distinct from a missing provider", () => {
//     const inventory = buildCapabilityInventory(status(), {
//       ...enabledPolicy,
//       androidAnalysisAvailability: {
//         status: "unavailable",
//         code: "runtime_unavailable",
//         reason: "The JADX native self-test failed.",
//         diagnostics: {},
//       },
//     });
//     expect(
//       inventory.find(({ name }) => name === "inspect_android_package"),
//     ).toMatchObject({ available: false, reason: "provider_unavailable" });
//   });
//
//   it("admits physical universal Mach-O targets for native Mach-O operations", () => {
//     expect(
//       entry(
//         "inspect_native_dispatch_metadata",
//         status({
//           open: true,
//           kind: "executable",
//           format: "mach-o-universal",
//           capabilities: [
//             {
//               operation: "inspect_native_dispatch_metadata",
//               available: true,
//               reason: null,
//             },
//           ],
//         }),
//       ),
//     ).toMatchObject({ available: false, reason: "provider_missing" });
//   });
//
//   it.each([
//     {
//       label: "requires a target",
//       name: "current_address",
//       sessionStatus: status(),
export const _l = 187;
