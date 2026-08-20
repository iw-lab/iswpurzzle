/**
 * 수학 모드 — 융합 판정이 '색'이 아니라 '값'으로 이뤄지는지 고정한다.
 * 이 규칙이 곧 학습 목표(동치)라서, 깨지면 게임이 아니라 교재가 틀리는 것이다.
 */
import { describe, it, expect } from "vitest";
import { findFusionGroups, createEmptyBoard, matchKeyOf } from "./board";
import {
  EQUIVALENCE_CLASSES,
  CLASS_ID_BY_FORM,
  CLASS_BY_ID,
  getClassesForLevel,
  getFormsForLevel,
  pickForm,
  equivalenceSummary,
} from "../constants/mathContent";
import { seededRandom } from "./rng";
import type { Block, BlockColor, GameBoard } from "../types";

function put(
  board: GameBoard,
  x: number,
  y: number,
  label: string,
  color: BlockColor = "red",
): void {
  const block: Block = {
    id: `${x},${y}`,
    color,
    x,
    y,
    specialType: "normal",
    label,
    matchKey: CLASS_ID_BY_FORM[label],
  };
  board[y][x] = block;
}

describe("수학 모드 동치 매칭", () => {
  it("표기가 전부 달라도 값이 같으면 융합된다 (1/2 · 2/4 · 0.5 · 50%)", () => {
    const board = createEmptyBoard();
    ["1/2", "2/4", "0.5", "50%"].forEach((label, x) => put(board, x, 15, label));

    const groups = findFusionGroups(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(4);
  });

  it("색이 같아도 값이 다르면 융합되지 않는다 — 색은 힌트일 뿐이다", () => {
    const board = createEmptyBoard();
    // 전부 같은 색(red)이지만 값은 1/2, 1/4, 3/4, 1/5 로 제각각
    ["1/2", "1/4", "3/4", "1/5"].forEach((label, x) =>
      put(board, x, 15, label, "red"),
    );

    expect(findFusionGroups(board)).toHaveLength(0);
  });

  it("색이 전부 달라도 값이 같으면 융합된다 — 색 힌트를 꺼도 동작한다", () => {
    const board = createEmptyBoard();
    const colors: BlockColor[] = ["red", "blue", "green", "yellow"];
    ["1/2", "0.5", "50%", "5/10"].forEach((label, x) =>
      put(board, x, 15, label, colors[x]),
    );

    const groups = findFusionGroups(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(4);
  });

  it("3개까지는 터지지 않는다 (4매치 규칙 유지)", () => {
    const board = createEmptyBoard();
    ["1/2", "0.5", "50%"].forEach((label, x) => put(board, x, 15, label));
    expect(findFusionGroups(board)).toHaveLength(0);
  });

  it("matchKey가 없는 블록은 색이 키다 — 기본 모드가 그대로 동작한다", () => {
    const board = createEmptyBoard();
    for (let x = 0; x < 4; x++) {
      board[15][x] = {
        id: `p${x}`,
        color: "green",
        x,
        y: 15,
        specialType: "normal",
      };
    }
    expect(matchKeyOf(board[15][0]!)).toBe("green");
    expect(findFusionGroups(board)).toHaveLength(1);
  });
});

describe("수학 모드 콘텐츠 무결성", () => {
  it("한 표기는 정확히 하나의 동치류에만 속한다", () => {
    const seen = new Map<string, string>();
    for (const c of EQUIVALENCE_CLASSES) {
      for (const form of [
        ...c.forms.fraction,
        ...c.forms.decimal,
        ...c.forms.percent,
      ]) {
        expect(
          seen.has(form),
          `표기 "${form}"이 ${seen.get(form)}와 ${c.id} 양쪽에 있다`,
        ).toBe(false);
        seen.set(form, c.id);
      }
    }
  });

  it("모든 동치류가 분수·소수·백분율 표기를 하나 이상 갖는다", () => {
    for (const c of EQUIVALENCE_CLASSES) {
      expect(c.forms.fraction.length, c.id).toBeGreaterThan(0);
      expect(c.forms.decimal.length, c.id).toBeGreaterThan(0);
      expect(c.forms.percent.length, c.id).toBeGreaterThan(0);
    }
  });

  it("표기된 값이 실제로 서로 같다 — 교재가 틀리면 안 된다", () => {
    const parse = (s: string): number => {
      if (s.endsWith("%")) return parseFloat(s) / 100;
      if (s.includes("/")) {
        const [a, b] = s.split("/").map(Number);
        return a / b;
      }
      return parseFloat(s);
    };
    for (const c of EQUIVALENCE_CLASSES) {
      const values = [
        ...c.forms.fraction,
        ...c.forms.decimal,
        ...c.forms.percent,
      ].map(parse);
      for (const v of values) {
        expect(Math.abs(v - values[0]), `${c.id}: ${values.join(",")}`).toBeLessThan(1e-9);
      }
    }
  });

  it("순환소수(1/3 등)는 포함하지 않는다 — 초등 범위에서 동치를 말할 수 없다", () => {
    for (const form of Object.keys(CLASS_ID_BY_FORM)) {
      if (!form.includes("/") || form.endsWith("%")) continue;
      const [a, b] = form.split("/").map(Number);
      const decimal = a / b;
      // 유한소수인지: 소수점 아래 6자리 안에서 끝나야 한다
      expect(
        Math.abs(decimal * 1e6 - Math.round(decimal * 1e6)),
        `${form} = ${decimal}`,
      ).toBeLessThan(1e-9);
    }
  });

  it("색 힌트가 켜져 있을 때 동치류마다 색이 다르다", () => {
    const colors = EQUIVALENCE_CLASSES.map((c) => c.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("레벨이 오르면 동치류 수와 표기 형식이 단조 증가한다", () => {
    let prevClasses = 0;
    let prevForms = 0;
    for (let lv = 1; lv <= 30; lv++) {
      const classes = getClassesForLevel(lv).length;
      const forms = getFormsForLevel(lv).length;
      expect(classes).toBeGreaterThanOrEqual(prevClasses);
      expect(forms).toBeGreaterThanOrEqual(prevForms);
      prevClasses = classes;
      prevForms = forms;
    }
  });

  it("백분율은 레벨 4부터 나온다 (6학년 내용)", () => {
    expect(getFormsForLevel(1)).not.toContain("percent");
    expect(getFormsForLevel(3)).not.toContain("percent");
    expect(getFormsForLevel(4)).toContain("percent");
  });

  it("pickForm은 그 레벨에 허용된 표기만 낸다", () => {
    const rand = seededRandom(2026);
    for (let lv = 1; lv <= 20; lv++) {
      const allowed = new Set(
        getClassesForLevel(lv).flatMap((c) =>
          getFormsForLevel(lv).flatMap((k) => c.forms[k]),
        ),
      );
      for (let i = 0; i < 200; i++) {
        const cls = getClassesForLevel(lv)[i % getClassesForLevel(lv).length];
        const form = pickForm(cls, lv, rand);
        expect(allowed.has(form), `lv${lv}: ${form}`).toBe(true);
        expect(CLASS_ID_BY_FORM[form]).toBe(cls.id);
      }
    }
  });

  it("융합 피드백은 세 표기를 모두 보여준다", () => {
    const summary = equivalenceSummary("half");
    expect(summary).toBe("1/2 = 0.5 = 50%");
    expect(CLASS_BY_ID.half.canonical).toBe("1/2");
  });
});
