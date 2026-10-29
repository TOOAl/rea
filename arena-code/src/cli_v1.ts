#!/usr/bin/env node
/**
 * Arena Code CLI — Claude Code 스타일 터미널 코딩 에이전트
 * - Interactive mode: 대화형 (readline)
 * - Headless mode: -p "prompt" (파이프/CI)
 */
import { createInterface } from "node:readline";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { createProvider } from "./providers/index.js";
import { queryLoop } from "./loop/queryLoop.js";
import { ALL_TOOLS } from "./tools/index.js";
import type { Message } from "./providers/types.js";

// Load .env if exists
function loadEnv() {
  const _envPaths = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "arena-code", ".env"), resolve(process.cwd(), ".env.example")];
  // Also check REA's .env
  for (const p of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../.env")]) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eq = trimmed.indexOf("=");
          if (eq === -1) continue;
          const key = trimmed.slice(0, eq).trim();
          const val = trimmed.slice(eq + 1).trim();
          if (!process.env[key] && val) process.env[key] = val;
        }
      } catch { /* ignore */ }
      break;
    }
  }
}
loadEnv();

const program = new Command();

program
  .name("arena-code")
  .description("Arena Code — Claude Code 클론 (REA 분석 기반, Arena Agent + 무료 API)")
  .version("1.0.0")
  .option("-p, --print <prompt>", "Headless mode: run single prompt and exit")
  .option("--provider <name>", "LLM provider: arena|openrouter|gemini|groq|ollama|anthropic")
  .option("--model <model>", "Override model name")
  .option("--max-turns <n>", "Max agent turns", "20")
  .option("--cwd <path>", "Working directory", process.cwd())
  .option("--mock", "Use mock provider (no API key needed, demo)")
  .option("--dangerously-skip-permissions", "Skip permission checks (dangerous!)")
  .argument("[prompt]", "Prompt (alternative to -p)")
  .action(async (promptArg, opts) => {
    const cwd = resolve(opts.cwd);
    const maxTurns = parseInt(opts.maxTurns, 10);
    const printPrompt = opts.print ?? promptArg;

    if (opts.mock) process.env.ARENA_MOCK = "true";
    if (opts.provider) process.env.ARENA_PROVIDER = opts.provider;
    if (opts.model) {
      // Set model for whichever provider is selected
      const p = (opts.provider ?? process.env.ARENA_PROVIDER ?? "arena").toLowerCase();
      if (p === "gemini") process.env.GEMINI_MODEL = opts.model;
      else if (p === "openrouter") process.env.OPENROUTER_MODEL = opts.model;
      else if (p === "groq") process.env.GROQ_MODEL = opts.model;
      else if (p === "ollama") process.env.OLLAMA_MODEL = opts.model;
      else if (p === "anthropic") process.env.ANTHROPIC_MODEL = opts.model;
      else process.env.ARENA_MODEL = opts.model;
    }

    // Provider
    let provider;
    try {
      provider = createProvider(opts.provider);
      if (opts.model) provider.model = opts.model;
    } catch (e: unknown) {
      console.error(`\n❌ Provider 오류: ${e instanceof Error ? e.message : String(e)}`);
      console.error(`
설정 방법 (.env 파일 생성):
  cp .env.example .env
  # 그리고 아래 중 하나 이상 설정:

  # 1. Google Gemini (무료, 추천 - 1M 컨텍스트)
  GEMINI_API_KEY=your_key_here
  # 발급: https://aistudio.google.com/app/apikey

  # 2. OpenRouter (무료 모델 다수)
  OPENROUTER_API_KEY=your_key_here
  # 발급: https://openrouter.ai/keys
  # 모델: deepseek/deepseek-r1:free, qwen/qwen3-coder:free

  # 3. Groq (무료, 초저지연)
  GROQ_API_KEY=your_key_here
  # 발급: https://console.groq.com/keys

  # 4. Ollama (완전 로컬, 무료)
  OLLAMA_BASE_URL=http://localhost:11434
  # 설치: https://ollama.com + ollama pull qwen2.5-coder:14b

  # 5. Arena Agent
  ARENA_API_URL=https://your-arena-api/v1
  ARENA_API_KEY=your_key

  # 데모 (API 키 없이): ARENA_MOCK=true npm start
`);
      process.exit(1);
    }

    console.log(`\n🤖 Arena Code v1.0.0`);
    console.log(`   Provider: ${provider.name} (${provider.model})`);
    console.log(`   CWD: ${cwd}`);
    console.log(`   Tools: ${ALL_TOOLS.map((t) => t.name).join(", ")}`);
    if (opts.dangerouslySkipPermissions) console.log(`   ⚠️  Permissions: SKIPPED (dangerous!)`);
    console.log("");

    if (printPrompt) {
      // Headless mode
      await runPrompt(printPrompt as string, provider, cwd, maxTurns, opts);
      return;
    }

    // Interactive mode
    await runInteractive(provider, cwd, maxTurns, opts);
  });

