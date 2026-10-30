export const __stub = 1;
// import * as t from "@babel/types";
// import { runtimeFunctionParameters } from "./javascriptAstValues.js";
// import { JavaScriptSymbolicBindings } from "./javascriptSymbolicBindings.js";
// import {
//   symbolicVariants,
//   symbolicTruth,
//   symbolicUnknown,
//   type SymbolicValue,
//   type SymbolicEnvironment,
//   type SymbolicFunction,
// } from "./javascriptSymbolicValues.js";
// import type { JavaScriptSemanticAnalysisState } from "./javascriptSemanticState.js";
// import type { JavaScriptElectronIdentity } from "./javascriptSemanticAnalysis.js";
// import type { JavaScriptAnalysisAccumulator } from "./javascriptStaticAnalysisState.js";
// import type {
//   ElectronCallPath,
//   ElectronCallPathStep,
//   ElectronContextBridgeFinding,
//   ElectronIpcDescriptor,
//   ElectronIpcFinding,
//   ElectronStaticValue,
// } from "./electronStaticAnalysisTypes.js";
// import {
//   contextBridgeExposureArguments,
//   type JavaScriptContextBridgeExposureArguments,
// } from "./javascriptContextBridgeExposure.js";
// import { boundedExpression } from "./electronStaticAnalysisValues.js";
// import { argumentNode } from "./javascriptStaticAnalysisHelpers.js";
// import {
//   childNodes,
//   traverseJavaScriptAst,
// } from "./javascriptSemanticTraversal.js";
// import { range, calleeName } from "./javascriptStaticAnalysisHelpers.js";
// import { ipcDescriptor } from "./electronStaticAnalysisIpc.js";
// import {
//   symbolicDefiniteExit,
//   symbolicLogicalRight,
// } from "./javascriptSymbolicControlFlow.js";
// import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
//
// const callLabel = (node: t.Node): string =>
//   t.isSequenceExpression(node)
//     ? callLabel(node.expressions.at(-1) ?? node)
//     : calleeName(node) || "local call";
//
// const ipcEndpointKey = (value: ElectronIpcFinding): string =>
//   JSON.stringify([value.side, value.operation, value.channel, value.location]);
//
// /** Duplicate evidence already recorded for one endpoint and call site. */
// interface IpcEndpointFacts {
//   // A directly observed transmission stays one fact however it is reached.
//   observedTransmission: boolean;
//   readonly invocations: Set<string>;
// }
//
// const ipcInvocationKey = (location: unknown): string =>
//   String(JSON.stringify(location));
//
// const indexIpcFinding = (
//   index: Map<string, IpcEndpointFacts>,
//   value: ElectronIpcFinding,
// ): void => {
//   const key = ipcEndpointKey(value);
//   let facts = index.get(key);
//   if (facts === undefined) {
//     facts = { observedTransmission: false, invocations: new Set() };
//     index.set(key, facts);
//   }
//   facts.observedTransmission ||=
//     value.resolution_basis === undefined &&
//     (value.mode === "send" || value.mode === "invoke");
//   facts.invocations.add(ipcInvocationKey(value.invocation_location));
// };
//
// interface PathContext {
//   readonly entryNode: t.Node;
//   readonly entry: string;
//   readonly entryPath?: readonly string[];
//   readonly entryKind: ElectronCallPath["entry_kind"] | null;
//   readonly channel: string | null;
//   readonly steps: readonly ElectronCallPathStep[];
//   readonly conditions: ElectronCallPath["conditions"];
//   readonly active: ReadonlySet<t.Function>;
// }
//
// /** Substitutes inert wrapper syntax; every emitted path remains a candidate. */
// export const collectElectronWrappedCallPaths = (
//   program: t.Program,
//   state: JavaScriptSemanticAnalysisState,
//   source: string,
//   accumulator: JavaScriptAnalysisAccumulator,
//   identity: JavaScriptElectronIdentity,
// ): readonly ElectronCallPath[] => {
//   // Bounds repeated interprocedural expansion independently of bundle bytes.
//   // Exhaustion is reported as unknown coverage, never as a negative finding.
//   let remainingVisits = 1_000_000;
//   const resolver = new JavaScriptSymbolicBindings(state, program, identity);
//   const paths: ElectronCallPath[] = [];
//   const seen = new Set<string>();
//   const step = (
//     node: t.Node,
//     kind: ElectronCallPathStep["kind"],
//     label: string,
//   ): ElectronCallPathStep => {
//     const module = accumulator.moduleRangeIndex.find(node.start);
//     return {
//       kind,
//       label,
//       location: range(node),
//       module_key: module?.key ?? null,
//       module_runtime: module?.runtime ?? null,
//     };
//   };
//   const condition = (
//     context: PathContext,
//     node: t.Node,
//     positive: boolean | "nullish" | "not-nullish" = true,
//   ): PathContext => {
//     const expression = source
//       .slice(node.start ?? 0, node.end ?? 0)
//       .slice(0, 512);
//     return {
//       ...context,
//       conditions: [
//         ...context.conditions,
//         {
//           expression:
//             positive === "nullish"
//               ? `(${expression}) === null || (${expression}) === undefined`
//               : positive === "not-nullish"
//                 ? `(${expression}) !== null && (${expression}) !== undefined`
//                 : positive
//                   ? expression
//                   : `!(${expression})`,
//           location: range(node),
//         },
//       ],
//     };
//   };
//   const sequentialFallthrough = (
//     statement: t.Statement,
//     env: SymbolicEnvironment,
//     context: PathContext,
//   ): { readonly continues: boolean; readonly context: PathContext } => {
//     if (symbolicDefiniteExit(statement)) return { continues: false, context };
//     if (!t.isIfStatement(statement)) return { continues: true, context };
//     const truth = symbolicTruth(resolver.evaluate(statement.test, env));
//     if (truth !== undefined)
//       return symbolicDefiniteExit(
//         truth ? statement.consequent : statement.alternate,
//       )
//         ? { continues: false, context }
//         : { continues: true, context };
//     if (symbolicDefiniteExit(statement.consequent))
//       return {
//         continues: true,
//         context: condition(context, statement.test, false),
//       };
//     if (symbolicDefiniteExit(statement.alternate))
//       return {
//         continues: true,
//         context: condition(context, statement.test),
//       };
//     return { continues: true, context };
//   };
//   const metadataContext = (
//     context: PathContext,
//     value: SymbolicValue,
//   ): PathContext | null => {
//     if (value.conditionUnresolved) {
//       accumulator.unknownFindings += 1;
//       return null;
//     }
//     return (
//       value.conditions?.reduce(
//         (current, branch) => condition(current, branch.node, branch.positive),
//         context,
//       ) ?? context
//     );
export const _l = 179;
