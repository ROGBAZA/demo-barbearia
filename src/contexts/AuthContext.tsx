import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Cliente {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  user_id?: string | null;
}

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  nivel_acesso: 'funcionario' | 'administrador' | 'recepcionista';
  user_id?: string | null;
  tipo_comissao?: 'percentual' | 'valor_fixo';
  valor_comissao?: number;
  foto_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  funcionario: Funcionario | null;
  cliente: Cliente | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData: { nome: string; cargo: string; telefone?: string }) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  isAdmin: boolean;
  isGerente: boolean;
  isRecepcionista: boolean;
  isFuncionario: boolean;
  isCliente: boolean;
  isSuperAdmin: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string, userEmail: string) => {
    console.log('Fetching user data for:', userId, userEmail);
    try {
      // 1. Try to fetch funcionario (by user_id)
      let { data: funcionarioData, error: funcError } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (funcError) console.error('Error fetching funcionario by user_id:', funcError);

      // 2. Backup: search funcionario by email
      if (!funcionarioData) {
        const { data: funcByEmail } = await supabase
          .from('funcionarios')
          .select('*')
          .eq('email', userEmail)
          .maybeSingle();

        if (funcByEmail) {
          funcionarioData = funcByEmail;
          // Update user_id to link properly for next time
          if (!funcByEmail.user_id) {
            await supabase.from('funcionarios').update({ user_id: userId }).eq('id', funcByEmail.id);
          }
        }
      }

      // 3. If still no funcionario, try to fetch cliente
      let clienteData = null;
      if (!funcionarioData) {
        const { data: cData } = await supabase
          .from('clientes')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        clienteData = cData;

        if (!clienteData) {
          const { data: clienteByEmail } = await supabase
            .from('clientes')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();

          if (clienteByEmail) {
            clienteData = clienteByEmail;
            if (!clienteByEmail.user_id) {
              await supabase.from('clientes').update({ user_id: userId }).eq('id', clienteByEmail.id);
            }
          }
        }
      }

      // 4. Check if user is a Super Admin
      const { data: superAdminData } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', userId)
        .eq('ativo', true)
        .maybeSingle();

      // 5. Fetch the role from the specific table
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('ROLE DATA:', roleData);
      console.log('FUNCIONARIO DATA:', funcionarioData);
      console.log('CLIENTE DATA:', clienteData);

      // 5. Commit all states
      setFuncionario(funcionarioData as Funcionario);
      setCliente(clienteData as Cliente);

      let finalRole = 'cliente';

      if (superAdminData) {
        finalRole = 'super_admin';
      } else if (roleData?.role) {
        finalRole = roleData.role;
      } else if (funcionarioData?.nivel_acesso) {
        const nivel = funcionarioData.nivel_acesso;
        if (nivel === 'administrador') finalRole = 'admin';
        else if (nivel === 'recepcionista') finalRole = 'recepcionista';
        else finalRole = 'funcionario';
      }

      setUserRole(finalRole);
      console.log('FINAL USER ROLE DEFINED AS:', finalRole);

    } catch (error) {
      console.error('CRITICAL: Error in fetchUserData:', error);
      setUserRole('cliente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Tentar definir role inicial IMEDIATAMENTE pelos metadados para evitar "pulo" de menu
          const initialRole = session.user.user_metadata?.role || 'cliente';
          if (initialRole !== 'cliente') {
            setUserRole(initialRole);
          }

          fetchUserData(session.user.id, session.user.email || '');
        } else {
          setFuncionario(null);
          setCliente(null);
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const initialRole = session.user.user_metadata?.role || 'cliente';
        if (initialRole !== 'cliente') setUserRole(initialRole);
        fetchUserData(session.user.id, session.user.email || '');
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, userData: { nome: string; cargo: string; telefone?: string, tenantId?: string }) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome: userData.nome,
          cargo: userData.cargo,
          role: userData.cargo === 'administrador' ? 'admin' :
            (userData.cargo === 'gerente' ? 'gerente' :
              (userData.cargo === 'cliente' ? 'cliente' : 'funcionario')),
          tenant_id: userData.tenantId
        }
      }
    });

    if (error) return { error };
    return { error: null };
  };

  const signOut = async () => {
    setFuncionario(null);
    setCliente(null);
    setUserRole(null);
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
    return { error };
  };

  // Flags de Acesso robustas
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || funcionario?.nivel_acesso === 'administrador' || isSuperAdmin;
  const isGerente = userRole === 'gerente' || isAdmin;
  const isRecepcionista = userRole === 'recepcionista' || funcionario?.nivel_acesso === 'recepcionista';
  const isFuncionario = !!funcionario && funcionario.nivel_acesso === 'funcionario';

  // STAFF = Todo mundo que não é estritamente um cliente comum
  const isStaff = isAdmin || isGerente || isRecepcionista || isFuncionario;

  // CLIENTE = Só é true se NÃO for Staff
  const isCliente = !isStaff;

  console.log("👮‍♂️ Permissions:", { isAdmin, isStaff, isCliente, userRole });

  const value = {
    user,
    session,
    funcionario,
    cliente,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAdmin,
    isGerente,
    isRecepcionista,
    isFuncionario,
    isCliente,
    isSuperAdmin,
    refresh: async () => {
      if (user) {
        setLoading(true);
        await fetchUserData(user.id, user.email || '');
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
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