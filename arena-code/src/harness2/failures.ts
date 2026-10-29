/**
 * Failure Store & Research — H4 확장 (사용자 요청)
 * "합친 레시피가 고장 나면 버리고 원래 레시피 유지 후 실패 사례에 저장 + 어떻게 합칠 수 있는지 연구"
 *
 * 설계:
 *   실패 = compose()가 검증 실패로 base로 폴백한 순간
 *   저장 = .arena/harness2/failures.jsonl 에 append (재현 가능)
 *   연구 = 실패 패턴을 분석해 다음 합치기에 쓸 대체 전략을 제안
 *
 * 12살 설명: 요리를 망쳤으면 그냥 버리지 말고
 * "왜 망했는지"를 노트에 적고, 다음엔 "불을 줄여볼까? 물을 더 넣어볼까?"를 연구하는 것!
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import type { Tree, DiffSummary } from "./harness.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FailureRecord {
  id: string;                 // f_ + timestamp + random
  taskId: string;
  timestamp: string;          // ISO
  k: number;
  mode: "parallel" | "sequential";
  step: number;
  baseKeys: string[];         // base harness 파일 목록
  candidateLabels: string[];
  candidateDiffs: Array<{ label: string; added: string[]; removed: string[]; modified: string[] }>;
  errors: string[];           // 검증 에러 원문
  fellBack: string[];
  finalAttemptKeys?: string[]; // 최종 합성 시도에 들어간 파일 목록
  strategy: string;           // 어떤 합성 전략을 썼는지 (예: "merge-all", "single-candidate")
  research?: ResearchResult;  // 연구 결과 (나중에 채워짐)
}

export interface ResearchResult {
  analyzedAt: string;
  rootCause: string;          // 근본 원인 (예: "skill-trigger-missing", "always-on-overflow", "script-missing", "conflict")
  pattern: string;            // 패턴 설명
  alternatives: AlternativeStrategy[];
  recommended: string | null; // 추천 전략 ID
}

export interface AlternativeStrategy {
  id: string;                 // 예: "single-inv-only", "single-dom-only", "remove-conflict", "shrink-always-on"
  description: string;
  why: string;                // 왜 이 전략이 통할 것 같은지
  confidence: number;         // 0~1
  previewDiff?: DiffSummary;  // 미리보기 (있으면)
}

// ---------------------------------------------------------------------------
// FailureStore — .arena/harness2/failures.jsonl
// ---------------------------------------------------------------------------

export class FailureStore {
  private file: string;

  constructor(rootDir?: string) {
    const base = resolve(rootDir ?? join(process.cwd(), ".arena", "harness2"));
    this.file = join(base, "failures.jsonl");
  }

  get path(): string { return this.file; }

  /** 한 건 저장 (append) */
  save(record: FailureRecord): void {
    mkdirSync(dirname(this.file), { recursive: true });
    appendFileSync(this.file, JSON.stringify(record) + "\n", "utf-8");
  }

  /** 전체 로드 */
  loadAll(): FailureRecord[] {
    if (!existsSync(this.file)) return [];
    const lines = readFileSync(this.file, "utf-8").split("\n").filter(Boolean);
    const out: FailureRecord[] = [];
    for (const line of lines) {
      try { out.push(JSON.parse(line)); } catch {}
    }
    return out;
  }

  /** taskId별 필터 */
  loadByTask(taskId: string): FailureRecord[] {
    return this.loadAll().filter(r => r.taskId === taskId);
  }

  /** 전체 비우기 (테스트용) */
  clear(): void {
    if (existsSync(this.file)) writeFileSync(this.file, "", "utf-8");
  }

  count(): number {
    return this.loadAll().length;
  }
}

// ---------------------------------------------------------------------------
// Research Engine — 실패를 분석해 다음 합치기 전략을 제안
// ---------------------------------------------------------------------------

/**
 * 실패 패턴 분류 (휴리스틱, 나중에 LLM으로 고도화 가능)
 * 원본 Harness²는 실패 시 단순 폴백만 했지만, 우리는 연구 단계를 추가
 */
export function analyzeFailure(record: FailureRecord): ResearchResult {
  const errorsJoined = record.errors.join(" | ").toLowerCase();
  let rootCause = "unknown";
  let pattern = record.errors[0] ?? "unknown error";

  if (errorsJoined.includes("trigger line") || errorsJoined.includes("skill") && errorsJoined.includes("trigger")) {
    rootCause = "skill-trigger-missing";
    pattern = "새 스킬이 생겼는데 AGENTS.md에 트리거 문장이 빠짐 — 검증이 자동 보정 전이라 실패했을 가능성";
  } else if (errorsJoined.includes("{{") || errorsJoined.includes("jinja")) {
    rootCause = "always-on-overflow";
    pattern = "always-on 텍스트에 템플릿 괄호({{)가 들어감 — 한 번에 너무 많은 걸 넣은 것";
  } else if (errorsJoined.includes("script") && errorsJoined.includes("not found")) {
    rootCause = "script-missing";
    pattern = "참조한 scripts/<file>.py가 제안 안에 없음 — 스킬이 헬퍼 없이 참조만 함";
  } else if (errorsJoined.includes("conflict") || record.candidateLabels.length >= 2) {
    rootCause = "merge-conflict";
    pattern = `두 후보(${record.candidateLabels.join(", ")})가 같은 파일을 다르게 고침 — 충돌`;
  } else if (errorsJoined.includes("compose validate failed")) {
    rootCause = "compose-overflow";
    pattern = "합성 결과가 검증 실패 — 두 후보를 합치니 규칙 위반이 생김";
  } else if (errorsJoined.includes("subagent")) {
    rootCause = "subagent-not-allowed";
    pattern = "서브에이전트를 썼는데 SurfaceSpec에서 허용 안 함";
  }

  const alternatives = suggestAlternatives(record, rootCause);

  // 가장 확신 높은 전략을 추천
  let recommended: string | null = null;
  if (alternatives.length > 0) {
    const best = alternatives.reduce((a, b) => a.confidence > b.confidence ? a : b);
    recommended = best.id;
  }

  return {
    analyzedAt: new Date().toISOString(),
    rootCause,
    pattern,
    alternatives,
    recommended,
  };
}

