/**
 * 딱 1 로켓 — 화면 흐름(홈 → 관문 → 판 → 결과). 규칙은 src/core, 그림은 src/render, 여기는 잇기만 한다.
 */
import './gb/gb-ui.css';
import './style.css';
import { configureHub } from './gb/hubnet.js';
import { configureSchool, mountSchoolRank, refreshSchoolRank, gbGate, gbFinish, gbLeave, type GbResult } from './gb/gb-school.js';
import { bindFullscreenButton } from './gb/gb-fullscreen.js';
import { renderModeCards, setModeBest, renderModeBar, fmtClock, type GbMode } from './gb/gb-modes.js';
import { Sim, type SimEvent } from './core/sim.ts';
import { makeMode, goalText, LEVELS, PLANETS, type ModeId } from './core/modes.ts';
import { hashSeed } from './core/rng.ts';
import { ONE, parseLabel, sumLabel, type Cell, type Grade } from './core/values.ts';
import { fracHTML } from './frac.js';
import { View } from './render/view.ts';
import { columnAt } from './render/layout.ts';
import { art, loadedImageKeys } from './render/assets.ts';
import { audio } from './audio/audio.ts';
import { loadSave, writeSave, todayKey, yesterdayKey } from './save.ts';
import { canvasToPage, fireHeart, fireLaunch, fireMulti, fireOverflow } from './gb/juice-fx.ts';
// @ts-expect-error — 스킬 공용 측정기(순수 JS). ?perf=1 일 때만 켜진다(실기기 P95)
import { startPerfProbe } from './perf-p95.js';
import { icon } from './icons.ts';

// 정적 화면의 아이콘 자리(data-ic) — 이모지 대신 SVG
for (const el of document.querySelectorAll<HTMLElement>('[data-ic]')) el.innerHTML = icon(el.dataset.ic ?? '');

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const save = loadSave();
audio.on = save.sound;

const canvas = $<HTMLCanvasElement>('stage');
const view = new View(canvas);

type Screen = 'home' | 'game';
let sim: Sim | null = null;
let modeId: ModeId = 'time';
let level = 0;
let ticket: string | null = null;
let paused = false;
let last = performance.now();
let lastSecond = -1;
let bannerTimer = 0;
let hintShown = false;
/** 모둠 릴레이 상태 — 이름 입력 없음(1번~6번) */
let relay: { n: number; i: number; scores: (number | null)[]; seed: number } | null = null;

const GRADE_DESC: Record<Grade, string> = {
  4: '4학년 — 0.1 단위 소수와 분모 10인 분수 (같은 분모 덧셈)',
  5: '5학년 — 1/2 · 1/4 · 1/5 · 0.25 … 약분 안 된 2/4 · 6/10도 나와요',
  6: '6학년 — 분수 · 소수 · 백분율(25%)을 섞어 더해요',
};

const CARDS: GbMode[] = [
  { id: 'classic', kind: 'classic', icon: icon('rocket'), label: '발사 임무', desc: '행성 8곳 · 40단계 임무' },
  { id: 'survival', kind: 'survival', icon: icon('heart'), label: '끝없는 우주', desc: '하트 3개 · 점점 빨라져요' },
  { id: 'rule', kind: 'rule', icon: icon('hash'), label: '숫자로만', desc: '칸 크기·눈금 없이 90초' },
  { id: 'big', kind: 'big', icon: icon('ufo'), label: '대형 발사장', desc: '로켓 8대 · 120초' },
];

// ── 기본틀(학교 순위 · 이용권 · 전체화면) ──
configureHub({ key: 'ttak1-rocket.hub.v1', offline: document.querySelector('meta[name="gb-hub"]')?.getAttribute('content') === 'off' });
configureSchool({ playWord: '발사', sfx: { tick: () => audio.play('click'), win: () => audio.play('ticket') } });
mountSchoolRank($('schoolRank'));
bindFullscreenButton($('btnFull'));
bindFullscreenButton($('btnFullGame'));
renderModeCards($('modeGrid'), CARDS, (id) => {
  audio.unlock();
  audio.play('select');
  if (id === 'classic') openMissions();
  else play(id as ModeId);
});

function play(id: ModeId, lv = 0): void {
  // 시작 단추 클릭 «안에서 바로» 관문을 부른다 — 자동 전체화면은 사용자 제스처 안에서만 된다
  void gbGate((ref) => {
    ticket = ref;
    startGame(id, lv);
  }, { kind: id });
}

function finishTicket(cleared: boolean): void {
  const ref = ticket;
  ticket = null;
  void gbFinish(ref, cleared).then(schoolToast);
}

function leaveTicket(): void {
  const ref = ticket;
  ticket = null;
  void gbLeave(ref).then(schoolToast);
}

