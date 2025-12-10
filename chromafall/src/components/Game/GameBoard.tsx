import React, { useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useUserStore } from '../../stores/userStore';
import { useGameLogic, useTouchGestures, useAudio } from '../../hooks';
import { Block } from './Block';
import { BOARD_CONFIG, BLOCK_COLOR_MAP } from '../../constants';

interface GameBoardProps {
  cellSize?: number;
}

export function GameBoard({ cellSize: propCellSize }: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { triggerHaptic } = useTouchGestures(containerRef);
  const { playSound, startBGM, stopBGM } = useAudio();

  const {
    board,
    currentBlock,
    gameStatus,
    level,
    gravityDirection,
    isPowerUpSelecting,
  } = useGameStore();

  const { settings } = useUserStore();
  const { isProcessingFusion, fusionEffects, chainEffects, getGhostPosition } = useGameLogic();

  // 셀 크기 계산 (반응형)
  const cellSize = useMemo(() => {
    if (propCellSize) return propCellSize;

    if (typeof window !== 'undefined') {
      const maxWidth = Math.min(window.innerWidth - 32, 400);
      return Math.floor(maxWidth / BOARD_CONFIG.COLUMNS);
    }
    return 40;
  }, [propCellSize]);

  const boardWidth = cellSize * BOARD_CONFIG.COLUMNS;
  const boardHeight = cellSize * BOARD_CONFIG.ROWS;

  // 고스트 블록 위치
  const ghostPosition = useMemo(() => {
    if (!settings.showGhostBlock || !currentBlock) return null;
    return getGhostPosition();
  }, [currentBlock, settings.showGhostBlock, getGhostPosition]);

  // 게임 상태 변경 시 사운드
  useEffect(() => {
    if (gameStatus === 'playing') {
      startBGM(level);
    } else {
      stopBGM();
    }
  }, [gameStatus, level, startBGM, stopBGM]);

  // 융합 효과 시 사운드
  useEffect(() => {
    if (fusionEffects.length > 0) {
      playSound('fusion');
      triggerHaptic('medium');
    }
  }, [fusionEffects, playSound, triggerHaptic]);

  // 연쇄 효과 시 사운드
  useEffect(() => {
    if (chainEffects > 1) {
      playSound('chain');
      triggerHaptic('heavy');
    }
  }, [chainEffects, playSound, triggerHaptic]);

  return (
    <div
      ref={containerRef}
      className="relative select-none touch-none"
      style={{
        width: boardWidth,
        height: boardHeight,
      }}
    >
      {/* 배경 그리드 */}
      <div
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* 그리드 라인 */}
        <svg width="100%" height="100%" className="absolute inset-0 opacity-20">
          <defs>
            <pattern
              id="grid"
              width={cellSize}
              height={cellSize}
              patternUnits="userSpaceOnUse"
            >
              <rect
                width={cellSize}
                height={cellSize}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* 위험 영역 표시 (상단 3줄) */}
        {gravityDirection === 'down' && (
          <div
            className="absolute top-0 left-0 right-0 opacity-30"
            style={{
              height: cellSize * 3,
              background: 'linear-gradient(to bottom, rgba(255,0,0,0.3), transparent)',
            }}
          />
        )}
      </div>

      {/* 배치된 블록들 */}
      {board.map((row, y) =>
        row.map((block, x) => {
          if (!block) return null;

          const isFusing = fusionEffects.some((e) => e.x === x && e.y === y);

          return (
            <motion.div
              key={block.id}
              className="absolute"
              style={{
                left: x * cellSize + 1,
                top: y * cellSize + 1,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Block color={block.color} size={cellSize} isFusing={isFusing} />
            </motion.div>
          );
        })
      )}

      {/* 고스트 블록 */}
      {ghostPosition && currentBlock && ghostPosition.y !== currentBlock.y && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: ghostPosition.x * cellSize + 1,
            top: ghostPosition.y * cellSize + 1,
          }}
        >
          <Block color={currentBlock.color} size={cellSize} isGhost />
        </div>
      )}

      {/* 현재 낙하 블록 */}
      <AnimatePresence>
        {currentBlock && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: currentBlock.x * cellSize + 1,
              top: currentBlock.y * cellSize + 1,
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.1 }}
          >
            <Block color={currentBlock.color} size={cellSize} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 융합 파티클 효과 */}
      <AnimatePresence>
        {fusionEffects.map((effect, index) => (
          <motion.div
            key={`fusion-${index}`}
            className="absolute pointer-events-none"
            style={{
              left: effect.x * cellSize + cellSize / 2,
              top: effect.y * cellSize + cellSize / 2,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div
              className="w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{
                background: BLOCK_COLOR_MAP[effect.color as keyof typeof BLOCK_COLOR_MAP],
                boxShadow: `0 0 20px ${BLOCK_COLOR_MAP[effect.color as keyof typeof BLOCK_COLOR_MAP]}`,
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 연쇄 표시 */}
      <AnimatePresence>
        {chainEffects > 1 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="text-4xl font-bold text-yellow-400"
              style={{
                textShadow: '0 0 20px rgba(255, 200, 0, 0.8)',
              }}
            >
              {chainEffects}연쇄!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 중력 방향 선택 UI */}
      <AnimatePresence>
        {isPowerUpSelecting && (
          <motion.div
            className="absolute inset-0 bg-black/70 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center text-white">
              <p className="text-lg mb-4">중력 방향을 선택하세요</p>
              <div className="grid grid-cols-3 gap-2">
                <div />
                <button
                  className="p-4 bg-game-accent/50 rounded-lg hover:bg-game-accent transition-colors"
                  onClick={() => useGameStore.getState().setGravityDirection('up')}
                >
                  ⬆️
                </button>
                <div />
                <button
                  className="p-4 bg-game-accent/50 rounded-lg hover:bg-game-accent transition-colors"
                  onClick={() => useGameStore.getState().setGravityDirection('left')}
                >
                  ⬅️
                </button>
                <button
                  className="p-4 bg-game-accent/50 rounded-lg hover:bg-game-accent transition-colors"
                  onClick={() => useGameStore.getState().setGravityDirection('down')}
                >
                  ⬇️
                </button>
                <button
                  className="p-4 bg-game-accent/50 rounded-lg hover:bg-game-accent transition-colors"
                  onClick={() => useGameStore.getState().setGravityDirection('right')}
                >
                  ➡️
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 일시정지 오버레이 */}
      {gameStatus === 'paused' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-white text-2xl font-bold">일시정지</div>
        </div>
      )}
    </div>
  );
}

export default GameBoard;
