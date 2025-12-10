import { Reward, PowerUpType, Rarity } from './game';

// 광고 타입
export type AdType = 'rewarded' | 'interstitial' | 'banner';

// 보상형 광고 보상 타입
export type RewardedAdReward = 'continue' | 'x2_score' | 'gems_50' | 'random_powerup' | 'life_1' | 'extra_spin';

// 광고 상태
export interface AdState {
  rewardedAdReady: boolean;
  interstitialAdReady: boolean;
  lastAdWatchTime: number;
  gamesUntilInterstitial: number;
  dailyRewardedAdsWatched: number;
}

// 젬 패키지
export interface GemPackage {
  id: string;
  amount: number;
  bonusAmount: number;
  price: number;
  label: string;
  highlight?: boolean;
  bestValue?: boolean;
}

// 스타터 팩
export interface StarterPack {
  id: string;
  name: string;
  price: number;
  originalValue: number;
  contents: {
    gems: number;
    coins: number;
    powerUps: Partial<Record<PowerUpType, number>>;
    skin?: string;
    noAdsDays?: number;
  };
  purchased: boolean;
  showUntilLevel: number;
}

// 특별 할인
export interface SpecialOffer {
  id: string;
  triggerType: 'weekend' | 'inactive' | 'levelMilestone' | 'firstPurchase';
  discount: number;
  price: number;
  originalPrice: number;
  contents: {
    gems?: number;
    coins?: number;
    powerUps?: Partial<Record<PowerUpType, number>>;
    skin?: string;
  };
  expiresAt: number;
  purchased: boolean;
}

// VIP 구독
export interface VIPSubscription {
  id: string;
  type: 'monthly' | 'yearly';
  price: number;
  benefits: string[];
  isActive: boolean;
  expiresAt?: number;
}

// 상점 아이템
export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: 'skin' | 'theme' | 'effect' | 'powerup' | 'currency';
  price: number;
  currency: 'coins' | 'gems' | 'real';
  rarity?: Rarity;
  owned: boolean;
  equipped?: boolean;
}

// 행운의 룰렛 세그먼트
export interface WheelSegment {
  id: string;
  reward: Reward;
  probability: number;
  color: string;
  label: string;
}

// 행운의 룰렛 상태
export interface WheelState {
  freeSpinsRemaining: number;
  adSpinsRemaining: number;
  lastFreeSpinTime: number;
  spinHistory: string[];
  pityCounter: number; // 천장 시스템용
}

// 박스/가챠 타입
export type LootBoxTier = 'common' | 'rare' | 'legendary';

// 박스 아이템
export interface LootBox {
  id: string;
  tier: LootBoxTier;
  price: number;
  currency: 'coins' | 'gems';
  contents: LootBoxContents;
  guaranteedRarity?: Rarity;
  openCount: number;
  pityCounter: number;
}

// 박스 내용물
export interface LootBoxContents {
  coins?: { min: number; max: number; chance: number };
  gems?: { min: number; max: number; chance: number };
  powerUp?: { tier: Rarity; chance: number };
  skin?: { tier: Rarity; chance: number };
}

// 유저 통화 상태
export interface CurrencyState {
  coins: number;
  gems: number;
  lives: number;
  maxLives: number;
  lifeRegenTime: number; // 다음 라이프 재생까지 남은 시간 (초)
}

// 구매 기록
export interface PurchaseHistory {
  id: string;
  itemId: string;
  itemType: string;
  price: number;
  currency: 'coins' | 'gems' | 'real';
  purchasedAt: number;
}

// IAP 상품
export interface IAPProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  priceValue: number;
  currency: string;
  type: 'consumable' | 'non-consumable' | 'subscription';
}

// 수익화 설정
export interface MonetizationConfig {
  adsEnabled: boolean;
  iapEnabled: boolean;
  removeAds: boolean;
  vipActive: boolean;
  firstPurchaseBonus: boolean;
}
