/**
 * 그림 불러오기 — 경로는 assets/manifest.json 하나가 정본(코드에 파일명을 박지 않는다).
 * 배경은 판에 들어갈 때만 불러온다(첫 로드 2MB 예산).
 */
export interface Manifest {
  rockets: string[];
  backgrounds: Record<string, string>;
  planets: string[];
  doki?: { image: string; atlas: string };
  logo?: string;
}

export interface DokiAtlas {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
  meta: { anims?: Record<string, string[]> };
}

const cache = new Map<string, Promise<HTMLImageElement | null>>();
const loaded = new Set<string>();
/** 실제로 디코드까지 끝난 그림 주소들(스모크 누수 검사) */
export const loadedImageKeys = (): string[] => [...loaded];

export function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (!cache.has(url)) {
    cache.set(url, new Promise((res) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { loaded.add(url); res(img); };
      img.onerror = () => res(null);
      img.src = url;
    }));
  }
  return cache.get(url)!;
}

export class Art {
  manifest: Manifest | null = null;
  rockets: (HTMLImageElement | null)[] = [];
  bg = new Map<string, HTMLImageElement | null>();
  planets: (HTMLImageElement | null)[] = [];
  doki: { img: HTMLImageElement; atlas: DokiAtlas } | null = null;

  async init(): Promise<void> {
    try {
      this.manifest = (await (await fetch('assets/manifest.json')).json()) as Manifest;
    } catch {
      return;
    }
    const m = this.manifest;
    this.rockets = await Promise.all(m.rockets.map((u) => loadImage(u)));
    // 도키 아틀라스(1.2MB)는 첫 화면을 막지 않게 뒤에서 — 넓은 화면(옆 패널)에서만 그린다
    // 🔴 지금 도키 리그는 Firefly 3D 가 유리 헬멧을 납작한 두건으로 만들고 얼굴을 뭉갰다(2026-10-13 «왼쪽 사람 얼굴 왜 저래»)
    //    — 헬멧 없는 원화로 다시 리그할 때까지 그리지 않는다. 다시 켜기 = DOKI_READY 를 true 로
    const DOKI_READY = false;
    const dk = DOKI_READY ? m.doki : undefined;
    if (dk) {
      void Promise.all([
        loadImage(dk.image),
        fetch(dk.atlas).then((r) => r.json() as Promise<DokiAtlas>).catch(() => null),
      ]).then(([img, atlas]) => { if (img && atlas) this.doki = { img, atlas }; });
    }
    void Promise.all(m.planets.map((u) => loadImage(u))).then((p) => (this.planets = p));
  }

  async background(key: string): Promise<HTMLImageElement | null> {
    if (this.bg.has(key)) return this.bg.get(key)!;
    const u = this.manifest?.backgrounds[key];
    const img = u ? await loadImage(u) : null;
    this.bg.set(key, img);
    return img;
  }
}

export const art = new Art();
