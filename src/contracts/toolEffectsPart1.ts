export const __stub = 1;
// /** Possible effects across a tool's supported inputs, including temporary work. */
// export interface ToolEffects {
//   readonly mutatesTarget: boolean;
//   /** Includes additive Evidence recording, navigation state, and unknown updates. */
//   readonly mutatesSession: boolean;
//   readonly writesFilesystem: boolean;
//   readonly launchesProcess: boolean;
//   readonly accessesNetwork: boolean;
//   readonly changesUiState: boolean;
//   /** Can overwrite, clear, or drop state that the caller cannot recover from REA. */
//   readonly mayDiscardData: boolean;
//   /**
//    * Runs or drives code REA does not own on the host: the analysis target, a
//    * caller-selected executable, or the application loaded into one. Running
//    * REA's own pinned helpers or operator-configured analysis engines does not
//    * count.
//    */
//   readonly executesForeignCode: boolean;
//   /** Changes an attached Android device: packages, files, or running apps. */
//   readonly mutatesDevice: boolean;
//   readonly idempotent: boolean;
// }
//
// /** MCP execution hints derived only from canonical effects. */
// export interface DerivedToolAnnotations {
//   readonly readOnlyHint: boolean;
//   readonly destructiveHint: boolean;
//   readonly idempotentHint: boolean;
//   readonly openWorldHint: boolean;
// }
//
// const effects = (overrides: Partial<ToolEffects> = {}): ToolEffects => ({
//   mutatesTarget: false,
//   mutatesSession: false,
//   writesFilesystem: false,
//   launchesProcess: false,
//   accessesNetwork: false,
//   changesUiState: false,
//   mayDiscardData: false,
//   executesForeignCode: false,
//   mutatesDevice: false,
//   idempotent: true,
//   ...overrides,
// });
//
// const evidence = effects({ mutatesSession: true });
// const nativeEvidence = effects({ mutatesSession: true, launchesProcess: true });
// const browserEvidence = effects({
//   mutatesSession: true,
//   accessesNetwork: true,
// });
// const sessionEvidence = effects({ mutatesSession: true });
//
// /** Explicit effect audit for every public tool. */
// export const TOOL_EFFECTS: Readonly<Record<string, ToolEffects>> = {
//   list_cutter_sessions: effects({ accessesNetwork: true }),
//   cutter_command: effects({
//     mutatesTarget: true,
//     executesForeignCode: true,
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//     accessesNetwork: true,
//     changesUiState: true,
//     idempotent: false,
//   }),
//   inspect_with_objdump: effects({
//     mutatesSession: true,
//     launchesProcess: true,
//   }),
//   start_gdb_session: effects({
//     launchesProcess: true,
//     mutatesSession: true,
//     idempotent: false,
//   }),
//   gdb_console: effects({
//     mutatesTarget: true,
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//     accessesNetwork: true,
//     executesForeignCode: true,
//     idempotent: false,
//   }),
//   gdb_session_status: effects(),
//   start_rizin_debug_session: effects({
//     mutatesTarget: true,
//     mutatesSession: true,
//     launchesProcess: true,
//     executesForeignCode: true,
//     idempotent: false,
//   }),
//   rizin_debug_command: effects({
//     mutatesTarget: true,
//     mutatesSession: true,
//     executesForeignCode: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//     accessesNetwork: true,
//     changesUiState: true,
//     mayDiscardData: true,
//     idempotent: false,
//   }),
//   rizin_debug_session_status: effects({ mutatesSession: true }),
//   close_rizin_debug_session: effects({
//     mutatesSession: true,
//     launchesProcess: true,
//     mutatesTarget: true,
//     executesForeignCode: true,
//   }),
//   close_gdb_session: effects({
//     launchesProcess: true,
//     mutatesSession: true,
//     mutatesTarget: true,
//     executesForeignCode: true,
//     idempotent: false,
//   }),
//   execute_rizin_command: effects({
//     mutatesTarget: true,
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//     accessesNetwork: true,
//     mayDiscardData: true,
//     executesForeignCode: true,
//     idempotent: false,
//   }),
//   inspect_go_binary: evidence,
//   inspect_rust_binary: evidence,
//   inspect_sqlite_database: effects({
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//   }),
//   inspect_packet_fields: effects({
//     mutatesSession: true,
//     launchesProcess: true,
//     writesFilesystem: true,
//   }),
//   inspect_packet_capture: effects({
//     mutatesSession: true,
//     launchesProcess: true,
//     writesFilesystem: true,
//   }),
//   inspect_signal_decoders: effects({
//     mutatesSession: true,
//     launchesProcess: true,
//     writesFilesystem: true,
//   }),
//   decode_signal_recording: effects({
//     mutatesSession: true,
//     launchesProcess: true,
//     writesFilesystem: true,
//   }),
//   inspect_wasm_artifact: effects({
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//   }),
//   inspect_evm_interface: effects({
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//   }),
//   inspect_web_network_capture: effects({
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//   }),
//   observe_web_execution: effects({
//     mutatesTarget: true,
//     mutatesSession: true,
//     accessesNetwork: true,
//     mayDiscardData: true,
//     idempotent: false,
//   }),
//   inspect_web_event_listeners: browserEvidence,
//   trace_web_source_location: effects({
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//   }),
//   trace_web_module_imports: effects({
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//     accessesNetwork: true,
//   }),
//   inspect_recorded_crash: effects({
//     mutatesSession: true,
//     writesFilesystem: true,
//     launchesProcess: true,
//   }),
//   inspect_binary_layout: effects({
//     mutatesSession: true,
//     writesFilesystem: true,
export const _l = 196;
