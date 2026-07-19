import {
  BlockColor,
  GravityDirection,
  SpecialBlockType,
  LevelObjective,
} from "../types";
import * as difficulty from "../engine/difficulty";
import { random, pick } from "../engine/rng";
import { calculateScore as engineCalculateScore } from "../engine/scoring";

// 게임 보드 설정
export const BOARD_CONFIG = {
  COLUMNS: 8,
  ROWS: 16,
  CELL_SIZE: 40,
};

// 블록 색상 배열 (레벨별)
export const BLOCK_COLORS: Record<number, BlockColor[]> = {
  1: ["red", "blue", "green", "yellow", "purple"],
  6: ["red", "blue", "green", "yellow", "purple", "cyan"],
  11: ["red", "blue", "green", "yellow", "purple", "cyan", "pink"],
  16: ["red", "blue", "green", "yellow", "purple", "cyan", "pink", "orange"],
};

// 블록 색상 코드 (각 색상이 확실히 구분되도록 설정)
export const BLOCK_COLOR_MAP: Record<BlockColor, string> = {
  red: "#ef4444", // 밝은 빨강 (주황과 색조 차이 극대화)
  blue: "#2563eb", // 진한 파랑
  green: "#22c55e", // 밝은 초록
  yellow: "#fde047", // 레몬 노랑
  purple: "#a855f7", // 밝은 보라
  cyan: "#22d3ee", // 밝은 시안 (파랑과 명도+채도 차이)
  pink: "#f472b6", // 밝은 핑크 (빨강과 색조 차이)
  orange: "#f97316", // 밝은 오렌지 (빨강보다 확실히 노란빛)
  rainbow:
    "linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)",
};

// 색맹 모드 색상
export const COLORBLIND_COLOR_MAP: Record<BlockColor, string> = {
  red: "#D55E00",
  blue: "#0072B2",
  green: "#009E73",
  yellow: "#F0E442",
  purple: "#CC79A7",
  cyan: "#56B4E9",
  pink: "#E69F00",
  orange: "#999999",
  rainbow: "linear-gradient(45deg, #D55E00, #0072B2, #009E73, #F0E442)",
};

// 색맹 모드 패턴
export const COLORBLIND_PATTERNS: Record<BlockColor, string> = {
  red: "striped",
  blue: "dotted",
  green: "crosshatch",
  yellow: "solid",
  purple: "diagonal",
  cyan: "grid",
  pink: "waves",
  orange: "circles",
  rainbow: "rainbow",
};

// 특수 블록 설정 (baseChance 감소됨 - 후반부 밸런스 조정)
export const SPECIAL_BLOCK_CONFIG: Record<
  SpecialBlockType,
  {
    name: string;
    icon: string;
    description: string;
    baseChance: number;
    minLevel: number;
    color?: string;
  }
> = {
  normal: {
    name: "일반",
    icon: "",
    description: "일반 블록",
    baseChance: 0,
    minLevel: 1,
  },
  bomb: {
    name: "폭탄",
    icon: "💣",
    description: "주변 3x3 영역을 폭발시킵니다",
    baseChance: 0.05, // 0.08 -> 0.05
    minLevel: 3,
    color: "#ff6b6b",
  },
  lightning: {
    name: "번개",
    icon: "⚡",
    description: "같은 색상의 모든 블록을 제거합니다",
    baseChance: 0.025, // 0.04 -> 0.025
    minLevel: 5,
    color: "#ffd93d",
  },
  cross: {
    name: "십자가",
    icon: "✚",
    description: "가로와 세로 한 줄씩 제거합니다",
    baseChance: 0.04, // 0.06 -> 0.04
    minLevel: 4,
    color: "#6bcb77",
  },
  frozen: {
    name: "얼음",
    icon: "❄️",
    description: "2번 매칭해야 제거됩니다",
    baseChance: 0.06, // 0.1 -> 0.06
    minLevel: 2,
    color: "#74b9ff",
  },
  stone: {
    name: "돌",
    icon: "🪨",
    description: "매칭 불가, 주변 블록 제거로만 파괴",
    baseChance: 0.03, // 0.05 -> 0.03
    minLevel: 6,
    color: "#636e72",
  },
  multiplier: {
    name: "배율",
    icon: "⭐",
    description: "이 블록 포함 매칭 시 점수 2배",
    baseChance: 0.035, // 0.05 -> 0.035
    minLevel: 4,
    color: "#fdcb6e",
  },
  // shuffle / colorShift는 효과가 눈에 보이지 않아 "왜 색이 바뀌었지?" 라는
  // 혼란만 남겼다. baseChance 0으로 등장을 막아 6종 체계로 정리한다(계획서 §3.4).
  // 타입 자체는 남겨 두어야 기존 저장 데이터·보드 상태가 깨지지 않는다.
  shuffle: {
    name: "셔플",
    icon: "🔀",
    description: "매칭 시 주변 3x3 블록 색상을 섞습니다",
    baseChance: 0, // 등장 중지 (§3.4)
    minLevel: 999,
    color: "#a29bfe",
  },
  colorShift: {
    name: "색변환",
    icon: "🎨",
    description: "주변 블록을 같은 색으로 변환",
    baseChance: 0, // 등장 중지 (§3.4)
    minLevel: 999,
    color: "#fd79a8",
  },
};

