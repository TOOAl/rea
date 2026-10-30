export const __stub = 1;
//               "Protocol and field registrations describe the selected installation, not traffic observed in a capture. Duplicate abbreviations remain distinct producer records with source line numbers.",
//               "Each request probes again without caching. The private empty personal profile does not fingerprint or isolate installed libraries, global configuration or plugins; they remain trusted.",
//               "No capture file, interface or device is opened. Resource ceilings do not constitute an OS sandbox. Glossary output is capped at 32 MiB and selected record representation at 8 MiB before expansion.",
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
//           "-n",
//           "-r",
//           "capture",
//           "-T",
//           "json",
//           "--no-duplicate-keys",
//           "--temp-dir=.",
//           ...(input.two_pass ? ["-2"] : []),
//           ...(input.packet_limit === null
//             ? []
//             : ["-c", String(input.packet_limit)]),
//           ...(input.display_filter === null
//             ? []
//             : ["-Y", input.display_filter]),
//           ...input.decode_as.flatMap((value) => ["-d", value]),
//           ...[...new Set(["frame.number", ...input.fields])].flatMap(
//             (field) => ["-e", field],
//           ),
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
//             "TShark changed the private capture copy.",
//             capturedOutput === undefined ? {} : { capturedOutput },
//           );
//         phase = "producer";
//         resourcePath = "path" in input ? input.path : command;
//         const matchingPackets = parsePacketOutput(
//           output.stdout.text,
//           input.fields,
//         );
//         const start = Math.min(input.match_offset, matchingPackets.length);
//         const end =
//           input.match_limit === null
//             ? matchingPackets.length
//             : start +
//               Math.min(input.match_limit, matchingPackets.length - start);
//         const packets = matchingPackets.slice(start, end);
//         const report = packetCaptureSchema.parse({
//           artifact: {
//             path: input.path,
//             sha256: selected.sha256,
//             bytes: selected.bytes.length,
//           },
//           selection: input,
//           packets,
//           output_window: {
//             matching_packets: matchingPackets.length,
//             returned_packets: packets.length,
//             has_more: end < matchingPackets.length,
//           },
//           read_scope:
//             input.packet_limit === null ? "to-eof" : "up-to-input-packet-limit",
//           configuration: "private-empty-personal-profile",
//           ...metadata(args, output.stderr.text),
//         });
//         result = ok(
//           createAnalysisExecution(report, TSHARK_PROVIDER_IDENTITY, {
//             subject: {
//               path: input.path,
//               sha256: selected.sha256,
//               format: "file",
//             },
//             locations: [{ kind: "artifact-path", path: input.path }],
//             limitations: [
//               "Fields are TShark dissector observations under the selected filter/decode-as/pass settings, not independently verified protocol semantics. Missing fields are absent from the producer output, not known zero or empty values.",
//               "Packet limits count input packets before display filtering. Filtered results do not establish whole-capture or device traffic absence. Two-pass reassembly cannot recover bytes missing from the recording or beyond the read limit.",
//               "Repeated field values remain ordered string arrays; raw packet bytes are included only when explicitly selected as a supported field. Export index/score metadata are omitted. All stderr, including warnings on exit zero, is retained.",
//               "A private empty personal configuration is used. Installed libraries, global configuration and dissector plugins are trusted and not fully fingerprinted. File-only analysis and disabled name resolution do not constitute an OS sandbox.",
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
//           limits,
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
export const _l = 144;
