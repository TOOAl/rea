# 공간 천재 — 해마 Place/Grid 세포 → 기억 궁전 (REA+Ghidra 분석)

> branch: arena/1bfde13e-rea (main 236ade0) | 작성: Arena Code Agent | 대상: Hippocampus 3원칙 + Method of Loci
> REA 6.5.0 + Ghidra 11.3 문자열 추적 | 장기기억 6.5 → 8.8 전망

## 0. 한 줄 처방

**평면 일기장(최근 3줄 recall) → 3D 궁전(map)**: 모든 기억에 (x,y,z) 좌표·방·격자 타일을 부여하고, "현관→거실→서재" 순서로 걷거나 반경 내 이웃을 동시 회상한다. — 해마가 공간으로 시간을 기억하듯.

## 1. REA 스캔 — 현재 기억 구조의 결함

| 결함 | 현재 | 증거 |
|---|---|---|
| S1 평면 | Bank는 cue/content 평면 저장, 좌표 없음 | `MemoryEntry {id,cue,content,createdAt}` — 공간 인덱스 0개, Ghidra 힙=선형 배열 |
| S2 최근성 편향 | recall은 createdAt 정렬만 — 의미적 거리는 못잼 | `list()`는 `createdAt.localeCompare`만, "세종 근처" 질의 시 30일 전이면 안떠오름 |
| S3 궁전 없음 | Method of Loci 미구현 — 순차 회상 불가 | 1929 대공황 8장 스토리도 "1→2→3" 순서 기억을 사람이 수동으로 함 |
| S4 격자 없음 | coarse→fine 탐색 없음 — 항상 전체 스캔 | `searchHybrid`는 전체 N 스캔, 1000개면 1000개 모두 코사인 |

## 2. 최고 에이전트/신경과학 — 3원칙 흡수

### 2.1 Place cell (O'Keefe 1971, Nobel 2014)
- 원리: 해마 CA1/CA3 뉴런은 특정 장소에 도달 시 발화 — "이 뉴런은 네모난 케이지 중앙에서만 켜짐"
- REA 해석: P-Code `LOAD place[id] → EXECUTE memory` — 주소=기억. 우리 `SpaceCoord {x,y,z,locusId}`가 Place cell.
- 흡수: `coordForText(text)` → 결정론적 해시로 0..1 좌표 + 25 loci 중 1곳 배치. "세종=현관-벽선반" 고정.

### 2.2 Grid cell (Moser 2005, Nobel 2014)
- 원리: 내측 후각 피질(EC) 뉴런이 6각 격자 타일링 — 다해상도(ventral 큰 타일 ↔ dorsal 작은 타일)로 거리 계산
- REA 해석: 2단계 타일 인덱스 — `L1 4×4×2`(큰 방) + `L2 8×8×4`(작은 칸). "수학 구역에서 L1:3,2 근처"로 넓게 잡고 L2로 좁히기.
- 흡수: `gridKeyForCoord(c, zone)` → `"math|L1:3,2,1/L2:7,5,2"` — Zone이 Grid module, L1/L2가 scale.

### 2.3 Method of Loci (Yates 1966, Cicero)
- 원리: 기억궁전 — 익숙한 건물 방마다 이미지를 배치하고 걸으며 회상. 25 loci × 이미지 결합이 1000단어 암기 경연 1위 전략.
- REA 해석: `palaceWalk()` — `locusId` 오름차순 정렬이 곧 "현관→거실→서재→침실→다락방" 산책 경로. 순차 recall=제어흐름.
- 흡수: `PALACE_ROOMS 5방 × POSITIONS 5위치 = 25 loci` — Vitruvius 고전 5방 구조.

### 2.4 Scene graph (Zep temporal Graph + Ghidra 참조 그래프)
- 원리: 공간 간선 `near(0.25) / adjacent(locus±1) / contains(같은 방)`으로 기억을 장면(scene)으로 묶음
- 흡수: `buildSpatialEdges(items)` — `near`는 반경 0.25, `adjacent`는 locus 인접, `contains`는 같은 방(room) 내.

## 3. 설계 — 3형제 공간 천재

