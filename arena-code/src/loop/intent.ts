/**
 * Intent Analyzer — Pillar 2: 정확한 의도 파악
 * Harness² proposer의 invariant/domain 구분을 일반 대화로 확장
 *
 * 목표: 모호한 프롬프트를 그대로 모델에 던지지 않고, 의도 유형·확신도·누락 슬롯을 먼저 식별
 * - question: 지식/풀이/설명 요청 (예: "다음 글의 밑줄 중 틀린 것은?")
 * - implementation: 파일 생성/수정/구현 (예: "로그인 기능 만들어줘")
 * - analysis: 분석/리뷰/역공학 (예: "/tmp/app 분석해줘", "Ghidra로 봐줘")
 * - generation: 아티팩트 생성 (예: "썸네일 만들어줘", "PDF로 출력", "DaVinci로 편집")
 * - chore: 설정/조회/잡무 (예: "git status 보여줘", "--update check")
 *
 * 12살 설명: 친구가 "이거 해줘"라고 했을 때, 바로 달려가지 않고 "뭘, 왜, 어떻게" 먼저 묻는 것
 */

import type { Message } from "../providers/types.js";

export type IntentKind =
  | "question"
  | "implementation"
  | "analysis"
  | "generation"
  | "chore";

export interface Intent {
  kind: IntentKind;
  confidence: number; // 0..1
  ambiguities: string[]; // e.g. "이미지 하단 잘림", "출력 형식 불명"
  requiredSlots: string[]; // e.g. "outputFormat: html|pdf"
  suggestedClarification?: string;
  evidence: string[]; // 판단 근거 (디버깅/학습용)
}

export interface IntentOptions {
  /** 휴리스틱만 사용 (LLM 호출 없음) — 기본 true, 비용 절감. REA 흡수: 0.4~0.6 구간은 LLM judge 1회로 보정 */
  heuristicOnly?: boolean;
  /** provider가 있으면 0.4~0.6 구간에서 LLM judge 1회 호출 — 없으면 휴리스틱 유지 */
  provider?: import("../providers/types.js").Provider;
  /** 신뢰도 임계치: 이하면 clarification 제안 — 기본 0.5 */
  confidenceThreshold?: number;
}

