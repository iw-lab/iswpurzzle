/** 모드 규칙 — 판의 모양(로켓 수·시간·하트·속도 곡선·목표)을 한곳에 둔다. 시뮬은 이 표만 읽는다. */
export type ModeId = 'time' | 'classic' | 'survival' | 'rule' | 'big' | 'daily' | 'relay';

export type Goal =
  | { kind: 'launch'; n: number }
  | { kind: 'mix'; n: number }
  | { kind: 'clean'; n: number };

export interface ModeRule {
  id: ModeId;
  tanks: number;
  /** 판 길이(ms). null = 시간 제한 없음(끝없는 우주) */
  durationMs: number | null;
  hearts: number | null;
  /** 숫자로만: 칸 높이·눈금·남은 양 표시를 감춘다(렌더만 바뀐다 — 규칙은 같다) */
  uniform: boolean;
  /** 칸이 위에서 바닥선까지 오는 시간(초) */
  fall(tMs: number, launches: number): number;
  /** «딱 1 만드는 칸»을 낼 확률 */
  pFit(tMs: number, launches: number): number;
  goal?: Goal;
  level?: number;
}

/** 60초 판 곡선(GDD §1-4): 워밍업 → 본편 → 스퍼트 → 카운트다운 */
const sixtyFall = (t: number) => (t < 15_000 ? 4 : t < 45_000 ? 3 : 2.2);
const sixtyFit = (t: number) => (t < 15_000 ? 0.6 : t < 45_000 ? 0.45 : 0.4);

export const LEVELS = 40;
export const PLANETS = ['달', '화성', '목성', '토성', '천왕성', '해왕성', '사탕 별', '정글 별'] as const;

export function levelGoal(level: number): Goal {
  // 목표 수는 봇 탐침(/tmp/classic-probe → GDD §1-4 표)으로 맞췄다: 85% 봇은 끝 단계도 대부분 깨고,
  //   60% 봇은 앞 행성 4곳을 무난히 넘는다. 늦은 단계의 어려움은 목표 수보다 «떨어지는 속도»가 만든다.
  const stage = level % 5;
  if (stage === 2) return { kind: 'mix', n: 2 + Math.floor(level / 10) };
  if (stage === 4) return { kind: 'clean', n: 3 + Math.floor(level / 10) };
  return { kind: 'launch', n: 4 + Math.floor(level / 6) };
}

export function goalText(g: Goal): string {
  if (g.kind === 'launch') return `로켓 ${g.n}대 발사`;
  if (g.kind === 'mix') return `섞어 채우기 ${g.n}번 (표기 2가지 이상으로 발사)`;
  return `넘치지 않고 ${g.n}대 연속 발사`;
}

export function makeMode(id: ModeId, level = 0): ModeRule {
  switch (id) {
    case 'time':
    case 'daily':
    case 'relay':
      return { id, tanks: 5, durationMs: 60_000, hearts: null, uniform: false, fall: sixtyFall, pFit: sixtyFit };
    case 'rule':
      // 숫자로만은 읽고 계산해야 해서 판을 90초로 늘리고 속도를 한 단계 낮춘다
      return {
        id, tanks: 5, durationMs: 90_000, hearts: null, uniform: true,
        fall: (t) => (t < 20_000 ? 4.6 : t < 70_000 ? 3.6 : 2.8), pFit: (t) => (t < 20_000 ? 0.6 : 0.45),
      };
    case 'big':
      return {
        id, tanks: 8, durationMs: 120_000, hearts: null, uniform: false,
        fall: (t) => (t < 20_000 ? 4 : t < 90_000 ? 3 : 2.4), pFit: (t) => (t < 20_000 ? 0.55 : 0.4),
      };
    case 'survival':
      return {
        id, tanks: 5, durationMs: null, hearts: 3, uniform: false,
        fall: (_t, n) => Math.max(1.2, 3.5 * Math.pow(0.97, n)),
        pFit: (_t, n) => Math.max(0.3, 0.55 - n * 0.005),
      };
    case 'classic': {
      const L = Math.max(0, Math.min(LEVELS - 1, level));
      return {
        id, tanks: 5, durationMs: 60_000, hearts: null, uniform: false, level: L, goal: levelGoal(L),
        fall: () => Math.max(2.2, 4.2 - 0.05 * L), pFit: () => Math.max(0.35, 0.6 - 0.006 * L),
      };
    }
  }
}
