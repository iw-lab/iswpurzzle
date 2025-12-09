import { BlockColor, GravityDirection } from '../types';

// 게임 보드 설정
export const BOARD_CONFIG = {
  COLUMNS: 8,
  ROWS: 16,
  CELL_SIZE: 40, // 픽셀 (모바일에서 동적 조절)
};

// 블록 색상 배열 (레벨별)
export const BLOCK_COLORS: Record<number, BlockColor[]> = {
  1: ['red', 'blue', 'green', 'yellow', 'purple'], // 5가지
  6: ['red', 'blue', 'green', 'yellow', 'purple', 'cyan'], // 6가지
  11: ['red', 'blue', 'green', 'yellow', 'purple', 'cyan', 'pink'], // 7가지
  16: ['red', 'blue', 'green', 'yellow', 'purple', 'cyan', 'pink', 'orange'], // 8가지
};

// 블록 색상 코드
export const BLOCK_COLOR_MAP: Record<BlockColor, string> = {
  red: '#ff4757',
  blue: '#3742fa',
  green: '#2ed573',
  yellow: '#ffa502',
  purple: '#8854d0',
  cyan: '#00d2d3',
  pink: '#ff6b81',
  orange: '#ff7f50',
  rainbow: 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)',
};

// 색맹 모드 색상
export const COLORBLIND_COLOR_MAP: Record<BlockColor, string> = {
  red: '#D55E00',
  blue: '#0072B2',
  green: '#009E73',
  yellow: '#F0E442',
  purple: '#CC79A7',
  cyan: '#56B4E9',
  pink: '#E69F00',
  orange: '#999999',
  rainbow: 'linear-gradient(45deg, #D55E00, #0072B2, #009E73, #F0E442)',
};

// 색맹 모드 패턴
export const COLORBLIND_PATTERNS: Record<BlockColor, string> = {
  red: 'striped',
  blue: 'dotted',
  green: 'crosshatch',
  yellow: 'solid',
  purple: 'diagonal',
  cyan: 'grid',
  pink: 'waves',
  orange: 'circles',
  rainbow: 'rainbow',
};

// 게임 타이밍 설정
export const TIMING_CONFIG = {
  BASE_DROP_SPEED: 800, // 레벨 1 낙하 속도 (ms) - 더 빠르게 시작
  SPEED_DECREASE_PER_LEVEL: 80, // 레벨당 속도 감소 - 더 급격하게
  MIN_DROP_SPEED: 100, // 최소 낙하 속도
  LOCK_DELAY: 500, // 바닥 도달 후 조작 가능 시간
  DAS_DELAY: 170, // Delayed Auto Shift 딜레이
  ARR_RATE: 50, // Auto Repeat Rate
  SOFT_DROP_MULTIPLIER: 20, // 소프트 드롭 속도 배수
  FUSION_ANIMATION_DURATION: 300, // 융합 애니메이션 시간
  CHAIN_DELAY: 200, // 연쇄 반응 사이 딜레이
  COMBO_TIMEOUT: 2000, // 콤보 타임아웃
};

// 점수 설정
export const SCORE_CONFIG = {
  BASE_POINTS_PER_BLOCK: 10,
  CHAIN_BONUS_MULTIPLIER: 100,
  COMBO_BONUS: 50,
  MASS_FUSION_THRESHOLD: 8, // 대량 융합 보너스 임계값
  MASS_FUSION_BONUS_PER_BLOCK: 25,
  PERFECT_CLEAR_BONUS: 10000,
  LEVEL_UP_THRESHOLD: 500, // 레벨업당 필요 점수 - 더 빠른 레벨업
};

// 융합 설정
export const FUSION_CONFIG = {
  MIN_BLOCKS_TO_FUSE: 4, // 최소 융합 블록 수
};

// 파워업 설정
export const POWERUP_CONFIG = {
  colorBomb: {
    name: '컬러 폭탄',
    description: '선택한 색상의 모든 블록 제거',
    icon: '💣',
    price: { coins: 500, gems: 20 },
  },
  rowClear: {
    name: '가로 클리어',
    description: '가로줄 전체 제거',
    icon: '↔️',
    price: { coins: 400, gems: 15 },
  },
  columnClear: {
    name: '세로 클리어',
    description: '세로줄 전체 제거',
    icon: '↕️',
    price: { coins: 400, gems: 15 },
  },
  gravityShift: {
    name: '중력 변환',
    description: '중력 방향을 변경',
    icon: '🔄',
    price: { coins: 600, gems: 25 },
  },
  timeSlow: {
    name: '시간 감속',
    description: '5초간 50% 속도 감소',
    icon: '⏱️',
    price: { coins: 300, gems: 10 },
  },
  rainbowBlock: {
    name: '무지개 블록',
    description: '다음 블록이 모든 색과 융합',
    icon: '🌈',
    price: { coins: 800, gems: 30 },
  },
  scoreMultiplier: {
    name: '점수 부스터',
    description: '30초간 점수 2배',
    icon: '⭐',
    price: { coins: 700, gems: 28 },
  },
  blockPreview: {
    name: '미리보기',
    description: '10개 블록 미리보기',
    icon: '👁️',
    price: { coins: 200, gems: 8 },
  },
  undo: {
    name: '되돌리기',
    description: '마지막 3수 취소',
    icon: '↩️',
    price: { coins: 500, gems: 20 },
  },
  freeze: {
    name: '프리즈',
    description: '5초간 블록 낙하 정지',
    icon: '❄️',
    price: { coins: 400, gems: 15 },
  },
};

