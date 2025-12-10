import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useUserStore } from '../../stores/userStore';
import { useAudio } from '../../hooks/useAudio';
import { WHEEL_SEGMENTS } from '../../constants/shopItems';

interface LuckyWheelProps {
  onClose: () => void;
}

export function LuckyWheel({ onClose }: LuckyWheelProps) {
  const { wheelState, spinWheel, canSpinWheel, addCoins, addGems } = useUserStore();
  const { playSound } = useAudio();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const spinOptions = canSpinWheel();
  const segmentAngle = 360 / WHEEL_SEGMENTS.length;

  const handleSpin = (type: 'free' | 'ad' | 'gem') => {
    if (isSpinning) return;

    // 스핀 가능 여부 체크
    if (type === 'free' && !spinOptions.free) return;
    if (type === 'ad' && !spinOptions.ad) return;
    if (type === 'gem' && !spinOptions.gem) return;

    setIsSpinning(true);
    setResult(null);
    playSound('wheelSpin');

    // 결과 결정 (확률 기반)
    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedSegment = WHEEL_SEGMENTS[0];

    for (const segment of WHEEL_SEGMENTS) {
      cumulativeProbability += segment.probability;
      if (random <= cumulativeProbability) {
        selectedSegment = segment;
        break;
      }
    }

    // 해당 세그먼트가 위치할 각도 계산
    const segmentIndex = WHEEL_SEGMENTS.findIndex((s) => s.id === selectedSegment.id);
    const targetAngle = segmentIndex * segmentAngle;

    // 여러 바퀴 + 목표 각도
    const spins = 5 + Math.random() * 3;
    const finalRotation = rotation + spins * 360 + (360 - targetAngle);

    setRotation(finalRotation);

    // 스핀 완료 후 결과 처리
    setTimeout(() => {
      setIsSpinning(false);
      setResult(selectedSegment.id);

      // 보상 지급
      const reward = selectedSegment.reward;
      if (reward.coins) addCoins(reward.coins);
      if (reward.gems) addGems(reward.gems);

      // 효과
      if (selectedSegment.probability < 0.1) {
        playSound('jackpot');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        playSound('rewardGet');
      }

      // 스핀 기록
      spinWheel();
    }, 5000);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-game-panel rounded-2xl p-6 max-w-md w-full mx-4"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white text-center mb-4">행운의 룰렛</h2>

        {/* 룰렛 */}
        <div className="relative w-64 h-64 mx-auto mb-6">
          {/* 포인터 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-yellow-400" />
          </div>

          {/* 휠 */}
          <motion.div
            ref={wheelRef}
            className="w-full h-full rounded-full overflow-hidden border-4 border-yellow-400"
            style={{
              background: `conic-gradient(${WHEEL_SEGMENTS.map(
                (seg, i) =>
                  `${seg.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`
              ).join(', ')})`,
            }}
            animate={{ rotate: rotation }}
            transition={{ duration: 5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* 세그먼트 라벨 */}
            {WHEEL_SEGMENTS.map((segment, index) => {
              const angle = index * segmentAngle + segmentAngle / 2;
              return (
                <div
                  key={segment.id}
                  className="absolute text-xs font-bold text-white whitespace-nowrap"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${angle}deg) translateY(-100px)`,
                    transformOrigin: 'center',
                    textShadow: '1px 1px 2px black',
                  }}
                >
                  {segment.label}
                </div>
              );
            })}
          </motion.div>

          {/* 중앙 버튼 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center text-2xl shadow-lg">
            🎰
          </div>
        </div>

        {/* 결과 표시 */}
        {result && !isSpinning && (
          <motion.div
            className="text-center mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <p className="text-xl font-bold text-green-400">
              {WHEEL_SEGMENTS.find((s) => s.id === result)?.label} 당첨!
            </p>
          </motion.div>
        )}

        {/* 스핀 버튼들 */}
        <div className="space-y-2">
          {spinOptions.free && (
            <button
              className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl
                         font-bold text-white hover:from-green-400 hover:to-green-500 disabled:opacity-50"
              onClick={() => handleSpin('free')}
              disabled={isSpinning}
            >
              🎁 무료 스핀 ({wheelState.freeSpinsRemaining}회)
            </button>
          )}

          {spinOptions.ad && (
            <button
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl
                         font-bold text-white hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50"
              onClick={() => handleSpin('ad')}
              disabled={isSpinning}
            >
              🎬 광고 보고 스핀 ({wheelState.adSpinsRemaining}회)
            </button>
          )}

          {spinOptions.gem && (
            <button
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl
                         font-bold text-white hover:from-purple-400 hover:to-pink-400 disabled:opacity-50"
              onClick={() => handleSpin('gem')}
              disabled={isSpinning}
            >
              💎 20 젬으로 스핀
            </button>
          )}

          {!spinOptions.free && !spinOptions.ad && !spinOptions.gem && (
            <p className="text-center text-gray-400">오늘의 스핀을 모두 사용했습니다</p>
          )}
        </div>

        {/* 닫기 버튼 */}
        <button
          className="w-full mt-4 py-3 bg-gray-700 rounded-xl font-bold text-gray-300"
          onClick={onClose}
          disabled={isSpinning}
        >
          닫기
        </button>
      </motion.div>
    </motion.div>
  );
}

export default LuckyWheel;
