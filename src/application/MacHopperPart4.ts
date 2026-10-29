export const __stub = 1;
//           "codesign",
//           [
//             "--verify",
//             "--strict",
//             `-R${HOPPER_PUBLISHER_REQUIREMENT}`,
//             appPath,
//           ],
//           environment,
//         ))
//       )
//         return "unverified_publisher";
//       return "verified";
//     },
//     async destinationExists(path) {
//       try {
//         await access(path);
//         return true;
//       } catch (cause: unknown) {
//         if (isMissingPath(cause)) return false;
//         throw cause;
//       }
//     },
//     installBundle: (source, destination, replaceExisting) =>
//       installMacHopperBundle(
//         source,
//         destination,
//         replaceExisting,
//         {
//           async createStagingRoot(parent) {
//             await mkdir(parent, { recursive: true });
//             return mkdtemp(join(parent, ".rea-hopper-stage-"));
//           },
//           copyBundle: async (bundle, staged) => {
//             await execFileAsync("ditto", [bundle, staged], {
//               env: environment,
//             });
//           },
//           requireLauncher: (path) => access(path).then(() => undefined),
//           pathExists,
//           rename,
//           removeStagingRoot: (path) => rm(path, { recursive: true }),
//         },
//         (cleanup) => pendingCleanup.add(cleanup),
//       ),
//     async openApplication(path) {
//       await execFileAsync("open", [path], { env: environment });
//     },
//     cleanup: (path) => rm(path, { recursive: true, force: true }),
//     retainCleanup: (cleanup) => pendingCleanup.add(cleanup),
//     async close() {
//       let failure: string | undefined;
//       for (const cleanup of pendingCleanup) {
//         try {
//           await cleanup();
//           pendingCleanup.delete(cleanup);
//         } catch (cause: unknown) {
//           failure ??= `Hopper installer cleanup remains incomplete: ${failureMessage(cause)}`;
//         }
//       }
//       return failure;
//     },
//     destination: () => macHopperUserApplicationPath(homeDirectory),
//   };
// };
//
// const parseJson = (bytes: Uint8Array): unknown =>
//   JSON.parse(new TextDecoder().decode(bytes));
// const integrityMatches = (
//   bytes: Uint8Array,
//   release: z.infer<typeof releaseSchema>,
// ): boolean =>
//   bytes.byteLength === Number(release.file_length) &&
//   bytes.byteLength <= HOPPER_DOWNLOAD_BYTES &&
//   createHash("sha1").update(bytes).digest("hex") === release.file_hash;
// const commandSucceeds = async (
//   command: string,
//   args: readonly string[],
//   environment: Readonly<NodeJS.ProcessEnv>,
// ): Promise<boolean> => {
//   try {
//     await execFileAsync(command, args, { env: environment });
//     return true;
//   } catch (cause: unknown) {
//     if (
//       typeof cause === "object" &&
//       cause !== null &&
//       "code" in cause &&
//       typeof cause.code === "number"
//     )
//       return false;
//     throw cause;
//   }
// };
// const failureMessage = (cause: unknown): string =>
//   cause instanceof Error
//     ? [
//         cause.message,
//         "stderr" in cause && typeof cause.stderr === "string"
//           ? cause.stderr.trim()
//           : "",
//       ]
//         .filter((value) => value !== "")
//         .join(": ")
//     : String(cause);
// const isMissingPath = (cause: unknown): boolean =>
//   typeof cause === "object" &&
//   cause !== null &&
//   "code" in cause &&
//   cause.code === "ENOENT";
// const pathExists = async (path: string): Promise<boolean> => {
//   try {
//     await access(path);
//     return true;
//   } catch (cause: unknown) {
//     if (isMissingPath(cause)) return false;
//     throw cause;
//   }
// };
// const releaseSchema = z.object({
//   filename: z.string().url(),
//   file_length: z.string().regex(/^\d+$/u),
//   file_hash: z.string().regex(/^[a-f0-9]{40}$/u),
// });
// const releasesSchema = z.object({ "OS X": releaseSchema });
export const _l = 124;
