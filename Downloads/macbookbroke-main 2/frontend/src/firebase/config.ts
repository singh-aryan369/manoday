import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Check if running in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.env.REACT_APP_DEVELOPMENT_MODE === 'true' ||
                     window.location.hostname === 'localhost';

// Firebase configuration - supports both local and production
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: isDevelopment ? "localhost" : "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics (only in production)
const analytics = isDevelopment ? null : getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Functions
export const functions = getFunctions(app);

// Connect to emulators in development mode
if (isDevelopment && typeof window !== 'undefined') {
  try {
    // Connect to Firestore emulator
    connectFirestoreEmulator(db, '127.0.0.1', 8081);
    console.log('🔥 Connected to Firestore emulator');
  } catch (error) {
    console.log('Firestore emulator already connected or not available');
  }

  try {
    // Connect to Auth emulator
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    console.log('🔥 Connected to Auth emulator');
  } catch (error) {
    console.log('Auth emulator already connected or not available');
  }

  try {
    // Connect to Functions emulator
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    console.log('🔥 Connected to Functions emulator');
  } catch (error) {
    console.log('Functions emulator already connected or not available');
  }
}

// OAuth providers
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');

// Configure providers for better UX
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

githubProvider.setCustomParameters({
  scope: 'read:user user:email'
});

microsoftProvider.setCustomParameters({
  prompt: 'select_account'
});



export { analytics };
export default app;
