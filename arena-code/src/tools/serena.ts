/**
 * Serena — 심볼 단위 IDE 도구 (oraios/serena, MIT, Python LSP)
 * find_symbol, find_referencing_symbols, insert_after_symbol 3툴 Thin wrapper.
 * Arena에서는 실제 Serena LSP가 없으므로 Grep/Read/Edit 기반 휴리스틱으로 동작,
 * ToolRegistry에 등록해 D2 RAG/Guard와 연동.
 *
 * 참조: Serena vs Context7 vs grep 비교 [mcpvault.io/serena-mcp-server-guide],
 * Serena는 심볼 1개씩 저토큰으로 리팩터/내비게이션을 수행.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import type { Tool, ToolContext } from "./types.js";

function symbolPatterns(symbol: string): RegExp[] {
  const esc = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    new RegExp(`\\b(class|interface|type|function|const|let|var|def)\\s+${esc}\\b`),
    new RegExp(`\\b${esc}\\s*\\(`), // 함수 호출형
    new RegExp(`\\b${esc}\\b`), // 일반
  ];
}

async function walkFiles(cwd: string, exts = [".ts", ".js", ".tsx", ".jsx", ".py"]): Promise<string[]> {
  const out: string[] = [];
  const stack = [cwd];
  while (stack.length) {
    const dir = stack.pop()!;
    try {
      const entries = await readdir(dir);
      for (const e of entries) {
        if (e.startsWith(".") || e === "node_modules" || e === ".arena" || e === "dist") continue;
        const p = join(dir, e);
        try {
          const s = await stat(p);
          if (s.isDirectory()) stack.push(p);
          else if (exts.some(ext => p.endsWith(ext))) out.push(p);
        } catch {}
      }
    } catch {}
  }
  return out;
}

export const SerenaFindSymbolTool: Tool = {
  name: "SerenaFindSymbol",
  description: "Serena find_symbol — 심볼 정의 위치를 찾는다. Context7이 외부 문서를 준다면, Serena는 내부 코드베이스에서 심볼 1개를 저토큰으로 찾는다.",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string", description: "찾을 심볼 이름 (예: HarnessLibrary)" },
      path: { type: "string", description: "검색 시작 경로 (선택, 기본 cwd)" },
    },
    required: ["symbol"],
  },
  isConcurrencySafe: true,
  async execute(input, ctx: ToolContext): Promise<string> {
    const symbol = input.symbol as string;
    const base = input.path ? resolve(ctx.cwd, input.path as string) : resolve(ctx.cwd);
    const patterns = symbolPatterns(symbol);
    const files = await walkFiles(base);
    const hits: string[] = [];
    for (const f of files.slice(0, 200)) {
      try {
        const txt = await readFile(f, "utf-8");
        if (patterns.some(rx => rx.test(txt))) {
          const idx = txt.indexOf(symbol);
          const line = txt.slice(0, idx).split("\n").length;
          const rel = relative(ctx.cwd, f);
          hits.push(`${rel}:${line} — ${txt.split("\n")[line-1]?.trim().slice(0,120)}`);
          if (hits.length >= 10) break;
        }
      } catch {}
    }
    if (hits.length === 0) return `Serena: symbol "${symbol}" not found under ${relative(ctx.cwd, base) || "."}`;
    return `Serena find_symbol "${symbol}" — ${hits.length} hits:\n` + hits.join("\n");
  },
};

export const SerenaFindReferencingSymbolsTool: Tool = {
  name: "SerenaFindReferencingSymbols",
  description: "Serena find_referencing_symbols — 심볼을 참조하는 위치를 찾는다. 리팩터 전 영향도 파악에 사용.",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string", description: "참조를 찾을 심볼 이름" },
      path: { type: "string", description: "검색 시작 경로 (선택)" },
    },
    required: ["symbol"],
  },
  isConcurrencySafe: true,
  async execute(input, ctx: ToolContext): Promise<string> {
    const symbol = input.symbol as string;
    const base = input.path ? resolve(ctx.cwd, input.path as string) : resolve(ctx.cwd);
    const esc = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${esc}\\b`, "g");
    const files = await walkFiles(base);
    const hits: string[] = [];
    for (const f of files.slice(0, 200)) {
      try {
        const txt = await readFile(f, "utf-8");
        const matches = txt.match(re);
        if (matches && matches.length) {
          const rel = relative(ctx.cwd, f);
          hits.push(`${rel} — ${matches.length} refs`);
          if (hits.length >= 15) break;
        }
      } catch {}
    }
    if (hits.length === 0) return `Serena: no references to "${symbol}" under ${relative(ctx.cwd, base) || "."}`;
    return `Serena find_referencing_symbols "${symbol}" — ${hits.length} files:\n` + hits.join("\n");
  },
};

export const SerenaInsertAfterSymbolTool: Tool = {
  name: "SerenaInsertAfterSymbol",
  description: "Serena insert_after_symbol — 심볼 정의 바로 뒤에 코드를 삽입한다. 파일 전체를 읽지 않고 심볼 단위로 편집.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: { type: "string", description: "편집할 파일 경로" },
      symbol: { type: "string", description: "기준 심볼 이름" },
      content: { type: "string", description: "삽입할 코드" },
    },
    required: ["file_path", "symbol", "content"],
  },
  isConcurrencySafe: false,
  async execute(input, ctx: ToolContext): Promise<string> {
    const filePath = resolve(ctx.cwd, input.file_path as string);
    const symbol = input.symbol as string;
    const content = input.content as string;
    try {
      let txt = await readFile(filePath, "utf-8");
      const esc = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`^(.*\\b${esc}\\b.*)$`, "m");
      const m = re.exec(txt);
      if (!m) return `Serena: symbol "${symbol}" not found in ${input.file_path}`;
      const line = m[1];
      const insertPos = txt.indexOf(line) + line.length;
      txt = txt.slice(0, insertPos) + "\n" + content + txt.slice(insertPos);
      const { writeFile } = await import("node:fs/promises");
      await writeFile(filePath, txt, "utf-8");
      return `Serena insert_after_symbol: inserted after "${symbol}" in ${relative(ctx.cwd, filePath)} — ${content.length} chars`;
    } catch (e: unknown) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};

export const SERENA_TOOLS = [SerenaFindSymbolTool, SerenaFindReferencingSymbolsTool, SerenaInsertAfterSymbolTool];