function schoolToast(r: GbResult | null): void {
  if (r && r.added > 0 && r.school) toast(`${r.school} +${r.added}점`);
}

// ── 화면 전환 ──
function setScreen(s: Screen): void {
  $('home').classList.toggle('hidden', s !== 'home');
  $('game').classList.toggle('hidden', s !== 'game');
  for (const id of ['pause', 'result', 'missions', 'relay', 'turn', 'settings']) $(id).classList.add('hidden');
}

function showHome(): void {
  sim = null;
  view.sim = null;
  relay = null;
  setScreen('home');
  audio.setTrack('menu');
  $('btnGrade').textContent = `학년 ${save.grade}`;
  const d = save.daily;
  $('btnDaily').innerHTML = icon('calendar') + ' ' + (d.last === todayKey() ? `오늘 완료 · ${d.streak}일째` : d.streak > 0 && d.last === yesterdayKey() ? `오늘의 발사 · ${d.streak}일째` : '오늘의 발사');
  const grid = $('modeGrid');
  const b = save.best;
  setModeBest(grid, 'classic', save.cleared >= 0 ? `${Math.min(LEVELS, save.cleared + 1)}/${LEVELS} 단계` : '');
  setModeBest(grid, 'survival', b.survival ? `최고 ${b.survival}대` : '');
  setModeBest(grid, 'rule', b.rule ? `최고 ${b.rule.toLocaleString()}점` : '');
  setModeBest(grid, 'big', b.big ? `최고 ${b.big.toLocaleString()}점` : '');
  $('btnPlay').innerHTML = icon('play') + ' ' + (b.time ? `60초 발사 대회 · 최고 ${b.time.toLocaleString()}` : '60초 발사 대회');
  void refreshSchoolRank();
}

function bgFor(id: ModeId, lv: number): string {
  if (id === 'classic') return ['bg_moon', 'bg_mars', 'bg_earth'][Math.floor(lv / 5) % 3];
  if (id === 'survival') return 'bg_mars';
  if (id === 'rule') return 'bg_moon';
  return 'bg_earth';
}

function seedFor(id: ModeId): number {
  if (id === 'daily') return hashSeed(`ttak1:${todayKey()}:${save.grade}`);
  if (id === 'relay' && relay) return relay.seed;
  return (Math.random() * 2 ** 31) >>> 0;
}

function startGame(id: ModeId, lv = 0): void {
  audio.unlock();
  modeId = id;
  level = lv;
  const mode = makeMode(id, lv);
  sim = new Sim(mode, { grade: save.grade, seed: seedFor(id) });
  view.attach(sim, bgFor(id, lv));
  paused = false;
  lastSecond = -1;
  setScreen('game');
  $('score').textContent = '0';
  $('combo').classList.add('hidden');
  $('banner').classList.add('hidden');
  $('countdown').classList.add('hidden');
  const g = $('goal');
  g.classList.toggle('hidden', !mode.goal);
  if (mode.goal) g.textContent = `${PLANETS[Math.floor(lv / 5)]} ${(lv % 5) + 1}단계 · ${goalText(mode.goal)} 0/${mode.goal.n}`;
  $('turnTag').classList.toggle('hidden', !relay);
  if (relay) $('turnTag').textContent = `${relay.i + 1}번`;
  hintShown = !save.hintSeen || id === 'rule';
  $('hint').innerHTML = id === 'rule'
    ? '칸 크기와 눈금이 없어요 — <b>숫자를 읽고</b> 더해서<br />합이 <b>딱 1</b>이 되는 로켓을 톡!'
    : '떨어지는 칸을 보고 <b>로켓을 톡!</b><br />통의 합이 <b>딱 1</b>이 되면 발사!';
  $('hint').classList.toggle('hidden', !hintShown);
  audio.setTrack('play');
  audio.play('start');
  layoutDom();
  updateTray();
  updateBar();
}

// ── 입력 ──
canvas.addEventListener('pointerdown', (e) => {
  audio.unlock();
  if (!sim || paused || sim.over || !e.isPrimary) return;
  const col = columnAt(view.L, e.clientX);
  if (col >= 0) sim.drop(col);
});

