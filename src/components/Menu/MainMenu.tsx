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

        {/* 타이틀 로고 - Premium 3D Effect */}
        <div className="text-center relative">
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: -30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 12 }}
          >
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
              <motion.span
                className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 neon-pulse inline-block"
                animate={{
                  filter: ['hue-rotate(0deg)', 'hue-rotate(20deg)', 'hue-rotate(0deg)'],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  textShadow: '0 0 40px rgba(0,200,255,0.5), 0 0 80px rgba(100,100,255,0.3)',
                }}
              >
                CHROMA
              </motion.span>
              <br />
              <motion.span
                className="text-white inline-block"
                style={{
                  textShadow: '0 4px 8px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.4)',
                }}
                animate={{
                  textShadow: [
                    '0 4px 8px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.4)',
                    '0 4px 12px rgba(0,0,0,0.6), 0 0 50px rgba(255,255,255,0.6)',
                    '0 4px 8px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.4)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                FALL
              </motion.span>
            </h1>
          </motion.div>
          <motion.p
            className="text-gray-400 mt-3 tracking-[0.3em] text-sm uppercase font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            ✦ Color Fusion Puzzle ✦
          </motion.p>
        </div>

        {/* 유저 프로필 카드 - Glass Ultra */}
        <motion.div
          className="glass-ultra w-full p-5 rounded-3xl flex items-center justify-between shimmer"
          initial={{ y: 30, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 150 }}
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold shadow-lg"
              style={{ boxShadow: '0 8px 25px rgba(139, 92, 246, 0.4)' }}
              whileHover={{ scale: 1.08, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              {playerName.charAt(0)}
            </motion.div>
            <div>
              <p className="font-bold text-lg tracking-wide">{playerName}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-cyan-300 px-2 py-1 rounded-lg font-semibold border border-cyan-500/20">
                  Lv.{playerLevel}
                </span>
                {streakInfo.currentStreak > 0 && (
                  <motion.span
                    className="text-orange-400 flex items-center gap-1"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    🔥 {streakInfo.currentStreak}일
                  </motion.span>
                )}
              </div>
            </div>
          </div>
          {dailyRewardAvailable && (
            <motion.button
              onClick={() => handleClick(onOpenDailyReward)}
              className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg relative overflow-hidden"
              style={{ boxShadow: '0 6px 20px rgba(251, 146, 60, 0.5)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{ y: [0, -3, 0] }}
              transition={{ y: { duration: 1, repeat: Infinity, ease: 'easeInOut' } }}
            >
              <span className="relative z-10">🎁 보상 받기</span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
              />
            </motion.button>
          )}
        </motion.div>

        {/* 메인 액션 버튼 - Super Glow */}
        <motion.div
          className="w-full space-y-5"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 120 }}
        >
          <motion.button
            onClick={() => handleClick(() => setShowModeSelect(true))}
            className="w-full py-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl font-black text-2xl text-white relative overflow-hidden group"
            style={{
              boxShadow: '0 10px 40px rgba(79, 70, 229, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
              fontFamily: 'var(--font-display)'
            }}
            whileHover={{ scale: 1.03, boxShadow: '0 15px 50px rgba(79, 70, 229, 0.6)' }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Animated border glow */}
            <motion.div
              className="absolute inset-[-2px] bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-100 -z-10"
              style={{ filter: 'blur(8px)' }}
              transition={{ duration: 0.3 }}
            />
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            />
            <span className="relative flex items-center justify-center gap-4">
              <motion.span
                className="text-3xl"
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🎮
              </motion.span>
              GAME START
            </span>
          </motion.button>

          <div className="grid grid-cols-3 gap-4">
            <MenuButton icon="🛒" label="상점" onClick={() => handleClick(onOpenShop)} color="from-pink-500/20 to-rose-500/20" />
            <MenuButton icon="🏆" label="랭킹" onClick={() => handleClick(onOpenLeaderboard)} color="from-amber-500/20 to-yellow-500/20" />
            <MenuButton icon="🎫" label="패스" onClick={() => handleClick(onOpenBattlePass)} color="from-emerald-500/20 to-green-500/20" />
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
    <motion.button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border border-white/10 transition-all bg-gradient-to-br ${color} backdrop-blur-sm relative overflow-hidden group`}
      whileHover={{ scale: 1.05, borderColor: 'rgba(255,255,255,0.3)' }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.span
        className="text-3xl drop-shadow-lg"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {icon}
      </motion.span>
      <span className="text-sm font-bold text-gray-200 tracking-wide">{label}</span>
      {/* Hover glow */}
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
    </motion.button>
  );
}

export default MainMenu;
