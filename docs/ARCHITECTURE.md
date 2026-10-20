# Architecture

```
src/
├── simulation/            # pure JS, no React — testable in Node
│   ├── core/              # sha256 helpers, canonical JSON, seeded PRNG, BigInt units
│   ├── amm/               # pool.js (x·y=k), execute.js (sequential/atomic), arbitrage.js
│   ├── ordering/          # ruleset.js, transaction.js, engine.js (classify, order, SubBlocks)
│   ├── mev/               # params.js (validation), scenario.js (inputs, metrics, comparison)
│   └── replay/            # record.js (export + ed25519), replay.js (recompute + compare)
├── app/                   # i18n setup, SimulationContext (shared params across routes/languages)
├── components/
│   ├── layout/            # Header, Footer, LanguageSwitch, Layout
│   ├── ui/                # Button, Fields, Tabs, Badges, Hash, States, Section
│   ├── home/              # Hero, Capabilities, HowItWorks, TopologyPreview, SettlementFlow, SubBlockLog, CompareDifference, ResearchFoundation
│   ├── topology/          # graph.js (nodes/edges/stage mapping), TopologyCanvas (React Flow), NodeDetail, useTopologyRun
│   ├── playground/        # ParamPanel, MetricsGrid, ExecutionCharts, OrderingTable, TickTimeline, CompareView, AuditPanel
│   ├── charts/            # Recharts wrappers fed by simulation output
│   └── docs/              # Diagrams (architecture, tick timeline)
├── content/               # references.js, mapping.js
├── locales/               # en.json, zh-CN.json (identical key sets)
└── pages/                 # Home, Technology, Playground, Network, Docs, NotFound
```

## Data flow

```
UI params (strings) ─ normalizeParams ─▶ BigInt params
      │
      ▼ buildInputs (seeded)              transactions + bundles (content-hashed)
      │
      ├─ public:  orderPublicBlock        one fee-ordered block
      └─ gateway: runGateway              classify → per-tick freeze → orderGeneral → after-ref placement
                                          → inputCommitment / payloadHash / SubBlock chain
      ▼ executeOrder                      AMM steps, balances, final pool
      ▼ computeMetrics + baseline run     user/attacker/searcher metrics, MEV-related loss
      ▼ buildExperimentRecord             JSON record + simulationSignature
      ▼ replayExperiment                  recompute everything, compare, Passed/Failed
```

`SimulationContext` holds the raw parameters above the router, so changing route or language never resets an experiment. `runComparison` runs all three modes (each with a no-adversary baseline) on every parameter change; it takes a few milliseconds.

The topology never animates on its own: `useTopologyRun` computes an experiment once and only reveals stage-by-stage what `summarize()` derived from the engine output (counts, hints, ticks, final hash, user status).

## Phase 2 — BSC Testnet

```
contracts/src/OrderveilCommitments.sol   commit(recordDigest, experimentId, finalSubBlockHash, executionHash, rulesetVersion)
src/config/onchain.js                    target chain (97, or local 31337), RPC, contract address, explorer links
src/app/wagmi.js                         wagmi v2 + RainbowKit wallet list (test wallet only for e2e builds)
src/app/WalletProviders.jsx              Wagmi / React Query / RainbowKit providers, theme and locale synced with i18n
src/services/bscTestnet.js               commit args from a record, struct parsing, field matching, error mapping
src/components/layout/WalletButton.jsx   Orderveil-styled button that opens RainbowKit's connect / chain / account modals
src/components/playground/OnchainCommitment.jsx   read status (no wallet needed), publish, confirm
```

The recordDigest excludes `createdAt` and the signature, so everyone who reproduces the same experiment computes the same digest and can look it up on-chain. Each digest can be committed only once.