// 키워드 가중치 — 각 kind에 대한 단서 (P-Code 정규형: 다언어 의도를 중간표현으로 정규화)
const SIGNALS: Array<{
  re: RegExp;
  kind: IntentKind;
  weight: number;
  label: string;
}> = [
  // question — Ghidra 문자열/의문사 정규화: \"?\" 종료는 P-Code CALL의 return과 동급의 강한 신호
  {
    re: /밑줄|어법상|틀린 것은|다음 글|보기 중|정답|해설|왜.*\?|무엇.*\?|어떻게.*\?|설명해줘|알려줘|해석해줘|해설해줘/,
    kind: "question",
    weight: 0.45,
    label: "질문형 어휘(밑줄/어법/정답)",
  },
  {
    re: /\b(who|what|why|how|when|which|explain)\b|why is|what is|how does/i,
    kind: "question",
    weight: 0.3,
    label: "영문 의문사",
  },
  {
    re: /\?\s*$/,
    kind: "question",
    weight: 0.35,
    label: "물음표 종료 → 질문 확정",
  },
  // analysis — Ghidra P-Code: call graph/xrefs는 제어흐름 그래프의 직접 증거
  {
    re: /분석해줘|역공학|리버스|바이너리|Ghidra|IDA|디컴파일|trace|inspect|리버스 해줘/i,
    kind: "analysis",
    weight: 0.38,
    label: "분석/역공학 키워드",
  },
  {
    re: /call\s*graph|callgraph|cfg|control\s*flow|xrefs?|xref|disassembl|문자열 검색|참조 추적|entry\s*point|취약점/i,
    kind: "analysis",
    weight: 0.5,
    label: "Ghidra/P-Code 그래프 키워드(call graph/xrefs)",
  },
  // implementation — Cursor Apply: 파일 경로·코드 맥락이 강할 때만 (Ghidra P-Code: DEF/CALL 정규형)
  {
    re: /로그인 기능|CRUD|결제 모듈|src\/|queryLoop|harness\.ts|evidenceLedger|구현해줘|리팩토링해줘/i,
    kind: "implementation",
    weight: 0.55,
    label: "구현 코드 시그니처(src/CRUD/리팩토링)",
  },
  {
    re: /만들어줘|생성해줘|구현해줘|작성해줘|개발해줘|추가해줘|implement/i,
    kind: "implementation",
    weight: 0.28,
    label: "구현 동사(일반)",
  },
  {
    re: /버그\s*fix|fix해줘|버그|무한\s*루프|패치|hotfix/i,
    kind: "implementation",
    weight: 0.42,
    label: "버그/패치 키워드(fix/버그)",
  },
  // generation — Artifact는 전용 키워드가 있으면 implementation보다 강함 (Windsurf provenance)
  {
    re: /썸네일|DaVinci|Resolve|캡컷|CapCut|유튜브|이미지 생성/i,
    kind: "generation",
    weight: 0.55,
    label: "생성/편집 키워드(시각물)",
  },
  {
    re: /영상.*편집|편집.*가이드|PDF.*가이드|HTML.*카드뉴스|디자인해줘|영상 자막|SRT|매뉴얼|설명란|태그 만들어줘|시나리오|정책.*시나리오/i,
    kind: "generation",
    weight: 0.58,
    label: "생성 편집 복합(PDF/HTML/자막/매뉴얼/시나리오)",
  },
  // chore — Codex 샌드박스: setup/install/configure는 workspace-write의 증거, npm test 알려줘는 chore 우선
  {
    re: /git (status|log|diff|branch|show)|npm (run|test|build|install)|yarn |pnpm |ls |cat |setup|install|configure/i,
    kind: "chore",
    weight: 0.5,
    label: "CLI/조회 명령",
  },
  {
    re: /^setup\b|setup\s+Ghidra|setup.*해줘|--update|--mcp|--help|--version/i,
    kind: "chore",
    weight: 0.55,
    label: "setup/chore 단독 — 샌드박스 설치",
  },
  {
    re: /npm test|npm run build|결과 알려줘.*npm|npm.*결과/i,
    kind: "chore",
    weight: 0.45,
    label: "npm test 결과 — chore 보정",
  },
  {
    re: /파일 첨부|image-.*\.png|\.pdf|\.docx|스creenshot/i,
    kind: "question",
    weight: 0.15,
    label: "첨부 파일 — 문맥 필요",
  },
];

const SLOT_RULES: Array<{
  when: (text: string) => boolean;
  slot: string;
  ambiguity: string;
}> = [
  {
    when: (t) =>
      /편집|영상|썸네일|PDF|HTML/i.test(t) &&
      !/(1280x720|1920x1080|pdf|html|png)/i.test(t),
    slot: "outputFormat",
    ambiguity: "출력 형식/해상도 불명 — 기본값으로 진행할지 확인 필요",
  },
  {
    when: (t) =>
      /밑줄|underline/i.test(t) && !/①|②|③|④|⑤|<u>|<span.*ul/i.test(t),
    slot: "underlineRange",
    ambiguity: "밑줄 범위 불명 — 원문 전체/이미지 기준 재확인 필요",
  },
  {
    when: (t) =>
      /DaVinci|Resolve/i.test(t) && !/21\.\d|22\.\d|Windows|Mac/i.test(t),
    slot: "toolVersion",
    ambiguity: "DaVinci 버전/OS 불명 — 21.3.7 ENG 가정",
  },
  {
    when: (t) => t.length < 20 && !/image|file/i.test(t),
    slot: "context",
    ambiguity: "프롬프트가 짧아 문맥 부족 — 추가 증거 필요 가능",
  },
  {
    when: (t) => /이미지|스샷|screenshot/i.test(t) && /잘림|truncat/i.test(t),
    slot: "truncation",
    ambiguity: "이미지 하단 잘림 — 복원 범위 명시 필요",
  },
];

function normalizeMessages(messages: Message[]): string {
  return messages
    .map((m) => {
      if (typeof m.content === "string") return m.content;
      return (m.content as Array<{ text?: string; content?: string }>)
        .map((b) => b.text ?? b.content ?? "")
        .join(" ");
    })
    .join("\n")
    .slice(-4000); // 최근 4000자만 — 토큰 절감, 최신 의도가 우선
}