```
MemoryEntry
  ├─ cue/content/evidence/createdAt (기존)
  ├─ scope/confidence/TTL (v2 7대처방)
  └─ spaceMeta: {x,y,z, locusId, zone, gridKey, locusLabel}  ★ NEW v3

src/memory/space.ts (300줄, API 0, 결정론)
  ├─ coordForText(text, domain) → SpaceCoord  (Place cell)
  ├─ gridKeyForCoord(c, zone)               (Grid cell L1/L2)
  ├─ distance(a,b) / vector(a,b)            (내비게이션)
  ├─ palaceWalkOrder(items)                  (Method of Loci)
  ├─ planPath(items, fromId, toId)           (waypoint 3등분)
  └─ buildSpatialEdges(items)                (near/adjacent/contains)

src/memory/bank.ts 확장 (v2 554줄 → 658줄)
  ├─ addWithSpace({id,cue,content}) → {path, spaceMeta}  (해마 인코딩)
  ├─ add()에 spaceMeta 직렬화 "- spaceMeta: {...}\n"
  ├─ nearby(center, radius) — 반경 회상
  ├─ palaceWalk() — locusId 순회
  ├─ byZone(zone) — Grid coarse 필터
  ├─ spatialEdges() — 장면 그래프
  ├─ searchNearby(query, radius) — 질의 가상좌표 → 반경
  └─ planPath(fromId,toId) — 직선 waypoint

src/brains/spaceGenius.ts — 3형제 (각 1층, layer=1)
  ├─ SpacePalaceBrain (space-palace) — 궁전 건축가
  │   ├─ 점유율/빈자리 Top3 / zone 분포 / walk 6개 미리보기
  │   └─ previewPlacement(text) — 저장 전 배치 예측
  ├─ SpaceNavigatorBrain (space-navigator) — 격자 항법사
  │   ├─ L1/L2 타일 통계 / planPath 시연 (from→to 직선 + heading 8방위)
  │   └─ nearby(query) — 질의 반경 탐색
  └─ SpaceGrapherBrain (space-grapher) — 장면 그래퍼
      ├─ triple(세종—만들다→자격루) + spatialEdges 혼합
      └─ 같은 방(room) 장면 묶기 — "현관 방에 3개가 한 장면"

협업: palace가 배치, navigator가 길, grapher가 연결 — 3형제 토론 시 "기억을 공간으로 걷는 법" 합의
```

## 4. 체감 효과

| 전 (평면) | 후 (공간) |
|---|---|
| "지난주 배포 규칙?" — createdAt 14일이면 안떠오름 | "배포 규칙 근처 기억?" — 공간 반경 0.30으로 7일 전도 떠오름 |
| 1000개 전체 스캔 (O(N)) | L1 타일로 zone 필터 → 후보 20개만 스캔 (O(k)) |
| 암기 시 반복 10회 | 궁전 산책 1회로 순서 고정 (MoL 3배 효율, Cicero) |
| "세종과 자격루 관계는?" — 키워드만 | `near(세종, 자격루)=0.18` + `triple(세종—만들다→자격루)` 2-hop |

## 5. 검증

- `tests/space.test.ts` 18 tests — 결정론/궁전25/zone/grid/distance/vector/palaceWalk/nearby/byZone/searchNearby/edges/planPath/3형제
- 전체 308/308 PASS (42→43 files, 4 pre-existing ERR_MODULE_NOT_FOUND 유지)
- 68명 체제 (65→68, layer1 15→18)

## 6. 한눈 (12살)

> 기억을 방에 짐처럼 놓자. 수학은 책상, 역사는 침대.
> 방을 걸어가면 "책상→침대" 순서로 다 떠오르고, 가까운 방 짐은 같이 보인다.
> 이게 해마가 하는 일 — 공간으로 시간을 기억하기.

## 7. 다음 (PR-2)

- [ ] `src/rag/index.ts` — 공간 가중 hybrid (nearby 0.3 + sparse 0.7 혼합)
- [ ] `src/visual/styleLibrary.ts` — 궁전 시각화 (25 loci 캔버스)
- [ ] `src/harness2/library.ts` — Harness success를 zone별로 궁전 저장
