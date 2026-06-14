import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string, turma: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Banco de dados simulado
const mockUsers: User[] = [
  {
    id: 'admin-1',
    email: 'admin@sea.com',
    name: 'Administrador',
    role: 'admin',
  },
  {
    id: 'prof-1',
    email: 'prof@sea.com',
    name: 'Professor João Silva',
    role: 'professor',
  },
  {
    id: 'aluno-1',
    email: 'aluno@sea.com',
    name: 'Maria Santos',
    role: 'aluno',
    turma: '3º Ano A',
    pontos: 850,
    badges: ['Primeira Atividade', 'Sequência 7 dias'],
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se salvou a sua sessao localmente
    const savedUser = localStorage.getItem('sea_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simular a chamada de API
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verificar as credenciais (para demo, aceitar qualquer senha para usuarios existentes)
    if (email === 'admin@sea.com' && password === 'admin') {
      const adminUser = mockUsers.find(u => u.email === email);
      if (adminUser) {
        setUser(adminUser);
        localStorage.setItem('sea_user', JSON.stringify(adminUser));
        setIsLoading(false);
        return true;
      }
    }

    // Verificar os outros usuarios DEMOSTRAÇAO, qualquer senha é aceita
    const foundUser = mockUsers.find(u => u.email === email);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('sea_user', JSON.stringify(foundUser));
      setIsLoading(false);
      return true;
    }

    setIsLoading(false);
    return false;
  };

  const signup = async (email: string, password: string, name: string, turma: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simular a chamada de API
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verifique se o e-mail já existe.
    if (mockUsers.find(u => u.email === email)) {
      setIsLoading(false);
      return false;
    }

    // Criar novo usuário aluno
    const newUser: User = {
      id: `aluno-${Date.now()}`,
      email,
      name,
      role: 'aluno',
      turma,
      pontos: 0,
      badges: [],
    };

    mockUsers.push(newUser);
    setUser(newUser);
    localStorage.setItem('sea_user', JSON.stringify(newUser));
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sea_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
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
