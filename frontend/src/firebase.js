// src/firebase.js
// Firebase client SDK initialization with user configuration

import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

export const firebaseConfig = {
  apiKey: "AIzaSyCu3hQVcw8M57r39ZNsjg7SHskyhIsQY0A",
  authDomain: "apnakirayana.firebaseapp.com",
  databaseURL: "https://apnakirayana-default-rtdb.firebaseio.com",
  projectId: "apnakirayana",
  storageBucket: "apnakirayana.firebasestorage.app",
  messagingSenderId: "340809411556",
  appId: "1:340809411556:web:b0e8dabe72f1fbc233f5f1",
  measurementId: "G-N9QLG7QTK9",
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const rtdb = getDatabase(app);

export { RecaptchaVerifier, signInWithPhoneNumber };
export default app;
