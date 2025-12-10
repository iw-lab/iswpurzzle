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
  cellSize = 30,
  maxBlocks = NEXT_PREVIEW_COUNT,
}: NextBlockPreviewProps) {
  const { nextBlocks } = useGameStore();

  const displayBlocks = nextBlocks.slice(0, maxBlocks);

  return (
    <div className="bg-game-panel/80 rounded-lg p-3 backdrop-blur-sm">
      <h3 className="text-xs text-gray-400 mb-2 text-center font-medium">NEXT</h3>
      <div className="flex flex-col gap-2 items-center">
        {displayBlocks.map((color, index) => (
          <motion.div
            key={`next-${index}`}
            className="relative"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            style={{
              opacity: 1 - index * 0.15,
              transform: `scale(${1 - index * 0.1})`,
            }}
          >
            <Block
              color={color}
              size={index === 0 ? cellSize : cellSize * 0.8}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default NextBlockPreview;
