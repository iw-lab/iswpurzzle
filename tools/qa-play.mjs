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
  // 빗금 분수(3/20) 감시 — 캔버스에 그린 글자를 전부 엿본다(분수는 위아래로 쌓아야 한다)
  await page.evaluateOnNewDocument(() => {
    window.__slashFrac = [];
    const orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, ...a) {
      if (/\d+\s*\/\s*\d+/.test(String(t)) && window.__slashFrac.length < 20) window.__slashFrac.push(String(t));
      return orig.call(this, t, ...a);
    };
  });
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

const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, sel);

/** 배포본 관문(키트): 학교 정하기 → «목록에 없어요»(순위판에 기록 0) → 문제 풀고 이용권 → 시작 */
async function passGate(page) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let step = 0; step < 30; step++) {
    if (await page.evaluate(() => !!(window.__ttak1.sim && window.__ttak1.sim.t > 0))) return;
    if (await vis(page, '[data-gb="school-pick"]')) { await page.click('[data-gb-none]'); await wait(1500); continue; }
    if (await vis(page, '[data-gb="quiz"]')) {
      if (await vis(page, '.gb-qtext')) {
        const k = await page.evaluate(() => {
          const t = document.querySelector('.gb-qtext')?.textContent || '';
          const m = t.match(/(\d+)\s*([+−\-×÷])\s*(\d+)/); if (!m) return 0;
          const a = +m[1], c = +m[3], v = { '+': a + c, '−': a - c, '-': a - c, '×': a * c, '÷': a / c }[m[2]];
          const ch = [...document.querySelectorAll('.gb-choice')].map((e) => e.textContent.trim());
          const i = ch.findIndex((x) => Number(x) === v); return i < 0 ? 0 : i;
        });
        await page.click(`[data-pick="${k}"]`).catch(() => {});
        await wait(1300);
      } else { await page.click('[data-qgo]').catch(() => {}); await wait(2500); }
      continue;
    }
    await wait(700);
  }
}

async function startTime(page) {
  await page.click('#btnPlay');
  await passGate(page);
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
  { name: 'phone-small', width: 360, height: 740, hasTouch: true, isMobile: true, deviceScaleFactor: 3 },
];

const ONLY = arg('--only');
for (const vp of VPS.filter((v) => !ONLY || ONLY.split(',').includes(v.name))) {
  const { ctx, page, errors } = await newPage(vp);
  try {
    await page.screenshot({ path: path.join(OUT, `${vp.name}-1-home.png`) });
    await startTime(page);
    await page.screenshot({ path: path.join(OUT, `${vp.name}-2-start.png`) });
    // 🔴 보이는 단추·글자판은 화면 «안»에 있어야 한다 — 360px 세로 폰에서 전체화면 단추가 오른쪽 밖으로 잘렸다(2026-10-13 제보 «안보여용»)
    const offscreen = await page.evaluate(() => [...document.querySelectorAll('#game button, #hud > *, #tray, #hint')].filter((el) => {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (!r.width || cs.display === 'none' || cs.visibility === 'hidden' || el.closest('.hidden')) return false;
      return r.left < -1 || r.right > innerWidth + 1 || r.top < -1;
    }).map((el) => `${el.id || el.className}(${Math.round(el.getBoundingClientRect().left)}~${Math.round(el.getBoundingClientRect().right)} / ${innerWidth})`));
    if (offscreen.length) fails.push(`${vp.name}: 화면 밖으로 잘린 요소 ${offscreen.join(', ')}`);
    // 윗줄 칸끼리 겹치면 안 된다(점수가 4자리가 되면 전체화면 단추를 덮었다 — 360px 폭)
    await page.evaluate(() => { const sc = document.getElementById('score'); if (sc) sc.textContent = '88,888'; });
    const hudOverlap = await page.evaluate(() => {
      const els = [...document.querySelectorAll('#hud button, #modeBar .gb-chip, #score')].filter((e) => e.getBoundingClientRect().width);
      const out = [];
      for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
        const a = els[i].getBoundingClientRect(), b = els[j].getBoundingClientRect();
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push(`${els[i].id || els[i].className}(${Math.round(a.left)}~${Math.round(a.right)})↔${els[j].id || els[j].className}(${Math.round(b.left)}~${Math.round(b.right)})`);
      }
      return out;
    });
    const hudIntrude = await page.evaluate(() => {
      const L = window.__ttak1.view.L; const sc = document.getElementById('score').getBoundingClientRect();
      const r = document.getElementById('hud').getBoundingClientRect();
      const bottom = Math.max(sc.bottom, r.bottom);
      return bottom > L.spawnTop + 4 && sc.left < L.playX + L.playW && sc.right > L.playX ? `윗줄 아래끝 ${Math.round(bottom)} > 낙하 시작 ${L.spawnTop}` : null;
    });
    if (hudIntrude) fails.push(`${vp.name}: 점수·윗줄이 떨어지는 칸 자리를 가린다 (${hudIntrude})`);
    if (hudOverlap.length) fails.push(`${vp.name}: 윗줄 겹침(점수 88,888) ${hudOverlap.join(', ')}`);
    // 🔴 시작 안내가 떨어지는 칸을 가리면 안 된다(낙하 영역과 겹침 0)
    const hintHit = await page.evaluate(() => {
      const h = document.getElementById('hint'); const L = window.__ttak1 && window.__ttak1.view && window.__ttak1.view.L;
      if (!h || h.classList.contains('hidden') || !L) return null;
      const r = h.getBoundingClientRect();
      return r.top < L.spawnTop + L.spawnH && r.bottom > L.spawnTop ? `안내 ${Math.round(r.top)}~${Math.round(r.bottom)} · 낙하 ${L.spawnTop}~${L.spawnTop + L.spawnH}` : null;
    });
    if (hintHit) fails.push(`${vp.name}: 시작 안내가 떨어지는 칸 자리를 가린다 (${hintHit})`);
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
      // 🔴 넓은 화면(옆 패널 있음)에선 배너가 통·떨어지는 칸 위에 뜨면 안 된다(폰 가로에서 가운데 떠 통을 가렸다 — 2026-10-13)
      const bHit = await page.evaluate(() => {
        const L = window.__ttak1.view.L; if (!L.wide || L.sideW < 150) return null;
        const r = document.getElementById('banner').getBoundingClientRect();
        const px0 = L.playX, px1 = L.playX + L.playW;
        return r.left < px1 - 2 && r.right > px0 + 2 && r.top < L.padY && r.bottom > L.spawnTop ? `배너 ${Math.round(r.left)}~${Math.round(r.right)} · 판 ${px0}~${px1}` : null;
      });
      if (bHit) fails.push(`${vp.name}: 알림 배너가 판(통·낙하)을 가린다 (${bHit})`);
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
      await passGate(page);
      await page.waitForFunction(() => window.__ttak1.sim && window.__ttak1.sim.t > 0 && !window.__ttak1.sim.over, { timeout: 5000 });
      console.log(`  다시 하기 → 새 판 ${Date.now() - t0}ms`);
    }
    const slash = await page.evaluate(() => [...window.__slashFrac, ...(document.body.innerText.match(/\d+\s*\/\s*\d+/g) || []).map((x) => `DOM ${x}`)]);
    if (slash.length) fails.push(`${vp.name}: 빗금 분수가 화면에 나왔다 — ${[...new Set(slash)].slice(0, 5).join(', ')}`);
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