async function runPrompt(
  prompt: string,
  provider: ReturnType<typeof createProvider>,
  cwd: string,
  maxTurns: number,
  opts: { dangerouslySkipPermissions?: boolean }
) {
  const messages: Message[] = [{ role: "user", content: prompt }];

  console.log(`\n▶ Prompt: ${prompt}\n`);
  console.log("─".repeat(60));

  await runLoop(messages, provider, cwd, maxTurns, opts);
}

async function runInteractive(
  provider: ReturnType<typeof createProvider>,
  cwd: string,
  maxTurns: number,
  opts: { dangerouslySkipPermissions?: boolean }
) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const messages: Message[] = [];

  console.log("💬 Interactive mode — 메시지를 입력하세요. 'exit' 또는 Ctrl+C로 종료.\n");
  console.log("   팁: 복잡한 작업은 구체적으로 설명할수록 좋습니다.");
  console.log("   예: \"src/loop/queryLoop.ts에 에러 핸들링을 추가해줘\"\n");

  const ask = (q: string) => new Promise<string>((res) => rl.question(q, res));

  // Ctrl+C handling
  let abortController = new AbortController();
  process.on("SIGINT", () => {
    console.log("\n\n⚡ Interrupted. Aborting current turn...");
    abortController.abort();
    abortController = new AbortController();
  });

  while (true) {
    const input = await ask("\n\x1b[1m❯ \x1b[0m");
    const trimmed = input.trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit" || trimmed === "/exit") {
      console.log("\n👋 종료합니다.");
      break;
    }
    if (trimmed === "/help") {
      console.log(`
명령어:
  /help     도움말
  /clear    대화 초기화
  /status   현재 상태 (provider, cwd, 메시지 수)
  /exit     종료
  exit/quit 종료

팁:
  - "이 프로젝트 구조를 설명해줘"
  - "버그를 찾아서 고쳐줘"
  - "새 기능 X를 구현해줘"
`);
      continue;
    }
    if (trimmed === "/clear") {
      messages.length = 0;
      console.log("🧹 대화 초기화됨.");
      continue;
    }
    if (trimmed === "/status") {
      console.log(`\nProvider: ${provider.name} (${provider.model})\nCWD: ${cwd}\nMessages: ${messages.length}\nMax turns: ${maxTurns}`);
      continue;
    }

    messages.push({ role: "user", content: trimmed });
    abortController = new AbortController();

    console.log("\n" + "─".repeat(60));
    const result = await runLoop(messages, provider, cwd, maxTurns, opts, abortController.signal);
    console.log("─".repeat(60));

    // result is already pushed to messages inside runLoop
    if (result === "aborted") {
      // Remove last user message if aborted? Keep it for retry
      console.log("\n(중단됨 — 다시 시도하거나 다른 프롬프트를 입력하세요)");
    }
  }

  rl.close();
}

