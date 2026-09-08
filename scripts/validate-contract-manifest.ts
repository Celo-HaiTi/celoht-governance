import { readFile } from 'node:fs/promises';
import { getAddress } from 'viem';
import { CELO_SEPOLIA_CHAIN_ID, VERIFIED_CELO_SEPOLIA } from '../src/infrastructure/contracts/verifiedDeployment.js';

interface DeploymentManifest {
  network: string;
  chainId: number;
  usdm: string;
  governance: string;
  governanceTreasury?: string;
  deploymentBlocks?: { governance?: number };
  verification?: string;
}

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) throw new Error('Usage: npm run validate:contracts -- /path/to/celoSepolia.json');
  const manifest = JSON.parse(await readFile(path, 'utf8')) as DeploymentManifest;
  const matchesAddress = (value: string | undefined, expected: string): boolean => {
    try {
      return value !== undefined && getAddress(value) === expected;
    } catch {
      return false;
    }
  };
  const checks: [string, boolean][] = [
    ['network', manifest.network === 'celoSepolia'],
    ['chainId', manifest.chainId === CELO_SEPOLIA_CHAIN_ID],
    ['governance', matchesAddress(manifest.governance, VERIFIED_CELO_SEPOLIA.governance)],
    ['usdm', matchesAddress(manifest.usdm, VERIFIED_CELO_SEPOLIA.usdm)],
    ['governance treasury', matchesAddress(manifest.governanceTreasury, VERIFIED_CELO_SEPOLIA.treasurySafe)],
    ['governance deployment block', manifest.deploymentBlocks?.governance === Number(VERIFIED_CELO_SEPOLIA.governanceDeploymentBlock)],
  ];
  const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length > 0) throw new Error(`Deployment manifest mismatch: ${failed.join(', ')}`);
  console.log('PASS: canonical Celo Sepolia deployment manifest matches');
}

await main();
