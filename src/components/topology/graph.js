// Topology definition. Nodes describe the EXPERIMENTAL architecture; none of them is a
// deployed server. `future` nodes are planned integrations and are rendered as such.

export const LAYERS = ['user', 'ingress', 'gateway', 'validator', 'settlement']

export const NODES = [
  { id: 'walletA', layer: 'user', icon: 'wallet', role: 'user' },
  { id: 'walletB', layer: 'user', icon: 'wallet', role: 'background' },
  { id: 'walletC', layer: 'user', icon: 'wallet', role: 'adversary' },
  { id: 'ingress', layer: 'ingress', icon: 'lock' },
  { id: 'classifier', layer: 'ingress', icon: 'split' },
  { id: 'protectedQueue', layer: 'gateway', icon: 'shield' },
  { id: 'optinQueue', layer: 'gateway', icon: 'eye' },
  { id: 'ordering', layer: 'gateway', icon: 'list' },
  { id: 'subblock', layer: 'gateway', icon: 'blocks' },
  { id: 'packaging', layer: 'validator', icon: 'package' },
  { id: 'validator', layer: 'validator', icon: 'check' },
  { id: 'settlementContract', layer: 'settlement', icon: 'file', future: true },
  { id: 'bscTestnet', layer: 'settlement', icon: 'globe', future: true },
]

export const EDGES = [
  { id: 'wA-in', source: 'walletA', target: 'ingress' },
  { id: 'wB-in', source: 'walletB', target: 'ingress' },
  { id: 'wC-in', source: 'walletC', target: 'ingress' },
  { id: 'in-cl', source: 'ingress', target: 'classifier' },
  { id: 'cl-pq', source: 'classifier', target: 'protectedQueue' },
  { id: 'cl-oq', source: 'classifier', target: 'optinQueue' },
  { id: 'pq-or', source: 'protectedQueue', target: 'ordering' },
  { id: 'oq-or', source: 'optinQueue', target: 'ordering' },
  { id: 'or-sb', source: 'ordering', target: 'subblock' },
  { id: 'sb-pk', source: 'subblock', target: 'packaging' },
  { id: 'pk-va', source: 'packaging', target: 'validator' },
  { id: 'va-sc', source: 'validator', target: 'settlementContract', future: true },
  { id: 'sc-bsc', source: 'settlementContract', target: 'bscTestnet', future: true },
]

// Column/row grid -> pixels. Horizontal for desktop, vertical for narrow screens.
const GRID = {
  walletA: [0, 0],
  walletB: [0, 1],
  walletC: [0, 2],
  ingress: [1, 1],
  classifier: [2, 1],
  protectedQueue: [3, 0.45],
  optinQueue: [3, 1.55],
  ordering: [4, 1],
  subblock: [5, 1],
  packaging: [6, 0.45],
  validator: [6, 1.55],
  settlementContract: [7, 0.45],
  bscTestnet: [7, 1.55],
}

export function layoutPosition(id, orientation) {
  const [c, r] = GRID[id]
  if (orientation === 'vertical') return { x: r * 150, y: c * 118 }
  return { x: c * 182, y: r * 96 }
}

// Compact (home) graph: a subset with a simpler, fixed layout.
export const COMPACT_NODES = ['walletA', 'walletB', 'walletC', 'ingress', 'ordering', 'subblock', 'validator']
export const COMPACT_EDGES = [
  { id: 'wA-in', source: 'walletA', target: 'ingress' },
  { id: 'wB-in', source: 'walletB', target: 'ingress' },
  { id: 'wC-in', source: 'walletC', target: 'ingress' },
  { id: 'in-or', source: 'ingress', target: 'ordering' },
  { id: 'or-sb', source: 'ordering', target: 'subblock' },
  { id: 'sb-va', source: 'subblock', target: 'validator' },
]
const COMPACT_GRID = {
  walletA: [0, 0],
  walletB: [0, 1],
  walletC: [0, 2],
  ingress: [1, 1],
  ordering: [2, 0.3],
  subblock: [2, 1.7],
  validator: [3, 1],
}
export function compactPosition(id) {
  const [c, r] = COMPACT_GRID[id]
  return { x: c * 150, y: r * 78 }
}

export const STAGES = ['idle', 'received', 'classified', 'ordered', 'packaged', 'completed']

/**
 * Which nodes/edges are active at a stage, derived from the experiment result
 * (not random): wallet B only lights up if background flow exists, the opt-in queue only on
 * the opt-in path, wallet C only if an adversary or searchers took part.
 */
export function activeAt(stage, info) {
  const idx = STAGES.indexOf(stage)
  const nodes = new Set()
  const edges = new Set()
  if (idx < 1) return { nodes, edges }
  const wallets = ['walletA', ...(info.hasBackground ? ['walletB'] : []), ...(info.hasAdversary ? ['walletC'] : [])]
  const add = (n, e) => {
    n.forEach((x) => nodes.add(x))
    e.forEach((x) => edges.add(x))
  }
  if (idx === 1) add([...wallets, 'ingress'], wallets.map((w) => `w${w.slice(-1)}-in`))
  if (idx === 2) add(['ingress', 'classifier', 'protectedQueue', ...(info.path === 'optin' ? ['optinQueue'] : [])], ['in-cl', 'cl-pq', ...(info.path === 'optin' ? ['cl-oq'] : [])])
  if (idx === 3) add(['protectedQueue', ...(info.path === 'optin' ? ['optinQueue'] : []), 'ordering'], ['pq-or', ...(info.path === 'optin' ? ['oq-or'] : [])])
  if (idx === 4) add(['ordering', 'subblock', 'packaging'], ['or-sb', 'sb-pk'])
  if (idx === 5) add(['packaging', 'validator'], ['pk-va'])
  return { nodes, edges }
}

/** Compact graph mapping of the same stages. */
export function compactActiveAt(stage, info) {
  const full = activeAt(stage, info)
  const nodes = new Set()
  const edges = new Set()
  for (const n of full.nodes) {
    if (COMPACT_NODES.includes(n)) nodes.add(n)
    if (n === 'classifier' || n === 'protectedQueue' || n === 'optinQueue') nodes.add('ingress')
    if (n === 'packaging') nodes.add('subblock')
  }
  for (const e of full.edges) {
    if (e.startsWith('w')) edges.add(e)
    if (e === 'pq-or' || e === 'oq-or') edges.add('in-or')
    if (e === 'or-sb') edges.add('or-sb')
    if (e === 'pk-va') edges.add('sb-va')
  }
  return { nodes, edges }
}
