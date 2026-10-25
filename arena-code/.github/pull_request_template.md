# PR Body — Pocock `pr` skill template (Humanlayer show-me credit)

> 이 템플릿은 `mattpocock/skills`의 `pr` 스킬을 흡수한 것입니다. `Summary→Evidence→Merge Danger` 3섹션을 반드시 채우세요.
> 글 대신 **시각**(의사코드/호출트리/파일트리/Mermaid/diff 중 최소 뷰)을 우선하세요. GLOSSARY.md 용어를 쓰세요.

## Summary

```text
# 예: submitForm 호출 트리
submitForm
  createSession
    persistPrompt
    expandSkillMention
    launchAgent
  navigateToSession
    subscribeToEvents
```

<!-- 시각은 이 중 하나: pseudocode / call-tree / file-tree / mermaid / diff / diagram — 필요한 것만, 모두 넣지 마세요 -->

## Evidence

- **Before:** `expect(limit).toBe(280)` — tautological FAIL / 스크린샷
  **After:** `expect(post.rejected).toBe(true)` when len=281 — PASS / 스크린샷

## Merge Danger

**Door:** two-way
<!-- one-way: 6만명 오발송/마이그레이션/데이터손실 등 되돌릴 수 없음 — 꼼꼼히 / two-way: 되돌리면 됨 — 가볍게 -->

**Blast Radius:** narrow: <one-word + scope>
<!-- 예: narrow: pr template only / wide: auth flow + checkout -->
