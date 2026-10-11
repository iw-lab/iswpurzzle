// 완료 기준(GDD §1-8) «판·규칙» 줄을 하나씩 — 브라우저와 같은 src/core 를 직접 돌린다.
import { describe, expect, it } from 'vitest';
import { Sim, MIN_GAP_MS, OVERFLOW_PAUSE_MS } from '../src/core/sim.ts';
import { makeMode } from '../src/core/modes.ts';
import { hashSeed } from '../src/core/rng.ts';
import { parseLabel, labelFor, fractionForms, sumLabel, type Cell, type Grade } from '../src/core/values.ts';

const cell = (label: string, id = 1): Cell => ({ v: parseLabel(label), label, kind: label.includes('/') ? 'frac' : label.endsWith('%') ? 'pct' : 'dec', id });

function pourAll(labels: string[]) {
  const s = new Sim(makeMode('time'), { grade: 6, seed: 1 });
  s.step(1);
  const evs = [];
  for (const l of labels) {
    s.cur = cell(l, Math.random() * 1e9);
    s.drop(0);
    evs.push(...s.drainEvents());
  }
  return { s, evs };
}

describe('딱 1 판정', () => {
  for (const combo of [['1/4', '0.5', '25%'], ['3/5', '0.4'], ['45%', '0.55'], ['0.1', '0.2', '0.7'], ['2/4', '5/10'], ['3/20', '0.85']]) {
    it(`${combo.join(' + ')} = 1 → 발사`, () => {
      const { s, evs } = pourAll(combo);
      expect(evs.some((e) => e.type === 'launch')).toBe(true);
      expect(s.launches).toBe(1);
      expect(s.tanks[0].fill).toBe(0);
    });
  }

  it('합이 1을 넘으면 그 칸만 깨지고 통은 그대로', () => {
    const { s, evs } = pourAll(['0.8', '1/4']);
    expect(s.tanks[0].fill).toBe(80);
    expect(s.overflows).toBe(1);
    const ov = evs.find((e) => e.type === 'overflow');
    expect(ov && ov.type === 'overflow' && ov.equation).toBe('0.8 + 1/4 = 1.05');
  });

  it('넘치면 다음 칸이 잠깐 늦게 온다(아무 데나 누르기 손해)', () => {
    const s = new Sim(makeMode('time'), { grade: 5, seed: 3 });
    s.step(MIN_GAP_MS + 1);
    s.tanks[0].fill = 90;
    s.cur = cell('0.5');
    s.drop(0);
    s.step(OVERFLOW_PAUSE_MS - 50);
    expect(s.cur).toBeNull();
    s.step(100);
    expect(s.cur).not.toBeNull();
  });
});

describe('판 진행', () => {
  it('60초 판은 실력과 상관없이 60.0초에 끝난다', () => {
    for (const seed of [1, 2, 3]) {
      const s = new Sim(makeMode('time'), { grade: 5, seed });
      while (!s.over) s.step(1000 / 60);
      expect(Math.abs(s.t - 60_000)).toBeLessThan(20);
      expect(s.endReason).toBe('time');
    }
  });

  it('아무것도 안 누르면 칸이 바닥선에서 지금 아래 로켓에 저절로 들어간다', () => {
    const s = new Sim(makeMode('time'), { grade: 5, seed: 9 });
    s.step(1);
    const col = s.col;
    const v = s.cur!.v;
    let poured = null as null | { col: number; auto: boolean };
    for (let i = 0; i < 400 && !poured; i++) {
      s.step(20);
      for (const e of s.drainEvents()) if (e.type === 'pour' || e.type === 'overflow') poured = { col: e.col, auto: e.type === 'pour' ? e.auto : true };
    }
    expect(poured?.col).toBe(col);
    expect(poured?.auto).toBe(true);
    expect(v).toBeGreaterThan(0);
  });

  it('보관함은 연속 두 번 바꿀 수 없다', () => {
    const s = new Sim(makeMode('time'), { grade: 5, seed: 4 });
    s.step(1);
    expect(s.swapHold()).toBe(true);
    s.step(1);
    expect(s.swapHold()).toBe(false);
  });

  it('같은 날짜의 «오늘의 발사»는 두 번 만들어도 같은 칸 순서', () => {
    const seed = hashSeed('ttak1:2026-10-11:5');
    const seq = () => {
      const s = new Sim(makeMode('daily'), { grade: 5, seed });
      const out: string[] = [];
      for (let i = 0; i < 20; i++) {
        s.step(MIN_GAP_MS + 1);
        if (s.cur) { out.push(s.cur.label); s.drop(i % 5); }
        s.drainEvents();
      }
      return out.join(' ');
    };
    expect(seq()).toBe(seq());
  });

  it('하트가 0이 되면 끝없는 우주가 끝난다', () => {
    const s = new Sim(makeMode('survival'), { grade: 5, seed: 5 });
    for (let i = 0; i < 3; i++) {
      s.step(2000);
      s.tanks[0].fill = 95;
      s.cur = cell('0.5');
      s.drop(0);
    }
    expect(s.over).toBe(true);
    expect(s.endReason).toBe('hearts');
  });

  it('무데드락 — 무작위로 붓는 2,000판에서 «들어갈 통이 없는 칸»이 화면에 나온 적 0', () => {
    let bad = 0;
    for (let g = 0; g < 2000; g++) {
      const s = new Sim(makeMode(g % 3 ? 'time' : 'survival'), { grade: ([4, 5, 6] as Grade[])[g % 3], seed: 1000 + g });
      let r = g;
      while (!s.over && s.t < 90_000) {
        s.step(250);
        if (s.cur) {
          if (!s.fitsSomewhere(s.cur.v)) bad++;
          r = (r * 1103515245 + 12345) >>> 0;
          s.drop(r % s.tanks.length);
        }
        s.drainEvents();
      }
    }
    expect(bad).toBe(0);
  });
});

describe('표기', () => {
  it('1/3 처럼 유한소수가 안 되는 분수는 만들 수 없다', () => {
    for (const g of [4, 5, 6] as Grade[]) for (let v = 5; v < 100; v += 5) for (const f of fractionForms(v, g)) expect(100 % Number(f.split('/')[1])).toBe(0);
  });
  it('표기는 값과 같다(화면 글자만 읽어 계산해도 맞는다)', () => {
    let i = 0;
    for (const g of [5, 6] as Grade[]) for (let v = 5; v < 100; v += 5) for (const k of ['frac', 'dec', 'pct'] as const) {
      if (k === 'pct' && g !== 6) continue;
      if (k === 'frac' && !fractionForms(v, g).length) continue;
      const l = labelFor(v, k, g, (n) => (i++) % n);
      expect(parseLabel(l)).toBe(v);
    }
  });
  it('합 표기', () => {
    expect(sumLabel(105)).toBe('1.05');
    expect(sumLabel(180)).toBe('1.8');
    expect(sumLabel(100)).toBe('1');
  });
});
