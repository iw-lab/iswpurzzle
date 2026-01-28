import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useUserStore } from '../stores/userStore';
import { Block, BlockColor, GameBoard, FusionResult, SpecialBlockType, SpecialEffect } from '../types';
import {
  BOARD_CONFIG,
  TIMING_CONFIG,
  FUSION_CONFIG,
  calculateScore,
  getDropSpeed,
  GRAVITY_VECTORS,
  getColorsForLevel,
  getMinBlocksToFuse,
} from '../constants';

// 융합 가능한 블록 그룹 찾기 - 배열 인덱스만 사용 (블록 내부 좌표 무시)
function findFusionGroups(board: GameBoard, level: number): Block[][] {
  const minBlocks = getMinBlocksToFuse(level);
  const groups: Block[][] = [];
  const globalVisited = new Set<string>();

  // 모든 셀을 순회
  for (let startY = 0; startY < BOARD_CONFIG.ROWS; startY++) {
    for (let startX = 0; startX < BOARD_CONFIG.COLUMNS; startX++) {
      const startKey = `${startX},${startY}`;

      // 이미 처리된 위치는 건너뜀
      if (globalVisited.has(startKey)) continue;

      const startBlock = board[startY]?.[startX];
      if (!startBlock) continue;
      if (startBlock.specialType === 'stone') continue;

      // rainbow 블록은 시작점으로 사용하지 않음 (다른 색에 의해 포함됨)
      if (startBlock.color === 'rainbow') continue;

      const targetColor = startBlock.color;

      // BFS로 연결된 같은 색 블록 찾기
      const connected: Block[] = [];
      const localVisited = new Set<string>();
      const queue: [number, number][] = [[startX, startY]];

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        const cellKey = `${cx},${cy}`;

        // 이미 방문한 셀은 건너뜀
        if (localVisited.has(cellKey)) continue;

        // 범위 체크
        if (cx < 0 || cx >= BOARD_CONFIG.COLUMNS) continue;
        if (cy < 0 || cy >= BOARD_CONFIG.ROWS) continue;

        // 블록 가져오기 (배열 인덱스로 직접 접근)
        const block = board[cy]?.[cx];
        if (!block) continue;
        if (block.specialType === 'stone') continue;

        // 색상 매칭 체크
        const isMatch = block.color === targetColor || block.color === 'rainbow';
        if (!isMatch) continue;

        // 방문 표시
        localVisited.add(cellKey);

        // 연결된 블록 추가 (좌표는 배열 인덱스로 강제 설정)
        connected.push({
          ...block,
          x: cx,
          y: cy,
        });

        // 상하좌우 탐색
        queue.push([cx - 1, cy]);
        queue.push([cx + 1, cy]);
        queue.push([cx, cy - 1]);
        queue.push([cx, cy + 1]);
      }

      // 4개 이상 연결되면 그룹에 추가
      if (connected.length >= minBlocks) {
        groups.push(connected);
        // 전역 방문 표시 (다른 시작점에서 중복 검색 방지)
        localVisited.forEach(k => globalVisited.add(k));
      }
    }
  }

  return groups;
}

