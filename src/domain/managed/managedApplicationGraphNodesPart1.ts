export const __stub = 1;
// import { basename } from "node:path";
// import {
//   createJavaScriptApplicationEdge,
//   createJavaScriptApplicationNode,
// } from "../javascript/javascriptApplicationGraph.js";
// import type { ApplicationGraphEvidence } from "../javascript/javascriptApplicationEvidenceSchemas.js";
// import type { ApplicationNode } from "../javascript/javascriptApplicationGraphSchemas.js";
// import { managedSourceCoverage } from "./managedApplicationGraphCoverage.js";
// import type { Evidence } from "../evidence.js";
// import { managedTokenScopesMatch } from "./managedInspectionEvidence.js";
// import type {
//   ManagedArtifactInspection,
//   ManagedMemberInspection,
//   ManagedNativeBoundaryInspection,
// } from "./managedArtifact.js";
// import type {
//   GraphBuildState,
//   ParsedManagedGraphInput,
// } from "./managedApplicationGraph.js";
// type ManagedMethod = ManagedMemberInspection["methods"][number];
// type ManagedField = ManagedMemberInspection["fields"][number];
// type ManagedType = ManagedMemberInspection["types"][number];
// type PinvokeImport = ManagedNativeBoundaryInspection["pinvoke_imports"][number];
// type NativeImplementation =
//   ManagedNativeBoundaryInspection["native_implementations"][number];
//
// /**
//  * Display label for a metadata name. Metadata may hold an empty name; the
//  * graph then has no label, while the node's properties keep the source value.
//  */
// const metadataLabel = (name: string): string | null =>
//   name === "" ? null : name;
//
// /** Options for a managed contains relationship edge. */
// export interface ContainsEdgeOptions {
//   readonly kind: string;
//   readonly coverage: ApplicationGraphEvidence["coverage"];
// }
//
// /** Add the root managed artifact node to the graph state. */
// export const addArtifactNode = (state: GraphBuildState): ApplicationNode => {
//   const node = createJavaScriptApplicationNode({
//     kind: "artifact",
//     identity: {
//       strategy: "content-digest",
//       stability: "global-exact",
//       sha256: state.artifactSha256,
//     },
//     observations: [
//       {
//         label: basename(state.artifactPath),
//         properties: {
//           format: "pe",
//           source: "managed-application-graph",
//         },
//         evidence: projectedManagedEvidence(state, "project-managed-artifact"),
//       },
//     ],
//   });
//   state.nodes.push(node);
//   return node;
// };
//
// /** Add managed assembly and module identity nodes for the artifact. */
// export const addArtifactIdentityNodes = (
//   state: GraphBuildState,
//   artifactNode: ApplicationNode,
//   parsed: ParsedManagedGraphInput,
// ): void => {
//   const artifactInput = parsed.artifact;
//   if (artifactInput !== null && artifactInput.result.assembly !== null) {
//     const assemblyFacts = artifactInput.result.assembly;
//     const artifactEvidence = sourceManagedEvidence(
//       state,
//       artifactInput.evidence,
//       artifactInput.result.coverage.state,
//     );
//     const assembly = createJavaScriptApplicationNode({
//       kind: "managed-assembly",
//       identity: artifactLocalIdentity(
//         state.artifactSha256,
//         "managed-assembly",
//         assemblyFacts.token,
//       ),
//       observations: [
//         {
//           label: metadataLabel(assemblyFacts.name),
//           properties: {
//             name: assemblyFacts.name,
//             version: assemblyFacts.version,
//             culture: assemblyFacts.culture,
//             public_key_kind: assemblyFacts.public_key.kind,
//           },
//           evidence: artifactEvidence,
//         },
//       ],
//     });
//     state.nodes.push(assembly);
//     addContainsEdge(state, artifactNode, assembly, {
//       kind: "declares-managed-assembly",
//       coverage: artifactEvidence.coverage,
//     });
//   }
//   const moduleSource = selectModuleSource(parsed);
//   if (moduleSource !== null) {
//     const { module } = moduleSource;
//     const moduleEvidence = sourceManagedEvidence(
//       state,
//       moduleSource.evidence,
//       moduleSource.coverageState,
//     );
//     const moduleNode = createJavaScriptApplicationNode({
//       kind: "managed-module",
//       identity: artifactLocalIdentity(
//         state.artifactSha256,
//         "managed-module",
//         module.mvid?.toLowerCase() ?? module.token,
//       ),
//       observations: [
//         {
//           label: metadataLabel(module.name),
//           properties: {
//             name: module.name,
//             mvid: module.mvid,
//             generation: module.generation,
//             token: module.token,
//           },
//           evidence: moduleEvidence,
//         },
//       ],
//     });
//     state.nodes.push(moduleNode);
//     addContainsEdge(state, artifactNode, moduleNode, {
//       kind: "declares-managed-module",
//       coverage: moduleEvidence.coverage,
//     });
//   }
// };
//
// interface ManagedModuleSource {
//   readonly module: NonNullable<ManagedArtifactInspection["module"]>;
//   readonly evidence: Evidence;
//   readonly coverageState: ManagedArtifactInspection["coverage"]["state"];
// }
//
export const _l = 145;
