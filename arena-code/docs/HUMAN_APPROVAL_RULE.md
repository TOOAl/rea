# 사람 승인 룰 (Human Approval) — PR #7

> **상태:** `arena/6e90cbe4-rea` — `pr_open` (PR #7 업데이트 중)  
> 이 문서는 **천재를 교체/진화할 때 사람이 꼭 도장을 찍어야 하는 규칙**을 정합니다.

## 1. 왜 사람이 필요한가요? (12살 버전)
- 천재 42명 중 못하는 애를 **자동으로 바꾸면**: 실수로 잘하던 애가 사라질 수 있어요.
- 그래서 **사람(선생님)이 마지막에 “OK”**를 해야 칠판(Main)에 붙어요.
- PR이 바로 그 쪽지예요.

## 2. 언제 승인이 필요한가요?
| 행동 | 자동? | 사람 승인 |
|---|---|---|
| S: 42명 4.0 교복 입히기 (version bump) | ✅ 자동 | — |
| M: 시험 보기 (genius_evolve.test) | ✅ 자동 | — |
| **L: 천재 교체/진화** (`swapWithHistory`, `evolveOneStep --evolve`) | ❌ | **필수** |
| 보드 생성만 (`genius-board.md` 갱신) | ✅ 자동 | — |

## 3. 규칙 (CODEOWNERS + GitHub)
1. **CODEOWNERS:** `arena-code/src/brains/**` 와 `arena-code/src/harness2/evolve.ts` 는 `@TOOAl` 승인이 있어야 머지됩니다.
2. **PR 라벨:** `needs-human-approval` 라벨이 붙으면 머지 불가 — 사람이 확인 후 `human-approved`로 교체.
3. **교체 이력:** 모든 `swapWithHistory(reason)`은 `genius-board.md > 최근 교체 이력`에 자동 기록됩니다.
4. **롤백:** 새 천재가 2주 연속 꼴찌면 자동 롤백 PR이 생성되지만, 역시 사람 승인 후에만 머지.

## 4. 어떻게 승인하나요? (3초)
1. PR #7 페이지 열기 → Files changed 확인
2. `Approve` 버튼 → 코멘트에 `LGTM` 또는 `human-approved` 라벨 추가
3. 머지 (Squash) — 이때만 `genius-board.md`의 교체 이력이 확정됩니다.

## 5. 자동 체크 (가드)
- `src/harness2/approval.ts`의 `requireApproval(reason)` 함수가 `HUMAN_APPROVED=1` 환경변수가 없으면 에러를 냅니다.
- CI (`ci.yml`)에서 `evolve --evolve`를 돌릴 때는 반드시 사람이 수동으로 `HUMAN_APPROVED=1`을 넣어 실행해야 합니다.

## 6. 12살 요약
- **내 연습장(Branch)에서 맘껏 실험** → **쪽지(PR)로 제출** → **사람이 도장(Approve)** → **칠판(Main)에 붙음**
- 천재 교체는 **사람 도장 없으면 절대 칠판에 안 붙어요!**

---
*이 문서는 PR #7에 포함되어 함께 리뷰됩니다. 고칠 점이 있으면 코멘트로 알려주세요.*
