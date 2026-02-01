import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGameStore } from '../../stores/gameStore';
import { useUserStore } from '../../stores/userStore';
import { useAudio } from '../../hooks/useAudio';
import { submitScore, getPlayerId, getPlayerName, setPlayerName } from '../../services/firebase';
import { GAME_MODE_CONFIG } from '../../constants';

interface GameOverScreenProps {
  onRestart: () => void;
  onMainMenu: () => void;
  onContinue?: () => void;
}

export function GameOverScreen({ onRestart, onMainMenu, onContinue }: GameOverScreenProps) {
  const { score, level, maxCombo, chainCount, gameTime, continues, statistics, gameMode } = useGameStore();
  const { currency, addPersonalBest } = useUserStore();
  const { playSound } = useAudio();

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [playerName, setLocalPlayerName] = useState(getPlayerName());
  const [isEditingName, setIsEditingName] = useState(playerName === 'Player');
  const [tempName, setTempName] = useState(playerName);

  const isHighScore = score > statistics.highScore - score; // 이번 게임에서 최고 기록 갱신
  const canContinue = continues < 3;

  // 시간 포맷
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  };

  // 점수 포맷
  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  // 점수 제출
  const handleSubmitScore = async () => {
    if (submitted || submitting || score === 0) return;

    // 이름 저장
    if (tempName.trim() && tempName !== playerName) {
      setPlayerName(tempName.trim());
      setLocalPlayerName(tempName.trim());
    }

    setSubmitting(true);
    try {
      const result = await submitScore({
        playerId: getPlayerId(),
        playerName: tempName.trim() || playerName,
        score,
        level,
        maxCombo,
        maxChain: chainCount,
        gameMode,
        playTime: gameTime,
      });

      if (result) {
        setSubmitted(true);
        playSound('rewardGet');
      }
    } catch (error) {
      console.error('점수 제출 실패:', error);
    } finally {
      setSubmitting(false);
      setIsEditingName(false);
    }
  };

  useEffect(() => {
    playSound('gameOver');

    // 최고 기록 갱신 시 축하 효과
    if (isHighScore && score > 0) {
      setTimeout(() => {
        playSound('highScore');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }, 500);
    }

    // 개인 기록 저장
    addPersonalBest('classic', score);

    // 점수가 0보다 크면 자동으로 제출 준비 (이름 입력 모드가 아니면)
    if (score > 0 && playerName !== 'Player') {
      // 이름이 설정되어 있으면 자동 제출
      handleSubmitScore();
    }
  }, []);

  // 등급 계산
  const getGrade = () => {
    if (score >= 1000000) return { grade: 'S+', color: 'text-purple-400' };
    if (score >= 500000) return { grade: 'S', color: 'text-yellow-400' };
    if (score >= 200000) return { grade: 'A', color: 'text-green-400' };
    if (score >= 100000) return { grade: 'B', color: 'text-blue-400' };
    if (score >= 50000) return { grade: 'C', color: 'text-gray-300' };
    return { grade: 'D', color: 'text-gray-500' };
  };

  const { grade, color } = getGrade();

  return (
    <motion.div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-game-panel rounded-2xl p-6 max-w-sm w-full"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        {/* 타이틀 및 모드 */}
        <div className="text-center mb-6">
          {/* 모드 표시 */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">{GAME_MODE_CONFIG[gameMode]?.icon || '🎮'}</span>
            <span className="text-sm text-gray-400 font-bold tracking-wider uppercase">
              {GAME_MODE_CONFIG[gameMode]?.name || gameMode} MODE
            </span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">
            {gameMode === 'timeAttack' ? 'TIME UP!' :
             gameMode === 'survival' ? 'DEFEATED!' :
             gameMode === 'puzzle' ? 'FAILED!' :
             'GAME OVER'}
          </h2>
          {isHighScore && score > 0 && (
            <motion.p
              className="text-yellow-400 font-bold"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              🏆 NEW HIGH SCORE! 🏆
            </motion.p>
          )}

          {/* 모드별 특별 메시지 */}
          {gameMode === 'survival' && (
            <p className="text-orange-400 text-sm mt-1">
              생존 시간: {Math.floor(gameTime / 60)}분 {gameTime % 60}초
            </p>
          )}
          {gameMode === 'timeAttack' && (
            <p className="text-cyan-400 text-sm mt-1">
              2분 안에 {formatScore(score)}점을 기록했습니다!
            </p>
          )}
          {gameMode === 'daily' && (
            <p className="text-purple-400 text-sm mt-1">
              📅 오늘의 챌린지 완료!
            </p>
          )}
        </div>

        {/* 점수 및 등급 */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm">SCORE</p>
            <motion.p
              className="text-4xl font-bold text-white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              {formatScore(score)}
            </motion.p>
          </div>
          <motion.div
            className={`text-6xl font-bold ${color}`}
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
          >
            {grade}
          </motion.div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-xs">LEVEL</p>
            <p className="text-xl font-bold text-game-accent">{level}</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-xs">MAX COMBO</p>
            <p className="text-xl font-bold text-orange-400">x{maxCombo}</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-xs">MAX CHAIN</p>
            <p className="text-xl font-bold text-purple-400">{chainCount}연쇄</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-xs">TIME</p>
            <p className="text-xl font-bold text-gray-300">{formatTime(gameTime)}</p>
          </div>
        </div>

        {/* 버튼들 */}
        <div className="space-y-3">
          {/* 이어하기 (광고 시청) */}
          {canContinue && onContinue && (
            <motion.button
              className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 rounded-xl
                         font-bold text-white flex items-center justify-center gap-2
                         hover:from-green-400 hover:to-green-500 transition-all"
              whileTap={{ scale: 0.98 }}
              onClick={onContinue}
            >
              <span>🎬</span>
              <span>광고 보고 이어하기</span>
              <span className="text-sm opacity-70">({3 - continues}회 남음)</span>
            </motion.button>
          )}

          {/* 재시작 */}
          <motion.button
            className="w-full py-4 bg-gradient-to-r from-game-accent to-blue-600 rounded-xl
                       font-bold text-white hover:from-blue-500 hover:to-blue-600 transition-all"
            whileTap={{ scale: 0.98 }}
            onClick={onRestart}
          >
            다시 하기
          </motion.button>

          {/* 메인 메뉴 */}
          <motion.button
            className="w-full py-3 bg-gray-700 rounded-xl font-bold text-gray-300
                       hover:bg-gray-600 transition-all"
            whileTap={{ scale: 0.98 }}
            onClick={onMainMenu}
          >
            메인 메뉴
          </motion.button>

          {/* 점수 2배 (광고) */}
          <motion.button
            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl
                       font-bold text-white flex items-center justify-center gap-2
                       hover:from-yellow-400 hover:to-orange-400 transition-all"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              // TODO: 광고 시청 후 점수 2배
              playSound('rewardGet');
            }}
          >
            <span>🎬</span>
            <span>광고 보고 점수 2배</span>
          </motion.button>
        </div>

        {/* 랭킹 등록 */}
        {score > 0 && !submitted && (
          <div className="mt-4 p-3 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-xl border border-purple-500/30">
            <p className="text-center text-sm text-gray-300 mb-2">랭킹에 등록하기</p>
            {isEditingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="닉네임 입력"
                  maxLength={12}
                  className="flex-1 bg-black/50 border border-purple-500 rounded-lg px-3 py-2 text-white text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitScore()}
                />
                <button
                  onClick={handleSubmitScore}
                  disabled={submitting || !tempName.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-bold text-sm disabled:opacity-50"
                >
                  {submitting ? '...' : '등록'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleSubmitScore}
                disabled={submitting}
                className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-bold text-sm disabled:opacity-50"
              >
                {submitting ? '등록 중...' : `${playerName}으로 등록`}
              </button>
            )}
          </div>
        )}

        {submitted && (
          <div className="mt-4 p-3 bg-green-900/30 rounded-xl border border-green-500/30 text-center">
            <span className="text-green-400 font-bold">랭킹에 등록되었습니다!</span>
          </div>
        )}

        {/* 공유 버튼 */}
        <div className="mt-4 text-center">
          <button
            className="text-gray-400 hover:text-white transition-colors"
            onClick={() => {
              const text = `ChromaFall에서 ${formatScore(score)}점을 달성했어요! 레벨 ${level}, 최대 ${maxCombo} 콤보!`;
              if (navigator.share) {
                navigator.share({ title: 'ChromaFall', text });
              } else {
                navigator.clipboard.writeText(text);
                alert('점수가 클립보드에 복사되었습니다!');
              }
            }}
          >
            📤 점수 공유하기
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default GameOverScreen;
