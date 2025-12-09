import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useUserStore } from '../../stores/userStore';
import { useAudio } from '../../hooks/useAudio';
import { DAILY_REWARDS } from '../../constants/shopItems';

interface DailyRewardPopupProps {
  onClose: () => void;
}

export function DailyRewardPopup({ onClose }: DailyRewardPopupProps) {
  const { claimDailyReward, dailyRewardDay, checkDailyRewardAvailable, streakInfo } = useUserStore();
  const { playSound } = useAudio();
  const [claimed, setClaimed] = useState(false);
  const [claimedReward, setClaimedReward] = useState<{ coins?: number; gems?: number } | null>(null);
  const canClaim = checkDailyRewardAvailable();

  const handleClaim = () => {
    if (!canClaim || claimed) return;

    const reward = claimDailyReward();
    if (reward) {
      playSound('rewardGet');
      setClaimed(true);
      setClaimedReward(reward);

      // 축하 효과
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-game-panel rounded-2xl p-6 max-w-sm w-full mx-4"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white text-center mb-2">일일 보상</h2>

        {/* 스트릭 표시 */}
        <div className="text-center mb-6">
          <p className="text-orange-400">
            🔥 {streakInfo.currentStreak}일 연속 출석
          </p>
        </div>

        {/* 보상 그리드 */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {DAILY_REWARDS.map((reward, index) => {
            const day = index + 1;
            const isPast = day < (dailyRewardDay || 0) + 1;
            const isToday = day === (dailyRewardDay || 0) + 1;
            const isFuture = day > (dailyRewardDay || 0) + 1;

            return (
              <motion.div
                key={day}
                className={`relative p-2 rounded-lg text-center ${
                  isPast
                    ? 'bg-gray-700 opacity-50'
                    : isToday
                    ? 'bg-gradient-to-b from-game-accent to-blue-600 ring-2 ring-yellow-400'
                    : 'bg-gray-800'
                }`}
                animate={isToday && canClaim ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <p className="text-xs text-gray-400">Day</p>
                <p className="text-lg font-bold text-white">{day}</p>
                <div className="mt-1">
                  {reward.reward.gems ? (
                    <p className="text-xs text-purple-400">💎{reward.reward.gems}</p>
                  ) : (
                    <p className="text-xs text-yellow-400">🪙{reward.reward.coins}</p>
                  )}
                </div>
                {isPast && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl">✓</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* 수령 버튼 또는 결과 */}
        {claimed && claimedReward ? (
          <motion.div
            className="text-center py-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <p className="text-xl font-bold text-green-400 mb-2">보상 획득!</p>
            <div className="flex justify-center gap-4">
              {claimedReward.coins && (
                <p className="text-yellow-400">🪙 +{claimedReward.coins}</p>
              )}
              {claimedReward.gems && (
                <p className="text-purple-400">💎 +{claimedReward.gems}</p>
              )}
            </div>
          </motion.div>
        ) : canClaim ? (
          <motion.button
            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl
                       font-bold text-white text-lg hover:from-yellow-400 hover:to-orange-400 transition-all"
            whileTap={{ scale: 0.98 }}
            onClick={handleClaim}
          >
            🎁 보상 받기
          </motion.button>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-400">오늘의 보상을 이미 받았습니다</p>
            <p className="text-sm text-gray-500 mt-1">내일 다시 방문하세요!</p>
          </div>
        )}

        {/* 닫기 버튼 */}
        <button
          className="w-full mt-4 py-3 bg-gray-700 rounded-xl font-bold text-gray-300
                     hover:bg-gray-600 transition-all"
          onClick={onClose}
        >
          닫기
        </button>
      </motion.div>
    </motion.div>
  );
}

export default DailyRewardPopup;
