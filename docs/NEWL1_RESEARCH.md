# NewL1 Research Notes

Sources read on **2026-10-20** (both pages were accessible; raw Markdown fetched via the Discourse `/raw/<id>` endpoint):

| # | Source | URL |
|---|---|---|
| S1 | *NewL1 TEE Gateway: Trusted Ordering, SubBlock Streaming, and Low-Latency Block Production* (forum post "Introducing NewL1 MEV Solution — TEE Gateway", author `galaio`, 2026-10-14) | https://forum.bnbchain.org/t/introducing-newl1-mev-solution-tee-gateway/5589 |
| S2 | *Welcome to the NewL1 Forum* ("About the BNB Chain NewL1 category", 2026-07-14) | https://forum.bnbchain.org/t/about-the-bnbchain-newl1-category/5437 |

Orderveil is an independent research project. Nothing below is an official specification. Each row says whether Orderveil **follows** the source, **chooses** a detail the source leaves open, or **omits** a feature.

## S2 — What NewL1 is

| Source statement | Use in Orderveil |
|---|---|
| "Vertical-Optimized General-Purpose L1", fully EVM-compatible, for trading, payments, privacy, AI | Technology page, "What is NewL1?" |
| Complements BSC rather than replacing it; official native bridge | Technology page |
| "BNB is the native token; no new token will be issued" | ORVL is described everywhere as an unrelated, undeployed project name |

## S1 — TEE Gateway, section by section

### 00. Core Proposal
| Statement | Orderveil |
|---|---|
| Gateway is an attestable ordering and packaging service, not a new consensus role; the validator verifies, signs, proposes | **Follows** conceptually. Validator node in the topology is conceptual; no consensus is simulated |
| Transactions private by default; opt-in may expose unsigned contents and receive refunds via after-ref backruns | **Follows**: protected/opt-in paths, refunds from winning tips |
| Primary + standby Gateway per validator, same region | **Omits** (single simulated gateway) |
| Blocks without TEE proof stay valid; extra 30% of validator revenue burned | **Omits** (documented on Technology page only) |

### 01. Goals and Boundaries
| Goal | Orderveil |
|---|---|
| G1 Privacy — hidden before ordering | Modelled as an information boundary in code (`searcherView` returns hints only); no encryption |
| G2 Fairness — same frozen input set, ruleset version and random salt ⇒ same order | **Follows**; enforced by tests and replay |
| G3 Latency — within one tick | **Omits**; ticks are logical |
| G4 Revenue — internalize beneficial MEV via opt-in | **Follows** (refund share is an Orderveil assumption) |
| G5 Liveness / G6 Evolution | **Omits** (ruleset is versioned separately from code, in the spirit of G6) |

### 03. Overall Architecture
| Statement | Orderveil |
|---|---|
| Components: encrypted ingress, classifier, deterministic ordering engine, SubBlock generator, block packager, validator adapter, on-chain observation | Topology nodes + `src/simulation/ordering/engine.js` (`classify`, `orderGeneral`, `runGateway`) |
| Every SubBlock binds `gatewayId, workloadId, rulesetVersion, term, slot, tick, parentSubBlockHash, inputCommitment, payloadHash, enclaveSig` | **Follows** for all fields **except `enclaveSig`**, which is never produced. A separate `simulationSignature` (ed25519, local key) is used only for record integrity |
| Final package concatenates SubBlocks only in acknowledged order | **Follows**: `finalOrder` is the concatenation of tick entries |

