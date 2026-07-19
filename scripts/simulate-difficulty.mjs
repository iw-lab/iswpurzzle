/**
 * 난이도 곡선 봇 시뮬레이션 (계획서 §5 Phase 3 완료 게이트).
 *
 * 엔진의 순수 로직만 사용해 헤드리스로 N판을 돌린다.
 * 봇은 "가장 큰 동색 인접을 만드는 자리"를 고르는 단순 그리디 —
 * 사람 초보~중급 수준의 하한 프록시다.
 *
 * 목표: 레벨별 평균 생존 시간이 절벽 없이 단조 감소할 것.
 *
 * 실행: node scripts/simulate-difficulty.mjs [판수]
 */

const COLUMNS = 8;
const ROWS = 16;
const MIN_FUSE = 4;

// ── 엔진 난이도 곡선 (src/engine/difficulty.ts와 동일 값) ──
const getBlocksForLevel = (l) => 28 + 9 * l;
const getDropSpeed = (l) => Math.max(350, 1000 - (l - 1) * 35);
const getColorCount = (l) => (l >= 20 ? 7 : l >= 14 ? 6 : l >= 5 ? 5 : 4);
const getFallingBlockCount = (l) => (l >= 18 ? 4 : l >= 10 ? 3 : l >= 3 ? 2 : 1);
const GARBAGE_START = 12;
const getGarbageInterval = (l) => Math.max(25, 45 - (l - GARBAGE_START) * 1.2);
const MAX_LEVEL = 30;

const SHAPES = {
  1: [[[0, 0]]],
  2: [
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1]],
  ],
  3: [
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 1]],
  ],
  4: [
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 2]],
  ],
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const emptyBoard = () =>
  Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null));

function findGroups(board) {
  const groups = [];
  const seen = new Set();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLUMNS; x++) {
      if (seen.has(`${x},${y}`) || board[y][x] === null) continue;
      const color = board[y][x];
      const local = new Set();
      const queue = [[x, y]];
      while (queue.length) {
        const [cx, cy] = queue.pop();
        const key = `${cx},${cy}`;
        if (local.has(key)) continue;
        if (cx < 0 || cx >= COLUMNS || cy < 0 || cy >= ROWS) continue;
        if (board[cy][cx] !== color) continue;
        local.add(key);
        queue.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
      }
      if (local.size >= MIN_FUSE) {
        groups.push([...local]);
        local.forEach((k) => seen.add(k));
      }
    }
  }
  return groups;
}

function applyGravity(board) {
  const next = emptyBoard();
  for (let x = 0; x < COLUMNS; x++) {
    let write = ROWS - 1;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y][x] !== null) next[write--][x] = board[y][x];
    }
  }
  return next;
}

/** 융합·연쇄를 모두 정산하고 클리어된 블록 수를 반환한다. */
function settle(board) {
  let cleared = 0;
  for (;;) {
    const groups = findGroups(board);
    if (!groups.length) break;
    for (const g of groups) {
      for (const key of g) {
        const [x, y] = key.split(",").map(Number);
        board[y][x] = null;
        cleared++;
      }
    }
    const settled = applyGravity(board);
    for (let y = 0; y < ROWS; y++) board[y] = settled[y];
  }
  return cleared;
}

function dropDistance(board, cells) {
  let d = 0;
  for (;;) {
    const ok = cells.every(({ x, y }) => {
      const ny = y + d + 1;
      return ny < ROWS && board[ny][x] === null;
    });
    if (!ok) return d;
    d++;
    if (d > ROWS) return d;
  }
}

/** 그리디 봇: 착지 후 같은 색 인접이 최대가 되고 높이가 낮은 자리를 고른다. */
function choosePlacement(board, shape, colors) {
  let best = null;
  const width = Math.max(...shape.map(([dx]) => dx)) + 1;

  for (let baseX = 0; baseX + width <= COLUMNS; baseX++) {
    const cells = shape.map(([dx, dy]) => ({ x: baseX + dx, y: dy }));
    if (cells.some(({ x, y }) => board[y][x] !== null)) continue;

    const dist = dropDistance(board, cells);
    const landed = cells.map((c, i) => ({ ...c, y: c.y + dist, color: colors[i] }));
    if (landed.some((c) => c.y >= ROWS)) continue;

    // 점수: 같은 색 인접 수 - 높이 페널티
    let adjacency = 0;
    for (const c of landed) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = c.x + dx;
        const ny = c.y + dy;
        if (nx < 0 || nx >= COLUMNS || ny < 0 || ny >= ROWS) continue;
        if (board[ny][nx] === c.color) adjacency++;
      }
    }
    const avgDepth = landed.reduce((s, c) => s + c.y, 0) / landed.length;
    const score = adjacency * 10 + avgDepth;

    if (!best || score > best.score) best = { score, landed };
  }
  return best;
}

