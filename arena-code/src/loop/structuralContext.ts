/**
 * Structural Context — 맥락 이해 능력 1단계: import 그래프 + symbol 인덱스
 * 기존 assembleSystemPrompt는 AGENTS.md + git status만 봤음 → 코드 구조 맥락 누락
 * 이 모듈은 cwd에서 핵심 구조 정보를 스캔해 프롬프트에 tiered budget으로 주입
 *
 * 12살 설명: 책의 목차+색인 — 전체를 읽지 않고도 “어디에 뭐가 있는지” 알려줌
 */

import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const exec = promisify(execCb);

export interface StructuralContext {
  topLevelFiles: string[]; // 루트 1depth 주요 파일
  packageInfo?: string; // package.json name/version 요약
  importGraph: string; // 핵심 import 관계 요약 (2000자 이내)
  symbolIndex?: string; // 주요 export/class/function 목록 (선택)
  budgetChars: number;
}

async function getTopLevel(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await exec(`ls -1 ${JSON.stringify(cwd)} 2>&1 | head -n 60`, { timeout: 3000 });
    return stdout.split("\n").filter(Boolean).slice(0, 40);
  } catch { return []; }
}

function getPackageInfo(cwd: string): string | undefined {
  const p = join(cwd, "package.json");
  if (!existsSync(p)) return undefined;
  try {
    const raw = readFileSync(p, "utf-8");
    const j = JSON.parse(raw);
    return `${j.name ?? "unnamed"}@${j.version ?? "?"} — ${(j.description ?? "").slice(0, 120)}`;
  } catch { return undefined; }
}

async function getImportGraph(cwd: string, maxLines = 30): Promise<string> {
  // ripgrep 우선, 없으면 grep fallback — import/from/require 상위 빈도 추출
  try {
    // arena-code와 root src 둘 다 커버: src/, arena-code/src/ 탐색
    const cmd = `rg --no-heading --color never --hidden --glob '!node_modules' --glob '!.git' --glob '!dist' -g '*.ts' -g '*.js' \"^import |^export |from ['\\\"]\" ${JSON.stringify(cwd)} 2>&1 | head -n 300`;
    const { stdout } = await exec(cmd, { cwd, timeout: 5000, maxBuffer: 2 * 1024 * 1024 });
    const lines = stdout.trim().split("\n").filter(Boolean);
    // 빈도 높은 import source만 요약
    const sources = new Map<string, number>();
    for (const l of lines) {
      const m = /from\s+['\"]([^'\"]+)['\"]/.exec(l);
      if (m) sources.set(m[1], (sources.get(m[1]) ?? 0) + 1);
    }
    const top = [...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxLines);
    if (top.length === 0) return lines.slice(0, maxLines).join("\n");
    return top.map(([s, c]) => `  ${s} — ${c} files`).join("\n");
  } catch {
    return "(import graph unavailable — rg not found)";
  }
}

export async function buildStructuralContext(cwd: string, opts: { budgetChars?: number; includeSymbols?: boolean } = {}): Promise<StructuralContext> {
  const budgetChars = opts.budgetChars ?? 2500;
  const topLevelFiles = await getTopLevel(cwd);
  const packageInfo = getPackageInfo(cwd);
  const importGraph = await getImportGraph(cwd);

  let out: StructuralContext = { topLevelFiles, packageInfo, importGraph, budgetChars };

  // budget 초과 시 잘라내기
  let text = formatStructuralContext(out);
  if (text.length > budgetChars) {
    // importGraph를 줄여서 재조정
    const shortGraph = importGraph.split("\n").slice(0, 15).join("\n");
    out = { ...out, importGraph: shortGraph };
    text = formatStructuralContext(out);
    if (text.length > budgetChars) out.importGraph = "(truncated — too many imports)";
  }

  return out;
}

export function formatStructuralContext(sc: StructuralContext): string {
  const lines: string[] = ["## Structural Context (auto-scanned, tiered budget)"];
  if (sc.packageInfo) lines.push(`- package: ${sc.packageInfo}`);
  if (sc.topLevelFiles.length) lines.push(`- top-level: ${sc.topLevelFiles.slice(0, 20).join(", ")}${sc.topLevelFiles.length > 20 ? " ..." : ""}`);
  lines.push(`- import graph (top sources):\n${sc.importGraph}`);
  if (sc.symbolIndex) lines.push(`- symbols:\n${sc.symbolIndex}`);
  lines.push(`- note: Use Read/Grep/Glob/SerenaFindSymbol for deeper inspection — this is a pointer, not the full code.`);
  return lines.join("\n");
}

/** provenance 인라인 헬퍼 — EvidenceLedger-style 출처 표기 */
export function provenanceTag(source: string, extra?: string): string {
  const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
  return `provenance: ${source} @ ${ts}${extra ? ` | ${extra}` : ""}`;
}
