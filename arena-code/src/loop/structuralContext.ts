/**
 * Structural Context — 맥락 이해 능력 1단계: import 그래프 + symbol 인덱스 (P-Code 정규형)
 * Claude Code queryLoop + Cursor 심볼 그래프 + Ghidra P-Code IR 융합
 * 기존 rg import 빈도 요약 → Ghidra식 중간표현(P-Code) 정규화: 모든 언어를 IR로 변환
 * Python import / JS import / Rust use / Go import → 통일된 IMPORT/MODULE/DEF/XREF 형태로 추상화
 * 12살 설명: 책의 목차+색인 — 전체를 읽지 않고도 “어디에 뭐가 있는지” 알려줌
 */

import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const exec = promisify(execCb);

export interface StructuralContext {
  topLevelFiles: string[];
  packageInfo?: string;
  importGraph: string; // 핵심 import 관계 요약 (2000자 이내) — P-Code 정규형 포함
  symbolIndex?: string; // 주요 export/class/function 목록 (선택)
  pcodeSummary?: string; // Ghidra P-Code 스타일 정규화 IR 요약
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

// P-Code 정규화: 다언어 import를 통일된 IR로 변환
// from "X" import Y → IMPORT Y FROM X
// import X → IMPORT X
// use crate::foo → IMPORT crate::foo
// from .foo import bar → IMPORT bar FROM .foo
// require("X") → IMPORT X (CJS)
async function getImportGraph(cwd: string, maxLines = 30): Promise<string> {
  try {
    const cmd = `rg --no-heading --color never --hidden --glob '!node_modules' --glob '!.git' --glob '!dist' -g '*.ts' -g '*.js' -g '*.py' -g '*.tsx' -g '*.jsx' -g '*.go' -g '*.rs' "^(import |from |export |require\\(|use |mod )" ${JSON.stringify(cwd)} 2>&1 | head -n 500`;
    const { stdout } = await exec(cmd, { cwd, timeout: 5000, maxBuffer: 2 * 1024 * 1024 });
    const lines = stdout.trim().split("\n").filter(Boolean);
    const sources = new Map<string, number>();
    const normalized: string[] = [];

    for (const l of lines) {
      // 정규형 추출
      let norm: string | null = null;
      // JS/TS: from 'X' / import "X"
      let m = /from\s+['\"]([^'\"]+)['\"]/.exec(l);
      if (m) { sources.set(m[1], (sources.get(m[1]) ?? 0) + 1); norm = `IMPORT FROM "${m[1]}"`; }
      else {
        m = /import\s+['\"]([^'\"]+)['\"]/.exec(l) ?? /require\(['\"]([^'\"]+)['\"]\)/.exec(l);
        if (m) { sources.set(m[1], (sources.get(m[1]) ?? 0) + 1); norm = `IMPORT "${m[1]}"`; }
        else {
          // Python: import X, from X import Y
          m = /^\s*from\s+(\S+)\s+import\s+(\S+)/.exec(l);
          if (m) { sources.set(m[1], (sources.get(m[1]) ?? 0) + 1); norm = `IMPORT ${m[2]} FROM ${m[1]}`; }
          else {
            m = /^\s*import\s+(\S+)/.exec(l);
            if (m) { sources.set(m[1], (sources.get(m[1]) ?? 0) + 1); norm = `IMPORT ${m[1]}`; }
            else {
              m = /^\s*use\s+([^;]+);?/.exec(l);
              if (m) { sources.set(m[1].trim(), (sources.get(m[1].trim()) ?? 0) + 1); norm = `IMPORT ${m[1].trim()}`; }
            }
          }
        }
      }
      if (norm) normalized.push(norm);
    }
    const top = [...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxLines);
    if (top.length === 0) return lines.slice(0, maxLines).join("\n");
    // P-Code 스타일 요약: IMPORT 통계 + 정규형 샘플
    const freqLines = top.map(([s, c]) => `  IMPORT "${s}" — ${c} files`).join("\n");
    const pcodeSample = normalized.slice(0, 8).map(n => `  • ${n}`).join("\n");
    return `${freqLines}\n  -- P-Code IR sample --\n${pcodeSample}`;
  } catch {
    return "(import graph unavailable — rg not found)";
  }
}

// Ghidra 심볼 테이블처럼 DEF/XREF 정규화: 함수/클래스 정의와 참조 빈도 추출
async function getSymbolIndex(cwd: string, maxEntries = 40): Promise<string> {
  try {
    const cmd = `rg --no-heading --color never --hidden --glob '!node_modules' --glob '!.git' --glob '!dist' -n "^(export |export default |class |function |def |const |async function |fn )" ${JSON.stringify(cwd)} 2>&1 | head -n 300`;
    const { stdout } = await exec(cmd, { cwd, timeout: 5000, maxBuffer: 2 * 1024 * 1024 });
    const lines = stdout.trim().split("\n").filter(Boolean).slice(0, maxEntries);
    if (lines.length === 0) return "(no symbols — rg found nothing)";
    // 정규화: DEF <kind> <name> @ file:line
    const normalized = lines.map((l) => {
      // rg output: path:line:content
      const sep = l.indexOf(":");
      const second = l.indexOf(":", sep + 1);
      if (sep === -1 || second === -1) return `  DEF ${l.slice(0, 80)}`;
      const file = l.slice(0, sep);
      const lineNo = l.slice(sep + 1, second);
      const content = l.slice(second + 1).trim().slice(0, 80);
      let kind = "DEF";
      if (/^class\s+/.test(content)) kind = "CLASS";
      else if (/^function\s+|^async function\s+|^def\s+|^fn\s+/.test(content)) kind = "FUNC";
      else if (/^export/.test(content)) kind = "EXPORT";
      else if (/^const\s+|^let\s+|^var\s+/.test(content)) kind = "CONST";
      return `  ${kind} ${content} @ ${relative(cwd, file) || file}:${lineNo}`;
    });
    // XREF 빈도: 주요 심볼명 재등장 횟수 (간단히 importGraph sources 중 반복되는 토큰)
    return normalized.join("\n");
  } catch {
    return "(symbol index unavailable)";
  }
}

export async function buildStructuralContext(cwd: string, opts: { budgetChars?: number; includeSymbols?: boolean } = {}): Promise<StructuralContext> {
  const budgetChars = opts.budgetChars ?? 2500;
  const topLevelFiles = await getTopLevel(cwd);
  const packageInfo = getPackageInfo(cwd);
  const importGraph = await getImportGraph(cwd);

  let symbolIndex: string | undefined;
  if (opts.includeSymbols !== false) {
    symbolIndex = await getSymbolIndex(cwd);
  }

  let out: StructuralContext = { topLevelFiles, packageInfo, importGraph, symbolIndex, budgetChars };

  // P-Code 요약: Ghidra처럼 IR 압축 — 중복 제거, 빈도 순 정렬은 importGraph에서 이미 처리
  if (symbolIndex) {
    out.pcodeSummary = `P-Code IR: ${importGraph.split("\n").length} imports, ${symbolIndex.split("\n").length} defs`;
  }

  let text = formatStructuralContext(out);
  if (text.length > budgetChars) {
    const shortGraph = importGraph.split("\n").slice(0, 15).join("\n");
    out = { ...out, importGraph: shortGraph };
    text = formatStructuralContext(out);
    if (text.length > budgetChars) {
      out.importGraph = "(truncated — too many imports)";
      out.symbolIndex = undefined;
      out.pcodeSummary = undefined;
    }
  }

  return out;
}

export function formatStructuralContext(sc: StructuralContext): string {
  const lines: string[] = ["## Structural Context (auto-scanned, P-Code IR, tiered budget)"];
  if (sc.packageInfo) lines.push(`- package: ${sc.packageInfo}`);
  if (sc.topLevelFiles.length) lines.push(`- top-level: ${sc.topLevelFiles.slice(0, 20).join(", ")}${sc.topLevelFiles.length > 20 ? " ..." : ""}`);
  lines.push(`- import graph (P-Code normalized, top sources):\n${sc.importGraph}`);
  if (sc.symbolIndex) lines.push(`- symbols (DEF @ file:line, Ghidra-style):\n${sc.symbolIndex}`);
  if (sc.pcodeSummary) lines.push(`- ${sc.pcodeSummary}`);
  lines.push(`- note: Use Read/Grep/Glob/SerenaFindSymbol for deeper inspection — this is a P-Code pointer IR, not the full code.`);
  return lines.join("\n");
}

/** provenance 인라인 헬퍼 — EvidenceLedger-style 출처 표기 */
export function provenanceTag(source: string, extra?: string): string {
  const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
  return `provenance: ${source} @ ${ts}${extra ? ` | ${extra}` : ""}`;
}