const KEY_COL: Record<string, number> = {};
for (let i = 1; i <= 8; i++) {
  KEY_COL[`Digit${i}`] = i - 1;
  KEY_COL[`Numpad${i}`] = i - 1;
}
// e.code 로 판정한다 — 교실 PC 는 한글 상태로 켜져 있어 e.key 는 «ㄱ»이 된다
window.addEventListener('keydown', (e) => {
  audio.unlock();
  if (!sim || sim.over) return;
  if (e.code === 'Escape' || e.code === 'KeyP') { togglePause(); e.preventDefault(); return; }
  if (paused) return;
  if (e.code in KEY_COL) sim.drop(KEY_COL[e.code]);
  else if (e.code === 'ArrowLeft' || e.code === 'KeyA') sim.move(-1);
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') sim.move(1);
  else if (e.code === 'ArrowDown' || e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyS') sim.hardDrop();
  else if (e.code === 'KeyC' || e.code === 'ShiftLeft' || e.code === 'ArrowUp' || e.code === 'KeyW') doHold();
  else return;
  e.preventDefault();
});

// 창을 떠나면 멈춘다(누른 키가 붙어 있거나 시간이 혼자 흐르지 않게)
window.addEventListener('blur', () => { if (sim && !sim.over && !paused) togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && sim && !sim.over && !paused) togglePause(); });
window.addEventListener('resize', () => { view.resize(); layoutDom(); });

$('holdBox').addEventListener('pointerdown', (e) => { e.preventDefault(); doHold(); });
function doHold(): void {
  if (!sim || paused) return;
  if (sim.swapHold()) audio.play('hold');
  else audio.play('click', { rate: 0.7, vol: 0.4 });
  updateTray();
}

$('btnPause').addEventListener('click', togglePause);
$('btnResume').addEventListener('click', togglePause);
$('btnQuit').addEventListener('click', quitGame);
$('btnQuit2').addEventListener('click', quitGame);
function togglePause(): void {
  if (!sim || sim.over) return;
  paused = !paused;
  $('pause').classList.toggle('hidden', !paused);
  last = performance.now();
}
function quitGame(): void {
  if (sim && !sim.over) leaveTicket();
  audio.play('click');
  showHome();
}

// ── 판 진행 ──
/** 시뮬은 고정 스텝(1/120초)으로 돈다 — 화면이 8fps 로 떨어져도 60초 판은 60초다(입력 계약 §2 프레임률 독립) */
const STEP = 1000 / 120;
let acc = 0;
function frame(now: number): void {
  const raw = now - last;
  last = now;
  // 탭 전환 뒤 첫 프레임처럼 큰 공백은 250ms 로 자른다(그동안은 visibilitychange 가 이미 멈춰 둔다)
  const dt = Math.min(50, raw);
  if (sim && !paused && !sim.over) {
    acc += Math.min(250, raw);
    while (acc >= STEP && !sim.over) {
      sim.step(STEP);
      acc -= STEP;
    }
    for (const ev of sim.drainEvents()) onEvent(ev, now);
    updateBar();
  } else {
    acc = 0;
    if (sim) for (const ev of sim.drainEvents()) onEvent(ev, now);
  }
  view.draw(now, paused ? 0 : dt);
  requestAnimationFrame(frame);
}

function onEvent(ev: SimEvent, now: number): void {
  view.handle(ev, now);
  const s = sim!;
  switch (ev.type) {
    case 'spawn':
      updateTray();
      break;
    case 'pour':
      audio.play('pour', { rate: 0.85 + (ev.fill / ONE) * 0.5, vol: 0.7 });
      updateTray();
      break;
    case 'launch': {
      // 🎮 반응(주스) — audio.play(ignite/launch)·audio.combo 를 직접 부르지 않고 fire 로 옮겼다(중복 소리 방지)
      const lp = canvasToPage(view.canvas, view.L.colX[ev.col] ?? innerWidth / 2, view.L.rocketTop);
      fireLaunch(ev.combo, ev.kinds, { x: lp.x, y: lp.y, punch: '#score' });
      const sc = $('score');
      sc.textContent = s.score.toLocaleString();
      sc.classList.remove('bump');
      void sc.offsetWidth;
      sc.classList.add('bump');
      const cb = $('combo');
      cb.classList.toggle('hidden', ev.combo < 2);
      cb.textContent = `콤보 ${ev.combo}`;
      if (ev.multi >= 2) {
        fireMulti({ x: lp.x, y: lp.y, title: ev.multi >= 3 ? '트리플 발사!!' : '더블 발사!' });
        banner(ev.multi >= 3 ? '트리플 발사!!' : '더블 발사!', ev.equation, 'good', 1100);
      } else banner('딱 1!', ev.equation, 'good', 700);
      if (hintShown) {
        hintShown = false;
        $('hint').classList.add('hidden');
        save.hintSeen = true;
      }
      break;
    }
    case 'overflow': {
      // 🎮 반응(주스) — audio.play('overflow') 를 fire 로 옮겼다
      const op = canvasToPage(view.canvas, view.L.colX[ev.col] ?? innerWidth / 2, view.L.tubeTop);
      fireOverflow({ x: op.x, y: op.y });
      $('combo').classList.add('hidden');
      // 넘친 식을 1.6초 보여 준다(오답 각인 D-5) — 표기를 소수로 바꾼 식도 함께
      // 이미 소수뿐인 식이면 같은 식을 두 번 쓰지 않고 넘친 양만 말한다
      const left = ev.equation.split(' = ')[0];
      const dec = left.split(' + ').map((p) => sumLabel(parseLabel(p))).join(' + ');
      const over = `1보다 ${sumLabel(ev.total - 100)} 커요`;
      // 줄바꿈은 «+» 사이에서만(« = 1.4»가 혼자 다음 줄로 떨어지지 않게)
      const eq = ev.equation.replace(' = ', '\u00a0=\u00a0');
      banner(`넘쳤어요!\n${eq}`, dec === left ? over : `${dec} = ${sumLabel(ev.total)} → ${over}`, 'bad', 1600);
      if (ev.heartsLeft != null) audio.play('lose', { vol: 0.5 });
      break;
    }
    case 'heart':
      fireHeart({ title: '하트 +1' }); // 🎮 반응(주스) — audio.play('heart') 를 fire 로 옮겼다
      toast('하트 +1');
      break;
    case 'goal': {
      const g = s.mode.goal!;
      $('goal').textContent = `${PLANETS[Math.floor(level / 5)]} ${(level % 5) + 1}단계 · ${goalText(g)} ${ev.done}/${ev.need}`;
      break;
    }
    case 'end':
      setTimeout(() => endGame(), ev.reason === 'goal' ? 900 : 500);
      break;
    case 'idle':
      audio.play('click', { rate: 0.6, vol: 0.35 });
      break;
    case 'hold':
    case 'move':
      break;
  }
}

