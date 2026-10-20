# 나만의 AI 두뇌 — 전체 작업 종합 보고서 (Arena Agent 분석용)

> 문서 목적: 세션 전체의 분석·설계·구현·검증·실패 이력을 **하나도 빠짐없이** 요약해, 다른 에이전트가 이어서 분석·개발할 수 있도록 구성.
> 작성일: 2026-10-18 · 작업 브랜치: `arena/7260d42a-rea` · 산출물 위치: `ai-brain/`
> 에피스템 태그 규약: **[검증]** = 실측/문서 확인 · **[추론]** = 구조적 논리 · **[미지]** = 미확인

---

## 0. 요구사항 (사용자 원문 기준)

1. **"나만의 AI 두뇌(분석, 추론)"**를 만들 것. 자료 수집·단순 작업은 **외부 에이전트에 위임**하고, 두뇌는 **명령과 판단**만 담당.
2. 두뇌는 발전하는 에이전트의 **사고 회로와 진보된 방식을 흡수**하고, **정확도를 높이고 실패하지 않는 것을 목표로 스스로 발전**.
3. **항상 결론을 검증하며 모순점을 찾는 기능**을 추가.
4. **확장성** 확보(기능 추후 추가).
5. "실패할 확률을 없애기 위해" **전략 레지스트리(사고 회로 흡수) → 전제-결론 논리 모순** 순서로 진행.
6. 상충 근거는 차단이 아니라 **어느 쪽이 더 옳은지 판단하는 기준**(adjudication)을 만들 것.
7. 신뢰도 낮은 쪽이 실제였다면, **그 이유와 추론 실패 사례를 따로 저장**해 정확도 향상 자료로 활용.

**두 가지 재정의(설계 전제) — 사용자 동의 하에 채택:**
- "실패하지 않음" → **"실패를 감지·격리·복구·보류(abstain)"**. 확률적 시스템에서 100% 정확은 불가하며, 실현 가능한 불변식은 **"검증 통과 전 결론 절대 반환 금지(fail-closed)"** [추론].
- "스스로 발전" → **"가중치가 아닌 전략·메모리·평가셋의 진화"**. 모델은 얼린 채 지시어·플레이북·메모리가 진화하는 형태가 현재 기술의 실현 범위 [검증: Stanford-SambaNova ACE 등].

---

## 1. Phase 0 — 조사 분석 (유실 문서의 내용 복원 포함)

> ⚠️ 이 단계의 원본 산출물(`/home/user/ai-brain-ollama-analysis.md`, `/home/user/ai-brain-architecture.md`)은 저장소 밖 워크스페이스에 작성되었고 세션 롤백으로 유실됨. 아래는 세션 메모리에서 복원한 핵심 내용이며, 본 문서가 사실상의 단일 진실 원천이다.

### 1.1 REA (TOOAl/rea) 조사 [검증]

- **REA = "Reverse Engineer Anything"**: 로컬 전용 MCP 서버. 바이너리·JS·Electron/.NET·웹앱 역분석 지원. MIT 라이선스.
- AGENTS.md 철학: 로컬 전용, 증거 출처 보존, **관찰/파생/추론/미지 구분**, 로컬 기획 아티팩트 커밋 금지.
- 확인된 실제 도구명(소스 greps): `inspect_go_binary`, `inspect_native_api`, `inspect_pcap_capture`, `inspect_web_network_capture`, `capture_process_scenario`, `capture_electron_scenario`, `analyze_javascript_application`, `inspect_electron_fuses`, `trace_native_values`, `trace_application_feature`, `analyze_function`, `get_call_graph`, `procedure_pseudo_code`, `get_evidence_bundle`, `find_xrefs_to_name`, `trace_call_path`, `capture_browser_scenario`.
- **차용한 설계 원칙**: 계약 우선(JSON Schema), 어댑터 패턴, 태그된 에러 대수+Result(침묵 실패 금지), 부가적·멱등 설정, 에피스템 태그.

### 1.2 Ollama 아키텍처 조사 [검증]

