import React from 'react';
import { motion } from 'framer-motion';
import { useUserStore } from '../../stores/userStore';
import { useAudio } from '../../hooks/useAudio';

interface SettingsModalProps {
  onClose: () => void;
}

import { AUDIO_CREDITS } from '../../constants/audioCredits';

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useUserStore();
  const { playSound } = useAudio();

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    playSound('buttonClick');
    updateSettings({ [key]: value });
  };

  const handleVolumeChange = (key: 'soundVolume' | 'musicVolume', value: number) => {
    updateSettings({ [key]: value });
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-game-panel rounded-2xl p-6 max-w-sm w-full mx-4 max-h-[80vh] overflow-y-auto"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">설정</h2>
          <button
            className="text-gray-400 hover:text-white transition-colors text-2xl"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* 사운드 설정 */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase">사운드</h3>

          {/* 효과음 */}
          <div className="flex justify-between items-center">
            <span className="text-white">효과음</span>
            <button
              className={`w-14 h-8 rounded-full transition-colors ${
                settings.soundEnabled ? 'bg-game-accent' : 'bg-gray-600'
              }`}
              onClick={() => handleToggle('soundEnabled', !settings.soundEnabled)}
            >
              <motion.div
                className="w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ x: settings.soundEnabled ? 26 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* 효과음 볼륨 */}
          {settings.soundEnabled && (
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm w-20">볼륨</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.soundVolume}
                onChange={(e) => handleVolumeChange('soundVolume', parseFloat(e.target.value))}
                className="flex-1 accent-game-accent"
              />
              <span className="text-gray-400 text-sm w-10">
                {Math.round(settings.soundVolume * 100)}%
              </span>
            </div>
          )}

          {/* 배경음악 */}
          <div className="flex justify-between items-center">
            <span className="text-white">배경음악</span>
            <button
              className={`w-14 h-8 rounded-full transition-colors ${
                settings.musicEnabled ? 'bg-game-accent' : 'bg-gray-600'
              }`}
              onClick={() => handleToggle('musicEnabled', !settings.musicEnabled)}
            >
              <motion.div
                className="w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ x: settings.musicEnabled ? 26 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* 배경음악 볼륨 */}
          {settings.musicEnabled && (
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm w-20">볼륨</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.musicVolume}
                onChange={(e) => handleVolumeChange('musicVolume', parseFloat(e.target.value))}
                className="flex-1 accent-game-accent"
              />
              <span className="text-gray-400 text-sm w-10">
                {Math.round(settings.musicVolume * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* 게임 설정 */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase">게임</h3>

          {/* 진동 */}
          <div className="flex justify-between items-center">
            <span className="text-white">진동</span>
            <button
              className={`w-14 h-8 rounded-full transition-colors ${
                settings.hapticEnabled ? 'bg-game-accent' : 'bg-gray-600'
              }`}
              onClick={() => handleToggle('hapticEnabled', !settings.hapticEnabled)}
            >
              <motion.div
                className="w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ x: settings.hapticEnabled ? 26 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* 수학 모드 색 힌트 */}
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <span className="text-white">수학 모드 색 힌트</span>
              <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                끄면 같은 값이라도 색이 같지 않아, 표기를 읽어야 맞출 수 있어요
              </p>
            </div>
            <button
              aria-label="수학 모드 색 힌트"
              className={`shrink-0 w-14 h-8 rounded-full transition-colors ${
                (settings.mathColorHint ?? true) ? 'bg-game-accent' : 'bg-gray-600'
              }`}
              onClick={() => handleToggle('mathColorHint', !(settings.mathColorHint ?? true))}
            >
              <motion.div
                className="w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ x: (settings.mathColorHint ?? true) ? 26 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* 고스트 블록 */}
          <div className="flex justify-between items-center">
            <span className="text-white">낙하 위치 미리보기</span>
            <button
              className={`w-14 h-8 rounded-full transition-colors ${
                settings.showGhostBlock ? 'bg-game-accent' : 'bg-gray-600'
              }`}
              onClick={() => handleToggle('showGhostBlock', !settings.showGhostBlock)}
            >
              <motion.div
                className="w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ x: settings.showGhostBlock ? 26 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* 색맹 모드 */}
          <div className="flex justify-between items-center">
            <span className="text-white">색맹 모드</span>
            <button
              className={`w-14 h-8 rounded-full transition-colors ${
                settings.colorBlindMode ? 'bg-game-accent' : 'bg-gray-600'
              }`}
              onClick={() => handleToggle('colorBlindMode', !settings.colorBlindMode)}
            >
              <motion.div
                className="w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ x: settings.colorBlindMode ? 26 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        {/* 컨트롤 설정 */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase">컨트롤</h3>

          <div className="grid grid-cols-3 gap-2">
            {(['swipe', 'buttons', 'both'] as const).map((type) => (
              <button
                key={type}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  settings.controlType === type
                    ? 'bg-game-accent text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => {
                  playSound('buttonClick');
                  updateSettings({ controlType: type });
                }}
              >
                {type === 'swipe' && '스와이프'}
                {type === 'buttons' && '버튼'}
                {type === 'both' && '둘 다'}
              </button>
            ))}
          </div>
        </div>

        {/* 성능 설정 */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase">성능</h3>

          <div className="grid grid-cols-2 gap-2">
            {(['auto', 'high', 'medium', 'low'] as const).map((mode) => (
              <button
                key={mode}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  settings.performanceMode === mode
                    ? 'bg-game-accent text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => {
                  playSound('buttonClick');
                  updateSettings({ performanceMode: mode });
                }}
              >
                {mode === 'auto' && '자동'}
                {mode === 'high' && '고품질'}
                {mode === 'medium' && '중간'}
                {mode === 'low' && '절전'}
              </button>
            ))}
          </div>
        </div>

        {/* 오디오 크레딧 — BGM이 CC BY 계열이라 표기가 라이선스 의무다 */}
        <div className="space-y-2 mt-6 pt-4 border-t border-white/10">
          <h3 className="text-sm font-bold text-gray-400 uppercase">사운드 출처</h3>
          <ul className="space-y-1.5">
            {AUDIO_CREDITS.map((c) => (
              <li key={c.works} className="text-[11px] leading-tight text-gray-400">
                <span className="text-gray-300">{c.works}</span>
                {' — '}
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  {c.author}
                </a>
                <span className="text-gray-500"> ({c.license})</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 닫기 버튼 */}
        <motion.button
          className="w-full mt-6 py-3 bg-gray-700 rounded-xl font-bold text-white
                     hover:bg-gray-600 transition-all"
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
        >
          닫기
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

export default SettingsModal;
