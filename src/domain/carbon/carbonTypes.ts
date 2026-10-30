/**
 * Gemini 4 Carbon — REA 흡수 타입
 * 원문: gil257 224457789740 (2026-10-29) + Google 2026-10-28
 * Ghidra 관점: 모든 관찰은 evidence_id 주소로 추적
 */
import { z } from "zod";

// ── CWE 분류 (Carbon SEC-bench 88.2% → 7종) ──
export const carbonCweKindSchema = z.enum([
  "cwe-20", // Improper Input Validation
  "cwe-22", // Path Traversal
  "cwe-78", // OS Command Injection
  "cwe-79", // XSS
  "cwe-89", // SQL Injection
  "cwe-94", // Code Injection
  "cwe-200", // Information Exposure
  "cwe-287", // Improper Authentication
  "cwe-306", // Missing Authentication
  "cwe-359", // Privacy Violation
  "cwe-400", // Uncontrolled Resource Consumption
  "cwe-601", // Open Redirect
  "cwe-918", // SSRF
  "cwe-other",
]);
export type CarbonCweKind = z.infer<typeof carbonCweKindSchema>;

// ── 심각도 (Carbon Chrome 10배 패치 품질과 연동) ──
export const carbonSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export type CarbonSeverity = z.infer<typeof carbonSeveritySchema>;

// ── 위치 (Ghidra 주소=좌표) ──
export const carbonLocationSchema = z.strictObject({
  file: z.string().min(1),
  line: z.number().int().min(1).nullable(),
  column: z.number().int().min(0).nullable(),
  snippet: z.string().max(500).nullable(),
});
export type CarbonLocation = z.infer<typeof carbonLocationSchema>;

// ── 취약점 (SEC-bench 88.2% → CarbonSecureScanner) ──
export const carbonVulnSchema = z.strictObject({
  id: z.string().min(1),
  kind: carbonCweKindSchema,
  severity: carbonSeveritySchema,
  title: z.string().min(1),
  location: carbonLocationSchema,
  evidence: z.string().min(1),
  confidence: z.enum(["observed", "derived", "inferred"]),
  cwe: z.string().nullable(),
});
export type CarbonVuln = z.infer<typeof carbonVulnSchema>;

// ── 익스플로잇 검증 (ExploitGym 54.8%) ──
export const carbonExploitResultSchema = z.strictObject({
  vulnId: z.string().min(1),
  reproduced: z.boolean(),
  sandbox: z.enum(["isolated", "dry-run"]),
  output: z.string().nullable(),
  durationMs: z.number().min(0),
});
export type CarbonExploitResult = z.infer<typeof carbonExploitResultSchema>;

// ── 패치 (CWE-bench 71% + 10배) ──
export const carbonPatchSchema = z.strictObject({
  vulnId: z.string().min(1),
  oldCode: z.string().min(1),
  newCode: z.string().min(1),
  test: z.string().nullable(),
  limitations: z.array(z.string()),
  quality: z.enum(["standard", "high"]), // high = Chrome 10배
});
export type CarbonPatch = z.infer<typeof carbonPatchSchema>;

// ── 장시간 계획 (Terminal-Bench 65.2% + 며칠) ──
export const carbonPlanStepSchema = z.strictObject({
  index: z.number().int().min(0),
  goal: z.string().min(1),
  status: z.enum(["pending", "running", "done", "retry", "blocked"]),
  checkpoint: z.string().nullable(),
});
export type CarbonPlanStep = z.infer<typeof carbonPlanStepSchema>;

export const carbonPlanSchema = z.strictObject({
  goal: z.string().min(1),
  steps: z.array(carbonPlanStepSchema).min(1),
  horizon: z.enum(["minutes", "hours", "days"]),
  checkpoints: z.array(z.string()),
});
export type CarbonPlan = z.infer<typeof carbonPlanSchema>;

// ── 투명성 게이트 (정직성 -50%/-80%) ──
export const carbonTransparencySchema = z.strictObject({
  known: z.boolean(),
  caveat: z.string().nullable(),
  remaining: z.array(z.string()),
  confidence: z.enum(["observed", "derived", "inferred"]),
});
export type CarbonTransparency = z.infer<typeof carbonTransparencySchema>;

// ── 협업 게이트 (overreach -26% / under-service -29%) ──
export const carbonAskSchema = z.strictObject({
  question: z.string().min(1),
  sources: z.array(z.string()).min(1).max(3),
  options: z.array(z.string()).min(2),
});
export type CarbonAsk = z.infer<typeof carbonAskSchema>;

// ── 인젝션 쉴드 (0.0% Gray Swan) ──
export const carbonInjectionVerdictSchema = z.strictObject({
  blocked: z.boolean(),
  reason: z.string().nullable(),
  sanitized: z.string().nullable(),
});
export type CarbonInjectionVerdict = z.infer<typeof carbonInjectionVerdictSchema>;

// ── 토큰 미터 ($2/$10, 캐시 95% 할인) ──
export const carbonTokenUsageSchema = z.strictObject({
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  cachedInputTokens: z.number().int().min(0),
  costUsd: z.number().min(0),
});
export type CarbonTokenUsage = z.infer<typeof carbonTokenUsageSchema>;

export const CARBON_PROVIDER = {
  id: "gemini-4-carbon",
  name: "Gemini 4 Carbon",
  version: "2026-10-28",
} as const;

export const CARBON_LIMITATIONS = [
  "Static scan only — runtime reachability not evaluated",
  "Exploit verification runs in isolated dry-run sandbox — no network/process spawn",
  "Patch generation requires manual review — 10x quality is Chrome internal, not universal",
] as const;
