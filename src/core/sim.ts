/**
 * 딱1 로켓 시뮬레이션 코어 — DOM·캔버스를 import 하지 않는다.
 * 브라우저 게임·봇 게이트·시험이 «같은 파일»을 돌린다(봇이 계산한 게임 == 실제 게임).
 *
 * 규칙 한 줄: 떨어지는 칸을 로켓 통에 붓는다. 통의 합이 정확히 1(=100)이면 발사, 넘으면 그 칸만 깨진다.
 */
import { ONE, RANDOM_VALUES, NOTATION_WEIGHT, availableNotations, labelFor, sumLabel, type Cell, type Grade, type Notation } from './values.ts';
import { makeRng, pickInt, PositionDeck, type Rng } from './rng.ts';
import type { ModeRule } from './modes.ts';

export interface Tank {
  fill: number;
  parts: Cell[];
}

export type SimEvent =
  | { type: 'spawn'; cell: Cell; col: number }
  | { type: 'pour'; cell: Cell; col: number; fill: number; auto: boolean }
  | { type: 'launch'; col: number; parts: Cell[]; points: number; kinds: number; combo: number; multi: number; equation: string }
  | { type: 'overflow'; col: number; cell: Cell; total: number; equation: string; heartsLeft: number | null }
  | { type: 'hold'; cell: Cell; out: Cell | null }
  | { type: 'move'; col: number }
  | { type: 'heart'; hearts: number }
  | { type: 'goal'; done: number; need: number }
  | { type: 'end'; reason: 'time' | 'hearts' | 'goal' };

export interface FitLog {
  /** «딱 1 칸»의 대상 통 위치(정답 위치 게이트) */
  answer: number;
  tanks: number;
}

export interface SimOptions {
  grade: Grade;
  seed: number;
}

/** 논리상 칸은 탭 즉시 부어진다(날아가는 모습은 렌더만) · 칸 사이 최소 간격 · 동시 발사 창(ms) */
export const FLY_MS = 0;
export const MIN_GAP_MS = 500;
export const MULTI_MS = 2000;
/** 4학년(0.1 단위)은 남은 양 종류가 적어 아무 데나 눌러도 딱 맞는 일이 잦다 → 딱 1 칸을 조금 덜 낸다(봇 게이트 D-1) */
export const GRADE_FIT: Record<Grade, number> = { 4: 0.65, 5: 1, 6: 1 };
export const OVERFLOW_PAUSE_MS = 1000;
/** 60초 이론 상한(§1-4) — 넘는 점수는 화면·서버 모두 믿지 않는다 */
export const SCORE_CAP_PER_MIN = 50_000;

export class Sim {
  readonly mode: ModeRule;
  readonly grade: Grade;
  readonly seed: number;
  tanks: Tank[];
  /** 지금 떨어지는 칸 — null 이면 다음 칸을 기다리는 중 */
  cur: Cell | null = null;
  /** 떨어짐 진행 0(맨 위) → 1(바닥선) */
  curY = 0;
  /** 칸이 지금 위에 떠 있는 로켓(키보드 ←→ · 저절로 부어질 자리) */
  col = 0;
  queue: Cell[] = [];
  hold: Cell | null = null;
  holdLocked = false;

  t = 0;
  score = 0;
  launches = 0;
  overflows = 0;
  combo = 0;
  bestCombo = 0;
  mixLaunches = 0;
  cleanStreak = 0;
  bestClean = 0;
  hearts: number | null;
  over = false;
  endReason: 'time' | 'hearts' | 'goal' | null = null;
  cleared = false;
  cellsShown = 0;
  /** 미리 보여 준 칸이 막상 들어갈 데가 없어 새로 만든 횟수(무데드락 시험 — 0에 가까워야 한다) */
  regens = 0;
  /** 화면에 칸(문항)이 떠 있던 시간(ms) — 노출 게이트 D-3 */
  exposedMs = 0;
  overflowLog: string[] = [];
  fitLog: FitLog[] = [];
  /** 표기별 넘침 수 — 약점 표기를 더 자주(더 어렵게는 아니다) */
  weak: Record<Notation, number> = { frac: 0, dec: 0, pct: 0 };
  events: SimEvent[] = [];

