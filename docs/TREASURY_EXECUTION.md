# Treasury Execution

The lifecycle is:

`governance decision -> service timelock -> approved Safe execution -> Celo receipt -> confirmations -> indexer observation -> verification -> EXECUTED`

The Treasury Safe is custody infrastructure outside this repository. No
private key, signer secret, or seed phrase belongs in governance. Execution is
recorded only after `CeloExecutionVerifier` confirms the expected chain,
target, calldata, value, successful receipt, and configured confirmations.
