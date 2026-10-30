export const __stub = 1;
//               "-processor",
//               rawBinary.languageId,
//               "-cspec",
//               rawBinary.compilerSpecId,
//             ]),
//     "-readOnly",
//     "-deleteProject",
//     "-log",
//     options.ghidraLogPath,
//     "-scriptlog",
//     options.scriptLogPath,
//     "-scriptPath",
//     bridgeDirectory,
//     ...(options.dosCom === true
//       ? [
//           "-preScript",
//           scriptPath.join(bridgeDirectory, GHIDRA_BRIDGE_SOURCES.prepareCom),
//         ]
//       : []),
//     ...(rawBinary === undefined
//       ? []
//       : [
//           "-preScript",
//           scriptPath.join(bridgeDirectory, GHIDRA_BRIDGE_SOURCES.prepareRaw),
//           rawBinary.languageId,
//           rawBinary.baseAddr,
//         ]),
//     // Seeds follow any loader preparation and precede default auto-analysis.
//     ...(options.seedPath === undefined
//       ? []
//       : [
//           "-preScript",
//           scriptPath.join(bridgeDirectory, GHIDRA_BRIDGE_SOURCES.applySeeds),
//           options.seedPath,
//         ]),
//     // Analyzer options must apply before default auto-analysis and before the
//     // post-analysis repair and bridge scripts start serving.
//     ...(options.disabledAnalyzers === undefined ||
//     options.disabledAnalyzers.length === 0
//       ? []
//       : [
//           "-preScript",
//           scriptPath.join(
//             bridgeDirectory,
//             GHIDRA_BRIDGE_SOURCES.analysisOptions,
//           ),
//           options.disabledAnalyzers.join(","),
//         ]),
//     ...((options.platform ?? process.platform) === "win32"
//       ? []
//       : [
//           "-postScript",
//           scriptPath.join(bridgeDirectory, GHIDRA_BRIDGE_SOURCES.noReturnFix),
//         ]),
//     // After analysis and the no-return refit, before the bridge serves results.
//     ...(options.mipsSoftFloat === true
//       ? [
//           "-postScript",
//           scriptPath.join(bridgeDirectory, GHIDRA_BRIDGE_SOURCES.mipsSoftFloat),
//         ]
//       : []),
//     "-postScript",
//     // Ghidra checks the caller's cwd before scriptPath for a basename. Select
//     // the packaged source explicitly so unrelated entries cannot shadow it.
//     options.bridgeScriptPath,
//     options.descriptorPath,
//   ];
// };
//
// const ghidraRuntimePaths = (runtimeRoot: string) => ({
//   projectRoot: join(runtimeRoot, "project"),
//   homeRoot: join(runtimeRoot, "home"),
//   tempRoot: join(runtimeRoot, "tmp"),
//   cacheRoot: join(runtimeRoot, "cache"),
//   configRoot: join(runtimeRoot, "config"),
//   dataRoot: join(runtimeRoot, "data"),
//   descriptorPath: join(runtimeRoot, "session.json"),
//   ownershipPath: join(runtimeRoot, "ownership.json"),
//   ghidraLogPath: join(runtimeRoot, "ghidra.log"),
//   scriptLogPath: join(runtimeRoot, "script.log"),
// });
//
// /**
//  * Ghidra's launch support resolves its JDK before the headless run and then
//  * persists that choice under `<config>/ghidra/<release directory>`. Inside
//  * REA's Windows private runtime a child JVM cannot create those directories
//  * itself, so startup aborted with "Failed to create directory" and reported
//  * that no supported JDK was found. Create the release directory while this
//  * process still owns the runtime, leaving Ghidra only a file write inside it.
//  */
// const ghidraConfigReleaseDirectory = async (
//   analyzeHeadlessPath: string,
// ): Promise<string> => {
//   const installRoot = dirname(dirname(analyzeHeadlessPath));
//   try {
//     const properties = await readFile(
//       join(installRoot, "Ghidra", "application.properties"),
//       "latin1",
//     );
//     const parsed = parseGhidraJavaProperties(properties);
//     if (!parsed.ok) return basename(installRoot);
//     const version = parsed.value.get("application.version");
//     const release = parsed.value.get("application.release.name");
//     return version === undefined ||
//       release === undefined ||
//       release.length === 0
//       ? basename(installRoot)
//       : `ghidra_${version}_${release}`;
//   } catch (cause: unknown) {
//     // An unreadable properties file leaves the release coordinate unknown; the
//     // conventional extraction directory carries the same name.
//     void cause;
//     return basename(installRoot);
//   }
// };
//
// const createGhidraRuntimeDirectories = async (
//   paths: ReturnType<typeof ghidraRuntimePaths>,
//   platform: NodeJS.Platform,
//   configReleaseDirectory: string,
// ): Promise<void> => {
//   if (platform === "win32") {
//     const runtime = windowsPrivateRuntime(dirname(paths.projectRoot));
//     for (const path of [
//       paths.projectRoot,
//       paths.homeRoot,
//       paths.tempRoot,
//       paths.cacheRoot,
//       paths.configRoot,
//       paths.dataRoot,
//     ])
//       runtime.mkdir(basename(path));
//     // Each level needs its parent first: the native owner opens every existing
//     // component and creates only the final one.
//     const configRoot = basename(paths.configRoot);
//     runtime.mkdir(win32.join(configRoot, "ghidra"));
//     runtime.mkdir(win32.join(configRoot, "ghidra", configReleaseDirectory));
//     return;
//   }
//   await Promise.all(
//     [
//       paths.projectRoot,
//       paths.homeRoot,
//       paths.tempRoot,
//       paths.cacheRoot,
//       paths.configRoot,
//       paths.dataRoot,
//       join(paths.configRoot, "ghidra", configReleaseDirectory),
//     ].map((path) => mkdir(path, { recursive: true, mode: 0o700 })),
//   );
// };
//
// const writeGhidraRuntimeFile = async (
//   path: string,
//   content: string,
//   platform: NodeJS.Platform,
// ): Promise<void> => {
//   if (platform === "win32") {
//     windowsPrivateRuntime(dirname(path)).writeFile(basename(path), content);
//     return;
//   }
//   await writeFileAtomic(path, content, { encoding: "utf8", mode: 0o600 });
// };
//
// const ghidraLaunchEnvironment = (
//   paths: ReturnType<typeof ghidraRuntimePaths>,
//   javaHome: string | undefined,
//   platform: NodeJS.Platform,
//   executable: string,
//   selectedEnvironment: Readonly<NodeJS.ProcessEnv>,
// ): NodeJS.ProcessEnv => {
//   return {
//     ...ghidraJavaEnvironment(javaHome, selectedEnvironment, platform),
//     ...ghidraHeadlessJavaOptions(paths.homeRoot, paths.tempRoot, platform),
//     HOME: paths.homeRoot,
//     TMPDIR: paths.tempRoot,
//     ...(platform === "win32"
//       ? {
//           // Batch FOR /F launches another command interpreter through ComSpec.
//           // Use the same executable with the spelling consumed by cmd.exe.
//           ComSpec: executable.replaceAll("/", "\\"),
//           USERPROFILE: paths.homeRoot,
//           APPDATA: paths.configRoot,
//           LOCALAPPDATA: paths.cacheRoot,
//           TEMP: paths.tempRoot,
//           TMP: paths.tempRoot,
//         }
//       : {}),
//     XDG_CACHE_HOME: paths.cacheRoot,
//     XDG_CONFIG_HOME: paths.configRoot,
//     XDG_DATA_HOME: paths.dataRoot,
//   };
// };
//
// /** Encode provider-owned JVM paths for the platform launcher that consumes them. */
// export const ghidraHeadlessJavaOptions = (
//   homeRoot: string,
//   tempRoot: string,
//   platform: NodeJS.Platform,
// ): Pick<
//   NodeJS.ProcessEnv,
//   "JDK_JAVA_OPTIONS" | "GHIDRA_HEADLESS_JAVA_OPTIONS"
// > => {
//   const options = [`-Duser.home=${homeRoot}`, `-Djava.io.tmpdir=${tempRoot}`];
//   if (platform === "win32")
//     return {
//       JDK_JAVA_OPTIONS: [...options, "-XX:-UsePerfData"]
//         .map((option) => ghidraBatchStep(() => quoteWindowsBatchToken(option)))
//         .join(" "),
//       GHIDRA_HEADLESS_JAVA_OPTIONS: "",
//     };
//   // POSIX launches the JVM directly, so these properties travel as separate
//   // argv items instead of the shell-split analyzeHeadless option list.
//   return { JDK_JAVA_OPTIONS: "", GHIDRA_HEADLESS_JAVA_OPTIONS: "" };
// };
//
// const isAborted = (signal?: AbortSignal): boolean => signal?.aborted === true;
export const _l = 217;