  private r: Rng;
  private rCol: Rng;
  private deck: PositionDeck;
  private nextId = 1;
  private spawnAt = 0;
  private lastSpawn = -MIN_GAP_MS;
  private recentLaunch: number[] = [];

  constructor(mode: ModeRule, opt: SimOptions) {
    this.mode = mode;
    this.grade = opt.grade;
    this.seed = opt.seed;
    // 생성기 난수와 «처음 떠 있는 자리» 난수를 나눈다 — 한쪽을 바꿔도 다른 쪽 판이 안 흔들린다
    this.r = makeRng(opt.seed);
    this.rCol = makeRng(opt.seed ^ 0x9e3779b9);
    this.deck = new PositionDeck(mode.tanks, this.r);
    this.tanks = Array.from({ length: mode.tanks }, () => ({ fill: 0, parts: [] }));
    this.hearts = mode.hearts;
    for (let i = 0; i < 2; i++) this.queue.push(this.makeCell());
  }

  get durationMs(): number | null {
    return this.mode.durationMs;
  }

  get leftMs(): number | null {
    return this.mode.durationMs == null ? null : Math.max(0, this.mode.durationMs - this.t);
  }

  /** 지금 칸이 바닥선까지 오는 데 걸리는 전체 시간(초) */
  fallSeconds(): number {
    return this.mode.fall(this.t, this.launches);
  }

  step(dtMs: number): void {
    if (this.over) return;
    this.t += dtMs;
    if (this.cur) {
      this.exposedMs += dtMs;
      this.curY += dtMs / (this.fallSeconds() * 1000);
      if (this.curY >= 1) this.pour(this.col, true);
    } else if (this.t >= this.spawnAt) {
      this.spawn();
    }
    if (this.mode.durationMs != null && this.t >= this.mode.durationMs) this.finish('time');
  }

  /** 로켓을 탭했다 — 지금 칸을 그 통에 붓는다 */
  drop(col: number): boolean {
    if (this.over || !this.cur || col < 0 || col >= this.tanks.length) return false;
    this.col = col;
    this.pour(col, false);
    return true;
  }

  move(dir: -1 | 1): void {
    if (this.over || !this.cur) return;
    this.col = Math.max(0, Math.min(this.tanks.length - 1, this.col + dir));
    this.events.push({ type: 'move', col: this.col });
  }

  hardDrop(): void {
    if (this.cur) this.drop(this.col);
  }

  /** 보관함 — 지금 칸과 보관 칸을 바꾼다. 연속 두 번은 안 된다(무한 미루기 막기) */
  swapHold(): boolean {
    if (this.over || !this.cur || this.holdLocked) return false;
    const out = this.hold;
    // 보관했던 칸이 지금 판에 들어갈 데가 없으면 바꾸지 않는다(꺼내자마자 막히는 일 없게)
    if (out && !this.fitsSomewhere(out.v)) return false;
    this.hold = this.cur;
    this.holdLocked = true;
    this.events.push({ type: 'hold', cell: this.cur, out });
    if (out) {
      this.cur = out;
      this.curY = 0;
    } else {
      this.cur = null;
      this.spawnAt = this.t;
    }
    return true;
  }

  /** 넘치지 않고 들어갈 수 있는 통이 하나라도 있나(무데드락 시험이 매 칸 확인한다) */
  fitsSomewhere(v: number): boolean {
    return this.tanks.some((k) => k.fill + v <= ONE);
  }

  private spawn(): void {
    const cell = this.queue.shift()!;
    this.queue.push(this.makeCell());
    // 보관함에서 꺼낸 칸이 나중에 들어갈 데가 없어지는 일이 없게, 새로 나오는 칸도 지금 판에서 다시 확인한다
    if (this.fitsSomewhere(cell.v)) this.cur = cell;
    else {
      this.regens++;
      // 갈아 끼운 칸은 원래 칸의 표기를 이어받는다 — 화면에 보인 표기 순서가 흔들리지 않게(변화 게이트 V1)
      //   갈아 끼우기는 «화면 순서 밖»의 생성이라 연속 기록(lastKinds·lastValues)을 건드리지 않게 되돌린다
      const keepK = [...this.lastKinds], keepV = [...this.lastValues];
      const fresh = this.makeCell();
      this.lastKinds = keepK;
      this.lastValues = keepV;
      if (fresh.kind !== cell.kind && availableNotations(fresh.v, this.grade).includes(cell.kind)) {
        fresh.kind = cell.kind;
        fresh.label = labelFor(fresh.v, cell.kind, this.grade, (n) => pickInt(this.r, n));
      }
      this.cur = fresh;
    }
    this.curY = 0;
    this.col = pickInt(this.rCol, this.tanks.length);
    this.cellsShown++;
    this.lastSpawn = this.t;
    this.events.push({ type: 'spawn', cell: this.cur, col: this.col });
  }

