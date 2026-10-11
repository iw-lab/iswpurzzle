#!/usr/bin/env bash
# 딱1 로켓 게이트 한 번에 — 시험·학습 봇·주입 빨강·스모크·입력 끝단·기본틀·에셋 게이트
set -uo pipefail
cd "$(dirname "$0")/.."
F=0; run() { echo "▶ $1"; shift; "$@" >/tmp/ttak1-gate.log 2>&1 && echo "  ✅" || { echo "  ❌"; tail -8 /tmp/ttak1-gate.log; F=1; }; }
SK=~/.claude/skills/game-builder/tools
run "타입" npx tsc -p tsconfig.app.json
run "코어 시험" npx vitest run
run "허브 시험" node --test tests/school-hub.nodetest.mjs
for g in 4 5 6; do run "학습 봇 ${g}학년" node tools/bots.mjs --n 300 --grade $g; done
for m in survival rule big; do run "학습 봇 $m" node tools/bots.mjs --n 150 --mode $m; done
for inj in flat center free; do echo "▶ 주입 $inj 은 빨강이어야"; node tools/bots.mjs --n 120 --inject $inj >/dev/null 2>&1 && { echo "  ❌ 주입했는데 초록"; F=1; } || echo "  ✅ 빨강"; done
run "빌드" npx vite build
run "2D 스모크" node $SK/phaser-smoke.mjs --dir . --page dist/smoke.html --scene-cycles 5
(cd dist && python3 -m http.server 8191 >/dev/null 2>&1 &) ; sleep 1
run "입력 끝단(키)" node $SK/e2e-input.mjs --url "http://127.0.0.1:8191/smoke.html?autostart=time" --ready "window.__ttak1?.sim?.t > 0" --probe "window.__ttak1.sim.placed + window.__ttak1.sim.idleTaps" --key ArrowDown --n 30 --settle 700
run "입력 끝단(탭)" node $SK/e2e-input.mjs --url "http://127.0.0.1:8191/smoke.html?autostart=time" --ready "window.__ttak1?.sim?.t > 0" --probe "window.__ttak1.sim.placed + window.__ttak1.sim.idleTaps" --pointer --n 30 --settle 700
pkill -f "http.server 8191"
run "기본틀 화면" node $SK/gate-baseline.mjs .
run "그림 엔진(ff)" node $SK/check-image-engine.mjs game-assets-src/raw/ff
run "그림 엔진(gpt)" node $SK/check-image-engine.mjs game-assets-src/raw/gpt
run "캐릭터 뼈대" node $SK/gate-char-rig.mjs --dir .
run "3D 출처" node $SK/gate-3d-source.mjs .
run "실브라우저 5화면" node tools/qa-play.mjs
exit $F
