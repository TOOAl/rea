export const __stub = 1;
//         let caskroom: string;
//         try {
//           // Without a cask argument, `--caskroom` does not load Homebrew's
//           // cask API, so doctor writes no Homebrew cache files.
//           caskroom = (
//             await hostExecFileOutput(
//               command,
//               ["--caskroom"],
//               commandEnvironment,
//             )
//           ).stdout.trim();
//         } catch (cause: unknown) {
//           // best-effort cleanup: optional Homebrew probing; absence means uninstalled.
//           void cause;
//           return undefined;
//         }
//         const appdir = await installedCaskAppdir(
//           caskroom,
//           "hopper-disassembler",
//           homeDirectory,
//         );
//         return appdir === undefined
//           ? undefined
//           : join(appdir, "Hopper Disassembler.app/Contents/MacOS/hopper");
//       });
//     },
//     manualHopperPaths: () => manualHopperPaths(homeDirectory),
//     ...(options.providerInspections === undefined
//       ? {}
//       : { providerInspections: options.providerInspections }),
//     ...(options.providerRegistrationEnvironment === undefined
//       ? {}
//       : {
//           providerRegistrationEnvironment:
//             options.providerRegistrationEnvironment,
//         }),
//     ...(options.resolveProviderRequestBudget === undefined
//       ? {}
//       : { resolveProviderRequestBudget: options.resolveProviderRequestBudget }),
//     async ilspyCmdVersion(path) {
//       try {
//         await access(path, constants.X_OK);
//         return firstIlspyVersionLine(
//           (
//             await hostExecFileOutput(path, ["--version"], {
//               timeout: 10_000,
//               ...commandEnvironment,
//             })
//           ).stdout,
//         );
//       } catch (cause: unknown) {
//         // best-effort cleanup: optional version probing; failure means unavailable.
//         void cause;
//         return undefined;
//       }
//     },
//     async installationPaths() {
//       try {
//         const command = platform === "win32" ? "where" : "which";
//         const arguments_ = platform === "win32" ? ["rea"] : ["-a", "rea"];
//         return uniqueLines(
//           (await hostExecFileOutput(command, arguments_, commandEnvironment))
//             .stdout,
//         );
//       } catch (cause: unknown) {
//         // best-effort cleanup: optional path probing; failure means none found.
//         void cause;
//         return [];
//       }
//     },
//     installedSkillIdentity: (clientIds) =>
//       readInstalledSkillIdentity(
//         homeDirectory,
//         clientIds,
//         environment,
//         platform,
//         resources,
//       ),
//     close: async () => {
//       try {
//         await resources.close();
//         return undefined;
//       } catch (cause: unknown) {
//         return `Doctor resource cleanup failed: ${cause instanceof Error ? cause.message : String(cause)}`;
//       }
//     },
//     clientRegistrations: () =>
//       readClientRegistrationStatuses(homeDirectory, undefined, {
//         platform,
//         environment,
//         resources,
//         ...(options.resolveProviderRequestBudget === undefined
//           ? {}
//           : {
//               resolveProviderRequestBudget:
//                 options.resolveProviderRequestBudget,
//             }),
//       }),
//   };
// };
//
// const readMacosVersion = async (
//   run: typeof execFileOutput,
//   options: { readonly env: NodeJS.ProcessEnv },
// ): Promise<string | undefined> => {
//   try {
//     return (await run("sw_vers", ["-productVersion"], options)).stdout.trim();
//   } catch (cause: unknown) {
//     // best-effort cleanup: optional OS version probing; failure means unknown.
//     void cause;
//     return undefined;
//   }
// };
//
// const executableAvailable = async (
//   path: string,
//   platform: NodeJS.Platform,
//   run: typeof execFileOutput,
//   options: { readonly env: NodeJS.ProcessEnv },
// ): Promise<boolean> => {
//   try {
//     await access(path, constants.X_OK);
//     if (!(await stat(path)).isFile()) return false;
//     if (platform !== "linux") return true;
//     const linked = await run("ldd", [path], options);
//     return linuxSharedLibrariesAvailable(`${linked.stdout}\n${linked.stderr}`);
//   } catch (cause: unknown) {
//     // best-effort cleanup: optional executable probing; failure means unavailable.
//     void cause;
//     return false;
//   }
// };
//
// const uncomposedLinuxDemoRuntimeCheck = (): Promise<DoctorCheck> =>
//   Promise.resolve({
//     name: "hopper-demo-runtime",
//     ok: false,
//     classification: "config_drift",
//     detail: "Linux Hopper private-display diagnostics were not composed",
//     remediation: "Run rea doctor through the production CLI adapter.",
//   });
//
// const manualHopperPaths = async (home: string): Promise<readonly string[]> => {
//   const roots = macHopperApplicationRoots(home);
//   const bundleNamesByRoot = new Map<string, readonly string[]>();
//   for (const root of roots) {
//     try {
//       bundleNamesByRoot.set(
//         root,
//         (await readdir(root, { withFileTypes: true }))
//           .filter((entry) => entry.isDirectory())
//           .map(({ name }) => name),
//       );
//     } catch (cause: unknown) {
//       // A missing or unreadable optional application directory is not fatal.
//       void cause;
//     }
//   }
//   return macHopperRenamedLauncherCandidates(home, bundleNamesByRoot);
// };
//
// const uniqueLines = (value: string): string[] => [
//   ...new Set(
//     value
//       .split(/\r?\n/u)
//       .map((line) => line.trim())
//       .filter((line) => line.length > 0),
//   ),
// ];
//
// const firstIlspyVersionLine = (value: string): string | undefined =>
//   uniqueLines(value).find((line) => line.startsWith("ilspycmd:"));
export const _l = 172;
