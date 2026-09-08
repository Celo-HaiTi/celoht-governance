import type { GovernanceMember } from '../domain/types.js';

export interface AuthenticationRequest {
  authorizationHeader: string | undefined;
  cookieHeader: string | undefined;
}

export interface Authenticator {
  authenticate(request: AuthenticationRequest): Promise<GovernanceMember>;
}

export interface IdempotencyStore {
  execute<T>(input: {
    key: string;
    actorId: string;
    operation: string;
    requestHash: string;
    action: () => Promise<T>;
  }): Promise<T>;
}
