/**
 * Knowledge Engine — 01·02·03 문헌을 5층 분류로 이식
 * 원전: 01 30인 52참고(Macnamara/Ericsson/Lubinski/Simonton/Wuchty) + 02 Malone/Dinneen/Jones/Whittaker/Schmidt/Risko + 03 Squire/Baddeley/Dunlosky/Roediger/Yang/Cepeda 등
 * 원칙: 모든 내용 포함하되 사실/해석/추측 라벨 + 효과크기·CI·비교조건·확인범위와 함께 조건부 제안
 */

export type FactLevel = "사실" | "해석" | "추측";
export type DocLayer = 1 | 2 | 3 | 4 | 5;
export interface FactCheckItem {
  claim: string;
  level: FactLevel;
  source: string;
  checkedRange: string; // 전문/절/초록/미리보기
  warning?: string;
}
export interface DesignSystem {
  fourLayers: { source: string; thought: string; work: string; action: string };
  gtd: string; // 수집→명료→조직→검토→실행
  para: string; // P/A/R/Ar
  zettel: string;
  cornell: string;
  naming: string; // YYYY-MM-DD__주제__유형__v03
  fair: string;
  handover: string;
  twoWeekTest: string;
}
export interface MemoryTips {
  systems: string; // Squire/Baddeley 4체계
  retrieval: string; // g=.499, 재학습 .330, 정교화 .095
  spacing: string; // Cepeda 184편, Mawson d=.54
  selfExplain: string; // g=.55
  interleaving: string; // g=.42
  loci: string; // d=.88 근거 낮음
  external: string; // Risko/Sparrow
  falseMemory: string; // Loftus
  sleep: string;
  session30: string; // 3-12-8-5-2
  schedule: string; // 1·3·7·14·30 가변
}
export interface CreativeSeed {
  type: string; // 구조·통합·표상·형식·실용·변형
  example: string; // 인물 예
  representation: string; // 도표·수식·모형
}
export interface CriticalNote {
  topic: string;
  finding: string;
  limit: string;
  correctSentence: string;
}
export interface KnowledgePacket {
  docSummary: string;
  factChecks: FactCheckItem[];
  design: DesignSystem;
  memory: MemoryTips;
  creativeSeeds: CreativeSeed[];
  critical: CriticalNote[];
  warnings: string[];
  validated: boolean;
  fiveLayerMap: string; // 5층 분류 요약
}

