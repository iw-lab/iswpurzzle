/**
 * 캔버스 렌더러 — 시뮬 상태를 «읽기만» 한다. 글자 단추·점수 같은 DOM 은 ui 쪽이 그린다(월드만 캔버스).
 */
import type { Sim, SimEvent } from '../core/sim.ts';
import type { Cell, Notation } from '../core/values.ts';
import { ONE } from '../core/values.ts';
import { art } from './assets.ts';
import { computeLayout, type Layout } from './layout.ts';

export const NOTATION_STYLE: Record<Notation, { fill: string; deep: string; ink: string; tag: string; name: string }> = {
  frac: { fill: '#ffb547', deep: '#e07b12', ink: '#3b1d00', tag: '분수', name: '분수' },
  dec: { fill: '#53d6ff', deep: '#1689c4', ink: '#002536', tag: '소수', name: '소수' },
  pct: { fill: '#ff79c0', deep: '#c93a86', ink: '#3d0022', tag: '%', name: '백분율' },
};

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: 'spark' | 'smoke' | 'drop' | 'star' }
interface Floater { x: number; y: number; text: string; color: string; size: number; t0: number; dur: number }
interface LaunchAnim { col: number; t0: number; img: number; parts: Cell[] }
interface FlyAnim { cell: Cell; fromX: number; fromY: number; col: number; t0: number }

const EASE_IN = (t: number) => t * t * t;
const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);

export class View {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr = 1;
  L: Layout;
  sim: Sim | null = null;
  bgKey = 'bg_earth';
  bgImg: HTMLImageElement | null = null;
  /** 로켓 자리마다 지금 서 있는 로켓 그림 번호 + 올라오는 중이면 시작 시각 */
  rocketImg: number[] = [];
  riseAt: number[] = [];
  flashAt: number[] = [];
  launches: LaunchAnim[] = [];
  flies: FlyAnim[] = [];
  parts: Particle[] = [];
  floaters: Floater[] = [];
  shake = 0;
  hoverX = 0;
  /** 도키 반응: idle | cheer | oops | dance */
  doki: { anim: string; until: number } = { anim: 'idle', until: 0 };
  lowFx = false;
  private launchCount = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.L = computeLayout(innerWidth, innerHeight, 5);
    this.lowFx = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  attach(sim: Sim, bgKey: string): void {
    this.sim = sim;
    this.bgKey = bgKey;
    this.bgImg = null;
    void art.background(bgKey).then((img) => { if (this.bgKey === bgKey) this.bgImg = img; });
    const n = sim.tanks.length;
    const R = Math.max(1, art.rockets.length);
    this.rocketImg = Array.from({ length: n }, (_, i) => i % R);
    this.riseAt = Array(n).fill(-1e9);
    this.flashAt = Array(n).fill(-1e9);
    this.launches = [];
    this.flies = [];
    this.parts = [];
    this.floaters = [];
    this.launchCount = 0;
    this.resize();
    this.hoverX = this.L.colX[sim.col] ?? 0;
  }

  resize(): void {
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    const w = innerWidth, h = innerHeight;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.L = computeLayout(w, h, this.sim?.tanks.length ?? 5);
  }

