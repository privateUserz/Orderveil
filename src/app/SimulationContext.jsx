// Shared Playground parameters. Lives above the router so switching language or route
// keeps the current experiment inputs. Results are recomputed from params (pure, fast).
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { DEFAULT_PARAMS } from '../simulation/mev/params.js'
import { runComparison } from '../simulation/mev/scenario.js'

const STORAGE_KEY = 'orderveil.params.v1'
const SimulationContext = createContext(null)

function loadParams() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PARAMS }
    const parsed = JSON.parse(raw)
    const out = { ...DEFAULT_PARAMS }
    for (const k of Object.keys(DEFAULT_PARAMS)) if (k in parsed && typeof parsed[k] === typeof DEFAULT_PARAMS[k]) out[k] = parsed[k]
    return out
  } catch {
    return { ...DEFAULT_PARAMS }
  }
}

export function SimulationProvider({ children, initialParams }) {
  const [params, setParams] = useState(() => initialParams ?? loadParams())

  const persist = (next) => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    return next
  }
  const setParam = useCallback((key, value) => setParams((p) => persist({ ...p, [key]: value })), [])
  const replaceParams = useCallback((next) => setParams(persist({ ...DEFAULT_PARAMS, ...next })), [])
  const reset = useCallback(() => setParams(persist({ ...DEFAULT_PARAMS })), [])

  const computed = useMemo(() => {
    try {
      return { comparison: runComparison(params), error: null }
    } catch (e) {
      return { comparison: null, error: { code: e.code || 'unknown', field: e.field || null, message: e.message } }
    }
  }, [params])

  const value = useMemo(() => ({ params, setParam, replaceParams, reset, ...computed }), [params, setParam, replaceParams, reset, computed])
  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>
}

export function useSimulation() {
  const ctx = useContext(SimulationContext)
  if (!ctx) throw new Error('useSimulation must be used inside SimulationProvider')
  return ctx
}
