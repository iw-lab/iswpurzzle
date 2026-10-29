#!/usr/bin/env bash
# 딱1 로켓 배포 — naver 계정 Pages(ttak1 · 2026-10-29 학교 와이파이가 ttak1-rocket.pages.dev 를 막아 옮김) · 허브는 simfeelgood Worker(tools/hub.sh)
#   빌드 → 게이트(정적) → wrangler pages deploy(--branch main, functions/ 포함) → 라이브 index 의 빌드 표식이 dist 와 같은지 확인
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build >/dev/null
rm -f dist/smoke.html   # 스모크 전용 페이지(허브 끔)는 배포하지 않는다
BUILD=$(grep -o 'ttak1-build-[^"]*' dist/index.html)
echo "▶ 빌드 $BUILD · dist $(du -sh dist | cut -f1)"
node ~/.claude/skills/game-builder/tools/gate-baseline.mjs . --static
export HOME="$HOME/.cf-homes/naver" CLOUDFLARE_ACCOUNT_ID=4644562c4caa65bcd406fbbe6f104e59
rm -f node_modules/.cache/wrangler/wrangler-account.json
who=$(npx wrangler whoami 2>&1 | grep -o 'email [^ ]*' | head -1 | cut -d' ' -f2 | sed 's/\.$//')
[ "$who" = "simssijjang@naver.com" ] || { echo "❌ Pages 는 naver 계정 — 지금 $who"; exit 3; }
npx wrangler pages deploy dist --project-name ttak1 --branch main --commit-dirty=true 2>&1 | grep -E "https://|Success|rror" | head -5
for i in $(seq 1 20); do
  live=$(curl -s "https://ttak1.pages.dev/?v=$RANDOM" | grep -o 'ttak1-build-[^"]*' || true)
  [ "$live" = "$BUILD" ] && { echo "✅ 라이브 = $BUILD"; exit 0; }
  sleep 6
done
echo "❌ 라이브 빌드 표식이 안 바뀐다(라이브 ${live:-없음} ≠ $BUILD)"; exit 1
