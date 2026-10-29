export const __stub = 1;
//         : {
//             stdout: output.stdout.text,
//             stderr: output.stderr.text,
//             truncated: output.diagnosticTruncated === true,
//             stdout_bytes: output.stdout.bytes,
//             stderr_bytes: output.stderr.bytes,
//             exit_code: output.exitCode ?? null,
//             signal: output.signal ?? null,
//           };
//     const cleanup =
//       cause.cleanupFailure === null
//         ? undefined
//         : {
//             reason: cause.cleanupFailure,
//             resources: cause.resources,
//           };
//     if (cause.reason === "cancelled")
//       return err(
//         new AnalysisCancelledError(operation, {
//           cause,
//           ...(cleanup === undefined ? {} : { cleanup }),
//           ...(capturedOutput === undefined ? {} : { capturedOutput }),
//         }),
//       );
//     if (cause.reason === "timeout")
//       return err(
//         new AnalysisTimeoutError(operation, limits.timeoutMs, {
//           cause,
//           ...(cleanup === undefined ? {} : { cleanup }),
//           ...(capturedOutput === undefined ? {} : { capturedOutput }),
//         }),
//       );
//     if (cause.reason === "output-limit")
//       return err(
//         new AnalysisResourceConstraintError(
//           operation,
//           "memory",
//           `apktool output exceeded the ${String(limits.maxOutputBytes)}-byte capture budget`,
//           { max_output_bytes: limits.maxOutputBytes },
//           {
//             cause,
//             ...(cleanup === undefined ? {} : { cleanup }),
//             ...(capturedOutput === undefined ? {} : { capturedOutput }),
//           },
//         ),
//       );
//     return err(
//       new AnalysisUnsupportedTargetError(
//         operation,
//         selection.command,
//         output?.stderr.text.trim().slice(0, STDERR_EXCERPT_BYTES) ||
//           `apktool exited with code ${String(output?.exitCode ?? "unknown")} for ${operation}`,
//         {
//           cause,
//           ...(cleanup === undefined ? {} : { cleanup }),
//           ...(capturedOutput === undefined ? {} : { capturedOutput }),
//         },
//       ),
//     );
//   }
// };
//
// /** Count files while bounding streamed directory-entry traversal. */
// const countDecodedFiles = async (
//   root: string,
//   signal: AbortSignal | undefined,
//   operation: string,
// ): Promise<{
//   count: number;
//   capped: boolean;
//   locales: readonly string[];
// }> => {
//   let count = 0;
//   let capped = false;
//   let visited = 0;
//   const directories = [root];
//   const locales: string[] = [];
//   while (directories.length > 0 && !capped) {
//     throwIfCancelled(operation, signal);
//     const directory = directories.pop()!;
//     for await (const entry of await opendir(directory)) {
//       throwIfCancelled(operation, signal);
//       if (visited >= MAX_DECODED_ENTRIES_VISITED) {
//         capped = true;
//         break;
//       }
//       visited += 1;
//       const path = join(directory, entry.name);
//       if (entry.isDirectory()) {
//         directories.push(path);
//         if (directory === join(root, "res")) {
//           const match = /^values-(.+)$/u.exec(entry.name);
//           if (
//             match !== null &&
//             androidLocaleQualifierSchema.safeParse(match[1]).success &&
//             (await access(join(path, "strings.xml")).then(
//               () => true,
//               () => false,
//             ))
//           )
//             locales.push(match[1]!);
//         }
//       } else if (entry.isFile()) count += 1;
//     }
//   }
//   return { count, capped, locales: locales.sort() };
// };
//
// export interface ApktoolProviderOptions {
//   readonly environment?: Readonly<Record<string, string | undefined>>;
//   readonly removeWorkspace?: (path: string) => Promise<void>;
// }
//
// /**
//  * Apktool resource decoding over a caller-selected launcher.
//  *
//  * Decoding happens in a provider-owned temporary workspace that is removed
//  * once the requested facts are projected; smali production is skipped
//  * (`--no-src`) because Java-source recovery belongs to the JADX family.
//  */
// export class ApktoolProvider {
//   private readonly selectedEnvironment:
//     | Readonly<Record<string, string | undefined>>
//     | undefined;
//
//   private readonly workspaces = new Set<string>();
//   private readonly removeWorkspace: (path: string) => Promise<void>;
//   readonly #pendingCommandOwners = new Map<ProviderProcessSupervisor, string>();
//   /** A version probe whose cleanup is unresolved is retried on close. */
//   readonly #retainProbeOwner = (owner: ProviderProcessSupervisor): void => {
//     this.#pendingCommandOwners.set(owner, "apktool version probe");
//   };
//   readonly #shutdown = new AbortController();
//   readonly #active = new Set<Promise<void>>();
//   #closing = false;
//   #closePromise: Promise<void> | undefined;
//
//   constructor(options: ApktoolProviderOptions = {}) {
//     this.selectedEnvironment =
//       options.environment === undefined
//         ? undefined
//         : snapshotEnvironment(options.environment);
//     this.removeWorkspace =
//       options.removeWorkspace ??
//       ((path) => rm(path, { recursive: true, force: true }));
//   }
//
//   private operationEnvironment(): Readonly<NodeJS.ProcessEnv> {
//     const ambient = snapshotEnvironment(process.env);
//     if (this.selectedEnvironment === undefined) return ambient;
//     // Child inheritance is sampled per operation. An explicit map keeps its
//     // launcher choice authoritative, including an omitted command selecting PATH.
//     return snapshotEnvironment({
//       ...ambient,
//       ...this.selectedEnvironment,
//       [APKTOOL_COMMAND_ENV]: this.selectedEnvironment[APKTOOL_COMMAND_ENV],
//     });
//   }
//
//   /** Probe the selected apktool launcher; decodes nothing. */
//   inspectAvailability(signal?: AbortSignal): Promise<ProviderAvailability> {
//     if (this.#closing)
//       return Promise.reject(
//         new AnalysisCancelledError("inspect_apktool_client"),
//       );
//     const operationSignal =
//       signal === undefined
//         ? this.#shutdown.signal
//         : AbortSignal.any([signal, this.#shutdown.signal]);
//     return this.#track(this.#inspectAvailability(operationSignal));
//   }
//
//   async #inspectAvailability(
//     signal: AbortSignal,
//   ): Promise<ProviderAvailability> {
//     const environment = this.operationEnvironment();
//     try {
//       const selection = await resolveApktoolCommand(
//         environment,
//         process.platform,
//         signal,
//       );
//       await inspectApktoolClient(
//         selection,
//         signal,
//         environment,
//         process.platform,
//         this.#retainProbeOwner,
//       );
//       throwIfCancelled("inspect_apktool_client", signal);
//       return {
//         status: "available",
//         code: null,
//         reason: null,
//         diagnostics: {
//           selected_command: selection.command,
//           command_source: selection.commandSource,
//         },
//       };
//     } catch (cause) {
//       if (cause instanceof ApktoolConfigurationFailure) {
//         if (cause.cleanup !== undefined)
//           throw probeCleanupFailure(
//             "inspect_apktool_client",
//             cause,
//             cause.cleanup,
//           );
//         return apktoolConfigurationAvailability(cause);
//       }
//       throw cause;
//     }
//   }
//
//   /** Retain failed cleanup ownership and retry it on close. */
//   async close(): Promise<void> {
//     this.#closing = true;
//     this.#shutdown.abort();
//     this.#closePromise ??= this.#drainAndClean().catch((cause: unknown) => {
//       this.#closePromise = undefined;
export const _l = 219;
