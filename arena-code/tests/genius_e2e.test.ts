import { describe, it, expect } from "vitest";
import { SkillManager } from "../src/skills/index.js";
import * as path from "node:path";

const ROOT = path.resolve(".");

describe("genius e2e: natural language triggers + description + injection", () => {
  it("description 파서가 frontmatter description을 정확히 추출한다", () => {
    const m = new SkillManager(ROOT);
    expect(m.get("genius_curie")?.description).toBe(
      "마리 퀴리 사고 — 측정·반복·실패 로그로 발견하는 스킬",
    );
    expect(m.get("genius_da_vinci")?.description).toBe(
      "레오나르도 다빈치 사고 — 관찰·스케치·연결로 보는 스킬",
    );
    expect(m.get("genius_euler")?.description).toBe(
      "레온하르트 오일러 사고 — 기호·일반화·우아한 계산으로 푸는 스킬",
    );
    expect(m.get("genius_turing")?.description).toBe(
      "앨런 튜링 사고 — 형식화·해독·모방검증으로 푸는 스킬",
    );
    // allDescriptions에도 올바른 설명이 노출되어야 함 ("---" 아님)
    const all = m.allDescriptions();
    expect(all).toContain("마리 퀴리 사고");
    expect(all).not.toMatch(/\/genius_curie: ---/);
  });

  it("triggers가 파싱되어 Skill에 저장된다", () => {
    const m = new SkillManager(ROOT);
    expect(m.get("genius_curie")?.triggers).toEqual(
      expect.arrayContaining(["퀴리", "curie", "측정"]),
    );
    expect(m.get("genius_da_vinci")?.triggers).toEqual(
      expect.arrayContaining(["다빈치", "da vinci", "관찰"]),
    );
    expect(m.get("genius_euler")?.triggers).toEqual(
      expect.arrayContaining(["오일러", "euler", "일반화"]),
    );
    expect(m.get("genius_turing")?.triggers).toEqual(
      expect.arrayContaining(["튜링", "turing", "형식화"]),
    );
  });

  it("자연어 트리거 라우팅: '/' 없이도 한글/영문 키워드로 스킬 매칭", () => {
    const m = new SkillManager(ROOT);
    const cases: Array<[string, string]> = [
      ["퀴리처럼 생각해", "genius_curie"],
      ["측정해줘 이 바이너리", "genius_curie"],
      ["curie 측정 결과 보여줘", "genius_curie"],
      ["반복 실패 로그 남겨줘", "genius_curie"],
      ["다빈치처럼 관찰해줘", "genius_da_vinci"],
      ["스케치해줘 연결해줘", "genius_da_vinci"],
      ["da vinci 스케치 부탁", "genius_da_vinci"],
      ["오일러처럼 일반화해줘", "genius_euler"],
      ["euler 공식 만들어줘", "genius_euler"],
      ["우아한 증명 부탁해", "genius_euler"],
      ["튜링처럼 형식화해줘", "genius_turing"],
      ["turing 해독 부탁", "genius_turing"],
      ["암호 계산가능 모방 검증해줘", "genius_turing"],
    ];
    for (const [msg, expected] of cases) {
      const r = m.parseCommand(msg);
      expect(r, `parseCommand("${msg}")`).not.toBeNull();
      expect(r!.skill).toBe(expected);
      expect(r!.args).toBe(msg); // 자연어는 원문 그대로 args
    }
    // 슬래시 커맨드도 여전히 동작
    expect(m.parseCommand("/genius_curie 슬래시 테스트")?.skill).toBe("genius_curie");
    expect(m.parseCommand("/plan")?.skill).toBe("plan");
    // 일반 대화는 null
    expect(m.parseCommand("일반 대화문장")).toBeNull();
    expect(m.parseCommand("안녕하세요")).toBeNull();
  });

  it("최장 트리거 우선: 긴 트리거가 짧은 트리거보다 우선", () => {
    const m = new SkillManager(ROOT);
    // "da vinci" (8자) vs "다빈치" (3자) — 둘 다 다빈치 스킬이지만 긴 트리거 검증용
    // 동일 메시지에서 더 긴 트리거가 선택되는지 확인: 내부 best 로직은 trigger.length 기준
    const msg = "da vinci 스케치와 다빈치 관찰을 함께";
    const r = m.parseCommand(msg);
    expect(r?.skill).toBe("genius_da_vinci");
  });

  it("formatForPrompt가 출력 규칙을 포함한다", () => {
    const m = new SkillManager(ROOT);
    const curie = m.formatForPrompt("genius_curie")!;
    expect(curie).toContain("퀴리 측정:");
    expect(curie).toContain("퀴리 반복:");
    expect(curie).toContain("퀴리 실패 로그:");
    expect(curie).toContain("CONFIRMED");

    const davinci = m.formatForPrompt("genius_da_vinci")!;
    expect(davinci).toContain("다빈치 관찰:");
    expect(davinci).toContain("다빈치 스케치:");
    expect(davinci).toContain("다빈치 연결:");

    const euler = m.formatForPrompt("genius_euler")!;
    expect(euler).toContain("오일러 기호:");
    expect(euler).toContain("오일러 일반화:");
    expect(euler).toContain("오일러 계산:");

    const turing = m.formatForPrompt("genius_turing")!;
    expect(turing).toContain("튜링 형식화:");
    expect(turing).toContain("튜링 해독:");
    expect(turing).toContain("튜링 모방:");
  });

  it("e2e: 실제 REA 프롬프트에 Genius 프롬프트 인젝션 시 출력 규칙이 유지된다", () => {
    const m = new SkillManager(ROOT);
    // 시나리오: 사용자가 바이너리 분석을 요청, 자연어 트리거로 퀴리 스킬 발동
    const userPrompt = "이 바이너리에서 C2 서버를 찾아줘. UPX 패킹 의심됨.";
    const triggerMsg = "퀴리처럼 측정해줘 " + userPrompt;
    const parsed = m.parseCommand(triggerMsg);
    expect(parsed).not.toBeNull();
    expect(parsed!.skill).toBe("genius_curie");

    const skillPrompt = m.formatForPrompt(parsed!.skill)!;
    // LLM에 전달될 최종 프롬프트 시뮬레이션: skill 프롬프트 + 사용자 프롬프트
    const finalPrompt = skillPrompt + "\n\n## User Request\n" + userPrompt;

    // 최종 프롬프트가 3단계와 출력 규칙을 모두 포함하는지 검증
    expect(finalPrompt).toContain("3단계");
    expect(finalPrompt).toContain("측정 (Mesure)");
    expect(finalPrompt).toContain("반복 (Répétition)");
    expect(finalPrompt).toContain("실패 로그");
    expect(finalPrompt).toContain("퀴리 측정:");
    expect(finalPrompt).toContain(userPrompt);

    // 다빈치 시나리오도 동일 검증
    const davinciTrigger = "다빈치처럼 관찰하고 스케치해줘 " + userPrompt;
    const davinciParsed = m.parseCommand(davinciTrigger);
    expect(davinciParsed?.skill).toBe("genius_da_vinci");
    const davinciPrompt = m.formatForPrompt(davinciParsed!.skill)!;
    expect(davinciPrompt).toContain("관찰 (Osservazione)");
    expect(davinciPrompt).toContain("스케치 (Dimostrazione)");
    expect(davinciPrompt).toContain("연결 (Collegamento)");

    // 오일러 + 튜링도 검증
    expect(m.formatForPrompt("genius_euler")!).toContain("기호 발명 (Notation)");
    expect(m.formatForPrompt("genius_turing")!).toContain("형식화 (Formalize)");
  });
});