// 블록 제거 및 낙하 처리
function applyGravity(
  board: GameBoard,
  gravityDirection: 'down' | 'up' | 'left' | 'right'
): GameBoard {
  const newBoard: GameBoard = Array(BOARD_CONFIG.ROWS)
    .fill(null)
    .map(() => Array(BOARD_CONFIG.COLUMNS).fill(null));

  if (gravityDirection === 'down') {
    // 아래로 중력: 각 열에서 아래로 압축
    for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
      let writeY = BOARD_CONFIG.ROWS - 1;
      for (let y = BOARD_CONFIG.ROWS - 1; y >= 0; y--) {
        if (board[y][x]) {
          newBoard[writeY][x] = { ...board[y][x]!, x: x, y: writeY };
          writeY--;
        }
      }
    }
  } else if (gravityDirection === 'up') {
    // 위로 중력: 각 열에서 위로 압축
    for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
      let writeY = 0;
      for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
        if (board[y][x]) {
          newBoard[writeY][x] = { ...board[y][x]!, x: x, y: writeY };
          writeY++;
        }
      }
    }
  } else if (gravityDirection === 'left') {
    // 왼쪽으로 중력: 각 행에서 왼쪽으로 압축
    for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
      let writeX = 0;
      for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
        if (board[y][x]) {
          newBoard[y][writeX] = { ...board[y][x]!, x: writeX, y: y };
          writeX++;
        }
      }
    }
  } else if (gravityDirection === 'right') {
    // 오른쪽으로 중력: 각 행에서 오른쪽으로 압축
    for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
      let writeX = BOARD_CONFIG.COLUMNS - 1;
      for (let x = BOARD_CONFIG.COLUMNS - 1; x >= 0; x--) {
        if (board[y][x]) {
          newBoard[y][writeX] = { ...board[y][x]!, x: writeX, y: y };
          writeX--;
        }
      }
    }
  }

  return newBoard;
}

// 보드가 비어있는지 확인
function isBoardEmpty(board: GameBoard): boolean {
  for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
    for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
      if (board[y][x]) return false;
    }
  }
  return true;
}

