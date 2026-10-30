export const __stub = 1;
//   readonly bridge_directory: string;
//   readonly discovery_status:
//     | "sessions_found"
//     | "no_live_bridge_found"
//     | "bridge_directory_unavailable"
//     | "bridge_directory_insecure"
//     | "bridge_directory_capacity_exceeded";
//   readonly bridge_directory_security:
//     | "private_verified"
//     | "not_private"
//     | "unverified_platform_acl"
//     | "not_checked";
// }
//
// /** Discovers and communicates with REA Python bridge plugins in live Cutter processes. */
// export class CutterBridgeClient {
//   readonly #directory: string;
//   readonly #platform: NodeJS.Platform;
//   readonly #windowsPrivateReader: WindowsCutterDescriptorReader | undefined;
//   readonly #pendingAcknowledgements = new Map<string, Set<string>>();
//
//   constructor(
//     environment: Readonly<NodeJS.ProcessEnv> = process.env,
//     options: CutterBridgeClientOptions = {},
//   ) {
//     const configured = environment.REA_CUTTER_BRIDGE_DIR;
//     const localAppData = environment.LOCALAPPDATA;
//     this.#platform = options.platform ?? process.platform;
//     this.#windowsPrivateReader =
//       options.windowsPrivateReader ??
//       (this.#platform === "win32"
//         ? {
//             verifyDirectory: (directory) =>
//               z
//                 .object({ privateDacl: z.literal(true) })
//                 .safeParse(
//                   requireWindowsNativeAuthority().call(
//                     "cutter_bridge_verify_directory",
//                     [directory],
//                   ),
//                 ).success,
//             readDescriptor: (directory, name, maxBytes) =>
//               z
//                 .instanceof(Buffer)
//                 .parse(
//                   requireWindowsNativeAuthority().call(
//                     "cutter_bridge_read_descriptor",
//                     [directory, name, maxBytes],
//                   ),
//                 ),
//           }
//         : undefined);
//     this.#directory = resolveBridgeDirectory(
//       configured,
//       this.#platform,
//       localAppData,
//       homeDirectoryFromEnvironment(environment, this.#platform),
//     );
//   }
//
//   async listSessions(): Promise<CutterBridgeDiscovery> {
//     const loaded = await this.#readDescriptors();
//     if (loaded.error !== undefined)
//       return {
//         sessions: [],
//         bridge_directory: this.#directory,
//         discovery_status: loaded.error,
//         bridge_directory_security: loaded.security,
//       };
//     const descriptors = await mapDiscovery(
//       loaded.descriptors,
//       async (descriptor) => {
//         try {
//           const status = responseSchema.safeParse(
//             await this.#request(
//               descriptor,
//               serializeRequest(descriptor, {
//                 kind: "status",
//                 session_id: descriptor.session_id,
//               }),
//             ),
//           );
//           if (
//             !status.success ||
//             !status.data.ok ||
//             status.data.session_id !== descriptor.session_id
//           )
//             return undefined;
//           return {
//             session_id: descriptor.session_id,
//             pid: descriptor.pid,
//             document_generation:
//               status.data.document_generation ?? descriptor.document_generation,
//             current_file:
//               status.data.current_file === undefined
//                 ? descriptor.current_file
//                 : status.data.current_file,
//             cutter_version:
//               status.data.cutter_version ?? descriptor.cutter_version,
//             identity_status: "partial" as const,
//           };
//         } catch {
//           return undefined;
//         }
//       },
//     );
//     const sessions = descriptors.filter(
//       (value): value is CutterBridgeSession => value !== undefined,
//     );
//     return {
//       sessions,
//       bridge_directory: this.#directory,
//       discovery_status:
//         sessions.length > 0 ? "sessions_found" : "no_live_bridge_found",
//       bridge_directory_security: loaded.security,
//     };
//   }
//
//   async execute(input: {
//     readonly sessionId: string;
//     readonly expectedGeneration: number;
//     readonly command: string;
//     readonly json: boolean;
//     readonly signal?: AbortSignal;
//   }): Promise<CutterBridgeExecution> {
//     input.signal?.throwIfAborted();
//     const descriptor = await this.#find(input.sessionId);
//     input.signal?.throwIfAborted();
//     const requestId = randomUUID();
//     const commandRequest = serializeRequest(descriptor, {
//       kind: "command",
//       request_id: requestId,
//       expected_generation: input.expectedGeneration,
//       command: input.command,
//       json: input.json,
//     });
//     await this.#recoverCompletedCommands(descriptor, input.signal);
//     await this.#retryPendingAcknowledgements(descriptor);
//     input.signal?.throwIfAborted();
//     let completionToken: string | undefined;
//     let rawResponse: unknown;
//     try {
//       rawResponse = await this.#request(
//         descriptor,
//         commandRequest,
//         input.signal,
//         (ordinal) => {
//           completionToken = ordinal;
//         },
//       );
//     } catch (cause) {
//       if (!(cause instanceof CutterBridgeRequestFailure) || !cause.requestSent)
//         throw cause;
//       return {
//         requestId,
//         output: null,
//         currentFile: descriptor.current_file,
//         documentGeneration: input.expectedGeneration,
//         identityStatus: "partial",
//         cutterVersion: descriptor.cutter_version,
//         executionState: "unknown",
//         error: "transport-response-missing",
//         message: `${cause.message}; the command may have completed; do not retry automatically`,
//         outputTruncated: false,
//         ...(completionToken === undefined ? {} : { completionToken }),
//       };
//     }
//     const parsed = responseSchema.safeParse(rawResponse);
//     if (!parsed.success)
//       return {
//         requestId,
//         output: null,
//         currentFile: descriptor.current_file,
//         documentGeneration: input.expectedGeneration,
//         identityStatus: "partial",
//         cutterVersion: descriptor.cutter_version,
//         executionState: "unknown",
//         error: "malformed-bridge-response",
//         message:
//           "Cutter may have completed the command, but its response was invalid; do not retry automatically",
//         outputTruncated: false,
//         ...(completionToken === undefined ? {} : { completionToken }),
//       };
//     const response = parsed.data;
//     const executionState: CutterBridgeExecutionState = response.ok
//       ? response.execution_state === undefined ||
//         response.execution_state === "complete"
//         ? "complete"
//         : response.execution_state === "not_started"
//           ? "not_started"
//           : "unknown"
//       : response.execution_state === "failed"
//         ? "failed"
//         : response.execution_state === "not_started"
//           ? "not_started"
//           : "unknown";
//     if (executionState !== "unknown")
//       await this.#acknowledgeCompletion(descriptor, requestId);
//     if (response.error === "active-document-generation-changed")
//       throw new Error(
//         "Cutter's active document generation changed. List sessions again and select the current generation.",
//       );
//     return {
//       requestId,
//       output: response.output ?? null,
//       currentFile:
//         response.current_file === undefined
//           ? descriptor.current_file
//           : response.current_file,
//       documentGeneration:
//         response.document_generation ?? input.expectedGeneration,
//       identityStatus: "partial",
//       cutterVersion: response.cutter_version ?? descriptor.cutter_version,
//       executionState,
//       error: response.ok ? null : (response.error ?? "cutter-command-failed"),
//       message: response.message ?? null,
//       outputTruncated: response.output_truncated ?? false,
//       ...(completionToken === undefined ? {} : { completionToken }),
//     };
//   }
//
//   /** Confirm completion by exact receipt or authenticated connection watermark. */
//   async confirmCommandCompletion(
//     sessionId: string,
//     requestId: string,
//     completionToken?: string,
//   ): Promise<Result<boolean, AnalysisError>> {
//     let descriptor: z.infer<typeof descriptorSchema>;
export const _l = 228;
