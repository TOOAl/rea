export const __stub = 1;
//     try {
//       descriptor = await this.#find(sessionId);
//     } catch (cause) {
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           "cutter",
//           "cutter_command",
//           cause instanceof Error ? cause.message : "Cutter session unavailable",
//           { cause },
//         ),
//       );
//     }
//     try {
//       const raw = await this.#request(
//         descriptor,
//         serializeRequest(descriptor, {
//           kind: "status",
//           session_id: sessionId,
//         }),
//       );
//       const parsed = responseSchema.safeParse(raw);
//       if (
//         !parsed.success ||
//         !parsed.data.ok ||
//         parsed.data.session_id !== sessionId
//       )
//         return err(
//           new AnalysisOutputError(
//             "cutter_command_status",
//             "The bridge status response did not contain a valid session identity.",
//             { cause: parsed.success ? undefined : parsed.error },
//           ),
//         );
//       const completed = (parsed.data.completed_commands ?? []).some(
//         (receipt) => receipt.request_id === requestId,
//       );
//       if (completed) await this.#acknowledgeCompletion(descriptor, requestId);
//       return ok(
//         completed ||
//           (completionToken !== undefined &&
//             parsed.data.completed_connection !== undefined &&
//             parsed.data.completed_connection >= completionToken),
//       );
//     } catch (cause) {
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           "cutter",
//           "cutter_command_status",
//           cause instanceof Error ? cause.message : "Cutter status failed",
//           { cause },
//         ),
//       );
//     }
//   }
//
//   async #recoverCompletedCommands(
//     descriptor: z.infer<typeof descriptorSchema>,
//     signal?: AbortSignal,
//   ): Promise<void> {
//     const raw = await this.#request(
//       descriptor,
//       serializeRequest(descriptor, {
//         kind: "status",
//         session_id: descriptor.session_id,
//       }),
//       signal,
//     );
//     const status = responseSchema.safeParse(raw);
//     if (
//       !status.success ||
//       !status.data.ok ||
//       status.data.session_id !== descriptor.session_id
//     )
//       throw new AnalysisOutputError(
//         "cutter_command_status",
//         "The bridge status response did not contain a valid session identity.",
//         { cause: status.success ? undefined : status.error },
//       );
//     if (status.data.completed_connection === undefined)
//       throw new AnalysisOutputError(
//         "cutter_command_status",
//         "The bridge did not provide authenticated proof that earlier connections reached a terminal state.",
//       );
//     const pending =
//       this.#pendingAcknowledgements.get(descriptor.session_id) ?? new Set();
//     for (const receipt of status.data.completed_commands ?? [])
//       pending.add(receipt.request_id);
//     if (pending.size > 0)
//       this.#pendingAcknowledgements.set(descriptor.session_id, pending);
//   }
//
//   async #acknowledgeCompletion(
//     descriptor: z.infer<typeof descriptorSchema>,
//     requestId: string,
//   ): Promise<boolean> {
//     try {
//       const raw = await this.#request(
//         descriptor,
//         serializeRequest(descriptor, {
//           kind: "ack",
//           request_id: requestId,
//         }),
//       );
//       const acknowledged = acknowledgementSchema.safeParse(raw);
//       if (!acknowledged.success)
//         throw new Error(
//           "Cutter did not confirm the completion receipt acknowledgement.",
//         );
//       const pending = this.#pendingAcknowledgements.get(descriptor.session_id);
//       pending?.delete(requestId);
//       if (pending?.size === 0)
//         this.#pendingAcknowledgements.delete(descriptor.session_id);
//       return true;
//     } catch {
//       const pending =
//         this.#pendingAcknowledgements.get(descriptor.session_id) ??
//         new Set<string>();
//       pending.add(requestId);
//       this.#pendingAcknowledgements.set(descriptor.session_id, pending);
//       return false;
//     }
//   }
//
//   async #retryPendingAcknowledgements(
//     descriptor: z.infer<typeof descriptorSchema>,
//   ): Promise<void> {
//     const pending = this.#pendingAcknowledgements.get(descriptor.session_id);
//     if (pending === undefined) return;
//     for (const requestId of pending) {
//       if (!(await this.#acknowledgeCompletion(descriptor, requestId)))
//         throw new AnalysisCapabilityUnavailableError(
//           "cutter",
//           "cutter_command",
//           "A retained Cutter completion receipt could not be acknowledged; no new command was sent.",
//         );
//     }
//   }
//
//   async #find(sessionId: string): Promise<z.infer<typeof descriptorSchema>> {
//     const loaded = await this.#readDescriptors();
//     if (loaded.error === "bridge_directory_capacity_exceeded")
//       throw new AnalysisResourceConstraintError(
//         "cutter_command",
//         "transport",
//         "Cutter descriptor discovery exceeded its candidate budget; no command was sent.",
//         {
//           max_descriptor_candidates: MAX_DESCRIPTOR_CANDIDATES,
//           bridge_directory: this.#directory,
//         },
//       );
//     if (loaded.error !== undefined)
//       throw new AnalysisCapabilityUnavailableError(
//         "cutter",
//         "cutter_command",
//         `Cutter descriptor discovery failed: ${loaded.error}`,
//       );
//     const descriptor = loaded.descriptors.find(
//       (candidate) => candidate.session_id === sessionId,
//     );
//     if (descriptor === undefined)
//       throw new Error("Cutter bridge session is unavailable or stale");
//     return descriptor;
//   }
//
//   async listDescriptors(): Promise<
//     readonly z.infer<typeof descriptorSchema>[]
//   > {
//     const loaded = await this.#readDescriptors();
//     return loaded.descriptors;
//   }
//
//   async #readDescriptors(): Promise<{
//     readonly descriptors: readonly z.infer<typeof descriptorSchema>[];
//     readonly security:
//       | "private_verified"
//       | "not_private"
//       | "unverified_platform_acl"
//       | "not_checked";
//     readonly error?:
//       | "bridge_directory_unavailable"
//       | "bridge_directory_insecure"
//       | "bridge_directory_capacity_exceeded";
//   }> {
//     let directoryInfo;
//     try {
//       directoryInfo = await lstat(this.#directory);
//     } catch (cause) {
//       const code = (cause as NodeJS.ErrnoException).code;
//       if (code === "ENOENT")
//         return { descriptors: [], security: "not_checked" };
//       return {
//         descriptors: [],
//         security: "not_checked",
//         error: "bridge_directory_unavailable",
//       };
//     }
//     if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink())
//       return {
//         descriptors: [],
//         security: "not_private",
//         error: "bridge_directory_insecure",
//       };
//     const currentUid =
//       this.#platform !== "win32" ? process.getuid?.() : undefined;
//     const posix = currentUid !== undefined;
//     if (
//       posix &&
//       (directoryInfo.uid !== currentUid || (directoryInfo.mode & 0o077) !== 0)
//     )
//       return {
//         descriptors: [],
//         security: "not_private",
//         error: "bridge_directory_insecure",
//       };
//     let security:
//       | "private_verified"
//       | "not_private"
//       | "unverified_platform_acl" = posix
//       ? "private_verified"
//       : "unverified_platform_acl";
//     const windowsPrivateReader = this.#windowsPrivateReader;
//     if (!posix) {
//       if (this.#platform !== "win32" || windowsPrivateReader === undefined)
//         return {
//           descriptors: [],
//           security,
//           error: "bridge_directory_insecure",
//         };
export const _l = 228;
