/**
 * 오디오 크레딧 — public/audio/CREDITS.md 와 같은 내용을 앱 안에서 보여주기 위한 데이터.
 *
 * BGM은 CC BY 계열이라 **표기가 라이선스 의무**다(무료 규칙 §1).
 * 새 오디오를 추가하면 free-audio.sh credits 를 다시 돌리고 여기에도 반영할 것.
 */
export interface AudioCredit {
  works: string;
  author: string;
  license: string;
  url: string;
}

export const AUDIO_CREDITS: AudioCredit[] = [
  {
    works: "효과음 전체 (18종)",
    author: "Kenney",
    license: "CC0 (표기 불필요)",
    url: "https://kenney.nl/assets",
  },
  {
    works: "BGM — 타이틀",
    author: "suonho",
    license: "CC BY 4.0",
    url: "https://freesound.org/people/suonho/sounds/56364",
  },
  {
    works: "BGM — 플레이 / 후반",
    author: "frankum",
    license: "CC BY 4.0",
    url: "https://freesound.org/people/frankum/sounds/344494",
  },
  {
    works: "BGM — 피버",
    author: "Creeper_Ciller78",
    license: "CC BY 3.0",
    url: "https://freesound.org/people/Creeper_Ciller78/sounds/346895",
  },
];