export function classifyIntentSync(
  messages: Message[],
  opts: IntentOptions = {},
): Intent {
  const text = normalizeMessages(messages);
  const lower = text.toLowerCase();

  // 1) kind 점수 집계
  const scores: Record<IntentKind, number> = {
    question: 0,
    implementation: 0,
    analysis: 0,
    generation: 0,
    chore: 0,
  };
  const evidences: string[] = [];

  for (const s of SIGNALS) {
    if (s.re.test(text) || s.re.test(lower)) {
      scores[s.kind] += s.weight;
      evidences.push(`${s.label} → +${s.weight} ${s.kind}`);
    }
  }

  // 길이/구조 보정 — P-Code 정규화: 파일 경로·문법은 언어에 관계없이 중간표현으로 변환
  if (
    text.includes("```") ||
    text.includes("src/") ||
    text.includes(".ts") ||
    text.includes(".py") ||
    /README|package\.json|\.md|\.js|\.tsx/i.test(text)
  ) {
    scores.implementation += 0.22;
    evidences.push("코드 블록/경로/파일명 포함 → implementation +0.22");
  }
  // README+가이드 교차: 생성으로 오분류되는 대표 케이스 보정 (작성해줘: README에 설치 가이드)
  if (/README/i.test(text) && /가이드|매뉴얼|문서/i.test(text)) {
    scores.implementation += 0.35;
    evidences.push("README+가이드 교차 → 문서 구현으로 보정 +0.35 implementation");
    scores.generation = Math.max(0, scores.generation - 0.2);
  }
  if (/^(다음|아래|첨부)/.test(text.trim())) {
    scores.question += 0.1;
    evidences.push("문두 지시어(다음/아래/첨부) → question +0.1");
  }
  // Ghidra 질문 교차: \"how does X decompile work?\"는 질문이지 분석이 아님
  if (/\?$/.test(text.trim()) && /Ghidra|decompile|IDA/i.test(text)) {
    // 질문 신호가 이미 있으면 분석을 약화시켜 질문이 이기게
    if (scores.question > 0) {
      scores.analysis = Math.max(0, scores.analysis - 0.25);
      evidences.push("물음표+Ghidra 교차 → analysis 약화 -0.25 (질문 우선)");
    }
  }
  // chore vs analysis: setup은 chore 최우선 (Codex 샌드박스 설치)
  if (/^setup\b/i.test(text.trim())) {
    scores.chore += 0.25;
    evidences.push("문두 setup → chore 추가 +0.25");
  }

  // 2) 최다 득점 kind
  let bestKind: IntentKind = "question";
  let bestScore = -1;
  for (const k of Object.keys(scores) as IntentKind[]) {
    if (scores[k] > bestScore) {
      bestScore = scores[k];
      bestKind = k;
    }
  }

  // 3) confidence 계산 — 점수 차이와 절대 점수로 정규화
  const sorted = Object.entries(scores).sort(
    (a, b) => (b[1] as number) - (a[1] as number),
  );
  const gap = (sorted[0][1] as number) - (sorted[1][1] as number);
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  let confidence =
    0.3 + Math.min(0.6, bestScore * 0.8) + Math.min(0.2, gap * 0.5);
  if (total === 0) confidence = 0.2; // 단서 없음 → 낮음
  confidence = Math.max(0, Math.min(1, confidence));

  // 4) ambiguities / requiredSlots
  const ambiguities: string[] = [];
  const requiredSlots: string[] = [];
  for (const r of SLOT_RULES) {
    if (r.when(text)) {
      ambiguities.push(r.ambiguity);
      requiredSlots.push(r.slot);
    }
  }

  // 5) clarification 제안 (confidence 낮을 때만)
  const threshold = opts.confidenceThreshold ?? 0.5;
  let suggestedClarification: string | undefined;
  if (confidence < threshold && ambiguities.length > 0) {
    suggestedClarification = `의도를 더 정확히 파악하려면: ${ambiguities[0]} — 예: "${requiredSlots[0]}을 알려주세요"`;
  } else if (confidence < 0.4) {
    suggestedClarification =
      "요청이 모호합니다. 무엇을 만들고 싶은지, 어떤 형식으로 받고 싶은지 한 문장으로 보완해 주세요.";
  }

  return {
    kind: bestKind as IntentKind,
    confidence: Math.round(confidence * 100) / 100,
    ambiguities,
    requiredSlots,
    suggestedClarification,
    evidence: evidences.slice(0, 6), // 상위 6개만 — 토큰 절감
  };
}

