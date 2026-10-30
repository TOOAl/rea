export const __stub = 1;
//     {
//       operation: "list_strings",
//       parameters: { document: "fixture" },
//       cacheable: true,
//     },
//     {
//       operation: "address_name",
//       parameters: { document: "fixture" },
//       cacheable: false,
//     },
//     {
//       operation: "address_name",
//       parameters: { document: "fixture", address: "0x1000" },
//       cacheable: true,
//     },
//     { operation: "binary_overview", parameters: {}, cacheable: true },
//   ])(
//     "retains explicit document and cursor requirements for $operation",
//     ({ operation, parameters, cacheable }) => {
//       const descriptor: CapabilityDescriptor = {
//         operation,
//         provider: ANALYSIS_SNAPSHOT_PROVIDER,
//         available: true,
//         reason: null,
//         effects: {
//           mutatesArtifact: false,
//           launchesProcess: false,
//           mayShowUi: false,
//           mayAccessNetwork: false,
//           mayWriteFilesystem: false,
//           changesPermissions: false,
//           requiresRoot: false,
//         },
//         limitations: [],
//       };
//       expect(isSnapshotCacheable(operation, descriptor, parameters)).toBe(
//         cacheable,
//       );
//     },
//   );
//
//   it("returns detached data only from the exact provider/profile partition", () => {
//     const cache = new AnalysisSnapshotCache();
//     const execution = createAnalysisExecution(
//       "main",
//       ANALYSIS_SNAPSHOT_PROVIDER,
//       {
//         analysisProfile: ANALYSIS_SNAPSHOT_PROFILE,
//         rawResult: "main",
//         subject: {
//           path: ANALYSIS_SNAPSHOT_TARGET.path,
//           sha256: ANALYSIS_SNAPSHOT_TARGET.sha256,
//           format: ANALYSIS_SNAPSHOT_TARGET.format,
//           ...(ANALYSIS_SNAPSHOT_TARGET.architecture === undefined
//             ? {}
//             : { architecture: ANALYSIS_SNAPSHOT_TARGET.architecture }),
//         },
//       },
//     );
//     cache.record({
//       target: ANALYSIS_SNAPSHOT_TARGET,
//       profile: ANALYSIS_SNAPSHOT_PROFILE,
//       operation: "address_name",
//       parameters: { address: "0x1000", document: "fixture" },
//       execution,
//     });
//     const evidence = createEvidence(
//       ANALYSIS_SNAPSHOT_TARGET,
//       ANALYSIS_SNAPSHOT_PROVIDER,
//       {
//         operation: "address_name",
//         parameters: { address: "0x1000", document: "fixture" },
//         result: "main",
//         rawResult: "main",
//         analysisProfile: ANALYSIS_SNAPSHOT_PROFILE,
//       },
//     );
//     const exported = cache.export(
//       ANALYSIS_SNAPSHOT_TARGET,
//       ANALYSIS_SNAPSHOT_PROFILE,
//       createEvidenceBundle([evidence]),
//     );
//     if (!exported.ok) throw exported.error;
//     const tampered = structuredClone(exported.value);
//     const tamperedEntry = tampered.entries[0];
//     if (tamperedEntry === undefined)
//       throw new Error("exported snapshot entry missing");
//     tamperedEntry.execution.result = "changed without Evidence";
//     let mergedEvidence = false;
//     expect(
//       new AnalysisSnapshotCache().import(tampered, undefined, () => {
//         mergedEvidence = true;
//         return ok(0);
//       }).ok,
//     ).toBe(false);
//     expect(mergedEvidence).toBe(false);
//     const entry = exported.value.entries[0];
//     if (entry === undefined) throw new Error("exported snapshot entry missing");
//     Reflect.set(entry.execution, "provider", {
//       id: "forged",
//       name: "Forged",
//       version: "9",
//     });
//     entry.execution.limitations.push("forged");
//
//     expect(
//       cache.lookup(
//         ANALYSIS_SNAPSHOT_TARGET,
//         ANALYSIS_SNAPSHOT_PROFILE,
//         "address_name",
//         { address: "0x1000", document: "fixture" },
//       ),
//     ).toMatchObject({
//       provider: ANALYSIS_SNAPSHOT_PROVIDER,
//       analysisProfile: ANALYSIS_SNAPSHOT_PROFILE,
//       limitations: [expect.stringContaining("local REA analysis snapshot")],
//     });
//     const changedProfile = createAnalysisProfile(ANALYSIS_SNAPSHOT_PROVIDER, {
//       loader: "configured-override",
//     });
//     expect(
//       cache.lookup(ANALYSIS_SNAPSHOT_TARGET, changedProfile, "address_name", {
//         address: "0x1000",
//         document: "fixture",
//       }),
//     ).toBeUndefined();
//     const changedProviderProfile = createAnalysisProfile(
//       { id: "other", name: "Other", version: "1" },
//       { loader: "mach-o-arm64" },
//     );
//     expect(
//       cache.lookup(
//         ANALYSIS_SNAPSHOT_TARGET,
//         changedProviderProfile,
//         "address_name",
//         { address: "0x1000", document: "fixture" },
//       ),
//     ).toBeUndefined();
//   });
// });
//
// const createRelationshipCoverageSnapshot = (
//   relationshipCoverage?: RelationshipCoverage,
// ) => {
//   const operation = "procedure_callees" as const;
//   const parameters = { procedure: "0x1000", document: "fixture" };
//   const cache = new AnalysisSnapshotCache();
//   const execution = createAnalysisExecution(
//     ["0x2000"],
//     ANALYSIS_SNAPSHOT_PROVIDER,
//     {
//       analysisProfile: ANALYSIS_SNAPSHOT_PROFILE,
//       rawResult: ["0x2000"],
//       subject: ANALYSIS_SNAPSHOT_TARGET,
//       ...(relationshipCoverage === undefined ? {} : { relationshipCoverage }),
//     },
//   );
//   cache.record({
//     target: ANALYSIS_SNAPSHOT_TARGET,
//     profile: ANALYSIS_SNAPSHOT_PROFILE,
//     operation,
//     parameters,
//     execution,
//   });
//   const evidence = createEvidence(
//     ANALYSIS_SNAPSHOT_TARGET,
//     ANALYSIS_SNAPSHOT_PROVIDER,
//     {
//       operation,
//       parameters,
//       result: ["0x2000"],
//       rawResult: ["0x2000"],
//       analysisProfile: ANALYSIS_SNAPSHOT_PROFILE,
//       ...(relationshipCoverage === undefined ? {} : { relationshipCoverage }),
//     },
//   );
//   const exported = cache.export(
//     ANALYSIS_SNAPSHOT_TARGET,
//     ANALYSIS_SNAPSHOT_PROFILE,
//     createEvidenceBundle([evidence]),
//   );
//   if (!exported.ok) throw exported.error;
export const _l = 182;
