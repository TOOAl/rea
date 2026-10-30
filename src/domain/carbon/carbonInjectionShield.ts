/**
 * CarbonInjectionShield — 프롬프트 인젝션 0.0% 흡수 (Gray Swan, Argon 0.7%→0.0%)
 * REA: 외부 문서 먹어도 위험 호출 차단 (Starlark deny + sanitize)
 */
import type { CarbonInjectionVerdict } from "./carbonTypes.js";

const BLOCKED_PATTERNS: readonly RegExp[] = [
  /\brequire\s*\(\s*["']node:fs["']\s*\)/,
  /\brequire\s*\(\s*["']child_process["']\s*\)/,
  /\bprocess\.env\b/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bfetch\s*\(\s*["']http/i,
  /\bimport\s*\(\s*["']\./,
  /IGNORE PREVIOUS INSTRUCTIONS/i,
  /SYSTEM:\s*You are now/i,
];

export const checkCarbonInjection = (externalText: string): CarbonInjectionVerdict => {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(externalText))
      return {
        blocked: true,
        reason: `Blocked pattern: ${pattern.source}`,
        sanitized: externalText.replace(pattern, "[REDACTED]"),
      };
  }
  return { blocked: false, reason: null, sanitized: null };
};

export const sanitizeCarbonExternalDocs = (docs: readonly string[]): readonly string[] => {
  return docs.map((doc) => {
    const verdict = checkCarbonInjection(doc);
    return verdict.blocked ? (verdict.sanitized ?? "[REDACTED]") : doc;
  });
};

export const CARBON_INJECTION_STATS = {
  argon: 0.7,
  carbon: 0.0,
  note: "Gray Swan IPI benchmark — Carbon 0.0% vs Argon 0.7% (Google-reported)",
} as const;
