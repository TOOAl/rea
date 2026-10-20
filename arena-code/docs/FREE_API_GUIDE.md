# 무료 API 연결 가이드 — $0로 코딩 에이전트 돌리기

이 문서는 Arena Code를 **완전 무료**로 사용하는 방법을 단계별로 설명합니다.

---

## 1. 한눈에 비교

| Provider | 가입/발급 시간 | 무료 한도 | 추천도 |
|----------|---------------|-----------|--------|
| **Gemini Free** | 1분 (Google 계정) | 60 req/min, 1M 토큰 | ⭐⭐⭐⭐⭐ |
| **OpenRouter Free** | 1분 (GitHub 로그인) | 모델별 일일 크레딧 | ⭐⭐⭐⭐⭐ |
| **Groq Free** | 1분 | 14,400 req/day | ⭐⭐⭐⭐ |
| **Ollama 로컬** | 5분 (설치) | 무제한 | ⭐⭐⭐⭐ |
| **Arena Agent** | Arena 내부 | 크레딧 내 | ⭐⭐⭐⭐⭐ (Arena 안) |

---

## 2. Gemini Free — 가장 쉬움 (추천)

### 발급
1. https://aistudio.google.com/app/apikey 접속
2. "Create API Key" 클릭 → 키 복사

### 설정
```bash
cd arena-code
cat >> .env <<'EOF'
ARENA_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...여기에붙여넣기
GEMINI_MODEL=gemini-2.0-flash
EOF
```

### 테스트
```bash
node dist/cli.js -p "1+1은?" --provider gemini
```

### 특징
- `gemini-2.0-flash`: 1M 컨텍스트, 60 RPM, 가장 관대
- `gemini-2.5-flash`: 추론 강화, 약간 느림
- 도구 호출(tool calling) 지원 — Arena Code와 완벽 호환

---

## 3. OpenRouter Free — 모델 선택폭 최대

### 발급
1. https://openrouter.ai/keys 접속 (GitHub 로그인)
2. "Create Key" → 키 복사 (무료 크레딧 $1 자동 지급)

### 설정
```bash
cat >> .env <<'EOF'
ARENA_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=deepseek/deepseek-r1:free
EOF
```

### 무료 모델 목록 (2026년 기준)
| 모델 | 특징 | 컨텍스트 |
|------|------|----------|
| `deepseek/deepseek-r1:free` | 추론 최강, 코딩 특화 | 128K |
| `qwen/qwen3-coder:free` | 코딩 특화, 빠름 | 128K |
| `meta-llama/llama-3.3-70b:free` | 범용, 안정적 | 128K |
| `google/gemini-2.0-flash-exp:free` | Gemini 경유 | 1M |
| `mistralai/mistral-small-3.1-24b:free` | 가벼움, 빠름 | 128K |

### 모델 바꾸기
```bash
node dist/cli.js -p "버블 정렬을 구현해줘" --provider openrouter --model "qwen/qwen3-coder:free"
```

---

## 4. Groq Free — 속도 1위

### 발급
1. https://console.groq.com/keys 접속
2. "Create API Key" → 복사

### 설정
```bash
cat >> .env <<'EOF'
ARENA_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
EOF
```

### 특징
- 토큰 속도 500+ tokens/sec — 체감 가장 빠름
- 무료 한도: 14,400 req/day, 6,000 TPM
- 추천 모델: `llama-3.3-70b-versatile`, `deepseek-r1-distill-llama-70b`

---

## 5. Ollama 로컬 — 완전 무료, 오프라인

### 설치
```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &

# macOS
brew install ollama
ollama serve

# 모델 다운로드 (택1)
ollama pull qwen2.5-coder:14b        # 코딩 추천, 9GB
ollama pull deepseek-coder-v2:16b    # 코딩 특화, 9GB
ollama pull llama3.3:70b             # 범용 최강, 40GB
```

### 설정
```bash
cat >> .env <<'EOF'
ARENA_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:14b
EOF
```

### 테스트
```bash
ollama list  # 모델 확인
node dist/cli.js -p "Hello" --provider ollama
```

### 팁
- GPU 있으면 자동 활용 (VRAM 8GB+ 권장)
- CPU만으로도 14B 모델 동작 (느림, 약 10 tok/s)

---

## 6. Arena Agent 연동

Arena 워크스페이스 내부에서 실행 중이라면:

### 방법 A: HTTP 브릿지
Arena Agent가 OpenAI 호환 엔드포인트를 제공한다면:

```bash
cat >> .env <<'EOF'
ARENA_PROVIDER=arena
ARENA_API_URL=https://your-arena-instance/v1
ARENA_API_KEY=your_arena_key
ARENA_MODEL=arena-agent
EOF
```

### 방법 B: 폴백 체인
Arena URL이 없을 때 자동으로 무료 Provider로 폴백:

```bash
cat >> .env <<'EOF'
ARENA_PROVIDER=arena
# ARENA_API_URL이 비어있으면 아래 중 하나로 자동 폴백
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
EOF
```

### 방법 C: MCP 서버로 노출
Arena Code 자체를 MCP 서버로 등록하면, Arena Agent가 Arena Code의 도구(Read/Bash 등)를 직접 사용할 수 있습니다.
(구현 예정: `node dist/cli.js --mcp`)

---

## 7. Provider 전환은 1초

환경변수만 바꾸면 즉시 전환:

```bash
# Gemini로
ARENA_PROVIDER=gemini node dist/cli.js -p "버그 찾아줘"

# OpenRouter로
ARENA_PROVIDER=openrouter node dist/cli.js -p "버그 찾아줘"

# 로컬 Ollama로 (오프라인 시)
ARENA_PROVIDER=ollama node dist/cli.js -p "버그 찾아줘"
```

모든 Provider는 **동일한 도구와 루프**를 사용하므로, 모델만 바뀌고 동작은 동일합니다.

---

## 8. 비용 절감 팁 (Claude Code 방식 차용)

1. **STATIC/DYNAMIC 분리**: System prompt는 매 턴 캐시됨 — Arena Code도 동일 구조로 구현
2. **Compaction**: 컨텍스트 80% 초과 시 자동 요약 — 토큰 폭증 방지
3. **모델 혼용**: 탐색은 빠른 모델(Groq), 코딩은 강한 모델(DeepSeek R1) — Provider를 작업별로 전환
4. **Ollama 로컬**: 민감 코드는 로컬에서, 일반 코드는 클라우드에서

---

## 9. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `GEMINI_API_KEY not set` | .env 누락 | `cp .env.example .env` 후 편집 |
| `429 Too Many Requests` | 무료 한도 초과 | 다른 Provider로 전환 or 잠시 대기 |
| `Ollama connection failed` | ollama serve 미실행 | `ollama serve` 실행 |
| 도구 호출 안 됨 | 모델이 tool calling 미지원 | `deepseek-r1:free`, `gemini-2.0-flash` 등 지원 모델 사용 |
| 느림 | 모델이 무거운 경우 | `groq` 또는 `gemini-2.0-flash`로 전환 |

---

## 10. 추천 조합

| 상황 | 추천 |
|------|------|
| **처음 시작** | `gemini` (가장 관대) |
| **코딩 집중** | `openrouter` + `deepseek-r1:free` |
| **속도 중요** | `groq` |
| **보안/오프라인** | `ollama` + `qwen2.5-coder:14b` |
| **Arena 내부** | `arena` (폴백: gemini) |
