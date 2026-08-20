/**
 * 보상 지급의 단일 통로.
 *
 * ⚠️ 왜 필요했나(2026-08-20 실측): Reward 타입에는 coins·gems·xp·powerUp·skin이
 * 있는데, 실제 지급 코드는 어디에도 powerUp을 처리하지 않았다.
 * userStore.claimAchievement / claimDailyReward / LuckyWheel 전부
 * `if (reward.coins) ... if (reward.gems) ...` 두 줄로 끝났고,
 * gameStore.addPowerUp은 호출부가 0개인 완전 死코드였다.
 * 결과적으로 데일리 5일차 보상·룰렛 '파워업' 칸(확률 8%)·배틀패스 보상·
 * 스타터팩 번들이 전부 **조용히 버려졌고, 파워업은 게임 내에서 획득 불가능**했다.
 * 파워업 10종과 PowerUpBar UI가 전부 죽은 무게였던 이유.
 *
 * 앞으로 새 보상 지점을 만들 때는 반드시 이 함수를 통과시킨다.
 */
import { useGameStore } from "./gameStore";
import { useUserStore } from "./userStore";
import type { PowerUpType, Reward } from "../types";

export interface GrantOptions {
  /** 호출부가 이미 코인·젬을 지급했으면 true (중복 지급 방지). */
  skipCurrency?: boolean;
}

export function grantReward(
  reward: Reward | null | undefined,
  options: GrantOptions = {},
): void {
  if (!reward) return;

  const user = useUserStore.getState();

  if (!options.skipCurrency) {
    if (reward.coins) user.addCoins(reward.coins);
    if (reward.gems) user.addGems(reward.gems);
  }
  if (reward.xp) user.addXP(reward.xp);
  if (reward.powerUp) {
    useGameStore
      .getState()
      .addPowerUp(reward.powerUp.type, reward.powerUp.count ?? 1);
  }
}

/** 스타터팩·번들처럼 파워업을 종류별 개수 맵으로 주는 경우. */
export function grantPowerUpBundle(
  bundle: Partial<Record<PowerUpType, number>> | undefined,
): void {
  if (!bundle) return;
  const addPowerUp = useGameStore.getState().addPowerUp;
  for (const [type, count] of Object.entries(bundle)) {
    if (count && count > 0) addPowerUp(type as PowerUpType, count);
  }
}
