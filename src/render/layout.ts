/**
 * 화면 배치 — 렌더러·탭 판정·DOM HUD 가 같은 숫자를 쓴다(한 곳에서만 계산한다).
 * 단위는 CSS px. 전자칠판(1920×1080)·태블릿·폰 가로/세로를 한 식으로 덮는다.
 */
export interface Layout {
  w: number;
  h: number;
  tanks: number;
  /** 넓은 화면이면 왼쪽(보관함·다음·도키)과 오른쪽(모둠·기록) 패널을 쓴다 */
  wide: boolean;
  sideW: number;
  playX: number;
  playW: number;
  colW: number;
  colX: number[];
  hudH: number;
  spawnTop: number;
  spawnH: number;
  tubeTop: number;
  tubeH: number;
  tubeW: number;
  rocketTop: number;
  rocketH: number;
  padY: number;
  /** 떨어지는 칸 높이 배율(값 1 = tubeH × cellScale) — 모든 칸에 같은 배율이라 크기 비교가 살아 있다 */
  cellScale: number;
}

export function computeLayout(w: number, h: number, tanks: number): Layout {
  const wide = w / h > 1.3;
  const hudH = Math.round(Math.max(58, Math.min(h * 0.12, 132)));
  const sideW = wide ? Math.round(Math.min(w * 0.2, 380)) : 0;
  const maxPlay = tanks > 5 ? h * 1.75 : h * 1.2;
  const playW = Math.round(Math.min(w - sideW * 2 - 16, maxPlay));
  const playX = Math.round((w - playW) / 2);
  const colW = playW / tanks;
  const colX = Array.from({ length: tanks }, (_, i) => playX + colW * (i + 0.5));
  // 세로 화면은 위에 «보관함·다음» 줄이 들어간다
  const topExtra = wide ? 0 : Math.round(Math.min(96, h * 0.1));
  const top = hudH + topExtra + 6;
  const avail = h - top - 10;
  const spawnH = Math.round(avail * 0.24);
  const tubeH = Math.round(avail * 0.47);
  const rocketH = Math.round(avail * 0.24);
  const spawnTop = top;
  const tubeTop = spawnTop + spawnH;
  const rocketTop = tubeTop + tubeH + Math.round(avail * 0.02);
  // 세로 폰은 칸이 좁다(390px ÷ 5 = 78px) — 통을 칸의 80% 까지 넓혀 글자가 들어가게 한다
  const tubeW = Math.round(Math.min(colW * (wide ? 0.66 : 0.8), Math.max(150, h * 0.2)));
  const cellScale = Math.min(1, (spawnH * 0.92) / (tubeH * 0.9));
  return {
    w, h, tanks, wide, sideW, playX, playW, colW, colX, hudH,
    spawnTop, spawnH, tubeTop, tubeH, tubeW, rocketTop, rocketH, padY: rocketTop + rocketH, cellScale,
  };
}

/** 탭 x → 로켓 번호. 기둥 전체(위 낙하 영역부터 발사대까지)가 단추다(전자칠판: 넓을수록 좋다) */
export function columnAt(L: Layout, x: number): number {
  if (x < L.playX - L.colW * 0.15 || x > L.playX + L.playW + L.colW * 0.15) return -1;
  return Math.max(0, Math.min(L.tanks - 1, Math.floor((x - L.playX) / L.colW)));
}
