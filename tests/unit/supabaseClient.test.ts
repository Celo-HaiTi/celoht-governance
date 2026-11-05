import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseAnonClient, getSupabaseClient } from '../../src/infrastructure/db/supabaseClient.js';
import { GovernanceError } from '../../src/errors/GovernanceError.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Supabase client configuration', () => {
  it('fails closed when the service URL or key is missing', () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('SUPABASE_SECRET_KEY', '');

    expect(() => getSupabaseClient()).toThrow(GovernanceError);
  });

  it('creates a service client using the secret-key fallback', () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', undefined);
    vi.stubEnv('SUPABASE_SECRET_KEY', 'secret-key');

    expect(getSupabaseClient()).toBeDefined();
  });

  it('fails closed when the anonymous URL or key is missing', () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', '');

    expect(() => getSupabaseAnonClient()).toThrow(GovernanceError);
  });

  it('creates an anonymous client when configured', () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');

    expect(getSupabaseAnonClient()).toBeDefined();
  });
});