import { getAddress } from 'viem';
import { Errors } from '../../errors/GovernanceError.js';

export const CELO_SEPOLIA_CHAIN_ID = 11142220;
export const CELO_SEPOLIA_RPC_URL = 'https://forno.celo-sepolia.celo-testnet.org';

/** Values copied from celoht-smart-contracts/deployments/celoSepolia.json. */
export const VERIFIED_CELO_SEPOLIA = {
  network: 'celoSepolia',
  chainId: CELO_SEPOLIA_CHAIN_ID,
  governance: getAddress('0x7D384851FAbB912287206556479Dd30c740CAdA5'),
  usdm: getAddress('0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b'),
  treasurySafe: getAddress('0xd856e0599cc49C9cef6C358d2c2f064112A6b384'),
  governanceDeploymentBlock: 35343249n,
} as const;

export function assertVerifiedSepoliaConfiguration(source: NodeJS.ProcessEnv = process.env): void {
  if (source.CELO_NETWORK !== 'sepolia') throw Errors.validation('Only Celo Sepolia is currently enabled');
  if (Number(source.CELO_CHAIN_ID) !== VERIFIED_CELO_SEPOLIA.chainId) {
    throw Errors.chainIdMismatch(VERIFIED_CELO_SEPOLIA.chainId, Number(source.CELO_CHAIN_ID));
  }
  const expected: Record<string, string> = {
    GOVERNANCE_CONTRACT_ADDRESS: VERIFIED_CELO_SEPOLIA.governance,
    TREASURY_MULTISIG_ADDRESS: VERIFIED_CELO_SEPOLIA.treasurySafe,
    USDM_TOKEN_ADDRESS: VERIFIED_CELO_SEPOLIA.usdm,
  };
  for (const [name, address] of Object.entries(expected)) {
    const configured = source[name];
    if (!configured) throw Errors.unverifiedContractAddress(name);
    if (getAddress(configured) !== address) throw Errors.validation(`${name} does not match the verified Celo Sepolia deployment`);
  }
}
