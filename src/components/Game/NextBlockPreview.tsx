import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { Block } from './Block';
import { NEXT_PREVIEW_COUNT } from '../../constants';

interface NextBlockPreviewProps {
  cellSize?: number;
  maxBlocks?: number;
  /**
   * 모바일은 가로로 눕힌다.
   * 세로 배치는 헤더+패딩+간격까지 합쳐 200px 가까이 먹어서, 360×640 같은
   * 작은 화면에서 16행 보드가 들어갈 자리를 빼앗았다(실측: 보드 아랫줄이
   * 컨트롤 버튼에 14px 가려짐). 가로로 눕히면 같은 정보가 60px면 된다.
   */
  orientation?: 'vertical' | 'horizontal';
}

export function NextBlockPreview({
  cellSize = 28,
  maxBlocks = NEXT_PREVIEW_COUNT,
  orientation = 'vertical',
}: NextBlockPreviewProps) {
  const horizontal = orientation === 'horizontal';
  const { nextBlocks, nextSpecialTypes, nextLabels } = useGameStore();
  const displayBlocks = nextBlocks.slice(0, maxBlocks);
  const displaySpecialTypes = nextSpecialTypes?.slice(0, maxBlocks) || [];
  const displayLabels = nextLabels?.slice(0, maxBlocks) || [];

  return (
    <div
      className={`glass-panel rounded-xl flex items-center ${
        horizontal ? 'flex-row gap-2 px-2 py-1.5' : 'flex-col p-4 min-w-[80px]'
      }`}
    >
      <h3
        className={`text-[10px] font-bold text-gray-400 tracking-widest text-center ${
          horizontal ? 'mb-0 mr-1' : 'mb-4'
        }`}
      >
        NEXT
      </h3>
      <div className={`flex items-center ${horizontal ? 'flex-row gap-1.5' : 'flex-col gap-4'}`}>
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
                width: cellSize + (horizontal ? 4 : 8),
                height: cellSize + (horizontal ? 4 : 8),
                opacity: index === 0 ? 1 : 0.5,
                filter: index === 0 ? 'none' : 'grayscale(30%)',
              }}
            >
              <Block
                color={color}
                size={blockSize}
                specialType={displaySpecialTypes[index] || 'normal'}
                label={displayLabels[index] ?? undefined}
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