- **3층 구조**: ① Go 오케스트레이션 계층 ② llama.cpp 추론 엔진(cgo 서브프로세스 `ollama_llama_server`, `OLLAMA_NEW_ENGINE=1`) ③ GGUF 콘텐츠 주소 블롭 저장(`~/.ollama/models/{blobs,manifests}`).
- REST API: `127.0.0.1:11434`, `/api/{generate,chat,embed,tags,show,pull,ps}` + OpenAI 호환 `/v1/*`.
- Modelfile(FROM/SYSTEM/PARAMETER/TEMPLATE/ADAPTER), GGUF에 Jinja 채팅 템플릿 내장, `OLLAMA_NUM_PARALLEL` 기본 1, `OLLAMA_KEEP_ALIVE` 기본 5m, macOS에서 MLX(v0.19+).
- **핵심 결론 [추론]**: "추론·분석"의 근원은 Ollama가 아니라 모델 가중치+프롬프트. Ollama는 서빙 계층. 멀티 LLM 선택은 추론 기능이 아니라 **모델 인벤토리 / 선택 정책 / 전환 비용**으로 분해되는 **오케스트레이션 문제** → 두뇌의 라우터로 재구축.
- **라이선스**: Ollama·llama.cpp 모두 **MIT**(출처 표기 시 흡수 허용). 모델 가중치는 별도 라이선스, "Ollama" 상표는 재사용 불가.
- **[미지]**: llama.cpp 서버의 멀티모델 지원은 버전별 편차 — 실측 필요(경로 B 전제).

### 1.3 자체 발전·검증 기법 문헌 조사 [검증]

| 근거 | 요지 |
|---|---|
| Mirror Loop (arXiv 2607.07663) | 외부 피드백 없는 재귀 자기비판은 10라운드에서 정보 변화 55% 감소 — "재구성일 뿐 발전 아님". 최소 1회 외부 그라운딩이 발전 회복 |
| Reflexion (Shinn 2023) | 실패 시 자연어 비판 저장 후 재시도 — HumanEval 80→91% |
| Self-Consistency (Wang 2022) | 다수결 — 저렴한 약신호, 단독 사용 금지 |
| EMNLP 2025 자기일관성 트랩 | 모델은 내적으로 일관된 그럴듯한 오류를 만들고 다수 라운드 자기비판에서도 틀린 답을 방어 |
| LLM-as-Judge 비대칭 | 판별(분류)이 생성보다 쉬움 — 작은 모델로 검증 가능 |
| Chain-of-Verification (arXiv 2309.11495) | 검증 질문 생성→독립 답변→수정 — 환각 감소 |
| FActScore | 원자 주장 분해 후 근거 대조 |
| CRAVE (2504.14905) | 참/거짓 논거 쌍 생성 → 진실 비대칭 드러남 |
| V-모델 검증 아키텍처 (2609.31937) | 레벨별 검증기 짝짓기 + 결정적 컨트롤러 + 검증 결과만 기억에 기록 |
| MAR (2512.20845) | 다중 페르소나 비판+심판 — 단일 자기비판의 퇴화 방지 |
| 반영 비용 | 반복마다 추론 비용 선형 증가 — 상한(2~3회) 필수 |

---

## 2. 아키텍처

### 2.1 전체 구조 [구현]

```
사용자 명령
  ▼
오케스트레이터 (TS) — 의도 분류 → 전략 선택 → 라우팅 → 추론 → 다층 검증 → 통과/보류/학습
  │                │                   │
  │위임(외부 에이전트)  │추론(모델 라우터)      │검증(Verifier)
  ▼                ▼                   ▼
Python :8787     Ollama/mock         L1→L3a→L3b→L3c→L3d→L2
/collect 검색     멀티 LLM 선택        fail-closed 판정
/score 평가       (태스크별 모델)       └→ 교훈/실패사례/전략/기억 학습
/reflect 성찰
```

- **하이브리드 분할**: TypeScript = 오케스트레이터·검증·MCP 준비(REA 생태계·계약·스트리밍에 강함) / Python = 검색·평가·성찰 등 ML 인접(생태계 압도) [사용자 결정].
- **위임 경계**: 자료 수집·단순 작업은 외부(`/collect`), 두뇌는 정규화된 근거(출처·등급 태그)만 소비.
- 추론 엔진은 라이브러리로 유지(Ollama/llama.cpp), 오케스트레이션 계층만 재구축 — **경로 A 채택**.

### 2.2 검증 체인 (핵심 산출물)

