import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from 'firebase/functions';
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDMkXPp-Gy1ZDf6zr9nVLoNhSYtDyiZSaI",
  authDomain: "lungcare-ai-34de7.firebaseapp.com",
  projectId: "lungcare-ai-34de7",
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "lungcare-ai-34de7.firebasestorage.app").trim(),
  messagingSenderId: "190337364176",
  appId: "1:190337364176:web:e5a5a7b7071d4234fcaed5",
  measurementId: "G-M12W8MFZFR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');
