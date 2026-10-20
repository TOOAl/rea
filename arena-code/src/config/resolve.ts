/**
 * Config Resolver — 우선순위 병합: CLI > arena.config.json > .env > defaults
 * - arena.config.json: 프로젝트별 영구 설정 (git에 커밋 가능)
 * - .env: 시크릿/환경별 설정
 * - CLI: 일회성 오버라이드
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
      } catch { /* ignore */ }
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
      } catch { /* malformed — ignore */ }
    }
  }
  return null;
}

/**
 * 모든 소스를 병합해 최종 ArenaConfig 반환
 * @param cwd 작업 디렉토리 (arena.config.json 탐색 기준)
 * @param cliOpts commander opts (가장 높은 우선순위)
 */
export function resolveConfig(
  cwd: string,
  cliOpts: Record<string, unknown> = {},
): ArenaConfig {
  loadDotEnv(cwd);
  const fileConfig = loadConfigFile(cwd);

  const cfg: ArenaConfig = { ...DEFAULT_CONFIG, cwd: resolve(cwd) };

  // 2) arena.config.json
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
  }

  // 3) .env는 이미 process.env에 로드됨 — provider/model은 아래에서 반영

  // 4) CLI flags (최고 우선순위)
  if (cliOpts.cwd) cfg.cwd = resolve(cliOpts.cwd as string);
  if (cliOpts.provider) cfg.provider = cliOpts.provider as string;
  if (cliOpts.model) cfg.model = cliOpts.model as string;
  if (cliOpts.maxTurns != null) cfg.maxTurns = parseInt(cliOpts.maxTurns as string, 10);
  if (cliOpts.sandbox) cfg.sandbox = cliOpts.sandbox as string;
  if (cliOpts.yolo) {
    cfg.sandbox = "danger-full-access";
    cfg.dangerouslySkipPermissions = true;
  }
  if (cliOpts.dangerouslySkipPermissions) cfg.dangerouslySkipPermissions = true;
  if (cliOpts.worktree) cfg.worktree = cliOpts.worktree as string;
  if (cliOpts.skill) cfg.skill = cliOpts.skill as string;
  if (cliOpts.approvalMode) cfg.approvalMode = cliOpts.approvalMode as string;
  if (cliOpts.mock) cfg.mock = true;
  if (cliOpts.print) cfg.printPrompt = cliOpts.print as string;

  // env fallback for provider if not set via file/cli
  if (!cliOpts.provider && !fileConfig?.provider && process.env.ARENA_PROVIDER) {
    cfg.provider = process.env.ARENA_PROVIDER;
  }

  // model env mapping per provider
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
