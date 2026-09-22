import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyBRxmbK2pqGXs1IHR7P-TEglcRthic3Hb8",
  authDomain: "votaciones-fotografia-unalmed.firebaseapp.com",
  projectId: "votaciones-fotografia-unalmed",
  storageBucket: "votaciones-fotografia-unalmed.firebasestorage.app",
  messagingSenderId: "561945998324",
  appId: "1:561945998324:web:3eea0fa9e8d6644770bfa1",
  measurementId: "G-NGYC8EZPE2"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore & Storage
export const db = getFirestore(app);
export const storage = getStorage(app);
