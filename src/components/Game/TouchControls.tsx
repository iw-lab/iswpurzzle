import React, { useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useAudio } from '../../hooks/useAudio';

interface TouchControlsProps {
  visible?: boolean;
}

// 터치 디바운스 시간 (ms)
const TOUCH_DEBOUNCE = 150;

export function TouchControls({ visible = true }: TouchControlsProps) {
  const { playSound } = useAudio();
  const moveIntervalRef = useRef<number | null>(null);
  const lastActionTimeRef = useRef<Record<string, number>>({});

  // 디바운스된 액션 실행
  const executeWithDebounce = useCallback((actionKey: string, action: () => void) => {
    const now = Date.now();
    const lastTime = lastActionTimeRef.current[actionKey] || 0;

    if (now - lastTime < TOUCH_DEBOUNCE) {
      return false; // 디바운스 중
    }

    lastActionTimeRef.current[actionKey] = now;
    action();
    return true;
  }, []);

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

  const handleHardDrop = useCallback(() => {
    executeWithDebounce('hardDrop', () => {
      playSound('hardDrop');
      useGameStore.getState().hardDrop();
    });
  }, [playSound, executeWithDebounce]);

  const handleRotate = useCallback(() => {
    executeWithDebounce('rotate', () => {
      playSound('blockRotate');
      useGameStore.getState().rotateBlock();
    });
  }, [playSound, executeWithDebounce]);

  const handleSoftDrop = useCallback(() => {
    executeWithDebounce('softDrop', () => {
      playSound('blockMove');
      useGameStore.getState().softDrop();
    });
  }, [playSound, executeWithDebounce]);

  const startMoving = useCallback((dir: 'left' | 'right') => {
    // 이동은 디바운스 적용하지 않음 (길게 누르기 지원)
    playSound('blockMove');
    useGameStore.getState().moveBlock(dir);

    // 기존 인터벌 정리
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    if ((moveIntervalRef as any).timeout) clearTimeout((moveIntervalRef as any).timeout);

    // 길게 누르면 반복 이동 (첫 반복까지 300ms 대기)
    const startRepeat = setTimeout(() => {
      moveIntervalRef.current = window.setInterval(() => {
        useGameStore.getState().moveBlock(dir);
      }, 80); // 반복 속도 약간 늦춤
    }, 300); // 첫 반복까지 대기 시간 증가

    // stopMoving에서 정리할 수 있도록 저장
    (moveIntervalRef as any).timeout = startRepeat;
  }, [playSound]);

  const stopMoving = useCallback(() => {
    // 타임아웃 정리
    if ((moveIntervalRef as any).timeout) {
      clearTimeout((moveIntervalRef as any).timeout);
      (moveIntervalRef as any).timeout = null;
    }
    // 인터벌 정리
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
            onStart={handleSoftDrop}
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
          onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handleRotate(); }}
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
          onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handleHardDrop(); }}
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
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStart();
  }, [onStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEnd?.();
  }, [onEnd]);

  return (
    <motion.button
      className="w-14 h-14 rounded-2xl bg-slate-700/90 backdrop-blur
                 flex items-center justify-center text-white text-2xl font-bold
                 shadow-lg border-b-4 border-slate-600
                 active:border-b-0 active:translate-y-1 transition-all"
      whileTap={{ scale: 0.9 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {icon}
    </motion.button>
  );
}

export default TouchControls;
