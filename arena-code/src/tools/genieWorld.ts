/**
 * GenieWorld — Google Genie 4 흡수 (REA+Ghidra)
 * real-time world model: prompt + image → interactive world with native audio & Gemini planner-in-loop
 * 12살 설명: 말로 세계를 그리고, 말이 끝나도 세계는 계속 움직임 — 소리도 같이 남
 *
 * REA: Genie 4는 “프레임=주소” — 각 프레임이 다음 프레임 주소를 결정, Gemini가 감독
 * Ghidra: SynthID 워터마크는 프레임 헤더에 invisible 서명 — 우리는 palace viewBox처럼 viewBox에 서명
 */

export interface GenieWorldOpts {
  prompt: string;
  imageHint?: string; // reference image path or data URL
  durationSec?: number; // default 120s (Genie 4 2분)
  fps?: number; // 24
}

export interface GenieFrame {
  id: number;
  t: number; // sec
  description: string;
  audio: { ambient: string; music?: string; dialogue?: string };
  physics: { collisions: number; crowd: number };
  synthID: string; // watermark
}

export interface GeniePlan {
  goal: string;
  steps: string[];
  currentStep: number;
}

function synthIDForFrame(id: number): string {
  // toy SynthID — real is invisible watermark, we mimic as hash
  return `synthid-${(id * 2654435761 % 2 ** 32).toString(16).padStart(8, "0")}`;
}

// Gemini planner-in-loop (Genie 4: Gemini 3.8 Flash)
export function geminiPlan(goal: string): GeniePlan {
  const parts = goal.split(/[,.]/).map(s => s.trim()).filter(Boolean).slice(0, 5);
  const steps = parts.length ? parts : [goal, "관찰하기", "검증하기"];
  return { goal, steps, currentStep: 0 };
}

export function geminiAdaptPrompt(prompt: string, context: string): string {
  // Gemini rewrite to fit current scene — keep weather/camera/person edits cohesive
  const lower = prompt.toLowerCase();
  if (lower.includes("비") || lower.includes("rain") || lower.includes("날씨")) return `날씨를 '${prompt}'에 맞게 서서히 전환, 기존 장면 유지`;
  if (lower.includes("사람") || lower.includes("person") || lower.includes("추가")) return `새 인물 '${prompt}'를 자연스럽게 장면에 입장, 기존 인물과 상호작용`;
  if (lower.includes("카메라") || lower.includes("camera")) return `카메라 '${prompt}' 이동, 컷 없이 슬라이딩`;
  return `장면 맥락 '${context.slice(0, 40)}'에 맞춰 '${prompt}'를 부드럽게 적용`;
}

export class GenieWorldEngine {
  readonly opts: Required<GenieWorldOpts>;
  readonly plan: GeniePlan;
  private frames: GenieFrame[] = [];
  private t = 0;

  constructor(opts: GenieWorldOpts) {
    this.opts = {
      prompt: opts.prompt,
      imageHint: opts.imageHint ?? "",
      durationSec: opts.durationSec ?? 120,
      fps: opts.fps ?? 24,
    };
    this.plan = geminiPlan(this.opts.prompt);
  }

  // tick — one frame (like Ghidra P-Code block)
  tick(userPrompt?: string): GenieFrame {
    const id = this.frames.length;
    this.t += 1 / this.opts.fps;

    // steering
    let desc = `장면 ${id} — ${this.opts.prompt.slice(0, 30)}`;
    if (userPrompt) {
      const adapted = geminiAdaptPrompt(userPrompt, desc);
      desc += ` + 조종: ${adapted}`;
      // planner moves
      if (this.plan.currentStep < this.plan.steps.length - 1) this.plan.currentStep++;
    }

    // physics & crowd — simple rule
    const physics = {
      collisions: Math.floor(Math.abs(Math.sin(id * 0.1)) * 3),
      crowd: Math.floor(Math.abs(Math.cos(id * 0.07)) * 5),
    };

    // native audio (Genie 4 first)
    const audio = {
      ambient: id % 48 < 24 ? "바람·파도" : "도시 소음·발자국",
      music: id % 120 < 10 ? "잔잔한 피아노" : undefined,
      dialogue: id % 60 === 0 ? `NPC: "${userPrompt ?? "안녕"}에 반응합니다"` : undefined,
    };

    const frame: GenieFrame = { id, t: this.t, description: desc, audio, physics, synthID: synthIDForFrame(id) };
    this.frames.push(frame);

    // keep 2-min window (Genie 4 consistency window) — sliding
    const maxFrames = this.opts.durationSec * this.opts.fps;
    if (this.frames.length > maxFrames) this.frames.shift();

    return frame;
  }

  run(steps: number, userPrompts?: string[]): GenieFrame[] {
    const out: GenieFrame[] = [];
    for (let i = 0; i < steps; i++) out.push(this.tick(userPrompts?.[i]));
    return out;
  }

  get memory(): GenieFrame[] { return this.frames; }
  get stats(): string { return `${this.frames.length} frames / ${this.opts.durationSec}s window / plan ${this.plan.currentStep + 1}/${this.plan.steps.length}`; }
}

// MCP tool wrapper (like palaceVisual)
import type { ToolContext } from "./types.js";

export const GenieWorldTool = {
  name: "genie_world",
  description: "Genie 4 월드 모델 — 프롬프트로 실시간 세계 생성 + 오디오 + 감독 (2분 일관성)",
  async execute(args: { prompt: string; steps?: number; steering?: string[] }, _ctx: ToolContext): Promise<string> {
    const engine = new GenieWorldEngine({ prompt: args.prompt, durationSec: 120, fps: 24 });
    const frames = engine.run(args.steps ?? 8, args.steering);
    const lines = [`Genie 4 시뮬레이션 — ${engine.stats}`, ""];
    for (const f of frames) lines.push(`#${f.id} t=${f.t.toFixed(2)}s ${f.description} | audio:${f.audio.ambient}${f.audio.dialogue ? " | " + f.audio.dialogue : ""} | synthID:${f.synthID}`);
    return lines.join("\n");
  },
};
