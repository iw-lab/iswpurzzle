import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "../stores/gameStore";
import { useUserStore } from "../stores/userStore";
import {
  Block,
  BlockColor,
  GameBoard,
  FusionResult,
  SpecialBlockType,
  SpecialEffect,
} from "../types";
import {
  BOARD_CONFIG,
  TIMING_CONFIG,
  FUSION_CONFIG,
  calculateScore,
  getDropSpeed,
  GRAVITY_VECTORS,
  getColorsForLevel,
} from "../constants";

// 융합 가능한 블록 그룹 찾기 - 항상 4개 이상이면 터짐
function findFusionGroups(board: GameBoard): Block[][] {
  const MIN_BLOCKS = 4;
  const groups: Block[][] = [];
  const globalVisited = new Set<string>();

  for (let startY = 0; startY < BOARD_CONFIG.ROWS; startY++) {
    for (let startX = 0; startX < BOARD_CONFIG.COLUMNS; startX++) {
      const startKey = `${startX},${startY}`;
      if (globalVisited.has(startKey)) continue;

      const startBlock = board[startY]?.[startX];
      if (!startBlock) continue;
      if (startBlock.specialType === "stone") continue;
      if (startBlock.color === "rainbow") continue;

      const targetColor = startBlock.color;

      // BFS로 연결된 같은 색 블록 찾기
      const connected: Block[] = [];
      const localVisited = new Set<string>();
      const queue: [number, number][] = [[startX, startY]];

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        const cellKey = `${cx},${cy}`;

        if (localVisited.has(cellKey)) continue;
        if (cx < 0 || cx >= BOARD_CONFIG.COLUMNS) continue;
        if (cy < 0 || cy >= BOARD_CONFIG.ROWS) continue;

        const block = board[cy]?.[cx];
        if (!block) continue;
        if (block.specialType === "stone") continue;

        const isMatch =
          block.color === targetColor || block.color === "rainbow";
        if (!isMatch) continue;

        localVisited.add(cellKey);
        connected.push({ ...block, x: cx, y: cy });

        // 상하좌우 탐색
        queue.push([cx - 1, cy]);
        queue.push([cx + 1, cy]);
        queue.push([cx, cy - 1]);
        queue.push([cx, cy + 1]);
      }

      if (connected.length >= MIN_BLOCKS) {
        groups.push(connected);
        localVisited.forEach((k) => globalVisited.add(k));
      }
    }
  }

  return groups;
}

