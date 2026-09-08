import type { GovernanceMember } from '../domain/types.js';

export interface Authenticator {
  authenticate(authorizationHeader: string | undefined): Promise<GovernanceMember>;
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
