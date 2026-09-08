import { z } from 'zod';
import { Errors } from '../errors/GovernanceError.js';
import { assertVerifiedSepoliaConfiguration } from './contracts/verifiedDeployment.js';

/**
 * Startup environment validation. Fails closed (Section 21 / 31):
 * a production process with missing required configuration must
 * refuse to start, never silently substitute a development default.
 */
const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  CELO_NETWORK: z.enum(['mainnet', 'alfajores', 'sepolia']),
  CELO_RPC_URL: z.string().url(),
  CELO_CHAIN_ID: z.coerce.number().int().positive(),
  GOVERNANCE_VERSION: z.string().min(1),
  DEFAULT_QUORUM_BPS: z.coerce.number().int().min(1).max(10000),
  DEFAULT_APPROVAL_THRESHOLD_BPS: z.coerce.number().int().min(1).max(10000),
  DEFAULT_VOTING_PERIOD_SECONDS: z.coerce.number().int().positive(),
  DEFAULT_EXECUTION_DELAY_SECONDS: z.coerce.number().int().min(0),
  SIGNATURE_DOMAIN_NAME: z.string().min(1),
  SIGNATURE_DOMAIN_VERSION: z.string().min(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
  EMERGENCY_ROLE_MAX_DURATION_SECONDS: z.coerce.number().int().positive(),
});

// Production additionally requires real, verified contract addresses.
// These are optional at the base-schema level (staging/dev may be
// pre-deployment) but mandatory the moment NODE_ENV=production.
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const productionOnlySchema = z.object({
  GOVERNANCE_CONTRACT_ADDRESS: addressSchema,
  TREASURY_MULTISIG_ADDRESS: addressSchema,
  USDM_TOKEN_ADDRESS: addressSchema,
});

export type GovernanceEnv = z.infer<typeof baseSchema> & Partial<z.infer<typeof productionOnlySchema>>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): GovernanceEnv {
  const parsed = baseSchema.safeParse(source);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw Errors.missingConfiguration(missing);
  }

  const env = parsed.data;

  if (env.CELO_NETWORK !== 'sepolia') {
    throw Errors.validation('Only the verified Celo Sepolia deployment is enabled');
  }

  if (env.NODE_ENV === 'production') {
    const prodParsed = productionOnlySchema.safeParse(source);
    const secretKey = source.SUPABASE_SECRET_KEY?.trim() || source.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!prodParsed.success || !secretKey) {
      const missing = [
        ...(!prodParsed.success ? prodParsed.error.issues.map((i) => i.path.join('.')) : []),
        ...(!secretKey ? ['SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)'] : []),
      ].join(', ');
      // FAIL CLOSED: never let production run with an unverified or
      // absent treasury/governance contract address (Section 32/34).
      throw Errors.missingConfiguration(missing);
    }
    assertVerifiedSepoliaConfiguration(source);
    return { ...env, ...prodParsed.data, SUPABASE_SECRET_KEY: secretKey };
  }

  return env;
}
