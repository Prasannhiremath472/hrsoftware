import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import api, { setUnauthorizedHandler } from '@/lib/api';
import type { AuthUser, PreAuthChallenge, VerifiedSession } from '@/types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Step 1: email + password. Emails an OTP; does not establish a session yet. */
  login: (email: string, password: string) => Promise<PreAuthChallenge>;
  verifyOtp: (preAuthToken: string, otp: string) => Promise<AuthUser>;
  resendOtp: (preAuthToken: string) => Promise<PreAuthChallenge>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => clearSession());
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get<{ data: AuthUser }>('/auth/me');
        if (cancelled) return;
        setUser(res.data.data);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data.data));
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
    // Only run once on mount — token changes are handled by verifyOtp/logout directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ data: PreAuthChallenge }>('/auth/login', { email, password });
    return res.data.data;
  }, []);

  const verifyOtp = useCallback(async (preAuthToken: string, otp: string) => {
    const res = await api.post<{ data: VerifiedSession }>('/auth/verify-otp', { preAuthToken, otp });
    const { token: newToken, user: newUser } = res.data.data;
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const resendOtp = useCallback(async (preAuthToken: string) => {
    const res = await api.post<{ data: PreAuthChallenge }>('/auth/resend-otp', { preAuthToken });
    return res.data.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore — we clear the local session regardless */
    }
    clearSession();
  }, [clearSession]);

  const value: AuthContextValue = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token),
    login,
    verifyOtp,
    resendOtp,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
