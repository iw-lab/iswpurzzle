import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type {
  Reward,
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
} from "../types";
import {
  BOARD_CONFIG,
  getColorsForLevel,
  GRAVITY_VECTORS,
  getSpecialBlockChance,
  determineSpecialBlockType,
  generateLevelObjectives,
  generatePuzzleObjectives,
  PUZZLE_CONFIG,
  FEVER_CONFIG,
  DIFFICULTY_CONFIG,
  getFallingBlockCount,
  TIMING_CONFIG,
  getGarbageInterval,
  getRandomShape,
  getModeTimeLimit,
} from "../constants";
import {
  generateDailyMissions,
  generateWeeklyMissions,
} from "../constants/missions";
import { computeDropDistance, createEmptyBoard } from "../engine/board";
import {
  getBlocksForLevel,
  getGarbageRows,
  buildPieceColors,
  PIECE_COLOR_LIMIT,
  MAX_LEVEL,
} from "../engine/difficulty";
import {
  getDailySeed,
  pick,
  random,
  randomInt,
  seededRandom,
  setRandomSource,
} from "../engine/rng";
import { NEXT_QUEUE_MIN } from "../constants/gameConfig";
import {
  getClassesForLevel,
  pickForm,
  CLASS_ID_BY_FORM,
  MATH_NEUTRAL_COLOR,
} from "../constants/mathContent";
import { currentDailyKey, currentWeeklyKey } from "../constants/missions";
import { useUserStore } from "./userStore";

// ────────────────────────────────────────────────────────────
// 세션 epoch — 모든 지연 실행(setTimeout)은 발화 시점의 epoch가
// 현재 세션과 일치할 때만 효력을 갖는다. 재시작 연타 시 구 라운드의
// 타이머가 새 게임을 오염시키는 문제(계획서 #7 #23 #26)의 구조적 해법.
// ────────────────────────────────────────────────────────────
let sessionEpoch = 0;
const pendingTimers = new Set<number>();

function clearPendingTimers(): void {
  pendingTimers.forEach((id) => clearTimeout(id));
  pendingTimers.clear();
}

/** 현재 세션에 묶인 지연 실행. 세션이 바뀌면 콜백은 폐기된다. */
function scheduleForSession(fn: () => void, delay: number): void {
  const epochAtSchedule = sessionEpoch;
  const id = window.setTimeout(() => {
    pendingTimers.delete(id);
    if (epochAtSchedule !== sessionEpoch) return;
    fn();
  }, delay);
  pendingTimers.add(id);
}

/** 새 세션 시작 — 진행 중인 모든 지연 실행을 무효화한다. */
function beginSession(): number {
  sessionEpoch++;
  clearPendingTimers();
  return sessionEpoch;
}

/**
 * 압사 직전 구제 — 중력 반대편(블록이 쌓이는 쪽) 4줄/칸을 비운다.
 * 항상 상단만 지우면 중력이 up일 때 즉시 재-게임오버 루프에 빠진다.
 */
function clearReliefArea(
  board: GameBoard,
  gravityDirection: GravityDirection,
): GameBoard {
  const DEPTH = 4;
  const newBoard = board.map((row) => [...row]);

  if (gravityDirection === "down") {
    for (let y = 0; y < DEPTH; y++) newBoard[y] = Array(BOARD_CONFIG.COLUMNS).fill(null);
  } else if (gravityDirection === "up") {
    for (let y = BOARD_CONFIG.ROWS - DEPTH; y < BOARD_CONFIG.ROWS; y++) {
      newBoard[y] = Array(BOARD_CONFIG.COLUMNS).fill(null);
    }
  } else if (gravityDirection === "left") {
    for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
      for (let x = BOARD_CONFIG.COLUMNS - DEPTH; x < BOARD_CONFIG.COLUMNS; x++) {
        newBoard[y][x] = null;
      }
    }
  } else {
    for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
      for (let x = 0; x < DEPTH; x++) newBoard[y][x] = null;
    }
  }

  return newBoard;
}

// 특수 블록 타입 결정 (후반부 특수 블록 빈도 감소)
function getSpecialType(level: number, blocksPlaced: number): SpecialBlockType {
  // 일정 블록마다 특수 블록 보장 (12 -> 20으로 증가)
  if (blocksPlaced > 0 && blocksPlaced % 20 === 0) {
    return determineSpecialBlockType(level);
  }

  const chance = getSpecialBlockChance(level);
  if (random() < chance) {
    return determineSpecialBlockType(level);
  }
  return "normal";
}

/** 수학 모드에서 조각 한 개 분량의 (색·표기)를 만든다. */
function buildMathPiece(
  level: number,
  count: number,
): { colors: BlockColor[]; labels: string[] } {
  const hint = useUserStore.getState().settings.mathColorHint ?? true;
  const pool = getClassesForLevel(level);
  // 색 배분과 같은 원리: 한 조각에 서로 다른 '값'은 최대 2종.
  // 값이 흩어지면 동색(동값) 4개를 만들 수단이 사라진다 — 기본 모드와 동일한 실패 모드다.
  const bagSize = Math.min(PIECE_COLOR_LIMIT, pool.length, Math.max(1, count));
  const bag: typeof pool = [];
  let guard = 0;
  while (bag.length < bagSize && guard++ < 50) {
    const c = pool[Math.floor(random() * pool.length)];
    if (!bag.includes(c)) bag.push(c);
  }
  if (bag.length === 0) bag.push(pool[0]);

  const colors: BlockColor[] = [];
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    const cls = bag[Math.floor(random() * bag.length)];
    colors.push(hint ? cls.color : MATH_NEUTRAL_COLOR);
    labels.push(pickForm(cls, level, random));
  }
  return { colors, labels };
}

