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
} from '../types';
import {
  BOARD_CONFIG,
  getColorsForLevel,
  getLevelThreshold,
  GRAVITY_VECTORS,
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

// 다음 블록 배열 생성
function generateNextBlocks(count: number, level: number): BlockColor[] {
  return Array(count)
    .fill(null)
    .map(() => getRandomBlockColor(level));
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
};

// 초기 미션
const initialMissionProgress: MissionProgress = {
  dailyMissions: generateDailyMissions(),
  weeklyMissions: generateWeeklyMissions(),
};

// 초기 게임 상태
const initialGameState: GameState = {
  board: createEmptyBoard(),
  currentBlock: null,
  nextBlocks: [],
  holdBlock: null,
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
  softDrop: () => void;
  hardDrop: () => void;
  doHoldBlock: () => void;
  placeBlock: () => void;

  // 중력 제어
  setGravityDirection: (direction: GravityDirection) => void;
  toggleGravitySelection: (selecting: boolean) => void;

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

  // 통계
  updateStatistics: (updates: Partial<GameStatistics>) => void;

  // 미션
  updateMissionProgress: (type: string, value: number) => void;

  // 게임 시간
  incrementGameTime: () => void;

  // 이어하기
  continueGame: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialGameState,

      startGame: (mode = 'classic') => {
        const level = 1;
        set({
          board: createEmptyBoard(),
          currentBlock: null,
          nextBlocks: generateNextBlocks(5, level),
          holdBlock: null,
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
        });

        // 첫 블록 생성
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
        set({
          ...initialGameState,
          statistics: get().statistics,
          powerUps: get().powerUps,
          missionProgress: get().missionProgress,
        });
      },

      spawnBlock: () => {
        const { nextBlocks, level, gravityDirection, board } = get();

        if (nextBlocks.length === 0) return;

        const color = nextBlocks[0];
        const newNextBlocks = [...nextBlocks.slice(1), getRandomBlockColor(level)];

        // 중력 방향에 따른 시작 위치
        let startX: number, startY: number;
        switch (gravityDirection) {
          case 'down':
            startX = Math.floor(BOARD_CONFIG.COLUMNS / 2);
            startY = 0;
            break;
          case 'up':
            startX = Math.floor(BOARD_CONFIG.COLUMNS / 2);
            startY = BOARD_CONFIG.ROWS - 1;
            break;
          case 'left':
            startX = BOARD_CONFIG.COLUMNS - 1;
            startY = Math.floor(BOARD_CONFIG.ROWS / 2);
            break;
          case 'right':
            startX = 0;
            startY = Math.floor(BOARD_CONFIG.ROWS / 2);
            break;
        }

        // 게임오버 체크 (스폰 위치 또는 그 주변에 블록이 있으면)
        if (board[startY][startX] !== null) {
          get().endGame();
          return;
        }

        // 추가 게임오버 체크: 상단 2줄에 블록이 많으면 위험
        if (gravityDirection === 'down') {
          let topRowBlocks = 0;
          for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
            if (board[0][x] !== null) topRowBlocks++;
            if (board[1][x] !== null) topRowBlocks++;
          }
          // 상단 2줄에 블록이 절반 이상이면 게임오버
          if (topRowBlocks >= BOARD_CONFIG.COLUMNS) {
            get().endGame();
            return;
          }
        }

        const newBlock: FallingBlock = {
          color,
          x: startX,
          y: startY,
          targetY: startY,
        };

        set({
          currentBlock: newBlock,
          nextBlocks: newNextBlocks,
          canHold: true,
        });
      },

      moveBlock: (direction) => {
        const { currentBlock, board, gravityDirection } = get();
        if (!currentBlock) return;

        let newX = currentBlock.x;
        let newY = currentBlock.y;

        // 중력 방향에 따른 이동 방향 계산
        if (gravityDirection === 'down' || gravityDirection === 'up') {
          newX = direction === 'left' ? currentBlock.x - 1 : currentBlock.x + 1;
        } else {
          newY = direction === 'left' ? currentBlock.y - 1 : currentBlock.y + 1;
        }

        // 경계 체크
        if (newX < 0 || newX >= BOARD_CONFIG.COLUMNS) return;
        if (newY < 0 || newY >= BOARD_CONFIG.ROWS) return;

        // 충돌 체크
        if (board[newY][newX] !== null) return;

        set({
          currentBlock: { ...currentBlock, x: newX, y: newY },
        });
      },

      softDrop: () => {
        const { currentBlock, board, gravityDirection } = get();
        if (!currentBlock) return;

        const { dx, dy } = GRAVITY_VECTORS[gravityDirection];
        const newX = currentBlock.x + dx;
        const newY = currentBlock.y + dy;

        // 경계 체크
        if (newX < 0 || newX >= BOARD_CONFIG.COLUMNS) {
          get().placeBlock();
          return;
        }
        if (newY < 0 || newY >= BOARD_CONFIG.ROWS) {
          get().placeBlock();
          return;
        }

        // 충돌 체크
        if (board[newY][newX] !== null) {
          get().placeBlock();
          return;
        }

        set({
          currentBlock: { ...currentBlock, x: newX, y: newY },
        });
      },

      hardDrop: () => {
        const { currentBlock, board, gravityDirection } = get();
        if (!currentBlock) return;

        const { dx, dy } = GRAVITY_VECTORS[gravityDirection];
        let newX = currentBlock.x;
        let newY = currentBlock.y;

        // 끝까지 이동
        while (true) {
          const nextX = newX + dx;
          const nextY = newY + dy;

          if (nextX < 0 || nextX >= BOARD_CONFIG.COLUMNS) break;
          if (nextY < 0 || nextY >= BOARD_CONFIG.ROWS) break;
          if (board[nextY][nextX] !== null) break;

          newX = nextX;
          newY = nextY;
        }

        set({
          currentBlock: { ...currentBlock, x: newX, y: newY },
        });

        get().placeBlock();
      },

      doHoldBlock: () => {
        const { currentBlock, holdBlock: currentHold, canHold } = get();
        if (!currentBlock || !canHold) return;

        if (currentHold) {
          // 홀드된 블록과 교체
          set({
            holdBlock: currentBlock.color,
            currentBlock: {
              color: currentHold,
              x: Math.floor(BOARD_CONFIG.COLUMNS / 2),
              y: 0,
              targetY: 0,
            },
            canHold: false,
          });
        } else {
          // 첫 홀드
          set({
            holdBlock: currentBlock.color,
            currentBlock: null,
            canHold: false,
          });
          get().spawnBlock();
        }
      },

      placeBlock: () => {
        const { currentBlock, board } = get();
        if (!currentBlock) return;

        const newBoard = board.map((row) => [...row]);
        const newBlock: Block = {
          id: uuidv4(),
          color: currentBlock.color,
          x: currentBlock.x,
          y: currentBlock.y,
        };

        newBoard[currentBlock.y][currentBlock.x] = newBlock;
        set({ board: newBoard, currentBlock: null });

        // 융합 체크는 useGameLogic 훅에서 처리
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

        // 0개면 제거
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
        const { score, activePowerUp } = get();
        const multiplier = activePowerUp?.type === 'scoreMultiplier' ? 2 : 1;
        set({ score: score + points * multiplier });
        get().checkLevelUp();
      },

      incrementCombo: () => {
        const { combo, maxCombo } = get();
        const newCombo = combo + 1;
        set({
          combo: newCombo,
          maxCombo: Math.max(maxCombo, newCombo),
        });
      },

      resetCombo: () => {
        set({ combo: 0 });
      },

      incrementChain: () => {
        const { chainCount } = get();
        set({ chainCount: chainCount + 1 });
      },

      resetChain: () => {
        set({ chainCount: 0 });
      },

      checkLevelUp: () => {
        const { score, level } = get();
        const threshold = getLevelThreshold(level);

        if (score >= threshold) {
          set({ level: level + 1 });
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
        const { gameTime } = get();
        set({ gameTime: gameTime + 1 });
      },

      continueGame: () => {
        const { continues, board } = get();

        // 상단 3줄 클리어
        const newBoard = board.map((row, y) => {
          if (y < 3) return Array(BOARD_CONFIG.COLUMNS).fill(null);
          return row;
        });

        set({
          board: newBoard,
          gameStatus: 'playing',
          continues: continues + 1,
        });

        get().spawnBlock();
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
