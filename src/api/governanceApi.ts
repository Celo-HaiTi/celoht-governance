import { z } from 'zod';
import { Errors } from '../errors/GovernanceError.js';

export type ApiResponse<T> = {
  ok: true;
  data: T;
  meta: { requestId: string; correlationId: string | undefined };
} | {
  ok: false;
  error: { code: string; message: string; details: Record<string, unknown> | undefined };
  meta: { requestId: string; correlationId: string | undefined };
};

export const governanceApiSchemas = {
  correlationId: z.string().min(1).max(200).optional(),
  requestId: z.string().min(1).max(200),
};

export function okResponse<T>(data: T, requestId: string, correlationId?: string): ApiResponse<T> {
  return { ok: true, data, meta: { requestId, correlationId: correlationId ?? undefined } };
}

export function errorResponse(code: string, message: string, requestId: string, correlationId?: string, details?: Record<string, unknown>): ApiResponse<never> {
  return {
    ok: false,
    error: { code, message, details: details ?? undefined },
    meta: { requestId, correlationId: correlationId ?? undefined },
  };
}

export function healthCheck(): Promise<ApiResponse<{ status: 'ok' }>> {
  return Promise.resolve(okResponse({ status: 'ok' }, 'healthcheck'));
}

export function readinessCheck(): Promise<ApiResponse<{ status: 'ready' | 'blocked'; issues: string[] }>> {
  const issues: string[] = [];
  if (!process.env.DATABASE_URL) issues.push('DATABASE_URL missing');
  if (!process.env.SUPABASE_URL) issues.push('SUPABASE_URL missing');
  if (!process.env.CELO_RPC_URL) issues.push('CELO_RPC_URL missing');
  if (!process.env.GOVERNANCE_CONTRACT_ADDRESS) issues.push('GOVERNANCE_CONTRACT_ADDRESS missing');
  if (!process.env.TIMELOCK_CONTRACT_ADDRESS) issues.push('TIMELOCK_CONTRACT_ADDRESS missing');
  if (!process.env.TREASURY_MULTISIG_ADDRESS) issues.push('TREASURY_MULTISIG_ADDRESS missing');
  if (!process.env.USDM_TOKEN_ADDRESS) issues.push('USDM_TOKEN_ADDRESS missing');

  return Promise.resolve(
    issues.length === 0
      ? okResponse({ status: 'ready', issues: [] }, 'readiness')
      : errorResponse('BLOCKED', 'Readiness check failed', 'readiness', undefined, { issues }),
  );
}

export function assertAuthenticated(jwt: string | undefined): void {
  if (!jwt || !jwt.startsWith('Bearer ')) {
    throw Errors.unauthorized('Authorization header is required');
  }
}
