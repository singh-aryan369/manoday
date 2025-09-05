import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDX0jcHEdUypuSrVLHyJLUK64YX3j71UwE",
  authDomain: "smart-surf-469908-n0.firebaseapp.com",
  projectId: "smart-surf-469908-n0",
  storageBucket: "smart-surf-469908-n0.appspot.com",
  messagingSenderId: "118966222674",
  appId: "1:118966222674:web:a03df61cf313141d07448b",
  measurementId: "G-DQEVEJ9G3D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

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
