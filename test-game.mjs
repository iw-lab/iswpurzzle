import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testGame() {
  console.log('🎮 게임 테스트 시작...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // 동작을 천천히 보기 위해
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // 콘솔 로그 캡처
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);

    // 중요한 로그만 출력
    if (text.includes('[FindFusion]') ||
        text.includes('[ChainReaction]') ||
        text.includes('[BlockPlaced]') ||
        text.includes('블록 융합') ||
        text.includes('연쇄')) {
      console.log('📋 ' + text);
    }
  });

  // 에러 캡처
  page.on('pageerror', error => {
    console.error('❌ 페이지 에러:', error.message);
  });

  try {
    console.log('🌐 http://localhost:3001 접속 중...\n');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

    // 초기 스크린샷
    await page.screenshot({ path: join(__dirname, 'screenshots', '01-initial.png'), fullPage: true });
    console.log('📸 스크린샷 저장: 01-initial.png\n');

    // 게임 시작 버튼 찾기
    console.log('🎯 게임 시작 버튼 찾는 중...\n');

    // "GAME START" 버튼 클릭 (화면 중앙)
    await page.mouse.click(640, 520);
    console.log('✅ GAME START 버튼 클릭 완료!\n');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: join(__dirname, 'screenshots', '02-mode-select.png'), fullPage: true });
    console.log('📸 스크린샷 저장: 02-mode-select.png\n');

    // "클래식" 모드 선택
    console.log('🎯 클래식 모드 선택 중...\n');
    await page.mouse.click(640, 215);
    await page.waitForTimeout(2000);

    await page.screenshot({ path: join(__dirname, 'screenshots', '03-game-started.png'), fullPage: true });
    console.log('📸 스크린샷 저장: 03-game-started.png\n');

    console.log('🎮 게임 플레이 시작 (7레벨까지)...\n');

    // 게임 플레이 - 블록 배치
    for (let i = 0; i < 40; i++) {
      // 랜덤 위치로 블록 이동 (왼쪽, 왼쪽, 중앙, 오른쪽 패턴)
      const movePatterns = [
        { left: 0, right: 0 },    // 중앙
        { left: 2, right: 0 },    // 왼쪽
        { left: 0, right: 0 },    // 중앙
        { left: 0, right: 2 },    // 오른쪽
        { left: 1, right: 0 },    // 약간 왼쪽
        { left: 0, right: 1 },    // 약간 오른쪽
      ];

      const pattern = movePatterns[i % movePatterns.length];

      console.log(`🎯 블록 ${i + 1} 배치 시도...`);

      // 왼쪽 화살표 클릭
      for (let j = 0; j < pattern.left; j++) {
        await page.mouse.click(444, 659);
        await page.waitForTimeout(100);
      }

      // 오른쪽 화살표 클릭
      for (let j = 0; j < pattern.right; j++) {
        await page.mouse.click(571, 659);
        await page.waitForTimeout(100);
      }

      // DROP 버튼 클릭
      await page.mouse.click(825, 659);

      // 블록이 쌓일 시간 대기
      await page.waitForTimeout(2000);

      // 매 5번째마다 스크린샷
      if ((i + 1) % 5 === 0) {
        const screenshotNum = String(i + 1).padStart(2, '0');
        await page.screenshot({
          path: join(__dirname, 'screenshots', `04-block-${screenshotNum}.png`),
          fullPage: true
        });
        console.log(`📸 스크린샷 저장: 04-block-${screenshotNum}.png\n`);
      }

      // 콘솔에서 융합 관련 로그 확인
      const recentLogs = logs.slice(-10);
      const fusionLogs = recentLogs.filter(log =>
        log.includes('융합') || log.includes('[FindFusion]')
      );

      if (fusionLogs.length > 0) {
        console.log('🔍 융합 로그 발견:');
        fusionLogs.forEach(log => console.log('  - ' + log));
        console.log('');
      }
    }

    console.log('\n📊 최종 상태 확인 중...\n');

    // 최종 스크린샷
    await page.screenshot({
      path: join(__dirname, 'screenshots', '05-final.png'),
      fullPage: true
    });
    console.log('📸 최종 스크린샷 저장: 05-final.png\n');

    // 게임 상태 분석
    const gameState = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return {
        canvasExists: !!canvas,
        canvasWidth: canvas?.width,
        canvasHeight: canvas?.height,
      };
    });

    console.log('🎮 게임 상태:');
    console.log('  - 캔버스 존재:', gameState.canvasExists);
    console.log('  - 캔버스 크기:', `${gameState.canvasWidth}x${gameState.canvasHeight}`);
    console.log('');

    // 융합 관련 로그 분석
    const fusionLogs = logs.filter(log =>
      log.includes('[FindFusion]') ||
      log.includes('[ChainReaction]') ||
      log.includes('블록 융합')
    );

    const placementLogs = logs.filter(log => log.includes('[BlockPlaced]'));

    console.log('📋 로그 분석:');
    console.log(`  - 전체 로그: ${logs.length}개`);
    console.log(`  - 블록 배치: ${placementLogs.length}개`);
    console.log(`  - 융합 관련: ${fusionLogs.length}개`);
    console.log('');

    if (fusionLogs.length === 0) {
      console.log('⚠️  경고: 융합 로그가 전혀 없습니다!');
      console.log('   4개 이상 블록이 연결되었는데도 터지지 않는 문제일 수 있습니다.\n');
    } else {
      console.log('✅ 융합 로그 발견 (최근 5개):');
      fusionLogs.slice(-5).forEach(log => console.log('  - ' + log));
      console.log('');
    }

    // 에러 로그 확인
    const errorLogs = logs.filter(log =>
      log.toLowerCase().includes('error') ||
      log.toLowerCase().includes('undefined') ||
      log.toLowerCase().includes('null')
    );

    if (errorLogs.length > 0) {
      console.log('❌ 에러 로그 발견:');
      errorLogs.forEach(log => console.log('  - ' + log));
      console.log('');
    }

    console.log('\n⏸️  브라우저를 10초간 열어둡니다. 직접 확인하세요...\n');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ 테스트 중 에러 발생:', error);
    await page.screenshot({
      path: join(__dirname, 'screenshots', 'error.png'),
      fullPage: true
    });
  } finally {
    await browser.close();
    console.log('\n✅ 테스트 완료!\n');

    // 전체 로그를 파일로 저장
    const fs = await import('fs');
    const logPath = join(__dirname, 'screenshots', 'console-logs.txt');
    fs.writeFileSync(logPath, logs.join('\n'), 'utf-8');
    console.log('📄 전체 콘솔 로그 저장: console-logs.txt\n');
  }
}

// screenshots 폴더 생성
import fs from 'fs';
const screenshotsDir = join(dirname(fileURLToPath(import.meta.url)), 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

testGame().catch(console.error);
