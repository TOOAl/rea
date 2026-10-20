/**
 * Config Resolver — 우선순위 병합: CLI > arena.config.json > .env > defaults
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { DEFAULT_CONFIG, type ArenaConfig, type ArenaConfigFile } from "./schema.js";

function loadDotEnv(cwd: string): void {
  for (const p of [join(cwd, ".env"), join(resolve(cwd, ".."), ".env")]) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, "utf-8");
        for (const line of content.split("\n")) {
          const t = line.trim();
          if (!t || t.startsWith("#")) continue;
          const eq = t.indexOf("=");
          if (eq === -1) continue;
          const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim();
          if (!process.env[k] && v) process.env[k] = v;
        }
      } catch {}
      break;
    }
  }
}

function loadConfigFile(cwd: string): ArenaConfigFile | null {
  const candidates = [
    join(cwd, "arena.config.json"),
    join(cwd, ".arena-code", "config.json"),
    join(cwd, ".arena", "config.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, "utf-8")) as ArenaConfigFile;
      } catch {}
    }
  }
  return null;
}

export function resolveConfig(
  cwd: string,
  cliOpts: Record<string, unknown> = {},
): ArenaConfig {
  loadDotEnv(cwd);
  const fileConfig = loadConfigFile(cwd);
  const cfg: ArenaConfig = {
    ...DEFAULT_CONFIG,
    cwd: resolve(cwd),
    updates: { ...DEFAULT_CONFIG.updates, repos: [...DEFAULT_CONFIG.updates.repos] },
    externalPackages: { ...DEFAULT_CONFIG.externalPackages },
    agents: [...DEFAULT_CONFIG.agents],
  };

  if (fileConfig) {
    if (fileConfig.provider) cfg.provider = fileConfig.provider;
    if (fileConfig.model) cfg.model = fileConfig.model;
    if (fileConfig.maxTurns != null) cfg.maxTurns = fileConfig.maxTurns;
    if (fileConfig.maxContextTokens != null) cfg.maxContextTokens = fileConfig.maxContextTokens;
    if (fileConfig.sandbox) cfg.sandbox = fileConfig.sandbox;
    if (fileConfig.approvalMode) cfg.approvalMode = fileConfig.approvalMode;
    if (fileConfig.disabledTools) cfg.disabledTools = fileConfig.disabledTools;
    if (fileConfig.plugins) cfg.pluginPaths = fileConfig.plugins;
    if (fileConfig.permissionsPath) cfg.permissionsPath = fileConfig.permissionsPath;
    if (fileConfig.eventLogEnabled != null) cfg.eventLogEnabled = fileConfig.eventLogEnabled;
    if (fileConfig.mcp != null) cfg.mcp = fileConfig.mcp;
    if (fileConfig.externalPackages) cfg.externalPackages = { ...cfg.externalPackages, ...fileConfig.externalPackages };
    if (fileConfig.updates) {
      cfg.updates = { ...cfg.updates, ...fileConfig.updates };
      if (fileConfig.updates.repos) cfg.updates.repos = fileConfig.updates.repos;
    }
    if (fileConfig.agents) cfg.agents = fileConfig.agents;
  }

  // CLI flags (최고 우선순위)
  if (cliOpts.cwd) cfg.cwd = resolve(cliOpts.cwd as string);
  if (cliOpts.provider) cfg.provider = cliOpts.provider as string;
  if (cliOpts.model) cfg.model = cliOpts.model as string;
  if (cliOpts.maxTurns != null) cfg.maxTurns = parseInt(cliOpts.maxTurns as string, 10);
  if (cliOpts.sandbox) cfg.sandbox = cliOpts.sandbox as string;
  if (cliOpts.yolo) { cfg.sandbox = "danger-full-access"; cfg.dangerouslySkipPermissions = true; }
  if (cliOpts.dangerouslySkipPermissions) cfg.dangerouslySkipPermissions = true;
  if (cliOpts.worktree) cfg.worktree = cliOpts.worktree as string;
  if (cliOpts.skill) cfg.skill = cliOpts.skill as string;
  if (cliOpts.approvalMode) cfg.approvalMode = cliOpts.approvalMode as string;
  if (cliOpts.mock) cfg.mock = true;
  if (cliOpts.print) cfg.printPrompt = cliOpts.print as string;
  if (cliOpts.mcp) cfg.mcp = true;
  if (cliOpts.config) {
    // --config로 직접 경로 지정 시 그 파일 로드
    const direct = cliOpts.config as string;
    if (existsSync(direct)) {
      try {
        const extra = JSON.parse(readFileSync(direct, "utf-8")) as ArenaConfigFile;
        if (extra.provider) cfg.provider = extra.provider;
        if (extra.disabledTools) cfg.disabledTools = extra.disabledTools;
        if (extra.updates) cfg.updates = { ...cfg.updates, ...extra.updates };
      } catch {}
    }
  }

  if (!cliOpts.provider && !fileConfig?.provider && process.env.ARENA_PROVIDER) {
    cfg.provider = process.env.ARENA_PROVIDER;
  }
  if (!cfg.model && cfg.provider) {
    const envKey: Record<string, string> = {
      gemini: "GEMINI_MODEL", openrouter: "OPENROUTER_MODEL",
      groq: "GROQ_MODEL", ollama: "OLLAMA_MODEL",
      anthropic: "ANTHROPIC_MODEL", arena: "ARENA_MODEL",
    };
    const k = envKey[cfg.provider.toLowerCase()];
    if (k && process.env[k]) cfg.model = process.env[k]!;
  }
  return cfg;
}

export { loadConfigFile };
