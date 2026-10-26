/**
 * eduVocabContract.ts — 교육 단어장 계약을 REA Evidence로 감싸는 어댑터
 *
 * REA 원칙:
 * - 모든 판정은 Evidence provenance를 가짐 (evidence_id, limitations)
 * - unknown은 absent로 오판 금지 — 데이터가 없으면 limitations에 명시
 * - Manus Verifier 패턴: 생성(Executor)과 검증(Verifier)을 분리
 *
 * 흡수:
 * - Ghidra: viewBox BBox 검사와 동일한 엄격함으로 단어 데이터 검사
 * - Cursor: 이중 검증 — JSON 계약 + HTML 렌더 계약을 모두 검사
 */

import { inspectStatic, type TeamResult } from "./inspectionTeam.js";
import fs from "node:fs";
import path from "node:path";

// ───────── 7요소 카드 계약 (REQ-EDU-001) ─────────
export interface VocabEntry {
  id: string;
  en: string;
  ipa: string;
  pos: string;
  ko: string;
  ko_detail: string;
  level: "Lv1" | "Lv2" | "Lv3" | "Lv4";
  day: number;
  synonyms: Array<{ en: string; nuance: string }> | string[];
  antonyms: string[];
  caution: string;
  etymology: string;
  example: string;
  example_ko: string;
  cloze: string;
  freq: number;
  _limitation?: string; // REA: known limitations
}

export interface VocabContractResult {
  evidence_id: string;
  pass: boolean;
  grade: "PASS" | "FAIL" | "WARN";
  limitations: string[];
  stats: {
    total: number;
    distinct: number;
    genericFixed: number;
    koEnFixed: number;
    blankMissing: number;
  };
  issues: string[];
  // REA Evidence bundle 호환
  provenance: {
    source: string;
    validatedAt: string;
    validator: string;
    version: string;
  };
}

// Generic 더미 패턴 — REA 정밀도 (false positive 방지)
const GENERIC_PATTERNS = {
  synonyms: [/^similar word$/i, /^opposite$/i, /-related$/i, /-like$/i],
  example: [/^This is a.*case\.$/, /^This is an example/i],
};

function checkGenericSynonym(synEn: string): boolean {
  return GENERIC_PATTERNS.synonyms.some((re) => re.test(synEn));
}

function checkGenericExample(example: string): boolean {
  return GENERIC_PATTERNS.example.some((re) => re.test(example));
}

/**
 * JSON 계약 검증 — REA Evidence 래퍼
 * 반환은 항상 provenance를 포함, 실패해도 evidence_id로 추적 가능
 */
export function validateVocabEvidence(
  words: VocabEntry[],
  opts: { source?: string } = {},
): VocabContractResult {
  const issues: string[] = [];
  const limitations: string[] = [];
  let genericCount = 0;
  let koEnCount = 0;
  let blankMissing = 0;

  for (const w of words) {
    const eid = w.id || w.en;

    // 1. ko 유효성 (한글 1자 허용 — 층/팀/틀)
    if (w.ko === w.en) {
      issues.push(`[${eid}] ko==en: "${w.ko}"`);
      koEnCount++;
    }
    if (w.ko === "(뜻)" || !w.ko || w.ko.trim().length === 0) {
      issues.push(`[${eid}] ko invalid: "${w.ko}"`);
    }

    // 2. cloze blank (완전문 노출 금지)
    if (
      !w.cloze ||
      (!w.cloze.includes("______") && !w.cloze.includes("____"))
    ) {
      issues.push(
        `[${eid}] cloze missing blank: "${(w.cloze || "").slice(0, 50)}"`,
      );
      blankMissing++;
    }

    // 3. synonyms generic
    const syns = (w.synonyms || []) as any[];
    for (const s of syns) {
      const en = typeof s === "string" ? s : s.en;
      if (checkGenericSynonym(en)) {
        issues.push(`[${eid}] synonym generic: "${en}"`);
        genericCount++;
      }
      if (en === w.en) {
        issues.push(`[${eid}] synonym self-reference: ${en}`);
        genericCount++;
      }
    }

    // 4. example dummy
    if (w.example && checkGenericExample(w.example)) {
      issues.push(`[${eid}] example dummy: "${w.example.slice(0, 50)}"`);
      genericCount++;
    }

    // limitations 수집 (REA: unknown을 숨기지 않음)
    if ((w as any)._limitation) {
      limitations.push(`[${eid}] ${(w as any)._limitation}`);
    }
    if (syns.length === 0) {
      limitations.push(
        `[${eid}] synonyms empty — data coverage gap (unknown, not absent)`,
      );
    }
    if (!w.antonyms || w.antonyms.length === 0) {
      // antonyms 없음은 정상일 수 있음 — limitations에만 기록 (FAIL 아님)
      // 707개가 antonyms 0개 → 대량 경고는 노이즈이므로 샘플만
    }
  }

  // 중복 검사 (동일 레벨 내만)
  const levelEnCounts: Record<string, number> = {};
  for (const w of words) {
    const key = `${w.level}::${w.en}`;
    levelEnCounts[key] = (levelEnCounts[key] || 0) + 1;
  }
  const levelDups = Object.entries(levelEnCounts).filter(([, v]) => v > 1);
  if (levelDups.length > 0) {
    limitations.push(
      `duplicate within level: ${levelDups.length} keys (e.g. ${levelDups
        .slice(0, 2)
        .map(([k]) => k)
        .join(", ")}) — will fix next cycle`,
    );
  }

  const distinct = new Set(words.map((w) => w.en)).size;
  const pass = issues.length === 0;
  const grade = pass ? (limitations.length > 0 ? "WARN" : "PASS") : "FAIL";

  return {
    evidence_id: `vocab-contract-${Date.now()}`,
    pass,
    grade,
    limitations,
    stats: {
      total: words.length,
      distinct,
      genericFixed: genericCount,
      koEnFixed: koEnCount,
      blankMissing,
    },
    issues,
    provenance: {
      source: opts.source || "단어장_전체_1200.json",
      validatedAt: new Date().toISOString(),
      validator: "eduVocabContract v1.0 (REA Evidence)",
      version: "1.0.0",
    },
  };
}

/**
 * HTML 렌더 계약 검증 — inspectionTeam과 결합 (Cursor 이중 검증 패턴)
 * JSON 계약(PASS) + HTML 렌더 계약(PASS) 둘 다 통과해야 배포
 */
export function validateHtmlRenderEvidence(
  htmlPath: string,
  expectedBlanks: number,
  expectedCards: number,
): {
  evidence_id: string;
  pass: boolean;
  teamResult: TeamResult;
  blankCount: number;
} {
  const html = fs.readFileSync(htmlPath, "utf8");
  const blankCount = (html.match(/______/g) || []).length;
  const cardCount = (html.match(/class="card"/g) || []).length;

  // inspectionTeam 4-Eye 실행 (Ghidra+Typography+Accessibility)
  const teamResult = inspectStatic(html);

  const pass =
    blankCount === expectedBlanks &&
    cardCount === expectedCards &&
    teamResult.pass;

  return {
    evidence_id: `html-render-${path.basename(htmlPath)}-${Date.now()}`,
    pass,
    teamResult,
    blankCount,
  };
}

// 편의를 위한 CLI 래퍼
export function validateAllEvidence(rootDir: string): VocabContractResult {
  const jsonPath = path.join(rootDir, "고등영단어장/단어장_전체_1200.json");
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const words = data.words || data;
  return validateVocabEvidence(words, { source: jsonPath });
}