function addGarbageRow(board, rand) {
  if (board[0].some((c) => c !== null)) return false; // 압사
  for (let y = 1; y < ROWS; y++) board[y - 1] = board[y];
  const gap = Math.floor(rand() * COLUMNS);
  board[ROWS - 1] = Array.from({ length: COLUMNS }, (_, x) =>
    x === gap ? null : Math.floor(rand() * 4),
  );
  return true;
}

function playGame(seed) {
  const rand = mulberry32(seed);
  const board = emptyBoard();
  let level = 1;
  let clearedTotal = 0;
  let clearedTowardLevel = 0;
  let elapsed = 0; // 초
  let garbageTimer = 0;
  const levelTime = {}; // 레벨별 체류 시간

  for (let piece = 0; piece < 20000; piece++) {
    const count = getFallingBlockCount(level);
    const shapes = SHAPES[count];
    const shape = shapes[Math.floor(rand() * shapes.length)];
    const colorCount = getColorCount(level);
    const colors = shape.map(() => Math.floor(rand() * colorCount));

    const placement = choosePlacement(board, shape, colors);
    if (!placement) return { survived: elapsed, level, cleared: clearedTotal, levelTime };

    for (const c of placement.landed) board[c.y][c.x] = c.color;

    const cleared = settle(board);
    clearedTotal += cleared;
    clearedTowardLevel += cleared;

    // 조각 하나를 조작·낙하시키는 데 걸리는 시간 (낙하 속도 x 평균 낙하 칸수의 근사)
    const pieceSeconds = (getDropSpeed(level) / 1000) * 6;
    elapsed += pieceSeconds;
    levelTime[level] = (levelTime[level] ?? 0) + pieceSeconds;

    // 레벨업 (누적 클리어 블록 기준)
    while (level < MAX_LEVEL && clearedTowardLevel >= getBlocksForLevel(level)) {
      clearedTowardLevel -= getBlocksForLevel(level);
      level++;
    }

    // 가비지
    if (level >= GARBAGE_START) {
      garbageTimer += pieceSeconds;
      if (garbageTimer >= getGarbageInterval(level)) {
        garbageTimer = 0;
        if (!addGarbageRow(board, rand)) {
          return { survived: elapsed, level, cleared: clearedTotal, levelTime };
        }
      }
    }

    // 압사 판정: 상단 2줄이 모두 차면 종료
    const topFilled =
      board[0].filter((c) => c !== null).length +
      board[1].filter((c) => c !== null).length;
    if (topFilled >= COLUMNS) {
      return { survived: elapsed, level, cleared: clearedTotal, levelTime };
    }
  }
  return { survived: elapsed, level, cleared: clearedTotal, levelTime };
}

// ── 실행 ─────────────────────────────────────────────────────
const games = Number(process.argv[2] ?? 1000);
const results = [];
for (let i = 0; i < games; i++) results.push(playGame(i + 1));

const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

console.log(`\n=== ChromaFall 난이도 시뮬레이션 (${games}판, 그리디 봇) ===\n`);
console.log(`평균 생존:   ${(avg(results.map((r) => r.survived)) / 60).toFixed(1)}분`);
console.log(`중앙값 생존: ${(median(results.map((r) => r.survived)) / 60).toFixed(1)}분`);
console.log(`평균 도달 레벨: ${avg(results.map((r) => r.level)).toFixed(1)}`);
console.log(`최고 도달 레벨: ${Math.max(...results.map((r) => r.level))}`);
console.log(`평균 클리어 블록: ${avg(results.map((r) => r.cleared)).toFixed(0)}\n`);

// 레벨별 평균 체류 시간 — 절벽 검출
const perLevel = {};
for (const r of results) {
  for (const [lv, t] of Object.entries(r.levelTime)) {
    (perLevel[lv] ??= []).push(t);
  }
}

console.log("레벨 | 도달률 | 평균 체류(초) | 낙하속도(ms) | 색 | 조각");
console.log("-----|--------|---------------|--------------|----|----");
let prevDwell = null;
let cliffs = 0;
for (let lv = 1; lv <= 25; lv++) {
  const samples = perLevel[lv];
  if (!samples) break;
  const reach = ((samples.length / games) * 100).toFixed(0);
  const dwell = avg(samples);
  // "절벽" = 이전 레벨 대비 체류 시간이 60% 넘게 급감
  const cliff = prevDwell !== null && dwell < prevDwell * 0.4;
  if (cliff) cliffs++;
  console.log(
    `${String(lv).padStart(4)} | ${reach.padStart(5)}% | ${dwell.toFixed(1).padStart(13)} | ` +
      `${String(getDropSpeed(lv)).padStart(12)} | ${getColorCount(lv)}  | ${getFallingBlockCount(lv)}` +
      (cliff ? "  ← 절벽" : ""),
  );
  prevDwell = dwell;
}

console.log(`\n절벽 구간: ${cliffs}개 ${cliffs === 0 ? "✅ (게이트 통과)" : "❌"}`);