function banner(title: string, sub: string, cls: 'good' | 'bad', ms: number): void {
  const b = $('banner');
  b.className = `banner ${cls} pop`;
  b.innerHTML = `${mathHtml(title).replace(/\n/g, '<br>')}${sub ? `<small>${mathHtml(sub)}</small>` : ''}`;
  clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => b.classList.add('hidden'), ms);
}

function updateBar(): void {
  const s = sim;
  if (!s) return;
  const parts: Parameters<typeof renderModeBar>[1] = [];
  const left = s.leftMs;
  if (left != null) {
    parts.push({ type: 'time', ms: left, urgent: left <= 10_000 });
    const sec = Math.ceil(left / 1000);
    if (sec !== lastSecond) {
      lastSecond = sec;
      if (left <= 10_000 && left > 0) audio.setTrack('hurry');
      const cd = $('countdown');
      if (sec <= 5 && sec > 0 && !s.over) {
        cd.classList.remove('hidden');
        cd.textContent = String(sec);
        audio.play('countdown', { vol: 0.6 });
      } else cd.classList.add('hidden');
    }
  }
  if (s.hearts != null) parts.push({ type: 'hearts', left: s.hearts, max: s.mode.hearts ?? 3 });
  parts.push({ type: 'text', text: `발사 ${s.launches}`, html: `${icon('rocket')}<span class="sr">발사</span> ${s.launches}` });
  renderModeBar($('modeBar'), parts);
}

function cellHtml(c: Cell | null, cls = ''): string {
  if (!c) return '';
  const inner = c.kind === 'frac' ? `<span class="fr"><span>${c.label.split('/')[0]}</span><span>${c.label.split('/')[1]}</span></span>` : esc(c.label);
  return `<span class="mini ${c.kind} ${cls}">${inner}</span>`;
}

function updateTray(): void {
  const s = sim;
  if (!s) return;
  const hold = $('holdCell');
  hold.outerHTML = s.hold ? cellHtml(s.hold).replace('class="mini', 'id="holdCell" class="mini') : '<span id="holdCell" class="mini empty">비었음</span>';
  $('holdBox').classList.toggle('locked', s.holdLocked);
  $('next1').outerHTML = cellHtml(s.queue[0]).replace('class="mini', 'id="next1" class="mini') || '<span id="next1" class="mini"></span>';
  $('next2').outerHTML = cellHtml(s.queue[1], 'small').replace('class="mini', 'id="next2" class="mini') || '<span id="next2" class="mini small"></span>';
}

