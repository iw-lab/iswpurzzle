import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';

export function useControls() {
  const pressedKeys = useRef<Set<string>>(new Set());
  const repeatTimerRef = useRef<number | null>(null);
  const repeatDirectionRef = useRef<'left' | 'right' | null>(null);
  const dasTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearAllTimers = () => {
      if (repeatTimerRef.current) {
        clearInterval(repeatTimerRef.current);
        repeatTimerRef.current = null;
      }
      if (dasTimerRef.current) {
        clearTimeout(dasTimerRef.current);
        dasTimerRef.current = null;
      }
      repeatDirectionRef.current = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;

      // 이미 눌린 키는 무시 (키 반복 방지)
      if (pressedKeys.current.has(code)) {
        e.preventDefault();
        return;
      }

      pressedKeys.current.add(code);

      const state = useGameStore.getState();

      // ESC/P: 일시정지
      if (code === 'Escape' || code === 'KeyP') {
        if (state.gameStatus === 'playing') {
          state.pauseGame();
        } else if (state.gameStatus === 'paused') {
          state.resumeGame();
        }
        return;
      }

      // 게임 중이 아니면 무시
      if (state.gameStatus !== 'playing') return;

      // 파워업 선택 모드
      if (state.isPowerUpSelecting) {
        if (code === 'ArrowUp') state.setGravityDirection('up');
        else if (code === 'ArrowDown') state.setGravityDirection('down');
        else if (code === 'ArrowLeft') state.setGravityDirection('left');
        else if (code === 'ArrowRight') state.setGravityDirection('right');
        return;
      }

      // 좌우 이동
      if (code === 'ArrowLeft' || code === 'KeyA') {
        e.preventDefault();
        clearAllTimers();
        state.moveBlock('left');
        repeatDirectionRef.current = 'left';

        // DAS: 250ms 후 연속 이동 시작
        dasTimerRef.current = window.setTimeout(() => {
          if (repeatDirectionRef.current === 'left') {
            repeatTimerRef.current = window.setInterval(() => {
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
        repeatDirectionRef.current = 'right';

        dasTimerRef.current = window.setTimeout(() => {
          if (repeatDirectionRef.current === 'right') {
            repeatTimerRef.current = window.setInterval(() => {
              useGameStore.getState().moveBlock('right');
            }, 50);
          }
        }, 250);
        return;
      }

      // 소프트 드롭
      if (code === 'ArrowDown' || code === 'KeyS') {
        e.preventDefault();
        state.softDrop();
        return;
      }

      // 블록 회전 (↑ 또는 W 키)
      if (code === 'ArrowUp' || code === 'KeyW') {
        e.preventDefault();
        state.rotateBlock();
        return;
      }

      // 하드 드롭 (Space 키)
      if (code === 'Space') {
        e.preventDefault();
        state.hardDrop();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      pressedKeys.current.delete(code);

      // 좌우 키를 떼면 연속 이동 중지
      if (code === 'ArrowLeft' || code === 'KeyA') {
        if (repeatDirectionRef.current === 'left') {
          clearAllTimers();
        }
      }
      if (code === 'ArrowRight' || code === 'KeyD') {
        if (repeatDirectionRef.current === 'right') {
          clearAllTimers();
        }
      }
    };

    // 창 포커스 잃으면 모든 키 상태 초기화
    const handleBlur = () => {
      pressedKeys.current.clear();
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

  // 터치/버튼용 액션 (단순 호출용)
  return {
    moveLeft: () => {
      const state = useGameStore.getState();
      if (state.gameStatus === 'playing') state.moveBlock('left');
    },
    moveRight: () => {
      const state = useGameStore.getState();
      if (state.gameStatus === 'playing') state.moveBlock('right');
    },
    softDrop: () => {
      const state = useGameStore.getState();
      if (state.gameStatus === 'playing') state.softDrop();
    },
    hardDrop: () => {
      const state = useGameStore.getState();
      if (state.gameStatus === 'playing') state.hardDrop();
    },
    pause: () => {
      const state = useGameStore.getState();
      if (state.gameStatus === 'playing') state.pauseGame();
      else if (state.gameStatus === 'paused') state.resumeGame();
    },
    rotate: () => {
      const state = useGameStore.getState();
      if (state.gameStatus === 'playing') state.rotateBlock();
    },
  };
}
