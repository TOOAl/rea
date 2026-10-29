import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HarnessLibrary } from "../src/harness2/library.js";

function tmpRoot() {
  return mkdtempSync(join(tmpdir(), "arena-rag-"));
}

describe("Library RAG TF-IDF search", () => {
  it("search returns ranked hits by cue relevance", () => {
    const root = tmpRoot();
    const lib = new HarnessLibrary({ root: join(root, "lib"), domain: "auth" });
    lib.add({
      taskId: "auth/login",
      harness: { "AGENTS.md": "x" },
      label: "compose-1",
      experience: { cue: "auth login OIDC", lesson: "use PKCE", evidence: "trajectory shows token flow", edits: "added guardrails.md" },
    });
    lib.add({
      taskId: "auth/logout",
      harness: { "AGENTS.md": "x" },
      label: "compose-1",
      experience: { cue: "auth logout clears session", lesson: "clear cookies", evidence: "logout trajectory", edits: "clear session" },
    });
    lib.add({
      taskId: "deploy/docker",
      harness: { "AGENTS.md": "x" },
      label: "compose-1",
      experience: { cue: "docker build image", lesson: "multi-stage", evidence: "docker trajectory", edits: "added Dockerfile" },
    });
    const hits = lib.search("auth login OIDC flow", 2);
    expect(hits.length).toBe(2);
    expect(hits[0].slug).toBe("auth__login");
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
    rmSync(root, { recursive: true, force: true });
  });

  it("buildRagSnapshot creates filtered temp dir", () => {
    const root = tmpRoot();
    const lib = new HarnessLibrary({ root: join(root, "lib"), domain: "test" });
    lib.add({
      taskId: "a/1",
      harness: { "AGENTS.md": "x" },
      label: "c1",
      experience: { cue: "auth token", lesson: "l", evidence: "e" },
    });
    lib.add({
      taskId: "a/2",
      harness: { "AGENTS.md": "x" },
      label: "c1",
      experience: { cue: "deploy k8s", lesson: "l", evidence: "e" },
    });
    const snap = lib.buildRagSnapshot("auth token", 1);
    expect(snap).not.toBeNull();
    rmSync(root, { recursive: true, force: true });
    if (snap) rmSync(snap, { recursive: true, force: true });
  });
});
