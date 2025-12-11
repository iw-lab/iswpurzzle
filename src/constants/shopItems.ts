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
  // 클래식: 세련된 그라데이션 + 은은한 광택
  classic: {
    colors: ['#ff6b7a', '#5b6dff', '#4ade80', '#ffc532', '#a578e8'],
    borderRadius: '6px',
    borderWidth: 0,
    borderStyle: 'none',
    innerEffect: 'glossy',
    animation: 'shimmer',
    glowIntensity: 0.15,
    texture: 'none',
  },
  // 네온: 초강력 네온 글로우 + 펄스 + 반짝이는 테두리
  neon: {
    colors: ['#ff2d92', '#00f5ff', '#4dff4d', '#fff44f', '#e040fb'],
    borderRadius: '4px',
    borderWidth: 3,
    borderStyle: 'solid',
    innerEffect: 'glow',
    animation: 'pulse',
    glowIntensity: 1.0,
    texture: 'circuit',
  },
  // 캔디: 젤리 같은 투명 광택 + 반짝이는 하이라이트
  candy: {
    colors: ['#ff85b3', '#c084fc', '#5eead4', '#fcd34d', '#fb7185'],
    borderRadius: '50%',
    borderWidth: 4,
    borderStyle: 'solid',
    innerEffect: 'glass',
    animation: 'shimmer',
    glowIntensity: 0.4,
    texture: 'dots',
  },
  // 픽셀: 레트로 CRT 느낌 + 스캔라인
  pixel: {
    colors: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6'],
    borderRadius: '0px',
    borderWidth: 4,
    borderStyle: 'solid',
    innerEffect: 'flat',
    animation: 'none',
    glowIntensity: 0.1,
    texture: 'lines',
  },
  // 갤럭시: 별자리 + 성운 배경 + 유성 파티클
  galaxy: {
    colors: ['#a78bfa', '#f472b6', '#22d3ee', '#fb7185', '#60a5fa'],
    borderRadius: '8px',
    borderWidth: 2,
    borderStyle: 'solid',
    innerEffect: 'gradient',
    animation: 'shimmer',
    particleEffect: true,
    glowIntensity: 0.7,
    texture: 'dots',
  },
  // 크리스탈: 다이아몬드 컷 + 프리즘 무지개 굴절
  crystal: {
    colors: ['#f5d0fe', '#bae6fd', '#bbf7d0', '#fef9c3', '#fecdd3'],
    borderRadius: '10px',
    borderWidth: 2,
    borderStyle: 'solid',
    innerEffect: 'glass',
    animation: 'shimmer',
    glowIntensity: 0.85,
    texture: 'cracks',
  },
  // 홀로그램: 3D 호일 효과 + 각도별 색상 변화
  holographic: {
    colors: ['#f9a8d4', '#d8b4fe', '#93c5fd', '#6ee7b7', '#fde047'],
    borderRadius: '6px',
    borderWidth: 2,
    borderStyle: 'solid',
    innerEffect: 'metallic',
    animation: 'shimmer',
    glowIntensity: 0.9,
    texture: 'lines',
  },
  // 불꽃: 용암 흐름 + 화염 파티클 + 열기 왜곡
  animated_fire: {
    colors: ['#ff3b3b', '#ff7b00', '#ffcc00', '#ff5722', '#ff8a50'],
    borderRadius: '6px',
    borderWidth: 0,
    borderStyle: 'none',
    innerEffect: 'glow',
    animation: 'fire',
    particleEffect: true,
    glowIntensity: 1.0,
    texture: 'noise',
  },
  // 얼음: 프로스트 결정 + 냉기 안개 + 균열 패턴
  animated_ice: {
    colors: ['#38bdf8', '#7dd3fc', '#bae6fd', '#22d3ee', '#06b6d4'],
    borderRadius: '4px',
    borderWidth: 3,
    borderStyle: 'solid',
    innerEffect: 'glass',
    animation: 'ice',
    particleEffect: true,
    glowIntensity: 0.8,
    texture: 'cracks',
  },
  // 전기: 플라즈마 코어 + 번개 아크 + 에너지 파동
  animated_electric: {
    colors: ['#fef08a', '#bef264', '#5eead4', '#f0abfc', '#fcd34d'],
    borderRadius: '6px',
    borderWidth: 3,
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

// 테마 (더 차별화된 스타일) - Premium Enhanced
export const THEMES: ThemeItem[] = [
  {
    id: 'dark',
    name: '다크',
    description: '심층 우주 + 별빛 파티클',
    price: 0,
    currency: 'free',
    owned: true,
    equipped: true,
    colors: {
      background: '#050510',
      backgroundGradient: 'radial-gradient(ellipse at 50% 0%, #1a1a4a 0%, #0a0a20 40%, #050510 70%), radial-gradient(circle at 80% 80%, #15152f 0%, transparent 40%)',
      panel: '#12122a',
      panelBorder: 'rgba(100,120,255,0.15)',
      accent: '#6b8fff',
      text: '#ffffff',
      textSecondary: '#9ca3af',
      danger: '#ff5c6c',
      success: '#4ade80'
    },
  },
  {
    id: 'light',
    name: '라이트',
    description: '천상 구름 + 햇살 광선',
    price: 500,
    currency: 'coins',
    owned: false,
    equipped: false,
    colors: {
      background: '#f0f4ff',
      backgroundGradient: 'linear-gradient(180deg, #ffffff 0%, #e8f0ff 50%, #d0e0ff 100%), radial-gradient(circle at 70% 20%, rgba(255,200,100,0.2) 0%, transparent 40%)',
      panel: 'rgba(255,255,255,0.95)',
      panelBorder: 'rgba(100,130,200,0.2)',
      accent: '#4f6cff',
      text: '#1a1a3e',
      textSecondary: '#5c6b8a',
      danger: '#ef4444',
      success: '#22c55e'
    },
  },
  {
    id: 'ocean',
    name: '오션',
    description: '해저 물결 + 거품 파티클 + 빛 굴절',
    price: 1500,
    currency: 'coins',
    owned: false,
    equipped: false,
    colors: {
      background: '#041525',
      backgroundGradient: 'radial-gradient(ellipse at 50% 100%, #0a4a6a 0%, #062540 40%, #041525 70%), radial-gradient(circle at 30% 30%, rgba(0,200,255,0.1) 0%, transparent 40%)',
      panel: 'rgba(10,60,90,0.8)',
      panelBorder: 'rgba(34,211,238,0.35)',
      accent: '#22d3ee',
      text: '#e0f7ff',
      textSecondary: '#7dd3fc',
      danger: '#fb7185',
      success: '#34d399'
    },
  },
  {
    id: 'forest',
    name: '포레스트',
    description: '나뭇잎 파티클 + 빛줄기 + 안개',
    price: 150,
    currency: 'gems',
    owned: false,
    equipped: false,
    colors: {
      background: '#071510',
      backgroundGradient: 'radial-gradient(ellipse at 30% 80%, rgba(34,197,94,0.2) 0%, transparent 50%), radial-gradient(circle at 70% 30%, #0a2a15 0%, #071510 60%)',
      panel: 'rgba(20,60,35,0.85)',
      panelBorder: 'rgba(74,222,128,0.35)',
      accent: '#4ade80',
      text: '#ecfdf5',
      textSecondary: '#86efac',
      danger: '#fb923c',
      success: '#a3e635'
    },
  },
  {
    id: 'sunset',
    name: '선셋',
    description: '노을 그라데이션 + 구름 실루엣',
    price: 200,
    currency: 'gems',
    owned: false,
    equipped: false,
    colors: {
      background: '#15080f',
      backgroundGradient: 'linear-gradient(180deg, #4a1832 0%, #2d1528 30%, #15080f 70%), radial-gradient(circle at 60% 20%, rgba(255,100,80,0.25) 0%, transparent 50%)',
      panel: 'rgba(60,30,50,0.85)',
      panelBorder: 'rgba(251,113,133,0.4)',
      accent: '#fb7185',
      text: '#fff1f2',
      textSecondary: '#fda4af',
      danger: '#ef4444',
      success: '#fdba74'
    },
  },
  {
    id: 'space',
    name: '스페이스',
    description: '은하수 + 행성 + 유성 파티클',
    price: 300,
    currency: 'gems',
    owned: false,
    equipped: false,
    colors: {
      background: '#030308',
      backgroundGradient: 'radial-gradient(ellipse at 20% 30%, rgba(139,92,246,0.25) 0%, transparent 40%), radial-gradient(ellipse at 80% 70%, rgba(236,72,153,0.15) 0%, transparent 40%), radial-gradient(circle at 50% 50%, #0a0a20 0%, #030308 70%)',
      panel: 'rgba(20,15,40,0.9)',
      panelBorder: 'rgba(168,85,247,0.45)',
      accent: '#a855f7',
      text: '#f5f3ff',
      textSecondary: '#c4b5fd',
      danger: '#f472b6',
      success: '#a78bfa'
    },
  },
  {
    id: 'cyberpunk',
    name: '사이버펑크',
    description: '네온 도시 + 비 효과 + 홀로그램',
    price: 500,
    currency: 'gems',
    owned: false,
    equipped: false,
    colors: {
      background: '#08080f',
      backgroundGradient: 'linear-gradient(180deg, #0f0a1a 0%, #08080f 50%), radial-gradient(circle at 20% 80%, rgba(255,45,146,0.2) 0%, transparent 40%), radial-gradient(circle at 80% 20%, rgba(0,245,255,0.15) 0%, transparent 40%)',
      panel: 'rgba(25,20,40,0.9)',
      panelBorder: 'rgba(255,45,146,0.5)',
      accent: '#ff2d92',
      text: '#f8f0ff',
      textSecondary: '#e9d5ff',
      danger: '#ff3b3b',
      success: '#00f5aa'
    },
  },
  {
    id: 'cherry',
    name: '체리블라썸',
    description: '벚꽃잎 낙하 + 분홍빛 안개',
    price: 400,
    currency: 'gems',
    owned: false,
    equipped: false,
    colors: {
      background: '#140a10',
      backgroundGradient: 'radial-gradient(ellipse at 60% 30%, rgba(251,207,232,0.2) 0%, transparent 50%), radial-gradient(circle at 30% 70%, rgba(249,168,212,0.15) 0%, transparent 40%), linear-gradient(180deg, #1f1018 0%, #140a10 100%)',
      panel: 'rgba(50,30,40,0.85)',
      panelBorder: 'rgba(251,207,232,0.4)',
      accent: '#fbcfe8',
      text: '#fdf2f8',
      textSecondary: '#f9a8d4',
      danger: '#fb7185',
      success: '#fda4af'
    },
  },
  {
    id: 'gold',
    name: '골드럭셔리',
    description: '황금 먼지 파티클 + 럭셔리 광택',
    price: 800,
    currency: 'gems',
    owned: false,
    equipped: false,
    colors: {
      background: '#0d0a05',
      backgroundGradient: 'radial-gradient(ellipse at 50% 30%, rgba(255,200,50,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(255,180,30,0.1) 0%, transparent 40%), linear-gradient(180deg, #1a1508 0%, #0d0a05 100%)',
      panel: 'rgba(40,35,20,0.9)',
      panelBorder: 'rgba(253,224,71,0.5)',
      accent: '#fde047',
      text: '#fefce8',
      textSecondary: '#fef08a',
      danger: '#fb923c',
      success: '#facc15'
    },
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
