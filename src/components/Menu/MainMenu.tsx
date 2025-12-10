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
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center text-white bg-[#050510]">
      {/* 배경 장식 애니메이션 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#050510] to-[#050510]" />
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full blur-xl"
            style={{
              background: ['#ff4757', '#3742fa', '#2ed573', '#ffa502'][i % 4],
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              opacity: 0.1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100],
              x: [0, Math.random() * 50 - 25],
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* 상단바 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
        <button
          onClick={() => handleClick(onOpenSettings)}
          className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
        >
          ⚙️
        </button>

        <div className="flex gap-3">
          <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="text-lg">🪙</span>
            <span className="font-bold text-yellow-400 font-mono">{currency.coins.toLocaleString()}</span>
          </div>
          <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="text-lg">💎</span>
            <span className="font-bold text-purple-400 font-mono">{currency.gems.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="z-10 w-full max-w-md px-6 flex flex-col items-center gap-8">

        {/* 타이틀 로고 */}
        <div className="text-center relative">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <h1 className="text-6xl md:text-7xl font-black italic tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 neon-text">CHROMA</span>
              <br />
              <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">FALL</span>
            </h1>
          </motion.div>
          <motion.p
            className="text-gray-400 mt-2 tracking-widest text-sm uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Color Fusion Puzzle
          </motion.p>
        </div>

        {/* 유저 프로필 카드 */}
        <motion.div
          className="glass-panel w-full p-4 rounded-2xl flex items-center justify-between"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold shadow-lg">
              {playerName.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-lg">{playerName}</p>
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Lv.{playerLevel}</span>
                {streakInfo.currentStreak > 0 && (
                  <span className="text-orange-400">🔥 {streakInfo.currentStreak}일 연속</span>
                )}
              </div>
            </div>
          </div>
          {dailyRewardAvailable && (
            <button
              onClick={() => handleClick(onOpenDailyReward)}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-bounce shadow-lg shadow-orange-500/30"
            >
              🎁 보상 받기
            </button>
          )}
        </motion.div>

        {/* 메인 액션 버튼 */}
        <motion.div
          className="w-full space-y-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={() => handleClick(() => setShowModeSelect(true))}
            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold text-xl text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all border border-white/10 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-[shine_1s_infinite]" />
            <span className="relative flex items-center justify-center gap-3">
              <span className="text-2xl">🎮</span> GAME START
            </span>
          </button>

          <div className="grid grid-cols-3 gap-3">
            <MenuButton icon="🛒" label="상점" onClick={() => handleClick(onOpenShop)} color="bg-pink-600/20" />
            <MenuButton icon="🏆" label="랭킹" onClick={() => handleClick(onOpenLeaderboard)} color="bg-yellow-600/20" />
            <MenuButton icon="🎫" label="패스" onClick={() => handleClick(onOpenBattlePass)} color="bg-green-600/20" />
          </div>
        </motion.div>
      </div>

      {/* 게임 모드 선택 모달 */}
      <AnimatePresence>
        {showModeSelect && (
          <motion.div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModeSelect(false)}
          >
            <motion.div
              className="w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 bg-gradient-to-b from-[#2a2a4e] to-[#1a1a2e]">
                <h2 className="text-2xl font-bold text-center text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>SELECT MODE</h2>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {(Object.entries(GAME_MODE_CONFIG) as [GameMode, typeof GAME_MODE_CONFIG.classic][]).map(([mode, config]) => (
                    <button
                      key={mode}
                      onClick={() => {
                        handleClick(() => {
                          setShowModeSelect(false);
                          onStartGame(mode);
                        });
                      }}
                      className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left flex items-center gap-4 group"
                    >
                      <span className="text-3xl group-hover:scale-110 transition-transform">{config.icon}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-white text-lg">{config.name}</h3>
                          {config.hasTimeLimit && <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded">TIME</span>}
                        </div>
                        <p className="text-sm text-gray-400">{config.description}</p>
                      </div>
                      <span className="text-gray-500 group-hover:text-white transition-colors">▶</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-[#151525]">
                <button
                  onClick={() => setShowModeSelect(false)}
                  className="w-full py-3 text-gray-400 font-bold hover:text-white transition-colors"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuButton({ icon, label, onClick, color }: { icon: string, label: string, onClick: () => void, color: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-white/5 hover:border-white/20 transition-all active:scale-95 ${color} hover:brightness-125`}
    >
      <span className="text-2xl drop-shadow-md">{icon}</span>
      <span className="text-sm font-bold text-gray-200">{label}</span>
    </button>
  );
}

export default MainMenu;
