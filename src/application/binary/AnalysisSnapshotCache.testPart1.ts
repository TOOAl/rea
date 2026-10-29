export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import { createAnalysisProfile } from "../../domain/analysisProfile.js";
// import type { RelationshipCoverage } from "../../domain/relationshipCoverage.js";
// import {
//   ANALYSIS_SNAPSHOT_PROFILE,
//   ANALYSIS_SNAPSHOT_PROVIDER,
//   ANALYSIS_SNAPSHOT_TARGET,
// } from "../../domain/analysisSnapshot.fixture.js";
// import { createEvidence } from "../../domain/evidence.js";
// import { createEvidenceBundle } from "../../domain/evidenceBundle.js";
// import { ok } from "../../domain/result.js";
// import { createAnalysisExecution } from "../AnalysisProvider.js";
// import {
//   createAnalysisSnapshotWorkflowEntry,
//   parseAnalysisSnapshot,
//   serializeAnalysisSnapshot,
//   snapshotEvidenceForQuery,
//   snapshotBinding,
//   snapshotTarget,
// } from "../../domain/analysisSnapshot.js";
// import {
//   REA_WORKFLOW_PROVIDER,
//   workflowAnalysisProfile,
// } from "../InvestigationProviders.js";
// import type {
//   AnalysisOperation,
//   CapabilityDescriptor,
// } from "../AnalysisProvider.js";
// import {
//   AnalysisSnapshotCache,
//   SNAPSHOT_CACHE_ENTRY_CEILING,
//   isSnapshotCacheable,
// } from "./AnalysisSnapshotCache.js";
// import { enhancedOutputSchemas } from "../../contracts/toolOutputSchemaGroups.js";
//
// it("exports independent nested query, workflow and Evidence payloads", () => {
//   const cache = new AnalysisSnapshotCache();
//   const target = ANALYSIS_SNAPSHOT_TARGET;
//   const profile = ANALYSIS_SNAPSHOT_PROFILE;
//   const result = { nested: [{ text: "ret" }], name: "main" };
//   const parameters = { address: "0x1000", document: "fixture" };
//   const workflowProfile = workflowAnalysisProfile(profile);
//   cache.record({
//     target,
//     profile,
//     operation: "procedure_info",
//     parameters,
//     execution: createAnalysisExecution(result, ANALYSIS_SNAPSHOT_PROVIDER, {
//       subject: target,
//       analysisProfile: profile,
//       rawResult: result,
//     }),
//   });
//   cache.recordWorkflow({
//     target,
//     profile,
//     operation: "analyze_function",
//     parameters,
//     execution: {
//       ...createAnalysisExecution(result, REA_WORKFLOW_PROVIDER, {
//         subject: target,
//         rawResult: result,
//       }),
//       analysisProfile: workflowProfile,
//     },
//   });
//   const bundle = createEvidenceBundle([
//     createEvidence(target, ANALYSIS_SNAPSHOT_PROVIDER, {
//       operation: "procedure_info",
//       parameters,
//       result,
//       rawResult: result,
//       analysisProfile: profile,
//     }),
//     createEvidence(target, REA_WORKFLOW_PROVIDER, {
//       operation: "analyze_function",
//       confidence: "derived",
//       parameters,
//       result,
//       rawResult: result,
//       analysisProfile: workflowProfile,
//     }),
//   ]);
//   const exported = cache.export(target, profile, bundle);
//   if (!exported.ok) throw exported.error;
//   const expected = serializeAnalysisSnapshot(exported.value);
//   const changed = JSON.stringify(exported.value).replaceAll(
//     '"ret"',
//     '"changed"',
//   );
//   // Mutate the returned graph itself, including every duplicated JSON result.
//   for (const payload of [
//     ...exported.value.entries.flatMap(({ execution }) => [
//       execution.result,
//       execution.raw_result,
//     ]),
//     ...exported.value.workflow_entries.flatMap(({ execution }) => [
//       execution.result,
//       execution.raw_result,
//     ]),
//     ...exported.value.evidence_bundle.records.flatMap((record) => [
//       record.normalized_result,
//       record.raw_result,
//     ]),
//   ]) {
//     if (
//       typeof payload !== "object" ||
//       payload === null ||
//       Array.isArray(payload)
//     )
//       throw new Error("Expected nested fixture result");
//     Reflect.set(payload, "nested", [{ text: "changed" }]);
//   }
//   expect(JSON.stringify(exported.value)).toBe(changed);
//   const fresh = cache.export(target, profile, bundle);
//   if (!fresh.ok) throw fresh.error;
//   expect(serializeAnalysisSnapshot(fresh.value)).toBe(expected);
// });
//
// it("rebinds replayed target subjects while preserving child artifact subjects", () => {
//   const cache = new AnalysisSnapshotCache();
//   const target = ANALYSIS_SNAPSHOT_TARGET;
//   const profile = ANALYSIS_SNAPSHOT_PROFILE;
//   const relocatedTarget = { ...target, path: "/tmp/relocated-app" };
//   const parameters = { address: "0x1000" };
//   const locations = [{ kind: "address" as const, address: "0x1000" }];
//   cache.record({
//     target,
//     profile,
//     operation: "procedure_info",
//     parameters,
//     execution: createAnalysisExecution(
//       { name: "main" },
//       ANALYSIS_SNAPSHOT_PROVIDER,
//       {
//         subject: target,
//         rawResult: { provider: "raw" },
//         locations,
//         analysisProfile: profile,
//       },
//     ),
//   });
//
//   const replayedTarget = cache.lookup(
//     relocatedTarget,
//     profile,
//     "procedure_info",
//     parameters,
//   );
//   expect(replayedTarget?.subject?.path).toBe(relocatedTarget.path);
//   expect(replayedTarget?.rawResult).toEqual({ provider: "raw" });
//   expect(replayedTarget?.locations).toEqual(locations);
//
//   const childSubject = {
//     path: "/tmp/child.zip",
//     sha256: "b".repeat(64),
//     format: "zip" as const,
//   };
//   const childParameters = { address: "0x2000" };
//   cache.record({
//     target,
//     profile,
//     operation: "procedure_info",
//     parameters: childParameters,
//     execution: createAnalysisExecution(
//       { name: "child" },
//       ANALYSIS_SNAPSHOT_PROVIDER,
//       { subject: childSubject, analysisProfile: profile },
//     ),
//   });
//   expect(
//     cache.lookup(relocatedTarget, profile, "procedure_info", childParameters)
//       ?.subject,
//   ).toMatchObject(childSubject);
// });
//
// describe("analysis snapshot cache capacity", () => {
//   it("shares capacity across query kinds while allowing replacements and fresh partitions", () => {
//     const cache = new AnalysisSnapshotCache();
//     const target = ANALYSIS_SNAPSHOT_TARGET;
//     const profile = ANALYSIS_SNAPSHOT_PROFILE;
export const _l = 182;
