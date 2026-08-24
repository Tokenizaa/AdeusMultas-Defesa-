import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthUser } from '../types/auth';
import { Database } from '../types/supabase';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20
);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

// =========================================================================
// Pre-configured Demo Accounts — available ONLY in development mode
// =========================================================================
export const DEMO_USERS: Record<string, { user: AuthUser; passwordHash: string }> = (import.meta as any).env?.DEV
  ? {
      'motorista@www.defesai.shop': {
        user: {
          id: 'usr_motorista_carlos',
          name: 'Carlos Eduardo Silveira',
          email: 'motorista@www.defesai.shop',
          role: 'citizen',
          cpf: '123.456.789-00',
          phone: '(11) 98765-4321',
          cnh: '05492817492',
          cityState: 'São Paulo/SP',
          createdAt: '2026-06-10T10:00:00.000Z',
        },
        passwordHash: '123456',
      },
      'admin@www.defesai.shop': {
        user: {
          id: 'usr_admin_defesai',
          name: 'Administrador DefesAi',
          email: 'admin@www.defesai.shop',
          role: 'admin',
          cpf: '000.111.222-33',
          phone: '(11) 99999-0000',
          cityState: 'Brasília/DF',
          createdAt: '2026-01-01T08:00:00.000Z',
        },
        passwordHash: 'admin123',
      },
    }
  : {};

const STORAGE_KEY_AUTH = 'defesai_auth_session_v1';
const STORAGE_KEY_USERS = 'defesai_registered_users_v1';

export function getStoredUsers(): Record<string, { user: AuthUser; passwordHash: string }> {
  if (typeof window === 'undefined') return {};

  const raw = localStorage.getItem(STORAGE_KEY_USERS);
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveStoredUser(email: string, user: AuthUser, passwordHash: string) {
  try {
    const users = getStoredUsers();
    users[email.toLowerCase()] = { user, passwordHash };
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (err) {
    console.error('Error saving user to local store:', err);
  }
}

export function getStoredSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredSession(user: AuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    }
  } catch (err) {
    console.error('Error setting session to local store:', err);
  }
}
