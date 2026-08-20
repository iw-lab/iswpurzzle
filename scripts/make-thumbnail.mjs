import { chromium } from '@playwright/test';
import fs from 'node:fs';

const OUT_DIR = 'dist-kingsmath';
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();

/* ───────── 1) 게임 보드 캡처 (배경으로 쓸 소재) ───────── */
const page = await browser.newPage({ viewport: { width: 1000, height: 667 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

await page.evaluate(() => {
  const k = 'chromafall-user-storage';
  const s = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":0}');
  s.state.settings = { ...(s.state.settings || {}), hasSeenTutorial: true, soundEnabled: false, musicEnabled: false, mathColorHint: true };
  localStorage.setItem(k, JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

await page.evaluate(() => { document.querySelectorAll('button').forEach(b => { if (b.innerText.includes('GAME START')) b.click(); }); });
await page.waitForTimeout(800);
await page.evaluate(() => { document.querySelectorAll('button').forEach(b => { if (b.innerText.includes('수학')) b.click(); }); });
await page.waitForTimeout(1600);

// 동치 표기가 또렷하게 읽히는 보드 구성
await page.evaluate(() => {
  const API = window.__chromafall;
  const COLS = 8, ROWS = 16;
  const b = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const set = (x, y, label, key, color) => { b[y][x] = { id: `t${x}-${y}`, color, x, y, specialType: 'normal', label, matchKey: key }; };
  const P = [
    ['half', 'red', ['1/2', '2/4', '0.5', '50%']],
    ['quarter', 'blue', ['1/4', '2/8', '0.25', '25%']],
    ['three_quarters', 'green', ['3/4', '6/8', '0.75', '75%']],
    ['one_fifth', 'yellow', ['1/5', '2/10', '0.2', '20%']],
    ['three_fifths', 'purple', ['3/5', '6/10', '0.6', '60%']],
    ['one_tenth', 'cyan', ['1/10', '0.1', '10%']],
  ];
  let n = 0;
  for (let r = 0; r < 11; r++) {
    for (let x = 0; x < 8; x++) {
      const cls = P[(x * 3 + r * 2 + Math.floor(n / 5)) % P.length];
      const forms = cls[2];
      set(x, ROWS - 1 - r, forms[(x + r) % forms.length], cls[0], cls[1]);
      n++;
    }
  }
  API.set({ board: b, currentBlocks: [], currentBlock: null, score: 48250, level: 6, combo: 4, chainCount: 3, gameStatus: 'ready' });
});
await page.waitForTimeout(1200);

const rawPath = `${OUT_DIR}/thumb-board-raw.png`;
const boardEl = await page.$('div.select-none.touch-none');
if (!boardEl) throw new Error('board element not found');
await boardEl.screenshot({ path: rawPath });
await page.close();

/* ───────── 2) 제목 합성 (400x267) ───────── */
const boardB64 = fs.readFileSync(rawPath).toString('base64');

/* 목록은 80x80 object-fit:cover 로 그린다 → 400x267 의 "가운데 정사각형"만 남는다.
   따라서 핵심 요소는 전부 중앙 267x267 안전영역 안에 넣는다. */
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:400px;height:267px;overflow:hidden}
  .card{position:relative;width:400px;height:267px;overflow:hidden;
        font-family:'Apple SD Gothic Neo','Pretendard','Noto Sans KR',sans-serif;background:#070b18}
  .bg{position:absolute;inset:0;
      background-image:url(data:image/png;base64,${boardB64});
      background-size:cover;background-position:center 42%;
      filter:saturate(1.5) contrast(1.06)}
  .veil{position:absolute;inset:0;
        background:radial-gradient(115% 92% at 50% 46%,rgba(7,11,24,.90) 0%,rgba(7,11,24,.86) 42%,rgba(7,11,24,.55) 72%,rgba(7,11,24,.30) 100%)}
  /* 안전영역: 가운데 267px */
  .safe{position:absolute;left:50%;top:0;transform:translateX(-50%);
        width:267px;height:267px;display:flex;flex-direction:column;
        align-items:center;justify-content:center;text-align:center;padding:0 6px}
  .title{font-size:58px;font-weight:900;color:#fff;letter-spacing:-3px;line-height:1;
         text-shadow:0 3px 18px rgba(0,0,0,.9),0 0 44px rgba(0,0,0,.6)}
  .en{margin-top:5px;font-size:15px;font-weight:800;color:#5eead4;letter-spacing:2.6px}
  .pill{margin-top:13px;padding:7px 15px;border-radius:999px;
        background:linear-gradient(90deg,#f43f5e,#f59e0b,#22c55e);
        font-size:19px;font-weight:900;color:#fff;white-space:nowrap;
        box-shadow:0 4px 16px rgba(0,0,0,.65)}
  .sub{margin-top:10px;font-size:16px;font-weight:800;color:#dbe4f0;letter-spacing:-.5px;
       text-shadow:0 2px 8px rgba(0,0,0,.9)}
</style></head><body>
  <div class="card">
    <div class="bg"></div><div class="veil"></div>
    <div class="safe">
      <div class="title">크로마폴</div>
      <div class="en">CHROMAFALL</div>
      <div class="pill">1/2 = 2/4 = 50%</div>
      <div class="sub">분수 · 소수 · 백분율 퍼즐</div>
    </div>
  </div>
</body></html>`;

const p2 = await browser.newPage({ viewport: { width: 400, height: 267 }, deviceScaleFactor: 2 });
await p2.setContent(html, { waitUntil: 'networkidle' });
await p2.waitForTimeout(600);
await p2.screenshot({ path: `${OUT_DIR}/thumb-new.png` });
await browser.close();
console.log('OK -> dist-kingsmath/thumb-new.png (800x534 @2x)');