/**
 * 다음 블록 큐 생성 — **조각 단위 청크**로 채운다.
 *
 * 칸마다 독립 난수 색을 넣던 예전 방식이 "블록이 안 터진다"의 원인이었다
 * (engine/difficulty.ts의 PIECE_COLOR_LIMIT 주석에 실측 근거).
 * 큐를 조각 크기로 끊어 담으므로 NEXT 미리보기도 실제 조각과 일치한다.
 */
function generateNextBlocks(
  minLength: number,
  level: number,
  blocksPlaced = 0,
  mode: GameMode = "classic",
): {
  colors: BlockColor[];
  specialTypes: SpecialBlockType[];
  labels: (string | null)[];
} {
  const colors: BlockColor[] = [];
  const specialTypes: SpecialBlockType[] = [];
  const labels: (string | null)[] = [];
  const pieceSize = mode === "puzzle" ? 1 : getFallingBlockCount(level);

  while (colors.length < minLength) {
    const isMath = mode === "math";
    const piece = isMath
      ? buildMathPiece(level, pieceSize)
      : { colors: buildPieceColors(level, pieceSize, random), labels: null };
    const pieceSpecial = getSpecialType(level, blocksPlaced + colors.length);
    piece.colors.forEach((c, i) => {
      colors.push(c);
      // 특수블록은 조각당 1개 — 청크의 첫 칸에만 붙는다.
      specialTypes.push(i === 0 ? pieceSpecial : "normal");
      labels.push(piece.labels ? piece.labels[i] : null);
    });
  }

  return { colors, specialTypes, labels };
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
  dailyKey: currentDailyKey(),
  weeklyKey: currentWeeklyKey(),
};

/**
 * 날짜 경계에서 미션을 재생성한다. 키가 없거나(구버전 persist)
 * 오늘/이번 주와 다르면 해당 묶음만 새로 만든다.
 */
function refreshMissionsForToday(progress: MissionProgress): MissionProgress {
  const dailyKey = currentDailyKey();
  const weeklyKey = currentWeeklyKey();
  if (progress.dailyKey === dailyKey && progress.weeklyKey === weeklyKey) {
    return progress;
  }
  return {
    dailyMissions:
      progress.dailyKey === dailyKey
        ? progress.dailyMissions
        : generateDailyMissions(),
    weeklyMissions:
      progress.weeklyKey === weeklyKey
        ? progress.weeklyMissions
        : generateWeeklyMissions(),
    dailyKey,
    weeklyKey,
  };
}

// 초기 게임 상태
const initialGameState: GameState = {
  board: createEmptyBoard(),
  currentBlock: null,
  currentBlocks: [],
  nextBlocks: [],
  nextSpecialTypes: [],
  nextLabels: [],
  holdBlock: null,
  holdSpecialType: null,
  canHold: true,
  score: 0,
  level: 1,
  combo: 0,
  maxCombo: 0,
  chainCount: 0,
  gameStatus: "ready",
  gameMode: "classic",
  powerUps: [],
  activePowerUp: null,
  gravityDirection: "down",
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
  feverStartTime: 0,
  sessionEpoch: 0,
  blocksCleared: 0,
  dailySeed: null,
  lastGameHighScore: 0,
};

/** 홀드 보관함 — 조각 '전체'를 담는다. 자세한 이유는 doHoldBlock 주석 참조. */
export interface HeldPiece {
  colors: BlockColor[];
  labels: (string | null)[];
  specialTypes: SpecialBlockType[];
}

interface GameStore extends GameState {
  holdPiece: HeldPiece | null;
  // 게임 제어
  startGame: (mode?: GameMode) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;

  // 블록 제어
  spawnBlock: () => void;
  moveBlock: (direction: "left" | "right") => void;
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
  consumePowerUp: (type: PowerUpType) => void;
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
  addClearedBlocks: (count: number) => void;

  // 새로운 기능들
  addFeverGauge: (amount: number) => void;
  activateFeverMode: () => void;
  deactivateFeverMode: () => void;
  updateLevelObjective: (
    type: string,
    value: number,
    color?: BlockColor,
  ) => void;
  setDangerLevel: (level: number) => void;
  decrementBlocksUntilSpecial: () => void;

  // 쓰레기 블록
  addGarbageRows: (count: number) => void;
  incrementGarbageTimer: () => void;

  // 통계
  updateStatistics: (updates: Partial<GameStatistics>) => void;

  // 미션
  updateMissionProgress: (type: string, value: number) => void;
  /** 완료된 미션의 보상을 청구한다. 이미 받았거나 미완료면 null. */
  claimMission: (scope: "daily" | "weekly", id: string) => Reward | null;

  // 게임 시간
  incrementGameTime: () => void;

  // 이어하기
  continueGame: () => void;

