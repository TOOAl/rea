/**
 * CarbonTokenMeter — $2/$10 (캐시 95% 할인) 흡수
 * REA: evidence_links 재사용으로 토큰 절약 측정 (Argon과 동일 가격, 이후 $4/$20)
 */
import type { CarbonTokenUsage } from "./carbonTypes.js";

const PRICE_INPUT = 2; // $ per 1M
const PRICE_OUTPUT = 10;
const PRICE_INPUT_CACHED = PRICE_INPUT * 0.05; // 95% 할인
const PRICE_STANDARD_INPUT = 4;
const PRICE_STANDARD_OUTPUT = 20;

export const measureCarbonTokens = (input: {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedInputTokens?: number;
  readonly useIntroPricing?: boolean;
}): CarbonTokenUsage => {
  const cached = input.cachedInputTokens ?? 0;
  const freshInput = Math.max(0, input.inputTokens - cached);
  const intro = input.useIntroPricing ?? true;
  const inputPrice = intro ? PRICE_INPUT : PRICE_STANDARD_INPUT;
  const outputPrice = intro ? PRICE_OUTPUT : PRICE_STANDARD_OUTPUT;
  const cachedPrice = intro ? PRICE_INPUT_CACHED : PRICE_STANDARD_INPUT * 0.05;
  const costUsd = (freshInput / 1_000_000) * inputPrice + (cached / 1_000_000) * cachedPrice + (input.outputTokens / 1_000_000) * outputPrice;
  return {
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    cachedInputTokens: cached,
    costUsd: Math.round(costUsd * 10000) / 10000,
  };
};

export const CARBON_PRICING = {
  intro: { input: PRICE_INPUT, output: PRICE_OUTPUT, cachedDiscount: "95%" },
  standard: { input: PRICE_STANDARD_INPUT, output: PRICE_STANDARD_OUTPUT },
  note: "Intro $2/$10 same as Argon; Standard $4/$20 after intro (Google 2026-10-28)",
} as const;
