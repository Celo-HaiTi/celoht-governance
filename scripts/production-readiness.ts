import { loadEnv } from '../src/infrastructure/env.js';

function main(): void {
  try {
    const env = loadEnv(process.env);
    const required = [
      'DATABASE_URL',
      'SUPABASE_URL',
      'SUPABASE_SECRET_KEY',
      'CELO_RPC_URL',
      'CELO_CHAIN_ID',
      'GOVERNANCE_CONTRACT_ADDRESS',
      'TREASURY_MULTISIG_ADDRESS',
      'USDM_TOKEN_ADDRESS',
    ];

    const hasSupabaseSecret = Boolean(
      String((env as Record<string, unknown>).SUPABASE_SECRET_KEY ?? '').trim()
      || String((env as Record<string, unknown>).SUPABASE_SERVICE_ROLE_KEY ?? '').trim(),
    );
    const missing = required.filter((key) => key !== 'SUPABASE_SECRET_KEY' && !String((env as Record<string, unknown>)[key] ?? '').trim());
    if (!hasSupabaseSecret) missing.push('SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)');
    if (missing.length > 0) {
      console.log('BLOCKED');
      console.log(`Missing required configuration: ${missing.join(', ')}`);
      process.exitCode = 1;
      return;
    }

    console.log('PASS');
  } catch (error) {
    console.log('BLOCKED');
    const message = error instanceof Error ? error.message : 'Unknown startup validation failure';
    console.log(message);
    process.exitCode = 1;
  }
}

main();
