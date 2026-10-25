/**
 * Code Review 2축 — Standards + Spec 병렬 리뷰 (Pocock code-review 흡수)
 * REA 원천: mattpocock/skills `code-review/SKILL.md` + `codebase-design` 용어
 * Ghidra 원천: diff를 P-Code IR처럼 호출 그래프 관점에서 스캔 — shallow/shotgun 탐지
 *
 * 12살: 숙제 검사를 두 선생님이 따로 한다 — 한 분은 글씨체(규칙), 한 분은 문제 이해(스펙)
 */

export type ReviewAxis = "Standards" | "Spec";
export type Severity = "hard" | "judgement";
export interface ReviewFinding {
  axis: ReviewAxis;
  rule: string;          // 예: "Fowler:Duplicated Code" 또는 "CODING_STANDARDS.md:3.2"
  severity: Severity;
  location: string;      // file:hunk hint
  quote: string;         // diff 발췌
  fix: string;           // 어떻게 고치는지 1줄
  specLine?: string;     // Spec 축이면 원문 인용
}
export interface ReviewReport {
  fixedPoint: string;
  diff: string;
  standards: ReviewFinding[];
  spec: ReviewFinding[];
  summary: string;       // "Standards 2 / Spec 1 — worst: Duplicated Code in src/a.ts"
}

// ── Fowler 12 smell baseline (Pocock이 SKILL.md에 고정한 리스트) ──
export const SMELL_BASELINE: Array<{ name: string; fix: string; pattern: RegExp; desc: string }> = [
  { name: "Mysterious Name", fix: "rename it; if no honest name comes, design is murky", pattern: /\b(tmp|data|info|obj2?|x1)\b\s*[=:]/, desc: "이름이 무엇을 하는지 드러내지 않음" },
  { name: "Duplicated Code", fix: "extract shared shape, call from both", pattern: /TODO.*duplicated|copy.*paste/i, desc: "같은 로직이 두 곳에 반복" },
  { name: "Feature Envy", fix: "move method onto data it envies", pattern: /\.inner\.data|\.payload\.value/, desc: "남의 데이터를 자신보다 많이 만짐" },
  { name: "Data Clumps", fix: "bundle into one type", pattern: /\(a:\s*string,\s*b:\s*string,\s*c:\s*string\)/, desc: "같은 필드 묶음이 같이 다님" },
  { name: "Primitive Obsession", fix: "give concept own small type", pattern: /phone.*string|email.*string/i, desc: "도메인 개념을 string으로 방치" },
  { name: "Repeated Switches", fix: "replace with polymorphism or shared map", pattern: /switch\s*\(type\)[\s\S]*?switch\s*\(type\)/, desc: "같은 switch가 두 곳에 반복" },
  { name: "Shotgun Surgery", fix: "gather what changes together", pattern: /edited in 3\+ files for one reason/i, desc: "한 논리 변경이 여러 파일에 흩어짐" },
  { name: "Divergent Change", fix: "split so each module changes for one reason", pattern: /handles.*and.*also handles/i, desc: "한 모듈이 여러 이유로 바뀜" },
  { name: "Speculative Generality", fix: "delete until real need shows", pattern: /abstract.*Factory.*unused|TODO.*future/i, desc: "스펙 없는 추상화" },
  { name: "Message Chains", fix: "hide walk behind one method", pattern: /a\.b\(\)\.c\(\)\.d\(\)/, desc: "긴 a.b().c().d() 탐색 체인" },
  { name: "Middle Man", fix: "cut and call target direct", pattern: /class\s+\w+Delegator[\s\S]*?return\s+this\.inner\./, desc: "대리만 하는 클래스" },
  { name: "Refused Bequest", fix: "use composition over inheritance", pattern: /extends\s+\w+[\s\S]*?override.*super\./, desc: "상속받고 대부분 무시" },
];

// ── Standards 축: 문서 규칙 + smell baseline ──
export function runStandardsReview(diff: string, standardsDocs: string[] = []): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  // 1) repo 문서 기반(간단: diff에 금지 패턴이 있으면) — 실제에선 파일을 읽어 비교
  for (const doc of standardsDocs) {
    if (/no\s+console\.log/i.test(doc) && /console\.log/.test(diff)) {
      findings.push({ axis: "Standards", rule: "repo: no console.log", severity: "hard", location: "diff:console.log", quote: diff.slice(diff.indexOf("console.log"), diff.indexOf("console.log")+40), fix: "remove console.log or use logger" });
    }
  }
  // 2) smell baseline — 12종 정규식 스캔 (판단적, hard 아님)
  for (const s of SMELL_BASELINE) {
    const m = diff.match(s.pattern);
    if (m) {
      findings.push({ axis: "Standards", rule: `Fowler:${s.name}`, severity: "judgement", location: `diff:${m[0].slice(0,20)}`, quote: m[0].slice(0,80), fix: s.fix });
    }
  }
  return findings;
}

// ── Spec 축: 스펙 원문이 diff 요구사항을 포함하는지 ──
export function runSpecReview(diff: string, spec: string | null): ReviewFinding[] {
  if (!spec) return []; // spec 없으면 skip — "no spec available"은 호출자가 표시
  const findings: ReviewFinding[] = [];
  const specLines = spec.split("\n").filter(l=>l.trim().length>5).slice(0, 20);
  for (const line of specLines) {
    // 매우 단순: 스펙 키워드가 diff에 전혀 없으면 missing
    const kw = line.split(/\s+/).filter(w=>w.length>4)[0];
    if (kw && !diff.includes(kw) && /must|should|required|필요|구현/i.test(line)) {
      findings.push({ axis: "Spec", rule: "missing requirement", severity: "hard", location: `spec:"${line.slice(0,40)}"`, quote: diff.slice(0,60), fix: `스펙 "${line.slice(0,40)}"을 diff에서 찾을 수 없음 — 구현 누락`, specLine: line });
    }
  }
  // scope creep: diff에만 있고 스펙에 없는 함수 추가 휴리스틱
  const diffFuncs = [...diff.matchAll(/function\s+(\w+)/g)].map(m=>m[1]);
  for (const fn of diffFuncs) {
    if (fn && !spec.includes(fn) && /experimental|bonus|extra/i.test(fn)) {
      findings.push({ axis: "Spec", rule: "scope creep", severity: "judgement", location: `diff:function ${fn}`, quote: `function ${fn}`, fix: "스펙에 없는 동작 — 별도 이슈로 분리", specLine: undefined });
    }
  }
  return findings;
}

export function codeReview(diff: string, opts: { fixedPoint: string; spec?: string | null; standardsDocs?: string[] }): ReviewReport {
  if (!opts.fixedPoint) throw new Error("fixedPoint required — diff base must be pinned (git diff <fixed>...HEAD)");
  if (!diff.trim()) throw new Error("empty diff — bad ref or no changes");
  const standards = runStandardsReview(diff, opts.standardsDocs ?? []);
  const spec = runSpecReview(diff, opts.spec ?? null);
  const worst = (arr: ReviewFinding[]) => arr[0]?.rule ?? "none";
  const summary = `Standards ${standards.length} / Spec ${spec.length} — worst Standards: ${worst(standards)} / worst Spec: ${worst(spec)}`;
  return { fixedPoint: opts.fixedPoint, diff, standards, spec, summary };
}

// 두 축이 분리된 이유(리랭킹 방지)를 문자열로 반환 — 문서용
export function whyTwoAxes(): string {
  return "Standards=built right? / Spec=right thing? — 하나가 통과해도 다른 하나가 실패할 수 있어 합치면 가려짐. Pocock 원전 §Why two axes";
}