  /** 시뮬 사건 → 연출 */
  handle(ev: SimEvent, now: number): void {
    const L = this.L;
    if (ev.type === 'pour') {
      const fromX = this.hoverX;
      const fromY = this.fallingY();
      this.flies.push({ cell: ev.cell, fromX, fromY, col: ev.col, t0: now });
      this.burst(L.colX[ev.col], L.tubeTop + 6, 6, NOTATION_STYLE[ev.cell.kind].fill, 'drop');
    } else if (ev.type === 'launch') {
      const R = Math.max(1, art.rockets.length);
      this.launches.push({ col: ev.col, t0: now, img: this.rocketImg[ev.col], parts: ev.parts });
      this.launchCount++;
      this.rocketImg[ev.col] = (this.rocketImg[ev.col] + 1 + (this.launchCount % 2)) % R;
      this.riseAt[ev.col] = now + 650;
      this.shake = Math.min(18, 7 + ev.multi * 4);
      const x = L.colX[ev.col];
      this.burst(x, L.padY - 4, this.lowFx ? 18 : 46, '#ffe08a', 'spark');
      this.burst(x, L.padY, this.lowFx ? 8 : 22, 'rgba(230,230,240,0.8)', 'smoke');
      this.float(x, L.tubeTop - 10, `+${ev.points}`, '#fff3a6', 1.15, now);
      if (ev.kinds >= 2) this.float(x, L.tubeTop + 30, ev.kinds >= 3 ? '섞어 채우기 ×2' : '섞어 채우기 ×1.5', '#b8ffde', 0.7, now + 120);
      this.doki = { anim: ev.combo >= 5 ? 'dance' : 'cheer', until: now + 1400 };
    } else if (ev.type === 'overflow') {
      this.flashAt[ev.col] = now;
      this.burst(L.colX[ev.col], L.tubeTop + 4, this.lowFx ? 10 : 26, NOTATION_STYLE[ev.cell.kind].fill, 'drop');
      this.shake = Math.max(this.shake, 6);
      this.doki = { anim: 'oops', until: now + 1100 };
    } else if (ev.type === 'idle') {
      // 넘침 멈춤 중 탭 — 눌린 건 알았다고 답한다(«조작이 안 먹는 버그»로 읽히지 않게)
      this.flashAt[ev.col] = now - 300;
      this.float(L.colX[ev.col], L.tubeTop - 8, '잠깐!', '#ffd0d0', 0.6, now);
    } else if (ev.type === 'spawn') {
      this.hoverX = L.colX[ev.col];
    }
  }

  private float(x: number, y: number, text: string, color: string, size: number, t0: number): void {
    this.floaters.push({ x, y, text, color, size, t0, dur: 1100 });
  }

