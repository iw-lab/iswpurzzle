import { SkinItem, ThemeItem, Rarity } from '../types';
import { GemPackage, StarterPack, LootBox, WheelSegment } from '../types/monetization';

// 스킨 스타일 정의 - 각 스킨별로 완전히 다른 비주얼
export interface SkinStyle {
  colors: string[];
  borderRadius: string;      // 블록 모양
  borderWidth: number;
  borderStyle: string;
  innerEffect: 'glossy' | 'matte' | 'gradient' | 'flat' | 'glow' | 'glass' | 'metallic';
  animation?: 'none' | 'pulse' | 'shimmer' | 'float' | 'fire' | 'ice' | 'electric';
  particleEffect?: boolean;
  glowIntensity: number;     // 0-1
  texture?: 'none' | 'noise' | 'lines' | 'dots' | 'circuit' | 'cracks';
}

export const SKIN_STYLES: Record<string, SkinStyle> = {
  // 클래식: 기본 광택 블록
  classic: {
    colors: ['#ff4757', '#3742fa', '#2ed573', '#ffa502', '#8854d0'],
    borderRadius: '4px',
    borderWidth: 0,
    borderStyle: 'none',
    innerEffect: 'glossy',
    animation: 'none',
    glowIntensity: 0,
    texture: 'none',
  },
  // 네온: 강한 네온 글로우 + 어두운 내부
  neon: {
    colors: ['#ff0080', '#00ffff', '#39ff14', '#ffff00', '#bf00ff'],
    borderRadius: '2px',
    borderWidth: 2,
    borderStyle: 'solid',
    innerEffect: 'glow',
    animation: 'pulse',
    glowIntensity: 0.8,
    texture: 'none',
  },
  // 캔디: 둥글고 광택 있는 사탕 느낌
  candy: {
    colors: ['#ff6b9d', '#a855f7', '#4ade80', '#fbbf24', '#fb923c'],
    borderRadius: '50%',  // 완전 동그란 블록!
    borderWidth: 3,
    borderStyle: 'solid',
    innerEffect: 'glass',
    animation: 'none',
    glowIntensity: 0.2,
    texture: 'none',
  },
  // 픽셀: 레트로 8비트 스타일, 각진 테두리
  pixel: {
    colors: ['#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#7c3aed'],
    borderRadius: '0px',   // 완전 각진 블록
    borderWidth: 3,
    borderStyle: 'solid',
    innerEffect: 'flat',
    animation: 'none',
    glowIntensity: 0,
    texture: 'lines',
  },
  // 갤럭시: 우주 느낌의 그라데이션 + 반짝임
  galaxy: {
    colors: ['#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#3b82f6'],
    borderRadius: '6px',
    borderWidth: 1,
    borderStyle: 'solid',
    innerEffect: 'gradient',
    animation: 'shimmer',
    glowIntensity: 0.5,
    texture: 'dots',  // 별처럼 보이는 점들
  },
  // 크리스탈: 투명하고 빛나는 보석
  crystal: {
    colors: ['#f0abfc', '#a5f3fc', '#bbf7d0', '#fef08a', '#fecaca'],
    borderRadius: '8px',
    borderWidth: 2,
    borderStyle: 'solid',
    innerEffect: 'glass',
    animation: 'shimmer',
    glowIntensity: 0.6,
    texture: 'cracks',  // 크리스탈 균열 패턴
  },
  // 홀로그램: 무지개빛 반사 효과
  holographic: {
    colors: ['#f472b6', '#c084fc', '#60a5fa', '#34d399', '#fbbf24'],
    borderRadius: '4px',
    borderWidth: 1,
    borderStyle: 'solid',
    innerEffect: 'metallic',
    animation: 'shimmer',
    glowIntensity: 0.7,
    texture: 'lines',
  },
  // 불꽃: 타오르는 화염 애니메이션
  animated_fire: {
    colors: ['#ef4444', '#f97316', '#eab308', '#dc2626', '#fb923c'],
    borderRadius: '4px',
    borderWidth: 0,
    borderStyle: 'none',
    innerEffect: 'glow',
    animation: 'fire',
    particleEffect: true,
    glowIntensity: 0.9,
    texture: 'noise',
  },
  // 얼음: 차가운 얼음 결정 + 프로스트 효과
  animated_ice: {
    colors: ['#38bdf8', '#67e8f9', '#a5f3fc', '#22d3ee', '#0ea5e9'],
    borderRadius: '2px',
    borderWidth: 2,
    borderStyle: 'solid',
    innerEffect: 'glass',
    animation: 'ice',
    particleEffect: true,
    glowIntensity: 0.6,
    texture: 'cracks',
  },
  // 전기: 번개 효과 + 스파크
  animated_electric: {
    colors: ['#facc15', '#a3e635', '#22d3ee', '#e879f9', '#fbbf24'],
    borderRadius: '4px',
    borderWidth: 2,
    borderStyle: 'solid',
    innerEffect: 'glow',
    animation: 'electric',
    particleEffect: true,
    glowIntensity: 1.0,
    texture: 'circuit',
  },
};

