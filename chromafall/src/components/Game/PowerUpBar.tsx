import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useAudio } from '../../hooks/useAudio';
import { POWERUP_CONFIG } from '../../constants';
import { PowerUpType } from '../../types';

export function PowerUpBar() {
  const { powerUps, gameStatus, usePowerUp, toggleGravitySelection, activatePowerUp } = useGameStore();
  const { playSound } = useAudio();

  const handleUsePowerUp = (type: PowerUpType) => {
    if (gameStatus !== 'playing') return;

    const powerUp = powerUps.find((p) => p.type === type);
    if (!powerUp || powerUp.count <= 0) return;

    playSound('powerUpUse');

    // 중력 변환은 선택 UI를 표시
    if (type === 'gravityShift') {
      toggleGravitySelection(true);
      usePowerUp(type);
      return;
    }

    // 기타 파워업 처리
    usePowerUp(type);

    // 지속 효과가 있는 파워업은 활성화
    if (type === 'timeSlow' || type === 'scoreMultiplier' || type === 'freeze') {
      activatePowerUp({ type, count: 1, isActive: true, remainingTime: type === 'scoreMultiplier' ? 30 : 5 });

      // 일정 시간 후 비활성화
      const duration = type === 'scoreMultiplier' ? 30000 : 5000;
      setTimeout(() => {
        useGameStore.getState().deactivatePowerUp();
      }, duration);
    }
  };

  if (powerUps.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <AnimatePresence>
        {powerUps.map((powerUp) => {
          const config = POWERUP_CONFIG[powerUp.type];
          return (
            <motion.button
              key={powerUp.type}
              className="relative flex flex-col items-center gap-1 p-2 bg-game-panel/80 rounded-lg
                         hover:bg-game-accent/30 active:scale-95 transition-all border border-white/10
                         disabled:opacity-50 disabled:cursor-not-allowed"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={() => handleUsePowerUp(powerUp.type)}
              disabled={gameStatus !== 'playing' || powerUp.count <= 0}
              title={`${config.name}: ${config.description}`}
            >
              <span className="text-2xl">{config.icon}</span>
              <span className="text-xs text-gray-400">{config.name}</span>
              {/* 수량 배지 */}
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-game-accent rounded-full
                             text-xs font-bold flex items-center justify-center text-white">
                {powerUp.count}
              </span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default PowerUpBar;
