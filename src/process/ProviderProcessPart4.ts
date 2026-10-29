export const __stub = 1;
//           cause instanceof Error
//             ? cause.message
//             : "owned provider process cleanup failed",
//       };
//     }
//   }
//
//   #ownedCleanup(
//     supplied: ProcessCleanupResult | undefined,
//   ): Promise<ProcessCleanupResult> {
//     if (supplied !== undefined) return Promise.resolve(supplied);
//     const cleanup = this.launch.cleanup;
//     return cleanup === undefined
//       ? Promise.resolve({
//           cleaned: false,
//           reason: "owned provider process has no cleanup capability",
//         })
//       : cleanup();
//   }
//
//   #signal(signal: NodeJS.Signals): void {
//     if (this.#exitObservation !== undefined) return;
//     this.launch.process.kill(signal);
//   }
//
//   #attach(stream: Readable | null, name: "stdout" | "stderr"): void {
//     if (name === "stdout") {
//       stream?.on("data", this.#onStdout);
//       stream?.on("error", this.#onStdoutError);
//     } else {
//       stream?.on("data", this.#onStderr);
//       stream?.on("error", this.#onStderrError);
//     }
//   }
//
//   #recordStreamError(stream: "stdout" | "stderr", cause: Error): void {
//     this.#options.onDiagnostic?.({
//       type: "error",
//       message: `${stream} stream failed: ${cause.message}`,
//     });
//   }
//
//   #capture(
//     stream: "stdout" | "stderr",
//     capture: ProcessOutputCapture,
//     chunk: Buffer | string,
//   ): void {
//     const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
//     if (stream === "stdout") this.#stdoutObservedBytes += bytes.byteLength;
//     else this.#stderrObservedBytes += bytes.byteLength;
//     const remaining =
//       this.#maxDiagnosticBytes === undefined
//         ? bytes.byteLength
//         : Math.max(
//             0,
//             this.#maxDiagnosticBytes - this.#stdout.bytes - this.#stderr.bytes,
//           );
//     const retained = Math.min(bytes.byteLength, remaining);
//     if (retained < bytes.byteLength) this.#diagnosticTruncated = true;
//     if (retained > 0) capture.append(bytes.subarray(0, retained));
//     this.#options.onDiagnostic?.({
//       type: "output",
//       stream,
//       bytes: bytes.byteLength,
//       totalBytes:
//         stream === "stdout"
//           ? this.#stdoutObservedBytes
//           : this.#stderrObservedBytes,
//       ...(retained < bytes.byteLength ? { truncated: true } : {}),
//     });
//   }
//
//   #recordExit(code: number | null, signal: NodeJS.Signals | null): void {
//     if (this.#exitObservation !== undefined) return;
//     this.#exitObservation = { code, signal };
//     this.#exit.resolve(this.#exitObservation);
//     this.#options.onDiagnostic?.({
//       type: "exit",
//       code,
//       signal,
//       snapshot: this.snapshot(),
//     });
//   }
// }
//
// class ProcessOutputCapture {
//   readonly #chunks: Buffer[] = [];
//   #bytes = 0;
//
//   get bytes(): number {
//     return this.#bytes;
//   }
//
//   reset(): void {
//     this.#chunks.length = 0;
//     this.#bytes = 0;
//   }
//
//   append(chunk: Buffer): void {
//     this.#bytes += chunk.byteLength;
//     this.#chunks.push(Buffer.from(chunk));
//   }
//
//   snapshot(observedBytes: number): ProviderProcessSnapshot["stdout"] {
//     const buffer = Buffer.concat(this.#chunks, this.#bytes);
//     const text = buffer.toString("utf8");
//     let invalidUtf8 = false;
//     try {
//       new TextDecoder("utf-8", { fatal: true }).decode(buffer);
//     } catch {
//       invalidUtf8 = true;
//     }
//     return {
//       text,
//       bytes: this.#bytes,
//       observedBytes,
//       ...(invalidUtf8 ? { invalidUtf8: true } : {}),
//     };
//   }
// }
//
// interface Deferred<Value> {
//   readonly promise: Promise<Value>;
//   readonly resolve: (value: Value) => void;
// }
//
// const deferred = <Value>(): Deferred<Value> => {
//   let resolver: ((value: Value) => void) | undefined;
//   const promise = new Promise<Value>((resolve) => {
//     resolver = resolve;
//   });
//   return {
//     promise,
//     resolve: (value) => {
//       resolver?.(value);
//     },
//   };
// };
//
// const waitForSpawn = (child: ChildProcess): Promise<void> =>
//   new Promise((resolve, reject) => {
//     const onSpawn = (): void => {
//       child.off("error", onError);
//       resolve();
//     };
//     const onError = (cause: Error): void => {
//       child.off("spawn", onSpawn);
//       reject(cause);
//     };
//     child.once("spawn", onSpawn);
//     child.once("error", onError);
//   });
//
// const waitForProcessEvent = async (
//   observed: boolean,
//   event: Promise<unknown>,
//   timeoutMs: number,
// ): Promise<boolean> => {
//   if (observed) return true;
//   let timer: NodeJS.Timeout | undefined;
//   try {
//     return await Promise.race([
//       event.then(() => true),
//       new Promise<boolean>((resolve) => {
//         timer = setTimeout(() => resolve(false), Math.max(0, timeoutMs));
//       }),
//     ]);
//   } finally {
//     if (timer !== undefined) clearTimeout(timer);
//   }
// };
export const _l = 171;
