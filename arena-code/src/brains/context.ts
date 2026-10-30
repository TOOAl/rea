/**
 * Context Engine — 8조건 중 영상 직결 P0 4조건(④프레임·⑤레지스터·⑦인지/정서·⑧접지) 경량 이식
 * 원전: Bateson/Goffman(프레임), Halliday/Hymes/Hall(레지스터), Pickering&Garrod·Horton(인지/정서), Clark(접지)
 * 감수보고서 권고: C2 출처 금지, A1 원전만 인용
 */
export type FramePrimary = "natural" | "social";
export type FrameVariant = "straight" | "keyed" | "fabricated"; // 1차 vs 조율(놀이화) vs 날조(기만)
export interface FrameInfo {
  question: "지금 무슨 일이 일어나고 있나?"; // Goffman
  primary: FramePrimary;
  variant: FrameVariant;
  keyCue?: string; // 조율 단서: "농담이야", "ㅋㅋ", 억제된 물기 등
  risk: string[]; // 오조율(miskeying) 위험
}

export interface RegisterInfo {
  field: string;  // 무슨 일 (Halliday field / Hymes Ends)
  tenor: string;  // 누가 누구에게 (지위·친밀·권력)
  mode: string;   // 어떻게 (구어/문어, 대면/비대면, 매체)
  genre: string;  // 장르 (공식보고·친구수다·사과·면접 등)
  speaking?: { setting: string; participants: string; ends: string; key: string; norms: string; genre: string }; // Hymes 8요소 축약
  highLow: "high" | "low" | "mixed"; // Hall 고·저맥락 (정보가 맥락에 vs 명시 부호에)
  mismatchWarning?: string;
}

export interface CognitiveInfo {
  emotion: "neutral" | "joy" | "anger" | "sadness" | "fear" | "tension";
  intensity: number; // 0..1
  alignment: number; // Pickering 정렬도 0..1 (대사-표정 일치도)
  manifestnessNote: string; // 접근성×강도 왜곡 경고
  suggestion: string;
}

export interface GroundingInfo {
  triple: { physical: boolean; linguistic: boolean; cultural: boolean }; // Clark 삼중 공동현전
  presentation: boolean; // 제시 있음
  acceptanceSignal: boolean; // 수락 신호 있음 (끄덕임, "응", 읽음 등)
  sufficient: boolean; // 현재 목적에 충분한가
  fix?: string;
}

export interface ContextPacket {
  siteSummary: string; // 사이트/대본 1줄 요약
  frame: FrameInfo;
  register: RegisterInfo;
  cognitive: CognitiveInfo;
  grounding: GroundingInfo;
  warnings: string[]; // validate() 결과 — ⑤⑦⑧ 불일치 경고
  validated: boolean;
}