| 레이어 | 기능 | 비용 | 실패 시 |
|---|---|---|---|
| **L1** 결정적 게이트 | 스키마, 인용 해소(실재 근거만), 신뢰도 범위, 주장 인용 필수 | 무료 | 차단→재작성 지시 |
| **L3a** 주장 지지 | 주장별 인용 근거 지지 판정(judge, 연도 일치+유사도) | 유료 | 차단 |
| **L3b** 상충 adjudication | **신뢰도 점수 = prior(출처)×level(등급)×learned(이력)**로 승자 판정. 실패사례 실증 > 신뢰도 마진 > 보류. 패배 근거는 배제 unknown으로 | 무료+판단 | 차단 or 판정불가→보류 |
| **L3c** 전제-결론 논리 | ①과잉 주장(유보 근거→단정 금지) ②인과·필수 전제의 근거 존재 | 무료+판단 | 차단→unknown 선언 유도 |
| **L3d** 과거 결론 정합 | 장기 기억과 **주장 단위 사실 슬롯** 대조. 실증/신뢰도 우위로만 대체(supersede 감사 기록), 아니면 보류("무음 전환 금지") | 무료 | 보류/대체 |
| **L2** 독립 judge | 루브릭 기반 전체 판정 | 유료 | 차단 |

- 상위 레이어는 하위 통과 시에만 실행(최단 비용 우선). 미구현 검사(임베딩 근거 대조, 다중 에이전트 토론)는 `verdict.skipped`에 **명시적 공개**.
- 모든 판정 fail-closed: judge 출력 파싱 실패도 거부로 처리.

### 2.3 자기 발전 루프 (구현된 학습 축)

| 축 | 저장소 | 메커니즘 |
|---|---|---|
| 교훈 | `lessons.jsonl` | 검증 실패 이슈 기록 → 유사 명령에 `[교훈]` 주입 |
| **추론 실패 사례** | `failure-cases.jsonl` | ground-truth가 판정을 반박하면 **"왜 신호가 오도됐는지"와 함께** 저장 → `[실패사례]` 주입 + 같은 상충 페어의 실증 우선 판정 + 출처 신뢰도 갱신 |
| 출처 신뢰도 | `reliability.json` | Beta(2,2) 스무딩 learned = (passed+2)/(failed+2) — 1건의 반박이 세계를 뒤집지 않음 |
| 전략 | `strategy-stats.json` | direct/cot/reflect/consistency 플러그인, epsilon-greedy(ε=0.2) 승률 선택, `eval --ab` A/B |
| 장기 기억 | `conclusions.jsonl` | 검증된 결론+근거 스냅샷. supersede 시 사유와 함께 감사 기록 |
| 판정 감사 | `adjudications.jsonl` | 모든 상충 판정(승자/패배/점수/판정 근거) 기록 |

---

## 3. 구현 단계별 산출물 (Stage 0 → 3)

### Stage 0 — 최소 두뇌
- 오케스트레이터(의도 분류→계획→추론→검증→보류), 모델 라우터(태스크별 모델+로드 추적), 단일 검증 패스(L1+L2), 교훈 저장소, Ollama/mock 프로바이더 어댑터, Python 마이크로서비스(`collect/score/reflect`).
- 검증: 첫 시도 ev999(없는 근거) 인용 → L1 차단 → 교훈 주입 → 재시도 통과; 재실행 시 1회 만에 통과(학습 확인); 근거 없는 질문 → 보류.

### Stage 1 — 다층 검증(L3) + RAG-lite ("미국 대공황" 예시)
- L3a 주장 지지, L3b 근거 간 상충 탐지, 문자 빅램 containment 검색(한국어 공백 토큰화 한계 우회), `data/corpus.json` 단일 코퍼스(TS/Python 공유).
- 검증: 초안이 ev-gd-1(1929, encyclopedia)과 ev-gd-3(1935, low-quality-blog) 동시 인용 → 상충 감지 → 수정안 통과.