// 게임 타이밍 설정
export const TIMING_CONFIG = {
  BASE_DROP_SPEED: 1000, // 레벨 1 낙하 속도 (ms) - 느리게 시작
  SPEED_DECREASE_PER_LEVEL: 35, // 레벨당 속도 감소 (엔진 곡선과 동일)
  MIN_DROP_SPEED: 350, // 최소 낙하 속도 (엔진 곡선과 동일)
  LOCK_DELAY: 400, // 잠금 딜레이
  DAS_DELAY: 120,
  ARR_RATE: 30,
  SOFT_DROP_MULTIPLIER: 15,
  FUSION_ANIMATION_DURATION: 180,
  CHAIN_DELAY: 120,
  COMBO_TIMEOUT: 3000, // 콤보 유지 시간
  FEVER_DURATION: 8000, // 피버 모드 지속 시간
  SPECIAL_EFFECT_DURATION: 300, // 특수 효과 지속 시간
  GARBAGE_INTERVAL: 45, // 쓰레기 블록 추가 간격 (초) - 늦게
  GARBAGE_WARNING_TIME: 5, // 쓰레기 블록 경고 시간 (초)
};

// 점수 설정
export const SCORE_CONFIG = {
  BASE_POINTS_PER_BLOCK: 10,
  CHAIN_BONUS_MULTIPLIER: 150, // 연쇄 보너스 증가
  COMBO_BONUS: 75, // 콤보 보너스 증가
  MASS_FUSION_THRESHOLD: 6, // 대량 융합 임계값 낮춤
  MASS_FUSION_BONUS_PER_BLOCK: 30,
  PERFECT_CLEAR_BONUS: 15000,
  LEVEL_UP_THRESHOLD: 1000,
  SPECIAL_BLOCK_BONUS: 50, // 특수 블록 제거 보너스
  FEVER_MULTIPLIER: 3, // 피버 모드 점수 배율
  QUICK_CLEAR_BONUS: 200, // 빠른 클리어 보너스
};

// 융합 설정
export const FUSION_CONFIG = {
  MIN_BLOCKS_TO_FUSE: 4, // 항상 4개면 터짐 (레벨 무관)
  BOMB_RADIUS: 1, // 폭탄 폭발 반경 (3x3)
  LIGHTNING_SAME_COLOR: true,
  CROSS_FULL_LINE: true,
};

// 레벨에 따른 융합 최소 블록 수 계산 (항상 4개로 고정)
export function getMinBlocksToFuse(): number {
  return FUSION_CONFIG.MIN_BLOCKS_TO_FUSE;
}

// 피버 게이지 설정
export const FEVER_CONFIG = {
  GAUGE_PER_BLOCK: 3, // 블록당 게이지 증가
  GAUGE_PER_CHAIN: 10, // 연쇄당 게이지 증가
  GAUGE_PER_COMBO: 5, // 콤보당 게이지 증가
  MAX_GAUGE: 100,
  DECAY_RATE: 2, // 초당 게이지 감소
  FEVER_DURATION: 8000, // 피버 모드 지속 시간 (ms)
};

