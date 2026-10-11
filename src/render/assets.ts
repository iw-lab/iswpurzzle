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

export function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (!cache.has(url)) {
    cache.set(url, new Promise((res) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res(img);
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
    if (m.doki) {
      const [img, atlas] = await Promise.all([
        loadImage(m.doki.image),
        fetch(m.doki.atlas).then((r) => r.json() as Promise<DokiAtlas>).catch(() => null),
      ]);
      if (img && atlas) this.doki = { img, atlas };
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
