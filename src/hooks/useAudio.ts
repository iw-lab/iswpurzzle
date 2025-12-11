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

// Web Audio API 기반 사운드 생성 - 향상된 버전
class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private currentOscillators: OscillatorNode[] = [];
  private isFeverMode: boolean = false;
  private bgmInterval: number | null = null;
  private ambientInterval: number | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.musicGain = this.audioContext.createGain();
      this.sfxGain = this.audioContext.createGain();

      // 컴프레서 추가 - 전체 사운드 밸런스
      const compressor = this.audioContext.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      this.musicGain.connect(compressor);
      this.sfxGain.connect(compressor);
      compressor.connect(this.masterGain);
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

  // 리버브 효과 생성
  private createReverb(duration: number = 1): ConvolverNode | null {
    if (!this.audioContext) return null;

    const convolver = this.audioContext.createConvolver();
    const rate = this.audioContext.sampleRate;
    const length = rate * duration;
    const impulse = this.audioContext.createBuffer(2, length, rate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }

    convolver.buffer = impulse;
    return convolver;
  }

  // 코드(화음) 재생
  private playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine', volume: number = 0.15) {
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, duration, type, volume / frequencies.length);
      }, index * 20); // 약간의 아르페지오 효과
    });
  }

  // 향상된 톤 재생
  playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.audioContext || !this.sfxGain) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    // 하모닉스 추가 (더 풍부한 사운드)
    const harmonic = this.audioContext.createOscillator();
    const harmonicGain = this.audioContext.createGain();
    harmonic.type = type;
    harmonic.frequency.value = frequency * 2;
    harmonicGain.gain.value = volume * 0.3;

    // 로우패스 필터로 부드러운 사운드
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(frequency * 4, 8000);
    filter.Q.value = 1;

    // ADSR 엔벨로프 (Attack, Decay, Sustain, Release)
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.02); // Attack
    gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + 0.1); // Decay
    gainNode.gain.setValueAtTime(volume * 0.7, now + duration * 0.8); // Sustain
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Release

    oscillator.connect(filter);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxGain);

    oscillator.start(now);
    harmonic.start(now);
    oscillator.stop(now + duration);
    harmonic.stop(now + duration);
  }

  // 효과음 재생 - Premium Enhanced
  playSoundEffect(effect: SoundEffect) {
    if (!this.audioContext) return;

    switch (effect) {
      case 'blockLand':
        // 묵직하고 부드러운 착지 (베이스 + 서브베이스)
        this.playTone(150, 0.15, 'sine', 0.3);
        this.playTone(80, 0.2, 'sine', 0.2);
        setTimeout(() => this.playTone(100, 0.1, 'sine', 0.15), 50);
        // 서브틀한 하이 임팩트
        this.playTone(400, 0.05, 'triangle', 0.08);
        break;

      case 'blockMove':
        // 부드러운 슬라이드 사운드
        this.playTone(800, 0.05, 'sine', 0.1);
        this.playTone(1000, 0.04, 'sine', 0.06);
        this.playTone(600, 0.03, 'triangle', 0.04);
        break;

      case 'blockRotate':
        // 기계적 회전음 + 휙- 효과
        this.playTone(400, 0.08, 'sine', 0.15);
        setTimeout(() => this.playTone(600, 0.07, 'sine', 0.14), 25);
        setTimeout(() => this.playTone(800, 0.06, 'sine', 0.12), 50);
        setTimeout(() => this.playTone(1000, 0.05, 'triangle', 0.08), 75);
        // 미묘한 반향
        setTimeout(() => this.playTone(1200, 0.1, 'sine', 0.04), 100);
        break;

      case 'hardDrop':
        // 강력한 임팩트 (쿵! + 진동감)
        this.playTone(50, 0.2, 'sine', 0.4);
        this.playTone(70, 0.18, 'triangle', 0.35);
        this.playTone(100, 0.15, 'sine', 0.25);
        setTimeout(() => {
          this.playTone(80, 0.12, 'triangle', 0.2);
          this.playTone(120, 0.1, 'sine', 0.15);
          this.playTone(200, 0.08, 'triangle', 0.1);
        }, 60);
        // 충격파 에코
        setTimeout(() => this.playTone(60, 0.15, 'sine', 0.1), 150);
        break;

      case 'fusion':
        // 마법같은 크리스탈 융합 (✨ 반짝)
        const fusionNotes = [523, 659, 784, 988, 1175]; // C5, E5, G5, B5, D6
        fusionNotes.forEach((freq, i) => {
          setTimeout(() => {
            this.playTone(freq, 0.3, 'sine', 0.22);
            this.playTone(freq * 1.5, 0.25, 'triangle', 0.12);
            this.playTone(freq * 2, 0.2, 'sine', 0.06);
          }, i * 50);
        });
        // 풍부한 스파클 효과
        setTimeout(() => {
          for (let i = 0; i < 8; i++) {
            setTimeout(() => {
              this.playTone(1500 + Math.random() * 2500, 0.12, 'sine', 0.08);
              this.playTone(2000 + Math.random() * 2000, 0.08, 'triangle', 0.05);
            }, i * 35);
          }
        }, 200);
        break;

      case 'chain':
        // 상승하는 아르페지오 연쇄
        const chainBase = 349; // F4
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            const freq = chainBase * Math.pow(1.12, i);
            this.playChord([freq, freq * 1.25, freq * 1.5], 0.15, 'sine', 0.28);
            if (i > 3) {
              this.playTone(freq * 2, 0.1, 'triangle', 0.08);
            }
          }, i * 60);
        }
        // 최종 심벌 느낌
        setTimeout(() => this.playTone(3000, 0.2, 'sine', 0.06), 500);
        break;

      case 'combo':
        // 점점 고조되는 팡파레
        this.playChord([523, 659, 784], 0.12, 'sine', 0.2);
        setTimeout(() => this.playChord([587, 740, 880], 0.12, 'sine', 0.22), 70);
        setTimeout(() => this.playChord([659, 831, 988], 0.14, 'sine', 0.24), 140);
        setTimeout(() => this.playTone(1175, 0.18, 'sine', 0.22), 200);
        // 스파클
        setTimeout(() => {
          for (let i = 0; i < 4; i++) {
            setTimeout(() => this.playTone(1800 + i * 300, 0.08, 'sine', 0.06), i * 25);
          }
        }, 250);
        break;

      case 'levelUp':
        // 장엄한 승리 팡파레
        const fanfare = [
          { notes: [523, 659, 784], delay: 0, dur: 0.2 },
          { notes: [587, 740, 880], delay: 100, dur: 0.2 },
          { notes: [659, 831, 988], delay: 200, dur: 0.2 },
          { notes: [784, 988, 1175], delay: 300, dur: 0.25 },
          { notes: [880, 1100, 1319], delay: 420, dur: 0.3 },
          { notes: [1047, 1319, 1568], delay: 550, dur: 0.4 },
        ];
        fanfare.forEach(({ notes, delay, dur }) => {
          setTimeout(() => {
            this.playChord(notes, dur, 'sine', 0.28);
          }, delay);
        });
        // 화려한 반짝이 효과
        for (let i = 0; i < 12; i++) {
          setTimeout(() => {
            this.playTone(1200 + Math.random() * 2500, 0.12, 'sine', 0.1);
          }, 600 + i * 45);
        }
        // 베이스 드럼
        this.playTone(80, 0.3, 'sine', 0.2);
        setTimeout(() => this.playTone(60, 0.4, 'sine', 0.15), 550);
        break;

      case 'powerUpGet':
        // 마법 파워업 획득!
        this.playTone(698, 0.1, 'sine', 0.28);
        setTimeout(() => this.playTone(880, 0.1, 'sine', 0.3), 50);
        setTimeout(() => this.playTone(1047, 0.12, 'sine', 0.32), 100);
        setTimeout(() => this.playTone(1319, 0.15, 'sine', 0.3), 150);
        setTimeout(() => this.playTone(1568, 0.2, 'sine', 0.25), 210);
        // 마법 스파클
        setTimeout(() => {
          for (let i = 0; i < 6; i++) {
            setTimeout(() => this.playTone(2000 + i * 250, 0.1, 'sine', 0.08), i * 30);
          }
        }, 280);
        break;

      case 'powerUpUse':
        // 파워 충전 후 방출
        for (let i = 0; i < 12; i++) {
          setTimeout(() => {
            this.playTone(150 + i * 70, 0.06, 'sawtooth', 0.18 - i * 0.01);
          }, i * 25);
        }
        setTimeout(() => {
          this.playChord([784, 988, 1175], 0.35, 'sine', 0.25);
          this.playTone(1568, 0.3, 'triangle', 0.15);
        }, 320);
        // 에너지 파동
        setTimeout(() => {
          for (let i = 0; i < 5; i++) {
            setTimeout(() => this.playTone(1500 - i * 200, 0.15, 'sine', 0.08), i * 50);
          }
        }, 400);
        break;

      case 'gameOver':
        // 감성적인 피아노 멜로디
        const sadMelody = [
          { freq: 523, dur: 0.35 },  // C5
          { freq: 494, dur: 0.35 },  // B4
          { freq: 440, dur: 0.35 },  // A4
          { freq: 392, dur: 0.5 },   // G4
          { freq: 349, dur: 0.6 },   // F4
          { freq: 330, dur: 0.8 },   // E4
        ];
        let delay = 0;
        sadMelody.forEach(({ freq, dur }) => {
          setTimeout(() => {
            this.playTone(freq, dur, 'sine', 0.25);
            this.playTone(freq * 0.5, dur, 'sine', 0.12); // 베이스
            this.playTone(freq * 0.75, dur * 0.8, 'sine', 0.08); // 5도
          }, delay);
          delay += dur * 380;
        });
        // 페이드 아웃 리버브 효과
        setTimeout(() => {
          this.playTone(262, 1.5, 'sine', 0.08);
          this.playTone(330, 1.5, 'sine', 0.06);
        }, delay);
        break;

      case 'highScore':
        // 신기록! 화려한 축하 팡파레
        const victoryNotes = [523, 587, 659, 784, 880, 988, 1047, 1175, 1319, 1568];
        victoryNotes.forEach((freq, i) => {
          setTimeout(() => {
            this.playChord([freq, freq * 1.25, freq * 1.5], 0.22, 'sine', 0.28);
          }, i * 80);
        });
        // 드럼 롤
        for (let i = 0; i < 10; i++) {
          setTimeout(() => this.playTone(80, 0.08, 'triangle', 0.2 - i * 0.015), i * 30);
        }
        // 대규모 폭죽 쇼
        for (let i = 0; i < 25; i++) {
          setTimeout(() => {
            this.playTone(600 + Math.random() * 3500, 0.18, 'sine', 0.12);
          }, 800 + i * 35);
        }
        // 최종 심벌
        setTimeout(() => {
          this.playChord([1568, 1976, 2349], 0.5, 'sine', 0.2);
        }, 1700);
        break;

      case 'achievement':
        // 업적 달성 표창식 징글
        this.playChord([659, 831, 988], 0.18, 'sine', 0.28);
        setTimeout(() => this.playChord([784, 988, 1175], 0.18, 'sine', 0.3), 100);
        setTimeout(() => this.playChord([880, 1100, 1319], 0.22, 'sine', 0.32), 200);
        setTimeout(() => this.playChord([1047, 1319, 1568], 0.35, 'sine', 0.3), 320);
        // 훈장 효과음
        setTimeout(() => {
          this.playTone(100, 0.15, 'sine', 0.15);
          for (let i = 0; i < 5; i++) {
            setTimeout(() => this.playTone(1800 + i * 200, 0.1, 'sine', 0.07), i * 40);
          }
        }, 400);
        break;

      case 'buttonClick':
        // 고급스러운 UI 클릭
        this.playTone(1400, 0.04, 'sine', 0.14);
        this.playTone(1000, 0.035, 'sine', 0.1);
        this.playTone(700, 0.03, 'triangle', 0.06);
        break;

      case 'rewardGet':
        // 보상 획득 (코인 캐스케이드)
        this.playTone(784, 0.1, 'sine', 0.25);
        setTimeout(() => this.playTone(988, 0.1, 'sine', 0.27), 70);
        setTimeout(() => this.playTone(1175, 0.12, 'sine', 0.28), 140);
        setTimeout(() => this.playTone(1319, 0.15, 'sine', 0.26), 220);
        // 코인 효과 (캐스케이드)
        setTimeout(() => {
          for (let i = 0; i < 10; i++) {
            setTimeout(() => {
              this.playTone(1800 + i * 180, 0.1, 'sine', 0.12);
              if (i % 2 === 0) this.playTone(2500 + i * 100, 0.06, 'triangle', 0.06);
            }, i * 35);
          }
        }, 280);
        break;

      case 'purchaseSuccess':
        // 결제 완료 + 짜잔!
        this.playChord([523, 659, 784], 0.12, 'sine', 0.28);
        setTimeout(() => this.playChord([659, 784, 988], 0.12, 'sine', 0.3), 90);
        setTimeout(() => this.playChord([784, 988, 1175], 0.15, 'sine', 0.32), 180);
        setTimeout(() => this.playChord([988, 1175, 1480], 0.2, 'sine', 0.28), 280);
        // 코인 딸깍
        setTimeout(() => {
          for (let i = 0; i < 6; i++) {
            setTimeout(() => this.playTone(2200 + i * 150, 0.08, 'sine', 0.08), i * 40);
          }
        }, 350);
        break;

      case 'wheelSpin':
        // 룰렛 틱 사운드
        this.playTone(500, 0.04, 'sine', 0.18);
        this.playTone(600, 0.03, 'triangle', 0.12);
        break;

      case 'jackpot':
        // 잭팟!!! 슬롯머신 대박 효과
        // 슬롯 릴 정렬음
        for (let i = 0; i < 15; i++) {
          setTimeout(() => {
            this.playTone(250 + i * 80, 0.22, 'sine', 0.28);
            this.playTone(250 + i * 80 + 250, 0.2, 'sine', 0.18);
          }, i * 70);
        }
        // 사이렌 효과
        setTimeout(() => {
          for (let i = 0; i < 8; i++) {
            setTimeout(() => {
              this.playTone(i % 2 === 0 ? 800 : 1200, 0.25, 'sine', 0.2);
            }, i * 200);
          }
        }, 1100);
        // 화려한 축하
        setTimeout(() => {
          for (let i = 0; i < 30; i++) {
            setTimeout(() => {
              this.playTone(400 + Math.random() * 3000, 0.22, 'sine', 0.15);
            }, i * 45);
          }
        }, 1200);
        // 최종 팡파레
        setTimeout(() => {
          this.playChord([1047, 1319, 1568, 1976], 0.6, 'sine', 0.25);
        }, 2600);
        break;
    }
  }

  // BGM 재생 - 완전 리메이크
  startBGM(level: number = 1) {
    if (!this.audioContext || !this.musicGain) return;

    this.stopBGM();

    const bpm = 110 + level * 5;
    const beatDuration = 60 / bpm;

    // 음계 정의 (메이저 펜타토닉 + 추가 음)
    const scales = {
      melody: [523, 587, 659, 784, 880, 988, 1047, 1175], // C5부터
      bass: [131, 147, 165, 196, 220, 247], // C3부터
      chord: [
        [262, 330, 392], // C major
        [294, 370, 440], // D minor
        [330, 415, 494], // E minor
        [349, 440, 523], // F major
        [392, 494, 587], // G major
        [440, 523, 659], // A minor
      ]
    };

    let beatCount = 0;
    let melodyIndex = 0;
    const melodyPattern = [0, 2, 4, 5, 7, 5, 4, 2]; // 멜로디 패턴

    const playBeat = () => {
      if (!this.audioContext || !this.musicGain) return;

      const now = this.audioContext.currentTime;
      const isFever = this.isFeverMode;

      // 1. 베이스 (매 비트)
      if (beatCount % 2 === 0) {
        const bassOsc = this.audioContext.createOscillator();
        const bassGain = this.audioContext.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.value = scales.bass[beatCount % 6];
        bassGain.gain.setValueAtTime(isFever ? 0.18 : 0.12, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + beatDuration * 0.9);
        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain!);
        bassOsc.start(now);
        bassOsc.stop(now + beatDuration);
        this.currentOscillators.push(bassOsc);
      }

      // 2. 드럼 킥 (4비트마다)
      if (beatCount % 4 === 0) {
        const kickOsc = this.audioContext.createOscillator();
        const kickGain = this.audioContext.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(isFever ? 80 : 60, now);
        kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.1);
        kickGain.gain.setValueAtTime(isFever ? 0.25 : 0.18, now);
        kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain!);
        kickOsc.start(now);
        kickOsc.stop(now + 0.2);
        this.currentOscillators.push(kickOsc);
      }

      // 3. 하이햇 (매 비트 또는 2비트)
      if (beatCount % (isFever ? 1 : 2) === 0) {
        const hihatOsc = this.audioContext.createOscillator();
        const hihatGain = this.audioContext.createGain();
        const hihatFilter = this.audioContext.createBiquadFilter();
        hihatOsc.type = 'square';
        hihatOsc.frequency.value = 8000;
        hihatFilter.type = 'highpass';
        hihatFilter.frequency.value = 7000;
        hihatGain.gain.setValueAtTime(0.03, now);
        hihatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        hihatOsc.connect(hihatFilter);
        hihatFilter.connect(hihatGain);
        hihatGain.connect(this.musicGain!);
        hihatOsc.start(now);
        hihatOsc.stop(now + 0.08);
        this.currentOscillators.push(hihatOsc);
      }

      // 4. 멜로디 (8비트 패턴)
      if (beatCount % 2 === 0) {
        const melodyNote = scales.melody[melodyPattern[melodyIndex % melodyPattern.length]];
        const melodyOsc = this.audioContext.createOscillator();
        const melodyGain = this.audioContext.createGain();
        melodyOsc.type = isFever ? 'sawtooth' : 'triangle';
        melodyOsc.frequency.value = melodyNote;
        melodyGain.gain.setValueAtTime(isFever ? 0.12 : 0.08, now);
        melodyGain.gain.exponentialRampToValueAtTime(0.01, now + beatDuration * 0.7);
        melodyOsc.connect(melodyGain);
        melodyGain.connect(this.musicGain!);
        melodyOsc.start(now);
        melodyOsc.stop(now + beatDuration * 0.8);
        this.currentOscillators.push(melodyOsc);
        melodyIndex++;
      }

      // 5. 코드 패드 (8비트마다)
      if (beatCount % 8 === 0) {
        const chord = scales.chord[Math.floor(beatCount / 8) % scales.chord.length];
        chord.forEach(freq => {
          const padOsc = this.audioContext!.createOscillator();
          const padGain = this.audioContext!.createGain();
          padOsc.type = 'sine';
          padOsc.frequency.value = freq;
          padGain.gain.setValueAtTime(0.04, now);
          padGain.gain.setValueAtTime(0.04, now + beatDuration * 6);
          padGain.gain.exponentialRampToValueAtTime(0.001, now + beatDuration * 7.5);
          padOsc.connect(padGain);
          padGain.connect(this.musicGain!);
          padOsc.start(now);
          padOsc.stop(now + beatDuration * 8);
          this.currentOscillators.push(padOsc);
        });
      }

      // 6. 피버 모드 - 추가 아르페지오
      if (isFever && beatCount % 1 === 0) {
        const arpNote = scales.melody[(beatCount * 3) % scales.melody.length];
        const arpOsc = this.audioContext.createOscillator();
        const arpGain = this.audioContext.createGain();
        arpOsc.type = 'sine';
        arpOsc.frequency.value = arpNote;
        arpGain.gain.setValueAtTime(0.06, now);
        arpGain.gain.exponentialRampToValueAtTime(0.001, now + beatDuration * 0.4);
        arpOsc.connect(arpGain);
        arpGain.connect(this.musicGain!);
        arpOsc.start(now);
        arpOsc.stop(now + beatDuration * 0.5);
        this.currentOscillators.push(arpOsc);
      }

      beatCount++;
    };

    // 비트 루프
    this.bgmInterval = window.setInterval(playBeat, beatDuration * 1000);

    // 앰비언트 효과 (부드러운 패드)
    this.startAmbient();
  }

  // 앰비언트 배경음
  private startAmbient() {
    if (!this.audioContext || !this.musicGain) return;

    const playAmbient = () => {
      if (!this.audioContext || !this.musicGain) return;

      const now = this.audioContext.currentTime;
      const freq = 100 + Math.random() * 100;

      const ambOsc = this.audioContext.createOscillator();
      const ambGain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      ambOsc.type = 'sine';
      ambOsc.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.value = 200;

      ambGain.gain.setValueAtTime(0, now);
      ambGain.gain.linearRampToValueAtTime(0.02, now + 1);
      ambGain.gain.setValueAtTime(0.02, now + 3);
      ambGain.gain.linearRampToValueAtTime(0, now + 4);

      ambOsc.connect(filter);
      filter.connect(ambGain);
      ambGain.connect(this.musicGain!);

      ambOsc.start(now);
      ambOsc.stop(now + 5);
    };

    this.ambientInterval = window.setInterval(playAmbient, 5000);
  }

  // 피버 모드 설정
  setFeverMode(fever: boolean) {
    this.isFeverMode = fever;
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
    this.currentOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) { }
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
