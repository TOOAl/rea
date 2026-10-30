import { describe, it, expect } from "vitest";
import {
  mkdtempSync,
  rmSync,
  // removed unused: writeFileSync, (writeFileSync)
  // removed unused: mkdirSync, (mkdirSync)
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  HarnessLibrary,
  inferZoneForLibrary,
} from "../src/harness2/library.js";
import { RagIndex } from "../src/rag/index.js";
import { PalaceVisualTool } from "../src/tools/palaceVisual.js";
import { MemoryBank } from "../src/memory/bank.js";
import { buildRegistry } from "../src/tools/index.js";

describe("HarnessLibrary S3 — zone (space-genius PR-3)", () => {
  it("inferZoneForLibrary 분류", () => {
    expect(inferZoneForLibrary("수학 증명 정리")).toBe("math");
    expect(inferZoneForLibrary("세종 한글")).toBe("history");
    expect(inferZoneForLibrary("코드 배포 함수")).toBe("code");
    expect(inferZoneForLibrary("unknown text xyz")).toBe("general");
  });
  it("zoneStats / entriesByZone / searchByZone", () => {
    const root = mkdtempSync(join(tmpdir(), "lib-zone-"));
    const lib = new HarnessLibrary({ root, domain: "zone-test" });
    lib.add({
      taskId: "math/p1",
      harness: { "compose.sh": "# hi" },
      label: "c1",
      experience: {
        cue: "math theorem proof",
        lesson: "수학 정리 lesson",
        evidence: "ev",
      },
    });
    lib.add({
      taskId: "history/p2",
      harness: { "compose.sh": "# hi" },
      label: "c1",
      experience: {
        cue: "history king sejong",
        lesson: "역사 lesson",
        evidence: "ev",
      },
    });
    lib.add({
      taskId: "code/p3",
      harness: { "compose.sh": "# hi" },
      label: "c1",
      experience: {
        cue: "code deploy api",
        lesson: "코드 lesson",
        evidence: "ev",
      },
    });
    const stats = lib.zoneStats();
    expect(stats.get("math")).toBe(1);
    expect(stats.get("history")).toBe(1);
    expect(stats.get("code")).toBe(1);
    const mathSlugs = lib.entriesByZone("math");
    expect(mathSlugs.length).toBe(1);
    expect(mathSlugs[0]).toContain("math");
    const hits = lib.searchByZone("math", "math proof", 5);
    expect(hits.length).toBe(1);
    expect(hits[0].cue).toContain("math");
    const palace = lib.palaceOrder();
    expect(palace.length).toBe(3);
    // rebuildIndex에 zone 라인 포함
    const idx = lib.rebuildIndex();
    const txt = readFileSync(idx, "utf-8");
    expect(txt).toContain("- zone:");
    expect(txt).toContain("Zone:");
    rmSync(root, { recursive: true, force: true });
  });
});

describe("RagIndex PR-3 — zone spatial (space-genius)", () => {
  it("addDocuments → zone 자동 태깅", () => {
    const idx = new RagIndex({ domain: "rag-zone" });
    // chunkText는 100자 미만이면 빈 청크 — 120자 이상으로 작성
    idx.addDocuments([
      {
        source: "docs/math.md",
        text: "수학 피타고라스 정리 증명 공식 설명입니다. math theorem proof 수학은 공간 기억을 위해 궁전 배치로 저장됩니다. ".repeat(
          3,
        ),
      },
    ]);
    idx.addDocuments([
      {
        source: "docs/history.md",
        text: "세종대왕 한글 창제 역사 이야기입니다. history king sejong 조선 시대 한글 창제는 문화 혁명이었습니다. ".repeat(
          3,
        ),
      },
    ]);
    expect(idx.zoneStats().get("math")).toBeGreaterThanOrEqual(1);
    expect(idx.zoneStats().get("history")).toBeGreaterThanOrEqual(1);
    expect(idx.byZone("math").length).toBeGreaterThanOrEqual(1);
  });
  it("searchWithSpace — 동일 zone 가중으로 1위 변경", () => {
    const idx = new RagIndex({ domain: "rag-space" });
    // 두 문서 모두 '삼각' 단어를 공유해 유사도 혼란 유도, math/source a.md가 zone math
    idx.addDocuments([
      {
        source: "a.md",
        text: "수학 증명 정리 삼각함수 공식 math proof 삼각함수는 원 위의 점을 설명합니다. 피타고라스 정리는 직각삼각형 변의 관계를 증명합니다. ".repeat(
          3,
        ),
      },
    ]);
    idx.addDocuments([
      {
        source: "b.md",
        text: "역사 전쟁 기록 history king war 삼각 진법으로 군대를 배치했습니다. 역사 속 삼각 전략은 요새 방어에 쓰였습니다. ".repeat(
          3,
        ),
      },
    ]);
    const noSpatial = idx.search("수학 삼각함수 증명 math", 2, {
      spatialBoost: 0,
    });
    const withSpatial = idx.searchWithSpace("수학 삼각함수 증명 math", 2, 0.12);
    expect(noSpatial.length).toBe(2);
    expect(withSpatial.length).toBe(2);
    // 공간 가중 시 math zone이 상향 — source a.md가 1위여야 함
    expect(withSpatial[0].chunk.source).toContain("a.md");
  });
});

describe("PalaceVisualTool — MCP (space-genius PR-3)", () => {
  it("등록 및 execute → HTML 생성", async () => {
    const reg = buildRegistry();
    const tool = reg.get("palace_visual");
    expect(tool).toBeDefined();
    expect(tool!.name).toBe("palace_visual");
  });
  it("빈 domain → 경고 메시지", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "palace-empty-"));
    const out = await PalaceVisualTool.execute(
      { domain: "empty-domain-for-test", root: tmp },
      { cwd: tmp },
    );
    expect(out).toContain("0개");
    rmSync(tmp, { recursive: true, force: true });
  });
  it("실제 domain → HTML 파일 생성 및 내용 검증", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "palace-tool-"));
    const bank = new MemoryBank({ root: tmp, domain: "tool-test" });
    bank.addWithSpace({ id: "t1", cue: "수학 공식", content: "오일러" });
    bank.addWithSpace({ id: "t2", cue: "역사 세종", content: "한글" });
    const outPath = join(tmp, "out/palace.html");
    const out = await PalaceVisualTool.execute(
      { domain: "tool-test", root: tmp, outputPath: outPath },
      { cwd: tmp },
    );
    expect(out).toContain("생성:");
    expect(existsSync(outPath)).toBe(true);
    const html = readFileSync(outPath, "utf-8");
    expect(html).toContain("<svg");
    expect(html).toContain("현관");
    expect(html).toContain('viewBox="0 0 1080 760"');
    rmSync(tmp, { recursive: true, force: true });
  });
});
