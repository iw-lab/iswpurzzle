/**
 * 소리 — 효과음·BGM 은 우리가 렌더한 파일(gen-sfx.py · gen-bgm.sh). 첫 입력에서 AudioContext 를 연다(안 하면 배포 후 무음).
 * BGM 은 «한 곡만» 울린다 — 상태가 바뀌면 크로스페이드(겹쳐 깔면 멜로디가 둘로 들린다).
 * 교실 스피커는 저음이 안 나온다 → 정보(정답·넘침)는 효과음 자체의 800Hz~3kHz 대역에 있다.
 */
type Sfx =
  | 'land' | 'pour' | 'click' | 'select' | 'ignite' | 'launch' | 'boom' | 'overflow' | 'point'
  | 'countdown' | 'start' | 'win' | 'lose' | 'mix' | 'ticket' | 'double' | 'hold' | 'heart';

const SFX_FILE: Record<Sfx, string> = {
  land: 'land', pour: 'atk_bubble', click: 'click', select: 'select', ignite: 'super_cast', launch: 'swoosh',
  boom: 'explosion', overflow: 'error', point: 'point', countdown: 'countdown', start: 'start', win: 'win',
  lose: 'lose', mix: 'gauge_full', ticket: 'coin', double: 'multikill', hold: 'dash', heart: 'powerup',
};

export type Track = 'menu' | 'play' | 'hurry';

class Audio {
  ctx: AudioContext | null = null;
  private buf = new Map<string, AudioBuffer>();
  private master: GainNode | null = null;
  private music: { src: AudioBufferSourceNode; gain: GainNode; track: Track } | null = null;
  private wantTrack: Track | null = null;
  on = true;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.on ? 1 : 0;
    this.master.connect(this.ctx.destination);
    for (const f of new Set(Object.values(SFX_FILE))) void this.load(`assets/audio/sfx/${f}.mp3`);
    if (this.wantTrack) this.setTrack(this.wantTrack);
  }

  setOn(on: boolean): void {
    this.on = on;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
  }

  private async load(url: string): Promise<AudioBuffer | null> {
    if (this.buf.has(url)) return this.buf.get(url)!;
    if (!this.ctx) return null;
    try {
      const res = await fetch(url);
      const ab = await this.ctx.decodeAudioData(await res.arrayBuffer());
      this.buf.set(url, ab);
      return ab;
    } catch {
      return null;
    }
  }

  play(name: Sfx, { rate = 1, vol = 0.8 } = {}): void {
    if (!this.ctx || !this.master || !this.on) return;
    const b = this.buf.get(`assets/audio/sfx/${SFX_FILE[name]}.mp3`);
    if (!b) return;
    const s = this.ctx.createBufferSource();
    s.buffer = b;
    s.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    s.connect(g).connect(this.master);
    s.start();
  }

  /** 콤보가 오를수록 반음씩 높아진다(최대 한 옥타브) */
  combo(n: number): void {
    this.play('point', { rate: Math.pow(2, Math.min(12, n - 1) / 12), vol: 0.7 });
  }

  setTrack(track: Track): void {
    this.wantTrack = track;
    if (!this.ctx || !this.master) return;
    if (this.music?.track === track) return;
    const ctx = this.ctx;
    const old = this.music;
    if (old) {
      old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      setTimeout(() => { try { old.src.stop(); } catch { /* 이미 멈춤 */ } }, 1500);
    }
    this.music = null;
    void this.load(`assets/audio/bgm/bgm_${track}.m4a`).then((b) => {
      if (!b || this.wantTrack !== track || !this.master) return;
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.gain.setTargetAtTime(track === 'menu' ? 0.32 : 0.38, ctx.currentTime, 0.4);
      src.connect(gain).connect(this.master);
      src.start();
      this.music = { src, gain, track };
    });
  }

  stopMusic(): void {
    this.wantTrack = null;
    const m = this.music;
    if (m && this.ctx) {
      m.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      setTimeout(() => { try { m.src.stop(); } catch { /* 이미 멈춤 */ } }, 1200);
    }
    this.music = null;
  }
}

export const audio = new Audio();
