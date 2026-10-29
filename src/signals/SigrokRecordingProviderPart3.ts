export const __stub = 1;
//         const report = signalDecodersSchema.parse({
//           selection: input,
//           ...parseDecoderDiscovery(output.stdout.text, input),
//           ...metadata(args, output.stderr.text),
//         });
//         result = ok(
//           createAnalysisExecution(report, SIGROK_PROVIDER_IDENTITY, {
//             subject: { path: command, sha256: tool.sha256, format: "file" },
//             limitations: [
//               "Catalog and help are observed from the selected sigrok installation. Help lines preserve producer descriptions, not a separately validated parameter schema.",
//               "Each request probes the installation again; pages do not share a frozen catalog. Decoder modules and libraries are trusted and not fully fingerprinted.",
//               "Hardware discovery, recording reads and acquisition are not requested. Linux per-process limits and bounded output apply; this is not an OS sandbox.",
//             ],
//           }),
//         );
//       } else {
//         phase = "artifact";
//         const selected = await this.#resources.read(
//           input.path,
//           LIMITS.input_bytes,
//           options?.signal,
//         );
//         phase = "workspace";
//         await writeFile(snapshotPath, selected.bytes, {
//           flag: "wx",
//           mode: 0o400,
//         });
//         phase = "producer";
//         const args = [
//           "--dont-scan",
//           "--input-file=recording",
//           `--protocol-decoders=${input.decoders}`,
//           "--protocol-decoder-samplenum",
//           ...(input.input_format === null
//             ? []
//             : [`--input-format=${input.input_format}`]),
//           ...(input.annotations === null
//             ? []
//             : [`--protocol-decoder-annotations=${input.annotations}`]),
//         ];
//         const output = await execute(args);
//         phase = "integrity";
//         resourcePath = snapshotPath;
//         if (
//           (await this.#resources.read(snapshotPath, LIMITS.input_bytes))
//             .sha256 !== selected.sha256
//         )
//           throw new AnalysisArtifactChangedError(
//             operation,
//             snapshotPath,
//             "Decoder changed the private recording copy.",
//             capturedOutput === undefined ? {} : { capturedOutput },
//           );
//         phase = "producer";
//         resourcePath = "path" in input ? input.path : command;
//         const report = signalRecordingSchema.parse({
//           artifact: {
//             path: input.path,
//             sha256: selected.sha256,
//             bytes: selected.bytes.length,
//           },
//           selection: input,
//           ...windowAnnotationText(
//             output.stdout.text,
//             input.line_offset,
//             input.line_limit,
//           ),
//           ...metadata(args, output.stderr.text),
//         });
//         result = ok(
//           createAnalysisExecution(report, SIGROK_PROVIDER_IDENTITY, {
//             subject: {
//               path: input.path,
//               sha256: selected.sha256,
//               format: "file",
//             },
//             locations: [{ kind: "artifact-path", path: input.path }],
//             limitations: [
//               "Annotations are the selected decoder's interpretation of the recorded samples and caller-selected settings, not independently verified protocol semantics. Empty output does not establish absence of traffic.",
//               "Sample-number ranges and display text are preserved verbatim, not converted to timestamps or parsed as a lossless byte stream. All producer stderr is retained, including warnings on exit zero.",
//               "Only a private copy of the selected file is decoded. Hardware discovery/acquisition and target execution are not requested. Caller-supplied tools, plugins and decoder modules are trusted; this is not an OS sandbox.",
//               "Linux prlimit enforces soft and hard ceilings before execution, preserving stricter inherited limits: at most 1 GiB address space per process, 64 MiB per file, 30 CPU seconds and no core dumps. Effective limits are reported. Resident input is capped at 32 MiB, each command at 30 wall-clock seconds and combined output at 4 MiB. Output overflow fails. These are per-process/per-file limits, not aggregate memory or filesystem quotas; caller-supplied tools and the limiter are trusted.",
//             ],
//           }),
//         );
//       }
//     } catch (cause) {
//       if (
//         root !== undefined &&
//         cause instanceof OwnedCommandFailure &&
//         cause.cleanupOwner !== undefined
//       )
//         this.#resources.retain(root, cause.cleanupOwner);
//       result = err(
//         this.#failure(
//           cause,
//           phase,
//           resourcePath,
//           root?.path ?? null,
//           effectiveLimits,
//           capturedOutput,
//           operation,
//         ),
//       );
//     }
//     return this.#resources.finish(
//       result,
//       (execution) =>
//         createEvidence(execution.subject ?? undefined, execution.provider, {
//           operation,
//           parameters: input,
//           result: execution.result,
//           confidence: "observed",
//           locations: execution.locations,
//           limitations: execution.limitations,
//         }),
//       operation,
//     );
//   }
//   #failure(
//     cause: unknown,
//     phase:
//       | "configuration"
//       | "artifact"
//       | "workspace"
//       | "producer"
//       | "integrity",
//     path: string,
//     workspacePath: string | null,
//     effectiveLimits: LinuxResourceLimits | undefined,
//     observedOutput: AnalysisCapturedOutput | undefined,
//     operation = OPERATION,
//   ): AnalysisError {
//     if (cause instanceof AnalysisError) return cause;
export const _l = 134;
