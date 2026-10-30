/**
 * CarbonTransparencyGate — 정직성 -50%/-80% 흡수
 * REA: “모른다”면 caveat를 결과에 직접 적고 남은 할 일로 반환 (Google “추측 말고 caveat”)
 */
import { CARBON_PROVIDER, type CarbonTransparency } from "./carbonTypes.js";

export const checkCarbonTransparency = (input: {
  readonly known: boolean;
  readonly caveat?: string;
  readonly remaining?: readonly string[];
}): CarbonTransparency => {
  if (input.known)
    return {
      known: true,
      caveat: null,
      remaining: [...(input.remaining ?? [])],
      confidence: "observed",
    };
  return {
    known: false,
    caveat: input.caveat ?? "I do not have enough evidence — methodology caveat included in result",
    remaining: [...(input.remaining ?? ["Collect more evidence", "Re-run with sanitized input"])],
    confidence: "inferred",
  };
};

export const formatCarbonCaveat = (transparency: CarbonTransparency): string => {
  if (transparency.known) return "Evidence complete — no caveat";
  const rem = transparency.remaining.length > 0 ? ` Remaining: ${transparency.remaining.join(", ")}` : "";
  return `Caveat: ${transparency.caveat ?? "Unknown limitation"}${rem}`;
};

export const CARBON_TRANSPARENCY_PROVIDER = CARBON_PROVIDER;
