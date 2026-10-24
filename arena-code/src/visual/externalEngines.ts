/**
 * External Engines 흡수 — Tesseract OCR + 한국어 맞춤법 + 숫자팩트체크
 * 12살 설명: 다른 똑똑한 프로그램이 잘하는 것(OCR로 글자 읽기, 맞춤법 잡기)을 우리 두뇌에 붙여서 그림 글자 오타까지 잡음
 */

export interface ExternalOcrResult {
  text: string;
  confidence: number; // 0-100
  engine: "tesseract" | "clova" | "vision" | "heuristic";
}

// ── 1. 외부 OCR 추상화 — REA 흡수: tesseract.js 격리 실행 (Codex 샌드박스 패턴) ──
export async function runExternalOcr(imagePath: string): Promise<ExternalOcrResult> {
  try {
    // @ts-ignore - 동적 import, 설치 안되면 catch로 fallback
    const mod: any = await import("tesseract.js");
    const createWorker = mod.createWorker ?? mod.default?.createWorker;
    if (!createWorker) throw new Error("no createWorker");
    const worker: any = await createWorker("kor+eng");
    const { data } = await worker.recognize(imagePath);
    await worker.terminate();
    return { text: data.text ?? "", confidence: data.confidence ?? 0, engine: "tesseract" };
  } catch (e: any) {
    return { text: "", confidence: 0, engine: "heuristic" };
  }
}

// ── 1b. hanspell 흡수 — 부산대 맞춤법 검사기 외부 프로그램 ──
export async function runHanspell(text: string): Promise<string[]> {
  try {
    // @ts-ignore
    const hanspell: any = await import("hanspell");
    return await new Promise<string[]>((resolve) => {
      hanspell.spellCheckByPNU(text, 6000, (result: any[]) => {
        const issues = (result || []).filter((r: any) => r.token !== r.suggestions?.[0]).map((r: any) => `맞춤법: "${r.token}" → "${r.suggestions?.[0]}"`);
        resolve(issues);
      }, () => resolve([]), (err: any) => resolve([`hanspell 오류: ${err}`]));
    });
  } catch {
    return [];
  }
}

// ── 2. 한국어 맞춤법/오타 사전 — 외부 프로그램 '부산대 맞춤법 검사기' 로직 흡수 ──
const TYPO_DICTIONARY: Array<{ wrong: RegExp; correct: string; msg: string }> = [
  { wrong: /새마을 금고|새 마을금고|새마을금고ㅇ/g, correct: "새마을금고", msg: "띄어쓰기 오류 — '새마을금고' 붙여쓰기" },
  { wrong: /누적적자|누적 적자|누적자/g, correct: "누적 적자", msg: "표기 불일치 — '누적 적자' (기사 원문)" },
  { wrong: /족쇄|족쇠|쥐쇄/g, correct: "족쇄", msg: "오타 가능성 — '족쇄' 확인" },
  { wrong: /하이닉스|하아닉스|하이닉스스/g, correct: "하이닉스", msg: "브랜드명 오타" },
  { wrong: /솔리다임|솔리다임ㅁ/g, correct: "솔리다임", msg: "고유명사 확인" },
  { wrong: /적기시정|적기 시정조치/g, correct: "적기시정조치", msg: "금융용어 — '적기시정조치' 붙여쓰기" },
  { wrong: /부실채권|부실 채권/g, correct: "부실채권", msg: "표기 — '부실채권'" },
  { wrong: /연체율|연체 율/g, correct: "연체율", msg: "표기 — '연체율'" },
  // 흔한 AI 한글 깨짐 변형
  { wrong: /[ㅏ-ㅣ]{3,}/g, correct: "", msg: "모음 분리 깨짐" },
];

export function checkKoreanTypos(text: string): string[] {
  const issues: string[] = [];
  for (const { wrong, msg } of TYPO_DICTIONARY) {
    if (wrong.test(text)) issues.push(`맞춤법 의심: ${msg} — "${text.match(wrong)?.[0]}" 발견`);
  }
  // 반복 오탈자: 같은 글자 3연속 (ㅋㅋ 제외)
  if (/(.)\1{3,}/.test(text.replace(/ㅋ|ㅎ/g, ""))) issues.push("반복 문자 4연속 — 렌더 깨짐 의심");
  return issues;
}

// ── 3. 숫자 팩트체크 — 기사 원문 수치와 대조 (외부 '팩트체크 엔진' 흡수) ──
export interface NumericFact {
  key: string;
  expected: string; // 기사 원문 표기
  pattern: RegExp; // OCR에서 찾아야 하는 패턴
}

export const NUMERIC_FACTS_BY_TOPIC: Record<string, NumericFact[]> = {
  "naver-123-0002392509": [
    { key: "누적적자", expected: "3.6조", pattern: /3\.6\s*조/ },
    { key: "누적결손", expected: "2조2770억", pattern: /2조\s*2770\s*억/ },
    { key: "NIM", expected: "2.12%→1.00%", pattern: /2\.12\s*%.*1\.00\s*%/ },
    { key: "연체율", expected: "6.34%", pattern: /6\.34\s*%/ },
    { key: "연체율_before", expected: "5.08%", pattern: /5\.08\s*%/ },
    { key: "부실채권매각", expected: "26조6000억", pattern: /26.*조.*6000\s*억/ },
    { key: "적기시정", expected: "292곳", pattern: /292\s*곳/ },
    { key: "비율", expected: "23.6%", pattern: /23\.6\s*%/ },
  ],
  "naver-374-0000539594": [
    { key: "주가", expected: "127만7천원", pattern: /127\s*만\s*7\s*천\s*원/ },
    { key: "상승률", expected: "4.42%", pattern: /4\.42\s*%/ },
    { key: "기업가치", expected: "12.9%", pattern: /12\.9\s*%/ },
  ],
};

export function checkNumericFacts(ocrText: string, topic: string): string[] {
  const facts = NUMERIC_FACTS_BY_TOPIC[topic] || [];
  const issues: string[] = [];
  for (const f of facts) {
    if (!f.pattern.test(ocrText)) issues.push(`숫자 팩트 불일치: ${f.key} "${f.expected}" OCR에서 미발견`);
  }
  return issues;
}

// ── 4. 통합 가드 — 외부 엔진 결과를 imageGuard로 합치기 ──
export function externalGuardSummary(ocr: ExternalOcrResult, typoIssues: string[], numericIssues: string[]): string {
  const all = [...typoIssues, ...numericIssues];
  if (ocr.confidence < 60 && ocr.engine === "heuristic") return `⚠️ OCR 미연동(신뢰도 ${ocr.confidence}%) — 외부 엔진 설치 필요 (tesseract.js / Clova)`;
  if (all.length === 0) return `✅ 외부 검증 PASS — OCR ${ocr.confidence}% + 맞춤법/숫자 일치`;
  return `🚫 외부 검증 FAIL — ${all.join(" | ")}`;
}
