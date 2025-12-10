import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GameSettings,
  Achievement,
  SkinItem,
  ThemeItem,
  DailyReward,
  StreakInfo,
  LeaderboardEntry,
} from '../types';
import { CurrencyState, MonetizationConfig, WheelState, PurchaseHistory } from '../types/monetization';
import { initializeAchievements } from '../constants/achievements';
import { BLOCK_SKINS, THEMES, DAILY_REWARDS } from '../constants/shopItems';

// 기본 설정
const defaultSettings: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  soundVolume: 0.7,
  musicVolume: 0.5,
  hapticEnabled: true,
  showGhostBlock: true,
  controlType: 'both',
  colorBlindMode: false,
  language: 'ko',
  performanceMode: 'auto',
};

// 기본 통화 상태
const defaultCurrency: CurrencyState = {
  coins: 1000, // 시작 코인
  gems: 50, // 시작 젬
  lives: 5,
  maxLives: 5,
  lifeRegenTime: 0,
};

// 기본 룰렛 상태
const defaultWheelState: WheelState = {
  freeSpinsRemaining: 1,
  adSpinsRemaining: 3,
  lastFreeSpinTime: 0,
  spinHistory: [],
  pityCounter: 0,
};

// 기본 스트릭 정보
const defaultStreakInfo: StreakInfo = {
  currentStreak: 0,
  longestStreak: 0,
  lastPlayDate: '',
  todayPlayed: false,
};

// 기본 수익화 설정
const defaultMonetizationConfig: MonetizationConfig = {
  adsEnabled: true,
  iapEnabled: true,
  removeAds: false,
  vipActive: false,
  firstPurchaseBonus: true,
};

interface UserStore {
  // 플레이어 정보
  playerId: string;
  playerName: string;
  playerLevel: number;
  playerXP: number;
  avatarId: string;

  // 설정
  settings: GameSettings;

  // 통화
  currency: CurrencyState;

  // 업적
  achievements: Achievement[];

  // 소유 아이템
  ownedSkins: SkinItem[];
  ownedThemes: ThemeItem[];
  equippedSkinId: string;
  equippedThemeId: string;

  // 일일 보상
  dailyRewards: DailyReward[];
  lastDailyRewardClaim: string;
  dailyRewardDay: number;

  // 스트릭
  streakInfo: StreakInfo;

  // 룰렛
  wheelState: WheelState;

  // 수익화
  monetizationConfig: MonetizationConfig;
  purchaseHistory: PurchaseHistory[];

  // 랭킹
  personalBestScores: { mode: string; score: number; date: string }[];

  // 배틀패스
  battlePassLevel: number;
  battlePassXP: number;
  battlePassPremium: boolean;

  // Actions
  setPlayerName: (name: string) => void;
  addXP: (amount: number) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;

  // 통화 관련
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  addLife: (amount: number) => void;
  useLife: () => boolean;

  // 업적 관련
  updateAchievement: (id: string, progress: number) => void;
  claimAchievement: (id: string) => void;

  // 아이템 관련
  purchaseSkin: (skinId: string) => boolean;
  purchaseTheme: (themeId: string) => boolean;
  equipSkin: (skinId: string) => void;
  equipTheme: (themeId: string) => void;

  // 일일 보상
  claimDailyReward: () => { coins?: number; gems?: number } | null;
  checkDailyRewardAvailable: () => boolean;

  // 스트릭
  updateStreak: () => void;

  // 룰렛
  spinWheel: () => string | null;
  canSpinWheel: () => { free: boolean; ad: boolean; gem: boolean };

  // 배틀패스
  addBattlePassXP: (amount: number) => void;
  purchaseBattlePassPremium: () => boolean;

  // 랭킹
  addPersonalBest: (mode: string, score: number) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      // 초기 상태
      playerId: `player_${Date.now()}`,
      playerName: '플레이어',
      playerLevel: 1,
      playerXP: 0,
      avatarId: 'default',

      settings: defaultSettings,
      currency: defaultCurrency,
      achievements: initializeAchievements(),
      ownedSkins: BLOCK_SKINS.filter((s) => s.owned),
      ownedThemes: THEMES.filter((t) => t.owned),
      equippedSkinId: 'classic',
      equippedThemeId: 'dark',
      dailyRewards: DAILY_REWARDS.map((r, i) => ({ ...r, claimed: false })),
      lastDailyRewardClaim: '',
      dailyRewardDay: 0,
      streakInfo: defaultStreakInfo,
      wheelState: defaultWheelState,
      monetizationConfig: defaultMonetizationConfig,
      purchaseHistory: [],
      personalBestScores: [],
      battlePassLevel: 1,
      battlePassXP: 0,
      battlePassPremium: false,