// 난이도 설정
export const DIFFICULTY_CONFIG = {
  // 레벨별 특수 블록 등장 확률 증가 (완만하게)
  SPECIAL_CHANCE_PER_LEVEL: 0.004,
  // 레벨별 돌 블록 등장 확률 (완만하게)
  STONE_CHANCE_PER_LEVEL: 0.003,
  // 위험 레벨 임계값 (상단에서 몇 줄 차면)
  DANGER_THRESHOLD_1: 4,
  DANGER_THRESHOLD_2: 3,
  DANGER_THRESHOLD_3: 2,
  // 레벨별 필요 클리어 블록 수
  BLOCKS_PER_LEVEL: 52, // = getBlocksForLevel(1) — 엔진 곡선 기준값
  // 다중 블록 낙하 설정 (현재 사용 안 함 - getFallingBlockCount 함수로 대체)
  MULTI_BLOCK_START_LEVEL: 2, // 2개 블록 시작 레벨 (레벨 2부터)
  TRIPLE_BLOCK_START_LEVEL: 8, // 3개 블록 시작 레벨
  // 쓰레기 블록 설정
  GARBAGE_START_LEVEL: difficulty.GARBAGE_START_LEVEL, // 엔진 곡선과 동기화 (L8)
  GARBAGE_ROWS_PER_INTERVAL: 1, // 기본 추가 줄 수
  GARBAGE_MAX_ROWS: 2, // 최대 쓰레기 줄 수 (한번에 최대 2줄)
  // 레벨별 쓰레기 간격 감소
  GARBAGE_INTERVAL_DECREASE: 0.3, // 레벨당 감소 초 (완만하게)
  GARBAGE_MIN_INTERVAL: 20, // 최소 쓰레기 간격 (초)
};

// 레벨별 동시 낙하 블록 수 계산 (엔진 난이도 곡선에 위임 — 상한 4)
export const getFallingBlockCount = difficulty.getFallingBlockCount;

// 블록 모양 정의 (상대 좌표)
// [dx, dy] 형태로 기준점(0,0)으로부터의 오프셋
export type BlockShape = { offsets: [number, number][]; name: string };

// 2개 블록 모양들
export const SHAPES_2: BlockShape[] = [
  {
    offsets: [
      [0, 0],
      [1, 0],
    ],
    name: "horizontal",
  }, // ㅡ 가로
  {
    offsets: [
      [0, 0],
      [0, 1],
    ],
    name: "vertical",
  }, // | 세로
];

