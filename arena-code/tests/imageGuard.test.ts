import { describe, it, expect } from "vitest";
import {
  verifyImageText,
  guardedGenerate,
  checkBrokenHangul,
} from "../src/visual/imageGuard.js";

describe("ImageGuard — 3바퀴 룰", () => {
  it("깨진 한글(靑/자모분리) 탐지", () => {
    const broken = "靑 면밀 주시 ㄱㄴㅏㅣ";
    const issues = checkBrokenHangul(broken);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.join("")).toMatch(/靑|자모/);
  });
  it("정상 한글은 PASS", () => {
    const ok = "김정은 깜짝 방중, 청와대 면밀 주시 2026.10.24";
    const res = verifyImageText(ok, {
      expectedKeywords: ["김정은", "청와대"],
      expectedPerson: "리창",
      topic: "naver-0016398151",
    });
    // 청와대 관련 키워드는 있지만 인물 리창 누락 → 인물 이슈는 나지만 깨짐은 아님
    expect(res.issues.some((i) => /깨진/.test(i))).toBe(false);
  });
  it("인물 불일치(리창→시진핑) 차단", () => {
    const ocr = "김정은 방중 시진핑 만남 APEC";
    const res = verifyImageText(ocr, { expectedPerson: "리창" });
    expect(res.blocked).toBe(true);
    expect(res.issues.join("")).toMatch(/인물 불일치/);
  });
  it("guardedGenerate — 깨진 첫 시도는 재시도, 두번째 PASS", async () => {
    let call = 0;
    const { finalResult, attempts, logs } = await guardedGenerate(
      async (attempt) => {
        call++;
        if (attempt === 1)
          return { imagePath: "images/broken.jpg", ocrText: "靑 ㄱㄴ" }; // 깨짐
        return {
          imagePath: "images/fixed.jpg",
          ocrText: "김정은 방중 리창 만남 청와대 APEC 신압록강 라오닝 단둥",
        };
      },
      {
        expectedKeywords: ["김정은", "청와대", "라오닝"],
        expectedPerson: "리창",
        topic: "naver-0016398151",
        maxRetries: 3,
      },
    );
    expect(attempts).toBe(2);
    expect(finalResult.ok).toBe(true);
    expect(logs.join("\n")).toMatch(/재생성/);
  });
  it("3회 실패 시 차단(에스컬레이션)", async () => {
    const { finalResult, attempts } = await guardedGenerate(
      async () => ({ imagePath: "x.jpg", ocrText: "□ □ □" }),
      { maxRetries: 3 },
    );
    expect(attempts).toBe(3);
    expect(finalResult.blocked).toBe(true);
  });
});
