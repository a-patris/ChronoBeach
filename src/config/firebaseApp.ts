import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { readFirebaseConfig, isFirebaseConfigured } from "./firebase";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function initFirebaseApp(): FirebaseApp | null {
  if (app) return app;
  const config = readFirebaseConfig();
  if (!config) return null;
  app = initializeApp(config);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const firebaseApp = initFirebaseApp();
    if (!firebaseApp) {
      throw new Error("Firebase non configuré — renseignez .env");
    }
    auth = getAuth(firebaseApp);
  }
  return auth;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    const firebaseApp = initFirebaseApp();
    if (!firebaseApp) {
      throw new Error("Firebase non configuré — renseignez .env");
    }
    db = getFirestore(firebaseApp);
  }
  return db;
}

export function isFirebaseReady(): boolean {
  return isFirebaseConfigured();
}
