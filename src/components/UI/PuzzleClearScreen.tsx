import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';

interface PuzzleClearScreenProps {
  onNextLevel: () => void;
  onMainMenu: () => void;
}

export function PuzzleClearScreen({ onNextLevel, onMainMenu }: PuzzleClearScreenProps) {
  const { score, puzzleLevel, movesRemaining, levelObjectives } = useGameStore();

  // 보너스 점수 계산 (남은 이동 횟수 * 100)
  const bonusScore = movesRemaining * 100;
  const totalScore = score + bonusScore;

  return (
    <motion.div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gradient-to-b from-purple-900 to-gray-900 rounded-2xl p-6 max-w-sm w-full mx-4 border-2 border-purple-500"
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 15 }}
      >
        {/* 헤더 */}
        <motion.div
          className="text-center mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="text-6xl mb-2"
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            🎉
          </motion.div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            PUZZLE CLEAR!
          </h2>
          <p className="text-purple-300 mt-1">Level {puzzleLevel} Complete</p>
        </motion.div>

        {/* 목표 달성 현황 */}
        <div className="bg-black/30 rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-400 mb-3">OBJECTIVES</p>
          <div className="space-y-2">
            {levelObjectives.map((obj, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-gray-300 text-sm flex-1">
                  {obj.type === 'score' && `점수 ${obj.target.toLocaleString()}`}
                  {obj.type === 'clearBlocks' && `블록 ${obj.target}개 제거`}
                  {obj.type === 'chains' && `${obj.target}연쇄`}
                  {obj.type === 'clearColor' && `색상 블록 ${obj.target}개 제거`}
                </span>
                <span className="text-green-400 text-sm">{obj.current}/{obj.target}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 점수 */}
        <div className="bg-black/30 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">점수</span>
            <span className="text-white font-mono">{score.toLocaleString()}</span>
          </div>
          {movesRemaining > 0 && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">남은 이동 보너스 ({movesRemaining}수)</span>
              <span className="text-yellow-400 font-mono">+{bonusScore.toLocaleString()}</span>
            </div>
          )}
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-purple-300 font-bold">총 점수</span>
              <span className="text-2xl font-bold text-white font-mono">{totalScore.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="space-y-3">
          <motion.button
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl
                       font-bold text-white text-lg hover:from-purple-500 hover:to-pink-500 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNextLevel}
          >
            ▶️ Level {puzzleLevel + 1}
          </motion.button>

          <motion.button
            className="w-full py-3 bg-gray-700 rounded-xl font-bold text-gray-300
                       hover:bg-gray-600 transition-all"
            whileTap={{ scale: 0.98 }}
            onClick={onMainMenu}
          >
            🏠 메인 메뉴
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default PuzzleClearScreen;