/** DOM 오버레이 자리 — 레이아웃 계산과 같은 숫자(캔버스 기둥과 겹치지 않게) */
function layoutDom(): void {
  const L = view.L;
  const tray = $('tray');
  if (L.wide) {
    tray.style.flexDirection = 'column';
    // zoom 이 걸린 상자는 left/top 도 확대 배율로 나눠야 제자리다
    const z = parseFloat(getComputedStyle(tray).zoom || '1') || 1;
    tray.style.left = `${Math.max(10, L.sideW / 2 - 90 * z) / z}px`;
    tray.style.top = `${L.spawnTop / z}px`;
    tray.style.transform = '';
  } else {
    tray.style.flexDirection = 'row';
    tray.style.left = '50%';
    tray.style.transform = 'translateX(-50%)';
    tray.style.top = `${L.hudH + 4}px`;
  }
  $('goal').style.top = `${L.wide ? L.hudH + 4 : L.spawnTop + 2}px`;
  $('combo').style.top = `${L.spawnTop + 4}px`;
  // 🔴 안내는 로켓 자리에 — 낙하 영역에 두면 첫 칸을 통째로 가렸다(2026-10-13 폰 세로 제보 «안보여용»)
  $('hint').style.top = `${L.rocketTop + L.rocketH * 0.12}px`;
  // 배너는 떨어지는 칸·연료통을 가리면 안 된다 — 넓은 화면은 오른쪽 빈 패널, 좁은 화면은 맨 위 «보관·다음» 줄 위
  const root = document.documentElement.style;
  if (L.wide && L.sideW >= 300) {
    root.setProperty('--banner-left', `${L.w - L.sideW / 2}px`);
    root.setProperty('--banner-top', `${L.spawnTop + L.spawnH}px`);
    root.setProperty('--banner-max', `${L.sideW - 12}px`);
    root.setProperty('--banner-fs', `${Math.round(Math.min(L.h * 0.046, L.sideW / 8.5))}px`);
  } else {
    root.setProperty('--banner-left', '50%');
    // 세로 화면은 맨 위가 «다음» 칸 미리보기라(1.6초 가리면 계획을 못 한다) 아래 로켓 줄 위로
    root.setProperty('--banner-top', `${L.wide ? L.hudH + 2 : Math.min(L.rocketTop + 4, L.h - 120)}px`);
    root.setProperty('--banner-max', '94vw');
    root.removeProperty('--banner-fs');
  }
}

// ── 판 끝 ──
function endGame(): void {
  const s = sim;
  if (!s || !s.over) return;
  if ($('result').classList.contains('hidden') === false) return;
  save.played++;
  save.totalLaunches += s.launches;
  for (const k of ['frac', 'dec', 'pct'] as const) save.weak[k] += s.weak[k];
  const id = modeId;
  const score = id === 'survival' ? s.launches : s.score;
  const prev = save.best[id] ?? 0;
  const isBest = score > prev;
  if (isBest && id !== 'classic' && id !== 'relay') save.best[id] = score;
  let title = '판 끝!';
  if (id === 'classic') {
    title = s.cleared ? '임무 성공!' : '시간이 다 됐어요';
    if (s.cleared) save.cleared = Math.max(save.cleared, level);
  } else if (id === 'daily') {
    const t = todayKey();
    if (save.daily.last !== t) {
      save.daily.streak = save.daily.last === yesterdayKey() ? save.daily.streak + 1 : 1;
      save.daily.last = t;
    }
    save.daily.best = Math.max(save.daily.best, score);
    title = `오늘의 발사 · ${save.daily.streak}일째`;
  } else if (id === 'survival') title = '하트를 다 썼어요';
  writeSave(save);

  // 등재 포털 규격: 단일 정수 점수 + 부모 창 알림(외부 등재 게임 연동 훅)
  const durationMs = Math.round(s.t);
  (window as unknown as { __gameScore: unknown }).__gameScore = { score: s.score, durationMs, version: 1 };
  try { window.opener?.postMessage({ type: 'game:score', score: s.score, durationMs }, '*'); } catch { /* 다른 출처 */ }

  if (relay) {
    relay.scores[relay.i] = s.score;
    finishRelayTurn();
    return;
  }
  finishTicket(id === 'classic' ? s.cleared : true);
  audio.play(s.cleared || isBest || id === 'time' ? 'win' : 'lose', { vol: 0.8 });
  audio.setTrack('menu');

  $('resTitle').textContent = title;
  $('resScore').textContent = id === 'survival' ? `${s.launches}대 발사` : `${s.score.toLocaleString()}점`;
  $('resBest').textContent = id === 'classic' ? '' : isBest && prev > 0 ? `새 최고 기록! (전 ${prev.toLocaleString()})` : prev > 0 ? `내 최고 ${prev.toLocaleString()} · ${Math.max(0, prev - score + 1).toLocaleString()} 더 하면 신기록` : '첫 기록!';
  $('resStats').innerHTML = [
    ['발사', s.launches], ['섞어 채우기', s.mixLaunches], ['최고 콤보', s.bestCombo], ['넘침', s.overflows],
  ].map(([k, v]) => `<div><b>${v}</b>${k}</div>`).join('');
  const rv = s.overflowLog.slice(-3);
  $('resReview').innerHTML = rv.length
    ? `<div class="rv-head">넘쳤던 식 다시 보기</div>${rv.map((e) => {
      const [l, r] = e.split(' = ');
      const dec = l.split(' + ').map((p) => sumLabel(parseLabel(p))).join(' + ');
      return `<div class="rv">${mathHtml(l)} = ${esc(r)}<small>${esc(dec)} = ${esc(r)} → 1보다 ${esc(String(Number(r) - 1 > 0 ? (Math.round((Number(r) - 1) * 100) / 100) : 0))} 많아요</small></div>`;
    }).join('')}`
    : '<div class="rv-head">한 번도 안 넘쳤어요!</div>';
  const again = $('btnAgain');
  again.textContent = id === 'classic' ? (s.cleared && level < LEVELS - 1 ? '다음 단계' : '다시 도전') : '다시 하기';
  $('result').classList.remove('hidden');
}

