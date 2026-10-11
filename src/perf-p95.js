/**
 * perf-p95.js — 프레임 시간 P95 측정기 (실기기용 · **엔진 무관**)
 *
 * Phaser 2D · Three.js 3D · 순수 Canvas 어디서나 쓴다. rAF 만 있으면 된다.
 *
 * 🔴 headless 스모크는 **구조**만 증명한다. 성능 합격 판정은 이 파일로 **실기기에서** 한다.
 *    SwiftShader fps 는 모바일 GPU 의 대리값이 아니다.
 *
 * 붙이는 법 (게임 어디서든 한 줄):
 *     import { startPerfProbe } from './perf-p95.js';
 *     startPerfProbe();                       // ?perf=1 일 때만 켜진다
 *
 * 재는 법:
 *   1. 폰에서 게임을 열되 URL 뒤에 `?perf=1` 을 붙인다
 *   2. **최악 장면**(기획서 §1-9 에 문장으로 고정한 그 장면)을 만든다
 *   3. 그 상태로 20초 이상 논다 — 오버레이의 P95 를 읽는다
 *   4. 화면을 탭하면 결과가 클립보드로 복사된다(기기명·해상도·DPR 포함)
 *
 * 판정: P95 ≤ 16.7ms (60fps 목표) / ≤ 33.3ms (30fps 목표).
 *   ⚠️ **평균 fps 로 판정하지 마라** — 평균 60fps 여도 P95 가 40ms 면 사람은 "끊긴다"고 느낀다.
 *
 * 🔴 **값은 vsync 배수로 스냅된다** — 16.7 / 33.3 / 50.0 …. rAF 콜백이 vsync 경계에서만 오기 때문이다.
 *    실측: 프레임의 20%에 **40ms 부하**를 주입했더니 P95 는 40 이 아니라 **33.4** 로 나왔다
 *    (40ms 작업이 2 vsync 구간에 담긴다). 즉 이 숫자는 "얼마나 느린가"가 아니라
 *    **"어느 프레임 등급으로 떨어졌나"** 를 읽는 것이다. 33.4 = 상시 30fps 강등.
 *    → 원인의 크기를 재려면 P95 말고 프로파일러(롱태스크·JS 시간)를 봐라.
 *
 * 🔴 **롱태스크는 50ms 이상만 센다**(브라우저 규격). 위 실측에서 40ms 부하는 롱태스크 0 이었다 —
 *    "롱태스크 0" 이 "메인스레드가 한가하다"는 뜻이 아니다.
 *
 * 같은 계열 함정: 프레임 간격으로 원인을 단언하지 마라 — vsync 스냅 때문에 원인 상태
 * (강제 레이아웃 횟수·JS 시간)를 따로 재야 한다.
 */

const DEFAULTS = {
  param: 'perf',        // ?perf=1
  warmupMs: 3000,       // 초반 로딩·셰이더 컴파일 구간은 버린다
  windowSize: 3000,     // 최근 N 프레임만 유지(장시간 실행에서 메모리·왜곡 방지)
  overlay: true,
};

