// 학생 레벨 및 칭호 시스템

export interface RankTier {
  id: string;
  name: string;
  koreanName: string;
  minXP: number;
  icon: string;
  color: string;
  benefits: string[];
}

export interface Title {
  id: string;
  name: string;
  description: string;
  condition: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
}

// 레벨별 필요 XP 계산 (1레벨당 100XP 기본, 레벨이 오를수록 점점 더 많이 필요)
export function getXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

// 총 누적 XP로 레벨 계산
export function getLevelFromTotalXP(totalXP: number): number {
  let level = 1;
  let xpRequired = 0;
  while (xpRequired + getXPForLevel(level) <= totalXP) {
    xpRequired += getXPForLevel(level);
    level++;
  }
  return level;
}

// 다음 레벨까지 남은 XP 계산
export function getXPProgress(totalXP: number): { currentLevelXP: number; nextLevelXP: number; progress: number } {
  let level = 1;
  let xpUsed = 0;
  while (xpUsed + getXPForLevel(level) <= totalXP) {
    xpUsed += getXPForLevel(level);
    level++;
  }
  const currentLevelXP = totalXP - xpUsed;
  const nextLevelXP = getXPForLevel(level);
  return {
    currentLevelXP,
    nextLevelXP,
    progress: currentLevelXP / nextLevelXP,
  };
}

// 랭크 티어 정의
export const RANK_TIERS: RankTier[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    koreanName: '브론즈',
    minXP: 0,
    icon: '🥉',
    color: '#CD7F32',
    benefits: ['기본 스킨 해금'],
  },
  {
    id: 'silver',
    name: 'Silver',
    koreanName: '실버',
    minXP: 1000,
    icon: '🥈',
    color: '#C0C0C0',
    benefits: ['일일 코인 보너스 +10%'],
  },
  {
    id: 'gold',
    name: 'Gold',
    koreanName: '골드',
    minXP: 3000,
    icon: '🥇',
    color: '#FFD700',
    benefits: ['일일 코인 보너스 +20%', '골드 테두리'],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    koreanName: '플래티넘',
    minXP: 7000,
    icon: '💎',
    color: '#E5E4E2',
    benefits: ['일일 코인 보너스 +30%', '플래티넘 테두리', '특별 이모지'],
  },
  {
    id: 'diamond',
    name: 'Diamond',
    koreanName: '다이아몬드',
    minXP: 15000,
    icon: '💠',
    color: '#B9F2FF',
    benefits: ['일일 코인 보너스 +50%', '다이아 테두리', '전용 칭호'],
  },
  {
    id: 'master',
    name: 'Master',
    koreanName: '마스터',
    minXP: 30000,
    icon: '👑',
    color: '#9B59B6',
    benefits: ['일일 코인 보너스 +75%', '마스터 테두리', '전설 칭호'],
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    koreanName: '그랜드마스터',
    minXP: 60000,
    icon: '🌟',
    color: '#E74C3C',
    benefits: ['일일 코인 보너스 +100%', 'GM 테두리', '신화 칭호', '특별 효과'],
  },
  {
    id: 'challenger',
    name: 'Challenger',
    koreanName: '챌린저',
    minXP: 100000,
    icon: '⚡',
    color: '#F39C12',
    benefits: ['모든 보너스', '챌린저 테두리', '전용 애니메이션'],
  },
];