export class KnowledgeEngine {
  analyze(task: string, context = ""): KnowledgePacket {
    const lower = (task + " " + context).toLowerCase();
    const docSummary = `${task.slice(0, 60)} | ctx:${context.slice(0, 40)}`;

    // ── FactCheck — 01의 사실/해석/추측 구분 + 02·03 검증 범위 ──
    const factChecks: FactCheckItem[] = [];
    // 역사 IQ 소급 추정 감지
    if (/iq\s*\d+|지능.*천재|천재.*iq/i.test(task + context)) {
      factChecks.push({ claim: "역사 인물 IQ 추정치", level: "추측", source: "Simonton 2016 역사계량, StAndrews 전기", checkedRange: "논문 관련 절·기관 해설", warning: "소급 추정 불확실, 범위·자료량 영향 — 정밀값으로 인용 금지" });
    }
    // 신동 일화
    if (/신동|영재|한 번.*기억|잠.*안.*자/i.test(task + context)) {
      factChecks.push({ claim: "신동·완전기억 일화", level: "추측", source: "01 3장 한계·Cajel 등 전기", checkedRange: "원자료 vs 전기 회고", warning: "출처 불명 일화 제외, 저작 자체보다 약한 근거" });
    }
    // 연습 우위 과장
    if (/연습.*모든|1만.*시간|노력.*100%/i.test(task + context)) {
      factChecks.push({ claim: "연습 만능", level: "해석", source: "Macnamara r=.38 14% vs Ericsson r=.54/보정61%", checkedRange: "메타분석 표본·CI", warning: "설명분산≠원인비율, 정의·표본 논쟁 중 — 시간 총량보다 하위목표·난도·피드백" });
    }
    // AI 요약 검증
    if (/ai.*요약|gpt.*정리|생성.*요약/i.test(lower)) {
      factChecks.push({ claim: "AI 요약", level: "추측", source: "02 5.4 원문 대조 원칙", checkedRange: "미검증", warning: "원문 확인 전까지 별도 검토 상태, 수치·인용·예외 대조 필요" });
    }
    // 기본 1개 보장
    if (factChecks.length === 0) {
      factChecks.push({ claim: `${task.slice(0, 20)} 사실/해석 구분`, level: "사실", source: "01·02·03 원자료·기관·종설", checkedRange: "전문/해당 절", warning: undefined });
    }

    // ── Design System — 02의 4층 체계 + PARA 등 ──
    const design: DesignSystem = {
      fourLayers: {
        source: "원자료: PDF·서지·웹원문·관찰 — 어디서 왔는가?",
        thought: "근거메모: 요약·조건·비판·해석 — 무엇을 주장, 얼마나 믿는가?",
        work: "작업물: 보고서·계산·발표 — 지금 무엇을 만드는가?",
        action: "행동·일정: 다음 행동·담당·마감·대기 — 누가 언제 무엇을?"
      },
      gtd: "GTD 수집→명료(행동 결정)→조직→검토→실행 — PDF 저장과 ‘내일 20분 비교조건 확인’ 분리",
      para: "PARA P(프로젝트·끝남)/A(지속 영역)/R(자원)/Ar(보관) — 완료 작업 치우기, 복사본은 원본 위치+링크",
      zettel: "Zettelkasten: 한 메모=한 논점, 관계 적기(반례/다른 지표), 링크 수≠깊이 — Schmidt 루만 9만장 분석",
      cornell: "Cornell: 기록칸·질문칸·요약칸 + 가리고 답하기 — 지면 배치 자체 우월성 아님, 절차가 핵심",
      naming: "2026-10-21__기억학습__문헌분석__v03 — 날짜 규칙·역할 구분·버전/배포 분리, 기준 파일 위치·권한·변경요약",
      fair: "FAIR: 식별자·메타·출처·이용조건 — 동기화≠백업, 삭제도 동기화됨, 복원·내보내기 시험",
      handover: "정직 인계: 상태(초안/배포)·존재파일·기준원고·확인(방법·수치·렌더링)·미확인·다음 행동 — 경로 재확인 필요",
      twoWeekTest: "2주 평가: 10개 샘플 찾기 성공·시간·오답 + 기억은 덮고 설명·새 문제로 별도, 비용(입력+재탐색+오류) 함께"
    };

    // ── Memory Tips — 03 전체 ──
    const memory: MemoryTips = {
      systems: "Squire(선언적/비선언적 역사) + Baddeley(작업기억 다성분) — 숫자 외우기≠모든 이해",
      retrieval: "인출 Yang g=.499[0.442,0.557]_48k명_222연구, 재학습 대비 .330, 정교화 대비 .095[−.005,.194] — 낮은 부담 퀴즈→생성→비교→교정→재생성",
      spacing: "분산 Cepeda 184편315실험839평가(간격-지연 상호작용) + Mawson 교실 22편 d=.54[0.31,0.77]_3k명 — 1·3·7·14·30 가변, 거의 틀리면 더 일찍",
      selfExplain: "자기설명 Bisra 69효과 5917명 g=.55[.45,.65] — ‘왜 가능한가·어디 쓰이는가’ 관계 생성, 배경지식 없으면 오설명 교정 필요",
      interleaving: "교차 Brunmair 59논문158표본 g=.42[.34,.50]_8466명, 수학 .34·단어 -.39 — 구별해야 할 범주에 유용, 무작위 섞기 아님",
      loci: "장소법 Ondřej 83편 d=.88[.47,1.25]_3006명 즉시순서, 청년 .42[.00,.80] — 근거 질 낮음/매우낮음, 목록 회상≠일반지능",
      external: "Risko 외부화 메타인지 — 마감·드문 세부 외부, 반복 판단 핵심 직접 익히기, 전원 끊겼을 때 점검; Sparrow 4실험≠평생 저하",
      falseMemory: "Loftus 사후오도 30년 — 질문·설명에 따라 보고 달라짐, 오류율≠일반 비율, 기록 시 관찰/인용/해석/미확인 분리",
      sleep: "Rasch/Born 수면·공고화 종설(공개 초록) — 시간 늘리려 수면 희생 금지, 최적 수면·소리 주입 단정 불가",
      session30: "30분 예시 3떠올리기→12이해→8덮고생성→5교정→2예약 — 기초 부족하면 이해↑, 실기는 수행↑",
      schedule: "1·3·7·14·30일 출발점 — 망각곡선 만능 법칙 아님, 거의 틀림(교정+더 일찍)·부분 맞음·설명 가능(간격↑)·너무 쉬움(삭제/병합)"
    };

    // ── Creative Seeds — 01 6유형 + 03 표상 바꾸기 ──
    const creativeSeeds: CreativeSeed[] = [
      { type: "구조·표상 재설계", example: "노터(대수 구조)·튜링(계산 정의)·섀넌(통신 확률)", representation: "개별 계산→공통 조건·언어 재설계" },
      { type: "여러 증거 통합", example: "뉴턴(운동·중력 수학적 예측)·다윈(사육·분포·변이 누적)·퀴리(불일치→새 물질)", representation: "서로 다른 증거를 한 설명으로 압박·보완" },
      { type: "관찰을 보이게", example: "카할(염색·그림으로 뉴런)·레오나르도(드로잉 모델링)", representation: "시각화는 장식 아닌 추론 도구" },
      { type: "복잡 형식 통제", example: "바흐(대위법)·모차르트(형식·극적 상황)·무라사키(관계·시간 서사)", representation: "제약 아래 일관 흐름" },
      { type: "실용화·집단 조정", example: "와트(분리 응축기)·호퍼(FLOW-MATIC/COBOL 표준)·시난(돔·채광 통합)·세종(한글 설계·보급)", representation: "병목 분리·도구 옮기기·표준화·교육" },
      { type: "전통의 변형", example: "알하이삼(그리스 비판)·타고르(벵골·국제)·호쿠사이(구도 변주)·암스트롱(리듬·즉흥)", representation: "선행 활용≠독창성 부재" },
    ];

    // ── Critical Notes — 통계 리터러시 ──
    const critical: CriticalNote[] = [
      { topic: "의도적 연습", finding: "Macnamara 전체 r=.38 CI[.33,.42] 설명14%[11,18%] — 111표본 11k명", limit: "자기보고·측정오차·정의 혼합, 남은 86%≠유전", correctSentence: "연구 묶음의 평균 관계이지 개인 성공의 노력 비율 아님" },
      { topic: "의도적 연습 재분석", finding: "Ericsson r=.54 CI[.44,.63] 29%·보정61% — 정의 좁게", limit: "신뢰도 보정 가정에 의존, 동일 대상 아님", correctSentence: "포함 기준·정의 논쟁 중, 시간 총량보다 하위목표·피드백 우선이나 보장 아님" },
      { topic: "지능·성취", finding: "Lubinski 종단: 능력 패턴·관심·기회와 성과 관련", limit: "선발 집단, 역사 IQ로 소급 불가", correctSentence: "높은 능력은 중요하나 역사적 IQ 목록은 다른 문제" },
      { topic: "역사계량", finding: "Simonton 역사적 명성·자료량 영향", limit: "생존자 편향·기록량", correctSentence: "기록 알 수 있는 범위 넘지 말자" },
      { topic: "팀 확대", finding: "Wuchty 1990만 논문210만 특허 팀↑", limit: "인용≠진실/예술 가치, 고대 직접 측정 아님", correctSentence: "개인 영웅만 기본 단위로 삼기 어려움, 그러나 개인 기여 사라지지 않음" },
      { topic: "손글씨", finding: "Flanigan g=.248[.181,.315]_3005명 vs 기록량 g=.919, Urry 142명 재현 실패", limit: "대학생·짧은 지연·복습 조건 혼합", correctSentence: "작은 평균 차이, 도구·과제·접근성과 함께 읽기" },
      { topic: "인출", finding: "Yang g=.499 48k명, 재학습 .330, 정교화 .095[0포함]", limit: "연구 이질성 큼, 먼 전이와 동일시 금지", correctSentence: "많은 조건 유리하나 모든 다른 활동보다 낫다는 슬로건 아님" },
      { topic: "분산", finding: "Mawson d=.54[.31,.77]_3k명 교실, Cepeda 184편", limit: "작은 표본·편향 평가 없음, 1·3·7 최적 처방 아님", correctSentence: "현장 보완 자료지만 확정 최적 일정 아님" },
      { topic: "장소법", finding: "Ondřej d=.88[.47,1.25]_3006명 즉시순서, 청년 .42[.00,.80]", limit: "근거 질 낮음/매우낮음·출판편향", correctSentence: "목록 회상≠일반 지능·치매 예방" },
      { topic: "작업기억 훈련", finding: "Melby 87출판145비교 원전이 g=.05[-.02,.13]", limit: "2016까지 프로그램, 이후 부정 판결 아님", correctSentence: "먼 전이 근거 약함, 목적 직접 훈련이 가까움" },
    ];

    // 5층 분류 요약
    const fiveLayerMap = [
      "1층 기억: Squire/Baddeley 체계·외부 맡길것/익힐것 구분·간격 1·3·7·14·30·FAIR 백업·2주 비용",
      "1층 오류: 사실/해석/추측·Loftus 왜곡·Sparrow 한정·AI요약 미검증·출처/쪽수/판본·확인범위",
      "2층 설계: 4층 체계(원자료·근거메모·작업물·행동)·GTD/PARA/Zettel/Cornell 문제별·이름짓기·정직 인계·작은 주기",
      "3층 창의: 6유형+표상 바꾸기(도표·수식·모형)·30인 씨앗",
      "3층 비판: 10개 효과크기 독해·손글씨·인출·분산·장소법·작업기억·팀·연습 논쟁",
      "4층 천재: 30인 8분야 각 4단 서술+52참고",
      "5층 통합: 문제 구체화→원자료 확보→덮고생성→외부보관→분산적용→수정·검토, 모방 금지"
    ].join(" | ");

    const warnings = this.validate({ factChecks, fiveLayerMap, task: task + " " + context }, task + " " + context);
    return {
      docSummary,
      factChecks,
      design,
      memory,
      creativeSeeds,
      critical,
      warnings,
      validated: warnings.length === 0,
      fiveLayerMap
    };
  }