### 04. Ordering Engine
| Statement | Orderveil |
|---|---|
| Protected path: default; no hints, no after-ref references; enter the next available tick | **Follows**. Interpretation: "next available tick" = the tick in which the transaction arrives (frozen at its end) |
| Opt-in delayed path: unsigned body or summary disclosed; default delay 5 ticks (100 ms window) | **Follows** with full-body hints only; summaries **omitted** |
| General: sort by effective fee rate; ties `H(txHash ‖ salt)` | **Follows**. **Chooses**: H = SHA-256 over raw 32-byte concatenation, ascending big-endian comparison |
| Atomic bundles: contiguous, any failure excludes the group | **Follows** for backrun bundles |
| After-ref: only immediately after the target; no before-ref; compete on committed tips | **Follows**. **Chooses**: ties by SHA-256(bundleHash ‖ salt); max 1 backrun per target |
| Lane segments; guaranteed-inclusion tail | **Omits** |
| 20 ms tick is an engineering target to validate at P50/P99 | Displayed as a target only; never claimed as achieved |
| §4.2 Hint = complete unsigned body; signature never in the hint stream; searchers reference a Gateway-generated `targetCommitment` | **Follows**: hints carry `{sender, nonce, effectiveFeeRate, payload}` and a commitment; the tx hash is not disclosed. **Chooses**: `targetCommitment = SHA-256("ORVL/target/v1|" ‖ seedHash ‖ txHash)` |
| §4.3 Executed state trails ordered prefix by D slots; limited simulation for bundles | **Simplified**: searchers value backruns on the pool state at disclosure; bundles have revert protection (excluded on failure) |
| §4.4 Plugins (ordering, disclosure, bidding) with determinism and data-isolation constraints | **Omits** plugins; the constraints are respected by the engine design |

### 05. MEV Protection
| Statement | Orderveil |
|---|---|
| Bundles cannot reference protected transactions; no before-ref; structural filtering | **Follows**: `validateBundles` rejection codes |
| Residual risk: "A blindly submitted, high-fee front leg may coincidentally succeed." | **Follows**: Protected-mode adversary is exactly this blind front leg; the UI never shows "0 MEV" |
| §5.1 Default AMM policy: protected by default; opt-in must be explicit | **Follows**: Playground default mode is a user choice; opt-in never implied |

### 06. Searchers
| Statement | Orderveil |
|---|---|
| `gw_subscribeHints`, `gw_call`, `gw_simulateBundle`, `gw_sendBundle` | **Omits** RPCs; simulated searchers consume `searcherView()` and submit bundles with `afterRef`, validity window and `committedTip` |
| RA-TLS connections | **Omits** |

### 07. Validators and Deployment / 08. Consensus and Revenue
| Statement | Orderveil |
|---|---|
| Same region, separate failure domains, single active term | **Omits** (term fixed at 1) |
| Revenue split: validator 75%, gateway 25%; refunds negotiated within gateway share; protocol does not fix refunds | **Simplified**: the user refund % is a Playground parameter; the remainder is split 75/25 for illustration |

### 09. Attestation and Auditing
| Statement | Orderveil |
|---|---|
| Public facts: allowed workloads, enclave key per epoch, inputs/rules behind each block | Workload id and ruleset version are recorded; **no attestation** |
| Replay data: frozen-set commitments, rule parameters, random salt, final order | **Follows**: all present in the experiment record; replay recomputes them |
| §2.2 Deterministic replay recomputes input commitments, rulesets, payloadHash, salt-dependent results | **Follows**: `replayExperiment` |

### 11. Roadmap and Open Questions
Phase 0–3 of the proposal are described on the Technology page as **proposal** phases. Orderveil's own phases (local → BSC Testnet → NewL1) are separate and listed in the README.

## Details the sources do not specify (Orderveil choices)

| Topic | Orderveil choice | Where |
|---|---|---|
| Hash function H | SHA-256 (`@noble/hashes`) | `core/hash.js` |
| Serialization | Canonical JSON, sorted keys, BigInt as decimal strings, domain-separated | `core/canonical.js` |
| Salt source | `SHA-256("ORVL/salt/v1|" ‖ seedHash ‖ parentSubBlockHash ‖ u64be(tick))` | `ordering/engine.js` |
| Nonce handling | price-and-nonce merge, per-sender nonce order preserved | `orderGeneral` |
| Input commitment | SHA-256 over domain, tick, counts, sorted tx hashes and sorted candidate bundle hashes | `computeInputCommitment` |
| Refund share | user parameter (default 90% of the winning tip) | `mev/params.js` |
| Searcher bids | seeded 30–90% of expected net profit | `mev/scenario.js` |

All of these live in `RULESET` (`src/simulation/ordering/ruleset.js`). Changing any behaviour requires a version bump. Replay rejects unknown versions or modified parameters.
