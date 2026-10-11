#!/usr/bin/env bash
# 이미지 엔진이 다른 세션에 잡혀 있으면 빌 때까지 다시 — 다 만들어지면 끝
#   retry.sh ff  : 로켓·마스코트·키아트 (GPT 웹앱 1순위 · 막히면 Firefly)
#   retry.sh gpt : GPT 웹앱 대기열에 줄 서기(막히면 gb-image 가 Firefly 로)
cd "$(dirname "$0")/$1"
for i in $(seq 1 120); do
  missing=$(python3 -c "import json,os;print(sum(1 for l in open('jobs.jsonl') if l.strip() and not os.path.exists(json.loads(l)['out'])))")
  echo "[$(date +%T)] $1 시도 $i · 남은 $missing장"
  [ "$missing" = 0 ] && exit 0
  if [ "$1" = ff ]; then
    GB_IMAGE_GPT_BUSY_AFTER=1500 ~/.claude/skills/game-builder/tools/gb-image.sh jobs.jsonl
    sleep 30
  else
    GB_IMAGE_GPT_BUSY_AFTER=1500 ~/.claude/skills/game-builder/tools/gb-image.sh jobs.jsonl
    sleep 30
  fi
done
exit 4
