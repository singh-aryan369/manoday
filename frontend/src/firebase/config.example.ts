import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Example Firebase configuration - Copy this to config.ts and fill in your values
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY_HERE",
  authDomain: "YOUR_FIREBASE_AUTH_DOMAIN_HERE",
  projectId: "YOUR_FIREBASE_PROJECT_ID_HERE",
  storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_FIREBASE_APP_ID_HERE",
  measurementId: "YOUR_FIREBASE_MEASUREMENT_ID_HERE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
