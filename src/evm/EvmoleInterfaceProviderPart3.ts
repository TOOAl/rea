export const __stub = 1;
//       } catch (cause: unknown) {
//         const cleanup =
//           cause instanceof ArtifactReaderFailure ? cause.cleanup : undefined;
//         if (options?.signal?.aborted)
//           throw new AnalysisCancelledError(OPERATION, {
//             cause,
//             capturedOutput,
//             ...(cleanup === undefined ? {} : { cleanup }),
//           });
//         throw new AnalysisOutputError(
//           OPERATION,
//           `Owned interface worker reply failed for ${input.path}: ${cause instanceof Error ? cause.message : String(cause)}`,
//           {
//             cause,
//             capturedOutput,
//             ...(cleanup === undefined ? {} : { cleanup }),
//           },
//         );
//       }
//       if (!reply.ok) {
//         if (reply.reason === "unsupported")
//           throw new AnalysisUnsupportedTargetError(
//             OPERATION,
//             input.path,
//             reply.message,
//             { capturedOutput },
//           );
//         if (reply.reason === "format")
//           throw new AnalysisInputError(OPERATION, { capturedOutput }, [
//             {
//               path: ["path"],
//               reason: "invalid_format",
//               message: reply.message,
//             },
//           ]);
//         if (reply.reason === "output-limit")
//           throw new AnalysisOutputError(OPERATION, reply.message, {
//             capturedOutput,
//           });
//         throw new ProviderAdapterError(EVMOLE_PROVIDER_IDENTITY.id, OPERATION, {
//           diagnostics: {
//             phase,
//             failure_kind: reply.reason,
//             reason: reply.message,
//             stdout: execution.stdout.text,
//             stderr: execution.stderr.text,
//             captured_output: { ...capturedOutput },
//           },
//         });
//       }
//       const selectedBytes = decodeEvmBytecodeCarrier(
//         carrier.bytes,
//         input.encoding,
//       );
//       const selectedHex = Buffer.from(selectedBytes).toString("hex");
//       const decodedHash = createHash("sha256")
//         .update(selectedBytes)
//         .digest("hex");
//       if (
//         decodedHash !== reply.bytecode.sha256 ||
//         selectedHex !== reply.bytecode.hex ||
//         selectedBytes.length !== reply.bytecode.bytes
//       )
//         throw new AnalysisOutputError(
//           OPERATION,
//           "Decoded bytecode representation does not match the selected carrier, encoding or reported SHA-256.",
//           { capturedOutput },
//         );
//       const limitations = [
//         `Configured worker resource soft limits: address_space_bytes=${String(workerLimits.addressSpaceBytes)}, cpu_seconds=${String(workerLimits.cpuSeconds)}, file_size_bytes=${String(workerLimits.fileSizeBytes)}. Selected from inherited tighter limits; original hard limits are retained. Effective worker limits are not independently probed.`,
//         "Upstream may also report terminal metadata while recovering selectors. Its reported values are retained in raw_result, but integer precision and non-text-key coverage are unknown in the JS binding; complete original bytecode remains available.",
//         "Recovered selectors, argument strings and mutability are upstream inferences, not verified ABI signatures or names. Empty results do not prove the absence of callable dispatch.",
//         "Bytecode kind, hardfork and deployed-contract authenticity are unknown. This inspection performs no target runtime execution, chain/RPC lookup or network request.",
//         "Original carrier and decoded bytecode SHA-256 are distinct identities; SHA-256 is not the Ethereum Keccak code hash.",
//         "Terminal CBOR metadata is an independently decoded candidate, not proof of Solidity origin, source identity or deployment. Nested or unsupported values retain explicit unavailable interpretation and original byte ranges.",
//         "The owned worker has a 256 MiB JavaScript heap, 3 GiB virtual address-space limit and 30-second deadline. Virtual address space is distinct from resident memory; limits fail without partial success.",
//       ];
//       const validated = evmInterfaceSchema.safeParse({
//         artifact: {
//           path: input.path,
//           sha256: carrier.sha256,
//           bytes: carrier.bytes.length,
//           encoding: input.encoding,
//         },
//         bytecode: {
//           ...reply.bytecode,
//           digest_algorithm: "sha256",
//           kind: "unknown",
//           deployment_authenticity: "unknown",
//           hardfork: "unknown",
//         },
//         evidence_kind: "inferred",
//         functions: projectEvmoleInterface(reply.raw).functions,
//         discovery_completeness: "unknown",
//         runtime_execution: "not-performed",
//         diagnostics: {
//           stdout: execution.stdout.text,
//           stderr: execution.stderr.text,
//           truncated: capturedOutput.truncated,
//         },
//         limitations,
//       });
//       if (!validated.success)
//         throw new AnalysisOutputError(
//           OPERATION,
//           `Interface worker returned invalid bytecode-relative evidence: ${validated.error.issues[0]?.message ?? "schema mismatch"}`,
//           { capturedOutput },
//         );
//       const report = validated.data;
//       result = ok(
//         createAnalysisExecution(report, EVMOLE_PROVIDER_IDENTITY, {
//           rawResult: reply.raw,
//           subject: { path: input.path, format: "file", sha256: carrier.sha256 },
//           locations: [{ kind: "artifact-path", path: input.path }],
//           limitations,
//         }),
//       );
//     } catch (cause: unknown) {
//       if (
//         cause instanceof OwnedCommandFailure &&
//         cause.cleanupOwner !== undefined
//       )
//         processOwner = cause.cleanupOwner;
//       let fileFailure: EvmFileSizeFailureEvidence | undefined;
//       let markerCleanupFailure: ArtifactReaderFailure | undefined;
//       if (
//         cause instanceof OwnedCommandFailure &&
//         cause.snapshot?.exitCode === EVM_FILE_SIZE_FAILURE_EXIT &&
//         cause.snapshot.signal === null &&
//         root !== undefined
//       ) {
//         try {
//           const marker = await readStableArtifact(
//             join(root.path, "resource.failure"),
//             1,
//             undefined,
//             undefined,
//             this.#resources,
//           );
//           if (!marker.bytes.equals(Buffer.from("F")))
//             throw new Error(
//               "Private worker failure marker does not match the observed exit status.",
//             );
//           fileFailure = { verified: true, failure: null };
//         } catch (markerFailure: unknown) {
//           if (
//             markerFailure instanceof ArtifactReaderFailure &&
//             markerFailure.cleanup !== undefined
//           )
//             markerCleanupFailure = ArtifactReaderFailure.withCleanup(
//               cause,
//               markerFailure.cleanup,
//             );
//           fileFailure = {
//             verified: false,
//             failure:
//               markerFailure instanceof Error
//                 ? markerFailure.message
//                 : String(markerFailure),
//           };
//         }
//       }
//       result = err(
//         markerCleanupFailure !== undefined
//           ? evmInterfaceFailure(
//               markerCleanupFailure,
//               "artifact-read",
//               input.path,
//               workerLimits,
export const _l = 169;
