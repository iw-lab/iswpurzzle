import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { Block } from './Block';
import { NEXT_PREVIEW_COUNT } from '../../constants';

interface NextBlockPreviewProps {
  cellSize?: number;
  maxBlocks?: number;
}

export function NextBlockPreview({
  cellSize = 28,
  maxBlocks = NEXT_PREVIEW_COUNT,
}: NextBlockPreviewProps) {
  const { nextBlocks, nextSpecialTypes } = useGameStore();
  const displayBlocks = nextBlocks.slice(0, maxBlocks);
  const displaySpecialTypes = nextSpecialTypes?.slice(0, maxBlocks) || [];

  return (
    <div className="glass-panel rounded-xl p-4 flex flex-col items-center min-w-[80px]">
      <h3 className="text-[10px] font-bold text-gray-400 mb-4 tracking-widest text-center">NEXT</h3>
      <div className="flex flex-col gap-4 items-center">
        {displayBlocks.map((color, index) => {
          const blockSize = index === 0 ? cellSize : Math.floor(cellSize * 0.75);
          return (
            <motion.div
              key={`next-${index}`}
              className="relative flex items-center justify-center"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              style={{
                width: cellSize + 8,
                height: cellSize + 8,
                opacity: index === 0 ? 1 : 0.5,
                filter: index === 0 ? 'none' : 'grayscale(30%)',
              }}
            >
              <Block
                color={color}
                size={blockSize}
                specialType={displaySpecialTypes[index] || 'normal'}
              />
              {index === 0 && (
                <div className="absolute -inset-1 rounded-lg border-2 border-white/30 animate-pulse pointer-events-none" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default NextBlockPreview;
