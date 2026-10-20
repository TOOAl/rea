/**
 * Skills — Muse Code의 Bundled Skills 포팅
 * /plan, /grill, /goal, /loop + Codex의 skills 연동
 * 
 * Muse Code는 AGENTS.md와 함께 skills를 사용:
 * - /plan: 작업을 계획으로 변환, 승인 후 실행
 * - /grill: 계획을 스트레스 테스트
 * - /goal: 목표 달성까지 계속 작업
 * - /loop: cron job (5m, 1h 등)
 * 
 * Codex도 유사: .codex/skills, .agents/skills
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";

export interface Skill {
  name: string;          // /plan, /grill 등
  path: string;          // 파일 경로
  description: string;   // 짧은 설명 (skill 파일 첫 줄)
  content: string;       // 전체 내용
  source: string;        // arena-code, ghidra, user 등
  triggers?: string[];   // 자연어 트리거 (Genius: ["퀴리","curie"...])
}

// 빌트인 Skills (Muse Code bundling 근사)
const BUILTIN_SKILLS: Record<string, Skill> = {
  plan: {
    name: "plan",
    path: "builtin:plan",
    description: "작업을 계획으로 변환하고 승인 후 실행 — 읽기 전용 분석 모드",
    content: `당신은 계획 모드입니다. 다음 단계를 따르세요:
1. 사용자의 요청을 분석하고, 필요한 파일을 읽기만 하세요 (쓰기 금지)
2. 구체적인 실행 계획을 단계별로 작성하세요
3. 각 단계에서 어떤 파일을 어떻게 바꿀지 명시하세요
4. 계획 끝에 "이 계획으로 진행할까요?"를 물으세요
5. 사용자가 승인하면, 계획을 실행하세요
6. 사용자는 "approve" 또는 "진행해"로 승인합니다`,
    source: "builtin",
  },
  grill: {
    name: "grill",
    path: "builtin:grill",
    description: "계획을 스트레스 테스트 — 엣지 케이스, 보안, 성능 관점에서 질문",
    content: `당신은 계획 검토자(grill)입니다. 계획의 약점을 찾으세요:
1. 엣지 케이스: 빈 입력, 대용량, 동시성, 에러 상황에서 계획이 깨지지 않는가?
2. 보안: 권한, 입력 검증, 인젝션 취약점은 없는가?
3. 성능: N+1, 무한 루프, 메모리 누수는 없는가?
4. 테스트: 각 단계가 어떻게 검증되는가?
5. 3~5개의 날카로운 질문을 던지고, 개선안을 제시하세요.`,
    source: "builtin",
  },
  goal: {
    name: "goal",
    path: "builtin:goal",
    description: "목표 달성까지 계속 작업 — 완료 조건을 스스로 검증",
    content: `당신은 목표 추적자입니다. 목표가 달성될 때까지 계속 작업하세요:
1. 목표를 명확한 완료 조건으로 분해하세요
2. 각 조건을 TodoWrite로 추적하세요
3. 한 번의 턴이 끝나도 목표가 달성되지 않으면, 다음 단계를 계속 진행하세요
4. 매 10턴마다 진행 상황을 보고하세요
5. 모든 조건이 충족되면 "목표 달성!"을 보고하고 종료하세요
6. 중단되면 (Esc), 자동 일시정지 — /goal resume으로 재개`,
    source: "builtin",
  },
  loop: {
    name: "loop",
    path: "builtin:loop",
    description: "반복 작업 스케줄링 — cron job (예: /loop 5m \"테스트 실행\")",
    content: `당신은 반복 스케줄러입니다. 사용자가 지정한 간격으로 작업을 반복하세요:
- 형식: /loop <간격> "<프롬프트>"
- 간격: 5m (5분), 1h (1시간), 2d (2일), 또는 cron 표현식 (예: 0 * * * *)
- 기본값: 10m
- 동작: 매 간격마다 프롬프트를 실행
- 활성 실행 중 도착한 스케줄은 건너뛰기 (큐에 쌓이지 않음)
- 이 기능은 CLI의 --loop 플래그 또는 설정으로 구현됩니다`,
    source: "builtin",
  },
  ghidra: {
    name: "ghidra",
    path: "builtin:ghidra",
    description: "바이너리 분석 — Ghidra 29개 도구로 리버스 엔지니어링",
    content: `당신은 Ghidra 바이너리 분석 전문가입니다:
1. 먼저 GhidraInspect로 바이너리 전체 개요 파악
2. GhidraListProcedures로 함수 목록 확인
3. 의심스러운 함수는 GhidraDecompile로 C 코드로 변환
4. 문자열, 참조, 호출 그래프 등으로 맥락 파악
5. 취약점이나 로직을 분석하고 보고서 작성
6. 필요시 안전한 패치 코드도 함께 작성`,
    source: "builtin",
  },
};

export class SkillManager {
  private skills: Map<string, Skill>;
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = resolve(workspaceRoot);
    this.skills = new Map();

    // 빌트인 스킬 로드
    for (const [name, skill] of Object.entries(BUILTIN_SKILLS)) {
      this.skills.set(name, skill);
    }

    // 사용자 정의 스킬 로드
    this.loadUserSkills();
  }

  private parseFrontmatter(content: string): { description?: string; triggers?: string[] } {
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!fmMatch) return {};
    const fm = fmMatch[1];
    let description: string | undefined;
    const descMatch = fm.match(/^description:\s*(.+)$/m);
    if (descMatch) {
      description = descMatch[1].trim().replace(/^["']|["']$/g, "");
    }
    let triggers: string[] | undefined;
    const trigMatch = fm.match(/^triggers:\s*(\[.*?\])/ms);
    if (trigMatch) {
      try {
        triggers = JSON.parse(trigMatch[1]);
      } catch {
        const inner = trigMatch[1].slice(1, -1);
        triggers = inner
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      }
    }
    return { description, triggers };
  }

  private loadUserSkills(): void {
    // 검색 경로 (Muse Code와 Codex 모두 지원)
    // Muse Code: .codex/skills, .agents/skills, .claude/skills
    // Codex:     .codex/skills, .agents/skills
    const searchDirs = [
      join(this.workspaceRoot, ".arena", "skills"),
      join(this.workspaceRoot, ".codex", "skills"),
      join(this.workspaceRoot, ".agents", "skills"),
      join(this.workspaceRoot, ".claude", "skills"),
      join(this.workspaceRoot, ".muse", "skills"), // Muse 하위 호환
      join(process.env.HOME || "", ".arena", "skills"),
      join(process.env.HOME || "", ".codex", "skills"),
    ];

    for (const dir of searchDirs) {
      if (!existsSync(dir)) continue;
      try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
          const entryPath = join(dir, entry);
          try {
            const stat = statSync(entryPath);
            let skillFile: string;
            let skillName: string;

            if (stat.isDirectory()) {
              // 폴더형 스킬: dirname/SKILL.md
              skillName = basename(entry);
              const skillMd = join(entryPath, "SKILL.md");
              if (!existsSync(skillMd)) continue;
              skillFile = skillMd;
            } else if (entry.endsWith(".md")) {
              skillName = basename(entry, ".md");
              skillFile = entryPath;
            } else {
              continue;
            }

            const content = readFileSync(skillFile, "utf-8");
            const fm = this.parseFrontmatter(content);
            // description 우선: frontmatter > body 첫 유의미 라인 > fallback
            let description: string;
            if (fm.description) {
              description = fm.description.slice(0, 200);
            } else {
              const body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");
              const lines = body.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
              description = lines[0]?.slice(0, 200) || `사용자 정의 스킬: ${skillName}`;
            }

            this.skills.set(skillName.toLowerCase(), {
              name: skillName.toLowerCase(),
              path: skillFile,
              description,
              content,
              source: dir,
              triggers: fm.triggers,
            });
          } catch {}
        }
      } catch {}
    }
  }

  list(): Skill[] {
    return Array.from(this.skills.values());
  }

  get(name: string): Skill | undefined {
    const clean = name.replace(/^\//, "").toLowerCase();
    return this.skills.get(clean);
  }

  has(name: string): boolean {
    return this.skills.has(name.replace(/^\//, "").toLowerCase());
  }

  // 스킬을 시스템 프롬프트에 주입할 텍스트로 변환
  formatForPrompt(skillName: string): string | null {
    const skill = this.get(skillName);
    if (!skill) return null;
    return `\n\n## Active Skill: /${skill.name}\n**${skill.description}**\n\n${skill.content}\n`;
  }

  // 모든 스킬의 짧은 설명 (컨텍스트에 포함)
  allDescriptions(): string {
    if (this.skills.size === 0) return "";
    const lines = Array.from(this.skills.values())
      .map((s) => `- /${s.name}: ${s.description}`)
      .join("\n");
    return `\nAvailable skills (use /<name> to activate):\n${lines}`;
  }

  // 메시지에서 /command 파싱 — "/" 접두사 + 자연어 트리거 모두 지원
  parseCommand(message: string): { skill: string; args: string } | null {
    const trimmed = message.trim();
    if (!trimmed) return null;

    // 1) 명시적 슬래시 커맨드: /skill [args]
    if (trimmed.startsWith("/")) {
      const spaceIdx = trimmed.indexOf(" ");
      if (spaceIdx === -1) {
        const name = trimmed.slice(1).toLowerCase();
        if (this.has(name)) return { skill: name, args: "" };
        return null;
      }
      const name = trimmed.slice(1, spaceIdx).toLowerCase();
      const args = trimmed.slice(spaceIdx + 1).trim();
      if (this.has(name)) return { skill: name, args };
      return null;
    }

    // 2) 자연어 트리거 라우팅 — triggers: ["퀴리","curie"...] 부분일치 (대소문자 무시, 최장 트리거 우선)
    const lower = trimmed.toLowerCase();
    let best: { skill: string; trigger: string } | null = null;
    for (const skill of this.skills.values()) {
      if (!skill.triggers?.length) continue;
      for (const trig of skill.triggers) {
        const tLower = trig.toLowerCase();
        if (!tLower) continue;
        if (lower.includes(tLower)) {
          if (!best || trig.length > best.trigger.length) {
            best = { skill: skill.name, trigger: trig };
          }
        }
      }
    }
    if (best) return { skill: best.skill, args: trimmed };
    return null;
  }

  // Codex 스타일 skills import (muse skills import --from claude)
  static importFromClaude(workspaceRoot: string): { imported: number; message: string } {
    const claudeSkillsDir = join(resolve(workspaceRoot), ".claude", "skills");
    const arenaSkillsDir = join(resolve(workspaceRoot), ".arena", "skills");

    if (!existsSync(claudeSkillsDir)) {
      return { imported: 0, message: "Claude 스킬 디렉토리가 없습니다: .claude/skills" };
    }

    try {
      const entries = readdirSync(claudeSkillsDir);
      let count = 0;
      const { mkdirSync, copyFileSync } = require("node:fs") as typeof import("node:fs");
      mkdirSync(arenaSkillsDir, { recursive: true });

      for (const entry of entries) {
        const src = join(claudeSkillsDir, entry);
        const dest = join(arenaSkillsDir, entry);
        if (!existsSync(dest)) {
          try {
            const { cpSync } = require("node:fs") as typeof import("node:fs");
            cpSync(src, dest, { recursive: true });
            count++;
          } catch {}
        }
      }

      return { imported: count, message: `${count}개 스킬을 .claude/skills에서 .arena/skills로 가져왔습니다` };
    } catch (e: unknown) {
      return { imported: 0, message: `import 실패: ${e instanceof Error ? e.message : String(e)}` };
    }
  }
}
