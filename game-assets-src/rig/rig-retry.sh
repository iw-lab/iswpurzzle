#!/usr/bin/env bash
# 도키 리그 — Firefly 3D 잠금이 다른 세션에 있으면 풀릴 때까지 다시
cd "$(dirname "$0")/../.."
for i in $(seq 1 60); do
  echo "[$(date +%T)] 리그 시도 $i"
  python3 ~/.claude/skills/game-builder/tools/rig-characters.py doki && exit 0
  sleep 60
done
exit 4
