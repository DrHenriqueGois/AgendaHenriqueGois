import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC-EQpNyvXEimXuXleikf540N0gukaSt4k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "henriquegois-e47ff.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "henriquegois-e47ff",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "henriquegois-e47ff.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "724291663672",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:724291663672:web:b1f9ee28c2c139334333cd",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-P7GQZR3ZR8"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
