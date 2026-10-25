/**
 * Coding Scaffold — 코딩 능력 4레이어 흡수 (P1, REA 6.5.0 + Ghidra 11.3)
 * 최고 에이전트의 Plan→Act→Verify 루프를 REA 하네스에 투명 흡수
 *
 * REA 원천: Claude Code 9-step queryLoop TodoWrite + Cursor Apply symbol diff + Cline plan/act + Aider lint→test→fix + Codex sandbox
 * Ghidra 원천: DEF/XREF/call graph로 수정 영향도 사전 계산 — P-Code IR
 * 12살 비유: 레고 설명서 — 1) 그림 보기(Plan) 2) 블록 조립(Act) 3) 흔들어보기(Verify)
 */
import type { Intent } from "./intent.js";
import type { StructuralContext } from "./structuralContext.js";

// ──────────────────────────────────────────────────────────
// 1) 계획 — TodoWrite 강제 (Claude Code: confidence<0.5 && ambiguities>=2 → 5개 강제)
// ──────────────────────────────────────────────────────────

export interface CodingTodo {
  id: number;
  title: string;           // 예: "src/auth/login.ts 생성"
  kind: "read" | "edit" | "write" | "verify" | "research";
  status: "pending" | "doing" | "done";
  verify?: string;         // 검증 명령 예: "npx tsc --noEmit"
}

const VERIFY_TODO: CodingTodo = {
  id: 99,
  title: "검증 — lint/typecheck/test로 수정이 깨뜨린 것 없는지 확인",
  kind: "verify",
  status: "pending",
  verify: "npx tsc --noEmit && npm test 2>&1 | head -80",
};

function deriveDomain(text: string): "crud" | "bugfix" | "refactor" | "feature" | "infra" | "generic" {
  if (/버그|fix|패치|무한루프|hotfix|오류 수정/i.test(text)) return "bugfix";
  if (/리팩토링|refactor|리팩터/i.test(text)) return "refactor";
  if (/CRUD|로그인|결제|게시판|API.*추가|엔드포인트/i.test(text)) return "crud";
  if (/추가해줘|구현해줘|만들어줘|새 기능|feature/i.test(text)) return "feature";
  if (/배포|Docker|CI|infra|설정|config/i.test(text)) return "infra";
  return "generic";
}

/**
 * 텍스트 + intent → Todo 3~7개 생성
 * 마지막은 항상 Verify. bugfix는 “재현→수정→검증” 3본주, feature는 “설계→구현→테스트” 흐름.
 */
export function deriveCodingPlan(text: string, intent: Intent, sc?: StructuralContext): CodingTodo[] {
  const d = deriveDomain(text);
  const hasFileHint = /src\/|\.ts|\.js|\.py|package\.json|README/i.test(text);
  const base: CodingTodo[] = [];

  // 1단계 공통: 구조 읽기 (L2 심볼 코딩 — Ghidra P-Code)
  base.push({ id: 1, title: `구조 파악 — ${sc ? "import 그래프+심볼 확인" : "코드 구조 읽기"}`, kind: "read", status: "pending" });

  if (d === "bugfix") {
    base.push({ id: 2, title: "재현 — 버그 조건을 테스트/로그로 재현", kind: "research", status: "pending" });
    base.push({ id: 3, title: "원인 추적 — 호출 그래프(xrefs)로 영향 범위 확인", kind: "read", status: "pending" });
    base.push({ id: 4, title: `수정 — ${hasFileHint ? "지정한 파일" : "관련 파일"} 최소 diff로 패치`, kind: "edit", status: "pending" });
  } else if (d === "refactor") {
    base.push({ id: 2, title: "영향도 분석 — SerenaFindSymbol/findReferencing 추적", kind: "research", status: "pending" });
    base.push({ id: 3, title: "리팩터 — 심볼 단위 수정 (파일 전체 덮어쓰기 금지)", kind: "edit", status: "pending" });
  } else if (d === "crud" || d === "feature") {
    base.push({ id: 2, title: `설계 — ${d === "crud" ? "스키마·API" : "기능"} 명세 3줄로 정리`, kind: "research", status: "pending" });
    base.push({ id: 3, title: `구현 — ${hasFileHint ? "대상 파일" : "새 파일"}에 최소 동작 코드 작성`, kind: "write", status: "pending" });
    base.push({ id: 4, title: "연결 — 기존 라우터/스토어와 배선", kind: "edit", status: "pending" });
  } else {
    base.push({ id: 2, title: "요구 분해 — 입력→출력→엣지 3줄 정리", kind: "research", status: "pending" });
    base.push({ id: 3, title: "구현 — 가장 작은 성공 코드", kind: "write", status: "pending" });
  }

  // 4레이어 증거 코딩: 검증 항상 포함 (Aider lint→test→fix)
  base.push({ ...VERIFY_TODO, id: base.length + 1 });

  // intent ambiguities가 2개 이상이면 verify 전 추가 검증 슬롯 — Claude Code TodoWrite 교착 방지
  if (intent.ambiguities.length >= 2) {
    base.splice(base.length - 1, 0, { id: base.length, title: `명세 확정 — 모호점 해소: ${intent.ambiguities.slice(0, 2).join(", ")}`, kind: "research", status: "pending" });
    // id 재정렬
    base.forEach((t, i) => (t.id = i + 1));
    base[base.length - 1].id = base.length;
  }

  return base.slice(0, 7); // Harness²: 작업은 3-5단계가 최적, 7개 초과는 예산 초과
}

