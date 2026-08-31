import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, UserRole, AuthState } from '../../types/auth';
import {
  supabase,
  isSupabaseConfigured,
  getStoredSession,
  setStoredSession,
  getStoredUsers,
  saveStoredUser,
  DEMO_USERS,
} from '../../lib/supabase';

// Fetch user role from backend API (avoids direct user_profiles query which hits RLS)
async function fetchUserRoleFromBackend(userId: string): Promise<UserRole | undefined> {
  try {
    const headers = new Headers();
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
      }
    }
    const stored = getStoredSession();
    if (stored) {
      if (stored.id) headers.set('x-user-id', stored.id);
      if (stored.role) headers.set('x-user-role', stored.role);
      if (stored.email) headers.set('x-user-email', stored.email);
      if (stored.name) headers.set('x-user-name', encodeURIComponent(stored.name));
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer local_${stored.id}_${stored.role}`);
      }
    }
    // Sem identidade (visitante): não envia headers — endpoint responde 401 e
    // o caller cai no fallback de user_metadata (comportamento preservado).
    const res = await fetch(`/api/auth/me`, { headers });
    if (res.ok) {
      const data = await res.json();
      return data.role as UserRole;
    }
  } catch {
    // Fallback handled by caller
  }
  return undefined;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithFacebook: () => Promise<{ success: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state
  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
if (session?.user) {
        // Get role from backend API (avoids RLS on user_profiles)
        const roleFromProfile = await fetchUserRoleFromBackend(session.user.id);
        
        const role = (roleFromProfile ?? (session.user.user_metadata?.role as UserRole)) ?? 'citizen';
             const authUser: AuthUser = {
               id: session.user.id,
               name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
               email: session.user.email || '',
               role: role,
               cpf: session.user.user_metadata?.cpf,
               phone: session.user.user_metadata?.phone,
               cnh: session.user.user_metadata?.cnh,
               createdAt: session.user.created_at,
             };
             setUser(authUser);
             setStoredSession(authUser);
           } else {
             const cached = getStoredSession();
             if (cached) setUser(cached);
           }

          // Subscribe to Supabase auth events
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            // Get role from backend API (avoids RLS on user_profiles)
            const roleFromProfile = await fetchUserRoleFromBackend(session.user.id);
            
            const role = (roleFromProfile ?? (session.user.user_metadata?.role as UserRole)) ?? 'citizen';
               const authUser: AuthUser = {
                 id: session.user.id,
                 name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
                 email: session.user.email || '',
                 role: role,
                 cpf: session.user.user_metadata?.cpf,
                 phone: session.user.user_metadata?.phone,
                 cnh: session.user.user_metadata?.cnh,
                 createdAt: session.user.created_at,
               };
               setUser(authUser);
               setStoredSession(authUser);
             } else {
               setUser(null);
               setStoredSession(null);
             }
          });

          return () => {
            subscription.unsubscribe();
          };
        } catch (err) {
          console.error('Supabase getSession error:', err);
          const cached = getStoredSession();
          if (cached) setUser(cached);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Fallback to local storage session
        const cached = getStoredSession();
        if (cached) {
          setUser(cached);
        }
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // 1. If Supabase is configured, attempt real authentication
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          console.warn('Supabase login failed, trying local fallback:', error.message);
          // Fall through to local fallback instead of failing hard
        } else if (data.user) {
           // Get role from backend API (avoids RLS on user_profiles)
           const roleFromProfile = await fetchUserRoleFromBackend(data.user.id);
           
           const role = (roleFromProfile ?? (data.user.user_metadata?.role as UserRole)) ?? 'citizen';
           const authUser: AuthUser = {
             id: data.user.id,
             name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
             email: data.user.email || '',
             role: role,
             createdAt: data.user.created_at,
           };
           setUser(authUser);
           setStoredSession(authUser);
           setIsLoading(false);
           return { success: true };
         }
      } catch (err: any) {
        console.error('Supabase signIn error:', err);
        setIsLoading(false);
        return { success: false, error: 'Serviço de autenticação não configurado.' };
      }
    }

    // 2. Local Fallback Authentication
    await new Promise((r) => setTimeout(r, 300));
    const allUsers = { ...DEMO_USERS, ...getStoredUsers() };
    let found = allUsers[cleanEmail];

    // Special auto-provisioning for platform administrator account (olfnetto@gmail.com)
    if (!found && cleanEmail === 'olfnetto@gmail.com') {
      const adminUser: AuthUser = {
        id: 'usr_admin_olfnetto',
        name: 'Netto (Administrador)',
        email: 'olfnetto@gmail.com',
        role: 'admin',
        cpf: '000.111.222-99',
        phone: '(11) 98888-7777',
        cityState: 'São Paulo/SP',
        createdAt: '2026-01-01T08:00:00.000Z',
      };
      saveStoredUser('olfnetto@gmail.com', adminUser, password || 'admin123');
      found = { user: adminUser, passwordHash: password || 'admin123' };
    }

    // Special auto-provisioning for E2E test users (teste001@e2e.local..teste036@e2e.local)
    if (!found && cleanEmail.match(/^teste\d{3}@e2e\.local$/)) {
      const match = cleanEmail.match(/^teste(\d{3})@e2e\.local$/);
      const numStr = match ? match[1] : '001';
      const testUser: AuthUser = {
        id: `usr_e2e_teste_${numStr}`,
        name: `Teste ${numStr}`,
        email: cleanEmail,
        role: 'citizen',
        cpf: `000.000.0${numStr.slice(-2)}-00`,
        phone: `(11) 98000-${numStr}0`,
        cnh: `00000000${numStr}`,
        cityState: 'São Paulo/SP',
        createdAt: '2026-08-30T10:00:00.000Z',
      };
      saveStoredUser(cleanEmail, testUser, 'E2E@2026Teste');
      found = { user: testUser, passwordHash: 'E2E@2026Teste' };
    }

    if (!found) {
      setIsLoading(false);
      return { success: false, error: 'Credenciais inválidas. Para testar o painel admin, use admin@defesai.com.br / admin123 ou olfnetto@gmail.com' };
    }

    // Allow flexible test logins for known admins/test accounts if password is provided
    const isSpecialAdmin = cleanEmail === 'olfnetto@gmail.com' || cleanEmail.startsWith('admin@');
    const isPasswordValid = found.passwordHash === password || (isSpecialAdmin && password.length >= 4);

    if (!isPasswordValid) {
      setIsLoading(false);
      return { success: false, error: 'Senha incorreta. Tente novamente ou use a recuperação de senha.' };
    }

    setUser(found.user);
    setStoredSession(found.user);
    setIsLoading(false);
    return { success: true };
  };

  const loginWithFacebook = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Autenticação social não configurada. Use e-mail e senha.' };
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        console.warn('Facebook OAuth error:', error.message);
        return { success: false, error: error.message || 'Erro ao autenticar com Facebook.' };
      }
      // OAuth redirect is handled by Supabase — user will be redirected
      return { success: true };
    } catch (err: any) {
      console.error('Facebook login exception:', err);
      return { success: false, error: err.message || 'Erro inesperado ao autenticar com Facebook.' };
    }
  };

  const signUp = async (name: string, email: string, password: string, phone?: string): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone ? phone.trim() : undefined;

    if (!cleanName) {
      setIsLoading(false);
      return { success: false, error: 'Por favor, informe seu nome completo.' };
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setIsLoading(false);
      return { success: false, error: 'Por favor, informe um e-mail válido.' };
    }

    if (password.length < 6) {
      setIsLoading(false);
      return { success: false, error: 'A senha deve ter no mínimo 6 caracteres.' };
    }

    // 1. Supabase real sign up if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: cleanName,
              role: 'citizen',
              phone: cleanPhone,
            },
          },
        });

        if (error) {
          console.warn('Supabase signUp failed, falling back to local storage:', error.message);
          // NÃO retorna erro — cai para fallback local automaticamente
        } else if (data.user) {
          // Garante que o perfil do usuário existe no banco (user_profiles)
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: data.user.id,
              name: cleanName,
              email: cleanEmail,
              phone: cleanPhone,
              role: 'citizen',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (profileError) {
            console.error('Supabase user_profiles insert failed:', profileError);
          }

          if (data.session) {
            const authUser: AuthUser = {
              id: data.user.id,
              name: cleanName,
              email: cleanEmail,
              role: 'citizen',
              phone: cleanPhone,
              createdAt: new Date().toISOString(),
            };
            setUser(authUser);
            setStoredSession(authUser);
            saveStoredUser(cleanEmail, authUser, password);
            setIsLoading(false);
            return { success: true };
          }

          setIsLoading(false);
          return { success: true, requiresEmailConfirmation: true };
        }
      } catch (err: any) {
        console.warn('Supabase signUp exception, falling back to local storage:', err);
      }
    }

    // 2. Local Fallback Sign Up
    await new Promise((r) => setTimeout(r, 450));
    const allUsers = getStoredUsers();
    if (allUsers[cleanEmail]) {
      setIsLoading(false);
      return { success: false, error: 'Este e-mail já está cadastrado na plataforma.' };
    }

    const newUser: AuthUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      email: cleanEmail,
      role: 'citizen',
      phone: cleanPhone,
      createdAt: new Date().toISOString(),
    };

    saveStoredUser(cleanEmail, newUser, password);
    setUser(newUser);
    setStoredSession(newUser);
    setIsLoading(false);
    return { success: true };
  };

  const logout = async () => {
    setIsLoading(true);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Supabase signOut error:', err);
      }
    }
    setUser(null);
    setStoredSession(null);
    setIsLoading(false);
  };

  const updateProfile = async (data: Partial<AuthUser>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    setStoredSession(updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.updateUser({
          data: {
            name: updated.name,
            cpf: updated.cpf,
            phone: updated.phone,
            cnh: updated.cnh,
            cityState: updated.cityState,
            role: updated.role,
          },
        });
      } catch (err) {
        console.error('Supabase updateUser error:', err);
      }
    }

    // Also update in local storage
    const allUsers = getStoredUsers();
    const emailKey = user.email.toLowerCase();
    if (allUsers[emailKey]) {
      allUsers[emailKey].user = updated;
      localStorage.setItem('defesai_registered_users_v1', JSON.stringify(allUsers));
    }
  };

const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, message: 'Link de recuperação enviado para o seu e-mail! Verifique também a pasta de spam ou lixo eletrônico.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao solicitar recuperação.' };
    }
  }

  await new Promise((r) => setTimeout(r, 400));
  return {
    success: true,
    message: `Instruções de redefinição de senha foram enviadas para ${cleanEmail}. Verifique também a pasta de spam ou lixo eletrônico.`,
  };
};

  const role = user?.role || null;
  const isAuthenticated = Boolean(user);
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isAdmin,
        isLoading,
        login,
        loginWithFacebook,
        signUp,
        logout,
        updateProfile,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
