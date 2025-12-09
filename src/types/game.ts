// 블록 색상 타입
export type BlockColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'cyan' | 'pink' | 'orange' | 'rainbow';

// 중력 방향 타입
export type GravityDirection = 'down' | 'up' | 'left' | 'right';

// 게임 상태 타입
export type GameStatus = 'ready' | 'playing' | 'paused' | 'gameover';

// 게임 모드 타입
export type GameMode = 'classic' | 'timeAttack' | 'puzzle' | 'zen' | 'daily' | 'survival';

// 개별 블록 인터페이스
export interface Block {
  id: string;
  color: BlockColor;
  x: number;
  y: number;
  isFalling?: boolean;
  isMatched?: boolean;
  isFusing?: boolean;
}

// 낙하 중인 블록
export interface FallingBlock {
  color: BlockColor;
  x: number;
  y: number;
  targetY: number;
}

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
  totalPlayTime: number; // 초
  perfectClears: number;
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
  nextBlocks: BlockColor[];
  holdBlock: BlockColor | null;
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
}

// 점수 계산 파라미터
export interface ScoreParams {
  blocksCleared: number;
  chainCount: number;
  comboCount: number;
  level: number;
  powerUpMultiplier: number;
  perfectClear: boolean;
}

// 융합 결과
export interface FusionResult {
  clearedBlocks: Block[];
  score: number;
  chainCount: number;
  isChainReaction: boolean;
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

// 테마 아이템
export interface ThemeItem {
  id: string;
  name: string;
  price: number;
  currency: 'coins' | 'gems' | 'free';
  owned: boolean;
  equipped: boolean;
  colors: {
    background: string;
    panel: string;
    accent: string;
  };
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