/** 대체 전략 제안 (MVP 규칙 기반 — 추후 LLM 개선 가능) */
function suggestAlternatives(record: FailureRecord, rootCause: string): AlternativeStrategy[] {
  const out: AlternativeStrategy[] = [];

  switch (rootCause) {
    case "skill-trigger-missing":
      out.push({
        id: "single-inv-only",
        description: "invariant 후보만 합치기 (skill 없이 guardrails만)",
        why: "trigger 누락은 대개 domain 스킬에서 생김 — inv만 쓰면 안전",
        confidence: 0.7,
      });
      out.push({
        id: "autotrigger-retry",
        description: "autotrigger 보정 후 재검증",
        why: "현재는 compose에서 이미 autotrigger하지만, candidate 단계에서도 보정하면 통과 가능",
        confidence: 0.8,
      });
      break;

    case "always-on-overflow":
      out.push({
        id: "shrink-always-on",
        description: "always-on 대신 skill로 옮기기",
        why: "always-on은 매 토큰 비용이 큼 — 길면 skill로 분리하는 게 Harness² 원칙",
        confidence: 0.75,
      });
      break;

    case "script-missing":
      out.push({
        id: "single-dom-only",
        description: "domain 후보만 합치기 (script가 포함된 쪽)",
        why: "한 후보에만 script가 있고 다른 후보에 없으면 합칠 때 빠짐 — dom만 쓰면 완전",
        confidence: 0.65,
      });
      out.push({
        id: "drop-script-ref",
        description: "script 참조 줄을 지우고 스킬 본문만 합치기",
        why: "스크립트 자체보다 스킬 지식이 더 중요할 수 있음",
        confidence: 0.5,
      });
      break;

    case "merge-conflict":
    case "compose-overflow":
      out.push({
        id: "single-inv-only",
        description: "invariant 후보만 단독 적용",
        why: "두 후보가 같은 파일을 충돌 — 하나씩 따로 적용하면 충돌 없음",
        confidence: 0.7,
      });
      out.push({
        id: "single-dom-only",
        description: "domain 후보만 단독 적용",
        why: "도메인 특화 지식이 더 중요할 수 있음 — inv는 다음 기회에",
        confidence: 0.65,
      });
      out.push({
        id: "sequential-try",
        description: "parallel 대신 sequential로 한 단계씩 적용",
        why: "한 번에 합치는 대신 한 후보씩 순차 적용하면 중간 검증을 넣을 수 있음",
        confidence: 0.6,
      });
      break;

    default:
      out.push({
        id: "single-candidate-try",
        description: "후보를 하나씩 단독으로 재시도",
        why: "원인 불명일 때는 가장 단순한 전략부터 — 하나씩 해보면 어디서 망가지는지 알 수 있음",
        confidence: 0.55,
      });
      out.push({
        id: "keep-base-and-log",
        description: "base 유지 + 다음 증거 트리에 실패 노트 포함",
        why: "강제로 합치기보다 실패를 증거로 남겨 다음 Propose가 더 나은 안을 내게 유도",
        confidence: 0.5,
      });
      break;
  }

  return out;
}

/**
 * 실패 기록 + 연구를 한 번에 — compose 실패 시 엔진이 호출
 * 실패를 저장하고 바로 연구 결과까지 채워서 다시 저장 (in-place 업데이트는 jsonl append로 누적)
 */
export function recordAndResearch(
  store: FailureStore,
  record: Omit<FailureRecord, "id" | "timestamp" | "research">,
): FailureRecord {
  const full: FailureRecord = {
    ...record,
    id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  const research = analyzeFailure(full);
  const withResearch: FailureRecord = { ...full, research };
  store.save(withResearch);
  return withResearch;
}

/**
 * 연구 결과 중 추천 전략으로 실제 하네스를 다시 합성해보는 시도
 * 성공하면 그 하네스를 반환, 실패하면 null
 */
export function tryAlternativeMerge(
  base: Tree,
  candidates: Array<{ label: string; harness: Tree }>,
  strategy: AlternativeStrategy,
): Tree | null {
  // MVP: 전략 ID에 따라 단순 규칙으로 재합성
  // 추후 LLM을 써서 더 정교한 재합성 가능
  switch (strategy.id) {
    case "single-inv-only": {
      const inv = candidates.find(c => c.label.includes("inv"));
      return inv ? { ...base, ...inv.harness } : null;
    }
    case "single-dom-only": {
      const dom = candidates.find(c => c.label.includes("dom"));
      return dom ? { ...base, ...dom.harness } : null;
    }
    case "shrink-always-on": {
      // always-on 변경을 되돌리고 skill만 남기기
      const filtered: Tree = {};
      for (const [k, v] of Object.entries(base)) filtered[k] = v;
      for (const c of candidates) {
        for (const [k, v] of Object.entries(c.harness)) {
          if (k.startsWith("skills/") || k.startsWith("sub_agents/") || k.startsWith("scripts/")) {
            filtered[k] = v;
          }
        }
      }
      return filtered;
    }
    case "sequential-try":
    case "single-candidate-try": {
      // 첫 번째 후보만 적용
      const first = candidates[0];
      return first ? { ...base, ...first.harness } : null;
    }
    default:
      return null;
  }
}
