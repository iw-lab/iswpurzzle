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
  if (level >= 20) return 6;
  if (level >= 14) return 5;
  if (level >= 5) return 5;
  return 4;
}

export function getColorsForLevel(level: number): BlockColor[] {
  return COLOR_POOL.slice(0, getColorCountForLevel(level));
}

/**
 * 동시 낙하 블록 수.
 * 상한이 3인 이유(2026-08-20 봇 시뮬 실측): 8칸 보드 + 4매치 규칙에서
 * 조각이 4칸이 되면 한 번에 놓이는 블록이 많아 보드가 융합보다 빨리 찬다.
 * 조각 4 구간(L18+)의 평균 보드 채움이 45%→66%로 치솟고 봇 평균 도달 레벨이
 * 18.8에서 멈췄다. 3으로 묶으면 전 레벨 채움이 9%대로 평탄해진다.
 */
export function getFallingBlockCount(level: number): number {
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


/**
 * 한 조각이 가질 수 있는 서로 다른 색의 최대 수.
 *
 * ⚠️ 이 게임의 "블록이 안 터진다"의 근본 원인이 여기였다(2026-08-20 실측).
 * 예전에는 조각의 각 칸에 독립 난수 색을 넣었다("같은 색이면 바로 터져서
 * 너무 쉬움"이라는 주석과 함께). 그런데 융합 조건은 **동색 4개 인접**이다.
 * 조각마다 색이 흩어지면 플레이어는 동색 덩어리를 만들 수단 자체를 잃는다 —
 * 색 수가 늘고 조각이 커지는 후반일수록 심해져서, 보드는 차는데 아무것도
 * 터지지 않는 상태로 수렴한다.
 *
 * 봇 시뮬(30판×레벨별) 결과:
 *   현행(색 무제한): L18 보드채움 45% → L20 66%, 평균 도달 레벨 18.8
 *   조각 내 2색 상한 + 색6 + 조각3: 전 레벨 채움 9% 평탄, 융합률 59% 안정
 *
 * 2인 이유: 1이면 조각이 통째로 한 색이라 4칸 조각이 즉시 자가 매칭되고
 * (시뮬에서 L18+ 융합률 100%로 붕괴), 3 이상이면 다시 흩어진다.
 */
export const PIECE_COLOR_LIMIT = 2;

/**
 * 한 조각에 들어갈 색 배열을 만든다. 서로 다른 색은 최대 PIECE_COLOR_LIMIT 종.
 * rand는 0~1 난수 — 데일리 시드 모드에서도 재현되도록 주입받는다.
 */
export function buildPieceColors(
  level: number,
  count: number,
  rand: () => number,
): BlockColor[] {
  const palette = getColorsForLevel(level);
  const bagSize = Math.min(PIECE_COLOR_LIMIT, palette.length, Math.max(1, count));

  const bag: BlockColor[] = [];
  let guard = 0;
  while (bag.length < bagSize && guard++ < 50) {
    const c = palette[Math.floor(rand() * palette.length)];
    if (!bag.includes(c)) bag.push(c);
  }
  if (bag.length === 0) bag.push(palette[0]);

  return Array.from({ length: count }, () => bag[Math.floor(rand() * bag.length)]);
}
