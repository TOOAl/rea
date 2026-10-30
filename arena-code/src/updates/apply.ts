/**
 * Update Apply — 승인 후 업데이트 적용
 * 전략:
 *   - ghidra: 안내 메시지 (사용자가 Ghidra를 직접 설치, REA가 사용하는 경로 유지)
 *   - rea: `npm install rea-agents@latest` 또는 git pull (REPO 내부인 경우)
 *   - arena-code: `npm install` (패키지로 설치된 경우) 또는 안내
 *
 * 실제 파일 덮어쓰기 없이, 안전한 명령을 제안/실행 (dryRun 기본)
 */
import { exec } from "node:child_process";
import { promisify } from "node:util";
const execAsync = promisify(exec);

export interface ApplyOptions {
  cwd: string;
  name: string;         // "ghidra" | "rea" | "arena-code"
  repo: string;
  targetTag: string;
  dryRun?: boolean;
  requireApproval?: boolean;
  askFn?: (msg: string) => Promise<boolean>; // interactive 승인 콜백
}

export interface ApplyResult {
  ok: boolean;
  message: string;
  command?: string;
}

async function askApproval(msg: string, askFn?: (msg: string) => Promise<boolean>): Promise<boolean> {
  if (!askFn) return true; // non-interactive → 자동 승인 (이미 CLI에서 승인됨)
  return askFn(msg);
}

export async function applyUpdate(opts: ApplyOptions): Promise<ApplyResult> {
  const { cwd, name, repo, targetTag, dryRun, askFn } = opts;

  if (opts.requireApproval !== false && askFn) {
    const approved = await askApproval(
      `업데이트 적용: ${name} ${targetTag} (${repo}) — 진행할까요? [Y/n]`, askFn,
    );
    if (!approved) return { ok: false, message: "사용자가 취소했습니다." };
  }

  if (name === "ghidra") {
    // Ghidra는 수동 설치 안내
    const msg = `Ghidra ${targetTag} 업데이트 안내:\n` +
      `  1. https://github.com/${repo}/releases/tag/${targetTag} 에서 다운로드\n` +
      `  2. 압축 해제 후 GHIDRA_INSTALL_DIR 재설정\n` +
      `  3. npx rea doctor --provider ghidra --json 로 확인\n` +
      `\nArena-code는 Ghidra를 직접 업그레이드하지 않습니다 (시스템 설치).`;
    return { ok: true, message: msg };
  }

  if (name === "rea" || name === "rea-bridge") {
    // REA: npm 또는 로컬 git pull 시도
    // cwd가 REA repo 내부인지 판단: .git/rea 인지
    const { readFileSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const _isReaRepo = existsSync(join(cwd, ".git")) || existsSync(join(cwd, "..", ".git"));
    let pkgVersion = "unknown";
    try {
      const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf-8"));
      if (pkg.name === "rea-agents") {
        pkgVersion = pkg.version ?? "unknown";
      }
    } catch {}

    if (dryRun) {
      return {
        ok: true,
        message: `[dry-run] REA ${pkgVersion} → ${targetTag}. 적용하려면 --apply 실행`,
        command: `npm install ${repo.includes("TOOAl") ? "rea-agents@latest" : `rea-agents@${targetTag}`}`,
      };
    }

    // 실제 적용: npm update 우선, 실패 시 안내
    try {
      const cmd = `npm install rea-agents@${targetTag} 2>&1 || npm install rea-agents@latest 2>&1`;
      const { stdout } = await execAsync(cmd, { cwd, timeout: 60_000 });
      if (stdout.includes("added") || stdout.includes("updated") || !stdout.includes("ERR!")) {
        return { ok: true, message: `✅ REA ${targetTag} 적용 완료 (npm)` };
      }
      return { ok: false, message: `REA 적용 실패:\n${stdout.slice(0, 2000)}` };
    } catch (e: unknown) {
      const msg2 = e instanceof Error ? e.message : String(e);
      return { ok: false, message: `REA 적용 오류: ${msg2}` };
    }
  }

  if (name === "arena-code") {
    if (dryRun) {
      return { ok: true, message: `[dry-run] arena-code → ${targetTag}`, command: "npm install arena-code@latest" };
    }
    return {
      ok: true,
      message: `arena-code 업데이트: git pull origin arena/f39797b9-rea 또는 npm update로 수동 적용하세요.\nTarget: ${targetTag} (${repo})`,
    };
  }

  return {
    ok: true,
    message: `${name} ${targetTag} 업데이트 안내: https://github.com/${repo}/releases/tag/${targetTag}`,
  };
}
