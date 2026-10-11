#!/usr/bin/env node
// 학습 게이트(fun-and-learning-gates §D) — 브라우저 게임과 «같은» src/core/sim.ts 를 봇이 돌린다.
//   D-1 0%·무작위·가운데 봇이 발사를 못 얻는다   D-2 85%/45% 봇 발사 비   D-3 문항 노출 비율
//   D-7 «딱 1 칸» 대상 위치 균등(check-answer-balance)   D-6 표기 변화(check-question-variety)   무데드락(regens)
// 공통 난수: 정답률 칸마다 같은 판 시드를 쓰고, 봇 난수는 따로 둔다(정답률을 시드에 섞지 않는다).
//
// 사용: node tools/bots.mjs [--n 600] [--grade 5] [--mode time] [--json out.json] [--inject <버그>]
//   --inject flat   : «딱 1 칸» 확률을 0으로 → D-1 격차가 사라져 빨개져야 한다
//   --inject center : «딱 1 칸» 대상을 늘 가운데 통으로 → D-7 빨강
//   --inject free   : 빈 통 기준 1.00 칸 허용 → D-1 빨강
// 종료코드 0 PASS · 1 FAIL
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Sim } from '../src/core/sim.ts';
import { makeMode } from '../src/core/modes.ts';
import { makeRng } from '../src/core/rng.ts';
import { ONE } from '../src/core/values.ts';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const N = Number(arg('--n', 600));
const GRADE = Number(arg('--grade', 5));
const MODE = arg('--mode', 'time');
const INJECT = arg('--inject', '');
const SKILL = path.join(process.env.HOME, '.claude/skills/game-builder/tools');

function modeFor(id = MODE) {
  const m = makeMode(id, Number(arg('--level', 0)));
  if (INJECT === 'flat') m.pFit = () => 0;
  return m;
}

function patch(sim) {
  if (INJECT === 'center') {
    // 딱 1 칸을 늘 가운데 통 기준으로 — 정답 위치 쏠림 주입
    const orig = sim.makeCell.bind(sim);
    sim.makeCell = function () {
      const mid = Math.floor(this.tanks.length / 2);
      if (this.tanks[mid].fill > 0 && this.r() < 0.5) {
        const v = ONE - this.tanks[mid].fill;
        if (v <= 90) { this.fitLog.push({ answer: mid, tanks: this.tanks.length }); return { v, label: String(v / 100), kind: 'dec', id: this.nextId++ }; }
      }
      return orig();
    };
  }
  if (INJECT === 'free') {
    const orig = sim.makeCell.bind(sim);
    sim.makeCell = function () {
      if (this.r() < 0.4) return { v: ONE, label: '1', kind: 'dec', id: this.nextId++ };
      return orig();
    };
  }
}

/** 봇 한 판. acc = 정답 고를 확률, think = 칸이 뜬 뒤 누르기까지(초). kind: 'auto'|'random'|'center'|'smart' */
export function playBot(seed, botSeed, { acc = 0, think = 1.5, kind = 'smart', mode = MODE } = {}) {
  const sim = new Sim(modeFor(mode), { grade: GRADE, seed });
  patch(sim);
  const b = makeRng(botSeed);
  const served = [];
  let decideAt = null, lastId = -1;
  const DT = 1000 / 60;
  let guard = 0;
  while (!sim.over && guard++ < 60 * 60 * 30) {
    if (sim.cur && sim.cur.id !== lastId) {
      lastId = sim.cur.id;
      served.push({ type: sim.cur.kind, choices: [sim.cur.label], answer: 0 });
      decideAt = kind === 'auto' ? null : sim.t + think * 1000;
    }
    if (sim.cur && decideAt != null && sim.t >= decideAt) {
      decideAt = null;
      const v = sim.cur.v;
      const T = sim.tanks.length;
      let col;
      if (kind === 'center') col = Math.floor(T / 2);
      else if (kind === 'random' || b() > acc) col = Math.floor(b() * T);
      else {
        const rem = sim.tanks.map((t) => ONE - t.fill);
        // 딱 맞는 통이 여럿이면 무작위로(첫 통만 고르는 버릇이 정답 위치 게이트를 오염시킨다)
        const exact = rem.map((r, i) => (r === v ? i : -1)).filter((i) => i >= 0);
        col = exact.length ? exact[Math.floor(b() * exact.length)] : -1;
        if (col < 0) {
          let best = -1, bs = 1e9;
          // 같은 점수면 무작위로 — 늘 첫 통부터 채우는 봇은 «정답 위치»를 자기 버릇으로 쏠리게 한다
          let ties = 0;
          rem.forEach((r, i) => {
            if (v > r) return;
            if (r - v < bs) { bs = r - v; best = i; ties = 1; }
            else if (r - v === bs && b() < 1 / ++ties) best = i;
          });
          col = best < 0 ? Math.floor(b() * T) : best;
        }
      }
      sim.drop(col);
    }
    sim.step(DT);
    sim.drainEvents();
  }
  return { launches: sim.launches, score: sim.score, overflows: sim.overflows, exposed: sim.exposedMs / Math.max(1, sim.t), regens: sim.regens, fit: sim.fitLog, served, cleared: sim.cleared };
}

