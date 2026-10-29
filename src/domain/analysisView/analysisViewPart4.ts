export const __stub = 1;
//       "view_digest"
//     >
//   | Omit<
//       Extract<AnalysisViewResult, { readonly kind: "summary" }>,
//       "view_digest"
//     >
//   | Omit<Extract<AnalysisViewResult, { readonly kind: "facet" }>, "view_digest">
//   | Omit<Extract<AnalysisViewResult, { readonly kind: "item" }>, "view_digest">
//   | Omit<Extract<AnalysisViewResult, { readonly kind: "page" }>, "view_digest">
//   | Omit<
//       Extract<AnalysisViewResult, { readonly kind: "javascript" }>,
//       "view_digest"
//     >
//   | Omit<
//       Extract<AnalysisViewResult, { readonly kind: "native" }>,
//       "view_digest"
//     >
//   | Omit<
//       Extract<AnalysisViewResult, { readonly kind: "inventory" }>,
//       "view_digest"
//     >
//   | Omit<Extract<AnalysisViewResult, { readonly kind: "wasm" }>, "view_digest">
//   | Omit<Extract<AnalysisViewResult, { readonly kind: "macho" }>, "view_digest">
//   | Omit<
//       Extract<AnalysisViewResult, { readonly kind: "interface-builder" }>,
//       "view_digest"
//     >
//   | Omit<Extract<AnalysisViewResult, { readonly kind: "evm" }>, "view_digest">
//   | Omit<Extract<AnalysisViewResult, { readonly kind: "qlog" }>, "view_digest">
//   | Omit<Extract<AnalysisViewResult, { readonly kind: "pcap" }>, "view_digest">
//   | Omit<
//       Extract<AnalysisViewResult, { readonly kind: "capture" }>,
//       "view_digest"
//     >
//   | Omit<
//       Extract<AnalysisViewResult, { readonly kind: "managed" }>,
//       "view_digest"
//     >
//   | Omit<
//       Extract<AnalysisViewResult, { readonly kind: "managed-members" }>,
//       "view_digest"
//     >
//   | Omit<
//       Extract<AnalysisViewResult, { readonly kind: "android" }>,
//       "view_digest"
//     >
//   | Omit<
//       Extract<AnalysisViewResult, { readonly kind: "dart-aot" }>,
//       "view_digest"
//     >;
//
// /** Attach the content digest that must change when projected bytes change. */
// export const sealAnalysisView = (
//   projection: UnsignedAnalysisView,
// ): AnalysisViewResult =>
//   analysisViewResultSchema.parse({
//     ...projection,
//     view_digest: digestCanonicalValue(projection, "Analysis view"),
//   });
//
// const parentDigest = (evidenceId: string): string => evidenceId.slice(3);
//
// const parseJavaScriptParent = (
//   input: unknown,
// ): Result<JavaScriptApplicationAnalysisResult, AnalysisError> => {
//   try {
//     // Only the existing realm-private graph proofs permit reuse. Imported or
//     // merely frozen graphs still receive full canonical validation.
//     const steps = parseOwnedJavaScriptApplicationAnalysisSteps(input);
//     let step = steps.next();
//     while (!step.done) step = steps.next();
//     return ok(step.value);
//   } catch (cause: unknown) {
//     if (!(cause instanceof z.ZodError)) throw cause;
//     return err(
//       analysisInputErrorFromIssues(
//         INSPECT_ANALYSIS_VIEW_OPERATION,
//         cause.issues.map((issue) => ({
//           ...issue,
//           path: ["source", "normalized_result", ...issue.path],
//         })),
//         { source: { normalized_result: input } },
//         { cause },
//       ),
//     );
//   }
// };
//
// const unsupportedParent = (
//   parent: AnalysisViewParent,
// ): AnalysisUnsupportedTargetError =>
//   new AnalysisUnsupportedTargetError(
//     INSPECT_ANALYSIS_VIEW_OPERATION,
//     parentArtifactPath(parent),
//     `Parent Evidence operation ${JSON.stringify(parent.operation)} does not support analysis views. Use completed binary layout, JavaScript application, native function, artifact inventory/inspection, WASM, Mach-O, Interface Builder, EVM, managed artifact or member, Android package, Dart AOT, or web network capture Evidence.`,
//   );
//
// const parentArtifactPath = (parent: AnalysisViewParent): string => {
//   if (
//     typeof parent.normalizedResult === "object" &&
//     parent.normalizedResult !== null &&
//     "artifact" in parent.normalizedResult &&
//     typeof parent.normalizedResult.artifact === "object" &&
//     parent.normalizedResult.artifact !== null &&
//     "path" in parent.normalizedResult.artifact &&
//     typeof parent.normalizedResult.artifact.path === "string"
//   )
//     return parent.normalizedResult.artifact.path;
//   if (
//     typeof parent.normalizedResult === "object" &&
//     parent.normalizedResult !== null &&
//     "input_path" in parent.normalizedResult &&
//     typeof parent.normalizedResult.input_path === "string"
//   )
//     return parent.normalizedResult.input_path;
//   return parent.evidenceId;
// };
//
// /** Named source owners for views that need no extra decoder or accumulator. */
// const retainedViewProjectors = new Map<string, typeof projectWasmArtifactView>([
//   ["inspect_wasm_artifact", projectWasmArtifactView],
//   ["inspect_macho", projectMachoView],
//   ["decode_interface_builder", projectInterfaceBuilderView],
//   ["inspect_evm_interface", projectEvmInterfaceView],
//   ["inspect_managed_artifact", projectManagedArtifactView],
//   ["inspect_managed_members", projectManagedMemberView],
//   ["inspect_android_package", projectAndroidPackageView],
//   ["inspect_dart_aot", projectDartAotView],
//   ["inspect_artifact", projectArtifactInventoryView],
//   ["inventory_artifact", projectArtifactInventoryView],
// ]);
//
// /** Project one selected view from authenticated parent analysis Evidence. */
// export const projectAnalysisView = (
//   parent: AnalysisViewParent,
//   view: AnalysisViewRequest,
//   apiSurfaceAccumulator?: WebNetworkApiSurfaceAccumulator,
// ): Result<AnalysisViewResult, AnalysisError> => {
//   const digest = parentDigest(parent.evidenceId);
//   if (!digestSchema.safeParse(digest).success)
//     return err(
//       analysisViewInputError([
//         {
//           path: ["source"],
//           reason: "invalid_format",
//           message: "Parent Evidence ID is not a digest-backed identifier.",
//         },
//       ]),
//     );
//   if (view.kind === "api-surface") {
//     const projected = projectWebNetworkApiSurfaceView(
//       parent,
//       view,
//       apiSurfaceAccumulator,
//     );
//     return projected.ok ? ok(sealAnalysisView(projected.value)) : projected;
//   }
//   if (parent.operation === "inspect_web_network_capture") {
//     const projected = projectWebNetworkCaptureView(parent, view);
//     return projected.ok ? ok(sealAnalysisView(projected.value)) : projected;
//   }
//   if (parent.operation === "inspect_pcap_capture") {
//     const projected = projectPcapCaptureView(parent, view);
//     return projected.ok ? ok(sealAnalysisView(projected.value)) : projected;
//   }
//   if (parent.operation === "inspect_binary_layout") {
//     const layout = binaryLayoutSchema.safeParse(parent.normalizedResult);
//     if (!layout.success)
//       return err(
//         analysisViewInputError([
//           {
//             path: ["source"],
//             reason: "invalid_value",
//             message:
//               "Parent Evidence result does not match inspect_binary_layout.",
//           },
//         ]),
//       );
//     const projected = projectBinaryLayoutView(parent, layout.data, view);
//     return projected.ok ? ok(sealAnalysisView(projected.value)) : projected;
//   }
//   if (parent.operation === "analyze_javascript_application") {
//     const analysis = parseJavaScriptParent(parent.normalizedResult);
//     if (!analysis.ok) return analysis;
//     const projected = projectJavaScriptApplicationView(
//       parent,
//       analysis.value,
//       view,
//     );
//     return projected.ok ? ok(sealAnalysisView(projected.value)) : projected;
//   }
//   if (parent.operation === "analyze_function") {
//     const native = functionDossierSchema.safeParse(parent.normalizedResult);
//     if (!native.success)
//       return err(
//         analysisInputErrorFromIssues(
//           INSPECT_ANALYSIS_VIEW_OPERATION,
//           native.error.issues.map((issue) => ({
//             ...issue,
//             path: ["source", "normalized_result", ...issue.path],
//           })),
//           { source: { normalized_result: parent.normalizedResult } },
//           { cause: native.error },
//         ),
//       );
//     const projected = projectNativeFunctionView(parent, native.data, view);
//     return projected.ok ? ok(sealAnalysisView(projected.value)) : projected;
//   }
//   const project = retainedViewProjectors.get(parent.operation);
//   if (project !== undefined) {
//     const projected = project(parent, view);
//     return projected.ok ? ok(sealAnalysisView(projected.value)) : projected;
//   }
//   return err(unsupportedParent(parent));
// };
export const _l = 215;
