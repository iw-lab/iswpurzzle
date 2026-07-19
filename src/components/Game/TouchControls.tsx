import React, { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useAudio } from '../../hooks/useAudio';

interface TouchControlsProps {
  visible?: boolean;
}

// 연타 방지 (ms) — 회전·하드드롭처럼 1회성 동작에만 적용한다.
const TAP_DEBOUNCE = 120;

// 누르고 있을 때의 반복 파라미터
const REPEAT_DELAY = 220; // 첫 반복까지 대기
const MOVE_REPEAT = 70; // 좌우 이동 반복 간격
const SOFT_DROP_REPEAT = 45; // 소프트드롭 반복 간격 (빠르게 내려가는 느낌)

export function TouchControls({ visible = true }: TouchControlsProps) {
  const { playSound } = useAudio();
  const lastActionTimeRef = useRef<Record<string, number>>({});
  const currentBlocks = useGameStore((state) => state.currentBlocks);

  const executeWithDebounce = useCallback(
    (actionKey: string, action: () => void) => {
      const now = Date.now();
      if (now - (lastActionTimeRef.current[actionKey] || 0) < TAP_DEBOUNCE) {
        return;
      }
      lastActionTimeRef.current[actionKey] = now;
      action();
    },
    [],
  );

  // 키보드 입력은 useControls(DAS/ARR)가 단일 계층으로 담당한다(#15).

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

  const moveOnce = useCallback(
    (dir: 'left' | 'right') => {
      playSound('blockMove');
      useGameStore.getState().moveBlock(dir);
    },
    [playSound],
  );

  const softDropOnce = useCallback(() => {
    useGameStore.getState().softDrop();
  }, []);

  if (!visible) return null;

  return (
    <div className="w-full px-3 pb-4 pt-2 select-none touch-none">
      <div className="flex justify-between items-center gap-3 max-w-md mx-auto">
        {/* 방향 버튼 그룹 */}
        <div className="flex gap-2">
          <HoldButton
            icon="◀"
            label="왼쪽으로 이동"
            onPress={() => moveOnce('left')}
            repeatInterval={MOVE_REPEAT}
          />
          <HoldButton
            icon="▼"
            label="빠르게 내리기"
            onPress={softDropOnce}
            repeatInterval={SOFT_DROP_REPEAT}
          />
          <HoldButton
            icon="▶"
            label="오른쪽으로 이동"
            onPress={() => moveOnce('right')}
            repeatInterval={MOVE_REPEAT}
          />
        </div>

        {/* 회전 */}
        <HoldButton
          icon="↻"
          caption="회전"
          label="블록 회전"
          onPress={handleRotate}
          className={`w-14 h-14 flex-col ${
            currentBlocks.length > 1
              ? 'bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-700'
              : 'bg-slate-700 border-slate-600 opacity-50'
          }`}
        />

        {/* 하드 드롭 */}
        <HoldButton
          icon="⚡"
          caption="DROP"
          label="즉시 떨어뜨리기"
          onPress={handleHardDrop}
          className="w-20 h-14 flex-row gap-1 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500
                     border-orange-700 shadow-orange-500/30"
        />
      </div>
    </div>
  );
}

/**
 * 누름-반복 버튼.
 *
 * ⚠️ 반드시 Pointer Event를 쓴다. 이전 구현은 onTouchStart만 바인딩해서
 * 데스크톱 마우스로는 모든 조작 버튼이 완전히 죽어 있었다 —
 * "블록이 안 내려간다"의 실제 원인이었다. Pointer Event는 마우스·터치·펜을
 * 한 경로로 처리하므로 이런 갈라짐이 다시 생기지 않는다.
 */
function HoldButton({
  icon,
  caption,
  label,
  onPress,
  repeatInterval,
  className = '',
}: {
  icon: string;
  caption?: string;
  label: string;
  onPress: () => void;
  repeatInterval?: number;
  className?: string;
}) {
  const delayRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const onPressRef = useRef(onPress);
  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  const stop = useCallback(() => {
    if (delayRef.current !== null) {
      clearTimeout(delayRef.current);
      delayRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      // 포인터를 캡처해 두면 버튼 밖으로 손가락이 벗어나도 up 이벤트를 받는다.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      stop();
      onPressRef.current();

      if (repeatInterval) {
        delayRef.current = window.setTimeout(() => {
          intervalRef.current = window.setInterval(
            () => onPressRef.current(),
            repeatInterval,
          );
        }, REPEAT_DELAY);
      }
    },
    [repeatInterval, stop],
  );

  // 언마운트(일시정지·게임오버 등)될 때 반복이 남지 않도록 정리
  useEffect(() => stop, [stop]);

  return (
    <motion.button
      type="button"
      aria-label={label}
      className={`rounded-2xl text-white font-bold shadow-lg border-b-4
                  flex items-center justify-center
                  active:border-b-0 active:translate-y-1 transition-all
                  ${className || 'w-14 h-14 bg-slate-700/90 backdrop-blur border-slate-600 text-2xl'}`}
      whileTap={{ scale: 0.92 }}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className={caption ? 'text-xl' : ''}>{icon}</span>
      {caption && (
        <span className={caption === 'DROP' ? 'text-sm' : 'text-[8px] opacity-80'}>
          {caption}
        </span>
      )}
    </motion.button>
  );
}

export default TouchControls;
