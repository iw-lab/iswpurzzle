import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpModalProps {
  onClose: () => void;
}

const SPECIAL_BLOCKS = [
  { icon: '💣', name: '폭탄', desc: '매칭 시 주변 3x3 영역을 폭발시켜 블록 제거', color: 'from-red-500 to-orange-500' },
  { icon: '⚡', name: '번개', desc: '매칭 시 같은 색의 모든 블록을 한번에 제거', color: 'from-yellow-400 to-yellow-600' },
  { icon: '✚', name: '십자가', desc: '매칭 시 가로 한 줄 + 세로 한 줄 제거', color: 'from-green-400 to-green-600' },
  { icon: '❄️', name: '얼음', desc: '2번 매칭해야 제거됨 (단단한 블록)', color: 'from-cyan-300 to-blue-500' },
  { icon: '🪨', name: '돌', desc: '매칭 불가! 인접한 블록 제거 시 함께 파괴', color: 'from-gray-400 to-gray-600' },
  { icon: '🔀', name: '셔플', desc: '매칭 시 주변 블록들의 색상을 랜덤 변경', color: 'from-purple-400 to-pink-500' },
  { icon: '🎨', name: '색변환', desc: '매칭 시 주변 블록을 같은 색으로 변환', color: 'from-pink-400 to-rose-500' },
  { icon: '×2', name: '배율', desc: '매칭 시 점수 2배 획득', color: 'from-amber-400 to-orange-500' },
  { icon: '🌈', name: '무지개', desc: '어떤 색과도 매칭 가능한 와일드카드', color: 'from-red-400 via-yellow-400 to-blue-400' },
];

const CONTROLS = [
  { key: '← →', desc: '블록 좌우 이동' },
  { key: '↓', desc: '소프트 드롭 (천천히 내리기)' },
  { key: 'Space', desc: '하드 드롭 (즉시 내리기 + 분리)' },
  { key: 'Z / ↑', desc: '블록 홀드 (보관)' },
  { key: 'P / ESC', desc: '일시정지' },
];

const TIPS = [
  '💡 4개 이상의 같은 색 블록을 연결하면 융합(제거)됩니다',
  '💡 연쇄 반응을 일으키면 콤보 점수가 크게 올라갑니다',
  '💡 하드드롭(Space)시 블록이 장애물에 걸리면 분리되어 떨어집니다',
  '💡 홀드 기능으로 블록을 보관했다가 필요할 때 사용하세요',
  '💡 피버 모드에서는 점수가 3배!',
];

export function HelpModal({ onClose }: HelpModalProps) {
  const [tab, setTab] = useState<'blocks' | 'controls' | 'tips'>('blocks');

  return (
    <motion.div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-game-accent to-purple-600 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">📖 게임 도움말</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
          >
            ✕
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'blocks', label: '특수 블록' },
            { id: 'controls', label: '조작법' },
            { id: 'tips', label: '팁' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                tab === t.id
                  ? 'text-game-accent border-b-2 border-game-accent bg-game-accent/10'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          <AnimatePresence mode="wait">
            {tab === 'blocks' && (
              <motion.div
                key="blocks"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                {SPECIAL_BLOCKS.map((block, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-black/30 rounded-lg p-3"
                  >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${block.color} flex items-center justify-center text-2xl`}>
                      {block.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white">{block.name}</h4>
                      <p className="text-xs text-gray-400">{block.desc}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {tab === 'controls' && (
              <motion.div
                key="controls"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                <p className="text-gray-400 text-sm mb-4">키보드 & 터치 조작</p>
                {CONTROLS.map((ctrl, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 bg-black/30 rounded-lg p-3"
                  >
                    <div className="w-20 text-center">
                      <span className="px-3 py-1 bg-gray-700 rounded text-white font-mono text-sm">
                        {ctrl.key}
                      </span>
                    </div>
                    <p className="text-white flex-1">{ctrl.desc}</p>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-blue-900/30 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    📱 <strong>모바일:</strong> 화면 하단 버튼 또는 스와이프로 조작
                  </p>
                </div>
              </motion.div>
            )}

            {tab === 'tips' && (
              <motion.div
                key="tips"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                {TIPS.map((tip, i) => (
                  <div
                    key={i}
                    className="bg-black/30 rounded-lg p-4 text-white"
                  >
                    {tip}
                  </div>
                ))}
                <div className="mt-4 p-4 bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-lg border border-orange-500/30">
                  <h4 className="font-bold text-orange-400 mb-2">🔥 피버 모드</h4>
                  <p className="text-sm text-gray-300">
                    콤보와 연쇄를 통해 피버 게이지를 채우세요!
                    피버 모드에서는 모든 점수가 <strong className="text-orange-400">3배</strong>가 됩니다!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default HelpModal;