// 블록 제거 및 낙하 처리
function applyGravity(
  board: GameBoard,
  gravityDirection: "down" | "up" | "left" | "right",
): GameBoard {
  const newBoard: GameBoard = Array(BOARD_CONFIG.ROWS)
    .fill(null)
    .map(() => Array(BOARD_CONFIG.COLUMNS).fill(null));

  if (gravityDirection === "down") {
    for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
      let writeY = BOARD_CONFIG.ROWS - 1;
      for (let y = BOARD_CONFIG.ROWS - 1; y >= 0; y--) {
        if (board[y][x]) {
          newBoard[writeY][x] = { ...board[y][x]!, x: x, y: writeY };
          writeY--;
        }
      }
    }
  } else if (gravityDirection === "up") {
    for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
      let writeY = 0;
      for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
        if (board[y][x]) {
          newBoard[writeY][x] = { ...board[y][x]!, x: x, y: writeY };
          writeY++;
        }
      }
    }
  } else if (gravityDirection === "left") {
    for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
      let writeX = 0;
      for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
        if (board[y][x]) {
          newBoard[y][writeX] = { ...board[y][x]!, x: writeX, y: y };
          writeX++;
        }
      }
    }
  } else if (gravityDirection === "right") {
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
  level: number,
): {
  additionalCleared: Block[];
  newBoard: GameBoard;
  effects: SpecialEffect[];
} {
  const newBoard = board.map((row) => [...row]);
  const additionalCleared: Block[] = [];
  const effects: SpecialEffect[] = [];
  const processedPositions = new Set<string>();

  for (const block of clearedBlocks) {
    if (block.specialType === "normal") continue;

    const key = `${block.x},${block.y}`;
    if (processedPositions.has(key)) continue;
    processedPositions.add(key);

    const affectedBlocks: { x: number; y: number }[] = [];

    switch (block.specialType) {
      case "bomb": {
        for (
          let dy = -FUSION_CONFIG.BOMB_RADIUS;
          dy <= FUSION_CONFIG.BOMB_RADIUS;
          dy++
        ) {
          for (
            let dx = -FUSION_CONFIG.BOMB_RADIUS;
            dx <= FUSION_CONFIG.BOMB_RADIUS;
            dx++
          ) {
            const nx = block.x + dx;
            const ny = block.y + dy;
            if (
              nx >= 0 &&
              nx < BOARD_CONFIG.COLUMNS &&
              ny >= 0 &&
              ny < BOARD_CONFIG.ROWS
            ) {
              const targetBlock = newBoard[ny][nx];
              if (targetBlock && !clearedBlocks.includes(targetBlock)) {
                if (
                  targetBlock.specialType === "frozen" &&
                  (targetBlock.frozenCount || 2) > 1
                ) {
                  newBoard[ny][nx] = {
                    ...targetBlock,
                    frozenCount: (targetBlock.frozenCount || 2) - 1,
                  };
                } else {
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

      case "lightning": {
        for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
          for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
            const targetBlock = newBoard[y][x];
            if (
              targetBlock &&
              targetBlock.color === block.color &&
              !clearedBlocks.includes(targetBlock)
            ) {
              if (
                targetBlock.specialType === "frozen" &&
                (targetBlock.frozenCount || 2) > 1
              ) {
                newBoard[y][x] = {
                  ...targetBlock,
                  frozenCount: (targetBlock.frozenCount || 2) - 1,
                };
              } else if (targetBlock.specialType !== "stone") {
                additionalCleared.push(targetBlock);
                newBoard[y][x] = null;
              }
              affectedBlocks.push({ x, y });
            }
          }
        }
        break;
      }

      case "cross": {
        for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
          const targetBlock = newBoard[block.y][x];
          if (targetBlock && !clearedBlocks.includes(targetBlock)) {
            if (
              targetBlock.specialType === "frozen" &&
              (targetBlock.frozenCount || 2) > 1
            ) {
              newBoard[block.y][x] = {
                ...targetBlock,
                frozenCount: (targetBlock.frozenCount || 2) - 1,
              };
            } else if (targetBlock.specialType !== "stone") {
              additionalCleared.push(targetBlock);
              newBoard[block.y][x] = null;
            }
            affectedBlocks.push({ x, y: block.y });
          }
        }
        for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
          const targetBlock = newBoard[y][block.x];
          if (targetBlock && !clearedBlocks.includes(targetBlock)) {
            if (
              targetBlock.specialType === "frozen" &&
              (targetBlock.frozenCount || 2) > 1
            ) {
              newBoard[y][block.x] = {
                ...targetBlock,
                frozenCount: (targetBlock.frozenCount || 2) - 1,
              };
            } else if (targetBlock.specialType !== "stone") {
              additionalCleared.push(targetBlock);
              newBoard[y][block.x] = null;
            }
            affectedBlocks.push({ x: block.x, y });
          }
        }
        break;
      }

      case "colorShift": {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = block.x + dx;
            const ny = block.y + dy;
            if (
              nx >= 0 &&
              nx < BOARD_CONFIG.COLUMNS &&
              ny >= 0 &&
              ny < BOARD_CONFIG.ROWS
            ) {
              const targetBlock = newBoard[ny][nx];
              if (
                targetBlock &&
                targetBlock.specialType !== "stone" &&
                targetBlock.specialType !== "frozen"
              ) {
                newBoard[ny][nx] = { ...targetBlock, color: block.color };
                affectedBlocks.push({ x: nx, y: ny });
              }
            }
          }
        }
        break;
      }

      case "shuffle": {
        const colors = getColorsForLevel(level);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = block.x + dx;
            const ny = block.y + dy;
            if (
              nx >= 0 &&
              nx < BOARD_CONFIG.COLUMNS &&
              ny >= 0 &&
              ny < BOARD_CONFIG.ROWS
            ) {
              const targetBlock = newBoard[ny][nx];
              if (
                targetBlock &&
                targetBlock.specialType !== "stone" &&
                targetBlock.specialType !== "frozen"
              ) {
                const randomColor =
                  colors[Math.floor(Math.random() * colors.length)];
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
  clearedBlocks: Block[],
): { destroyedStones: Block[]; newBoard: GameBoard } {
  const newBoard = board.map((row) => [...row]);
  const destroyedStones: Block[] = [];
  const clearedPositions = new Set(clearedBlocks.map((b) => `${b.x},${b.y}`));

  for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
    for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
      const block = newBoard[y][x];
      if (block?.specialType === "stone") {
        const adjacentPositions = [
          `${x - 1},${y}`,
          `${x + 1},${y}`,
          `${x},${y - 1}`,
          `${x},${y + 1}`,
        ];
        const hasAdjacentClear = adjacentPositions.some((pos) =>
          clearedPositions.has(pos),
        );
        if (hasAdjacentClear) {
          destroyedStones.push(block);
          newBoard[y][x] = null;
        }
      }
    }
  }

  return { destroyedStones, newBoard };
}

// 얼음 블록 처리
function processFrozenBlocks(
  blocks: Block[],
  board: GameBoard,
): {
  blocksToRemove: Block[];
  updatedBoard: GameBoard;
} {
  const newBoard = board.map((row) => [...row]);
  const blocksToRemove: Block[] = [];

  for (const block of blocks) {
    if (
      block.y < 0 ||
      block.y >= BOARD_CONFIG.ROWS ||
      block.x < 0 ||
      block.x >= BOARD_CONFIG.COLUMNS ||
      !newBoard[block.y]
    ) {
      continue;
    }

    if (block.specialType === "frozen") {
      const currentCount = block.frozenCount || 2;
      if (currentCount > 1) {
        newBoard[block.y][block.x] = {
          ...block,
          frozenCount: currentCount - 1,
        };
      } else {
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
    gameMode,
  } = useGameStore();

  const { updateAchievement, addBattlePassXP } = useUserStore();

  const [isProcessingFusion, setIsProcessingFusion] = useState(false);
  const [fusionEffects, setFusionEffects] = useState<
    { x: number; y: number; color: string }[]
  >([]);
  const [chainEffects, setChainEffects] = useState<number>(0);
  const [specialEffects, setSpecialEffects] = useState<SpecialEffect[]>([]);

  const dropIntervalRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<number | null>(null);
  const lastDropTimeRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);
  const lastBlockCountRef = useRef<number>(0);

  // 낙하 속도 계산
  const dropSpeed =
    activePowerUp?.type === "timeSlow"
      ? getDropSpeed(level) * 2
      : getDropSpeed(level);

  // 단일 융합 처리 (보드를 인자로 받아서 처리 후 새 보드 반환)
  const processFusion = useCallback(
    async (
      currentBoard: GameBoard,
    ): Promise<{ result: FusionResult | null; newBoard: GameBoard }> => {
      const groups = findFusionGroups(currentBoard);

      if (groups.length === 0) {
        return { result: null, newBoard: currentBoard };
      }

      let totalCleared = 0;
      let specialBlocksCleared = 0;
      const effects: { x: number; y: number; color: string }[] = [];
      const allSpecialEffects: SpecialEffect[] = [];
      let hasMultiplierBlock = false;

      let workingBoard = currentBoard.map((row) => [...row]);

      // 모든 그룹의 블록을 합치되, 중복 제거
      const allBlocks = groups.flat();
      const uniqueBlocksMap = new Map<string, Block>();
      for (const block of allBlocks) {
        const key = `${block.x},${block.y}`;
        if (!uniqueBlocksMap.has(key)) {
          uniqueBlocksMap.set(key, block);
        }
      }
      const uniqueBlocks = Array.from(uniqueBlocksMap.values());

      // 얼음 블록 필터링
      const { blocksToRemove, updatedBoard } = processFrozenBlocks(
        uniqueBlocks,
        workingBoard,
      );
      workingBoard = updatedBoard;

      const removedPositions = new Set<string>();

      // 실제로 제거될 블록들
      for (const block of blocksToRemove) {
        const posKey = `${block.x},${block.y}`;
        if (removedPositions.has(posKey)) continue;

        if (
          block.y >= 0 &&
          block.y < BOARD_CONFIG.ROWS &&
          block.x >= 0 &&
          block.x < BOARD_CONFIG.COLUMNS &&
          workingBoard[block.y] &&
          workingBoard[block.y][block.x] !== null
        ) {
          effects.push({ x: block.x, y: block.y, color: block.color });
          workingBoard[block.y][block.x] = null;
          removedPositions.add(posKey);
          totalCleared++;

          if (block.specialType !== "normal") {
            specialBlocksCleared++;
            if (block.specialType === "multiplier") {
              hasMultiplierBlock = true;
            }
          }
        }
      }

      setFusionEffects(effects);

      // 특수 블록 효과 처리
      const specialResult = processSpecialBlockEffects(
        workingBoard,
        blocksToRemove,
        level,
      );
      workingBoard = specialResult.newBoard;
      totalCleared += specialResult.additionalCleared.length;
      allSpecialEffects.push(...specialResult.effects);

      for (const block of specialResult.additionalCleared) {
        effects.push({ x: block.x, y: block.y, color: block.color });
        if (block.specialType !== "normal") {
          specialBlocksCleared++;
        }
      }

      // 돌 블록 처리
      const stoneResult = processStoneBlocks(workingBoard, [
        ...blocksToRemove,
        ...specialResult.additionalCleared,
      ]);
      workingBoard = stoneResult.newBoard;
      totalCleared += stoneResult.destroyedStones.length;

      for (const stone of stoneResult.destroyedStones) {
        effects.push({ x: stone.x, y: stone.y, color: stone.color });
        specialBlocksCleared++;
      }

      if (allSpecialEffects.length > 0) {
        setSpecialEffects(allSpecialEffects);
      }

      // 점수 계산 - 스토어에서 직접 읽기 (클로저 의존 제거)
      const state = useGameStore.getState();
      const isPerfectClear = isBoardEmpty(workingBoard);
      const powerUpMultiplier =
        (state.activePowerUp?.type === "scoreMultiplier" ? 2 : 1) *
        (hasMultiplierBlock ? 2 : 1);

      const score = calculateScore({
        blocksCleared: totalCleared,
        chainCount: state.chainCount + 1,
        comboCount: state.combo,
        level: state.level,
        powerUpMultiplier,
        perfectClear: isPerfectClear,
        isFeverMode: state.isFeverMode,
        specialBlocksCleared,
      });

      // 피버 게이지 추가
      const addFeverGauge = useGameStore.getState().addFeverGauge;
      if (addFeverGauge) {
        addFeverGauge(totalCleared * 3 + (state.chainCount + 1) * 10);
      }

      // 애니메이션 대기
      await new Promise((resolve) =>
        setTimeout(resolve, TIMING_CONFIG.FUSION_ANIMATION_DURATION),
      );

      if (allSpecialEffects.length > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, TIMING_CONFIG.SPECIAL_EFFECT_DURATION),
        );
      }

      // 중력 적용
      const gravityAppliedBoard = applyGravity(
        workingBoard,
        useGameStore.getState().gravityDirection,
      );

      setFusionEffects([]);
      setSpecialEffects([]);

      return {
        result: {
          clearedBlocks: [
            ...blocksToRemove,
            ...specialResult.additionalCleared,
            ...stoneResult.destroyedStones,
          ],
          score,
          chainCount: state.chainCount + 1,
          isChainReaction: state.chainCount > 0,
          specialEffects: allSpecialEffects,
        },
        newBoard: gravityAppliedBoard,
      };
    },
    [level],
  );

  // 연쇄 반응 처리 - 의존성 최소화, 스토어에서 직접 읽기
  const processChainReaction = useCallback(async () => {
    // 이미 처리 중이면 스킵
    if (processingRef.current) return;

    processingRef.current = true;
    setIsProcessingFusion(true);

    try {
      let totalScore = 0;
      let totalCleared = 0;
      let currentChain = 0;

      // Zustand은 동기적이므로 즉시 최신 보드를 가져올 수 있음
      let workingBoard = useGameStore.getState().board;

      resetChain();

      let loopCount = 0;
      const maxLoops = 100;

      while (loopCount < maxLoops) {
        loopCount++;
        const { result, newBoard } = await processFusion(workingBoard);

        if (!result) break;

        workingBoard = newBoard;
        updateBoard(workingBoard);

        currentChain++;
        totalScore += result.score;
        totalCleared += result.clearedBlocks.length;

        incrementChain();
        setChainEffects(currentChain);

        await new Promise((resolve) =>
          setTimeout(resolve, TIMING_CONFIG.CHAIN_DELAY),
        );
      }

      if (totalScore > 0) {
        addScore(totalScore);
        incrementCombo();

        // 통계 업데이트 - 스토어에서 직접 읽기
        const stats = useGameStore.getState().statistics;
        updateStatistics({
          totalBlocksCleared: stats.totalBlocksCleared + totalCleared,
          totalFusions: stats.totalFusions + 1,
          maxChain: Math.max(stats.maxChain, currentChain),
        });

        // 미션 업데이트
        updateMissionProgress("blocks_fused", totalCleared);
        if (currentChain >= 5) {
          updateMissionProgress("chain", 1);
        }

        // 퍼즐/챌린지 모드 목표 업데이트
        const currentState = useGameStore.getState();
        if (
          currentState.gameMode === "puzzle" ||
          currentState.gameMode === "challenge"
        ) {
          updateLevelObjective("score", totalScore);
          updateLevelObjective("clearBlocks", totalCleared);

          if (currentChain > 0) {
            const chainObj = currentState.levelObjectives.find(
              (o) => o.type === "chains",
            );
            if (chainObj && currentChain > chainObj.current) {
              updateLevelObjective("chains", currentChain - chainObj.current);
            }
          }

          // 퍼즐 완료 체크
          if (currentState.gameMode === "puzzle") {
            setTimeout(() => {
              useGameStore.getState().checkPuzzleComplete();
            }, 100);
          }
        }

        // 업적 업데이트
        updateAchievement("chain_5", currentChain);
        updateAchievement("chain_10", currentChain);
        updateAchievement("chain_15", currentChain);
        updateAchievement("chain_20", currentChain);

        // 배틀패스 XP
        addBattlePassXP(Math.floor(totalScore / 100));

        // 콤보 타임아웃
        if (comboTimeoutRef.current) {
          clearTimeout(comboTimeoutRef.current);
        }
        comboTimeoutRef.current = window.setTimeout(() => {
          resetCombo();
        }, TIMING_CONFIG.COMBO_TIMEOUT);
      }
    } catch (error) {
      console.error("[ChainReaction] ERROR:", error);
    } finally {
      setChainEffects(0);
      setIsProcessingFusion(false);
      processingRef.current = false;

      // 새 블록 생성
      const state = useGameStore.getState();
      if (state.gameStatus === "playing" && state.currentBlocks.length === 0) {
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
    updateStatistics,
    updateMissionProgress,
    updateLevelObjective,
    updateAchievement,
    addBattlePassXP,
  ]);

  // 블록이 배치되었을 때 처리 - 유일한 융합 트리거 포인트
  useEffect(() => {
    const prevCount = lastBlockCountRef.current;
    const currCount = currentBlocks.length;
    lastBlockCountRef.current = currCount;

    // 블록이 있다가 0이 되면 (모든 블록 배치됨) 융합 체크
    if (prevCount > 0 && currCount === 0 && gameStatus === "playing") {
      const checkTimeout = setTimeout(() => {
        if (processingRef.current) return;

        const state = useGameStore.getState();
        const groups = findFusionGroups(state.board);

        if (groups.length > 0) {
          processChainReaction();
        } else {
          spawnBlock();
        }
      }, 50);

      return () => clearTimeout(checkTimeout);
    }
  }, [currentBlocks.length, gameStatus, processChainReaction, spawnBlock]);

  // 게임 루프 (자동 낙하만 담당 + 안전장치 융합 체크)
  useEffect(() => {
    if (gameStatus !== "playing" || isProcessingFusion) {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current);
        dropIntervalRef.current = null;
      }
      return;
    }

    lastDropTimeRef.current = Date.now();
    let lastSafetyCheck = Date.now();

    const gameLoop = () => {
      const now = Date.now();
      const currentState = useGameStore.getState();

      // 블록이 있으면 낙하 처리
      if (currentState.currentBlocks.length > 0 && !processingRef.current) {
        if (now - lastDropTimeRef.current >= dropSpeed) {
          currentState.softDrop();
          lastDropTimeRef.current = now;
        }
        return; // 블록이 떨어지고 있으면 융합 체크 불필요
      }

      // 안전장치: 블록도 없고 처리 중도 아닌데 보드에 융합 가능한 그룹이 있으면 처리
      // 500ms마다만 체크 (성능)
      if (
        !processingRef.current &&
        currentState.currentBlocks.length === 0 &&
        now - lastSafetyCheck >= 500
      ) {
        lastSafetyCheck = now;
        const groups = findFusionGroups(currentState.board);
        if (groups.length > 0) {
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

  // 고스트 블록 위치 계산
  const getGhostPosition = useCallback(() => {
    if (currentBlocks.length === 0) return null;

    const { dx, dy } = GRAVITY_VECTORS[gravityDirection];

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
