/**
 * Guard — Phase H5 (GPT-6 Astra inspiration)
 * 환각/허위 생성 탐지: Harness² 원본은 검증 3원칙만 있었지만,
 * GPT-6 Astra는 환각 92%→51%로 줄였다. 우리는 harness 레벨에서
 * 가드 플러그인으로 보완한다.
 *
 * 검사는 결정적 휴리스틱 (LLM 없이) — 나중에 LLM judge로 고도화 가능
 *
 * 12살 설명: 숙제 검수 선생님!
 * 새로 만든 레시피에 "마법 가루" 같은 없는 재료를 썼는지 확인하는 것
 */

import type { Tree } from "./harness.js";
import { ARENA_SURFACE, skillNames } from "./harness.js";

export interface GuardReport {
  ok: boolean;
  issues: string[];
  warnings: string[];
  checkedAt: string;
}

// 검사 규칙
const HALLUCINATION_PATTERNS: Array<{ re: RegExp; msg: string; severity: "issue" | "warning" }> = [
  { re: /\bTODO\b|\bFIXME\b|\bTBD\b/, msg: "placeholder TODO/FIXME/TBD가 harness에 남음 — 미완성", severity: "issue" },
  { re: /\{\{|\}\}/, msg: "Jinja 템플릿 괄호 {{ }} 잔존 — 파싱 파괴", severity: "issue" },
  { re: /lorem ipsum/i, msg: "lorem ipsum 더미 텍스트", severity: "issue" },
  // 존재하지 않는 스크립트 참조는 harness.ts validate가 이미 잡지만, 가드에서도 이중 체크
  { re: /python3?\s+scripts\/[\w.-]+\.py/, msg: "scripts/ 참조 — 실물 존재 여부 별도 검증 필요", severity: "warning" },
  { re: /https?:\/\/[^\s]+/g, msg: "URL 포함 — 외부 참조는 검증 필요 (나중에)", severity: "warning" },
];

const ALWAYS_ON_BUDGET_RATIO = 0.8; // always-on이 예산의 80% 넘으면 경고

export function guardHarness(tree: Tree): GuardReport {
  const issues: string[] = [];
  const warnings: string[] = [];
  const allText = Object.values(tree).join("\n\n");

  for (const { re, msg, severity } of HALLUCINATION_PATTERNS) {
    // g 플래그 있으면 lastIndex 리셋 필요
    const testRe = new RegExp(re.source, re.flags.replace("g", ""));
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags);
    if (testRe.test(allText)) {
      // URL 같은 경우는 개수 세기
      if (re.source.includes("https?")) {
        const matches = allText.match(globalRe);
        if (matches && matches.length > 2) {
          (severity === "issue" ? issues : warnings).push(`${msg}: ${matches.length}개 발견 — ${matches.slice(0,2).join(", ")}...`);
        } else if (matches) {
          warnings.push(`${msg}: ${matches[0]}`);
        }
        continue;
      }
      (severity === "issue" ? issues : warnings).push(msg);
    }
  }

  // skill 검증: SKILL.md에 frontmatter name이 없거나 description이 너무 짧으면 경고
  for (const name of skillNames(ARENA_SURFACE, tree)) {
    const content = tree[`skills/${name}/SKILL.md`] ?? "";
    if (!/^name:\s*\S+/m.test(content)) warnings.push(`skill "${name}"에 frontmatter name 없음`);
    const descM = /^description:\s*(.+)$/m.exec(content);
    if (!descM || descM[1].trim().length < 10) warnings.push(`skill "${name}" description이 너무 짧거나 없음`);
    if (content.length < 50) warnings.push(`skill "${name}" 본문이 너무 짧음 (${content.length} chars)`);
  }

  // always-on 예산 체크
  const alwaysOnLen = ARENA_SURFACE.alwaysOn.map(a => tree[a] ?? "").join("\n\n").length;
  if (alwaysOnLen > ARENA_SURFACE.alwaysOnMax * ALWAYS_ON_BUDGET_RATIO) {
    warnings.push(`always-on 텍스트가 예산의 ${Math.round(alwaysOnLen / ARENA_SURFACE.alwaysOnMax * 100)}% 사용 (${alwaysOnLen}/${ARENA_SURFACE.alwaysOnMax}) — skill로 분리 고려`);
  }
  if (alwaysOnLen > ARENA_SURFACE.alwaysOnMax) {
    issues.push(`always-on 초과: ${alwaysOnLen} > ${ARENA_SURFACE.alwaysOnMax} (매 토큰 비용 폭증)`);
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Guard + 경험 저장 연동용 — harness2 실패 연구와 유사하게
 * guard가 실패하면 대체 전략 힌트 생성
 */
export function guardHint(report: GuardReport): string | null {
  if (report.ok) return null;
  if (report.issues.some(i => i.includes("TODO"))) return "shrink-always-on";
  if (report.issues.some(i => i.includes("Jinja"))) return "shrink-always-on";
  if (report.issues.some(i => i.includes("always-on 초과"))) return "shrink-always-on";
  return "single-candidate-try";
}

