export const __stub = 1;
//       failure = cause;
//     else if (cause instanceof AnalysisError) failure = cause;
//     else if (cause instanceof z.ZodError)
//       failure = new AnalysisOutputError(
//         operation,
//         `IDA MCP returned malformed or unsupported producer data: ${cause.issues.map((issue) => `${issue.path.join(".") || "$"}: ${issue.message}`).join("; ")}`,
//         { cause },
//       );
//     else
//       failure = new ProviderAdapterError("ida", operation, {
//         cause,
//         diagnostics: {
//           reason:
//             cause instanceof Error ? cause.message : "Unknown upstream failure",
//           recovery:
//             "Check the configured upstream MCP registration and selected target; see docs/ida-provider.md.",
//         },
//       });
//     // Only operation calls made after target identity/readiness validation can
//     // become partial Evidence. The failing call itself is absent from `raw`
//     // when its transport or MCP envelope could not be decoded.
//     const { runner, metadataBefore, metadataAfter } = context;
//     if (
//       runner !== undefined &&
//       runner.raw.length > 0 &&
//       metadataBefore !== undefined
//     ) {
//       const observations = jsonValueSchema.parse(runner.raw);
//       const upstream = this.connection.serverInfo();
//       const binding =
//         context.postOperationIdentityCheck !== "verified"
//           ? {
//               status: "not_verified",
//               reason:
//                 cause instanceof Error
//                   ? cause.message
//                   : "Post-operation target identity was not observed.",
//             }
//           : { status: "verified" };
//       failure.retainPartialObservation(
//         createEvidence(this.target, IDA_PROVIDER_IDENTITY, {
//           predicateType: "analysis-observation",
//           operation,
//           parameters: context.parameters,
//           result: {
//             status: "partial",
//             failed_operation: operation,
//             observations,
//             metadata_before: metadataBefore,
//             target_binding: binding,
//             ...(metadataAfter === undefined
//               ? {}
//               : { metadata_after: metadataAfter }),
//           },
//           rawResult: {
//             upstream,
//             observations,
//             metadata_before: metadataBefore,
//             ...(metadataAfter === undefined
//               ? {}
//               : { metadata_after: metadataAfter }),
//             post_operation_identity_check: context.postOperationIdentityCheck,
//           },
//           confidence: "observed",
//           authority: "external-service",
//           limitations: [
//             ...IDA_LIMITATIONS,
//             ...runner.limitations,
//             "The requested IDA operation failed after these completed upstream replies; the partial Evidence does not establish a complete result.",
//             "Replies are bound to the selected target only by the pre-operation identity check unless post_operation_identity_check is verified.",
//           ],
//           locations: [
//             { kind: "artifact-path", path: this.target.path },
//             ...runner.locations,
//           ],
//         }),
//       );
//     }
//     return err(failure);
//   }
//
//   #start(): Promise<void> {
//     this.#startup ??= this.#initialize();
//     return this.#startup;
//   }
//
//   async #initialize(): Promise<void> {
//     const tools = new Set(await this.connection.connect());
//     this.#callGraphAdvertised = tools.has("callgraph");
//     this.#surveyAdvertised = tools.has("survey_binary");
//     const expected =
//       this.config.protocol === "native"
//         ? nativeTools
//         : this.config.mode === "attached"
//           ? legacyTools
//           : modernTools;
//     const missing = expected.filter((name) => !tools.has(name));
//     if (missing.length > 0) {
//       const summary = `IDA MCP ${this.config.protocol === "native" ? "native attached" : this.config.mode} compatibility profile is missing tools: ${missing.join(", ")}. Native attached mode requires the native IDA MCP tool catalog; legacy attached mode requires the legacy 1.4 profile; headless mode requires the database supervisor profile. See docs/ida-provider.md.`;
//       // The caller cannot act on a profile mismatch it never sees, so the
//       // missing names travel as adapter diagnostics rather than a bare message.
//       throw new ProviderAdapterError("ida", "initialize", {
//         userMessage: summary,
//         diagnostics: {
//           reason: summary,
//           mode: this.config.mode,
//           expected_profile:
//             this.config.protocol === "native"
//               ? "native"
//               : this.config.mode === "attached"
//                 ? "legacy-1.4"
//                 : "database-supervisor",
//           missing_tools: [...missing],
//           recovery:
//             "Install an IDA MCP build that serves the selected profile; see docs/ida-provider.md.",
//         },
//       });
//     }
//     if (this.config.mode === "headless") {
//       this.#workspace = await IdaWorkspace.allocate(
//         this.target,
//         this.config.workspaceRoot,
//       );
//       await this.#workspace.copyInput();
//       this.#openAttempted = true;
//       const raw = await this.connection.call("idb_open", {
//         input_path: this.#workspace.inputPath,
//         mode: "force_headless",
//         run_auto_analysis: true,
//         build_caches: true,
//         init_hexrays: true,
//         preferred_session_id: this.#workspace.sessionId,
//       });
//       this.#openCompleted = true;
//       // A completed but malformed/positive open may still own a live Worker.
//       // Only an explicit producer rejection keeps the old no-worker branch.
//       this.#openRejected = rejectedOpenDatabaseSchema.safeParse(raw).success;
//       this.#lifecycle.push(raw);
//       const opened = openDatabaseSchema.parse(raw);
//       if (
//         !sameIdaHostPath(opened.session.input_path, this.#workspace.inputPath)
//       )
//         throw new AnalysisProtocolError(
//           "IDA opened a different input than the private admitted target copy.",
//         );
//       if (opened.session.session_id !== this.#workspace.sessionId)
//         throw new AnalysisProtocolError(
//           "IDA returned an adopted or unexpected session instead of the requested private worker.",
//         );
//       const inventory = databaseListSchema.parse(
//         await this.connection.call("idb_list", {}),
//       );
//       this.#lifecycle.push(jsonValueSchema.parse(inventory));
//       const workspace = this.#workspace;
//       this.#recordBlockingSessions(
//         inventory.sessions.filter(
//           (entry) =>
//             entry.session_id === workspace.sessionId ||
//             sameIdaHostPath(entry.input_path, workspace.inputPath),
//         ),
//       );
//       const entry = inventory.sessions.find(
//         ({ session_id }) => session_id === opened.session.session_id,
//       );
//       if (
//         entry?.owned !== true ||
//         entry.backend !== "worker" ||
//         entry.is_active !== true ||
//         !sameIdaHostPath(entry.input_path, this.#workspace.inputPath)
//       )
//         throw new AnalysisProtocolError(
//           "IDA did not return an active owned headless worker for the private input copy.",
//         );
//       this.#database = opened.session.session_id;
//     }
//     this.#ready = true;
//   }
//
//   async #nativeMetadata(): Promise<JsonValue> {
//     if (this.connection.readResource === undefined)
//       throw new AnalysisProtocolError(
//         "Native IDA MCP requires resources/read for recorded input metadata.",
//       );
//     return this.connection.readResource("ida://idb/metadata");
//   }
//
//   async #observe(
//     options?: ExecutionOptions,
//     onObserved?: (metadata: JsonValue) => void,
//   ): Promise<JsonValue> {
//     let identity: string;
//     if (this.config.mode === "attached") {
//       const raw =
//         this.config.protocol === "native"
//           ? await this.#nativeMetadata()
//           : await this.connection.call("get_metadata", {});
//       const metadata = legacyMetadataSchema.parse(raw);
//       this.#metadata = raw;
//       onObserved?.(raw);
//       if (metadata.sha256.toLowerCase() !== this.target.sha256.toLowerCase())
//         throw new AnalysisProtocolError(
//           `The attached IDA input SHA-256 does not match the selected target ${this.target.path}; open that target in IDA or use headless mode.`,
//         );
//       identity = JSON.stringify([
//         metadata.path,
//         metadata.sha256.toLowerCase(),
//         metadata.base,
//       ]);
//     } else {
//       if (this.#database === undefined || this.#workspace === undefined)
//         throw new AnalysisProtocolError(
//           "IDA headless session has no database binding.",
//         );
//       const raw = await readSettledHealth(this.connection, {
export const _l = 214;
