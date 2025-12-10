import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDuKVAldzDyJEn0NLrtCpTT7Q0PY4ocH6w",
  authDomain: "gugudan-e4c77.firebaseapp.com",
  projectId: "gugudan-e4c77",
  storageBucket: "gugudan-e4c77.firebasestorage.app",
  messagingSenderId: "688479538138",
  appId: "1:688479538138:web:138ca5dee3073721d3cee3",
  measurementId: "G-9VHNPGJVP3"
};

// Firebase 초기화
export const app = initializeApp(firebaseConfig);

// Firestore 초기화
export const db = getFirestore(app);

// Analytics 초기화 (브라우저 환경에서만)
export const initAnalytics = async () => {
  if (await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};
