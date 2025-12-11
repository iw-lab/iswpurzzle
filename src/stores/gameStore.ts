import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  GameState,
  GameBoard,
  Block,
  BlockColor,
  FallingBlock,
  GravityDirection,
  GameMode,
  PowerUp,
  PowerUpType,
  GameStatistics,
  MissionProgress,
  SpecialBlockType,
  LevelObjective,
} from '../types';
import {
  BOARD_CONFIG,
  getColorsForLevel,
  getLevelThreshold,
  GRAVITY_VECTORS,
  getSpecialBlockChance,
  determineSpecialBlockType,
  generateLevelObjectives,
  generatePuzzleObjectives,
  PUZZLE_CONFIG,
  FEVER_CONFIG,
  TIMING_CONFIG,
  DIFFICULTY_CONFIG,
  getFallingBlockCount,
  getGarbageInterval,
  getRandomShape,
  rotateShape,
} from '../constants';
import { generateDailyMissions, generateWeeklyMissions } from '../constants/missions';

// 빈 보드 생성
function createEmptyBoard(): GameBoard {
  return Array(BOARD_CONFIG.ROWS)
    .fill(null)
    .map(() => Array(BOARD_CONFIG.COLUMNS).fill(null));
}

// 랜덤 블록 색상 생성
function getRandomBlockColor(level: number): BlockColor {
  const colors = getColorsForLevel(level);
  return colors[Math.floor(Math.random() * colors.length)];
}

// 특수 블록 타입 결정 (후반부 특수 블록 빈도 감소)
function getSpecialType(level: number, blocksPlaced: number): SpecialBlockType {
  // 일정 블록마다 특수 블록 보장 (12 -> 20으로 증가)
  if (blocksPlaced > 0 && blocksPlaced % 20 === 0) {
    return determineSpecialBlockType(level);
  }

  const chance = getSpecialBlockChance(level);
  if (Math.random() < chance) {
    return determineSpecialBlockType(level);
  }
  return 'normal';
}

// 다음 블록 배열 생성
function generateNextBlocks(count: number, level: number): { colors: BlockColor[], specialTypes: SpecialBlockType[] } {
  const colors: BlockColor[] = [];
  const specialTypes: SpecialBlockType[] = [];

  for (let i = 0; i < count; i++) {
    colors.push(getRandomBlockColor(level));
    specialTypes.push(i === 0 ? getSpecialType(level, 0) : 'normal');
  }

  return { colors, specialTypes };
}

// 초기 통계
const initialStatistics: GameStatistics = {
  totalGamesPlayed: 0,
  totalScore: 0,
  highScore: 0,
  maxCombo: 0,
  maxChain: 0,
  totalBlocksCleared: 0,
  totalFusions: 0,
  totalPlayTime: 0,
  perfectClears: 0,
  specialBlocksUsed: 0,
  levelsCompleted: 0,
};

// 초기 미션
const initialMissionProgress: MissionProgress = {
  dailyMissions: generateDailyMissions(),
  weeklyMissions: generateWeeklyMissions(),
};

// 스폰 중복 방지 플래그
let isSpawning = false;

// 초기 게임 상태
const initialGameState: GameState = {
  board: createEmptyBoard(),
  currentBlock: null,
  currentBlocks: [],
  nextBlocks: [],
  nextSpecialTypes: [],
  holdBlock: null,
  holdSpecialType: null,
  canHold: true,
  score: 0,
  level: 1,
  combo: 0,
  maxCombo: 0,
  chainCount: 0,
  gameStatus: 'ready',
  gameMode: 'classic',
  powerUps: [],
  activePowerUp: null,
  gravityDirection: 'down',
  gameTime: 0,
  statistics: initialStatistics,
  continues: 0,
  adWatchedThisGame: false,
  missionProgress: initialMissionProgress,
  isPowerUpSelecting: false,
  selectedGravityDirection: null,
  levelObjectives: [],
  feverGauge: 0,
  isFeverMode: false,
  comboTimer: 0,
  dangerLevel: 0,
  specialBlockChance: 0.05,
  blocksUntilSpecial: 10,
  garbageTimer: 0,
  garbagePending: 0,
  fallingBlockCount: 1,
  movesRemaining: 0,
  puzzleLevel: 1,
  puzzleCompleted: false,
  currentShapeOffsets: [],
  basePosition: { x: 0, y: 0 },
};

interface GameStore extends GameState {
  // 게임 제어
  startGame: (mode?: GameMode) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;

