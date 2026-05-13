import { initializeApp } from "firebase/app";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA1HYk68gl2Bo24R_ztei3vGGjqssZsCMc",
  authDomain: "business-management-syst-13f04.firebaseapp.com",
  projectId: "business-management-syst-13f04",
  storageBucket: "business-management-syst-13f04.firebasestorage.app",
  messagingSenderId: "934348867334",
  appId: "1:934348867334:web:651bc5475b0817bdffc087"
};

const app = initializeApp(firebaseConfig);

/**
 * Use initializeFirestore with experimentalForceLongPolling disabled and
 * no local persistence. This prevents the SDK's internal watch-stream from
 * accumulating stale state that causes the INTERNAL ASSERTION FAILED crash
 * (error IDs b815 / ca9) when many pages are opened in rapid succession.
 *
 * Since useFirestore now uses getDocs() (one-time fetches), we don't need
 * any real-time listener infrastructure at all — this config is optimal.
 */
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: false,
  ignoreUndefinedProperties: true,
});

export const auth = getAuth(app);
