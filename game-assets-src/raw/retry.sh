#!/usr/bin/env bash
# 이미지 엔진이 다른 세션에 잡혀 있으면 빌 때까지 다시 — 다 만들어지면 끝
cd "$(dirname "$0")"
for i in $(seq 1 40); do
  missing=$(python3 -c "import json;print(sum(1 for l in open('jobs.jsonl') if l.strip() and not __import__('os').path.exists(json.loads(l)['out'])))")
  echo "[$(date +%T)] 시도 $i · 남은 $missing장"
  [ "$missing" = 0 ] && exit 0
  GB_IMAGE_GPT_BUSY_AFTER=240 ~/.claude/skills/game-builder/tools/gb-image.sh jobs.jsonl
  sleep 60
done
exit 4
