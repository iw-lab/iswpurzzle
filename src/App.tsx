import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "./stores/gameStore";
import { useUserStore } from "./stores/userStore";
import { useAudio, useControls } from "./hooks";
import { GameMode, ThemeColors } from "./types";
import { getDropSpeed, getModeConfig, getModeTimeLimit } from "./constants";
import { THEMES } from "./constants/shopItems";

// Game Components
import {
  GameBoard,
  NextBlockPreview,
  TouchControls,
  PowerUpBar,
} from "./components/Game";
// UI Components
import {
  ScoreBoard,
  GameOverScreen,
  PauseMenu,
  SettingsModal,
  PuzzleClearScreen,
  TutorialOverlay,
} from "./components/UI";
// Menu Components
import { MainMenu, DailyRewardPopup, ShopScreen } from "./components/Menu";
// Monetization Components
import { LuckyWheel } from "./components/Monetization";

import "./index.css";

// Leaderboard Component (lazy import)
import { LeaderboardScreen } from "./components/Menu/LeaderboardScreen";

// 기본 다크 테마
const DEFAULT_THEME: ThemeColors = {
  background: "#0a0a1a",
  backgroundGradient:
    "radial-gradient(circle at 50% 10%, #1a1a40 0%, #050510 60%)",
  panel: "#1a1a2e",
  panelBorder: "rgba(255,255,255,0.1)",
  accent: "#4a9eff",
  text: "#ffffff",
  textSecondary: "#888888",
  danger: "#ff4757",
  success: "#2ed573",
};

type AppScreen = "menu" | "game" | "shop" | "leaderboard" | "battlepass";

