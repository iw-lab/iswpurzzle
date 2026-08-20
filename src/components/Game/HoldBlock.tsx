import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { Block } from './Block';

interface HoldBlockProps {
  cellSize?: number;
  /** 모바일에서 세로 공간을 아끼려면 가로로 눕힌다(NextBlockPreview와 동일한 이유). */
  orientation?: 'vertical' | 'horizontal';
}

export function HoldBlock({ cellSize = 24, orientation = 'vertical' }: HoldBlockProps) {
  const horizontal = orientation === 'horizontal';
  const { holdBlock, holdSpecialType, canHold, holdPiece } = useGameStore();

  return (
    <div
      className={`glass-panel rounded-xl flex items-center transition-colors duration-300 ${
        horizontal ? 'flex-row gap-2 px-2 py-1.5' : 'flex-col p-3 min-w-[60px]'
      } ${
        canHold ? 'border-white/20' : 'border-red-500/30 bg-red-900/10'
      }`}
    >
      <h3 className={`text-[10px] font-bold text-gray-400 tracking-widest text-center ${horizontal ? 'mb-0' : 'mb-2'}`}>HOLD</h3>
      <div className={`flex items-center justify-center relative ${horizontal ? '' : 'min-h-[40px]'}`}>
        {holdBlock ? (
          <motion.div
            key={holdBlock}
            initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: canHold ? 1 : 0.5 }}
            transition={{ type: 'spring' }}
            style={{ filter: canHold ? 'none' : 'grayscale(80%)' }}
          >
            <Block
              color={holdBlock}
              size={cellSize}
              specialType={holdSpecialType || 'normal'}
              label={holdPiece?.labels?.[0] ?? undefined}
            />
          </motion.div>
        ) : (
          <div
            className="border-2 border-dashed border-white/10 rounded-md"
            style={{ width: cellSize - 4, height: cellSize - 4 }}
          />
        )}
      </div>
      {!horizontal && (
        <div className="mt-2 text-[9px] text-gray-500 font-mono text-center bg-black/20 px-1.5 rounded">
          {canHold ? 'SHIFT' : 'LOCKED'}
        </div>
      )}
    </div>
  );
}

export default HoldBlock;