  // 퍼즐 모드
  decrementMoves: () => void;
  nextPuzzleLevel: () => void;
  checkPuzzleComplete: () => void;

  // 챌린지 모드
  nextChallengeLevel: () => void;

  // 블록 카운터
  blocksPlaced: number;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialGameState,
      holdPiece: null,
      blocksPlaced: 0,

      startGame: (mode = "classic") => {
        const epoch = beginSession();
        const level = 1;
        const puzzleLevel = 1;

        // 데일리 챌린지: 날짜 시드를 난수 소스에 주입해 전원이 같은 판을 받는다.
        const dailySeed = mode === "daily" ? getDailySeed() : null;
        setRandomSource(dailySeed !== null ? seededRandom(dailySeed) : null);

        // 미션은 날짜 경계에서만 재생성 (판마다 초기화하지 않는다)
        const missionProgress = refreshMissionsForToday(get().missionProgress);

        // 퍼즐 모드는 블록 1개씩만 떨어짐
        const blockCount = mode === "puzzle" ? 1 : getFallingBlockCount(level);
        const { colors, specialTypes, labels } = generateNextBlocks(
          5 + blockCount,
          level,
          0,
          mode,
        );

        // 모드별 목표 설정
        let objectives: LevelObjective[] = [];
        if (mode === "challenge") {
          objectives = generateLevelObjectives(level);
        } else if (mode === "puzzle") {
          objectives = generatePuzzleObjectives(puzzleLevel);
        }

        // 퍼즐 모드 이동 횟수
        const movesRemaining =
          mode === "puzzle" ? PUZZLE_CONFIG.getMovesForLevel(puzzleLevel) : 0;

        set({
          board: createEmptyBoard(),
          currentBlock: null,
          currentBlocks: [],
          nextBlocks: colors,
          nextSpecialTypes: specialTypes,
          nextLabels: labels,
          holdBlock: null,
          holdPiece: null,
          holdSpecialType: null,
          canHold: true,
          score: 0,
          level,
          combo: 0,
          maxCombo: 0,
          chainCount: 0,
          gameStatus: "playing",
          gameMode: mode,
          activePowerUp: null,
          gravityDirection: "down",
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
          feverStartTime: 0,
          sessionEpoch: epoch,
          blocksCleared: 0,
          dailySeed,
          // 신기록 판정용 — endGame이 highScore를 갱신하기 전 값을 여기 보관한다.
          lastGameHighScore: get().statistics.highScore,
          missionProgress,
        });

        scheduleForSession(() => get().spawnBlock(), 100);
      },

      pauseGame: () => {
        if (get().gameStatus === "playing") {
          set({ gameStatus: "paused" });
        }
      },

      resumeGame: () => {
        if (get().gameStatus === "paused") {
          set({ gameStatus: "playing" });
        }
      },

      endGame: () => {
        const {
          score,
          statistics,
          combo,
          chainCount,
          gameMode,
          gameTime,
          level,
          gravityDirection,
        } = get();

        // Zen 모드는 게임오버가 없음 - 중력 반대편(=쌓이는 쪽) 4줄을 비우고 계속
        if (gameMode === "zen") {
          const { board } = get();
          const newBoard = clearReliefArea(board, gravityDirection);
          set({ board: newBoard, currentBlock: null, currentBlocks: [] });
          scheduleForSession(() => get().spawnBlock(), 100);
          return;
        }

        clearPendingTimers();
        setRandomSource(null); // 시드 모드 종료

        // 유저 진행도(XP·코인·랭크·칭호) 동기화 —
        // processGameResult가 정의만 되고 호출되지 않아 끊겨 있던 라인(#12).
        const user = useUserStore.getState();
        user.processGameResult({
          score,
          combo,
          chain: chainCount,
          level,
          mode: gameMode,
        });
        user.updateAchievement("score_10k", score);
        user.updateAchievement("score_100k", score);
        user.updateAchievement("games_10", 1);
        user.updateAchievement("games_100", 1);

        get().updateMissionProgress("games_played", 1);
        get().updateMissionProgress("score", score);
        get().updateMissionProgress("total_score", score);
        get().updateMissionProgress("mode_played", 1);
        get().updateMissionProgress("max_combo", combo);
        get().updateMissionProgress("max_chain", chainCount);
        get().updateMissionProgress("max_level", level);

        set({
          gameStatus: "gameover",
          currentBlock: null,
          currentBlocks: [],
          statistics: {
            ...statistics,
            totalGamesPlayed: statistics.totalGamesPlayed + 1,
            totalScore: statistics.totalScore + score,
            highScore: Math.max(statistics.highScore, score),
            maxCombo: Math.max(statistics.maxCombo, combo),
            maxChain: Math.max(statistics.maxChain, chainCount),
            totalPlayTime: statistics.totalPlayTime + gameTime,
            levelsCompleted: statistics.levelsCompleted + Math.max(0, level - 1),
          },
        });
      },

      resetGame: () => {
        beginSession();
        setRandomSource(null);
        set({
          ...initialGameState,
          holdPiece: null,
          statistics: get().statistics,
          powerUps: get().powerUps,
          missionProgress: get().missionProgress,
          sessionEpoch,
        });
      },

