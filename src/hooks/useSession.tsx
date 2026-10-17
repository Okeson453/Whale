import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserSession } from '../api/types';
import { apiClient } from '../api/client';

interface SessionContextType {
  user: UserSession;
  loading: boolean;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  isOperator: boolean;
  canExecute: boolean;
  canResetBreaker: boolean;
}

const defaultSession: UserSession = {
  is_authenticated: false,
  user_id: 'guest',
  role: 'unauthenticated',
  can_execute: false,
  can_reset_breaker: false,
  environment: 'production',
  token: null,
};

const SessionContext = createContext<SessionContextType>({
  user: defaultSession,
  loading: true,
  login: async () => false,
  logout: () => {},
  isOperator: false,
  canExecute: false,
  canResetBreaker: false,
});

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession>(defaultSession);
  const [loading, setLoading] = useState<boolean>(true);

  const checkSession = useCallback(async (tokenToVerify?: string) => {
    setLoading(true);
    try {
      const storedToken = tokenToVerify || sessionStorage.getItem('whale_auth_token') || undefined;
      const session = await apiClient.verifySession(storedToken);
      setUser(session);
      if (session.is_authenticated && session.token) {
        sessionStorage.setItem('whale_auth_token', session.token);
      }
    } catch {
      setUser(defaultSession);
      sessionStorage.removeItem('whale_auth_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (token: string): Promise<boolean> => {
    try {
      const session = await apiClient.verifySession(token);
      if (session.is_authenticated) {
        setUser(session);
        sessionStorage.setItem('whale_auth_token', token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('whale_auth_token');
    setUser(defaultSession);
  };

  return (
    <SessionContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isOperator: user.role === 'operator',
        canExecute: user.can_execute,
        canResetBreaker: user.can_reset_breaker,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