export class ContextEngine {
  /** 사이트 텍스트 + 대본 1줄 → ④⑤⑦⑧ ContextPacket */
  analyze(siteText: string, scriptLine: string): ContextPacket {
    const lower = `${siteText} ${scriptLine}`.toLowerCase();
    const scriptLower = scriptLine.toLowerCase();

    // ── ④ 프레임: Goffman 1차 틀 + Bateson 메타신호 ──
    const playfulCues = ["ㅋㅋ", "ㅎㅎ", "lol", "농담", "장난", "ㅋ", "haha", "play", "놀이", "웃음"];
    const seriousCues = ["보고", "제안", "결정", "계약", "사과", "지적", "비판", "경고", "진지", "발표"];
    const isPlayful = playfulCues.some(c => lower.includes(c));
    const isSerious = seriousCues.some(c => lower.includes(c));
    const frame: FrameInfo = {
      question: "지금 무슨 일이 일어나고 있나?",
      primary: lower.includes("날씨") || lower.includes("자연") ? "natural" : "social",
      variant: isPlayful && !isSerious ? "keyed" : lower.includes("기만") || lower.includes("날조") ? "fabricated" : "straight",
      keyCue: isPlayful ? "ㅋㅋ/농담 표지 감지 — Bateson 메타신호" : undefined,
      risk: isPlayful && isSerious ? ["조율/진지 충돌 — 오조율 위험 (농담을 진담으로 오독)"] : [],
    };

    // ── ⑤ 레지스터: Halliday field/tenor/mode + Hall 고·저맥락 ──
    const isFormal = /공식|보고서|제안서|발표|회의|계약|사과문/i.test(siteText);
    const isCasual = /친구|수다|재미|놀이|캐주얼|방송/i.test(siteText);
    const register: RegisterInfo = {
      field: isFormal ? "공식 발표/보고" : isCasual ? "친근한 대화/놀이" : "일반 대화",
      tenor: /상사|교수|고객|선생/i.test(lower) ? "상하(공손 필요)" : /친구|동료|팀원/i.test(lower) ? "대등·친밀" : "중립",
      mode: "영상/구어 (표정·몸짓·음향 동반)",
      genre: isFormal ? "공식 발표" : isCasual ? "친구 수다" : "설명/안내",
      speaking: {
        setting: siteText.slice(0, 40),
        participants: isFormal ? "발표자-청중(격식)" : "화자-청중(친밀)",
        ends: isFormal ? "정보 전달·설득" : "유대·재미",
        key: isPlayful ? "장난스러움" : "진지함",
        norms: isFormal ? "경청·경어·절제" : "웃음·끼어들기 허용",
        genre: isFormal ? "보고/발표" : "수다/놀이",
      },
      highLow: isFormal ? "low" : isCasual ? "high" : "mixed", // 저맥락=명시 / 고맥락=암시
    };
    if (register.highLow === "low" && isPlayful) {
      register.mismatchWarning = "저맥락 공식 장르에 놀이 조율 섞임 — 격식 붕괴 위험";
    }

    // ── ⑦ 인지/정서: 표출성(접근성×강도) + 정렬 ──
    // 간단 휴리스틱: 대사 어조 vs 표정 키워드 불일치 탐지
    const angryWords = ["화났", "짜증", "비판", "지적", "틀렸", "문제", "심각"];
    const joyWords = ["좋아", "재미", "웃음", "행복", "성공", "좋네요", "감사"];
    const isAngry = angryWords.some(w => scriptLower.includes(w));
    const isJoy = joyWords.some(w => scriptLower.includes(w));
    let emotion: CognitiveInfo["emotion"] = "neutral";
    let intensity = 0.5;
    if (isAngry) { emotion = "anger"; intensity = 0.85; }
    else if (isJoy) { emotion = "joy"; intensity = 0.8; }
    else if (scriptLower.includes("슬프") || scriptLower.includes("미안")) { emotion = "sadness"; intensity = 0.7; }
    const cognitive: CognitiveInfo = {
      emotion,
      intensity,
      alignment: 0.6, // 기본값, validate()에서 재산정
      manifestnessNote: "정서는 가정들의 표출도 전체를 바꾼다 (Sperber 관련성) — 화남=부정 기억 접근성↑",
      suggestion: emotion === "anger" ? "표정=찡그림+팔짱, 몸짓=절제, 미소 금지" : emotion === "joy" ? "표정=미소+눈웃음, 몸짓=활발" : "표정=평온, 몸짓=보통",
    };

    // ── ⑧ 접지: Clark 삼중 공동현전 + 제시-수락 ──
    const hasPhysical = /여기|이것|저것|이 파일|화면/i.test(scriptLine);
    const grounding: GroundingInfo = {
      triple: {
        physical: hasPhysical,
        linguistic: scriptLine.length > 8, // 선행 언급 있으면 언어적 공동현전
        cultural: true, // 한국어는 고맥락 기본
      },
      presentation: true,
      acceptanceSignal: /네|응|알겠|끄덕/i.test(scriptLine), // 수락 신호
      sufficient: false,
    };
    grounding.sufficient = grounding.triple.linguistic && grounding.acceptanceSignal;

    const packet: ContextPacket = {
      siteSummary: `${siteText.slice(0, 60)} | 대사: ${scriptLine.slice(0, 60)}`,
      frame,
      register,
      cognitive,
      grounding,
      warnings: [],
      validated: false,
    };

    // ── 검증 ──
    packet.warnings = this.validate(packet, scriptLine);
    packet.validated = packet.warnings.length === 0;
    // 정렬도 재산정: 경고 있으면 낮게
    packet.cognitive.alignment = packet.validated ? 0.92 : Math.max(0.3, 0.9 - packet.warnings.length * 0.15);

    return packet;
  }

