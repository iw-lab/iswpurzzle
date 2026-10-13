#!/usr/bin/env node
// 분수 세로 표기 e2e — 판을 돌려 분수 칸(다음·보관·떨어지는 칸)·넘침 배너·결과 복습이 실제로 화면에 나오게 한 뒤
// 빗금 분수 0 + 쌓은 분수(.fr/.frac 요소 또는 캔버스 분수 칸) ≥ 1 을 잰다.  사용: node tools/e2e-fraction.mjs <url>
import os from 'node:os';
import { createRequire } from 'node:module';
const GB = `${os.homedir()}/.claude/skills/game-builder`;
const { installFracHooks, probeFractions } = await import(`file://${GB}/tools/check-fraction-runtime.mjs`);
const puppeteer = createRequire(`${GB}/x.js`)('puppeteer');
const url = process.argv[2] || 'http://localhost:5173/';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage(); await page.setViewport({ width: 414, height: 800 });
await installFracHooks(page);
await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.waitForFunction(() => window.__SMOKE__ && window.__ttak1, { timeout: 20000 });
await page.evaluate(() => window.__SMOKE__.ready);
const hits = []; let stackedDom = 0, fracCells = 0, banners = 0;
const take = async (tag) => {
  hits.push(...(await probeFractions(page)).map((h) => ({ tag, ...h })));
  const c = await page.evaluate(() => ({ dom: document.querySelectorAll('.fr, .frac').length, cells: (window.__ttak1.sim?.queue || []).concat(window.__ttak1.sim?.cur ? [window.__ttak1.sim.cur] : []).filter((x) => x.kind === 'frac').length, banner: !document.getElementById('banner')?.classList.contains('hidden') }));
  stackedDom = Math.max(stackedDom, c.dom); fracCells = Math.max(fracCells, c.cells); if (c.banner) banners++;
};
for (const seed of [1000, 1001, 1002, 1003]) {
  await page.evaluate((s) => window.__SMOKE__.seed(s), seed);
  for (let i = 0; i < 400; i++) { await page.evaluate(() => window.__SMOKE__.step(250)); if (i % 8 === 0) { await take(`seed${seed}`); } if (!(await page.evaluate(() => !!window.__ttak1.sim)) ) break; }
  await sleep(100);
}
// 결과 화면까지 — 시간제 판을 끝까지 돌린다
await page.evaluate(() => { window.__SMOKE__.seed(77); for (let i = 0; i < 400; i++) window.__SMOKE__.step(250); });
await sleep(1500); await take('결과');
const result = await page.evaluate(() => ({ shown: !document.getElementById('result')?.classList.contains('hidden'), rv: document.querySelectorAll('#resReview .rv').length }));
await browser.close();
console.log({ 쌓은분수요소최대: stackedDom, 분수칸최대: fracCells, 넘침배너: banners, 결과화면: result });
if (hits.length) { const u = [...new Map(hits.map((h) => [h.where + h.text, h])).values()]; console.log(`FAIL 빗금 분수 ${u.length}곳`); for (const h of u.slice(0, 15)) console.log(' ', h.tag, h.where, h.text); process.exit(1); }
if (!stackedDom || !fracCells) { console.log('FAIL 분수 칸이 화면에 안 나왔다 — 측정 무효'); process.exit(1); }
console.log('PASS 빗금 분수 0 · 쌓은 분수 ≥ 1');