      spawnBlock: () => {
        const {
          nextBlocks,
          nextSpecialTypes,
          nextLabels,
          level,
          gravityDirection,
          board,
          blocksPlaced,
          currentBlocks,
          gameStatus,
          gameMode,
        } = get();

        // 이미 블록이 있거나 게임 중이 아니면 생성하지 않음
        if (currentBlocks.length > 0) return;
        if (gameStatus !== "playing") return;

        {
          const blockCount = getFallingBlockCount(level);

          // nextBlocks가 부족하면 조각 단위 청크로 보충한다.
          // (칸별 독립 난수 → 조각 내 2색 상한으로 교체. difficulty.ts 참조)
          const currentNextBlocks = [...nextBlocks];
          const currentNextSpecialTypes = [...nextSpecialTypes];
          const currentNextLabels = [...nextLabels];
          while (currentNextBlocks.length < NEXT_QUEUE_MIN) {
            const isMath = gameMode === "math";
            const piece = isMath
              ? buildMathPiece(level, blockCount)
              : {
                  colors: buildPieceColors(level, blockCount, random),
                  labels: null as string[] | null,
                };
            const pieceSpecial = getSpecialType(
              level,
              blocksPlaced + currentNextBlocks.length,
            );
            piece.colors.forEach((c, i) => {
              currentNextBlocks.push(c);
              currentNextSpecialTypes.push(i === 0 ? pieceSpecial : "normal");
              currentNextLabels.push(piece.labels ? piece.labels[i] : null);
            });
          }

          // 블록 모양 선택
          const shape = getRandomShape(blockCount);
          const offsets = shape.offsets;

          // 모양의 경계 계산
          const minX = Math.min(...offsets.map((o) => o[0]));
          const maxX = Math.max(...offsets.map((o) => o[0]));
          const minY = Math.min(...offsets.map((o) => o[1]));
          const maxY = Math.max(...offsets.map((o) => o[1]));
          const shapeWidth = maxX - minX + 1;
          const shapeHeight = maxY - minY + 1;

          // 시작 위치 결정 (중앙에서 시작, 모양 크기 고려)
          let baseX: number, baseY: number;

          switch (gravityDirection) {
            case "down":
              baseX = Math.floor((BOARD_CONFIG.COLUMNS - shapeWidth) / 2);
              baseY = 0;
              break;
            case "up":
              baseX = Math.floor((BOARD_CONFIG.COLUMNS - shapeWidth) / 2);
              baseY = BOARD_CONFIG.ROWS - 1 - shapeHeight + 1;
              break;
            case "left":
              baseX = BOARD_CONFIG.COLUMNS - shapeWidth;
              baseY = Math.floor((BOARD_CONFIG.ROWS - shapeHeight) / 2);
              break;
            case "right":
              baseX = 0;
              baseY = Math.floor((BOARD_CONFIG.ROWS - shapeHeight) / 2);
              break;
          }

          // 모양에 따라 블록 생성
          // 각 블록마다 다른 색상! (같은 색이면 바로 터져서 너무 쉬움)
          // 실제로 생성된 개수만 큐에서 소비한다 — 일부 칸이 막혀도
          // 예약된 특수블록·색이 통째로 유실되지 않도록(#19).
          const newBlocks: FallingBlock[] = [];
          let consumed = 0;
          let specialConsumed = false;

          for (let i = 0; i < offsets.length; i++) {
            const [dx, dy] = offsets[i];
            const startX = baseX + dx;
            const startY = baseY + dy;

            // 범위 체크
            if (startX < 0 || startX >= BOARD_CONFIG.COLUMNS) continue;
            if (startY < 0 || startY >= BOARD_CONFIG.ROWS) continue;
            if (board[startY][startX] !== null) continue;

            const color = currentNextBlocks[consumed] ?? currentNextBlocks[0];
            const label = currentNextLabels[consumed] ?? null;
            // 특수블록은 조각당 1개 — 첫 번째로 실제 생성되는 칸에 부여한다.
            const specialType = specialConsumed
              ? "normal"
              : (currentNextSpecialTypes[0] ?? "normal");
            if (!specialConsumed) specialConsumed = true;

            newBlocks.push({
              id: uuidv4(),
              color,
              x: startX,
              y: startY,
              targetY: startY,
              specialType,
              // 수학 모드: 표기(label)와 융합 판정 키(동치류 id)를 함께 싣는다.
              ...(label
                ? { label, matchKey: CLASS_ID_BY_FORM[label] ?? label }
                : {}),
            });
            consumed++;
          }

          // 게임오버 체크 - 모든 시작 위치가 막힘
          if (newBlocks.length === 0) {
            get().endGame();
            return;
          }

          // 상단 줄 게임오버 체크
          if (gravityDirection === "down") {
            let topRowBlocks = 0;
            for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
              if (board[0][x] !== null) topRowBlocks++;
              if (board[1][x] !== null) topRowBlocks++;
            }
            if (topRowBlocks >= BOARD_CONFIG.COLUMNS) {
              get().endGame();
              return;
            }
          }

          // 큐는 항상 '조각 하나'(= blockCount) 단위로 당긴다.
          // 색·특수를 각각 다른 양만큼 당기면 청크 경계가 어긋나 조각이
          // 3색 이상을 갖게 되고, NEXT 미리보기도 실제 조각과 달라진다.
          // 일부 칸이 막혀 consumed < blockCount 여도 그 조각은 소비된 것으로 본다
          // (모든 칸이 막히면 위에서 이미 endGame 처리).
          const newNextBlocks = currentNextBlocks.slice(blockCount);
          const newNextSpecialTypes = currentNextSpecialTypes.slice(blockCount);
          const newNextLabels = currentNextLabels.slice(blockCount);

          set({
            currentBlock: newBlocks[0] || null,
            currentBlocks: newBlocks,
            nextBlocks: newNextBlocks,
            nextSpecialTypes: newNextSpecialTypes,
            nextLabels: newNextLabels,
            canHold: true,
            blocksPlaced: blocksPlaced + consumed,
            fallingBlockCount: blockCount,
            currentShapeOffsets: offsets as [number, number][],
            basePosition: { x: baseX, y: baseY },
          });
        }
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

