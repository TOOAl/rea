export const __stub = 1;
//         IDENTITY.id,
//         observation.resources,
//         { reason: observation.reason },
//         { operation: "close_binary", cause },
//       );
//     }
//     const commandCleanup = await this.#retryNativeCommandCleanup();
//     let result = await this.tracer.close();
//     const cleanupErrors = [
//       ...(uiCleanupFailures.length === 0
//         ? []
//         : [this.#nativeUiCleanupFailure(uiCleanupFailures, "close_binary")]),
//       ...(commandCleanup === undefined ? [] : [commandCleanup]),
//       ...(signatureCleanup === undefined ? [] : [signatureCleanup]),
//     ];
//     for (const cleanupError of cleanupErrors)
//       result = result.ok
//         ? err(cleanupError)
//         : err(analysisErrorWithCleanupFailure(result.error, cleanupError));
//     return result;
//   }
//
//   #observeNativeUi(
//     operation: "observe_native_ui" | "capture_native_ui_scenario",
//     parameters: Readonly<Record<string, JsonValue>>,
//     signal?: AbortSignal,
//   ) {
//     return this.#serializeNativeUi(async () => {
//       if (this.#closed)
//         return err(
//           new AnalysisCapabilityUnavailableError(
//             IDENTITY.id,
//             operation,
//             "Native provider client is closed",
//           ),
//         );
//       const earlierCleanupFailures = await this.#retryNativeUiCleanup();
//       if (earlierCleanupFailures.length > 0)
//         return err(
//           this.#nativeUiCleanupFailure(earlierCleanupFailures, operation),
//         );
//       const runtime = createNativeUiHelperRuntime(this.environment);
//       this.#pendingNativeUiRuntimes.add(runtime);
//       let result: Awaited<ReturnType<typeof observeNativeUi>>;
//       try {
//         result = await observeNativeUi(this.target, operation, parameters, {
//           environment: this.environment,
//           signal,
//           runtime,
//         });
//       } catch (cause: unknown) {
//         result = err(
//           cause instanceof AnalysisError
//             ? cause
//             : new ProviderAdapterError(IDENTITY.id, operation, { cause }),
//         );
//       }
//       try {
//         await runtime.close();
//         this.#pendingNativeUiRuntimes.delete(runtime);
//       } catch (cause: unknown) {
//         const cleanup = this.#nativeUiCleanupFailure(
//           [{ runtime, cause }],
//           operation,
//           result.ok ? result.value : undefined,
//         );
//         return err(
//           result.ok
//             ? cleanup
//             : analysisErrorWithCleanupFailure(result.error, cleanup, operation),
//         );
//       }
//       return result.ok
//         ? ok(
//             createAnalysisExecution(result.value, IDENTITY, {
//               limitations: result.value.limitations,
//             }),
//           )
//         : result;
//     });
//   }
//
//   #serializeNativeUi<Value>(operation: () => Promise<Value>): Promise<Value> {
//     const call = this.#nativeUiTail.then(operation, operation);
//     this.#nativeUiTail = call.then(
//       () => undefined,
//       () => undefined,
//     );
//     return call;
//   }
//
//   async #retryNativeUiCleanup(): Promise<
//     Array<{ readonly runtime: NativeUiHelperRuntime; readonly cause: unknown }>
//   > {
//     const failures: Array<{
//       readonly runtime: NativeUiHelperRuntime;
//       readonly cause: unknown;
//     }> = [];
//     for (const runtime of this.#pendingNativeUiRuntimes) {
//       try {
//         await runtime.close();
//         this.#pendingNativeUiRuntimes.delete(runtime);
//       } catch (cause: unknown) {
//         failures.push({ runtime, cause });
//       }
//     }
//     return failures;
//   }
//
//   async #retryNativeCommandCleanup(): Promise<AnalysisError | undefined> {
//     if (this.runner.retryCleanup === undefined) return undefined;
//     try {
//       const failures = await this.runner.retryCleanup();
//       return failures.length === 0
//         ? undefined
//         : nativeCommandCleanupFailure(failures);
//     } catch (cause: unknown) {
//       return new ProviderCleanupError(
//         IDENTITY.id,
//         ["native-command-process-cleanup"],
//         {
//           reason:
//             cause instanceof Error
//               ? cause.message || cause.name
//               : String(cause) || "native command cleanup failed unexpectedly",
//         },
//         { cause },
//       );
//     }
//   }
//
//   #nativeUiCleanupFailure(
//     failures: readonly {
//       readonly runtime: NativeUiHelperRuntime;
//       readonly cause: unknown;
//     }[],
//     operation: string,
//     partialObservation?: NativeUiObservationResult,
//   ): ProviderCleanupError {
//     const resources = failures.flatMap(({ runtime }) => runtime.resources());
//     return new ProviderCleanupError(
//       IDENTITY.id,
//       resources.length === 0 ? ["native-ui-runtime"] : resources,
//       {
//         reason: "Native UI runtime cleanup remains incomplete",
//         failures: failures.map(({ runtime, cause }) => ({
//           resources: [...runtime.resources()],
//           reason: cause instanceof Error ? cause.message : String(cause),
//         })),
//       },
//       {
//         operation,
//         cause: new AggregateError(
//           failures.map(({ cause }) => cause),
//           "Native UI runtime cleanup failed",
//         ),
//         ...(partialObservation === undefined ? {} : { partialObservation }),
//       },
//     );
//   }
//
//   #dispatch(
//     operation: NativeToolName,
//     parameters: Readonly<Record<string, JsonValue>>,
//     signal?: AbortSignal,
//   ): Promise<Result<NativeObservation, AnalysisError>> {
//     switch (operation) {
//       case "observe_native_ui":
//       case "capture_native_ui_scenario":
//       case "observe_native_calls":
//         return Promise.resolve(
//           err(
//             new AnalysisCapabilityUnavailableError(
//               IDENTITY.id,
//               operation,
//               "UI observation uses its explicit authority boundary",
//             ),
//           ),
//         );
//       case "inspect_macho":
//         return this.#inspectMacho(signal);
//       case "inspect_signature":
//         return this.#inspectSignature(signal);
//       case "inspect_plist":
//         return this.#inspectPlist(parameters, signal);
//       case "list_architectures":
//         return this.#listArchitectures(signal);
//       case "demangle_swift":
//         return this.#demangle(parameters, signal);
//     }
//   }
//
//   async #listArchitectures(
//     signal?: AbortSignal,
//   ): Promise<Result<NativeObservation, AnalysisError>> {
//     // lipo reads only Mach-O; its refusal of a PE, ELF, or plist target is not
//     // a tool failure that a retry or `rea doctor` could repair.
//     if (!isMachOFormat(this.target.format))
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           IDENTITY.id,
//           "list_architectures",
//           "Active artifact is not Mach-O.",
//         ),
//       );
//     const capture = await this.#run(
//       "list_architectures",
//       "lipo",
//       ["-detailed_info", this.target.path],
//       { signal },
//     );
//     if (!capture.ok) return capture;
//     const provenance = [invocation(capture.value, this.target.path)];
//     const { architectures } = parseLipoOutput(
//       capture.value.stdout,
//       this.target.path,
//     );
//     const result = listArchitecturesSchema.parse({
//       architectures: {
//         items: architectures,
//         total: architectures.length,
//         exhaustive: true,
//         limitations: [],
//       },
//       provenance,
//       limitations: [],
//     });
//     return ok({
//       result: jsonValueSchema.parse(result),
//       limitations: [],
//       locations: architectureLocations(result.architectures.items),
//     });
//   }
//
//   async #demangle(
//     parameters: Readonly<Record<string, JsonValue>>,
//     signal?: AbortSignal,
//   ): Promise<Result<NativeObservation, AnalysisError>> {
//     const symbols = z.array(z.string()).safeParse(parameters.symbols);
//     if (!symbols.success)
//       return err(
//         new AnalysisOutputError(
//           "demangle_swift",
//           "symbols were not parsed strings",
//         ),
//       );
//     const capture = await this.#run(
//       "demangle_swift",
//       "swift-demangle",
//       // `--` keeps symbols that begin with `-` from selecting demangler options.
//       ["--compact", "--", ...symbols.data],
//       { signal },
//     );
//     if (!capture.ok) return capture;
//     const provenance = [invocation(capture.value, this.target.path)];
//     const result = demangleSwiftSchema.parse({
//       symbols: parseDemangledSymbols(symbols.data, capture.value.stdout),
//       provenance,
//       limitations: [],
//     });
//     return ok({
//       result: jsonValueSchema.parse(result),
//       limitations: [],
//       locations: [],
//     });
//   }
//
//   async #inspectSignature(
//     signal?: AbortSignal,
//   ): Promise<Result<NativeObservation, AnalysisError>> {
//     // This provider's signature inspection covers Mach-O code signatures
//     // only. On another container, codesign's "not signed" verdict cannot
//     // see a format-level signature such as a xar pkg signature, so
//     // reporting it would claim unsigned for a layer that was never
//     // evaluated.
//     if (this.target.kind !== "executable" || !isMachOFormat(this.target.format))
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           IDENTITY.id,
//           "inspect_signature",
//           "Active artifact is not Mach-O; its container-level signature layer is not evaluated by codesign.",
//         ),
//       );
//     return withSignatureTarget(
//       this.target,
//       this.#signatureResources,
//       (binding) => this.#inspectBoundSignature(binding, signal),
//       signal,
//       this.privateRuntimeRootFactory,
//     );
//   }
//
//   async #inspectBoundSignature(
//     binding: SignatureTargetBinding,
//     signal?: AbortSignal,
//   ): Promise<Result<NativeObservation, AnalysisError>> {
//     const display = await this.#captureSignature(
export const _l = 297;
