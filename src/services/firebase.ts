import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  Timestamp,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';

/**
 * Firebase 설정.
 *
 * ⚠️ 웹 API 키는 클라이언트에 공개되는 식별자이지 비밀값이 아니다.
 * 실제 접근 제어는 firestore.rules가 한다(저장소 루트 참조).
 * 그럼에도 프로젝트를 환경변수로 분리해 두는 이유는, 이전에 무관한
 * 프로젝트(gugudan)의 Firebase를 재사용하고 있었기 때문이다 — 데이터가
 * 섞이고 규칙을 따로 걸 수 없었다.
 *
 * .env(.env.example 참고)에 VITE_FIREBASE_* 를 채우면 그 프로젝트를 쓰고,
 * 비어 있으면 리더보드는 로컬 전용으로 동작한다(게임은 정상 플레이 가능).
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** 설정이 갖춰졌을 때만 Firebase를 초기화한다. */
export const isRemoteLeaderboardEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

const app = isRemoteLeaderboardEnabled ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;

/**
 * 제출 점수 상한 — 클라이언트에서 임의 점수를 밀어넣는 것을 1차로 거른다.
 * 최종 방어선은 firestore.rules이고, 여기는 사고 방지용 가드다.
 */
const MAX_PLAUSIBLE_SCORE = 50_000_000;

// 로컬 랭킹 저장소 키
const LOCAL_RANKINGS_KEY = 'chromafall_local_rankings';

// 랭킹 엔트리 타입
export interface RankingEntry {
  id?: string;
  playerId: string;
  playerName: string;
  score: number;
  level: number;
  maxCombo: number;
  maxChain: number;
  gameMode: string;
  playTime: number;
  createdAt: Timestamp | Date | string;
}

// 랭킹 타입
export type RankingType = 'all' | 'daily' | 'weekly';

