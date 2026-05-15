import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface Empresa {
  id: string;
  nome: string;
  logo_url?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  dominio?: string;
}

export interface Permissoes {
  ver_dashboard?: boolean;
  ver_funil?: boolean;
  editar_negocios?: boolean;
  fechar_negocios?: boolean;
  ver_pessoas?: boolean;
  editar_pessoas?: boolean;
  ver_marketing?: boolean;
  editar_marketing?: boolean;
  acessar_chat?: boolean;
  ver_agenda?: boolean;
  gerenciar_usuarios?: boolean;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: 'Recepção' | 'Profissional' | 'Gestor' | 'Gestor/Profissional' | 'Comercial';
  especialidade?: string | null;
  ativo: boolean;
  empresa_id?: string;
  empresa?: Empresa;
  tema?: 'light' | 'dark';
  permissoes?: Permissoes | null;
}

interface AuthContextType {
  user: User | null;
  usuario: Usuario | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome: string, papel?: string, tipoEspecialidade?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchUsuario(session.user.id), 0);
      } else {
        setUsuario(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUsuario(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUsuario = async (authUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*, empresa(*)')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar usuário:', error);
      } else {
        // Formatar os dados para tratar arrays do join supabase (1:1)
        const usuarioFormatado = data ? {
          ...data,
          empresa: Array.isArray(data.empresa) ? data.empresa[0] : data.empresa
        } : null;
        setUsuario(usuarioFormatado as Usuario | null);
      }
    } catch (err) {
      console.error('Erro ao buscar usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, nome: string, papel: string = 'Recepção', tipoEspecialidade: string = 'geral') => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nome, papel, tipo_especialidade: tipoEspecialidade } },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ user, usuario, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
