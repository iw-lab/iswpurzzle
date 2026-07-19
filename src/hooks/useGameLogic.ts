import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "../stores/gameStore";
import { useUserStore } from "../stores/userStore";
import {
  Block,
  GameBoard,
  FusionResult,
  SpecialEffect,
  BlockColor,
} from "../types";
import {
  BOARD_CONFIG,
  TIMING_CONFIG,
  FUSION_CONFIG,
  calculateScore,
  getDropSpeed,
  GRAVITY_VECTORS,
  getColorsForLevel,
  FEVER_CONFIG,
} from "../constants";
import {
  applyGravity,
  computeDangerLevel,
  computeDropDistance,
  findFusionGroups,
  isBoardEmpty,
} from "../engine/board";
import { getZenDropSpeed } from "../engine/difficulty";
import { pick } from "../engine/rng";

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
                const randomColor = pick(colors);
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
  // selector 구독 — 렌더에 실제로 쓰이는 값만 구독한다(#22).
  // 액션은 useGameStore.getState()로 호출하므로 구독할 필요가 없다.
  const board = useGameStore((s) => s.board);
  const currentBlocks = useGameStore((s) => s.currentBlocks);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const level = useGameStore((s) => s.level);
  const gravityDirection = useGameStore((s) => s.gravityDirection);
  const activePowerUp = useGameStore((s) => s.activePowerUp);
  const gameMode = useGameStore((s) => s.gameMode);

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
  const lockStartRef = useRef<number | null>(null);

  // 낙하 속도 계산 (젠 모드는 상한 고정 — "편안함"이 모드 정체성)
  const baseDropSpeed =
    gameMode === "zen" ? Math.max(getZenDropSpeed(), getDropSpeed(level)) : getDropSpeed(level);
  const dropSpeed =
    activePowerUp?.type === "timeSlow" ? baseDropSpeed * 2 : baseDropSpeed;

  // 단일 융합 처리 (순수 함수 - 보드를 인자로 받아서 처리 후 새 보드 반환)
  const processSingleFusion = useCallback(
    async (
      currentBoard: GameBoard,
    ): Promise<{
      result: FusionResult | null;
      newBoard: GameBoard;
      perfectClear?: boolean;
      specialCleared?: number;
      stonesCleared?: number;
    }> => {
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

      // 점수 계산 - 스토어에서 직접 읽기
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

      // 피버 게이지 — 블록분만 여기서 지급한다.
      // 연쇄·콤보분은 incrementChain/incrementCombo가 담당하므로
      // 여기서 함께 주면 이중 지급이 된다(#21).
      useGameStore
        .getState()
        .addFeverGauge(totalCleared * FEVER_CONFIG.GAUGE_PER_BLOCK);

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
        perfectClear: isPerfectClear,
        specialCleared: specialBlocksCleared,
        stonesCleared: stoneResult.destroyedStones.length,
      };
    },
    [level],
  );

  // 연쇄 반응 전체 처리 — 세션 epoch로 취소 가능.
  // await 사이에 게임오버·재시작이 일어나면 즉시 중단해야
  // 이전 라운드가 새 보드·점수를 오염시키지 않는다(#7).
  const doChainReaction = useCallback(async () => {
    if (processingRef.current) return;

    processingRef.current = true;
    setIsProcessingFusion(true);

    const epoch = useGameStore.getState().sessionEpoch;
    /** 세션이 바뀌었거나 플레이 중이 아니면 폐기 */
    const isStale = () => {
      const st = useGameStore.getState();
      return st.sessionEpoch !== epoch || st.gameStatus !== "playing";
    };

    try {
      let totalScore = 0;
      let totalCleared = 0;
      let currentChain = 0;
      let sawPerfectClear = false;
      let specialCleared = 0;
      let stonesCleared = 0;
      const colorTally = new Map<BlockColor, number>();

      let workingBoard = useGameStore.getState().board;
      useGameStore.getState().resetChain();

      let loopCount = 0;
      const maxLoops = 100;

      while (loopCount < maxLoops) {
        loopCount++;
        if (isStale()) return;

        const step = await processSingleFusion(workingBoard);
        if (isStale()) return;
        if (!step.result) break;

        workingBoard = step.newBoard;
        useGameStore.getState().updateBoard(workingBoard);

        currentChain++;
        totalScore += step.result.score;
        totalCleared += step.result.clearedBlocks.length;
        sawPerfectClear = sawPerfectClear || Boolean(step.perfectClear);
        specialCleared += step.specialCleared ?? 0;
        stonesCleared += step.stonesCleared ?? 0;
        for (const b of step.result.clearedBlocks) {
          colorTally.set(b.color, (colorTally.get(b.color) ?? 0) + 1);
        }

        useGameStore.getState().incrementChain();
        setChainEffects(currentChain);

        await new Promise((resolve) =>
          setTimeout(resolve, TIMING_CONFIG.CHAIN_DELAY),
        );
      }

      if (isStale()) return;

      if (totalScore > 0) {
        const store = useGameStore.getState();
        store.addScore(totalScore);
        store.incrementCombo();
        // 레벨업의 유일한 입력 — 점수가 아니라 클리어 블록 수
        store.addClearedBlocks(totalCleared);

        // 통계 (perfectClears·specialBlocksUsed 갱신 경로 복구 — #12)
        const stats = useGameStore.getState().statistics;
        store.updateStatistics({
          totalBlocksCleared: stats.totalBlocksCleared + totalCleared,
          totalFusions: stats.totalFusions + 1,
          maxChain: Math.max(stats.maxChain, currentChain),
          perfectClears: stats.perfectClears + (sawPerfectClear ? 1 : 0),
          specialBlocksUsed: stats.specialBlocksUsed + specialCleared,
        });

        // 미션
        store.updateMissionProgress("blocks_fused", totalCleared);
        if (currentChain >= 5) store.updateMissionProgress("chain", 1);
        if (sawPerfectClear) store.updateMissionProgress("perfect_clear", 1);

        // 퍼즐/챌린지 목표 — 이제 6종 전부 갱신된다(#4)
        const currentState = useGameStore.getState();
        if (
          currentState.gameMode === "puzzle" ||
          currentState.gameMode === "challenge"
        ) {
          currentState.updateLevelObjective("score", totalScore);
          currentState.updateLevelObjective("clearBlocks", totalCleared);
          if (specialCleared > 0) {
            currentState.updateLevelObjective("clearSpecial", specialCleared);
          }
          if (stonesCleared > 0) {
            currentState.updateLevelObjective("clearStone", stonesCleared);
          }
          for (const [color, count] of colorTally) {
            currentState.updateLevelObjective("clearColor", count, color);
          }
          currentState.updateLevelObjective("combo", 1);

          if (currentChain > 0) {
            const chainObj = currentState.levelObjectives.find(
              (o) => o.type === "chains",
            );
            if (chainObj && currentChain > chainObj.current) {
              currentState.updateLevelObjective(
                "chains",
                currentChain - chainObj.current,
              );
            }
          }
        }

        // 업적
        updateAchievement("chain_5", currentChain);
        updateAchievement("chain_10", currentChain);
        updateAchievement("chain_15", currentChain);
        updateAchievement("chain_20", currentChain);

        // 배틀패스 XP
        addBattlePassXP(Math.floor(totalScore / 100));

        // 콤보 타임아웃
        if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = window.setTimeout(() => {
          if (useGameStore.getState().sessionEpoch !== epoch) return;
          useGameStore.getState().resetCombo();
        }, TIMING_CONFIG.COMBO_TIMEOUT);
      }

      // 퍼즐 클리어 판정은 연쇄가 완전히 정산된 지금 수행한다(#5)
      const finalState = useGameStore.getState();
      if (finalState.gameMode === "puzzle" && !isStale()) {
        finalState.checkPuzzleComplete();
      }
    } catch (error) {
      console.error("[ChainReaction] ERROR:", error);
    } finally {
      setChainEffects(0);
      setIsProcessingFusion(false);
      processingRef.current = false;
      // 주의: 여기서 spawnBlock 호출하지 않음!
      // 게임 루프가 다음 틱에서 블록 없음을 감지하고 스폰함
    }
  }, [processSingleFusion, updateAchievement, addBattlePassXP]);

  // doChainReaction을 ref에 저장 (게임 루프에서 사용)
  const doChainReactionRef = useRef(doChainReaction);
  doChainReactionRef.current = doChainReaction;

  // ============================================================
  // 게임 루프 - 모든 게임 로직의 유일한 드라이버
  // React의 useEffect/useState 의존 없이, Zustand 스토어에서 직접 읽음
  // ============================================================
  useEffect(() => {
    if (gameStatus !== "playing") {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current);
        dropIntervalRef.current = null;
      }
      return;
    }

    lastDropTimeRef.current = Date.now();

    const gameLoop = () => {
      // 처리 중이면 스킵
      if (processingRef.current) return;

      const now = Date.now();
      const state = useGameStore.getState();

      // 게임 중이 아니면 스킵
      if (state.gameStatus !== "playing") return;

      // freeze 파워업: 낙하 자체를 정지시킨다 (표시만 있고 미구현이던 항목 #16)
      if (state.activePowerUp?.type === "freeze") {
        lastDropTimeRef.current = now;
        return;
      }

      // 위험도 갱신 (심장박동 연출·비네트의 입력)
      const danger = computeDangerLevel(state.board, state.gravityDirection);
      if (danger !== state.dangerLevel) state.setDangerLevel(danger);

      // 1) 블록이 떨어지고 있으면 → 낙하 처리
      if (state.currentBlocks.length > 0) {
        // 락 딜레이: 착지 상태라도 LOCK_DELAY 동안은 미세조정을 허용한다.
        // 상수만 있고 구현이 없던 항목 — 조작감 체감 최대 개선 지점(§3.1-5).
        const landed = computeDropDistance(
          state.board,
          state.currentBlocks,
          state.gravityDirection,
        ) === 0;

        if (landed) {
          if (lockStartRef.current === null) lockStartRef.current = now;
          if (now - lockStartRef.current >= TIMING_CONFIG.LOCK_DELAY) {
            lockStartRef.current = null;
            state.placeBlock();
            lastDropTimeRef.current = now;
          }
          return;
        }

        lockStartRef.current = null;
        if (now - lastDropTimeRef.current >= dropSpeed) {
          state.softDrop();
          lastDropTimeRef.current = now;
        }
        return;
      }

      lockStartRef.current = null;

      // 2) 블록이 없음 → 보드에서 융합 가능한 그룹 체크
      const groups = findFusionGroups(state.board);
      if (groups.length > 0) {
        // 융합 가능! 연쇄 반응 시작
        doChainReactionRef.current();
        return;
      }

      // 3) 융합 그룹 없음 → 새 블록 스폰
      state.spawnBlock();
    };

    dropIntervalRef.current = window.setInterval(gameLoop, 50);

    return () => {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current);
        dropIntervalRef.current = null;
      }
    };
  }, [gameStatus, dropSpeed]);

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

  // 고스트 블록 위치 계산 — hardDrop과 동일한 computeDropDistance를 사용한다.
  // 이 둘이 갈라지면 "보이는 대로 떨어진다"는 낙하 퍼즐의 제1 계약이 깨진다(#14).
  const getGhostPosition = useCallback(() => {
    if (currentBlocks.length === 0) return null;

    const { dx, dy } = GRAVITY_VECTORS[gravityDirection];
    const distance = computeDropDistance(board, currentBlocks, gravityDirection);

    return {
      x: currentBlocks[0].x + dx * distance,
      y: currentBlocks[0].y + dy * distance,
      distance,
      cells: currentBlocks.map((b) => ({
        x: b.x + dx * distance,
        y: b.y + dy * distance,
      })),
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
