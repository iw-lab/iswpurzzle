/**
 * 난이도 곡선 — 리마스터 재설계(계획서 §2.2).
 *
 * 원칙: 레벨 = 속도축, 색상 = 복잡도축, 조각 크기 = 조작축.
 * 세 축을 분리하고, **두 축이 같은 레벨에서 동시에 오르지 않도록** 배치한다.
 * 봇 시뮬(scripts/simulate-difficulty.mjs)에서 축이 겹칠 때마다 생존율이
 * 급락하는 것이 확인됐다 — 그래서 전환점을 아래처럼 어긋나게 뒀다:
 *
 *   L3  조각 2      L5  색 5
 *   L10 조각 3      L12 가비지 시작    L14 색 6
 *   L18 조각 4      L20 색 7
 *
 * 레벨업 기준은 "점수"가 아니라 "누적 클리어 블록 수"다 — 연쇄 점수 인플레와 절연.
 */
import type { BlockColor } from "../types";

/** 레벨 L → L+1 에 필요한 누적 클리어 블록 수. */
export function getBlocksForLevel(level: number): number {
  return 28 + 9 * level;
}

/** 누적 클리어 블록 수 → 도달 레벨. */
export function getLevelForClearedBlocks(totalCleared: number): number {
  let level = 1;
  let needed = getBlocksForLevel(level);
  while (totalCleared >= needed && level < MAX_LEVEL) {
    totalCleared -= needed;
    level++;
    needed = getBlocksForLevel(level);
  }
  return level;
}

export const MAX_LEVEL = 30;

/** 낙하 속도(ms). 200ms는 다중블록 조작이 불가능해 350ms를 하한으로 둔다. */
export function getDropSpeed(level: number): number {
  return Math.max(350, 1000 - (level - 1) * 35);
}

/** 젠 모드는 속도 상한을 고정해 "편안함"을 보장한다. */
export function getZenDropSpeed(): number {
  return 600;
}

/**
 * 레벨별 색상 수. 4매칭 규칙에서 색이 많아질수록 융합 빈도가 급락하므로 7색이 상한.
 * 초반 4색은 신규 유저가 첫 판에서 융합을 반드시 경험하게 하는 장치다.
 */
const COLOR_POOL: BlockColor[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "cyan",
  "pink",
];

export function getColorCountForLevel(level: number): number {
  if (level >= 20) return 7;
  if (level >= 14) return 6;
  if (level >= 5) return 5;
  return 4;
}

export function getColorsForLevel(level: number): BlockColor[] {
  return COLOR_POOL.slice(0, getColorCountForLevel(level));
}

/** 동시 낙하 블록 수. 4를 넘으면 8칸 보드에서 조작 재미가 스트레스로 바뀐다. */
export function getFallingBlockCount(level: number): number {
  if (level >= 18) return 4;
  if (level >= 10) return 3;
  if (level >= 3) return 2;
  return 1;
}

export const GARBAGE_START_LEVEL = 12;

/** 가비지 줄 투입 간격(초). */
export function getGarbageInterval(level: number): number {
  return Math.max(25, 45 - (level - GARBAGE_START_LEVEL) * 1.2);
}

/** 한 번에 투입되는 가비지 줄 수. */
export function getGarbageRows(level: number): number {
  return Math.min(2, 1 + Math.floor((level - GARBAGE_START_LEVEL) / 10));
}