### Stage 2 — adjudication + 실패 학습 + 전략 레지스트리
- **L3b를 차단→판정으로 개편**(사용자 요구 6): 신뢰도 점수로 승자 결정, 패배 근거 배제 unknown, 마진 미달만 보류.
- **실패 사례 저장·학습**(사용자 요구 7): `ground-truth.ts` CLI — 판정 반박 시 사례+사유 저장, 신뢰도 갱신, 실증 우선 판정.
- 전략 레지스트리 + `eval --ab` A/B + 전략별 격리 교훈 저장소(공정한 cold-start 비교).

### Stage 3 — L3c + L3d
- **L3c**: 과잉 주장 결정적 검사 + PREMISE LOGIC JUDGE(인과 전제 근거 검증).
- **L3d**: 장기 결론 기억 + 주장 단위 사실 슬롯 충돌 감지 + 실증/신뢰도 우위로만 감사 가능한 대체, 아니면 보류.
- 회귀 테스트가 L3d 주제 오판 버그를 적발(아래 §5).

---

## 4. 실제 실행 결과 (전부 재현 가능)

### E1. L3c 인과 전제 (대공황 종료 원인)
```
명령: "대공황은 1939년경에 끝났다고 보는데, 뉴딜 때문인가요?" (direct)
1차 초안: "뉴딜 정책 덕분에 대공황이 끝났습니다."
  → L3c: 인과 전제가 근거에 존재하지 않음 + 유보 근거 단정 → 차단
재시도: "뉴딜은 1933년에 시행되었고, 대공황은 1939년경에 끝났다고 보지만,
        종료 원인은 수집된 근거로 확인할 수 없습니다."
  unknowns: ["대공황 종료 원인 — 인과 근거 없음"] → 통과 (attempts=2)
```

### E2. L3c 과잉 주장 (종료 시점 확정)
```
명령: "대공황이 끝났다는 견해의 시점을 확정해서 알려줘" (direct)
1차 초안: "대공황은 1939년에 끝났습니다." (근거: "~라고 본다")
  → L3c: 유보 근거를 단정으로 승격 → 차단
재시도: "대공황은 1939년경에 끝났다고 보는 견해가 있습니다."
  unknowns: ["종료 연도는 학설 차이가 있어 단정 불가"] → 통과 (attempts=2)
```

### E3. L3d 결론 대체 (제로 프로젝트 — 가상)
```
1) "제로 프로젝트는 언제 종료되었나요?" → 2021년 (wiki 0.80 > blog 0.40 판정) → 기억 저장
2) ground-truth 반박: 실제는 ev-zp-2(2024년) → 실패 사례+사유 저장, public-wiki 신뢰도 하향
3) 재실행 → 2024년 결론. L3d가 기억(2021)과 불일치 감지 → 실패사례 실증으로 대체
   warnings: ["L3d: 이전 결론(2021년…)을 대체 — 실패사례 실증: …"]
   기억: 2021 기록에 supersededBy=2024 + 사유 (감사 추적)
```

### E4. L3d 해소 불가 → 보류
```
가상 과거 결론 주입("1935년 시작", 동일 강도 근거 3건, 신뢰도 0.87)
명령: "미국 대공황은 언제 시작되었나요?" → 새 결론 1929 (0.90)
  → L3d: 우위 근거 없음(0.90 vs 0.87, 마진 0.2 미달) → WITHHELD
  issues: ["…과거 결론과 불일치 … 보류: fail-closed, 무음 전환 금지"]
```

### 평가 (골든셋 5건 + 전략 A/B)
```
골든셋: accuracy 1.00 (프랑스 수도 / 대공황 시작 1929 / 대공황 설명 / 뉴딜 1933 / 무근거 질문=올바른 보류)
A/B (전략별 격리 cold-start):
  strategy      | accuracy | avg attempts | withheld
  direct        |     1.00 |         1.80 |        1
  cot           |     1.00 |         1.40 |        1
  reflect       |     1.00 |         1.40 |        1
  consistency   |     1.00 |         1.40 |        1
해석: fail-closed 검증으로 accuracy 포화 → 전략의 실질 이득은 재시도 비용 절감(검증 반복 비용 선형 증가 연구와 일치).
```

---

## 5. 발견·수정한 버그 전량 (실패 이력 — 재발 방지용)