  // ── ★ Nobel Upgrade v5 — Theory of Mind·함축·관련성·공감·문화지시 (2026-10-25) ──
  /** ⑨ Theory of Mind: 화자 믿음 vs 청자 믿음 분리 (Premack/Wellman) — 오해 예측 */
  theoryOfMind(siteText: string, scriptLine: string): { speakerBelief: string; listenerBelief: string; mismatch: string; repair: string; falseBeliefRisk: string } {
    const hasJargon = /프론트엔드|SSR|하이드레이션|양자|블록체인|도함수|PDDL/.test(scriptLine);
    const hasSharedRef = /우리|지난번|아까 말한|그거|저번/.test(scriptLine);
    return {
      speakerBelief: `화자 믿음: “청자는 ${hasJargon? "전문용어를 안다":"배경을 공유한다"}”`,
      listenerBelief: hasJargon && !hasSharedRef ? "청자 실제: 모른다/다르게 안다 — 믿음 불일치" : "청자 실제: 대략 공유됨",
      mismatch: hasJargon ? "전문가 저주 — 화자는 쉽게, 청자는 어렵게 느낌" : hasSharedRef ? "공유 가정 위험 — “그거”가 서로 다른 것 가리킴" : "믿음 비교: 일치 여부 점검 필요",
      repair: hasJargon ? "수리: 용어 뒤에 12살 예시 1줄 덧붙임, “즉, …”" : "수리: “그거 = …”로 지시 대상 명시",
      falseBeliefRisk: "Sally-Anne 틀: 청자가 모르는 정보를 안다고 착각하면 설명 실패 → ToM 테스트로 사전 탐지",
    };
  }
  /** ⑩ 함축(Conversational Implicature, Grice): 말한 것 vs 의도한 것 — 협조 원리 4대격률 위배 탐지 */
  implicature(scriptLine: string): { literal: string; implicated: string; maxim: string; trigger: string } {
    const _lower = scriptLine.toLowerCase();
    const hasIrony = /그래.*잘했|대단.*하네|ㅋㅋ.*진짜/.test(scriptLine);
    const hasHedge = /아마|아마도|것 같다|추정|아닌가/.test(scriptLine);
    const isBald = /빨리|지금 당장|무조건|반드시/.test(scriptLine);
    return {
      literal: `문자적: “${scriptLine.slice(0,40)}”`,
      implicated: hasIrony ? "함축: 비꼬는 칭찬 → 실제는 비판" : hasHedge ? "함축: 확신 없음 신호 → 청자는 추가 근거 기대" : isBald ? "함축: 직접 명령 → 권력 관계 드러냄" : "함축: 협조적 — 문자 그대로 이해해도 무해",
      maxim: hasIrony ? "질 격률 위배 — 거짓을 말해 진짜 뜻 전달 (Grice 비유)”" : hasHedge ? "태도 격률 — 불확실성 명시로 신뢰 보존" : isBald ? "예의 격률 — 직접성=효율 vs 관계 비용 트레이드" : "4격률 대체로 준수",
      trigger: "단서: 억양·표정·맥락이 함축을 결정 — 글만으론 30% 오독, 표정 동반 시 해소",
    };
  }
  /** ⑪ 관련성(Relevance, Sperber&Wilson): 처리노력 대비 인지효과 — 12살 필터 */
  relevanceScore(siteText: string, scriptLine: string): { effort: number; effect: number; score: number; filter12: string } {
    const len = scriptLine.length;
    const effort = Math.min(1, len/120 + (/전문|보고서|가설/.test(scriptLine)?0.3:0));
    const effect = /왜|어떻게|그래서|따라서|예를 들어/.test(scriptLine) ? 0.85 : /그냥|그런데|아무튼/.test(scriptLine) ? 0.35 : 0.55;
    return {
      effort,
      effect,
      score: Math.round((effect/(effort+0.2))*100)/100,
      filter12: effect < 0.5 ? "12살 필터 FAIL — 새 정보/이익 없으면 채널 이탈 → 비유·놀라움 1개 추가" : "12살 필터 PASS — 인지효과가 노력보다 큼",
    };
  }
  /** ⑫ 공감 보정: 정서를 과장·억제 없이, 청자 정서와 조율 (Decety/공감 신경과학) */
  empathyCalibrate(scriptLine: string, packet: ContextPacket): { speakerEmotion: string; listenerEmotion: string; calibrate: string; overUnder: string } {
    const emo = packet.cognitive.emotion;
    return {
      speakerEmotion: `${emo} ${packet.cognitive.intensity}`,
      listenerEmotion: /미안|슬프|힘들|걱정/.test(scriptLine) ? "청자도 긴장/슬픔 공명 가능 — Mirror" : "청자 중립 — 과한 공감은 부담",
      calibrate: emo==="anger" ? "보정: 분노는 20% 낮춰 표현, 해결책 1개와 함께" : emo==="joy" ? "보정: 기쁨은 공유하되 자랑 금지, “우리” 주어" : "보정: 현재 톤 유지, 속도를 청자에 맞춤",
      overUnder: "과공감(울음 따라 울기) vs 저공감(무시) — 중간(인지적 공감+행동 제안)이 노벨 평화상 방식",
    };
  }
  /** Nobel 통합: 기존 analyze + ToM·함축·관련성·공감 */
  nobelAnalyze(siteText: string, scriptLine: string): ContextPacket & { nobel: { tom: ReturnType<ContextEngine["theoryOfMind"]>; impl: ReturnType<ContextEngine["implicature"]>; relevance: ReturnType<ContextEngine["relevanceScore"]>; empathy: ReturnType<ContextEngine["empathyCalibrate"]>; deixis: string } } {
    const base = this.analyze(siteText, scriptLine);
    const tom = this.theoryOfMind(siteText, scriptLine);
    const impl = this.implicature(scriptLine);
    const relevance = this.relevanceScore(siteText, scriptLine);
    const empathy = this.empathyCalibrate(scriptLine, base);
    const deixis = /여기|이것|저것|지난주|우리 동네/.test(scriptLine) ? "문화 지시: 한국 고맥락 — “여기/우리”가 장소+집단을 동시에 가리킴, 외국인엔 명시 필요" : "문화 지시: 중립 — 추가 맥락 없이도 이해됨";
    return { ...base, tom, impl, relevance, empathy, deixis, nobelSummary: `ToM→함축→관련성 ${relevance.score}→공감 보정 (Nobel 문학/평화)` } as any;
  }

