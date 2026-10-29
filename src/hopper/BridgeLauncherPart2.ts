export const __stub = 1;
//       )();
//       return ok(null);
//     } catch (cause: unknown) {
//       const observation = ArtifactReaderFailure.cleanupObservation(
//         cause,
//         "hopper-publisher-verification",
//       );
//       return err(
//         new ProviderCleanupError(
//           "hopper",
//           observation.resources,
//           {
//             reason: observation.reason,
//           },
//           { cause },
//         ),
//       );
//     }
//   }
//
//   async launch(
//     session: BridgeSession,
//     options: { readonly signal?: AbortSignal } = {},
//   ): Promise<
//     Result<
//       BridgeLaunch,
//       HopperStartError | HopperCancelledError | HopperProcessError
//     >
//   > {
//     const leaseResult = await this.#acquireLaunchLease(session.runId);
//     if (!leaseResult.ok) return leaseResult;
//     const lease = leaseResult.value;
//     let leaseTransferred = false;
//     try {
//       let loadedPath = this.options.targetPath;
//       if (this.options.preparedImage !== undefined) {
//         const prepared = await prepareHopperMachOImage(
//           this.options.targetPath,
//           this.options.preparedImage.sourceSha256,
//           this.options.preparedImage.image,
//           join(session.directory, "image.macho"),
//           options.signal,
//         );
//         if (!prepared.ok) return prepared;
//         loadedPath = prepared.value;
//       }
//       const ownsProcessLifetime = usesLinuxDemo(this.options);
//       const bootstrap = await this.#writeBootstrap(
//         session,
//         ownsProcessLifetime,
//         loadedPath,
//       );
//       if (!bootstrap.ok) return bootstrap;
//       const launched = await this.#launchPreparedTarget({
//         session,
//         signal: options.signal,
//         bootstrapPath: bootstrap.value,
//         loadedPath,
//         ownsProcessLifetime,
//         lease,
//       });
//       leaseTransferred = launched.ok;
//       return launched;
//     } finally {
//       if (!leaseTransferred) await lease?.release();
//     }
//   }
//
//   async #launchPreparedTarget(input: {
//     readonly session: BridgeSession;
//     readonly signal: AbortSignal | undefined;
//     readonly bootstrapPath: string;
//     readonly loadedPath: string;
//     readonly ownsProcessLifetime: boolean;
//     readonly lease: HopperTargetLease | undefined;
//   }): Promise<
//     Result<
//       BridgeLaunch,
//       HopperStartError | HopperCancelledError | HopperProcessError
//     >
//   > {
//     const { session, signal, bootstrapPath, ownsProcessLifetime, lease } =
//       input;
//     const action =
//       this.options.targetKind === "database" ? "--database" : "--executable";
//     const argumentsForTarget = [
//       ...this.options.loaderArgs,
//       "--analysis",
//       "-Y",
//       bootstrapPath,
//       action,
//       input.loadedPath,
//     ];
//     let launched = false;
//     try {
//       if (signal?.aborted === true) return err(new HopperCancelledError());
//       const display = await this.#privateDisplay(signal);
//       if (!display.ok) return err(display.error);
//       let expectedLinuxSha256: string | undefined;
//       if (usesLinuxDemo(this.options)) {
//         const inspected = await (
//           this.dependencies.verifyLinuxLauncher ?? inspectLinuxHopperLauncher
//         )(this.options.launcherPath, this.options.environment, signal);
//         if (!inspected.ok)
//           return inspected.error.reason === "cancelled"
//             ? err(new HopperCancelledError())
//             : err(
//                 new HopperStartError({
//                   userMessage: inspected.error.message,
//                   cause: inspected.error,
//                   launchRejection: {
//                     boundary: "publisher_verification",
//                     reason: inspected.error.reason,
//                   },
//                 }),
//               );
//         expectedLinuxSha256 = inspected.value.sha256;
//       }
//       const nativeHelperVerified =
//         (this.dependencies.platform ?? process.platform) === "darwin" &&
//         this.options.launchMode === "native" &&
//         (await (
//           this.dependencies.verifyNativeHelper ?? verifyMacHopperNativeHelper
//         )(this.options.launcherPath, this.options.environment, signal)) ===
//           "verified";
//       const prepared = await prepareHopperApplication(
//         this.options.launcherPath,
//         this.options.environment,
//         signal,
//       );
//       if (!prepared) return err(new HopperCancelledError());
//       const linuxDemo = linuxDemoLaunch(
//         this.options,
//         session,
//         argumentsForTarget,
//         display.strategy,
//         expectedLinuxSha256,
//       );
//       const started = await launchHopperProcess({
//         options: this.options,
//         session,
//         bootstrapPath,
//         ownsProcessLifetime,
//         argumentsForTarget,
//         linuxDemo,
//         signal,
//       });
//       if (started === null) return err(new HopperCancelledError());
//       launched = true;
//       const cleanup = () => cleanupOwnedProcessGroup(started.ownership);
//       const ownedLauncher = {
//         ...(this.options.preparedImage === undefined
//           ? {}
//           : { preparedImagePath: input.loadedPath }),
//         process: started.process,
//         ownsProcessLifetime: true as const,
export const _l = 156;
