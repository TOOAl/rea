/**
 * TimeCapsule — 정보 차단 추론 실험 하네스 (코로나 발생 시점)
 * 12살 설명: 2019년 12월 31일까지의 책만 보고, 2020년 이후를 추측하는 시험 — 답안지에 미래 정보를 쓰면 감점
 *
 * 설계: Ghidra P-Code처럼 시간도 데이터로 추상화 — 모든 증거에 capturedAt을 강제, cutoff 이후는 하네스가 차단
 * REA 흡수: EvidenceLedger truncated 패턴 재사용 + RAG metadata date 필터 + 추론 투명성(ReasoningLedger)
 */

export const COVID_CUTOFF = "2019-12-31";
export const COVID_CUTOFF_TS = new Date(COVID_CUTOFF + "T23:59:59Z").getTime();

// 차단 이후 정보 누출 탐지용 금지 키워드 — 모델이 추론이 아니라 기억으로 답했는지 검증
// 실제 벤치마크에서는 이 목록을 더 엄격히 관리하며, LLM judge로도 2차 검증 가능
export const POST_CUTOFF_LEAK_PATTERNS: Array<{ re: RegExp; label: string; severity: "fail" | "warn" }> = [
  // 고유 명사 — 2020년 이후에야 생긴 것들
  { re: /오미크론|Omicron|BA\.\d|델타 변이.*2021/i, label: "오미크론/델타 변이 명칭은 2021년 이후 명명 — cutoff 위반", severity: "fail" },
  { re: /화이자.*2가 백신|모더나.*2가/i, label: "2가 백신은 2022년 — cutoff 위반", severity: "fail" },
  { re: /2020년.*봉쇄|2021년.*백신 접종률|2022년.*위드코로나/i, label: "구체적 연도별 사실 언급 — 미래 정보 유입 의심", severity: "fail" },
  { re: /COVID-19.*확진.*억 명|전세계.*사망.*백만/i, label: "사후 누적 통계 인용 — 추론이 아니라 기억", severity: "fail" },
  // 완화된 패턴 — 추론 과정에서 언급될 수 있으나 출처가 없으면 감점
  { re: /mRNA 백신이.*2020년 12월에 긴급승인/i, label: "mRNA 긴급승인 구체 시점 언급 — cutoff 이후 확정이므로 [추정] 필요", severity: "warn" },
  { re: /WHO.*팬데믹 선언.*2020년 3월 11일/i, label: "팬데믹 선언일 정확 인용 — 차단 이후 정보이므로 출처 명시 없으면 감점", severity: "warn" },
];

// 추론 품질 루브릭 — 정답이 아닌 사고 과정을 채점 (Harness² behavioral contrast 철학)
export interface TimeCapsuleRubric {
  id: string;
  severity: "fail" | "warn";
  passed: boolean;
  message: string;
}

export function detectTemporalLeak(text: string): TimeCapsuleRubric[] {
  const out: TimeCapsuleRubric[] = [];
  for (const p of POST_CUTOFF_LEAK_PATTERNS) {
    if (p.re.test(text)) {
      out.push({ id: `leak:${p.label.slice(0, 20)}`, severity: p.severity, passed: false, message: `${p.severity.toUpperCase()}: ${p.label}` });
    }
  }
  if (out.length === 0) {
    out.push({ id: "temporalClean", severity: "warn", passed: true, message: "시간 차단 PASS — 미래 정보 누출 없음" });
  }
  return out;
}

