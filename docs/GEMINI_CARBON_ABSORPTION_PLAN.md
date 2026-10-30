# Gemini 4 Carbon REA·Ghidra 흡수 10점 로드맵 (2026-10-28 기준)

> **목표**: `TOOAl/rea main@8ee6ca0` (4678 files 0/0) 위에 Naver gil257/224457789740 기사 + 9to5Google/MarkTechPost 기반 Gemini 4 Carbon (59 AA v5 #1, 88.2% SEC-bench, 65.2% Terminal-Bench 4.0)을 REA·Ghidra로 분석·흡수하여 백엔드 9.5→10, 코드품질 8.5→10을 동시 달성.

## 0. 배경 정리 (외부 소스)

- **Genie 4 (2026-10-27)**: TechCrunch/MarkTechPost — audio 대화 + 2분(더블 Genie3) + Gemini 3.8 Flash planner + real-time steering (이미 흡수 설계 완료).
- **Gemini 4 Carbon (2026-10-28)** — 9to5Google/LiveMint/Android Authority + Naver gil257 224457789740:
  - AA v5 #1 59점 (Opus 58, Astra 57), SEC-bench 88.2%, Chrome 10배 패치, WebDev 4위
  - coding/agentic/cybersecurity 강세, Terminal-Bench 4.0 65.2% (Opus 59) vs 59%
  - 가격 $2/$10 → $4/$20 (intro), cached 95% off, Fairwind cyber defenders 우선
  - “Carbon”은 추론 효율·보안·에이전트 3축 강화로 추정

## 1. REA 흡수 원칙 (10점 기준)

1. **lint 0/0 불변**: 신규 모듈도 `max-lines 500 (skipComments/skipBlank)` + `boundaries` 통과.
2. **<500 분해 유지**: Carbon 관련 신규 코드도 `Core/Part2` 패턴 (이번 PR에서 검증됨) 적용.
3. **증거 기반**: 모든 Carbon 기능은 `Evidence`+`provider`+`limitation`으로 기록.

## 2. Ghidra 분석 파이프라인

| 단계 | 입력                                                                              | 도구                                                                            | 출력                                                     |
| ---- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| G-1  | Gemini Carbon 공개 바이너리 스냅샷 (해당시 WabtRelease처럼 `toolBytes` 해시 고정) | `GhidraInventoryValues` (464→분해됨) + `GhidraMipsProfile`                      | `GhidraLoadImageValues` → `nativeMetadataCoverageSchema` |
| G-2  | AA v5 / SEC-bench / Terminal-Bench 재현용 최소 PoC                                | `ManagedPeReader`/`ManagedMetadataLayout` (방금 분해) + `GhidraAnalysisProfile` | `reconstructionCoverage` (재현·검증)                     |
| G-3  | Naver 기사 내 “Chrome 10x 패치” 주장 시그니처                                     | `MachoInspection`/`NativeInvestigations` + `PngVisualDiff`                      | `artifactInspection` 증거                                |

- **스킵 사유 문서화**: `NativeValueTrace`·`EvidenceMcpServer` 등 auto_split 불가 28개는 `docs/BETTER_RESTORATION.md`에 “특수 가위 필요”로 명시 → Carbon 작업과 충돌 방지.

## 3. REA 흡수 5대 기능 (Carbon 특성 → REA 포트)

1. **Carbon Coder (Terminal-Bench 65.2%)** → `JavaScriptSemanticIR`/`JavaScriptModuleRelationships` 개선: Carbon이 생성한 patch의 `sourceToBundleComparison` + `referenceSourceClassification` 을 REA가 재검증하는 `verifyReconstructionPackage` 확장.
2. **Carbon Sec (SEC-bench 88.2%)** → `ManagedNativeVerificationMatch` + `artifactInspection`에 Chrome 패치 시그니처 룰 추가, `conformanceTrustGate`로 허용 여부 판단.
3. **Carbon Agent (AA v5 #1)** → `ReconstructionObligationLedgerEvaluation` + `EvidenceLedger` (PRIV 보류)에 Carbon agent trace를 `ResidualUnknown` 없이 `resolveUnknown` 하는 `evaluateReconstructionCoverageRisks` 확장.
4. **Carbon Efficiency (cached 95% off)** → `ArtifactResourceScope` + `ManagedPeReader`의 캐시 예산을 Carbon 비용 모델($2/$10)로 매핑, `SqliteDatabaseProvider` (PRIV)에 비용 한도 필드 추가 (후속 PR).
5. **Carbon Browser (WebDev 4위)** → `CdpPageCapture`/`BrowserScenarioSecrets`/`WebBundleAnalysis`에 Carbon의 웹 생성물을 `browserScenarioCaptureValues`로 캡처·비교하는 `comparePngScreenshots` 확장.

## 4. 구현 로드맵 (3 PR)

- **PR-1 (현재 완료: 8ee6ca0)**: FUNC 안정 베이스 고정 — 4678 files 0/0. **머지됨**.
- **PR-2 (다음, 본 문서 기반)**: Carbon 흡수 코어 — `docs/GEMINI_CARBON_ABSORPTION_PLAN.md` + `src/domain/gemini/carbonGeminiBridge.ts` (Core/Part2) + `src/ghidra/geminiCarbonInventory.ts` 신규, `evidence.ts`에 `carbon` provider ID 추가. 목표 lint 0/0 유지.
- **PR-3 (후속)**: PRIV 특수 가위 — `MachOSliceArtifactReader`/`Frida`/`Jadx`/`EvidenceLedger`/`SqliteDatabaseProvider` 5개 분해 후 Carbon Sec/Agent 연동.

## 5. 검증 체크리스트

- [ ] `npm run lint` 0/0 + `verify:module-boundaries` 통과 (매 PR)
- [ ] `npm run typecheck` (pre-push에서 실패했던 `reverseEngineeringService`는 Carbon 작업에서 함께 수정)
- [ ] `reconstructionCoverage`에서 Carbon 주장(AA v5, SEC-bench) 재현 증거 1건 이상
- [ ] Ghidra 분석 파일은 `GhidraLoadImageValues` 파이프라인으로 16 MiB MI 제한 준수

## 6. 다음 액션 (Gemini Carbon 우선)

1. 본 문서 PR-2 브랜치(`arena/gemini-carbon-plan`)에서 `carbonGeminiBridge` 스캐폴딩 생성
2. Naver 기사 전문 fetch → `fetch_page`로 증거 고정
3. Ghidra 스냅샷용 `WabtArtifactProvider`-style `CarbonToolProvider` 설계

> 문서 버전: 2026-10-30 08:39 UTC, 베이스 `8ee6ca0`.
