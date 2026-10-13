#!/usr/bin/env bash
# 도키 새 원화 — GPT 웹앱·Firefly 가 다른 세션에 잡혀 있으면 3분마다 다시(최대 2시간)
cd "$(dirname "$0")/../.."
for i in $(seq 1 40); do
  [ -f game-assets-src/rig/src/doki-v2.png ] && { echo "✅ 원화 있음"; exit 0; }
  echo "$(date +%H:%M) 시도 $i"
  bash ~/.claude/skills/game-builder/tools/gb-image.sh game-assets-src/raw/doki-v2.jsonl 2>&1 | tail -2
  [ -f game-assets-src/rig/src/doki-v2.png ] && { echo "✅ 원화 생성"; exit 0; }
  sleep 180
done
echo "❌ 2시간 동안 이미지 엔진을 못 잡았다"; exit 4
