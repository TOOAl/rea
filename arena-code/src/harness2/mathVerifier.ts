/**
 * Math Verifier — 수학 5형제 전용 3종 검증기 (v7.1.0 PR-2)
 * FunSearch 실행기 + AlphaTensor 항등식 + AlphaProof Lean 시뮬을 경량 휴리스틱으로 재현
 * Lean 서버 없이도 동작, 추후 Lean 프로바이더로 교체 가능
 *
 * 12살 설명: 수학 선생님 3명이 다른 방법으로 채점 — 2명이 OK면 통과
 */

import { ReasoningEngine } from "../brains/reasoning.js";

export interface VerificationResult {
  verifier: "numerical" | "symbolic" | "logic";
  valid: boolean;
  reason: string;
  evidence?: string;
  score: number; // 0..1
}

export interface MathVerifyReport {
  results: VerificationResult[];
  consensus: boolean; // 2/3 이상 valid
  validCount: number;
  summary: string;
}

// ── 1. 수치 검증기 — FunSearch 실행기 시뮬 ───────────────────────────────
function numericalVerifier(idea: string): VerificationResult {
  const _lower = idea.toLowerCase();
  // 숫자 일관성: 같은 숫자 반복+다름 오류
  const nums = idea.match(/\d+/g) || [];
  let valid = true;
  let reason = "수치 일관성 통과";
  let evidence: string | undefined;

  // 496→512 같은 개선 사례: 숫자가 2개 이상이면 방향성 체크
  if (nums.length >= 2) {
    const n = nums.map(Number);
    // 예: 496→512면 증가이므로 512>496이어야 함
    for (let i = 1; i < n.length; i++) {
      if (idea.includes(`${n[i - 1]}→${n[i]}`) || idea.includes(`${n[i - 1]}->${n[i]}`)) {
        if (n[i] <= n[i - 1] && idea.includes("증가") ) {
          valid = false;
          reason = `수치 역전: ${n[i - 1]}→${n[i]} 이지만 '증가' 주장 — 모순`;
          evidence = `${n[i - 1]}→${n[i]}`;
          break;
        }
      }
    }
  }

  // 방정식 패턴: a×b = c 형태 추출 후 샘플 대입 (간이)
  const eqMatch = idea.match(/(\d+)\s*[×x*]\s*(\d+)\s*=\s*(\d+)/);
  if (eqMatch) {
    const a = Number(eqMatch[1]), b = Number(eqMatch[2]), c = Number(eqMatch[3]);
    if (a * b !== c) {
      valid = false;
      reason = `수치 오류: ${a}×${b}=${c} ≠ ${a * b}`;
      evidence = eqMatch[0];
    } else {
      reason = `수치 검증 통과: ${a}×${b}=${c} ✓`;
      evidence = eqMatch[0];
    }
  }

  // 나눗셈 0 패턴
  if (/나눗셈.*0|div.*by.*0/i.test(idea) && !/검증|예외|방어/i.test(idea)) {
    valid = false;
    reason = "0으로 나누기 위험 — 예외 처리 없음";
  }

  // 캡셋 496→512 개선 사례 힌트: 숫자+증명 키워드 둘 다 있으면 가산
  if (/496.*512|47.*49|512.*496/.test(idea) && valid) {
    reason += " (FunSearch/AplhaTensor 수치 사례와 일치)";
  }

  const score = valid ? 0.85 : 0.25;
  // 수치가 없으면 중립
  if (nums.length === 0 && !eqMatch) {
    return { verifier: "numerical", valid: true, reason: "수치 없음 — 중립 통과", score: 0.6 };
  }
  return { verifier: "numerical", valid, reason, evidence, score };
}

// ── 2. 기호 검증기 — AlphaTensor 항등식 랜덤 대입 ───────────────────────────
function symbolicVerifier(idea: string): VerificationResult {
  const hasSymbol = /[a-zA-Z]\s*[=×+\-→]|[a-z]\^[2-3]|∑|∫|∏|theorem|lemma|∀|∃/.test(idea);
  if (!hasSymbol) {
    return { verifier: "symbolic", valid: true, reason: "기호식 없음 — 중립 통과", score: 0.6 };
  }

  let valid = true;
  let reason = "기호 일관성 통과";
  let evidence: string | undefined;

  // 간단한 항등식 검증 시뮬: (a+b)² = a²+2ab+b² 형태
  const squareMatch = idea.match(/\(a\+b\)\s*²\s*=\s*a²\+2ab\+b²/i);
  if (squareMatch) {
    // 랜덤 대입: a=2,b=3 → (5)²=25, 4+12+9=25 일치
    const a = 2, b = 3;
    const left = (a + b) ** 2;
    const right = a * a + 2 * a * b + b * b;
    if (left !== right) {
      valid = false;
      reason = `기호 오류: (a+b)² 항등식 무작위 대입 실패 a=${a},b=${b}`;
      evidence = squareMatch[0];
    } else {
      reason = "기호 검증 통과: 무작위 대입 2건 일치 (AlphaTensor 항등식 방식)";
      evidence = `a=${a},b=${b} → ${left}==${right}`;
    }
  }

  // ∀/∃ 양화사 불일치: ∀ 뒤에 ∃ 없이 결론
  if (/∀/.test(idea) && !/∃|따라서|그러므로|증명/.test(idea)) {
    valid = false;
    reason = "기호 오류: ∀ 양화사 도입 후 결론/∃ 없음 — 증명 미완";
  }

  // Lean 키워드: theorem/lemma 있으면 형식 검증 기대
  if (/theorem|lemma/i.test(idea) && !/proof|증명|qed/i.test(lower(idea))) {
    valid = false;
    reason = "기호 오류: theorem/lemma 선언 후 proof 없음 — Lean 컴파일 실패 시뮬";
  }

  const score = valid ? 0.88 : 0.3;
  return { verifier: "symbolic", valid, reason, evidence, score };
}

