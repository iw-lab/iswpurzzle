/** 배포 전 시각 QA — 데스크톱/모바일 주요 화면 캡처. 헤드리스라 hidden 탭 문제 없음. */
import { chromium } from '@playwright/test';

const OUT = process.env.QA_OUT || 'screenshots/qa-2026-08-20';
const browser = await chromium.launch();

async function shoot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
async function click(page, text) {
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.innerText.includes(t) || x.getAttribute('aria-label') === t);
    if (b) b.click();
  }, text);
}

for (const [device, vp] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2, isMobile: device === 'mobile', hasTouch: device === 'mobile' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)); });

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const k = 'chromafall-user-storage';
    const s = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":0}');
    s.state.settings = { ...(s.state.settings || {}), hasSeenTutorial: true, soundEnabled: false, musicEnabled: false };
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await shoot(page, `${device}-01-menu`);

  await click(page, '퀘스트'); await page.waitForTimeout(1500); await shoot(page, `${device}-02-quests`);
  await click(page, '뒤로'); await page.waitForTimeout(1200);
  await click(page, '상점'); await page.waitForTimeout(1500); await shoot(page, `${device}-03-shop`);
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='←'); if(b) b.click(); });
  await page.waitForTimeout(1200);
  await click(page, '랭킹'); await page.waitForTimeout(2000); await shoot(page, `${device}-04-ranking`);
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='←'); if(b) b.click(); });
  await page.waitForTimeout(1200);

  await click(page, 'GAME START'); await page.waitForTimeout(1500); await shoot(page, `${device}-05-modeselect`);
  await click(page, '수학'); await page.waitForTimeout(2500);
  // 몇 조각 놓아 보드에 블록이 보이게
  await page.evaluate(async () => {
    const G = window.__chromafall;
    for (let i = 0; i < 10; i++) {
      if (G.get().currentBlocks.length) { for(let k=0;k<Math.floor(Math.random()*4);k++) G.get().moveBlock(Math.random()<0.5?'left':'right'); G.get().hardDrop(); }
      await new Promise((r) => setTimeout(r, 200));
    }
  });
  await page.waitForTimeout(1200);
  await shoot(page, `${device}-06-game-math`);

  // 설정
  await click(page, '⚙️'); await page.waitForTimeout(1500); await shoot(page, `${device}-07-settings`);
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='닫기'); if(b) b.click(); });
  await page.waitForTimeout(800);

  // 게임오버
  await page.evaluate(() => {
    const G = window.__chromafall; const c = ['red','blue','green','yellow'];
    G.set({ score: 24680, level: 4, maxCombo: 7, chainCount: 3,
      board: Array.from({length:16},(_,y)=>Array.from({length:8},(_,x)=>({id:`x${x}${y}`,color:c[(x+y)%4],x,y,specialType:'normal'}))),
      currentBlocks: [], currentBlock: null });
  });
  await page.waitForTimeout(3000);
  await shoot(page, `${device}-08-gameover`);

  console.log(`${device}: errors=${errors.length}${errors.length ? ' :: ' + errors.slice(0,3).join(' | ') : ''}`);
  await page.close();
}
await browser.close();
