/**
 * 보드 순수 로직 — React 의존 0.
 * 융합 탐색·중력·낙하 시뮬레이션. 테스트 가능한 단일 진실.
 */
import type { Block, GameBoard, GravityDirection } from "../types";
import { BOARD_CONFIG, FUSION_CONFIG, GRAVITY_VECTORS } from "../constants";

export function createEmptyBoard(): GameBoard {
  return Array(BOARD_CONFIG.ROWS)
    .fill(null)
    .map(() => Array(BOARD_CONFIG.COLUMNS).fill(null));
}

export function cloneBoard(board: GameBoard): GameBoard {
  return board.map((row) => [...row]);
}

export function isBoardEmpty(board: GameBoard): boolean {
  for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
    for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
      if (board[y][x]) return false;
    }
  }
  return true;
}

/**
 * 융합 판정에 쓰는 키.
 *
 * 기본 모드에서는 색이 곧 키다. 수학 모드에서는 동치류 id가 들어와서
 * 표기가 달라도(1/2 · 0.5 · 50%) 같은 키로 묶인다 — 융합 규칙 자체가 학습 목표다.
 * 매칭을 판단하는 모든 코드는 block.color가 아니라 이 함수를 거쳐야 한다.
 */
export function matchKeyOf(block: Block): string {
  return block.matchKey ?? block.color;
}

export function inBounds(x: number, y: number): boolean {
  return (
    x >= 0 && x < BOARD_CONFIG.COLUMNS && y >= 0 && y < BOARD_CONFIG.ROWS
  );
}

/**
 * 4개 이상 인접(상하좌우) 동색 그룹 탐색.
 * stone은 매칭 대상 아님. rainbow는 어떤 색과도 매칭된다.
 *
 * rainbow가 탐색 시작점이 될 수 있는 이유(2026-08-20 수정):
 * 예전에는 시작점에서 제외했는데, 그러면 **무지개끼리만 인접한 덩어리가
 * 영원히 남는다**(실측: 무지개 4개를 나란히 놓으면 보드에 박제됨).
 * targetColor가 rainbow일 때 BFS는 rainbow만 수집하므로, 시작점으로 허용해도
 * 다른 색을 끌어들이지 않는다 — 무지개 4개 이상만 자기들끼리 융합된다.
 * 일반 색이 먼저 스캔되면 기존대로 rainbow를 와일드카드로 흡수한다.
 */
export function findFusionGroups(board: GameBoard): Block[][] {
  const MIN_BLOCKS = FUSION_CONFIG.MIN_BLOCKS_TO_FUSE;
  const groups: Block[][] = [];
  const globalVisited = new Set<string>();

  for (let startY = 0; startY < BOARD_CONFIG.ROWS; startY++) {
    for (let startX = 0; startX < BOARD_CONFIG.COLUMNS; startX++) {
      if (globalVisited.has(`${startX},${startY}`)) continue;

      const startBlock = board[startY]?.[startX];
      if (!startBlock) continue;
      if (startBlock.specialType === "stone") continue;

      const targetKey = matchKeyOf(startBlock);
      const connected: Block[] = [];
      const localVisited = new Set<string>();
      const queue: [number, number][] = [[startX, startY]];

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        const cellKey = `${cx},${cy}`;
        if (localVisited.has(cellKey)) continue;
        if (!inBounds(cx, cy)) continue;

        const block = board[cy]?.[cx];
        if (!block) continue;
        if (block.specialType === "stone") continue;
        if (matchKeyOf(block) !== targetKey && block.color !== "rainbow") continue;

        localVisited.add(cellKey);
        connected.push({ ...block, x: cx, y: cy });

        queue.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
      }

      if (connected.length >= MIN_BLOCKS) {
        groups.push(connected);
        localVisited.forEach((k) => globalVisited.add(k));
      }
    }
  }

  return groups;
}

/** 중력 방향으로 보드 전체 압축. 좌표는 배열 인덱스와 항상 동기화된다. */
export function applyGravity(
  board: GameBoard,
  gravityDirection: GravityDirection,
): GameBoard {
  const newBoard = createEmptyBoard();

  if (gravityDirection === "down") {
    for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
      let writeY = BOARD_CONFIG.ROWS - 1;
      for (let y = BOARD_CONFIG.ROWS - 1; y >= 0; y--) {
        if (board[y][x]) newBoard[writeY][x] = { ...board[y][x]!, x, y: writeY-- };
      }
    }
  } else if (gravityDirection === "up") {
    for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
      let writeY = 0;
      for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
        if (board[y][x]) newBoard[writeY][x] = { ...board[y][x]!, x, y: writeY++ };
      }
    }
  } else if (gravityDirection === "left") {
    for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
      let writeX = 0;
      for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
        if (board[y][x]) newBoard[y][writeX] = { ...board[y][x]!, x: writeX++, y };
      }
    }
  } else {
    for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
      let writeX = BOARD_CONFIG.COLUMNS - 1;
      for (let x = BOARD_CONFIG.COLUMNS - 1; x >= 0; x--) {
        if (board[y][x]) newBoard[y][writeX] = { ...board[y][x]!, x: writeX--, y };
      }
    }
  }

  return newBoard;
}

/** 낙하 중인 조각이 한 칸 더 갈 수 있는지 (모양 유지 기준). */
export function canMoveBy(
  board: GameBoard,
  cells: { x: number; y: number }[],
  dx: number,
  dy: number,
): boolean {
  for (const c of cells) {
    const nx = c.x + dx;
    const ny = c.y + dy;
    if (!inBounds(nx, ny)) return false;
    if (board[ny]?.[nx] !== null) return false;
  }
  return true;
}

/**
 * 조각이 모양을 유지한 채 중력 방향으로 떨어질 수 있는 최대 거리.
 * 고스트 표시와 하드드롭이 반드시 이 함수를 공유해야 "보이는 대로 떨어진다"가 성립한다.
 */
export function computeDropDistance(
  board: GameBoard,
  cells: { x: number; y: number }[],
  gravityDirection: GravityDirection,
): number {
  const { dx, dy } = GRAVITY_VECTORS[gravityDirection];
  let distance = 0;
  while (canMoveBy(board, cells.map((c) => ({ x: c.x + dx * distance, y: c.y + dy * distance })), dx, dy)) {
    distance++;
    if (distance > BOARD_CONFIG.ROWS + BOARD_CONFIG.COLUMNS) break;
  }
  return distance;
}

/** 상단(중력 반대편) 위험도 계산 — 0~3. */
export function computeDangerLevel(
  board: GameBoard,
  gravityDirection: GravityDirection,
): number {
  const occupiedRows: number[] = [];
  if (gravityDirection === "down") {
    for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
      if (board[y].some((c) => c !== null)) occupiedRows.push(y);
    }
    const topmost = occupiedRows.length ? occupiedRows[0] : BOARD_CONFIG.ROWS;
    if (topmost <= 1) return 3;
    if (topmost <= 2) return 2;
    if (topmost <= 4) return 1;
    return 0;
  }
  return 0;
}
