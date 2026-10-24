/**
 * Image Guard — 3바퀴 룰: 생성 → OCR 검증 → 재시도 (PhD+Nobel 검증)
 * 왜 필요한가: 화가(외부 이미지 생성 AI)는 글자를 삐뚤게 그릴 수 있다 — 두뇌가 글로는 잡아도 그림 글자는 못 본다
 * 해결: 만든 이미지를 OCR로 다시 읽어(눈으로 확인) 깨짐이 있으면 사람에게 보이기 전에 자동 재생성 — 1929 게이트처럼 "모르면 보류"
 */

export interface ImageGuardResult {
  ok: boolean;
  score: number; // 0~100
  issues: string[];
  ocrText: string; // OCR로 읽은 글자 (없으면 빈 문자열)
  retryNeeded: boolean;
  blocked: boolean; // 사람에게 보이면 안 되는 수준
}

// ── 깨짐 패턴 (휴리스틱) ──
const BROKEN_PATTERNS: Array<{ re: RegExp; msg: string }> = [
  { re: /[\uFFFD□◇]/, msg: "깨진 글자(□/◇) 발견 — 폰트/인코딩 실패" },
  { re: /[ㄱ-ㅎㅏ-ㅣ]{2,}/, msg: "분리된 자모(ㄱㄴ·ㅏㅣ) — 한글 조합 실패" },
  {
    re: /靑.*면밀|靑.*주시/,
    msg: "한자 靑 단독 사용 — '청와대' 한글로 통일 필요 (과거 깨짐 사례)",
  },
  {
    re: /[A-Z]{5,}/,
    msg: "영문 대문자 5연속 — 한글 문맥에서 깨짐 의심 (OCR 오독)",
  },
];

const REQUIRED_KEYWORDS_BY_TOPIC: Record<string, string[]> = {
  "naver-0016398151": ["김정은", "방중", "청와대", "라오닝", "단둥", "신압록강", "APEC"],
  "naver-123-0002392509": ["새마을금고", "누적", "3.6조", "292곳", "연체율", "부실채권"],
  "naver-374-0000539594": ["SK하이닉스", "솔리다임", "중복상장", "127만", "4.42%"],
};

export function checkBrokenHangul(text: string): string[] {
  const issues: string[] = [];
  for (const { re, msg } of BROKEN_PATTERNS)
    if (re.test(text)) issues.push(msg);
  // 불완전 한글 음절: U+AC00~D7A3 외 한글 자모가 섞이면 깨짐
  const hangulSyllables = (text.match(/[가-힣]/g) || []).length;
  const jamoAlone = (text.match(/[ㄱ-ㅎㅏ-ㅣ]/g) || []).length;
  if (hangulSyllables > 5 && jamoAlone > hangulSyllables * 0.3)
    issues.push(`자모 비율 과다(${jamoAlone}/${hangulSyllables}) — 조합 깨짐`);
  return issues;
}

export function checkMissingKeywords(
  ocrText: string,
  expected: string[],
): string[] {
  const missing = expected.filter((k) => !ocrText.includes(k));
  return missing.map(
    (k) => `핵심 키워드 누락: "${k}" — OCR 미인식 또는 미표기`,
  );
}

export function checkPersonMismatch(
  expectedPerson: string,
  ocrText: string,
): string[] {
  // 기사 속 인물(리창) vs 그림 인물(시진핑) 대조 — PhD ethics/review가 지적한 사실 오류
  if (
    expectedPerson === "리창" &&
    /시진핑/.test(ocrText) &&
    !/리창/.test(ocrText)
  )
    return [
      `인물 불일치: 기사는 리창 총리인데 그림 OCR에 시진핑만 있음 — 시진핑 미확인 원칙 위반`,
    ];
  if (expectedPerson === "리창" && !/리창/.test(ocrText))
    return [`인물 누락: 리창 총리 표기 없음 — 사실 분리 필요`];
  return [];
}

/**
 * verifyImageText — OCR 텍스트(또는 휴리스틱 텍스트)를 받아 3바퀴 판정
 * @param ocrText — OCR로 읽은 글자 (없으면 prompt 기반 휴리스틱으로 대체)
 * @param opts.expectedKeywords — 기사에서 반드시 보여야 할 단어
 * @param opts.expectedPerson — 기사 속 핵심 인물 (사실 체크용)
 */
