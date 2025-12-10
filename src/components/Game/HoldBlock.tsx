import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { Block } from './Block';

interface HoldBlockProps {
  cellSize?: number;
}

export function HoldBlock({ cellSize = 24 }: HoldBlockProps) {
  const { holdBlock, holdSpecialType, canHold } = useGameStore();

  return (
    <div
      className={`glass-panel rounded-xl p-3 flex flex-col items-center min-w-[60px] transition-colors duration-300 ${
        canHold ? 'border-white/20' : 'border-red-500/30 bg-red-900/10'
      }`}
    >
      <h3 className="text-[10px] font-bold text-gray-400 mb-2 tracking-widest text-center">HOLD</h3>
      <div className="flex items-center justify-center min-h-[40px] relative">
        {holdBlock ? (
          <motion.div
            key={holdBlock}
            initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: canHold ? 1 : 0.5 }}
            transition={{ type: 'spring' }}
            style={{ filter: canHold ? 'none' : 'grayscale(80%)' }}
          >
            <Block color={holdBlock} size={cellSize} specialType={holdSpecialType || 'normal'} />
          </motion.div>
        ) : (
          <div
            className="border-2 border-dashed border-white/10 rounded-md"
            style={{ width: cellSize - 4, height: cellSize - 4 }}
          />
        )}
      </div>
      <div className="mt-2 text-[9px] text-gray-500 font-mono text-center bg-black/20 px-1.5 rounded">
        {canHold ? 'SHIFT' : 'LOCKED'}
      </div>
    </div>
  );
}

export default HoldBlock;