  validate(state: { factChecks: FactCheckItem[]; fiveLayerMap: string; task: string }, raw: string): string[] {
    const w: string[] = [];
    if (state.factChecks.some(f => f.level === "추측" && f.warning?.includes("출처 불명"))) {
      w.push("사실/추측: 출처 불명 일화·IQ 소급 포함 — 검증 전 인용 금지, 01 7장 확인 범위 준수");
    }
    if (/링크.*많|그래프.*밀도.*깊이/i.test(raw)) {
      w.push("Zettel: 링크 수≠깊이 — Schmidt 9만장 수량≠원인, 관계 적기 품질로 평가");
    }
    if (/외부.*퇴화|외부.*늘.*사고/i.test(raw)) {
      w.push("외부화 일반화 금지: Risko — 외부화는 조건·자기평가 의존, 만능/퇴화 단정 불가");
    }
    if (/손글씨.*항상|타이핑.*무조건/i.test(raw)) {
      w.push("매체 과장: Flanigan g=.248 작은 평균, Urry 재현 실패 — 도구·과제·접근성 함께");
    }
    if (/재독.*쓸모.*없|밑줄.*효과.*없/i.test(raw)) {
      w.push("재독 과장: Dunlosky 낮음=무효 아님 — 첫 이해·오류 수정에 필요, 역할 제한");
    }
    if (/작업기억.*훈련.*지능.*향상/i.test(raw)) {
      w.push("원전이 과장: Melby g=.05 원전이 근거 약함 — 목적 직접 훈련 권고");
    }
    if (state.factChecks.some(f => f.claim.includes("AI 요약"))) {
      w.push("AI 검증: 생성 요약은 원문 대조 전까지 별도 검토 상태 — 수치·인용·예외 대조 필요");
    }
    // 30인 협업 누락 경고
    if (/혼자.*발명|단독.*창시/i.test(raw) && /뉴턴|튜링|세종|퀴리/.test(raw)) {
      w.push("영웅 서사: Wuchty 팀 확대·편지·판본·기관 기록 확인 — 개인+생태계 함께 서술");
    }
    return w;
  }
}