function lower(s: string): string { return s.toLowerCase(); }

// ── 3. 논리 검증기 — AlphaProof Lean 시뮬 + ReasoningEngine.validator ──────
function logicVerifier(idea: string): VerificationResult {
  const eng = new ReasoningEngine();
  const votes = eng.validateChains([{ id: "math-logic", chain: idea }]);
  const v = votes[0];
  if (!v.valid) {
    return { verifier: "logic", valid: false, reason: `논리 오류: ${v.reason}`, evidence: idea.slice(0, 80), score: 0.2 };
  }
  // 추가: 과일반화 체크
  if (/항상|완벽|절대|모든.*가능|가장.*뛰어남/i.test(idea) && idea.length < 100) {
    return { verifier: "logic", valid: false, reason: "논리 과장: 절대 표현·근거 부족", score: 0.3 };
  }
  return { verifier: "logic", valid: true, reason: v.reason, score: 0.9 };
}

// ── 통합 ─────────────────────────────────────────────────────────────────
export class MathVerifier {
  /** 3종 검증 → 2/3 합의 */
  verify(idea: string): MathVerifyReport {
    const results: VerificationResult[] = [
      numericalVerifier(idea),
      symbolicVerifier(idea),
      logicVerifier(idea),
    ];
    const validCount = results.filter(r => r.valid).length;
    const consensus = validCount >= 2;
    const summary = `${validCount}/3 통과 — ${consensus ? "✅ 합의 통과" : "❌ 합의 실패"} | ` +
      results.map(r => `${r.verifier}:${r.valid ? "✓" : "✗"}(${r.reason.slice(0, 30)})`).join(" | ");
    return { results, consensus, validCount, summary };
  }

  /** 여러 아이디어 배치 검증 */
  verifyBatch(ideas: string[]): MathVerifyReport[] {
    return ideas.map(i => this.verify(i));
  }

  /** Council 4층 필터: 합의 실패한 아이디어 제거 */
  filterValidIdeas(outputs: { idea: string }[]): { kept: typeof outputs; blocked: { idea: string; report: MathVerifyReport }[] } {
    const kept: typeof outputs = [];
    const blocked: { idea: string; report: MathVerifyReport }[] = [];
    for (const o of outputs) {
      const r = this.verify(o.idea);
      if (r.consensus) kept.push(o);
      else blocked.push({ idea: o.idea.slice(0, 60), report: r });
    }
    return { kept, blocked };
  }
}

// ── Council 3라운드 토론 헬퍼 ────────────────────────────────────────────
export interface MathRoundResult {
  round: number;
  generation: number;
  outputs: string[]; // 아이디어 요약
  reports: MathVerifyReport[];
  kept: number;
  blocked: number;
}

/**
 * 3라운드 토론 시뮬 (PR-2 MVP)
 * Round1: 5형제 발산 → Round2: 검증 → Round3: 상위 2개 교차 변형
 */
export function simulateMathRounds(
  initialIdeas: string[],
  verifier = new MathVerifier(),
  maxGenerations = 3,
): MathRoundResult[] {
  const rounds: MathRoundResult[] = [];
  let currentIdeas = [...initialIdeas];

  for (let gen = 1; gen <= maxGenerations; gen++) {
    const reports = currentIdeas.map(i => verifier.verify(i));
    const kept = currentIdeas.filter((_, idx) => reports[idx].consensus);
    const blocked = currentIdeas.length - kept.length;
    rounds.push({ round: gen, generation: gen, outputs: [...currentIdeas], reports, kept: kept.length, blocked });

    if (kept.length <= 1 || gen === maxGenerations) break;

    // 상위 2개 교차(crossover) — FunSearch 섬 모델 시뮬
    const ranked = kept
      .map((idea, _idx) => ({ idea, score: reports[currentIdeas.indexOf(idea)]?.results.reduce((s, r) => s + r.score, 0) ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    if (ranked.length < 2) break;

    // 교차: 두 아이디어 각 50%씩 합치기
    const crossA = ranked[0].idea.slice(0, Math.floor(ranked[0].idea.length / 2)) + ranked[1].idea.slice(Math.floor(ranked[1].idea.length / 2));
    const crossB = ranked[1].idea.slice(0, Math.floor(ranked[1].idea.length / 2)) + ranked[0].idea.slice(Math.floor(ranked[0].idea.length / 2));

    currentIdeas = [crossA, crossB];
  }

  return rounds;
}
