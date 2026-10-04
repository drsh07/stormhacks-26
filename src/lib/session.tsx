import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, ApiError, setApiUserId } from './api';
import type { User } from './types';

/**
 * Hackathon auth: the phone remembers a user id and sends it as the
 * `x-user-id` header on every request. No passwords, no tokens.
 */
const STORAGE_KEY = 'sq_uid';

interface Session {
  user: User | null;
  /** True while we restore the saved user on app start. */
  loading: boolean;
  /** Set when the saved user could not be loaded (server down, bad URL). */
  error: string | null;
  /** Become this user. Throws ApiError if the server does not know them. */
  signInAs: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Replace the cached user after the server returns an updated profile. */
  updateUser: (user: User) => void;
}

const SessionContext = createContext<Session | null>(null);

async function fetchUser(userId: string): Promise<User> {
  const { user } = await api<{ user: User }>('/api/me', { userId });
  return user;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const savedId = await AsyncStorage.getItem(STORAGE_KEY);
        if (!savedId) return;
        const restored = await fetchUser(savedId);
        if (cancelled) return;
        setApiUserId(restored.id);
        setUser(restored);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          // The saved user no longer exists (database was re-seeded). Start fresh.
          await AsyncStorage.removeItem(STORAGE_KEY);
        } else {
          setError(err instanceof Error ? err.message : 'Could not load your account.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signInAs = useCallback(async (userId: string) => {
    const next = await fetchUser(userId);
    await AsyncStorage.setItem(STORAGE_KEY, next.id);
    setApiUserId(next.id);
    setUser(next);
    setError(null);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setApiUserId(null);
    setUser(null);
  }, []);

  /** Sign in with a user object we already have (right after sign-up). */
  const updateUser = useCallback((next: User) => {
    AsyncStorage.setItem(STORAGE_KEY, next.id).catch(() => {});
    setApiUserId(next.id);
    setUser(next);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, signInAs, signOut, updateUser }),
    [user, loading, error, signInAs, signOut, updateUser],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside <SessionProvider>.');
  return session;
}