export async function verifyImageText(
  ocrText: string,
  opts: {
    expectedKeywords?: string[];
    expectedPerson?: string;
    topic?: string;
  } = {},
): Promise<ImageGuardResult> {
  const issues: string[] = [];
  const expected =
    opts.expectedKeywords ??
    (opts.topic ? (REQUIRED_KEYWORDS_BY_TOPIC[opts.topic] ?? []) : []);

  // 1) 깨짐 패턴
  issues.push(...checkBrokenHangul(ocrText));

  // 2) 핵심 키워드 누락 — 깨진 글자는 OCR 자체가 키워드를 못 읽음
  if (expected.length) issues.push(...checkMissingKeywords(ocrText, expected));

  // 3) 인물 불일치 (사실 오류)
  if (opts.expectedPerson)
    issues.push(...checkPersonMismatch(opts.expectedPerson, ocrText));

  // 4) 외부 엔진: 맞춤법/숫자 검증 흡수 (부산대 검사기 + 팩트체크 엔진)
  try {
    // 동적 흡수 — 외부 엔진 없으면 조용히 스킵
    const ext = await import("./externalEngines.js");
    issues.push(...ext.checkKoreanTypos(ocrText));
    if (opts.topic) issues.push(...ext.checkNumericFacts(ocrText, opts.topic));
  } catch {
    // 외부 엔진 미설치 시 휴리스틱만 유지
  }

  // 5) 너무 짧으면 OCR 실패로 간주
  if (ocrText.trim().length < 10)
    issues.push("OCR 텍스트 10자 미만 — 이미지 품질 낮거나 OCR 실패");

  const blocked = issues.some((i) => /깨진|인물 불일치|누락/.test(i));
  const score = Math.max(
    0,
    100 - issues.length * 25 - (ocrText.length < 20 ? 20 : 0),
  );
  return {
    ok: issues.length === 0,
    score,
    issues,
    ocrText,
    retryNeeded: issues.length > 0,
    blocked: blocked || score < 60,
  };
}

// ── 3바퀴 래퍼: 생성 → 검증 → 재시도 (최대 3회) ──
export interface GuardedGenerateOpts {
  topic?: string;
  expectedKeywords?: string[];
  expectedPerson?: string;
  maxRetries?: number; // 3
  onRetry?: (attempt: number, result: ImageGuardResult) => void;
}

/**
 * guardedGenerate — 이미지 생성 함수가 깨진 글자를 내면 자동 재생성
 * @param generateFn — 실제 그림 그리는 함수: (attempt: number) => Promise<{ imagePath: string; ocrText: string }>
 *   ocrText는 생성 직후 OCR로 읽은 값 (없으면 빈 문자열로 휴리스틱만)
 * @returns 최종 guard 결과 + 최종 이미지 경로
 *
 * 사용 예:
 * const { finalPath, finalResult } = await guardedGenerate(async (attempt)=> {
 *   const path = await generate_image({ file_path: `images/card_${attempt}.jpg`, prompt, offer_options: false });
 *   const ocr = await runOCR(path); // tesseract 등
 *   return { imagePath: path, ocrText: ocr };
 * }, { topic: "naver-0016398151", expectedPerson: "리창", maxRetries: 3 });
 */
export async function guardedGenerate(
  generateFn: (
    attempt: number,
  ) => Promise<{ imagePath: string; ocrText: string }>,
  opts: GuardedGenerateOpts = {},
): Promise<{
  finalPath: string;
  finalResult: ImageGuardResult;
  attempts: number;
  logs: string[];
}> {
  const maxRetries = opts.maxRetries ?? 3;
  const logs: string[] = [];
  let lastResult: ImageGuardResult | null = null;
  let lastPath = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { imagePath, ocrText } = await generateFn(attempt);
    lastPath = imagePath;
    const result = await verifyImageText(ocrText, {
      expectedKeywords: opts.expectedKeywords,
      expectedPerson: opts.expectedPerson,
      topic: opts.topic,
    });
    lastResult = result;
    logs.push(
      `🎨 ${attempt}회 생성 → OCR ${ocrText.length}자, 점수 ${result.score}/100, 이슈 ${result.issues.length}개${result.blocked ? " → 차단" : result.ok ? " → 통과" : " → 재시도"}`,
    );
    if (result.ok) {
      logs.push(`✅ ${attempt}회차 PASS — 사람에게 공개`);
      return {
        finalPath: imagePath,
        finalResult: result,
        attempts: attempt,
        logs,
      };
    }
    if (attempt < maxRetries) {
      logs.push(
        `↩️ ${result.issues.join(" | ")} → 프롬프트 보정 후 ${attempt + 1}회차 재생성`,
      );
      opts.onRetry?.(attempt, result);
    } else {
      logs.push(
        `⚠️ ${maxRetries}회 모두 실패 → 사람에게 차단, 5층 에스컬레이션 (1929 게이트처럼 "모르면 보류")`,
      );
    }
  }
  return {
    finalPath: lastPath,
    finalResult: lastResult!,
    attempts: maxRetries,
    logs,
  };
}

// 12살 설명 로그
export function guardSummary(result: ImageGuardResult): string {
  if (result.ok)
    return `✅ 그림 글씨가 깨끗해요! ${result.score}점 — 사람에게 보여줘도 돼요`;
  if (result.blocked)
    return `🚫 그림 글씨가 깨졌어요 — ${result.issues[0]} → 사람에게 안 보여주고 다시 그려요 (점수 ${result.score})`;
  return `⚠️ 그림에 아쉬운 점 — ${result.issues.join(", ")} (점수 ${result.score}) → 고쳐서 다시 그려요`;
}
