export const __stub = 1;
// const selectModuleSource = (
//   parsed: ParsedManagedGraphInput,
// ): ManagedModuleSource | null => {
//   const sources = [
//     parsed.artifact?.result.module == null
//       ? null
//       : {
//           module: parsed.artifact.result.module,
//           evidence: parsed.artifact.evidence,
//           coverageState: parsed.artifact.result.coverage.state,
//         },
//     parsed.members?.result.module == null
//       ? null
//       : {
//           module: parsed.members.result.module,
//           evidence: parsed.members.evidence,
//           coverageState: parsed.members.result.coverage.state,
//         },
//     parsed.boundaries?.result.module == null
//       ? null
//       : {
//           module: parsed.boundaries.result.module,
//           evidence: parsed.boundaries.evidence,
//           coverageState: parsed.boundaries.result.coverage.state,
//         },
//   ].filter((source): source is ManagedModuleSource => source !== null);
//   return (
//     sources.find(({ module }) => module.mvid !== null) ?? sources[0] ?? null
//   );
// };
//
// /** Add managed type, method, and field nodes from member evidence. */
// export const addMemberNodes = (
//   state: GraphBuildState,
//   artifactNode: ApplicationNode,
//   parsed: ParsedManagedGraphInput,
// ): void => {
//   const memberInput = parsed.members;
//   if (memberInput === null) return;
//   const members = memberInput.result;
//   const { types, methods, fields } = members;
//   const typeCoverage = managedSourceCoverage(members.coverage.state);
//   const methodCoverage = managedSourceCoverage(members.coverage.state);
//   const fieldCoverage = managedSourceCoverage(members.coverage.state);
//   const sourceEvidence = sourceManagedEvidence(
//     state,
//     memberInput.evidence,
//     members.coverage.state,
//   );
//   for (const type of types) {
//     const node = typeNode(state, type, sourceEvidence);
//     state.nodes.push(node);
//     state.typeNodes.set(type.token, node);
//     addContainsEdge(state, artifactNode, node, {
//       kind: "declares-managed-type",
//       coverage: typeCoverage,
//     });
//   }
//   for (const method of methods) {
//     const node = methodNode(state, method, sourceEvidence);
//     state.nodes.push(node);
//     state.methodNodes.set(method.token, node);
//     const owner =
//       method.declaring_type_token === null
//         ? artifactNode
//         : (state.typeNodes.get(method.declaring_type_token) ?? artifactNode);
//     addContainsEdge(state, owner, node, {
//       kind: "declares-managed-method",
//       coverage: methodCoverage,
//     });
//   }
//   for (const field of fields) {
//     const node = fieldNode(state, field, sourceEvidence);
//     state.nodes.push(node);
//     state.fieldNodes.set(field.token, node);
//     const owner =
//       field.declaring_type_token === null
//         ? artifactNode
//         : (state.typeNodes.get(field.declaring_type_token) ?? artifactNode);
//     addContainsEdge(state, owner, node, {
//       kind: "declares-managed-field",
//       coverage: fieldCoverage,
//     });
//   }
// };
//
// /** Build a managed type application node. */
// const typeNode = (
//   state: GraphBuildState,
//   type: ManagedType,
//   evidence: ApplicationGraphEvidence,
// ): ApplicationNode =>
//   createJavaScriptApplicationNode({
//     kind: "managed-type",
//     identity: artifactLocalIdentity(
//       state.artifactSha256,
//       "managed-type-token",
//       type.token,
//     ),
//     observations: [
//       {
//         label: metadataLabel(type.full_name),
//         properties: {
//           token: type.token,
//           namespace: type.namespace,
//           name: type.name,
//           full_name: type.full_name,
//           flags: type.flags,
//           extends_token: type.extends_token,
//         },
//         evidence,
//       },
//     ],
//   });
//
// /** Build a managed method application node. */
// const methodNode = (
//   state: GraphBuildState,
//   method: ManagedMethod,
//   evidence: ApplicationGraphEvidence,
// ): ApplicationNode =>
//   createJavaScriptApplicationNode({
//     kind: "managed-method",
//     identity: artifactLocalIdentity(
//       state.artifactSha256,
//       "managed-method-token",
//       method.token,
//     ),
//     observations: [
//       {
//         label: metadataLabel(
//           method.declaring_type === null
//             ? method.name
//             : `${method.declaring_type}.${method.name}`,
//         ),
//         properties: {
//           token: method.token,
//           declaring_type_token: method.declaring_type_token,
//           declaring_type: method.declaring_type,
//           name: method.name,
//           rva: method.rva,
//           signature_sha256: method.signature.raw_sha256,
//           signature_status: method.signature.parse_status,
//           body_status: method.body.status,
//           normalized_il_sha256: method.body.normalized_il_sha256,
export const _l = 145;
