import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Tool, ToolContext } from "./types.js";

const execAsync = promisify(exec);

export const GrepTool: Tool = {
  name: "Grep",
  description: "정규식/문자열로 코드 내용 검색. ripgrep(rg) 우선, 없으면 JS fallback. 대용량 코드베이스 탐색에 필수.",
  inputSchema: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "검색 패턴 (정규식 가능)" },
      path: { type: "string", description: "검색 디렉토리/파일 (선택, 기본 cwd)" },
      include: { type: "string", description: "파일 글로브 필터 (선택, 예: *.ts)" },
    },
    required: ["pattern"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const pattern = input.pattern as string;
    const searchPath = (input.path as string) || ctx.cwd;
    const include = input.include as string | undefined;

    // Try ripgrep first (Claude Code도 ripgrep 사용)
    try {
      const globFlag = include ? `-g '${include}'` : "";
      const cmd = `rg --no-heading --line-number --color never --hidden --glob '!node_modules' --glob '!.git' ${globFlag} -- ${JSON.stringify(pattern)} ${JSON.stringify(searchPath)} 2>&1 | head -n 200`;
      const { stdout } = await execAsync(cmd, { cwd: ctx.cwd, timeout: 30000, maxBuffer: 5 * 1024 * 1024 });
      if (!stdout.trim()) return `No matches for "${pattern}" in ${searchPath}`;
      const lines = stdout.trim().split("\n");
      const more = lines.length >= 200 ? "\n... (truncated at 200 lines)" : "";
      return `Found ${lines.length} matches for "${pattern}":\n${lines.join("\n")}${more}`;
    } catch {
      // Fallback: JS grep via Bash grep
      try {
        const cmd = `grep -r -n --include='*.ts' --include='*.js' --include='*.json' --include='*.md' ${JSON.stringify(pattern)} ${JSON.stringify(searchPath)} 2>&1 | head -n 200`;
        const { stdout } = await execAsync(cmd, { cwd: ctx.cwd, timeout: 30000 });
        if (!stdout.trim()) return `No matches for "${pattern}"`;
        return stdout.trim();
      } catch (e: unknown) {
        return `Error grepping "${pattern}": ${e instanceof Error ? e.message : String(e)}`;
      }
    }
  },
};
