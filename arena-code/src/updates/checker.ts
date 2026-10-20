/**
 * Update Checker — Phase 4
 * GitHub Releases API로 upstream 버전을 확인하고, 로컬 설치 버전과 비교
 * 대상: @arena-code/ghidra-tools (→ NationalSecurityAgency/ghidra)
 *       @arena-code/rea-bridge (→ TOOAl/rea / morluto/rea)
 *       arena-code 자체
 */

export interface RepoRelease {
  tag_name: string;
  published_at: string;
  html_url: string;
  body?: string;
  prerelease?: boolean;
}

export interface UpdateInfo {
  name: string;          // "ghidra" | "rea" | "arena-code"
  repo: string;          // "NationalSecurityAgency/ghidra"
  localVersion: string;
  remoteTag: string;
  remoteDate: string;
  updateAvailable: boolean;
  releaseUrl: string;
  checkedAt: string;
}

export interface CheckOptions {
  token?: string;        // GITHUB_TOKEN (rate limit 우회)
  includePrerelease?: boolean;
  timeoutMs?: number;
}

async function fetchLatestRelease(
  repo: string,
  opts: CheckOptions = {},
): Promise<RepoRelease | null> {
  const url = `https://api.github.com/repos/${repo}/releases/latest`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "arena-code-updater",
  };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await fetch(url, { headers, signal: ac.signal });
    if (!res.ok) return null;
    return (await res.json()) as RepoRelease;
  } catch { return null; } finally { clearTimeout(tid); }
}

function normalizeVersion(tag: string): string {
  return tag.replace(/^v/, "").trim();
}

function isNewer(remote: string, local: string): boolean {
  if (!local || local === "unknown" || local === "0.0.0") return true;
  const r = normalizeVersion(remote);
  const l = normalizeVersion(local);
  if (r === l) return false;
  // 단순 semver 비교: 6.5.0 vs 6.4.0
  const rp = r.split(".").map((n) => parseInt(n, 10) || 0);
  const lp = l.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(rp.length, lp.length); i++) {
    const rv = rp[i] ?? 0, lv = lp[i] ?? 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  // semver가 아니면 문자열 다르면 업데이트 있음으로 간주
  return r !== l;
}

export async function checkUpdates(
  targets: { name: string; repo: string; localVersion: string }[],
  opts: CheckOptions = {},
): Promise<UpdateInfo[]> {
  const token = opts.token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? undefined;
  const results: UpdateInfo[] = [];

  for (const t of targets) {
    const rel = await fetchLatestRelease(t.repo, { ...opts, token });
    if (!rel) {
      results.push({
        name: t.name, repo: t.repo, localVersion: t.localVersion,
        remoteTag: "unknown", remoteDate: "", updateAvailable: false,
        releaseUrl: `https://github.com/${t.repo}/releases`, checkedAt: new Date().toISOString(),
      });
      continue;
    }
    const remoteTag = rel.tag_name;
    const updateAvailable = !!(remoteTag && isNewer(remoteTag, t.localVersion));
    results.push({
      name: t.name, repo: t.repo, localVersion: t.localVersion,
      remoteTag, remoteDate: rel.published_at, updateAvailable,
      releaseUrl: rel.html_url, checkedAt: new Date().toISOString(),
    });
  }
  return results;
}

export function formatUpdateSummary(infos: UpdateInfo[]): string {
  const updates = infos.filter((i) => i.updateAvailable);
  if (updates.length === 0) {
    return `✅ 모든 패키지가 최신입니다.\n${infos.map((i) => `  - ${i.name} (${i.repo}): ${i.localVersion} → ${i.remoteTag}`).join("\n")}`;
  }
  const lines = updates.map((u) =>
    `  🔔 ${u.name}: ${u.localVersion} → ${u.remoteTag} (${u.repo})\n     ${u.releaseUrl}`
  );
  const ok = infos.filter((i) => !i.updateAvailable).map((i) =>
    `  ✅ ${i.name}: ${i.localVersion} (최신)`
  );
  return `📦 업데이트 ${updates.length}개 발견:\n${lines.join("\n")}\n${ok.length ? ok.join("\n") : ""}\n\n적용: npx arena-code update --apply  또는  /update:apply`;
}
