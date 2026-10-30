import { lstat, opendir, readlink } from "node:fs/promises";
import { join, relative } from "node:path";
import type { ProcessScenario } from "../../domain/process/processScenario.js";
import type { FilesystemCoverage } from "../../domain/process/processCaptureCoverage.js";
import type {
  FileState,
  ProcessFilesystemSnapshot,
} from "../../domain/process/processCapture.js";

export const snapshotRoots = async (
  scenario: ProcessScenario,
  signal?: AbortSignal,
  previous?: ProcessFilesystemSnapshot,
): Promise<ProcessFilesystemSnapshot> => {
  // A prior root entry establishes same-run admission. Preserve initial
  // obstruction errors; a later non-directory ancestor makes it absent.
  const previousPaths = new Set(previous?.files.map(({ path }) => path));
  const entries: FileState[] = [];
  const completeRoots: string[] = [];
  let remainingBytes = scenario.limits.file_bytes;
  let pendingNames = 0;
  let truncated = false;
  const enumerationReasons = new Set<
    FilesystemCoverage["enumeration_reasons"][number]
  >();
  const enumerationOmissions: FilesystemCoverage["enumeration_omissions"] = [];
  const hashOmissions: FilesystemCoverage["hash_omissions"] = [];
  const visit = async (
    root: string,
    rootAlias: string,
    path: string,
    depth: number,
  ): Promise<boolean> => {
    signal?.throwIfAborted();
    if (
      entries.length >= scenario.limits.files ||
      depth > scenario.limits.filesystem_depth
    ) {
      truncated = true;
      if (entries.length >= scenario.limits.files)
        enumerationReasons.add("files_limit");
      if (depth > scenario.limits.filesystem_depth)
        enumerationReasons.add("depth_limit");
      return false;
    }
    const stats = await lstatIfPresent(
      path,
      previousPaths.has(`${rootAlias}:.`),
      signal,
    );
    if (stats === undefined) return true;
    const relativePath = relative(root, path) || ".";
    if (stats.isSymbolicLink()) {
      // Keep the target as stored: lexical resolution can merge distinct targets.
      const target = await readlink(path);
      const afterRead = await lstat(path);
      if (!hasSameIdentity(stats, afterRead, "symlink")) {
        truncated = true;
        enumerationReasons.add("identity_changed");
        return false;
      }
      entries.push({
        path: `${rootAlias}:${relativePath}`,
        type: "symlink",
        mode: stats.mode,
        size: stats.size,
        sha256: null,
        symlink_target: target,
      });
      return true;
    }
    if (stats.isFile()) {
      let sha256: string | null = null;
      let omission: FilesystemCoverage["hash_omissions"][number] | undefined;
      if (remainingBytes < stats.size) {
        omission = {
          path: `${rootAlias}:${relativePath}`,
          size_bytes: stats.size,
          remaining_budget_bytes: remainingBytes,
          reason: "file_bytes_budget",
          system_code: null,
        };
      } else {
        const outcome = await hashFile(path, stats, remainingBytes, signal);
        if (outcome.state === "hashed") {
          sha256 = outcome.sha256;
          remainingBytes -= stats.size;
        } else {
          omission = {
            path: `${rootAlias}:${relativePath}`,
            size_bytes: stats.size,
            remaining_budget_bytes: remainingBytes,
            reason: outcome.reason,
            system_code: outcome.system_code,
          };
        }
      }
      if (omission !== undefined) {
        truncated = true;
        hashOmissions.push(omission);
      }
      entries.push({
        path: `${rootAlias}:${relativePath}`,
        type: "file",
        mode: stats.mode,
        size: stats.size,
        sha256,
        symlink_target: null,
      });
      return true;
    }
    const type = stats.isDirectory() ? "directory" : "other";
    entries.push({
      path: `${rootAlias}:${relativePath}`,
      type,
      mode: stats.mode,
      size: stats.size,
      sha256: null,
      symlink_target: null,
    });
    if (type !== "directory") return true;
    const children: string[] = [];
    let complete = true;
    const remainingEntries =
      scenario.limits.files - entries.length - pendingNames;
    let directory;
    try {
      directory = await opendir(path);
    } catch (cause: unknown) {
      signal?.throwIfAborted();
      const systemCode = fileUnavailableSystemCode(cause);
      if (systemCode === undefined) throw cause;
      truncated = true;
      complete = false;
      enumerationReasons.add("directory_unavailable");
      enumerationOmissions.push({
        path: `${rootAlias}:${relativePath}`,
        reason: "directory_unavailable",
        system_code: systemCode,
      });
      return false;
    }
    for await (const child of directory) {
      signal?.throwIfAborted();
      if (
        children.length >= remainingEntries ||
        depth >= scenario.limits.filesystem_depth
      ) {
        truncated = true;
        complete = false;
        if (children.length >= remainingEntries)
          enumerationReasons.add("files_limit");
        if (depth >= scenario.limits.filesystem_depth)
          enumerationReasons.add("depth_limit");
        break;
      }
      children.push(child.name);
      pendingNames += 1;
    }
    const afterRead = await lstat(path);
    if (!hasSameIdentity(stats, afterRead, "directory")) {
      pendingNames -= children.length;
      truncated = true;
      enumerationReasons.add("identity_changed");
      return false;
    }
    children.sort().reverse();
    while (children.length > 0) {
      const child = children.pop();
      if (child === undefined) break;
      pendingNames -= 1;
      if (!(await visit(root, rootAlias, join(path, child), depth + 1)))
        complete = false;
    }
    return complete;
  };
  for (const [index, root] of scenario.filesystem_observation_paths.entries()) {
    const alias = `root_${String(index)}`;
    if (
      (await lstatIfPresent(root, previousPaths.has(`${alias}:.`), signal)) ===
      undefined
    ) {
      completeRoots.push(alias);
      continue;
    }
    if (await visit(root, alias, root, 0)) completeRoots.push(alias);
  }
  return {
    files: entries,
    truncated,
    completeRoots,
    coverage: {
      files_limit: scenario.limits.files,
      depth_limit: scenario.limits.filesystem_depth,
      enumeration_truncated:
        completeRoots.length !== scenario.filesystem_observation_paths.length,
      enumeration_reasons: [...enumerationReasons],
      enumeration_omissions: enumerationOmissions,
      hash_budget_bytes: scenario.limits.file_bytes,
      hashed_bytes: scenario.limits.file_bytes - remainingBytes,
      hash_omissions: hashOmissions,
    },
  };
};
