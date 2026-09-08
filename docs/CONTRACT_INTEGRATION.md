# Contract Integration

The only enabled deployment is the verified Celo Sepolia manifest. The
manifest validator checks network, chain ID, governance address, USDm address,
and governance deployment block. ABI/event synchronization remains owned by
the indexer, which consumes the canonical contract artifacts.

This service uses `viem` only for security-critical execution verification. It
checks RPC chain ID, transaction receipt success, destination, calldata, value,
and confirmation depth. It never signs or submits treasury transactions.
