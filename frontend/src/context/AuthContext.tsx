import { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  user: { email: string } | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    // Initialize token from localStorage if it exists
    return localStorage.getItem('access_token');
  });
  const [user, setUser] = useState<{ email: string } | null>(null);
  
  useEffect(() => {
    if (token) {
      import('../services/authService').then(({ authService }) => {
        authService.getMe().then(setUser).catch(() => {
          // If fetching user fails, token might be expired
          setToken(null);
          localStorage.removeItem('access_token');
        });
      });
    } else {
      setUser(null);
    }
  }, [token]);

  const isAuthenticated = !!token;

  const login = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('access_token', newToken);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('access_token');
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