| # | 증상 | 원인 | 수정 | 교훈 |
|---|---|---|---|---|
| 1 | 교훈 검색 크래시 | `Set.filter` 호출 | 배열 스프레드 후 filter | 타입 경계에서 컬렉션 연산 검증 |
| 2 | judge가 추론 호출로 오인 | 시스템 프롬프트에 마커 누락 | `VERIFICATION JUDGE` 마커 명시 | 역할 구분은 프롬프트 계약으로 |
| 3 | 실패 시 진단 공백(issues 빈 배열) | 거부=사유 없는 판정 | 사유 없는 거부를 이슈로 승격 | 실패는 항상 설명과 함께 |
| 4 | 섹션 파싱 전면 실패 | lookahead `[A-Z]+`가 CamelCase 레이블(Evidence) 미매칭 | `[A-Za-z]+` | 파서는 사각지대 테스트 필수 |
| 5 | mock이 검색 안 된 근거(ev-gd-4) 인용 | mock이 제공 근거 무시 | 제공된 근거만 인용 + L1이 차단 확인 | "제공 근거만 인용" 규칙은 파이프라인이 강제 |
| 6 | 검색 누락(한국어) | 공백 토큰/짧은 질의 | 빅램 **containment**(교집합/작은 쪽) | 한국어는 공백 토큰화 불가 |
| 7 | 교훈/실패사례 교차 오염("언제" 공통 토큰만으로 제로 사례가 대공황에 주입) | 공백 토큰 유사도 | 빅램 containment 임계 0.5로 교체 | **오주입은 오염, 누락은 안전**(재시도가 재학습) → 보수 임계 |
| 8 | A/B가 전략 간 동일 결과 | 교훈 저장소 공유로 상태 오염 | 전략별 격리 저장소(cold-start) | 실험은 상태 격리 |
| 9 | 과잉 주장 체크 사망 | 헤지 정규식이 "끝났**다고 본다**" 미매칭("라고 본다"만) | `본다\|보는\|보지만\|…` 확장 | 자연어 표기는 형태가 다양 |
| 10 | L3d가 뉴딜(1933)을 대공황(1929)과 충돌로 오판 → 골든셋 0.80 | 질문 어미("~언제 시작되었나요?")가 주제 유사도를 지배 | **주장 단위 사실 슬롯 비교**(텍스트 유사도≥0.6 + 연도 불일치) | 평가셋이 없었다면 못 잡은 버그 — **평가셋이 발전의 기준점** |
| 11 | git/파일 유실 반복 | 세션 롤백(저장소 밖 파일·로컬 git) | 산출물 `ai-brain/`로 이전, 커밋+푸시로 보존 | 결과물은 git에만 안전 |

---

## 6. 산출물 구조 (코드 ~2,300줄)

```
ai-brain/
├── README.md                 실행법·시연 시나리오
├── docs/analysis-report.md   본 문서
├── data/corpus.json          근거 코퍼스 (TS/Python 공유 단일 진실 원천, 출처·등급·conflicts)
├── py/app.py                 외부 에이전트: /collect(빅램 검색) /score /reflect  (:8787)
└── ts/
    ├── config.json           모델·임계·신뢰도 prior·전략 설정 (부가적 병합)
    ├── data/golden.json      평가셋 5건
    └── src/
        ├── contracts.ts      계약: Evidence(관찰/파생/추론/미지)·Claim·Verdict·실패사례·판정기록
        ├── orchestrator.ts   판단 루프 (전략→추론→검증→학습), majorityVote(consistency)
        ├── verifier.ts       L1→L3a→L3b→L3c→L3d→L2
        ├── credibility.ts    prior×level×learned, Beta(2,2) 갱신
        ├── strategies.ts     direct/cot/reflect/consistency + epsilon-greedy
        ├── lessons.ts        교훈 저장·주입 (빅램 0.5)
        ├── failures.ts       실패 사례 저장·주입·페어 실증 조회
        ├── conclusions.ts    장기 결론 기억 + supersede 감사
        ├── adjudications.ts  상충 판정 감사 로그
        ├── ground-truth.ts   실측 피드백 CLI (판정 확인/반박 → 학습)
        ├── collector.ts      위임 경계 (MockCollector/HttpCollector)
        ├── router.ts         태스크별 모델 선택
        ├── run.ts            빌더+CLI, eval.ts   골든셋+A/B
        └── providers/        provider.ts · ollama.ts(실) · mock.ts(결정적 대역)
```

