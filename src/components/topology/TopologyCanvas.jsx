import { useEffect, useMemo, useRef } from 'react'
import { ReactFlow, ReactFlowProvider, Controls, useReactFlow, MarkerType } from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'motion/react'
import TopologyNode from './TopologyNode.jsx'
import { NODES, EDGES, COMPACT_NODES, COMPACT_EDGES, layoutPosition, compactPosition } from './graph.js'

const nodeTypes = { ov: TopologyNode }

function Inner({ variant, orientation, active, done, badges, selected, onSelect, resetSignal, height }) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const rf = useReactFlow()
  const compact = variant === 'compact'
  const vertical = orientation === 'vertical'

  const nodes = useMemo(() => {
    const list = compact ? NODES.filter((n) => COMPACT_NODES.includes(n.id)) : NODES
    return list.map((n) => ({
      id: n.id,
      type: 'ov',
      position: compact ? compactPosition(n.id) : layoutPosition(n.id, orientation),
      selected: selected === n.id,
      data: {
        icon: n.icon,
        label: t(`topology.nodes.${n.id}.label`),
        sub: n.future ? t('topology.testnetTag') : t(`topology.layers.${n.layer}`),
        active: active.nodes.has(n.id),
        done: done?.has(n.id),
        future: n.future,
        vertical,
        compact,
        badge: badges?.[n.id] ?? null,
      },
      draggable: !compact,
      ariaLabel: t(`topology.nodes.${n.id}.label`),
    }))
  }, [compact, orientation, active, done, badges, selected, t, vertical])

  const edges = useMemo(() => {
    const list = compact ? COMPACT_EDGES : EDGES
    return list.map((e) => {
      const on = active.edges.has(e.id)
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: on && !reduced,
        className: on ? 'ov-active' : e.future ? 'ov-future' : '',
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: on ? '#9fdcc2' : '#3b4847' },
        type: 'smoothstep',
        focusable: false,
      }
    })
  }, [compact, active, reduced])

  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    rf.fitView({ padding: 0.12, duration: reduced ? 0 : 300 })
  }, [resetSignal, orientation, rf, reduced])

  return (
    <div style={{ height }} className="w-full" data-testid={`topology-${variant}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.3}
        maxZoom={1.8}
        nodesConnectable={false}
        elementsSelectable
        panOnScroll={false}
        zoomOnScroll={!compact}
        preventScrolling={!compact}
        zoomOnDoubleClick={!compact}
        onNodeClick={(_, n) => onSelect?.(n.id)}
        onPaneClick={() => onSelect?.(null)}
        proOptions={{ hideAttribution: true }}
        aria-label={t('topology.ariaLabel')}
      >
        {!compact && <Controls showInteractive={false} position="bottom-right" />}
      </ReactFlow>
    </div>
  )
}

export default function TopologyCanvas(props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  )
}
