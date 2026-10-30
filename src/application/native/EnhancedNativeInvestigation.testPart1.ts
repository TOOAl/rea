export const __stub = 1;
// // Fake-backed composition coverage; real provider verification lives in
// // `npm run verify:hopper` and `npm run verify:ghidra`.
// import { describe, expect, it } from "vitest";
// import { z } from "zod";
//
// import {
//   createAnalysisExecution,
//   type AnalysisExecution,
//   type AnalysisOperation,
// } from "../AnalysisProvider.js";
// import type { AnalysisError } from "../../domain/analysisErrorBase.js";
// import {
//   AnalysisCancelledError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisOutputError,
// } from "../../domain/analysisErrorCore.js";
// import { EnhancedTools } from "../EnhancedTools.js";
// import {
//   nativeInvestigationGraphSchema,
//   nativeInvestigationTraceSchema,
// } from "../../domain/native/nativeInvestigationGraph.js";
// import { err, ok } from "../../domain/result.js";
// import type { Result } from "../../domain/result.js";
//
// const target = "a".repeat(64);
// const provider = { id: "fixture", name: "Fixture", version: "1" };
// const methodName = "-[BuildViewController buildTapped:]";
// const methodSymbol = {
//   primary: true,
//   dynamic: false,
//   external: false,
//   type: "function",
//   source: "user_defined",
// };
// const methodInventoryEntry = {
//   address: "0x1000",
//   value: methodName,
//   symbol: methodSymbol,
// };
//
// const evidence = [
//   {
//     kind: "interface_builder_resource" as const,
//     description: "Fixture UI archive",
//     location: { address: null, file_offset: null },
//     artifact_path: null,
//     artifact_sha256: null,
//   },
// ];
// const graph = {
//   target_sha256: target,
//   provider: {
//     id: provider.id,
//     version: provider.version,
//     tool_version: "fixture",
//   },
//   nodes: [
//     {
//       id: "button",
//       kind: "control" as const,
//       name: "Build",
//       location: null,
//       attributes: {
//         class_name: "UIButton",
//         interface_builder_object_id: "button",
//       },
//       evidence,
//     },
//     {
//       id: "action",
//       kind: "action" as const,
//       name: "buildTapped:",
//       location: null,
//       attributes: { selector: "buildTapped:" },
//       evidence,
//     },
//     {
//       id: "controller",
//       kind: "view_controller" as const,
//       name: "BuildViewController",
//       location: null,
//       attributes: { class_name: "BuildViewController" },
//       evidence,
//     },
//     {
//       id: "selector",
//       kind: "objc_selector" as const,
//       name: "buildTapped:",
//       location: null,
//       attributes: {},
//       evidence,
//     },
//   ],
//   edges: [
//     {
//       id: "button-action",
//       from: "button",
//       to: "action",
//       relation: "target_action" as const,
//       resolution: "observed" as const,
//       evidence,
//       limitations: [],
//     },
//     {
//       id: "action-selector",
//       from: "action",
//       to: "selector",
//       relation: "target_action" as const,
//       resolution: "observed" as const,
//       evidence,
//       limitations: [],
//     },
//     {
//       id: "action-controller",
//       from: "action",
//       to: "controller",
//       relation: "target_action" as const,
//       resolution: "observed" as const,
//       evidence,
//       limitations: [],
//     },
//   ],
//   coverage: [],
//   truncated: false,
// };
//
// const execution = (
//   operation: AnalysisOperation,
//   result: unknown,
//   sha256 = target,
// ) =>
//   ok(
//     createAnalysisExecution(result, provider, {
//       subject: {
//         sha256,
//         path: "/fixture.app",
//         format: "mach-o",
//         architecture: "arm64",
//       },
//     }),
//   );
//
// const testAnalysis = (
//   overrides: Partial<
//     Record<
//       AnalysisOperation,
//       (
//         parameters: Readonly<Record<string, unknown>>,
//       ) => Result<AnalysisExecution, AnalysisError>
//     >
//   > = {},
//   uiGraph: z.input<typeof nativeInvestigationGraphSchema> = graph,
// ) => ({
//   execute: async (
//     operation: AnalysisOperation,
//     parameters: Readonly<Record<string, unknown>>,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> => {
//     const override = overrides[operation];
//     if (override !== undefined) return override(parameters);
//     switch (operation) {
//       case "procedure_address":
//         return err(
//           new AnalysisCapabilityUnavailableError(
//             "fixture",
//             operation,
//             "Seed not available",
//           ),
//         );
//       case "procedure_references":
//         return err(
//           new AnalysisCapabilityUnavailableError(
//             "fixture",
//             operation,
//             "No typed reference reader in fixture",
//           ),
//         );
//       case "inspect_native_dispatch_metadata":
//         return err(
//           new AnalysisCapabilityUnavailableError(
//             "fixture",
//             operation,
//             "No binary metadata reader in fixture",
//           ),
//         );
//       case "decode_interface_builder":
//         return execution(operation, {
//           target_sha256: target,
//           documents: [
//             {
//               relative_path: "Base.lproj/Main.nib",
//               archive_sha256: "b".repeat(64),
//               document_kind: "nib",
//               object_count: 4,
//               connection_count: 3,
//               hierarchy_complete: true,
//             },
//           ],
//           graph: uiGraph,
//           limitations: [],
//         });
//       case "list_names":
//         return execution(operation, [
//           { address: "0x1000", name: "-[BuildViewController buildTapped:]" },
export const _l = 203;
