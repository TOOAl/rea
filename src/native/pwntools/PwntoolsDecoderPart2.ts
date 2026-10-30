export const __stub = 1;
//       state === "cancelled"
//         ? err(new AnalysisCancelledError(this.profile.operation))
//         : operation,
//     );
//   }
//
//   async #inspect(
//     input: Input,
//     options?: ExecutionOptions,
//   ): Promise<Result<Report, AnalysisError>> {
//     const pending = await this.#retire();
//     if (pending !== undefined) return err(pending);
//     const OPERATION = this.profile.operation;
//     const context = { operation: OPERATION, providerId: this.identity.id };
//     const replySchema = z.discriminatedUnion("ok", [
//       z.strictObject({
//         ok: z.literal(true),
//         profile: z.literal(PWNTOOLS_PROVIDER_IDENTITY.version),
//         value: this.profile.payloadSchema,
//       }),
//       z.strictObject({
//         ok: z.literal(false),
//         reason: z.enum([
//           "format",
//           "unsupported",
//           "unsupported-target",
//           "unavailable",
//           "resource-limit",
//           "output-limit",
//           "decoder",
//         ]),
//         message: z.string(),
//         reported_limits: pwntoolsResourceLimitsSchema.nullable().optional(),
//       }),
//     ]);
//     let root: Pick<PrivateRuntimeRoot, "path" | "close"> | undefined;
//     let result: Result<Report, AnalysisError>;
//     let phase: "configuration" | "artifact-read" | "decoder" = "configuration";
//     const executablePath = this.environment.REA_PWNTOOLS_PYTHON ?? "";
//     let selectedPath = executablePath;
//     const failure = (cause: unknown) =>
//       pwntoolsDecoderFailure(
//         cause,
//         phase,
//         selectedPath,
//         executablePath,
//         {},
//         context,
//       );
//     try {
//       if (options?.signal?.aborted) throw new AnalysisCancelledError(OPERATION);
//       if (process.platform !== "linux" || process.arch !== "x64")
//         throw new AnalysisCapabilityUnavailableError(
//           this.identity.id,
//           OPERATION,
//           HOST_REQUIREMENT,
//           { userMessage: HOST_REQUIREMENT },
//         );
//       if (!isAbsolute(selectedPath))
//         throw pwntoolsUnavailable(
//           "Set REA_PWNTOOLS_PYTHON to an absolute caller-supplied Python executable with pwntools 4.15.0, pyelftools 0.33 and Unicorn 2.1.2; REA never installs Python or packages.",
//           selectedPath,
//           undefined,
//           undefined,
//           context,
//         );
//       await access(selectedPath, constants.X_OK);
//       if (!(await stat(selectedPath)).isFile())
//         throw pwntoolsUnavailable(
//           "Selected Python executable must be a regular executable file, not a directory: " +
//             selectedPath,
//           selectedPath,
//           undefined,
//           undefined,
//           context,
//         );
//       const inputLimit = pwntoolsInputBytes(this.environment);
//       if (!inputLimit.configured)
//         throw pwntoolsUnavailable(
//           inputLimit.error,
//           selectedPath,
//           undefined,
//           undefined,
//           {
//             ...context,
//             configurationKey: "REA_PWNTOOLS_MAX_INPUT_BYTES",
//           },
//         );
//       phase = "artifact-read";
//       selectedPath = input.path;
//       const snapshot = await readStableArtifact(
//         input.path,
//         inputLimit.bytes,
//         options?.signal,
//         undefined,
//         this.#resources,
//       );
//       phase = "decoder";
//       root = await this.createRuntime();
//       this.#pendingCleanup = {
//         root,
//         process: undefined,
//         failure: undefined,
//         diagnostics: undefined,
//         observation: undefined,
//       };
//       const requestPath = join(root.path, "request.json");
//       const snapshotPath = join(root.path, "object.snapshot");
//       const replyPath = join(root.path, "reply.json");
//       await writeFile(snapshotPath, snapshot.bytes, {
//         flag: "wx",
//         mode: 0o600,
//         ...(options?.signal === undefined ? {} : { signal: options.signal }),
//       });
//       await writeFile(
//         requestPath,
//         JSON.stringify({ snapshot_path: snapshotPath, reply_path: replyPath }),
//         { flag: "wx", mode: 0o600 },
//       );
//       const execution = await this.#runCommand(
//         {
//           command: this.environment.REA_PWNTOOLS_PYTHON ?? "",
//           arguments: [
//             "-I",
//             fileURLToPath(this.profile.bridge),
//             join(root.path, "resource.failure"),
//             requestPath,
//           ],
//           cwd: root.path,
//           // Caller-selected Python launchers can exec through prlimit or a
//           // shell wrapper. Keep parent/group/run-token ownership across exec.
//           expectedCommand: null,
//           runId: `rea-artifact-decoder-${randomUUID()}`,
//           hostEnvironment: {
//             ...this.environment,
//             PWNLIB_NOTERM: "1",
//             OPENBLAS_NUM_THREADS: "1",
//             OMP_NUM_THREADS: "1",
//           },
//         },
//         options,
//         failure,
//       );
//       const capturedOutput = capturedPwntoolsOutput(execution);
//       let reply: z.output<typeof replySchema>;
//       try {
//         const file = await readStableArtifact(
//           replyPath,
//           PWNTOOLS_LIMITS.outputBytes,
//           options?.signal,
//           undefined,
//           this.#resources,
//         );
//         reply = replySchema.parse(JSON.parse(file.bytes.toString("utf8")));
//       } catch (cause: unknown) {
//         if (options?.signal?.aborted)
//           throw new AnalysisCancelledError(OPERATION, {
//             cause,
//             capturedOutput,
//           });
//         throw new AnalysisOutputError(
//           OPERATION,
//           `Owned pwntools decoder reply failed for ${input.path}: ${cause instanceof z.ZodError ? cause.issues[0]?.message + " at " + (cause.issues[0]?.path.map(String).join(".") ?? "root") : cause instanceof Error ? cause.message : String(cause)}`,
//           { cause, capturedOutput },
//         );
//       }
//       if (!reply.ok) {
//         if (reply.reason === "unsupported-target")
//           throw new AnalysisUnsupportedTargetError(
//             OPERATION,
//             input.path,
//             reply.message,
export const _l = 172;
