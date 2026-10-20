// Drives topology stages from a real experiment result. Each stage summary is computed from
// the ordering engine output; the animation only reveals those results step by step.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { runExperiment } from '../../simulation/mev/scenario.js'
import { STAGES } from './graph.js'

export function summarize(exp) {
  const sc = exp.result
  const g = sc.ordering
  const txs = sc.inputs.transactions
  const protectedCount = g.classified.filter((c) => c.path === 'protected').length
  const optinCount = g.classified.filter((c) => c.path === 'optin').length
  const nonEmpty = g.ticks.filter((t) => t.entries.length > 0)
  return {
    path: exp.params.mode,
    txCount: txs.length,
    bundleCount: sc.inputs.bundles.length,
    protectedCount,
    optinCount,
    hintCount: g.hints.length,
    tickCount: g.ticks.length,
    firstTick: g.ticks[0]?.tick ?? 0,
    lastTick: g.ticks[g.ticks.length - 1]?.tick ?? 0,
    nonEmptyTicks: nonEmpty.length,
    orderedCount: g.finalOrder.length,
    includedBundles: g.bundleDecisions.filter((d) => d.status === 'included').length,
    finalSubBlockHash: g.finalSubBlockHash,
    hasBackground: txs.some((t) => t.transactionId.startsWith('bg-')),
    hasAdversary: txs.some((t) => t.transactionId.startsWith('attacker')) || sc.inputs.bundles.length > 0,
    user: sc.metrics.user,
    failed: sc.metrics.failedCount,
  }
}

export function useTopologyRun(params, path, { stepMs = 750 } = {}) {
  const reduced = useReducedMotion()
  const [stageIdx, setStageIdx] = useState(0)
  const [runId, setRunId] = useState(0)
  const timer = useRef(null)

  const computed = useMemo(() => {
    try {
      const exp = runExperiment({ ...params, mode: path })
      return { exp, info: summarize(exp), error: null }
    } catch (e) {
      return { exp: null, info: null, error: e }
    }
  }, [params, path])

  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }

  const run = useCallback(() => {
    stop()
    setRunId((r) => r + 1)
    if (reduced) {
      setStageIdx(STAGES.length - 1)
      return
    }
    setStageIdx(1)
    timer.current = setInterval(() => {
      setStageIdx((i) => {
        if (i >= STAGES.length - 1) {
          stop()
          return i
        }
        return i + 1
      })
    }, stepMs)
  }, [reduced, stepMs])

  const step = useCallback(() => {
    stop()
    setStageIdx((i) => Math.min(i + 1, STAGES.length - 1))
  }, [])

  const reset = useCallback(() => {
    stop()
    setStageIdx(0)
  }, [])

  // a new experiment invalidates the displayed stage
  useEffect(() => {
    stop()
    setStageIdx(0)
  }, [computed])
  useEffect(() => stop, [])

  return { ...computed, stage: STAGES[stageIdx], stageIdx, run, step, reset, runId, running: stageIdx > 0 && stageIdx < STAGES.length - 1 }
}
