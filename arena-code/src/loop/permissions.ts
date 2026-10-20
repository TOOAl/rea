/**
 * Permission System — 3단계 (allow/ask/deny)
 * Claude Code 7단계의 단순화 버전
 * deny → allow → ask 순서 (deny-first)
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { ContentBlock } from "../providers/types.js";

export type Decision = "allow" | "ask" | "deny";

export interface PermissionConfig {
  allow: string[]; // 패턴 문자열, 정규식으로 컴파일
  ask: string[];
  deny: string[];
}

const DEFAULT_CONFIG: PermissionConfig = {
  allow: [
    "Read(*)",
    "Glob(*)",
    "Grep(*)",
    "TodoWrite(*)",
    "WebFetch(*)",
    "Bash(git status*)",
    "Bash(git log*)",
    "Bash(git diff*)",
    "Bash(npm run build*)",
    "Bash(npm test*)",
    "Bash(ls*)",
    "Bash(cat *)",
  ],
  ask: [
    "Write(*)",
    "Edit(*)",
    "Bash(*)",
  ],
  deny: [
    "Bash(rm -rf /*)",
    "Bash(sudo *)",
    "Bash(mkfs*)",
    "Bash(dd *)",
    "Read(.env)",
    "Read(*.pem)",
    "Read(*secret*)",
  ],
};

function patternToRegex(pattern: string): RegExp {
  // "Read(*)" → /^Read\(.*\)$/
  // "Bash(git status*)" → /^Bash\(git status.*\)$/
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // escape regex special chars
    .replace(/\\\*/g, ".*") // * → .*
    .replace(/\\\(/g, "\\(")
    .replace(/\\\)/g, "\\)");
  // Undo over-escaping of parens we want as literal
  const final = escaped.replace(/\\\(/g, "\\(").replace(/\\\)/g, "\\)");
  return new RegExp(`^${final}$`);
}

function toolCallString(block: ContentBlock): string {
  const input = block.input ?? {};
  if (block.name === "Bash") return `Bash(${input.command ?? ""})`;
  if (block.name === "Read") return `Read(${input.file_path ?? ""})`;
  if (block.name === "Write") return `Write(${input.file_path ?? ""})`;
  if (block.name === "Edit") return `Edit(${input.file_path ?? ""})`;
  if (block.name === "Glob") return `Glob(${input.pattern ?? ""})`;
  if (block.name === "Grep") return `Grep(${input.pattern ?? ""})`;
  return `${block.name}(${JSON.stringify(input).slice(0, 100)})`;
}

export function checkPermission(
  block: ContentBlock,
  config: PermissionConfig = DEFAULT_CONFIG
): Decision {
  const str = toolCallString(block);

  // 1. Deny first
  for (const pat of config.deny) {
    try {
      if (patternToRegex(pat).test(str)) return "deny";
    } catch { /* ignore bad pattern */ }
  }
  // 2. Allow
  for (const pat of config.allow) {
    try {
      if (patternToRegex(pat).test(str)) return "allow";
    } catch { /* ignore */ }
  }
  // 3. Ask
  for (const pat of config.ask) {
    try {
      if (patternToRegex(pat).test(str)) return "ask";
    } catch { /* ignore */ }
  }
  // Default: ask (안전 기본값)
  return "ask";
}

export async function loadPermissionConfig(cwd: string): Promise<PermissionConfig> {
  const candidates = [
    join(cwd, ".arena-code", "settings.json"),
    join(cwd, "settings.json"),
    join(process.env.HOME ?? "", ".arena-code", "settings.json"),
  ];

  let config: PermissionConfig = { ...DEFAULT_CONFIG };

  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const raw = await readFile(p, "utf-8");
        const json = JSON.parse(raw) as { permissions?: Partial<PermissionConfig> };
        if (json.permissions) {
          if (json.permissions.allow) config.allow = json.permissions.allow;
          if (json.permissions.ask) config.ask = json.permissions.ask;
          if (json.permissions.deny) config.deny = json.permissions.deny;
        }
      } catch { /* ignore */ }
    }
  }

  return config;
}

export function describeDecision(block: ContentBlock, decision: Decision): string {
  const str = toolCallString(block);
  if (decision === "deny") return `⛔ Denied: ${str}`;
  if (decision === "ask") return `❓ Needs approval: ${str}`;
  return `✓ Allowed: ${str}`;
}
