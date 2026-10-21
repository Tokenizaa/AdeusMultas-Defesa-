import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { AuthUser, UserRole, AuthState } from '../../types/auth';
import {
  supabase,
  isSupabaseConfigured,
  setStoredSession,
} from '../../lib/supabase';

// Fetch user role from backend API (avoids direct user_profiles query which hits RLS).
// The backend receives identity exclusively from the real Supabase access token.
async function fetchUserRoleFromBackend(): Promise<UserRole | undefined> {
  try {
    if (!supabase) return undefined;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return undefined;

    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return data.role as UserRole;
    }
  } catch {
    // Caller remains fail-closed when the authoritative session is unavailable.
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

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setUser(null);
      setStoredSession(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function applySession(sessionUser: SupabaseUser | null) {
      if (!mounted) return;
      if (!sessionUser) {
        setUser(null);
        setStoredSession(null);
        return;
      }

      const roleFromProfile = await fetchUserRoleFromBackend();
      const { data: profile } = await supabase.from('user_profiles')
        .select('*').eq('user_id', sessionUser.id).maybeSingle();
      if (!mounted) return;

      const role = (roleFromProfile ?? (sessionUser.user_metadata?.role as UserRole)) ?? 'citizen';
      const authUser: AuthUser = {
        id: sessionUser.id,
        name: profile?.name || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'Usuário',
        email: sessionUser.email || '',
        role,
        cpf: profile?.cpf || sessionUser.user_metadata?.cpf,
        phone: profile?.phone || sessionUser.user_metadata?.phone,
        cnh: profile?.cnh || sessionUser.user_metadata?.cnh,
        cityState: profile?.city_state || undefined,
        referralCode: profile?.referral_code || undefined,
        rg: profile?.rg || undefined,
        cnhCategory: profile?.cnh_category || undefined,
        addressStreet: profile?.address_street || undefined,
        addressNumber: profile?.address_number || undefined,
        addressComplement: profile?.address_complement || undefined,
        addressNeighborhood: profile?.address_neighborhood || undefined,
        addressZipCode: profile?.address_zip_code || undefined,
        createdAt: sessionUser.created_at,
      };
      setUser(authUser);
      // Cache is informational only; it is never used to authenticate or authorize.
      setStoredSession(authUser);
    }

    async function initAuth() {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase!.auth.getSession();
        await applySession(session?.user ?? null);
      } catch (err) {
        console.error('Supabase getSession error:', err);
        if (mounted) {
          setUser(null);
          setStoredSession(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await applySession(session?.user ?? null);
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return { success: false, error: 'Serviço de autenticação não disponível. Configure Supabase para fazer login.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.user) {
        setIsLoading(false);
        return { success: false, error: error?.message || 'Não foi possível autenticar.' };
      }

      const roleFromProfile = await fetchUserRoleFromBackend();
      const role = (roleFromProfile ?? (data.user.user_metadata?.role as UserRole)) ?? 'citizen';
      const authUser: AuthUser = {
        id: data.user.id,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
        email: data.user.email || '',
        role,
        createdAt: data.user.created_at,
      };
      setUser(authUser);
      setStoredSession(authUser);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error('Supabase signIn error:', err);
      setIsLoading(false);
      return { success: false, error: 'Erro ao autenticar. Tente novamente.' };
    }
  };

  const loginWithFacebook = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Autenticação social não configurada. Use e-mail e senha.' };
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) {
        return { success: false, error: error.message || 'Erro ao autenticar com Facebook.' };
      }
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
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return { success: false, error: 'Serviço de autenticação não disponível. Configure Supabase para cadastrar.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name: cleanName, role: 'citizen', phone: cleanPhone },
        },
      });

      if (error || !data.user) {
        setIsLoading(false);
        return { success: false, error: error?.message || 'Não foi possível cadastrar.' };
      }

      // user_profiles é criado automaticamente pelo trigger handle_new_user() em auth.users
      // Não fazer insert manual para evitar conflito de PK e erro de RLS

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
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: true, requiresEmailConfirmation: true };
    } catch (err: any) {
      console.error('Supabase signUp exception:', err);
      setIsLoading(false);
      return { success: false, error: 'Erro ao cadastrar. Tente novamente.' };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    if (supabase) {
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
    if (!user || !supabase) return;

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name: data.name ?? user.name,
          cpf: data.cpf ?? user.cpf,
          phone: data.phone ?? user.phone,
          cnh: data.cnh ?? user.cnh,
          cityState: data.cityState ?? user.cityState,
          role: user.role,
        },
      });
      if (error) throw error;

      const profileData = {
        name: data.name ?? user.name,
        cpf: data.cpf ?? user.cpf ?? null,
        phone: data.phone ?? user.phone ?? null,
        cnh: data.cnh ?? user.cnh ?? null,
        city_state: data.cityState ?? user.cityState ?? null,
        rg: data.rg ?? user.rg ?? null,
        cnh_category: data.cnhCategory ?? user.cnhCategory ?? null,
        address_street: data.addressStreet ?? user.addressStreet ?? null,
        address_number: data.addressNumber ?? user.addressNumber ?? null,
        address_complement: data.addressComplement ?? user.addressComplement ?? null,
        address_neighborhood: data.addressNeighborhood ?? user.addressNeighborhood ?? null,
        address_zip_code: data.addressZipCode ?? user.addressZipCode ?? null,
        updated_at: new Date().toISOString(),
      };
      const { error: profileError } = await supabase.from('user_profiles')
        .update(profileData).eq('user_id', user.id);
      if (profileError) throw profileError;

      const updated = { ...user, ...data, role: user.role };
      setUser(updated);
      setStoredSession(updated);
    } catch (err) {
      console.error('Supabase updateUser error:', err);
      throw err;
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, message: 'Serviço de recuperação de senha não disponível. Configure Supabase.' };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) return { success: false, message: error.message };
      return { success: true, message: 'Link de recuperação enviado para o seu e-mail! Verifique também a pasta de spam ou lixo eletrônico.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao solicitar recuperação.' };
    }
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
