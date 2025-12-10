// 블록 색상 타입
export type BlockColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'cyan' | 'pink' | 'orange' | 'rainbow';

// 특수 블록 타입
export type SpecialBlockType =
  | 'normal'      // 일반 블록
  | 'bomb'        // 주변 3x3 폭발
  | 'lightning'   // 같은 색 전체 제거
  | 'cross'       // 십자가 형태로 제거
  | 'frozen'      // 얼어있음 (2번 매칭해야 제거)
  | 'stone'       // 돌 블록 (매칭 불가, 주변 제거로만 파괴)
  | 'multiplier'  // 점수 2배 블록
  | 'shuffle'     // 보드 일부 셔플
  | 'colorShift'; // 주변 블록 색상 변경

// 중력 방향 타입
export type GravityDirection = 'down' | 'up' | 'left' | 'right';

// 게임 상태 타입
export type GameStatus = 'ready' | 'playing' | 'paused' | 'gameover' | 'levelComplete';

// 게임 모드 타입
export type GameMode = 'classic' | 'timeAttack' | 'puzzle' | 'zen' | 'daily' | 'survival' | 'challenge';

// 레벨 목표 타입
export type LevelObjectiveType =
  | 'score'           // 점수 달성
  | 'clearBlocks'     // 블록 N개 제거
  | 'clearColor'      // 특정 색상 N개 제거
  | 'chains'          // N연쇄 달성
  | 'combo'           // N콤보 달성
  | 'clearSpecial'    // 특수 블록 N개 제거
  | 'surviveTime'     // N초 생존
  | 'clearStone';     // 돌 블록 N개 제거

// 레벨 목표
export interface LevelObjective {
  type: LevelObjectiveType;
  target: number;
  current: number;
  color?: BlockColor; // clearColor용
  completed: boolean;
}

// 개별 블록 인터페이스
export interface Block {
  id: string;
  color: BlockColor;
  x: number;
  y: number;
  specialType: SpecialBlockType;
  frozenCount?: number;  // frozen 블록의 남은 히트 수
  isFalling?: boolean;
  isMatched?: boolean;
  isFusing?: boolean;
  createdAt?: number;    // 생성 시간 (콤보 계산용)
}

// 낙하 중인 블록
export interface FallingBlock {
  color: BlockColor;
  x: number;
  y: number;
  targetY: number;
  specialType: SpecialBlockType;
  id?: string;  // 다중 블록용 ID
}

// 다중 낙하 블록 배열
export type FallingBlocks = FallingBlock[];

// 게임 보드 타입 (8열 x 16행)
export type GameBoard = (Block | null)[][];

// 파워업 타입
export type PowerUpType =
  | 'colorBomb'      // 선택한 색 전체 제거
  | 'rowClear'       // 가로줄 전체 제거
  | 'columnClear'    // 세로줄 전체 제거
  | 'gravityShift'   // 중력 방향 변경
  | 'timeSlow'       // 5초간 50% 속도 감소
  | 'rainbowBlock'   // 모든 색과 융합되는 블록
  | 'scoreMultiplier' // 30초간 2배 점수
  | 'blockPreview'   // 10개 블록 미리보기
  | 'undo'           // 마지막 3수 취소
  | 'freeze';        // 5초간 블록 낙하 정지

// 파워업 인터페이스
export interface PowerUp {
  type: PowerUpType;
  count: number;
  isActive?: boolean;
  remainingTime?: number;
}

// 게임 통계
export interface GameStatistics {
  totalGamesPlayed: number;
  totalScore: number;
  highScore: number;
  maxCombo: number;
  maxChain: number;
  totalBlocksCleared: number;
  totalFusions: number;
  totalPlayTime: number;
  perfectClears: number;
  specialBlocksUsed: number;
  levelsCompleted: number;
}

// 미션 진행
export interface MissionProgress {
  dailyMissions: DailyMission[];
  weeklyMissions: WeeklyMission[];
}

// 일일 미션
export interface DailyMission {
  id: string;
  type: string;
  target: number;
  current: number;
  completed: boolean;
  reward: Reward;
}

// 주간 미션
export interface WeeklyMission {
  id: string;
  type: string;
  target: number;
  current: number;
  completed: boolean;
  reward: Reward;
}

// 보상 타입
export interface Reward {
  coins?: number;
  gems?: number;
  xp?: number;
  powerUp?: { type: PowerUpType; count: number };
  skin?: string;
}

