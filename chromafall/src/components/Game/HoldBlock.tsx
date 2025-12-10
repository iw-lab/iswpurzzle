import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { Block } from './Block';

interface HoldBlockProps {
  cellSize?: number;
}

export function HoldBlock({ cellSize = 30 }: HoldBlockProps) {
  const { holdBlock, canHold } = useGameStore();

  return (
    <div
      className={`bg-game-panel/80 rounded-lg p-3 backdrop-blur-sm transition-opacity ${
        canHold ? 'opacity-100' : 'opacity-50'
      }`}
    >
      <h3 className="text-xs text-gray-400 mb-2 text-center font-medium">HOLD</h3>
      <div className="flex items-center justify-center min-h-[40px]">
        {holdBlock ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Block color={holdBlock} size={cellSize} />
          </motion.div>
        ) : (
          <div
            className="border-2 border-dashed border-gray-600 rounded"
            style={{ width: cellSize - 2, height: cellSize - 2 }}
          />
        )}
      </div>
      <p className="text-[10px] text-gray-500 text-center mt-1">
        {canHold ? 'Shift/C' : '사용됨'}
      </p>
    </div>
  );
}

export default HoldBlock;
