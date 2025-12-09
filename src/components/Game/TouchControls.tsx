import React, { useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useAudio } from '../../hooks/useAudio';

interface TouchControlsProps {
  visible?: boolean;
}

export function TouchControls({ visible = true }: TouchControlsProps) {
  const { playSound } = useAudio();
  const moveIntervalRef = useRef<number | null>(null);

  // 컴포넌트 마운트 시 키보드 이벤트 등록 (한 번만)
  useEffect(() => {
    const pressedKeys = new Set<string>();
    let repeatTimerRef: number | null = null;
    let repeatDirectionRef: 'left' | 'right' | null = null;
    let dasTimerRef: number | null = null;

    const clearAllTimers = () => {
      if (repeatTimerRef) {
        clearInterval(repeatTimerRef);
        repeatTimerRef = null;
      }
      if (dasTimerRef) {
        clearTimeout(dasTimerRef);
        dasTimerRef = null;
      }
      repeatDirectionRef = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;

      if (pressedKeys.has(code)) {
        e.preventDefault();
        return;
      }

      pressedKeys.add(code);
      const state = useGameStore.getState();

      if (code === 'Escape' || code === 'KeyP') {
        if (state.gameStatus === 'playing') state.pauseGame();
        else if (state.gameStatus === 'paused') state.resumeGame();
        return;
      }

      if (state.gameStatus !== 'playing') return;

      if (state.isPowerUpSelecting) {
        if (code === 'ArrowUp') state.setGravityDirection('up');
        else if (code === 'ArrowDown') state.setGravityDirection('down');
        else if (code === 'ArrowLeft') state.setGravityDirection('left');
        else if (code === 'ArrowRight') state.setGravityDirection('right');
        return;
      }

      if (code === 'ArrowLeft' || code === 'KeyA') {
        e.preventDefault();
        clearAllTimers();
        state.moveBlock('left');
        repeatDirectionRef = 'left';
        dasTimerRef = window.setTimeout(() => {
          if (repeatDirectionRef === 'left') {
            repeatTimerRef = window.setInterval(() => {
              useGameStore.getState().moveBlock('left');
            }, 50);
          }
        }, 250);
        return;
      }

      if (code === 'ArrowRight' || code === 'KeyD') {
        e.preventDefault();
        clearAllTimers();
        state.moveBlock('right');
        repeatDirectionRef = 'right';
        dasTimerRef = window.setTimeout(() => {
          if (repeatDirectionRef === 'right') {
            repeatTimerRef = window.setInterval(() => {
              useGameStore.getState().moveBlock('right');
            }, 50);
          }
        }, 250);
        return;
      }

      if (code === 'ArrowDown' || code === 'KeyS') {
        e.preventDefault();
        state.softDrop();
        return;
      }

      if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') {
        e.preventDefault();
        state.hardDrop();
        return;
      }

      if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyC') {
        e.preventDefault();
        state.doHoldBlock();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        if (repeatDirectionRef === 'left') clearAllTimers();
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        if (repeatDirectionRef === 'right') clearAllTimers();
      }
    };

    const handleBlur = () => {
      pressedKeys.clear();
      clearAllTimers();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      clearAllTimers();
    };
  }, []);

  const handlePress = useCallback(
    (action: () => void) => {
      playSound('buttonClick');
      action();
    },
    [playSound]
  );

  const startMovingLeft = useCallback(() => {
    playSound('buttonClick');
    useGameStore.getState().moveBlock('left');
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    moveIntervalRef.current = window.setInterval(() => {
      useGameStore.getState().moveBlock('left');
    }, 100);
  }, [playSound]);

  const startMovingRight = useCallback(() => {
    playSound('buttonClick');
    useGameStore.getState().moveBlock('right');
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    moveIntervalRef.current = window.setInterval(() => {
      useGameStore.getState().moveBlock('right');
    }, 100);
  }, [playSound]);

  const stopMoving = useCallback(() => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="flex justify-center items-center gap-4 py-4">
      {/* 왼쪽 이동 */}
      <motion.button
        className="w-16 h-16 bg-game-panel/80 rounded-xl flex items-center justify-center text-2xl
                   active:bg-game-accent/50 touch-none select-none border border-white/10"
        whileTap={{ scale: 0.9 }}
        onTouchStart={startMovingLeft}
        onTouchEnd={stopMoving}
        onMouseDown={startMovingLeft}
        onMouseUp={stopMoving}
        onMouseLeave={stopMoving}
      >
        ◀️
      </motion.button>

      {/* 소프트 드롭 */}
      <motion.button
        className="w-16 h-16 bg-game-panel/80 rounded-xl flex items-center justify-center text-2xl
                   active:bg-game-accent/50 touch-none select-none border border-white/10"
        whileTap={{ scale: 0.9 }}
        onTouchStart={() => handlePress(() => useGameStore.getState().softDrop())}
        onMouseDown={() => handlePress(() => useGameStore.getState().softDrop())}
      >
        🔽
      </motion.button>

      {/* 오른쪽 이동 */}
      <motion.button
        className="w-16 h-16 bg-game-panel/80 rounded-xl flex items-center justify-center text-2xl
                   active:bg-game-accent/50 touch-none select-none border border-white/10"
        whileTap={{ scale: 0.9 }}
        onTouchStart={startMovingRight}
        onTouchEnd={stopMoving}
        onMouseDown={startMovingRight}
        onMouseUp={stopMoving}
        onMouseLeave={stopMoving}
      >
        ▶️
      </motion.button>

      {/* 하드 드롭 */}
      <motion.button
        className="w-16 h-16 bg-yellow-600/80 rounded-xl flex items-center justify-center text-2xl
                   active:bg-yellow-500 touch-none select-none border border-yellow-400/30"
        whileTap={{ scale: 0.9 }}
        onTouchStart={() => handlePress(() => useGameStore.getState().hardDrop())}
        onMouseDown={() => handlePress(() => useGameStore.getState().hardDrop())}
      >
        ⬇️
      </motion.button>
    </div>
  );
}

export default TouchControls;
