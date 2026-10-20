// Phase 2: publish experiment commitments to OrderveilCommitments on BSC Testnet.
// A commitment proves a record digest existed no later than its block. It does NOT mean
// BSC transaction ordering is controlled or influenced by Orderveil.
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, zeroHash } from 'viem'
import { orderveilCommitmentsAbi } from '../contracts/orderveilCommitments.js'

export { orderveilCommitmentsAbi }

/** "exp-7b6a21bd762140e4" -> 0x7b6a21bd762140e4000…0 (left-aligned bytes32). */
export function experimentIdToBytes32(id) {
  const m = /^exp-([0-9a-f]{16})$/.exec(String(id))
  if (!m) throw new Error(`Invalid experimentId: ${id}`)
  return `0x${m[1].padEnd(64, '0')}`
}

/** Arguments for OrderveilCommitments.commit derived from an experiment record. */
export function commitArgs(record, digest = record.simulationSignature.digest) {
  const finalSubBlockHash = record.outputs.ordering.kind === 'gateway' ? record.outputs.ordering.finalSubBlockHash : zeroHash
  return [digest, experimentIdToBytes32(record.experimentId), finalSubBlockHash, record.outputs.execution.executionHash, record.ruleset.version]
}

/** Normalize the contract's Commitment struct; null when not committed. */
export function parseCommitment(raw) {
  if (!raw || raw.submitter === '0x0000000000000000000000000000000000000000') return null
  return {
    submitter: raw.submitter,
    blockNumber: BigInt(raw.blockNumber),
    timestamp: Number(raw.timestamp),
    experimentId: raw.experimentId,
    finalSubBlockHash: raw.finalSubBlockHash,
    executionHash: raw.executionHash,
    rulesetVersion: raw.rulesetVersion,
  }
}

/** Does the on-chain commitment match the (recomputed) record? */
export function commitmentMatches(commitment, record) {
  if (!commitment) return false
  const [, expId, sub, exec, ruleset] = commitArgs(record)
  return (
    commitment.experimentId.toLowerCase() === expId.toLowerCase() &&
    commitment.finalSubBlockHash.toLowerCase() === sub.toLowerCase() &&
    commitment.executionHash.toLowerCase() === exec.toLowerCase() &&
    commitment.rulesetVersion === ruleset
  )
}

/** Map wallet / contract errors to i18n keys under onchain.errors.* */
export function classifyTxError(err) {
  if (!err) return null
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) return 'rejected'
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError)
    if (revert?.data?.errorName === 'AlreadyCommitted') return 'alreadyCommitted'
    if (revert?.data?.errorName) return 'reverted'
    if (/insufficient funds/i.test(err.message)) return 'insufficientFunds'
    if (/chain/i.test(err.shortMessage || '') && /mismatch|does not match/i.test(err.message)) return 'wrongChain'
  }
  if (/user rejected|denied/i.test(String(err?.message))) return 'rejected'
  return 'unknown'
}