          if (gravityDirection === "down" || gravityDirection === "up") {
            newX = direction === "left" ? block.x - 1 : block.x + 1;
          } else {
            newY = direction === "left" ? block.y - 1 : block.y + 1;
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
          if (
            newX < 0 ||
            newX >= BOARD_CONFIG.COLUMNS ||
            newY < 0 ||
            newY >= BOARD_CONFIG.ROWS
          ) {
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
          const kicks = [
            [-1, 0],
            [1, 0],
            [-2, 0],
            [2, 0],
            [0, -1],
            [0, 1],
          ];

          for (const [kickX, kickY] of kicks) {
            const kickedBlocks: FallingBlock[] = [];
            let kickWorks = true;

            for (let i = 0; i < currentBlocks.length; i++) {
              const block = currentBlocks[i];
              const relX = block.x - pivot.x;
              const relY = block.y - pivot.y;
              const newX = pivot.x - relY + kickX;
              const newY = pivot.y + relX + kickY;

              if (
                newX < 0 ||
                newX >= BOARD_CONFIG.COLUMNS ||
                newY < 0 ||
                newY >= BOARD_CONFIG.ROWS ||
                board[newY]?.[newX] !== null
              ) {
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
          const newOffsets: [number, number][] = newBlocks.map(
            (b) => [b.x - firstBlock.x, b.y - firstBlock.y] as [number, number],
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

        for (const block of currentBlocks) {
          const newX = block.x + dx;
          const newY = block.y + dy;

          // 범위 체크
          if (
            newX < 0 ||
            newX >= BOARD_CONFIG.COLUMNS ||
            newY < 0 ||
            newY >= BOARD_CONFIG.ROWS
          ) {
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
        const updatedBlocks = currentBlocks.map((block) => ({
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

        // 조각 모양을 유지한 채 통째로 낙하한다.
        // 고스트(getGhostPosition)와 동일한 computeDropDistance를 쓰므로
        // "보이는 대로 떨어진다"가 보장된다(#14).
        const distance = computeDropDistance(
          board,
          currentBlocks,
          gravityDirection,
        );

        const droppedBlocks = currentBlocks.map((block) => ({
          ...block,
          x: block.x + dx * distance,
          y: block.y + dy * distance,
        }));

        set({
          currentBlock: droppedBlocks[0] || null,
          currentBlocks: droppedBlocks,
        });

        get().placeBlock();
      },

      doHoldBlock: () => {
        const {
          currentBlocks,
          holdPiece,
          canHold,
          nextBlocks,
          nextSpecialTypes,
          nextLabels,
        } = get();
        if (currentBlocks.length === 0 || !canHold) return;

        // ⚠️ 조각 '전체'를 보관한다.
        // 예전에는 첫 칸의 색 하나만 보관하고 나머지는 버렸다(3칸 조각이면 2칸 증발).
        // 게다가 되돌려줄 때 큐 맨 앞에 1칸만 꽂아서, 조각 단위로 정렬돼 있던
        // next 큐의 청크 경계가 통째로 밀렸다 — 이후 조각들이 서로 다른 청크의
        // 색을 섞어 받게 되고, 결국 "조각 내 색 2종" 규칙이 깨진다.
        const held: HeldPiece = {
          colors: currentBlocks.map((b) => b.color),
          labels: currentBlocks.map((b) => b.label ?? null),
          specialTypes: currentBlocks.map((b) => b.specialType),
        };

        if (holdPiece) {
          // 보관돼 있던 조각을 큐 맨 앞에 '통째로' 되돌린다 — 청크 정렬 유지.
          set({
            holdPiece: held,
            holdBlock: held.colors[0],
            holdSpecialType: held.specialTypes[0],
            currentBlock: null,
            currentBlocks: [],
            nextBlocks: [...holdPiece.colors, ...nextBlocks],
            nextSpecialTypes: [...holdPiece.specialTypes, ...nextSpecialTypes],
            nextLabels: [...holdPiece.labels, ...nextLabels],
            canHold: false,
          });
        } else {
          set({
            holdPiece: held,
            holdBlock: held.colors[0],
            holdSpecialType: held.specialTypes[0],
            currentBlock: null,
            currentBlocks: [],
            canHold: false,
          });
        }

        get().spawnBlock();
        // spawnBlock은 canHold를 true로 되돌리므로, 홀드 1회 제한을 다시 건다.
        set({ canHold: false });
      },

      placeBlock: () => {
        const { currentBlocks, board, gameMode } = get();
        if (currentBlocks.length === 0) return;

        const newBoard = board.map((row) => [...row]);

        // 모든 낙하 블록을 보드에 배치
        for (const fallingBlock of currentBlocks) {
          const posX = Math.round(fallingBlock.x);
          const posY = Math.round(fallingBlock.y);

          // 범위 체크
          if (posX < 0 || posX >= BOARD_CONFIG.COLUMNS) continue;
          if (posY < 0 || posY >= BOARD_CONFIG.ROWS) continue;

          const newBlock: Block = {
            id: uuidv4(),
            color: fallingBlock.color,
            // 중요: 배열 인덱스와 블록 좌표를 완전히 동기화!
            x: posX,
            y: posY,
            specialType: fallingBlock.specialType,
            frozenCount: fallingBlock.specialType === "frozen" ? 2 : undefined,
            createdAt: Date.now(),
            matchKey: fallingBlock.matchKey,
            label: fallingBlock.label,
          };

          newBoard[posY][posX] = newBlock;
        }

        // 배치 후 모든 블록의 좌표를 배열 위치와 동기화 (안전장치)
        for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
          for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
            if (newBoard[y][x]) {
              newBoard[y][x] = { ...newBoard[y][x]!, x, y };
            }
          }
        }

        set({ board: newBoard, currentBlock: null, currentBlocks: [] });

        // 퍼즐 모드: 이동 횟수 감소.
        // 클리어 판정은 융합/연쇄가 모두 정산된 뒤에 해야 한다 —
        // 마지막 수로 목표를 달성해도 그 전에 게임오버되던 문제(#5).
        if (gameMode === "puzzle") {
          get().decrementMoves();
        }

        // ⚠️ 여기서 쓰레기 줄을 넣지 않는다.
        // 예전에는 placeBlock 직후 100ms 뒤에 addGarbageRows를 예약했는데,
        // 게임 루프는 50ms마다 돌기 때문에 그 사이에 연쇄 반응이 시작된다.
        // 연쇄는 자기 workingBoard를 들고 있다가 updateBoard로 되쓰므로,
        // 중간에 삽입된 쓰레기 줄이 통째로 지워지거나(줄이 증발) 반대로
        // 연쇄 결과가 밀려 올라간 보드에 덮여 좌표가 어긋났다.
        // 이제 useGameLogic 게임 루프가 '낙하 블록 없음 + 융합 그룹 없음 +
        // 처리 중 아님'이 모두 성립하는 정착 시점에만 삽입한다.
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
        const directions: GravityDirection[] = ["down", "right", "up", "left"];
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

      consumePowerUp: (type) => {
        const { powerUps } = get();
        const powerUpIndex = powerUps.findIndex(
          (p) => p.type === type && p.count > 0,
        );

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
        // 모든 블록의 좌표를 배열 위치와 동기화
        const syncedBoard = board.map((row, y) =>
          row.map((block, x) => (block ? { ...block, x, y } : null)),
        );
        set({ board: syncedBoard });
      },

      addScore: (points) => {
        // ⚠️ 배율은 calculateScore(engine/scoring)에서 이미 적용되었다.
        // 여기서 다시 곱하면 피버가 ×9가 된다(#2). 순수 가산만 한다.
        set({ score: get().score + points });
      },

      incrementCombo: () => {
        const { combo, maxCombo } = get();
        const newCombo = combo + 1;
        set({
          combo: newCombo,
          maxCombo: Math.max(maxCombo, newCombo),
          // 콤보 유지 시간의 단일 진실 (초 단위, incrementGameTime이 감소시킨다)
          comboTimer: Math.round(TIMING_CONFIG.COMBO_TIMEOUT / 1000),
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

      /**
       * 레벨업 판정 — 기준은 "누적 클리어 블록 수"다(계획서 §2.2).
       * 점수는 연쇄^2.2로 폭증하므로 레벨 기준으로 쓰면 난이도가 폭주한다.
       * 챌린지/퍼즐은 목표 달성으로만 레벨이 오르므로 여기서 건드리지 않는다(#3).
       */
      checkLevelUp: () => {
        const { level, blocksCleared, gameMode } = get();
        if (gameMode === "challenge" || gameMode === "puzzle") return;
        if (gameMode === "survival") return; // 서바이벌은 시간 기반 단독(#17)
        if (level >= MAX_LEVEL) return;

        let newLevel = level;
        let consumed = 0;
        while (
          newLevel < MAX_LEVEL &&
          blocksCleared - consumed >= getBlocksForLevel(newLevel)
        ) {
          consumed += getBlocksForLevel(newLevel);
          newLevel++;
        }

        if (newLevel !== level) {
          set({ level: newLevel });
          get().updateMissionProgress("level_reached", newLevel - level);
        }
      },

      /** 클리어된 블록 수 누적 — 레벨업의 유일한 입력. */
      addClearedBlocks: (count) => {
        set({ blocksCleared: get().blocksCleared + count });
        get().checkLevelUp();
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
        set({
          isFeverMode: true,
          feverGauge: FEVER_CONFIG.MAX_GAUGE,
          feverStartTime: Date.now(),
        });
      },

      deactivateFeverMode: () => {
        set({ isFeverMode: false, feverGauge: 0, feverStartTime: 0 });
      },

      /**
       * 목표 진행 갱신. color 인자를 받아 clearColor 목표도 갱신 가능하다.
       * 예전에는 score/clearBlocks/chains 3종만 호출돼 clearSpecial·clearStone·
       * clearColor 목표가 영구 미달성이었다(#4).
       */
      updateLevelObjective: (type, value, color) => {
        const { levelObjectives } = get();
        const newObjectives = levelObjectives.map((obj) => {
          if (obj.type === type && !obj.completed) {
            // 색 지정 목표는 색이 일치할 때만 진행
            if (obj.color && color && obj.color !== color) return obj;
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
        if (
          newObjectives.length > 0 &&
          newObjectives.every((obj) => obj.completed)
        ) {
          set({ gameStatus: "levelComplete" });
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
          set({ blocksUntilSpecial: 10 + randomInt(5) });
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

          // 밀어올릴 때 최상단 줄에 블록이 있으면 그 블록들은 갈 곳이 없다.
          // 예전에는 조용히 버려서 게임오버 판정 자체가 증발했다(#9).
          // 이제는 밀어올리기 전에 게임오버로 확정한다.
          const topRowOccupied = board[0].some((cell) => cell !== null);
          if (topRowOccupied) {
            set({ garbagePending: 0 });
            get().endGame();
            return;
          }

          const newBoard: GameBoard = Array(BOARD_CONFIG.ROWS)
            .fill(null)
            .map(() => Array(BOARD_CONFIG.COLUMNS).fill(null));

          // 기존 블록들을 한 줄 위로 이동 (x, y 좌표 모두 업데이트)
          for (let y = 1; y < BOARD_CONFIG.ROWS; y++) {
            for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
              const block = board[y][x];
              if (block) {
                newBoard[y - 1][x] = { ...block, x: x, y: y - 1 };
              }
            }
          }

          // 맨 아래에 쓰레기 블록 한 줄 추가 (빈칸 1개)
          const gapX = randomInt(BOARD_CONFIG.COLUMNS);
          const bottomY = BOARD_CONFIG.ROWS - 1;

          for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
            if (x === gapX) {
              newBoard[bottomY][x] = null;
            } else {
              newBoard[bottomY][x] = {
                id: uuidv4(),
                color: pick(colors),
                x,
                y: bottomY,
                specialType: random() < 0.1 ? "stone" : "normal",
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
            scheduleForSession(() => addSingleRow(remaining - 1), 300);
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
          const rows = getGarbageRows(level);
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
        // max_* / level_reached 계열은 누적이 아니라 최고치 갱신이다.
        const isPeak = type.startsWith("max_") || type === "level_reached";
        const nextValue = (current: number) =>
          isPeak ? Math.max(current, value) : current + value;

        const newDailyMissions = missionProgress.dailyMissions.map((m) => {
          if (m.type === type && !m.completed) {
            const newCurrent = nextValue(m.current);
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
            const newCurrent = nextValue(m.current);
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
            ...missionProgress,
            dailyMissions: newDailyMissions,
            weeklyMissions: newWeeklyMissions,
          },
        });
      },

      claimMission: (scope, id) => {
        const { missionProgress } = get();
        const list =
          scope === "daily"
            ? missionProgress.dailyMissions
            : missionProgress.weeklyMissions;
        const mission = list.find((m) => m.id === id);
        if (!mission || !mission.completed || mission.claimed) return null;

        const next = list.map((m) =>
          m.id === id ? { ...m, claimed: true } : m,
        );
        set({
          missionProgress: {
            ...missionProgress,
            [scope === "daily" ? "dailyMissions" : "weeklyMissions"]: next,
          },
        });
        // 실제 지급은 stores/rewards.ts의 grantReward가 담당한다(파워업 포함).
        return mission.reward;
      },

      incrementGameTime: () => {
        const {
          gameTime,
          comboTimer,
          feverGauge,
          isFeverMode,
          gameMode,
          level,
        } = get();

        // 콤보 타이머 감소
        if (comboTimer > 0) {
          const newTimer = comboTimer - 1;
          if (newTimer <= 0) {
            get().resetCombo();
          } else {
            set({ comboTimer: newTimer });
          }
        }

        // 피버 모드 지속시간 체크 (8초)
        if (isFeverMode) {
          const startedAt = get().feverStartTime || Date.now();
          if (Date.now() - startedAt > FEVER_CONFIG.FEVER_DURATION) {
            get().deactivateFeverMode();
          }
        }

        // 피버 게이지 감소 (피버 모드가 아닐 때)
        if (!isFeverMode && feverGauge > 0) {
          set({
            feverGauge: Math.max(0, feverGauge - FEVER_CONFIG.DECAY_RATE),
          });
        }

        // 파워업 지속시간 — 게임 시간 기준으로 만료시킨다.
        // 예전에는 PowerUpBar의 setTimeout이 유일한 해제 경로여서,
        // 일시정지 중에도 시간이 흐르고 재시작하면 구 타이머가 새 판의
        // 파워업을 꺼버렸다. freeze가 여기 걸리면 낙하가 영구 정지한다.
        const active = get().activePowerUp;
        if (active?.remainingTime !== undefined) {
          const left = active.remainingTime - 1;
          if (left <= 0) {
            get().deactivatePowerUp();
          } else {
            set({ activePowerUp: { ...active, remainingTime: left } });
          }
        }

        // 쓰레기 블록 타이머 (Zen 모드와 퍼즐 모드 제외)
        if (gameMode !== "zen" && gameMode !== "puzzle") {
          get().incrementGarbageTimer();
        }

        // Survival 모드: 시간 기반 레벨업 단독 (점수 기반은 checkLevelUp에서 차단)
        if (gameMode === "survival") {
          if (gameTime > 0 && gameTime % 10 === 0 && level < MAX_LEVEL) {
            set({ level: level + 1 });
          }
        }

        // 서바이벌 목표(생존 시간) 갱신
        get().updateLevelObjective("surviveTime", 1);

        set({ gameTime: gameTime + 1 });
      },

      continueGame: () => {
        const { continues, board, gravityDirection, gameMode } = get();

        // 시간제 모드는 gameTime을 되돌려주지 않으면 이어하기 즉시 재종료된다(#8).
        const timeLimit = getModeTimeLimit(gameMode);
        const CONTINUE_BONUS_SECONDS = 30;
        const restoredTime =
          timeLimit !== null
            ? Math.max(0, timeLimit - CONTINUE_BONUS_SECONDS)
            : get().gameTime;

        set({
          board: clearReliefArea(board, gravityDirection),
          gameStatus: "playing",
          continues: continues + 1,
          currentBlock: null,
          currentBlocks: [],
          gameTime: restoredTime,
          garbageTimer: 0,
          garbagePending: 0,
          dangerLevel: 0,
          comboTimer: 0,
          combo: 0,
          chainCount: 0,
        });

        get().spawnBlock();
      },

      // 퍼즐 모드: 이동 횟수 감소
      decrementMoves: () => {
        const { movesRemaining, gameMode } = get();
        if (gameMode !== "puzzle") return;

        // 카운트만 줄인다. 마지막 수의 융합 결과가 반영되기 전에
        // 게임오버를 확정하면 안 되므로, 판정은 연쇄 종료 후
        // useGameLogic이 checkPuzzleComplete를 호출해 수행한다(#5).
        set({ movesRemaining: movesRemaining - 1 });
      },

      // 퍼즐 모드: 다음 레벨로 진행
      nextPuzzleLevel: () => {
        const { puzzleLevel } = get();
        const newLevel = puzzleLevel + 1;
        const newMoves = PUZZLE_CONFIG.getMovesForLevel(newLevel);
        const newObjectives = generatePuzzleObjectives(newLevel);
        const { colors, specialTypes, labels } = generateNextBlocks(6, 1, 0, "puzzle");

        set({
          board: createEmptyBoard(),
          currentBlock: null,
          currentBlocks: [],
          nextBlocks: colors,
          nextSpecialTypes: specialTypes,
          nextLabels: labels,
          score: 0,
          puzzleLevel: newLevel,
          movesRemaining: newMoves,
          levelObjectives: newObjectives,
          puzzleCompleted: false,
          gameStatus: "playing",
          combo: 0,
          chainCount: 0,
        });

        scheduleForSession(() => get().spawnBlock(), 100);
      },

      // 챌린지 모드: 다음 레벨로 진행
      nextChallengeLevel: () => {
        const { level } = get();
        const newLevel = level + 1;
        const newObjectives = generateLevelObjectives(newLevel);
        const blockCount = getFallingBlockCount(newLevel);
        const { colors, specialTypes, labels } = generateNextBlocks(
          5 + blockCount,
          newLevel,
          0,
          "challenge",
        );

        set({
          board: createEmptyBoard(),
          currentBlock: null,
          currentBlocks: [],
          nextBlocks: colors,
          nextSpecialTypes: specialTypes,
          nextLabels: labels,
          level: newLevel,
          levelObjectives: newObjectives,
          gameStatus: "playing",
          combo: 0,
          chainCount: 0,
          feverGauge: 0,
          isFeverMode: false,
        });

        scheduleForSession(() => get().spawnBlock(), 100);
      },

      // 퍼즐 모드: 클리어 체크
      checkPuzzleComplete: () => {
        const { levelObjectives, gameMode, movesRemaining } = get();
        if (gameMode !== "puzzle") return;

        // 모든 목표 달성 확인
        const allCompleted = levelObjectives.every((obj) => obj.completed);

        if (allCompleted) {
          // 퍼즐 클리어!
          set({ puzzleCompleted: true, gameStatus: "levelComplete" });
        } else if (movesRemaining <= 0) {
          // 이동 횟수 소진, 목표 미달성 = 게임오버
          get().endGame();
        }
      },
    }),
    {
      name: "chromafall-game-storage",
      partialize: (state) => ({
        statistics: state.statistics,
        powerUps: state.powerUps,
        missionProgress: state.missionProgress,
      }),
    },
  ),
);

// 개발 빌드 한정 디버그 훅 — 헤드리스 QA에서 스토어 상태를 들여다보기 위한 통로.
// 프로덕션 번들에는 포함되지 않는다(import.meta.env.DEV 트리셰이킹).
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __chromafall?: unknown }).__chromafall = {
    get: () => useGameStore.getState(),
    set: (patch: Partial<GameStore>) => useGameStore.setState(patch),
  };
}
