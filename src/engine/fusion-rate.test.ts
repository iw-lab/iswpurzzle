/**
 * "블록이 안 터진다" 전후 비교 — 실제 엔진 모듈을 그대로 써서 측정한다.
 * (vitest 러너만 빌려 쓰는 측정 스크립트. 단언은 회귀 가드 최소한만 건다.)
 */
import { describe, it, expect } from "vitest";

import {
  findFusionGroups,
  applyGravity,
  createEmptyBoard,
} from "./board";
import {
  getColorsForLevel,
  getFallingBlockCount,
  buildPieceColors,
  getBlocksForLevel,
} from "./difficulty";
import { seededRandom } from "./rng";
import type { Block, BlockColor, GameBoard } from "../types";

const ROWS = 16, COLS = 8;

const SHAPES: Record<number, [number, number][][]> = {
  1: [[[0, 0]]],
  2: [[[0, 0], [1, 0]], [[0, 0], [0, 1]]],
  3: [[[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 1]]],
};

function mk(color: BlockColor, x: number, y: number): Block {
  return { id: `${x},${y}`, color, x, y, specialType: "normal" };
}
function settle(board: GameBoard): number {
  let cleared = 0;
  for (;;) {
    const groups = findFusionGroups(board);
    if (!groups.length) break;
    for (const g of groups) for (const b of g) { board[b.y][b.x] = null; cleared++; }
    const next = applyGravity(board, "down");
    for (let y = 0; y < ROWS; y++) board[y] = next[y];
  }
  return cleared;
}
function dropDist(board: GameBoard, cells: { x: number; y: number }[]): number {
  let d = 0;
  for (;;) {
    const ok = cells.every((c) => c.y + d + 1 < ROWS && board[c.y + d + 1][c.x] === null);
    if (!ok) return d;
    if (++d > ROWS) return d;
  }
}

/** 조각 색 배분 방식만 바꿔가며 동일 봇으로 비교한다. */
type ColorMode = "perCellRandom" | "pieceBag";

function playGame(seed: number, mode: ColorMode, maxPieces = 900) {
  const rand = seededRandom(seed);
  const board = createEmptyBoard();
  let level = 1, toward = 0, pieces = 0;
  const perLevel: Record<number, { pieces: number; fus: number; fillSum: number; maxDry: number }> = {};
  let dry = 0;

  while (pieces < maxPieces) {
    const count = getFallingBlockCount(level);
    const shape = SHAPES[count][Math.floor(rand() * SHAPES[count].length)];
    const palette = getColorsForLevel(level);
    const colors: BlockColor[] =
      mode === "pieceBag"
        ? buildPieceColors(level, count, rand)
        : shape.map(() => palette[Math.floor(rand() * palette.length)]);

    const width = Math.max(...shape.map((o) => o[0])) + 1;
    let best: { sc: number; landed: { x: number; y: number; c: BlockColor }[] } | null = null;
    for (let bx = 0; bx + width <= COLS; bx++) {
      const cells = shape.map(([dx, dy]) => ({ x: bx + dx, y: dy }));
      if (cells.some((c) => board[c.y][c.x] !== null)) continue;
      const d = dropDist(board, cells);
      const landed = cells.map((c, i) => ({ x: c.x, y: c.y + d, c: colors[i] }));
      if (landed.some((c) => c.y >= ROWS)) continue;
      const test = board.map((r) => [...r]);
      for (const c of landed) test[c.y][c.x] = mk(c.c, c.x, c.y);
      const cl = settle(test);
      let adj = 0;
      for (const c of landed)
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nx = c.x + dx, ny = c.y + dy;
          if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
          if (board[ny][nx]?.color === c.c) adj++;
        }
      const avgY = landed.reduce((s, c) => s + c.y, 0) / landed.length;
      const sc = cl * 1000 + adj * 20 + avgY;
      if (!best || sc > best.sc) best = { sc, landed };
    }

    const L = (perLevel[level] ??= { pieces: 0, fus: 0, fillSum: 0, maxDry: 0 });
    L.pieces++;
    if (!best) return { level, pieces, perLevel };

    for (const c of best.landed) board[c.y][c.x] = mk(c.c, c.x, c.y);
    const cleared = settle(board);
    L.fillSum += board.flat().filter(Boolean).length;
    if (cleared > 0) { L.fus++; dry = 0; } else { dry++; if (dry > L.maxDry) L.maxDry = dry; }

    toward += cleared;
    pieces++;
    while (toward >= getBlocksForLevel(level) && level < 30) { toward -= getBlocksForLevel(level); level++; }
  }
  return { level, pieces, perLevel };
}

