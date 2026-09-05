// Tiny inline-SVG plot of a numeric series scaled into [0,1] on the y-axis.
export default function MiniChart({ values = [], height = 120, mode = 'line' }) {
  const w = Math.max(160, values.length * 14)
  const h = height
  const pad = 8
  const n = values.length
  if (n === 0) return null
  const max = Math.max(1e-9, ...values)
  const min = Math.min(0, ...values)
  const span = max - min || 1
  const x = (i) => (n === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (n - 1))
  const y = (v) => h - pad - ((v - min) / span) * (h - 2 * pad)
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)

  return (
    <svg className="mini-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} className="mc-axis" />
      {mode === 'line' && <polyline points={pts.join(' ')} className="mc-line" fill="none" />}
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.5" className="mc-dot" />
      ))}
    </svg>
  )
}