// 추론 구조 채점 — 좋은 추론은 ①가정 명시 ②다중 가설 ③불확실성 정량화 ④검증 계획 4요소를 갖는다
export function scoreReasoningStructure(text: string): TimeCapsuleRubric[] {
  const checks: Array<{ re: RegExp; label: string; failMsg: string }> = [
    { re: /가정|전제|assuming|假设/i, label: "가정 명시", failMsg: "FAIL: 가정이 명시되지 않음 — 추론 전제를 밝혀야 함" },
    { re: /시나리오|가능성|후보|가설|best.*worst|경우의 수/i, label: "다중 가설", failMsg: "FAIL: 단일 예측만 있고 대안 가설 없음" },
    { re: /확률|%|R0|치명률|불확실|confidence|신뢰|추정/i, label: "불확실성 정량", failMsg: "WARN: 불확실성 정량화 없음 — 확률/범위 제시 권장" },
    { re: /검증|관찰|지표|trigger|임계|추가 데이터|모니터링/i, label: "검증 계획", failMsg: "WARN: 검증 계획 없음 — 어떤 관찰로 가설을 뒤집을지 제시 권장" },
  ];
  return checks.map((c) => {
    const ok = c.re.test(text);
    return {
      id: `struct:${c.label}`,
      severity: ok ? "warn" : c.failMsg.startsWith("FAIL") ? "fail" : "warn",
      passed: ok,
      message: ok ? `PASS: ${c.label} 포함` : c.failMsg,
    } as TimeCapsuleRubric;
  });
}

export function scoreEvidenceDiscipline(text: string): TimeCapsuleRubric[] {
  const hasFactVsInferenceTable = /(사실|관찰).*(추정|해석|예측)|Fact.*Inference/i.test(text);
  const hasProvenance = /출처|근거|source|EvidenceLedger|\(.*19\d{2}|\(.*2019/i.test(text);
  const hasUnknownSection = /모름|unknown|알 수 없음|추가 정보 필요/i.test(text);
  return [
    { id: "prov:citation", severity: hasProvenance ? "warn" : "fail", passed: hasProvenance, message: hasProvenance ? "PASS: 출처/근거 언급 있음" : "FAIL: 출처 없이 단정 — cutoff 이후 환각 위험" },
    { id: "prov:factSplit", severity: "warn", passed: hasFactVsInferenceTable, message: hasFactVsInferenceTable ? "PASS: 사실/추정 분리" : "WARN: 사실과 추정 분리표 없음 — 12살 설명 원칙 위배" },
    { id: "prov:unknown", severity: "warn", passed: hasUnknownSection, message: hasUnknownSection ? "PASS: 모름 인정 있음" : "WARN: 불확실 영역을 모른다고 명시하지 않음" },
  ];
}

export interface TimeCapsuleReport {
  ok: boolean; // fail 없음이면 ok
  leakChecks: TimeCapsuleRubric[];
  structureChecks: TimeCapsuleRubric[];
  evidenceChecks: TimeCapsuleRubric[];
  allChecks: TimeCapsuleRubric[];
  issues: string[];
  warnings: string[];
}

export function evaluateTimeCapsuleOutput(text: string): TimeCapsuleReport {
  const leakChecks = detectTemporalLeak(text);
  const structureChecks = scoreReasoningStructure(text);
  const evidenceChecks = scoreEvidenceDiscipline(text);
  const allChecks = [...leakChecks, ...structureChecks, ...evidenceChecks];
  const issues = allChecks.filter((c) => !c.passed && c.severity === "fail").map((c) => c.message);
  const warnings = allChecks.filter((c) => !c.passed && c.severity === "warn").map((c) => c.message);
  return { ok: issues.length === 0, leakChecks, structureChecks, evidenceChecks, allChecks, issues, warnings };
}

// RAG/Chunk cutoff 필터 — 모든 증거에 date 메타를 강제 (Windsurf provenance처럼)
export function isBeforeCutoff(dateStr: string | undefined, cutoffTs = COVID_CUTOFF_TS): boolean {
  if (!dateStr) return true; // 날짜 없으면 보수적으로 통과하되 경고 — 증거 출처 누락으로 qualityGate에서 감점됨
  const ts = new Date(dateStr).getTime();
  if (Number.isNaN(ts)) return true;
  return ts <= cutoffTs;
}

export function filterByCutoff<T extends { metadata?: Record<string, unknown>; capturedAt?: string }>(
  entries: T[],
  cutoffTs = COVID_CUTOFF_TS,
): { kept: T[]; blocked: T[] } {
  const kept: T[] = [];
  const blocked: T[] = [];
  for (const e of entries) {
    const d = (e.metadata?.["date"] as string | undefined) ?? (e.metadata?.["capturedAt"] as string | undefined) ?? e.capturedAt;
    if (isBeforeCutoff(d, cutoffTs)) kept.push(e);
    else blocked.push(e);
  }
  return { kept, blocked };
}