// 중력 방향 벡터
export const GRAVITY_VECTORS: Record<GravityDirection, { dx: number; dy: number }> = {
  down: { dx: 0, dy: 1 },
  up: { dx: 0, dy: -1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

// 중력 방향 아이콘
export const GRAVITY_ICONS: Record<GravityDirection, string> = {
  down: '⬇️',
  up: '⬆️',
  left: '⬅️',
  right: '➡️',
};

// 다음 블록 미리보기 수
export const NEXT_PREVIEW_COUNT = 5;

// 게임 모드 설정
export const GAME_MODE_CONFIG = {
  classic: {
    name: '클래식',
    description: '기본 모드',
    icon: '🎮',
    hasTimeLimit: false,
    hasLevelLimit: false,
  },
  timeAttack: {
    name: '타임어택',
    description: '2분 안에 최고 점수를!',
    icon: '⏰',
    hasTimeLimit: true,
    timeLimit: 120, // 초
    hasLevelLimit: false,
  },
  puzzle: {
    name: '퍼즐',
    description: '제한된 수로 목표 달성',
    icon: '🧩',
    hasTimeLimit: false,
    hasLevelLimit: true,
    movesLimit: 20,
  },
  zen: {
    name: '젠',
    description: '점수 없이 편안하게',
    icon: '🧘',
    hasTimeLimit: false,
    hasLevelLimit: false,
    noGameOver: true,
  },
  daily: {
    name: '일일 챌린지',
    description: '매일 새로운 도전!',
    icon: '📅',
    hasTimeLimit: true,
    timeLimit: 180,
    hasLevelLimit: false,
  },
  survival: {
    name: '서바이벌',
    description: '버티면 이기는 거야!',
    icon: '💀',
    hasTimeLimit: false,
    hasLevelLimit: false,
    speedIncrease: true,
  },
};

// 터치 컨트롤 설정
export const TOUCH_CONFIG = {
  SWIPE_THRESHOLD: 30, // 스와이프 인식 최소 거리
  FAST_SWIPE_VELOCITY: 1000, // 빠른 스와이프 속도
  LONG_PRESS_DURATION: 500, // 롱 프레스 인식 시간
  DOUBLE_TAP_DELAY: 300, // 더블 탭 인식 시간
  MIN_TOUCH_TARGET: 44, // 최소 터치 영역 (Apple HIG)
};

// 진동 패턴
export const HAPTIC_PATTERNS = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 50, 20],
  error: [30, 50, 30],
  selection: [5],
};

// 레벨별 색상 수 가져오기
export function getColorsForLevel(level: number): BlockColor[] {
  const thresholds = Object.keys(BLOCK_COLORS)
    .map(Number)
    .sort((a, b) => b - a);

  for (const threshold of thresholds) {
    if (level >= threshold) {
      return BLOCK_COLORS[threshold];
    }
  }

  return BLOCK_COLORS[1];
}

// 낙하 속도 계산
export function getDropSpeed(level: number): number {
  const speed = TIMING_CONFIG.BASE_DROP_SPEED - (level - 1) * TIMING_CONFIG.SPEED_DECREASE_PER_LEVEL;
  return Math.max(speed, TIMING_CONFIG.MIN_DROP_SPEED);
}

// 레벨업 임계값 계산
export function getLevelThreshold(level: number): number {
  return SCORE_CONFIG.LEVEL_UP_THRESHOLD * level;
}

// 점수 계산
export function calculateScore(params: {
  blocksCleared: number;
  chainCount: number;
  comboCount: number;
  level: number;
  powerUpMultiplier: number;
  perfectClear: boolean;
}): number {
  const { blocksCleared, chainCount, comboCount, level, powerUpMultiplier, perfectClear } = params;

  // 기본 점수
  let baseScore = blocksCleared * SCORE_CONFIG.BASE_POINTS_PER_BLOCK * level;

  // 연쇄 보너스 (기하급수적)
  const chainBonus = chainCount > 1 ? Math.pow(chainCount, 2) * SCORE_CONFIG.CHAIN_BONUS_MULTIPLIER : 0;

  // 콤보 보너스
  const comboBonus = comboCount * SCORE_CONFIG.COMBO_BONUS;

  // 대량 융합 보너스
  const massBonus = blocksCleared >= SCORE_CONFIG.MASS_FUSION_THRESHOLD
    ? blocksCleared * SCORE_CONFIG.MASS_FUSION_BONUS_PER_BLOCK
    : 0;

  // 퍼펙트 클리어 보너스
  const perfectBonus = perfectClear ? SCORE_CONFIG.PERFECT_CLEAR_BONUS * level : 0;

  return Math.floor((baseScore + chainBonus + comboBonus + massBonus + perfectBonus) * powerUpMultiplier);
}
