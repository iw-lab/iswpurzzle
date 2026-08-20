/**
 * 수학 모드 콘텐츠 — 분수·소수·백분율 동치.
 *
 * 설계 의도:
 * 이 게임의 융합 규칙은 "인접한 4개가 **같은 key**"다. 기본 모드에서 key는 색이지만,
 * key를 '값'으로 바꾸면 규칙 자체가 학습 목표가 된다 —
 * **"보기엔 다른데 값이 같으면 합쳐진다"가 곧 동치(equivalence) 개념**이다.
 *
 * 교육과정 연계(2022 개정, 초등):
 *  - 5학년: 분수의 크기 비교, 분수와 소수의 관계
 *  - 6학년: 비와 비율, 백분율
 *
 * ⚠️ 1/3·2/3은 일부러 뺐다 — 0.333…은 순환소수라 초등 범위에서
 * "값이 같다"를 정확히 말할 수 없다. 유한소수로 떨어지는 것만 쓴다.
 */
import type { BlockColor } from "../types";

export interface EquivalenceClass {
  /** 매칭 기준이 되는 동치류 id. 같은 id끼리만 융합된다. */
  id: string;
  /** 색 힌트를 켰을 때 이 동치류에 배정되는 색. */
  color: BlockColor;
  /** 사람이 읽는 대표 표기 (융합 피드백에 쓴다). */
  canonical: string;
  /** 이 값을 나타내는 표기들. 분수·소수·백분율이 섞여 있다. */
  forms: {
    fraction: string[];
    decimal: string[];
    percent: string[];
  };
}

/**
 * 난이도 순서대로 나열한다 — 앞쪽일수록 먼저 등장한다.
 * 1/2 · 1/4 · 3/4 는 5학년이 이미 감각적으로 아는 값이라 앞에 둔다.
 */
export const EQUIVALENCE_CLASSES: EquivalenceClass[] = [
  {
    id: "half",
    color: "red",
    canonical: "1/2",
    forms: { fraction: ["1/2", "2/4", "5/10"], decimal: ["0.5"], percent: ["50%"] },
  },
  {
    id: "quarter",
    color: "blue",
    canonical: "1/4",
    forms: { fraction: ["1/4", "2/8"], decimal: ["0.25"], percent: ["25%"] },
  },
  {
    id: "three_quarters",
    color: "green",
    canonical: "3/4",
    forms: { fraction: ["3/4", "6/8"], decimal: ["0.75"], percent: ["75%"] },
  },
  {
    id: "one_fifth",
    color: "yellow",
    canonical: "1/5",
    forms: { fraction: ["1/5", "2/10"], decimal: ["0.2"], percent: ["20%"] },
  },
  {
    id: "three_fifths",
    color: "purple",
    canonical: "3/5",
    forms: { fraction: ["3/5", "6/10"], decimal: ["0.6"], percent: ["60%"] },
  },
  {
    id: "one_tenth",
    color: "cyan",
    canonical: "1/10",
    forms: { fraction: ["1/10"], decimal: ["0.1"], percent: ["10%"] },
  },
];

/** 색 힌트를 껐을 때 모든 블록이 쓰는 중립색 — 값을 읽어야만 매칭할 수 있다. */
export const MATH_NEUTRAL_COLOR: BlockColor = "blue";

/** 표기 문자열 → 동치류 id. 매칭은 이 표를 통과한 key로만 판단한다. */
export const CLASS_ID_BY_FORM: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const c of EQUIVALENCE_CLASSES) {
    for (const form of [...c.forms.fraction, ...c.forms.decimal, ...c.forms.percent]) {
      map[form] = c.id;
    }
  }
  return map;
})();

export const CLASS_BY_ID: Record<string, EquivalenceClass> = Object.fromEntries(
  EQUIVALENCE_CLASSES.map((c) => [c.id, c]),
);

/**
 * 레벨별로 등장하는 동치류 수. 색 상한(6)과 같은 축을 쓴다.
 * 4개로 시작하는 이유는 기본 모드와 같다 — 첫 판에서 반드시 융합을 경험시킨다.
 */
export function getClassCountForLevel(level: number): number {
  if (level >= 12) return 6;
  if (level >= 6) return 5;
  return 4;
}

export function getClassesForLevel(level: number): EquivalenceClass[] {
  return EQUIVALENCE_CLASSES.slice(0, getClassCountForLevel(level));
}

/**
 * 레벨별로 허용하는 표기 형식.
 * 백분율은 6학년 내용이라 레벨 4부터 섞는다 — 처음부터 3형식이 다 나오면
 * 5학년이 읽지 못하는 표기에 막힌다.
 */
export function getFormsForLevel(level: number): ("fraction" | "decimal" | "percent")[] {
  if (level >= 4) return ["fraction", "decimal", "percent"];
  return ["fraction", "decimal"];
}

/** 동치류 하나에서 레벨에 맞는 표기 하나를 뽑는다. */
export function pickForm(
  cls: EquivalenceClass,
  level: number,
  rand: () => number,
): string {
  const kinds = getFormsForLevel(level).filter((k) => cls.forms[k].length > 0);
  const kind = kinds[Math.floor(rand() * kinds.length)];
  const pool = cls.forms[kind];
  return pool[Math.floor(rand() * pool.length)];
}

/** 융합 피드백 문구: "1/2 = 0.5 = 50%" */
export function equivalenceSummary(classId: string): string {
  const c = CLASS_BY_ID[classId];
  if (!c) return "";
  return [c.forms.fraction[0], c.forms.decimal[0], c.forms.percent[0]]
    .filter(Boolean)
    .join(" = ");
}
