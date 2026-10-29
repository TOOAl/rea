export const __stub = 1;
//   host: MacHopperInstallHost = systemMacHopperInstallHost(
//     homeDirectoryFromEnvironment(process.env, process.platform),
//     process.env,
//   ),
// ): Promise<MacHopperInstallResult> => {
//   let temporary: string | undefined;
//   let mounted = false;
//   let bundleCleanupFailure: string | undefined;
//   let installStage: MacHopperInstallFailureReason = "release_metadata";
//   let result: MacHopperInstallResult;
//   try {
//     result = await (async (): Promise<MacHopperInstallResult> => {
//       const metadata = await host.download(RELEASES_URL);
//       if (!metadata.ok) return { status: "failed", reason: "release_metadata" };
//       const parsed = releasesSchema.safeParse(parseJson(metadata.bytes));
//       if (!parsed.success)
//         return { status: "failed", reason: "release_metadata" };
//       const release = parsed.data["OS X"];
//       if (!release.filename.startsWith(DOWNLOAD_PREFIX))
//         return { status: "failed", reason: "release_metadata" };
//       installStage = "download";
//       const archive = await host.download(release.filename);
//       if (!archive.ok) return { status: "failed", reason: "download" };
//       installStage = "integrity";
//       if (!integrityMatches(archive.bytes, release))
//         return { status: "failed", reason: "integrity" };
//
//       installStage = "destination_exists";
//       const destination = host.destination();
//       const destinationExists = await host.destinationExists(destination);
//       if (destinationExists && options.replaceExisting !== true)
//         return { status: "failed", reason: "destination_exists" };
//       installStage = "mount";
//       temporary = await host.createTemporaryDirectory();
//       const packagePath = join(temporary, "hopper.dmg");
//       const mountPath = join(temporary, "mounted");
//       await host.createMountDirectory(mountPath);
//       await host.writePackage(packagePath, archive.bytes);
//       if (!(await host.mount(packagePath, mountPath)))
//         return { status: "failed", reason: "mount" };
//       mounted = true;
//       installStage = "bundle";
//       const source = await host.appBundle(mountPath);
//       if (source === undefined) return { status: "failed", reason: "bundle" };
//       const verification = await host.validBundle(source);
//       if (verification === "invalid_signature")
//         return { status: "failed", reason: "bundle" };
//       if (verification === "unverified_publisher")
//         return { status: "failed", reason: "publisher_verification_failed" };
//       installStage = "copy";
//       const installation = await host.installBundle(
//         source,
//         destination,
//         destinationExists,
//       );
//       if (installation.status === "failed")
//         return {
//           status: "failed",
//           reason: installation.reason,
//           diagnostic: installation.diagnostic,
//           ...(installation.cleanupFailure === undefined
//             ? {}
//             : { cleanupFailure: installation.cleanupFailure }),
//         };
//       bundleCleanupFailure = installation.cleanupFailure;
//       const launcherPath = join(destination, "Contents/MacOS/hopper");
//       let openFailure: string | undefined;
//       try {
//         await host.openApplication(destination);
//       } catch (cause: unknown) {
//         openFailure = failureMessage(cause);
//       }
//       return {
//         status: "installed",
//         launcherPath,
//         ...(openFailure === undefined ? {} : { openFailure }),
//       };
//     })();
//   } catch (cause: unknown) {
//     result = {
//       status: "failed",
//       reason: installStage,
//       diagnostic: failureMessage(cause),
//     };
//   }
//
//   let cleanupFailure: string | undefined;
//   if (temporary !== undefined) {
//     const temporaryPath = temporary;
//     const mountPath = join(temporary, "mounted");
//     const cleanup = async (): Promise<void> => {
//       if (mounted) {
//         await host.unmount(mountPath);
//         mounted = false;
//       }
//       await host.cleanup(temporaryPath);
//     };
//     try {
//       await cleanup();
//     } catch (cause: unknown) {
//       cleanupFailure = `Hopper DMG cleanup failed: ${failureMessage(cause)}`;
//       host.retainCleanup?.(cleanup);
//     }
//   }
//
//   const retainedCleanupFailure = [
//     bundleCleanupFailure,
//     cleanupFailure,
//     result.cleanupFailure,
//   ]
//     .filter((failure): failure is string => failure !== undefined)
//     .join(" ");
//   return retainedCleanupFailure === ""
//     ? result
//     : { ...result, cleanupFailure: retainedCleanupFailure };
// };
//
// /** Replace a bundle through a fresh same-volume root owned by this transaction. */
// export const installMacHopperBundle = async (
//   source: string,
//   destination: string,
//   replaceExisting: boolean,
//   operations: MacHopperBundleInstallOperations,
//   retainCleanup: (cleanup: () => Promise<void>) => void,
// ): Promise<MacHopperBundleInstallResult> => {
//   const stagingRoot = await operations.createStagingRoot(dirname(destination));
//   const stagedBundle = join(stagingRoot, "new.app");
//   const previousBundle = join(stagingRoot, "previous.app");
export const _l = 128;
