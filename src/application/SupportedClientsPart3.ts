export const __stub = 1;
//           cause.code === "ENOENT"
//         );
//       }
//     }) ??
//     resolve(
//       overrideDirectory !== undefined
//         ? join(overrideDirectory, "opencode.json")
//         : context.env.OPENCODE_CONFIG ||
//             join(opencodeDirectory(context), "opencode.json"),
//     )
//   );
// };
//
// const geminiSettings = ({
//   home,
//   platform,
//   env,
// }: ClientPathContext): NonNullable<SetupClient["geminiSettings"]> => {
//   const system =
//     env.GEMINI_CLI_SYSTEM_SETTINGS_PATH ||
//     (platform === "darwin"
//       ? "/Library/Application Support/GeminiCli/settings.json"
//       : platform === "win32"
//         ? "C:\\ProgramData\\gemini-cli\\settings.json"
//         : "/etc/gemini-cli/settings.json");
//   const trustOverride =
//     env.GEMINI_RESTRICTED_MODE === "true" ||
//     env.GEMINI_CLI_TRUST_WORKSPACE === "false"
//       ? false
//       : env.GEMINI_CLI_TRUST_WORKSPACE === "true"
//         ? true
//         : undefined;
//   return {
//     systemPath: system,
//     defaultsPath:
//       env.GEMINI_CLI_SYSTEM_DEFAULTS_PATH ||
//       join(dirname(system), "system-defaults.json"),
//     workspaceDirectory: process.cwd(),
//     trustedFoldersPath:
//       env.GEMINI_CLI_TRUSTED_FOLDERS_PATH ||
//       join(env.GEMINI_CLI_HOME || home, ".gemini", "trustedFolders.json"),
//     ...(trustOverride === undefined ? {} : { trustOverride }),
//     platform,
//   };
// };
//
// const devinDirectory = ({ home, platform, env }: ClientPathContext): string =>
//   platform === "win32"
//     ? join(env.APPDATA ?? join(home, "AppData", "Roaming"), "devin")
//     : join(env.XDG_CONFIG_HOME || join(home, ".config"), "devin");
//
// /** Stable product metadata used to derive setup discovery and documentation. */
// export const SUPPORTED_CLIENT_DEFINITIONS = [
//   {
//     name: "claude_code",
//     displayName: "Claude Code",
//     skillPath: ({ home, env }: ClientPathContext) =>
//       join(env.CLAUDE_CONFIG_DIR ?? join(home, ".claude"), "skills"),
//     configPath: (context: ClientPathContext) =>
//       join(claudeCodeConfigDirectory(context), ".claude.json"),
//     markerPath: claudeCodeMarkerDirectory,
//     format: "json",
//   },
//   {
//     name: "claude_desktop",
//     displayName: "Claude Desktop",
//     location: claudeDesktopLocation,
//     quitBeforeSetup: true,
//     format: "json",
//   },
//   {
//     name: "codex",
//     displayName: "Codex",
//     configPath: (context: ClientPathContext) =>
//       join(codexDirectory(context), "config.toml"),
//     markerPath: codexDirectory,
//     format: "toml",
//   },
//   {
//     name: "cursor",
//     displayName: "Cursor",
//     configPath: [".cursor", "mcp.json"],
//     markerPath: [".cursor"],
//     format: "json",
//   },
//   {
//     name: "gemini_cli",
//     displayName: "Gemini CLI",
//     geminiSettings,
//     configPath: ({ home, env }: ClientPathContext) =>
//       join(env.GEMINI_CLI_HOME || home, ".gemini", "settings.json"),
//     markerPath: ({ home, env }: ClientPathContext) =>
//       join(env.GEMINI_CLI_HOME || home, ".gemini"),
//     skillPath: ({ home, env }: ClientPathContext) =>
//       join(env.GEMINI_CLI_HOME || home, ".agents", "skills"),
//     format: "json",
//   },
//   {
//     name: "windsurf",
//     displayName: "Windsurf",
//     configPath: [".codeium", "windsurf", "mcp_config.json"],
//     markerPath: [".codeium", "windsurf"],
//     format: "json",
//   },
//   {
//     name: "devin",
//     displayName: "Devin",
//     configPath: ({ home, platform, env }: ClientPathContext) =>
//       join(devinDirectory({ home, platform, env }), "mcp_config.json"),
//     markerPath: devinDirectory,
//     format: "json",
//   },
//   {
//     name: "opencode",
//     displayName: "OpenCode",
//     configPath: existingOpenCodeConfigPath,
//     configPaths: openCodeConfigurationPaths,
//     markerPath: opencodeDirectory,
//     format: "opencode",
//   },
//   {
//     name: "antigravity",
//     displayName: "Antigravity",
//     skillPath: [".gemini", "config", "skills"],
//     configPath: [".gemini", "config", "mcp_config.json"],
//     markerPath: [".gemini", "config"],
//     format: "json",
//   },
//   {
//     name: "copilot_cli",
//     displayName: "GitHub Copilot CLI",
//     configPath: (context: ClientPathContext) =>
//       join(copilotDirectory(context), "mcp-config.json"),
//     markerPath: copilotDirectory,
//     format: "copilot_cli",
//   },
//   {
//     name: "commandcode",
//     displayName: "Command Code",
//     configPath: (context: ClientPathContext) =>
//       join(commandCodeDirectory(context), "mcp.json"),
//     markerPath: commandCodeDirectory,
//     format: "commandcode",
//   },
//   {
//     name: "qwen_code",
//     displayName: "Qwen Code",
//     configPath: (context: ClientPathContext) =>
//       join(qwenCodeDirectory(context), "settings.json"),
//     markerPath: qwenCodeDirectory,
//     format: "json",
//   },
//   {
//     name: "kimi",
//     displayName: "Kimi Code",
//     configPath: (context: ClientPathContext) =>
//       join(kimiDirectory(context), "mcp.json"),
//     markerPath: kimiDirectory,
//     format: "kimi",
//   },
//   {
//     name: "vscode",
//     displayName: "VS Code",
//     configPath: (context: ClientPathContext) =>
//       join(vscodeUserDirectory(context), "mcp.json"),
//     markerPath: vscodeUserDirectory,
//     format: "vscode",
//   },
//   {
//     name: "trae",
//     displayName: "Trae",
//     skillPath: [".trae", "skills"],
//     configPath: (context: ClientPathContext) =>
//       join(traeUserDirectory(context), "mcp.json"),
//     markerPath: traeUserDirectory,
//     format: "json",
//   },
//   {
//     name: "workbuddy",
//     displayName: "WorkBuddy",
//     skillPath: [".workbuddy", "skills"],
//     configPath: [".workbuddy", "mcp.json"],
//     markerPath: [".workbuddy"],
//     format: "json",
//   },
//   {
//     name: "grok_build",
//     displayName: "Grok Build",
//     configPath: (context: ClientPathContext) =>
//       join(grokDirectory(context), "config.toml"),
//     markerPath: grokDirectory,
//     format: "grok",
//   },
//   {
//     name: "omp",
//     displayName: "OMP",
//     configPath: (context: ClientPathContext) => {
//       const directory = ompAgentDirectory(context);
//       return directory.ok ? ok(join(directory.value, "mcp.json")) : directory;
//     },
//     markerPath: ompAgentDirectory,
//     format: "omp",
//   },
//   {
//     name: "pi",
//     displayName: "Pi",
//     configPath: (context: ClientPathContext) =>
//       (context.platform === "win32" ? win32 : { join }).join(
//         piAgentDirectory(context),
//         "mcp.json",
//       ),
//     markerPath: piAgentDirectory,
//     format: "pi",
//   },
//   {
//     name: "hermes",
export const _l = 216;
