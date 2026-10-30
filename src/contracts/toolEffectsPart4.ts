export const __stub = 1;
//   inspect_macho: nativeEvidence,
//   inspect_signature: nativeEvidence,
//   inspect_plist: nativeEvidence,
//   list_architectures: nativeEvidence,
//   demangle_swift: nativeEvidence,
//   inspect_artifact: effects({
//     mutatesSession: true,
//     launchesProcess: true,
//     writesFilesystem: true,
//   }),
//   extract_artifact: effects({
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//     idempotent: false,
//   }),
//   decode_interface_builder: evidence,
//   inspect_asset_catalog: nativeEvidence,
//   inspect_keyed_archive: evidence,
//   trace_dylib_resolution: evidence,
//   inspect_managed_artifact: evidence,
//   inspect_managed_members: evidence,
//   inspect_managed_native_boundaries: evidence,
//   compare_managed_members: sessionEvidence,
//   verify_managed_native_boundaries: sessionEvidence,
//   import_managed_reconstruction: sessionEvidence,
//   project_managed_application_graph: sessionEvidence,
//   list_browser_targets: browserEvidence,
//   inspect_web_page: browserEvidence,
//   analyze_web_bundle: browserEvidence,
//   observe_web_session: browserEvidence,
//   discover_webmcp_tools: browserEvidence,
//   compare_web_captures: sessionEvidence,
//   capture_web_screenshot: browserEvidence,
//   compare_web_screenshots: sessionEvidence,
//   capture_browser_scenario: effects({
//     mutatesTarget: true,
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//     accessesNetwork: true,
//     changesUiState: true,
//     mayDiscardData: true,
//     executesForeignCode: true,
//     idempotent: false,
//   }),
//   list_electron_targets: browserEvidence,
//   inspect_electron_page: browserEvidence,
//   capture_electron_scenario: effects({
//     mutatesTarget: true,
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//     accessesNetwork: true,
//     changesUiState: true,
//     mayDiscardData: true,
//     executesForeignCode: true,
//     idempotent: false,
//   }),
//   list_javascript_runtime_targets: browserEvidence,
//   observe_javascript_runtime: browserEvidence,
//   analyze_javascript_application: effects({
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//   }),
//   inspect_electron_fuses: evidence,
//   export_web_scripts: effects({
//     mutatesSession: true,
//     writesFilesystem: true,
//     idempotent: false,
//   }),
//   reconcile_javascript_runtime: evidence,
//   recover_javascript_sources: effects({
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//     idempotent: false,
//   }),
//   trace_application_feature: evidence,
//   trace_javascript_semantics: evidence,
//   compare_application_versions: evidence,
//   compare_source_to_bundle: evidence,
//   compare_javascript_export_shapes: evidence,
//   build_reconstruction_obligation_ledger: evidence,
//   evaluate_reconstruction_coverage: effects(),
//   project_android_application_graph: evidence,
//   project_apple_application_graph: evidence,
//   project_harmony_application_graph: evidence,
//   open_binary: effects({ mutatesSession: true, launchesProcess: true }),
//   close_binary: effects({
//     mutatesSession: true,
//     writesFilesystem: true,
//     mayDiscardData: true,
//     idempotent: false,
//   }),
//   binary_session: effects({ launchesProcess: true }),
//   export_evidence_bundle: effects({
//     writesFilesystem: true,
//     mayDiscardData: true,
//   }),
//   get_evidence_bundle: effects(),
//   get_navigation_context: effects({ mutatesSession: true }),
//   inspect_address_context: effects({ mutatesSession: true }),
//   import_evidence_bundle: effects({ mutatesSession: true }),
//   capture_process_scenario: effects({
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//     accessesNetwork: true,
//     executesForeignCode: true,
//     idempotent: false,
//   }),
//   compare_process_captures: sessionEvidence,
//   compare_artifacts: sessionEvidence,
//   compare_wasm_interfaces: sessionEvidence,
//   compare_functions: sessionEvidence,
//   compare_bundles: effects({ mutatesSession: true }),
//   find_changed_behavior: sessionEvidence,
//   build_call_path: sessionEvidence,
//   correlate_static_and_runtime: sessionEvidence,
//   verify_reconstruction: sessionEvidence,
//   list_unknowns: effects(),
//   record_unknown: effects({ mutatesSession: true, idempotent: false }),
//   update_unknown: effects({ mutatesSession: true, idempotent: false }),
//   verify_unknown_resolution: effects(),
// };
//
// /** Derive MCP annotations without tool-name or tool-family heuristics. */
// export const annotationsFromEffects = (
//   value: ToolEffects,
// ): DerivedToolAnnotations => ({
//   readOnlyHint: !(
//     value.mutatesTarget ||
//     value.mutatesSession ||
//     value.writesFilesystem ||
//     value.launchesProcess ||
//     value.accessesNetwork ||
//     value.changesUiState ||
//     value.mayDiscardData ||
//     value.executesForeignCode ||
//     value.mutatesDevice
//   ),
//   // MCP defines destructive as possibly non-additive changes to the
//   // environment. Running foreign code or changing a device cannot be bounded
//   // to additive effects, so either one is destructive even without data loss.
//   destructiveHint:
//     value.mayDiscardData || value.executesForeignCode || value.mutatesDevice,
//   idempotentHint: value.idempotent,
//   openWorldHint: value.launchesProcess || value.accessesNetwork,
// });
//
// /**
//  * Tools whose results, successful or failed, carry only REA-authored session
//  * state or caller-supplied values, never text originating from an analysis
//  * target, a provider, a launcher or a device. Every other tool can return
//  * such text (strings, symbols, code, page text, scripts, captures, logs, file
//  * listings, provider diagnostics or captured process output), so a newly
//  * added tool is marked untrusted until it is audited into this set. A tool
//  * stays out when any error path can project external process output, as
//  * close_binary (provider cleanup diagnostics), binary_session (provider
//  * failure reasons and availability diagnostics) and the adb and apktool
//  * client probes (version output and stderr excerpts) can.
//  */
// export const TARGET_CONTENT_FREE_TOOLS: ReadonlySet<string> = new Set([
//   "export_evidence_bundle",
//   "record_unknown",
// ]);
//
// /**
//  * Whether results of the named tool, successful or failed, can carry text that
//  * originates from the analysis target. Unknown names are treated as target
//  * content so an unaudited path never loses the untrusted marker.
//  */
// export const toolReturnsTargetContent = (name: string): boolean =>
//   !TARGET_CONTENT_FREE_TOOLS.has(name);
//
// /** Resolve the audited metadata for one public tool. */
// export const toolContractMetadata = (name: string) => {
//   const audited = TOOL_EFFECTS[name];
//   if (audited === undefined)
//     throw new Error(`Missing effect audit for ${name}`);
//   return {
//     title: name
//       .split("_")
//       .map((word) => word[0]?.toUpperCase() + word.slice(1))
//       .join(" "),
//     effects: audited,
//     annotations: annotationsFromEffects(audited),
//     returnsTargetContent: toolReturnsTargetContent(name),
//   };
// };
export const _l = 192;
