// Orderveil experimental ruleset. Parameters marked `source: proposal` follow the public
// NewL1 TEE Gateway proposal; everything else is an Orderveil simulation choice.
// Any change to ordering behaviour MUST bump `version` so old records fail replay loudly.

export const RULESET_VERSION = 'orderveil-sim/ruleset/0.1.0'

export const RULESET = Object.freeze({
  version: RULESET_VERSION,
  tickMs: 20, // source: proposal (engineering target; here it is logical time only)
  optInDelayTicks: 5, // source: proposal (default 5 ticks ≈ 100 ms window)
  maxBackrunsPerTarget: 1, // Orderveil choice (proposal mentions per-target limits as plugin policy)
  tipFloorWei: '1', // Orderveil choice
  feeOrder: 'effectiveFeeRate desc', // source: proposal (General segment)
  tieBreak: 'sha256(txHash || salt) asc, big-endian bytes', // proposal: H(txHash || salt); hash fn = Orderveil choice
  nonceRule: 'per-sender nonce order preserved (price-and-nonce merge)', // Orderveil choice
  bundleSelection: 'committedTip desc, then sha256(bundleHash || salt) asc', // proposal: compete on committed tips
  saltDerivation: 'sha256("ORVL/salt/v1|" || seedHash || parentSubBlockHash || u64be(tick))', // Orderveil choice
  protectedInclusion: 'arrivalTick', // proposal: enter the next available tick
  beforeRef: 'forbidden', // source: proposal
  afterRefProtected: 'forbidden', // source: proposal
})

export const SUPPORTED_RULESETS = Object.freeze([RULESET_VERSION])

export const MODES = Object.freeze({ PROTECTED: 'protected', OPTIN: 'optin', PUBLIC: 'public', BUNDLE: 'bundle' })

export const BUNDLE_STATUS = Object.freeze({
  INCLUDED: 'included',
  OUTBID: 'outbid',
  REJECTED_BEFORE_REF: 'rejected_before_ref',
  REJECTED_NO_TARGET: 'rejected_no_target',
  REJECTED_PROTECTED_TARGET: 'rejected_protected_target',
  REJECTED_UNKNOWN_TARGET: 'rejected_unknown_target',
  REJECTED_EMPTY: 'rejected_empty',
  REJECTED_BEFORE_DISCLOSURE: 'rejected_before_disclosure',
  REJECTED_LATE: 'rejected_late',
  REJECTED_VALIDITY_WINDOW: 'rejected_validity_window',
  REJECTED_TIP_FLOOR: 'rejected_tip_floor',
  REJECTED_MALFORMED: 'rejected_malformed',
})