$('btnAgain').addEventListener('click', () => {
  audio.play('select');
  $('result').classList.add('hidden');
  const next = modeId === 'classic' && sim?.cleared && level < LEVELS - 1 ? level + 1 : level;
  play(modeId, next);
});
$('btnHome').addEventListener('click', () => { audio.play('click'); showHome(); });

// ── 발사 임무(행성 8 × 5단계) ──
function openMissions(): void {
  const list = $('planetList');
  const nextLv = Math.min(LEVELS - 1, save.cleared + 1);
  list.innerHTML = PLANETS.map((name, p) => {
    const img = art.manifest?.planets[p] ?? '';
    const btns = Array.from({ length: 5 }, (_, s) => {
      const lv = p * 5 + s;
      const cls = lv <= save.cleared ? 'done' : lv === nextLv ? 'next' : '';
      return `<button data-lv="${lv}" class="${cls}" ${lv > nextLv ? 'disabled' : ''} aria-label="${name} ${s + 1}단계">${s + 1}</button>`;
    }).join('');
    return `<div class="planet">${img ? `<img src="${img}" alt="" />` : ''}<span class="pname">${name}</span><div class="stages">${btns}</div></div>`;
  }).join('');
  $('missions').classList.remove('hidden');
}
$('planetList').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button[data-lv]') as HTMLButtonElement | null;
  if (!b || b.disabled) return;
  audio.play('select');
  $('missions').classList.add('hidden');
  play('classic', Number(b.dataset.lv));
});
$('btnMissionsClose').addEventListener('click', () => $('missions').classList.add('hidden'));

// ── 오늘의 발사 ──
$('btnDaily').addEventListener('click', () => { audio.unlock(); audio.play('select'); play('daily'); });
$('btnPlay').addEventListener('click', () => { audio.unlock(); audio.play('select'); play('time'); });

// ── 모둠 릴레이(핫시트 · 서버 0) ──
let relayN = 4;
$('btnRelay').addEventListener('click', () => {
  audio.unlock();
  audio.play('select');
  renderRelayCount();
  $('relay').classList.remove('hidden');
});
function renderRelayCount(): void {
  $('relayCount').innerHTML = [2, 3, 4, 5, 6].map((n) => `<button data-n="${n}" class="${n === relayN ? 'on' : ''}">${n}명</button>`).join('');
}
$('relayCount').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button[data-n]') as HTMLElement | null;
  if (!b) return;
  relayN = Number(b.dataset.n);
  renderRelayCount();
});
$('btnRelayClose').addEventListener('click', () => $('relay').classList.add('hidden'));
$('btnRelayGo').addEventListener('click', () => {
  audio.play('select');
  void gbGate((ref) => {
    ticket = ref;
    relay = { n: relayN, i: 0, scores: Array(relayN).fill(null), seed: (Math.random() * 2 ** 31) >>> 0 };
    $('relay').classList.add('hidden');
    showTurn();
  }, { kind: 'relay' });
});
function relayTableHtml(): string {
  if (!relay) return '';
  return relay.scores.map((sc, i) => `<div class="${i === relay!.i ? 'me' : ''}">${i + 1}번<b>${sc == null ? (i < relay!.i ? '쉼' : '—') : sc.toLocaleString()}</b></div>`).join('');
}
function showTurn(): void {
  if (!relay) return;
  sim = null;
  view.sim = null;
  setScreen('home');
  $('home').classList.add('hidden');
  $('turnWho').textContent = `${relay.i + 1}번 차례`;
  $('turnTable').innerHTML = relayTableHtml();
  $('turn').classList.remove('hidden');
  audio.setTrack('menu');
}
$('btnTurnGo').addEventListener('click', () => {
  audio.play('start');
  $('turn').classList.add('hidden');
  startGame('relay');
});
$('btnTurnSkip').addEventListener('click', () => {
  if (!relay) return;
  audio.play('click');
  relay.scores[relay.i] = null;
  nextTurn();
});
function finishRelayTurn(): void {
  audio.play('win', { vol: 0.6 });
  nextTurn();
}
function nextTurn(): void {
  if (!relay) return;
  relay.i++;
  if (relay.i < relay.n) { showTurn(); return; }
  // 전원 점수를 나란히 — 1등만 띄우지 않고 꼴찌를 강조하지 않는다
  const total = relay.scores.reduce<number>((a, b) => a + (b ?? 0), 0);
  save.relayBest = Math.max(save.relayBest, total);
  writeSave(save);
  finishTicket(true);
  setScreen('home');
  $('home').classList.add('hidden');
  $('resTitle').textContent = '모둠 릴레이 끝!';
  $('resScore').textContent = `모둠 합계 ${total.toLocaleString()}점`;
  $('resBest').textContent = save.relayBest === total ? '우리 모둠 최고 기록!' : `모둠 최고 ${save.relayBest.toLocaleString()}`;
  $('resStats').innerHTML = '';
  $('resReview').innerHTML = `<div class="relay-table">${relay.scores.map((sc, i) => `<div>${i + 1}번<b>${sc == null ? '쉼' : sc.toLocaleString()}</b></div>`).join('')}</div>`;
  $('btnAgain').textContent = '한 바퀴 더';
  modeId = 'relay';
  relay = null;
  $('result').classList.remove('hidden');
  audio.play('win');
}
// «한 바퀴 더»는 릴레이 설정 화면으로
$('btnAgain').addEventListener('click', (e) => {
  if (modeId !== 'relay') return;
  e.stopImmediatePropagation();
  audio.play('select');
  $('result').classList.add('hidden');
  renderRelayCount();
  $('relay').classList.remove('hidden');
}, true);

