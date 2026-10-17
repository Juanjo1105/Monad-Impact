# Monad Impact

**Transparent community crowdfunding on Monad.** Monad Impact is a hackathon MVP where people create funding campaigns, contribute native MON, and rely on smart-contract rules for successful withdrawals and failed-campaign refunds.

> **Status:** MVP / testnet demonstration. This repository is educational and has not been independently audited. Do not use it to custody real funds.

## Features

- Create campaigns with title, description, goal, and deadline.
- Contribute native MON through MetaMask.
- Prevent contributions that exceed the remaining goal.
- Allow the campaign creator to withdraw once the goal is reached.
- Allow each contributor to claim their contribution back after an unsuccessful campaign expires.
- On-chain events for campaign creation, donations, withdrawals, and refunds.
- Responsive static frontend using HTML, CSS, JavaScript, and ethers.js v6.

## Architecture

- `contracts/MonadImpact.sol`: Solidity contract.
- `frontend/`: static dApp.
- `tests/MonadImpact.t.sol`: Foundry test suite.
- `docs/`: architecture and security notes.

## Monad Testnet configuration

Check the current official Monad docs before using network details:
- Docs: https://docs.monad.xyz/developer-essentials/testnets
- Faucet: https://faucet.monad.xyz/
- Testnet explorer: https://testnet.monadvision.com
- Remix: https://remix.ethereum.org/

Current expected public testnet settings (verify against the official docs):
- Network: `Monad Testnet`
- Chain ID: `10143` (`0x279f`)
- RPC: `https://testnet-rpc.monad.xyz`
- Currency symbol: `MON`
- Explorer: `https://testnet.monadvision.com`

Testnet tokens are for testing only and have no intended monetary value.

## Deploy with Remix

1. Open Remix IDE and create `MonadImpact.sol`.
2. Paste the contents of `contracts/MonadImpact.sol`.
3. In Solidity Compiler, select a compatible `0.8.24` or later `0.8.x` compiler and compile.
4. Install/open MetaMask and switch to Monad Testnet using the verified settings above.
5. Get test MON from the official faucet.
6. In Remix's Deploy & Run Transactions panel, choose **Injected Provider - MetaMask**.
7. Select `MonadImpact` and click **Deploy**. Review the transaction in MetaMask.
8. Copy the deployed contract address from Remix.
9. Open `frontend/config.js` and replace `PASTE_DEPLOYED_CONTRACT_ADDRESS_HERE` with the address. Do not add quotes around anything except the address string already in quotes.
10. Commit the updated config only if it contains a public testnet contract address. Never commit private keys or seed phrases.

## Run the frontend

For local testing, serve the `frontend` directory over HTTP (do not rely on `file://`):

```bash
cd frontend
python -m http.server 8000
```

Then open `http://localhost:8000`. You can also use VS Code Live Server. Install MetaMask in the browser and switch it to Monad Testnet.

The frontend uses ethers.js v6 from a CDN. It reads public campaign data from the testnet RPC and uses MetaMask to sign write transactions. For a public demo, pin a reviewed ethers.js version or bundle the dependency instead of relying on a CDN.

## Manual acceptance test (Remix + two wallets)

Use only testnet funds.

1. Deploy the contract from Wallet A.
2. Create a campaign with a goal of `0.02 MON` and a deadline 1 day in the future.
3. From Wallet B, contribute `0.01 MON`. Confirm progress and the `DonationReceived` event.
4. Attempt a contribution larger than the remaining goal; it should revert.
5. Contribute the remaining `0.01 MON`. The campaign should reach 100%.
6. From Wallet A, withdraw. Confirm the `FundsWithdrawn` event and that a second withdrawal reverts.
7. Create a second campaign with a goal of `1 MON`; contribute `0.01 MON`, then wait until the deadline.
8. From Wallet B, claim the refund. Confirm the contribution is zero afterward and a second refund reverts.
9. Try to donate after expiry and try to refund a successful campaign; both should revert.
10. Verify the transaction hashes in the testnet explorer.

## Automated tests (Foundry, optional but recommended)

Install Foundry: https://book.getfoundry.sh/getting-started/installation

From the repository root:

```bash
forge install foundry-rs/forge-std --no-commit
forge test
```

The test suite checks creation, invalid goals, donations, over-goal rejection, creator-only withdrawal, double-withdrawal prevention, failed-campaign refunds, successful-campaign refund rejection, and donations after deadline.

## GitHub publication

1. Create a new public GitHub repository named `monad-impact`.
2. From the project root:

```bash
git init
git add .
git commit -m "Build Monad Impact hackathon MVP"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/monad-impact.git
git push -u origin main
```

3. Replace `YOUR-USERNAME` with your GitHub username.
4. Add screenshots and the testnet contract address / explorer link to this README after deployment.
5. If using GitHub Pages, configure Pages to publish from the `frontend` directory only if your repository settings support that setup. Otherwise publish the frontend with a static host such as Netlify or Vercel and link it here.

## Suggested team split (3 people, one day)

- **Person 1 — Contract:** deploy in Remix, verify edge cases, capture transaction hashes.
- **Person 2 — Frontend:** set contract address, test MetaMask, refine responsive UI.
- **Person 3 — QA and submission:** run manual tests, prepare screenshots, README, pitch, and GitHub repository.

## Known limitations

- Campaigns are stored on-chain and the frontend currently loads them by iterating over campaign IDs. This is appropriate for a small demo, not a large production app.
- No decentralized identity, moderation, token rewards, or off-chain indexing is implemented.
- A campaign reaching its goal can be withdrawn immediately; once the goal is reached, refunds are not available. Make this rule clear in the interface and demo.
- The contract is not audited. A production version should receive a professional security review, consider a pull-payment pattern, and add monitoring and stronger test coverage.
- The contract stores campaign descriptions on-chain; avoid personal or sensitive information.

## License

MIT — see `LICENSE`.
