import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useUserStore } from '../stores/userStore';
import { Block, BlockColor, GameBoard, FusionResult } from '../types';
import {
  BOARD_CONFIG,
  TIMING_CONFIG,
  FUSION_CONFIG,
  calculateScore,
  getDropSpeed,
  GRAVITY_VECTORS,
} from '../constants';

// BFS로 연결된 같은 색 블록 찾기
function findConnectedBlocks(
  board: GameBoard,
  startX: number,
  startY: number,
  targetColor: BlockColor
): Block[] {
  const connected: Block[] = [];
  const visited = new Set<string>();
  const queue: [number, number][] = [[startX, startY]];

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = `${x},${y}`;

    if (visited.has(key)) continue;
    if (x < 0 || x >= BOARD_CONFIG.COLUMNS) continue;
    if (y < 0 || y >= BOARD_CONFIG.ROWS) continue;

    const block = board[y][x];
    if (!block) continue;
    if (block.color !== targetColor && block.color !== 'rainbow' && targetColor !== 'rainbow') continue;

    visited.add(key);
    connected.push(block);

    // 상하좌우 탐색
    queue.push([x - 1, y]);
    queue.push([x + 1, y]);
    queue.push([x, y - 1]);
    queue.push([x, y + 1]);
  }

  return connected;
}

