export const __stub = 1;
//         resolvedTarget === undefined
//           ? await session.open(path, openOptions)
//           : await session.openResolvedTarget(resolvedTarget, openOptions);
//       if (!opened.ok) return cliError(opened.error);
//       const evidenceProfile = analysisProfileForEvidence(session, tool);
//       const { output, evidence } = await executeAnalysisTool({
//         session,
//         openedTarget: opened.value,
//         tool,
//         arguments: arguments_,
//         signal,
//         evidenceProfile,
//       });
//       if (evidence !== undefined) {
//         const recorded = session.recordEvidence(evidence);
//         if (!recorded.ok)
//           return cliError(recorded.error.retainPartialObservation(evidence));
//         if (isWorkflowEvidenceTool(tool)) {
//           const unknowns = recordWorkflowUnknowns({
//             name: tool,
//             result: evidence.normalized_result,
//             evidenceId: evidence.evidence_id,
//             recordUnknown: (unknown) => session.recordUnknown(unknown),
//           });
//           if (!unknowns.ok)
//             return cliError(unknowns.error.retainPartialObservation(evidence));
//         }
//       }
//       if (
//         isWorkflowEvidenceTool(tool) &&
//         tool !== "trace_native_ui_action" &&
//         snapshotPath !== undefined &&
//         evidence !== undefined &&
//         session.allowsSnapshotReplay(tool)
//       ) {
//         const workflowRecord = workflowSnapshotRecord(evidence, tool);
//         if (workflowRecord !== undefined) {
//           const recorded = session.recordWorkflowSnapshot(workflowRecord);
//           if (!recorded.ok)
//             return cliError(recorded.error.retainPartialObservation(evidence));
//         }
//       }
//       if (
//         tool !== "trace_native_ui_action" &&
//         snapshotPath !== undefined &&
//         evidence !== undefined
//       ) {
//         const snapshot = session.exportAnalysisSnapshot();
//         if (!snapshot.ok)
//           return cliError(snapshot.error.retainPartialObservation(evidence));
//         const written = await session.writeAnalysisSnapshot(
//           snapshot.value,
//           snapshotPath,
//           true,
//         );
//         if (!written.ok) {
//           const recovered =
//             written.error instanceof EvidenceFileError &&
//             written.error.published !== undefined &&
//             (await session.closeWriteResources()).ok;
//           if (!recovered)
//             return cliError(written.error.retainPartialObservation(evidence));
//         }
//       }
//       return output;
//     },
//     directAnalysisCleanupFailure,
//   );
// };
//
// const executeAnalysisTool = async (input: {
//   readonly session: BinarySession;
//   readonly openedTarget: BinaryTarget;
//   readonly tool:
//     | NativeToolName
//     | ArtifactAnalysisOperation
//     | ManagedToolName
//     | DirectAnalysisTool;
//   readonly arguments: Readonly<Record<string, JsonValue>>;
//   readonly signal: AbortSignal;
//   readonly evidenceProfile: AnalysisProfileCommitment | undefined;
// }): Promise<{ readonly output: JsonValue; readonly evidence?: Evidence }> => {
//   const { session, tool, signal, evidenceProfile } = input;
//   if (tool === "analyze_function") {
//     const { executeFunctionAnalysisEvidence } =
//       await import("./FunctionAnalysisEvidence.js");
//     const result = await executeFunctionAnalysisEvidence(
//       session,
//       input.arguments,
//       input.openedTarget,
//       { signal },
//     );
//     return result.ok
//       ? { output: result.value, evidence: result.value }
//       : { output: cliError(result.error) };
//   }
//   if (
//     tool === "binary_overview" ||
//     tool === "inspect_native_api" ||
//     tool === "inspect_native_dispatch_metadata" ||
//     tool === "trace_feature" ||
//     tool === "trace_native_values" ||
//     tool === "trace_native_ui_action"
//   ) {
//     const { EnhancedTools } = await import("./EnhancedTools.js");
//     const result = await executeComposedWorkflow(session, (observed) =>
//       new EnhancedTools(observed).execute(tool, input.arguments, signal),
//     );
//     if (!result.ok) return { output: cliError(result.error) };
//     const evidence = createWorkflowEvidence({
//       target: input.openedTarget,
//       operation: tool,
//       parameters: input.arguments,
//       result: result.value.result,
//       upstreamProfile: evidenceProfile,
//       upstreamLimitations: result.value.limitations,
//     });
//     return { output: evidence, evidence };
//   }
//   let result = await session.execute(tool, input.arguments, { signal });
//   if (
//     tool === "xrefs" &&
//     typeof input.arguments.address === "string" &&
//     !result.ok &&
//     result.error instanceof AnalysisInputError &&
//     !result.error.cleanupIncomplete &&
//     result.error.issues.length > 0 &&
//     result.error.issues.every(
//       ({ path, reason }) =>
//         path.length === 1 &&
//         path[0] === "address" &&
//         reason === "invalid_format",
//     )
//   ) {
//     const address = await resolveXrefsAddress(
//       session,
//       input.arguments.address,
//       signal,
//     );
//     if (!address.ok) return { output: cliError(address.error) };
//     if (address.value !== input.arguments.address)
//       result = await session.execute(
//         tool,
//         { ...input.arguments, address: address.value },
//         { signal },
//       );
//   }
//   if (!result.ok) return { output: cliError(result.error) };
//   const evidence = createEvidence(
//     result.value.subject ?? input.openedTarget,
//     result.value.provider,
//     {
//       operation: tool,
//       parameters: input.arguments,
//       result: result.value.result,
//       ...(result.value.analysisProfile === undefined
//         ? {}
//         : { analysisProfile: result.value.analysisProfile }),
//       rawResult: result.value.rawResult,
//       limitations: result.value.limitations,
//       ...(result.value.relationshipCoverage === undefined
export const _l = 161;