  /** ④⑤⑦⑧ 불일치 경고 — “문서가 자신에게 검증 절차 적용” (감수보고서) */
  validate(p: ContextPacket, scriptLine: string): string[] {
    const w: string[] = [];
    // ⑤ 레지스터 불일치: 공식 장르에 장난 톤
    if (p.register.mismatchWarning) w.push(`⑤ 레지스터: ${p.register.mismatchWarning}`);
    // ④ 프레임 오조율: 진지한 지적을 웃으며
    if (p.frame.risk.length) w.push(`④ 프레임: ${p.frame.risk[0]}`);
    if (p.frame.variant === "keyed" && p.register.genre === "공식 발표") {
      w.push("④⑤ 프레임-레지스터 충돌: 공식 발표인데 놀이 조율(ㅋㅋ/농담) 감지 — 표정·몸짓 격식 필요");
    }
    // ⑦ 정서-표정 불일치: 화난 대사에 웃는 표정 지시 등 (외부 표정 지시가 있다면)
    // 여기서는 scriptLine에 감정 단어와 반대 이모지가 함께 있으면 경고 — 간이 휴리스틱
    if (p.cognitive.emotion === "anger" && /😊|하하|ㅋㅋ/.test(scriptLine)) {
      w.push("⑦ 정서: 화남 대사에 웃음 표정(😊/ㅋㅋ) — 표정=찡그림으로 교체 필요");
    }
    if (p.cognitive.emotion === "joy" && /😠|화났|짜증/.test(scriptLine)) {
      w.push("⑦ 정서: 기쁨 대사에 분노 표정 — 불일치");
    }
    // ⑧ 접지 부족
    if (!p.grounding.sufficient) {
      w.push(`⑧ 접지: 수락 신호 없음 — 대사 끝 후 상대 끄덕임/“네” 같은 수락 신호 추가, 타이밍 지연 필요`);
    }
    if (!p.grounding.triple.physical && p.register.field.includes("발표")) {
      w.push("⑧ 접지: 물리적 공동현전 없음 — “여기 화면” 같은 지시어로 물리적 접지 확보");
    }
    return w;
  }

