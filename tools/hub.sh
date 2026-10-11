#!/usr/bin/env bash
# 학교 허브 배포·명령 — 딱1 로켓은 simfeelgood 계정(1e5d836b…)에 둔다.
#   왜 daum 이 아닌가: 2026-10-11 daum·naver·gmail D1 이 모두 상한 10개(다른 게임들이 사용 중)라 새 DB 를 못 만든다.
#   로그인 이메일이 다르면 멈춘다(계정이 조용히 바뀌는 사고 — 메모리 wrangler-login-switches-accounts-silently).
# 사용: tools/hub.sh deploy | tools/hub.sh <wrangler 인자…>
set -euo pipefail
cd "$(dirname "$0")/../hub"
H="$HOME/.cf-homes/simfeelgood"; [ -d "$H" ] && export HOME="$H"
export CLOUDFLARE_ACCOUNT_ID=1e5d836bf27b9e18c0f30b35e449ba08
who=$(npx wrangler whoami 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -o 'email [^ ]*' | head -1 | cut -d' ' -f2 | sed 's/\.$//')
[ "$who" = "simfeelgood@naver.com" ] || { echo "❌ 이 허브는 simfeelgood 계정 전용 — 지금 로그인: ${who:-없음}"; exit 3; }
if [ "${1:-}" = deploy ]; then exec npx wrangler deploy; fi
exec npx wrangler "$@"
