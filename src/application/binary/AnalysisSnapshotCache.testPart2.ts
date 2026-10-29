export const __stub = 1;
//     const execution = {
//       ...createAnalysisExecution("workflow", REA_WORKFLOW_PROVIDER, {
//         subject: target,
//       }),
//       analysisProfile: workflowAnalysisProfile(profile),
//     };
//     const workflowInput = {
//       target,
//       profile,
//       operation: "trace_feature",
//       parameters: { query: "existing" },
//       execution,
//     };
//     for (let index = 0; index < SNAPSHOT_CACHE_ENTRY_CEILING - 1; index += 1)
//       cache.recordWorkflow({
//         ...workflowInput,
//         parameters: { query: String(index) },
//       });
//     // Staging and recording both spend the same budget; an existing query can
//     // still be refreshed when no space remains for a new binding.
//     const directInput = {
//       target,
//       profile,
//       operation: "address_name" as const,
//       parameters: { address: "0x1000", document: "fixture" },
//       execution: createAnalysisExecution(
//         "initial",
//         ANALYSIS_SNAPSHOT_PROVIDER,
//         { subject: target, analysisProfile: profile },
//       ),
//     };
//     cache.record(directInput);
//     cache.record({
//       ...directInput,
//       parameters: { address: "0x2000", document: "fixture" },
//     });
//     cache.recordWorkflow(workflowInput);
//     expect(cache.entries()).toHaveLength(1);
//     expect(cache.workflowEntries()).toHaveLength(
//       SNAPSHOT_CACHE_ENTRY_CEILING - 1,
//     );
//
//     cache.record({
//       ...directInput,
//       execution: { ...directInput.execution, result: "updated" },
//     });
//     cache.recordWorkflow({
//       ...workflowInput,
//       parameters: { query: "0" },
//       execution: { ...execution, result: "updated" },
//     });
//     expect(
//       cache.lookup(target, profile, "address_name", directInput.parameters)
//         ?.result,
//     ).toBe("updated");
//     expect(
//       cache.workflowEntries().find(({ parameters }) => parameters.query === "0")
//         ?.execution.result,
//     ).toBe("updated");
//
//     const incoming = createAnalysisSnapshotWorkflowEntry({
//       ...workflowInput,
//       target: snapshotTarget(target),
//       binding: snapshotBinding(profile),
//     });
//     const evidence = createEvidence(target, REA_WORKFLOW_PROVIDER, {
//       operation: workflowInput.operation,
//       confidence: "derived",
//       parameters: workflowInput.parameters,
//       result: execution.result,
//       rawResult: execution.rawResult,
//       analysisProfile: execution.analysisProfile,
//       limitations: execution.limitations,
//       locations: execution.locations,
//     });
//     cache.stage(
//       parseAnalysisSnapshot({
//         target: snapshotTarget(target),
//         binding: snapshotBinding(profile),
//         entries: [],
//         workflow_entries: [incoming],
//         evidence_bundle: createEvidenceBundle([evidence]),
//       }),
//     );
//     expect(cache.workflowEntries()).toHaveLength(
//       SNAPSHOT_CACHE_ENTRY_CEILING - 1,
//     );
//
//     const otherTarget = { ...target, sha256: "b".repeat(64) };
//     cache.recordWorkflow({
//       ...workflowInput,
//       target: otherTarget,
//       execution: { ...execution, subject: otherTarget },
//     });
//     expect(cache.entries()).toEqual([]);
//     expect(cache.workflowEntries()).toHaveLength(1);
//     cache.clear();
//     cache.record({
//       ...directInput,
//       target: otherTarget,
//       execution: { ...directInput.execution, subject: otherTarget },
//     });
//     expect(cache.entries()).toHaveLength(1);
//     expect(cache.workflowEntries()).toEqual([]);
//   });
// });
//
// describe("analysis snapshot cache policy", () => {
//   it.each<{
//     policy?: CapabilityDescriptor["cachePolicy"];
//     operation?: CapabilityDescriptor["operation"];
//     effects?: Partial<CapabilityDescriptor["effects"]>;
//     parameters?: Record<string, string>;
//     cacheable: boolean;
//   }>([
//     { cacheable: false },
//     { policy: "snapshot", cacheable: true },
//     { policy: "live", cacheable: false },
//     {
//       policy: "live",
//       effects: { mayWriteFilesystem: false },
//       cacheable: false,
//     },
//     {
//       policy: "snapshot",
//       effects: { mutatesArtifact: true },
//       cacheable: false,
//     },
//     {
//       policy: "snapshot",
//       effects: { changesPermissions: true },
//       cacheable: false,
//     },
//     { policy: "snapshot", operation: "list_documents", cacheable: false },
//     { policy: "snapshot", operation: "list_strings", cacheable: false },
//     {
//       policy: "snapshot",
//       operation: "address_name",
//       parameters: { document: "fixture" },
//       cacheable: false,
//     },
//   ])(
//     "keeps explicit cache policy within immutable and state-independent boundaries: %j",
//     ({
//       policy,
//       operation = "analyze_function",
//       effects,
//       parameters = {},
//       cacheable,
//     }) => {
//       const descriptor: CapabilityDescriptor = {
//         provider: ANALYSIS_SNAPSHOT_PROVIDER,
//         operation,
//         available: true,
//         reason: null,
//         ...(policy === undefined ? {} : { cachePolicy: policy }),
//         effects: {
//           mutatesArtifact: false,
//           launchesProcess: true,
//           mayShowUi: false,
//           mayAccessNetwork: false,
//           mayWriteFilesystem: true,
//           changesPermissions: false,
//           requiresRoot: false,
//           ...effects,
//         },
//         limitations: [],
//       };
//       expect(isSnapshotCacheable(operation, descriptor, parameters)).toBe(
//         cacheable,
//       );
//     },
//   );
// });
//
// describe("analysis snapshot cache partitioning", () => {
//   it.each<{
//     operation: Exclude<AnalysisOperation, "health">;
//     parameters: Record<string, string>;
//     cacheable: boolean;
//   }>([
//     { operation: "list_strings", parameters: {}, cacheable: false },
export const _l = 182;
