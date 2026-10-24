import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string, role: string, turma?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileRequestId = useRef(0);

  useEffect(() => {
    // Verificar sessão ativa ao carregar
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Erro ao verificar sessão:', error);
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          void fetchProfile(session.user.id);
        } else {
          setIsLoading(false);
        }
      })
      .catch((error: unknown) => {
        console.error('Erro ao verificar sessão:', error);
        setUser(null);
        setIsLoading(false);
      });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void fetchProfile(session.user.id);
      } else {
        profileRequestId.current += 1;
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string): Promise<boolean> => {
    const requestId = ++profileRequestId.current;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        if (requestId === profileRequestId.current) {
          setUser(null);
          setIsLoading(false);
        }
        return false;
      }

      if (requestId !== profileRequestId.current) return false;
      if (!data || data.ativo === false) {
        setUser(null);
        setIsLoading(false);
        if (data?.ativo === false) {
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) {
            console.error('Erro ao encerrar sessão de usuário inativo:', signOutError);
          }
        }
        return false;
      }

      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        avatar: data.avatar,
        turma: data.turma,
        pontos: data.pontos,
        badges: data.badges,
        ativo: data.ativo,
      });
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Erro inesperado ao buscar perfil:', error);
      if (requestId === profileRequestId.current) {
        setUser(null);
        setIsLoading(false);
      }
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('Erro no login:', error.message);
        setIsLoading(false);
        return false;
      }

      if (!data.user) {
        setIsLoading(false);
        return false;
      }

      return await fetchProfile(data.user.id);
    } catch (error) {
      console.error('Erro inesperado no login:', error);
      setIsLoading(false);
      return false;
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: string,
    turma?: string
  ): Promise<boolean> => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role, turma }
        }
      });

      if (error) {
        console.error('Erro no cadastro:', error.message);
        setIsLoading(false);
        return false;
      }

      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Erro inesperado no cadastro:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro ao encerrar sessão:', error);
      throw new Error(error.message || 'Não foi possível encerrar a sessão.');
    }
    setUser(null);
  };

  const refreshUser = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, refreshUser, isLoading }}>
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