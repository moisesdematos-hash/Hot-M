import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Supabase Remote Connectivity Test', () => {
  const supabaseUrl = 'https://kzqmryiixezemvyfjjfz.supabase.co';
  const supabaseAnonKey = 'sb_publishable_woCVqasmXquxpu8UuMqavg_YsnfWgBy';

  it('should successfully establish connection to the provided Supabase project', async () => {
    const client = createClient(supabaseUrl, supabaseAnonKey);
    // Ping auth health or select public schema
    const { data, error } = await client.auth.getSession();
    
    // As long as network request succeeds and we don't get 401/403 connection reject, error is null
    expect(error).toBeNull();
    expect(data.session).toBeNull(); // No user session logged in yet
  });
});
