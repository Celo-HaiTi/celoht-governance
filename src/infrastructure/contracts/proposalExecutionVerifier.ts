import { isAddress } from 'viem';
import type { ExecutionVerifier } from '../../application/ports.js';
import type { Proposal } from '../../domain/types.js';
import { Errors } from '../../errors/GovernanceError.js';
import { CeloExecutionVerifier } from './celoVerification.js';

function requiredAddress(value: unknown): `0x${string}` {
  if (typeof value !== 'string' || !isAddress(value)) throw Errors.executionVerificationFailed('Approved action has no valid target address');
  return value;
}

export class CeloProposalExecutionVerifier implements ExecutionVerifier {
  constructor(
    private readonly verifier: CeloExecutionVerifier,
    private readonly chainId: number,
    private readonly minConfirmations: number,
  ) {}

  async verify(proposal: Proposal, transactionHash: string): Promise<void> {
    if (!/^0x[0-9a-fA-F]{64}$/.test(transactionHash)) {
      throw Errors.executionVerificationFailed('Malformed transaction hash');
    }
    const metadata = proposal.metadata;
    const expectation = {
      chainId: this.chainId,
      transactionHash: transactionHash as `0x${string}`,
      targetAddress: requiredAddress(metadata.targetAddress),
      minConfirmations: this.minConfirmations,
      ...(typeof metadata.calldata === 'string' ? { calldata: metadata.calldata as `0x${string}` } : {}),
      ...(typeof metadata.valueWei === 'string' ? { valueWei: BigInt(metadata.valueWei) } : {}),
    };
    await this.verifier.verify(expectation);
  }
}