// 레거시 호환용 색상 배열
export const SKIN_COLORS: Record<string, string[]> = Object.fromEntries(
  Object.entries(SKIN_STYLES).map(([id, style]) => [id, style.colors])
);

// 블록 스킨
export const BLOCK_SKINS: SkinItem[] = [
  { id: 'classic', name: '클래식', price: 0, currency: 'free', rarity: 'common', owned: true, equipped: true },
  { id: 'neon', name: '네온', price: 1000, currency: 'coins', rarity: 'common', owned: false, equipped: false },
  { id: 'candy', name: '캔디', price: 2000, currency: 'coins', rarity: 'uncommon', owned: false, equipped: false },
  { id: 'pixel', name: '픽셀', price: 2500, currency: 'coins', rarity: 'uncommon', owned: false, equipped: false },
  { id: 'galaxy', name: '갤럭시', price: 100, currency: 'gems', rarity: 'rare', owned: false, equipped: false },
  { id: 'crystal', name: '크리스탈', price: 200, currency: 'gems', rarity: 'epic', owned: false, equipped: false },
  { id: 'holographic', name: '홀로그램', price: 500, currency: 'gems', rarity: 'legendary', owned: false, equipped: false },
  { id: 'animated_fire', name: '불꽃', price: 800, currency: 'gems', rarity: 'legendary', owned: false, equipped: false, animated: true },
  { id: 'animated_ice', name: '얼음', price: 800, currency: 'gems', rarity: 'legendary', owned: false, equipped: false, animated: true },
  { id: 'animated_electric', name: '전기', price: 1000, currency: 'gems', rarity: 'mythic', owned: false, equipped: false, animated: true },
];

// 테마
export const THEMES: ThemeItem[] = [
  {
    id: 'dark',
    name: '다크',
    price: 0,
    currency: 'free',
    owned: true,
    equipped: true,
    colors: { background: '#0a0a1a', panel: '#1a1a2e', accent: '#4a9eff' },
  },
  {
    id: 'light',
    name: '라이트',
    price: 500,
    currency: 'coins',
    owned: false,
    equipped: false,
    colors: { background: '#f0f0f5', panel: '#ffffff', accent: '#3742fa' },
  },
  {
    id: 'ocean',
    name: '오션',
    price: 1500,
    currency: 'coins',
    owned: false,
    equipped: false,
    colors: { background: '#0a1628', panel: '#162d50', accent: '#00d2d3' },
  },
  {
    id: 'forest',
    name: '포레스트',
    price: 150,
    currency: 'gems',
    owned: false,
    equipped: false,
    colors: { background: '#0a1a0a', panel: '#1a2e1a', accent: '#2ed573' },
  },
  {
    id: 'sunset',
    name: '선셋',
    price: 200,
    currency: 'gems',
    owned: false,
    equipped: false,
    colors: { background: '#1a0a1a', panel: '#2e1a2e', accent: '#ff6b81' },
  },
  {
    id: 'space',
    name: '스페이스',
    price: 300,
    currency: 'gems',
    owned: false,
    equipped: false,
    colors: { background: '#050510', panel: '#0a0a20', accent: '#8854d0' },
  },
  {
    id: 'cyberpunk',
    name: '사이버펑크',
    price: 500,
    currency: 'gems',
    owned: false,
    equipped: false,
    colors: { background: '#0d0d1a', panel: '#1a1a33', accent: '#ff00ff' },
  },
];

// 젬 패키지
export const GEM_PACKAGES: GemPackage[] = [
  { id: 'gems_100', amount: 100, bonusAmount: 0, price: 1.99, label: '소량' },
  { id: 'gems_500', amount: 500, bonusAmount: 50, price: 7.99, label: '인기', highlight: true },
  { id: 'gems_1200', amount: 1200, bonusAmount: 200, price: 14.99, label: '가치' },
  { id: 'gems_2500', amount: 2500, bonusAmount: 500, price: 27.99, label: '대량' },
  { id: 'gems_6500', amount: 6500, bonusAmount: 1500, price: 54.99, label: '최고 가치', bestValue: true },
];

// 스타터 팩
export const STARTER_PACKS: StarterPack[] = [
  {
    id: 'starter_basic',
    name: '베이직 스타터',
    price: 2.99,
    originalValue: 9.99,
    contents: {
      gems: 300,
      coins: 5000,
      powerUps: { colorBomb: 3, timeSlow: 3 },
      skin: 'neon',
    },
    purchased: false,
    showUntilLevel: 10,
  },
  {
    id: 'starter_premium',
    name: '프리미엄 스타터',
    price: 9.99,
    originalValue: 39.99,
    contents: {
      gems: 1000,
      coins: 20000,
      powerUps: { colorBomb: 10, timeSlow: 10, gravityShift: 5 },
      skin: 'galaxy',
      noAdsDays: 7,
    },
    purchased: false,
    showUntilLevel: 20,
  },
];

