import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../../stores/userStore';
import { useAudio } from '../../hooks/useAudio';
import { GAME_MODE_CONFIG } from '../../constants';
import { GameMode } from '../../types';

interface MainMenuProps {
  onStartGame: (mode: GameMode) => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
  onOpenBattlePass: () => void;
  onOpenDailyReward: () => void;
}

export function MainMenu({
  onStartGame,
  onOpenShop,
  onOpenSettings,
  onOpenLeaderboard,
  onOpenBattlePass,
  onOpenDailyReward,
}: MainMenuProps) {
  const { currency, playerName, playerLevel, streakInfo, checkDailyRewardAvailable } = useUserStore();
  const { playSound } = useAudio();
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [dailyRewardAvailable, setDailyRewardAvailable] = useState(false);

  useEffect(() => {
    setDailyRewardAvailable(checkDailyRewardAvailable());
  }, [checkDailyRewardAvailable]);

  const handleClick = (action: () => void) => {
    playSound('buttonClick');
    action();
  };

  return (
    <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* 배경 애니메이션 */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-lg opacity-20"
            style={{
              width: Math.random() * 40 + 20,
              height: Math.random() * 40 + 20,
              background: ['#ff4757', '#3742fa', '#2ed573', '#ffa502', '#8854d0'][Math.floor(Math.random() * 5)],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -1000],
              rotate: [0, 360],
              opacity: [0.2, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 10,
            }}
          />
        ))}
      </div>

      {/* 상단 통화 표시 */}
      <div className="absolute top-4 right-4 flex gap-3 z-10">
        <div className="bg-game-panel/80 rounded-full px-4 py-2 flex items-center gap-2 backdrop-blur-sm">
          <span>🪙</span>
          <span className="text-yellow-400 font-bold">{currency.coins.toLocaleString()}</span>
        </div>
        <div className="bg-game-panel/80 rounded-full px-4 py-2 flex items-center gap-2 backdrop-blur-sm">
          <span>💎</span>
          <span className="text-purple-400 font-bold">{currency.gems.toLocaleString()}</span>
        </div>
      </div>

      {/* 설정 버튼 */}
      <button
        className="absolute top-4 left-4 w-12 h-12 bg-game-panel/80 rounded-full flex items-center justify-center
                   text-2xl backdrop-blur-sm hover:bg-game-panel transition-colors z-10"
        onClick={() => handleClick(onOpenSettings)}
      >
        ⚙️
      </button>

      {/* 일일 보상 알림 */}
      {dailyRewardAvailable && (
        <motion.button
          className="absolute top-20 right-4 bg-yellow-500 text-black px-4 py-2 rounded-full font-bold
                     flex items-center gap-2 z-10"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          onClick={() => handleClick(onOpenDailyReward)}
        >
          🎁 일일 보상
        </motion.button>
      )}

      {/* 메인 컨텐츠 */}
      <div className="relative z-10 text-center">
        {/* 로고 */}
        <motion.h1
          className="text-5xl md:text-7xl font-bold mb-2"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 10 }}
        >
          <span className="text-red-500">C</span>
          <span className="text-blue-500">H</span>
          <span className="text-green-500">R</span>
          <span className="text-yellow-500">O</span>
          <span className="text-purple-500">M</span>
          <span className="text-cyan-500">A</span>
          <span className="text-white">FALL</span>
        </motion.h1>

        <motion.p
          className="text-gray-400 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          색상 융합 퍼즐 게임
        </motion.p>

        {/* 플레이어 정보 */}
        <motion.div
          className="bg-game-panel/60 rounded-xl p-4 mb-8 inline-block backdrop-blur-sm"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-white font-bold text-lg">{playerName}</p>
          <p className="text-game-accent text-sm">Lv. {playerLevel}</p>
          {streakInfo.currentStreak > 0 && (
            <p className="text-orange-400 text-xs mt-1">🔥 {streakInfo.currentStreak}일 연속 플레이</p>
          )}
        </motion.div>

        {/* 버튼들 */}
        <div className="space-y-4 max-w-xs mx-auto">
          {/* 게임 시작 */}
          <motion.button
            className="w-full py-5 bg-gradient-to-r from-game-accent to-blue-600 rounded-2xl
                       font-bold text-white text-xl shadow-lg shadow-blue-500/30
                       hover:from-blue-500 hover:to-blue-700 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => handleClick(() => setShowModeSelect(true))}
          >
            🎮 게임 시작
          </motion.button>

          {/* 하단 버튼들 */}
          <motion.div
            className="grid grid-cols-2 gap-3"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button
              className="py-4 bg-game-panel/80 rounded-xl font-bold text-white
                         hover:bg-game-panel transition-all flex flex-col items-center gap-1"
              onClick={() => handleClick(onOpenShop)}
            >
              <span className="text-2xl">🛒</span>
              <span className="text-sm">상점</span>
            </button>
            <button
              className="py-4 bg-game-panel/80 rounded-xl font-bold text-white
                         hover:bg-game-panel transition-all flex flex-col items-center gap-1"
              onClick={() => handleClick(onOpenLeaderboard)}
            >
              <span className="text-2xl">🏆</span>
              <span className="text-sm">랭킹</span>
            </button>
            <button
              className="py-4 bg-game-panel/80 rounded-xl font-bold text-white
                         hover:bg-game-panel transition-all flex flex-col items-center gap-1"
              onClick={() => handleClick(onOpenBattlePass)}
            >
              <span className="text-2xl">🎫</span>
              <span className="text-sm">배틀패스</span>
            </button>
            <button
              className="py-4 bg-game-panel/80 rounded-xl font-bold text-white
                         hover:bg-game-panel transition-all flex flex-col items-center gap-1"
              onClick={() => handleClick(onOpenDailyReward)}
            >
              <span className="text-2xl">🎁</span>
              <span className="text-sm">보상</span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* 게임 모드 선택 모달 */}
      <AnimatePresence>
        {showModeSelect && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModeSelect(false)}
          >
            <motion.div
              className="bg-game-panel rounded-2xl p-6 max-w-sm w-full mx-4"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white text-center mb-6">게임 모드</h2>

              <div className="space-y-3">
                {(Object.entries(GAME_MODE_CONFIG) as [GameMode, typeof GAME_MODE_CONFIG.classic][]).map(
                  ([mode, config]) => (
                    <button
                      key={mode}
                      className="w-full py-4 px-4 bg-gray-800/80 rounded-xl hover:bg-gray-700 transition-all
                                 flex items-center gap-4 text-left"
                      onClick={() => {
                        playSound('buttonClick');
                        setShowModeSelect(false);
                        onStartGame(mode);
                      }}
                    >
                      <span className="text-3xl">{config.icon}</span>
                      <div>
                        <p className="font-bold text-white">{config.name}</p>
                        <p className="text-sm text-gray-400">{config.description}</p>
                      </div>
                    </button>
                  )
                )}
              </div>

              <button
                className="w-full mt-4 py-3 bg-gray-700 rounded-xl font-bold text-gray-300"
                onClick={() => setShowModeSelect(false)}
              >
                취소
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MainMenu;
