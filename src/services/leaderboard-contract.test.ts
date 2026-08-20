/**
 * 리더보드 '계약' 테스트 — 클라이언트가 보내는 필드와 firestore.rules가
 * 허용하는 필드가 어긋나지 않는지 고정한다.
 *
 * ⚠️ 왜 필요한가(2026-08-20 실측): submitScore는 createdAt에 `Timestamp.now()`
 * (클라이언트 시계)를 넣는데 규칙은 `data.createdAt == request.time`(서버 시각)을
 * 요구했다. 두 값이 같을 리가 없으니 **원격 제출이 100% 거부**됐고,
 * try/catch가 조용히 삼켜서 겉으로는 "랭킹에 아무도 안 올라온다"로만 보였다.
 * 이런 종류의 불일치는 실제로 써 보기 전엔 드러나지 않으므로 여기서 잡는다.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const rules = readFileSync(resolve(root, "firestore.rules"), "utf8");
const service = readFileSync(resolve(root, "src/services/firebase.ts"), "utf8");

/** 규칙의 hasOnly([...]) 목록을 뽑아낸다. */
function hasOnlyKeys(fnName: string): string[] {
  const fn = rules.slice(rules.indexOf(`function ${fnName}(`));
  const start = fn.indexOf("hasOnly(");
  const chunk = fn.slice(start, fn.indexOf(")", fn.indexOf("]", start)));
  return [...chunk.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
}

describe("리더보드 계약", () => {
  it("rankings 제출 필드가 규칙의 허용 목록과 정확히 일치한다", () => {
    const allowed = hasOnlyKeys("isValidRanking");
    // submitScore가 실제로 보내는 것: RankingEntry(id 제외) + createdAt
    const sent = [
      "playerId",
      "playerName",
      "score",
      "level",
      "maxCombo",
      "maxChain",
      "gameMode",
      "playTime",
      "createdAt",
    ].sort();
    expect(allowed).toEqual(sent);
  });

  it("createdAt은 serverTimestamp여야 한다 — 규칙이 request.time을 요구한다", () => {
    expect(rules).toContain("data.createdAt == request.time");
    // addDoc(...) 호출 한 개만 잘라 본다 — 주변 코드가 섞이면 판정이 무의미해진다.
    const start = service.indexOf("addDoc(collection(db, 'rankings')");
    expect(start, "submitScore의 addDoc 호출을 찾지 못했다").toBeGreaterThan(-1);
    const submitBody = service.slice(start, service.indexOf("});", start) + 3);
    expect(submitBody).toContain("serverTimestamp()");
    // 주석에는 Timestamp.now()가 설명으로 등장하므로, 실제 값 지정만 본다.
    expect(submitBody).not.toMatch(/createdAt:\s*Timestamp\.now\(\)/);
  });

  it("players 프로필 필드도 규칙과 일치한다", () => {
    expect(hasOnlyKeys("isValidProfile")).toEqual(
      ["name", "totalGames", "totalScore", "highScore", "updatedAt"].sort(),
    );
  });

  it("플레이 가능한 모든 모드가 규칙의 gameMode 허용 목록에 있다", async () => {
    const { GAME_MODE_CONFIG } = await import("../constants/gameConfig");
    const modeLine = rules
      .split("\n")
      .find((l: string) => l.includes("data.gameMode in"))!;
    const allowed = new Set(
      [...modeLine.matchAll(/'([^']+)'/g)].map((m) => m[1]),
    );
    for (const mode of Object.keys(GAME_MODE_CONFIG)) {
      expect(allowed.has(mode), `모드 '${mode}'가 규칙에서 빠졌다`).toBe(true);
    }
  });

  it("점수 상한이 클라이언트 가드와 규칙에서 같다", () => {
    expect(service).toContain("50_000_000");
    expect(rules).toContain("50000000");
  });

  it("전용 데이터베이스를 쓰도록 배선돼 있다 — (default)로 붙으면 남의 앱과 섞인다", () => {
    expect(service).toContain("VITE_FIREBASE_DB");
    expect(service).toContain("getFirestore(app, FIRESTORE_DB_ID)");
    const firebaseJson = JSON.parse(
      readFileSync(resolve(root, "firebase.json"), "utf8"),
    );
    expect(Array.isArray(firebaseJson.firestore)).toBe(true);
    expect(firebaseJson.firestore[0].database).toBe("chromafall");
  });

  it("리더보드 쿼리에 필요한 복합 인덱스가 정의돼 있다", () => {
    const idx = JSON.parse(
      readFileSync(resolve(root, "firestore.indexes.json"), "utf8"),
    );
    const rankingIdx = idx.indexes.find(
      (i: { collectionGroup: string }) => i.collectionGroup === "rankings",
    );
    expect(rankingIdx, "rankings 복합 인덱스가 없다").toBeTruthy();
    const fields = rankingIdx.fields.map(
      (f: { fieldPath: string; order: string }) => `${f.fieldPath}:${f.order}`,
    );
    expect(fields).toEqual(["gameMode:ASCENDING", "score:DESCENDING"]);
  });
});
