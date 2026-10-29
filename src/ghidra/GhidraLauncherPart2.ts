export const __stub = 1;
//         );
//         if (inspected.sha256 !== psp.sha256)
//           throw new GhidraLaunchError(
//             "Installed Allegrex content changed since profile resolution; reopen the target to resolve a fresh profile.",
//           );
//       }
//       await createGhidraRuntimeDirectories(
//         paths,
//         platform,
//         await ghidraConfigReleaseDirectory(this.options.analyzeHeadlessPath),
//       );
//       const seedPath =
//         this.options.analysisSeeds === undefined
//           ? undefined
//           : await snapshotGhidraAnalysisSeeds(
//               this.options.analysisSeeds,
//               session.runtimeRoot,
//             );
//       const extensions = await snapshotGhidraExtensions(
//         this.options.analysisExtensions ?? [],
//         session.runtimeRoot,
//       );
//       await writeGhidraRuntimeFile(
//         paths.descriptorPath,
//         `${JSON.stringify({
//           transport: session.transport,
//           endpoint_path: session.endpointPath,
//           token: session.token,
//           run_id: session.runId,
//           target_sha256: session.targetSha256,
//           provider_version: session.providerVersion,
//           profile_digest: session.profileDigest,
//           ...(extensions.length === 0
//             ? {}
//             : { analysis_extensions: extensions }),
//         })}\n`,
//         platform,
//       );
//       if (isAborted(options.signal))
//         return err(new AnalysisCancelledError("open_binary"));
//       const headlessArguments = ghidraHeadlessArguments({
//         platform,
//         ...(psp === undefined ? {} : { psp: true as const }),
//         ...(this.options.mipsSoftFloat === undefined
//           ? {}
//           : { mipsSoftFloat: this.options.mipsSoftFloat }),
//         projectRoot: paths.projectRoot,
//         targetPath: session.targetPath,
//         bridgeScriptPath: this.options.bridgeScriptPath,
//         descriptorPath: paths.descriptorPath,
//         ghidraLogPath: paths.ghidraLogPath,
//         scriptLogPath: paths.scriptLogPath,
//         ...(this.options.dosCom === undefined
//           ? {}
//           : { dosCom: this.options.dosCom }),
//         ...(this.options.dosMz === undefined
//           ? {}
//           : { dosMz: this.options.dosMz }),
//         ...(this.options.rawBinary === undefined
//           ? {}
//           : { rawBinary: this.options.rawBinary }),
//         ...(this.options.languageOverride === undefined
//           ? {}
//           : { languageOverride: this.options.languageOverride }),
//         ...(seedPath === undefined ? {} : { seedPath }),
//         ...(this.options.disabledAnalyzers === undefined
//           ? {}
//           : { disabledAnalyzers: this.options.disabledAnalyzers }),
//       });
//       const scriptCommand = ghidraHeadlessCommand({
//         environment: this.options.environment,
//         platform,
//         analyzeHeadlessPath: this.options.analyzeHeadlessPath,
//         arguments: headlessArguments,
//         ...(this.options.comSpec === undefined
//           ? {}
//           : { comSpec: this.options.comSpec }),
//       });
//       const environment = ghidraLaunchEnvironment(
//         paths,
//         this.options.javaHome,
//         platform,
//         scriptCommand.command,
//         this.options.environment,
//       );
//       if (platform !== "win32" && this.options.javaHome === undefined)
//         throw new GhidraLaunchError(
//           "POSIX Ghidra requires its inspected JDK home",
//         );
//       const inspectedJavaLaunch = await (
//         this.options.javaLaunch ?? ghidraJavaLaunch
//       )({
//         platform,
//         analyzeHeadlessPath: this.options.analyzeHeadlessPath,
//         ...(this.options.javaHome === undefined
//           ? {}
//           : { javaHome: this.options.javaHome }),
//         ...(this.options.javaVmName === undefined
//           ? {}
//           : { javaVmName: this.options.javaVmName }),
//         homeRoot: paths.homeRoot,
//         tempRoot: paths.tempRoot,
//         arguments: headlessArguments,
//         environment,
//         onStderr: (mode, stderr) => {
//           if (stderr === "") return;
//           const bytes = Buffer.byteLength(stderr);
//           const redacted = redactCapturedTransportCredential(
//             { text: stderr, bytes, observedBytes: bytes },
//             session.token,
//             "[REDACTED]",
//           );
//           const bounded = boundedUtf8Text(
//             redacted,
//             GHIDRA_LAUNCH_COMMAND_OUTPUT_BYTES,
//           );
//           launchSupport.push({
//             mode,
//             stderr: bounded.text,
//             stderr_bytes: bytes,
//             stderr_truncated: bounded.truncated,
//           });
//         },
//         ...(options.signal === undefined ? {} : { signal: options.signal }),
//       });
//       const command =
//         platform === "win32"
//           ? { ...scriptCommand, environment }
//           : inspectedJavaLaunch;
//       started = await (this.options.spawnProcess ?? spawnOwnedProviderProcess)({
//         command: command.command,
//         arguments: command.arguments,
//         runId: session.runId,
//         // POSIX launches the inspected JVM directly; script wrappers cannot
//         // preserve JVM property paths containing spaces as single arguments.
//         expectedCommand: platform !== "win32" ? command.command : null,
//         windowsVerbatimArguments: platform === "win32",
//         platform,
//         env: command.environment,
//         hostEnvironment: {},
//         ...(options.signal === undefined ? {} : { signal: options.signal }),
//       });
//       const partialLaunch = ownedGhidraLaunch(
//         started,
//         paths,
//         platform,
//         launchSupport,
//       );
//       await writeGhidraRuntimeFile(
//         paths.ownershipPath,
//         `${JSON.stringify({
//           run_id: session.runId,
//           transport: session.transport,
//           endpoint_path: session.endpointPath,
//           pid: started.ownership.leaderPid,
//           process_group_id: started.ownership.processGroupId,
//           parent_pid: process.pid,
//           ownership_kind:
//             platform === "win32" ? "windows-job-object" : "posix-process-group",
//           launcher: command.command,
//           headless_script: this.options.analyzeHeadlessPath,
//           created_at: new Date().toISOString(),
//         })}\n`,
//         platform,
//       );
//       if (isAborted(options.signal)) {
//         throw new AnalysisCancelledError("open_binary");
//       }
//       return ok(partialLaunch);
//     } catch (cause: unknown) {
//       const capturedOutput = ghidraLaunchCommandOutput(cause);
//       const launchFailure = new GhidraLaunchError(
//         "Ghidra headless launch failed",
//         {
//           cause,
//           launchSupport,
//           ...(capturedOutput === undefined ? {} : { capturedOutput }),
//         },
//       );
//       const primary = isAborted(options.signal)
//         ? new AnalysisCancelledError("open_binary", { cause: launchFailure })
//         : launchFailure;
//       if (started === undefined) return err(primary);
//
//       let cleanupFailure: unknown;
//       try {
//         const cleanup = await cleanupStartedProcess(started, platform);
//         if (!cleanup.cleaned)
//           cleanupFailure = new Error(
//             `Ghidra process cleanup was incomplete: ${cleanup.reason}`,
//           );
//       } catch (failure: unknown) {
//         cleanupFailure = failure;
//       }
//       if (cleanupFailure !== undefined) {
//         const partialLaunch = ownedGhidraLaunch(
//           started,
//           paths,
//           platform,
//           launchSupport,
//         );
//         const primaryMessage = isAborted(options.signal)
//           ? primary.message
//           : `Ghidra headless launch failed: ${cause instanceof Error ? cause.message : String(cause)}`;
//         return err(
//           new GhidraLaunchError(
//             `${primaryMessage}; process cleanup remains incomplete`,
//             {
//               cause: new AggregateError(
//                 [primary, cleanupFailure],
//                 "Ghidra launch rollback did not release its process",
//                 { cause: primary },
//               ),
//               partialLaunch,
//               launchSupport,
//               ...(capturedOutput === undefined ? {} : { capturedOutput }),
//             },
//           ),
export const _l = 218;
