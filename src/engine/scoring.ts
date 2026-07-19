/**
 * 점수 계산 — 배율의 유일한 적용 지점.
 * ⚠️ 여기서 이미 피버·파워업 배율을 곱한다. 호출부(addScore 등)에서 다시 곱하면 안 된다.
 */
import { SCORE_CONFIG } from "../constants/gameConfig";

export interface ScoreInput {
  blocksCleared: number;
  chainCount: number;
  comboCount: number;
  level: number;
  powerUpMultiplier: number;
  perfectClear: boolean;
  isFeverMode?: boolean;
  specialBlocksCleared?: number;
}

export function calculateScore(params: ScoreInput): number {
  const {
    blocksCleared,
    chainCount,
    comboCount,
    level,
    powerUpMultiplier,
    perfectClear,
    isFeverMode = false,
    specialBlocksCleared = 0,
  } = params;

  const baseScore = blocksCleared * SCORE_CONFIG.BASE_POINTS_PER_BLOCK * level;

  // 연쇄 보너스 — 지수 2.5는 점수 인플레의 주범이었으나,
  // 레벨업이 더 이상 점수 기반이 아니므로(엔진 difficulty 참조) 연출용으로 유지한다.
  const chainBonus =
    chainCount > 1
      ? Math.pow(chainCount, 2.2) * SCORE_CONFIG.CHAIN_BONUS_MULTIPLIER
      : 0;

  const comboBonus =
    comboCount * SCORE_CONFIG.COMBO_BONUS * (1 + comboCount * 0.1);

  const massBonus =
    blocksCleared >= SCORE_CONFIG.MASS_FUSION_THRESHOLD
      ? blocksCleared *
        SCORE_CONFIG.MASS_FUSION_BONUS_PER_BLOCK *
        Math.floor(blocksCleared / SCORE_CONFIG.MASS_FUSION_THRESHOLD)
      : 0;

  const specialBonus =
    specialBlocksCleared * SCORE_CONFIG.SPECIAL_BLOCK_BONUS * level;

  const perfectBonus = perfectClear
    ? SCORE_CONFIG.PERFECT_CLEAR_BONUS * level
    : 0;

  const feverMultiplier = isFeverMode ? SCORE_CONFIG.FEVER_MULTIPLIER : 1;

  return Math.floor(
    (baseScore +
      chainBonus +
      comboBonus +
      massBonus +
      specialBonus +
      perfectBonus) *
      powerUpMultiplier *
      feverMultiplier,
  );
}
