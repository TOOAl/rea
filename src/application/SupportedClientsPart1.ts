export const __stub = 1;
// import { dirname, isAbsolute, join, resolve, win32 } from "node:path";
// import { fileURLToPath } from "node:url";
// import { lstatSync } from "node:fs";
// import { err, ok, type Result } from "../domain/result.js";
// import {
//   HermesClientPathError,
//   resolveHermesClientHome,
// } from "./HermesClientHome.js";
// import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";
// import { resolveWindowsClaudeDesktopLocation } from "./ClaudeDesktopConfigLocation.js";
// import type { MsixPackageView } from "./MsixPackageStorage.js";
//
// /** One supported client configuration location. */
// export interface SetupClient {
//   readonly name: string;
//   readonly displayName?: string;
//   readonly configPath: string;
//   /** User configuration files in increasing precedence, including the write target. */
//   readonly configPaths?: readonly string[];
//   /** Read-only Gemini scopes and trust inputs; never setup write targets. */
//   readonly geminiSettings?: {
//     readonly systemPath: string;
//     readonly defaultsPath: string;
//     readonly workspaceDirectory: string;
//     readonly trustedFoldersPath: string;
//     readonly trustOverride?: boolean;
//     readonly platform: NodeJS.Platform;
//   };
//   /** Unresolved path evidence only; consumers must not perform I/O on it. */
//   readonly configPathError?: string;
//   /** Same-scope fallback ZCode stops loading after its first native server. */
//   readonly zcodeFallbackPath?: string;
//   readonly markerPath?: string;
//   /** MSIX package storage that decides which configuration the client reads. */
//   readonly msixPackage?: MsixPackageView;
//   /** A running client can rewrite its configuration from memory. */
//   readonly quitBeforeSetup?: boolean;
//   readonly format?:
//     | "json"
//     | "toml"
//     | "vscode"
//     | "copilot_cli"
//     | "opencode"
//     | "commandcode"
//     | "grok"
//     | "omp"
//     | "pi"
//     | "kimi"
//     | "hermes"
//     | "zcode_fallback"
//     | "zcode"
//     | "dsh"
//     | "unsupported";
// }
//
// interface ClientPathFailure {
//   readonly path: string;
//   readonly message: string;
// }
//
// type ClientPathResult = Result<string, ClientPathFailure>;
// type ClientPath =
//   | readonly string[]
//   | ((paths: ClientPathContext) => string | ClientPathResult);
//
// interface ClientPathContext {
//   readonly home: string;
//   readonly platform: NodeJS.Platform;
//   readonly env: Readonly<NodeJS.ProcessEnv>;
// }
//
// /** One resolved configuration location and its detection evidence. */
// interface ClientLocation {
//   readonly configPath: string;
//   readonly markerPath: string;
//   readonly msixPackage?: MsixPackageView;
// }
//
// type ClientDefinition = ClientDefinitionBase &
//   (
//     | {
//         readonly configPath: ClientPath;
//         readonly markerPath: ClientPath;
//         readonly location?: undefined;
//       }
//     | {
//         /** Resolve configuration and marker together when they share probes. */
//         readonly location: (
//           context: ClientPathContext,
//         ) => Result<ClientLocation, ClientPathFailure>;
//         readonly configPath?: undefined;
//         readonly markerPath?: undefined;
//       }
//   );
//
// interface ClientDefinitionBase {
//   readonly name: string;
//   readonly displayName: string;
//   readonly format: NonNullable<SetupClient["format"]>;
//   readonly quitBeforeSetup?: boolean;
//   readonly zcodeFallbackPath?: (context: ClientPathContext) => string;
//   readonly skillPath?: ClientPath;
//   readonly configPaths?: (context: ClientPathContext) => readonly string[];
//   readonly geminiSettings?: (
//     context: ClientPathContext,
//   ) => NonNullable<SetupClient["geminiSettings"]>;
// }
//
// /** XDG treats an empty config-home value as unset. */
// const xdgConfigHome = ({ home, env }: ClientPathContext): string =>
//   env.XDG_CONFIG_HOME || join(home, ".config");
//
// const vscodeUserDirectory = ({
//   home,
//   platform,
//   env,
// }: ClientPathContext): string => {
//   if (platform === "win32")
//     return join(
//       env.APPDATA ?? join(home, "AppData", "Roaming"),
//       "Code",
//       "User",
//     );
//   if (platform === "darwin")
//     return join(home, "Library", "Application Support", "Code", "User");
//   return join(xdgConfigHome({ home, platform, env }), "Code", "User");
// };
//
// const traeUserDirectory = ({
//   home,
//   platform,
//   env,
// }: ClientPathContext): string => {
//   if (platform === "win32")
//     return join(
//       env.APPDATA ?? join(home, "AppData", "Roaming"),
//       "Trae",
//       "User",
//     );
//   if (platform === "darwin")
//     return join(home, "Library", "Application Support", "Trae", "User");
//   return join(xdgConfigHome({ home, platform, env }), "Trae", "User");
// };
//
// /** Windows packaging decides which file Claude Desktop reads; see its resolver. */
// const claudeDesktopLocation = (
//   context: ClientPathContext,
// ): Result<ClientLocation, ClientPathFailure> => {
//   if (context.platform === "win32")
//     return resolveWindowsClaudeDesktopLocation(context.home, context.env);
//   const directory =
//     context.platform === "linux"
//       ? join(xdgConfigHome(context), "Claude")
//       : join(context.home, "Library", "Application Support", "Claude");
//   return ok({
//     configPath: join(directory, "claude_desktop_config.json"),
//     markerPath: directory,
//   });
// };
//
// const claudeCodeConfigDirectory = ({ home, env }: ClientPathContext): string =>
//   env.CLAUDE_CONFIG_DIR ?? home;
//
// const claudeCodeMarkerDirectory = ({ home, env }: ClientPathContext): string =>
//   env.CLAUDE_CONFIG_DIR ?? join(home, ".claude");
//
// const codexDirectory = ({ home, env }: ClientPathContext): string =>
//   env.CODEX_HOME || join(home, ".codex");
//
// /** Kimi Code stores MCP declarations beside the rest of its home data. */
// const kimiDirectory = ({ home, env }: ClientPathContext): string =>
//   env.KIMI_CODE_HOME || join(home, ".kimi-code");
//
// const qoderDirectory = ({ home, env }: ClientPathContext): string =>
//   env.QODER_CONFIG_DIR || join(home, ".qoder");
//
// const factoryDirectory = ({ home }: ClientPathContext): string =>
//   join(home, ".factory");
//
// /** Match Qwen Code's home override, including tilde and cwd-relative paths. */
// const qwenCodeDirectory = ({ home, env }: ClientPathContext): string => {
//   const override = env.QWEN_HOME;
//   if (!override) return join(home, ".qwen");
//   const expanded =
//     override === "~"
//       ? home
//       : override.startsWith("~/") || override.startsWith("~\\")
//         ? join(
//             home,
//             ...override
//               .slice(2)
//               .split(/[/\\]+/)
//               .filter(Boolean),
//           )
//         : override;
//   return isAbsolute(expanded) ? expanded : resolve(expanded);
// };
//
// const grokDirectory = ({ home, env }: ClientPathContext): string =>
//   env.GROK_HOME || join(home, ".grok");
//
// /** Match Harness home-paths for both independent roots; trim only to detect blanks. */
// const dshDirectory = (
//   home: string,
//   override: string | undefined,
//   fallback: string,
// ): string => {
//   const selected =
//     override !== undefined && override.trim().length > 0
//       ? override
//       : join(home, fallback);
//   const expanded =
//     selected === "~"
//       ? home
//       : selected.startsWith("~/") || selected.startsWith("~\\")
//         ? join(home, selected.slice(2))
export const _l = 216;
