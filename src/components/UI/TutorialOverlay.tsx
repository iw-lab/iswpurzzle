import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * 60초 온보딩 (계획서 §3.2-7).
 *
 * 신규 유저가 첫 판에서 "연쇄를 한 번이라도 터뜨리는 것"이 목표다.
 * 규칙 설명서가 아니라, 손이 먼저 기억하도록 4스텝만 짚는다.
 */

interface Step {
  icon: string;
  title: string;
  body: string;
  hint?: string;
}

const STEPS: Step[] = [
  {
    icon: "🟦🟦🟦🟦",
    title: "같은 색 4개를 붙이면 터진다",
    body: "가로·세로로 이어진 같은 색 블록이 4개 이상 모이면 사라집니다. 대각선은 이어지지 않아요.",
    hint: "딱 4개면 충분합니다 — 크게 모을 필요 없어요.",
  },
  {
    icon: "⛓️",
    title: "터진 자리로 무너지면 연쇄",
    body: "블록이 사라진 자리로 위쪽 블록이 떨어집니다. 그때 또 4개가 맞으면 연쇄! 점수가 폭발합니다.",
    hint: "연쇄가 이 게임의 전부입니다. 한 번 터뜨리는 것보다, 무너질 자리를 미리 만드는 게 핵심.",
  },
  {
    icon: "⬇️",
    title: "하드드롭으로 즉시 낙하",
    body: "반투명 그림자(고스트)가 착지 지점을 정확히 알려줍니다. 보이는 그 자리에 그대로 떨어집니다.",
    hint: "키보드 스페이스 / 화면 아래 ⬇⬇ 버튼",
  },
  {
    icon: "🔄",
    title: "홀드로 조각을 미뤄두기",
    body: "지금 필요 없는 조각은 보관해 두고 다음 조각을 받으세요. 보관한 조각은 다음에 꺼내 쓸 수 있습니다.",
    hint: "키보드 C 또는 Shift / 홀드 슬롯 탭",
  },
];

interface TutorialOverlayProps {
  onComplete: () => void;
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#1a1a2e] to-[#12121f] border border-white/10 p-6 shadow-2xl"
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
      >
        {/* 진행 표시 */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= index ? "bg-cyan-400" : "bg-white/15"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
          >
            <div className="text-4xl text-center mb-4 tracking-widest">
              {step.icon}
            </div>
            <h2 className="text-xl font-black text-white text-center mb-3">
              {step.title}
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed text-center">
              {step.body}
            </p>
            {step.hint && (
              <p className="mt-4 text-xs text-cyan-300/80 bg-cyan-500/10 rounded-xl px-3 py-2 text-center">
                {step.hint}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-7 flex items-center gap-3">
          <button
            onClick={onComplete}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-2 transition-colors"
          >
            건너뛰기
          </button>
          <button
            onClick={() => (isLast ? onComplete() : setIndex(index + 1))}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-sm active:scale-[0.98] transition-transform"
          >
            {isLast ? "시작하기" : "다음"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default TutorialOverlay;
