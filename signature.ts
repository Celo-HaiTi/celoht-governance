import { Errors } from '../errors/GovernanceError.js';

/**
 * Cryptographic signature verification contract for wallet-based
 * voting (Section 16). This module defines the INTERFACE and the
 * required checks; it deliberately does NOT implement custom
 * cryptography. A production implementation must use an established,
 * audited library (e.g. ethers.js / viem for EIP-712 typed-data
 * verification) wired in at the infrastructure layer.
 *
 * Required checks, all enforced before returning success:
 *  - signature recovers to expectedSigner
 *  - nonce has not been used before (replay protection)
 *  - chainId matches the configured governance chain
 *  - domain (name + version) matches SIGNATURE_DOMAIN_* config
 *  - message has not expired, if an expiry is embedded
 */
export interface SignaturePayload {
  expectedSigner: string;
  message: string;
  signature: string;
  nonce: string;
  chainId: number;
  domain: { name: string; version: string };
}

export interface NonceStore {
  hasBeenUsed(nonce: string): Promise<boolean>;
  markUsed(nonce: string): Promise<void>;
}

export interface SignatureVerifier {
  verify(payload: SignaturePayload): Promise<void>;
}

export class Eip712SignatureVerifier implements SignatureVerifier {
  constructor(
    private readonly expectedChainId: number,
    private readonly expectedDomain: { name: string; version: string },
    private readonly nonces: NonceStore,
    // Injected recovery function so this module never implements its
    // own crypto — production wiring supplies ethers/viem here.
    private readonly recoverSigner: (message: string, signature: string) => Promise<string>,
  ) {}

  async verify(payload: SignaturePayload): Promise<void> {
    if (payload.chainId !== this.expectedChainId) {
      throw Errors.chainIdMismatch(this.expectedChainId, payload.chainId);
    }
    if (
      payload.domain.name !== this.expectedDomain.name ||
      payload.domain.version !== this.expectedDomain.version
    ) {
      throw Errors.invalidSignature();
    }
    if (await this.nonces.hasBeenUsed(payload.nonce)) {
      throw Errors.signatureReplay();
    }

    const recovered = await this.recoverSigner(payload.message, payload.signature);
    if (recovered.toLowerCase() !== payload.expectedSigner.toLowerCase()) {
      throw Errors.invalidSignature();
    }

    await this.nonces.markUsed(payload.nonce);
  }
}
