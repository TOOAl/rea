/**
 * 1층 기사/주제 입력 두뇌 — v2.24.0
 * 역할: 사용자가 입력한 기사(원문)나 주제를 1층에서 가장 먼저 받아 정제·분류·지도화
 *  - 기사가 있으면: 요약·키워드·사실/주장 분리·용량 체크
 *  - 주제만 있으면: 주제를 구체 질문으로 번역·필요 자료 좌표 안내
 */

import {
  Brain,
  BrainInput,
  BrainOutput,
  BrainFeedback,
  BrainRole,
  BrainLayer,
} from "./types.js";
import { BrainMemory } from "./memory.js";

function mkOutput(
  input: BrainInput,
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

function truncate(s: string, n = 500): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + ` ...(${s.length - n}자 더)` : s;
}

function extractKeywords(text: string, limit = 6): string[] {
  const tokens = text
    .replace(/https?:\/\/\S+/g, " ")
    .split(/[^가-힣a-zA-Z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 20);
  const stop = new Set([
    "있는",
    "없는",
    "통해",
    "대해",
    "관련",
    "위한",
    "대한",
    "그리고",
    "하지만",
    "입니다",
    "합니다",
    "하는",
    "되는",
    "있는지",
    "같은",
    "이번",
  ]);
  const freq = new Map<string, number>();
  for (const tok of tokens) {
    if (stop.has(tok)) continue;
    if (
      /^(the|and|for|with|this|that|from|have|will|would|should|about|into|어떤|무엇|어떻게|왜|언제)$/i.test(
        tok,
      )
    )
      continue;
    freq.set(tok, (freq.get(tok) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

function classifyLength(article: string): string {
  const len = article.length;
  if (len < 200) return "짧은 메모/주제";
  if (len < 1500) return "기사 요약본";
  if (len < 6000) return "장문 기사";
  return "장문 기사+댓글/전문";
}

function buildFactClaimBlock(article: string): string {
  // 증거 도장 전용: 사실/추정 분리표 — 동기 임포트 실패 시 fallback
  try {
    // 동적 import 대신 휴리스틱 직접 — 빌드 순환 방지
    const lines = article
      .split("\n")
      .filter((l) => l.trim().length > 10)
      .slice(0, 12);
    const facts: string[] = [];
    const claims: string[] = [];
    for (const l of lines) {
      if (
        /(따르면|발표|기록|통계|종가|마감|발생|확인|공개|보도|에 따르면)/.test(
          l,
        )
      )
        facts.push(l.trim().slice(0, 70));
      else if (/(전망|예상|것으로 보인다|것으로 예상|할 것이다|추측)/.test(l))
        claims.push(l.trim().slice(0, 70));
      else if (/\d/.test(l)) facts.push(l.trim().slice(0, 70));
    }
    const factRatio =
      facts.length + claims.length
        ? Math.round((facts.length / (facts.length + claims.length)) * 100)
        : 50;
    const table = [
      "| 구분 | 내용 | 출처 필요 |",
      "|---|---|---|",
      ...facts.slice(0, 5).map((f) => `| ✅ 사실 | ${f} | 예 |`),
      ...claims.slice(0, 5).map((c) => `| 🔮 추정 | ${c} | 예 — [추정] |`),
      ...(facts.length === 0 && claims.length === 0
        ? ["| - | (분류할 문장 없음) | - |"]
        : []),
    ].join("\n");
    return `사실/추정 분리표 (사실 ${factRatio}%):\n${table}`;
  } catch {
    return "사실/추정 분리표 생성 실패 — 원문 길이 부족";
  }
}

export class ArticleInputBrain implements Brain {
  id = "memory-article-input";
  role = "memory" as const;
  layer = 1 as const;
  name = "기사·주제 입력 천재 (1층 안내데스크)";
  description =
    "사용자가 입력한 기사 원문/URL/주제를 받아 요약·키워드·사실/주장 분류·다음층 전달용 질문으로 정제";
  version = "2.24.0";
  protected learned: string[] = [];
  constructor(private memory?: BrainMemory) {}
  async learn(feedback: BrainFeedback): Promise<void> {
    if (feedback.lesson) this.learned.push(feedback.lesson);
  }

  async think(input: BrainInput): Promise<BrainOutput> {
    const hasArticle = !!(input.article && input.article.trim());
    const hasTopic = !!(input.topic && input.topic.trim());
    const hasUrl = !!(input.articleUrl && input.articleUrl.trim());

    // 케이스: 아무 입력도 없음 → 대기 안내
    if (!hasArticle && !hasTopic && !hasUrl) {
      return mkOutput(
        input,
        this,
        `📥 1층 안내데스크 — 아직 기사/주제 입력 없음\n` +
          `→ 입력 방법 3가지:\n` +
          `  ① 기사 원문 붙여넣기: Brains({ task: "요약해줘", article: "기사 본문..." })\n` +
          `  ② URL로 가져오기: Brains({ task: "분석해줘", articleUrl: "https://..." })\n` +
          `  ③ 주제만 입력: Brains({ task: "대본 만들어줘", topic: "코스피 급락" })\n` +
          `→ CLI: --article "..." / --article-file ./article.txt / --article-url https://... / --topic "주제"\n` +
          `→ 슬래시: /article "기사..." 또는 /topic "주제"\n` +
          `→ 다음층(2층 설계실)에 전달할 기본 질문을 준비 중 — 입력이 들어오면 즉시 정제해 전달합니다.`,
        0.9,
        ["input-guide", "article-topic", "idle"],
      );
    }

    // 주제만 있는 경우
    if (!hasArticle && hasTopic) {
      const topic = input.topic!.trim();
      const keywords = extractKeywords(topic, 5);
      const priorFail = this.memory?.commonFailures(2) ?? "";
      return mkOutput(
        input,
        this,
        `📌 1층 주제 접수 — "${topic.slice(0, 60)}"\n` +
          `→ 분류: 주제형 입력 (${classifyLength(topic)})\n` +
          `→ 키워드: ${keywords.join(" · ") || topic.split(/\s+/).slice(0, 5).join(", ")}\n` +
          `→ 번역된 의도: "${topic}" → 2층에 "이 주제로 무엇을 만들까? (팩트체크/대본/요약/비교)" 질문 생성\n` +
          `→ 추천 다음 행동 3개: ① 관련 기사 2개 수집 ② 사실/추정 분리표 만들기 ③ 12살 설명 1장 생성\n` +
          `→ 과거 실패 참고: ${priorFail.split("\n")[0] ?? "없음"}\n` +
          `→ 다음층 전달: topic="${topic}" + 키워드 ${keywords.slice(0, 3).join(",")} 기반 설계 요청`,
        0.88,
        ["topic-input", "keyword", topic.slice(0, 20)],
      );
    }

    // 기사가 있는 경우 (원문 우선, topic은 보조)
    const article = (input.article ?? "").trim();
    const title = (input.articleTitle ?? "").trim();
    const url = (input.articleUrl ?? "").trim();
    const topicHint = (input.topic ?? "").trim();

    const keywords = extractKeywords(article, 8);
    const lenLabel = classifyLength(article);
    const lines = article.split("\n").filter((l) => l.trim()).length;
    const charCount = article.length;

    // 간단 사실/주장 분리 휴리스틱
    const factMarkers = (
      article.match(/(따르면|발표|기록|통계|종가|마감|발생|확인|공개|보도)/g) ??
      []
    ).length;
    const opinionMarkers = (
      article.match(
        /(전망|예상|추측|것으로 보인다|것으로 예상|할 것이다|것이다\.*$)/gm,
      ) ?? []
    ).length;
    const factRatio =
      factMarkers + opinionMarkers > 0
        ? Math.round((factMarkers / (factMarkers + opinionMarkers)) * 100)
        : 50;

    // 다음층 전달용 질문 생성
    const nextQuestions: string[] = [];
    if (factRatio < 40)
      nextQuestions.push(
        "주장/전망이 많아 사실 확인이 필요 — 원문 출처 1순위로 검증",
      );
    if (charCount > 3000)
      nextQuestions.push(
        "장문이므로 3줄 요약 + 5개 체크리스트로 압축해 5층에 전달",
      );
    if (topicHint)
      nextQuestions.push(
        `주제 힌트 "${topicHint}"와 기사 일치도 검증 — 벗어나면 경고`,
      );
    if (url) nextQuestions.push(`URL 출처 ${url} — 도메인 신뢰도 표시 필요`);
    if (!nextQuestions.length)
      nextQuestions.push(
        "사실/추정 분리표 + 12살 설명 + 다음 영상 연결점 1개 생성",
      );

    const factBlock = buildFactClaimBlock(article);
    const recall = this.memory
      ? this.memory.commonFailures(1).split("\n")[0]
      : "";

    return mkOutput(
      input,
      this,
      `📰 1층 기사 접수 완료 — ${title ? `제목: "${title.slice(0, 40)}"` : lenLabel} (${charCount}자, ${lines}줄)\n` +
        `→ 출처: ${url || "(직접 입력)"} ${topicHint ? `| 주제 힌트: ${topicHint}` : ""}\n` +
        `→ 키워드: ${keywords.join(" · ") || "(키워드 추출 실패 — 원문 짧음)"}\n` +
        `→ 미리보기: ${truncate(article.replace(/\s+/g, " "), 180)}\n` +
        `→ 분류: 사실 신호 ${factMarkers} vs 주장 신호 ${opinionMarkers} → 사실 비중 약 ${factRatio}% (${factRatio >= 60 ? "사실 중심" : factRatio >= 40 ? "혼합" : "주장/전망 중심"})\n` +
        `${factBlock}\n` +
        `→ 증거 도장 준비: ✅ 사실은 출처 필수, 🔮 추정은 [추정] 표기 — 최종 출력에 증거 도장 블록 삽입 예정\n` +
        `→ 다음층 전달 질문 ${nextQuestions.length}개: ${nextQuestions.join(" | ")}\n` +
        `→ 저장 위치: BrainMemory.errors[${charCount > 2000 ? "장문" : "단문"}] + 1층 지도에 기사 좌표 기록\n` +
        `→ 과거 실패 참고: ${recall || "없음 — 첫 기사라면 1층 오류 천재와 함께 검증 필요"}`,
      0.89,
      ["article-input", "classified", lenLabel, `fact-${factRatio}`],
    );
  }
}
