import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { BlockColor } from '../../types';
import { BLOCK_COLOR_MAP, COLORBLIND_COLOR_MAP, COLORBLIND_PATTERNS } from '../../constants';
import { useUserStore } from '../../stores';

interface BlockProps {
  color: BlockColor;
  size: number;
  isGhost?: boolean;
  isFusing?: boolean;
  isMatched?: boolean;
  x?: number;
  y?: number;
}

export const Block = memo(function Block({
  color,
  size,
  isGhost = false,
  isFusing = false,
  isMatched = false,
}: BlockProps) {
  const { settings } = useUserStore();

  const colorMap = settings.colorBlindMode ? COLORBLIND_COLOR_MAP : BLOCK_COLOR_MAP;
  const blockColor = colorMap[color];
  const pattern = settings.colorBlindMode ? COLORBLIND_PATTERNS[color] : null;

  // 무지개 블록 특수 처리
  const isRainbow = color === 'rainbow';

  return (
    <motion.div
      className="absolute rounded-sm"
      style={{
        width: size - 2,
        height: size - 2,
        background: isRainbow
          ? 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)'
          : blockColor,
        opacity: isGhost ? 0.3 : isFusing ? 0.7 : 1,
        boxShadow: isFusing
          ? `0 0 20px ${blockColor}, 0 0 40px ${blockColor}`
          : isMatched
          ? `0 0 10px ${blockColor}`
          : `inset 2px 2px 4px rgba(255,255,255,0.3), inset -2px -2px 4px rgba(0,0,0,0.3)`,
        border: isGhost ? `2px dashed ${blockColor}` : 'none',
      }}
      initial={false}
      animate={{
        scale: isFusing ? [1, 1.2, 0] : isMatched ? [1, 1.1, 1] : 1,
        rotate: isRainbow ? [0, 360] : 0,
      }}
      transition={{
        scale: { duration: isFusing ? 0.3 : 0.2 },
        rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
      }}
    >
      {/* 색맹 모드 패턴 */}
      {pattern && (
        <div
          className="absolute inset-1 opacity-50"
          style={{
            background: getPatternBackground(pattern),
          }}
        />
      )}

      {/* 하이라이트 */}
      <div
        className="absolute top-0 left-0 w-1/2 h-1/2 rounded-tl-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)',
        }}
      />
    </motion.div>
  );
});

// 색맹 모드 패턴 배경
function getPatternBackground(pattern: string): string {
  switch (pattern) {
    case 'striped':
      return 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)';
    case 'dotted':
      return 'radial-gradient(circle, rgba(255,255,255,0.5) 2px, transparent 2px)';
    case 'crosshatch':
      return 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 4px), repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 4px)';
    case 'diagonal':
      return 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 5px)';
    case 'grid':
      return 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 5px)';
    case 'waves':
      return 'repeating-linear-gradient(45deg, transparent 0px, transparent 5px, rgba(255,255,255,0.3) 5px, rgba(255,255,255,0.3) 10px)';
    case 'circles':
      return 'radial-gradient(circle at 50% 50%, transparent 3px, rgba(255,255,255,0.3) 3px, rgba(255,255,255,0.3) 5px, transparent 5px)';
    default:
      return 'none';
  }
}

export default Block;