// ── 설정 ──
function renderSettings(): void {
  $('gradeSeg').innerHTML = ([4, 5, 6] as Grade[]).map((g) => `<button data-g="${g}" class="${g === save.grade ? 'on' : ''}">${g}학년</button>`).join('');
  // 🔴 학년 설명에 «1/2 · 1/4» 가 빗금 그대로 찍혔다(실측 — check-fraction-display 게이트) — 쌓아 그린다.
  $('gradeDesc').innerHTML = fracHTML(GRADE_DESC[save.grade]);
  $('btnSound').innerHTML = save.sound ? `${icon('sound')} 켜짐` : `${icon('mute')} 꺼짐`;
  const w = save.weak;
  const tot = w.frac + w.dec + w.pct;
  const worst = (['frac', 'dec', 'pct'] as const).reduce((a, b) => (w[a] >= w[b] ? a : b));
  const name = { frac: '분수', dec: '소수', pct: '백분율' }[worst];
  $('weakCard').innerHTML = tot
    ? `<b>내 약점</b> · 지금까지 넘친 칸 ${tot}번 중 <b>${name}</b>가 ${w[worst]}번이에요. 게임이 ${name} 칸을 조금 더 자주 내 줄 거예요.`
    : '아직 넘친 적이 없어요. 넘친 칸의 표기를 모아 «내 약점»을 보여 줘요.';
}
$('btnSettings').addEventListener('click', () => { audio.unlock(); audio.play('click'); renderSettings(); $('settings').classList.remove('hidden'); });
$('btnGrade').addEventListener('click', () => { audio.unlock(); audio.play('click'); renderSettings(); $('settings').classList.remove('hidden'); });
$('gradeSeg').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button[data-g]') as HTMLElement | null;
  if (!b) return;
  save.grade = Number(b.dataset.g) as Grade;
  writeSave(save);
  audio.play('select');
  renderSettings();
  $('btnGrade').textContent = `학년 ${save.grade}`;
});
$('btnSound').addEventListener('click', () => {
  save.sound = !save.sound;
  audio.setOn(save.sound);
  writeSave(save);
  renderSettings();
});
$('btnSettingsClose').addEventListener('click', () => $('settings').classList.add('hidden'));

