/**
 * 반응(주스) 배선 — game-builder kit/juice/juice.js(@gb-juice). 내용 수정 금지, 이 파일만 게임마다 쓴다.
 * 🔒 tools/check-juice.mjs 가 이 파일의 JUICE 반응표 + fire 호출 전부를 읽는다.
 */
import { createJuice, type Juice } from './juice.js';
import { audio } from '../audio/audio.ts';
import { loadSave } from '../save.ts';

export const JUICE = {
  launch: ['sfx', 'combo', 'punch', 'flash'], // 로켓 발사(핵심 정답 행동)
  overflow: ['sfx', 'flash', 'pop'], // 넘침(실수)
  heart: ['sfx', 'pop', 'flash', 'haptic'], // 하트 획득
  multi: ['sfx', 'banner', 'flash', 'pop'], // 더블/트리플 발사
};

/** sfx 콜백은 action 이름만 받는다 — 콤보·섞인 종류 수는 fire() 직전에 여기 적어 둔다 */
let launchArgs = { combo: 0, kinds: 1 };
let J: Juice | null = null;

function juice(): Juice {
  if (!J) {
    J = createJuice({
      table: JUICE,
      host: document.body,
      haptics: () => loadSave().sound,
      sfx: (name) => {
        if (name === 'launch') {
          audio.play('ignite', { vol: 0.8 });
          audio.play('launch', { vol: 0.7 });
          if (launchArgs.combo >= 2) audio.combo(launchArgs.combo);
          if (launchArgs.kinds >= 2) audio.play('mix', { vol: 0.6 });
        } else if (name === 'overflow') audio.play('overflow');
        else if (name === 'heart') audio.play('heart');
        else if (name === 'multi') audio.play('double');
      },
    });
  }
  return J;
}

type FireOpts = Parameters<Juice['fire']>[1];

export function fireLaunch(combo: number, kinds: number, o?: FireOpts): void {
  launchArgs = { combo, kinds };
  juice().fire('launch', o);
}
export function fireOverflow(o?: FireOpts): void {
  juice().fire('overflow', o);
}
export function fireHeart(o?: FireOpts): void {
  juice().fire('heart', o);
}
export function fireMulti(o?: FireOpts): void {
  juice().fire('multi', o);
}

/** canvas 좌표(CSS px, view.L 가 쓰는 좌표계) → 뷰포트 좌표. gbj-layer 는 position:fixed */
export function canvasToPage(canvas: HTMLCanvasElement, x: number, y: number): { x: number; y: number } {
  const r = canvas.getBoundingClientRect();
  return { x: r.left + x, y: r.top + y };
}
