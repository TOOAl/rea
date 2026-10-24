/**
 * 1층 전제 검증 3천재 — 계획/실행 전 오류·모순을 잡는 파수꾼
 * 사용자가 요청한: 오류 천재, 모순 천재, 비판적 사고 천재를 1층에 배치
 * 역할: 계획서(spec/plan)와 실행 결과(tree)가 생기기 전, 입력 전제 자체를 검증
 * - PremiseErrorBrain: 사실 오류·날짜·수치·출처 불일치 탐지
 * - ContradictionBrain: 동일 요청 안의 자기모순 탐지 (예: "빠르게 + 완벽하게 + 0원")
 * - CriticalThinkingBrain: 숨은 전제·생략·확증편향 폭로
 *
 * 12살 설명: 공사 시작 전, 설계도에서 "벽이 겹쳤네? 숫자 틀렸네?" 잡는 안전 감독관
 */

import { Brain, BrainInput, BrainOutput, BrainFeedback } from "./types.js";
import { BrainMemory } from "./memory.js";

function mkOutput(
  brain: Brain,
  idea: string,
  confidence: number,
  tags: string[],
): BrainOutput {
  return {
    brainId: brain.id,
    role: brain.role,
    layer: brain.layer,
    idea,
    confidence,
    tags,
    costMs: 0,
  };
}

function extractNumbers(text: string): string[] {
  return [...text.matchAll(/\d[\d,.]*%?/g)].map((m) => m[0]).slice(0, 6);
}
function extractDates(text: string): string[] {
  return [
    ...text.matchAll(/\d{4}-\d{2}-\d{2}|\d{4}년\s*\d{1,2}월|\d{1,2}\/\d{1,2}/g),
  ]
    .map((m) => m[0])
    .slice(0, 4);
}

// 1) 오류 천재 — 사실/수치/출처 오류
export class PremiseErrorBrain implements Brain {
  id = "premise-error-guardian";
  role = "error" as const;
  layer = 1 as const;
  name = "전제 오류 천재 (1층 파수꾼)";
  description =
    "입력 전제(기사/주제/요청)에 숨은 사실 오류·날짜·수치·출처 불일치를 1층에서 먼저 잡는다";
  version = "2.25.0";
  protected learned: string[] = [];
  constructor(private memory?: BrainMemory) {}
  async learn(f: BrainFeedback): Promise<void> {
    if (f.lesson) this.learned.push(f.lesson);
  }
  async think(input: BrainInput): Promise<BrainOutput> {
    const text = [
      input.task,
      input.context,
      input.topic ?? "",
      input.article ?? "",
    ]
      .join(" ")
      .slice(0, 3000);
    const prior = input.priorOutputs
      .map((o) => o.idea)
      .join(" ")
      .slice(0, 200);
    const nums = extractNumbers(text);
    const dates = extractDates(text);
    const recall = this.memory?.commonFailures(1).split("\n")[0] ?? "";

    const checks: string[] = [];
    // 수치 일관성: 동일 맥락에 서로 다른 수치가 있으면 경고
    if (nums.length >= 2 && new Set(nums).size !== nums.length)
      checks.push(`수치 반복: ${nums.join(", ")} — 중복/불일치 확인 필요`);
    else if (nums.length >= 1)
      checks.push(`수치 ${nums.join(", ")} — 출처 표기 여부 확인`);
    if (dates.length >= 1)
      checks.push(
        `날짜 ${dates.join(", ")} — 최신성(오늘 ${new Date().toISOString().slice(0, 10)})과 대조 필요`,
      );
    // 출처 요구: 수치/주장이 있는데 출처 없으면 경고
    const hasClaim = /(급락|급등|전망|예상|최초|최대|역대)/.test(text);
    const hasSource = /(출처|에 따르면|통계|보도|발표|https?:)/.test(text);
    if (hasClaim && !hasSource)
      checks.push("주장 표현(급락/최대 등) 있는데 출처 없음 — 증거도장 필요");
    if (!checks.length)
      checks.push("전제 수치/날짜 1차 스캔 통과 — 2층 설계 시에도 재검증 예정");

    return mkOutput(
      this,
      `🚨 1층 전제 오류 스캔\n→ 입력 발췌: "${text.slice(0, 80).replace(/\n/g, " ")}"\n→ 수치: ${nums.length ? nums.join(" | ") : "없음"} / 날짜: ${dates.length ? dates.join(" | ") : "없음"}\n→ 검사:\n${checks.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}\n→ 과거 실패 참고: ${recall || "없음"}\n→ 다음층 전달: ${prior ? "하위 의견 있음 — 교차검증" : "단독 — 2층에서 사실/추정 분리표로 재확인"} | 오류 있으면 계획 중단 조건 발동!`,
      hasClaim && !hasSource ? 0.92 : 0.85,
      [
        "premise-error",
        "fact-check",
        dates.length ? "date-sensitive" : "no-date",
      ],
    );
  }
}

