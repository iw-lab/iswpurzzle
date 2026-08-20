import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useUserStore } from '../../stores/userStore';
import { grantReward } from '../../stores/rewards';
import { useAudio } from '../../hooks/useAudio';
import { getMissionDescription } from '../../constants/missions';
import type { Achievement, Reward } from '../../types';

/**
 * 미션·업적 화면.
 *
 * ⚠️ 왜 새로 만들었나(2026-08-20 감사):
 * 일일/주간 미션 18종과 업적 데이터는 전부 정의돼 있었고 진행도도 매 판 갱신됐지만,
 * **이걸 볼 수 있는 화면도 보상을 받을 방법도 존재하지 않았다.**
 * userStore.claimAchievement 는 호출부가 0개, 미션에는 청구 액션 자체가 없었다.
 * 즉 "미션 → 보상 → 파워업 → 더 높은 점수" 리텐션 루프가 통째로 끊겨 있었다.
 */
type QuestTab = 'daily' | 'weekly' | 'achievement';

interface QuestScreenProps {
  onClose: () => void;
}

function RewardChips({ reward }: { reward: Reward }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold whitespace-nowrap">
      {reward.coins ? <span className="text-yellow-400">🪙 {reward.coins}</span> : null}
      {reward.gems ? <span className="text-purple-300">💎 {reward.gems}</span> : null}
      {reward.xp ? <span className="text-cyan-300">XP {reward.xp}</span> : null}
      {reward.powerUp ? (
        <span className="text-orange-300">⚡ ×{reward.powerUp.count ?? 1}</span>
      ) : null}
    </div>
  );
}

function ProgressRow({
  icon,
  title,
  current,
  target,
  reward,
  claimed,
  onClaim,
}: {
  icon: string;
  title: string;
  current: number;
  target: number;
  reward: Reward;
  claimed: boolean;
  onClaim?: () => void;
}) {
  const done = current >= target;
  const pct = Math.min(100, (current / Math.max(target, 1)) * 100);

  return (
    <div className="glass-panel rounded-xl p-3 flex items-center gap-3">
      <span className="text-2xl w-8 text-center shrink-0">{icon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-bold text-white truncate">{title}</p>
          <span className="text-[10px] font-mono text-gray-400 shrink-0">
            {Math.min(current, target).toLocaleString()}/{target.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${done ? 'bg-green-400' : 'bg-cyan-400'}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="mt-1.5">
          <RewardChips reward={reward} />
        </div>
      </div>

      <button
        disabled={!done || claimed}
        onClick={onClaim}
        aria-label={claimed ? '수령 완료' : done ? '보상 받기' : '진행 중'}
        className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
          claimed
            ? 'bg-white/5 text-gray-500'
            : done
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white active:scale-95'
              : 'bg-white/5 text-gray-600'
        }`}
      >
        {claimed ? '완료' : done ? '받기' : '진행중'}
      </button>
    </div>
  );
}

export function QuestScreen({ onClose }: QuestScreenProps) {
  const [tab, setTab] = useState<QuestTab>('daily');
  const { playSound } = useAudio();

  const missionProgress = useGameStore((s) => s.missionProgress);
  const claimMission = useGameStore((s) => s.claimMission);
  const achievements = useUserStore((s) => s.achievements);
  const claimAchievement = useUserStore((s) => s.claimAchievement);

  const claimableCount = useMemo(() => {
    const missions = [...missionProgress.dailyMissions, ...missionProgress.weeklyMissions];
    return (
      missions.filter((m) => m.completed && !m.claimed).length +
      achievements.filter((a) => a.completed && !a.claimed).length
    );
  }, [missionProgress, achievements]);

  const handleMission = (scope: 'daily' | 'weekly', id: string) => {
    const reward = claimMission(scope, id);
    if (!reward) return;
    grantReward(reward);
    playSound('rewardGet');
  };

  const handleAchievement = (a: Achievement) => {
    const reward = claimAchievement(a.id);
    if (!reward) return;
    // 코인·젬은 스토어가 이미 지급했다 — 파워업·XP만 마저 지급한다.
    grantReward(reward, { skipCurrency: true });
    playSound('achievement');
  };

  const sortedAchievements = useMemo(
    () =>
      [...achievements].sort((a, b) => {
        const rank = (x: Achievement) => (x.completed && !x.claimed ? 0 : x.claimed ? 2 : 1);
        return rank(a) - rank(b) || b.current / b.target - a.current / a.target;
      }),
    [achievements],
  );

  const TABS: { key: QuestTab; label: string }[] = [
    { key: 'daily', label: '일일' },
    { key: 'weekly', label: '주간' },
    { key: 'achievement', label: '업적' },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-game-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          onClick={onClose}
          aria-label="뒤로"
          className="w-11 h-11 rounded-lg bg-white/10 text-white text-lg"
        >
          ←
        </button>
        <h2 className="text-lg font-black text-white tracking-widest">QUESTS</h2>
        <span className="text-xs font-bold text-green-400 w-9 text-right">
          {claimableCount > 0 ? `+${claimableCount}` : ''}
        </span>
      </div>

      <div className="flex gap-2 px-4 py-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              playSound('buttonClick');
              setTab(t.key);
            }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === t.key
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                : 'bg-white/5 text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
        {/* mode="wait"를 쓰지 않는다: 이전 내용의 exit 애니메이션이 끝날 때까지
            새 탭 내용이 마운트되지 않는데, 탭이 백그라운드거나 저사양 기기에서
            rAF가 지연되면 탭을 눌러도 내용이 안 바뀐 것처럼 보인다(실측).
            단순 목록이라 겹쳐 보여도 문제가 없다. */}
        <AnimatePresence>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-2"
          >
            {tab !== 'achievement' &&
              (tab === 'daily'
                ? missionProgress.dailyMissions
                : missionProgress.weeklyMissions
              ).map((m) => (
                <ProgressRow
                  key={m.id}
                  icon={tab === 'daily' ? '📅' : '🗓️'}
                  // 이전 버전에서 저장된 미션에는 desc가 없다(생성 시 버려졌었다).
                  // 오늘 키가 같으면 재생성되지 않으므로 id로 되찾아 준다.
                  title={m.desc ?? getMissionDescription(m.id) ?? m.type}
                  current={m.current}
                  target={m.target}
                  reward={m.reward}
                  claimed={Boolean(m.claimed)}
                  onClaim={() => handleMission(tab, m.id)}
                />
              ))}

            {tab === 'achievement' &&
              sortedAchievements.map((a) => (
                <ProgressRow
                  key={a.id}
                  icon={a.icon}
                  title={`${a.name} — ${a.description}`}
                  current={a.current}
                  target={a.target}
                  reward={a.reward}
                  claimed={a.claimed}
                  onClaim={() => handleAchievement(a)}
                />
              ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default QuestScreen;
