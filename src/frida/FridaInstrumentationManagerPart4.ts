export const __stub = 1;
//     manager: DeviceManager,
//     address: string,
//     releaseReference = true,
//   ): Promise<void> {
//     return this.#withRemoteLock(address, async () => {
//       const reference = this.#remoteDevices.get(address);
//       if (reference === undefined) return;
//       if (releaseReference)
//         reference.references = Math.max(0, reference.references - 1);
//       if (reference.references > 0) return;
//       try {
//         await reference.device;
//       } catch {
//         this.#remoteDevices.delete(address);
//         return;
//       }
//       await manager.removeRemoteDevice(address);
//       if (this.#remoteDevices.get(address) === reference)
//         this.#remoteDevices.delete(address);
//     });
//   }
//
//   async #withRemoteLock<Value>(
//     address: string,
//     operation: () => Promise<Value>,
//   ): Promise<Value> {
//     const previous = this.#remoteQueues.get(address) ?? Promise.resolve();
//     let release: (() => void) | undefined;
//     const current = new Promise<void>((resolve) => {
//       release = resolve;
//     });
//     const tail = previous.then(() => current);
//     this.#remoteQueues.set(address, tail);
//     await previous;
//     try {
//       return await operation();
//     } finally {
//       release?.();
//       if (this.#remoteQueues.get(address) === tail)
//         this.#remoteQueues.delete(address);
//     }
//   }
// }
//
// const boundedRedactedString = (
//   input: string,
//   maximumBytes: number,
//   secrets: readonly string[],
// ): { readonly value: string; readonly truncated: boolean } => {
//   const chunks: string[] = [];
//   let outputBytes = 0;
//   let cursor = 0;
//   let segmentStart = 0;
//   let truncated = false;
//   while (cursor < input.length) {
//     let nextSecretStart = input.length;
//     let nextSecret: string | undefined;
//     for (const secret of secrets) {
//       const match = input.indexOf(secret, cursor);
//       if (match !== -1 && match < nextSecretStart) {
//         nextSecretStart = match;
//         nextSecret = secret;
//       }
//     }
//     if (nextSecretStart === cursor && nextSecret !== undefined) {
//       const replacement = "[redacted]";
//       const replacementBytes = jsonStringBytes(replacement) - 2;
//       if (outputBytes + replacementBytes > maximumBytes) {
//         truncated = true;
//         break;
//       }
//       chunks.push(input.slice(segmentStart, cursor), replacement);
//       outputBytes += replacementBytes;
//       cursor += nextSecret.length;
//       segmentStart = cursor;
//       continue;
//     }
//     while (cursor < nextSecretStart) {
//       const codePoint = input.codePointAt(cursor);
//       if (codePoint === undefined) break;
//       const character = String.fromCodePoint(codePoint);
//       const characterBytes = jsonStringBytes(character) - 2;
//       if (
//         cursor + character.length > nextSecretStart ||
//         outputBytes + characterBytes > maximumBytes
//       ) {
//         truncated = true;
//         break;
//       }
//       outputBytes += characterBytes;
//       cursor += character.length;
//     }
//     if (truncated) break;
//   }
//   chunks.push(input.slice(segmentStart, cursor));
//   if (cursor < input.length) truncated = true;
//   return { value: chunks.join(""), truncated };
// };
//
// const boundedJsonValue = (
//   input: unknown,
//   maximumBytes: number,
//   secrets: readonly string[],
// ): {
//   readonly value: JsonValue;
//   readonly truncated: boolean;
//   readonly bytes: number;
// } => {
//   const seen = new WeakSet<object>();
//   let remainingNodes = MAX_CAPTURE_JSON_NODES;
//   const visit = (
//     value: unknown,
//     budget: number,
//     depth: number,
//   ): { readonly value: JsonValue; readonly truncated: boolean } => {
//     remainingNodes -= 1;
//     if (remainingNodes < 0) return { value: null, truncated: true };
//     if (depth > 64 || budget < 8) return { value: null, truncated: true };
//     if (value === null) return { value: null, truncated: false };
//     if (typeof value === "boolean" || typeof value === "number")
//       return {
//         value:
//           typeof value === "number" && !Number.isFinite(value) ? null : value,
//         truncated: typeof value === "number" && !Number.isFinite(value),
//       };
//     if (typeof value === "string") {
//       const bounded = boundedRedactedString(
//         value,
//         Math.max(0, budget - 2),
//         secrets,
//       );
//       return { value: bounded.value, truncated: bounded.truncated };
//     }
//     if (typeof value !== "object") return { value: null, truncated: true };
//     if (seen.has(value)) return { value: null, truncated: true };
//     seen.add(value);
//     try {
//       if (Array.isArray(value)) {
//         const output: JsonValue[] = [];
//         let usedBytes = 2;
//         let truncated = false;
//         for (let index = 0; index < value.length; index += 1) {
//           const separatorBytes = output.length === 0 ? 0 : 1;
//           const remaining = budget - usedBytes - separatorBytes - 1;
//           if (remaining < 8) {
//             truncated = true;
//             break;
//           }
//           const item = visit(value[index] ?? null, remaining, depth + 1);
//           const itemBytes = Buffer.byteLength(JSON.stringify(item.value));
//           if (itemBytes > remaining) {
//             truncated = true;
//             break;
//           }
//           output.push(item.value);
//           usedBytes += separatorBytes + itemBytes;
//           truncated ||= item.truncated;
//           if (item.truncated) break;
//         }
//         if (output.length < value.length) truncated = true;
//         return { value: output, truncated };
//       }
//       const output: Record<string, JsonValue> = {};
//       let usedBytes = 2;
//       let entries = 0;
//       let truncated = false;
//       for (const rawKey in value) {
//         if (!Object.hasOwn(value, rawKey)) continue;
//         const separatorBytes = entries === 0 ? 0 : 1;
//         const keyLimit = Math.max(0, budget - usedBytes - separatorBytes - 10);
//         const boundedKey = boundedRedactedString(rawKey, keyLimit, secrets);
//         if (boundedKey.truncated) {
//           truncated = true;
//           break;
//         }
//         const key = boundedKey.value;
//         const keyBytes = jsonStringBytes(key) + 1;
//         const remaining = budget - usedBytes - separatorBytes - keyBytes - 1;
//         if (remaining < 8) {
//           truncated = true;
//           break;
//         }
//         const entry = visit(Reflect.get(value, rawKey), remaining, depth + 1);
//         const entryBytes = Buffer.byteLength(JSON.stringify(entry.value));
//         if (entryBytes > remaining) {
//           truncated = true;
//           break;
//         }
//         Object.defineProperty(output, key, {
//           value: entry.value,
//           configurable: true,
//           enumerable: true,
//           writable: true,
//         });
//         entries += 1;
//         usedBytes += separatorBytes + keyBytes + entryBytes;
//         truncated ||= entry.truncated;
//         if (entry.truncated) break;
//       }
//       return { value: output, truncated };
//     } finally {
//       seen.delete(value);
//     }
//   };
//   const result = visit(input, maximumBytes, 0);
//   const bytes = Buffer.byteLength(JSON.stringify(result.value));
//   return bytes > maximumBytes
//     ? { value: null, truncated: true, bytes: Buffer.byteLength("null") }
//     : { ...result, bytes };
// };
//
// const jsonStringBytes = (value: string): number => {
//   let bytes = Buffer.byteLength(value) + 2;
//   for (let index = 0; index < value.length; index += 1) {
//     const code = value.charCodeAt(index);
//     if (
//       code === 34 ||
//       code === 92 ||
//       code === 8 ||
//       code === 9 ||
//       code === 10 ||
//       code === 12 ||
//       code === 13
//     )
//       bytes += 1;
//     else if (code < 32) bytes += 5;
//     else if (
//       code >= 0xd800 &&
//       code <= 0xdbff &&
//       (value.charCodeAt(index + 1) < 0xdc00 ||
//         value.charCodeAt(index + 1) > 0xdfff)
//     )
//       bytes += 3;
//     else if (
//       code >= 0xdc00 &&
//       code <= 0xdfff &&
//       (index === 0 ||
//         value.charCodeAt(index - 1) < 0xd800 ||
//         value.charCodeAt(index - 1) > 0xdbff)
//     )
//       bytes += 3;
//   }
//   return bytes;
// };
//
// const remoteOptions = (remote: FridaRemoteConnection): RemoteDeviceOptions => ({
//   ...(remote.token === undefined ? {} : { token: remote.token }),
//   ...(remote.certificate === undefined
//     ? {}
//     : { certificate: remote.certificate }),
//   ...(remote.origin === undefined ? {} : { origin: remote.origin }),
//   ...(remote.keepaliveInterval === undefined
//     ? {}
//     : { keepaliveInterval: remote.keepaliveInterval }),
// });
//
// const sessionObservation = (
//   managed: ManagedSession,
// ): FridaSessionObservation => ({
//   sessionId: managed.id,
//   deviceId: managed.device.id,
//   target: managed.target,
//   pid: managed.pid,
//   mode: managed.mode,
//   state: managed.state,
// });
//
// const sanitizeError = (
//   cause: unknown,
//   remote?: FridaRemoteConnection,
// ): string =>
//   boundedRedactedString(
//     errorMessage(cause),
//     4096,
//     [remote?.token, remote?.certificate].filter(
//       (secret): secret is string => secret !== undefined && secret.length > 0,
//     ),
//   ).value;
//
// const providerError = (
//   operation: string,
//   cause: unknown,
//   remote?: FridaRemoteConnection,
//   cleanupReason?: string,
// ): AnalysisError => {
//   if (cause instanceof AnalysisInputError)
//     return new AnalysisInputError(operation, { cause }, cause.issues);
//   if (cause instanceof AnalysisCancelledError)
//     return new AnalysisCancelledError(operation, {
//       cause: cause.cause,
//       ...(cleanupReason === undefined
//         ? {}
//         : {
//             cleanup: {
//               reason: cleanupReason,
//               resources: ["Frida provider operation"],
//             },
//           }),
//     });
//   const reason = sanitizeError(cause, remote);
//   return new AnalysisCapabilityUnavailableError("frida", operation, reason, {
//     cause: remote === undefined ? cause : new Error(reason),
//     ...(cleanupReason === undefined
//       ? {}
//       : {
//           cleanup: {
//             reason: cleanupReason,
//             resources: ["Frida provider operation"],
//           },
//         }),
//   });
// };
//
// const errorMessage = (cause: unknown): string =>
//   cause instanceof Error ? cause.message : String(cause);
//
// const cancelledOperation = (
//   operation: string,
//   signal: AbortSignal,
// ): AnalysisCancelledError =>
//   new AnalysisCancelledError(operation, { cause: signal.reason });
//
// interface CapturedMessage {
//   readonly observation: JsonValue;
//   readonly scriptId: string;
//   /** Serialized bytes charged against the session capture budget. */
//   readonly charge: number;
// }
//
// const markMessageTruncated = (
//   managed: ManagedSession,
//   scriptId: string,
// ): void => {
//   managed.messagesTruncated = true;
//   if (managed.messagesByScript.has(scriptId))
//     managed.truncatedScripts.add(scriptId);
// };
//
// /**
//  * Arrival-ordered queue whose eviction advances a head offset. A full capture
//  * budget evicts on every message, and `Array#shift` would copy every retained
//  * message each time.
//  */
// class MessageFifo<T> {
//   #items: (T | undefined)[] = [];
//   #head = 0;
//
//   get size(): number {
//     return this.#items.length - this.#head;
//   }
//
//   push(item: T): void {
//     this.#items.push(item);
//   }
//
//   peek(): T | undefined {
//     return this.#items[this.#head];
//   }
//
//   shift(): T | undefined {
//     if (this.#head >= this.#items.length) return undefined;
//     const item = this.#items[this.#head];
//     this.#items[this.#head] = undefined;
//     this.#head += 1;
//     // Compacting once half the slots are evicted keeps eviction amortized O(1).
//     if (this.#head * 2 >= this.#items.length) {
//       this.#items = this.#items.slice(this.#head);
//       this.#head = 0;
//     }
//     return item;
//   }
//
//   toArray(): T[] {
//     return this.#items.slice(this.#head) as T[];
//   }
// }
export const _l = 376;
