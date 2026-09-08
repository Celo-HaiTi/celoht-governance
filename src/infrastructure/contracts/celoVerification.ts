import { createPublicClient, getAddress, http, type PublicClient } from 'viem';
import { Errors } from '../../errors/GovernanceError.js';

export interface ExecutionExpectation {
  chainId: number;
  transactionHash: `0x${string}`;
  targetAddress: `0x${string}`;
  calldata?: `0x${string}`;
  valueWei?: bigint;
  minConfirmations: number;
}

export interface VerifiedExecution {
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  confirmations: bigint;
  targetAddress: `0x${string}`;
  calldata: `0x${string}`;
  valueWei: bigint;
}

export class CeloExecutionVerifier {
  constructor(private readonly client: PublicClient) {}

  static fromEnvironment(): CeloExecutionVerifier {
    const rpcUrl = process.env.CELO_RPC_URL;
    if (!rpcUrl) throw Errors.missingConfiguration('CELO_RPC_URL');
    // The installed viem release exposes slightly different chain-specific
    // client generics; keep that compatibility cast at this infrastructure
    // boundary rather than leaking it into the verifier contract.
    return new CeloExecutionVerifier(createPublicClient({ transport: http(rpcUrl) }) as unknown as PublicClient);
  }

  async verify(expectation: ExecutionExpectation): Promise<VerifiedExecution> {
    const chainId = await this.client.getChainId();
    if (chainId !== expectation.chainId) throw Errors.chainIdMismatch(expectation.chainId, chainId);
    const transaction = await this.client.getTransaction({ hash: expectation.transactionHash });
    const receipt = await this.client.getTransactionReceipt({ hash: expectation.transactionHash });
    if (receipt.status !== 'success') throw Errors.executionVerificationFailed('Transaction reverted');

    const transactionTarget = transaction.to;
    if (!transactionTarget || getAddress(transactionTarget) !== getAddress(expectation.targetAddress)) {
      throw Errors.executionVerificationFailed('Transaction target does not match the approved action');
    }
    if (expectation.calldata && transaction.input.toLowerCase() !== expectation.calldata.toLowerCase()) {
      throw Errors.executionVerificationFailed('Transaction calldata does not match the approved action');
    }
    if (expectation.valueWei !== undefined && transaction.value !== expectation.valueWei) {
      throw Errors.executionVerificationFailed('Transaction value does not match the approved action');
    }

    const head = await this.client.getBlockNumber();
    const confirmations = head >= receipt.blockNumber ? head - receipt.blockNumber + 1n : 0n;
    if (confirmations < BigInt(expectation.minConfirmations)) {
      throw Errors.executionVerificationFailed('Transaction has not reached the required confirmation depth');
    }
    return {
      transactionHash: expectation.transactionHash,
      blockNumber: receipt.blockNumber,
      confirmations,
      targetAddress: getAddress(transactionTarget),
      calldata: transaction.input,
      valueWei: transaction.value,
    };
  }
}
