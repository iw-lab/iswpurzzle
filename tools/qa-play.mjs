#!/usr/bin/env node
// 실제 브라우저로 판을 끝까지 «밟는» QA — 진짜 탭(마우스·터치)과 진짜 키(한글 상태)로 조작하고,
// 화면 크기마다 홈·판·발사 직후·넘침·결과를 찍고, 콘솔 에러를 센다.
//
// 사용: node tools/qa-play.mjs [--url http://…] [--full] [--out screenshots/qa]
//   --url  : 없으면 dist/ 를 임시 서버로 띄운다(허브 없음 → 관문은 바로 통과)
//   --full : 1280×720 에서 60초 판을 끝까지(결과 화면·__gameScore 확인)
// 종료코드 0 PASS · 1 FAIL
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.resolve(ROOT, arg('--out', 'screenshots/qa'));
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.svg': 'image/svg+xml' };
let server = null;
let base = arg('--url');
if (!base) {
  const dist = path.join(ROOT, 'dist');
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.startsWith('/api/')) { res.writeHead(503); res.end(); return; }
    let f = path.join(dist, p);
    if (!f.startsWith(dist)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}/`;
}

const fails = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=metal'] });

async function newPage(vp) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(vp);
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/api\/hub|503|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
  await page.goto(base, { waitUntil: 'networkidle2' });
  return { ctx, page, errors };
}

/** 지금 칸에 «딱 맞는 통 → 아니면 넘치지 않는 통» 을 고른다(사람이 계산해서 고르는 것과 같은 정보만 씀) */
const pickCol = () => {
  const s = window.__ttak1.sim;
  if (!s || !s.cur || s.over) return null;
  const rem = s.tanks.map((t) => 100 - t.fill);
  let col = rem.findIndex((r) => r === s.cur.v);
  if (col < 0) { let bs = 1e9; rem.forEach((r, i) => { if (s.cur.v <= r && r - s.cur.v < bs) { bs = r - s.cur.v; col = i; } }); }
  const L = window.__ttak1.view.L;
  return { col, x: L.colX[col], y: L.tubeTop + L.tubeH * 0.5, launches: s.launches, t: s.t };
};

async function startTime(page) {
  await page.click('#btnPlay');
  await page.waitForFunction(() => window.__ttak1.sim && window.__ttak1.sim.t > 0, { timeout: 8000 });
}

async function playFor(page, ms, { touch = false, wrongEvery = 0 } = {}) {
  const t0 = Date.now();
  let n = 0;
  while (Date.now() - t0 < ms) {
    const p = await page.evaluate(pickCol);
    if (p && p.col >= 0) {
      n++;
      let x = p.x;
      if (wrongEvery && n % wrongEvery === 0) x = await page.evaluate(() => { const L = window.__ttak1.view.L; return L.colX[0]; });
      if (touch) await page.touchscreen.tap(x, p.y); else await page.mouse.click(x, p.y);
    }
    await new Promise((r) => setTimeout(r, 380));
    if (await page.evaluate(() => window.__ttak1.sim?.over)) break;
  }
}

const VPS = [
  { name: 'wall-1920', width: 1920, height: 1080 },
  { name: 'pc-1280', width: 1280, height: 720 },
  { name: 'tablet-1024', width: 1024, height: 768, hasTouch: true, isMobile: true },
  { name: 'phone-land', width: 915, height: 412, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  { name: 'phone-port', width: 390, height: 844, hasTouch: true, isMobile: true, deviceScaleFactor: 3 },
];

for (const vp of VPS) {
  const { ctx, page, errors } = await newPage(vp);
  try {
    await page.screenshot({ path: path.join(OUT, `${vp.name}-1-home.png`) });
    await startTime(page);
    await page.screenshot({ path: path.join(OUT, `${vp.name}-2-start.png`) });
    const touch = !!vp.hasTouch;
    const before = await page.evaluate(() => window.__ttak1.sim.launches);
    await playFor(page, 9000, { touch });
    const after = await page.evaluate(() => window.__ttak1.sim.launches);
    if (after <= before) fails.push(`${vp.name}: 9초 동안 진짜 탭으로 발사 0대(입력이 안 먹는다)`);
    // 일부러 넘치게 — 넘침 배너가 뜨는지
    const forced = await page.evaluate(() => {
      const s = window.__ttak1.sim; if (!s || !s.cur) return null;
      const i = s.tanks.findIndex((t) => t.fill + s.cur.v > 100);
      const L = window.__ttak1.view.L; return i >= 0 ? { x: L.colX[i], y: L.tubeTop + L.tubeH / 2 } : null;
    });
    if (forced) {
      if (touch) await page.touchscreen.tap(forced.x, forced.y); else await page.mouse.click(forced.x, forced.y);
      await new Promise((r) => setTimeout(r, 120));
      const shown = await page.evaluate(() => !document.getElementById('banner').classList.contains('hidden') && document.getElementById('banner').textContent);
      if (!shown || !String(shown).includes('넘쳤어요')) fails.push(`${vp.name}: 넘쳤는데 식 배너가 안 보인다`);
      await page.screenshot({ path: path.join(OUT, `${vp.name}-4-overflow.png`) });
    }
    await page.screenshot({ path: path.join(OUT, `${vp.name}-3-play.png`) });
    // 한글 상태 키보드: key 는 «ㄱ»이지만 code 는 Digit1
    if (!touch) {
      await page.waitForFunction(() => window.__ttak1.sim.cur, { timeout: 3000 }).catch(() => {});
      const fillBefore = await page.evaluate(() => window.__ttak1.sim.tanks.map((t) => t.fill).join(',') + '|' + window.__ttak1.sim.overflows);
      await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ㄱ', code: 'Digit1', bubbles: true })));
      await new Promise((r) => setTimeout(r, 60));
      const fillAfter = await page.evaluate(() => window.__ttak1.sim.tanks.map((t) => t.fill).join(',') + '|' + window.__ttak1.sim.overflows);
      if (fillBefore === fillAfter) fails.push(`${vp.name}: 한글 상태 키(code Digit1)가 안 먹는다`);
    }
    // 터치 타겟·글자 크기(전자칠판)
    const sizes = await page.evaluate(() => {
      const bad = [];
      for (const b of document.querySelectorAll('#game button, #game .tray-box')) {
        const r = b.getBoundingClientRect();
        if (r.width && r.height && Math.min(r.width, r.height) < 44) bad.push(`${b.id || b.className} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      const score = parseFloat(getComputedStyle(document.getElementById('score')).fontSize);
      return { bad, score };
    });
    if (sizes.bad.length) fails.push(`${vp.name}: 작은 단추 ${sizes.bad.join(', ')}`);
    if (vp.name === 'wall-1920' && sizes.score < 96) fails.push(`${vp.name}: 점수 글자 ${sizes.score}px < 96`);
    if (vp.name === 'pc-1280' && argv.includes('--full')) {
      await playFor(page, 70_000, { wrongEvery: 7 });
      await page.waitForFunction(() => !document.getElementById('result').classList.contains('hidden'), { timeout: 10_000 });
      const sc = await page.evaluate(() => ({ g: window.__gameScore, t: window.__ttak1.sim.t }));
      if (!sc.g || !Number.isInteger(sc.g.score)) fails.push('결과: __gameScore 정수 아님');
      if (Math.abs(sc.t - 60_000) > 100) fails.push(`판 길이 ${sc.t}ms ≠ 60000±100`);
      await page.screenshot({ path: path.join(OUT, `${vp.name}-5-result.png`) });
      const t0 = Date.now();
      await page.click('#btnAgain');
      await page.waitForFunction(() => window.__ttak1.sim && window.__ttak1.sim.t > 0 && !window.__ttak1.sim.over, { timeout: 5000 });
      console.log(`  다시 하기 → 새 판 ${Date.now() - t0}ms`);
    }
    if (errors.length) fails.push(`${vp.name}: 콘솔 에러 ${errors.length} — ${errors.slice(0, 3).join(' | ')}`);
    console.log(`✔ ${vp.name}: 발사 ${after} · 에러 ${errors.length}`);
  } catch (e) {
    fails.push(`${vp.name}: ${e.message}`);
  }
  await ctx.close();
}
await browser.close();
server?.close();
if (fails.length) { console.log('❌ FAIL'); for (const f of fails) console.log('  · ' + f); process.exit(1); }
console.log(`✅ PASS — 스크린샷 ${OUT}`);
