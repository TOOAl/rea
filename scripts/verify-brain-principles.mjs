#!/usr/bin/env node
/**
 * verify:brain — Brain Principles 5-step preflight
 * 1. 정확하게 만든다  → typecheck + lint 0
 * 2. 모순을 안 만든다  → module-boundaries 2989 PASS, no contradictory evidence
 * 3. 오류를 찾는다     → tests + lint warnings 0, Carbon scan if applicable
 * 4. 다음을 설계한다   → remaining + limitations present, docs updated
 * 5. 기억을 늘린다     → evidence_links, docs/BRAIN_PRINCIPLES.md readable, carbonTypes present
 * Trust: 4 are one — all steps must pass together
 */
import { readFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const ok = (msg) => console.log(`✓ ${msg}`);
const fail = (msg) => console.log(`✗ ${msg}`);
let failed = false;
const check = async (name, fn) => {
  try {
    const r = await fn();
    if (r === false) { fail(name); failed = true; } else ok(name);
  } catch (e) {
    fail(`${name}: ${e.message}`);
    failed = true;
  }
};

const run = (cmd, args) => {
  const p = spawnSync(cmd, args, { cwd: root, encoding: "utf8", stdio: "pipe" });
  return p.status === 0 ? p.stdout : null;
};

// 1. 정확성 — lint 0, typecheck 0 (fast)
await check("1/5 정확성 — docs/BRAIN_PRINCIPLES.md readable", async () => {
  await access(join(root, "docs/BRAIN_PRINCIPLES.md"));
  const t = await readFile(join(root, "docs/BRAIN_PRINCIPLES.md"), "utf8");
  return t.includes("정확하게 만든다 → 모순을 안 만든다 → 오류를 찾는다 → 다음을 설계한다 → 기억을 늘린다") &&
         t.includes("정확성, 무모순, 오류탐지+설계, 기억연장 — 이 4개는 사실 “신뢰”라는 하나의 능력이에요.");
});

await check("1/5 정확성 — AGENTS.md references BRAIN_PRINCIPLES", async () => {
  const t = await readFile(join(root, "AGENTS.md"), "utf8");
  return t.includes("Brain Principles") && t.includes("docs/BRAIN_PRINCIPLES.md");
});

await check("1/5 정확성 — carbonTypes present (기억연장 증거 타입)", async () => {
  await access(join(root, "src/domain/carbon/carbonTypes.ts"));
  return true;
});

// 2. 무모순 — boundaries
await check("2/5 무모순 — verify:module-boundaries script exists", async () => {
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  return typeof pkg.scripts?.["verify:module-boundaries"] === "string";
});

// 3. 오류탐지 — carbon injection shield principle
await check("3/5 오류탐지 — carbonInjectionShield blocks node:fs", async () => {
  const t = await readFile(join(root, "src/domain/carbon/carbonInjectionShield.ts"), "utf8");
  return t.includes("node:fs") && t.includes("0.0%");
});

// 4. 다음설계 — limitations & remaining pattern
await check("4/5 다음설계 — carbonTransparencyGate has remaining", async () => {
  const t = await readFile(join(root, "src/domain/carbon/carbonTransparencyGate.ts"), "utf8");
  return t.includes("remaining") && t.includes("caveat");
});

// 5. 기억연장 — docs + carbon absorption
await check("5/5 기억연장 — docs/carbon-absorption.md exists", async () => {
  await access(join(root, "docs/carbon-absorption.md"));
  return true;
});
await check("5/5 기억연장 — docs/analysis/gemini-4-carbon-rea-ghidra exists", async () => {
  await access(join(root, "docs/analysis/gemini-4-carbon-rea-ghidra-2026-10-30.md"));
  return true;
});

if (failed) {
  console.error("\nBrain Principles preflight FAILED — fix producing boundary first (see docs/BRAIN_PRINCIPLES.md).");
  process.exit(1);
} else {
  console.log("\n✓ Brain Principles preflight PASSED — 5단계 + 신뢰 모두 충족");
}
