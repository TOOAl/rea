/**
 * AGENTS.md 계층 로더 — Codex + Muse Code 표준
 * 
 * Codex/Muse 표준: 워크스페이스 루트에서 .git 경계까지 위로 올라가며 탐색
 * 각 디렉토리 레벨에서: AGENTS.md → CLAUDE.md → .agents/AGENTS.md → .claude/CLAUDE.md 순서로
 * 첫 번째로 존재하는 파일 하나만 로드
 * 우선순위: 깊은 파일이 얕은 파일보다 우선, 프로젝트 규칙이 사용자 규칙보다 우선
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";

export interface AgentsMdEntry {
  path: string;
  content: string;
  level: string; // "project" | "user" | "parent"
  depth: number; // 0 = CWD, 1 = 부모, ...
}

function findGitRoot(cwd: string): string | null {
  let dir = resolve(cwd);
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, ".git"))) return dir;
    dir = dirname(dir);
  }
  return null;
}

function findInstructionFile(dir: string): string | null {
  // Codex/Muse 우선순위 순서
  const candidates = [
    join(dir, "AGENTS.md"),
    join(dir, "CLAUDE.md"), // fallback
    join(dir, ".agents", "AGENTS.md"),
    join(dir, ".claude", "CLAUDE.md"),
  ];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

export function loadAgentsMdHierarchy(cwd: string): AgentsMdEntry[] {
  const entries: AgentsMdEntry[] = [];
  const gitRoot = findGitRoot(cwd);
  // git root가 없으면 cwd의 부모 하나만 확인
  const stopDir = gitRoot ? dirname(gitRoot) : dirname(resolve(cwd));

  let dir = resolve(cwd);
  let depth = 0;

  // 1) 프로젝트 계층 — CWD에서 .git 경계까지
  while (true) {
    const file = findInstructionFile(dir);
    if (file) {
      try {
        const content = readFileSync(file, "utf-8");
        entries.push({
          path: file,
          content,
          level: depth === 0 ? "project" : "parent",
          depth,
        });
      } catch {}
    }

    if (dir === gitRoot || dir === stopDir || dir === dirname(dir)) break;
    dir = dirname(dir);
    depth++;
    if (depth > 20) break; // 안전장치
  }

  // 2) 사용자 전역 규칙 (Codex/Muse: ~/.codex, ~/.muse, ~/.claude, ~/.arena)
  const home = process.env.HOME;
  if (home) {
    const userCandidates = [
      join(home, ".codex", "AGENTS.md"),
      join(home, ".muse", "AGENTS.md"),
      join(home, ".arena-code", "AGENT.md"), // Arena Code 기존
      join(home, ".arena", "AGENT.md"),
      join(home, ".codex", "config", "AGENTS.md"),
      join(home, ".claude", "CLAUDE.md"),
    ];

    for (const p of userCandidates) {
      if (existsSync(p)) {
        try {
          const content = readFileSync(p, "utf-8");
          // 중복 방지
          if (!entries.some(e => e.path === p)) {
            entries.push({ path: p, content, level: "user", depth: 99 });
          }
          break; // 사용자 규칙은 하나만
        } catch {}
      }
    }
  }

  return entries;
}

export function formatAgentsMdForPrompt(entries: AgentsMdEntry[]): string {
  if (entries.length === 0) return "";

  // 깊은 것(구체적인) → 얕은 것(일반적인) 순서로 정렬
  // 실제 프롬프트에서는 깊은 규칙이 우선하도록 마지막에 배치하거나 명시
  const sorted = [...entries].sort((a, b) => b.depth - a.depth);

  const sections = sorted.map(e => {
    const label = e.depth === 0 ? "현재 디렉토리" : e.depth === 99 ? "전역(사용자)" : `${e.depth}단계 상위`;
    return `### ${label}: ${e.path}\n${e.content}`;
  });

  return `\n\n## 프로젝트 규칙 (AGENTS.md 계층)\n> 규칙 우선순위: 깊은 파일(구체적)이 얕은 파일(일반적)보다 우선, 프로젝트가 사용자보다 우선\n\n${sections.join("\n\n---\n\n")}\n`;
}

// 레거시: 기존 loadAgentMd와 호환 (context.ts에서 사용)
export function loadAgentMdLegacy(cwd: string): string {
  const entries = loadAgentsMdHierarchy(cwd);
  return formatAgentsMdForPrompt(entries);
}
