#!/usr/bin/env bash
# 긴박 BGM 재생성 — 첫 시드가 끝단 버스트(삑) 게이트에서 떨어졌다. 시드를 바꿔 PASS 가 날 때까지(최대 4회)
O="$(cd "$(dirname "$0")" && pwd)/bgm"
for seed in 4242 777 90210 31337; do
  ~/.claude/skills/game-builder/tools/gen-bgm.sh "$O" "intense fast countdown music loop for the last seconds of a kids arcade game, driving drums, rising synth arpeggios, urgent but fun, instrumental, seamless loop, steady energy to the end" --dur 40 --bpm 150 --key "A minor" --name bgm_hurry --seed $seed
  python3 -c "import json,sys;d=json.load(open('$O/bgm_hurry.audio.json'));sys.exit(0 if d['verdict']=='PASS' else 1)" && exit 0
done
exit 1
