/**
 * Guard — Phase H5 (GPT-6 Astra inspiration)
 * 환각/허위 생성 탐지: Harness² 원본은 검증 3원칙만 있었지만,
 * GPT-6 Astra는 환각 92%→51%로 줄였다. 우리는 harness 레벨에서
 * 가드 플러그인으로 보완한다.
 *
 * 검사는 결정적 휴리스틱 (LLM 없이) — 나중에 LLM judge로 고도화 가능
 *
 * 12살 설명: 숙제 검수 선생님!
 * 새로 만든 레시피에 "마법 가루" 같은 없는 재료를 썼는지 확인하는 것
 */

import type { Tree } from "./harness.js";
import { ARENA_SURFACE, skillNames } from "./harness.js";

export interface GuardReport {
  ok: boolean;
  issues: string[];
  warnings: string[];
  checkedAt: string;
}

// 검사 규칙
const HALLUCINATION_PATTERNS: Array<{ re: RegExp; msg: string; severity: "issue" | "warning" }> = [
  { re: /\bTODO\b|\bFIXME\b|\bTBD\b/, msg: "placeholder TODO/FIXME/TBD가 harness에 남음 — 미완성", severity: "issue" },
  { re: /\{\{|\}\}/, msg: "Jinja 템플릿 괄호 {{ }} 잔존 — 파싱 파괴", severity: "issue" },
  { re: /lorem ipsum/i, msg: "lorem ipsum 더미 텍스트", severity: "issue" },
  // 존재하지 않는 스크립트 참조는 harness.ts validate가 이미 잡지만, 가드에서도 이중 체크
  { re: /python3?\s+scripts\/[\w.-]+\.py/, msg: "scripts/ 참조 — 실물 존재 여부 별도 검증 필요", severity: "warning" },
  { re: /https?:\/\/[^\s]+/g, msg: "URL 포함 — 외부 참조는 검증 필요 (나중에)", severity: "warning" },
];

const ALWAYS_ON_BUDGET_RATIO = 0.8; // always-on이 예산의 80% 넘으면 경고

// Fowler 냄새 — Standards 축에서 추가 검사 (Matt Pocock 2축 리뷰 기반)
const FOWLER_PATTERNS: Array<{ re: RegExp; msg: string; severity: "issue" | "warning" }> = [
  { re: /\bany\b/, msg: "Fowler smell: any 타입 남용 — 구체 타입 필요", severity: "warning" },
  { re: /:\s*any\s*[,)>\]]/, msg: "Fowler smell: : any 시그니처", severity: "warning" },
];

export interface TwoAxisReport {
  standards: GuardReport;
  spec: GuardReport;
  combined: GuardReport;
  verdict: "PASS" | "WARN" | "FAIL";
  meta: { baseRef?: string; hasCodingStandards: boolean; specProvided: boolean };
}

function loadCodingStandards(tree: Tree, standardsPath = "CODING_STANDARDS.md"): string | null {
  return tree[standardsPath] ?? null;
}

