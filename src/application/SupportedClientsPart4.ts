export const __stub = 1;
//     displayName: "Hermes",
//     skillPath: (context: ClientPathContext) =>
//       join(hermesDirectory(context), "skills"),
//     configPath: (context: ClientPathContext) =>
//       join(hermesDirectory(context), "config.yaml"),
//     markerPath: hermesDirectory,
//     format: "hermes",
//   },
//   {
//     name: "qoder",
//     displayName: "Qoder",
//     skillPath: (context: ClientPathContext) =>
//       join(qoderDirectory(context), "skills"),
//     configPath: (context: ClientPathContext) =>
//       join(qoderDirectory(context), "settings.json"),
//     markerPath: qoderDirectory,
//     format: "json",
//   },
//   {
//     name: "droid",
//     displayName: "Factory Droid",
//     skillPath: (context: ClientPathContext) =>
//       join(factoryDirectory(context), "skills"),
//     configPath: (context: ClientPathContext) =>
//       join(factoryDirectory(context), "mcp.json"),
//     markerPath: factoryDirectory,
//     format: "json",
//   },
//   {
//     name: "zcode",
//     zcodeFallbackPath: ({ home }: ClientPathContext) =>
//       join(home, ".agents", "mcp.json"),
//     displayName: "ZCode",
//     configPath: [".zcode", "cli", "config.json"],
//     markerPath: [".zcode", "cli"],
//     skillPath: [".zcode", "skills"],
//     format: "zcode",
//   },
//   {
//     name: "dsh",
//     displayName: "DeepSeek Harness",
//     // The home Cordis patch applies to every profile; the skill directory is
//     // shared agent storage Harness discovers.
//     skillPath: ({ home, env }: ClientPathContext) =>
//       join(dshDirectory(home, env.DSH_AGENTS_HOME, ".agents"), "skills"),
//     configPath: dshPatchDirectory,
//     markerPath: dshHomeDirectory,
//     format: "dsh",
//   },
//   {
//     name: "grok_bot",
//     displayName: "Grok Bot",
//     configPath: grokBotDirectory,
//     markerPath: grokBotDirectory,
//     format: "unsupported",
//   },
// ] as const satisfies readonly ClientDefinition[];
//
// /**
//  * Paths whose presence means doctor and setup should inspect the client.
//  * Layered sources count: OpenCode still loads its XDG files when a custom
//  * directory override does not exist.
//  */
// export const clientEvidencePaths = (
//   client: Pick<SetupClient, "configPath" | "configPaths" | "markerPath">,
// ): readonly string[] => [
//   ...new Set(
//     [
//       client.configPath,
//       ...(client.configPaths ?? []),
//       client.markerPath,
//     ].filter((path): path is string => path !== undefined && path.length > 0),
//   ),
// ];
//
// const resolvePath = (
//   path: ClientPath,
//   context: ClientPathContext,
// ): ClientPathResult => {
//   const resolved =
//     typeof path === "function" ? path(context) : join(context.home, ...path);
//   return typeof resolved === "string" ? ok(resolved) : resolved;
// };
//
// const resolveLocation = (
//   definition: ClientDefinition,
//   context: ClientPathContext,
// ): Result<ClientLocation, ClientPathFailure> => {
//   if (definition.location !== undefined) return definition.location(context);
//   const config = resolvePath(definition.configPath, context);
//   if (!config.ok) return config;
//   const marker = resolvePath(definition.markerPath, context);
//   return marker.ok
//     ? ok({ configPath: config.value, markerPath: marker.value })
//     : marker;
// };
//
// /** Describe every client location that setup, doctor, or uninstall may inspect. */
// export const supportedClients = (
//   home: string,
//   platform: NodeJS.Platform = process.platform,
//   env: ClientPathContext["env"] = process.env,
// ): readonly SetupClient[] => {
//   const context = { home, platform, env };
//   const definitions: readonly ClientDefinition[] = SUPPORTED_CLIENT_DEFINITIONS;
//   return definitions.map((definition) => {
//     try {
//       const location = resolveLocation(definition, context);
//       if (!location.ok)
//         return {
//           name: definition.name,
//           displayName: definition.displayName,
//           format: definition.format,
//           configPath: location.error.path,
//           configPathError: location.error.message,
//         };
//       const { configPath, markerPath, msixPackage } = location.value;
//       return {
//         name: definition.name,
//         displayName: definition.displayName,
//         configPath,
//         ...(definition.geminiSettings === undefined
//           ? {}
//           : { geminiSettings: definition.geminiSettings(context) }),
//         ...(definition.configPaths === undefined
//           ? {}
//           : {
//               configPaths: [
//                 ...new Set([...definition.configPaths(context), configPath]),
//               ],
//             }),
//         ...(definition.zcodeFallbackPath === undefined
//           ? {}
//           : { zcodeFallbackPath: definition.zcodeFallbackPath(context) }),
//         markerPath,
//         ...(msixPackage === undefined ? {} : { msixPackage }),
//         ...(definition.quitBeforeSetup === true
//           ? { quitBeforeSetup: true }
//           : {}),
//         format: definition.format,
//       };
//     } catch (cause: unknown) {
//       if (cause instanceof HermesClientPathError)
//         return {
//           name: definition.name,
//           displayName: definition.displayName,
//           format: definition.format,
//           configPath: cause.path,
//           configPathError: cause.message,
//         };
//       if (definition.name !== "pi") throw cause;
//       return {
//         name: definition.name,
//         displayName: definition.displayName,
//         format: definition.format,
//         configPath: env.PI_CODING_AGENT_DIR ?? "",
//         configPathError: `Invalid PI_CODING_AGENT_DIR: ${cause instanceof Error ? cause.message : String(cause)}. Repair the override before configuring Pi.`,
//       };
//     }
//   });
// };
//
// /** Resolve personal skill roots using the same client environment as setup. */
// export const clientSkillDirectories = (
//   home: string,
//   clientIds: readonly string[] | undefined,
//   environment: Readonly<NodeJS.ProcessEnv> = {},
//   platform: NodeJS.Platform = process.platform,
// ): readonly { readonly client: string; readonly directory: string }[] => {
//   const definitions: readonly ClientDefinition[] = SUPPORTED_CLIENT_DEFINITIONS;
//   const selected =
//     clientIds === undefined
//       ? [
//           "shared",
//           ...definitions
//             .filter(({ skillPath }) => skillPath !== undefined)
//             .map(({ name }) => name),
//         ]
//       : clientIds.length === 0
//         ? ["shared"]
//         : clientIds;
//   const destinations = new Map<string, { client: string; directory: string }>();
//   for (const client of selected) {
//     const definition = definitions.find(({ name }) => name === client);
//     let directory: string;
//     try {
//       const resolved =
//         definition?.skillPath === undefined
//           ? ok(join(home, ".agents", "skills"))
//           : resolvePath(definition.skillPath, {
//               home,
//               platform,
//               env: environment,
//             });
//       if (!resolved.ok) continue;
//       directory = resolved.value;
//     } catch (cause: unknown) {
//       // Registration diagnostics own an unresolved profile; never fall back to another skill root.
//       if (cause instanceof HermesClientPathError) continue;
//       throw cause;
//     }
//     if (!destinations.has(directory))
//       destinations.set(directory, {
//         client:
//           directory === join(home, ".agents", "skills") ? "shared" : client,
//         directory,
//       });
//   }
//   return [...destinations.values()].sort((left, right) =>
//     compareUnicodeCodePoints(left.directory, right.directory),
//   );
// };
export const _l = 212;