      // Actions
      setPlayerName: (name) => set({ playerName: name }),

      addXP: (amount) => {
        const { playerXP, playerLevel } = get();
        const newXP = playerXP + amount;
        const xpForNextLevel = playerLevel * 100;

        if (newXP >= xpForNextLevel) {
          set({
            playerXP: newXP - xpForNextLevel,
            playerLevel: playerLevel + 1,
          });
        } else {
          set({ playerXP: newXP });
        }
      },

      updateSettings: (newSettings) => {
        const { settings } = get();
        set({ settings: { ...settings, ...newSettings } });
      },

      addCoins: (amount) => {
        const { currency } = get();
        set({ currency: { ...currency, coins: currency.coins + amount } });
      },

      spendCoins: (amount) => {
        const { currency } = get();
        if (currency.coins >= amount) {
          set({ currency: { ...currency, coins: currency.coins - amount } });
          return true;
        }
        return false;
      },

      addGems: (amount) => {
        const { currency } = get();
        set({ currency: { ...currency, gems: currency.gems + amount } });
      },

      spendGems: (amount) => {
        const { currency } = get();
        if (currency.gems >= amount) {
          set({ currency: { ...currency, gems: currency.gems - amount } });
          return true;
        }
        return false;
      },

      addLife: (amount) => {
        const { currency } = get();
        const newLives = Math.min(currency.lives + amount, currency.maxLives);
        set({ currency: { ...currency, lives: newLives } });
      },

      useLife: () => {
        const { currency } = get();
        if (currency.lives > 0) {
          set({ currency: { ...currency, lives: currency.lives - 1 } });
          return true;
        }
        return false;
      },

      updateAchievement: (id, progress) => {
        const { achievements } = get();
        const newAchievements = achievements.map((a) => {
          if (a.id === id) {
            const newCurrent = Math.max(a.current, progress);
            return {
              ...a,
              current: newCurrent,
              completed: newCurrent >= a.target,
            };
          }
          return a;
        });
        set({ achievements: newAchievements });
      },

      claimAchievement: (id) => {
        const { achievements } = get();
        const achievement = achievements.find((a) => a.id === id);

        if (achievement && achievement.completed && !achievement.claimed) {
          // 보상 지급
          if (achievement.reward.coins) {
            get().addCoins(achievement.reward.coins);
          }
          if (achievement.reward.gems) {
            get().addGems(achievement.reward.gems);
          }

          const newAchievements = achievements.map((a) =>
            a.id === id ? { ...a, claimed: true } : a
          );
          set({ achievements: newAchievements });
        }
      },

      purchaseSkin: (skinId) => {
        const skin = BLOCK_SKINS.find((s) => s.id === skinId);
        if (!skin) return false;

        const { currency, ownedSkins } = get();

        // 이미 소유한 스킨인지 확인
        if (ownedSkins.some((s) => s.id === skinId)) return false;

        // 무료 스킨
        if (skin.currency === 'free') {
          set({ ownedSkins: [...ownedSkins, { ...skin, owned: true }] });
          return true;
        }

        if (skin.currency === 'coins' && currency.coins >= skin.price) {
          get().spendCoins(skin.price);
          set({ ownedSkins: [...ownedSkins, { ...skin, owned: true }] });
          return true;
        } else if (skin.currency === 'gems' && currency.gems >= skin.price) {
          get().spendGems(skin.price);
          set({ ownedSkins: [...ownedSkins, { ...skin, owned: true }] });
          return true;
        }

        return false;
      },

      purchaseTheme: (themeId) => {
        const theme = THEMES.find((t) => t.id === themeId);
        if (!theme) return false;

        const { currency, ownedThemes } = get();

        // 이미 소유한 테마인지 확인
        if (ownedThemes.some((t) => t.id === themeId)) return false;

        // 무료 테마
        if (theme.currency === 'free') {
          set({ ownedThemes: [...ownedThemes, { ...theme, owned: true }] });
          return true;
        }

        if (theme.currency === 'coins' && currency.coins >= theme.price) {
          get().spendCoins(theme.price);
          set({ ownedThemes: [...ownedThemes, { ...theme, owned: true }] });
          return true;
        } else if (theme.currency === 'gems' && currency.gems >= theme.price) {
          get().spendGems(theme.price);
          set({ ownedThemes: [...ownedThemes, { ...theme, owned: true }] });
          return true;
        }

        return false;
      },