// 로컬 랭킹 저장
function saveToLocalRankings(entry: RankingEntry): void {
  try {
    const stored = localStorage.getItem(LOCAL_RANKINGS_KEY);
    const rankings: RankingEntry[] = stored ? JSON.parse(stored) : [];

    // 새 엔트리 추가 (createdAt을 문자열로 변환)
    const newEntry = {
      ...entry,
      id: entry.id || `local_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    rankings.push(newEntry);

    // 최대 100개까지만 저장, 점수순 정렬
    rankings.sort((a, b) => b.score - a.score);
    const trimmed = rankings.slice(0, 100);

    localStorage.setItem(LOCAL_RANKINGS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('로컬 랭킹 저장 실패:', error);
  }
}

// 로컬 랭킹 조회
function getLocalRankings(gameMode: string): RankingEntry[] {
  try {
    const stored = localStorage.getItem(LOCAL_RANKINGS_KEY);
    if (!stored) return [];

    const rankings: RankingEntry[] = JSON.parse(stored);
    return rankings
      .filter(r => r.gameMode === gameMode)
      .sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('로컬 랭킹 조회 실패:', error);
    return [];
  }
}

// 고유 플레이어 ID 가져오기/생성
export function getPlayerId(): string {
  let playerId = localStorage.getItem('chromafall_player_id');
  if (!playerId) {
    playerId = 'player_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('chromafall_player_id', playerId);
  }
  return playerId;
}

// 플레이어 이름 가져오기/설정
export function getPlayerName(): string {
  return localStorage.getItem('chromafall_player_name') || 'Player';
}

export function setPlayerName(name: string): void {
  localStorage.setItem('chromafall_player_name', name);
}

// 점수 제출
export async function submitScore(entry: Omit<RankingEntry, 'id' | 'createdAt'>): Promise<string | null> {
  // 로컬에 먼저 저장 (항상 성공)
  const localEntry: RankingEntry = {
    ...entry,
    id: `local_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  saveToLocalRankings(localEntry);

  // 명백히 불가능한 값은 제출하지 않는다
  if (
    !Number.isFinite(entry.score) ||
    entry.score < 0 ||
    entry.score > MAX_PLAUSIBLE_SCORE
  ) {
    console.warn('비정상 점수 — 원격 제출을 생략합니다:', entry.score);
    return localEntry.id || null;
  }

  if (!db) return localEntry.id || null;

  // Firebase에도 저장 시도
  try {
    const docRef = await addDoc(collection(db, 'rankings'), {
      ...entry,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Firebase 점수 제출 실패 (로컬에는 저장됨):', error);
    return localEntry.id || null;  // 로컬 ID 반환
  }
}

// 상위 랭킹 가져오기
export async function getTopRankings(
  type: RankingType = 'all',
  gameMode: string = 'classic',
  count: number = 100
): Promise<RankingEntry[]> {
  // 로컬 랭킹 먼저 가져오기
  const localRankings = getLocalRankings(gameMode);

  if (!db) return localRankings.slice(0, count);

  try {
    let q;
    const rankingsRef = collection(db, 'rankings');

    // Firebase 쿼리 간소화 (복합 인덱스 문제 회피)
    if (type === 'all') {
      // 전체 랭킹 - gameMode + score 정렬
      q = query(
        rankingsRef,
        where('gameMode', '==', gameMode),
        orderBy('score', 'desc'),
        limit(count)
      );
    } else {
      // 일간/주간 - 일단 전체 가져와서 클라이언트에서 필터링
      q = query(
        rankingsRef,
        where('gameMode', '==', gameMode),
        orderBy('score', 'desc'),
        limit(count * 2)  // 넉넉히 가져와서 필터링
      );
    }

    const snapshot = await getDocs(q);
    const firebaseRankings: RankingEntry[] = [];

    snapshot.forEach((doc) => {
      firebaseRankings.push({
        id: doc.id,
        ...doc.data(),
      } as RankingEntry);
    });

    // 일간/주간 필터링
    let filteredRankings = firebaseRankings;
    if (type === 'daily' || type === 'weekly') {
      const cutoff = new Date();
      if (type === 'daily') {
        cutoff.setHours(0, 0, 0, 0);
      } else {
        cutoff.setDate(cutoff.getDate() - 7);
        cutoff.setHours(0, 0, 0, 0);
      }

      filteredRankings = firebaseRankings.filter(r => {
        const createdAt = r.createdAt;
        let date: Date;
        if (createdAt instanceof Date) {
          date = createdAt;
        } else if (typeof createdAt === 'string') {
          date = new Date(createdAt);
        } else if (createdAt && typeof createdAt.toDate === 'function') {
          date = createdAt.toDate();
        } else {
          return false;
        }
        return date >= cutoff;
      });
    }

    // 로컬과 Firebase 랭킹 병합 (중복 제거)
    const mergedMap = new Map<string, RankingEntry>();

    // Firebase 랭킹 추가
    filteredRankings.forEach(r => {
      const key = `${r.playerId}_${r.score}_${r.gameMode}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, r);
      }
    });

    // 로컬 랭킹 추가 (일간/주간 필터 적용)
    localRankings.forEach(r => {
      if (type !== 'all') {
        const cutoff = new Date();
        if (type === 'daily') {
          cutoff.setHours(0, 0, 0, 0);
        } else {
          cutoff.setDate(cutoff.getDate() - 7);
          cutoff.setHours(0, 0, 0, 0);
        }
        const date = new Date(r.createdAt as string);
        if (date < cutoff) return;
      }

      const key = `${r.playerId}_${r.score}_${r.gameMode}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, r);
      }
    });

    // 점수순 정렬 후 상위 count개 반환
    const merged = Array.from(mergedMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, count);

    return merged;
  } catch (error) {
    console.error('Firebase 랭킹 조회 실패, 로컬 랭킹 사용:', error);
    // Firebase 실패 시 로컬 랭킹만 반환
    return localRankings.slice(0, count);
  }
}

// 내 최고 기록 가져오기
export async function getMyBestScore(playerId: string, gameMode: string = 'classic'): Promise<RankingEntry | null> {
  if (!db) return null;
  try {
    const rankingsRef = collection(db, 'rankings');
    const q = query(
      rankingsRef,
      where('playerId', '==', playerId),
      where('gameMode', '==', gameMode),
      orderBy('score', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as RankingEntry;
  } catch (error) {
    console.error('내 최고 기록 조회 실패:', error);
    return null;
  }
}

// 내 랭킹 순위 가져오기
export async function getMyRank(playerId: string, gameMode: string = 'classic'): Promise<number> {
  try {
    // 전체 랭킹 가져와서 내 순위 찾기
    const allRankings = await getTopRankings('all', gameMode, 200);
    const myIndex = allRankings.findIndex(r => r.playerId === playerId);
    return myIndex >= 0 ? myIndex + 1 : -1;
  } catch (error) {
    console.error('랭킹 순위 조회 실패:', error);
    // 로컬에서만 찾기
    const localRankings = getLocalRankings(gameMode);
    const myIndex = localRankings.findIndex(r => r.playerId === playerId);
    return myIndex >= 0 ? myIndex + 1 : -1;
  }
}

// 플레이어 프로필 저장
export async function savePlayerProfile(playerId: string, data: {
  name: string;
  totalGames: number;
  totalScore: number;
  highScore: number;
}): Promise<boolean> {
  if (!db) return false;
  try {
    await setDoc(doc(db, 'players', playerId), {
      ...data,
      updatedAt: Timestamp.now(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('프로필 저장 실패:', error);
    return false;
  }
}

// 플레이어 프로필 가져오기
export async function getPlayerProfile(playerId: string): Promise<{
  name: string;
  totalGames: number;
  totalScore: number;
  highScore: number;
} | null> {
  if (!db) return null;
  try {
    const docSnap = await getDoc(doc(db, 'players', playerId));
    if (docSnap.exists()) {
      return docSnap.data() as {
        name: string;
        totalGames: number;
        totalScore: number;
        highScore: number;
      };
    }
    return null;
  } catch (error) {
    console.error('프로필 조회 실패:', error);
    return null;
  }
}

export { db };
