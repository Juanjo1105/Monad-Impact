# Architecture

## Data flow

1. The browser loads campaign state from the Monad Testnet RPC through ethers.js.
2. MetaMask exposes an EIP-1193 provider; ethers.js `BrowserProvider` connects to it.
3. Read operations use the contract's view functions.
4. Write operations require MetaMask approval and a transaction signed by the user.
5. Solidity emits events for state-changing actions; the explorer can independently verify the transaction.

## Contract invariants

- Campaign IDs start at 1.
- Goal must be positive; deadline must be in the future at creation.
- Donations must be positive, before deadline, and no greater than the remaining goal.
- Only the campaign creator may withdraw, only after reaching the goal, and only once.
- Refunds are available only after deadline when the goal was not reached; contribution is zeroed before the external transfer.
- Withdraw and refund are protected by a simple reentrancy guard.

## Scope choices

For a one-day beginner hackathon, the MVP avoids a backend, token issuance, or indexer. The frontend reads the campaign list directly from the contract. For production, add pagination/indexing, contract verification, monitoring, accessibility review, a security audit, and a threat model.