  // 블록 제어
  spawnBlock: () => void;
  moveBlock: (direction: 'left' | 'right') => void;
  rotateBlock: () => void;
  softDrop: () => void;
  hardDrop: () => void;
  doHoldBlock: () => void;
  placeBlock: () => void;

  // 중력 제어
  setGravityDirection: (direction: GravityDirection) => void;
  toggleGravitySelection: (selecting: boolean) => void;
  cycleGravity: () => void;

  // 파워업
  addPowerUp: (type: PowerUpType, count?: number) => void;
  usePowerUp: (type: PowerUpType) => void;
  activatePowerUp: (powerUp: PowerUp) => void;
  deactivatePowerUp: () => void;

  // 게임 로직
  updateBoard: (board: GameBoard) => void;
  addScore: (points: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  incrementChain: () => void;
  resetChain: () => void;
  checkLevelUp: () => void;

  // 새로운 기능들
  addFeverGauge: (amount: number) => void;
  activateFeverMode: () => void;
  deactivateFeverMode: () => void;
  updateLevelObjective: (type: string, value: number) => void;
  setDangerLevel: (level: number) => void;
  decrementBlocksUntilSpecial: () => void;

  // 쓰레기 블록
  addGarbageRows: (count: number) => void;
  incrementGarbageTimer: () => void;

  // 통계
  updateStatistics: (updates: Partial<GameStatistics>) => void;

  // 미션
  updateMissionProgress: (type: string, value: number) => void;

  // 게임 시간
  incrementGameTime: () => void;

  // 이어하기
  continueGame: () => void;

  // 퍼즐 모드
  decrementMoves: () => void;
  nextPuzzleLevel: () => void;
  checkPuzzleComplete: () => void;

  // 블록 카운터
  blocksPlaced: number;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialGameState,
      blocksPlaced: 0,

      startGame: (mode = 'classic') => {
        isSpawning = false; // 스폰 플래그 초기화
        const level = 1;
        const puzzleLevel = mode === 'puzzle' ? 1 : 1;

        // 퍼즐 모드는 블록 1개씩만 떨어짐
        const blockCount = mode === 'puzzle' ? 1 : getFallingBlockCount(level);
        const { colors, specialTypes } = generateNextBlocks(5 + blockCount, level);

        // 모드별 목표 설정
        let objectives: LevelObjective[] = [];
        if (mode === 'challenge') {
          objectives = generateLevelObjectives(level);
        } else if (mode === 'puzzle') {
          objectives = generatePuzzleObjectives(puzzleLevel);
        }

        // 퍼즐 모드 이동 횟수
        const movesRemaining = mode === 'puzzle' ? PUZZLE_CONFIG.getMovesForLevel(puzzleLevel) : 0;

        set({
          board: createEmptyBoard(),
          currentBlock: null,
          currentBlocks: [],
          nextBlocks: colors,
          nextSpecialTypes: specialTypes,
          holdBlock: null,
          holdSpecialType: null,
          canHold: true,
          score: 0,
          level,
          combo: 0,
          maxCombo: 0,
          chainCount: 0,
          gameStatus: 'playing',
          gameMode: mode,
          activePowerUp: null,
          gravityDirection: 'down',
          gameTime: 0,
          continues: 0,
          adWatchedThisGame: false,
          isPowerUpSelecting: false,
          selectedGravityDirection: null,
          levelObjectives: objectives,
          feverGauge: 0,
          isFeverMode: false,
          comboTimer: 0,
          dangerLevel: 0,
          blocksPlaced: 0,
          blocksUntilSpecial: 10,
          garbageTimer: 0,
          garbagePending: 0,
          fallingBlockCount: blockCount,
          movesRemaining,
          puzzleLevel,
          puzzleCompleted: false,
        });

        setTimeout(() => get().spawnBlock(), 100);
      },

      pauseGame: () => {
        if (get().gameStatus === 'playing') {
          set({ gameStatus: 'paused' });
        }
      },

      resumeGame: () => {
        if (get().gameStatus === 'paused') {
          set({ gameStatus: 'playing' });
        }
      },

      endGame: () => {
        const { score, statistics, combo, chainCount } = get();
        set({
          gameStatus: 'gameover',
          statistics: {
            ...statistics,
            totalGamesPlayed: statistics.totalGamesPlayed + 1,
            totalScore: statistics.totalScore + score,
            highScore: Math.max(statistics.highScore, score),
            maxCombo: Math.max(statistics.maxCombo, combo),
            maxChain: Math.max(statistics.maxChain, chainCount),
          },
        });
      },

      resetGame: () => {
        isSpawning = false; // 스폰 플래그 초기화
        set({
          ...initialGameState,
          statistics: get().statistics,
          powerUps: get().powerUps,
          missionProgress: get().missionProgress,
        });
      },

      spawnBlock: () => {
        const { nextBlocks, nextSpecialTypes, level, gravityDirection, board, blocksPlaced, currentBlocks, gameStatus } = get();

        // 이미 블록이 있거나 게임 중이 아니면 생성하지 않음
        if (currentBlocks.length > 0) return;
        if (gameStatus !== 'playing') return;

        // 스폰 중복 방지
        if (isSpawning) return;
        isSpawning = true;

        const blockCount = getFallingBlockCount(level);

        // nextBlocks가 부족하면 추가 생성
        let currentNextBlocks = [...nextBlocks];
        let currentNextSpecialTypes = [...nextSpecialTypes];
        while (currentNextBlocks.length < 10) {
          currentNextBlocks.push(getRandomBlockColor(level));
          currentNextSpecialTypes.push(getSpecialType(level, blocksPlaced + currentNextBlocks.length));
        }

        if (currentNextBlocks.length < 1) return;

        // 블록 모양 선택
        const shape = getRandomShape(blockCount);
        const offsets = shape.offsets;

        // 모양의 경계 계산
        const minX = Math.min(...offsets.map(o => o[0]));
        const maxX = Math.max(...offsets.map(o => o[0]));
        const minY = Math.min(...offsets.map(o => o[1]));
        const maxY = Math.max(...offsets.map(o => o[1]));
        const shapeWidth = maxX - minX + 1;
        const shapeHeight = maxY - minY + 1;

        // 시작 위치 결정 (중앙에서 시작, 모양 크기 고려)
        let baseX: number, baseY: number;

        switch (gravityDirection) {
          case 'down':
            baseX = Math.floor((BOARD_CONFIG.COLUMNS - shapeWidth) / 2);
            baseY = 0;
            break;
          case 'up':
            baseX = Math.floor((BOARD_CONFIG.COLUMNS - shapeWidth) / 2);
            baseY = BOARD_CONFIG.ROWS - 1 - shapeHeight + 1;
            break;
          case 'left':
            baseX = BOARD_CONFIG.COLUMNS - shapeWidth;
            baseY = Math.floor((BOARD_CONFIG.ROWS - shapeHeight) / 2);
            break;
          case 'right':
            baseX = 0;
            baseY = Math.floor((BOARD_CONFIG.ROWS - shapeHeight) / 2);
            break;
        }

        // 모양에 따라 블록 생성
        // 각 블록마다 다른 색상! (같은 색이면 바로 터져서 너무 쉬움)
        const newBlocks: FallingBlock[] = [];

        for (let i = 0; i < offsets.length; i++) {
          const [dx, dy] = offsets[i];
          const color = currentNextBlocks[i] || currentNextBlocks[0]; // 각 블록마다 다른 색
          const specialType = i === 0 ? (currentNextSpecialTypes[0] || 'normal') : 'normal';

          const startX = baseX + dx;
          const startY = baseY + dy;

          // 범위 체크
          if (startX < 0 || startX >= BOARD_CONFIG.COLUMNS) continue;
          if (startY < 0 || startY >= BOARD_CONFIG.ROWS) continue;

          // 해당 위치에 블록이 없으면 추가
          if (board[startY][startX] === null) {
            newBlocks.push({
              id: uuidv4(),
              color,
              x: startX,
              y: startY,
              targetY: startY,
              specialType,
            });
          }
        }

        // 게임오버 체크 - 모든 시작 위치가 막힘
        if (newBlocks.length === 0) {
          isSpawning = false;
          get().endGame();
          return;
        }

        // 상단 줄 게임오버 체크
        if (gravityDirection === 'down') {
          let topRowBlocks = 0;
          for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
            if (board[0][x] !== null) topRowBlocks++;
            if (board[1][x] !== null) topRowBlocks++;
          }
          if (topRowBlocks >= BOARD_CONFIG.COLUMNS) {
            isSpawning = false;
            get().endGame();
            return;
          }
        }

        // 새 블록 색상들 생성 (블록 개수만큼 소비)
        const newNextBlocks = [...currentNextBlocks.slice(blockCount)];
        const newNextSpecialTypes = [...currentNextSpecialTypes.slice(blockCount)];

        set({
          currentBlock: newBlocks[0] || null,
          currentBlocks: newBlocks,
          nextBlocks: newNextBlocks,
          nextSpecialTypes: newNextSpecialTypes,
          canHold: true,
          blocksPlaced: blocksPlaced + blockCount,
          fallingBlockCount: blockCount,
          currentShapeOffsets: offsets as [number, number][],
          basePosition: { x: baseX, y: baseY },
        });

        // 스폰 완료 플래그 해제
        isSpawning = false;
      },

