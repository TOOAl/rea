# Gemini 4 Carbon 흡수 — REA에 녹여내기

> 2026-10-30 | gil257 224457789740 + Google 2026-10-28 교차 검증 | main e9c3c6d (0 warnings)

## 한 줄 요약

**Carbon은 “방어자에게 먼저” 주는 59점짜리 보안 AI — REA는 그 검증·패치·장시간 루프를 증거(Evidence)로 흡수한다.**

## 왜 지금 흡수하나 (블로그가 말한 3가지)

1. **모델 순위 1위** — AA v5.0 59점 (Claude 58, GPT-6 57, Argon 50). 15/19 벤치마크 1위
2. **보안 3종 세트** — SEC-bench 88.2% 찾기, ExploitGym 54.8% 재현, CWE-bench 71% 패치 + Chrome 10배
3. **TPU 외부 판매 + Genie 4 오디오 2분** — 구글 TPU가 엔비디아 대안이 되고, 월드모델이 말까지 함

블로그 한 줄: “구글이 모델 순위와 칩, 월드 모델까지 한 번에 밀어붙인 하루でした.”

## Carbon이 REA에 주는 것 (Ghidra 매핑)

| Carbon 수치 | REA 모듈 | 검증 방법 | 가격·배포 힌트 |
|---|---|---|---|
| SEC-bench 88.2% | `carbonSecureScanner` | `rea carbon scan --file src/app.ts` → `ev_<sha>` | $2/$10 캐시 95% → evidence_links 재사용 |
| ExploitGym 54.8% | `carbonExploitVerifier` | `rea carbon verify --file src/app.ts` → dry-run 샌드박스 | 격리 실행, 네트워크 차단 |
| CWE-bench 71% + 10배 | `carbonSecurePatcher` | `rea carbon patch --file src/app.ts` → `old→new + test` | Chrome 내부 10배는 “검증된 패치”에만 해당 |
| Terminal-Bench 65.2% | `carbonLongHorizonPlanner` | `rea carbon plan --goal "Rust migration"` → 10 step + daily checkpoint | 며칠→checkpoint로 분해 (Ghidra: 주소=checkpoint) |
| 정직성 -50%/-80% | `carbonTransparencyGate` | caveat를 결과에 직접 적고 remaining 반환 | `confidence: inferred` + `limitations` |
| 협업 -26%/-29% | `carbonCollaborationGate` | 모호하면 출처 3개와 함께 `ask` | “추측 말고 검색” |
| 인젝션 0.0% | `carbonInjectionShield` | `rea carbon shield --text "..."` → blocked | Gray Swan 0.7%→0.0% |
| WebDev #4 1769 | 기존 `WebModuleTraceService` + Carbon 패치 힌트 | `WebDev Arena` 재현은 다음 PR | — |
| $2/$10 → $4/$20 | `carbonTokenMeter` | `rea carbon meter` → costUsd | Intro 가격으로 시뮬레이션 |

## 증거 원칙 (REA 본업)

```ts
// 모든 Carbon 결과는 Evidence — Ghidra가 주소를 증거로 보듯, REA는 evidence_id를 주소로 본다
createEvidence(subject, CARBON_PROVIDER, {
  operation: "carbon/secure-scan",
  parameters: { file: "src/app.ts" },
  result: { vulns, count: 3 },
  limitations: CARBON_LIMITATIONS, // 3줄 고정
})
// → { evidence_id: "ev_<sha256>", confidence: "observed", authority: "controlled-replay" }
```

- **observed**: 실제 코드에서 찾은 vuln (SEC-bench)
- **derived**: 패치처럼 추론한 결과 (CWE-bench)
- **inferred**: 장시간 계획처럼 모델이 추정한 경로 (Terminal-Bench)

## CLI 4종 (이번 커밋)

```bash
rea carbon scan --file src/app.ts      # 8종 CWE 패턴 스캔 → vulns + ev_*
rea carbon verify --file src/app.ts    # dry-run 격리 검증 → reproduced true/false
rea carbon patch --file src/app.ts     # old→new + test + limitation (high/standard)
rea carbon plan --goal "Rust migration" # 10 step + daily checkpoint
rea carbon shield --text 'require("node:fs")' # blocked true
rea carbon meter                        # $2/$10 → $4/$20 시뮬레이션
```

## Ghidra 관점 — 왜 2주 만에 9점 올랐나

- **모델이 모델을 개선**: Argon 50→ Carbon 59는 “연구자+모델 협업 루프” — REA도 `analysis.execute("analyze_function")` 루프를 며칠 돌려 자가개선
- **안전 스택**: Argon 동일 + chain-of-thought 모니터링 — 매 reasoning step 감시 (Ghidra P-Code처럼 모든 분기 검증)
- **제한적 공개**: 88% 찾기 + 54% 익스플로잇은 공격자도 쓸 수 있어 Fairwind Program으로 방어자 먼저 — Ghidra도 강력하지만 배포는 신중

## 다음 PR

- `verify:carbon`을 실제 SEC-bench 스타일 내부 벤치 80%+와 연결 (샌드박스)
- LongHorizon을 며칠 테스트로 확장 — `checkpoint`를 파일로 persist
- WebDev #4 재현 — `WebModuleTraceService`에 Carbon 패치 품질 힌트 주입

## 출처

- gil257 224457789740 (2026-10-29 14:13) — 59점 1위, 88.2/54.8/71.0, 10배, $2/$10, Fairwind, TPU, Genie 4 2분
- Google DeepMind 2026-10-28 — AA 59, SEC-bench 88.2, ExploitGym 54.8, CWE-bench 71, Terminal-Bench 65.2, WebDev 1769
- 교차: 9to5Google, MarkTechPost, explainx.ai 2026-10-30, iWeaver, SmartScope
- REA: main e9c3c6d (0 warnings, 2989 PASS)