// 특수 블록 효과 처리
function processSpecialBlockEffects(
  board: GameBoard,
  clearedBlocks: Block[],
  level: number
): { additionalCleared: Block[]; newBoard: GameBoard; effects: SpecialEffect[] } {
  const newBoard = board.map(row => [...row]);
  const additionalCleared: Block[] = [];
  const effects: SpecialEffect[] = [];
  const processedPositions = new Set<string>();

  // 클리어된 블록 중 특수 블록 찾기
  for (const block of clearedBlocks) {
    if (block.specialType === 'normal') continue;

    const key = `${block.x},${block.y}`;
    if (processedPositions.has(key)) continue;
    processedPositions.add(key);

    const affectedBlocks: { x: number; y: number }[] = [];

    switch (block.specialType) {
      case 'bomb': {
        // 3x3 폭발
        for (let dy = -FUSION_CONFIG.BOMB_RADIUS; dy <= FUSION_CONFIG.BOMB_RADIUS; dy++) {
          for (let dx = -FUSION_CONFIG.BOMB_RADIUS; dx <= FUSION_CONFIG.BOMB_RADIUS; dx++) {
            const nx = block.x + dx;
            const ny = block.y + dy;
            if (nx >= 0 && nx < BOARD_CONFIG.COLUMNS && ny >= 0 && ny < BOARD_CONFIG.ROWS) {
              const targetBlock = newBoard[ny][nx];
              if (targetBlock && !clearedBlocks.includes(targetBlock)) {
                if (targetBlock.specialType === 'frozen' && (targetBlock.frozenCount || 2) > 1) {
                  newBoard[ny][nx] = { ...targetBlock, frozenCount: (targetBlock.frozenCount || 2) - 1 };
                } else if (targetBlock.specialType !== 'stone') {
                  additionalCleared.push(targetBlock);
                  newBoard[ny][nx] = null;
                } else {
                  // 돌 블록도 폭탄으로 파괴 가능
                  additionalCleared.push(targetBlock);
                  newBoard[ny][nx] = null;
                }
                affectedBlocks.push({ x: nx, y: ny });
              }
            }
          }
        }
        break;
      }

      case 'lightning': {
        // 같은 색 전체 제거
        for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
          for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
            const targetBlock = newBoard[y][x];
            if (targetBlock && targetBlock.color === block.color && !clearedBlocks.includes(targetBlock)) {
              if (targetBlock.specialType === 'frozen' && (targetBlock.frozenCount || 2) > 1) {
                newBoard[y][x] = { ...targetBlock, frozenCount: (targetBlock.frozenCount || 2) - 1 };
              } else if (targetBlock.specialType !== 'stone') {
                additionalCleared.push(targetBlock);
                newBoard[y][x] = null;
              }
              affectedBlocks.push({ x, y });
            }
          }
        }
        break;
      }

      case 'cross': {
        // 십자가 형태 제거 (가로 + 세로)
        // 가로줄
        for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
          const targetBlock = newBoard[block.y][x];
          if (targetBlock && !clearedBlocks.includes(targetBlock)) {
            if (targetBlock.specialType === 'frozen' && (targetBlock.frozenCount || 2) > 1) {
              newBoard[block.y][x] = { ...targetBlock, frozenCount: (targetBlock.frozenCount || 2) - 1 };
            } else if (targetBlock.specialType !== 'stone') {
              additionalCleared.push(targetBlock);
              newBoard[block.y][x] = null;
            }
            affectedBlocks.push({ x, y: block.y });
          }
        }
        // 세로줄
        for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
          const targetBlock = newBoard[y][block.x];
          if (targetBlock && !clearedBlocks.includes(targetBlock)) {
            if (targetBlock.specialType === 'frozen' && (targetBlock.frozenCount || 2) > 1) {
              newBoard[y][block.x] = { ...targetBlock, frozenCount: (targetBlock.frozenCount || 2) - 1 };
            } else if (targetBlock.specialType !== 'stone') {
              additionalCleared.push(targetBlock);
              newBoard[y][block.x] = null;
            }
            affectedBlocks.push({ x: block.x, y });
          }
        }
        break;
      }

      case 'colorShift': {
        // 주변 3x3 블록을 같은 색으로 변환
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = block.x + dx;
            const ny = block.y + dy;
            if (nx >= 0 && nx < BOARD_CONFIG.COLUMNS && ny >= 0 && ny < BOARD_CONFIG.ROWS) {
              const targetBlock = newBoard[ny][nx];
              if (targetBlock && targetBlock.specialType !== 'stone' && targetBlock.specialType !== 'frozen') {
                newBoard[ny][nx] = { ...targetBlock, color: block.color };
                affectedBlocks.push({ x: nx, y: ny });
              }
            }
          }
        }
        break;
      }

      case 'shuffle': {
        // 주변 3x3 블록 색상 랜덤 섞기
        const colors = getColorsForLevel(level);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = block.x + dx;
            const ny = block.y + dy;
            if (nx >= 0 && nx < BOARD_CONFIG.COLUMNS && ny >= 0 && ny < BOARD_CONFIG.ROWS) {
              const targetBlock = newBoard[ny][nx];
              if (targetBlock && targetBlock.specialType !== 'stone' && targetBlock.specialType !== 'frozen') {
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                newBoard[ny][nx] = { ...targetBlock, color: randomColor };
                affectedBlocks.push({ x: nx, y: ny });
              }
            }
          }
        }
        break;
      }
    }

    if (affectedBlocks.length > 0) {
      effects.push({
        type: block.specialType,
        x: block.x,
        y: block.y,
        affectedBlocks,
      });
    }
  }

  return { additionalCleared, newBoard, effects };
}

// 돌 블록 주변 클리어 처리
function processStoneBlocks(
  board: GameBoard,
  clearedBlocks: Block[]
): { destroyedStones: Block[]; newBoard: GameBoard } {
  const newBoard = board.map(row => [...row]);
  const destroyedStones: Block[] = [];
  const clearedPositions = new Set(clearedBlocks.map(b => `${b.x},${b.y}`));

  for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
    for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
      const block = newBoard[y][x];
      if (block?.specialType === 'stone') {
        // 인접한 위치에 클리어된 블록이 있는지 확인
        const adjacentPositions = [
          `${x-1},${y}`, `${x+1},${y}`,
          `${x},${y-1}`, `${x},${y+1}`
        ];

        const hasAdjacentClear = adjacentPositions.some(pos => clearedPositions.has(pos));
        if (hasAdjacentClear) {
          destroyedStones.push(block);
          newBoard[y][x] = null;
        }
      }
    }
  }

  return { destroyedStones, newBoard };
}

