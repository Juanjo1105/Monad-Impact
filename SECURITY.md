# Security notes

- This is a hackathon MVP and has not been audited. Testnet only.
- Never ask users for seed phrases or private keys.
- Never commit secrets to GitHub.
- Use MetaMask to review and sign transactions.
- Verify the chain ID before writing.
- Campaign descriptions are public on-chain; never enter confidential or personal data.
- Contract writes use checks-effects-interactions and a reentrancy guard for native-coin transfers.
- Donations cannot exceed the remaining goal; this prevents overfunding and makes the goal rule deterministic.
- Reaching the goal makes a campaign successful immediately; donors cannot refund after success.
- Do not deploy this code with real funds without a professional audit and broader testing.
