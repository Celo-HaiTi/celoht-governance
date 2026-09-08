import { describe, expect, it } from 'vitest';
import { assertVerifiedSepoliaConfiguration, VERIFIED_CELO_SEPOLIA } from '../../src/infrastructure/contracts/verifiedDeployment.js';

const base = {
  CELO_NETWORK: 'sepolia',
  CELO_CHAIN_ID: String(VERIFIED_CELO_SEPOLIA.chainId),
  GOVERNANCE_CONTRACT_ADDRESS: VERIFIED_CELO_SEPOLIA.governance,
  TREASURY_MULTISIG_ADDRESS: VERIFIED_CELO_SEPOLIA.treasurySafe,
  USDM_TOKEN_ADDRESS: VERIFIED_CELO_SEPOLIA.usdm,
};

describe('verified Celo deployment boundary', () => {
  it('accepts only the canonical Sepolia deployment', () => {
    expect(() => assertVerifiedSepoliaConfiguration(base)).not.toThrow();
  });

  it('rejects an unconfigured network', () => {
    expect(() => assertVerifiedSepoliaConfiguration({ ...base, CELO_NETWORK: 'mainnet' })).toThrow();
  });

  it('rejects an address that differs from the deployment manifest', () => {
    expect(() => assertVerifiedSepoliaConfiguration({ ...base, USDM_TOKEN_ADDRESS: `0x${'1'.repeat(40)}` })).toThrow();
  });
});