// 게임 상태 인터페이스
export interface GameState {
  board: GameBoard;
  currentBlock: FallingBlock | null;
  currentBlocks: FallingBlock[];  // 다중 낙하 블록
  nextBlocks: BlockColor[];
  nextSpecialTypes: SpecialBlockType[];
  holdBlock: BlockColor | null;
  holdSpecialType: SpecialBlockType | null;
  canHold: boolean;
  score: number;
  level: number;
  combo: number;
  maxCombo: number;
  chainCount: number;
  gameStatus: GameStatus;
  gameMode: GameMode;
  powerUps: PowerUp[];
  activePowerUp: PowerUp | null;
  gravityDirection: GravityDirection;
  gameTime: number;
  statistics: GameStatistics;
  continues: number;
  adWatchedThisGame: boolean;
  missionProgress: MissionProgress;
  isPowerUpSelecting: boolean;
  selectedGravityDirection: GravityDirection | null;
  // 새로운 필드들
  levelObjectives: LevelObjective[];
  feverGauge: number;        // 피버 게이지 (0-100)
  isFeverMode: boolean;      // 피버 모드 활성화
  comboTimer: number;        // 콤보 타이머 (초)
  dangerLevel: number;       // 위험 레벨 (0-3)
  specialBlockChance: number; // 특수 블록 등장 확률
  blocksUntilSpecial: number; // 특수 블록까지 남은 블록 수
  // 난이도 관련
  garbageTimer: number;      // 쓰레기 블록 타이머
  garbagePending: number;    // 대기 중인 쓰레기 줄 수
  fallingBlockCount: number; // 동시 낙하 블록 수 (1-3)
  // 퍼즐 모드 관련
  movesRemaining: number;    // 남은 이동 횟수
  puzzleLevel: number;       // 퍼즐 레벨 (1~)
  puzzleCompleted: boolean;  // 퍼즐 클리어 여부
  // 블록 회전 관련
  currentShapeOffsets: [number, number][];  // 현재 블록 모양 오프셋
  basePosition: { x: number; y: number };   // 블록 그룹의 기준 위치
}

// 점수 계산 파라미터
export interface ScoreParams {
  blocksCleared: number;
  chainCount: number;
  comboCount: number;
  level: number;
  powerUpMultiplier: number;
  perfectClear: boolean;
  isFeverMode: boolean;
  specialBlocksCleared: number;
}

// 융합 결과
export interface FusionResult {
  clearedBlocks: Block[];
  score: number;
  chainCount: number;
  isChainReaction: boolean;
  specialEffects: SpecialEffect[];
}

// 특수 효과
export interface SpecialEffect {
  type: SpecialBlockType;
  x: number;
  y: number;
  affectedBlocks: { x: number; y: number }[];
}

// 터치 제스처 타입
export type GestureType = 'swipeLeft' | 'swipeRight' | 'swipeDown' | 'swipeDownFast' | 'tap' | 'doubleTap' | 'longPress';

// 진동 패턴 타입
export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection';

// 파티클 타입
export interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
  velocity: { x: number; y: number };
  life: number;
  maxLife: number;
}

// 스킨/테마 희귀도
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

// 스킨 아이템
export interface SkinItem {
  id: string;
  name: string;
  price: number;
  currency: 'coins' | 'gems' | 'free';
  rarity: Rarity;
  owned: boolean;
  equipped: boolean;
  animated?: boolean;
}

// 테마 색상 정의
export interface ThemeColors {
  background: string;
  backgroundGradient?: string;
  panel: string;
  panelBorder?: string;
  accent: string;
  text?: string;
  textSecondary?: string;
  danger?: string;
  success?: string;
}

// 테마 아이템
export interface ThemeItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: 'coins' | 'gems' | 'free';
  owned: boolean;
  equipped: boolean;
  colors: ThemeColors;
}

// 업적
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'score' | 'combo' | 'chain' | 'special' | 'social' | 'play' | 'hidden';
  target: number;
  current: number;
  completed: boolean;
  claimed: boolean;
  reward: Reward;
  icon: string;
}

// 배틀패스 레벨
export interface BattlePassLevel {
  level: number;
  xpRequired: number;
  freeReward: Reward | null;
  premiumReward: Reward | null;
  claimed: boolean;
}

// 배틀패스 상태
export interface BattlePassState {
  currentLevel: number;
  currentXP: number;
  isPremium: boolean;
  seasonEndDate: number;
  levels: BattlePassLevel[];
}

// 랭킹 엔트리
export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  score: number;
  level: number;
  avatar?: string;
  isCurrentPlayer?: boolean;
}

// 일일 보상
export interface DailyReward {
  day: number;
  reward: Reward;
  claimed: boolean;
}

// 스트릭 정보
export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastPlayDate: string;
  todayPlayed: boolean;
}

// 설정
export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  hapticEnabled: boolean;
  showGhostBlock: boolean;
  controlType: 'swipe' | 'buttons' | 'both';
  colorBlindMode: boolean;
  language: 'ko' | 'en' | 'ja';
  performanceMode: 'high' | 'medium' | 'low' | 'auto';
}
