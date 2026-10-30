export const __stub = 1;
//   // forbids self-referential edges and one would fail the whole analysis.
//   if (resolved?.node?.node_id === source.node_id) {
//     omissions.selfReferences += 1;
//     return;
//   }
//   const target =
//     resolved?.node ??
//     unresolvedReferenceNode(context, input.file, input.value, input.coverage);
//   addStaticInferenceEdge(context, {
//     source,
//     target,
//     file: input.file,
//     range: input.value.location,
//     coverage: input.coverage,
//     relation: resolved?.file?.kind === "native-addon" ? "loads" : "imports",
//     properties: {
//       kind: input.value.kind,
//       specifier: input.value.specifier,
//       expression: input.value.expression,
//       resolution_mode:
//         input.value.kind === "static-import" ||
//         input.value.kind === "dynamic-import" ||
//         input.value.kind === "require"
//           ? moduleResolutionModeForJavaScriptReference(
//               input.file.path,
//               input.value.kind,
//             )
//           : null,
//       resolved_path: resolved?.path ?? null,
//       resolution_status: resolved?.resolutionStatus ?? null,
//       ...artifactPathResolutionProperties(resolved?.resolution),
//     },
//     ...(resolved === null ? {} : { limitations: resolved.limitations }),
//   });
// };
//
// const addEndpoint = (
//   context: JavaScriptArtifactGraphContext,
//   input: FindingInput<StaticEndpoint>,
// ): void => {
//   const source =
//     sourceNodeFor(
//       context,
//       input.file.path,
//       input.value.module_key,
//       input.value.module_runtime,
//     ) ?? input.asset;
//   const key = compactStringIdentityKey(input.value.value);
//   const candidate = input.value.interpretation === "candidate";
//   const candidateLimitation =
//     "The unbound method-like argument is only a candidate; its receiver does not establish a network call.";
//   const label = `${input.value.kind} ${candidate ? "endpoint candidate" : "endpoint"}`;
//   const node = context.accumulator.addNode({
//     kind: "endpoint",
//     identity: artifactLocalIdentity(
//       input.file.sha256,
//       input.value.kind,
//       JSON.stringify([input.value.interpretation ?? "literal", key]),
//     ),
//     observations: [
//       {
//         label:
//           input.value.value.length <= label.length ? input.value.value : label,
//         properties: {
//           endpoint_kind: input.value.kind,
//           value: input.value.value,
//           mechanism: input.value.mechanism,
//           ...(candidate ? { interpretation: input.value.interpretation } : {}),
//         },
//         evidence: candidate
//           ? staticInferenceEvidence({
//               sha256: input.file.sha256,
//               path: input.file.path,
//               range: input.value.location,
//               operation: "classify-static-endpoint-candidate",
//               coverage: input.coverage,
//               confidence: "low",
//               limitations: [candidateLimitation],
//             })
//           : astObservationEvidence({
//               sha256: input.file.sha256,
//               path: input.file.path,
//               range: input.value.location,
//               operation: "discover-static-endpoint",
//               coverage: input.coverage,
//             }),
//       },
//     ],
//   });
//   addStaticInferenceEdge(context, {
//     source,
//     target: node,
//     file: input.file,
//     range: input.value.location,
//     coverage: input.coverage,
//     relation: input.value.kind === "route" ? "exposes" : "calls",
//     properties: {
//       mechanism: input.value.mechanism,
//       ...(candidate ? { interpretation: input.value.interpretation } : {}),
//     },
//     ...(candidate
//       ? {
//           confidence: "low" as const,
//           limitations: [candidateLimitation],
//         }
//       : {}),
//   });
// };
//
// const addStorage = (
//   context: JavaScriptArtifactGraphContext,
//   input: FindingInput<StaticStorage>,
// ): void => {
//   const source =
//     sourceNodeFor(
//       context,
//       input.file.path,
//       input.value.module_key,
//       input.value.module_runtime,
//     ) ?? input.asset;
//   const node = context.accumulator.addNode({
//     kind: "storage",
//     identity: artifactLocalIdentity(
//       input.file.sha256,
//       input.value.kind,
//       input.value.name ?? input.value.mechanism,
//     ),
//     observations: [
//       {
//         label: input.value.name ?? input.value.kind,
//         properties: {
//           storage_kind: input.value.kind,
//           name: input.value.name,
//           mechanism: input.value.mechanism,
//         },
//         evidence: astObservationEvidence({
//           sha256: input.file.sha256,
//           path: input.file.path,
//           range: input.value.location,
//           operation: "discover-static-storage",
//           coverage: input.coverage,
//         }),
//       },
//     ],
//   });
//   addStaticInferenceEdge(context, {
//     source,
//     target: node,
//     file: input.file,
//     range: input.value.location,
//     coverage: input.coverage,
//     relation: "persists_to",
//     properties: { mechanism: input.value.mechanism },
//   });
// };
export const _l = 155;