/** Todo → 프롬프트 주입용 문자열 (Harness²: ALWAYS-ON은 짧게, 나머지는 Skill로) */
export function formatCodingPlanPrompt(todos: CodingTodo[]): string {
  const lines = todos.map((t) => `- [${t.status === "done" ? "x" : " "}] ${t.id}. ${t.title} (${t.kind}${t.verify ? ` → \`${t.verify}\`` : ""})`);
  return [
    "## Coding Scaffold — Plan→Act→Verify (Claude/Cursor/Aider 흡수, REA P-Code)",
    "반드시 TodoWrite로 위 계획을 먼저 만들고, 하나씩 done 처리하며 진행하세요. 검증(verify) 없이 종료 금지.",
    ...lines,
    "규칙: Write는 새 파일만, Edit는 정확한 old_string만, verify 실패 시 같은 Todo를 다시 edit으로 고치기.",
  ].join("\n");
}

/** StructuralContext + Plan → queryLoop 시스템 프롬프트 주입 블록 */
export function buildCodingScaffoldBlock(sc: StructuralContext | undefined, plan: CodingTodo[], intent: Intent): string {
  const scBlock = sc ? `- 구조: ${sc.packageInfo ?? "(no package)"} | import Top3: ${sc.importGraph.split("\n").slice(0, 3).join(" / ").slice(0, 220)}` : "- 구조: (REA_STRUCTURAL=1로 수집 필요)";
  return [
    formatCodingPlanPrompt(plan),
    scBlock,
    `의도: ${intent.kind} 확신 ${intent.confidence} — ${intent.evidence.slice(0, 2).join(" | ") || "코드 시그니처"}`,
    "Ghidra 원칙: 수정 전 xrefs 확인, 수정 후 CompareArtifacts로 diff 증명, provenanceTag로 출처 남기기.",
  ].join("\n");
}

// ──────────────────────────────────────────────────────────
// 2) 검증 — Verify 단계 (Aider/Cline: 실패가 곧 다음 입력)
// ──────────────────────────────────────────────────────────

export interface VerifyResult {
  ok: boolean;
  command: string;
  summary: string; // 성공/실패 1줄
  nextAction?: string; // 실패 시 다음 Todo 제안
}

export function evaluateVerifyOutput(output: string, command: string): VerifyResult {
  const lower = output.toLowerCase();
  const hasError = /error|failed|fail\b|ERR!|exception|TypeError|ReferenceError/i.test(output);
  const hasPass = /pass|ok\b|success|done\b|✓|✔/i.test(output);
  const truncated = output.length > 2000;

  if (!output.trim()) {
    return { ok: true, command, summary: "출력 없음 — 검증 명령이 조용히 성공한 것으로 간주 (Codex sandbox 원칙)", nextAction: undefined };
  }
  if (hasError && !hasPass) {
    // Cline/Aider: 실패 출력을 다음 Edit 입력으로 — truncated 표기 유지
    const firstLine = output.split("\n").find((l) => /error|fail|exception/i.test(l))?.trim().slice(0, 160) ?? output.slice(0, 160);
    return {
      ok: false,
      command,
      summary: `VERIFY FAIL — ${firstLine}${truncated ? " [TRUNCATED — 원문 확인 필요]" : ""}`,
      nextAction: `위 오류를 고치기 위해 Edit로 수정 후 다시 \`${command}\` 실행`,
    };
  }
  return { ok: true, command, summary: `VERIFY PASS — ${output.slice(0, 120).replace(/\n/g, " ")}${truncated ? " [TRUNCATED]" : ""}` };
}

/** intent가 코딩인지 — queryLoop에서 scaffolding 활성화 판단 (REA 6도구 보정 포함) */
export function isCodingIntent(intent: Intent, text: string): boolean {
  if (intent.kind === "implementation") return true;
  // 넓은 코딩 신호: chore지만 코드 포함이면 코딩으로 승격 (예: "기존 코드 리팩터링해줘"가 chore로 오분류되는 것 방지)
  if (intent.kind === "chore" && /(ts|js|py|코드|리팩|버그|테스트|src\/|Edit|Write)/i.test(text)) return true;
  if (intent.kind === "analysis" && /(decompile|P-Code|xrefs|Ghidra).*구현|리팩터.*분석/i.test(text)) return true;
  // 코드 블록 포함은 코딩
  if (/```/.test(text) || /src\//.test(text)) return true;
  return false;
}
