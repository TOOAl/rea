export const __stub = 1;
//             selected.error.reason === "cancelled"
//               ? "cancelled"
//               : "release_metadata",
//         };
//       const release = selected.value;
//       const archiveDownload = await host.download(release.filename, options);
//       if (!archiveDownload.ok) return { status: "failed", reason: "download" };
//       temporary = await host.createTemporaryDirectory();
//       const archive = join(temporary, `hopper.${distribution.packageFamily}`);
//       await host.writeArchive(archive, archiveDownload.bytes);
//       const verified = await host.verifyArchive(
//         distribution.packageFamily,
//         release,
//         archive,
//         options.signal,
//       );
//       if (!verified.ok)
//         return {
//           status: "failed",
//           verificationFailure: verified.error,
//           reason:
//             verified.error.reason === "cache_missing"
//               ? "verification_unavailable"
//               : verified.error.reason,
//         };
//       const retained = await host.retainVerifiedArchive(
//         verified.value,
//         archive,
//         options.signal,
//       );
//       if (!retained.ok)
//         return {
//           status: "failed",
//           verificationFailure: retained.error,
//           reason:
//             retained.error.reason === "cache_missing"
//               ? "verification_unavailable"
//               : retained.error.reason,
//         };
//       if (options.signal?.aborted === true)
//         return { status: "failed", reason: "cancelled" };
//       const install = await host.installPackage(
//         distribution.packageFamily,
//         archive,
//       );
//       if (install.status === "failed")
//         return {
//           status: "failed",
//           reason: "authorization_or_package_manager",
//           packageFailure: install.failure,
//         };
//       const launcherPath = "/opt/hopper/bin/Hopper";
//       const launcherStatus = await host.launcherStatus(
//         launcherPath,
//         release.main_exe_hash,
//       );
//       if (launcherStatus !== "ready")
//         return {
//           status: "failed",
//           reason:
//             launcherStatus === "missing" ? "launcher_missing" : launcherStatus,
//         };
//       return { status: "installed", launcherPath };
//     })();
//   } catch (cause: unknown) {
//     result = {
//       status: "failed",
//       reason: isAbortCause(cause) ? "cancelled" : "download",
//     };
//   }
//   if (temporary === undefined) return result;
//   try {
//     await host.cleanup(temporary);
//     return result;
//   } catch (cause: unknown) {
//     return {
//       ...result,
//       cleanupFailure: {
//         path: temporary,
//         reason: cause instanceof Error ? cause.message : String(cause),
//       },
//     };
//   }
// };
//
// /** Canonical launcher path for a legacy user-local Linux Hopper installation. */
// export const linuxHopperLauncherPath = (home: string): string =>
//   join(home, ".local/share/rea/hopper/bin/Hopper");
//
// /** REA's managed Linux install path, preferred when no explicit launcher is set. */
// export const REA_MANAGED_LINUX_HOPPER_LAUNCHER = "/opt/hopper/bin/Hopper";
//
// /** Other system-wide Hopper paths used by package installations. */
// export const systemLinuxHopperLauncherCandidates: readonly string[] = [
//   "/opt/hopper-v4/bin/hopper",
//   "/usr/bin/hopper",
// ];
//
// /** Probe REA-managed and user-local installs before arbitrary system builds. */
// export const linuxHopperLauncherCandidates = (
//   home: string,
// ): readonly string[] => [
//   REA_MANAGED_LINUX_HOPPER_LAUNCHER,
//   linuxHopperLauncherPath(home),
//   ...systemLinuxHopperLauncherCandidates,
// ];
//
// /** Compose package-manager and linker checks from the selected caller environment. */
// export const systemLinuxHopperInstallHost = (
//   environment: Readonly<NodeJS.ProcessEnv>,
// ): LinuxHopperInstallHost => {
//   const publisher = systemLinuxHopperPublisher(environment);
//   return {
//     distribution: readLinuxDistribution,
//     release: (family, signal) => publisher.currentRelease(family, signal),
//     download: downloadHopperPackage,
//     createTemporaryDirectory: () => mkdtemp(join(tmpdir(), "rea-hopper-")),
//     writeArchive: (path, bytes) => writeFile(path, bytes, { mode: 0o600 }),
//     installPackage: (family, archive) =>
//       installSystemPackage(family, archive, environment),
//     verifyArchive: (family, release, archive, signal) =>
//       publisher.verifyArchive(family, release, archive, signal),
//     retainVerifiedArchive: (verified, archive, signal) =>
//       publisher.retainVerifiedArchive(verified, archive, signal),
//     async launcherStatus(path, expectedSha256) {
//       try {
//         await access(path);
//         const linked = await execFileOutput("ldd", [path], {
//           env: environment,
//         });
//         if (
//           !linuxSharedLibrariesAvailable(`${linked.stdout}\n${linked.stderr}`)
//         )
//           return "runtime_dependencies";
//         return (await hashStableFile(path)).sha256 === expectedSha256
//           ? "ready"
//           : "unsupported_hopper_build";
//       } catch (cause: unknown) {
//         // best-effort cleanup: optional launcher probing; unreadable means missing.
//         void cause;
//         return "missing";
//       }
//     },
//     cleanup: (path) => rm(path, { recursive: true, force: true }),
//     close: async () => {
//       await publisher.close();
//       await retryLinuxHopperPublisherCleanup();
//     },
//   };
// };
export const _l = 150;