// ── 공통 ──
let toastTimer = 0;
function toast(msg: string): void {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.add('hidden'), 2200);
}
/** 식 속 분수(3/20)를 위아래로 쌓은 모양으로 — 빗금 분수를 화면에 내지 않는다 */
function mathHtml(s: string): string {
  return esc(s).replace(/(\d+)\/(\d+)/g, '<span class="fr fi"><span>$1</span><span>$2</span></span>');
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
document.addEventListener('pointerdown', () => audio.unlock(), { capture: true });

// 시험·디버그용 훅(점수 위조와 무관 — 화면에 보이는 상태만 읽는다)
(window as unknown as { __ttak1: unknown }).__ttak1 = {
  get sim() { return sim; },
  get view() { return view; },
  fmtClock,
};

// ── 에셋 쇼룸(?showroom=1) — 게임보다 먼저 그림만 따로 본다(에셋 결함과 코드 결함을 가른다) ──
async function showroom(): Promise<void> {
  await art.init();
  const m = art.manifest;
  const box = document.createElement('div');
  box.id = 'showroom';
  box.style.cssText = 'position:fixed;inset:0;overflow:auto;z-index:50;background:#0b1030;padding:16px;display:flex;flex-wrap:wrap;gap:12px;align-content:flex-start';
  const tile = (src: string, label: string, h = 160) => `<figure style="margin:0;background:rgba(255,255,255,.06);border-radius:12px;padding:8px;text-align:center"><img src="${src}" style="height:${h}px;max-width:300px;object-fit:contain"/><figcaption style="font-size:12px">${label}</figcaption></figure>`;
  const cells = (['frac', 'dec', 'pct'] as const).map((k) => cellHtml({ v: 25, label: k === 'frac' ? '1/4' : k === 'dec' ? '0.25' : '25%', kind: k, id: 0 })).join(' '); // gb-frac-ok — cellHtml 이 이미 쌓아 그린다(쇼룸 전용 디버그 화면)
  box.innerHTML = [
    `<h2 style="width:100%;margin:0">딱 1 로켓 쇼룸 — manifest.json</h2>`,
    ...(m?.rockets ?? []).map((u, i) => tile(u, `로켓 ${i}`)),
    ...Object.entries(m?.backgrounds ?? {}).map(([k, u]) => tile(u, k, 120)),
    ...(m?.planets ?? []).map((u, i) => tile(u, `${PLANETS[i]}`, 80)),
    m?.doki ? tile(m.doki.image, '도키 리그 아틀라스', 200) : '<p>도키 리그 없음</p>',
    tile('assets/icon.png', '아이콘', 96),
    `<div style="width:100%;display:flex;gap:10px;align-items:center">표기 칸: ${cells}</div>`,
  ].join('');
  document.body.appendChild(box);
}

/** 스모크용 어댑터 — Canvas 게임이라 Phaser 등록부가 없다. 실제로 불러온 그림 수·살아 있는 연출 수를 그대로 보고한다(누수 검사) */
const smokeGame = {
  textures: { getTextureKeys: () => loadedImageKeys(), exists: (k: string) => loadedImageKeys().includes(k) },
  sound: { sounds: [] as unknown[] },
  scene: { scenes: [{ children: { list: [] as unknown[] }, tweens: { getTweens: () => new Array(view.parts.length + view.flies.length + view.launches.length + view.floaters.length) } }] },
};

// ── 스모크 계약(game-builder phaser-smoke · 2D 공용) — 관문 없이 코어를 직접 돌려 결정론·누수를 기계가 잰다 ──
const artReady = (new URLSearchParams(location.search).has('showroom') ? showroom() : art.init()).then(() => {
  const bg = art.manifest?.backgrounds.bg_earth;
  if (bg) $("home").style.setProperty("--home-bg", `url("${new URL(bg, location.href).href}")`);
});
(window as unknown as { __SMOKE__: unknown }).__SMOKE__ = {
  ready: artReady,
  game: smokeGame,
  get expectedTextures() { return art.manifest ? [...art.manifest.rockets] : []; },
  usesRng: true,
  hasScenes: true,
  sceneCount: 2,
  seed(n: number) {
    relay = null;
    modeId = 'time';
    sim = new Sim(makeMode('time'), { grade: save.grade, seed: n >>> 0 });
    view.attach(sim, 'bg_earth');
    setScreen('game');
  },
  step(ms: number) {
    if (!sim) return;
    sim.step(ms);
    for (const ev of sim.drainEvents()) onEvent(ev, performance.now());
  },
  hash() {
    const s = sim;
    if (!s) return 'none';
    return [s.t.toFixed(0), s.score, s.launches, s.overflows, s.tanks.map((t) => t.fill).join('.'), s.cur?.label ?? '-', s.queue.map((c) => c.label).join('.')].join('|');
  },
  cycleScene(i: number) {
    if (i % 2) showHome();
    else (window as unknown as { __SMOKE__: { seed(n: number): void } }).__SMOKE__.seed(1000 + i);
  },
};
startPerfProbe();
showHome();
// 스모크 페이지(허브 끔)에서만: ?autostart=time 이면 판을 바로 연다 — 입력 끝단 시험(e2e-input)이 게임 안에서 시작하게.
//   배포 페이지(index.html)는 허브가 켜져 있어 이 길이 없다(이용권 관문을 건너뛰지 않는다).
if (document.querySelector('meta[name="gb-hub"]')?.getAttribute('content') === 'off') {
  const auto = new URLSearchParams(location.search).get('autostart');
  if (auto) void artReady.then(() => startGame(auto as ModeId));
}
requestAnimationFrame((t) => { last = t; frame(t); });