function checkStandardsAxis(tree: Tree, opts?: { standardsPath?: string }): GuardReport {
  const issues: string[] = [];
  const warnings: string[] = [];
  const allText = Object.values(tree).join("\n\n");

  // 기본 패턴 + Fowler
  const patterns = [...HALLUCINATION_PATTERNS, ...FOWLER_PATTERNS];
  for (const { re, msg, severity } of patterns) {
    const testRe = new RegExp(re.source, re.flags.replace("g", ""));
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags);
    if (testRe.test(allText)) {
      if (re.source.includes("https?")) {
        const matches = allText.match(globalRe);
        if (matches && matches.length > 2) {
          (severity === "issue" ? issues : warnings).push(`${msg}: ${matches.length}개 발견 — ${matches.slice(0, 2).join(", ")}...`);
        } else if (matches) warnings.push(`${msg}: ${matches[0]}`);
        continue;
      }
      (severity === "issue" ? issues : warnings).push(msg);
    }
  }

  // skill 검증 (기존과 동일)
  for (const name of skillNames(ARENA_SURFACE, tree)) {
    const content = tree[`skills/${name}/SKILL.md`] ?? "";
    if (!/^name:\s*\S+/m.test(content)) warnings.push(`skill "${name}"에 frontmatter name 없음`);
    const descM = /^description:\s*(.+)$/m.exec(content);
    if (!descM || descM[1].trim().length < 10) warnings.push(`skill "${name}" description이 너무 짧거나 없음`);
    if (content.length < 50) warnings.push(`skill "${name}" 본문이 너무 짧음 (${content.length} chars)`);
  }

  // CODING_STANDARDS.md 존재 여부
  const standardsContent = loadCodingStandards(tree, opts?.standardsPath);
  if (!standardsContent) {
    warnings.push(`Standards: WARN — CODING_STANDARDS.md 없음 (기본 Fowler 기준만 적용)`);
  } else {
    // 간단한 규칙 위반 검사: CODING_STANDARDS.md에 bullet 규칙이 있으면, 그 키워드가 위반됐는지 휴리스틱
    const rules = standardsContent.split("\n").filter((l) => l.trim().startsWith("-") || l.trim().startsWith("*"));
    if (rules.length > 0 && /no any/i.test(standardsContent) && /\bany\b/.test(allText)) {
      warnings.push(`Standards: CODING_STANDARDS.md 규칙 위반 — "no any" 규칙에도 any 사용`);
    }
  }

  // always-on 예산
  const alwaysOnLen = ARENA_SURFACE.alwaysOn.map((a) => tree[a] ?? "").join("\n\n").length;
  if (alwaysOnLen > ARENA_SURFACE.alwaysOnMax * ALWAYS_ON_BUDGET_RATIO) {
    warnings.push(`always-on 텍스트가 예산의 ${Math.round((alwaysOnLen / ARENA_SURFACE.alwaysOnMax) * 100)}% 사용 (${alwaysOnLen}/${ARENA_SURFACE.alwaysOnMax}) — skill로 분리 고려`);
  }
  if (alwaysOnLen > ARENA_SURFACE.alwaysOnMax) {
    issues.push(`always-on 초과: ${alwaysOnLen} > ${ARENA_SURFACE.alwaysOnMax} (매 토큰 비용 폭증)`);
  }

  return { ok: issues.length === 0, issues, warnings, checkedAt: new Date().toISOString() };
}

function checkSpecAxis(tree: Tree, spec?: string): GuardReport {
  if (!spec || !spec.trim()) {
    return { ok: true, issues: [], warnings: ["Spec: WARN — spec 없음 — Standards만 검토"], checkedAt: new Date().toISOString() };
  }
  const issues: string[] = [];
  const warnings: string[] = [];
  const allText = Object.values(tree).join("\n\n").toLowerCase();
  const specLower = spec.toLowerCase();
  // 토큰화 (간단)
  const STOP = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","is","are","was","were","be","been","this","that","it","as","by","from","has","have","had","will","would","can","should","could","may","will","you","your","our","we","us","they","them","their","its","if","then","else","when","what","which","how","why","not","no","yes","do","does","did","done"]);
  const tokenize = (t: string) => t.toLowerCase().split(/[^a-z0-9]+/g).filter(w => w.length>=3 && !STOP.has(w));
  const specTokens = tokenize(specLower);
  const treeTokens = new Set(tokenize(allText));
  if (specTokens.length === 0) {
    warnings.push("Spec: WARN — spec 토큰 없음");
    return { ok: true, issues, warnings, checkedAt: new Date().toISOString() };
  }
  const missing = specTokens.filter(tk => !treeTokens.has(tk));
  const overlap = 1 - missing.length / specTokens.length;
  if (overlap < 0.15) {
    issues.push(`Spec: FAIL — spec 불일치: harness가 spec 키워드 ${missing.slice(0,5).join(", ")}를 포함하지 않음 (overlap ${(overlap*100).toFixed(1)}%)`);
  } else if (overlap < 0.4) {
    warnings.push(`Spec: WARN — spec 부분 일치: missing ${missing.slice(0,4).join(", ")} (overlap ${(overlap*100).toFixed(1)}%)`);
  }
  // 간단한 과구현 탐지: tree에 spec에 없는 도메인 키워드가 많으면 경고는 생략 (정밀도 낮음)
  return { ok: issues.length === 0, issues, warnings, checkedAt: new Date().toISOString() };
}

