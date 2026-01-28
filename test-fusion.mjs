import { chromium } from 'playwright';

async function testBlockFusion() {
  console.log('=== 블록 융합 테스트 시작 ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 로컬 스토리지 초기화를 위해 먼저 페이지 로드
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  console.log('스토리지 초기화 완료');

  const logs = [];

  // 모든 콘솔 메시지 캡처
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('[BROWSER]', text);
  });

  // 에러도 캡처
  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.message);
  });

  try {
    console.log('페이지 새로고침...');
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    console.log('페이지 로드 완료');

    await page.screenshot({ path: 'test-1-initial.png' });
    await page.waitForTimeout(1000);

    // 게임 상태 확인
    const gameStatus = await page.evaluate(() => {
      try {
        const stored = localStorage.getItem('chromafall-game-storage');
        return stored ? JSON.parse(stored) : null;
      } catch { return null; }
    });
    console.log('저장된 게임 상태:', gameStatus?.state?.gameStatus || 'none');

    // 시작 버튼 클릭
    console.log('시작 버튼 찾는 중...');
    const startBtn = page.locator('button:has-text("게임 시작"), button:has-text("시작")').first();
    const startVisible = await startBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (startVisible) {
      console.log('시작 버튼 클릭');
      await startBtn.click();
      await page.waitForTimeout(500);
    } else {
      console.log('시작 버튼 없음');
    }

    await page.screenshot({ path: 'test-2-after-start.png' });

    // 클래식 모드 버튼 클릭
    console.log('클래식 모드 버튼 찾는 중...');
    const classicBtn = page.locator('button:has-text("클래식")').first();
    const classicVisible = await classicBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (classicVisible) {
      console.log('클래식 모드 버튼 클릭');
      await classicBtn.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('클래식 버튼 없음');
    }

    await page.screenshot({ path: 'test-3-after-classic.png' });

    // 게임이 playing 상태인지 확인
    const playingState = await page.evaluate(() => {
      // @ts-ignore
      const store = window.__ZUSTAND_STORE__;
      if (store) {
        return store.getState().gameStatus;
      }
      return 'unknown';
    });
    console.log('현재 게임 상태:', playingState);

    // 게임이 시작되었는지 확인 - 게임 보드 찾기
    console.log('\n=== 게임 플레이 시작 ===\n');

    // 게임 보드 영역에 포커스
    await page.click('body');
    await page.waitForTimeout(200);

    // 블록 드롭 테스트 - 같은 열에 집중시켜 융합 확률 높이기
    const columns = [0, 1, 2, 3, 4, 5, 6, 7]; // 8열
    const targetColumn = 3; // 중앙 근처에 집중

    for (let i = 0; i < 40; i++) {
      // 현재 블록을 특정 열로 이동
      // 블록은 중앙(4열 근처)에서 시작하므로 목표 열로 이동
      const targetCol = i % 8; // 0~7열 순환
      const startCol = 4; // 시작 위치 (중앙)
      const movesToTarget = targetCol - startCol;

      if (movesToTarget < 0) {
        // 왼쪽으로 이동
        for (let m = 0; m < Math.abs(movesToTarget); m++) {
          await page.keyboard.press('ArrowLeft');
          await page.waitForTimeout(30);
        }
      } else if (movesToTarget > 0) {
        // 오른쪽으로 이동
        for (let m = 0; m < movesToTarget; m++) {
          await page.keyboard.press('ArrowRight');
          await page.waitForTimeout(30);
        }
      }

      // 하드 드롭
      await page.keyboard.press('Space');
      console.log(`[${i + 1}/40] 블록 드롭 -> 열 ${targetCol}`);
      await page.waitForTimeout(300);

      // 5번마다 스크린샷
      if ((i + 1) % 10 === 0) {
        await page.screenshot({ path: `test-drop-${i + 1}.png` });
      }
    }

    await page.screenshot({ path: 'test-4-after-drops.png' });

    // 추가 시간 대기 (연쇄 반응 처리)
    console.log('\n연쇄 반응 대기 중...');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-5-final.png' });

    // 결과 분석
    console.log('\n=== 로그 분석 ===');

    const fusionLogs = logs.filter(l =>
      l.includes('FindFusion') ||
      l.includes('MATCH') ||
      l.includes('ChainReaction') ||
      l.includes('BlockPlaced') ||
      l.includes('ProcessFusion')
    );

    console.log(`관련 로그 수: ${fusionLogs.length}`);
    fusionLogs.forEach(l => console.log('  >', l));

    const matchLogs = logs.filter(l => l.includes('MATCH'));

    console.log('\n=== 결과 ===');
    console.log(`전체 로그 수: ${logs.length}`);
    console.log(`매칭 성공 횟수: ${matchLogs.length}`);

    if (matchLogs.length > 0) {
      console.log('✅ 블록 융합 정상 작동!');
    } else {
      console.log('❌ 블록 융합 미발생');

      // 디버깅: 전체 로그 출력
      console.log('\n=== 전체 로그 ===');
      logs.slice(-50).forEach(l => console.log('  ', l));
    }

    // 브라우저 닫기 전 대기
    await page.waitForTimeout(3000);

  } catch (err) {
    console.error('테스트 오류:', err);
    await page.screenshot({ path: 'test-error.png' });
  } finally {
    await browser.close();
  }
}

testBlockFusion();
