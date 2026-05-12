import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app, db, auth, authApp2, secondaryAuth, storage;

try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);

    // Secondary Firebase app instance used ONLY for creating sub-accounts
    // without signing the current admin out
    authApp2 = initializeApp(firebaseConfig, "secondary");
    secondaryAuth = getAuth(authApp2);

    console.log("Firebase initialized successfully");
  } else {
    console.warn("Firebase config missing. Running in mock mode...");
  }
} catch (error) {
  console.error("Firebase initialization error", error);
}

export { db, app, auth, secondaryAuth, storage };
export const USE_MOCK = !firebaseConfig.apiKey;
