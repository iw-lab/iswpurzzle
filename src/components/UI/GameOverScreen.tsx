import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useGameStore } from "../../stores/gameStore";
import { useUserStore } from "../../stores/userStore";
import { useAudio } from "../../hooks/useAudio";
import { FEATURES } from '../../constants/features';
import {
  submitScore,
  getPlayerId,
  getPlayerName,
  setPlayerName,
} from "../../services/firebase";
import { getModeConfig } from "../../constants";

interface GameOverScreenProps {
  onRestart: () => void;
  onMainMenu: () => void;
  onContinue?: () => void;
}

export function GameOverScreen({
  onRestart,
  onMainMenu,
  onContinue,
}: GameOverScreenProps) {
  const {
    score,
    level,
    maxCombo,
    chainCount,
    gameTime,
    continues,
    gameMode,
    lastGameHighScore,
  } = useGameStore();
  const { addPersonalBest } = useUserStore();
  const { playSound } = useAudio();

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [playerName, setLocalPlayerName] = useState(getPlayerName());
  const [isEditingName, setIsEditingName] = useState(playerName === "Player");
  const [tempName, setTempName] = useState(playerName);
  const [showRanking, setShowRanking] = useState(false);

  // endGame이 statistics.highScore를 먼저 갱신하므로 그 값과 비교하면 항상 false다.
  // 판 시작 시점에 캡처해 둔 lastGameHighScore와 비교한다(#6).
  const isHighScore = score > 0 && score > lastGameHighScore;
  const scoreDelta = score - lastGameHighScore;
  const canContinue = continues < 3;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  };

  const formatScore = (s: number) => s.toLocaleString();

  const handleSubmitScore = async () => {
    if (submitted || submitting || score === 0) return;

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
        playSound("rewardGet");
      }
    } catch (error) {
      console.error("점수 제출 실패:", error);
    } finally {
      setSubmitting(false);
      setIsEditingName(false);
    }
  };

  useEffect(() => {
    playSound("gameOver");

    if (isHighScore && score > 0) {
      setTimeout(() => {
        playSound("highScore");
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }, 500);
    }

    addPersonalBest(gameMode, score);

    if (score > 0 && playerName !== "Player") {
      handleSubmitScore();
    }
    // 마운트 시 1회만 정산한다 (게임오버 화면이 뜬 순간의 결과가 확정치)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getGrade = () => {
    if (score >= 1000000)
      return {
        grade: "S+",
        color: "from-yellow-300 to-amber-500",
        text: "text-yellow-300",
        glow: "shadow-yellow-500/50",
      };
    if (score >= 500000)
      return {
        grade: "S",
        color: "from-yellow-400 to-orange-500",
        text: "text-yellow-400",
        glow: "shadow-yellow-400/40",
      };
    if (score >= 200000)
      return {
        grade: "A",
        color: "from-emerald-400 to-green-600",
        text: "text-emerald-400",
        glow: "shadow-emerald-500/30",
      };
    if (score >= 100000)
      return {
        grade: "B",
        color: "from-blue-400 to-indigo-600",
        text: "text-blue-400",
        glow: "shadow-blue-500/30",
      };
    if (score >= 50000)
      return {
        grade: "C",
        color: "from-slate-300 to-slate-500",
        text: "text-slate-300",
        glow: "shadow-slate-400/20",
      };
    return {
      grade: "D",
      color: "from-gray-500 to-gray-700",
      text: "text-gray-500",
      glow: "",
    };
  };

  const { grade, color: gradeColor, glow } = getGrade();

  const modeTitle =
    gameMode === "daily"
      ? "TIME UP!"
      : gameMode === "survival"
        ? "DEFEATED!"
        : gameMode === "puzzle"
          ? "FAILED!"
          : "GAME OVER";

  return (
    <motion.div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        /* ⚠️ max-h + overflow-y-auto 가 필요하다.
           예전에는 overflow-hidden 만 걸려 있어서, 세로가 짧은 화면(390×844)에서
           내용이 뷰포트를 넘으면 위아래로 잘려 나가고 버튼들이 서로 겹쳐 보였다
           (이어하기/다시 하기/메인 메뉴가 한 덩어리로 뭉갬 — 실측). */
        className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto overflow-x-hidden rounded-3xl"
        initial={{ scale: 0.8, y: 60 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.15, type: "spring", damping: 20 }}
      >
        {/* 배경 그라디언트 */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950" />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20" />

        {/* 상단 장식 라인 */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradeColor}`}
        />

        <div className="relative p-6 pb-5">
          {/* 모드 뱃지 + 타이틀 */}
          <div className="text-center mb-5">
            <motion.div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-3"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <span className="text-lg">
                {getModeConfig(gameMode)?.icon || "🎮"}
              </span>
              <span className="text-xs text-gray-400 font-semibold tracking-widest uppercase">
                {getModeConfig(gameMode)?.name || gameMode}
              </span>
            </motion.div>

            <motion.h2
              className="text-3xl font-black text-white tracking-tight"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              {modeTitle}
            </motion.h2>

            <AnimatePresence>
              {isHighScore && score > 0 && (
                <motion.div
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/30"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                >
                  <span className="text-yellow-400 font-bold text-sm tracking-wide">
                    NEW HIGH SCORE!
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 점수 + 등급 카드 */}
          <motion.div
            className="relative mb-5 p-5 rounded-2xl bg-black/40 border border-white/5"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-500 font-semibold tracking-widest mb-1">
                  SCORE
                </p>
                <motion.p
                  className="text-4xl font-black text-white tabular-nums"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                >
                  {formatScore(score)}
                </motion.p>
              </div>
              <motion.div
                className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradeColor} flex items-center justify-center shadow-lg ${glow}`}
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.45, type: "spring", damping: 12 }}
              >
                <span className="text-4xl font-black text-white drop-shadow-md">
                  {grade}
                </span>
              </motion.div>
            </div>

            {/* 모드별 특별 메시지 */}
            {gameMode === "survival" && (
              <p className="text-orange-400/80 text-xs mt-3">
                생존 시간: {Math.floor(gameTime / 60)}분 {gameTime % 60}초
              </p>
            )}
            {gameMode === "daily" && (
              <p className="text-purple-400/80 text-xs mt-3">
                오늘의 챌린지 완료! 전원 같은 판에서의 기록입니다.
              </p>
            )}
            {/* 자기 경쟁 루프 — 이전 기록 대비 증감을 항상 보여준다 */}
            <p className="text-xs mt-2 text-gray-400">
              {isHighScore
                ? `🏆 개인 신기록! 이전 기록보다 +${formatScore(scoreDelta)}점`
                : lastGameHighScore > 0
                  ? `개인 최고 ${formatScore(lastGameHighScore)}점까지 ${formatScore(-scoreDelta)}점`
                  : ""}
            </p>
          </motion.div>

          {/* 통계 그리드 */}
          <motion.div
            className="grid grid-cols-4 gap-2 mb-5"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <StatBox
              label="LEVEL"
              value={String(level)}
              accent="text-cyan-400"
            />
            <StatBox
              label="COMBO"
              value={`x${maxCombo}`}
              accent="text-orange-400"
            />
            <StatBox
              label="CHAIN"
              value={`${chainCount}연쇄`}
              accent="text-purple-400"
            />
            <StatBox
              label="TIME"
              value={formatTime(gameTime)}
              accent="text-gray-300"
              small
            />
          </motion.div>

          {/* 버튼 영역 */}
          <motion.div
            className="space-y-2.5"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {/* 이어하기 */}
            {canContinue && onContinue && (
              <button
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm
                           bg-gradient-to-r from-emerald-500 to-green-600
                           hover:from-emerald-400 hover:to-green-500
                           active:scale-[0.98] transition-all
                           flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                onClick={onContinue}
              >
                {/* 광고 SDK가 없으면 '광고 보고'라는 문구가 거짓말이 된다 — 이어하기는 그대로 동작한다. */}
                <span>{FEATURES.rewardedAds ? "광고 보고 이어하기" : "이어하기"}</span>
                <span className="text-xs opacity-60 bg-white/15 px-2 py-0.5 rounded-full">
                  {3 - continues}회 남음
                </span>
              </button>
            )}

            {/* 다시 하기 */}
            <button
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm
                         bg-gradient-to-r from-blue-500 to-indigo-600
                         hover:from-blue-400 hover:to-indigo-500
                         active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20"
              onClick={onRestart}
            >
              다시 하기
            </button>

            {/* 메인 메뉴 */}
            <button
              className="w-full py-3 rounded-xl font-semibold text-gray-400 text-sm
                         bg-white/5 border border-white/10
                         hover:bg-white/10 hover:text-gray-300
                         active:scale-[0.98] transition-all"
              onClick={onMainMenu}
            >
              메인 메뉴
            </button>

            {/* 점수 2배 — 광고 SDK 연동 전까지 감춘다.
                예전에는 눌러도 효과음만 나고 점수는 그대로였다(순수 껍데기). */}
            {FEATURES.rewardedAds && (
            <button
              className="w-full py-3 rounded-xl font-bold text-white text-sm
                         bg-gradient-to-r from-amber-500 to-orange-600
                         hover:from-amber-400 hover:to-orange-500
                         active:scale-[0.98] transition-all shadow-lg shadow-orange-600/20
                         flex items-center justify-center gap-2"
              onClick={() => playSound("rewardGet")}
            >
              <span className="text-base">x2</span>
              <span>광고 보고 점수 2배</span>
            </button>
            )}
          </motion.div>

          {/* 랭킹 등록 */}
          {score > 0 && !submitted && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4"
            >
              <button
                onClick={() => setShowRanking(!showRanking)}
                className="w-full text-center text-sm text-purple-400 hover:text-purple-300 transition-colors mb-2"
              >
                {showRanking ? "랭킹 등록 닫기" : "랭킹에 등록하기 →"}
              </button>

              <AnimatePresence>
                {showRanking && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      {isEditingName ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            placeholder="닉네임 입력"
                            maxLength={12}
                            className="flex-1 bg-black/40 border border-purple-500/40 rounded-lg px-3 py-2.5 text-white text-sm
                                       focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400/50 transition-all"
                            autoFocus
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleSubmitScore()
                            }
                          />
                          <button
                            onClick={handleSubmitScore}
                            disabled={submitting || !tempName.trim()}
                            className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg text-white font-bold text-sm
                                       disabled:opacity-40 active:scale-95 transition-all"
                          >
                            {submitting ? "..." : "등록"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleSubmitScore}
                          disabled={submitting}
                          className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg text-white font-bold text-sm
                                     disabled:opacity-40 active:scale-95 transition-all"
                        >
                          {submitting ? "등록 중..." : `${playerName}으로 등록`}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {submitted && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center"
            >
              <span className="text-emerald-400 font-bold text-sm">
                랭킹에 등록되었습니다!
              </span>
            </motion.div>
          )}

          {/* 공유 */}
          <div className="mt-4 text-center">
            <button
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              onClick={() => {
                const text = `ChromaFall에서 ${formatScore(score)}점을 달성했어요! 레벨 ${level}, 최대 ${maxCombo} 콤보!`;
                if (navigator.share) {
                  navigator.share({ title: "ChromaFall", text });
                } else {
                  navigator.clipboard.writeText(text);
                  alert("점수가 클립보드에 복사되었습니다!");
                }
              }}
            >
              점수 공유하기
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatBox({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string;
  accent: string;
  small?: boolean;
}) {
  return (
    <div className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
      <p className="text-[9px] text-gray-500 font-semibold tracking-widest mb-0.5">
        {label}
      </p>
      <p
        className={`${small ? "text-sm" : "text-lg"} font-bold ${accent} tabular-nums`}
      >
        {value}
      </p>
    </div>
  );
}

export default GameOverScreen;
