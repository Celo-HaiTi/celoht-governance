import { Errors } from '../errors/GovernanceError.js';
import { verifyMessage, verifyTypedData, type Address, type Hex } from 'viem';

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
  deadline?: number;
}

export interface NonceStore {
  hasBeenUsed(nonce: string): Promise<boolean>;
  markUsed(nonce: string): Promise<void>;
  /** Production stores should atomically consume and return false on replay. */
  consume?(nonce: string): Promise<boolean>;
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

/** Production wallet signature verifier backed by viem. */
export class ViemSignatureVerifier implements SignatureVerifier {
  constructor(
    private readonly expectedChainId: number,
    private readonly expectedDomain: { name: string; version: string },
    private readonly nonces: NonceStore,
    private readonly nowSeconds: () => number = () => Math.floor(Date.now() / 1000),
  ) {}

  async verify(payload: SignaturePayload): Promise<void> {
    if (payload.chainId !== this.expectedChainId) {
      throw Errors.chainIdMismatch(this.expectedChainId, payload.chainId);
    }
    if (payload.domain.name !== this.expectedDomain.name || payload.domain.version !== this.expectedDomain.version) {
      throw Errors.invalidSignature();
    }
    if (payload.deadline !== undefined && payload.deadline < this.nowSeconds()) {
      throw Errors.signatureExpired();
    }
    if (await this.nonces.hasBeenUsed(payload.nonce)) {
      throw Errors.signatureReplay();
    }
    let valid = false;
    try {
      valid = await verifyMessage({
        address: payload.expectedSigner as `0x${string}`,
        message: payload.message,
        signature: payload.signature as `0x${string}`,
      });
    } catch {
      throw Errors.invalidSignature();
    }
    if (!valid) throw Errors.invalidSignature();
    if (this.nonces.consume) {
      if (!(await this.nonces.consume(payload.nonce))) throw Errors.signatureReplay();
    } else {
      await this.nonces.markUsed(payload.nonce);
    }
  }
}

export interface GovernanceTypedData {
  proposalId: Hex;
  action: Hex;
  nonce: bigint;
  deadline: bigint;
}

/** Production EIP-712 verifier for signed governance actions. */
export class ViemTypedDataVerifier implements SignatureVerifier {
  constructor(
    private readonly expectedChainId: number,
    private readonly expectedDomain: { name: string; version: string; verifyingContract: Address },
    private readonly nonces: NonceStore,
    private readonly nowSeconds: () => bigint = () => BigInt(Math.floor(Date.now() / 1000)),
  ) {}

  async verify(payload: SignaturePayload): Promise<void> {
    if (payload.chainId !== this.expectedChainId) throw Errors.chainIdMismatch(this.expectedChainId, payload.chainId);
    if (payload.domain.name !== this.expectedDomain.name || payload.domain.version !== this.expectedDomain.version) throw Errors.invalidSignature();
    const typed = this.parseTypedData(payload.message);
    if (typed.deadline < this.nowSeconds()) throw Errors.signatureExpired();
    if (typed.nonce.toString() !== payload.nonce) throw Errors.invalidSignature();
    if (await this.nonces.hasBeenUsed(payload.nonce)) throw Errors.signatureReplay();

    const valid = await verifyTypedData({
      address: payload.expectedSigner as Address,
      domain: { ...this.expectedDomain, chainId: this.expectedChainId },
      types: { GovernanceAction: [
        { name: 'proposalId', type: 'bytes32' },
        { name: 'action', type: 'bytes32' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ] },
      primaryType: 'GovernanceAction',
      message: typed,
      signature: payload.signature as Hex,
    });
    if (!valid) throw Errors.invalidSignature();
    if (this.nonces.consume) {
      if (!(await this.nonces.consume(payload.nonce))) throw Errors.signatureReplay();
    } else {
      await this.nonces.markUsed(payload.nonce);
    }
  }

  private parseTypedData(message: string): GovernanceTypedData {
    try {
      const value = JSON.parse(message) as Record<string, unknown>;
      if (typeof value.proposalId !== 'string' || typeof value.action !== 'string' || typeof value.nonce !== 'string' || typeof value.deadline !== 'string') throw new Error('invalid typed data');
      return { proposalId: value.proposalId as Hex, action: value.action as Hex, nonce: BigInt(value.nonce), deadline: BigInt(value.deadline) };
    } catch {
      throw Errors.invalidSignature();
    }
  }
}
