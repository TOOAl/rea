export const __stub = 1;
//     await this.#ensureAttached(signal);
//     const directory = this.#directory;
//     if (directory === undefined)
//       throw new ArtifactReaderFailure("unavailable", "DMG is not attached");
//     return this.#trackDirectoryOperation(() => directory.open(entry, signal));
//   }
//
//   provenance(): readonly ArtifactCommand[] {
//     return structuredClone(this.#provenance);
//   }
//
//   close(): Promise<void> {
//     this.#closed = true;
//     this.#closePromise ??= this.#closeOwnedResources().catch(
//       (cause: unknown) => {
//         this.#closePromise = undefined;
//         throw cause;
//       },
//     );
//     return this.#closePromise;
//   }
//
//   async #closeOwnedResources(): Promise<void> {
//     await this.#initialization?.catch(() => undefined);
//     await Promise.allSettled(this.#activeDirectoryOperations);
//     await this.#closeMountedDirectory();
//     let detachFailure = await this.#detachOwnedDevices();
//     if (
//       this.#devices.length === 0 &&
//       this.#mountRoot !== undefined &&
//       !this.#attachMayHaveMounted
//     )
//       await rm(this.#mountRoot, { recursive: true, force: true }).then(
//         () => {
//           this.#mountRoot = undefined;
//           this.#directory = undefined;
//         },
//         (cause: unknown) => {
//           detachFailure ??= cause;
//         },
//       );
//     if (this.#attachMayHaveMounted) {
//       detachFailure ??= new Error(
//         this.#ownershipUncertainty ??
//           "hdiutil attachment ownership remains unknown",
//       );
//     }
//     if (detachFailure !== undefined)
//       throw new ArtifactReaderFailure(
//         "unavailable",
//         `DMG detach or mount-root cleanup failed for ${JSON.stringify(this.path)}: ${failureMessage(detachFailure)}`,
//         {
//           cause: detachFailure,
//           cleanup: {
//             reason: failureMessage(detachFailure),
//             resources: [
//               ...this.#devices.map((device) => `DMG device ${device}`),
//               ...(this.#attachMayHaveMounted
//                 ? [
//                     `DMG attachment ownership unknown at mount root ${this.#mountRoot ?? this.path}`,
//                   ]
//                 : []),
//               ...(this.#mountRoot === undefined
//                 ? []
//                 : [`DMG mount root ${this.#mountRoot}`]),
//             ],
//           },
//         },
//       );
//   }
//
//   async #detachOwnedDevices(): Promise<unknown> {
//     let detachFailure = await this.#reconcileAttachState();
//     let remainingDevices: string[] = [];
//     for (const device of [...this.#devices].reverse()) {
//       const failure = await this.#detach(device);
//       if (failure !== undefined) {
//         remainingDevices.push(device);
//         detachFailure ??= failure;
//       }
//     }
//     // APFS container detach may briefly leave its backing image listed.
//     for (const delayMs of DETACH_SETTLE_DELAYS_MS) {
//       if (remainingDevices.length === 0) break;
//       await (this.host.delay ?? delay)(delayMs);
//       const stillAttached: string[] = [];
//       for (const device of remainingDevices) {
//         if (!(await this.#isAttached(device))) continue;
//         const failure = await this.#detach(device);
//         if (failure !== undefined) {
//           stillAttached.push(device);
//           detachFailure = failure;
//         }
//       }
//       remainingDevices = stillAttached;
//     }
//     if (remainingDevices.length === 0) detachFailure = undefined;
//     this.#devices = remainingDevices.reverse();
//     return detachFailure;
//   }
//
//   async #closeMountedDirectory(): Promise<void> {
//     if (this.#directory !== undefined) {
//       try {
//         await this.#directory.close();
//         this.#directory = undefined;
//       } catch (cause: unknown) {
//         const mountRoot = this.#mountRoot ?? this.path;
//         throw ArtifactReaderFailure.withCleanup(cause, {
//           reason: `DMG mounted directory remains owned: ${failureMessage(cause)}`,
//           resources: [
//             `DMG mounted directory at ${mountRoot}`,
//             `DMG mount root ${mountRoot}`,
//             ...this.#devices.map((device) => `DMG device ${device}`),
//           ],
//         });
//       }
//     }
//   }
//
//   /** Detach one device; return the failure only while it remains attached. */
//   async #detach(device: string): Promise<unknown> {
//     try {
//       await runChecked(this.host, ["detach", device], undefined, {
//         timeoutMs: HDIUTIL_COMMAND_TIMEOUT_MS,
//       });
//       this.#provenance.push(command(["detach", device], ["mount"]));
//       return undefined;
//     } catch (cause: unknown) {
//       return (await this.#isAttached(device)) ? cause : undefined;
//     }
//   }
//
//   async #reconcileAttachState(): Promise<unknown> {
//     if (!this.#attachMayHaveMounted) return undefined;
//     try {
//       await this.#resolveAttachOwnership();
//       return undefined;
//     } catch (cause: unknown) {
//       this.#ownershipUncertainty = failureMessage(cause);
//       return cause;
//     }
//   }
//
//   /** Treat unknown hdiutil state as attached during cleanup. */
//   async #isAttached(device: string): Promise<boolean> {
//     try {
//       const parsed = await this.#readInfo();
//       const isListed = parsed.images.some((image) =>
//         image["system-entities"].some(
//           (entity) => entity["dev-entry"] === device,
//         ),
//       );
//       if (isListed) {
//         this.#inventoryConfirmedDevices.add(device);
//         return true;
//       }
//       return !this.#inventoryConfirmedDevices.has(device);
//     } catch {
//       return true;
//     }
//   }
//
//   async #ensureAttached(signal?: AbortSignal): Promise<void> {
//     if (this.#closed)
//       throw new ArtifactReaderFailure("unavailable", "DMG reader is closed");
//     this.#initialization ??= this.#attach(signal);
//     await this.#initialization;
//     if (this.#closed)
//       throw new ArtifactReaderFailure("unavailable", "DMG reader is closed");
//   }
//
//   async #trackDirectoryOperation<Result>(
//     operation: () => Promise<Result>,
//   ): Promise<Result> {
//     if (this.#closed)
//       throw new ArtifactReaderFailure("unavailable", "DMG reader is closed");
//     const running = Promise.resolve().then(operation);
//     this.#activeDirectoryOperations.add(running);
//     try {
//       return await running;
//     } finally {
//       this.#activeDirectoryOperations.delete(running);
//     }
export const _l = 184;
