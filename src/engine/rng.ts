/**
 * 순수 난수 엔진 — React 의존 0.
 * 데일리 챌린지(시드 고정)·리플레이·테스트 재현성의 기반.
 */

export type RandomFn = () => number;

/** LCG 기반 시드 난수. 같은 시드 = 같은 수열. */
export function seededRandom(seed: number): RandomFn {
  let s = seed >>> 0;
  if (s === 0) s = 0x9e3779b9; // seed 0이면 고정점에 갇히므로 회피
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** 날짜(로컬) 기반 시드 — 같은 날 = 같은 판. */
export function getDailySeed(date: Date = new Date()): number {
  const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) || 1;
}

/**
 * 전역 난수 소스. 데일리 모드에서는 시드 RNG로 교체되고,
 * 그 외 모드에서는 Math.random을 그대로 사용한다.
 */
let activeRandom: RandomFn = Math.random;

export function setRandomSource(fn: RandomFn | null): void {
  activeRandom = fn ?? Math.random;
}

export function random(): number {
  return activeRandom();
}

export function randomInt(maxExclusive: number): number {
  return Math.floor(activeRandom() * maxExclusive);
}

export function pick<T>(items: readonly T[]): T {
  return items[randomInt(items.length)];
}
