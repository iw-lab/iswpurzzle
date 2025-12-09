import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useAudio } from '../../hooks/useAudio';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onSettings: () => void;
  onMainMenu: () => void;
}

export function PauseMenu({ onResume, onRestart, onSettings, onMainMenu }: PauseMenuProps) {
  const { score, level, gameTime } = useGameStore();
  const { playSound } = useAudio();

  const handleClick = (action: () => void) => {
    playSound('buttonClick');
    action();
  };

  // 시간 포맷
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-game-panel rounded-2xl p-6 max-w-xs w-full mx-4"
        initial={{ scale: 0.8, y: -50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        <h2 className="text-2xl font-bold text-white text-center mb-6">일시정지</h2>

        {/* 현재 상태 */}
        <div className="bg-black/30 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-gray-400 text-xs">점수</p>
              <p className="text-white font-bold">{score.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">레벨</p>
              <p className="text-game-accent font-bold">{level}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">시간</p>
              <p className="text-white font-bold">{formatTime(gameTime)}</p>
            </div>
          </div>
        </div>

        {/* 버튼들 */}
        <div className="space-y-3">
          <motion.button
            className="w-full py-4 bg-gradient-to-r from-game-accent to-blue-600 rounded-xl
                       font-bold text-white text-lg hover:from-blue-500 hover:to-blue-600 transition-all"
            whileTap={{ scale: 0.98 }}
            onClick={() => handleClick(onResume)}
          >
            ▶️ 계속하기
          </motion.button>

          <motion.button
            className="w-full py-3 bg-gray-700 rounded-xl font-bold text-gray-200
                       hover:bg-gray-600 transition-all"
            whileTap={{ scale: 0.98 }}
            onClick={() => handleClick(onRestart)}
          >
            🔄 재시작
          </motion.button>

          <motion.button
            className="w-full py-3 bg-gray-700 rounded-xl font-bold text-gray-200
                       hover:bg-gray-600 transition-all"
            whileTap={{ scale: 0.98 }}
            onClick={() => handleClick(onSettings)}
          >
            ⚙️ 설정
          </motion.button>

          <motion.button
            className="w-full py-3 bg-red-900/50 rounded-xl font-bold text-red-300
                       hover:bg-red-800/50 transition-all"
            whileTap={{ scale: 0.98 }}
            onClick={() => handleClick(onMainMenu)}
          >
            🏠 메인 메뉴
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default PauseMenu;