  private pour(col: number, auto: boolean): void {
    const cell = this.cur!;
    this.cur = null;
    this.holdLocked = false;
    this.spawnAt = Math.max(this.t + FLY_MS, this.lastSpawn + MIN_GAP_MS);
    const tank = this.tanks[col];
    const total = tank.fill + cell.v;
    if (total > ONE) {
      this.overflows++;
      this.combo = 0;
      this.cleanStreak = 0;
      this.weak[cell.kind]++;
      const equation = `${[...tank.parts.map((p) => p.label), cell.label].join(' + ')} = ${sumLabel(total)}`;
      if (this.overflowLog.length < 12) this.overflowLog.push(equation);
      if (this.hearts != null) this.hearts--;
      // 넘치면 다음 칸이 잠깐 늦게 온다(푸슉 연출 시간) — 점수는 안 깎지만 «아무 데나 누르기»가 손해가 된다
      this.spawnAt = Math.max(this.spawnAt, this.t + OVERFLOW_PAUSE_MS);
      this.events.push({ type: 'overflow', col, cell, total, equation, heartsLeft: this.hearts });
      if (this.hearts != null && this.hearts <= 0) this.finish('hearts');
      return;
    }
    tank.fill = total;
    tank.parts.push(cell);
    this.events.push({ type: 'pour', cell, col, fill: total, auto });
    if (total === ONE) this.launch(col);
  }

  private launch(col: number): void {
    const tank = this.tanks[col];
    const parts = tank.parts;
    const kinds = new Set(parts.map((p) => p.kind)).size;
    this.launches++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.cleanStreak++;
    this.bestClean = Math.max(this.bestClean, this.cleanStreak);
    if (kinds >= 2) this.mixLaunches++;
    this.recentLaunch = this.recentLaunch.filter((x) => this.t - x <= MULTI_MS);
    this.recentLaunch.push(this.t);
    const multi = this.recentLaunch.length;
    const pts = launchPoints(parts.length, kinds, this.combo, multi);
    this.score += pts;
    const cap = Math.round(((this.mode.durationMs ?? 600_000) / 60_000) * SCORE_CAP_PER_MIN);
    this.score = Math.min(this.score, cap);
    const equation = `${parts.map((p) => p.label).join(' + ')} = 1`;
    this.events.push({ type: 'launch', col, parts, points: pts, kinds, combo: this.combo, multi, equation });
    tank.fill = 0;
    tank.parts = [];
    if (this.hearts != null && this.launches % 30 === 0 && this.hearts < (this.mode.hearts ?? 0)) {
      this.hearts++;
      this.events.push({ type: 'heart', hearts: this.hearts });
    }
    const g = this.mode.goal;
    if (g) {
      const done = g.kind === 'launch' ? this.launches : g.kind === 'mix' ? this.mixLaunches : this.cleanStreak;
      this.events.push({ type: 'goal', done: Math.min(done, g.n), need: g.n });
      if (done >= g.n) {
        this.cleared = true;
        this.finish('goal');
      }
    }
  }

  goalProgress(): { done: number; need: number } | null {
    const g = this.mode.goal;
    if (!g) return null;
    const done = g.kind === 'launch' ? this.launches : g.kind === 'mix' ? this.mixLaunches : this.cleanStreak;
    return { done: Math.min(done, g.n), need: g.n };
  }

  private finish(reason: 'time' | 'hearts' | 'goal'): void {
    if (this.over) return;
    this.over = true;
    this.endReason = reason;
    this.cur = null;
    this.events.push({ type: 'end', reason });
  }

