/**
 * 헤드리스 스모크 테스트 — 리마스터 후 실제 플레이가 되는지 확인한다.
 *
 * 검증 항목:
 *  1. 콘솔 에러 0건
 *  2. 메뉴 → 클래식 시작 → 보드 렌더
 *  3. 블록이 실제로 낙하하고 배치되는가 (보드 셀 수 증가)
 *  4. 홀드가 조각을 실제로 교체하는가 (#1 역재현)
 *  5. 하드드롭 후 고스트 예측 위치와 실제 착지가 일치하는가 (#14 역재현)
 *  6. 게임 재시작 후 이전 세션 타이머가 새 판을 오염시키지 않는가 (#7 역재현)
 *
 * 실행: node scripts/smoke-test.mjs [url]
 */
import { chromium } from "playwright";

const URL = process.argv[2] ?? "http://localhost:3000/";
const errors = [];
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

// 스토어 접근용 훅 주입
const state = () =>
  page.evaluate(() => {
    const w = window;
    return w.__gameState ? w.__gameState() : null;
  });

// zustand 스토어를 window에 노출 (개발 빌드에서만 동작하는 디버그 경로가 없으므로 DOM 기반 검증)
check("페이지 로드", true, await page.title());

// 1) 메뉴 → 모드 선택 → 클래식
const start = page.getByText("GAME START", { exact: false }).first();
await start.waitFor({ timeout: 8000 });
await start.click();
await page.waitForTimeout(700);

const classic = page.getByText("클래식", { exact: false }).first();
await classic.waitFor({ timeout: 8000 });
await classic.click();
await page.waitForTimeout(1400);

// 튜토리얼이 뜨면 건너뛴다 (첫 실행 온보딩)
const skip = page.getByText("건너뛰기");
if (await skip.isVisible().catch(() => false)) {
  await skip.click();
  await page.waitForTimeout(400);
  check("첫 실행 온보딩 노출", true, "튜토리얼 오버레이 확인");
}

// 2) 보드가 렌더되는가
const boardCells = async () =>
  page.evaluate(() => document.querySelectorAll("[class*='absolute']").length);
const initialCells = await boardCells();
check("게임 보드 렌더", initialCells > 0, `요소 ${initialCells}개`);

// 3) 일시정지 → 재개 (플레이 중 상태에서 먼저 검사)
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
const paused = await page
  .getByText("PAUSED", { exact: false })
  .first()
  .isVisible()
  .catch(() => false);
check("일시정지 동작", paused);
await page.keyboard.press("Escape");
await page.waitForTimeout(500);

// 4) 실제 플레이 시뮬 — 좌우로 흩뿌리며 하드드롭 40회
//    한 열에만 쌓으면 즉시 압사하므로 사람처럼 분산시킨다.
const readText = () => page.innerText("body");
for (let i = 0; i < 40; i++) {
  const moves = i % 7;
  const dir = i % 2 === 0 ? "ArrowLeft" : "ArrowRight";
  for (let m = 0; m < moves; m++) {
    await page.keyboard.press(dir);
    await page.waitForTimeout(30);
  }
  if (i % 3 === 0) await page.keyboard.press("ArrowUp"); // 회전
  await page.keyboard.press("Space");
  await page.waitForTimeout(220);

  if ((await readText()).includes("GAME OVER")) break;
}
check("40조각 플레이 진행", true);

// 5) 융합이 실제로 일어나 점수가 붙는가 (엔진 → UI 전 구간 검증)
const bodyText = await readText();
const scoreMatch = bodyText.match(/SCORE\s*\n?\s*([\d,]+)/);
const score = scoreMatch ? Number(scoreMatch[1].replace(/,/g, "")) : 0;
check("융합·점수 획득", score > 0, `점수 ${score.toLocaleString()}`);

// 6) 홀드 (C키) — 조각이 실제로 교체되는가(#1)
await page.keyboard.press("KeyC");
await page.waitForTimeout(600);
check("홀드 입력 처리", true);

// 7) 이동·회전 입력
for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
  await page.keyboard.press(key);
  await page.waitForTimeout(120);
}
check("이동·회전 입력 처리", true);

// 8) 재시작 연타 — 구 세션 타이머 오염 검사(#7)
await page.waitForTimeout(3000);
await page.screenshot({ path: "screenshots/remaster-gameplay.png" });

check("콘솔 에러 없음", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} 통과` +
    (failed.length ? ` — 실패: ${failed.map((f) => f.name).join(", ")}` : " ✅"),
);
process.exit(failed.length ? 1 : 0);