// 3개 블록 모양들
export const SHAPES_3: BlockShape[] = [
  {
    offsets: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    name: "line-h",
  }, // ㅡㅡㅡ 가로 일자
  {
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    name: "line-v",
  }, // 세로 일자
  {
    offsets: [
      [0, 0],
      [1, 0],
      [1, 1],
    ],
    name: "L-right",
  }, // ㄱ
  {
    offsets: [
      [0, 0],
      [0, 1],
      [1, 1],
    ],
    name: "L-left",
  }, // ㄴ
  {
    offsets: [
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    name: "L-up",
  }, // 역ㄴ
  {
    offsets: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    name: "corner",
  }, // ㄱ 모서리
];

// 4개 블록 모양들 (테트리스와 다른 독창적 모양)
export const SHAPES_4: BlockShape[] = [
  {
    offsets: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
    name: "line-h4",
  }, // 가로 일자
  {
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    name: "line-v4",
  }, // 세로 일자
  {
    offsets: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    name: "square",
  }, // 사각형
  {
    offsets: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    name: "T-down",
  }, // T 아래
  {
    offsets: [
      [0, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
    name: "T-right",
  }, // T 오른쪽
  {
    offsets: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
    name: "zigzag",
  }, // 지그재그
  {
    offsets: [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
    name: "plus",
  }, // + 변형
  {
    offsets: [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ],
    name: "arrow",
  }, // 화살표
];

// 5개 블록 모양들
export function getRandomShape(blockCount: number): BlockShape {
  // 조각 크기 상한 4 (계획서 §2.2 — 8칸 보드에서 5칸 이상 조각은 조작 불능)
  const shapes: BlockShape[] | null =
    blockCount === 2
      ? SHAPES_2
      : blockCount === 3
        ? SHAPES_3
        : blockCount >= 4
          ? SHAPES_4
          : null;

  if (!shapes) return { offsets: [[0, 0]], name: "single" };
  return pick(shapes);
}

// 블록 회전 함수 (시계 방향 90도)
export function rotateShape(offsets: [number, number][]): [number, number][] {
  // 중심점 계산
  const centerX = offsets.reduce((sum, [x]) => sum + x, 0) / offsets.length;
  const centerY = offsets.reduce((sum, [, y]) => sum + y, 0) / offsets.length;

  // 각 오프셋을 중심점 기준으로 90도 회전
  const rotated = offsets.map(([x, y]): [number, number] => {
    const relX = x - centerX;
    const relY = y - centerY;
    // 시계 방향 90도 회전: (x, y) -> (y, -x)
    const newRelX = relY;
    const newRelY = -relX;
    return [Math.round(newRelX + centerX), Math.round(newRelY + centerY)];
  });

  // 최소값이 0이 되도록 정규화
  const minX = Math.min(...rotated.map(([x]) => x));
  const minY = Math.min(...rotated.map(([, y]) => y));

  return rotated.map(([x, y]): [number, number] => [x - minX, y - minY]);
}

// 레벨별 쓰레기 블록 간격 계산
export const getGarbageInterval = difficulty.getGarbageInterval;

// 레벨별 목표 생성
export function generateLevelObjectives(level: number): LevelObjective[] {
  const objectives: LevelObjective[] = [];

  // 기본 목표: 점수
  objectives.push({
    type: "score",
    target: level * 500 + (level - 1) * 200,
    current: 0,
    completed: false,
  });

  // 레벨 3 이상: 블록 클리어 목표 추가
  if (level >= 3) {
    objectives.push({
      type: "clearBlocks",
      target: 20 + level * 5,
      current: 0,
      completed: false,
    });
  }

  // 레벨 5 이상: 연쇄 목표 추가
  if (level >= 5) {
    objectives.push({
      type: "chains",
      target: Math.min(3 + Math.floor(level / 3), 8),
      current: 0,
      completed: false,
    });
  }

  // 레벨 7 이상: 특수 블록 클리어 목표
  if (level >= 7) {
    objectives.push({
      type: "clearSpecial",
      target: 3 + Math.floor(level / 4),
      current: 0,
      completed: false,
    });
  }

  // 레벨 10 이상: 돌 블록 클리어 목표
  if (level >= 10) {
    objectives.push({
      type: "clearStone",
      target: 2 + Math.floor(level / 5),
      current: 0,
      completed: false,
    });
  }

  return objectives;
}

// 퍼즐 모드 설정
export const PUZZLE_CONFIG = {
  // 레벨별 이동 횟수
  getMovesForLevel: (level: number): number => {
    // 레벨 1: 20수, 점점 줄어들지만 최소 10수
    return Math.max(10, 25 - Math.floor(level / 2));
  },
  // 레벨별 목표 점수
  getTargetScore: (level: number): number => {
    return 500 + level * 300 + Math.floor(level / 3) * 200;
  },
  // 레벨별 목표 블록 클리어 수
  getTargetBlocks: (level: number): number => {
    return 15 + level * 5;
  },
  // 레벨별 색상 수 (난이도)
  getColorCount: (level: number): number => {
    if (level <= 3) return 4;
    if (level <= 6) return 5;
    if (level <= 10) return 6;
    return 7;
  },
};

// 퍼즐 레벨 목표 생성
export function generatePuzzleObjectives(
  puzzleLevel: number,
): LevelObjective[] {
  const objectives: LevelObjective[] = [];

  // 기본 목표: 점수 달성
  objectives.push({
    type: "score",
    target: PUZZLE_CONFIG.getTargetScore(puzzleLevel),
    current: 0,
    completed: false,
  });

  // 레벨 2 이상: 블록 클리어 목표
  if (puzzleLevel >= 2) {
    objectives.push({
      type: "clearBlocks",
      target: PUZZLE_CONFIG.getTargetBlocks(puzzleLevel),
      current: 0,
      completed: false,
    });
  }

  // 레벨 5 이상: 연쇄 목표
  if (puzzleLevel >= 5) {
    objectives.push({
      type: "chains",
      target: 2 + Math.floor(puzzleLevel / 3),
      current: 0,
      completed: false,
    });
  }

  // 레벨 8 이상: 특정 색상 클리어
  if (puzzleLevel >= 8) {
    const colors: BlockColor[] = ["red", "blue", "green", "yellow", "purple"];
    const targetColor = colors[puzzleLevel % colors.length];
    objectives.push({
      type: "clearColor",
      target: 10 + puzzleLevel,
      current: 0,
      color: targetColor,
      completed: false,
    });
  }

  return objectives;
}

// 파워업 설정
export const POWERUP_CONFIG = {
  colorBomb: {
    name: "컬러 폭탄",
    description: "선택한 색상의 모든 블록 제거",
    icon: "💣",
    price: { coins: 500, gems: 20 },
  },
  rowClear: {
    name: "가로 클리어",
    description: "가로줄 전체 제거",
    icon: "↔️",
    price: { coins: 400, gems: 15 },
  },
  columnClear: {
    name: "세로 클리어",
    description: "세로줄 전체 제거",
    icon: "↕️",
    price: { coins: 400, gems: 15 },
  },
  gravityShift: {
    name: "중력 변환",
    description: "중력 방향을 변경",
    icon: "🔄",
    price: { coins: 600, gems: 25 },
  },
  timeSlow: {
    name: "시간 감속",
    description: "5초간 50% 속도 감소",
    icon: "⏱️",
    price: { coins: 300, gems: 10 },
  },
  rainbowBlock: {
    name: "무지개 블록",
    description: "다음 블록이 모든 색과 융합",
    icon: "🌈",
    price: { coins: 800, gems: 30 },
  },
  scoreMultiplier: {
    name: "점수 부스터",
    description: "30초간 점수 2배",
    icon: "⭐",
    price: { coins: 700, gems: 28 },
  },
  blockPreview: {
    name: "미리보기",
    description: "10개 블록 미리보기",
    icon: "👁️",
    price: { coins: 200, gems: 8 },
  },
  undo: {
    name: "되돌리기",
    description: "마지막 3수 취소",
    icon: "↩️",
    price: { coins: 500, gems: 20 },
  },
  freeze: {
    name: "프리즈",
    description: "5초간 블록 낙하 정지",
    icon: "❄️",
    price: { coins: 400, gems: 15 },
  },
};

// 중력 방향 벡터
export const GRAVITY_VECTORS: Record<
  GravityDirection,
  { dx: number; dy: number }
> = {
  down: { dx: 0, dy: 1 },
  up: { dx: 0, dy: -1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

// 중력 방향 아이콘
export const GRAVITY_ICONS: Record<GravityDirection, string> = {
  down: "⬇️",
  up: "⬆️",
  left: "⬅️",
  right: "➡️",
};

// 다음 블록 미리보기 수
export const NEXT_PREVIEW_COUNT = 5;

// 게임 모드 설정
export const GAME_MODE_CONFIG = {
  classic: {
    name: "클래식",
    description: "끝없이 도전하세요!",
    icon: "🎮",
    hasTimeLimit: false,
    hasLevelLimit: false,
  },
  // 타임어택은 데일리(시드 고정 3분)와 역할이 겹쳐 제거했다(계획서 §2.2).
  // GameMode 타입에는 남겨 두어 기존 저장 기록이 깨지지 않게 한다.
  puzzle: {
    name: "퍼즐",
    description: "제한된 수로 목표 달성",
    icon: "🧩",
    hasTimeLimit: false,
    hasLevelLimit: true,
    movesLimit: 30,
  },
  zen: {
    name: "젠",
    description: "게임오버 없이 편안하게",
    icon: "🧘",
    hasTimeLimit: false,
    hasLevelLimit: false,
    noGameOver: true,
  },
  daily: {
    name: "일일 챌린지",
    description: "매일 같은 판, 3분 승부!",
    icon: "📅",
    hasTimeLimit: true,
    timeLimit: 180,
    hasLevelLimit: false,
    isDaily: true,
  },
  survival: {
    name: "서바이벌",
    description: "10초마다 빨라진다!",
    icon: "💀",
    hasTimeLimit: false,
    hasLevelLimit: false,
    speedIncrease: true,
  },
  challenge: {
    name: "챌린지",
    description: "레벨별 목표를 달성하세요",
    icon: "🏆",
    hasTimeLimit: false,
    hasLevelLimit: false,
    hasObjectives: true,
  },
};

export interface ModeConfig {
  name: string;
  description: string;
  icon: string;
  hasTimeLimit?: boolean;
  timeLimit?: number;
  hasLevelLimit?: boolean;
  movesLimit?: number;
  noGameOver?: boolean;
  isDaily?: boolean;
  speedIncrease?: boolean;
  hasObjectives?: boolean;
}

/**
 * 모드 설정 조회. GameMode 타입에는 남아 있지만 설정에서 제거된 모드
 * (예: 폐지된 timeAttack)를 안전하게 다루기 위한 단일 진입점이다.
 */
export function getModeConfig(mode: string): ModeConfig | undefined {
  return (GAME_MODE_CONFIG as Record<string, ModeConfig>)[mode];
}

/** 모드의 제한 시간(초). 시간제가 아니면 null. */
export function getModeTimeLimit(mode: string): number | null {
  const cfg = getModeConfig(mode);
  return cfg?.hasTimeLimit ? (cfg.timeLimit ?? null) : null;
}

// 일일 챌린지 시드 — 엔진 rng에 위임
export { getDailySeed, seededRandom } from "../engine/rng";

// 터치 컨트롤 설정
export const TOUCH_CONFIG = {
  SWIPE_THRESHOLD: 30,
  FAST_SWIPE_VELOCITY: 1000,
  LONG_PRESS_DURATION: 500,
  DOUBLE_TAP_DELAY: 300,
  MIN_TOUCH_TARGET: 44,
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
export const getColorsForLevel = difficulty.getColorsForLevel;

// 낙하 속도 계산
export const getDropSpeed = difficulty.getDropSpeed;

// 레벨업 임계값 계산
export function getLevelThreshold(level: number): number {
  return SCORE_CONFIG.LEVEL_UP_THRESHOLD * level + (level - 1) * 200;
}

// 특수 블록 등장 확률 계산 (후반부에 너무 많아지지 않도록 상한 낮춤)
export function getSpecialBlockChance(level: number): number {
  // 기본 확률 5%, 레벨당 0.6% 증가, 최대 15%로 제한 (기존 30%에서 대폭 감소)
  return Math.min(
    0.15,
    0.05 + level * DIFFICULTY_CONFIG.SPECIAL_CHANCE_PER_LEVEL,
  );
}

// 특수 블록 타입 결정
export function determineSpecialBlockType(level: number): SpecialBlockType {
  const availableTypes = Object.entries(SPECIAL_BLOCK_CONFIG)
    .filter(([type, config]) => type !== "normal" && level >= config.minLevel)
    .map(([type, config]) => ({
      type: type as SpecialBlockType,
      chance: config.baseChance,
    }));

  if (availableTypes.length === 0) return "normal";

  const totalChance = availableTypes.reduce((sum, t) => sum + t.chance, 0);
  let roll = random() * totalChance;

  for (const { type, chance } of availableTypes) {
    roll -= chance;
    if (roll <= 0) return type;
  }

  return availableTypes[0].type;
}

// 점수 계산 — 엔진의 단일 적용 지점에 위임 (배율 이중 적용 방지)
export const calculateScore = engineCalculateScore;
