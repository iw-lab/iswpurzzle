import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// 타입 정의
export interface LeaderboardEntry {
  oderId: string;
  odername: string;
  score: number;
  level: number;
  timestamp: Timestamp | null;
}

export interface UserData {
  oderId: string;
  odername: string;
  highScore: number;
  totalGames: number;
  totalScore: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// 컬렉션 참조
const LEADERBOARD_COLLECTION = 'leaderboard';
const USERS_COLLECTION = 'users';

// 리더보드에 점수 저장
export const saveScore = async (
  oderId: string,
  odername: string,
  score: number,
  level: number
): Promise<void> => {
  try {
    const docRef = doc(db, LEADERBOARD_COLLECTION, oderId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const existingData = docSnap.data() as LeaderboardEntry;
      // 기존 점수보다 높을 때만 업데이트
      if (score > existingData.score) {
        await updateDoc(docRef, {
          score,
          level,
          odername,
          timestamp: serverTimestamp()
        });
      }
    } else {
      await setDoc(docRef, {
        oderId,
        odername,
        score,
        level,
        timestamp: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('점수 저장 실패:', error);
    throw error;
  }
};

// 리더보드 가져오기
export const getLeaderboard = async (limitCount: number = 10): Promise<LeaderboardEntry[]> => {
  try {
    const q = query(
      collection(db, LEADERBOARD_COLLECTION),
      orderBy('score', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const leaderboard: LeaderboardEntry[] = [];

    querySnapshot.forEach((doc) => {
      leaderboard.push(doc.data() as LeaderboardEntry);
    });

    return leaderboard;
  } catch (error) {
    console.error('리더보드 가져오기 실패:', error);
    throw error;
  }
};

// 사용자 데이터 저장/업데이트
export const saveUserData = async (
  oderId: string,
  odername: string,
  score: number
): Promise<void> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, oderId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const existingData = docSnap.data() as UserData;
      await updateDoc(docRef, {
        odername,
        highScore: Math.max(existingData.highScore, score),
        totalGames: existingData.totalGames + 1,
        totalScore: existingData.totalScore + score,
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(docRef, {
        oderId,
        odername,
        highScore: score,
        totalGames: 1,
        totalScore: score,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('사용자 데이터 저장 실패:', error);
    throw error;
  }
};

// 사용자 데이터 가져오기
export const getUserData = async (oderId: string): Promise<UserData | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, oderId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error('사용자 데이터 가져오기 실패:', error);
    throw error;
  }
};
