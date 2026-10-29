export const __stub = 1;
//   let originalBackedUp = false;
//   let newCommitted = false;
//   let failureReason: "copy" | "launcher_missing" = "copy";
//
//   try {
//     await operations.copyBundle(source, stagedBundle);
//     failureReason = "launcher_missing";
//     await operations.requireLauncher(
//       join(stagedBundle, "Contents/MacOS/hopper"),
//     );
//     failureReason = "copy";
//     if (replaceExisting) {
//       await operations.rename(destination, previousBundle);
//       originalBackedUp = true;
//     }
//     await operations.rename(stagedBundle, destination);
//     newCommitted = true;
//   } catch (cause: unknown) {
//     const diagnostics = [failureMessage(cause)];
//     if (originalBackedUp && !newCommitted) {
//       try {
//         if (await operations.pathExists(destination))
//           throw new Error(
//             "destination now contains another installation; preserving the previous bundle in its owned staging root",
//           );
//         await operations.rename(previousBundle, destination);
//         originalBackedUp = false;
//       } catch (rollbackCause: unknown) {
//         diagnostics.push(`rollback failed: ${failureMessage(rollbackCause)}`);
//         const cleanupFailure = `The previous Hopper bundle remains owned at ${previousBundle}; cleanup will retry restoration only if the destination is empty.`;
//         retainCleanup(async () => {
//           if (originalBackedUp) {
//             if (await operations.pathExists(destination))
//               throw new Error(
//                 `Hopper destination is occupied; preserving owned backup ${previousBundle}`,
//               );
//             await operations.rename(previousBundle, destination);
//             originalBackedUp = false;
//           }
//           await operations.removeStagingRoot(stagingRoot);
//         });
//         return {
//           status: "failed",
//           reason: failureReason,
//           diagnostic: diagnostics.join("; "),
//           cleanupFailure,
//         };
//       }
//     }
//     try {
//       await operations.removeStagingRoot(stagingRoot);
//     } catch (cleanupCause: unknown) {
//       const cleanupFailure = `Hopper staging root cleanup failed: ${failureMessage(cleanupCause)}`;
//       retainCleanup(() => operations.removeStagingRoot(stagingRoot));
//       diagnostics.push(cleanupFailure);
//       return {
//         status: "failed",
//         reason: failureReason,
//         diagnostic: diagnostics.join("; "),
//         cleanupFailure,
//       };
//     }
//     return {
//       status: "failed",
//       reason: failureReason,
//       diagnostic: diagnostics.join("; "),
//     };
//   }
//
//   try {
//     await operations.removeStagingRoot(stagingRoot);
//     return { status: "installed" };
//   } catch (cause: unknown) {
//     const cleanupFailure = `Hopper staging root cleanup failed after installation committed: ${failureMessage(cause)}`;
//     retainCleanup(() => operations.removeStagingRoot(stagingRoot));
//     return { status: "installed", cleanupFailure };
//   }
// };
//
// /** Compose installer paths and subprocesses from one selected caller context. */
// export const systemMacHopperInstallHost = (
//   homeDirectory: string,
//   environment: Readonly<NodeJS.ProcessEnv>,
// ): MacHopperInstallHost & { close(): Promise<string | undefined> } => {
//   const pendingCleanup = new Set<() => Promise<void>>();
//   return {
//     download: downloadHopperPackage,
//     createTemporaryDirectory: () => mkdtemp(join(tmpdir(), "rea-hopper-mac-")),
//     createMountDirectory: (path) => mkdir(path),
//     writePackage: (path, bytes) => writeFile(path, bytes, { mode: 0o600 }),
//     async mount(packagePath, mountPath) {
//       await execFileAsync(
//         "hdiutil",
//         [
//           "attach",
//           "-readonly",
//           "-nobrowse",
//           "-mountpoint",
//           mountPath,
//           packagePath,
//         ],
//         { env: environment },
//       );
//       return true;
//     },
//     async unmount(mountPath) {
//       await execFileAsync("hdiutil", ["detach", mountPath, "-force"], {
//         env: environment,
//       });
//     },
//     async appBundle(mountPath) {
//       const entries = await readdir(mountPath, { withFileTypes: true });
//       const app = entries.find(
//         (entry) => entry.isDirectory() && /^Hopper.*\.app$/iu.test(entry.name),
//       );
//       return app === undefined ? undefined : join(mountPath, app.name);
//     },
//     async validBundle(appPath) {
//       if (
//         !(await commandSucceeds(
//           "codesign",
//           ["--verify", "--deep", "--strict", appPath],
//           environment,
//         ))
//       )
//         return "invalid_signature";
//       if (
//         !(await commandSucceeds(
export const _l = 128;
