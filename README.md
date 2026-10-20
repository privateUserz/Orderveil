# Orderveil — Gateway Lab

**Private Intent. Fair Execution.**

Orderveil Gateway Lab is a research platform for protected transaction ordering and MEV. It is built on the public ideas in BNB Chain NewL1's **TEE Gateway** proposal: private-by-default order flow, deterministic ordering, opt-in after-ref backruns, SubBlock streaming and replayable auditing.

> Orderveil is an independent research project inspired by BNB Chain NewL1's public technical proposals. It is not affiliated with or endorsed by BNB Chain.

The experiments are **Simulations**: local mathematical models and ordering runs in the browser, with no TEE and no attestation. Phase 2 adds an optional **Testnet Experiment** step: you can publish an experiment record's commitment to BSC Testnet (chain 97) with your wallet and verify it on-chain.

## Features

| Area | What it does |
|---|---|
| **MEV Playground** (`/playground`) | Constant-product AMM in BigInt. Runs one trade under Public, Protected and Opt-in ordering with a sandwich, blind or hint-informed adversary and backrun searchers. Shows output, execution price, price impact, slippage, MEV-related loss vs. a no-adversary baseline, attacker gross/fees/gas/net, opt-in refunds, reserves, price timelines and a Public-vs-Protected side-by-side. |
| **Ordering engine** | Fee-rate ordering with `SHA-256(txHash ‖ salt)` tie-breaks and nonce order. Protected/opt-in classification, 5-tick opt-in delay, after-ref validity checks and tip competition. One SubBlock per 20 ms logical tick, with input commitment, payload hash and parent hash. |
| **Audit & Replay** | Export a JSON record with a local ed25519 integrity signature. Import it to re-derive inputs, re-run ordering and AMM execution and compare every commitment: **Replay Passed / Failed**. |
| **Network** (`/network`) | React Flow topology of the simulated gateway. Each stage (Idle → Received → Classified → Ordered → Packaged → Completed) is driven by the engine's real output. |
| **Technology** (`/technology`) | The proposal explained, with source links. Each NewL1 concept is mapped to its implementation status. |
| **Docs** (`/docs`) | Introduction, NewL1 research, architecture, simulation model, AMM math, ordering rules, audit records, limitations, roadmap. |
| **BSC Testnet** | RainbowKit wallet picker for desktop browser-extension wallets (MetaMask, Binance Wallet, OKX, Trust, Bitget, TokenPocket, Rabby, any injected wallet). Mobile wallets / WalletConnect are intentionally not supported. Publish a record's digest, final SubBlock hash and execution hash to the `OrderveilCommitments` contract. Anyone who imports the record can check the commitment without a wallet. |
| **i18n** | English and 简体中文. Switching keeps the route and the experiment parameters, and the choice is saved in `localStorage`. |

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # Vitest: algorithms + UI
npm run build      # static build in dist/
npm run preview    # serve dist/

# contracts (Foundry) — first time: cd contracts && forge install foundry-rs/forge-std --no-git
npm run contracts:test   # forge tests
npm run contracts:build && npm run contracts:abi   # rebuild + sync ABI into src/contracts
```

### BSC Testnet configuration

Deployed contract: **OrderveilCommitments** at [`0x5ceB5B2bCb785A175F7D1814bF6D93438F9d33DE`](https://testnet.bscscan.com/address/0x5ceB5B2bCb785A175F7D1814bF6D93438F9d33DE) on BSC Testnet (chain 97), block 137859750. Source verified on Sourcify (exact match): https://sourcify.dev/#/lookup/0x5ceB5B2bCb785A175F7D1814bF6D93438F9d33DE


| Variable | Purpose |
|---|---|
| `VITE_ORDERVEIL_COMMITMENTS_ADDRESS` | Contract address (defaults to the canonical deployment in `src/config/onchain.js`) |
| `VITE_BSC_TESTNET_RPC_URL` | Read RPC (default `https://bsc-testnet-rpc.publicnode.com`) |
| `VITE_ORDERVEIL_CHAIN=local` + `VITE_LOCAL_RPC_URL` | Use a local Anvil chain (31337) for development |

Deploying: `cd contracts && forge script script/Deploy.s.sol --rpc-url $BSC_TESTNET_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast --legacy --with-gas-price 200000000` (legacy pricing is required: BSC Testnet reports a zero base fee). The script refuses any chain other than 97 or local.

Requires Node 20.19+ (Vite 8). The build is fully static. SPA fallbacks are included for Netlify/Cloudflare Pages (`public/_redirects`) and Vercel (`vercel.json`).

## Tech stack

React 19 · JavaScript (JSX, no TypeScript) · Vite · wagmi v2 + RainbowKit + viem (BSC Testnet) · Foundry (Solidity 0.8.24) · React Router · Tailwind CSS 4 · Motion · react-i18next · @xyflow/react · Recharts · viem (units, chain config) · @noble/hashes and @noble/curves (SHA-256, ed25519) · Vitest + React Testing Library.

## Project layout

```
src/simulation/   pure JS engine (amm, ordering, mev, replay, core) — no React
src/components/   layout, ui, home, topology, playground, charts, docs
src/pages/        Home, Technology, Playground, Network, Docs, NotFound
src/locales/      en.json, zh-CN.json
docs/             NEWL1_RESEARCH.md, FEATURE_MAPPING.md, ARCHITECTURE.md, SIMULATION_ASSUMPTIONS.md
tests/            amm, ordering, scenario, replay, onchain, ui
contracts/        Foundry project: OrderveilCommitments.sol, tests, deploy script
```

The hero illustration is an SVG component (`src/components/home/HeroIsometric.jsx`) redrawn from the selected reference, so it stays sharp at any size and its labels follow the active language. `public/images/og-cover.jpg` is the social preview image.

## Real vs. simulated

| Category | Meaning | v1 |
|---|---|---|
| Simulation | Local model and ordering experiment | ✅ everything |
| Testnet Experiment | Real BSC Testnet transactions / contract checks | ✅ optional record commitments |
| Verified Native Integration | Connected to and verified on NewL1 | ❌ Phase 3 |

v1 does **not** deploy a NewL1 Gateway, connect to NewL1, run Intel TDX / AMD SEV-SNP, produce remote attestation or `enclaveSig`, or achieve real 20 ms latency. It does not eliminate MEV. The protected path still carries the residual risk the proposal itself names. `simulationSignature` is a local integrity signature and never a TEE proof.

## Roadmap

1. **Phase 1 — Local research platform** (this version).
2. **Phase 2 — BSC Testnet (chain 97)** (live): wallet connection (wagmi), RPC adapter, `OrderveilCommitments` contract, publishing and verifying commitments, explorer links. A commitment only shows that the record existed at a point in time. It does not mean Orderveil controls BSC ordering.
3. **Phase 3 — NewL1 integration**: once public test environments exist, study the real Gateway interfaces, verify ordering and measure performance.

## Token

**Orderveil (ORVL)** is a reserved name for a possible future project token. It is not deployed, sold or distributed, and has no tokenomics. It is unrelated to BNB, BNB Chain or NewL1. NewL1 uses BNB as its native token and will not issue a new one.

## References

- Introducing NewL1 MEV Solution — TEE Gateway: https://forum.bnbchain.org/t/introducing-newl1-mev-solution-tee-gateway/5589
- About the BNB Chain NewL1 category: https://forum.bnbchain.org/t/about-the-bnbchain-newl1-category/5437

See `docs/NEWL1_RESEARCH.md` for the section-by-section mapping to the sources.
