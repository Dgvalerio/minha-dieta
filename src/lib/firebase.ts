import { initializeApp } from "firebase/app";
import { doc, initializeFirestore, persistentLocalCache } from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId);

// Cache local do Firestore: funciona offline (ex.: mercado sem sinal) e sincroniza quando a conexão volta.
const db = firebaseEnabled
  ? initializeFirestore(initializeApp(config), { localCache: persistentLocalCache() })
  : null;

/** Documento único onde o cardápio e a lista ficam salvos. */
export const planDoc = db ? doc(db, "cardapios", import.meta.env.VITE_CARDAPIO_ID || "semana") : null;
