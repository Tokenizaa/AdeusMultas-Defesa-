import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Track original env values
const originalUrl = process.env.VITE_SUPABASE_URL;
const originalAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function loadSupabaseModule(url: string | undefined, anonKey: string | undefined) {
  if (url === undefined) {
    delete process.env.VITE_SUPABASE_URL;
  } else {
    process.env.VITE_SUPABASE_URL = url;
  }
  if (anonKey === undefined) {
    delete process.env.VITE_SUPABASE_ANON_KEY;
  } else {
    process.env.VITE_SUPABASE_ANON_KEY = anonKey;
  }
  vi.resetModules();
  return await import('./supabase');
}

describe('supabase client initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.VITE_SUPABASE_URL;
    } else {
      process.env.VITE_SUPABASE_URL = originalUrl;
    }
    if (originalAnonKey === undefined) {
      delete process.env.VITE_SUPABASE_ANON_KEY;
    } else {
      process.env.VITE_SUPABASE_ANON_KEY = originalAnonKey;
    }
    vi.resetModules();
  });

  it('isSupabaseConfigured is true and supabase client is not null when URL and anon key are valid', async () => {
    const { isSupabaseConfigured, supabase } = await loadSupabaseModule(
      'https://test-project.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJpYXQiOjE3ODQxNDk1MjAsImV4cCI6MjA5OTcyNTUyMH0.signature',
    );

    expect(isSupabaseConfigured).toBe(true);
    expect(supabase).not.toBeNull();
  });

  it('isSupabaseConfigured is false and supabase is null when URL is missing', async () => {
    const { isSupabaseConfigured, supabase } = await loadSupabaseModule(
      undefined,
      'valid-anon-key-with-enough-characters-here',
    );

    expect(isSupabaseConfigured).toBe(false);
    expect(supabase).toBeNull();
  });

  it('isSupabaseConfigured is false and supabase is null when anon key is missing', async () => {
    const { isSupabaseConfigured, supabase } = await loadSupabaseModule(
      'https://test-project.supabase.co',
      undefined,
    );

    expect(isSupabaseConfigured).toBe(false);
    expect(supabase).toBeNull();
  });

  it('isSupabaseConfigured is false when URL does not start with https://', async () => {
    const { isSupabaseConfigured, supabase } = await loadSupabaseModule(
      'http://test-project.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJpYXQiOjE3ODQxNDk1MjAsImV4cCI6MjA5OTcyNTUyMH0.signature',
    );

    expect(isSupabaseConfigured).toBe(false);
    expect(supabase).toBeNull();
  });

  it('isSupabaseConfigured is false when anon key is too short (<= 20 chars)', async () => {
    const { isSupabaseConfigured, supabase } = await loadSupabaseModule(
      'https://test-project.supabase.co',
      'short-key',
    );

    expect(isSupabaseConfigured).toBe(false);
    expect(supabase).toBeNull();
  });
});