async function runLoop(
  messages: Message[],
  provider: ReturnType<typeof createProvider>,
  cwd: string,
  maxTurns: number,
  opts: { dangerouslySkipPermissions?: boolean },
  signal?: AbortSignal
): Promise<"done" | "aborted" | "error"> {
  let fullText = "";
  let outcome: "done" | "aborted" | "error" = "done";

  // Permission handler
  const onAskPermission = opts.dangerouslySkipPermissions
    ? async () => true
    : async (block: { type: string; name?: string; input?: Record<string, unknown> }) => {
        // For headless mode, auto-allow ask (or could require flag)
        // For interactive, ask user
        if (process.stdin.isTTY) {
          const rl = createInterface({ input: process.stdin, output: process.stdout });
          const input = block.input ?? {};
          const cmd = block.name === "Bash" ? (input.command as string) : `${block.name}(${JSON.stringify(input).slice(0, 200)})`;
          const answer = await new Promise<string>((res) =>
            rl.question(`\n❓ 권한 요청: ${block.name} — ${cmd}\n   허용? [Y/n] `, (a) => {
              rl.close();
              res(a);
            })
          );
          const trimmed = answer.trim().toLowerCase();
          return trimmed === "" || trimmed === "y" || trimmed === "yes";
        }
        // Headless: auto-allow (with warning)
        console.log(`\n⚠️  Auto-allowing (headless): ${block.name}(${JSON.stringify(block.input ?? {}).slice(0, 200)})`);
        return true;
      };

  try {
    for await (const event of queryLoop({
      provider,
      tools: ALL_TOOLS,
      cwd,
      messages,
      maxTurns,
      signal,
      onAskPermission,
    })) {
      switch (event.type) {
        case "text":
          process.stdout.write(event.text);
          fullText += event.text;
          break;
        case "tool_start":
          process.stdout.write(`\n\n🔧 ${event.tool}(${Object.entries(event.input).map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 100)}`).join(", ")})\n`);
          break;
        case "tool_result":
          process.stdout.write(`   → ${event.result.slice(0, 1000)}${event.result.length > 1000 ? "..." : ""}\n`);
          break;
        case "tool_denied":
          process.stdout.write(`\n⛔ Denied: ${event.tool} — ${event.reason}\n`);
          break;
        case "compacting":
          process.stdout.write(`\n📦 ${event.message}\n`);
          break;
        case "turn_start":
          // optional: show turn number
          break;
        case "error":
          process.stdout.write(`\n\n❌ ${event.message}\n`);
          outcome = "error";
          break;
        case "aborted":
          process.stdout.write(`\n\n⚡ ${event.reason}\n`);
          outcome = "aborted";
          break;
        case "result":
          process.stdout.write("\n");
          // Push final assistant message already done inside loop — but we need to ensure
          // the outer messages array has the assistant response. queryLoop pushes internally
          // to its own state.messages, not to our outer messages.
          // So we need to capture final state — instead, we push text to messages here:
          if (fullText) {
            messages.push({ role: "assistant", content: fullText });
          }
          outcome = "done";
          break;
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n❌ Loop error: ${msg}`);
    outcome = "error";
  }

  // If loop ended with text but no explicit result event (e.g., max_turns), ensure message saved
  if (fullText && outcome !== "aborted" && !messages.some((m) => m.role === "assistant" && m.content === fullText)) {
    // Only push if not already pushed
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant || lastAssistant.content !== fullText) {
      // Don't duplicate — queryLoop already pushed to its internal state, but not to outer.
      // For simplicity, push here if we have text
      if (outcome === "done" || outcome === "error") {
        // Check if already pushed via result event
        const alreadyPushed = messages.length > 0 && messages[messages.length - 1].role === "assistant";
        if (!alreadyPushed) messages.push({ role: "assistant", content: fullText });
      }
    }
  }

  if (outcome === "done") {
    console.log(`\n✅ 완료 (${fullText.length} chars)`);
  }

  return outcome;
}

program.parse();