// 2) 모순 천재 — 같은 요청 안의 자기모순
export class ContradictionBrain implements Brain {
  id = "premise-contradiction-scanner";
  role = "critical" as const;
  layer = 1 as const;
  name = "모순 탐지기 (1층 거울)";
  description =
    "요청 자체의 자기모순·충돌 조건을 1층에서 거울처럼 비춰 계획 단계 진입 전 차단";
  version = "2.25.0";
  protected learned: string[] = [];
  async learn(f: BrainFeedback): Promise<void> {
    if (f.lesson) this.learned.push(f.lesson);
  }
  async think(input: BrainInput): Promise<BrainOutput> {
    const text = [input.task, input.context].join(" ").toLowerCase();
    const contradictions: string[] = [];
    if (/빨리|즉시|당장/.test(text) && /완벽|100%|오류\s*0/.test(text))
      contradictions.push(
        "`빨리 + 완벽` 동시 요구 — 속도 vs 품질 트레이드오프 명시 필요",
      );
    if (/0원|무료/.test(text) && /프리미엄|고급|최고급/.test(text))
      contradictions.push("`0원 + 프리미엄` — 예산/품질 모순");
    if (/간단|쉽게/.test(text) && /전문|복잡|대규모/.test(text))
      contradictions.push("`간단 + 대규모` — 범위 재정의 필요");
    if (/요약/.test(text) && /자세히|전문|전체/.test(text))
      contradictions.push("`요약 + 전문` — 길이 목표 충돌");
    if (
      input.article &&
      input.topic &&
      !text.includes(input.topic.slice(0, 6).toLowerCase())
    )
      contradictions.push(
        `기사="${input.article.slice(0, 20)}..."와 주제="${input.topic.slice(0, 20)}..." 불일치 — 주제 이탈 경고`,
      );
    if (!contradictions.length)
      contradictions.push(
        "자기모순 1차 스캔 통과 — 3층 비판 천재와 2차 교차 예정",
      );

    return mkOutput(
      this,
      `🪞 1층 모순 스캔\n→ 요청: "${input.task.slice(0, 70)}"\n→ 발견:\n${contradictions.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}\n→ 해소안: 모순 있으면 2층 설계 시 선택지 A/B/C로 분기해 사용자 선택 유도 (추정 금지)\n→ 다음층 전달: 모순 태그 ${contradictions.length}개 — Gate 3.5에서 감점 요인!`,
      contradictions.length > 1 ? 0.9 : 0.78,
      [
        "contradiction",
        "self-check",
        contradictions.length > 1 ? "has-contradiction" : "clean",
      ],
    );
  }
}

// 3) 비판적 사고 천재 — 숨은 전제·편향 폭로
export class CriticalThinkingBrain implements Brain {
  id = "premise-critical-thinker";
  role = "critical" as const;
  layer = 1 as const;
  name = "비판적 사고 천재 (1층 질문꾼)";
  description =
    "숨은 전제·생략된 주체·확증편향을 질문으로 폭로해 계획이 잘못된 길로 가지 않게 한다";
  version = "2.25.0";
  protected learned: string[] = [];
  async learn(f: BrainFeedback): Promise<void> {
    if (f.lesson) this.learned.push(f.lesson);
  }
  async think(input: BrainInput): Promise<BrainOutput> {
    const text = [input.task, input.context, input.topic ?? ""].join(" ");
    const qs: string[] = [];
    if (!/(누가|대상|사용자|독자)/.test(text) && text.length > 20)
      qs.push(
        "누구를 위한 결과물인가? (대상 불명 → 12살/전문가/투자자에 따라 톤 달라짐)",
      );
    if (/(모두|항상|절대|100%)/.test(text))
      qs.push("`모두/항상` 같은 절대 표현 — 반례 1개는 없는가?");
    if (/(~할 것이다|전망|예상)/.test(text) && !/(근거|출처|데이터)/.test(text))
      qs.push("전망/예상의 근거는? (근거 없이 미래 단정 금지)");
    if (text.length < 30 && !input.article)
      qs.push("요청이 너무 짧음 — 맥락 1문장 보강하면 정확도 2배");
    if (!qs.length)
      qs.push(
        "비판적 사고 1차 통과 — 그래도 왜 이 방법을 택했는가는 4층 토론서 재질문",
      );
    return mkOutput(
      this,
      `❓ 1층 비판적 사고 질문 ${qs.length}개\n${qs.map((q, i) => `  ${i + 1}. ${q}`).join("\n")}\n→ 숨은 전제 예: "빠르게" 속엔 품질 포기 전제가 숨어있을 수 있음 — 드러내서 2층에 경고 전달\n→ 다음층 질문: 위 질문 중 1개라도 막히면 계획 중단하고 사용자에게 되묻기!`,
      0.88,
      ["critical-thinking", "hidden-premise", "fallacy-check"],
    );
  }
}
