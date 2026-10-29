export const __stub = 1;
//         command,
//         64 * 1024 * 1024,
//         options?.signal,
//       );
//       const configuredLimiter =
//         this.environment.REA_TSHARK_PRLIMIT_COMMAND ?? "/usr/bin/prlimit";
//       if (!isAbsolute(configuredLimiter))
//         throw new Error("REA_TSHARK_PRLIMIT_COMMAND must be absolute.");
//       const limiter = await realpath(configuredLimiter);
//       await access(limiter, constants.X_OK);
//       const limiterIdentity = await this.#resources.read(
//         limiter,
//         64 * 1024 * 1024,
//         options?.signal,
//       );
//       effectiveLimits = await this.#resources.readLimits(limits);
//       const limitArguments = prlimitArgumentVector(effectiveLimits, command);
//       phase = "workspace";
//       root = await this.createRuntime();
//       this.#resources.retain(root, undefined);
//       const snapshotPath = join(root.path, "capture");
//       const configurationPath = join(root.path, "configuration");
//       await mkdir(configurationPath, { mode: 0o700 });
//       const execute = async (args: readonly string[]) => {
//         capturedOutput = undefined;
//         const output = await runOwnedCommand(
//           {
//             command: limiter,
//             arguments: [...limitArguments, ...args],
//             ...(root === undefined ? {} : { cwd: root.path }),
//             expectedCommand: null,
//             runId: `rea-tshark-${randomUUID()}`,
//             hostEnvironment: {
//               ...this.environment,
//               WIRESHARK_CONFIG_DIR: configurationPath,
//             },
//           },
//           {
//             timeoutMs: limits.command_timeout_ms,
//             diagnosticBytes: limits.output_bytes,
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
//             "Configured TShark executable changed during analysis.",
//             { capturedOutput },
//           );
//         phase = previousPhase;
//         resourcePath = "path" in input ? input.path : command;
//         if (output.exitCode !== 0)
//           throw new ProviderAdapterError(
//             TSHARK_PROVIDER_IDENTITY.id,
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
//         !/^TShark \(Wireshark\) 4\.[0-9]+\.[0-9]+(?:[ .(\r\n]|$)/u.test(
//           version.stdout.text,
//         )
//       )
//         throw new Error(
//           "Expected TShark 4.x; inspect the selected installation.",
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
//         limits: { ...limits, ...effectiveLimits },
//         hardware_acquisition: "not-performed" as const,
//       });
//       if (!("path" in input)) {
//         phase = "producer";
//         const args = ["-G", "fields"];
//         const output = await execute(args);
//         const report = packetFieldsCatalogSchema.parse({
//           selection: input,
//           ...parseFieldDiscovery(output.stdout.text, input),
//           ...metadata(args, output.stderr.text),
//           limits: {
//             ...limits,
//             ...effectiveLimits,
//             record_budget_bytes: FIELD_RECORD_BUDGET,
//           },
//           configuration: "private-empty-personal-profile",
//         });
//         result = ok(
//           createAnalysisExecution(report, TSHARK_PROVIDER_IDENTITY, {
//             subject: { path: command, sha256: tool.sha256, format: "file" },
//             limitations: [
export const _l = 144;
