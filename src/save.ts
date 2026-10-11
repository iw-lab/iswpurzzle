/**
 * 저장 — 기기 안(localStorage)에만. 키는 «게임ID:용도», {version, data} 래퍼 + 마이그레이션 체인.
 * 이름·학년반 같은 개인정보는 애초에 받지 않는다. 학년 단계는 «문제 난이도 고르기»일 뿐 저장값은 4·5·6 숫자 하나.
 */
import type { Grade, Notation } from './core/values.ts';

const KEY = 'ttak1:save';
const VERSION = 1;

export interface SaveData {
  grade: Grade;
  sound: boolean;
  /** 발사 임무에서 깬 마지막 단계(-1 = 아직 없음) */
  cleared: number;
  best: Record<string, number>;
  /** 오늘의 발사 */
  daily: { last: string; streak: number; best: number };
  /** 표기별 누적 넘침(내 약점 카드) */
  weak: Record<Notation, number>;
  totalLaunches: number;
  played: number;
  hintSeen: boolean;
  relayBest: number;
}

const fresh = (): SaveData => ({
  grade: 5, sound: true, cleared: -1, best: {}, daily: { last: '', streak: 0, best: 0 },
  weak: { frac: 0, dec: 0, pct: 0 }, totalLaunches: 0, played: 0, hintSeen: false, relayBest: 0,
});

/** 버전 n → n+1 변환들. 지금은 1판뿐이라 비어 있다 — 바꿀 때 여기에 한 칸씩 붙인다 */
const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    let { version, data } = JSON.parse(raw) as { version: number; data: Record<string, unknown> };
    while (version < VERSION && MIGRATIONS[version]) data = MIGRATIONS[version++](data);
    return { ...fresh(), ...(data as Partial<SaveData>) };
  } catch {
    return fresh();
  }
}

export function writeSave(d: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, data: d }));
  } catch {
    /* 사생활 보호 모드 등 — 저장 없이도 게임은 돈다 */
  }
}

export function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}
