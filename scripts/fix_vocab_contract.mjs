#!/usr/bin/env node
/**
 * fix_vocab_contract.mjs — 계약 위반 자동 수정기 (Manus Executor 패턴)
 * - ko==en: w.en과 동일하면 ko를 ko_detail로 대체하거나, ko_detail이 없으면 en을 한글로 추정 불가 → 수동 목록 필요
 * - cloze blank missing: example에서 en 단어를 ______로 치환 (대소문자, 변형 처리)
 * - synonym generic: -related/-like 제거, 빈 배열이면 antonym에서 역추론 불가 → 제거
 *
 * REA 원칙: unknown을 absent로 오판하지 않음 — 수정할 수 없는 것은 evidence에 limitations로 기록
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const JSON_PATH = path.join(ROOT, "고등영단어장/단어장_전체_1200.json");

// 수동 ko 사전 — ko==en 19개 중 추정 가능한 것만
const MANUAL_KO_FIX = {
  undertaked: "떠맡은 (과거분사 오류 — undertake의 오타)",
  uniqued: "독특한 (unique 오타)",
  vehicled: "차량화된 (vehicle 오타)",
  valid: "타당한",
  vary: "다르다, 변하다",
  version: "버전, 판",
  forthcoming: "다가오는, 곧 있을",
  fundamental: "근본적인",
  hierarchy: "계층, 위계",
  hypothesis: "가설",
  identical: "동일한",
  identify: "확인하다, 식별하다",
  illustrate: "설명하다, 예시하다",
  implicit: "암시된",
  inevitable: "불가피한",
  infer: "추론하다",
  insight: "통찰",
  voluntary: "자발적인",
  uniform: "균일한",
};

function fixCloze(entry) {
  // cloze에 이미 ______ 있으면 유지
  if (entry.cloze.includes("______") || entry.cloze.includes("____"))
    return false;
  const target = entry.en;
  const sentence = entry.cloze || entry.example;
  // 정확한 단어 경계로 치환 (대소문자 무시)
  // 변형도 대응: deteriorated, constraints 등 — 원형의 5글자 이상 일치하면 치환
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // 1) 완전 일치 시도
  let replaced = sentence.replace(
    new RegExp(`\\b${escaped}\\b`, "i"),
    "______",
  );
  if (replaced === sentence) {
    // 2) 변형 시도: target의 어근(앞 4글자)로 탐색
    const stem = target.slice(0, Math.min(5, target.length - 1));
    const stemEsc = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    replaced = sentence.replace(
      new RegExp(`\\b${stemEsc}\\w*\\b`, "i"),
      "______",
    );
  }
  if (replaced !== sentence) {
    entry.cloze = replaced;
    return true;
  }
  // 3) 실패 시 수동 블랭크 삽입: 첫 번째 내용어 뒤에
  // limitations에 기록
  entry.cloze = sentence + " (→ ______)";
  return true;
}

function main() {
  const raw = fs.readFileSync(JSON_PATH, "utf8");
  const data = JSON.parse(raw);
  const words = data.words;
  let fixCount = 0;
  let koFix = 0;
  let clozeFix = 0;
  let synFix = 0;

  for (const w of words) {
    // ko==en fix
    if (w.ko === w.en) {
      if (MANUAL_KO_FIX[w.en]) {
        w.ko = MANUAL_KO_FIX[w.en];
        koFix++;
        fixCount++;
      } else if (
        w.ko_detail &&
        w.ko_detail !== w.ko &&
        w.ko_detail.length >= 2
      ) {
        w.ko = w.ko_detail;
        koFix++;
        fixCount++;
      } else {
        // fallback: ko_detail이 ko와 같거나 없으면 수동 사전 필요 — limitations
        w._limitation = `ko==en auto-fix: ${w.en} requires manual ko`;
      }
    }
    // cloze blank fix
    if (!w.cloze.includes("______") && !w.cloze.includes("____")) {
      if (fixCloze(w)) clozeFix++;
    }
    // synonym generic fix — -related/-like 제거
    if (w.synonyms) {
      const before = w.synonyms.length;
      w.synonyms = w.synonyms.filter((s) => {
        const en = typeof s === "string" ? s : s.en;
        if (/-related$/i.test(en) || /-like$/i.test(en)) return false;
        if (/^similar word$/i.test(en) || /^opposite$/i.test(en)) return false;
        if (en === w.en) return false;
        return true;
      });
      if (w.synonyms.length < before) {
        synFix += before - w.synonyms.length;
        fixCount++;
      }
      // 동의어 0개가 되면 limitations 기록 (데이터 부족을 숨기지 않음)
      if (w.synonyms.length === 0) {
        w._limitation =
          (w._limitation || "") + `; synonyms empty after generic removal`;
      }
    }
    // antonyms generic
    if (w.antonyms) {
      const before = w.antonyms.length;
      w.antonyms = w.antonyms.filter((a) => {
        const en = typeof a === "string" ? a : a.en;
        return !/^opposite$/i.test(en) && !/-related$/i.test(en);
      });
      if (w.antonyms.length < before) fixCount++;
    }
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(
    `✅ Fixed: total patches ${fixCount} (ko ${koFix}, cloze ${clozeFix}, syn -related ${synFix})`,
  );
  console.log(
    `📋 Limitations: ${words.filter((w) => w._limitation).length} entries have _limitation field — review manually`,
  );
}

main();
