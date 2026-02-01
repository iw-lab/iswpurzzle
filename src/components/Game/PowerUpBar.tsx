import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useAudio } from '../../hooks/useAudio';
import { POWERUP_CONFIG, BOARD_CONFIG, getColorsForLevel } from '../../constants';
import { PowerUpType, Block, BlockColor } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function PowerUpBar() {
  const { powerUps, gameStatus, usePowerUp, toggleGravitySelection, activatePowerUp, board, updateBoard, level, addScore } = useGameStore();
  const { playSound } = useAudio();

  // 컬러 폭탄: 가장 많은 색상 블록 제거
  const useColorBomb = useCallback(() => {
    const colorCounts: Record<string, number> = {};
    for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
      for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
        const block = board[y][x];
        if (block && block.specialType !== 'stone') {
          colorCounts[block.color] = (colorCounts[block.color] || 0) + 1;
        }
      }
    }
    // 가장 많은 색상 찾기
    let maxColor: BlockColor | null = null;
    let maxCount = 0;
    for (const [color, count] of Object.entries(colorCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxColor = color as BlockColor;
      }
    }
    if (!maxColor) return;

    // 해당 색상 블록 제거
    const newBoard = board.map((row, y) =>
      row.map((block, x) =>
        block && block.color === maxColor ? null : block
      )
    );
    updateBoard(newBoard);
    addScore(maxCount * 50);
  }, [board, updateBoard, addScore]);

  // 가로줄 클리어
  const useRowClear = useCallback(() => {
    // 블록이 가장 많은 줄 찾기
    let maxRowIdx = -1;
    let maxBlocks = 0;
    for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
      let count = 0;
      for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
        if (board[y][x]) count++;
      }
      if (count > maxBlocks) {
        maxBlocks = count;
        maxRowIdx = y;
      }
    }
    if (maxRowIdx >= 0) {
      const newBoard = board.map((row, y) =>
        y === maxRowIdx ? Array(BOARD_CONFIG.COLUMNS).fill(null) : row
      );
      updateBoard(newBoard);
      addScore(maxBlocks * 30);
    }
  }, [board, updateBoard, addScore]);

  // 세로줄 클리어
  const useColumnClear = useCallback(() => {
    // 블록이 가장 많은 열 찾기
    let maxColIdx = -1;
    let maxBlocks = 0;
    for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
      let count = 0;
      for (let y = 0; y < BOARD_CONFIG.ROWS; y++) {
        if (board[y][x]) count++;
      }
      if (count > maxBlocks) {
        maxBlocks = count;
        maxColIdx = x;
      }
    }
    if (maxColIdx >= 0) {
      const newBoard = board.map((row) =>
        row.map((block, x) => (x === maxColIdx ? null : block))
      );
      updateBoard(newBoard);
      addScore(maxBlocks * 30);
    }
  }, [board, updateBoard, addScore]);

  // 무지개 블록: 다음 블록을 rainbow로 변환
  const useRainbowBlock = useCallback(() => {
    const state = useGameStore.getState();
    if (state.currentBlocks.length > 0) {
      const updatedBlocks = state.currentBlocks.map((block, i) =>
        i === 0 ? { ...block, color: 'rainbow' as BlockColor } : block
      );
      useGameStore.setState({
        currentBlocks: updatedBlocks,
        currentBlock: updatedBlocks[0] || null,
      });
    } else {
      // 다음 블록 큐의 첫번째를 rainbow로
      const newNextBlocks = [...state.nextBlocks];
      if (newNextBlocks.length > 0) {
        newNextBlocks[0] = 'rainbow';
        useGameStore.setState({ nextBlocks: newNextBlocks });
      }
    }
  }, []);

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

    // 즉시 효과 파워업
    if (type === 'colorBomb') {
      useColorBomb();
      usePowerUp(type);
      return;
    }

    if (type === 'rowClear') {
      useRowClear();
      usePowerUp(type);
      return;
    }

    if (type === 'columnClear') {
      useColumnClear();
      usePowerUp(type);
      return;
    }

    if (type === 'rainbowBlock') {
      useRainbowBlock();
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
