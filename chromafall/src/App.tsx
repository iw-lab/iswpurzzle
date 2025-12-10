import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './stores/gameStore';
import { useUserStore } from './stores/userStore';
import { useAudio } from './hooks';
import { GameMode } from './types';
import { BOARD_CONFIG } from './constants';

// Game Components
import { GameBoard, NextBlockPreview, HoldBlock, TouchControls, PowerUpBar } from './components/Game';

// UI Components
import { ScoreBoard, GameOverScreen, PauseMenu, SettingsModal } from './components/UI';

// Menu Components
import { MainMenu, DailyRewardPopup, ShopScreen } from './components/Menu';

// Monetization Components
import { LuckyWheel } from './components/Monetization';

import './index.css';

type AppScreen = 'menu' | 'game' | 'shop' | 'leaderboard' | 'battlepass';

function App() {
  const [screen, setScreen] = useState<AppScreen>('menu');
  const [showSettings, setShowSettings] = useState(false);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showLuckyWheel, setShowLuckyWheel] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [dangerLevel, setDangerLevel] = useState(0); // 0: 안전, 1: 주의, 2: 위험

  const gameStore = useGameStore();
  const { gameStatus, startGame, pauseGame, resumeGame, resetGame, continueGame, incrementGameTime, score, combo, chainCount, level, board } = gameStore;
  const { settings, updateStreak } = useUserStore();
  const { playSound, stopBGM } = useAudio();
  const prevLevelRef = useRef(level);

  // 스트릭 업데이트
  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  // 레벨업 감지
  useEffect(() => {
    if (level > prevLevelRef.current && gameStatus === 'playing') {
      setShowLevelUp(true);
      playSound('levelUp');
      setTimeout(() => setShowLevelUp(false), 1500);
    }
    prevLevelRef.current = level;
  }, [level, gameStatus, playSound]);

  // 위험 레벨 체크
  useEffect(() => {
    if (gameStatus !== 'playing') {
      setDangerLevel(0);
      return;
    }

    let topBlocks = 0;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < BOARD_CONFIG.COLUMNS; x++) {
        if (board[y]?.[x] !== null) topBlocks++;
      }
    }

    if (topBlocks >= BOARD_CONFIG.COLUMNS * 2) {
      setDangerLevel(2); // 위험
    } else if (topBlocks >= BOARD_CONFIG.COLUMNS) {
      setDangerLevel(1); // 주의
    } else {
      setDangerLevel(0); // 안전
    }
  }, [board, gameStatus]);

  // 게임 시간 타이머
  useEffect(() => {
    let interval: number | null = null;

    if (gameStatus === 'playing') {
      interval = window.setInterval(() => {
        incrementGameTime();
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStatus, incrementGameTime]);

  // 게임 시작 핸들러
  const handleStartGame = useCallback(
    (mode: GameMode) => {
      playSound('buttonClick');
      startGame(mode);
      setScreen('game');
    },
    [startGame, playSound]
  );

  // 메인 메뉴로 돌아가기
  const handleMainMenu = useCallback(() => {
    playSound('buttonClick');
    resetGame();
    stopBGM();
    setScreen('menu');
  }, [resetGame, stopBGM, playSound]);

  // 재시작
  const handleRestart = useCallback(() => {
    playSound('buttonClick');
    resetGame();
    startGame('classic');
  }, [resetGame, startGame, playSound]);

  // 이어하기
  const handleContinue = useCallback(() => {
    // TODO: 광고 시청 로직 추가
    playSound('buttonClick');
    continueGame();
  }, [continueGame, playSound]);

  // 메인 메뉴 화면
  if (screen === 'menu') {
    return (
      <>
        <MainMenu
          onStartGame={handleStartGame}
          onOpenShop={() => {
            playSound('buttonClick');
            setScreen('shop');
          }}
          onOpenSettings={() => {
            playSound('buttonClick');
            setShowSettings(true);
          }}
          onOpenLeaderboard={() => {
            playSound('buttonClick');
            setShowLuckyWheel(true);
          }}
          onOpenBattlePass={() => {
            playSound('buttonClick');
            alert('배틀패스 (준비 중)');
          }}
          onOpenDailyReward={() => {
            playSound('buttonClick');
            setShowDailyReward(true);
          }}
        />

        {/* 모달들 */}
        <AnimatePresence>
          {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
          {showDailyReward && <DailyRewardPopup onClose={() => setShowDailyReward(false)} />}
          {showLuckyWheel && <LuckyWheel onClose={() => setShowLuckyWheel(false)} />}
        </AnimatePresence>
      </>
    );
  }

  // 상점 화면
  if (screen === 'shop') {
    return <ShopScreen onClose={() => setScreen('menu')} />;
  }

  // 게임 화면
  return (
    <div className={`min-h-screen bg-game-bg flex flex-col relative ${dangerLevel === 2 ? 'animate-pulse' : ''}`}>
      {/* 위험 경고 오버레이 */}
      {dangerLevel > 0 && (
        <div
          className={`absolute inset-0 pointer-events-none z-10 ${
            dangerLevel === 2
              ? 'bg-red-500/20 border-4 border-red-500'
              : 'bg-yellow-500/10 border-2 border-yellow-500'
          }`}
        />
      )}

      {/* 레벨업 표시 */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-4xl font-bold px-8 py-4 rounded-2xl shadow-2xl">
              LEVEL UP! 🎉
              <div className="text-2xl text-center">Lv.{level}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 상단 바 */}
      <div className="flex items-center justify-between p-2 bg-game-panel/50 relative z-20">
        <button
          className="w-10 h-10 bg-game-panel/80 rounded-lg flex items-center justify-center text-lg"
          onClick={() => {
            if (gameStatus === 'playing') pauseGame();
            else if (gameStatus === 'paused') resumeGame();
          }}
        >
          {gameStatus === 'paused' ? '▶️' : '⏸️'}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">LV</span>
          <span className="text-lg font-bold text-game-accent">{level}</span>
        </div>

        <button
          className="w-10 h-10 bg-game-panel/80 rounded-lg flex items-center justify-center text-lg"
          onClick={() => {
            playSound('buttonClick');
            setShowSettings(true);
          }}
        >
          ⚙️
        </button>
      </div>

      {/* 메인 게임 영역 */}
      <div className="flex-1 flex justify-center items-start gap-2 p-2 overflow-hidden">
        {/* 왼쪽 사이드바 (데스크톱) */}
        <div className="hidden md:flex flex-col gap-2 w-28">
          <HoldBlock />
          <ScoreBoard />
        </div>

        {/* 게임 보드 */}
        <div className="flex flex-col items-center gap-2">
          {/* 모바일 점수 표시 */}
          <div className="md:hidden w-full flex justify-between items-center bg-game-panel/50 rounded-lg px-3 py-2">
            <div className="text-center">
              <p className="text-xs text-gray-400">SCORE</p>
              <p className="text-lg font-bold text-white">{score.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">COMBO</p>
              <p className="text-lg font-bold text-orange-400">x{combo}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">CHAIN</p>
              <p className="text-lg font-bold text-purple-400">{chainCount}</p>
            </div>
          </div>

          {/* 게임 보드 */}
          <GameBoard />

          {/* 파워업 바 */}
          <PowerUpBar />

          {/* 터치 컨트롤 (모바일) */}
          {(settings.controlType === 'buttons' || settings.controlType === 'both') && (
            <TouchControls visible={gameStatus === 'playing'} />
          )}
        </div>

        {/* 오른쪽 사이드바 */}
        <div className="flex flex-col gap-2 w-16 md:w-24">
          <NextBlockPreview cellSize={typeof window !== 'undefined' && window.innerWidth < 768 ? 24 : 30} maxBlocks={typeof window !== 'undefined' && window.innerWidth < 768 ? 3 : 5} />
          {/* 모바일 홀드 */}
          <div className="md:hidden">
            <HoldBlock cellSize={24} />
          </div>
        </div>
      </div>

      {/* 모달들 */}
      <AnimatePresence>
        {gameStatus === 'paused' && (
          <PauseMenu
            onResume={resumeGame}
            onRestart={handleRestart}
            onSettings={() => setShowSettings(true)}
            onMainMenu={handleMainMenu}
          />
        )}

        {gameStatus === 'gameover' && (
          <GameOverScreen
            onRestart={handleRestart}
            onMainMenu={handleMainMenu}
            onContinue={handleContinue}
          />
        )}

        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default App;
