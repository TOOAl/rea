/**
 * Visual Inspection Brains — 4개의 눈을 가진 검수관 두뇌 2종
 * Manus VerificationAgent 패턴: 생성자(Executor)와 검수자(Verifier)를 분리해 자기확증 편향 감소
 * - GeometryVerifierBrain: 경계 초과를 잡는 눈
 * - TypographyVerifierBrain: 폰트 깨짐·대비·a11y를 잡는 눈
 */
import { Brain, BrainInput, BrainOutput, BrainFeedback, BrainRole, BrainLayer } from "./types.js";
import { BrainMemory } from "./memory.js";
import { inspectStatic } from "../visual/inspectionTeam.js";

function mk(input: BrainInput, brain: Brain, idea: string, confidence: number, tags: string[]): BrainOutput {
  return { brainId: brain.id, role: brain.role, layer: brain.layer, idea, confidence, tags, costMs: 0 };
}

abstract class BaseInspector implements Brain {
  abstract id: string; abstract role: BrainRole; abstract layer: BrainLayer;
  abstract name: string; abstract description: string;
  version = "2.0.0";
  protected learned: string[] = [];
  async learn(f: BrainFeedback): Promise<void> { if (f.lesson) this.learned.push(f.lesson); }
  abstract think(input: BrainInput): Promise<BrainOutput>;
}

export class GeometryVerifierBrain extends BaseInspector {
  id = "inspector-geometry"; role = "error" as const; layer = 1 as const;
  name = "경계 검수관 — Ghidra의 눈";
  description = "모든 그림의 경계 상자가 부모 박스를 넘었는지 본다. 넘으면 FAIL, 고칠 좌표까지 알려준다 (Ghidra P-Code 패턴).";
  async think(input: BrainInput): Promise<BrainOutput> {
    // input.task나 context에 HTML이 포함된 경우, 또는 priorOutputs에서 HTML 힌트 추출
    const htmlCandidate = [input.task, input.context, ...input.priorOutputs.map(o => o.idea)].join("\n");
    // HTML 태그가 없으면 일반 모드로 동작
    if (!htmlCandidate.includes("<svg") && !htmlCandidate.includes("<html")) {
      return mk(input, this,
        `📐 경계 검수관 대기 — HTML/SVG 입력이 없어 정적 검사를 건너뜀.\n` +
        `검사법: HTML에 <svg>가 있으면 내부 ellipse/circle/rect의 cx+rx 가 부모 rect width를 넘는 지를 1px 단위로 검사.\n` +
        `과거 실패 교훈: 12살 설명서 그림 8 ellipse rx52가 width240을 7px 초과 — 사용자가 직접 캡처해 제보할 때까지 몰랐음.\n` +
        `selfCheck: 내 답변은 4-Eye 중 geometry만 — typography는 동료에게 맡긴다.`, 0.82, ["geometry", "overflow", "eye"]);
    }
    const result = inspectStatic(htmlCandidate);
    const geo = result.eyes.find(e => e.eye === "geometry")!;
    const icon = geo.grade === "PASS" ? "✅" : geo.grade === "WARN" ? "⚠️" : "🚫";
    return mk(input, this,
      `${icon} 경계 검수 결과 — ${geo.grade} ${geo.score}점\n` +
      `검사 그림: ${ (geo as any).figCount ?? "?"}개 중 ${ (geo as any).failCount ?? geo.issues.length}개 FAIL\n` +
      (geo.issues.length ? `이슈:\n` + geo.issues.map(i => `  • ${i}`).join("\n") + `\n` : "그림 경계 모두 통과 — 노란 박스 밖으로 삐져나온 요소 없음\n") +
      (geo.suggestion ? `처방: ${geo.suggestion}\n` : "") +
      `selfCheck: 이 판정은 ${geo.issues.length ? "FAIL — 사람에게 공개 전 수정 필요 (1929 게이트)" : "PASS — 공개 가능"}`, geo.grade === "PASS" ? 0.93 : 0.88, ["geometry", `grade-${geo.grade}`, "eye"]);
  }
}

export class TypographyVerifierBrain extends BaseInspector {
  id = "inspector-typography"; role = "error" as const; layer = 1 as const;
  name = "서체·대비 검수관 — Claude의 눈";
  description = "한글 폰트가 빠졌는지(□), 대비가 WCAG에 못 미치는지 본다. 외부 폰트 의존은 FAIL로 본다 (Claude AXTree 패턴).";
  async think(input: BrainInput): Promise<BrainOutput> {
    const htmlCandidate = [input.task, input.context, ...input.priorOutputs.map(o => o.idea)].join("\n");
    if (!htmlCandidate.includes("<html") && !htmlCandidate.includes("<svg") && htmlCandidate.length < 200) {
      return mk(input, this,
        `🔤 서체 검수관 대기 — HTML 입력 없음.\n` +
        `검사법: @font-face base64 임베딩 여부, Google Fonts 외부 의존 경고, WCAG 4.5:1 대비 검사.\n` +
        `과거 실패: 폰트 없이 PDF 생성 → 모든 한글이 □로 깨짐. document.fonts.check('가')가 false면 즉시 FAIL.\n` +
        `selfCheck: 이 판정은 typography만 — geometry는 동료가 담당.`, 0.82, ["typography", "eye"]);
    }
    const result = inspectStatic(htmlCandidate);
    const typo = result.eyes.find(e => e.eye === "typography")!;
    const a11y = result.eyes.find(e => e.eye === "accessibility")!;
    const icon = typo.grade === "PASS" && a11y.grade === "PASS" ? "✅" : typo.grade === "FAIL" || a11y.grade === "FAIL" ? "🚫" : "⚠️";
    return mk(input, this,
      `${icon} 서체·대비 검수 — typography:${typo.grade} ${typo.score}점 / a11y:${a11y.grade} ${a11y.score}점\n` +
      (typo.issues.length ? `서체 이슈:\n` + typo.issues.map(i => `  • ${i}`).join("\n") + `\n` : "한글 폰트 통과 — base64 임베딩 확인\n") +
      (a11y.issues.length ? `대비 이슈:\n` + a11y.issues.map(i => `  • ${i}`).join("\n") + `\n` : "WCAG 대비 통과\n") +
      (typo.suggestion ? `처방: ${typo.suggestion}\n` : "") +
      `selfCheck: ${typo.grade === "FAIL" || a11y.grade === "FAIL" ? "FAIL — 수정 전 사람 공개 금지" : "PASS — 공개 가능"}`, typo.grade === "PASS" && a11y.grade === "PASS" ? 0.93 : 0.88, ["typography", "accessibility", `grade-${typo.grade}`, "eye"]);
  }
}