      moveBlock: (direction) => {
        const { currentBlocks, board, gravityDirection } = get();
        if (currentBlocks.length === 0) return;

        // 먼저 모든 블록의 새 위치 계산
        const movedBlocks: FallingBlock[] = [];
        const newPositions = new Set<string>();

        for (const block of currentBlocks) {
          let newX = block.x;
          let newY = block.y;

          if (gravityDirection === 'down' || gravityDirection === 'up') {
            newX = direction === 'left' ? block.x - 1 : block.x + 1;
          } else {
            newY = direction === 'left' ? block.y - 1 : block.y + 1;
          }

          // 범위 체크 - 하나라도 벗어나면 전체 이동 취소
          if (newX < 0 || newX >= BOARD_CONFIG.COLUMNS) return;
          if (newY < 0 || newY >= BOARD_CONFIG.ROWS) return;

          // 보드의 기존 블록과 충돌 체크
          if (board[newY][newX] !== null) return;

          movedBlocks.push({ ...block, x: newX, y: newY });
          newPositions.add(`${newX},${newY}`);
        }

        // 이동된 블록들 간의 충돌은 없음 (함께 이동하므로)
        set({
          currentBlock: movedBlocks[0] || null,
          currentBlocks: movedBlocks,
        });
      },

      rotateBlock: () => {
        const { currentBlocks, board } = get();
        if (currentBlocks.length <= 1) return; // 1개 블록은 회전 불필요

        // 첫 번째 블록을 피벗(중심)으로 사용
        const pivot = currentBlocks[0];

        // 각 블록을 피벗 기준으로 90도 시계방향 회전
        const newBlocks: FallingBlock[] = [];
        let canRotate = true;

        for (let i = 0; i < currentBlocks.length; i++) {
          const block = currentBlocks[i];

          // 피벗 기준 상대 좌표
          const relX = block.x - pivot.x;
          const relY = block.y - pivot.y;

          // 90도 시계방향 회전: (x, y) -> (-y, x)
          const newX = pivot.x - relY;
          const newY = pivot.y + relX;

          // 범위 체크
          if (newX < 0 || newX >= BOARD_CONFIG.COLUMNS ||
              newY < 0 || newY >= BOARD_CONFIG.ROWS) {
            canRotate = false;
            break;
          }

          // 보드 블록과 충돌 체크
          if (board[newY]?.[newX] !== null) {
            canRotate = false;
            break;
          }

          newBlocks.push({
            ...block,
            x: newX,
            y: newY,
          });
        }

        // 벽 킥 시도 (회전이 안 될 경우 밀어보기)
        if (!canRotate) {
          const kicks = [[-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [0, 1]];

          for (const [kickX, kickY] of kicks) {
            const kickedBlocks: FallingBlock[] = [];
            let kickWorks = true;

            for (let i = 0; i < currentBlocks.length; i++) {
              const block = currentBlocks[i];
              const relX = block.x - pivot.x;
              const relY = block.y - pivot.y;
              const newX = pivot.x - relY + kickX;
              const newY = pivot.y + relX + kickY;

              if (newX < 0 || newX >= BOARD_CONFIG.COLUMNS ||
                  newY < 0 || newY >= BOARD_CONFIG.ROWS ||
                  board[newY]?.[newX] !== null) {
                kickWorks = false;
                break;
              }

              kickedBlocks.push({ ...block, x: newX, y: newY });
            }

            if (kickWorks && kickedBlocks.length === currentBlocks.length) {
              newBlocks.length = 0;
              newBlocks.push(...kickedBlocks);
              canRotate = true;
              break;
            }
          }
        }

        if (canRotate && newBlocks.length === currentBlocks.length) {
          // 새 오프셋 계산 (첫 번째 블록 기준)
          const firstBlock = newBlocks[0];
          const newOffsets: [number, number][] = newBlocks.map(b =>
            [b.x - firstBlock.x, b.y - firstBlock.y] as [number, number]
          );

          set({
            currentBlock: newBlocks[0] || null,
            currentBlocks: newBlocks,
            currentShapeOffsets: newOffsets,
            basePosition: { x: firstBlock.x, y: firstBlock.y },
          });
        }
      },

      softDrop: () => {
        const { currentBlocks, board, gravityDirection } = get();
        if (currentBlocks.length === 0) return;

        const { dx, dy } = GRAVITY_VECTORS[gravityDirection];

        // 먼저 모든 블록이 이동 가능한지 확인
        let anyBlocked = false;
        const currentPositions = new Set(currentBlocks.map(b => `${b.x},${b.y}`));

        for (const block of currentBlocks) {
          const newX = block.x + dx;
          const newY = block.y + dy;

          // 범위 체크
          if (newX < 0 || newX >= BOARD_CONFIG.COLUMNS ||
              newY < 0 || newY >= BOARD_CONFIG.ROWS) {
            anyBlocked = true;
            break;
          }

          // 보드 블록과 충돌 체크 (자기 자신의 현재 위치 제외)
          if (board[newY]?.[newX] !== null) {
            anyBlocked = true;
            break;
          }
        }

        // 하나라도 막히면 모든 블록 배치
        if (anyBlocked) {
          get().placeBlock();
          return;
        }

        // 모든 블록 함께 이동
        const updatedBlocks = currentBlocks.map(block => ({
          ...block,
          x: block.x + dx,
          y: block.y + dy,
        }));

        set({
          currentBlock: updatedBlocks[0] || null,
          currentBlocks: updatedBlocks,
        });
      },

      hardDrop: () => {
        const { currentBlocks, board, gravityDirection } = get();
        if (currentBlocks.length === 0) return;

        const { dx, dy } = GRAVITY_VECTORS[gravityDirection];

        // 각 블록이 개별적으로 떨어질 수 있는 최대 거리 계산 (분리 낙하!)
        // 이미 배치된 블록들의 위치를 추적
        const placedPositions = new Set<string>();
        const newBoard = board.map(row => [...row]);

        // 블록들을 낙하 방향 기준으로 정렬 (아래/오른쪽에 있는 블록 먼저 처리)
        const sortedBlocks = [...currentBlocks].sort((a, b) => {
          if (gravityDirection === 'down') return b.y - a.y;  // 아래쪽 먼저
          if (gravityDirection === 'up') return a.y - b.y;    // 위쪽 먼저
          if (gravityDirection === 'right') return b.x - a.x; // 오른쪽 먼저
          return a.x - b.x; // 왼쪽 먼저
        });

        const droppedBlocks: FallingBlock[] = [];

        for (const block of sortedBlocks) {
          let newX = block.x;
          let newY = block.y;

          // 각 블록이 개별적으로 최대한 떨어짐
          while (true) {
            const nextX = newX + dx;
            const nextY = newY + dy;

            // 범위 체크
            if (nextX < 0 || nextX >= BOARD_CONFIG.COLUMNS) break;
            if (nextY < 0 || nextY >= BOARD_CONFIG.ROWS) break;

            // 기존 보드 블록과 충돌 체크
            if (newBoard[nextY]?.[nextX] !== null) break;

            // 이미 배치된 다른 낙하 블록과 충돌 체크
            if (placedPositions.has(`${nextX},${nextY}`)) break;

            newX = nextX;
            newY = nextY;
          }

          // 이 블록의 최종 위치 기록
          placedPositions.add(`${newX},${newY}`);
          droppedBlocks.push({ ...block, x: newX, y: newY });

          // 보드에 임시로 블록 배치 (다음 블록 충돌 계산용)
          newBoard[newY][newX] = {
            id: block.id || uuidv4(),
            color: block.color,
            x: newX,
            y: newY,
            specialType: block.specialType,
            frozenCount: block.specialType === 'frozen' ? 2 : undefined,
            createdAt: Date.now(),
          };
        }

        set({
          currentBlock: droppedBlocks[0] || null,
          currentBlocks: droppedBlocks,
        });

        get().placeBlock();
      },

      doHoldBlock: () => {
        const { currentBlock, holdBlock: currentHold, holdSpecialType: currentHoldSpecial, canHold } = get();
        if (!currentBlock || !canHold) return;

        if (currentHold && currentHoldSpecial !== null) {
          set({
            holdBlock: currentBlock.color,
            holdSpecialType: currentBlock.specialType,
            currentBlock: {
              color: currentHold,
              x: Math.floor(BOARD_CONFIG.COLUMNS / 2),
              y: 0,
              targetY: 0,
              specialType: currentHoldSpecial,
            },
            canHold: false,
          });
        } else {
          set({
            holdBlock: currentBlock.color,
            holdSpecialType: currentBlock.specialType,
            currentBlock: null,
            canHold: false,
          });
          get().spawnBlock();
        }
      },

      placeBlock: () => {
        const { currentBlocks, board, garbagePending, gameMode } = get();
        if (currentBlocks.length === 0) return;

        let newBoard = board.map((row) => [...row]);

        // 모든 낙하 블록을 보드에 배치
        for (const fallingBlock of currentBlocks) {
          const newBlock: Block = {
            id: uuidv4(),
            color: fallingBlock.color,
            x: fallingBlock.x,
            y: fallingBlock.y,
            specialType: fallingBlock.specialType,
            frozenCount: fallingBlock.specialType === 'frozen' ? 2 : undefined,
            createdAt: Date.now(),
          };

          newBoard[fallingBlock.y][fallingBlock.x] = newBlock;
        }

        set({ board: newBoard, currentBlock: null, currentBlocks: [] });

        // 퍼즐 모드: 이동 횟수 감소
        if (gameMode === 'puzzle') {
          get().decrementMoves();
        }

        // 대기 중인 쓰레기 블록 추가 (퍼즐 모드에서는 쓰레기 블록 없음)
        if (garbagePending > 0 && gameMode !== 'puzzle') {
          // 약간의 딜레이 후 쓰레기 블록 추가 (시각적 효과를 위해)
          setTimeout(() => {
            get().addGarbageRows(get().garbagePending);
          }, 100);
        }
      },

      setGravityDirection: (direction) => {
        set({
          gravityDirection: direction,
          isPowerUpSelecting: false,
          selectedGravityDirection: null,
        });
      },

      toggleGravitySelection: (selecting) => {
        set({ isPowerUpSelecting: selecting });
      },

      cycleGravity: () => {
        const { gravityDirection } = get();
        const directions: GravityDirection[] = ['down', 'right', 'up', 'left'];
        const currentIndex = directions.indexOf(gravityDirection);
        const nextIndex = (currentIndex + 1) % directions.length;
        set({ gravityDirection: directions[nextIndex] });
      },

      addPowerUp: (type, count = 1) => {
        const { powerUps } = get();
        const existingIndex = powerUps.findIndex((p) => p.type === type);

        if (existingIndex >= 0) {
          const newPowerUps = [...powerUps];
          newPowerUps[existingIndex] = {
            ...newPowerUps[existingIndex],
            count: newPowerUps[existingIndex].count + count,
          };
          set({ powerUps: newPowerUps });
        } else {
          set({ powerUps: [...powerUps, { type, count }] });
        }
      },

      usePowerUp: (type) => {
        const { powerUps } = get();
        const powerUpIndex = powerUps.findIndex((p) => p.type === type && p.count > 0);

        if (powerUpIndex < 0) return;

        const newPowerUps = [...powerUps];
        newPowerUps[powerUpIndex] = {
          ...newPowerUps[powerUpIndex],
          count: newPowerUps[powerUpIndex].count - 1,
        };

        if (newPowerUps[powerUpIndex].count <= 0) {
          newPowerUps.splice(powerUpIndex, 1);
        }

        set({ powerUps: newPowerUps });
      },

      activatePowerUp: (powerUp) => {
        set({ activePowerUp: powerUp });
      },

      deactivatePowerUp: () => {
        set({ activePowerUp: null });
      },

      updateBoard: (board) => {
        set({ board });
      },

      addScore: (points) => {
        const { score, activePowerUp, isFeverMode } = get();
        let multiplier = activePowerUp?.type === 'scoreMultiplier' ? 2 : 1;
        if (isFeverMode) multiplier *= 3;
        set({ score: score + points * multiplier });
        get().checkLevelUp();
      },

      incrementCombo: () => {
        const { combo, maxCombo } = get();
        const newCombo = combo + 1;
        set({
          combo: newCombo,
          maxCombo: Math.max(maxCombo, newCombo),
          comboTimer: 3,
        });

        // 콤보 피버 게이지 증가
        get().addFeverGauge(FEVER_CONFIG.GAUGE_PER_COMBO * newCombo);
      },

      resetCombo: () => {
        set({ combo: 0, comboTimer: 0 });
      },

      incrementChain: () => {
        const { chainCount } = get();
        const newChain = chainCount + 1;
        set({ chainCount: newChain });

        // 연쇄 피버 게이지 증가
        get().addFeverGauge(FEVER_CONFIG.GAUGE_PER_CHAIN * newChain);
      },

      resetChain: () => {
        set({ chainCount: 0 });
      },

      checkLevelUp: () => {
        const { score, level, gameMode } = get();
        const threshold = getLevelThreshold(level);

        if (score >= threshold) {
          const newLevel = level + 1;
          const objectives = gameMode === 'challenge' ? generateLevelObjectives(newLevel) : get().levelObjectives;
          set({
            level: newLevel,
            levelObjectives: objectives,
          });
        }
      },

      addFeverGauge: (amount) => {
        const { feverGauge, isFeverMode } = get();
        if (isFeverMode) return;

        const newGauge = Math.min(FEVER_CONFIG.MAX_GAUGE, feverGauge + amount);
        set({ feverGauge: newGauge });

        if (newGauge >= FEVER_CONFIG.MAX_GAUGE) {
          get().activateFeverMode();
        }
      },

      activateFeverMode: () => {
        set({ isFeverMode: true, feverGauge: FEVER_CONFIG.MAX_GAUGE });
      },

      deactivateFeverMode: () => {
        set({ isFeverMode: false, feverGauge: 0 });
      },

      updateLevelObjective: (type, value) => {
        const { levelObjectives } = get();
        const newObjectives = levelObjectives.map(obj => {
          if (obj.type === type && !obj.completed) {
            const newCurrent = obj.current + value;
            return {
              ...obj,
              current: newCurrent,
              completed: newCurrent >= obj.target,
            };
          }
          return obj;
        });

        set({ levelObjectives: newObjectives });

        // 모든 목표 달성 체크
        if (newObjectives.length > 0 && newObjectives.every(obj => obj.completed)) {
          set({ gameStatus: 'levelComplete' });
        }
      },

      setDangerLevel: (level) => {
        set({ dangerLevel: level });
      },

      decrementBlocksUntilSpecial: () => {
        const { blocksUntilSpecial } = get();
        if (blocksUntilSpecial > 0) {
          set({ blocksUntilSpecial: blocksUntilSpecial - 1 });
        } else {
          set({ blocksUntilSpecial: 10 + Math.floor(Math.random() * 5) });
        }
      },

      addGarbageRows: (count) => {
        // 한 줄씩 순차적으로 추가 (애니메이션 효과)
        const addSingleRow = (remaining: number) => {
          if (remaining <= 0) {
            set({ garbagePending: 0 });
            return;
          }

          const { board, level } = get();
          const colors = getColorsForLevel(level);
          const newBoard: GameBoard = Array(BOARD_CONFIG.ROWS)
            .fill(null)
            .map(() => Array(BOARD_CONFIG.COLUMNS).fill(null));

          // 기존 블록들을 한 줄 위로 이동 (y좌표도 업데이트)
          for (let y = 1; y < BOARD_CONFIG.ROWS; y++) {
            for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
              const block = board[y][x];
              if (block) {
                newBoard[y - 1][x] = { ...block, y: y - 1 };
              }
            }
          }

          // 맨 아래에 쓰레기 블록 한 줄 추가 (빈칸 1개)
          const gapX = Math.floor(Math.random() * BOARD_CONFIG.COLUMNS);
          const bottomY = BOARD_CONFIG.ROWS - 1;

          for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
            if (x === gapX) {
              newBoard[bottomY][x] = null;
            } else {
              newBoard[bottomY][x] = {
                id: uuidv4(),
                color: colors[Math.floor(Math.random() * colors.length)],
                x,
                y: bottomY,
                specialType: Math.random() < 0.1 ? 'stone' : 'normal',
                createdAt: Date.now(),
              };
            }
          }

          set({ board: newBoard });

          // 게임 오버 체크 - 맨 위에 블록이 있으면
          let hasTopBlock = false;
          for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
            if (newBoard[0][x] !== null) {
              hasTopBlock = true;
              break;
            }
          }
          if (hasTopBlock) {
            get().endGame();
            return;
          }

