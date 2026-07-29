import React, { createContext, useState, useEffect, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
  getIdToken,
} from "firebase/auth";
import { auth, firebaseConfigError, firebaseReady } from "../firebase";
import { useStore } from "../store/useStore";

type AuthStatus = 'configuration-unavailable' | 'initializing' | 'unauthenticated' | 'authenticated' | 'error';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  loading: boolean;
  authReady: boolean;
  configError: string;
  status: AuthStatus;
  error: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AuthStatus>(firebaseReady ? 'initializing' : 'configuration-unavailable');
  const [error, setError] = useState<string | null>(null);
  const resetSessionState = useStore((state) => state.resetSessionState);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setStatus('configuration-unavailable');
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setStatus(firebaseUser ? 'authenticated' : 'unauthenticated');
      setError(null);
      setLoading(false);
    }, (authError) => {
      setUser(null);
      setStatus('error');
      setError(authError.message || 'Firebase authentication failed to initialize.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error(firebaseConfigError || 'Firebase authentication is not configured.');
    setStatus('initializing');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (!auth) {
      resetSessionState();
      return;
    }
    await signOut(auth);
    resetSessionState();
  };

  const getToken = async () => {
    if (!auth) return null;
    if (!auth.currentUser) return null;
    return await getIdToken(auth.currentUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, getToken, loading, authReady: firebaseReady, configError: firebaseConfigError, status, error }}>
      {children}
    </AuthContext.Provider>
  );
}