export function guardTwoAxis(tree: Tree, opts?: { spec?: string; standardsPath?: string; baseRef?: string }): TwoAxisReport {
  const standards = checkStandardsAxis(tree, { standardsPath: opts?.standardsPath });
  const spec = checkSpecAxis(tree, opts?.spec);
  const combinedIssues = [...standards.issues, ...spec.issues];
  const combinedWarnings = [...standards.warnings, ...spec.warnings];
  const verdict: TwoAxisReport["verdict"] = combinedIssues.length > 0 ? "FAIL" : combinedWarnings.length > 0 ? "WARN" : "PASS";
  const combined: GuardReport = { ok: combinedIssues.length === 0, issues: combinedIssues, warnings: combinedWarnings, checkedAt: new Date().toISOString() };
  return {
    standards,
    spec,
    combined,
    verdict,
    meta: { baseRef: opts?.baseRef, hasCodingStandards: !!loadCodingStandards(tree, opts?.standardsPath), specProvided: !!opts?.spec?.trim() },
  };
}

export function guardHarness(tree: Tree): GuardReport {
  const issues: string[] = [];
  const warnings: string[] = [];
  const allText = Object.values(tree).join("\n\n");

  for (const { re, msg, severity } of HALLUCINATION_PATTERNS) {
    // g 플래그 있으면 lastIndex 리셋 필요
    const testRe = new RegExp(re.source, re.flags.replace("g", ""));
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags);
    if (testRe.test(allText)) {
      // URL 같은 경우는 개수 세기
      if (re.source.includes("https?")) {
        const matches = allText.match(globalRe);
        if (matches && matches.length > 2) {
          (severity === "issue" ? issues : warnings).push(`${msg}: ${matches.length}개 발견 — ${matches.slice(0,2).join(", ")}...`);
        } else if (matches) {
          warnings.push(`${msg}: ${matches[0]}`);
        }
        continue;
      }
      (severity === "issue" ? issues : warnings).push(msg);
    }
  }

  // skill 검증: SKILL.md에 frontmatter name이 없거나 description이 너무 짧으면 경고
  for (const name of skillNames(ARENA_SURFACE, tree)) {
    const content = tree[`skills/${name}/SKILL.md`] ?? "";
    if (!/^name:\s*\S+/m.test(content)) warnings.push(`skill "${name}"에 frontmatter name 없음`);
    const descM = /^description:\s*(.+)$/m.exec(content);
    if (!descM || descM[1].trim().length < 10) warnings.push(`skill "${name}" description이 너무 짧거나 없음`);
    if (content.length < 50) warnings.push(`skill "${name}" 본문이 너무 짧음 (${content.length} chars)`);
  }

  // always-on 예산 체크
  const alwaysOnLen = ARENA_SURFACE.alwaysOn.map(a => tree[a] ?? "").join("\n\n").length;
  if (alwaysOnLen > ARENA_SURFACE.alwaysOnMax * ALWAYS_ON_BUDGET_RATIO) {
    warnings.push(`always-on 텍스트가 예산의 ${Math.round(alwaysOnLen / ARENA_SURFACE.alwaysOnMax * 100)}% 사용 (${alwaysOnLen}/${ARENA_SURFACE.alwaysOnMax}) — skill로 분리 고려`);
  }
  if (alwaysOnLen > ARENA_SURFACE.alwaysOnMax) {
    issues.push(`always-on 초과: ${alwaysOnLen} > ${ARENA_SURFACE.alwaysOnMax} (매 토큰 비용 폭증)`);
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Guard + 경험 저장 연동용 — harness2 실패 연구와 유사하게
 * guard가 실패하면 대체 전략 힌트 생성
 */
export function guardHint(report: GuardReport): string | null {
  if (report.ok) return null;
  if (report.issues.some(i => i.includes("TODO"))) return "shrink-always-on";
  if (report.issues.some(i => i.includes("Jinja"))) return "shrink-always-on";
  if (report.issues.some(i => i.includes("always-on 초과"))) return "shrink-always-on";
  return "single-candidate-try";
}

// --- Security stage gate (Gap #11: 검사 시점별) — 전 영역 1위 흡수 2026-10-27 ---
// Codex sandbox.rs + Ghidra 문자열 DB + Claude Code permission gate 통합
const SECRET_PATTERNS: Array<{ re: RegExp; msg: string; severity: "critical" | "high" }> = [
  { re: /AKIA[0-9A-Z]{16}/, msg: "AWS Access Key 노출 (AKIA...)", severity: "critical" },
  { re: /aws_secret_access_key\s*[:=]\s*[\"'][^\"']{20,}[\"']/i, msg: "AWS Secret Key 하드코딩", severity: "critical" },
  { re: /ghp_[0-9a-zA-Z]{36,}/, msg: "GitHub PAT 노출 (ghp_)", severity: "critical" },
  { re: /github_pat_[0-9a-zA-Z_]{60,}/, msg: "GitHub Fine-grained PAT 노출", severity: "critical" },
  { re: /gho_[0-9a-zA-Z]{36,}/, msg: "GitHub OAuth Token 노출 (gho_)", severity: "critical" },
  { re: /password\s*[:=]\s*[\"'][^\"']{3,}[\"']/i, msg: "하드코딩 password 의심", severity: "high" },
  { re: /api[_-]?key\s*[:=]\s*[\"'][^\"']+[\"']/i, msg: "하드코딩 api_key 의심", severity: "high" },
  { re: /secret\s*[:=]\s*[\"'][^\"']{4,}[\"']/i, msg: "하드코딩 secret 의심", severity: "high" },
  { re: /BEGIN (RSA |DSA |EC )?PRIVATE KEY/, msg: "Private Key 노출", severity: "critical" },
  { re: /BEGIN OPENSSH PRIVATE KEY/, msg: "OpenSSH Private Key 노출", severity: "critical" },
  { re: /xox[bpras]-[0-9A-Za-z-]{10,}/, msg: "Slack Token 노출 (xox...)", severity: "critical" },
  { re: /https:\/\/discord\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+/, msg: "Discord Webhook 노출", severity: "high" },
  { re: /postgres:\/\/[^\s:]+:[^\s@]+@[^\s]+/i, msg: "Postgres connection string 노출", severity: "critical" },
  { re: /mongodb(\+srv)?:\/\/[^\s:]+:[^\s@]+@[^\s]+/i, msg: "MongoDB connection string 노출", severity: "critical" },
  { re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, msg: "JWT 토큰 하드코딩 의심", severity: "high" },
  { re: /Bearer\s+[A-Za-z0-9._-]{20,}/, msg: "Bearer Token 하드코딩 의심", severity: "high" },
  { re: /rm\s+-rf\s+\//, msg: "위험 명령: rm -rf / (루트 삭제)", severity: "critical" },
  { re: /:\(\)\s*\{\s*:\|\:&\s*\}/, msg: "위험 명령: fork bomb", severity: "critical" },
  { re: /mkfs\./, msg: "위험 명령: mkfs 포맷", severity: "critical" },
];

const WRITE_PATTERNS = [...SECRET_PATTERNS];
const COMMIT_PATTERNS: typeof SECRET_PATTERNS = [
  ...WRITE_PATTERNS,
  { re: /\bTODO\b|\bFIXME\b/, msg: "커밋 단계: TODO/FIXME 잔존", severity: "high" },
  { re: /console\.log\(/, msg: "커밋 단계: console.log 잔존", severity: "high" },
  { re: /debugger;/, msg: "커밋 단계: debugger 잔존", severity: "high" },
];
const PR_PATTERNS: typeof SECRET_PATTERNS = [
  ...COMMIT_PATTERNS,
  { re: /sk-[A-Za-z0-9]{20,}/, msg: "PR 단계: OpenAI Key 노출 (sk-)", severity: "critical" },
  { re: /xai-[A-Za-z0-9]{20,}/, msg: "PR 단계: xAI Key 노출", severity: "critical" },
];
export type SecurityStage = "write" | "commit" | "pr";

export interface SecurityGateReport extends GuardReport {
  blocked: boolean;
  stage: SecurityStage;
  criticalCount: number;
}

export function securityGate(tree: Tree, stage: SecurityStage, opts?: { spec?: string }): SecurityGateReport {
  const issues: string[] = [];
  const warnings: string[] = [];
  const allText = Object.values(tree).join("\n\n");
  let patterns: Array<{ re: RegExp; msg: string; severity: "critical" | "high" }> = [];
  if (stage === "write") patterns = WRITE_PATTERNS;
  else if (stage === "commit") patterns = COMMIT_PATTERNS;
  else patterns = PR_PATTERNS;

  let criticalCount = 0;
  for (const { re, msg, severity } of patterns) {
    if (re.test(allText)) {
      const label = `[${stage}] ${msg}`;
      if (severity === "critical") criticalCount++;
      if (stage === "write") warnings.push(label);
      else {
        if (severity === "critical") issues.push(label);
        else warnings.push(label);
      }
    }
  }

  if (stage === "pr" && opts?.spec) {
    const specReport = checkSpecAxis(tree, opts.spec);
    issues.push(...specReport.issues);
    warnings.push(...specReport.warnings);
  }

  if (stage === "pr") {
    const std = checkStandardsAxis(tree);
    warnings.push(...std.warnings.filter(w => w.includes("Standards") || w.includes("Fowler")));
    if (std.issues.length) issues.push(...std.issues);
  }

  if (stage !== "write" && warnings.length >= 2 && issues.length === 0) {
    const toPromote = warnings.shift()!;
    issues.push(`[promoted] ${toPromote}`);
  }

  const blocked = criticalCount > 0 || issues.length > 0;
  return { ok: issues.length === 0, issues, warnings, checkedAt: new Date().toISOString(), blocked, stage, criticalCount };
}

export function shouldBlockFleetTask(tree: Tree, stage: SecurityStage = "pr"): { block: boolean; reason: string } {
  const report = securityGate(tree, stage);
  if (report.blocked) {
    return { block: true, reason: `SecurityGate blocked: ${report.issues.slice(0,2).join("; ")}${report.criticalCount ? ` (critical:${report.criticalCount})` : ""}` };
  }
  return { block: false, reason: "" };
}

// --- Starlark Policy (Codex sandbox.rs Ghidra 문자열 흡수) — 7.0→8.5 ---
// Starlark 예: deny("no secrets") if "AKIA" in content / allow("read-only") if platform=="macos"
// 경량 파서: `deny("msg") if "pattern" in file` 1줄 평가, 플랫폼 분기 Seatbelt/Landlock/Bubblewrap
export type SandboxPlatform = "darwin" | "linux" | "win32" | "unknown";
export function detectSandboxPlatform(platform: string = process.platform): SandboxPlatform {
  if (platform === "darwin") return "darwin";
  if (platform === "linux") return "linux";
  if (platform === "win32") return "win32";
  return "unknown";
}
export function sandboxForPlatform(p: SandboxPlatform): "Seatbelt" | "Landlock" | "Bubblewrap" | "none" {
  if (p === "darwin") return "Seatbelt";
  if (p === "linux") return "Landlock";
  if (p === "win32") return "Bubblewrap";
  return "none";
}
export interface StarlarkRule { action: "deny" | "allow"; message: string; pattern: string; target: "any" | "file"; verdict: string; }
export function parseStarlarkPolicy(src: string): StarlarkRule[] {
  const rules: StarlarkRule[] = [];
  for (const line of src.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    // deny("msg") if "pat" in content  / allow("msg") if file=="path"
    const m = /(deny|allow)\("([^"]+)"\)\s*if\s+"([^"]+)"\s+in\s+(\w+)/.exec(t);
    if (m) rules.push({ action: m[1] as any, message: m[2], pattern: m[3], target: m[4] as any, verdict: t });
    else {
      const m2 = /(deny|allow)\("([^"]+)"\)/.exec(t);
      if (m2) rules.push({ action: m2[1] as any, message: m2[2], pattern: "*", target: "any", verdict: t });
    }
  }
  return rules;
}
export function enforceStarlarkPolicy(tree: Tree, policySrc: string, platform: SandboxPlatform = detectSandboxPlatform()): { allowed: boolean; violations: string[]; sandbox: string; applied: number } {
  const rules = parseStarlarkPolicy(policySrc);
  const allText = Object.values(tree).join("\n");
  const files = Object.keys(tree);
  const violations: string[] = [];
  let allowed = true;
  for (const r of rules) {
    let hit = false;
    if (r.pattern === "*") hit = true;
    else if (r.target === "any") hit = allText.includes(r.pattern);
    else hit = files.some(f => f.includes(r.pattern)) || allText.includes(r.pattern);
    if (hit && r.action === "deny") { allowed = false; violations.push(`Starlark deny: ${r.message} (pattern "${r.pattern}")`); }
  }
  return { allowed, violations, sandbox: sandboxForPlatform(platform), applied: rules.length };
}

// --- guardThreeRoles — harness2/grill.js 호환 (3-Role Review: correctness / simplicity / compliance) ---
export interface GuardThreeRolesReport {
  verdict: "PASS" | "WARN" | "FAIL";
  correctness: { issues: string[]; warnings: string[] };
  simplicity: { issues: string[]; warnings: string[] };
  compliance: { issues: string[]; warnings: string[] };
  issues: string[];
  warnings: string[];
}
export function guardThreeRoles(tree: Record<string,string>): GuardThreeRolesReport {
  const all = Object.values(tree).join("\n");
  const correctnessIssues: string[] = [];
  const correctnessWarnings: string[] = [];
  const simplicityIssues: string[] = [];
  const simplicityWarnings: string[] = [];
  const complianceIssues: string[] = [];
  const complianceWarnings: string[] = [];
  if (/TODO|FIXME/.test(all)) correctnessIssues.push("TODO/FIXME remaining");
  if (/\bany\b/.test(all)) simplicityWarnings.push("any type usage");
  // skill check
  for (const k of Object.keys(tree)) if (k.startsWith("skills/") && k.endsWith("SKILL.md")) {
    const c = tree[k];
    if (!/^name:\s*\S+/m.test(c)) complianceWarnings.push(`skill ${k} missing name`);
    if ((c.match(/^description:\s*(.+)$/m)?.[1] ?? "").trim().length < 10) complianceWarnings.push(`skill ${k} description too short`);
    if (c.length < 50) complianceWarnings.push(`skill ${k} body too short`);
  }
  const issues = [...correctnessIssues, ...simplicityIssues, ...complianceIssues];
  const warnings = [...correctnessWarnings, ...simplicityWarnings, ...complianceWarnings];
  let verdict: GuardThreeRolesReport["verdict"] = "PASS";
  if (issues.length) verdict = "FAIL";
  else if (warnings.length) verdict = "WARN";
  return {
    verdict,
    correctness: { issues: correctnessIssues, warnings: correctnessWarnings },
    simplicity: { issues: simplicityIssues, warnings: simplicityWarnings },
    compliance: { issues: complianceIssues, warnings: complianceWarnings },
    issues,
    warnings,
  };
}
