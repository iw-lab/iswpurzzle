import { DailyMission, WeeklyMission, Reward } from '../types';

// 일일 미션 템플릿
export const DAILY_MISSION_TEMPLATES = [
  { id: 'play_3_games', type: 'games_played', target: 3, desc: '3게임 플레이', reward: { xp: 30, coins: 100 } },
  { id: 'score_10k', type: 'score', target: 10000, desc: '10,000점 달성', reward: { xp: 40, coins: 150 } },
  { id: 'combo_10', type: 'combo', target: 10, desc: '10 콤보 달성', reward: { xp: 50, coins: 200 } },
  { id: 'chain_5', type: 'chain', target: 5, desc: '5연쇄 달성', reward: { xp: 50, gems: 10 } },
  { id: 'use_powerup', type: 'powerup_used', target: 3, desc: '파워업 3회 사용', reward: { xp: 30, coins: 100 } },
  { id: 'fuse_50', type: 'blocks_fused', target: 50, desc: '50개 블록 융합', reward: { xp: 35, coins: 120 } },
  { id: 'level_10', type: 'level_reached', target: 10, desc: '레벨 10 도달', reward: { xp: 45, coins: 180 } },
  { id: 'play_classic', type: 'mode_played', target: 1, desc: '클래식 모드 플레이', reward: { xp: 25, coins: 80 } },
  { id: 'watch_ad', type: 'ad_watched', target: 1, desc: '광고 시청', reward: { xp: 20, coins: 50 } },
  { id: 'perfect_clear', type: 'perfect_clear', target: 1, desc: '퍼펙트 클리어', reward: { xp: 100, gems: 20 } },
];

// 주간 미션 템플릿
export const WEEKLY_MISSION_TEMPLATES = [
  { id: 'play_20_games', type: 'games_played', target: 20, desc: '20게임 플레이', reward: { xp: 200, gems: 50 } },
  { id: 'total_score_100k', type: 'total_score', target: 100000, desc: '총 100,000점 달성', reward: { xp: 300, gems: 100 } },
  { id: 'max_combo_30', type: 'max_combo', target: 30, desc: '최대 30 콤보 달성', reward: { xp: 250, gems: 75 } },
  { id: 'chain_10', type: 'max_chain', target: 10, desc: '10연쇄 달성', reward: { xp: 300, gems: 150 } },
  { id: 'reach_level_20', type: 'max_level', target: 20, desc: '레벨 20 도달', reward: { xp: 200, gems: 80 } },
  { id: 'fuse_500', type: 'blocks_fused', target: 500, desc: '500개 블록 융합', reward: { xp: 250, gems: 90 } },
  { id: 'use_all_powerups', type: 'unique_powerups', target: 5, desc: '5종류 파워업 사용', reward: { xp: 180, gems: 60 } },
  { id: 'gravity_all', type: 'gravity_directions', target: 4, desc: '모든 중력 방향 사용', reward: { xp: 150, gems: 50 } },
];

// 랜덤 일일 미션 생성 (5개)
export function generateDailyMissions(): DailyMission[] {
  const shuffled = [...DAILY_MISSION_TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5).map(template => ({
    id: template.id,
    type: template.type,
    target: template.target,
    current: 0,
    completed: false,
    reward: template.reward as Reward,
  }));
}

// 랜덤 주간 미션 생성 (3개)
export function generateWeeklyMissions(): WeeklyMission[] {
  const shuffled = [...WEEKLY_MISSION_TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map(template => ({
    id: template.id,
    type: template.type,
    target: template.target,
    current: 0,
    completed: false,
    reward: template.reward as Reward,
  }));
}

// 미션 설명 가져오기
export function getMissionDescription(id: string): string {
  const daily = DAILY_MISSION_TEMPLATES.find(m => m.id === id);
  if (daily) return daily.desc;

  const weekly = WEEKLY_MISSION_TEMPLATES.find(m => m.id === id);
  if (weekly) return weekly.desc;

  return '';
}
