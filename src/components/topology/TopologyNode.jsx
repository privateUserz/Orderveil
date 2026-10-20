import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Wallet, Lock, Split, Shield, Eye, ListOrdered, Blocks, Package, CheckCircle2, FileCode2, Globe } from 'lucide-react'

const ICONS = { wallet: Wallet, lock: Lock, split: Split, shield: Shield, eye: Eye, list: ListOrdered, blocks: Blocks, package: Package, check: CheckCircle2, file: FileCode2, globe: Globe }

function TopologyNode({ data, selected }) {
  const Icon = ICONS[data.icon] ?? Blocks
  const { active, future, done, vertical, compact } = data
  const tone = active
    ? 'border-accent/70 bg-[#17241f] shadow-[0_0_0_3px_rgba(159,220,194,0.08)]'
    : done
      ? 'border-accent/25 bg-surface-2'
      : future
        ? 'border-dashed border-line-strong bg-bg-2'
        : 'border-line bg-surface-2'
  return (
    <div className={`relative rounded-[10px] border px-3 py-2.5 transition-[border-color,background-color,box-shadow] duration-300 ${tone} ${selected ? 'ring-1 ring-ink/40' : ''} ${compact ? 'w-[124px] !px-2 !py-2' : 'w-[156px]'}`}>
      <Handle type="target" position={vertical ? Position.Top : Position.Left} className="!h-1.5 !w-1.5 !min-h-0 !min-w-0 !border-0 !bg-line-strong" isConnectable={false} />
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${active ? 'border-accent/40 text-accent' : 'border-line text-muted'}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="line-clamp-2 text-[0.74rem] font-medium leading-tight text-ink">{data.label}</div>
          <div className="mt-0.5 truncate text-[0.64rem] leading-tight text-faint">{data.sub}</div>
        </div>
      </div>
      {data.badge != null && (
        <span className="absolute -right-2 -top-2 rounded-full border border-line-strong bg-bg px-1.5 text-[0.62rem] font-medium leading-4 text-ink-2">{data.badge}</span>
      )}
      <Handle type="source" position={vertical ? Position.Bottom : Position.Right} className="!h-1.5 !w-1.5 !min-h-0 !min-w-0 !border-0 !bg-line-strong" isConnectable={false} />
    </div>
  )
}

export default memo(TopologyNode)
