import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Block, BlockColor, GameBoard, SpecialBlockType } from "../types";
import { BOARD_CONFIG } from "../constants/gameConfig";
import {
  applyGravity,
  canMoveBy,
  computeDropDistance,
  createEmptyBoard,
  findFusionGroups,
  isBoardEmpty,
} from "./board";
import {
  getBlocksForLevel,
  getColorCountForLevel,
  getDropSpeed,
  getFallingBlockCount,
  getGarbageInterval,
  getLevelForClearedBlocks,
  MAX_LEVEL,
} from "./difficulty";
import { calculateScore } from "./scoring";
import {
  getDailySeed,
  random,
  seededRandom,
  setRandomSource,
} from "./rng";

// ── 테스트 헬퍼 ──────────────────────────────────────────────
let idSeq = 0;
function block(
  color: BlockColor,
  x: number,
  y: number,
  specialType: SpecialBlockType = "normal",
): Block {
  return { id: `b${idSeq++}`, color, x, y, specialType };
}

/** 문자 그리드로 보드를 만든다. '.' = 빈칸, 'S' = stone, 그 외는 색 첫 글자. */
function boardFrom(rows: string[]): GameBoard {
  const map: Record<string, BlockColor> = {
    r: "red",
    b: "blue",
    g: "green",
    y: "yellow",
    p: "purple",
    c: "cyan",
    k: "pink",
    w: "rainbow",
  };
  const board = createEmptyBoard();
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      if (ch === "S") {
        board[y][x] = block("red", x, y, "stone");
        return;
      }
      board[y][x] = block(map[ch] ?? "red", x, y);
    });
  });
  return board;
}

const EMPTY_ROW = ".".repeat(BOARD_CONFIG.COLUMNS);
function padded(rows: string[]): string[] {
  const out = [...rows];
  while (out.length < BOARD_CONFIG.ROWS) out.unshift(EMPTY_ROW);
  return out;
}