// 얼음 블록 처리 (융합 그룹에서)
function processFrozenBlocks(blocks: Block[], board: GameBoard): {
  blocksToRemove: Block[];
  updatedBoard: GameBoard;
} {
  const newBoard = board.map(row => [...row]);
  const blocksToRemove: Block[] = [];

  for (const block of blocks) {
    // 좌표 유효성 검증
    if (block.y < 0 || block.y >= BOARD_CONFIG.ROWS ||
        block.x < 0 || block.x >= BOARD_CONFIG.COLUMNS ||
        !newBoard[block.y]) {
      console.warn('[processFrozenBlocks] Invalid block coordinates:', block.x, block.y);
      continue;
    }

    if (block.specialType === 'frozen') {
      const currentCount = block.frozenCount || 2;
      if (currentCount > 1) {
        // 아직 완전히 해동되지 않음 - 카운트만 감소
        newBoard[block.y][block.x] = { ...block, frozenCount: currentCount - 1 };
      } else {
        // 완전 해동 - 제거
        blocksToRemove.push(block);
      }
    } else {
      blocksToRemove.push(block);
    }
  }

  return { blocksToRemove, updatedBoard: newBoard };
}

export function useGameLogic() {
  const {
    board,
    currentBlock,
    currentBlocks,
    gameStatus,
    level,
    combo,
    chainCount,
    gravityDirection,
    activePowerUp,
    updateBoard,
    addScore,
    incrementCombo,
    resetCombo,
    incrementChain,
    resetChain,
    spawnBlock,
    softDrop,
    updateStatistics,
    updateMissionProgress,
    updateLevelObjective,
    checkPuzzleComplete,
    gameMode,
    statistics,
  } = useGameStore();

  const { updateAchievement, addBattlePassXP } = useUserStore();

  const [isProcessingFusion, setIsProcessingFusion] = useState(false);
  const [fusionEffects, setFusionEffects] = useState<{ x: number; y: number; color: string }[]>([]);
  const [chainEffects, setChainEffects] = useState<number>(0);
  const [specialEffects, setSpecialEffects] = useState<SpecialEffect[]>([]);

  const dropIntervalRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<number | null>(null);
  const lastDropTimeRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);
  const lastBlockCountRef = useRef<number>(0);
  const boardVersionRef = useRef<number>(0);

  // 낙하 속도 계산
  const dropSpeed = activePowerUp?.type === 'timeSlow'
    ? getDropSpeed(level) * 2
    : getDropSpeed(level);

  // 융합 처리 (보드를 인자로 받음) - 특수 블록 효과 포함
  const processFusion = useCallback(async (currentBoard: GameBoard): Promise<{ result: FusionResult | null; newBoard: GameBoard }> => {
    const groups = findFusionGroups(currentBoard, level);

    console.log('[ProcessFusion] Found', groups.length, 'fusion groups');
    if (groups.length > 0) {
      groups.forEach((group, idx) => {
        console.log(`[ProcessFusion] Group ${idx}: ${group.length} blocks, color: ${group[0]?.color}, positions:`,
          group.map(b => `(${b.x},${b.y})`).join(', '));
      });
    }

    if (groups.length === 0) {
      return { result: null, newBoard: currentBoard };
    }

    let totalCleared = 0;
    let specialBlocksCleared = 0;
    const effects: { x: number; y: number; color: string }[] = [];
    const allSpecialEffects: SpecialEffect[] = [];
    let hasMultiplierBlock = false;

    // 먼저 얼음 블록 처리
    let workingBoard = currentBoard.map((row) => [...row]);

    // 모든 그룹의 블록을 합치되, 중복 제거 (좌표 기준)
    const allBlocks = groups.flat();
    const uniqueBlocksMap = new Map<string, Block>();
    for (const block of allBlocks) {
      const key = `${block.x},${block.y}`;
      if (!uniqueBlocksMap.has(key)) {
        uniqueBlocksMap.set(key, block);
      }
    }
    const uniqueBlocks = Array.from(uniqueBlocksMap.values());

    console.log('[ProcessFusion] Unique blocks to process:', uniqueBlocks.length);

    // 얼음 블록 필터링
    const { blocksToRemove, updatedBoard } = processFrozenBlocks(uniqueBlocks, workingBoard);
    workingBoard = updatedBoard;

    // 이미 제거된 위치 추적
    const removedPositions = new Set<string>();

    // 실제로 제거될 블록들
    for (const block of blocksToRemove) {
      const posKey = `${block.x},${block.y}`;

      // 이미 제거된 위치는 건너뜀
      if (removedPositions.has(posKey)) continue;

      // 안전한 좌표 검증
      if (block.y >= 0 && block.y < BOARD_CONFIG.ROWS &&
          block.x >= 0 && block.x < BOARD_CONFIG.COLUMNS &&
          workingBoard[block.y] &&
          workingBoard[block.y][block.x] !== null) {
        effects.push({ x: block.x, y: block.y, color: block.color });
        workingBoard[block.y][block.x] = null;
        removedPositions.add(posKey);
        totalCleared++;

        // 특수 블록 카운트
        if (block.specialType !== 'normal') {
          specialBlocksCleared++;
          if (block.specialType === 'multiplier') {
            hasMultiplierBlock = true;
          }
        }
      }
    }

    console.log('[ProcessFusion] Actually cleared:', totalCleared, 'blocks');

    setFusionEffects(effects);

    // 특수 블록 효과 처리
    const specialResult = processSpecialBlockEffects(workingBoard, blocksToRemove, level);
    workingBoard = specialResult.newBoard;
    totalCleared += specialResult.additionalCleared.length;
    allSpecialEffects.push(...specialResult.effects);

    // 추가로 클리어된 블록들의 효과도 표시
    for (const block of specialResult.additionalCleared) {
      effects.push({ x: block.x, y: block.y, color: block.color });
      if (block.specialType !== 'normal') {
        specialBlocksCleared++;
      }
    }

    // 돌 블록 처리
    const stoneResult = processStoneBlocks(workingBoard, [...blocksToRemove, ...specialResult.additionalCleared]);
    workingBoard = stoneResult.newBoard;
    totalCleared += stoneResult.destroyedStones.length;

    for (const stone of stoneResult.destroyedStones) {
      effects.push({ x: stone.x, y: stone.y, color: stone.color });
      specialBlocksCleared++;
    }

    // 특수 효과 표시
    if (allSpecialEffects.length > 0) {
      setSpecialEffects(allSpecialEffects);
    }

    // 점수 계산
    const isPerfectClear = isBoardEmpty(workingBoard);
    const powerUpMultiplier = (activePowerUp?.type === 'scoreMultiplier' ? 2 : 1) * (hasMultiplierBlock ? 2 : 1);
    const currentChainCount = useGameStore.getState().chainCount;
    const currentCombo = useGameStore.getState().combo;
    const isFeverMode = useGameStore.getState().isFeverMode;

    const score = calculateScore({
      blocksCleared: totalCleared,
      chainCount: currentChainCount + 1,
      comboCount: currentCombo,
      level,
      powerUpMultiplier,
      perfectClear: isPerfectClear,
      isFeverMode,
      specialBlocksCleared,
    });

    // 피버 게이지 추가
    const addFeverGauge = useGameStore.getState().addFeverGauge;
    if (addFeverGauge) {
      addFeverGauge(totalCleared * 3 + (currentChainCount + 1) * 10);
    }

    // 잠시 대기 후 중력 적용
    await new Promise((resolve) => setTimeout(resolve, TIMING_CONFIG.FUSION_ANIMATION_DURATION));

    // 특수 효과가 있으면 추가 대기
    if (allSpecialEffects.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, TIMING_CONFIG.SPECIAL_EFFECT_DURATION));
    }

    // 중력 적용
    const gravityAppliedBoard = applyGravity(workingBoard, gravityDirection);

    setFusionEffects([]);
    setSpecialEffects([]);

    return {
      result: {
        clearedBlocks: [...blocksToRemove, ...specialResult.additionalCleared, ...stoneResult.destroyedStones],
        score,
        chainCount: currentChainCount + 1,
        isChainReaction: currentChainCount > 0,
        specialEffects: allSpecialEffects,
      },
      newBoard: gravityAppliedBoard,
    };
  }, [level, gravityDirection, activePowerUp]);

  // 연쇄 반응 처리
  const processChainReaction = useCallback(async () => {
    // 동기적으로 플래그 체크 및 설정 (레이스 컨디션 방지)
    if (processingRef.current) {
      console.log('[ChainReaction] Skipped - already processing');
      return;
    }

    // 즉시 플래그 설정 (다른 호출 차단)
    processingRef.current = true;
    setIsProcessingFusion(true);

    // 약간의 딜레이로 보드 상태가 완전히 업데이트되도록 보장
    await new Promise(resolve => setTimeout(resolve, 20));

    console.log('[ChainReaction] ===== STARTED =====');

    try {
      let totalScore = 0;
      let totalCleared = 0;
      let currentChain = 0;

      // 최신 보드 상태 가져오기 (딜레이 후)
      let workingBoard = useGameStore.getState().board;

      // 디버그: 현재 보드 상태 로깅
      let blockCount = 0;
      const colorCounts: Record<string, number> = {};
      for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
        for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
          const block = workingBoard[y]?.[x];
          if (block) {
            blockCount++;
            colorCounts[block.color] = (colorCounts[block.color] || 0) + 1;
          }
        }
      }
      console.log('[ChainReaction] Board has', blockCount, 'blocks');
      console.log('[ChainReaction] Color distribution:', colorCounts);

      resetChain();

      // 연쇄 반응 루프
      let loopCount = 0;
      const maxLoops = 100; // 무한 루프 방지

      while (loopCount < maxLoops) {
        loopCount++;
        const { result, newBoard } = await processFusion(workingBoard);

        if (!result) {
          console.log('[ChainReaction] No more fusions found after', loopCount, 'iterations');
          break;
        }

        workingBoard = newBoard;
        updateBoard(workingBoard);

        currentChain++;
        totalScore += result.score;
        totalCleared += result.clearedBlocks.length;

        incrementChain();
        setChainEffects(currentChain);

        // 연쇄 딜레이
        await new Promise((resolve) => setTimeout(resolve, TIMING_CONFIG.CHAIN_DELAY));
      }

      if (totalScore > 0) {
        addScore(totalScore);
        incrementCombo();

        // 통계 업데이트
        updateStatistics({
          totalBlocksCleared: statistics.totalBlocksCleared + totalCleared,
          totalFusions: statistics.totalFusions + 1,
          maxChain: Math.max(statistics.maxChain, currentChain),
        });

        // 미션 업데이트
        updateMissionProgress('blocks_fused', totalCleared);
        if (currentChain >= 5) {
          updateMissionProgress('chain', 1);
        }

        // 퍼즐 모드 목표 업데이트
        const currentMode = useGameStore.getState().gameMode;
        if (currentMode === 'puzzle') {
          const state = useGameStore.getState();

          // 점수 목표 - 현재 점수 + 이번 점수로 설정 (누적이므로 이번 점수만 더함)
          updateLevelObjective('score', totalScore);

          // 블록 클리어 목표
          updateLevelObjective('clearBlocks', totalCleared);

          // 연쇄 목표 (최대 연쇄만 기록)
          if (currentChain > 0) {
            const currentObjective = state.levelObjectives.find(o => o.type === 'chains');
            if (currentObjective && currentChain > currentObjective.current) {
              // 기존값과 차이만큼만 업데이트
              updateLevelObjective('chains', currentChain - currentObjective.current);
            }
          }

          // 퍼즐 완료 체크
          setTimeout(() => {
            useGameStore.getState().checkPuzzleComplete();
          }, 100);
        }

        // 업적 업데이트
        updateAchievement('chain_5', currentChain);
        updateAchievement('chain_10', currentChain);
        updateAchievement('chain_15', currentChain);
        updateAchievement('chain_20', currentChain);

        // 배틀패스 XP
        addBattlePassXP(Math.floor(totalScore / 100));

        // 콤보 타임아웃 설정
        if (comboTimeoutRef.current) {
          clearTimeout(comboTimeoutRef.current);
        }

        comboTimeoutRef.current = window.setTimeout(() => {
          resetCombo();
        }, TIMING_CONFIG.COMBO_TIMEOUT);
      }
    } catch (error) {
      console.error('[ChainReaction] ERROR:', error);
    } finally {
      // 항상 실행 - 에러가 발생해도 플래그 리셋
      console.log('[ChainReaction] ===== FINISHED =====');
      setChainEffects(0);
      setIsProcessingFusion(false);

      // 플래그 리셋 전 잠시 대기 (다른 체크가 끼어들지 않도록)
      await new Promise(resolve => setTimeout(resolve, 30));
      processingRef.current = false;

      // 새 블록 생성 (현재 블록이 없을 때만)
      const state = useGameStore.getState();
      if (state.gameStatus === 'playing' && state.currentBlocks.length === 0) {
        console.log('[ChainReaction] Spawning new block after chain reaction');
        spawnBlock();
      }
    }
  }, [
    processFusion,
    addScore,
    incrementCombo,
    resetCombo,
    incrementChain,
    resetChain,
    spawnBlock,
    updateBoard,
    statistics,
    updateStatistics,
    updateMissionProgress,
    updateLevelObjective,
    updateAchievement,
    addBattlePassXP,
  ]);

  // 블록이 배치되었을 때 처리 (다중 블록 지원)
  useEffect(() => {
    const prevCount = lastBlockCountRef.current;
    const currCount = currentBlocks.length;
    lastBlockCountRef.current = currCount;

    // 블록이 있다가 0이 되면 (모든 블록 배치됨) 융합 체크
    if (prevCount > 0 && currCount === 0 && gameStatus === 'playing') {
      // 약간의 딜레이 후 융합 체크 (보드 상태가 완전히 반영되도록)
      const checkTimeout = setTimeout(() => {
        if (processingRef.current) {
          console.log('[BlockPlaced] Skipped - already processing');
          return;
        }
        console.log('[BlockPlaced] Blocks placed, checking for fusions...');

        // 현재 보드 상태 확인
        const state = useGameStore.getState();
        const groups = findFusionGroups(state.board, state.level);

        if (groups.length > 0) {
          console.log('[BlockPlaced] Found', groups.length, 'fusion groups!');
          processChainReaction();
        } else {
          console.log('[BlockPlaced] No fusion groups found, spawning new block');
          // 융합할 그룹이 없으면 새 블록 스폰
          spawnBlock();
        }
      }, 30);

      return () => clearTimeout(checkTimeout);
    }
  }, [currentBlocks.length, gameStatus, processChainReaction, spawnBlock]);

  // 보드 변경 시 추가 융합 체크 (안전장치) - 더 긴 딜레이로 안정성 확보
  useEffect(() => {
    boardVersionRef.current++;
    const currentVersion = boardVersionRef.current;

    // 게임 중이고, 현재 블록이 없고, 처리 중이 아닐 때만
    if (gameStatus === 'playing' && currentBlocks.length === 0 && !processingRef.current) {
      // 보드에 융합 가능한 블록이 있는지 확인
      const checkForFusions = () => {
        // 버전 체크로 오래된 호출 무시
        if (boardVersionRef.current !== currentVersion) {
          console.log('[BoardCheck] Skipped - board version changed');
          return;
        }
        if (processingRef.current) {
          console.log('[BoardCheck] Skipped - already processing');
          return;
        }

        const state = useGameStore.getState();
        if (state.currentBlocks.length > 0) {
          console.log('[BoardCheck] Skipped - has falling blocks');
          return;
        }

        const groups = findFusionGroups(state.board, level);

        if (groups.length > 0) {
          console.log('[BoardCheck] Found', groups.length, 'fusion groups, starting chain reaction');
          processChainReaction();
        }
      };

      // 더 긴 딜레이로 다른 상태 업데이트와 충돌 방지
      const timeoutId = setTimeout(checkForFusions, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [board, gameStatus, currentBlocks.length, level, processChainReaction]);

  // 게임 루프 (자동 낙하) - 다중 블록 지원 + 주기적 융합 체크
  useEffect(() => {
    if (gameStatus !== 'playing' || isProcessingFusion) {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current);
        dropIntervalRef.current = null;
      }
      return;
    }

    lastDropTimeRef.current = Date.now();
    let lastFusionCheck = Date.now();

    const gameLoop = () => {
      const now = Date.now();
      const currentState = useGameStore.getState();

      // 현재 블록들이 있고, 융합 처리 중이 아닐 때만 낙하
      if (currentState.currentBlocks.length > 0 && !processingRef.current) {
        if (now - lastDropTimeRef.current >= dropSpeed) {
          currentState.softDrop();
          lastDropTimeRef.current = now;
        }
      }

      // 주기적 융합 체크 (200ms마다) - 현재 블록이 없을 때만!
      // 현재 블록이 떨어지는 중에는 체크하지 않음 (배치 후에만 체크)
      if (now - lastFusionCheck >= 200 && !processingRef.current && currentState.currentBlocks.length === 0) {
        lastFusionCheck = now;

        const groups = findFusionGroups(currentState.board, currentState.level);
        if (groups.length > 0) {
          console.log('[Fusion] Periodic check found fusion groups:', groups.length);
          processChainReaction();
        }
      }
    };

    dropIntervalRef.current = window.setInterval(gameLoop, 50);

    return () => {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current);
        dropIntervalRef.current = null;
      }
    };
  }, [gameStatus, dropSpeed, isProcessingFusion, processChainReaction]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current);
      }
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };
  }, []);

  // 고스트 블록 위치 계산 (모든 블록이 함께 떨어질 수 있는 거리로 계산)
  const getGhostPosition = useCallback(() => {
    if (currentBlocks.length === 0) return null;

    const { dx, dy } = GRAVITY_VECTORS[gravityDirection];

    // 모든 블록이 함께 떨어질 수 있는 최대 거리 계산
    let maxDropDistance = Infinity;

    for (const block of currentBlocks) {
      let distance = 0;
      let testX = block.x;
      let testY = block.y;

      while (true) {
        const nextX = testX + dx;
        const nextY = testY + dy;

        if (nextX < 0 || nextX >= BOARD_CONFIG.COLUMNS) break;
        if (nextY < 0 || nextY >= BOARD_CONFIG.ROWS) break;
        if (board[nextY]?.[nextX] !== null) break;

        distance++;
        testX = nextX;
        testY = nextY;
      }

      maxDropDistance = Math.min(maxDropDistance, distance);
    }

    // 첫 번째 블록 기준으로 고스트 위치 반환
    const firstBlock = currentBlocks[0];
    return {
      x: firstBlock.x + dx * maxDropDistance,
      y: firstBlock.y + dy * maxDropDistance,
    };
  }, [currentBlocks, board, gravityDirection]);

  return {
    isProcessingFusion,
    fusionEffects,
    chainEffects,
    specialEffects,
    getGhostPosition,
    dropSpeed,
  };
}
