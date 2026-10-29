export const __stub = 1;
//           il_size: method.body.il_size,
//         },
//         evidence,
//       },
//     ],
//   });
//
// /** Build a managed field application node. */
// const fieldNode = (
//   state: GraphBuildState,
//   field: ManagedField,
//   evidence: ApplicationGraphEvidence,
// ): ApplicationNode =>
//   createJavaScriptApplicationNode({
//     kind: "managed-field",
//     identity: artifactLocalIdentity(
//       state.artifactSha256,
//       "managed-field-token",
//       field.token,
//     ),
//     observations: [
//       {
//         label: metadataLabel(
//           field.declaring_type === null
//             ? field.name
//             : `${field.declaring_type}.${field.name}`,
//         ),
//         properties: {
//           token: field.token,
//           declaring_type_token: field.declaring_type_token,
//           declaring_type: field.declaring_type,
//           name: field.name,
//           flags: field.flags,
//           signature_sha256: field.signature.raw_sha256,
//           signature_status: field.signature.parse_status,
//         },
//         evidence,
//       },
//     ],
//   });
//
// /** Add P/Invoke import and native implementation boundary nodes. */
// export const addBoundaryNodes = (
//   state: GraphBuildState,
//   artifactNode: ApplicationNode,
//   parsed: ParsedManagedGraphInput,
// ): void => {
//   const boundaryInput = parsed.boundaries;
//   if (boundaryInput === null) return;
//   const boundaries = boundaryInput.result;
//   const { pinvoke_imports: pinvokes, native_implementations: implementations } =
//     boundaries;
//   const pinvokeCoverage = managedSourceCoverage(boundaries.coverage.state);
//   const implementationCoverage = managedSourceCoverage(
//     boundaries.coverage.state,
//   );
//   const sourceEvidence = sourceManagedEvidence(
//     state,
//     boundaryInput.evidence,
//     boundaries.coverage.state,
//   );
//   const canJoinMemberTokens =
//     parsed.members !== null &&
//     managedTokenScopesMatch(
//       parsed.members.result.identity_scope.requires_mvid,
//       boundaries.identity_scope.requires_mvid,
//     );
//   for (const pinvoke of pinvokes) {
//     const node = pinvokeNode(state, pinvoke, sourceEvidence);
//     state.nodes.push(node);
//     const method =
//       pinvoke.member_token === null || !canJoinMemberTokens
//         ? undefined
//         : state.methodNodes.get(pinvoke.member_token);
//     const memberEvidence =
//       method === undefined || parsed.members === null
//         ? undefined
//         : parsed.members.evidence;
//     const owner = method ?? artifactNode;
//     state.edges.push(
//       createJavaScriptApplicationEdge({
//         source_node_id: owner.node_id,
//         target_node_id: node.node_id,
//         relation: "imports",
//         properties: {
//           kind: "managed-pinvoke",
//           import_name: pinvoke.import_name,
//           import_scope_name: pinvoke.import_scope_name,
//         },
//         evidence: pinvokeAssociationEvidence(
//           state,
//           boundaryInput.evidence,
//           pinvokeCoverage,
//           memberEvidence,
//         ),
//       }),
//     );
//   }
//   for (const implementation of implementations) {
//     const node = nativeImplementationNode(
//       state,
//       implementation,
//       sourceEvidence,
//     );
//     state.nodes.push(node);
//     const owner =
//       (canJoinMemberTokens
//         ? state.methodNodes.get(implementation.token)
//         : undefined) ?? artifactNode;
//     addContainsEdge(state, owner, node, {
//       kind: "declares-managed-native-implementation",
//       coverage: implementationCoverage,
//     });
//   }
// };
//
// /** Build a managed P/Invoke import application node. */
// const pinvokeNode = (
//   state: GraphBuildState,
//   pinvoke: PinvokeImport,
//   evidence: ApplicationGraphEvidence,
// ): ApplicationNode =>
//   createJavaScriptApplicationNode({
//     kind: "managed-pinvoke-import",
//     identity: artifactLocalIdentity(
//       state.artifactSha256,
//       "managed-pinvoke-token",
//       pinvoke.token,
//     ),
//     observations: [
//       {
//         label: metadataLabel(pinvoke.import_name),
//         properties: {
//           token: pinvoke.token,
//           member_token: pinvoke.member_token,
//           member_name: pinvoke.member_name,
//           import_name: pinvoke.import_name,
//           import_scope_name: pinvoke.import_scope_name,
//           char_set: pinvoke.char_set,
//           call_convention: pinvoke.call_convention,
//           verification: pinvoke.verification,
//         },
//         evidence,
//       },
//     ],
export const _l = 145;
