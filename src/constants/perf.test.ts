// 폰 가벼운 모드 게이트 — 2026-10-08 «모바일에서 왜 깜빡거리지?»
// 실측: 홈 3초에 DOM 스타일 변경 2,891 → 0 · 게임 1,101 → 3 (412px·CPU 4배 감속). 이 배선이 풀리면 다시 깜빡인다.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const src = walk('src').filter((f) => /\.(tsx?|css)$/.test(f) && !f.endsWith('.test.ts'));

describe('폰 가벼운 모드', () => {
  it('장식 반복은 LOOP 를 쓴다 — repeat: Infinity 가 새로 생기면 폰에서 영원히 돈다', () => {
    const bad = src.filter((f) => /repeat:\s*Infinity/.test(readFileSync(f, 'utf8')));
    expect(bad).toEqual([]);
  });
  it('앱 시작 때 perf 를 불러 <html class="lite"> 를 켠다', () => {
    expect(readFileSync('src/main.tsx', 'utf8')).toMatch(/import ['"]\.\/constants\/perf['"]/);
  });
  it('lite 에선 무한 CSS 애니메이션 1회 · 뒤 흐림 끔(스피너 제외)', () => {
    const css = readFileSync('src/index.css', 'utf8');
    expect(css).toMatch(/html\.lite \*:not\(\[class\*="spin"\]\)[\s\S]*?animation-iteration-count:\s*1 !important/);
    expect(css).toMatch(/html\.lite \*\s*\{[\s\S]*?backdrop-filter:\s*none !important/);
  });
  it('홈 배경 블롭(움직이는 장식)이 돌아오지 않는다', () => {
    expect(readFileSync('src/components/Menu/MainMenu.tsx', 'utf8')).not.toMatch(/backgroundBlobs|blobs\.map/);
  });
});