// XP로 현재 랭크 티어 가져오기
export function getRankTier(totalXP: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (totalXP >= RANK_TIERS[i].minXP) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

// 다음 랭크 티어 가져오기
export function getNextRankTier(totalXP: number): RankTier | null {
  const currentTier = getRankTier(totalXP);
  const currentIndex = RANK_TIERS.findIndex(t => t.id === currentTier.id);
  if (currentIndex < RANK_TIERS.length - 1) {
    return RANK_TIERS[currentIndex + 1];
  }
  return null;
}

// 칭호 정의
export const TITLES: Title[] = [
  // 점수 기반 칭호
  { id: 'first_step', name: '첫 걸음', description: '첫 게임 완료', condition: 'games >= 1', icon: '👶', rarity: 'common' },
  { id: 'beginner', name: '초보자', description: '10게임 플레이', condition: 'games >= 10', icon: '🎮', rarity: 'common' },
  { id: 'regular', name: '단골', description: '50게임 플레이', condition: 'games >= 50', icon: '🎯', rarity: 'rare' },
  { id: 'veteran', name: '베테랑', description: '100게임 플레이', condition: 'games >= 100', icon: '🎖️', rarity: 'epic' },
  { id: 'legend', name: '전설', description: '500게임 플레이', condition: 'games >= 500', icon: '🏆', rarity: 'legendary' },

  // 점수 기반 칭호
  { id: 'score_1k', name: '1천점 돌파', description: '1,000점 달성', condition: 'highScore >= 1000', icon: '⭐', rarity: 'common' },
  { id: 'score_5k', name: '5천점 마스터', description: '5,000점 달성', condition: 'highScore >= 5000', icon: '🌟', rarity: 'rare' },
  { id: 'score_10k', name: '만점왕', description: '10,000점 달성', condition: 'highScore >= 10000', icon: '💫', rarity: 'epic' },
  { id: 'score_50k', name: '점수의 신', description: '50,000점 달성', condition: 'highScore >= 50000', icon: '✨', rarity: 'legendary' },
  { id: 'score_100k', name: '불멸의 점수', description: '100,000점 달성', condition: 'highScore >= 100000', icon: '🔥', rarity: 'mythic' },

  // 콤보 기반 칭호
  { id: 'combo_5', name: '콤보 입문', description: '5콤보 달성', condition: 'maxCombo >= 5', icon: '🔗', rarity: 'common' },
  { id: 'combo_10', name: '콤보 마스터', description: '10콤보 달성', condition: 'maxCombo >= 10', icon: '⛓️', rarity: 'rare' },
  { id: 'combo_20', name: '콤보 킹', description: '20콤보 달성', condition: 'maxCombo >= 20', icon: '👑', rarity: 'epic' },
  { id: 'combo_50', name: '무한 콤보', description: '50콤보 달성', condition: 'maxCombo >= 50', icon: '♾️', rarity: 'legendary' },

  // 연쇄 기반 칭호
  { id: 'chain_3', name: '연쇄 시작', description: '3연쇄 달성', condition: 'maxChain >= 3', icon: '🔄', rarity: 'common' },
  { id: 'chain_5', name: '연쇄 반응', description: '5연쇄 달성', condition: 'maxChain >= 5', icon: '💥', rarity: 'rare' },
  { id: 'chain_10', name: '폭발적 연쇄', description: '10연쇄 달성', condition: 'maxChain >= 10', icon: '🌋', rarity: 'epic' },
  { id: 'chain_15', name: '연쇄의 제왕', description: '15연쇄 달성', condition: 'maxChain >= 15', icon: '👹', rarity: 'legendary' },

  // 레벨 기반 칭호
  { id: 'level_10', name: '10레벨 달성', description: '레벨 10 도달', condition: 'maxLevel >= 10', icon: '📈', rarity: 'common' },
  { id: 'level_20', name: '20레벨 정복', description: '레벨 20 도달', condition: 'maxLevel >= 20', icon: '📊', rarity: 'rare' },
  { id: 'level_30', name: '30레벨 돌파', description: '레벨 30 도달', condition: 'maxLevel >= 30', icon: '🚀', rarity: 'epic' },
  { id: 'level_50', name: '레벨 마스터', description: '레벨 50 도달', condition: 'maxLevel >= 50', icon: '🛸', rarity: 'legendary' },

  // 특수 칭호
  { id: 'fever_master', name: '피버 마스터', description: '피버 모드 10회 발동', condition: 'feverCount >= 10', icon: '🔥', rarity: 'rare' },
  { id: 'speed_demon', name: '스피드 데몬', description: '타임어택 3분 내 10,000점', condition: 'speedScore >= 10000', icon: '⚡', rarity: 'epic' },
  { id: 'puzzle_solver', name: '퍼즐 마스터', description: '퍼즐 모드 20레벨 클리어', condition: 'puzzleLevel >= 20', icon: '🧩', rarity: 'epic' },
  { id: 'perfectionist', name: '완벽주의자', description: '퍼퍼클리어 10회', condition: 'perfectClears >= 10', icon: '💯', rarity: 'legendary' },

  // 특별 칭호
  { id: 'early_bird', name: '얼리버드', description: '아침 6시-9시 사이 플레이', condition: 'special', icon: '🐦', rarity: 'rare' },
  { id: 'night_owl', name: '올빼미', description: '밤 12시-3시 사이 플레이', condition: 'special', icon: '🦉', rarity: 'rare' },
  { id: 'weekend_warrior', name: '주말 전사', description: '주말에 10게임 연속 플레이', condition: 'special', icon: '⚔️', rarity: 'rare' },
  { id: 'streak_7', name: '7일 연속', description: '7일 연속 출석', condition: 'streak >= 7', icon: '📅', rarity: 'epic' },
  { id: 'streak_30', name: '30일 연속', description: '30일 연속 출석', condition: 'streak >= 30', icon: '🗓️', rarity: 'legendary' },
];

// 칭호 희귀도 색상
export const TITLE_RARITY_COLORS: Record<Title['rarity'], string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
  mythic: '#EF4444',
};

// 칭호 희귀도 이름
export const TITLE_RARITY_NAMES: Record<Title['rarity'], string> = {
  common: '일반',
  rare: '희귀',
  epic: '영웅',
  legendary: '전설',
  mythic: '신화',
};

// 게임 점수를 XP로 변환 (게임 결과 기반)
export function calculateGameXP(score: number, combo: number, chain: number, level: number): number {
  const scoreXP = Math.floor(score / 100);  // 100점당 1XP
  const comboXP = combo * 2;                 // 콤보당 2XP
  const chainXP = chain * 5;                 // 연쇄당 5XP
  const levelXP = level * 10;                // 레벨당 10XP

  return scoreXP + comboXP + chainXP + levelXP;
}
