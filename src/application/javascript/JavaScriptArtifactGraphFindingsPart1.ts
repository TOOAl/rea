export const __stub = 1;
// import { createHash } from "node:crypto";
//
// import { compactStringIdentityKey } from "../../domain/compactStringIdentity.js";
// import type { ApplicationNode } from "../../domain/javascript/javascriptApplicationGraphSchemas.js";
// import type { JavaScriptStaticAnalysis } from "../../domain/javascript/javascriptStaticAnalysisTypes.js";
// import type { JavaScriptArtifactFile } from "../../domain/javascript/javascriptArtifactFiles.js";
// import {
//   addStaticInferenceEdge,
//   artifactLocalIdentity,
//   chunkLookupKey,
//   createElectronRoleNode,
//   javascriptAnalysisCoverage,
//   linkElectronRoleToAsset,
//   moduleLookupKey,
//   selfReferenceOmissions,
//   sourceNodeFor,
//   type JavaScriptArtifactGraphContext,
//   type JavaScriptArtifactGraphCoverage,
// } from "./JavaScriptArtifactGraphContext.js";
// import {
//   astObservationEvidence,
//   staticInferenceEvidence,
// } from "./JavaScriptArtifactGraphEvidence.js";
// import {
//   artifactPathResolutionProperties,
//   resolveArtifactPathByContext,
//   type ArtifactPathResolution,
// } from "./JavaScriptArtifactPathResolution.js";
// import { moduleResolutionModeForJavaScriptReference } from "../../domain/javascript/javascriptModuleResolutionMode.js";
//
// type StaticReference = JavaScriptStaticAnalysis["references"][number];
// type StaticEndpoint = JavaScriptStaticAnalysis["endpoints"][number];
// type StaticStorage = JavaScriptStaticAnalysis["storage"][number];
// type StaticRolePath = JavaScriptStaticAnalysis["role_paths"][number];
// type StaticSourceMap = JavaScriptStaticAnalysis["source_map_urls"][number];
//
// interface FindingInput<Value> {
//   readonly file: JavaScriptArtifactFile;
//   readonly asset: ApplicationNode;
//   readonly value: Value;
//   readonly coverage: JavaScriptArtifactGraphCoverage;
// }
//
// interface ResolvedReference {
//   readonly path: string | null;
//   readonly file: JavaScriptArtifactFile | null;
//   readonly node: ApplicationNode | null;
//   readonly limitations: readonly string[];
//   readonly resolutionStatus?: string;
//   readonly resolution?: ArtifactPathResolution;
// }
//
// /** Project imports, workers, roles, endpoints, storage, and source-map links. */
// export function* addJavaScriptStaticFindingsSteps(
//   context: JavaScriptArtifactGraphContext,
// ): Generator<void, readonly string[]> {
//   const omissions = { selfReferences: 0 };
//   for (const analyzed of context.analysis.files) {
//     yield;
//     const { file, javascript } = analyzed;
//     const asset = context.assetNodes.get(file.path);
//     if (javascript === null || asset === undefined) continue;
//     const coverage = javascriptAnalysisCoverage(javascript);
//     for (const value of javascript.references)
//       addReference(context, { file, asset, value, coverage }, omissions);
//     for (const value of javascript.endpoints)
//       addEndpoint(context, { file, asset, value, coverage });
//     for (const value of javascript.storage)
//       addStorage(context, { file, asset, value, coverage });
//     for (const value of javascript.role_paths)
//       addDiscoveredRole(context, { file, asset, value, coverage });
//     for (const value of javascript.source_map_urls)
//       addSourceMapEdge(context, { file, asset, value, coverage });
//   }
//   return selfReferenceOmissions(
//     omissions.selfReferences,
//     ["static reference", "static references"],
//     "the referencing module",
//   );
// }
//
// const addReference = (
//   context: JavaScriptArtifactGraphContext,
//   input: FindingInput<StaticReference>,
//   omissions: { selfReferences: number },
// ): void => {
//   const source =
//     sourceNodeFor(
//       context,
//       input.file.path,
//       input.value.module_key,
//       input.value.module_runtime,
//     ) ?? input.asset;
//   const resolved =
//     input.value.specifier === null
//       ? null
//       : resolveReference(context, input.file.path, input.value, input.coverage);
//   if (input.value.kind === "worker" || input.value.kind === "service-worker") {
//     const worker = context.accumulator.addNode({
//       kind: input.value.kind === "worker" ? "worker" : "service-worker",
//       identity: artifactLocalIdentity(
//         input.file.sha256,
//         input.value.kind,
//         input.value.specifier ?? input.value.expression,
//       ),
//       observations: [
//         {
//           label: input.value.specifier,
//           properties: {
//             declared_specifier: input.value.specifier,
//             expression: input.value.expression,
//             resolved_path: resolved?.path ?? null,
//             resolution_status: resolved?.resolutionStatus ?? null,
//             ...artifactPathResolutionProperties(resolved?.resolution),
//           },
//           evidence: staticInferenceEvidence({
//             sha256: input.file.sha256,
//             path: input.file.path,
//             range: input.value.location,
//             operation: "discover-worker",
//             coverage: input.coverage,
//             limitations: resolved?.limitations ?? [],
//           }),
//         },
//       ],
//     });
//     addStaticInferenceEdge(context, {
//       source,
//       target: worker,
//       file: input.file,
//       range: input.value.location,
//       coverage: input.coverage,
//       relation: "loads",
//       properties: {
//         kind: input.value.kind,
//         resolution_status: resolved?.resolutionStatus ?? null,
//         ...artifactPathResolutionProperties(resolved?.resolution),
//       },
//       limitations: resolved?.limitations ?? [],
//     });
//     if (resolved !== null && resolved.path !== null && resolved.node !== null)
//       addStaticInferenceEdge(context, {
//         source: worker,
//         target: resolved.node,
//         file: input.file,
//         range: input.value.location,
//         coverage: input.coverage,
//         relation: "maps_to",
//         properties: { resolved_path: resolved.path },
//         limitations: resolved.limitations,
//       });
//     return;
//   }
//   // A reference that resolves to its own source, such as a bundled module
//   // requiring its own key, cannot become an edge: the application graph
export const _l = 155;
