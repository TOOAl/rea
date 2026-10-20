# Arena Code 사용 예시

## 1. Mock 데모 (API 키 없이)

```bash
npm run build
node dist/cli.js --mock -p "현재 디렉토리 파일 목록을 보여줘"
```

## 2. 실제 LLM으로 코딩 작업

### 프로젝트 탐색
```bash
# Gemini Free
GEMINI_API_KEY=... node dist/cli.js -p "이 프로젝트의 구조를 설명하고, 어떤 기술 스택을 쓰는지 알려줘"

# OpenRouter Free
OPENROUTER_API_KEY=... node dist/cli.js -p "src/loop/queryLoop.ts의 버그를 찾아줘" --provider openrouter
```

### 버그 수정
```bash
node dist/cli.js --provider gemini
# 대화:
# ❯ src/tools/bash.ts에서 타임아웃 처리에 버그가 있는 것 같아. 찾아서 고쳐줘
# → Agent가 파일을 읽고, 분석하고, 수정하고, 테스트까지 실행
```

### 기능 구현
```bash
node dist/cli.js
# ❯ TodoWrite로 계획을 세우고, 사용자 인증 미들웨어를 구현해줘. JWT 기반, Express용
```

### 리팩토링
```bash
node dist/cli.js -p "src/providers/*.ts의 중복 코드를 제거하고 공통 모듈로 추출해줘" --max-turns 30
```

## 3. Headless / CI 모드

```bash
# 파일로 프롬프트 전달
echo "모든 TODO 주석을 찾아서 목록으로 정리해줘" | node dist/cli.js --provider gemini -p "$(cat)"

# 결과를 파일로 저장
node dist/cli.js -p "README를 더 간결하게 다시 써줘" --provider openrouter --model "qwen/qwen3-coder:free" > new_README.md
```

## 4. Ollama 로컬 (완전 무료)

```bash
ollama pull qwen2.5-coder:14b
node dist/cli.js --provider ollama --model "qwen2.5-coder:14b"
# ❯ 이 코드베이스에서 가장 복잡한 함수는 무엇이고, 어떻게 개선할 수 있을까?
```

## 5. REA와 함께 사용 — 역분석 워크플로우

```bash
# 1. 타깃 앱 분석 (REA)
npx rea analyze-javascript-application --artifact ./some-app --output /tmp/evidence.json

# 2. Arena Code에게 분석 결과 기반으로 기능 구현 요청
node dist/cli.js --provider gemini -p "
REA 분석 결과 /tmp/evidence.json을 참고해서,
some-app의 검색 기능이 어떻게 구현됐는지 설명하고,
우리 프로젝트에 유사한 기능을 구현해줘.
"
```

## 6. AGENT.md 커스터마이징

```bash
# 프로젝트 AGENT.md를 수정하면 에이전트 행동이 바뀜
cat > AGENT.md <<'EOF'
# My Project Rules
- 모든 함수는 JSDoc 주석 필수
- 테스트 커버리지 80% 이상 유지
- 커밋 메시지는 Conventional Commits 형식
EOF

node dist/cli.js -p "새 유틸 함수 하나 추가해줘"
# → Agent가 위 규칙을 자동으로 반영
```
