import React, { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { BlockColor, SpecialBlockType } from "../../types";
import {
  BLOCK_COLOR_MAP,
  COLORBLIND_COLOR_MAP,
  COLORBLIND_PATTERNS,
  SPECIAL_BLOCK_CONFIG,
} from "../../constants";
import { SKIN_STYLES, SkinStyle } from "../../constants/shopItems";
import { useUserStore } from "../../stores";

interface BlockProps {
  color: BlockColor;
  size: number;
  isGhost?: boolean;
  isFusing?: boolean;
  isMatched?: boolean;
  specialType?: SpecialBlockType;
  frozenCount?: number;
  x?: number;
  y?: number;
  /** 수학 모드 표기(1/2 · 0.5 · 50%). 있으면 블록 위에 크게 그린다. */
  label?: string;
}

export const Block = memo(function Block({
  color,
  size,
  isGhost = false,
  isFusing = false,
  isMatched = false,
  specialType = "normal",
  frozenCount = 0,
  label,
}: BlockProps) {
  const { settings, equippedSkinId } = useUserStore();

  // 현재 스킨 스타일 가져오기
  const skinStyle: SkinStyle = useMemo(() => {
    return SKIN_STYLES[equippedSkinId] || SKIN_STYLES.classic;
  }, [equippedSkinId]);

  // 항상 BLOCK_COLOR_MAP 사용 - 8개 색상이 모두 시각적으로 구분되어야 함
  // 스킨은 효과(테두리, 광택, 애니메이션)만 적용, 색상은 고유값 유지
  const colorMap = settings.colorBlindMode
    ? COLORBLIND_COLOR_MAP
    : BLOCK_COLOR_MAP;
  const blockColor = colorMap[color];
  const pattern = settings.colorBlindMode ? COLORBLIND_PATTERNS[color] : null;
  const isRainbow = color === "rainbow";
  const isSpecial = specialType !== "normal";
  const specialConfig = SPECIAL_BLOCK_CONFIG[specialType];
  const isFrozen = specialType === "frozen";
  const isStone = specialType === "stone";

  // 고스트 블록 스타일링
  if (isGhost) {
    return (
      <div
        className="absolute rounded-md box-border transition-all duration-75"
        style={{
          width: size - 2,
          height: size - 2,
          borderColor: blockColor,
          borderWidth: "2px",
          borderStyle: "dashed",
          backgroundColor: `${blockColor}15`,
          boxShadow: `0 0 10px ${blockColor}40`,
        }}
      />
    );
  }

  // 돌 블록 스타일
  if (isStone) {
    return (
      <motion.div
        className="absolute rounded-md overflow-hidden"
        style={{
          width: size - 2,
          height: size - 2,
          background: "linear-gradient(145deg, #6c757d, #495057)",
          border: "2px solid #343a40",
        }}
        initial={false}
        animate={{
          scale: isFusing ? [1, 1.1, 0] : 1,
        }}
        transition={{ scale: { duration: 0.3 } }}
      >
        {/* 돌 텍스처 */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "repeating-linear-gradient(45deg, transparent 0px, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)",
          }}
        />
        {/* 아이콘 */}
        <div className="absolute inset-0 flex items-center justify-center text-lg">
          🪨
        </div>
      </motion.div>
    );
  }

  // 스킨별 배경 스타일 계산
  const getBackgroundStyle = () => {
    if (isRainbow)
      return "linear-gradient(135deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff)";
    if (isFrozen)
      return `linear-gradient(145deg, ${blockColor}90, ${blockColor}60)`;

    switch (skinStyle.innerEffect) {
      case "glow":
        return `radial-gradient(circle at 30% 30%, ${blockColor}dd, ${blockColor}88 70%, ${blockColor}44)`;
      case "glass":
        return `linear-gradient(145deg, ${blockColor}ee, ${blockColor}aa 50%, ${blockColor}cc)`;
      case "gradient":
        return `linear-gradient(135deg, ${blockColor}, ${blockColor}88, ${blockColor}cc)`;
      case "flat":
        return blockColor;
      case "metallic":
        return `linear-gradient(145deg, ${blockColor}ff, ${blockColor}66 30%, ${blockColor}cc 70%, ${blockColor}ff)`;
      case "matte":
        return `linear-gradient(180deg, ${blockColor}ee, ${blockColor}bb)`;
      default:
        return blockColor;
    }
  };

  // 스킨별 글로우 효과
  const getGlowStyle = () => {
    if (skinStyle.glowIntensity <= 0) return "none";
    const intensity = Math.round(skinStyle.glowIntensity * 20);
    return `0 0 ${intensity}px ${blockColor}, 0 0 ${intensity * 2}px ${blockColor}66`;
  };

  // 스킨별 텍스처 패턴
  const getTexturePattern = () => {
    switch (skinStyle.texture) {
      case "lines":
        return "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)";
      case "dots":
        return "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.3) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 1px, transparent 1px)";
      case "circuit":
        return "linear-gradient(90deg, transparent 48%, rgba(255,255,255,0.3) 50%, transparent 52%), linear-gradient(0deg, transparent 48%, rgba(255,255,255,0.3) 50%, transparent 52%)";
      case "cracks":
        return "linear-gradient(30deg, transparent 40%, rgba(255,255,255,0.2) 41%, transparent 42%), linear-gradient(-30deg, transparent 60%, rgba(255,255,255,0.15) 61%, transparent 62%)";
      case "noise":
        return "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")";
      default:
        return "none";
    }
  };

  // 애니메이션 설정
  const getAnimationProps = () => {
    const baseAnimation = {
      scale: isFusing ? [1, 1.2, 0] : isMatched ? [1, 1.1, 1] : 1,
      filter: isFusing ? "brightness(1.5)" : "brightness(1)",
      rotate: isRainbow ? 360 : 0,
    };

    switch (skinStyle.animation) {
      case "pulse":
        return {
          ...baseAnimation,
          boxShadow: [
            `0 0 5px ${blockColor}`,
            `0 0 20px ${blockColor}`,
            `0 0 5px ${blockColor}`,
          ],
        };
      case "shimmer":
        return baseAnimation;
      case "fire":
        return { ...baseAnimation, y: [0, -2, 0, -1, 0] };
      case "ice":
        return { ...baseAnimation, opacity: [1, 0.9, 1] };
      case "electric":
        return { ...baseAnimation, x: [-1, 1, -1, 0] };
      default:
        return baseAnimation;
    }
  };

  const getAnimationTransition = (): Record<string, unknown> => {
    const base = {
      scale: { duration: isFusing ? 0.3 : 0.2 },
      rotate: { duration: 3, repeat: Infinity, ease: "linear" as const },
    };

    switch (skinStyle.animation) {
      case "pulse":
        return {
          ...base,
          boxShadow: {
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut" as const,
          },
        };
      case "fire":
        return {
          ...base,
          y: { duration: 0.3, repeat: Infinity, ease: "easeInOut" as const },
        };
      case "ice":
        return {
          ...base,
          opacity: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut" as const,
          },
        };
      case "electric":
        return { ...base, x: { duration: 0.1, repeat: Infinity } };
      default:
        return base;
    }
  };

  return (
    <motion.div
      className="absolute overflow-hidden block-3d"
      style={{
        width: size - 2,
        height: size - 2,
        borderRadius: skinStyle.borderRadius,
        background: getBackgroundStyle(),
        opacity: isFusing ? 0.8 : 1,
        zIndex: isFusing ? 10 : 1,
        border: isFrozen
          ? "2px solid #a5d8ff"
          : isSpecial
            ? `2px solid ${specialConfig?.color || blockColor}`
            : skinStyle.borderWidth > 0
              ? `${skinStyle.borderWidth}px ${skinStyle.borderStyle} ${blockColor}88`
              : "none",
        boxShadow:
          isSpecial && !isFrozen
            ? `0 0 8px ${specialConfig?.color || blockColor}60`
            : getGlowStyle(),
      }}
      initial={false}
      animate={getAnimationProps()}
      transition={getAnimationTransition()}
    >
      {/* 내부 광택 효과 - 스킨별로 다름 */}
      {skinStyle.innerEffect === "glossy" && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/10 pointer-events-none" />
      )}
      {skinStyle.innerEffect === "glass" && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/10 to-transparent pointer-events-none" />
      )}
      {skinStyle.innerEffect === "metallic" && (
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-black/30 pointer-events-none" />
      )}

      {/* 테두리 하이라이트 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: skinStyle.borderRadius,
          border:
            skinStyle.innerEffect === "flat"
              ? "none"
              : "1px solid rgba(255,255,255,0.2)",
        }}
      />

      {/* 텍스처 오버레이 */}
      {skinStyle.texture !== "none" && (
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: getTexturePattern(),
            backgroundSize:
              skinStyle.texture === "dots" ? "8px 8px" : "100% 100%",
            borderRadius: skinStyle.borderRadius,
          }}
        />
      )}

      {/* 애니메이션 스킨 특수 효과 */}
      {skinStyle.animation === "shimmer" && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.4) 50%, transparent 80%)",
            borderRadius: skinStyle.borderRadius,
          }}
          animate={{ x: ["-100%", "200%"] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 1,
          }}
        />
      )}

      {skinStyle.animation === "fire" && (
        <motion.div
          className="absolute -inset-1 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at bottom, ${blockColor}88 0%, transparent 70%)`,
            filter: "blur(2px)",
            borderRadius: skinStyle.borderRadius,
          }}
          animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}

      {skinStyle.animation === "ice" && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(200,230,255,0.2) 100%)",
            borderRadius: skinStyle.borderRadius,
          }}
        />
      )}

      {skinStyle.animation === "electric" && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ borderRadius: skinStyle.borderRadius }}
          animate={{
            boxShadow: [
              `inset 0 0 5px ${blockColor}`,
              `inset 0 0 15px ${blockColor}, 0 0 10px ${blockColor}`,
              `inset 0 0 5px ${blockColor}`,
            ],
          }}
          transition={{ duration: 0.2, repeat: Infinity }}
        />
      )}

      {/* 얼음 블록 오버레이 */}
      {isFrozen && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-200/50 to-blue-300/30" />
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)",
              backgroundSize: "200% 200%",
            }}
            animate={{
              backgroundPosition: ["0% 0%", "200% 200%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          {/* 얼음 히트 카운트 표시 */}
          {frozenCount > 0 && (
            <div className="absolute bottom-0 right-0 bg-cyan-600 text-white text-xs font-bold px-1 rounded-tl">
              {frozenCount}
            </div>
          )}
        </>
      )}

      {/* 수학 모드 표기 — 블록 크기에 비례해 글자 크기를 잡는다.
          어두운 배경/밝은 배경 어디서든 읽히도록 흰 글자 + 검은 외곽선을 쓴다. */}
      {label && !isSpecial && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{
            fontSize: Math.max(9, Math.round(size * (label.length > 3 ? 0.3 : 0.38))),
            fontWeight: 900,
            lineHeight: 1,
            color: "#ffffff",
            textShadow:
              "0 1px 0 rgba(0,0,0,0.85), 0 -1px 0 rgba(0,0,0,0.85), 1px 0 0 rgba(0,0,0,0.85), -1px 0 0 rgba(0,0,0,0.85)",
            letterSpacing: "-0.02em",
          }}
        >
          {label}
        </div>
      )}

      {/* 특수 블록 아이콘 */}
      {isSpecial && !isFrozen && specialConfig?.icon && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center text-base drop-shadow-lg"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {specialConfig.icon}
        </motion.div>
      )}

      {/* 융합 중일 때 글로우 효과 */}
      {isFusing && (
        <motion.div
          className="absolute inset-0 rounded-md"
          style={{ boxShadow: `0 0 20px 5px ${blockColor}` }}
        />
      )}

      {/* 색맹 모드 패턴 */}
      {pattern && (
        <div
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{ background: getPatternBackground(pattern) }}
        />
      )}

      {/* 특수 블록 글로우 애니메이션 */}
      {isSpecial && !isFrozen && (
        <motion.div
          className="absolute inset-0 rounded-md pointer-events-none"
          animate={{
            boxShadow: [
              `0 0 5px ${specialConfig?.color || blockColor}40`,
              `0 0 15px ${specialConfig?.color || blockColor}60`,
              `0 0 5px ${specialConfig?.color || blockColor}40`,
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.div>
  );
});

function getPatternBackground(pattern: string): string {
  switch (pattern) {
    case "striped":
      return "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.3) 5px, rgba(0,0,0,0.3) 10px)";
    case "dotted":
      return "radial-gradient(circle, rgba(0,0,0,0.3) 2px, transparent 2.5px) 0 0 / 8px 8px";
    case "crosshatch":
      return "repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.2) 4px, rgba(0,0,0,0.2) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.2) 4px, rgba(0,0,0,0.2) 5px)";
    case "diagonal":
      return "repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 5px)";
    case "grid":
      return "repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 5px)";
    case "waves":
      return "repeating-linear-gradient(45deg, transparent 0px, transparent 5px, rgba(255,255,255,0.3) 5px, rgba(255,255,255,0.3) 10px)";
    case "circles":
      return "radial-gradient(circle at 50% 50%, transparent 3px, rgba(255,255,255,0.3) 3px, rgba(255,255,255,0.3) 5px, transparent 5px)";
    default:
      return "none";
  }
}

export default Block;
