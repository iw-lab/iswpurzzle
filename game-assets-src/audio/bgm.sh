#!/usr/bin/env bash
# 딱1 로켓 BGM 3곡 — 가벼운 2B(기본). 순서대로(동시 실행 금지 — 메모리).
set -u
G=~/.claude/skills/game-builder/tools/gen-bgm.sh
O="$(cd "$(dirname "$0")" && pwd)/bgm"
mkdir -p "$O"
$G "$O" "cheerful playful space adventure loop for a kids puzzle game menu, bright synth bells, soft pads, light bouncy drums, warm and friendly, instrumental, seamless loop" --dur 50 --bpm 104 --key "F major" --name bgm_menu
$G "$O" "upbeat energetic chiptune and synth pop loop for a fast kids arcade puzzle game, catchy lead melody, punchy drums, sparkling arpeggios, rocket launch excitement, instrumental, seamless loop" --dur 50 --bpm 128 --key "C major" --name bgm_play
$G "$O" "intense fast countdown music loop for the last seconds of a kids arcade game, driving drums, rising synth arpeggios, urgent but fun, instrumental, seamless loop" --dur 40 --bpm 150 --key "A minor" --name bgm_hurry
