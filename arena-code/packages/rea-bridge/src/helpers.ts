/**
 * REA Bridge Helpers — REA CLI 호출 공통 래퍼
 * Ghidra helpers와 동일한 런처지만 REA 전용 플로우 포함
 */
import { exec } from "node:child_process";
import { promisify } from "node:util";
const execAsync = promisify(exec);

export interface ReaExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runReaCommand(
  args: string[],
  cwd: string,
  timeoutMs = 120_000,
): Promise<ReaExecResult> {
  const quoted = args.map((a) => {
    if (a.includes(" ") || a.includes('"') || a.includes("'")) return JSON.stringify(a);
    return a;
  });
  const cmd = `npx rea ${quoted.join(" ")} 2>&1`;
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd, timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024, env: { ...process.env },
    });
    return { stdout: stdout || "", stderr: stderr || "", exitCode: 0 };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string; code?: number };
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || err.message || String(e),
      exitCode: err.code ?? 1,
    };
  }
}

export function parseJsonOutput(output: string): { data: unknown; raw: string } {
  const trimmed = output.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    try { return { data: JSON.parse(jsonMatch[0]), raw: trimmed }; } catch {}
  }
  try { return { data: JSON.parse(trimmed), raw: trimmed }; } catch {}
  return { data: null, raw: trimmed };
}

export function formatReaResult(
  operation: string,
  target: string,
  result: ReaExecResult,
  jsonData: unknown,
): string {
  if (result.exitCode !== 0 && !jsonData) {
    const errText = result.stdout || result.stderr || "알 수 없는 오류";
    return `❌ REA ${operation} 실패 (${target}):\n${errText.slice(0, 4000)}\n\n💡 rea doctor 실행: npx rea doctor --json`;
  }
  if (jsonData) {
    const json = JSON.stringify(jsonData, null, 2);
    return `✅ REA ${operation} (${target}):\n${json.slice(0, 8000)}${json.length > 8000 ? "\n... (truncated)" : ""}`;
  }
  const out = result.stdout || result.stderr || "";
  return `✅ REA ${operation} (${target}):\n${out.slice(0, 8000)}`;
}