// 행운의 룰렛 세그먼트
export const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 'coins_50', reward: { coins: 50 }, probability: 0.25, color: '#888888', label: '50 코인' },
  { id: 'coins_100', reward: { coins: 100 }, probability: 0.20, color: '#3742fa', label: '100 코인' },
  { id: 'coins_200', reward: { coins: 200 }, probability: 0.15, color: '#3742fa', label: '200 코인' },
  { id: 'gems_5', reward: { gems: 5 }, probability: 0.12, color: '#8854d0', label: '5 젬' },
  { id: 'gems_10', reward: { gems: 10 }, probability: 0.10, color: '#8854d0', label: '10 젬' },
  { id: 'powerup', reward: { powerUp: { type: 'colorBomb', count: 1 } }, probability: 0.08, color: '#2ed573', label: '파워업' },
  { id: 'gems_25', reward: { gems: 25 }, probability: 0.05, color: '#ffd700', label: '25 젬' },
  { id: 'gems_50', reward: { gems: 50 }, probability: 0.03, color: '#ffd700', label: '50 젬' },
  { id: 'gems_100', reward: { gems: 100 }, probability: 0.015, color: '#ff4757', label: '100 젬!' },
  { id: 'jackpot', reward: { gems: 500, coins: 5000 }, probability: 0.005, color: '#ff00ff', label: '잭팟!' },
];

// 박스/가챠
export const LOOT_BOXES: LootBox[] = [
  {
    id: 'common_box',
    tier: 'common',
    price: 500,
    currency: 'coins',
    contents: {
      coins: { min: 100, max: 300, chance: 0.5 },
      gems: { min: 5, max: 15, chance: 0.3 },
      powerUp: { tier: 'common', chance: 0.15 },
      skin: { tier: 'common', chance: 0.05 },
    },
    openCount: 0,
    pityCounter: 0,
  },
  {
    id: 'rare_box',
    tier: 'rare',
    price: 50,
    currency: 'gems',
    contents: {
      coins: { min: 300, max: 800, chance: 0.4 },
      gems: { min: 20, max: 50, chance: 0.3 },
      powerUp: { tier: 'rare', chance: 0.2 },
      skin: { tier: 'rare', chance: 0.1 },
    },
    openCount: 0,
    pityCounter: 0,
  },
  {
    id: 'legendary_box',
    tier: 'legendary',
    price: 150,
    currency: 'gems',
    contents: {
      coins: { min: 1000, max: 3000, chance: 0.3 },
      gems: { min: 50, max: 150, chance: 0.3 },
      powerUp: { tier: 'epic', chance: 0.25 },
      skin: { tier: 'legendary', chance: 0.15 },
    },
    guaranteedRarity: 'epic',
    openCount: 0,
    pityCounter: 0,
  },
];

// 일일 보상
export const DAILY_REWARDS = [
  { day: 1, reward: { coins: 100 } },
  { day: 2, reward: { coins: 150, powerUp: { type: 'timeSlow' as const, count: 1 } } },
  { day: 3, reward: { coins: 200 } },
  { day: 4, reward: { coins: 250, gems: 10 } },
  { day: 5, reward: { coins: 300, powerUp: { type: 'colorBomb' as const, count: 1 } } },
  { day: 6, reward: { coins: 400, gems: 20 } },
  { day: 7, reward: { coins: 500, gems: 50 } },
];

// 배틀패스 보상
export const BATTLE_PASS_REWARDS = {
  free: [
    { level: 1, reward: { coins: 100 } },
    { level: 5, reward: { powerUp: { type: 'colorBomb' as const, count: 1 } } },
    { level: 10, reward: { coins: 500 } },
    { level: 15, reward: { gems: 25 } },
    { level: 20, reward: { gems: 50 } },
    { level: 25, reward: { powerUp: { type: 'timeSlow' as const, count: 3 } } },
    { level: 30, reward: { coins: 1000 } },
    { level: 35, reward: { gems: 100 } },
    { level: 40, reward: { coins: 2000 } },
    { level: 45, reward: { gems: 150 } },
    { level: 50, reward: { gems: 200 } },
  ],
  premium: [
    { level: 1, reward: { gems: 50 } },
    { level: 5, reward: { skin: 'season_skin_1' } },
    { level: 10, reward: { powerUp: { type: 'gravityShift' as const, count: 3 } } },
    { level: 15, reward: { gems: 100 } },
    { level: 20, reward: { skin: 'season_skin_2' } },
    { level: 25, reward: { gems: 150 } },
    { level: 30, reward: { powerUp: { type: 'scoreMultiplier' as const, count: 5 } } },
    { level: 35, reward: { gems: 200 } },
    { level: 40, reward: { skin: 'season_skin_3' } },
    { level: 45, reward: { gems: 250 } },
    { level: 50, reward: { skin: 'legendary_season', gems: 500 } },
  ],
};

// 희귀도별 색상
export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#888888',
  uncommon: '#2ed573',
  rare: '#3742fa',
  epic: '#8854d0',
  legendary: '#ffd700',
  mythic: '#ff00ff',
};

// 희귀도별 이름
export const RARITY_NAMES: Record<Rarity, string> = {
  common: '일반',
  uncommon: '고급',
  rare: '희귀',
  epic: '영웅',
  legendary: '전설',
  mythic: '신화',
};