  burst(x: number, y: number, n: number, color: string, kind: Particle['kind']): void {
    for (let i = 0; i < n; i++) {
      const a = kind === 'smoke' ? Math.PI * (0.9 + Math.random() * 1.2) : Math.random() * Math.PI * 2;
      const sp = kind === 'smoke' ? 40 + Math.random() * 90 : kind === 'drop' ? 80 + Math.random() * 160 : 120 + Math.random() * 260;
      const max = kind === 'smoke' ? 900 + Math.random() * 500 : 500 + Math.random() * 500;
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'drop' ? 120 : 40),
        life: max, max, size: kind === 'smoke' ? 10 + Math.random() * 16 : 2 + Math.random() * 4, color, kind,
      });
    }
    if (this.parts.length > 420) this.parts.splice(0, this.parts.length - 420);
  }

  fallingY(): number {
    const s = this.sim;
    const L = this.L;
    if (!s?.cur) return L.spawnTop;
    const h = this.cellH(s.cur);
    return L.spawnTop + (L.spawnH - h) * Math.min(1, s.curY);
  }

  cellH(c: Cell): number {
    const L = this.L;
    if (this.sim?.mode.uniform) return Math.max(34, L.tubeH * 0.18 * L.cellScale);
    return Math.max(22, (c.v / ONE) * L.tubeH * L.cellScale);
  }

  draw(now: number, dt: number): void {
    const { ctx, L } = this;
    const s = this.sim;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBackground();
    if (!s) return;
    ctx.save();
    if (this.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      this.shake *= Math.pow(0.002, dt / 1000);
    }
    for (let i = 0; i < L.tanks; i++) this.drawColumn(i, now);
    this.drawFalling(now, dt);
    this.drawFlies(now);
    this.drawLaunches(now);
    this.drawParticles(dt);
    this.drawFloaters(now);
    ctx.restore();
    this.drawDoki(now);
  }

  private drawBackground(): void {
    const { ctx } = this;
    const w = innerWidth, h = innerHeight;
    const img = this.bgImg;
    if (img) {
      const sc = Math.max(w / img.width, h / img.height);
      const iw = img.width * sc, ih = img.height * sc;
      ctx.drawImage(img, (w - iw) / 2, (h - ih) * 0.65, iw, ih);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#141a3d');
      g.addColorStop(1, '#3b2556');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    // 위·아래를 어둡게 — 글자와 연료통이 배경에 묻히지 않게
    const v = ctx.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(6,8,24,0.62)');
    v.addColorStop(0.35, 'rgba(6,8,24,0.28)');
    v.addColorStop(1, 'rgba(6,8,24,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }

  private drawColumn(i: number, now: number): void {
    const { ctx, L } = this;
    const s = this.sim!;
    const x = L.colX[i];
    const tw = L.tubeW;
    const tx = x - tw / 2;
    const ty = L.tubeTop;
    const th = L.tubeH;
    const r = Math.min(22, tw * 0.28);
    const flash = Math.max(0, 1 - (now - this.flashAt[i]) / 450);

    // 기둥 전체 = 단추 — 떠 있는 자리를 은은하게
    if (s.cur && s.col === i) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(L.playX + L.colW * i + 3, L.spawnTop, L.colW - 6, L.padY - L.spawnTop);
    }
    // 발사대
    ctx.fillStyle = 'rgba(20,24,48,0.85)';
    roundRect(ctx, x - L.colW * 0.4, L.padY - 8, L.colW * 0.8, 14, 7);
    ctx.fill();

    // 유리관 뒷면
    ctx.save();
    roundRect(ctx, tx, ty, tw, th, r);
    ctx.fillStyle = 'rgba(12,16,40,0.62)';
    ctx.fill();
    ctx.clip();
    // 연료
    const tank = s.tanks[i];
    const pad = 4;
    const innerH = th - pad * 2;
    const drawParts = tank.parts;
    if (s.mode.uniform) {
      const chip = Math.min(innerH * 0.2, innerH / Math.max(5, drawParts.length));
      drawParts.forEach((p, k) => this.drawFuel(p, tx + pad, ty + th - pad - chip * (k + 1), tw - pad * 2, chip - 3, now));
    } else {
      let y = ty + th - pad;
      for (const p of drawParts) {
        const h = (p.v / ONE) * innerH;
        y -= h;
        this.drawFuel(p, tx + pad, y, tw - pad * 2, h, now);
      }
    }
    // 넘침 번쩍 — 초당 3회 미만(광과민)
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,70,70,${0.45 * flash})`;
      ctx.fillRect(tx, ty, tw, th);
    }
    ctx.restore();

    // 유리관 테두리·눈금
    ctx.lineWidth = 3;
    ctx.strokeStyle = flash > 0 ? `rgba(255,120,120,${0.6 + 0.4 * flash})` : 'rgba(220,235,255,0.75)';
    roundRect(ctx, tx, ty, tw, th, r);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, tx + 5, ty + 8, Math.max(4, tw * 0.1), th - 16, 4);
    ctx.fill();
    if (!s.mode.uniform) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      for (const q of [0.25, 0.5, 0.75]) {
        const yy = ty + th - pad - innerH * q;
        ctx.beginPath();
        ctx.moveTo(tx + tw - (q === 0.5 ? 16 : 10), yy);
        ctx.lineTo(tx + tw, yy);
        ctx.stroke();
      }
      // 4·5학년: 남은 양(소수) — 6학년·숫자로만에선 감춘다
      if (s.grade !== 6 && tank.fill > 0) {
        const left = ONE - tank.fill;
        ctx.font = `700 ${Math.round(clamp(L.tubeW * 0.2, 12, 26))}px ${FONT}`;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`남은 ${trimDec(left)}`, x, ty - 4);
      }
    }
    // 1 표시(통 꼭대기)
    ctx.font = `800 ${Math.round(clamp(tw * 0.22, 12, 28))}px ${FONT}`;
    ctx.fillStyle = '#ffe58a';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', tx - 5, ty + pad);
    ctx.fillStyle = 'rgba(255,229,138,0.7)';
    ctx.fillRect(tx - 3, ty + pad - 1, 6, 2);

    // 로켓(발사 중이면 그 자리는 비었다가 아래에서 올라온다)
    const rise = (now - this.riseAt[i]) / 420;
    if (rise >= 0) {
      const off = rise < 1 ? (1 - EASE_OUT(rise)) * L.rocketH : 0;
      ctx.save();
      ctx.beginPath();
      ctx.rect(L.playX + L.colW * i, L.rocketTop - 40, L.colW, L.rocketH + 34);
      ctx.clip();
      this.drawRocket(this.rocketImg[i], x, L.padY - 6 + off, L.rocketH, 0);
      ctx.restore();
    }
  }

  private drawFuel(p: Cell, x: number, y: number, w: number, h: number, now: number): void {
    const { ctx } = this;
    const st = NOTATION_STYLE[p.kind];
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, st.deep);
    g.addColorStop(0.45, st.fill);
    g.addColorStop(1, st.deep);
    ctx.fillStyle = g;
    roundRect(ctx, x, y + 1, w, Math.max(2, h - 2), Math.min(10, h / 3));
    ctx.fill();
    // 출렁 거품
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const bob = Math.sin(now / 260 + p.id) * 1.5;
    ctx.fillRect(x + 4, y + 3 + bob, w - 8, 2);
    // 분수는 두 줄이라 칸이 23px 는 돼야 읽힌다(그보다 얇은 0.05 칸은 «남은» 숫자로 읽는다)
    if (h >= (p.kind === 'frac' ? 23 : 16)) this.drawLabel(p, x + w / 2, y + h / 2, Math.min(h * 0.62, w * (p.kind === 'frac' ? 0.9 : 0.6)), st.ink, w - 4, h - 4);
  }

  /** 분수는 언제나 위아래로(3 위에 4) 쌓아 쓴다 — 아이들이 교과서에서 보는 모양. 빗금(3/4) 금지.
   *  maxW·maxH 를 주면 그 안에 들어가게 글자를 줄인다(작은 칸에서도 빗금으로 바꾸지 않는다). */
  drawLabel(c: Cell, cx: number, cy: number, size: number, ink: string, maxW = Infinity, maxH = Infinity): void {
    const { ctx } = this;
    size = clamp(size, 11, 64);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (c.kind === 'frac') {
      const [n, d] = c.label.split('/');
      let fs = Math.min(size * 0.62, maxH / 2.5);
      ctx.font = `900 ${Math.round(fs)}px ${FONT}`;
      const tw = Math.max(ctx.measureText(n).width, ctx.measureText(d).width);
      if (tw + 6 > maxW) fs *= (maxW - 6) / tw;
      fs = Math.max(9, fs);
      ctx.font = `900 ${Math.round(fs)}px ${FONT}`;
      const bw = Math.max(ctx.measureText(n).width, ctx.measureText(d).width) + 6;
      const bar = Math.max(2, Math.round(fs * 0.13));
      ctx.fillText(n, cx, cy - fs * 0.6);
      ctx.fillText(d, cx, cy + fs * 0.64);
      ctx.fillRect(cx - bw / 2, cy - bar / 2, bw, bar);
    } else {
      let fs = Math.min(size * 0.78, maxH * 0.9);
      ctx.font = `900 ${Math.round(fs)}px ${FONT}`;
      const tw = ctx.measureText(c.label).width;
      if (tw + 6 > maxW) fs = Math.max(9, fs * (maxW - 6) / tw);
      ctx.font = `900 ${Math.round(fs)}px ${FONT}`;
      ctx.fillText(c.label, cx, cy + 1);
    }
  }

  private drawFalling(now: number, dt: number): void {
    const s = this.sim!;
    const { ctx, L } = this;
    if (!s.cur) return;
    const tx = L.colX[s.col];
    this.hoverX += (tx - this.hoverX) * Math.min(1, dt / 70);
    const c = s.cur;
    const h = this.cellH(c);
    const w = Math.min(L.tubeW * 1.05, L.colW * 0.9);
    const y = this.fallingY();
    // 떨어질 길 안내 빛
    const beam = ctx.createLinearGradient(0, y + h, 0, L.tubeTop);
    beam.addColorStop(0, 'rgba(255,255,255,0.16)');
    beam.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = beam;
    ctx.fillRect(this.hoverX - w * 0.32, y + h, w * 0.64, Math.max(0, L.tubeTop - y - h));
    this.drawCellCard(c, this.hoverX, y, w, h, now);
    // 바닥선 가까워지면 깜빡 경고
    if (s.curY > 0.75) {
      ctx.strokeStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(now / 90)})`;
      ctx.lineWidth = 3;
      roundRect(ctx, this.hoverX - w / 2 - 4, y - 4, w + 8, h + 8, 14);
      ctx.stroke();
    }
  }

  drawCellCard(c: Cell, cx: number, y: number, w: number, h: number, now: number): void {
    const { ctx } = this;
    const st = NOTATION_STYLE[c.kind];
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, st.fill);
    g.addColorStop(1, st.deep);
    ctx.fillStyle = g;
    roundRect(ctx, cx - w / 2, y, w, h, Math.min(14, h / 2.5));
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(20,12,30,0.85)';
    roundRect(ctx, cx - w / 2, y, w, h, Math.min(14, h / 2.5));
    ctx.stroke();
    // 표기 모양 표식 — 색만으로 구분하지 않는다(색각 이상 · 저대비 패널)
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `800 ${Math.round(clamp(w * 0.13, 11, 18))}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    if (h > 40) ctx.fillText(st.tag, cx - w / 2 + 6, y + 4);
    const size = Math.min(Math.max(h, 34) * 0.7, w * (c.kind === 'frac' ? 0.9 : 0.6));
    if (h < 34) {
      // 아주 얇은 칸(0.05)은 글자를 칸 위에 띄운다 — 분수도 쌓은 모양 그대로
      const fs = clamp(w * 0.2, 14, 34);
      const lh = c.kind === 'frac' ? fs * 2.5 : fs;
      this.drawLabel(c, cx, y - 4 - lh / 2, fs / (c.kind === 'frac' ? 0.62 : 0.78), '#fff', w * 1.2, lh);
    } else {
      this.drawLabel(c, cx, y + h / 2, size, st.ink, w - 8, h - 6);
    }
    void now;
  }

  private drawFlies(now: number): void {
    const L = this.L;
    this.flies = this.flies.filter((f) => now - f.t0 < 170);
    for (const f of this.flies) {
      const k = EASE_OUT((now - f.t0) / 170);
      const x = f.fromX + (L.colX[f.col] - f.fromX) * k;
      const y = f.fromY + (L.tubeTop - f.fromY) * k;
      const h = this.cellH(f.cell) * (1 - k * 0.6);
      this.ctx.globalAlpha = 1 - k * 0.7;
      this.drawCellCard(f.cell, x, y, L.tubeW, h, now);
      this.ctx.globalAlpha = 1;
    }
  }

  private drawLaunches(now: number): void {
    const L = this.L;
    const { ctx } = this;
    this.launches = this.launches.filter((a) => now - a.t0 < 1300);
    for (const a of this.launches) {
      const t = (now - a.t0) / 1100;
      const x = L.colX[a.col];
      const y = L.padY - 6 - EASE_IN(Math.min(1, t)) * (L.padY + L.rocketH);
      const wob = Math.sin(now / 30) * 1.5 * (1 - Math.min(1, t));
      // 불꽃
      if (!this.lowFx && Math.random() < 0.9) {
        this.parts.push({ x: x + (Math.random() - 0.5) * L.rocketH * 0.12, y: y + 2, vx: (Math.random() - 0.5) * 60, vy: 160 + Math.random() * 120, life: 420, max: 420, size: 4 + Math.random() * 6, color: Math.random() < 0.5 ? '#ffd166' : '#ff7a3d', kind: 'spark' });
      }
      const fl = L.rocketH * (0.35 + 0.15 * Math.sin(now / 40));
      const g = ctx.createLinearGradient(0, y, 0, y + fl);
      g.addColorStop(0, 'rgba(255,240,170,0.95)');
      g.addColorStop(0.5, 'rgba(255,140,40,0.75)');
      g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x + wob, y + fl / 2, L.rocketH * 0.09, fl / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      this.drawRocket(a.img, x + wob, y, L.rocketH, 0);
    }
  }

  drawRocket(idx: number, cx: number, bottomY: number, h: number, rot: number): void {
    const { ctx } = this;
    const img = art.rockets[idx];
    ctx.save();
    ctx.translate(cx, bottomY);
    ctx.rotate(rot);
    if (img) {
      const sc = h / img.height;
      ctx.drawImage(img, (-img.width * sc) / 2, -h, img.width * sc, h);
    } else {
      // 그림이 없을 때(불러오기 실패)만 쓰는 대체 로켓
      const w = h * 0.36;
      ctx.fillStyle = ['#ff5b5b', '#4f8bff', '#3fd18b', '#a66bff', '#ff9f43'][idx % 5];
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.quadraticCurveTo(w * 0.7, -h * 0.7, w / 2, -h * 0.18);
      ctx.lineTo(-w / 2, -h * 0.18);
      ctx.quadraticCurveTo(-w * 0.7, -h * 0.7, 0, -h);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, -h * 0.58, w * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawParticles(dt: number): void {
    const { ctx } = this;
    const k = dt / 1000;
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * k;
      p.y += p.vy * k;
      if (p.kind === 'drop' || p.kind === 'spark') p.vy += 520 * k;
      if (p.kind === 'smoke') { p.vx *= 0.97; p.vy *= 0.97; p.size += 18 * k; }
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const p of this.parts) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = p.kind === 'smoke' ? a * 0.45 : a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawFloaters(now: number): void {
    const { ctx, L } = this;
    this.floaters = this.floaters.filter((f) => now - f.t0 < f.dur);
    for (const f of this.floaters) {
      const t = (now - f.t0) / f.dur;
      if (t < 0) continue;
      ctx.globalAlpha = 1 - Math.max(0, t - 0.6) / 0.4;
      ctx.font = `900 ${Math.round(clamp(L.tubeW * 0.3, 18, 56) * f.size)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(10,8,30,0.85)';
      const y = f.y - EASE_OUT(t) * 60;
      ctx.strokeText(f.text, f.x, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, y);
    }
    ctx.globalAlpha = 1;
  }

  private drawDoki(now: number): void {
    const d = art.doki;
    const L = this.L;
    if (!d || !L.wide) return;
    if (now > this.doki.until) this.doki.anim = 'idle';
    const anims = d.atlas.meta.anims ?? {};
    const want = this.doki.anim === 'cheer' ? 'attack' : this.doki.anim === 'dance' ? 'walk' : 'idle';
    // 리그 아틀라스의 애니 이름은 «캐릭터id_동작»(doki_idle) — 접두어가 없던 옛 이름도 받는다
    const pick = (n: string) => anims[`doki_${n}`] ?? anims[n];
    const frames = pick(want) ?? pick('idle') ?? Object.keys(d.atlas.frames);
    if (!frames.length) return;
    const fi = Math.floor(now / 90) % frames.length;
    const fr = d.atlas.frames[frames[fi]]?.frame;
    if (!fr) return;
    const h = Math.min(L.rocketH * 1.9, L.sideW * 1.1);
    const w = (fr.w / fr.h) * h;
    const cx = L.sideW / 2 + 8;
    const shakeX = this.doki.anim === 'oops' ? Math.sin(now / 25) * 5 : 0;
    const hop = this.doki.anim === 'dance' ? Math.abs(Math.sin(now / 140)) * 14 : 0;
    this.ctx.drawImage(d.img, fr.x, fr.y, fr.w, fr.h, cx - w / 2 + shakeX, L.padY - h - hop, w, h);
  }
}

export const FONT = 'system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif';

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function trimDec(v: number): string {
  return (v / ONE).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
