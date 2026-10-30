export const __stub = 1;
//       arguments: args,
//       limits,
//       signal,
//       environment:
//         snapshot === undefined
//           ? this.environment
//           : {
//               ...this.environment,
//               WIRESHARK_CONFIG_DIR: snapshot.configurationPath,
//             },
//       ...(inputPath === undefined ? {} : { inputPath }),
//       ...(inputPath === undefined || this.nativeBound === undefined
//         ? {}
//         : { nativeBound: this.nativeBound }),
//       ...(this.launcher === undefined ? {} : { launcher: this.launcher }),
//       retain: (owner, resources, reason, capturedOutput) => {
//         this.commands.set(owner, {
//           snapshot,
//           resources,
//           reason,
//           capturedOutput,
//         });
//         cleanup = { reason, resources, capturedOutput };
//       },
//     });
//     if (inputPath === undefined && cleanup !== undefined)
//       throw new ProviderCleanupError(
//         "pcap",
//         cleanup.resources,
//         {
//           reason: cleanup.reason,
//           previous_error: null,
//           captured_output: {
//             stdout: output.stdout,
//             stderr: output.stderr,
//             truncated: cleanup.capturedOutput.truncated,
//           },
//         },
//         { operation },
//       );
//     return output;
//   }
//
//   private nativeBound: Parameters<typeof runPcapCommand>[0]["nativeBound"];
//   private nativeLimitations: readonly string[] = [];
//
//   private async prepareCaptureBound(): Promise<void> {
//     const prepared = await preparePcapNativeBound(
//       this.environment,
//       this.#resources,
//     );
//     this.nativeBound = prepared.nativeBound;
//     this.nativeLimitations = prepared.limitations;
//   }
//
//   private async client(operation: PcapOperation, signal?: AbortSignal) {
//     const selection = resolvePcapTools(this.environment);
//     const identity = await inspectPcapClient(
//       selection,
//       async (command) =>
//         (
//           await this.run(
//             operation,
//             command,
//             ["--version"],
//             { timeoutMs: 20_000, maxOutputBytes: 64 * 1024 },
//             signal,
//           )
//         ).stdout,
//     );
//     for (const [name, version] of [
//       ["tshark", identity.tsharkVersion],
//       ["capinfos", identity.capinfosVersion],
//     ] as const) {
//       if (version === null)
//         throw new PcapConfigurationFailure(
//           `${name}_version_unresolved`,
//           `The selected ${name} command did not report a version. Set REA_${name.toUpperCase()}_COMMAND to its absolute executable path.`,
//         );
//     }
//     return {
//       selection,
//       client: {
//         tshark_command: selection.tshark.command,
//         tshark_source: selection.tshark.source,
//         tshark_version: identity.tsharkVersion,
//         capinfos_command: selection.capinfos.command,
//         capinfos_source: selection.capinfos.source,
//         capinfos_version: identity.capinfosVersion,
//       },
//     };
//   }
//
//   async inspectAvailability(
//     signal?: AbortSignal,
//   ): Promise<ProviderAvailability> {
//     const result = await this.#resources.run(
//       async () => ok(await this.inspectAvailabilityAdmitted(signal)),
//       signal,
//     );
//     if (!result.ok) throw result.error;
//     return result.value;
//   }
//
//   private async inspectAvailabilityAdmitted(
//     signal?: AbortSignal,
//   ): Promise<ProviderAvailability> {
//     try {
//       const { client } = await this.client("inspect_pcap_client", signal);
//       if (process.platform !== "linux" && process.platform !== "win32")
//         return {
//           status: "unavailable",
//           code: "unsupported_host",
//           reason:
//             "No enforceable native memory boundary is available for capture summaries on this host.",
//           diagnostics: client,
//         };
//       await this.prepareCaptureBound();
//       return {
//         status: "available",
//         code: null,
//         reason: null,
//         diagnostics: client,
//       };
//     } catch (cause) {
//       if (cause instanceof ProviderCleanupError) throw cause;
//       if (signal?.aborted || cause instanceof AnalysisCancelledError)
//         throw new AnalysisCancelledError("inspect_pcap_client", { cause });
//       if (cause instanceof PcapConfigurationFailure)
//         return pcapConfigurationAvailability(cause);
//       return {
//         status: "unavailable",
//         code:
//           cause instanceof AnalysisCapabilityUnavailableError
//             ? "executable_missing"
//             : "version_unresolved",
//         reason: cause instanceof Error ? cause.message : String(cause),
//         diagnostics: {},
//       };
//     }
//   }
//
//   private async discard(
//     snapshot: PcapSnapshot,
//   ): Promise<AnalysisError | undefined> {
//     try {
//       if (
//         [...this.commands.values()].some(
//           (command) => command.snapshot === snapshot,
//         )
//       )
//         throw new Error(
//           "An unreleased command still owns the capture snapshot",
//         );
//       await snapshot.close();
//       this.snapshots.delete(snapshot);
//       return undefined;
//     } catch (cause) {
//       return new ProviderCleanupError(
//         "pcap",
//         [snapshot.path],
//         { reason: String(cause) },
//         { operation: "inspect_pcap_capture", cause },
//       );
//     }
//   }
//
//   async close(): Promise<void> {
//     const failures: unknown[] = [];
//     try {
//       await this.#resources.close();
//     } catch (cause) {
export const _l = 172;