// 호환성: 기존 호출은 동기 — 새 비동기는 judge 포함
export function classifyIntent(messages: Message[], opts: IntentOptions = {}): Intent {
  return classifyIntentSync(messages, opts);
}

export async function classifyIntentWithJudge(messages: Message[], opts: IntentOptions = {}): Promise<Intent> {
  const base = classifyIntentSync(messages, opts);
  if (!opts.provider) return base;
  if (opts.heuristicOnly === true) return base;
  if (base.confidence >= 0.7) return base;
  try {
    const { llmJudgeIntent } = await import("./reasoning.js");
    const p = messages.map(m => typeof m.content==="string"? m.content : JSON.stringify(m.content)).join("\n").slice(-2000);
    const judged = await llmJudgeIntent(opts.provider!, p, base);
    return judged ?? base;
  } catch { return base; }
}

/** 의도가 충분히 명확한지 — queryLoop에서 분기용 */
export function isIntentClear(intent: Intent, threshold = 0.5): boolean {
  return intent.confidence >= threshold && intent.ambiguities.length <= 1;
}

// ---------------------------------------------------------------------------
// Phase 2: proposer.ts invariant/domain 분기 재사용 — Harness² H2
// ---------------------------------------------------------------------------

export interface IntentVariant {
  dim: "invariant" | "domain";
  hint: string; // system prompt에 주입할 추가 지시
  focusSlots: string[]; // 이 variant가 집중할 슬롯
}

const DOMAIN_HINTS: Record<
  string,
  { dim: "domain"; hint: string; slots: string[] }
> = {
  video: {
    dim: "domain",
    hint: "도메인 지식: DaVinci Resolve 21.3.7 타임라인 1920x1080, Fairlight, Deliver 페이지. CapCut 용어 혼동 금지.",
    slots: ["outputFormat", "toolVersion"],
  },
  exam: {
    dim: "domain",
    hint: '도메인 지식: 수능 어법 5지선다, 밑줄 어법, <span class="ul">+border-bottom 이중 보장, 정답은 <details>로 800자 이후에만.',
    slots: ["underlineRange", "truncation"],
  },
  ghidra: {
    dim: "domain",
    hint: "도메인 지식: Ghidra Headless, ReaGhidraBridge, ephemeral DB, P-Code.",
    slots: ["context"],
  },
  youtube: {
    dim: "domain",
    hint: "도메인 지식: 유튜브 수익화 8분, 자막·썸네일·챕터, 15% 인용 제한.",
    slots: ["outputFormat"],
  },
};

const INVARIANT_HINT: IntentVariant = {
  dim: "invariant",
  hint: "공통 절차: 계획→도구사용→검증 3단계, TodoWrite로 분해, Read→Edit→Verify, 증거 출처 보존.",
  focusSlots: ["context", "truncation"],
};

/**
 * 하나의 Intent를 invariant/domain 두 후보로 분기 — proposer.ts의 2-proposal과 동일
 * queryLoop나 harness2 engine이 두 후보를 probe/compose 할 수 있게 힌트 제공
 */
export function proposeIntentVariants(
  text: string,
  base: Intent,
): { invariant: IntentVariant; domain: IntentVariant } {
  // domain 결정: 텍스트 키워드로 매핑, 없으면 base.kind 기반 fallback
  const lower = text.toLowerCase();
  let domainKey = "generic";
  if (/davinci|resolve|캡컷|capcut|영상.*편집/i.test(text)) domainKey = "video";
  else if (/밑줄|어법|수능|모의고사|exam/i.test(text)) domainKey = "exam";
  else if (/ghidra|바이너리|리버스|p-code/i.test(text)) domainKey = "ghidra";
  else if (/유튜브|썸네일|구독|조회수/i.test(text)) domainKey = "youtube";
  else if (base.kind === "implementation") domainKey = "generic-impl";
  else if (base.kind === "analysis") domainKey = "generic-analysis";

  const domainVariant: IntentVariant = DOMAIN_HINTS[domainKey]
    ? {
        dim: "domain",
        hint: DOMAIN_HINTS[domainKey].hint,
        focusSlots: DOMAIN_HINTS[domainKey].slots,
      }
    : {
        dim: "domain",
        hint: `도메인 지식: ${base.kind} 도메인, ${base.evidence.slice(0, 1).join("")} 기반 절차`,
        focusSlots: base.requiredSlots.slice(0, 2),
      };

  return { invariant: INVARIANT_HINT, domain: domainVariant };
}

