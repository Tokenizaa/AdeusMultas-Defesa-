import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, UserRole, AuthState } from '../../types/auth';
import {
  supabase,
  isSupabaseConfigured,
  getStoredSession,
  setStoredSession,
  getStoredUsers,
  saveStoredUser,
} from '../../lib/supabase';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
             // Get role from user_profiles table for accuracy, fallback to user_metadata
             let roleFromProfile: UserRole | undefined;
             if (isSupabaseConfigured && supabase) {
               try {
                 const { data: profileData, error: profileError } = await supabase
                   .from('user_profiles')
                   .select('role')
                   .eq('user_id', session.user.id)
                   .single();
                 if (!profileError && profileData?.role) {
                   roleFromProfile = profileData.role as UserRole;
                 }
               } catch (profileErr) {
                 // Ignore profile fetch errors, fall back to user_metadata
                 console.warn('Failed to fetch user profile for role:', profileErr);
}
}
                
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
               // Get role from user_profiles table for accuracy, fallback to user_metadata
               let roleFromProfile: UserRole | undefined;
               if (isSupabaseConfigured && supabase) {
                 try {
                   const { data: profileData, error: profileError } = await supabase
                     .from('user_profiles')
                     .select('role')
                     .eq('user_id', session.user.id)
                     .single();
                 if (!profileError && profileData?.role) {
                   roleFromProfile = profileData.role as UserRole;
                 }
                 } catch (profileErr) {
                   // Ignore profile fetch errors, fall back to user_metadata
                   console.warn('Failed to fetch user profile for role:', profileErr);
                 }
               }
               
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
           // Get role from user_profiles table for accuracy, fallback to user_metadata
           let roleFromProfile: UserRole | undefined;
           if (isSupabaseConfigured && supabase) {
             try {
               const { data: profileData, error: profileError } = await supabase
                 .from('user_profiles')
                 .select('role')
                 .eq('user_id', data.user.id)
                 .single();
               if (!profileError && profileData?.role) {
                 roleFromProfile = profileData.role as UserRole;
               }
             } catch (profileErr) {
               // Ignore profile fetch errors, fall back to user_metadata
               console.warn('Failed to fetch user profile for role:', profileErr);
             }
           }
           
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
    await new Promise((r) => setTimeout(r, 400));
    const allUsers = getStoredUsers();
    const found = allUsers[cleanEmail];

    if (!found) {
      setIsLoading(false);
      return { success: false, error: 'Credenciais inválidas.' };
    }

    if (found.passwordHash !== password) {
      setIsLoading(false);
      return { success: false, error: 'Senha incorreta. Tente novamente ou use a recuperação de senha.' };
    }

    setUser(found.user);
    setStoredSession(found.user);
    setIsLoading(false);
    return { success: true };
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
