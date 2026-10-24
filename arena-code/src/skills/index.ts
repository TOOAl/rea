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
  youtube: {
    name: "youtube",
    path: "builtin:youtube",
    description: "유튜브 자동화 — 기사/주제 → 8분 대본·제목·설명란·태그·썸네일·자막·수익화 체크까지 원클릭 (1층 입력 연동)",
    content: `당신은 유튜브 수익화 자동화 PD입니다. 1층 기사/주제 입력을 받아 8분 팩트체크 영상을 완성하세요. REA 5층 파이프라인을 따르세요.

## 0. 입력 확인 (1층 — 가장 먼저)
- CLI: --article / --article-file / --article-url / --topic / --article-title 로 들어온 1층 입력이 있으면 최우선 사용
- 대화: /article, /topic, /article-url, /article-file 로 들어온 입력 사용
- Brains 도구 호출 시 반드시 article/topic/articleUrl/articleTitle 파라미터로 함께 전달
- 입력이 없으면 사용자에게 "기사나 주제를 입력해주세요: /article <본문> 또는 /topic <주제>" 요청

## 1. REA 5층 실행 순서
1층 필터: 기사에서 사실(수치·날짜·출처) / 해석(원인 분석) / 추측(전망) 3색 분류. "모른다"는 추측 칸에 명시. 금융 단정어(붕괴·폭락 D-1·전액매수) 차단
2층 설계: 목표 고정(클라우제비츠) · 정보품질(손자) · 용량/병목(나폴레옹) · 중단기준(TPS) · OODA 5단계 구조로 대본 설계
3층 창의: HISTORY 36중 1명 관점으로 비교 스토리 1개 추가 (예: 1929 대공황 브로커론 vs 오늘 신용)
3.5층 게이트: 금융·선정성 8인 심사 — 단정·패닉·투자권유 표현 있으면 반려 후 재작성
4층 토론: 8인 천재가 사실표/체크리스트/대안 3개 검증
5층 합의: 최종 8분 대본·제목·설명란·태그·썸네일 프롬프트 합의

## 2. 출력물 7종 (반드시 모두 생성 — 파일로 저장)
1) 대본: docs/youtube_자동생성/[주제]_대본_수익화.md — 타임스탬프 5부(0:00 훅, 0:25 사실, 2:00 해석주의, 3:30 5단계, 7:20 클로징+고지) + 나레이션/화면/자막 원칙
2) 제목 3안: [팩트체크] 형태, 자극어 금지, " | 투자 권유 아님" 꼬리표 포함
3) 설명란: docs/youtube_자동생성/[주제]_설명란.txt — 첫 줄 "본 영상은 교육용 정보이며 투자 조언이 아닙니다" + 원문 링크 + 타임스탬프 7개 + 해시태그 5개 이하
4) 태그: 팩트체크, 금융교육 등 5개 이내 (폭락·붕괴 등 자극 태그 금지)
5) 썸네일 프롬프트: docs/images/[주제]_thumbnail_prompt.md — 텍스트-프리 일러스트 배경 + SVG 오버레이 합성 지침, 오타 검증 규칙
6) 자막: docs/youtube_자동생성/[주제]_자막.srt — 45 cues, 모든 수치에 [출처: ...] 병기
7) 수익화 체크리스트: docs/youtube_자동생성/[주제]_수익화_체크리스트.md — 재사용 15% 이하, 직접제작 70% 이상, 투자권유 고지 3곳 체크

## 3. 수익화·정책 가드레일 (절대 위반 금지)
- 썸네일/제목에 "붕괴·폭락·D-1·전액매도·무조건" 금지 → "팩트체크·5단계 확인법" 사용
- 가격 단정 금지: "내일 5000간다" → "내일 방향은 추측" 명시
- 투자 권유 아님 고지 3곳: 썸네일 배지 + 영상 하단 + 설명란 첫 줄 + 대본 클로징
- 원문 인용 15% 이하, 직접 제작 그래프/체크리스트 70% 이상 — SVG 차트는 dataViz.ts로 직접 생성
- 자막 파일(.srt) 반드시 업로드 — 자동자막 끄기

## 4. 실행 예시
- 사용자가 "/youtube 코스피 급락" 또는 "--topic 코스피 급락 --article <기사>"로 호출하면:
  1) Brains(task="유튜브 대본 구조 잡기", topic="코스피 급락", article="기사...")로 1층 정제
  2) 5층 합의로 대본 7종 생성
  3) docs/youtube_자동생성/ 폴더에 파일 저장 + 사용자에게 경로 요약
- 참고 템플릿: docs/youtube_코스피_급락_대본_수익화.md, docs/youtube_1929대공황_3일전_대본_수익화.md, docs/youtube_수익화_체크리스트.md, docs/youtube_팩트체크_대본.md

## 5. 완료 보고 형식
- 1층 입력 요약 (기사 길이·키워드·사실비중)
- 생성된 7종 파일 경로 목록
- 수익화 체크 결과 (재사용/선정성/투자권유 3항)
- 다음 영상 제안 1개 (시리즈화)

트igger: 사용자가 기사/주제로 유튜브 영상을 원하면 즉시 이 스킬을 실행하세요.`,
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