  /** 칸 하나 만들기 — 막힘 없음(무데드락)과 «딱 1» 공정성을 여기서 보장한다 */
  private makeCell(): Cell {
    const rem = this.tanks.map((k) => ONE - k.fill);
    // 미리 보기 2칸 = 이 칸이 나오기 전에 2번 더 부을 수 있다 → 세 번째로 큰 남은 양 안에서 고르면
    //   그 사이 어느 두 통이 줄어도 들어갈 통이 남는다(무데드락)
    const sorted = [...rem].sort((a, b) => b - a);
    const maxRem = sorted[Math.min(2, sorted.length - 1)];
    let v = 0;
    const k = this.deck.draw();
    // «딱 1 칸»은 위치 덱이 고른 통이 «이미 연료가 든» 통일 때만 낸다.
    //   빈 통 기준이면 1.00 칸이 나와 아무 데나 눌러도 발사된다(탐침: 무작위 봇 4.7→12대),
    //   «연료 든 통 중에서» 고르면 한 통에만 몰아 붓는 봇이 공짜로 먹는다(11.7대).
    if (this.r() < this.mode.pFit(this.t, this.launches) * GRADE_FIT[this.grade] && this.tanks[k].fill > 0 && rem[k] <= 90 && rem[k] <= maxRem) {
      v = rem[k];
      this.fitLog.push({ answer: k, tanks: this.tanks.length });
    } else {
      // 같은 값이 연달아 나오지 않게(변화 게이트 V6). 통이 막혀 고를 값이 하나뿐이면 상한을 한 칸씩 넓힌다
      //   (넓힌 값이 막상 안 들어가면 spawn 이 갈아 끼우고 regens 로 센다 — 봇 게이트가 0에 가까운지 본다)
      let ok: number[] = [];
      for (let lim = Math.min(2, sorted.length - 1); lim >= 0 && !ok.length; lim--) {
        ok = RANDOM_VALUES[this.grade].filter((x) => x <= sorted[lim] && !this.lastValues.includes(x));
      }
      if (!ok.length) ok = RANDOM_VALUES[this.grade].filter((x) => x <= maxRem);
      v = ok.length ? ok[pickInt(this.r, ok.length)] : maxRem;
    }
    this.lastValues.push(v);
    if (this.lastValues.length > 2) this.lastValues.shift();
    const kind = this.pickNotation(v);
    const label = labelFor(v, kind, this.grade, (n) => pickInt(this.r, n));
    return { v, label, kind, id: this.nextId++ };
  }

  private lastKinds: Notation[] = [];
  private lastValues: number[] = [];

  private pickNotation(v: number): Notation {
    let avail = availableNotations(v, this.grade);
    // 같은 표기가 3번 넘게 이어지지 않게 — 한 표기만 계속 보면 «바꿔 읽기»를 안 한다(변화 게이트 V1)
    const run = this.lastKinds.length >= 3 && this.lastKinds.slice(-3).every((k) => k === this.lastKinds[this.lastKinds.length - 1]);
    if (run && avail.length > 1) avail = avail.filter((k) => k !== this.lastKinds[this.lastKinds.length - 1]);
    const kind = this.weightedKind(avail);
    this.lastKinds.push(kind);
    if (this.lastKinds.length > 3) this.lastKinds.shift();
    return kind;
  }

  private weightedKind(avail: Notation[]): Notation {
    const w = avail.map((n) => NOTATION_WEIGHT[this.grade][n] * (1 + Math.min(1, this.weak[n] * 0.25) * 0.5));
    let x = this.r() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < avail.length; i++) {
      x -= w[i];
      if (x < 0) return avail[i];
    }
    return avail[avail.length - 1];
  }

  drainEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}

/** 발사 점수(GDD §1-4) — 정수 */
export function launchPoints(parts: number, kinds: number, combo: number, multi: number): number {
  const mix = kinds >= 3 ? 2 : kinds === 2 ? 1.5 : 1;
  const comboMul = Math.min(2, 1 + 0.1 * (combo - 1));
  const multiBonus = multi >= 3 ? 400 : multi === 2 ? 150 : 0;
  return Math.round((100 + parts * 20) * mix * comboMul) + multiBonus;
}
