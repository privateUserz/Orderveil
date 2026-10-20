# Simulation Assumptions

Everything on the site is a **Simulation** in the sense of the project brief: local mathematical models and ordering experiments. There are no testnet experiments and no verified native integrations in v1.

## Market
- One constant-product pool, BNB-like base / USDT-like quote, both 18 decimals.
- Input-side fee in basis points, retained in the pool. Integer arithmetic, outputs rounded down.
- External reference price fixed at the initial pool price; all P&L is valued at it.

## Actors (all derived from the seed)
- **User**: one swap at tick 1. `minOut = quote(initial pool) × (1 − slippage)`.
- **Other order flow**: N swaps; direction, size 0.05–0.5% of the input reserve, fee 0.5–2.5 gwei, arrival tick 0–7, own 5% slippage.
- **Adversary**
  - Public: sees the user's tx; front-run at `max(fees)+1 gwei`, back-run at `userFee − 1 wei` selling the full position.
  - Protected: blind high-fee trade in the user's tick; direction from seed / "same" / "opposite"; exits next tick. Models the proposal's residual risk.
  - Opt-in: reads the hint, enters an ordinary high-fee trade at tick 2, exits after inclusion. **Orderveil model finding**: under full-body hints the user's slippage limit is the remaining protection. This comes from the simplified model and is not a claim about NewL1's final design.
- **Searchers (opt-in)**: optimal backrun from the closed-form arbitrage on the disclosed state; tip = seeded 30–90% of expected net profit; 0.5% revert tolerance.

## Costs and value flows
- Gas = `gasUnits × effectiveFeeRate`, paid in BNB. `gasUnits` defaults to 150,000 (assumption).
- Reverted ordinary transactions pay gas; excluded bundles do not (revert protection).
- Winning tip: `refund%` to the user, the remainder split 75/25 validator/gateway (proposal's starting split, applied here for illustration only).

## Metrics
- **Price impact**: execution price vs. initial spot.
- **Slippage**: shortfall vs. the quote at submission.
- **MEV-related loss**: user output in the same run without the adversary minus actual output, valued at the reference price. Negative = the adversary happened to help.
- Attacker: gross trading P&L (includes AMM fees), AMM fees paid (shown separately), simulated gas, net.

## Time
- Ticks are logical. 20 ms per tick and the 100 ms opt-in window are **proposal targets**, displayed as such.

## What the numbers are not
- Not predictions of real MEV, not measured latency, not on-chain data, not financial advice.
