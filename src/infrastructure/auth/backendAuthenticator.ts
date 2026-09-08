import type { GovernanceMember } from '../../domain/types.js';
import type { AuthenticationRequest, Authenticator } from '../../application/securityPorts.js';

/**
 * Adapter boundary for celoht-backend's verified actor resolver.
 *
 * The backend remains responsible for verifying `celoht_session` (or its
 * future Authorization token), looking up the actor in `profiles`, and
 * mapping the canonical backend role to an explicit governance member. This
 * package never parses or reimplements the backend HMAC session format.
 */
export type BackendActorResolver = (request: AuthenticationRequest) => Promise<GovernanceMember>;

export class BackendAuthenticator implements Authenticator {
  constructor(private readonly resolveActor: BackendActorResolver) {}

  authenticate(request: AuthenticationRequest): Promise<GovernanceMember> {
    return this.resolveActor(request);
  }
}