// ── 융합 탐색 ────────────────────────────────────────────────
describe("findFusionGroups", () => {
  it("3개 인접은 터지지 않는다", () => {
    const board = boardFrom(padded(["rrr....."]));
    expect(findFusionGroups(board)).toHaveLength(0);
  });

  it("4개 인접(가로)은 하나의 그룹이 된다", () => {
    const board = boardFrom(padded(["rrrr...."]));
    const groups = findFusionGroups(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(4);
  });

  it("L자로 꺾인 4개도 인접이면 터진다", () => {
    const board = boardFrom(padded(["rr......", "rr......"]));
    const groups = findFusionGroups(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(4);
  });

  it("대각선만 닿은 블록은 연결로 치지 않는다", () => {
    const board = boardFrom(padded(["rr......", "..rr...."]));
    expect(findFusionGroups(board)).toHaveLength(0);
  });

  it("돌 블록은 매칭에 참여하지 않는다 — 색이 끊긴다", () => {
    const board = boardFrom(padded(["rrSrr..."]));
    expect(findFusionGroups(board)).toHaveLength(0);
  });

  it("레인보우는 어떤 색과도 이어진다", () => {
    const board = boardFrom(padded(["rrwr...."]));
    const groups = findFusionGroups(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(4);
  });

  it("서로 다른 색 그룹은 각각 별개로 잡힌다", () => {
    const board = boardFrom(padded(["rrrrbbbb"]));
    expect(findFusionGroups(board)).toHaveLength(2);
  });

  it("같은 블록이 두 그룹에 중복 포함되지 않는다", () => {
    const board = boardFrom(padded(["rrrr....", "rrrr...."]));
    const groups = findFusionGroups(board);
    const all = groups.flatMap((g) => g.map((b) => `${b.x},${b.y}`));
    expect(new Set(all).size).toBe(all.length);
  });
});

// ── 중력 ─────────────────────────────────────────────────────
describe("applyGravity", () => {
  it("아래 중력: 블록이 바닥까지 내려간다", () => {
    const board = createEmptyBoard();
    board[0][3] = block("red", 3, 0);
    const result = applyGravity(board, "down");
    expect(result[BOARD_CONFIG.ROWS - 1][3]).not.toBeNull();
    expect(result[0][3]).toBeNull();
  });

  it("좌표가 배열 인덱스와 항상 동기화된다", () => {
    const board = createEmptyBoard();
    board[2][5] = block("blue", 5, 2);
    const result = applyGravity(board, "down");
    const moved = result[BOARD_CONFIG.ROWS - 1][5]!;
    expect(moved.x).toBe(5);
    expect(moved.y).toBe(BOARD_CONFIG.ROWS - 1);
  });

  it("위 중력: 블록이 천장까지 올라간다", () => {
    const board = createEmptyBoard();
    board[10][2] = block("green", 2, 10);
    const result = applyGravity(board, "up");
    expect(result[0][2]).not.toBeNull();
  });

  it("좌/우 중력도 대칭으로 동작한다", () => {
    const board = createEmptyBoard();
    board[4][3] = block("red", 3, 4);
    expect(applyGravity(board, "left")[4][0]).not.toBeNull();
    expect(applyGravity(board, "right")[4][BOARD_CONFIG.COLUMNS - 1]).not.toBeNull();
  });

  it("쌓인 순서가 보존된다", () => {
    const board = createEmptyBoard();
    const top = block("red", 0, 3);
    const bottom = block("blue", 0, 9);
    board[3][0] = top;
    board[9][0] = bottom;
    const result = applyGravity(board, "down");
    expect(result[BOARD_CONFIG.ROWS - 1][0]!.color).toBe("blue");
    expect(result[BOARD_CONFIG.ROWS - 2][0]!.color).toBe("red");
  });

  it("블록 개수는 중력 적용 후에도 보존된다", () => {
    const board = boardFrom(padded(["r.b.g.y.", ".r.b.g.y"]));
    const count = (b: GameBoard) =>
      b.flat().filter((c) => c !== null).length;
    expect(count(applyGravity(board, "down"))).toBe(count(board));
  });
});

// ── 낙하 거리 (고스트 = 하드드롭 계약) ───────────────────────
describe("computeDropDistance", () => {
  it("빈 보드에서 조각은 바닥까지 떨어진다", () => {
    const board = createEmptyBoard();
    const cells = [{ x: 0, y: 0 }];
    expect(computeDropDistance(board, cells, "down")).toBe(
      BOARD_CONFIG.ROWS - 1,
    );
  });

  it("모양을 유지한 채 가장 먼저 막히는 칸이 전체를 멈춘다", () => {
    const board = createEmptyBoard();
    board[BOARD_CONFIG.ROWS - 1][1] = block("red", 1, BOARD_CONFIG.ROWS - 1);
    // 가로 2칸 조각: x=0은 바닥까지 갈 수 있지만 x=1이 먼저 막힌다
    const cells = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    expect(computeDropDistance(board, cells, "down")).toBe(
      BOARD_CONFIG.ROWS - 2,
    );
  });

  it("이미 착지한 조각의 낙하 거리는 0이다 — 락 딜레이 판정의 기준", () => {
    const board = createEmptyBoard();
    const cells = [{ x: 4, y: BOARD_CONFIG.ROWS - 1 }];
    expect(computeDropDistance(board, cells, "down")).toBe(0);
  });

  it("중력 방향이 바뀌면 거리도 그 방향으로 계산된다", () => {
    const board = createEmptyBoard();
    const cells = [{ x: 0, y: 5 }];
    expect(computeDropDistance(board, cells, "right")).toBe(
      BOARD_CONFIG.COLUMNS - 1,
    );
  });
});

describe("canMoveBy", () => {
  it("보드 밖으로는 이동할 수 없다", () => {
    const board = createEmptyBoard();
    expect(canMoveBy(board, [{ x: 0, y: 0 }], -1, 0)).toBe(false);
  });

  it("점유된 칸으로는 이동할 수 없다", () => {
    const board = createEmptyBoard();
    board[0][1] = block("red", 1, 0);
    expect(canMoveBy(board, [{ x: 0, y: 0 }], 1, 0)).toBe(false);
  });
});

describe("isBoardEmpty", () => {
  it("빈 보드를 인식한다", () => {
    expect(isBoardEmpty(createEmptyBoard())).toBe(true);
  });

  it("블록이 하나라도 있으면 비어있지 않다", () => {
    const board = createEmptyBoard();
    board[7][7] = block("red", 7, 7);
    expect(isBoardEmpty(board)).toBe(false);
  });
});

// ── 난이도 곡선 ──────────────────────────────────────────────
describe("난이도 곡선", () => {
  it("레벨업 기준은 레벨이 오를수록 완만하게 증가한다", () => {
    expect(getBlocksForLevel(1)).toBe(37);
    expect(getBlocksForLevel(2)).toBe(46);
    expect(getBlocksForLevel(10)).toBe(118);
  });

  it("누적 클리어 수 → 레벨 환산이 기준과 일치한다", () => {
    expect(getLevelForClearedBlocks(0)).toBe(1);
    expect(getLevelForClearedBlocks(36)).toBe(1);
    expect(getLevelForClearedBlocks(37)).toBe(2);
    expect(getLevelForClearedBlocks(37 + 46)).toBe(3);
  });

  it("낙하 속도는 단조 감소하고 350ms 아래로 내려가지 않는다", () => {
    let prev = Infinity;
    for (let lv = 1; lv <= 60; lv++) {
      const speed = getDropSpeed(lv);
      expect(speed).toBeLessThanOrEqual(prev);
      expect(speed).toBeGreaterThanOrEqual(350);
      prev = speed;
    }
  });

  it("동시 낙하 블록은 4개를 넘지 않는다 — 8칸 보드 조작 한계", () => {
    for (let lv = 1; lv <= MAX_LEVEL + 20; lv++) {
      expect(getFallingBlockCount(lv)).toBeLessThanOrEqual(4);
      expect(getFallingBlockCount(lv)).toBeGreaterThanOrEqual(1);
    }
  });

  it("조각 크기는 레벨에 대해 단조 증가한다 (절벽 없음)", () => {
    let prev = 0;
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      const count = getFallingBlockCount(lv);
      expect(count).toBeGreaterThanOrEqual(prev);
      expect(count - prev).toBeLessThanOrEqual(1); // 한 번에 2단계 점프 금지
      prev = count;
    }
  });

  it("초반 4색으로 시작해 최대 7색까지만 늘어난다", () => {
    expect(getColorCountForLevel(1)).toBe(4);
    expect(getColorCountForLevel(4)).toBe(4);
    expect(getColorCountForLevel(5)).toBe(5);
    expect(getColorCountForLevel(14)).toBe(6);
    expect(getColorCountForLevel(20)).toBe(7);
    expect(getColorCountForLevel(99)).toBe(7);
  });

  it("두 난이도 축이 같은 레벨에서 동시에 오르지 않는다", () => {
    // 축이 겹치면 그 레벨에서 생존율이 급락한다 (봇 시뮬로 실측된 사실)
    const bumps: Record<number, string[]> = {};
    for (let lv = 2; lv <= MAX_LEVEL; lv++) {
      if (getFallingBlockCount(lv) !== getFallingBlockCount(lv - 1)) {
        (bumps[lv] ??= []).push("piece");
      }
      if (getColorCountForLevel(lv) !== getColorCountForLevel(lv - 1)) {
        (bumps[lv] ??= []).push("color");
      }
      if (lv === 12) (bumps[lv] ??= []).push("garbage");
    }
    for (const [lv, axes] of Object.entries(bumps)) {
      expect(axes, `레벨 ${lv}에서 축 ${axes.join("+")} 동시 상승`).toHaveLength(1);
    }
  });

  it("가비지 간격은 25초 아래로 내려가지 않는다", () => {
    for (let lv = 12; lv <= 60; lv++) {
      expect(getGarbageInterval(lv)).toBeGreaterThanOrEqual(25);
    }
  });
});

// ── 점수 ─────────────────────────────────────────────────────
describe("calculateScore", () => {
  const base = {
    blocksCleared: 4,
    chainCount: 1,
    comboCount: 0,
    level: 1,
    powerUpMultiplier: 1,
    perfectClear: false,
  };

  it("기본 점수는 블록 수 x 레벨에 비례한다", () => {
    expect(calculateScore(base)).toBe(40);
    expect(calculateScore({ ...base, level: 3 })).toBe(120);
  });

  it("피버는 정확히 3배다 — 여기가 유일한 적용 지점", () => {
    const plain = calculateScore(base);
    const fever = calculateScore({ ...base, isFeverMode: true });
    expect(fever).toBe(plain * 3);
  });

  it("파워업 배율과 피버는 곱해진다 (x2 * x3 = x6)", () => {
    const plain = calculateScore(base);
    const both = calculateScore({
      ...base,
      powerUpMultiplier: 2,
      isFeverMode: true,
    });
    expect(both).toBe(plain * 6);
  });

  it("연쇄가 깊을수록 점수가 커진다", () => {
    const c2 = calculateScore({ ...base, chainCount: 2 });
    const c3 = calculateScore({ ...base, chainCount: 3 });
    expect(c3).toBeGreaterThan(c2);
    expect(c2).toBeGreaterThan(calculateScore(base));
  });

  it("퍼펙트 클리어 보너스가 반영된다", () => {
    expect(
      calculateScore({ ...base, perfectClear: true }),
    ).toBeGreaterThan(calculateScore(base) + 10000);
  });
});

// ── 시드 난수 (데일리 재현성) ────────────────────────────────
describe("시드 난수", () => {
  afterEach(() => setRandomSource(null));

  it("같은 시드는 같은 수열을 만든다", () => {
    const a = seededRandom(12345);
    const b = seededRandom(12345);
    const seqA = Array.from({ length: 20 }, a);
    const seqB = Array.from({ length: 20 }, b);
    expect(seqA).toEqual(seqB);
  });

  it("다른 시드는 다른 수열을 만든다", () => {
    const a = Array.from({ length: 20 }, seededRandom(1));
    const b = Array.from({ length: 20 }, seededRandom(2));
    expect(a).not.toEqual(b);
  });

  it("생성값은 항상 [0, 1) 범위 안이다", () => {
    const rand = seededRandom(999);
    for (let i = 0; i < 500; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("시드 0도 고정점에 갇히지 않는다", () => {
    const rand = seededRandom(0);
    const values = new Set(Array.from({ length: 10 }, rand));
    expect(values.size).toBeGreaterThan(1);
  });

  it("같은 날짜는 같은 데일리 시드를 준다", () => {
    const d1 = new Date(2026, 6, 19);
    const d2 = new Date(2026, 6, 19);
    expect(getDailySeed(d1)).toBe(getDailySeed(d2));
  });

  it("다른 날짜는 다른 데일리 시드를 준다", () => {
    expect(getDailySeed(new Date(2026, 6, 19))).not.toBe(
      getDailySeed(new Date(2026, 6, 20)),
    );
  });

  it("전역 난수 소스를 시드로 교체·복구할 수 있다", () => {
    setRandomSource(seededRandom(42));
    const seeded = Array.from({ length: 5 }, random);
    setRandomSource(seededRandom(42));
    expect(Array.from({ length: 5 }, random)).toEqual(seeded);
    setRandomSource(null);
  });
});

// ── 미션 날짜 경계 ───────────────────────────────────────────
describe("미션 날짜 키", () => {
  beforeEach(() => (idSeq = 0));

  it("일일 키는 날짜가 바뀌면 달라진다", async () => {
    const { currentDailyKey } = await import("../constants/missions");
    expect(currentDailyKey(new Date(2026, 6, 19))).toBe("2026-07-19");
    expect(currentDailyKey(new Date(2026, 6, 20))).toBe("2026-07-20");
  });

  it("주간 키는 같은 주 안에서는 동일하다", async () => {
    const { currentWeeklyKey } = await import("../constants/missions");
    // 2026-07-20(월) ~ 2026-07-26(일)은 같은 ISO 주
    expect(currentWeeklyKey(new Date(2026, 6, 20))).toBe(
      currentWeeklyKey(new Date(2026, 6, 26)),
    );
  });

  it("주가 바뀌면 주간 키도 바뀐다", async () => {
    const { currentWeeklyKey } = await import("../constants/missions");
    expect(currentWeeklyKey(new Date(2026, 6, 26))).not.toBe(
      currentWeeklyKey(new Date(2026, 6, 27)),
    );
  });
});