function summarize(mode: ColorMode, games = 12) {
  const agg: Record<number, { pieces: number; fus: number; fillSum: number; maxDry: number }> = {};
  let lv = 0, pc = 0;
  for (let s = 1; s <= games; s++) {
    const r = playGame(s * 7919, mode);
    lv += r.level; pc += r.pieces;
    for (const [k, v] of Object.entries(r.perLevel)) {
      const a = (agg[+k] ??= { pieces: 0, fus: 0, fillSum: 0, maxDry: 0 });
      a.pieces += v.pieces; a.fus += v.fus; a.fillSum += v.fillSum;
      a.maxDry = Math.max(a.maxDry, v.maxDry);
    }
  }
  const rows = Object.entries(agg)
    .map(([k, a]) => ({ lv: +k, rate: a.fus / a.pieces * 100, dry: a.maxDry, fill: a.fillSum / a.pieces / 128 * 100 }))
    .filter((r) => agg[r.lv].pieces >= 25)
    .sort((a, b) => a.lv - b.lv);
  return { avgLevel: lv / games, avgPieces: pc / games, rows };
}

describe("융합 발생률 회귀 가드", () => {
  it("조각 색 배분 방식 비교", () => {
    const out: string[] = [];
    for (const mode of ["perCellRandom", "pieceBag"] as ColorMode[]) {
      const r = summarize(mode);
      const label = mode === "perCellRandom" ? "예전(칸마다 독립 난수)" : "현재(조각 2색 가방)";
      out.push(`\n■ ${label}`);
      out.push(`  평균 도달 레벨 ${r.avgLevel.toFixed(1)} | 평균 조각 ${r.avgPieces.toFixed(0)}`);
      out.push(
        "  " + r.rows.filter((x) => [1, 5, 10, 12, 14, 16, 18, 20, 24, 30].includes(x.lv))
          .map((x) => `L${x.lv}:융합${x.rate.toFixed(0)}%/무융합${x.dry}/채움${x.fill.toFixed(0)}%`)
          .join("  "),
      );
      const late = r.rows.filter((x) => x.lv >= 12);
      if (late.length) {
        out.push(
          `  L12+ 평균: 융합률 ${(late.reduce((s, x) => s + x.rate, 0) / late.length).toFixed(0)}%` +
          ` | 최장 무융합 ${Math.max(...late.map((x) => x.dry))}조각` +
          ` | 평균 보드채움 ${(late.reduce((s, x) => s + x.fill, 0) / late.length).toFixed(0)}%`,
        );
      }
    }
    for (const line of out) console.log(line);

    // 회귀 가드: 후반에 보드가 융합보다 빨리 차면 "블록이 안 터진다"가 재발한 것이다.
    // 수정 전 실측 L12+ 평균 채움 71% / 융합률 30%, 수정 후 32% / 51%.
    const now = summarize("pieceBag");
    const late = now.rows.filter((x) => x.lv >= 12);
    const avgFill = late.reduce((s, x) => s + x.fill, 0) / late.length;
    const avgRate = late.reduce((s, x) => s + x.rate, 0) / late.length;
    expect(avgFill, `L12+ 평균 보드채움 ${avgFill.toFixed(0)}% — 50% 넘으면 색 기아 재발`).toBeLessThan(50);
    expect(avgRate, `L12+ 평균 융합률 ${avgRate.toFixed(0)}% — 40% 밑이면 색 기아 재발`).toBeGreaterThan(40);
  }, 300000);
});