export function startPerfProbe(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  if (o.param && !new URLSearchParams(location.search).has(o.param)) return null;

  const times = [];
  let last = performance.now();
  let started = last;
  let longTasks = 0;

  // 롱태스크(50ms+ 메인스레드 점유)는 프레임 시간과 별개 신호다 — GC·디코드·레이아웃
  try {
    new PerformanceObserver((l) => { longTasks += l.getEntries().length; })
      .observe({ entryTypes: ['longtask'] });
  } catch { /* Safari 등 미지원 */ }

  const el = o.overlay ? makeOverlay() : null;

  function pct(sorted, p) {
    if (!sorted.length) return 0;
    // 최근접 순위법. 보간하지 않는다 — 표본이 적을 때 보간은 실제보다 좋게 보이게 만든다.
    const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[Math.max(0, i)];
  }

  function snapshot() {
    const s = [...times].sort((a, b) => a - b);
    const sum = s.reduce((a, b) => a + b, 0);
    return {
      frames: s.length,
      mean: s.length ? sum / s.length : 0,
      p50: pct(s, 50), p95: pct(s, 95), p99: pct(s, 99),
      worst: s.length ? s[s.length - 1] : 0,
      longTasks,
      device: navigator.userAgent,
      viewport: `${innerWidth}x${innerHeight}`,
      dpr: devicePixelRatio,
      elapsedSec: (performance.now() - started) / 1000,
    };
  }

  function tick(now) {
    const dt = now - last; last = now;
    if (now - started > o.warmupMs) {          // 워밍업 구간은 통계에 안 넣는다
      times.push(dt);
      if (times.length > o.windowSize) times.shift();
    }
    if (el && times.length % 15 === 0) render(el, snapshot());
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  const api = { snapshot, reset() { times.length = 0; longTasks = 0; started = performance.now(); } };
  window.__P95__ = api;                        // 도구·콘솔에서 읽을 수 있게
  return api;
}

function makeOverlay() {
  const el = document.createElement('div');
  el.setAttribute('data-perf-probe', '');
  el.style.cssText = [
    'position:fixed', 'left:8px', 'top:8px', 'z-index:2147483647',
    'font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace',
    'background:rgba(0,0,0,.82)', 'color:#e8eef5', 'padding:8px 10px',
    'border-radius:8px', 'pointer-events:auto', 'white-space:pre',
    'touch-action:none', 'user-select:none', 'max-width:70vw',
  ].join(';');
  el.textContent = '측정 준비…';
  el.addEventListener('click', async () => {
    const s = window.__P95__?.snapshot?.();
    if (!s) return;
    const text = JSON.stringify(s, null, 2);
    try { await navigator.clipboard.writeText(text); el.dataset.copied = '1'; }
    catch { console.log(text); }          // 클립보드 권한이 없으면 콘솔로
    setTimeout(() => delete el.dataset.copied, 1200);
  });
  document.body.appendChild(el);
  return el;
}

// 🔴 표본 부족을 «합격»으로 만들지 않는다.
//   빈 표본이면 p95=0 이고 0 ≤ 16.7 이라 예전엔 "✅ 60fps" 가 떴다 — **측정을 안 한 것이 최고 등급**이었다.
//   "위반 0"과 "검사 0"은 다르다. 미달이면 판정 자체를 거부한다.
const MIN_FRAMES = 120;   // 60fps 기준 약 2초분
const MIN_SEC = 3;
// 🔴 «목표»를 받아야 판정이 성립한다. 예전엔 목표와 무관하게 P95 33.3ms 를 ok:true 로 줘서
//   **60fps 목표 프로젝트가 30fps 로 떨어져도 초록**이었다. 등급 표시와 합격 판정은 다른 것이다.
//   그리고 문서는 20초 측정을 요구하는데 3초(워밍업 포함) 표본이 통과했다 — 최소 측정시간을 강제한다.
export function verdictOf(s, opt = {}) {
  const targetMs = opt.targetMs ?? 16.7;               // 기본 60fps 목표. 30fps 프로젝트는 33.3 을 넘길 것
  const minSec   = opt.minMeasureSec ?? 20;            // 문서 기준과 같은 값
  const minFrames = opt.minFrames ?? MIN_FRAMES;
  if (s.frames < minFrames || s.elapsedSec < minSec) {
    return { ok: false, incomplete: true,
      label: `⛔ 판정불가 (표본 ${s.frames}프레임/${s.elapsedSec.toFixed(0)}초 — 최소 ${minFrames}프레임·${minSec}초)` };
  }
  const grade = s.p95 <= 16.7 ? '60fps' : s.p95 <= 33.3 ? '30fps' : '미달';
  const ok = s.p95 <= targetMs;
  return { ok, incomplete: false,
    label: `${ok ? '✅' : '❌'} ${grade} (P95 ${s.p95.toFixed(1)}ms / 목표 ${targetMs}ms)` };
}

function render(el, s) {
  const ms = (v) => v.toFixed(1).padStart(5);
  const verdict = verdictOf(s).label;
  el.textContent =
    `${verdict}   (${s.frames}프레임 · ${s.elapsedSec.toFixed(0)}초)\n` +
    `P95 ${ms(s.p95)}ms   ← 판정은 이 값\n` +
    `P50 ${ms(s.p50)}ms   P99 ${ms(s.p99)}ms\n` +
    `평균${ms(s.mean)}ms   최악 ${ms(s.worst)}ms\n` +
    `롱태스크 ${s.longTasks}회 · DPR ${s.dpr}\n` +
    (el.dataset.copied ? '복사됨 ✓' : '탭하면 결과 복사');
}