// ── Intent Hint 2.25.0: 3가지 선택지 + 질문 1개 ──
export interface IntentChoice {
  label: string; // A/B/C
  title: string; // 예: "보고서"
  desc: string; // 예: "표 + 그래프, 3페이지"
}

export function buildIntentChoices(
  intent: Intent,
  text: string,
): IntentChoice[] {
  // kind별 기본 3선택지, ambiguities로 tailoring
  const base: Record<IntentKind, IntentChoice[]> = {
    question: [
      { label: "A", title: "간단 답변", desc: "핵심 3줄 + 출처 1개" },
      {
        label: "B",
        title: "상세 해설",
        desc: "사실/추정 분리표 + 예시 + 증거 도장",
      },
      { label: "C", title: "12살 설명", desc: "그림 1장 + 비유로 쉽게" },
    ],
    implementation: [
      {
        label: "A",
        title: "가장 작은 성공",
        desc: "파일 1개, 테스트 1개로 먼저 동작",
      },
      {
        label: "B",
        title: "전체 설계",
        desc: "구조도 + Todo 5개 + 검증 게이트",
      },
      {
        label: "C",
        title: "프로토타입",
        desc: "더미 데이터로 미리보기 → 피드백 후 확장",
      },
    ],
    analysis: [
      { label: "A", title: "빠른 스캔", desc: "구조·진입점만 5분 요약" },
      {
        label: "B",
        title: "정밀 역공학",
        desc: "함수별 역할 + 흐름도 + 위험점",
      },
      {
        label: "C",
        title: "비교 분석",
        desc: "이전 버전과 diff + 변경 이유 추적",
      },
    ],
    generation: [
      { label: "A", title: "보고서/문서", desc: "표 + 출처 블록, HTML/PDF" },
      {
        label: "B",
        title: "카드뉴스/썸네일",
        desc: "이미지 1장, 1280x720, 글자 겹침 검사",
      },
      {
        label: "C",
        title: "영상 대본",
        desc: "3분 스크립트 + 자막 + B-roll 제안",
      },
    ],
    chore: [
      { label: "A", title: "상태 보여주기", desc: "git/status, 파일 목록" },
      { label: "B", title: "실행하고 검증", desc: "명령 실행 + 결과 요약" },
      { label: "C", title: "설정 변경", desc: "옵션 수정 + 재시작 가이드" },
    ],
  };
  let choices = [...(base[intent.kind] ?? base.question)];
  // ambiguities 반영: 출력 형식 불명이면 generation 선택지에 정확히 반영
  if (intent.requiredSlots.includes("outputFormat")) {
    choices = [
      { label: "A", title: "보고서 (표+출처)", desc: "HTML, 인쇄용" },
      {
        label: "B",
        title: "카드뉴스 (이미지)",
        desc: "1080x1080, 글자 5줄 이내",
      },
      { label: "C", title: "대본/요약", desc: "3분 읽기 분량, 12살 비유 포함" },
    ];
  }
  if (/기사|주제/.test(text) && intent.ambiguities.length) {
    choices[0].desc += " — 기사 사실 중심";
    choices[1].desc += " — 주제 확장/비교 포함";
  }
  return choices;
}

export function formatIntentHintForPrompt(
  intent: Intent,
  text: string,
): string {
  const confLine = `의도: ${intent.kind} (확신 ${intent.confidence}) — 근거: ${intent.evidence.slice(0, 2).join(" | ") || "키워드 없음"}`;
  if (intent.confidence >= 0.5 && intent.ambiguities.length === 0) {
    return `${confLine}\n→ 명확 — 바로 진행.`;
  }
  const choices = buildIntentChoices(intent, text);
  const q =
    intent.suggestedClarification ?? "어떤 형식으로 받고 싶은지 알려주세요.";
  const choiceLines = choices
    .map((c) => `- ${c.label}) ${c.title}: ${c.desc}`)
    .join("\n");
  return `${confLine}\n모호점: ${intent.ambiguities.join(" | ") || "경미"}\n→ confidence ${intent.confidence} < 0.5 — 추측 금지! 아래 중 1개 골라 답하거나 질문하세요:\n${choiceLines}\n질문 예시: "${q}"`;
}
