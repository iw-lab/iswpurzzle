/**
 * 킹수학 등재용 썸네일 v2 — 게임 정체를 읽히게 만든다.
 *
 * 왜 다시 만드나: v1 이 올린 건 텍스트 없는 보드 캡처라 목록에서 무슨 게임인지 안 보였다.
 * 킹수학 목록의 실측 렌더는 189x118 / 271x169 = 약 1.6:1 `object-fit:cover` 다.
 * 원본 400x267(1.5:1)을 1.6:1 로 덮으면 **세로가 250px 로 깎인다** → 위아래 각 8.5px 는
 * 잘린다고 보고 상하 여백을 16px 이상 준다. 가로는 400 전부 살아남는다.
 *
 * 실행: node scripts/make-thumbnail-v2.mjs   (로컬 서버 불필요 — 순수 CSS 합성)
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const OUT = 'dist-kingsmath';
fs.mkdirSync(OUT, { recursive: true });

/* 게임 실제 팔레트(src 의 color key 와 맞춘다) */
const C = { red: '#f43f5e', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308', purple: '#a855f7', cyan: '#22d3ee' };

/* 우측 그래픽 = 게임 규칙 그 자체.
   같은 값의 네 가지 표기가 세로로 이어져 터지는 순간을 보여준다. */
const CHAIN = [
  { t: '1/2', c: C.red },
  { t: '2/4', c: C.red },
  { t: '0.5', c: C.red },
  { t: '50%', c: C.red },
];
/* 배경에 흩어 두는 다른 값들 — 체인과 절대 겹치지 않는 좌표에만 둔다.
   (v2 초안에서 체인 하단에 붙였다가 '50%' 타일을 덮고 우측이 잘렸다) */
const DECO = [
  { t: '3/4', c: C.green,  x:  44, y: -78 },
  { t: '0.2', c: C.yellow, x:  46, y: -26 },
  { t: '25%', c: C.blue,   x:  46, y:  28 },
  { t: '3/5', c: C.purple, x:  44, y:  78 },
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:400px;height:267px;overflow:hidden}
.card{position:relative;width:400px;height:267px;overflow:hidden;
  font-family:'Apple SD Gothic Neo','Pretendard','Noto Sans KR',sans-serif;
  background:
    radial-gradient(120% 90% at 78% 30%, rgba(34,211,238,.20) 0%, rgba(7,11,24,0) 60%),
    radial-gradient(90% 80% at 8% 88%, rgba(168,85,247,.18) 0%, rgba(7,11,24,0) 62%),
    linear-gradient(160deg,#0b1226 0%,#070b18 55%,#05070f 100%)}
/* 세로 크롭(267→250) 대비: 콘텐츠는 상하 16px 안쪽에만 */
.inner{position:absolute;left:0;right:0;top:16px;bottom:16px;display:flex;align-items:center}

.left{width:232px;padding-left:20px}
.title{font-size:50px;font-weight:900;color:#fff;letter-spacing:-3.4px;line-height:.98;
  text-shadow:0 3px 16px rgba(0,0,0,.8)}
.en{margin-top:3px;font-size:12.5px;font-weight:800;color:#5eead4;letter-spacing:3.2px}
.desc{margin-top:11px;font-size:17.5px;font-weight:800;color:#e8eef8;letter-spacing:-.9px;line-height:1.33}
.desc b{color:#fde047}
.badges{margin-top:12px;display:flex;flex-wrap:wrap;gap:5px}
.b{padding:4.5px 9px;border-radius:999px;font-size:11.5px;font-weight:800;letter-spacing:-.4px;
  background:rgba(255,255,255,.10);color:#cfe0f5;border:1px solid rgba(255,255,255,.16)}
.b.hot{background:linear-gradient(90deg,#f43f5e,#f59e0b);color:#fff;border-color:transparent}

/* 우측: 동치 체인 */
.right{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}
.glow{position:absolute;width:132px;height:132px;border-radius:50%;
  background:radial-gradient(circle,rgba(244,63,94,.42) 0%,rgba(244,63,94,0) 70%)}
.chain{position:relative;display:flex;flex-direction:column;gap:4px}
.tile{width:60px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;
  font-size:19px;font-weight:900;color:#fff;letter-spacing:-.6px;
  box-shadow:0 3px 10px rgba(0,0,0,.45), inset 0 1.5px 0 rgba(255,255,255,.34)}
.eq{position:absolute;left:-19px;top:0;bottom:0;width:11px;
  border-left:2.5px solid rgba(94,234,212,.85);border-top:2.5px solid rgba(94,234,212,.85);
  border-bottom:2.5px solid rgba(94,234,212,.85);border-radius:5px 0 0 5px}
.eqtag{position:absolute;left:-49px;top:50%;transform:translateY(-50%) rotate(-90deg);
  font-size:11px;font-weight:900;color:#5eead4;letter-spacing:1.4px;white-space:nowrap}
.d{position:absolute;width:30px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:900;color:rgba(255,255,255,.92);opacity:.30;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.28)}
</style></head><body>
<div class="card"><div class="inner">
  <div class="left">
    <div class="title">크로마폴</div>
    <div class="en">CHROMAFALL</div>
    <div class="desc">표기가 달라도<br><b>값이 같으면</b> 터진다</div>
    <div class="badges">
      <div class="b hot">5~6학년 수학</div>
      <div class="b">분수·소수·백분율</div>
      <div class="b">가입 없이 바로</div>
    </div>
  </div>
  <div class="right">
    <div class="glow"></div>
    <div class="chain">
      <div class="eq"></div><div class="eqtag">SAME VALUE</div>
      ${CHAIN.map(t => `<div class="tile" style="background:linear-gradient(160deg,${t.c},${t.c}cc)">${t.t}</div>`).join('')}
    </div>
    ${DECO.map(d => `<div class="d" style="background:${d.c};left:calc(50% + ${d.x}px);top:calc(50% + ${d.y}px)">${d.t}</div>`).join('')}
  </div>
</div></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 267 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/thumb-v2.png` });

/* 목록에서 실제로 잘리는 모습(1.6:1 center crop) 미리보기 — 검수용 */
const p3 = await browser.newPage({ viewport: { width: 271, height: 169 }, deviceScaleFactor: 2 });
await p3.setContent(`<body style="margin:0"><img src="data:image/png;base64,${fs.readFileSync(`${OUT}/thumb-v2.png`).toString('base64')}"
  style="width:271px;height:169px;object-fit:cover;object-position:50% 50%;display:block"></body>`);
await p3.waitForTimeout(300);
await p3.screenshot({ path: `${OUT}/thumb-v2-cropped.png` });

await browser.close();
console.log(`OK -> ${OUT}/thumb-v2.png (800x534 @2x)`);
console.log(`OK -> ${OUT}/thumb-v2-cropped.png (목록에서 잘린 모습)`);