function avg(xs) { return xs.reduce((a, b) => a + b, 0) / xs.length; }

const BOTS = {
  auto: { kind: 'auto' },
  random: { kind: 'random', think: 1.5 },
  center: { kind: 'center', think: 1.5 },
  p45: { acc: 0.45, think: 2.0 },
  p60: { acc: 0.6, think: 1.8 },
  p85: { acc: 0.85, think: 1.5 },
  adult: { acc: 0.95, think: 0.7 },
};

const res = {};
const fits = [];
const served = [];
let regens = 0, exposed = [];
for (const [name, cfg] of Object.entries(BOTS)) {
  const L = [];
  for (let i = 0; i < N; i++) {
    const r = playBot(10_000 + i, 90_000 + i, cfg);
    L.push(r.launches);
    regens += r.regens;
    if (name === 'p85') { fits.push(...r.fit); exposed.push(r.exposed); }
  }
  res[name] = avg(L);
}
const fails = [];
const out = (s) => console.log(s);
out(`딱1 로켓 봇 게이트 · 모드 ${MODE} · ${GRADE}학년 · n=${N}${INJECT ? ` · 주입 ${INJECT}` : ''}`);
for (const [k, v] of Object.entries(res)) out(`  ${k.padEnd(7)} 발사 ${v.toFixed(2)}`);

// D-1 — 공부 안 해도 되는 길이 없다
for (const k of ['auto', 'random', 'center']) {
  if (res[k] > 5 || res[k] > res.p45 * 0.75) fails.push(`D-1 ${k} 봇 발사 ${res[k].toFixed(2)} (상한 5 · 45% 봇의 0.75배 = ${(res.p45 * 0.75).toFixed(2)})`);
}
// D-2 — 잘할수록 확실히 더 얻는다
const gain = res.p85 / res.p45;
out(`  D-2 이득비 85%/45% = ${gain.toFixed(2)}`);
if (!(gain >= 1.4)) fails.push(`D-2 이득비 ${gain.toFixed(2)} < 1.4`);
if (!(res.p45 < res.p60 && res.p60 < res.p85 && res.p85 < res.adult)) fails.push('D-2 정답률이 오를수록 발사가 늘지 않는다(단조성 깨짐)');
// D-3 — 문항 노출
const ex = avg(exposed);
out(`  D-3 노출 ${(ex * 100).toFixed(1)}%`);
if (ex < 0.95 && MODE !== 'classic') fails.push(`D-3 문항(칸) 노출 ${(ex * 100).toFixed(1)}% < 95%`);
// 무데드락 — 미리 보여 준 칸을 갈아 끼운 횟수
const regenRate = regens / (N * Object.keys(BOTS).length);
out(`  무데드락: 판당 갈아 끼움 ${regenRate.toFixed(3)}회`);
if (regenRate > 0.05) fails.push(`무데드락 판당 갈아 끼움 ${regenRate.toFixed(3)} > 0.05`);

// D-6 표본 — 판 경계에서 연속이 이어 붙지 않게 «한 판 긴 줄»(끝없는 우주 · 어른 봇)에서 뽑는다
for (let i = 0; served.length < 600 && i < 20; i++) served.push(...playBot(50_000 + i, 70_000 + i, { ...BOTS.adult, mode: 'survival' }).served);

// D-7 정답 위치 균등 · D-6 표기 변화 — 스킬 게이트에 넘긴다
const tmp = mkdtempSync(path.join(tmpdir(), 'ttak1-'));
const T = fits[0]?.tanks ?? 5;
const ab = fits.map((f) => ({ subject: `grade${GRADE}`, answer: f.answer, choices: Array.from({ length: T }, (_, i) => `통${i + 1}`) }));
writeFileSync(path.join(tmp, 'ab.json'), JSON.stringify(ab));
writeFileSync(path.join(tmp, 'served.json'), JSON.stringify(served));
for (const [label, tool, args] of [
  ['D-7 정답 위치', 'check-answer-balance.mjs', ['--json', path.join(tmp, 'ab.json')]],
  ['D-6 표기 변화', 'check-question-variety.mjs', ['--json', path.join(tmp, 'served.json'), '--max-run', '3', '--types', GRADE === 6 ? 'frac,dec,pct' : 'frac,dec']],
]) {
  try {
    const o = execFileSync('node', [path.join(SKILL, tool), ...args], { encoding: 'utf8' });
    out(`  ${label} PASS ${o.trim().split('\n').pop()}`);
  } catch (e) {
    fails.push(`${label} FAIL — ${(e.stdout || e.message).trim().split('\n').slice(-3).join(' / ')}`);
  }
}
if (arg('--json')) writeFileSync(arg('--json'), JSON.stringify({ res, gain, exposed: ex, regenRate, fails }, null, 2));
if (fails.length) { out('❌ FAIL'); for (const f of fails) out('  · ' + f); process.exit(1); }
out('✅ PASS');
