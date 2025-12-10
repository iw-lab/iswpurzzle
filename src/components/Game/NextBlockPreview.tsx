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
  cellSize = 24,
  maxBlocks = NEXT_PREVIEW_COUNT,
}: NextBlockPreviewProps) {
  const { nextBlocks, nextSpecialTypes } = useGameStore();
  const displayBlocks = nextBlocks.slice(0, maxBlocks);
  const displaySpecialTypes = nextSpecialTypes?.slice(0, maxBlocks) || [];

  return (
    <div className="glass-panel rounded-xl p-3 flex flex-col items-center min-w-[60px]">
      <h3 className="text-[10px] font-bold text-gray-400 mb-3 tracking-widest text-center">NEXT</h3>
      <div className="flex flex-col gap-3 items-center">
        {displayBlocks.map((color, index) => (
          <motion.div
            key={`next-${index}`}
            className="relative"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            style={{
              transform: `scale(${index === 0 ? 1 : 0.8})`,
              opacity: index === 0 ? 1 : 0.6,
              filter: index === 0 ? 'none' : 'grayscale(30%)',
            }}
          >
            <Block
              color={color}
              size={cellSize}
              specialType={displaySpecialTypes[index] || 'normal'}
            />
            {index === 0 && (
              <div className="absolute -inset-2 rounded-full border border-white/20 animate-pulse pointer-events-none" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default NextBlockPreview;
