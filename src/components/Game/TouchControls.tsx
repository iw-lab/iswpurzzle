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

  // 키보드 이벤트 핸들링
  useEffect(() => {
    const pressedKeys = new Set<string>();
    let repeatTimerRef: number | null = null;
    let repeatDirectionRef: 'left' | 'right' | null = null;
    let dasTimerRef: number | null = null;

    const clearAllTimers = () => {
      if (repeatTimerRef) clearInterval(repeatTimerRef);
      if (dasTimerRef) clearTimeout(dasTimerRef);
      repeatTimerRef = null;
      dasTimerRef = null;
      repeatDirectionRef = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (pressedKeys.has(e.code)) { e.preventDefault(); return; }
      pressedKeys.add(e.code);
      const state = useGameStore.getState();

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (state.gameStatus === 'playing') state.pauseGame();
        else if (state.gameStatus === 'paused') state.resumeGame();
        return;
      }

      if (state.gameStatus !== 'playing') return;

      if (state.isPowerUpSelecting) {
        if (e.code === 'ArrowUp') state.setGravityDirection('up');
        else if (e.code === 'ArrowDown') state.setGravityDirection('down');
        else if (e.code === 'ArrowLeft') state.setGravityDirection('left');
        else if (e.code === 'ArrowRight') state.setGravityDirection('right');
        return;
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        clearAllTimers();
        state.moveBlock('left');
        repeatDirectionRef = 'left';
        dasTimerRef = window.setTimeout(() => {
          if (repeatDirectionRef === 'left') {
            repeatTimerRef = window.setInterval(() => useGameStore.getState().moveBlock('left'), 50);
          }
        }, 250);
        return;
      }

      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
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

      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        state.softDrop();
        return;
      }

      // 블록 회전 (↑ 또는 W 키)
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        state.rotateBlock();
        return;
      }

      // 하드 드롭 (Space 키)
      if (e.code === 'Space') {
        e.preventDefault();
        state.hardDrop();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code);
      if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && repeatDirectionRef === 'left') clearAllTimers();
      if ((e.code === 'ArrowRight' || e.code === 'KeyD') && repeatDirectionRef === 'right') clearAllTimers();
    };

    const handleBlur = () => { pressedKeys.clear(); clearAllTimers(); };

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

  const handlePress = useCallback((action: () => void, sound: 'buttonClick' | 'blockRotate' | 'hardDrop' | 'blockMove' = 'buttonClick') => {
    playSound(sound);
    action();
  }, [playSound]);

  const startMoving = useCallback((dir: 'left' | 'right') => {
    playSound('blockMove');
    const action = () => {
      useGameStore.getState().moveBlock(dir);
    };
    action();
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    moveIntervalRef.current = window.setInterval(() => {
      playSound('blockMove');
      useGameStore.getState().moveBlock(dir);
    }, 80);
  }, [playSound]);

  const stopMoving = useCallback(() => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  }, []);

  const currentBlocks = useGameStore(state => state.currentBlocks);

  if (!visible) return null;

  return (
    <div className="w-full px-3 pb-4 pt-2 select-none touch-none">
      {/* 심플한 1줄 레이아웃 */}
      <div className="flex justify-between items-center gap-3 max-w-md mx-auto">

        {/* 왼쪽: 방향 버튼 그룹 */}
        <div className="flex gap-2">
          <DirectionButton
            icon="◀"
            onStart={() => startMoving('left')}
            onEnd={stopMoving}
          />
          <DirectionButton
            icon="▼"
            onStart={() => handlePress(() => useGameStore.getState().softDrop(), 'blockMove')}
          />
          <DirectionButton
            icon="▶"
            onStart={() => startMoving('right')}
            onEnd={stopMoving}
          />
        </div>

        {/* 중앙: 회전 버튼 */}
        <motion.button
          className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center
                     text-white font-bold shadow-lg border-b-4
                     active:border-b-0 active:translate-y-1 transition-all
                     ${currentBlocks.length > 1
                       ? 'bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-700'
                       : 'bg-slate-700 border-slate-600 opacity-50'}`}
          whileTap={{ scale: 0.9 }}
          onTouchStart={(e) => { e.preventDefault(); handlePress(() => useGameStore.getState().rotateBlock(), 'blockRotate'); }}
          onMouseDown={() => handlePress(() => useGameStore.getState().rotateBlock(), 'blockRotate')}
        >
          <span className="text-xl">↻</span>
          <span className="text-[8px] opacity-80">회전</span>
        </motion.button>

        {/* 오른쪽: 하드 드롭 - 크고 눈에 띄게 */}
        <motion.button
          className="w-20 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500
                     flex items-center justify-center gap-1 text-white font-bold
                     shadow-lg shadow-orange-500/30 border-b-4 border-orange-700
                     active:border-b-0 active:translate-y-1 transition-all"
          whileTap={{ scale: 0.95 }}
          onTouchStart={(e) => { e.preventDefault(); handlePress(() => useGameStore.getState().hardDrop(), 'hardDrop'); }}
          onMouseDown={() => handlePress(() => useGameStore.getState().hardDrop(), 'hardDrop')}
        >
          <span className="text-xl">⚡</span>
          <span className="text-sm">DROP</span>
        </motion.button>
      </div>
    </div>
  );
}

// 방향 버튼 (크고 누르기 쉽게)
function DirectionButton({
  icon,
  onStart,
  onEnd,
}: {
  icon: string;
  onStart: () => void;
  onEnd?: () => void;
}) {
  return (
    <motion.button
      className="w-14 h-14 rounded-2xl bg-slate-700/90 backdrop-blur
                 flex items-center justify-center text-white text-2xl font-bold
                 shadow-lg border-b-4 border-slate-600
                 active:border-b-0 active:translate-y-1 transition-all"
      whileTap={{ scale: 0.9 }}
      onTouchStart={(e) => { e.preventDefault(); onStart(); }}
      onTouchEnd={(e) => { e.preventDefault(); onEnd?.(); }}
      onMouseDown={onStart}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
    >
      {icon}
    </motion.button>
  );
}

export default TouchControls;
