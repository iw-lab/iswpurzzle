// 융합 로직 테스트
const BOARD_CONFIG = { COLUMNS: 8, ROWS: 16 };

function getMinBlocksToFuse() { return 4; }

function findFusionGroups(board, level) {
  const minBlocks = getMinBlocksToFuse(level);
  const groups = [];
  const processed = new Set();

  for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
    for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
      const block = board[y]?.[x];
      if (!block) continue;
      if (block.specialType === 'stone') continue;

      const key = `${x},${y}`;
      if (processed.has(key)) continue;

      const connected = [];
      const visited = new Set();
      const queue = [[x, y]];

      while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        const cellKey = `${cx},${cy}`;

        if (visited.has(cellKey)) continue;
        if (cx < 0 || cx >= BOARD_CONFIG.COLUMNS) continue;
        if (cy < 0 || cy >= BOARD_CONFIG.ROWS) continue;

        const cellBlock = board[cy]?.[cx];
        if (!cellBlock) continue;
        if (cellBlock.specialType === 'stone') continue;

        const colorMatches =
          cellBlock.color === block.color ||
          cellBlock.color === 'rainbow' ||
          block.color === 'rainbow';

        if (!colorMatches) continue;

        visited.add(cellKey);
        connected.push({ ...cellBlock, x: cx, y: cy });

        queue.push([cx - 1, cy]);
        queue.push([cx + 1, cy]);
        queue.push([cx, cy - 1]);
        queue.push([cx, cy + 1]);
      }

      if (connected.length >= minBlocks) {
        groups.push(connected);
        connected.forEach((b) => processed.add(`${b.x},${b.y}`));
      }
    }
  }

  return groups;
}

// 테스트 보드 생성 (16x8)
function createTestBoard() {
  const board = Array(16).fill(null).map(() => Array(8).fill(null));
  
  // 세로로 4개 노란색 블록 (x=1, y=12~15)
  board[12][1] = { color: 'yellow', specialType: 'normal', x: 1, y: 12 };
  board[13][1] = { color: 'yellow', specialType: 'normal', x: 1, y: 13 };
  board[14][1] = { color: 'yellow', specialType: 'normal', x: 1, y: 14 };
  board[15][1] = { color: 'yellow', specialType: 'normal', x: 1, y: 15 };
  
  // 다른 색 블록들
  board[15][0] = { color: 'red', specialType: 'normal', x: 0, y: 15 };
  board[15][2] = { color: 'blue', specialType: 'normal', x: 2, y: 15 };
  
  return board;
}

// 테스트 실행
const board = createTestBoard();
console.log('=== 테스트 보드 ===');
for (let y = 10; y < 16; y++) {
  let row = `y=${y}: `;
  for (let x = 0; x < 8; x++) {
    const block = board[y][x];
    row += block ? block.color[0].toUpperCase() : '.';
  }
  console.log(row);
}

console.log('\n=== 융합 그룹 찾기 (레벨 10) ===');
const groups = findFusionGroups(board, 10);
console.log('찾은 그룹 수:', groups.length);
groups.forEach((group, i) => {
  console.log(`그룹 ${i+1}: ${group.length}개 블록, 색상: ${group[0].color}`);
  group.forEach(b => console.log(`  - (${b.x}, ${b.y})`));
});

if (groups.length === 0) {
  console.log('❌ 테스트 실패: 4개 연결된 노란색 블록을 찾지 못함');
  process.exit(1);
} else if (groups[0].length >= 4) {
  console.log('✅ 테스트 성공: 4개 이상 연결된 블록 그룹을 찾음');
}