/* ── 5층 분류 두뇌 4종 ── */
import { Brain, BrainInput, BrainOutput, BrainFeedback, BrainRole, BrainLayer } from "./types.js";
import { BrainMemory } from "./memory.js";
function mkOutput(input: BrainInput, brain: Brain, idea: string, confidence: number, tags: string[]): BrainOutput {
  return { brainId: brain.id, role: brain.role, layer: brain.layer, idea, confidence, tags, costMs: 0 };
}
abstract class BaseKnowledgeBrain implements Brain {
  abstract id: string; abstract role: BrainRole; abstract layer: BrainLayer;
  abstract name: string; abstract description: string;
  version = "2.22.0";
  protected learned: string[] = [];
  async learn(feedback: BrainFeedback): Promise<void> { if (feedback.lesson) this.learned.push(feedback.lesson); }
  abstract think(input: BrainInput): Promise<BrainOutput>;
}

export class MemoryHistoryBrain extends BaseKnowledgeBrain {
  id = "memory-history"; role = "memory" as const; layer = 1 as const;
  name = "역사·학습 기억 사서"; description = "Squire/Baddeley 4체계·인출 g=.499·분산 d=.54·외부 맡길것/익힐것·1·3·7·14·30 가변 일정";
  constructor(private memory: BrainMemory) { super(); }
  async think(input: BrainInput): Promise<BrainOutput> {
    const eng = new KnowledgeEngine();
    const pkt = eng.analyze(input.task, input.context);
    return mkOutput(input, this,
      `📚 기억 체계: ${pkt.memory.systems}\n` +
      `인출: ${pkt.memory.retrieval.slice(0, 80)}\n` +
      `분산: ${pkt.memory.spacing.slice(0, 80)}\n` +
      `외부: ${pkt.memory.external.slice(0, 80)}\n` +
      `30분 회기: ${pkt.memory.session30} | 일정: ${pkt.memory.schedule}\n` +
      `→ ${this.memory.commonFailures(2)}`,
      0.86, ["memory", "retrieval", "spacing"]);
  }
}
export class KnowledgeArchitectBrain extends BaseKnowledgeBrain {
  id = "design-knowledge"; role = "design" as const; layer = 2 as const;
  name = "지식 설계 건축가"; description = "4층 체계(원자료·근거메모·작업물·행동) + GTD/PARA/Zettel/Cornell 문제별 + FAIR·인계·2주 평가";
  async think(input: BrainInput): Promise<BrainOutput> {
    const eng = new KnowledgeEngine();
    const pkt = eng.analyze(input.task, input.context);
    return mkOutput(input, this,
      `🏗️ 4층 체계: 원자료(${pkt.design.fourLayers.source.slice(0, 30)}) | 근거메모 | 작업물 | 행동일정\n` +
      `GTD: ${pkt.design.gtd.slice(0, 50)}\n` +
      `PARA: ${pkt.design.para.slice(0, 50)}\n` +
      `이름짓기: ${pkt.design.naming}\n` +
      `인계: ${pkt.design.handover.slice(0, 60)}`,
      0.84, ["design", "gtd", "para", "fair"]);
  }
}
export class FactCheckerBrain extends BaseKnowledgeBrain {
  id = "error-factcheck"; role = "error" as const; layer = 1 as const;
  name = "사실 검증 탐정"; description = "사실/해석/추측 3구분 + 출처·쪽수·판본·확인범위 + Loftus 왜곡·AI 미검증 차단";
  async think(input: BrainInput): Promise<BrainOutput> {
    const eng = new KnowledgeEngine();
    const pkt = eng.analyze(input.task, input.context);
    const f = pkt.factChecks[0];
    return mkOutput(input, this,
      `🔍 사실검증: ${f.claim} → ${f.level} | ${f.source} | 확인범위 ${f.checkedRange}\n` +
      `${f.warning ? "⚠️ " + f.warning : "검증 통과"}\n` +
      `Loftus: 조작 질문→보고 왜곡, 자신감≠정확성 | Sparrow 4실험 한정\n` +
      `→ 인용/요약/추론 분리, 원문 대조 전까지 별도 상태`,
      f.warning ? 0.62 : 0.88, ["fact-check", f.level, f.warning ? "warn" : "ok"]);
  }
}
export class StatsLiteracyBrain extends BaseKnowledgeBrain {
  id = "critical-stats"; role = "critical" as const; layer = 3 as const;
  name = "통계 리터러시 심사관"; description = "효과크기·CI·표본·비교조건 독해 — Macnamara 14%≠원인비율, 손글씨 g=.248 작은 평균, 원전이 g=.05";
  async think(input: BrainInput): Promise<BrainOutput> {
    const eng = new KnowledgeEngine();
    const pkt = eng.analyze(input.task, input.context);
    const top = pkt.critical.slice(0, 2).map(c => `${c.topic}: ${c.finding.slice(0, 40)} → ${c.correctSentence.slice(0, 40)}`).join("\n");
    return mkOutput(input, this,
      `📊 통계 리터러시:\n${top}\n` +
      `원칙: g≠%상승, 95%CI≠확률, 같은 연구 중복 합산 금지, 일반화는 과제·표본 의존\n` +
      `→ ${pkt.critical[2]?.correctSentence ?? ""}`,
      0.87, ["stats", "ci", "effect-size"]);
  }
}
