// 폰 가벼운 모드 — 2026-10-08 사용자 «모바일에서 왜 깜빡거리지? 모바일 최적화·UI 심플하게».
//
// 실측(412px·CPU 4배 감속 헤드리스): 홈 화면 3초에 DOM 스타일 변경 ~2,900회 · 무한 애니메이션 11개 · 흐림 레이어 6개.
// 폰 GPU 는 «흐림(backdrop/blur) 위에서 계속 움직이는 것»을 매 프레임 다시 구우며 프레임을 놓친다 → 깜빡임.
// 장식용 무한 반복은 폰에서 한 번만 돌고 멈춘다. 게임 동작(블록 이동·터짐)은 건드리지 않는다.
const mq = (q: string) => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(q).matches;

/** 터치 위주 기기(폰·태블릿)거나 '움직임 줄이기'를 켰다 */
export const LITE: boolean = mq('(hover: none) and (pointer: coarse)') || mq('(prefers-reduced-motion: reduce)');

/** 장식용 framer-motion 반복 횟수 — `repeat: LOOP`. 폰에선 0(한 번 재생 후 멈춤) */
export const LOOP: number = LITE ? 0 : Infinity;

if (typeof document !== 'undefined' && LITE) document.documentElement.classList.add('lite');
