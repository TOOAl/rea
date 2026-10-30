export const __stub = 1;
//       const configured = this.environment.REA_SIGROK_COMMAND ?? "";
//       if (!isAbsolute(configured))
//         throw new Error(
//           "Supply absolute REA_SIGROK_COMMAND for sigrok-cli 0.7.2 with libsigrokdecode.",
//         );
//       const command = await realpath(configured);
//       await access(command, constants.X_OK);
//       const tool = await this.#resources.read(
//         command,
//         64 * 1024 * 1024,
//         options?.signal,
//       );
//       const configuredLimiter =
//         this.environment.REA_SIGROK_PRLIMIT_COMMAND ?? "/usr/bin/prlimit";
//       if (!isAbsolute(configuredLimiter))
//         throw new Error("REA_SIGROK_PRLIMIT_COMMAND must be absolute.");
//       const limiter = await realpath(configuredLimiter);
//       await access(limiter, constants.X_OK);
//       const limiterIdentity = await this.#resources.read(
//         limiter,
//         64 * 1024 * 1024,
//         options?.signal,
//       );
//       effectiveLimits = await this.#resources.readLimits(LIMITS);
//       const limitArguments = prlimitArgumentVector(effectiveLimits, command);
//       phase = "workspace";
//       root = await this.createRuntime();
//       this.#resources.retain(root, undefined);
//       const snapshotPath = join(root.path, "recording");
//       const execute = async (args: readonly string[]) => {
//         capturedOutput = undefined;
//         const output = await runOwnedCommand(
//           {
//             command: limiter,
//             arguments: [...limitArguments, ...args],
//             ...(root === undefined ? {} : { cwd: root.path }),
//             expectedCommand: null,
//             runId: `rea-sigrok-${randomUUID()}`,
//             hostEnvironment: this.environment,
//           },
//           {
//             timeoutMs: LIMITS.command_timeout_ms,
//             diagnosticBytes: LIMITS.output_bytes,
//             acceptNonZeroExit: true,
//           },
//           {
//             ...(options?.signal === undefined
//               ? {}
//               : { signal: options.signal }),
//             ...(this.launcher === undefined ? {} : { launcher: this.launcher }),
//           },
//         );
//         capturedOutput = {
//           stdout: output.stdout.text,
//           stderr: output.stderr.text,
//           truncated: output.diagnosticTruncated ?? false,
//           exit_code: output.exitCode ?? null,
//           signal: output.signal ?? null,
//         };
//         // Finish bounded integrity checks after output; service handles late cancellation with Evidence.
//         const previousPhase = phase;
//         phase = "integrity";
//         resourcePath = command;
//         const current = await this.#resources.read(command, 64 * 1024 * 1024);
//         resourcePath = limiter;
//         const currentLimiter = await this.#resources.read(
//           limiter,
//           64 * 1024 * 1024,
//         );
//         if (currentLimiter.sha256 !== limiterIdentity.sha256)
//           throw new AnalysisArtifactChangedError(
//             operation,
//             limiter,
//             "Configured resource limiter changed during analysis.",
//             { capturedOutput },
//           );
//         if (current.sha256 !== tool.sha256)
//           throw new AnalysisArtifactChangedError(
//             operation,
//             command,
//             "Configured decoder executable changed during analysis.",
//             { capturedOutput },
//           );
//         phase = previousPhase;
//         resourcePath = "path" in input ? input.path : command;
//         if (output.exitCode !== 0)
//           throw new ProviderAdapterError(
//             SIGROK_PROVIDER_IDENTITY.id,
//             operation,
//             {
//               diagnostics: {
//                 exit_code: output.exitCode ?? null,
//                 stdout: output.stdout.text,
//                 stderr: output.stderr.text,
//               },
//             },
//           );
//         return output;
//       };
//       phase = "configuration";
//       const version = await execute(["--version"]);
//       if (
//         !/^sigrok-cli 0\.7\.2(?:\r?\n|$)/u.test(version.stdout.text) ||
//         !version.stdout.text.includes("libsigrokdecode")
//       )
//         throw new Error(
//           "Expected sigrok-cli 0.7.2 with libsigrokdecode; inspect the selected installation.",
//         );
//       const metadata = (args: readonly string[], diagnostics: string) => ({
//         diagnostics,
//         tool: {
//           configured_path: configured,
//           path: command,
//           sha256: tool.sha256,
//           version_banner: version.stdout.text,
//           version_diagnostics: version.stderr.text,
//           arguments: [...args],
//         },
//         resource_limiter: {
//           configured_path: configuredLimiter,
//           path: limiter,
//           sha256: limiterIdentity.sha256,
//           arguments: limitArguments,
//         },
//         limits: { ...LIMITS, ...effectiveLimits },
//         hardware_acquisition: "not-performed" as const,
//       });
//       if (!("path" in input)) {
//         phase = "producer";
//         const args =
//           input.decoder === null
//             ? ["--dont-scan", "--list-supported"]
//             : ["--dont-scan", `--protocol-decoders=${input.decoder}`, "--show"];
//         const output = await execute(args);
export const _l = 134;
