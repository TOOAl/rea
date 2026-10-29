export const __stub = 1;
//         database: this.#database,
//         timeoutMs: this.config.timeoutMs,
//         signal: options?.signal,
//       });
//       const metadata = modernHealthSchema.parse(raw);
//       this.#metadata = raw;
//       onObserved?.(raw);
//       if (
//         !sameIdaHostPath(metadata.input_path, this.#workspace.inputPath) ||
//         (await idaFileDigest(this.#workspace.inputPath)) !==
//           this.#workspace.inputSha256
//       )
//         throw new AnalysisProtocolError(
//           "IDA headless input identity changed after target admission.",
//         );
//       if (metadata.auto_analysis_ready !== true)
//         throw new AnalysisProtocolError(
//           "IDA auto-analysis is incomplete or readiness is unknown; retry after analysis completes.",
//         );
//       identity = JSON.stringify([
//         this.#database,
//         metadata.input_path,
//         metadata.idb_path,
//         metadata.imagebase,
//       ]);
//     }
//     if (
//       this.#initialIdentity !== undefined &&
//       identity !== this.#initialIdentity
//     )
//       throw new AnalysisProtocolError(
//         "The attached IDA target or image base changed during the REA session; reopen the target.",
//       );
//     this.#initialIdentity = identity;
//     return this.#metadata;
//   }
//
//   async close(): Promise<Result<null, AnalysisError>> {
//     if (this.#closePromise !== undefined) return this.#closePromise;
//     const closing = this.#closeOnce();
//     const shared = closing.finally(() => {
//       if (this.#closePromise === shared) this.#closePromise = undefined;
//     });
//     this.#closePromise = shared;
//     return shared;
//   }
//
//   /**
//    * Upstream sessions whose release cleanup has not confirmed: the entries
//    * the latest successful inventory found blocking release; else the
//    * requested private worker until its close is confirmed, and then none
//    * known.
//    */
//   #unreleasedSessions(): readonly UpstreamSession[] | undefined {
//     if (this.#blockingSessions !== undefined) return this.#blockingSessions;
//     if (
//       !this.#openAttempted ||
//       this.#workspace === undefined ||
//       this.#openRejected
//     )
//       return undefined;
//     return this.#databaseCloseCompleted
//       ? []
//       : [
//           {
//             session_id: this.#workspace.sessionId,
//             backend: "worker",
//             owned: null,
//             input_path: null,
//             is_active: null,
//           },
//         ];
//   }
//
//   /** Drop a session whose release upstream confirmed, keeping other blockers. */
//   #forgetReleasedSession(sessionId: string): void {
//     const remaining = this.#blockingSessions?.filter(
//       ({ session_id }) => session_id !== sessionId,
//     );
//     this.#blockingSessions =
//       remaining !== undefined && remaining.length > 0 ? remaining : undefined;
//   }
//
//   /** Replace blocker evidence from a successful inventory; true when blocked. */
//   #recordBlockingSessions(
//     entries: readonly (UpstreamSession & { readonly owned: boolean })[],
//   ): boolean {
//     this.#blockingSessions =
//       entries.length > 0
//         ? entries.map(
//             ({ session_id, backend, owned, input_path, is_active }) => ({
//               session_id,
//               backend,
//               owned,
//               input_path,
//               is_active,
//             }),
//           )
//         : undefined;
//     return entries.length > 0;
//   }
//
//   async #closeDatabase(database: string): Promise<void> {
//     const response = await this.connection.call("idb_close", {
//       database,
//       save: false,
//     });
//     const closed = closeDatabaseSchema.safeParse(response);
//     if (!closed.success) {
//       if (!absentDatabaseCloseSchema(database).safeParse(response).success)
//         throw closed.error;
//       return;
//     }
//     if (
//       closed.data.session_id !== database ||
//       closed.data.saved === true ||
//       closed.data.owned !== true ||
//       closed.data.backend !== "worker"
//     )
//       throw new AnalysisProtocolError(
//         "IDA database close did not confirm the requested owned, unsaved session release.",
//       );
//   }
//
//   async #closeOnce(): Promise<Result<null, AnalysisError>> {
//     this.#closing = true;
//     await this.#tail;
//     if (this.#closed) return ok(null);
//     try {
//       if (this.#workspace !== undefined && this.#openAttempted) {
//         if (this.#database === undefined) {
//           const inventory = databaseListSchema.parse(
//             await this.connection.call("idb_list", {}),
//           );
//           const workspace = this.#workspace;
//           this.#database = inventory.sessions.find(
//             (entry) =>
//               entry.owned &&
//               entry.backend === "worker" &&
//               entry.session_id === workspace.sessionId &&
//               sameIdaHostPath(entry.input_path, workspace.inputPath),
//           )?.session_id;
//           // Every same-input session and any entry under the requested ID,
//           // whatever its input, stays reported until a later successful
//           // inventory confirms release.
//           const blocked = this.#recordBlockingSessions(
//             inventory.sessions.filter(
//               (entry) =>
//                 entry.session_id === workspace.sessionId ||
//                 sameIdaHostPath(entry.input_path, workspace.inputPath),
//             ),
//           );
//           if (this.#database === undefined && blocked)
//             throw new AnalysisProtocolError(
//               "A registered session still matches the requested ID or private input without a verified private worker binding; the workspace was retained.",
//             );
//           if (
//             this.#database === undefined &&
//             this.#openCompleted &&
//             !this.#openRejected
//           )
//             throw new AnalysisProtocolError(
//               "IDA open returned without a verified private worker binding. An empty session inventory does not prove that its Worker exited; the private workspace was retained.",
//             );
//         }
//         if (this.#database !== undefined) {
//           if (!this.#databaseCloseCompleted) {
//             await this.#closeDatabase(this.#database);
//             this.#databaseCloseCompleted = true;
//             this.#forgetReleasedSession(this.#database);
//           }
//           const inventory = databaseListSchema.parse(
//             await this.connection.call("idb_list", {}),
//           );
//           const remaining = inventory.sessions.filter(
//             (entry) =>
//               entry.session_id === this.#database ||
//               sameIdaHostPath(
//                 entry.input_path,
//                 this.#workspace?.inputPath ?? "",
//               ),
//           );
//           if (this.#recordBlockingSessions(remaining))
//             throw new AnalysisProtocolError(
//               "IDA worker remains registered after close.",
//             );
//           this.#database = undefined;
//         }
//         if (!this.#openCompleted)
//           throw new AnalysisProtocolError(
//             "IDA database open did not return a completed response. Worker inventory cannot prove that the request has stopped; the private workspace was retained.",
//           );
//         this.#openAttempted = false;
//       }
//       await this.connection.close();
//       await this.#workspace?.remove();
//       this.#closed = true;
//       return ok(null);
//     } catch (cause: unknown) {
//       this.connection.detach();
//       return err(
//         new IdaCleanupError(
//           this.#workspace?.directory ?? "IDA MCP connection",
//           cause,
//           this.#unreleasedSessions(),
//         ),
//       );
//     }
//   }
// }
export const _l = 210;
