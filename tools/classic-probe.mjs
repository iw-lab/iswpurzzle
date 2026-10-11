// 발사 임무 40단계 난이도 탐침 — 정답률 45·60·85% 봇의 단계별 성공률(GDD §1-4 «발사 임무» 표의 근거). node tools/classic-probe.mjs
import { Sim } from '../src/core/sim.ts';
import { makeMode } from '../src/core/modes.ts';
import { makeRng } from '../src/core/rng.ts';
function play(level, seed, acc, think) {
  const sim = new Sim(makeMode('classic', level), { grade: 5, seed }); const b = makeRng(seed * 7 + 1);
  let at = null, last = -1;
  while (!sim.over) {
    if (sim.cur && sim.cur.id !== last) { last = sim.cur.id; at = sim.t + think * 1000; }
    if (sim.cur && at != null && sim.t >= at) { at = null; const v = sim.cur.v, T = sim.tanks.length; const rem = sim.tanks.map(t => 100 - t.fill);
      let col; if (b() > acc) col = Math.floor(b() * T); else { const ex = rem.map((r,i)=>r===v?i:-1).filter(i=>i>=0); col = ex.length ? ex[0] : -1; if (col < 0) { let bs=1e9; rem.forEach((r,i)=>{ if (v<=r && r-v<bs){bs=r-v;col=i;} }); if (col<0) col=0; } }
      sim.drop(col); }
    sim.step(1000/60); sim.drainEvents();
  }
  return sim.cleared;
}
for (const lv of [0,3,4,7,9,12,16,19,23,27,29,33,36,39]) {
  const row = [[.45,2],[.6,1.8],[.85,1.5]].map(([a,t]) => { let c=0; for (let s=0;s<100;s++) c+=play(lv, 500+s, a, t)?1:0; return c+'%'; });
  console.log(`단계 ${String(lv+1).padStart(2)} 목표 ${JSON.stringify(makeMode('classic',lv).goal)} → 45%:${row[0]} 60%:${row[1]} 85%:${row[2]}`);
}
