import { useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useUserStore } from '../stores/userStore';
import { TOUCH_CONFIG, HAPTIC_PATTERNS } from '../constants';
import { HapticPattern } from '../types';

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  lastTapTime: number;
  isDragging: boolean;
}

export function useTouchGestures(containerRef: React.RefObject<HTMLElement | null>) {
  const {
    gameStatus,
    moveBlock,
    softDrop,
    hardDrop,
    doHoldBlock,
    pauseGame,
    isPowerUpSelecting,
    setGravityDirection,
  } = useGameStore();

  const { settings } = useUserStore();

  const touchStateRef = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0,
    isDragging: false,
  });

  const longPressTimeoutRef = useRef<number | null>(null);

  // 진동 피드백
  const triggerHaptic = useCallback(
    (pattern: HapticPattern) => {
      if (!settings.hapticEnabled || !navigator.vibrate) return;
      navigator.vibrate(HAPTIC_PATTERNS[pattern]);
    },
    [settings.hapticEnabled]
  );

  // 터치 시작
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (gameStatus !== 'playing') return;

      const touch = e.touches[0];
      const now = Date.now();

      touchStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: now,
        lastTapTime: touchStateRef.current.lastTapTime,
        isDragging: false,
      };

      // 롱 프레스 타이머 설정
      longPressTimeoutRef.current = window.setTimeout(() => {
        triggerHaptic('medium');
        doHoldBlock();
        touchStateRef.current.isDragging = true;
      }, TOUCH_CONFIG.LONG_PRESS_DURATION);
    },
    [gameStatus, doHoldBlock, triggerHaptic]
  );

  // 터치 이동
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (gameStatus !== 'playing') return;

      const touch = e.touches[0];
      const { startX, startY, isDragging } = touchStateRef.current;

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // 움직임이 감지되면 롱 프레스 취소
      if (absX > 10 || absY > 10) {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
        }
      }

      // 스와이프 감지
      if (absX >= TOUCH_CONFIG.SWIPE_THRESHOLD || absY >= TOUCH_CONFIG.SWIPE_THRESHOLD) {
        touchStateRef.current.isDragging = true;

        // 파워업 선택 모드
        if (isPowerUpSelecting) {
          if (absX > absY) {
            setGravityDirection(deltaX > 0 ? 'right' : 'left');
          } else {
            setGravityDirection(deltaY > 0 ? 'down' : 'up');
          }
          touchStateRef.current.startX = touch.clientX;
          touchStateRef.current.startY = touch.clientY;
          return;
        }

        // 수평 스와이프 (이동)
        if (absX > absY && absX >= TOUCH_CONFIG.SWIPE_THRESHOLD) {
          if (deltaX > 0) {
            moveBlock('right');
          } else {
            moveBlock('left');
          }
          triggerHaptic('light');
          touchStateRef.current.startX = touch.clientX;
        }

        // 수직 스와이프 (드롭)
        if (absY > absX && absY >= TOUCH_CONFIG.SWIPE_THRESHOLD) {
          if (deltaY > 0) {
            softDrop();
            triggerHaptic('light');
          }
          touchStateRef.current.startY = touch.clientY;
        }
      }
    },
    [gameStatus, isPowerUpSelecting, moveBlock, softDrop, setGravityDirection, triggerHaptic]
  );

  // 터치 종료
  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (gameStatus !== 'playing') return;

      // 롱 프레스 타이머 정리
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      const { startX, startY, startTime, lastTapTime, isDragging } = touchStateRef.current;
      const now = Date.now();
      const duration = now - startTime;

      // 드래그가 아니었다면 탭 처리
      if (!isDragging && duration < TOUCH_CONFIG.LONG_PRESS_DURATION) {
        const touch = e.changedTouches[0];
        const deltaX = Math.abs(touch.clientX - startX);
        const deltaY = Math.abs(touch.clientY - startY);

        if (deltaX < 10 && deltaY < 10) {
          // 더블 탭 체크
          if (now - lastTapTime < TOUCH_CONFIG.DOUBLE_TAP_DELAY) {
            // 더블 탭: 하드 드롭
            triggerHaptic('medium');
            hardDrop();
          } else {
            // 싱글 탭: 아무것도 안함 (또는 회전 등)
            triggerHaptic('selection');
          }
          touchStateRef.current.lastTapTime = now;
        }
      }

      // 빠른 아래 스와이프: 하드 드롭
      if (isDragging) {
        const touch = e.changedTouches[0];
        const deltaY = touch.clientY - startY;
        const velocity = deltaY / duration * 1000;

        if (deltaY > 0 && velocity > TOUCH_CONFIG.FAST_SWIPE_VELOCITY) {
          triggerHaptic('heavy');
          hardDrop();
        }
      }

      touchStateRef.current.isDragging = false;
    },
    [gameStatus, hardDrop, triggerHaptic]
  );

  // 터치 이벤트 등록
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);

      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { triggerHaptic };
}