          // 다음 줄 추가 (300ms 딜레이)
          if (remaining > 1) {
            setTimeout(() => addSingleRow(remaining - 1), 300);
          } else {
            set({ garbagePending: 0 });
          }
        };

        addSingleRow(count);
      },

      incrementGarbageTimer: () => {
        const { garbageTimer, level, garbagePending } = get();
        if (level < DIFFICULTY_CONFIG.GARBAGE_START_LEVEL) return;

        const interval = getGarbageInterval(level);
        const newTimer = garbageTimer + 1;

        if (newTimer >= interval) {
          // 쓰레기 블록 추가 예약
          const rows = Math.min(
            DIFFICULTY_CONFIG.GARBAGE_ROWS_PER_INTERVAL + Math.floor(level / 5),
            DIFFICULTY_CONFIG.GARBAGE_MAX_ROWS
          );
          set({ garbageTimer: 0, garbagePending: garbagePending + rows });
        } else {
          set({ garbageTimer: newTimer });
        }
      },

      updateStatistics: (updates) => {
        const { statistics } = get();
        set({
          statistics: { ...statistics, ...updates },
        });
      },

      updateMissionProgress: (type, value) => {
        const { missionProgress } = get();
        const newDailyMissions = missionProgress.dailyMissions.map((m) => {
          if (m.type === type && !m.completed) {
            const newCurrent = m.current + value;
            return {
              ...m,
              current: newCurrent,
              completed: newCurrent >= m.target,
            };
          }
          return m;
        });

        const newWeeklyMissions = missionProgress.weeklyMissions.map((m) => {
          if (m.type === type && !m.completed) {
            const newCurrent = m.current + value;
            return {
              ...m,
              current: newCurrent,
              completed: newCurrent >= m.target,
            };
          }
          return m;
        });

        set({
          missionProgress: {
            dailyMissions: newDailyMissions,
            weeklyMissions: newWeeklyMissions,
          },
        });
      },

      incrementGameTime: () => {
        const { gameTime, comboTimer, feverGauge, isFeverMode } = get();

        // 콤보 타이머 감소
        if (comboTimer > 0) {
          const newTimer = comboTimer - 1;
          if (newTimer <= 0) {
            get().resetCombo();
          } else {
            set({ comboTimer: newTimer });
          }
        }

        // 피버 게이지 감소 (피버 모드가 아닐 때)
        if (!isFeverMode && feverGauge > 0) {
          set({ feverGauge: Math.max(0, feverGauge - FEVER_CONFIG.DECAY_RATE) });
        }

        // 쓰레기 블록 타이머
        get().incrementGarbageTimer();

        set({ gameTime: gameTime + 1 });
      },

      continueGame: () => {
        const { continues, board } = get();

        const newBoard = board.map((row, y) => {
          if (y < 4) return Array(BOARD_CONFIG.COLUMNS).fill(null);
          return row;
        });

        set({
          board: newBoard,
          gameStatus: 'playing',
          continues: continues + 1,
        });

        get().spawnBlock();
      },

      // 퍼즐 모드: 이동 횟수 감소
      decrementMoves: () => {
        const { movesRemaining, gameMode } = get();
        if (gameMode !== 'puzzle') return;

        const newMoves = movesRemaining - 1;
        set({ movesRemaining: newMoves });

        // 이동 횟수가 0이 되면 목표 달성 여부 체크
        if (newMoves <= 0) {
          get().checkPuzzleComplete();
        }
      },

      // 퍼즐 모드: 다음 레벨로 진행
      nextPuzzleLevel: () => {
        const { puzzleLevel } = get();
        const newLevel = puzzleLevel + 1;
        const newMoves = PUZZLE_CONFIG.getMovesForLevel(newLevel);
        const newObjectives = generatePuzzleObjectives(newLevel);
        const { colors, specialTypes } = generateNextBlocks(6, 1);

        set({
          board: createEmptyBoard(),
          currentBlock: null,
          currentBlocks: [],
          nextBlocks: colors,
          nextSpecialTypes: specialTypes,
          score: 0,
          puzzleLevel: newLevel,
          movesRemaining: newMoves,
          levelObjectives: newObjectives,
          puzzleCompleted: false,
          gameStatus: 'playing',
          combo: 0,
          chainCount: 0,
        });

        setTimeout(() => get().spawnBlock(), 100);
      },

      // 퍼즐 모드: 클리어 체크
      checkPuzzleComplete: () => {
        const { levelObjectives, gameMode, movesRemaining } = get();
        if (gameMode !== 'puzzle') return;

        // 모든 목표 달성 확인
        const allCompleted = levelObjectives.every(obj => obj.completed);

        if (allCompleted) {
          // 퍼즐 클리어!
          set({ puzzleCompleted: true, gameStatus: 'levelComplete' });
        } else if (movesRemaining <= 0) {
          // 이동 횟수 소진, 목표 미달성 = 게임오버
          get().endGame();
        }
      },
    }),
    {
      name: 'chromafall-game-storage',
      partialize: (state) => ({
        statistics: state.statistics,
        powerUps: state.powerUps,
        missionProgress: state.missionProgress,
      }),
    }
  )
);
