import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useUserStore } from '../../stores/userStore';
import { GRAVITY_ICONS } from '../../constants';

export function ScoreBoard() {
  const { score, level, combo, chainCount, gravityDirection, gameTime, activePowerUp } = useGameStore();
  const { statistics } = useGameStore();

  // 시간 포맷
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 점수 포맷
  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  const isHighScore = score > statistics.highScore && score > 0;

  return (
    <div className="bg-game-panel/80 rounded-lg p-4 backdrop-blur-sm space-y-3">
      {/* 점수 */}
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-1">SCORE</p>
        <motion.p
          className={`text-2xl font-bold ${isHighScore ? 'text-yellow-400' : 'text-white'}`}
          key={score}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {formatScore(score)}
        </motion.p>
        {isHighScore && (
          <motion.p
            className="text-xs text-yellow-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            NEW HIGH SCORE!
          </motion.p>
        )}
      </div>

      {/* 레벨 */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">LEVEL</span>
        <motion.span
          className="text-lg font-bold text-game-accent"
          key={level}
          initial={{ scale: 1.3, color: '#ffd700' }}
          animate={{ scale: 1, color: '#4a9eff' }}
          transition={{ duration: 0.3 }}
        >
          {level}
        </motion.span>
      </div>

      {/* 콤보 */}
      <AnimatePresence>
        {combo > 0 && (
          <motion.div
            className="flex justify-between items-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <span className="text-xs text-gray-400">COMBO</span>
            <motion.span
              className="text-lg font-bold text-orange-400"
              key={combo}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
            >
              x{combo}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 연쇄 */}
      <AnimatePresence>
        {chainCount > 0 && (
          <motion.div
            className="flex justify-between items-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <span className="text-xs text-gray-400">CHAIN</span>
            <motion.span
              className="text-lg font-bold text-purple-400"
              key={chainCount}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
            >
              {chainCount}연쇄
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 중력 방향 */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">GRAVITY</span>
        <motion.span
          className="text-lg"
          key={gravityDirection}
          initial={{ rotate: 180 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.3 }}
        >
          {GRAVITY_ICONS[gravityDirection]}
        </motion.span>
      </div>

      {/* 시간 */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">TIME</span>
        <span className="text-sm font-mono text-gray-300">{formatTime(gameTime)}</span>
      </div>

      {/* 활성 파워업 */}
      <AnimatePresence>
        {activePowerUp && (
          <motion.div
            className="bg-game-accent/20 rounded-lg p-2 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <p className="text-xs text-game-accent">활성 파워업</p>
            <p className="text-sm font-bold text-white">
              {activePowerUp.type === 'timeSlow' && '⏱️ 시간 감속'}
              {activePowerUp.type === 'scoreMultiplier' && '⭐ 점수 2배'}
              {activePowerUp.type === 'freeze' && '❄️ 프리즈'}
            </p>
            {activePowerUp.remainingTime && (
              <p className="text-xs text-gray-400">{activePowerUp.remainingTime}초</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 최고 점수 */}
      <div className="pt-2 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">BEST</span>
          <span className="text-sm font-bold text-gray-400">
            {formatScore(Math.max(statistics.highScore, score))}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ScoreBoard;
