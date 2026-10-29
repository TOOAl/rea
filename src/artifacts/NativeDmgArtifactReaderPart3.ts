export const __stub = 1;
//   }
//
//   async #attach(signal?: AbortSignal): Promise<void> {
//     await this.#verify(signal);
//     const baseline = await this.#readInfo();
//     this.#baselineDevices = new Set(
//       baseline.images.flatMap((image) =>
//         image["system-entities"].map(({ "dev-entry": device }) => device),
//       ),
//     );
//     const mountRoot = await realpath(await mkdtemp(join(tmpdir(), "rea-dmg-")));
//     this.#mountRoot = mountRoot;
//     try {
//       this.#attachMayHaveMounted = true;
//       const attached = await runChecked(
//         this.host,
//         [
//           "attach",
//           "-readonly",
//           "-nobrowse",
//           "-plist",
//           "-mountroot",
//           mountRoot,
//           this.path,
//         ],
//         signal,
//         { timeoutMs: HDIUTIL_COMMAND_TIMEOUT_MS },
//       );
//       this.#attachOutputReturned = true;
//       let parsed: NativeDmgAttachOutput;
//       try {
//         parsed = parseNativeDmgAttachOutput(attached.stdout);
//       } catch (cause: unknown) {
//         throw new ArtifactReaderFailure(
//           "format",
//           "hdiutil returned a malformed attachment plist",
//           { cause },
//         );
//       }
//       if (parsed["system-entities"].length === 0)
//         throw new ArtifactReaderFailure(
//           "format",
//           "hdiutil returned no attached devices",
//         );
//       this.#attachOutput = parsed;
//       const ownership = await this.#resolveAttachOwnership();
//       if (ownership !== "owned")
//         throw new ArtifactReaderFailure(
//           ownership === "unknown" ? "unavailable" : "path",
//           ownership === "unknown"
//             ? `DMG attachment ownership is uncertain: ${this.#ownershipUncertainty ?? "no unique mount under the owned root"}`
//             : "hdiutil did not mount a new image beneath the owned root",
//         );
//       this.#provenance.push(
//         command(
//           [
//             "attach",
//             "-readonly",
//             "-nobrowse",
//             "-plist",
//             "-mountroot",
//             mountRoot,
//             this.path,
//           ],
//           ["read", "mount"],
//         ),
//       );
//       this.#directory = new DirectoryArtifactReader(mountRoot);
//     } catch (cause: unknown) {
//       if (cause instanceof NativeDmgCommandFailure && cause.stdout !== "") {
//         try {
//           this.#attachOutput = parseNativeDmgAttachOutput(cause.stdout);
//           this.#attachOutputReturned = true;
//         } catch {
//           // The original command failure remains primary; fresh info still recovers mounts.
//         }
//       }
//       if (cause instanceof NativeDmgCommandFailure && cause.processNotStarted) {
//         this.#attachMayHaveMounted = false;
//         this.#ownershipUncertainty = undefined;
//       }
//       throw cause;
//     }
//   }
//
//   async #verify(signal?: AbortSignal): Promise<void> {
//     const arguments_ = ["verify", this.path];
//     const deadline = performance.now() + HDIUTIL_COMMAND_TIMEOUT_MS;
//     for (let attempt = 0; ; attempt += 1) {
//       if (signal?.aborted === true)
//         throw new NativeDmgCommandFailure(
//           { reason: "cancelled" },
//           "DMG operation cancelled",
//           "",
//           { cause: signal.reason },
//         );
//       try {
//         await runChecked(this.host, arguments_, signal, {
//           timeoutMs: Math.max(1, Math.ceil(deadline - performance.now())),
//         });
//         this.#provenance.push(command(arguments_, ["read"]));
//         return;
//       } catch (cause: unknown) {
//         if (!(cause instanceof NativeDmgCommandFailure)) throw cause;
//         this.#provenance.push(command(arguments_, ["read"], cause.exitCode));
//         const delayMs = VERIFY_SETTLE_DELAYS_MS[attempt];
//         // Retry only the producer's explicit transient diagnostic, before any mount.
//         if (
//           cause.verifyDiagnostic !== "Resource temporarily unavailable" ||
//           delayMs === undefined ||
//           deadline - performance.now() <= delayMs
//         )
//           throw cause;
//         await (this.host.delay ?? delay)(delayMs);
//         if (performance.now() >= deadline) throw cause;
//       }
//     }
//   }
//
//   async #readInfo(): Promise<NativeDmgInfo> {
//     const info = await runChecked(this.host, ["info", "-plist"], undefined, {
//       timeoutMs: HDIUTIL_COMMAND_TIMEOUT_MS,
//     });
//     return parseNativeDmgInfo(info.stdout);
//   }
//
//   async #resolveAttachOwnership(): Promise<"owned" | "none" | "unknown"> {
//     const mountRoot = this.#mountRoot;
//     if (mountRoot === undefined)
//       throw new Error("DMG mount root is unavailable for ownership discovery");
//     const ownership = resolveNativeDmgOwnership({
//       info: await this.#readInfo(),
//       ...(this.#attachOutput === undefined
//         ? {}
//         : { attachOutput: this.#attachOutput }),
//       attachOutputReturned: this.#attachOutputReturned,
//       mountRoot,
//       baselineDevices: this.#baselineDevices,
//     });
//     if (ownership.status === "owned") {
//       this.#devices = [...ownership.devices];
//       if (ownership.source === "info")
//         for (const device of ownership.devices)
//           this.#inventoryConfirmedDevices.add(device);
//       this.#attachMayHaveMounted = false;
//       this.#ownershipUncertainty = undefined;
//       return "owned";
//     }
//     if (ownership.status === "unknown") {
//       this.#ownershipUncertainty = ownership.reason;
//       return "unknown";
//     }
//     this.#attachMayHaveMounted = false;
//     this.#ownershipUncertainty = undefined;
//     this.#devices = [];
//     return "none";
//   }
// }
//
// const failureMessage = (cause: unknown): string =>
//   cause instanceof Error ? cause.message : String(cause);
//
// const processNotStarted = (cause: unknown): boolean => {
//   if (!(cause instanceof Error)) return false;
//   const syscall = Reflect.get(cause, "syscall");
//   const code = Reflect.get(cause, "code");
//   const errno = Reflect.get(cause, "errno");
//   return (
//     typeof syscall === "string" &&
//     syscall.startsWith("spawn ") &&
//     (typeof code === "string" ||
//       typeof code === "number" ||
//       typeof errno === "number")
//   );
// };
//
// const runChecked = async (
//   host: NativeDmgHost,
//   arguments_: readonly string[],
//   signal?: AbortSignal,
//   options?: { readonly timeoutMs: number },
// ): Promise<{ readonly stdout: string; readonly exitCode: 0 }> => {
//   let result: Awaited<ReturnType<NativeDmgHost["run"]>>;
//   try {
export const _l = 184;
