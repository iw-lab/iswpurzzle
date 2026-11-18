// @gb-ime-guard v2 — 판 동안 한글(IME) 입력기를 비켜 가게 한다(키보드로 하는 게임 · 2026-11-12 콩콩 둘이서·피아노길 «A·S 쪽이 안 눌러진다»).
// 정본 = ~/.claude/skills/game-builder/kit/ime-guard/ime-guard.js — 게임마다 복사(내용 수정 금지).
// 왜: 맥 크롬이 한글 입력 상태면 A·S·D·W·E 키의 keydown 이 페이지에 아예 안 온다(F·G·H·K·L 은 옴 — 2026-11-09 실기기). 코드로 «자모 → 키» 를 되짚을 사건 자체가 없다.
// 어떻게: 판 동안 화면 밖 «비밀번호 칸»에 포커스를 둔다 — 운영체제가 비밀번호 칸에서는 입력기를 끄고 영문 자판으로 넘긴다(보안 입력). keydown 은 그 칸에서 window 로 올라와 게임 리스너가 그대로 받는다.
//   · 칸에 글자가 안 쌓이게 매번 비운다 · 저장 제안이 안 뜨게 autocomplete=new-password · 터치 기기는 건드리지 않는다(화면 자판이 올라온다)
//   · 판이 아닐 때(멈춤·창·이야기·문제)는 포커스를 돌려준다 — 그 화면의 입력칸·단추가 정상으로 돈다
//   import { createImeGuard } from './kit/ime-guard.js';
//   const IME = createImeGuard({ host: document.querySelector('#play'), active: () => !play.hidden && pausedAt == null });
//   IME.sync();   // 판을 열 때·멈춤/이어하기·판이 끝날 때 한 번씩(그 사이는 키·누름마다 스스로 맞춘다)
// v2(2026-11-13 색종이 팡팡 «iCloud 암호 자동 완성 창이 HUD 를 덮는다»): 비밀번호 칸에 포커스를 두면 맥 크롬·사파리가
//   «암호 자동 완성» 창을 띄운다 → 한글 입력기 흔적이 보인 기기에서만 칸을 쓴다. 흔적 = keydown/keyup 의 isComposing·keyCode 229·
//   key 'Process'·한글 글자 · keydown 없이 온 글자 keyup(입력기가 keydown 을 삼켰다). 한 번 보이면 그 기기에 기억(gb.ime=1).
//   force(시험)·lazy:false(옛 동작)면 처음부터 켠다.
export const IME_GUARD_VERSION = 2;
const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;
const MEMO = 'gb.ime';
export function imeEvidence(e, downCodes) {
  if (!e) return false;
  if (e.isComposing || e.keyCode === 229 || e.key === 'Process') return true;
  if (typeof e.key === 'string' && e.key.length === 1 && HANGUL.test(e.key)) return true;
  if (e.type === 'keyup' && downCodes && /^Key[A-Z]$/.test(e.code || '') && !downCodes.has(e.code)) return true;
  return false;
}
const OVERLAYS = ['#gb-layer', '.sheet-wrap', '.gbs', '[role="dialog"]'];

export function isDesktopKeyboard(g = globalThis) {
  try { return !!g.matchMedia && g.matchMedia('(hover: hover) and (pointer: fine)').matches && !(g.navigator?.maxTouchPoints > 0); } catch { return false; }
}
export function createImeGuard({ host, active, doc = globalThis.document, g = globalThis, force = false, lazy = true } = {}) {
  if (!doc || typeof active !== 'function') throw new Error('ime-guard: active()');
  const on = force || isDesktopKeyboard(g);
  let armed = force || !lazy;
  try { if (g.localStorage?.getItem(MEMO) === '1') armed = true; } catch { /* 저장 막힘 */ }
  const el = doc.createElement('input');
  el.type = 'password'; el.autocomplete = 'new-password'; el.tabIndex = -1; el.setAttribute('aria-label', '게임 키 입력'); el.setAttribute('data-gb-ime', ''); el.setAttribute('data-lpignore', 'true'); el.setAttribute('data-1p-ignore', ''); el.setAttribute('autocapitalize', 'off'); el.setAttribute('spellcheck', 'false');
  el.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;padding:0;border:0;margin:0;opacity:0;pointer-events:none;font-size:16px;caret-color:transparent;outline:0';
  if (on) (host || doc.body).appendChild(el);
  const shown = (e) => { if (!e || e.hidden || e.closest?.('[hidden]')) return false; const r = e.getBoundingClientRect?.(); return !r || (r.width > 0 && r.height > 0); };
  const blocked = () => OVERLAYS.some((s) => [...doc.querySelectorAll(s)].some((e) => !e.contains(el) && shown(e)));
  const want = () => { try { return on && armed && !!active() && !blocked(); } catch { return false; } };
  function sync() {
    if (!on) return false;
    const w = want();
    if (w && doc.activeElement !== el) { try { el.focus({ preventScroll: true }); } catch { /* 떼어진 칸 */ } }
    else if (!w && doc.activeElement === el) el.blur();
    return w;
  }
  if (on) {
    el.addEventListener('input', () => { el.value = ''; });
    const downs = new Set();
    const arm = () => { if (armed) return; armed = true; try { g.localStorage?.setItem(MEMO, '1'); } catch { /* */ } };
    g.addEventListener('keydown', (e) => { if (e.code) downs.add(e.code); if (imeEvidence(e, null)) arm(); sync(); }, true);   // 포커스를 잃었으면 이 키부터 되찾는다(다음 키는 영문으로 온다)
    g.addEventListener('keyup', (e) => { if (imeEvidence(e, downs)) { arm(); sync(); } downs.delete(e.code); }, true);
    g.addEventListener('blur', () => downs.clear());
    g.addEventListener('pointerup', () => g.setTimeout(sync, 0), true);   // 단추를 누르면 포커스가 옮겨 간다 → 되찾는다
    g.addEventListener('focus', () => g.setTimeout(sync, 0));
    doc.addEventListener('fullscreenchange', () => g.setTimeout(sync, 0));
  }
  return { el, on, sync, want, get armed() { return armed; }, destroy() { el.remove(); } };
}
