#!/bin/bash
# Arena Code 테스트용 예제 — 버그가 있는 작은 프로젝트 생성
set -e
mkdir -p /tmp/demo-project/src
cat > /tmp/demo-project/src/math.js <<'EOF'
function add(a, b) { return a + b; }
function divide(a, b) { return a / b; } // 버그: b=0 처리 없음
function factorial(n) {
  if (n === 0) return 1;
  return n * factorial(n - 1); // 버그: 음수 처리 없음, 스택 오버플로우
}
module.exports = { add, divide, factorial };
EOF
cat > /tmp/demo-project/package.json <<'EOF'
{ "name": "demo-project", "version": "1.0.0", "main": "src/math.js" }
EOF
cat > /tmp/demo-project/AGENT.md <<'EOF'
# Demo Project
- 버그를 찾아서 고쳐주세요
- 각 함수에 JSDoc 주석을 추가해주세요
EOF
echo "✅ Demo project created at /tmp/demo-project"
ls -R /tmp/demo-project
