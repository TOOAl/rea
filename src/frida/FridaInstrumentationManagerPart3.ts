export const __stub = 1;
//       )
//     ).flat();
//     const results = await Promise.all(
//       [...this.#sessions.keys()].map((sessionId) =>
//         this.closeSession(sessionId),
//       ),
//     );
//     const failures = [
//       ...startupFailures,
//       ...results.flatMap((result) => (result.ok ? [] : [result.error.message])),
//     ];
//     const manager = this.#deviceManager;
//     if (manager !== undefined) {
//       for (const [address, reference] of this.#remoteDevices) {
//         if (reference.references !== 0) continue;
//         try {
//           await this.#releaseRemote(manager, address);
//         } catch {
//           failures.push(
//             "Unable to close remote Frida connection during shutdown",
//           );
//         }
//       }
//     }
//     if (failures.length > 0)
//       throw new AggregateError(
//         failures,
//         "Frida session cleanup was incomplete",
//       );
//   }
//
//   #cleanupStartup(pending: PendingStartupCleanup): Promise<readonly string[]> {
//     return this.#withSessionLock(pending.id, async () => {
//       if (!this.#pendingStartups.has(pending)) return [];
//       if (pending.session !== undefined) {
//         try {
//           if (!pending.session.isDetached()) await pending.session.detach();
//           pending.session = undefined;
//         } catch (cause: unknown) {
//           return [
//             `Unable to detach Frida session: ${sanitizeError(cause, pending.remote)}`,
//           ];
//         }
//       }
//       if (pending.spawnedPid !== undefined) {
//         try {
//           await pending.device.resume(pending.spawnedPid);
//           pending.spawnedPid = undefined;
//         } catch (cause: unknown) {
//           return [
//             `Unable to resume spawned target: ${sanitizeError(cause, pending.remote)}`,
//           ];
//         }
//       }
//       const remoteFailure = await this.#releaseManagedRemote(pending);
//       if (remoteFailure !== undefined) return [remoteFailure];
//       this.#pendingStartups.delete(pending);
//       return [];
//     });
//   }
//
//   async #releaseManagedRemote(
//     managed: ManagedRemoteConnection,
//   ): Promise<string | undefined> {
//     if (
//       managed.remote === undefined ||
//       (!managed.remoteReferenceHeld && !managed.remoteRemovalPending)
//     )
//       return undefined;
//     const releaseReference = managed.remoteReferenceHeld;
//     managed.remoteReferenceHeld = false;
//     try {
//       await this.#releaseRemote(
//         managed.deviceManager,
//         managed.remote.address,
//         releaseReference,
//       );
//       managed.remoteRemovalPending = false;
//       return undefined;
//     } catch (cause: unknown) {
//       managed.remoteRemovalPending = true;
//       return `Unable to close remote Frida connection: ${sanitizeError(cause, managed.remote)}`;
//     }
//   }
//
//   #withOperation<Value>(
//     name: string,
//     operation: () => Promise<Result<Value, AnalysisError>>,
//     signal?: AbortSignal,
//   ): Promise<Result<Value, AnalysisError>> {
//     if (this.#closing)
//       return Promise.resolve(
//         err(
//           new AnalysisCapabilityUnavailableError(
//             "frida",
//             name,
//             "Frida instrumentation is shutting down.",
//           ),
//         ),
//       );
//     let start = () => {};
//     const pending = new Promise<Result<Value, AnalysisError>>(
//       (resolve, reject) => {
//         start = () => {
//           try {
//             resolve(
//               signal?.aborted
//                 ? err(cancelledOperation(name, signal))
//                 : operation(),
//             );
//           } catch (cause: unknown) {
//             reject(cause);
//           }
//         };
//       },
//     );
//     this.#operations.add(pending);
//     const release = () => {
//       this.#operations.delete(pending);
//     };
//     void pending.then(release, release);
//     start();
//     return pending;
//   }
//
//   async #withSessionLock<Value>(
//     sessionId: string,
//     operation: () => Promise<Value>,
//   ): Promise<Value> {
//     const previous = this.#sessionQueues.get(sessionId) ?? Promise.resolve();
//     let release: (() => void) | undefined;
//     const current = new Promise<void>((resolve) => {
//       release = resolve;
//     });
//     const tail = previous.then(() => current);
//     this.#sessionQueues.set(sessionId, tail);
//     await previous;
//     try {
//       return await operation();
//     } finally {
//       release?.();
//       if (this.#sessionQueues.get(sessionId) === tail)
//         this.#sessionQueues.delete(sessionId);
//     }
//   }
//
//   #recordMessage(
//     managed: ManagedSession,
//     scriptId: string,
//     message: FridaMessage,
//     data: Buffer | null,
//   ): void {
//     const payload = message.payload;
//     const secrets = [managed.remote?.token, managed.remote?.certificate].filter(
//       (value): value is string => value !== undefined && value.length > 0,
//     );
//     let payloadResult:
//       | {
//           readonly value: JsonValue;
//           readonly truncated: boolean;
//           readonly bytes: number;
//         }
//       | undefined;
//     if (payload !== undefined) {
//       try {
//         payloadResult = boundedJsonValue(
//           payload,
//           MAX_SESSION_CAPTURE_BYTES - MAX_MESSAGE_METADATA_BYTES,
//           secrets,
//         );
//       } catch {
//         payloadResult = {
//           value: { payload_unavailable: true },
//           truncated: true,
//           bytes: Buffer.byteLength('{"payload_unavailable":true}'),
//         };
//       }
//       if (payloadResult.truncated) markMessageTruncated(managed, scriptId);
//     }
//     let binaryResult: Record<string, JsonValue> = {};
//     if (data !== null) {
//       const payloadBytes = payloadResult?.bytes ?? 0;
//       const remainingMessageBytes = Math.max(
//         0,
//         MAX_SESSION_CAPTURE_BYTES -
//           MAX_MESSAGE_METADATA_BYTES -
//           payloadBytes -
//           4096,
//       );
//       const messageBinaryLimit = Math.min(
//         MAX_BINARY_MESSAGE_BYTES,
//         Math.floor((remainingMessageBytes * 3) / 4),
//       );
//       if (secrets.some((secret) => data.includes(secret, 0, "utf8"))) {
//         binaryResult = { data_redacted: true };
//       } else if (data.byteLength > messageBinaryLimit) {
//         binaryResult = {
//           data_truncated: true,
//           data_bytes: data.byteLength,
//         };
//         markMessageTruncated(managed, scriptId);
//       } else {
//         binaryResult = { data_base64: data.toString("base64") };
//       }
//     }
//     const type = boundedRedactedString(
//       message.type,
//       MAX_MESSAGE_TYPE_BYTES,
//       secrets,
//     );
//     const description =
//       message.description === undefined
//         ? undefined
//         : boundedRedactedString(
//             message.description,
//             MAX_MESSAGE_TEXT_BYTES,
//             secrets,
//           );
//     const stack =
//       message.stack === undefined
//         ? undefined
//         : boundedRedactedString(message.stack, MAX_MESSAGE_TEXT_BYTES, secrets);
//     const fileName =
//       message.fileName === undefined
//         ? undefined
//         : boundedRedactedString(
//             message.fileName,
//             MAX_MESSAGE_TEXT_BYTES,
//             secrets,
//           );
//     if (
//       type.truncated ||
//       description?.truncated === true ||
//       stack?.truncated === true ||
//       fileName?.truncated === true
//     )
//       markMessageTruncated(managed, scriptId);
//     const observation: JsonValue = {
//       script_id: scriptId,
//       type: type.value,
//       ...(type.truncated ? { type_truncated: true } : {}),
//       ...(payloadResult === undefined
//         ? {}
//         : {
//             payload: payloadResult.value,
//             ...(payloadResult.truncated ? { payload_truncated: true } : {}),
//           }),
//       ...(description === undefined
//         ? {}
//         : {
//             description: description.value,
//             ...(description.truncated ? { description_truncated: true } : {}),
//           }),
//       ...(stack === undefined
//         ? {}
//         : {
//             stack: stack.value,
//             ...(stack.truncated ? { stack_truncated: true } : {}),
//           }),
//       ...(fileName === undefined
//         ? {}
//         : {
//             file_name: fileName.value,
//             ...(fileName.truncated ? { file_name_truncated: true } : {}),
//           }),
//       ...(typeof message.lineNumber === "number" &&
//       Number.isSafeInteger(message.lineNumber) &&
//       message.lineNumber >= 0
//         ? { line_number: message.lineNumber }
//         : {}),
//       ...(typeof message.columnNumber === "number" &&
//       Number.isSafeInteger(message.columnNumber) &&
//       message.columnNumber >= 0
//         ? { column_number: message.columnNumber }
//         : {}),
//       ...binaryResult,
//     };
//     const charge = Buffer.byteLength(JSON.stringify(observation));
//     if (charge > MAX_SESSION_CAPTURE_BYTES) {
//       markMessageTruncated(managed, scriptId);
//       return;
//     }
//     while (
//       managed.messages.size > 0 &&
//       managed.capturedBytes + charge > MAX_SESSION_CAPTURE_BYTES
//     ) {
//       const removed = managed.messages.shift();
//       if (removed !== undefined) {
//         managed.capturedBytes -= removed.charge;
//         // Both queues are in arrival order, so the globally oldest message is
//         // also the oldest one retained for its script.
//         const scriptMessages = managed.messagesByScript.get(removed.scriptId);
//         if (scriptMessages?.peek() === removed.observation)
//           scriptMessages.shift();
//         markMessageTruncated(managed, removed.scriptId);
//       }
//     }
//     managed.messages.push({ observation, scriptId, charge });
//     managed.messagesByScript.get(scriptId)?.push(observation);
//     managed.capturedBytes += charge;
//   }
//
//   async #getDeviceManager(): Promise<DeviceManager> {
//     if (this.#deviceManager !== undefined) return this.#deviceManager;
//     if (this.#deviceManagerLoading !== undefined)
//       return this.#deviceManagerLoading;
//     const loading = Promise.resolve().then(this.#deviceManagerLoader);
//     this.#deviceManagerLoading = loading;
//     try {
//       this.#deviceManager = await loading;
//       if (this.#availabilityFailure?.providerId === "frida")
//         this.#availabilityFailure = undefined;
//       return this.#deviceManager;
//     } catch (cause: unknown) {
//       this.#availabilityFailure = {
//         providerId: "frida",
//         reason: boundedRedactedString(errorMessage(cause), 4096, []).value,
//       };
//       throw cause;
//     } finally {
//       if (this.#deviceManagerLoading === loading)
//         this.#deviceManagerLoading = undefined;
//     }
//   }
//
//   async #selectDevice(
//     manager: DeviceManager,
//     selector: FridaDeviceSelector,
//   ): Promise<Device> {
//     if (selector.remote !== undefined)
//       return this.#retainRemote(manager, selector.remote);
//     return manager.getDeviceById(
//       selector.deviceId ?? "local",
//       DEVICE_LOOKUP_TIMEOUT_MS,
//     );
//   }
//
//   async #retainRemote(
//     manager: DeviceManager,
//     remote: FridaRemoteConnection,
//   ): Promise<Device> {
//     return this.#withRemoteLock(remote.address, async () => {
//       const optionsDigest = createHash("sha256")
//         .update(JSON.stringify(remoteOptions(remote)))
//         .digest("hex");
//       let reference = this.#remoteDevices.get(remote.address);
//       if (reference !== undefined) {
//         if (reference.optionsDigest !== optionsDigest)
//           throw new AnalysisInputError("frida_remote_connection", undefined, [
//             {
//               path: ["remote"],
//               reason: "invalid_value",
//               message:
//                 "This endpoint is already retained with different connection options. Reuse the existing options or close its sessions before changing them.",
//             },
//           ]);
//         reference.references += 1;
//       } else {
//         const device = manager.addRemoteDevice(
//           remote.address,
//           remoteOptions(remote),
//         );
//         reference = { references: 1, optionsDigest, device };
//         this.#remoteDevices.set(remote.address, reference);
//       }
//       try {
//         return await reference.device;
//       } catch (cause: unknown) {
//         reference.references -= 1;
//         if (reference.references === 0)
//           this.#remoteDevices.delete(remote.address);
//         throw cause;
//       }
//     });
//   }
//
//   async #releaseRemote(
export const _l = 377;
