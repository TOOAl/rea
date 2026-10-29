export const __stub = 1;
//     !managedTokenScopesMatch(
//       result.identity_scope.requires_mvid,
//       result.module?.mvid ?? null,
//     )
//   )
//     return undefined;
//   return result;
// };
//
// const managedClaims = (
//   targets: AgentEvaluationFixtureTargets,
// ): readonly FixtureClaimExpectation[] => {
//   if (targets.managed === undefined || targets.managedSha256 === undefined)
//     throw new TypeError(
//       "Managed fixture grading requires the built DLL path and SHA-256",
//     );
//   const source = {
//     operation: "inspect_managed_members",
//     authority: "shipped-artifact",
//     confidence: "observed",
//     subject: { path: targets.managed, sha256: targets.managedSha256 },
//   } satisfies Omit<FixtureClaimExpectation["source"], "select">;
//   return [
//     {
//       id: "public_types",
//       expectedValue: ["AgentEval.Profile", "AgentEval.Program"],
//       source: {
//         ...source,
//         select: (_value, context) => {
//           const members = managedMembers(context);
//           if (
//             members === undefined ||
//             members.selection !== null ||
//             Object.hasOwn(context.evidence.parameters, "type_names")
//           )
//             return undefined;
//           return members.types
//             .filter((type) => (type.flags & 7) === 1)
//             .map((type) => type.full_name)
//             .sort(compareUnicodeCodePoints);
//         },
//       },
//     },
//     {
//       id: "entry_point",
//       expectedValue: { declaring_type: "AgentEval.Program", name: "Main" },
//       source: {
//         ...source,
//         select: (_value, context) => {
//           const members = managedMembers(context);
//           if (members === undefined) return undefined;
//           const artifacts = context.deliveredEvidence.filter(
//             (evidence) =>
//               evidence.operation === "inspect_managed_artifact" &&
//               evidence.authority === source.authority &&
//               evidence.confidence === source.confidence &&
//               evidence.subject?.local_path === source.subject.path &&
//               evidence.subject.digest.sha256 === source.subject.sha256,
//           );
//           if (artifacts.length !== 1) return undefined;
//           const { result: artifact } = parseManagedInspectionEvidence(
//             artifacts[0],
//             "inspect_managed_artifact",
//             managedArtifactInspectionSchema,
//           );
//           if (
//             artifact.coverage.state !== "complete" ||
//             artifact.metadata.status !== "complete" ||
//             !managedTokenScopesMatch(
//               artifact.module?.mvid ?? null,
//               members.module?.mvid ?? null,
//             ) ||
//             artifact.pe.cli?.entry_point.kind !== "metadata-token"
//           )
//             return undefined;
//           const methods = members.methods.filter(
//             (method) => method.token === artifact.pe.cli?.entry_point.value,
//           );
//           const method = methods.length === 1 ? methods[0] : undefined;
//           return method === undefined
//             ? undefined
//             : {
//                 declaring_type: method.declaring_type,
//                 name: method.name,
//               };
//         },
//       },
//     },
//   ];
// };
//
// /** Return the closed known-answer rubric, or undefined for routing-only scenarios. */
// export const agentFixtureClaims = (
//   scenarioId: string,
//   targets: AgentEvaluationFixtureTargets,
// ): readonly FixtureClaimExpectation[] | undefined => {
//   if (scenarioId === "asar") return asarClaims(targets);
//   if (scenarioId === "managed") return managedClaims(targets);
//   if (scenarioId === "javascript-export-shape") return parserClaims(targets);
//   if (scenarioId === "notes-export") return notesClaims(targets);
//   return undefined;
// };
//
// const bridgeAnswerDescriptions = [
//   'renderer_api: {"key": string, "members": string[], "world": string, "source": string}, describing the exposed bridge API, its members, world, and source file.',
//   'renderer_ipc: {"channel": string, "operation": string, "source": string}, describing the renderer-side IPC operation and its source file.',
//   'main_ipc: {"channel": string, "operation": string, "source": string}, describing the main-side IPC operation and its source file.',
//   'preload: {"path": string, "resolution_status": string}, describing the BrowserWindow-declared preload resolved within the shipped artifact.',
// ];
//
// const answerValueDescriptions: Readonly<Record<string, readonly string[]>> = {
//   managed: [
//     "public_types: string[], listing the exact public top-level type full names in Unicode code-point order from unfiltered member Evidence (omit type_names).",
//     'entry_point: {"declaring_type": string, "name": string}, resolving the CLI metadata entry-point token against the member inventory from the same artifact SHA-256 and module MVID. Cite member Evidence; both artifact and member Evidence must be delivered.',
//   ],
//   asar: bridgeAnswerDescriptions,
//   "javascript-export-shape": [
//     'heading_change: {"status": string, "path": string, "discriminant": object or null, "left": object, "right": object}, copying the exact heading-change fields from the comparison result.',
//     'comparison_coverage: {"status": string, "paired_variants": number, "added": number, "removed": number, "changed": number, "unknown": number}, copying comparison coverage and summary counts.',
//     'runtime_semantics: "established" or "not_established", stating whether the cited comparison establishes runtime behavior.',
//   ],
//   "notes-export": [
//     ...bridgeAnswerDescriptions,
//     'feature_modules: {"paths": string[], "coverage": string}, listing the unique source-module observation paths in the feature trace in Unicode code-point order, and its coverage status.',
//     'semantic_boundary: {"status": string, "coverage": string, "relevant_unknowns": number}, copying the semantic trace status, coverage status, and summary.relevant_unknowns. Static traces do not establish runtime execution.',
//   ],
// };
//
// /** Describe the strict answer contract without revealing any golden fixture values. */
// export const agentFixtureAnswerInstructions = (scenarioId: string): string => {
//   const descriptions = answerValueDescriptions[scenarioId];
//   if (descriptions === undefined) return "";
//   return [
//     "For this benchmark, return only one JSON object, without Markdown fences or surrounding prose.",
//     'The exact shape is {"claims": [{"id": string, "value": JSON value, "evidence_id": string, "confidence": string, "authority": string}]}.',
//     "Include exactly one claim per ID below, without additional fields or claims. Infer values only from REA tool results; do not read target files directly.",
//     "Each evidence_id must identify the successful REA result that supports its claim. Copy confidence and authority from that result's Evidence envelope.",
//     ...descriptions,
//   ].join("\n");
// };
export const _l = 140;
