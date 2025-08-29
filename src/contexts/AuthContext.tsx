import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Operador } from '@/types/evaluation';
import { getOperadores } from '../services/operatorService';
import { BASE_URL, API_ENDPOINTS, getAuthToken } from '../config/apiConfig';

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
      const token = getAuthToken();
      if (token) {
        try {
          const profileResponse = await fetch(`${BASE_URL}/profile`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();

            // Fetch all operators to find the matching one by login
            const operatorsResponse = await getOperadores();
            const allOperators: Operador[] = operatorsResponse.data;

            const matchingOperator = allOperators.find(op => op.login === profileData.login);

            let loggedInUser: Operador;

            if (matchingOperator) {
              loggedInUser = {
                id: matchingOperator.id,
                nome: profileData.nome,
                login: profileData.login,
                ativo: profileData.ativo,
                grupo: profileData.grupo,
                dataInclusao: matchingOperator.dataInclusao,
                participaAvaliacao: matchingOperator.participaAvaliacao,
                nivel: matchingOperator.nivel,
              };
            } else {
              // Fallback if no matching operator is found
              loggedInUser = {
                id: profileData.id.toString(),
                nome: profileData.nome,
                login: profileData.login,
                ativo: profileData.ativo,
                grupo: profileData.grupo,
                dataInclusao: new Date(),
                participaAvaliacao: false,
                nivel: 'Nivel 1',
              };
            }
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
      const loginResponse = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usuario: email, senha: password }),
      });

      if (!loginResponse.ok) {
        console.error('Login failed:', loginResponse.statusText);
        setLoading(false);
        return false;
      }

      const { token } = await loginResponse.json();
      localStorage.setItem('authToken', token);

      const profileResponse = await fetch(`${BASE_URL}/profile`, {
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

      // Fetch all operators to find the matching one by login
      const operatorsResponse = await getOperadores();
      const allOperators: Operador[] = operatorsResponse.data;

      const matchingOperator = allOperators.find(op => op.login === profileData.login);

      let loggedInUser: Operador;

      if (matchingOperator) {
        loggedInUser = {
          id: matchingOperator.id,
          nome: profileData.nome,
          login: profileData.login,
          ativo: profileData.ativo,
          grupo: profileData.grupo,
          dataInclusao: matchingOperator.dataInclusao, // Use operator's dataInclusao
          participaAvaliacao: matchingOperator.participaAvaliacao, // Use operator's participaAvaliacao
          nivel: matchingOperator.nivel, // Use operator's nivel
        };
      } else {
        // Fallback if no matching operator is found (e.g., user is not an 'operator' in the system)
        loggedInUser = {
          id: profileData.id.toString(),
          nome: profileData.nome,
          login: profileData.login,
          ativo: profileData.ativo,
          grupo: profileData.grupo,
          dataInclusao: new Date(),
          participaAvaliacao: false,
          nivel: 'Nivel 1',
        };
      }

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