import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 667 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

// 사운드/설정 초기화 + 튜토리얼 스킵
await page.evaluate(() => {
  const k='chromafall-user-storage';
  const s=JSON.parse(localStorage.getItem(k)||'{"state":{},"version":0}');
  s.state.settings = {...(s.state.settings||{}), hasSeenTutorial:true, soundEnabled:false, musicEnabled:false, mathColorHint:true};
  localStorage.setItem(k, JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

// 게임 화면 진입 (수학 모드)
await page.evaluate(() => {
  document.querySelectorAll('button').forEach(b=>{ if(b.innerText.includes('GAME START')) b.click(); });
});
await page.waitForTimeout(900);
await page.evaluate(() => {
  document.querySelectorAll('button').forEach(b=>{ if(b.innerText.includes('수학')) b.click(); });
});
await page.waitForTimeout(1800);

// 보기 좋은 보드 구성 — 동치 표기가 한눈에 들어오도록
await page.evaluate(() => {
  const API = window.__chromafall;
  const COLS=8, ROWS=16;
  const b = Array.from({length:ROWS},()=>Array(COLS).fill(null));
  const set=(x,y,label,key,color)=>{ b[y][x]={id:`t${x}-${y}`,color,x,y,specialType:'normal',label,matchKey:key}; };
  // 동치 표기가 한눈에 들어오도록 보드를 넉넉히 채운다.
  const P = [
    ['half','red',['1/2','2/4','0.5','50%','5/10']],
    ['quarter','blue',['1/4','2/8','0.25','25%']],
    ['three_quarters','green',['3/4','6/8','0.75','75%']],
    ['one_fifth','yellow',['1/5','2/10','0.2','20%']],
    ['three_fifths','purple',['3/5','6/10','0.6','60%']],
    ['one_tenth','cyan',['1/10','0.1','10%']],
  ];
  // 4개가 붙어 바로 터지지 않도록 섞는다(정지 화면이라 실제로 터지진 않지만 구성상 자연스럽게)
  let n = 0;
  const rows = [];
  for (let r = 0; r < 13; r++) {
    const row = [];
    for (let x = 0; x < 8; x++) {
      const cls = P[(x * 3 + r * 2 + Math.floor(n / 5)) % P.length];
      const forms = cls[2];
      row.push([forms[(x + r) % forms.length], cls[0], cls[1]]);
      n++;
    }
    rows.push(row);
  }
  rows.forEach((row,i)=> row.forEach((c,x)=> set(x, ROWS-1-i, c[0], c[1], c[2])));
  API.set({ board:b, currentBlocks:[], currentBlock:null, score: 48250, level: 6,
            combo: 4, chainCount: 3, gameStatus:'ready' });
});
await page.waitForTimeout(1200);

await page.screenshot({ path: 'dist-kingsmath/thumb-raw.png' });
console.log('viewport 1000x667 @2x');
await browser.close();
console.log('captured');
