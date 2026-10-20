// Animated isometric ground grid behind the hero. Two sine waves displace each grid point
// vertically; amplitude is damped near the illustration so the buildings sit on calm ground.
// Pauses when off-screen or the tab is hidden; draws a single static frame for reduced motion.
import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'

const UNIT = 34
const COS = 0.866
const N = 30
const FRAME_MS = 1000 / 30

export default function HeroWaveGrid({ className = '', centerX = 0.68, centerY = 0.52 }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext?.('2d')
    if (!ctx) return undefined

    const css = getComputedStyle(document.documentElement)
    const line = css.getPropertyValue('--hero-grid').trim() || '#2d5a4c'
    const glow = css.getPropertyValue('--hero-flow').trim() || '#6fe3b4'
    let w = 0
    let h = 0
    let raf = 0
    let last = 0
    let visible = true
    const start = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const r = canvas.getBoundingClientRect()
      w = r.width
      h = r.height
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (t) => {
      const narrow = w < 1024
      const cx = w * (narrow ? 0.5 : centerX)
      const cy = h * (narrow ? 0.62 : centerY)
      ctx.clearRect(0, 0, w, h)

      // projected points for this frame
      const size = 2 * N + 1
      const X = new Float32Array(size * size)
      const Y = new Float32Array(size * size)
      const Z = new Float32Array(size * size)
      for (let a = 0; a < size; a++) {
        for (let b = 0; b < size; b++) {
          const i = a - N
          const j = b - N
          const dist = Math.hypot(i, j)
          const amp = 16 * Math.min(1, Math.max(0.15, (dist - 3) / 8))
          const z = amp * (Math.sin(0.34 * (i + j) - 1.1 * t) + 0.55 * Math.sin(0.47 * i - 0.27 * j - 0.75 * t + 1.3))
          const k = a * size + b
          X[k] = cx + (i - j) * COS * UNIT
          Y[k] = cy + (i + j) * 0.5 * UNIT - z
          Z[k] = z / (amp * 1.55 || 1)
        }
      }

      ctx.lineWidth = 1
      ctx.strokeStyle = line
      ctx.setLineDash([3, 4])
      ctx.beginPath()
      for (let a = 0; a < size; a++) {
        ctx.moveTo(X[a * size], Y[a * size])
        for (let b = 1; b < size; b++) ctx.lineTo(X[a * size + b], Y[a * size + b])
        ctx.moveTo(X[a], Y[a])
        for (let b = 1; b < size; b++) ctx.lineTo(X[b * size + a], Y[b * size + a])
      }
      ctx.stroke()
      ctx.setLineDash([])

      // crests catch a little light
      ctx.fillStyle = glow
      for (let k = 0; k < X.length; k++) {
        const c = Z[k]
        if (c < 0.45) continue
        ctx.globalAlpha = Math.min(0.8, (c - 0.45) * 1.6)
        ctx.fillRect(X[k] - 1.25, Y[k] - 1.25, 2.5, 2.5)
      }
      ctx.globalAlpha = 1

      // radial fade so the grid dissolves toward the edges and behind the headline
      ctx.globalCompositeOperation = 'destination-in'
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.62)
      g.addColorStop(0, 'rgba(0,0,0,1)')
      g.addColorStop(0.42, 'rgba(0,0,0,0.85)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'
    }

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      if (!visible || document.hidden || now - last < FRAME_MS) return
      last = now
      draw((now - start) / 1000)
    }

    resize()
    draw(0)
    const ro = new ResizeObserver(() => {
      resize()
      draw((performance.now() - start) / 1000)
    })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(canvas)
    if (!reduced) raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [reduced, centerX, centerY])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
