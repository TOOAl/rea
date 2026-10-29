export const __stub = 1;
//       binding,
//       ["-d", "--verbose=4"],
//       signal,
//     );
//     if (!display.ok) return display;
//     const unsigned = isNonzeroUnsignedObservation(display.value);
//     const displayFailure = codeSignCaptureFailure(display.value);
//     if (displayFailure !== null) return err(displayFailure);
//     const requirements = await this.#captureSignature(
//       binding,
//       ["-d", "-r-"],
//       signal,
//     );
//     if (!requirements.ok) return requirements;
//     const requirementsFailure = codeSignCaptureFailure(requirements.value);
//     if (requirementsFailure !== null) return err(requirementsFailure);
//     const entitlements = await this.#captureSignature(
//       binding,
//       ["-d", "--entitlements", ":-"],
//       signal,
//     );
//     if (!entitlements.ok) return entitlements;
//     const entitlementsFailure = codeSignCaptureFailure(entitlements.value);
//     if (entitlementsFailure !== null) return err(entitlementsFailure);
//     // codesign echoes the resolved executable path in its diagnostics.
//     const parsed = parseCodeSignature(display.value.stderr, unsigned, [
//       binding.snapshotPath,
//       ...(await canonicalPath(binding.snapshotPath)),
//     ]);
//     // The requirement is printed to stdout; stderr echoes the path.
//     const requirementText =
//       /designated\s*=>\s*(.+)$/mu.exec(requirements.value.stdout)?.[1] ?? null;
//     // Entitlements XML is printed to stdout; stderr echoes the path.
//     const entitlementValue = parseEntitlements(entitlements.value.stdout);
//     const captures = [display.value, requirements.value, entitlements.value];
//     const limitations = [
//       ...parsed.limitations,
//       "Inspected a digest-verified Mach-O byte snapshot; filesystem-bound signing context and trust validation are not examined.",
//       ...(entitlementValue.omittedPrototypeKeys === 0
//         ? []
//         : [
//             `Entitlements: ${omittedPrototypeKeysLimitation(entitlementValue.omittedPrototypeKeys)}`,
//           ]),
//     ];
//     const mixedSigning =
//       !unsigned &&
//       (isNonzeroUnsignedObservation(requirements.value) ||
//         isNonzeroUnsignedObservation(entitlements.value));
//     if (mixedSigning) {
//       const slices = await this.#inspectMixedSignatureSlices(
//         binding,
//         parsed.format,
//         {
//           requirements: requirements.value.exitCode,
//           entitlements: entitlements.value.exitCode,
//         },
//         signal,
//       );
//       if (!slices.ok) return slices;
//       captures.push(...slices.value.captures);
//       limitations.push(...slices.value.limitations);
//     }
//     const provenance = captures.map((capture) =>
//       invocation(capture, binding.snapshotPath),
//     );
//     const version = await verifySignatureTarget(this.target, binding, signal);
//     if (!version.ok) return version;
//     const result = inspectSignatureSchema.parse({
//       ...parsed,
//       designated_requirement: requirementText,
//       entitlements: entitlementValue.value,
//       provenance,
//       limitations,
//     });
//     return ok({
//       result: jsonValueSchema.parse(result),
//       limitations: result.limitations,
//       locations: [],
//     });
//   }
//
//   async #inspectMixedSignatureSlices(
//     binding: SignatureTargetBinding,
//     format: string | null,
//     aggregateExits: Readonly<{
//       requirements: number | null;
//       entitlements: number | null;
//     }>,
//     signal?: AbortSignal,
//   ): Promise<Result<MixedSignatureSlices, AnalysisError>> {
//     const captures: NativeCommandCapture[] = [];
//     const unsigned: string[] = [];
//     const unclassified: string[] = [];
//     for (const architecture of codeSignArchitectures(format, this.target)) {
//       const slice = await this.#captureSignature(
//         binding,
//         ["-d", "-a", architecture, "--verbose=4"],
//         signal,
//       );
//       if (!slice.ok) return slice;
//       captures.push(slice.value);
//       if (slice.value.exitCode === 0) continue;
//       if (isNonzeroUnsignedObservation(slice.value))
//         unsigned.push(architecture);
//       else unclassified.push(architecture);
//     }
//     const limitations = [
//       unsigned.length > 0
//         ? `Unsigned Mach-O slices: ${unsigned.join(", ")}.`
//         : "One or more Mach-O slices are unsigned, but their architectures could not be classified.",
//     ];
//     if (unclassified.length > 0)
//       limitations.push(
//         `Signature state could not be classified for Mach-O slices: ${unclassified.join(", ")}.`,
//       );
//     if (aggregateExits.requirements !== 0)
//       limitations.push(
//         "The aggregate designated requirement is unavailable because Mach-O slices have mixed signing states.",
//       );
//     if (aggregateExits.entitlements !== 0)
//       limitations.push(
//         "The aggregate entitlements are unavailable because Mach-O slices have mixed signing states.",
//       );
//     return ok({ captures, limitations });
//   }
//
//   async #captureSignature(
//     binding: SignatureTargetBinding,
//     args: readonly string[],
//     signal?: AbortSignal,
//   ): Promise<Result<NativeCommandCapture, AnalysisError>> {
//     const before = await verifySignatureTarget(this.target, binding, signal);
//     if (!before.ok) return before;
//     let capture: Result<NativeCommandCapture, AnalysisError>;
//     try {
//       capture = await this.#run(
//         "inspect_signature",
//         "codesign",
//         [...args, binding.snapshotPath],
//         {
//           signal,
//           acceptNonZero: true,
//         },
//       );
//     } catch (cause: unknown) {
//       capture = err(
//         new ProviderAdapterError(IDENTITY.id, "inspect_signature", {
//           cause,
//           diagnostics: {
//             phase: "codesign-capture",
//             path: this.target.path,
//             reason: cause instanceof Error ? cause.message : String(cause),
//           },
//         }),
//       );
//     }
//     // Verify failed captures too: a disappearing target is not a codesign
//     // execution failure, and later captures must never use another version.
//     const after = await verifySignatureTarget(this.target, binding, signal);
//     return after.ok ? capture : after;
//   }
//
//   async #inspectPlist(
//     parameters: Readonly<Record<string, JsonValue>>,
//     signal?: AbortSignal,
//   ): Promise<Result<NativeObservation, AnalysisError>> {
//     const requested = parameters.path;
//     if (requested !== undefined && typeof requested !== "string")
//       return err(
//         new AnalysisOutputError("inspect_plist", "path was not a string"),
//       );
//     const plist = await resolvePlistPath(this.target, requested);
//     if (!plist.ok) return plist;
//     const selected = await requireRegularPlist(plist.value, requested);
//     if (!selected.ok) return selected;
//     const classified = await this.#run(
//       "inspect_plist",
//       "file",
//       ["-b", plist.value],
//       { signal },
//     );
//     if (!classified.ok) return classified;
//     const json = await this.#run(
//       "inspect_plist",
//       "plutil",
//       ["-convert", "json", "-o", "-", "--", plist.value],
//       { signal, acceptNonZero: true },
//     );
//     if (!json.ok) return json;
//     // JSON cannot express data, dates, or non-finite reals; plutil rejects
//     // such plists, so decode its lossless XML conversion instead. JSON also
//     // prints an integral <real> like an <integer>, so a number beyond the
//     // exact JSON range takes its element type from the XML conversion.
//     const jsonDecoded = json.value.exitCode === 0;
//     const xml =
//       jsonDecoded && !plistJsonNeedsNumberTypes(json.value.stdout)
//         ? undefined
//         : await this.#run(
//             "inspect_plist",
//             "plutil",
//             ["-convert", "xml1", "-o", "-", "--", plist.value],
//             { signal, acceptNonZero: !jsonDecoded },
//           );
//     if (xml !== undefined && !xml.ok) return xml;
//     if (xml !== undefined && xml.value.exitCode !== 0)
//       return err(
//         unreadablePlist(
//           plist.value,
//           requested,
//           `plutil could not decode it as a property list (${plutilDiagnostic(xml.value.stderr, plist.value)})`,
//         ),
//       );
//     const parsed =
//       xml === undefined
//         ? parsePlistJson(json.value.stdout)
//         : jsonDecoded
//           ? parsePlistJson(json.value.stdout, xml.value.stdout)
//           : parsePlistXml(xml.value.stdout);
//     if (!parsed.ok) return parsed;
//     const provenance = [
//       classified.value,
//       json.value,
//       ...(xml === undefined ? [] : [xml.value]),
//     ].map((item) => invocation(item, plist.value, "$PLIST"));
//     const result = inspectPlistSchema.parse({
//       format: /binary property list/iu.test(classified.value.stdout)
//         ? "binary"
//         : /XML|text/iu.test(classified.value.stdout)
//           ? "xml"
//           : "unknown",
//       value: parsed.value.value,
//       bundle: parsed.value.bundle,
//       source_path: plist.value,
//       provenance,
//       limitations: parsed.value.limitations,
//     });
//     return ok({
//       result: jsonValueSchema.parse(result),
//       limitations: parsed.value.limitations,
//       locations: [{ kind: "artifact-path", path: plist.value }],
//     });
//   }
//
//   async #inspectMacho(
//     signal?: AbortSignal,
//   ): Promise<Result<NativeObservation, AnalysisError>> {
//     if (!isMachOFormat(this.target.format))
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           IDENTITY.id,
//           "inspect_macho",
//           "Active artifact is not Mach-O.",
//         ),
//       );
//     return inspectNativeMacho({
//       target: this.target,
//       ...(signal === undefined ? {} : { signal }),
//       run: (tool, arguments_, commandSignal) =>
//         this.#run("inspect_macho", tool, arguments_, {
//           signal: commandSignal,
//         }),
//       invocation: (capture) => invocation(capture, this.target.path),
//     });
//   }
//
//   async #run(
//     operation: NativeToolName,
//     tool: string,
//     arguments_: readonly string[],
//     options: {
//       readonly signal?: AbortSignal | undefined;
//       readonly acceptNonZero?: boolean;
//     } = {},
//   ): Promise<Result<NativeCommandCapture, AnalysisError>> {
//     if (this.#closed)
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           IDENTITY.id,
//           operation,
//           "Native provider client is closed",
//         ),
//       );
//     const command = this.runner.run(tool, arguments_, {
//       ...(options.signal === undefined ? {} : { signal: options.signal }),
//       acceptNonZero: options.acceptNonZero ?? false,
//     });
//     this.#pendingCommands.add(command);
//     let captured: Awaited<typeof command>;
//     try {
//       captured = await command;
//     } finally {
//       this.#pendingCommands.delete(command);
//     }
//     if (captured.ok) return captured;
//     return err(translateCommandFailure(operation, captured.error));
//   }
// }
export const _l = 297;