**실행법:**
```bash
python3 py/app.py                                    # 외부 에이전트 (:8787)
node --experimental-strip-types ts/src/run.ts "<명령>" [direct|cot|reflect|consistency]
node --experimental-strip-types ts/src/eval.ts --ab   # 전략 A/B
node --experimental-strip-types ts/src/ground-truth.ts "<명령>" <실제근거ID> [사유]
BRAIN_PROVIDER=ollama node --experimental-strip-types ts/src/run.ts "..."   # 실모델
```

---

## 7. 제약·미지수 (정직한 한계)

1. **mock 프로바이더**: 지금의 "추론"은 결정적 대역(Ollama 미설치 환경). 파이프라인·검증·학습은 실동작하나 실제 추론 품질은 `BRAIN_PROVIDER=ollama` 전환 후 실측 필요. [미지]
2. **검색은 RAG-lite**: 빅램 containment는 임베딩 대용. 실 RAG(임베딩+벡터DB) 전환 시 L4 근거 대조 정확도 상승 예상. [추론]
3. **유사도 임계값 트레이드오프**: 0.5는 보수적 — 유사 명령 간 교훈 전이가 안 됨(재학습으로 대체). 도메인 확장 시 재조정. [검증]
4. **출처 prior는 씨앗**: 실제 출처 신뢰도는 ground-truth 축적으로만 정직해짐. [검증]
5. **[미지]** llama.cpp 서버 멀티모델 지원 범위(경로 B 전제), 로컬 모델의 judge 품질(모델 쌍별 실측 필요).
6. 반영 반복은 추론 비용 선형 증가 — `maxAttempts=2` 상한 유지. [검증]

## 8. 향후 로드맵 (합의된 순서의 다음 단계)

1. **L4 임베딩 근거 대조** — 실 RAG로 교체, 현재 L3a의 유사도 휴리스틱 강화
2. **Ollama 실모델 전환 검증** — mock→실추론에서 검증 체인 실측(로컬 머신, Ollama 설치 필요)
3. **L5 다중 에이전트 토론 심판** (MAR/FC-MAD 패턴, `skipped`에 공개된 상태)
4. **REA 연동** — 두뇌가 MCP 클라이언트로 REA의 역분석을 위임(자료 수집 에이전트)
5. 전략 레지스트리에 새 사고 회로(LATS, ReflAct 등) 플러그인 + 평가셋 A/B로 채택/도태

## 9. Git 보존 상태

- 원격 `origin/arena/7260d42a-rea`: `5e30969`(REA base) → `acc2077`(stage 2) → `f80cd56`(stage 2+3) → `9a3223d`(merge) — **본 문서 커밋 포함 최신화**.
- 세션 롤백으로 로컬 git이 반복 초기화됐으나 원격에 커밋 보존 → 모든 작업 복구 가능.

## 10. 참고 문헌 (전부 웹 검색으로 확인)

- yoheinakajima.com/better-ways-to-build-self-improving-ai-agents/ (Reflexion·Self-Consistency 개요)
- zylos.ai/research/2026-03-06-ai-agent-reflection-self-evaluation-patterns/ (반영 패턴·함정)
- zylos.ai/research/2026-04-10-llm-as-judge-production-agent-verification-2026/ (judge 비대칭)
- arxiv.org/html/2607.07663 (Mirror Loop·검증 위계·검증기 공동진화)
- upsolve.ai/blog/self-improving-agent (ACE, 맥락·메모리 진화)
- taskade.com/blog/self-improving-agents-reflection (그라운딩별 신뢰도 표)
- arxiv.org/abs/2309.11495 (Chain-of-Verification) · FActScore(원자 주장 분해)
- arxiv.org/html/2512.20845 (MAR) · sciencedirect.com/science/article/pii/S2405959526000883 (FC-MAD)
- pith.science/paper/2504.14905 (CRAVE) · arxiv.org/html/2609.31937v1 (V-모델 검증 아키텍처)
- arxiv.org/html/2510.03418v2 (LegalWiz) · arxiv.org/html/2509.00761v3 (L-MARS)
- Ollama 아키텍처: enterprisedna/centron/martianlee/eli.thegreenplace 등 기술 블로그 다수 (§1.2 사실은 본 문서에 보존)