function App() {
  const [screen, setScreen] = useState<AppScreen>("menu");
  const [showSettings, setShowSettings] = useState(false);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showLuckyWheel, setShowLuckyWheel] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showFeverStart, setShowFeverStart] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const prevFeverModeRef = useRef(false);

  // selector 구독 — 50ms 게임 루프의 모든 set()마다 앱 전체가 리렌더되던
  // 문제를 막는다(#22). 액션은 참조가 안정적이므로 한 번만 뽑는다.
  const gameStatus = useGameStore((s) => s.gameStatus);
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const chainCount = useGameStore((s) => s.chainCount);
  const level = useGameStore((s) => s.level);
  const isFeverMode = useGameStore((s) => s.isFeverMode);
  const gameTime = useGameStore((s) => s.gameTime);
  const gameMode = useGameStore((s) => s.gameMode);
  const dangerLevel = useGameStore((s) => s.dangerLevel);
  const {
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    continueGame,
    incrementGameTime,
    endGame,
    nextPuzzleLevel,
    nextChallengeLevel,
  } = useGameStore.getState();
  const { settings, updateStreak, updateSettings, equippedThemeId } = useUserStore();

  // 현재 테마 가져오기
  const currentTheme = useMemo((): ThemeColors => {
    const theme = THEMES.find((t) => t.id === equippedThemeId);
    return theme?.colors || DEFAULT_THEME;
  }, [equippedThemeId]);

  // 테마 CSS 변수 적용
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--theme-bg", currentTheme.background);
    root.style.setProperty(
      "--theme-bg-gradient",
      currentTheme.backgroundGradient || currentTheme.background,
    );
    root.style.setProperty("--theme-panel", currentTheme.panel);
    root.style.setProperty(
      "--theme-panel-border",
      currentTheme.panelBorder || "rgba(255,255,255,0.1)",
    );
    root.style.setProperty("--theme-accent", currentTheme.accent);
    root.style.setProperty("--theme-text", currentTheme.text || "#ffffff");
    root.style.setProperty(
      "--theme-text-secondary",
      currentTheme.textSecondary || "#888888",
    );
    root.style.setProperty("--theme-danger", currentTheme.danger || "#ff4757");
    root.style.setProperty(
      "--theme-success",
      currentTheme.success || "#2ed573",
    );

    // body 배경 직접 적용
    document.body.style.background =
      currentTheme.backgroundGradient || currentTheme.background;
    document.body.style.backgroundColor = currentTheme.background;
  }, [currentTheme]);
  const { playSound, stopBGM } = useAudio();
  // 키보드 입력 단일 계층 (DAS/ARR) — 데드코드였던 useControls를 정식 배선(#15)
  useControls();
  const prevLevelRef = useRef(level);

  // 스트릭 업데이트
  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  // 레벨업 감지
  useEffect(() => {
    if (level > prevLevelRef.current && gameStatus === "playing") {
      const show = requestAnimationFrame(() => setShowLevelUp(true));
      playSound("levelUp");
      const hide = window.setTimeout(() => setShowLevelUp(false), 2000);
      prevLevelRef.current = level;
      return () => {
        cancelAnimationFrame(show);
        clearTimeout(hide);
      };
    }
    prevLevelRef.current = level;
  }, [level, gameStatus, playSound]);

  // 피버 모드 시작 감지
  useEffect(() => {
    if (isFeverMode && !prevFeverModeRef.current && gameStatus === "playing") {
      const show = requestAnimationFrame(() => setShowFeverStart(true));
      playSound("combo");
      const hide = window.setTimeout(() => setShowFeverStart(false), 2000);
      prevFeverModeRef.current = isFeverMode;
      return () => {
        cancelAnimationFrame(show);
        clearTimeout(hide);
      };
    }
    prevFeverModeRef.current = isFeverMode;
  }, [isFeverMode, gameStatus, playSound]);

  // 게임 시간 타이머
  useEffect(() => {
    let interval: number | null = null;
    if (gameStatus === "playing")
      interval = window.setInterval(() => incrementGameTime(), 1000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStatus, incrementGameTime]);

  // 시간제 모드(데일리) 제한 시간
  const modeTimeLimit = useMemo(
    () => getModeTimeLimit(gameMode),
    [gameMode],
  );

  useEffect(() => {
    if (gameStatus !== "playing") return;
    if (modeTimeLimit !== null && gameTime >= modeTimeLimit) endGame();
  }, [gameStatus, modeTimeLimit, gameTime, endGame]);

  // 모바일 전체화면 요청
  const requestFullscreen = useCallback(() => {
    const elem = document.documentElement;
    const vendor = elem as HTMLElement & {
      webkitRequestFullscreen?: () => void;
      msRequestFullscreen?: () => void;
    };
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if (vendor.webkitRequestFullscreen) {
      vendor.webkitRequestFullscreen();
    } else if (vendor.msRequestFullscreen) {
      vendor.msRequestFullscreen();
    }
  }, []);

  // 핸들러
  const handleStartGame = useCallback(
    (mode: GameMode) => {
      playSound("buttonClick");
      // 첫 실행이면 60초 온보딩을 먼저 보여준다 (§3.2-7)
      if (!settings.hasSeenTutorial) setShowTutorial(true);
      // 모바일에서 전체화면 모드 시도
      if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
        requestFullscreen();
      }
      startGame(mode);
      setScreen("game");
    },
    [startGame, playSound, requestFullscreen, settings.hasSeenTutorial],
  );
  const handleMainMenu = useCallback(() => {
    playSound("buttonClick");
    resetGame();
    stopBGM();
    setScreen("menu");
  }, [resetGame, stopBGM, playSound]);
  const handleRestart = useCallback(() => {
    playSound("buttonClick");
    const currentMode = useGameStore.getState().gameMode;
    resetGame();
    startGame(currentMode);
  }, [resetGame, startGame, playSound]);
  const handleContinue = useCallback(() => {
    playSound("buttonClick");
    continueGame();
  }, [continueGame, playSound]);

  // 렌더링 로직
  if (screen === "menu") {
    return (
      <>
        <MainMenu
          onStartGame={handleStartGame}
          onOpenShop={() => {
            playSound("buttonClick");
            setScreen("shop");
          }}
          onOpenSettings={() => {
            playSound("buttonClick");
            setShowSettings(true);
          }}
          onOpenLeaderboard={() => {
            playSound("buttonClick");
            setScreen("leaderboard");
          }}
          onOpenBattlePass={undefined}
          onOpenDailyReward={() => {
            playSound("buttonClick");
            setShowDailyReward(true);
          }}
        />
        <AnimatePresence>
          {showSettings && (
            <SettingsModal onClose={() => setShowSettings(false)} />
          )}
          {showDailyReward && (
            <DailyRewardPopup onClose={() => setShowDailyReward(false)} />
          )}
          {showLuckyWheel && (
            <LuckyWheel onClose={() => setShowLuckyWheel(false)} />
          )}
        </AnimatePresence>
      </>
    );
  }

  if (screen === "shop")
    return <ShopScreen onClose={() => setScreen("menu")} />;
  if (screen === "leaderboard")
    return <LeaderboardScreen onClose={() => setScreen("menu")} />;

  // 게임 화면 레이아웃 재구성
  return (
    <div
      className={`fixed inset-0 bg-[#0a0a15] flex flex-col items-center overflow-hidden transition-colors duration-500
      ${dangerLevel === 2 ? "shadow-[inset_0_0_50px_rgba(255,0,0,0.3)]" : ""}
      ${isFeverMode ? "shadow-[inset_0_0_100px_rgba(255,100,0,0.3)]" : ""}`}
    >
      {/* 피버 모드 오버레이 */}
      {isFeverMode && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-0"
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255, 100, 0, 0.2) 0%, transparent 70%)",
          }}
        />
      )}

      {/* 위험 경고 오버레이 */}
      {dangerLevel > 0 && !isFeverMode && (
        <div
          className={`absolute inset-0 pointer-events-none z-0 animate-pulse ${dangerLevel === 2 ? "bg-red-900/10" : "bg-transparent"}`}
        />
      )}

      {/* 레벨업 팝업 */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.5, opacity: 0, y: -100 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none"
          >
            <h2
              className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-t from-yellow-400 to-yellow-100 drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              LEVEL UP!
            </h2>
            <p className="text-3xl text-white font-bold mt-2 neon-text">
              Lv. {level}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 피버 모드 시작 팝업 */}
      <AnimatePresence>
        {showFeverStart && (
          <motion.div
            initial={{ scale: 0, rotate: -10, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none"
          >
            <motion.h2
              className="text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-t from-orange-600 via-red-500 to-yellow-400 drop-shadow-[0_0_30px_rgba(255,100,0,0.8)]"
              style={{ fontFamily: "var(--font-display)" }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            >
              🔥 FEVER! 🔥
            </motion.h2>
            <p className="text-2xl text-yellow-300 font-bold mt-2">
              x3 SCORE MULTIPLIER!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 상단 헤더 (모바일/데스크탑 공용) */}
      <div className="w-full max-w-2xl px-4 py-2 flex justify-between items-center z-20">
        <button
          onClick={() => {
            playSound("buttonClick");
            if (gameStatus === "playing") pauseGame();
            else resumeGame();
          }}
          className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl backdrop-blur-md active:scale-95 transition-transform"
        >
          {gameStatus === "paused" ? "▶" : "⏸"}
        </button>

        {/* 모드 표시 */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {getModeConfig(gameMode)?.icon || "🎮"}
            </span>
            <span className="text-xs text-gray-400 font-bold tracking-wider uppercase">
              {getModeConfig(gameMode)?.name || gameMode}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="text-center">
              <div className="text-[9px] text-gray-500 font-bold">LV</div>
              <div className="text-sm font-black text-cyan-400 font-mono leading-none">
                {level}
              </div>
            </div>
            {gameMode === "survival" && (
              <div className="text-center">
                <div className="text-[9px] text-orange-400 font-bold">SPD</div>
                <div className="text-sm font-black text-orange-400 font-mono leading-none">
                  {Math.round((1000 - getDropSpeed(level)) / 8)}%
                </div>
              </div>
            )}
            {modeTimeLimit !== null && (
              <div className="text-center">
                <div className="text-[9px] text-red-400 font-bold">TIME</div>
                <div
                  className={`text-sm font-black font-mono leading-none ${
                    gameTime >=
                    (modeTimeLimit ?? 180) - 30
                      ? "text-red-400 animate-pulse"
                      : "text-white"
                  }`}
                >
                  {Math.max(
                    0,
                    (modeTimeLimit ?? 180) - gameTime,
                  )}
                  s
                </div>
              </div>
            )}
            {gameMode === "zen" && (
              <div className="text-center">
                <div className="text-[9px] text-purple-400 font-bold">ZEN</div>
                <div className="text-sm text-purple-400">🧘</div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            playSound("buttonClick");
            setShowSettings(true);
          }}
          className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl backdrop-blur-md active:scale-95 transition-transform"
        >
          ⚙️
        </button>
      </div>

      {/* 메인 게임 영역 (반응형 그리드) */}
      <div className="flex-1 w-full max-w-4xl flex justify-center items-start gap-1 md:gap-4 px-1 md:px-2 py-1 overflow-hidden">
        {/* [왼쪽 패널] 데스크탑 전용 */}
        <div className="hidden md:flex flex-col gap-3 w-48 items-stretch z-10">
          <ScoreBoard />
        </div>

        {/* [중앙 패널] 게임 보드 */}
        <div className="flex flex-col items-center relative z-20">
          {/* 모바일: 다음 블록을 보드 위에 배치 */}
          <div className="flex md:hidden justify-end w-full max-w-[280px] mb-1 px-1">
            <NextBlockPreview cellSize={18} maxBlocks={3} />
          </div>

          <GameBoard />

          {/* 모바일 스코어 바 (보드 바로 아래) */}
          <div className="md:hidden flex justify-around w-full max-w-[280px] mt-1 py-1 px-2 bg-black/30 rounded-lg">
            <div className="text-center">
              <div className="text-[8px] text-gray-500 font-bold">SCORE</div>
              <div className="text-sm font-mono font-bold text-white leading-none">
                {score.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[8px] text-gray-500 font-bold">COMBO</div>
              <div
                className={`text-sm font-mono font-bold leading-none ${combo > 1 ? "text-orange-400" : "text-gray-600"}`}
              >
                x{combo}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[8px] text-gray-500 font-bold">CHAIN</div>
              <div
                className={`text-sm font-mono font-bold leading-none ${chainCount > 0 ? "text-cyan-400" : "text-gray-600"}`}
              >
                {chainCount}
              </div>
            </div>
          </div>

          {/* 파워업 바 */}
          <div className="mt-1 w-full max-w-[300px]">
            <PowerUpBar />
          </div>
        </div>

        {/* [오른쪽 패널] 데스크탑만 */}
        <div className="hidden md:flex flex-col gap-3 w-32 items-center z-10">
          <NextBlockPreview cellSize={28} maxBlocks={5} />
        </div>
      </div>

      {/* 모바일 하단 컨트롤 영역 */}
      <div className="w-full max-w-lg pb-safe z-30">
        {(settings.controlType === "buttons" ||
          settings.controlType === "both") && (
          <TouchControls visible={gameStatus === "playing"} />
        )}
      </div>

      {/* 오버레이 모달들 */}
      <AnimatePresence>
        {gameStatus === "paused" && (
          <PauseMenu
            onResume={resumeGame}
            onRestart={handleRestart}
            onSettings={() => setShowSettings(true)}
            onMainMenu={handleMainMenu}
          />
        )}
        {gameStatus === "gameover" && (
          <GameOverScreen
            onRestart={handleRestart}
            onMainMenu={handleMainMenu}
            onContinue={handleContinue}
          />
        )}
        {gameStatus === "levelComplete" && gameMode === "puzzle" && (
          <PuzzleClearScreen
            onNextLevel={() => {
              playSound("levelUp");
              nextPuzzleLevel();
            }}
            onMainMenu={handleMainMenu}
          />
        )}
        {gameStatus === "levelComplete" && gameMode === "challenge" && (
          <PuzzleClearScreen
            onNextLevel={() => {
              playSound("levelUp");
              nextChallengeLevel();
            }}
            onMainMenu={handleMainMenu}
          />
        )}
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}
        {showTutorial && (
          <TutorialOverlay
            onComplete={() => {
              setShowTutorial(false);
              updateSettings({ hasSeenTutorial: true });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
