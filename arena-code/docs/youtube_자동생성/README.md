# youtube_자동생성 — /youtube 스킬 출력 폴더

`/youtube` 스킬로 생성된 유튜브 자동화 결과물이 저장되는 곳입니다.

- 1층 입력: `--article`, `--topic`, `--article-url`, `--article-file` 또는 대화 `/article`, `/topic`
- 실행: `node dist/cli.js --topic "코스피 급락" --article-file ./article.txt -p "/youtube 분석해줘"`
- 결과: `[주제]_대본_수익화.md`, `[주제]_설명란.txt`, `[주제]_자막.srt`, `[주제]_수익화_체크리스트.md` 등 7종

참고 템플릿:
- `../youtube_코스피_급락_대본_수익화.md`
- `../youtube_1929대공황_3일전_대본_수익화.md`
- `../youtube_수익화_체크리스트.md`
- `../youtube_팩트체크_대본.md`
