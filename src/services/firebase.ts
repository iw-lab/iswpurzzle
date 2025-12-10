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

// Firebase 설정 (gugudan-e4c77 프로젝트)
const firebaseConfig = {
  apiKey: "AIzaSyBKsN2qQ7oc3l5MrNXpWtHnxLlMqM3PFSA",
  authDomain: "gugudan-e4c77.firebaseapp.com",
  projectId: "gugudan-e4c77",
  storageBucket: "gugudan-e4c77.firebasestorage.app",
  messagingSenderId: "798815663534",
  appId: "1:798815663534:web:9e4aacdbd8acfc36c6fc67"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
  createdAt: Timestamp | Date;
}

// 랭킹 타입
export type RankingType = 'all' | 'daily' | 'weekly';

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
  try {
    const docRef = await addDoc(collection(db, 'rankings'), {
      ...entry,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('점수 제출 실패:', error);
    return null;
  }
}

// 상위 랭킹 가져오기
export async function getTopRankings(
  type: RankingType = 'all',
  gameMode: string = 'classic',
  count: number = 100
): Promise<RankingEntry[]> {
  try {
    let q;
    const rankingsRef = collection(db, 'rankings');

    if (type === 'daily') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      q = query(
        rankingsRef,
        where('gameMode', '==', gameMode),
        where('createdAt', '>=', Timestamp.fromDate(today)),
        orderBy('createdAt', 'desc'),
        orderBy('score', 'desc'),
        limit(count)
      );
    } else if (type === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      q = query(
        rankingsRef,
        where('gameMode', '==', gameMode),
        where('createdAt', '>=', Timestamp.fromDate(weekAgo)),
        orderBy('createdAt', 'desc'),
        orderBy('score', 'desc'),
        limit(count)
      );
    } else {
      // 전체 랭킹
      q = query(
        rankingsRef,
        where('gameMode', '==', gameMode),
        orderBy('score', 'desc'),
        limit(count)
      );
    }

    const snapshot = await getDocs(q);
    const rankings: RankingEntry[] = [];

    snapshot.forEach((doc) => {
      rankings.push({
        id: doc.id,
        ...doc.data(),
      } as RankingEntry);
    });

    // 클라이언트에서 점수순 정렬 (일간/주간의 경우)
    if (type === 'daily' || type === 'weekly') {
      rankings.sort((a, b) => b.score - a.score);
    }

    return rankings;
  } catch (error) {
    console.error('랭킹 조회 실패:', error);
    return [];
  }
}

// 내 최고 기록 가져오기
export async function getMyBestScore(playerId: string, gameMode: string = 'classic'): Promise<RankingEntry | null> {
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
    const myBest = await getMyBestScore(playerId, gameMode);
    if (!myBest) return -1;

    const rankingsRef = collection(db, 'rankings');
    const q = query(
      rankingsRef,
      where('gameMode', '==', gameMode),
      where('score', '>', myBest.score)
    );

    const snapshot = await getDocs(q);
    return snapshot.size + 1;
  } catch (error) {
    console.error('랭킹 순위 조회 실패:', error);
    return -1;
  }
}

// 플레이어 프로필 저장
export async function savePlayerProfile(playerId: string, data: {
  name: string;
  totalGames: number;
  totalScore: number;
  highScore: number;
}): Promise<boolean> {
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
