import { useCallback, useEffect, useRef } from 'react';
import { useUserStore } from '../stores/userStore';

type SoundEffect =
  | 'blockLand'
  | 'blockMove'
  | 'blockRotate'
  | 'hardDrop'
  | 'fusion'
  | 'chain'
  | 'combo'
  | 'levelUp'
  | 'powerUpGet'
  | 'powerUpUse'
  | 'gameOver'
  | 'highScore'
  | 'achievement'
  | 'buttonClick'
  | 'rewardGet'
  | 'purchaseSuccess'
  | 'wheelSpin'
  | 'jackpot';

// Web Audio API 기반 사운드 생성
class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private currentOscillators: OscillatorNode[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.musicGain = this.audioContext.createGain();
      this.sfxGain = this.audioContext.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  resume() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  setMusicVolume(volume: number) {
    if (this.musicGain) {
      this.musicGain.gain.value = volume;
    }
  }

  setSfxVolume(volume: number) {
    if (this.sfxGain) {
      this.sfxGain.gain.value = volume;
    }
  }

  // 간단한 효과음 생성
  playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.audioContext || !this.sfxGain) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.sfxGain);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // 효과음 재생
  playSoundEffect(effect: SoundEffect) {
    if (!this.audioContext) return;

    switch (effect) {
      case 'blockLand':
        this.playTone(200, 0.1, 'triangle', 0.2);
        break;
      case 'blockMove':
        this.playTone(400, 0.03, 'sine', 0.1);
        break;
      case 'blockRotate':
        this.playTone(600, 0.05, 'sine', 0.15);
        setTimeout(() => this.playTone(800, 0.05, 'sine', 0.12), 30);
        break;
      case 'hardDrop':
        this.playTone(150, 0.08, 'triangle', 0.25);
        setTimeout(() => this.playTone(100, 0.1, 'triangle', 0.2), 50);
        break;
      case 'fusion':
        this.playTone(440, 0.15, 'sine', 0.3);
        setTimeout(() => this.playTone(554, 0.15, 'sine', 0.3), 50);
        setTimeout(() => this.playTone(659, 0.2, 'sine', 0.3), 100);
        break;
      case 'chain':
        const baseFreq = 330;
        for (let i = 0; i < 4; i++) {
          setTimeout(() => {
            this.playTone(baseFreq * Math.pow(1.2, i), 0.1, 'sine', 0.25);
          }, i * 80);
        }
        break;
      case 'combo':
        this.playTone(523, 0.08, 'square', 0.2);
        setTimeout(() => this.playTone(659, 0.08, 'square', 0.2), 60);
        break;
      case 'levelUp':
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
          setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.3), i * 100);
        });
        break;
      case 'powerUpGet':
        this.playTone(880, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(1100, 0.15, 'sine', 0.3), 80);
        break;
      case 'powerUpUse':
        this.playTone(440, 0.1, 'sawtooth', 0.2);
        setTimeout(() => this.playTone(880, 0.2, 'sawtooth', 0.3), 100);
        break;
      case 'gameOver':
        const sadNotes = [440, 415, 392, 370];
        sadNotes.forEach((freq, i) => {
          setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.25), i * 200);
        });
        break;
      case 'highScore':
        const happyNotes = [523, 659, 784, 880, 1047];
        happyNotes.forEach((freq, i) => {
          setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.3), i * 120);
        });
        break;
      case 'achievement':
        this.playTone(659, 0.15, 'sine', 0.3);
        setTimeout(() => this.playTone(784, 0.15, 'sine', 0.3), 100);
        setTimeout(() => this.playTone(1047, 0.25, 'sine', 0.35), 200);
        break;
      case 'buttonClick':
        this.playTone(800, 0.05, 'sine', 0.15);
        break;
      case 'rewardGet':
        this.playTone(698, 0.1, 'sine', 0.25);
        setTimeout(() => this.playTone(880, 0.15, 'sine', 0.3), 80);
        break;
      case 'purchaseSuccess':
        this.playTone(523, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.3), 100);
        setTimeout(() => this.playTone(784, 0.2, 'sine', 0.35), 200);
        break;
      case 'wheelSpin':
        this.playTone(300, 0.05, 'triangle', 0.2);
        break;
      case 'jackpot':
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            this.playTone(440 + i * 100, 0.15, 'sine', 0.3);
          }, i * 100);
        }
        break;
    }
  }

  // BGM 재생 (간단한 루프)
  startBGM(level: number = 1) {
    if (!this.audioContext || !this.musicGain) return;

    this.stopBGM();

    const bpm = 120 + level * 2;
    const beatDuration = 60 / bpm;

    // 펜타토닉 스케일 (C, D, E, G, A)
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

    const playBeat = () => {
      if (!this.audioContext || !this.musicGain) return;

      // 베이스
      const bassOsc = this.audioContext.createOscillator();
      const bassGain = this.audioContext.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.value = scale[0] / 2;
      bassGain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
      bassGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + beatDuration * 0.8);
      bassOsc.connect(bassGain);
      bassGain.connect(this.musicGain);
      bassOsc.start();
      bassOsc.stop(this.audioContext.currentTime + beatDuration);

      // 멜로디 (랜덤)
      const melodyOsc = this.audioContext.createOscillator();
      const melodyGain = this.audioContext.createGain();
      melodyOsc.type = 'triangle';
      melodyOsc.frequency.value = scale[Math.floor(Math.random() * scale.length)];
      melodyGain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
      melodyGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + beatDuration * 0.5);
      melodyOsc.connect(melodyGain);
      melodyGain.connect(this.musicGain);
      melodyOsc.start();
      melodyOsc.stop(this.audioContext.currentTime + beatDuration * 0.5);

      this.currentOscillators.push(bassOsc, melodyOsc);
    };

    // 비트 루프
    const intervalId = setInterval(playBeat, beatDuration * 1000);
    (this as any).bgmInterval = intervalId;
  }

  stopBGM() {
    if ((this as any).bgmInterval) {
      clearInterval((this as any).bgmInterval);
    }
    this.currentOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {}
    });
    this.currentOscillators = [];
  }

  cleanup() {
    this.stopBGM();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// 싱글톤 인스턴스
let audioEngine: AudioEngine | null = null;

function getAudioEngine(): AudioEngine {
  if (!audioEngine) {
    audioEngine = new AudioEngine();
  }
  return audioEngine;
}

export function useAudio() {
  const { settings } = useUserStore();
  const engineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    engineRef.current = getAudioEngine();

    // 볼륨 설정
    engineRef.current.setMusicVolume(settings.musicEnabled ? settings.musicVolume : 0);
    engineRef.current.setSfxVolume(settings.soundEnabled ? settings.soundVolume : 0);

    // 첫 상호작용 시 오디오 컨텍스트 시작
    const handleInteraction = () => {
      engineRef.current?.resume();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // 설정 변경 시 볼륨 업데이트
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setMusicVolume(settings.musicEnabled ? settings.musicVolume : 0);
      engineRef.current.setSfxVolume(settings.soundEnabled ? settings.soundVolume : 0);
    }
  }, [settings.soundEnabled, settings.musicEnabled, settings.soundVolume, settings.musicVolume]);

  const playSound = useCallback(
    (effect: SoundEffect) => {
      if (settings.soundEnabled && engineRef.current) {
        engineRef.current.playSoundEffect(effect);
      }
    },
    [settings.soundEnabled]
  );

  const startBGM = useCallback(
    (level: number = 1) => {
      if (settings.musicEnabled && engineRef.current) {
        engineRef.current.startBGM(level);
      }
    },
    [settings.musicEnabled]
  );

  const stopBGM = useCallback(() => {
    engineRef.current?.stopBGM();
  }, []);

  return { playSound, startBGM, stopBGM };
}
