import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { GRAVITY_ICONS, FEVER_CONFIG, BLOCK_COLOR_MAP } from '../../constants';
import type { BlockColor } from '../../types';

export function ScoreBoard() {
  const { score, level, combo, chainCount, gravityDirection, gameTime, activePowerUp, statistics, feverGauge, isFeverMode, gameMode, movesRemaining, puzzleLevel, levelObjectives } = useGameStore();
  const isPuzzleMode = gameMode === 'puzzle';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isHighScore = score > statistics.highScore && score > 0;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 메인 스코어 카드 */}
      <div className="glass-panel p-4 rounded-xl text-center relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
        <p className="text-xs font-bold text-gray-400 tracking-wider mb-1">SCORE</p>
        <motion.p
          key={score}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className={`text-2xl font-mono font-bold ${isHighScore ? 'text-yellow-400 neon-text' : 'text-white'}`}
        >
          {score.toLocaleString()}
        </motion.p>
        {isHighScore && (
          <span className="absolute top-2 right-2 text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold animate-pulse">NEW</span>
        )}
      </div>

      {/* 정보 그리드 */}
      <div className="grid grid-cols-2 gap-2">
        {isPuzzleMode ? (
          <>
            <InfoBox label="PUZZLE" value={`Lv.${puzzleLevel}`} color="text-purple-400" />
            <InfoBox label="MOVES" value={movesRemaining} color={movesRemaining <= 5 ? "text-red-400" : "text-yellow-400"} />
          </>
        ) : (
          <>
            <InfoBox label="LEVEL" value={level} color="text-cyan-400" />
            <InfoBox label="TIME" value={formatTime(gameTime)} color="text-gray-300" font="font-mono" />
          </>
        )}
      </div>

      {/* 퍼즐 모드 목표 */}
      {isPuzzleMode && levelObjectives.length > 0 && (
        <div className="glass-panel p-3 rounded-xl">
          <p className="text-xs font-bold text-purple-300 mb-2">🎯 OBJECTIVES</p>
          <div className="space-y-2">
            {levelObjectives.map((obj, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${obj.completed ? 'bg-green-500' : 'bg-gray-600'}`}>
                  {obj.completed ? '✓' : ''}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300">
                      {obj.type === 'score' && '점수'}
                      {obj.type === 'clearBlocks' && '블록 제거'}
                      {obj.type === 'chains' && '연쇄'}
                      {obj.type === 'clearColor' && (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded" style={{ background: BLOCK_COLOR_MAP[obj.color as BlockColor] }} />
                          색상 제거
                        </span>
                      )}
                    </span>
                    <span className={obj.completed ? 'text-green-400' : 'text-white'}>
                      {obj.current}/{obj.target}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 h-1 rounded-full mt-1 overflow-hidden">
                    <div
                      className={`h-full ${obj.completed ? 'bg-green-500' : 'bg-purple-500'}`}
                      style={{ width: `${Math.min(100, (obj.current / obj.target) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 콤보 및 체인 (조건부 렌더링) */}
      <AnimatePresence>
        {(combo > 1 || chainCount > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2"
          >
            {combo > 1 && (
              <div className="flex-1 glass-panel p-2 rounded-lg flex flex-col items-center justify-center bg-orange-900/20 border-orange-500/30">
                <span className="text-[10px] text-orange-300">COMBO</span>
                <span className="text-lg font-bold text-orange-400">x{combo}</span>
              </div>
            )}
            {chainCount > 0 && (
              <div className="flex-1 glass-panel p-2 rounded-lg flex flex-col items-center justify-center bg-purple-900/20 border-purple-500/30">
                <span className="text-[10px] text-purple-300">CHAIN</span>
                <span className="text-lg font-bold text-purple-400">{chainCount}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 피버 게이지 */}
      <div className={`glass-panel p-3 rounded-xl ${isFeverMode ? 'border-2 border-orange-500 bg-orange-900/30' : ''}`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs font-bold ${isFeverMode ? 'text-orange-300' : 'text-gray-400'}`}>
            {isFeverMode ? '🔥 FEVER MODE!' : 'FEVER GAUGE'}
          </span>
          <span className={`text-xs font-mono ${isFeverMode ? 'text-orange-400' : 'text-gray-500'}`}>
            {Math.floor(feverGauge || 0)}%
          </span>
        </div>
        <div className="w-full bg-gray-700/50 h-3 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${isFeverMode
              ? 'bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500'
              : 'bg-gradient-to-r from-orange-600 to-yellow-500'}`}
            initial={false}
            animate={{
              width: `${Math.min(feverGauge || 0, FEVER_CONFIG.MAX_GAUGE)}%`,
            }}
            transition={{ duration: 0.3 }}
            style={{
              boxShadow: isFeverMode ? '0 0 10px #ff6b00' : 'none',
            }}
          />
        </div>
        {isFeverMode && (
          <motion.p
            className="text-center text-xs text-orange-300 mt-1 font-bold"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            x3 SCORE MULTIPLIER!
          </motion.p>
        )}
      </div>

      {/* 중력 상태 */}
      <div className="glass-panel p-3 rounded-xl flex items-center justify-between">
        <span className="text-xs text-gray-400">GRAVITY</span>
        <motion.div
          key={gravityDirection}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          className="text-xl bg-white/10 w-8 h-8 rounded flex items-center justify-center"
        >
          {GRAVITY_ICONS[gravityDirection]}
        </motion.div>
      </div>

      {/* 활성 파워업 표시 */}
      <AnimatePresence>
        {activePowerUp && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="glass-panel p-3 rounded-xl border-l-4 border-blue-500 bg-blue-900/20"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-blue-300">ACTIVE EFFECT</span>
              {activePowerUp.remainingTime && (
                <span className="text-xs font-mono text-white">{activePowerUp.remainingTime}s</span>
              )}
            </div>
            <div className="text-sm text-white font-medium flex items-center gap-2">
              {activePowerUp.type === 'timeSlow' && '⏱️ Time Slow'}
              {activePowerUp.type === 'scoreMultiplier' && '⭐ x2 Score'}
              {activePowerUp.type === 'freeze' && '❄️ Frozen'}
            </div>
            {activePowerUp.remainingTime && (
              <div className="w-full bg-gray-700 h-1 mt-2 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-400"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: activePowerUp.remainingTime, ease: "linear" }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoBox({ label, value, color, font = '' }: { label: string, value: string | number, color: string, font?: string }) {
  return (
    <div className="glass-panel p-2 rounded-lg text-center flex flex-col justify-center min-h-[60px]">
      <p className="text-[10px] text-gray-500 font-bold mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${color} ${font}`}>{value}</p>
    </div>
  );
}

export default ScoreBoard;
