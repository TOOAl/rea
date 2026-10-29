export const __stub = 1;
// import { mkdtemp, realpath, rm } from "node:fs/promises";
// import { tmpdir } from "node:os";
// import { basename, join } from "node:path";
// import type { Readable } from "node:stream";
//
// import type { ArtifactCommand } from "../domain/artifactGraph.js";
// import {
//   ArtifactReaderFailure,
//   type ArtifactEntry,
//   type ArtifactReader,
//   type ArtifactTraversalOptions,
// } from "./ArtifactReader.js";
// import { DirectoryArtifactReader } from "./DirectoryArtifactReader.js";
// import {
//   execFileOutput,
//   execFileOutputFailure,
// } from "../process/ExecFileOutput.js";
// import {
//   parseNativeDmgAttachOutput,
//   parseNativeDmgInfo,
//   resolveNativeDmgOwnership,
//   type NativeDmgAttachOutput,
//   type NativeDmgInfo,
// } from "./NativeDmgOwnership.js";
// const HDIUTIL_COMMAND_TIMEOUT_MS = 120_000;
// const VERIFY_SETTLE_DELAYS_MS = [250, 500] as const;
// // APFS ejects and busy reporting can lag a detach attempt.
// const DETACH_SETTLE_DELAYS_MS = [250, 500, 1000] as const;
// const delay = (milliseconds: number): Promise<void> =>
//   new Promise((resolve) => setTimeout(resolve, milliseconds));
// /** Narrow host seam for tested, shell-free hdiutil lifecycle operations. */
// export interface NativeDmgHost {
//   run(
//     arguments_: readonly string[],
//     signal?: AbortSignal,
//     options?: { readonly timeoutMs: number },
//   ): Promise<{
//     readonly stdout: string;
//     readonly stderr?: string;
//     readonly exitCode: number;
//     readonly cause?: unknown;
//   }>;
//   /** Wait between detach rechecks; tests may resolve immediately. */
//   delay?(milliseconds: number): Promise<void>;
// }
//
// class NativeDmgCommandFailure extends ArtifactReaderFailure {
//   readonly processNotStarted: boolean;
//   readonly verifyDiagnostic: string | undefined;
//   readonly exitCode: number | null;
//
//   constructor(
//     failure: {
//       readonly reason: ArtifactReaderFailure["reason"];
//       readonly verifyDiagnostic?: string;
//     },
//     message: string,
//     readonly stdout: string,
//     options?: {
//       readonly cause?: unknown;
//       readonly processNotStarted?: boolean;
//       readonly exitCode?: number;
//     },
//   ) {
//     super(
//       failure.reason,
//       message,
//       options?.cause === undefined ? undefined : { cause: options.cause },
//     );
//     this.processNotStarted = options?.processNotStarted ?? false;
//     this.verifyDiagnostic = failure.verifyDiagnostic;
//     this.exitCode = options?.exitCode ?? null;
//   }
// }
//
// const createSystemHost = (
//   environment: Readonly<NodeJS.ProcessEnv>,
// ): NativeDmgHost => ({
//   delay,
//   async run(arguments_, signal, options) {
//     try {
//       const { stdout, stderr } = await execFileOutput(
//         "/usr/bin/hdiutil",
//         [...arguments_],
//         {
//           env: environment,
//           stopSignal: "SIGTERM",
//           ...(options === undefined ? {} : { timeout: options.timeoutMs }),
//           ...(signal === undefined ? {} : { signal }),
//         },
//       );
//       return { stdout, stderr, exitCode: 0 };
//     } catch (cause: unknown) {
//       const output = execFileOutputFailure(cause);
//       if (cause instanceof Error && cause.name === "AbortError")
//         throw new NativeDmgCommandFailure(
//           { reason: "cancelled" },
//           "DMG operation cancelled",
//           output?.stdout ?? "",
//           { cause },
//         );
//       const exitCode =
//         typeof output?.code === "number" ? output.code : processExitCode(cause);
//       if (exitCode !== undefined)
//         return {
//           stdout: output?.stdout ?? processOutput(cause, "stdout"),
//           stderr: output?.stderr ?? processOutput(cause, "stderr"),
//           exitCode,
//           cause,
//         };
//       throw new NativeDmgCommandFailure(
//         classifyCommandFailure(cause, arguments_[0]),
//         `hdiutil ${arguments_[0] ?? "operation"} failed: ${describeCommandFailure(cause, arguments_)}`,
//         output?.stdout ?? "",
//         { cause, processNotStarted: processNotStarted(cause) },
//       );
//     }
//   },
// });
//
// /** Read-only macOS DMG adapter that owns attachment and reverse-order detach. */
// export class NativeDmgArtifactReader implements ArtifactReader {
//   readonly format = "file" as const;
//   private readonly host: NativeDmgHost;
//   readonly #provenance: ArtifactCommand[] = [];
//   #initialization: Promise<void> | undefined;
//   #directory: DirectoryArtifactReader | undefined;
//   #devices: string[] = [];
//   #inventoryConfirmedDevices = new Set<string>();
//   #mountRoot: string | undefined;
//   #baselineDevices = new Set<string>();
//   #attachOutput: NativeDmgAttachOutput | undefined;
//   #attachOutputReturned = false;
//   #attachMayHaveMounted = false;
//   #ownershipUncertainty: string | undefined;
//   #closed = false;
//   #closePromise: Promise<void> | undefined;
//   readonly #activeDirectoryOperations = new Set<Promise<unknown>>();
//
//   constructor(
//     private readonly path: string,
//     environment: Readonly<NodeJS.ProcessEnv>,
//     host?: NativeDmgHost,
//   ) {
//     if (process.platform !== "darwin" && host === undefined)
//       throw new ArtifactReaderFailure(
//         "unavailable",
//         "Native DMG traversal is available only on macOS",
//       );
//     this.host = host ?? createSystemHost(environment);
//   }
//
//   async *entries(
//     signal?: AbortSignal,
//     options?: ArtifactTraversalOptions,
//   ): AsyncIterable<ArtifactEntry> {
//     await this.#ensureAttached(signal);
//     const directory = this.#directory;
//     if (directory === undefined)
//       throw new ArtifactReaderFailure("unavailable", "DMG is not attached");
//     const prefix = basename(this.path);
//     const entries = directory
//       .entries(signal, {
//         onOmission: (omission) =>
//           options?.onOmission?.({
//             ...omission,
//             path: `${prefix}/${omission.path}`,
//           }),
//       })
//       [Symbol.asyncIterator]();
//     try {
//       for (;;) {
//         if (this.#closed) return;
//         const next = await this.#trackDirectoryOperation(() => entries.next());
//         if (this.#closed) return;
//         if (next.done) return;
//         yield { ...next.value, path: `${prefix}/${next.value.path}` };
//       }
//     } finally {
//       await entries.return?.();
//     }
//   }
//
//   async open(entry: ArtifactEntry, signal?: AbortSignal): Promise<Readable> {
export const _l = 184;
