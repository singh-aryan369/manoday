import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  OAuthProvider,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  }

  async function signInWithGithub() {
    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('GitHub sign in error:', error);
      throw error;
    }
  }

  async function signInWithMicrosoft() {
    try {
      const provider = new OAuthProvider('microsoft.com');
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Microsoft sign in error:', error);
      throw error;
    }
  }

  async function signInAnonymously() {
    try {
      await firebaseSignInAnonymously(auth);
    } catch (error) {
      console.error('Anonymous sign in error:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  const value = {
    currentUser,
    loading,
    signInWithGoogle,
    signInWithGithub,
    signInWithMicrosoft,
    signInAnonymously,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