// 융합 가능한 블록 그룹 찾기
function findFusionGroups(board: GameBoard): Block[][] {
  const groups: Block[][] = [];
  const processed = new Set<string>();

  for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
    for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
      const block = board[y][x];
      if (!block) continue;

      const key = `${x},${y}`;
      if (processed.has(key)) continue;

      const connected = findConnectedBlocks(board, x, y, block.color);

      if (connected.length >= FUSION_CONFIG.MIN_BLOCKS_TO_FUSE) {
        groups.push(connected);
        connected.forEach((b) => processed.add(`${b.x},${b.y}`));
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
          newBoard[writeY][x] = { ...board[y][x]!, y: writeY };
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
          newBoard[writeY][x] = { ...board[y][x]!, y: writeY };
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
          newBoard[y][writeX] = { ...board[y][x]!, x: writeX };
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
          newBoard[y][writeX] = { ...board[y][x]!, x: writeX };
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

export function useGameLogic() {
  const {
    board,
    currentBlock,
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
    statistics,
  } = useGameStore();

  const { updateAchievement, addBattlePassXP } = useUserStore();

  const [isProcessingFusion, setIsProcessingFusion] = useState(false);
  const [fusionEffects, setFusionEffects] = useState<{ x: number; y: number; color: string }[]>([]);
  const [chainEffects, setChainEffects] = useState<number>(0);

  const dropIntervalRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<number | null>(null);
  const lastDropTimeRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);
  const lastBlockPlacedRef = useRef<boolean>(false);

  // 낙하 속도 계산
  const dropSpeed = activePowerUp?.type === 'timeSlow'
    ? getDropSpeed(level) * 2
    : getDropSpeed(level);

  // 융합 처리 (보드를 인자로 받음)
  const processFusion = useCallback(async (currentBoard: GameBoard): Promise<{ result: FusionResult | null; newBoard: GameBoard }> => {
    const groups = findFusionGroups(currentBoard);

    if (groups.length === 0) {
      return { result: null, newBoard: currentBoard };
    }

    let totalCleared = 0;
    const effects: { x: number; y: number; color: string }[] = [];

    // 융합 그룹 처리
    const newBoard = currentBoard.map((row) => [...row]);

    for (const group of groups) {
      for (const block of group) {
        effects.push({ x: block.x, y: block.y, color: block.color });
        newBoard[block.y][block.x] = null;
        totalCleared++;
      }
    }

    setFusionEffects(effects);

    // 점수 계산
    const isPerfectClear = isBoardEmpty(newBoard);
    const powerUpMultiplier = activePowerUp?.type === 'scoreMultiplier' ? 2 : 1;
    const currentChainCount = useGameStore.getState().chainCount;
    const currentCombo = useGameStore.getState().combo;

    const score = calculateScore({
      blocksCleared: totalCleared,
      chainCount: currentChainCount + 1,
      comboCount: currentCombo,
      level,
      powerUpMultiplier,
      perfectClear: isPerfectClear,
    });

    // 잠시 대기 후 중력 적용
    await new Promise((resolve) => setTimeout(resolve, TIMING_CONFIG.FUSION_ANIMATION_DURATION));

    // 중력 적용
    const gravityAppliedBoard = applyGravity(newBoard, gravityDirection);

    setFusionEffects([]);

    return {
      result: {
        clearedBlocks: groups.flat(),
        score,
        chainCount: currentChainCount + 1,
        isChainReaction: currentChainCount > 0,
      },
      newBoard: gravityAppliedBoard,
    };
  }, [level, gravityDirection, activePowerUp]);

  // 연쇄 반응 처리
  const processChainReaction = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessingFusion(true);

    let totalScore = 0;
    let totalCleared = 0;
    let currentChain = 0;
    let workingBoard = useGameStore.getState().board;

    resetChain();

    // 연쇄 반응 루프
    while (true) {
      const { result, newBoard } = await processFusion(workingBoard);

      if (!result) break;

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

    setChainEffects(0);
    setIsProcessingFusion(false);
    processingRef.current = false;

    // 새 블록 생성
    const currentGameStatus = useGameStore.getState().gameStatus;
    if (currentGameStatus === 'playing') {
      setTimeout(() => {
        spawnBlock();
      }, 50);
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
    updateAchievement,
    addBattlePassXP,
  ]);

  // 블록이 배치되었을 때 처리
  useEffect(() => {
    // currentBlock이 있다가 null이 되면 (배치됨) 융합 체크
    if (currentBlock) {
      lastBlockPlacedRef.current = true;
    } else if (lastBlockPlacedRef.current && gameStatus === 'playing' && !processingRef.current) {
      lastBlockPlacedRef.current = false;
      processChainReaction();
    }
  }, [currentBlock, gameStatus, processChainReaction]);

  // 게임 루프 (자동 낙하) - softDrop을 직접 참조하지 않음
  useEffect(() => {
    if (gameStatus !== 'playing' || isProcessingFusion) {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current);
        dropIntervalRef.current = null;
      }
      return;
    }

    lastDropTimeRef.current = Date.now();

    const gameLoop = () => {
      const now = Date.now();
      const currentState = useGameStore.getState();

      // 현재 블록이 있고, 융합 처리 중이 아닐 때만 낙하
      if (currentState.currentBlock && !processingRef.current) {
        if (now - lastDropTimeRef.current >= dropSpeed) {
          currentState.softDrop();
          lastDropTimeRef.current = now;
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
  }, [gameStatus, dropSpeed, isProcessingFusion]);

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

  // 고스트 블록 위치 계산
  const getGhostPosition = useCallback(() => {
    if (!currentBlock) return null;

    const { dx, dy } = GRAVITY_VECTORS[gravityDirection];
    let ghostX = currentBlock.x;
    let ghostY = currentBlock.y;

    while (true) {
      const nextX = ghostX + dx;
      const nextY = ghostY + dy;

      if (nextX < 0 || nextX >= BOARD_CONFIG.COLUMNS) break;
      if (nextY < 0 || nextY >= BOARD_CONFIG.ROWS) break;
      if (board[nextY][nextX] !== null) break;

      ghostX = nextX;
      ghostY = nextY;
    }

    return { x: ghostX, y: ghostY };
  }, [currentBlock, board, gravityDirection]);

  return {
    isProcessingFusion,
    fusionEffects,
    chainEffects,
    getGhostPosition,
    dropSpeed,
  };
}
