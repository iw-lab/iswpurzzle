import { useEffect, useMemo, useState } from "react";
import { BOARD_CONFIG } from "../constants";

/**
 * 보드 셀 크기의 단일 진실.
 *
 * GameBoard 안에만 있던 계산을 끌어냈다 — App의 모바일 홀드/넥스트 줄이
 * `max-w-[280px]` 라는 별개의 하드코딩 값을 쓰는 바람에 보드 폭과 어긋나
 * NEXT 패널이 보드 밖으로 튀어나왔다(390×844 실측).
 *
 * ⚠️ CHROME_HEIGHT: 보드 말고 세로를 차지하는 UI의 합.
 * 모바일에는 헤더 + 홀드/넥스트 + 스코어 바 + 파워업 바 + 터치 컨트롤이 다 있어서
 * 300px 가까이 먹는다. 예전에는 200px만 예약해서 16행 보드가 뷰포트를 넘고
 * **맨 아랫줄이 컨트롤에 가려 보이지 않았다** — 낙하 퍼즐에서 치명적이다.
 * 값을 바꿨으면 scripts/_measure.mjs 로 4개 화면 크기에서 겹침 0을 다시 확인할 것.
 */
const CHROME_HEIGHT = { mobile: 295, desktop: 210 };
const MOBILE_BREAKPOINT = 768;

export interface BoardMetrics {
  cellSize: number;
  boardWidth: number;
  boardHeight: number;
  isMobile: boolean;
}

export function useBoardMetrics(overrideCellSize?: number): BoardMetrics {
  const [viewport, setViewport] = useState(() =>
    typeof window === "undefined"
      ? { w: 400, h: 800 }
      : { w: window.innerWidth, h: window.innerHeight },
  );

  useEffect(() => {
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return useMemo(() => {
    const isMobile = viewport.w < MOBILE_BREAKPOINT;
    let cellSize = overrideCellSize;

    if (!cellSize) {
      const maxWidth = Math.min(viewport.w - 32, 450);
      const maxHeight =
        viewport.h - (isMobile ? CHROME_HEIGHT.mobile : CHROME_HEIGHT.desktop);
      // 하한 20px — 이보다 작으면 수학 모드의 블록 위 숫자를 읽을 수 없다.
      cellSize = Math.max(
        20,
        Math.min(
          Math.floor(maxWidth / BOARD_CONFIG.COLUMNS),
          Math.floor(maxHeight / BOARD_CONFIG.ROWS),
          isMobile ? 38 : 45,
        ),
      );
    }

    return {
      cellSize,
      boardWidth: cellSize * BOARD_CONFIG.COLUMNS,
      boardHeight: cellSize * BOARD_CONFIG.ROWS,
      isMobile,
    };
  }, [overrideCellSize, viewport]);
}