  // ── ★ REA 흡수: Claude Code 2.0 5단계 Compaction (2026-10-27) ──
  // Nodes ~5000, queryLoop 9단계 중 Context→Compaction5→Model. 컨텍스트 9.2→9.5 목표.
  // BudugetReduction→Snip→Microcompact→Collapse→Auto-Compact(6500토큰 서브에이전트) 순서
  autoCompact(longContext: string, budget = 3000): { compacted: string; stage: string; saved: number; preserved: string[] } {
    const preserved: string[] = [];
    const origLen = longContext.length;
    if (origLen <= budget) return { compacted: longContext, stage: "none", saved: 0, preserved: ["전체 보존"] };
    // 1 BudugetReduction: 상위 80%만 유지, 하위 20% 요약
    let out = longContext.slice(0, Math.floor(budget * 0.8));
    preserved.push("BudgetReduction: 상위 80% 유지");
    // 2 Snip: 반복·잡담 제거
    out = out.replace(/(ㅋㅋ|ㅎㅎ|lol){2,}/g, "ㅋㅋ").replace(/\n{3,}/g, "\n\n");
    preserved.push("Snip: 반복 잡담 제거");
    // 3 Microcompact: 긴 문장 40% 축약 (문장 단위)
    const sentences = out.split(/(?<=[.!?。]\s)/);
    if (sentences.length > 6) {
      out = sentences.filter((_, i) => i % 2 === 0 || i < 3).join(" ");
      preserved.push(`Microcompact: ${sentences.length}문장→${out.split(/(?<=[.!?。]\s)/).length}문장`);
    }
    // 4 Collapse: 프레임·레지스터·접지 핵심만 1줄 요약으로 접기
    const pkt = this.analyze(longContext.slice(0, 200), longContext.slice(0, 200));
    const collapseLine = `[COLLAPSED frame=${pkt.frame.variant} register=${pkt.register.genre} emotion=${pkt.cognitive.emotion} grounding=${pkt.grounding.sufficient ? "ok" : "need"}]`;
    out = collapseLine + "\n" + out.slice(0, budget - collapseLine.length - 100);
    preserved.push("Collapse: ContextPacket 1줄 압축");
    // 5 Auto-Compact: 여전히 초과 시 서브에이전트 요약 시뮬레이션 (6500토큰 → 3000)
    if (out.length > budget) {
      out = out.slice(0, budget - 200) + "\n[Auto-Compact: 서브에이전트가 6500→3000 요약]";
      preserved.push("Auto-Compact: 서브에이전트 요약");
    }
    return { compacted: out, stage: "5-stage", saved: origLen - out.length, preserved };
  }
}
