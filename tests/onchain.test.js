// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import { createPublicClient, createWalletClient, http, zeroHash } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { foundry } from 'viem/chains'
import { runScenario } from '../src/simulation/mev/scenario.js'
import { DEFAULT_PARAMS, normalizeParams } from '../src/simulation/mev/params.js'
import { buildExperimentRecord } from '../src/simulation/replay/record.js'
import { orderveilCommitmentsAbi, orderveilCommitmentsBytecode } from '../src/contracts/orderveilCommitments.js'
import { experimentIdToBytes32, commitArgs, parseCommitment, commitmentMatches, classifyTxError } from '../src/services/bscTestnet.js'

const record = (mode) => buildExperimentRecord(runScenario(normalizeParams({ ...DEFAULT_PARAMS, mode })), { secretKey: new Uint8Array(32).fill(3) })

describe('commitment arguments', () => {
  it('encodes experiment ids as left-aligned bytes32', () => {
    expect(experimentIdToBytes32('exp-7b6a21bd762140e4')).toBe('0x7b6a21bd762140e4' + '0'.repeat(48))
    expect(() => experimentIdToBytes32('exp-xyz')).toThrow()
  })

  it('uses the final SubBlock hash for gateway records and zero for public ones', () => {
    const g = record('optin')
    const [digest, , sub, exec, ruleset] = commitArgs(g)
    expect(digest).toBe(g.simulationSignature.digest)
    expect(sub).toBe(g.outputs.ordering.finalSubBlockHash)
    expect(exec).toBe(g.outputs.execution.executionHash)
    expect(ruleset).toBe(g.ruleset.version)
    expect(commitArgs(record('public'))[2]).toBe(zeroHash)
  })

  it('matches stored commitments field by field', () => {
    const r = record('protected')
    const [, experimentId, finalSubBlockHash, executionHash, rulesetVersion] = commitArgs(r)
    const c = { submitter: '0x1', experimentId, finalSubBlockHash, executionHash, rulesetVersion }
    expect(commitmentMatches(c, r)).toBe(true)
    expect(commitmentMatches({ ...c, executionHash: zeroHash }, r)).toBe(false)
    expect(parseCommitment({ submitter: '0x0000000000000000000000000000000000000000' })).toBe(null)
  })
})

// Integration against a local Anvil node (skipped when none is listening on 8546).
const RPC = process.env.ANVIL_RPC_URL || 'http://127.0.0.1:8546'
const anvilUp = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }) })
  .then((r) => r.ok)
  .catch(() => false)

describe.skipIf(!anvilUp)('OrderveilCommitments on a local chain', () => {
  const account = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d') // anvil #1, local only
  const chain = { ...foundry, rpcUrls: { default: { http: [RPC] } } }
  const pub = createPublicClient({ chain, transport: http(RPC) })
  const wallet = createWalletClient({ chain, account, transport: http(RPC) })
  let address

  beforeAll(async () => {
    const hash = await wallet.deployContract({ abi: orderveilCommitmentsAbi, bytecode: orderveilCommitmentsBytecode })
    address = (await pub.waitForTransactionReceipt({ hash })).contractAddress
  })

  it('commits a record, reads it back and rejects a duplicate', async () => {
    const r = record('optin')
    const args = commitArgs(r)
    const hash = await wallet.writeContract({ address, abi: orderveilCommitmentsAbi, functionName: 'commit', args })
    const rc = await pub.waitForTransactionReceipt({ hash })
    expect(rc.status).toBe('success')

    const stored = parseCommitment(await pub.readContract({ address, abi: orderveilCommitmentsAbi, functionName: 'getCommitment', args: [args[0]] }))
    expect(stored.submitter).toBe(account.address)
    expect(stored.blockNumber).toBe(rc.blockNumber)
    expect(commitmentMatches(stored, r)).toBe(true)

    let err
    try {
      await wallet.writeContract({ address, abi: orderveilCommitmentsAbi, functionName: 'commit', args })
    } catch (e) {
      err = e
    }
    expect(classifyTxError(err)).toBe('alreadyCommitted')
  })
})
