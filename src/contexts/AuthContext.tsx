import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Operador } from '@/types/evaluation';

interface AuthContextType {
  user: Operador | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Operador | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const profileResponse = await fetch('http://192.168.0.26:8080/profile', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            const loggedInUser: Operador = {
              id: profileData.id.toString(),
              nome: profileData.nome,
              login: profileData.login,
              ativo: profileData.ativo,
              grupo: profileData.grupo,
              dataInclusao: new Date(), // Placeholder
            };
            setUser(loggedInUser);
          } else {
            localStorage.removeItem('authToken'); // Invalid token
          }
        } catch (error) {
          console.error('Failed to load user from token:', error);
          localStorage.removeItem('authToken');
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const loginResponse = await fetch('http://192.168.0.26:8080/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: email, password: password }),
      });

      if (!loginResponse.ok) {
        console.error('Login failed:', loginResponse.statusText);
        setLoading(false);
        return false;
      }

      const { token } = await loginResponse.json();
      localStorage.setItem('authToken', token);

      const profileResponse = await fetch('http://192.168.0.26:8080/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!profileResponse.ok) {
        console.error('Profile fetch failed:', profileResponse.statusText);
        localStorage.removeItem('authToken');
        setLoading(false);
        return false;
      }

      const profileData = await profileResponse.json();
      const loggedInUser: Operador = {
        id: profileData.id.toString(),
        nome: profileData.nome,
        login: profileData.login,
        ativo: profileData.ativo,
        grupo: profileData.grupo,
        dataInclusao: new Date(), // Placeholder
      };

      setUser(loggedInUser);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      localStorage.removeItem('authToken');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}