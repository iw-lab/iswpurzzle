import React, { useRef, useMemo, useEffect, useState } from 'react';
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

  // selector 구독 — 필드별로 나눠 구독해 무관한 set()에 리렌더되지 않게 한다(#22).
  const board = useGameStore((s) => s.board);
  const currentBlock = useGameStore((s) => s.currentBlock);
  const currentBlocks = useGameStore((s) => s.currentBlocks);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const level = useGameStore((s) => s.level);
  const gravityDirection = useGameStore((s) => s.gravityDirection);
  const isPowerUpSelecting = useGameStore((s) => s.isPowerUpSelecting);
  const garbagePending = useGameStore((s) => s.garbagePending);
  const dangerLevel = useGameStore((s) => s.dangerLevel);

  const { settings } = useUserStore();
  const { fusionEffects, chainEffects, specialEffects, mathFeedback, getGhostPosition } = useGameLogic();

  // 셀 크기 동적 계산 (모바일 대응 강화)
  const cellSize = useMemo(() => {
    if (propCellSize) return propCellSize;
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      const maxWidth = Math.min(window.innerWidth - 32, 450);
      const maxHeight = window.innerHeight - 200;
      const widthBasedSize = Math.floor(maxWidth / BOARD_CONFIG.COLUMNS);
      const heightBasedSize = Math.floor(maxHeight / BOARD_CONFIG.ROWS);

      return Math.min(widthBasedSize, heightBasedSize, isMobile ? 38 : 45);
    }
    return 40;
  }, [propCellSize]);

  const boardWidth = cellSize * BOARD_CONFIG.COLUMNS;
  const boardHeight = cellSize * BOARD_CONFIG.ROWS;
  const ghostPosition = useMemo(() => (settings.showGhostBlock && currentBlock ? getGhostPosition() : null), [currentBlock, settings.showGhostBlock, getGhostPosition]);

  // 게임 상태에 따른 오디오 제어
  useEffect(() => {
    if (gameStatus === 'playing') startBGM(level);
    else stopBGM();
  }, [gameStatus, level, startBGM, stopBGM]);

  // 효과음 트리거
  useEffect(() => {
    if (fusionEffects.length > 0) {
      playSound('fusion');
      triggerHaptic('medium');
    }
  }, [fusionEffects, playSound, triggerHaptic]);

  // 연쇄마다 음정을 반음계로 올린다 — 연쇄 중독성의 검증된 공식(§3.1-1)
  useEffect(() => {
    if (chainEffects > 1) {
      playSound('chain', { pitch: Math.min(2, 1 + (chainEffects - 1) * 0.06) });
      triggerHaptic('heavy');
    }
  }, [chainEffects, playSound, triggerHaptic]);

  // 착지 타격감 — 조각이 놓이는 순간 보드를 짧게 흔든다(§3.1-2)
  const prevFallingRef = useRef(0);
  const [shake, setShake] = useState(false);
  useEffect(() => {
    const had = prevFallingRef.current;
    prevFallingRef.current = currentBlocks.length;
    if (had > 0 && currentBlocks.length === 0) {
      const on = requestAnimationFrame(() => setShake(true));
      const off = window.setTimeout(() => setShake(false), 90);
      return () => {
        cancelAnimationFrame(on);
        clearTimeout(off);
      };
    }
  }, [currentBlocks.length]);

  return (
    <div className="relative p-1 rounded-xl bg-gradient-to-b from-gray-800 to-gray-900 shadow-2xl border border-white/10">
      {/* 게임 보드 컨테이너 */}
      <motion.div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg bg-[#0a0a15] select-none touch-none"
        style={{ width: boardWidth, height: boardHeight }}
        animate={shake ? { x: [0, -3, 3, -2, 0], y: [0, 2, -2, 1, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 0.09 }}
      >
        {/* 그리드 배경 (더 세련된 라인) */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
                <path d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* 위험 구역 표시 (그라데이션으로 부드럽게) */}
        {gravityDirection === 'down' && (
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none transition-opacity duration-500"
            style={{
              height: cellSize * 3,
              background: `linear-gradient(to bottom, rgba(255, 50, 50, ${0.1 + dangerLevel * 0.12}) 0%, transparent 100%)`,
              borderBottom: '1px dashed rgba(255, 50, 50, 0.3)',
              opacity: dangerLevel > 0 ? 1 : 0.5,
            }}
          />
        )}

        {/* 고스트 — 조각 전체 모양을 실제 착지 위치에 그린다.
            첫 블록 1칸만 표시하면 예측과 착지가 어긋난다(#14). */}
        {ghostPosition && ghostPosition.distance > 0 &&
          ghostPosition.cells.map((cell, i) => (
            <div
              key={`ghost-${i}`}
              className="absolute pointer-events-none transition-all duration-75"
              style={{
                left: cell.x * cellSize + 1,
                top: cell.y * cellSize + 1,
                zIndex: 0,
              }}
            >
              <Block
                color={currentBlocks[i]?.color ?? currentBlocks[0].color}
                size={cellSize}
                isGhost
              />
            </div>
          ))}

        {/* 배치된 블록들 */}
        <AnimatePresence>
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
                    zIndex: 10
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Block
                    color={block.color}
                    size={cellSize}
                    isFusing={isFusing}
                    specialType={block.specialType}
                    frozenCount={block.frozenCount}
                    label={block.label}
                  />
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        {/* 현재 조작 중인 블록들 (다중 블록 지원) */}
        <AnimatePresence>
          {currentBlocks.map((block, index) => (
            <motion.div
              key={block.id || `falling-${index}`}
              className="absolute pointer-events-none"
              style={{
                left: block.x * cellSize + 1,
                top: block.y * cellSize + 1,
                zIndex: 20
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.05 }}
            >
              <Block
                color={block.color}
                size={cellSize}
                specialType={block.specialType}
                label={block.label}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 수학 모드 동치 피드백 */}
        <AnimatePresence>
          {mathFeedback && (
            <motion.div
              key={mathFeedback}
              className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none z-30"
              initial={{ opacity: 0, y: -8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <span className="px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-sm border border-cyan-400/50 text-cyan-200 text-sm font-black tracking-wide">
                {mathFeedback}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 쓰레기 블록 경고 */}
        {garbagePending > 0 && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 flex justify-center items-center gap-1 py-1 bg-red-600/80 backdrop-blur-sm z-25"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <span className="text-white text-xs font-bold">⚠️ GARBAGE INCOMING: {garbagePending} ROW{garbagePending > 1 ? 'S' : ''}</span>
          </motion.div>
        )}

        {/* 이펙트 레이어 (최상단) */}
        <div className="absolute inset-0 pointer-events-none z-30">
          <AnimatePresence>
            {/* 융합 이펙트 */}
            {fusionEffects.map((effect, index) => (
              <motion.div
                key={`fusion-${index}`}
                className="absolute rounded-full blur-md"
                style={{
                  left: effect.x * cellSize,
                  top: effect.y * cellSize,
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: BLOCK_COLOR_MAP[effect.color as keyof typeof BLOCK_COLOR_MAP] || '#fff',
                }}
                initial={{ scale: 0.5, opacity: 0.8 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            ))}

            {/* 연쇄 텍스트 이펙트 */}
            {chainEffects > 1 && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1.2, opacity: 1, y: 0 }}
                exit={{ scale: 1.5, opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="text-center">
                  <h2 className="text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-500 drop-shadow-[0_0_15px_rgba(255,165,0,0.8)]"
                    style={{ fontFamily: 'var(--font-display)' }}>
                    {chainEffects} CHAIN!
                  </h2>
                  <p className="text-white font-bold text-lg drop-shadow-md">COMBO BOOSTER</p>
                </div>
              </motion.div>
            )}

            {/* 특수 블록 효과 이펙트 */}
            {specialEffects.map((effect, index) => (
              <motion.div
                key={`special-${index}`}
                className="absolute pointer-events-none"
                style={{
                  left: effect.x * cellSize,
                  top: effect.y * cellSize,
                  width: cellSize,
                  height: cellSize,
                }}
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* 폭탄 효과 */}
                {effect.type === 'bomb' && (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-500 to-red-600 blur-md" />
                )}
                {/* 번개 효과 */}
                {effect.type === 'lightning' && (
                  <div className="w-full h-full bg-yellow-400 blur-lg animate-pulse" />
                )}
                {/* 십자가 효과 */}
                {effect.type === 'cross' && (
                  <div className="w-full h-full">
                    <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 bg-green-400 blur-sm" />
                    <div className="absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 bg-green-400 blur-sm" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* UI 오버레이: 중력 선택 */}
        <AnimatePresence>
          {isPowerUpSelecting && (
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center">
                <p className="text-white font-bold text-xl mb-6 neon-text">중력 방향 선택</p>
                <div className="grid grid-cols-3 gap-3">
                  <div />
                  <button onClick={() => useGameStore.getState().setGravityDirection('up')}
                    className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-2xl border border-white/20 active:scale-95 transition-all">⬆️</button>
                  <div />
                  <button onClick={() => useGameStore.getState().setGravityDirection('left')}
                    className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-2xl border border-white/20 active:scale-95 transition-all">⬅️</button>
                  <button onClick={() => useGameStore.getState().setGravityDirection('down')}
                    className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-2xl border border-white/20 active:scale-95 transition-all">⬇️</button>
                  <button onClick={() => useGameStore.getState().setGravityDirection('right')}
                    className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-2xl border border-white/20 active:scale-95 transition-all">➡️</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* UI 오버레이: 일시정지 */}
        {gameStatus === 'paused' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-30 flex items-center justify-center">
            <h2 className="text-3xl font-bold text-white tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>PAUSED</h2>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default GameBoard;
