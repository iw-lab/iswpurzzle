/**
 * 값과 표기 — 딱1 로켓의 «문항».
 *
 * 값은 언제나 1/100 단위 정수(5 = 0.05)다. 부동소수(0.1+0.2)를 한 번도 거치지 않아야
 * «딱 1» 판정이 거짓말을 하지 않는다. 표기(분수·소수·백분율)는 같은 값의 다른 얼굴일 뿐이다.
 *
 * 1/3·1/7처럼 유한소수가 안 되는 값은 처음부터 만들 수 없다 — 분모를 100의 약수로만 둔다.
 */
export type Notation = 'frac' | 'dec' | 'pct';
export type Grade = 4 | 5 | 6;

export interface Cell {
  /** 1/100 단위 값(5~95) */
  v: number;
  label: string;
  kind: Notation;
  /** 판 안에서 칸마다 다른 번호(렌더·로그용) */
  id: number;
}

export const ONE = 100;

/** 학년별 «무작위로 낼 때» 쓰는 값(딱 1을 만드는 칸은 이 표 밖의 값도 될 수 있다) */
export const RANDOM_VALUES: Record<Grade, number[]> = {
  4: [10, 20, 30, 40, 50, 60, 70, 80, 90],
  5: [10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90],
  6: [10, 15, 20, 25, 30, 40, 45, 50, 60, 65, 70, 75, 80, 90],
};

/** 학년별 분모(전부 100의 약수) */
const DENOMS: Record<Grade, number[]> = {
  4: [10],
  5: [2, 4, 5, 10, 20],
  6: [2, 4, 5, 10, 20, 25, 50],
};

/** 학년별 표기 비율 — 6학년부터 백분율 */
export const NOTATION_WEIGHT: Record<Grade, Record<Notation, number>> = {
  4: { frac: 1, dec: 1, pct: 0 },
  5: { frac: 1.2, dec: 1, pct: 0 },
  6: { frac: 1, dec: 1, pct: 1 },
};

/** 값 하나의 분수 표기 후보 — 약분 안 된 꼴(2/4·6/10)도 일부러 섞는다(5학년 «약분과 통분») */
export function fractionForms(v: number, grade: Grade): string[] {
  const out: string[] = [];
  for (const d of DENOMS[grade]) {
    const n = (v * d) / ONE;
    if (Number.isInteger(n) && n > 0 && n < d) out.push(`${n}/${d}`);
  }
  // 4학년에서 0.5는 1/2로도 낸다(교과서에 1/2이 먼저 나온다)
  if (grade === 4 && v === 50) out.push('1/2');
  return out;
}

export function decimalLabel(v: number): string {
  const s = (v / ONE).toFixed(2);
  return s.replace(/0+$/, '').replace(/\.$/, '');
}

export function percentLabel(v: number): string {
  return `${v}%`;
}

/** 이 값을 이 학년에서 낼 수 있는 표기들 */
export function availableNotations(v: number, grade: Grade): Notation[] {
  const out: Notation[] = [];
  if (NOTATION_WEIGHT[grade].frac > 0 && fractionForms(v, grade).length) out.push('frac');
  // 4학년은 소수 한 자리만
  if (NOTATION_WEIGHT[grade].dec > 0 && (grade !== 4 || v % 10 === 0)) out.push('dec');
  if (NOTATION_WEIGHT[grade].pct > 0) out.push('pct');
  return out;
}

export function labelFor(v: number, kind: Notation, grade: Grade, pick: (n: number) => number): string {
  if (kind === 'dec') return decimalLabel(v);
  if (kind === 'pct') return percentLabel(v);
  const forms = fractionForms(v, grade);
  // 기약분수를 절반, 나머지 꼴을 절반 — 약분 안 된 꼴만 나오면 오히려 낯설다
  if (forms.length > 1 && pick(2) === 0) return reducedForm(v);
  return forms[pick(forms.length)];
}

export function reducedForm(v: number): string {
  const g = gcd(v, ONE);
  return `${v / g}/${ONE / g}`;
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

/** 표기 문자열 → 값(시험·봇이 «화면에 적힌 글자만 보고» 계산할 때 쓴다) */
export function parseLabel(label: string): number {
  if (label.endsWith('%')) return Number(label.slice(0, -1));
  if (label.includes('/')) {
    const [n, d] = label.split('/').map(Number);
    return (n * ONE) / d;
  }
  return Math.round(Number(label) * ONE);
}

/** 넘침 배너에 쓰는 합 — 1을 넘는 값도 소수로 정확히 */
export function sumLabel(v: number): string {
  const whole = Math.floor(v / ONE);
  const rest = v % ONE;
  if (!rest) return String(whole);
  return `${whole}.${String(rest).padStart(2, '0').replace(/0$/, '')}`;
}
