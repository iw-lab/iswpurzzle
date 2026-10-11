#!/usr/bin/env node
// 최악 장면 프레임 시간 대리 측정(이 맥 · CPU 4배 감속) — GDD §1-9 «로켓 8대 + 연속 발사 + 파티클».
//   실기기 판정은 폰에서 ?perf 로 따로 한다. 이 도구는 «회귀가 생겼나»를 보는 용도.
//   node tools/perf-probe.mjs [--url http://127.0.0.1:8191/smoke.html] [--secs 15] [--cpu 4]
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const URL_ = arg('--url', 'http://127.0.0.1:8191/smoke.html');
const SECS = Number(arg('--secs', 15));
const CPU = Number(arg('--cpu', 4));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal'] });
const out = {};
for (const [name, vp] of [['phone', { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }], ['wall', { width: 1920, height: 1080 }]]) {
  const p = await b.newPage();
  await p.setViewport(vp);
  const cdp = await p.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await p.goto(`${URL_}?autostart=big`, { waitUntil: 'networkidle0' });
  await p.waitForFunction(() => window.__ttak1?.sim?.t > 0, { timeout: 20000 });
  const r = await p.evaluate(async (secs) => {
    const T = window.__ttak1;
    const v = T.view;
    const orig = v.draw.bind(v);
    const draw = [];
    v.draw = (now, dt) => { const t0 = performance.now(); orig(now, dt); draw.push(performance.now() - t0); };
    const frames = [];
    let last = performance.now();
    let maxParts = 0;
    const end = last + secs * 1000;
    await new Promise((res) => {
      const tick = (t) => { frames.push(t - last); last = t; maxParts = Math.max(maxParts, v.parts.length); if (t < end) requestAnimationFrame(tick); else res(); };
      requestAnimationFrame(tick);
      // 똑똑한 봇이 0.25초마다 붓는다 — 발사가 이어지는 최악 장면
      const iv = setInterval(() => {
        const s = T.sim; if (!s || !s.cur) return;
        const rem = s.tanks.map((k) => 100 - k.fill);
        let c = rem.findIndex((x) => x === s.cur.v);
        if (c < 0) { let bs = 1e9; rem.forEach((x, i) => { if (s.cur.v <= x && x - s.cur.v < bs) { bs = x - s.cur.v; c = i; } }); }
        s.drop(Math.max(0, c));
      }, 250);
      setTimeout(() => clearInterval(iv), secs * 1000);
    });
    const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * 0.95)]; };
    return { frameP95: p95(frames.slice(10)), drawP95: p95(draw.slice(10)), frames: frames.length, launches: T.sim.launches, maxParts };
  }, SECS);
  out[name] = r;
  await p.close();
}
await b.close();
for (const [k, r] of Object.entries(out)) console.log(`${k}: 프레임 P95 ${r.frameP95.toFixed(1)}ms · 그리기 P95 ${r.drawP95.toFixed(2)}ms · 프레임 ${r.frames} · 발사 ${r.launches} · 파티클 최대 ${r.maxParts} (CPU ×${CPU})`);
