// React.lazy with recovery from stale deployments: after a rebuild, an already-open tab may
// request chunk files that no longer exist. In that case reload once to pick up the new
// index.html (and its chunk names) instead of leaving the app blank.
import { createElement, lazy } from 'react'

const KEY = 'orderveil.chunk-reload-at'
const WINDOW_MS = 10_000

export function isChunkLoadError(err) {
  const msg = String(err?.message || err)
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed|Unable to preload CSS/i.test(msg)
}

/** Reload at most once per WINDOW_MS; returns true when a reload was triggered. */
export function reloadOnceForNewBuild() {
  try {
    const last = Number(window.sessionStorage.getItem(KEY) || 0)
    if (Date.now() - last < WINDOW_MS) return false
    window.sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    /* storage unavailable: still try a single reload */
  }
  window.location.reload()
  return true
}

/**
 * Like React.lazy, plus:
 *  - `Page.preload()` downloads the module ahead of navigation;
 *  - once loaded, the page renders synchronously (no Suspense fallback flash, which React 19
 *    would otherwise keep visible for its ~300 ms reveal throttle);
 *  - a chunk missing after a redeploy triggers a single reload.
 */
export function lazyPage(factory) {
  let Loaded = null
  let pending = null
  const load = () =>
    (pending ??= factory().then(
      (m) => {
        Loaded = m.default
        return m
      },
      (err) => {
        pending = null
        throw err
      },
    ))
  const Lazy = lazy(async () => {
    try {
      return await load()
    } catch (err) {
      if (isChunkLoadError(err) && reloadOnceForNewBuild()) return new Promise(() => {})
      throw err
    }
  })
  function Page(props) {
    return createElement(Loaded ?? Lazy, props)
  }
  Page.preload = () => load().catch(() => {})
  return Page
}
