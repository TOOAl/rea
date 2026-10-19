import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Tool, ToolContext } from "./types.js";

const execAsync = promisify(exec);

export const BashTool: Tool = {
  name: "Bash",
  description:
    "셸 명령을 실행한다. git, npm, python, ripgrep 등 모든 CLI 가능. 타임아웃 120초. 위험 명령(rm -rf /, sudo 등)은 권한 시스템에서 차단.",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string", description: "실행할 셸 명령" },
      timeout: { type: "string", description: "타임아웃 ms (기본 120000, 선택)" },
      description: { type: "string", description: "명령 설명 (로그용, 선택)" },
    },
    required: ["command"],
  },
  isConcurrencySafe: false,

  async execute(input, ctx: ToolContext): Promise<string> {
    const command = input.command as string;
    const timeout = input.timeout ? parseInt(input.timeout as string, 10) : 120_000;
    const desc = (input.description as string) || "";

    // Basic dangerous command block (additional layer)
    const dangerous = [/rm\s+-rf\s+\//, /:\(\)\{\s*:\|\:&\s*\}/, /mkfs/, /dd\s+if=/];
    for (const pat of dangerous) {
      if (pat.test(command)) return `Blocked dangerous command: ${command} (matched ${pat})`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: ctx.cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env },
      });
      const out = [stdout, stderr].filter(Boolean).join("\n");
      const header = desc ? `# ${desc}\n$ ${command}\n` : `$ ${command}\n`;
      const truncated = out.length > 30000 ? out.slice(0, 30000) + "\n... (output truncated, 30K limit)" : out;
      return header + (truncated || "(no output)");
    } catch (e: unknown) {
      if (e && typeof e === "object" && "stdout" in e) {
        const err = e as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
        const out = [err.stdout, err.stderr].filter(Boolean).join("\n") || err.message || String(e);
        const reason = err.killed ? " (timeout/killed)" : "";
        return `Command failed${reason}: ${command}\n${out.slice(0, 30000)}`;
      }
      return `Error executing: ${command}\n${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
