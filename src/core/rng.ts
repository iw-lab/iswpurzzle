/** 결정론 난수(mulberry32). 같은 시드 → 같은 판. 브라우저·봇·시험이 같은 함수를 쓴다. */
export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pickInt = (r: Rng, n: number): number => Math.floor(r() * n);

/** 문자열 → 32비트 시드(오늘의 발사: 날짜 문자열) */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * 정답 위치 덱 — 위치 0..k-1을 2장씩 넣고 섞어 하나씩 뽑는다.
 * 균등이 «확률»이 아니라 «구조»로 보장된다(셔플만 고쳐서는 쏠림이 재발했다 — game-builder L-109).
 */
export class PositionDeck {
  private deck: number[] = [];
  private k: number;
  private r: Rng;
  constructor(k: number, r: Rng) {
    this.k = k;
    this.r = r;
  }
  draw(): number {
    if (!this.deck.length) {
      for (let c = 0; c < 2; c++) for (let i = 0; i < this.k; i++) this.deck.push(i);
      for (let i = this.deck.length - 1; i > 0; i--) {
        const j = pickInt(this.r, i + 1);
        [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
      }
    }
    return this.deck.pop()!;
  }
}
