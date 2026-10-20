# Feature Mapping — NewL1 concepts → Orderveil

Status legend: **Simulated** = implemented as a local model and covered by tests · **Simplified** = simulated with documented simplifications · **Not implemented** = described only.

| NewL1 concept | Proposal (S1 section) | Orderveil implementation | Status | Model assumptions | Not implemented |
|---|---|---|---|---|---|
| TEE Gateway | §00, §03 | Gateway architecture simulation (`runGateway`), Network topology | Simplified | Single gateway, term 1, slot 1, no network | TEE, RA-TLS, standby sync, failover, encrypted WAL |
| Private by Default | §04 protected path, §05 | Protected order flow: no hint, no commitment, unreferencable | Simulated | Privacy = information boundary in code | Encryption, confidential execution |
| Deterministic Ordering | §04 General | JavaScript ordering engine (`orderGeneral`) | Simulated | H = SHA-256; nonce order kept | Lanes, guaranteed-inclusion tail |
| 20 ms Tick | §04 figure 2 | Logical tick simulator (tick index, frozen set, ordering, batch) | Simplified | Logical time only | Any latency measurement |
| Opt-in Disclosure | §04.1, §04.2 | Authorized hint model with `targetCommitment`, 5-tick delay | Simplified | Full-body hints; searchers value on state at disclosure | Field-level summaries, D-lagged state, `gw_*` RPCs |
| After-ref Backrun | §04.1, §05 | Backrun ordering experiment: validity checks, tip competition, atomic exclusion | Simulated | 1 backrun/target; excluded if target reverts | Plugin scoring, profit-share pricing |
| SubBlock Streaming | §03.2 | SubBlock visualization (Playground ticks, Network, Home log) | Simplified | SHA-256 over canonical JSON; empty ticks emit SubBlocks | `enclaveSig`, validator ACKs, package proof summary |
| Input Commitment | §09 | Reproducible audit records per tick | Simulated | Domain-separated SHA-256 over sorted hashes | Receipts, WAL commitments |
| Replayability | §02.2, §09 | Replay verification tool (Passed / Failed) | Simulated | Self-contained JSON + local ed25519 integrity signature | Cross-platform vectors against a real gateway |
| Attestation | §09.1 | — | Not implemented | — | TDX/SEV-SNP quotes, measurements, key rotation |

Test coverage: `tests/ordering.test.js` (ordering, ticks, disclosure, after-ref), `tests/amm.test.js` (AMM, sandwich, arbitrage), `tests/scenario.test.js` (modes, residual risk, refunds), `tests/replay.test.js` (export/import/tamper detection).

## Phase 2 — Testnet Experiment

| Capability | Implementation | Status |
|---|---|---|
| Wallet connection | wagmi injected connector, network switch to chain 97 | Live |
| Testnet contract | `OrderveilCommitments` at `0x5ceB5B2bCb785A175F7D1814bF6D93438F9d33DE` (Foundry tests + deploy script) | Live |
| Publish commitment | Audit tab → Commit to BSC Testnet | Live |
| Verify commitment | Imported record → replay → on-chain lookup and field match | Live |
| BSC ordering control | — | Not claimed: a commitment only timestamps a record |