      equipSkin: (skinId) => {
        const { ownedSkins } = get();
        if (ownedSkins.some((s) => s.id === skinId)) {
          set({ equippedSkinId: skinId });
        }
      },

      equipTheme: (themeId) => {
        const { ownedThemes } = get();
        if (ownedThemes.some((t) => t.id === themeId)) {
          set({ equippedThemeId: themeId });
        }
      },

      claimDailyReward: () => {
        const { dailyRewardDay, dailyRewards, lastDailyRewardClaim } = get();
        const today = new Date().toDateString();

        if (lastDailyRewardClaim === today) return null;

        const nextDay = (dailyRewardDay % 7) + 1;
        const reward = DAILY_REWARDS[nextDay - 1];

        if (reward.reward.coins) get().addCoins(reward.reward.coins);
        if (reward.reward.gems) get().addGems(reward.reward.gems);

        set({
          dailyRewardDay: nextDay,
          lastDailyRewardClaim: today,
        });

        return reward.reward;
      },

      checkDailyRewardAvailable: () => {
        const { lastDailyRewardClaim } = get();
        const today = new Date().toDateString();
        return lastDailyRewardClaim !== today;
      },

      updateStreak: () => {
        const { streakInfo } = get();
        const today = new Date().toDateString();

        if (streakInfo.lastPlayDate === today) {
          return;
        }

        const yesterday = new Date(Date.now() - 86400000).toDateString();
        let newStreak = streakInfo.currentStreak;

        if (streakInfo.lastPlayDate === yesterday) {
          newStreak += 1;
        } else if (streakInfo.lastPlayDate !== today) {
          newStreak = 1;
        }

        set({
          streakInfo: {
            currentStreak: newStreak,
            longestStreak: Math.max(streakInfo.longestStreak, newStreak),
            lastPlayDate: today,
            todayPlayed: true,
          },
        });
      },

      spinWheel: () => {
        const { wheelState } = get();
        const { freeSpinsRemaining, adSpinsRemaining } = wheelState;

        if (freeSpinsRemaining <= 0 && adSpinsRemaining <= 0) {
          return null;
        }

        // 랜덤 결과 (실제로는 WHEEL_SEGMENTS 확률 기반)
        const results = ['coins_50', 'coins_100', 'gems_5', 'gems_10', 'powerup'];
        const result = results[Math.floor(Math.random() * results.length)];

        set({
          wheelState: {
            ...wheelState,
            freeSpinsRemaining: freeSpinsRemaining > 0 ? freeSpinsRemaining - 1 : freeSpinsRemaining,
            adSpinsRemaining: freeSpinsRemaining <= 0 ? adSpinsRemaining - 1 : adSpinsRemaining,
            spinHistory: [...wheelState.spinHistory, result],
            pityCounter: wheelState.pityCounter + 1,
          },
        });

        return result;
      },

      canSpinWheel: () => {
        const { wheelState, currency } = get();
        return {
          free: wheelState.freeSpinsRemaining > 0,
          ad: wheelState.adSpinsRemaining > 0,
          gem: currency.gems >= 20,
        };
      },

      addBattlePassXP: (amount) => {
        const { battlePassXP, battlePassLevel } = get();
        const xpPerLevel = 100;
        const totalXP = battlePassXP + amount;
        const levelsGained = Math.floor(totalXP / xpPerLevel);

        set({
          battlePassXP: totalXP % xpPerLevel,
          battlePassLevel: Math.min(battlePassLevel + levelsGained, 50),
        });
      },

      purchaseBattlePassPremium: () => {
        const { currency } = get();
        if (currency.gems >= 499) {
          get().spendGems(499);
          set({ battlePassPremium: true });
          return true;
        }
        return false;
      },

      addPersonalBest: (mode, score) => {
        const { personalBestScores } = get();
        const existingIndex = personalBestScores.findIndex((p) => p.mode === mode);

        if (existingIndex >= 0) {
          if (score > personalBestScores[existingIndex].score) {
            const newScores = [...personalBestScores];
            newScores[existingIndex] = {
              mode,
              score,
              date: new Date().toISOString(),
            };
            set({ personalBestScores: newScores });
          }
        } else {
          set({
            personalBestScores: [
              ...personalBestScores,
              { mode, score, date: new Date().toISOString() },
            ],
          });
        }
      },
    }),
    {
      name: 'chromafall-user-storage',
    }
  )
);
