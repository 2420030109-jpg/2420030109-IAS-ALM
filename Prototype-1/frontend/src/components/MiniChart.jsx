/**
 * Tiny inline-SVG plot of a numeric series.
 *
 * Draws, in order: horizontal gridlines with y labels, a soft area fill under
 * the series, the line itself, and a dot per sample. Everything is inline SVG
 * so it needs no chart library and inherits the app's colour tokens.
 */
export default function MiniChart({
  values = [],
  domain,
  yLabel = '',
  xLabel = '',
  mode = 'line',
}) {
  const n = values.length
  const w = 720
  const h = 180
  const padL = 36
  const padR = 12
  const padT = 12
  const padB = 24

  if (n === 0) return null

  const lo = domain ? domain[0] : Math.min(0, ...values)
  const hi = domain ? domain[1] : Math.max(1e-9, ...values)
  const span = hi - lo || 1

  const x = (i) => (n === 1 ? (padL + w - padR) / 2 : padL + (i * (w - padL - padR)) / (n - 1))
  const y = (v) => h - padB - ((v - lo) / span) * (h - padT - padB)

  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
  const area = [`${x(0).toFixed(1)},${(h - padB).toFixed(1)}`, ...pts, `${x(n - 1).toFixed(1)},${(h - padB).toFixed(1)}`]

  const ticks = [lo, lo + span / 2, hi]
  const fmt = (v) => (Math.abs(v) >= 1000 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(2))

  return (
    <svg
      className="mini-chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={yLabel ? `${yLabel} over ${n} samples` : `series of ${n} samples`}
    >
      {/* gridlines + y-axis labels */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={padL}
            y1={y(t)}
            x2={w - padR}
            y2={y(t)}
            className="mc-axis"
            opacity={i === 0 ? 1 : 0.45}
          />
          <text
            x={padL - 6}
            y={y(t) + 3.5}
            textAnchor="end"
            fontSize="10"
            fill="var(--ink-faint)"
            fontFamily="var(--mono)"
          >
            {fmt(t)}
          </text>
        </g>
      ))}

      {/* y axis */}
      <line x1={padL} y1={padT} x2={padL} y2={h - padB} className="mc-axis" />

      {mode === 'line' && (
        <>
          <polygon points={area.join(' ')} fill="var(--accent)" opacity="0.12" stroke="none" />
          <polyline points={pts.join(' ')} className="mc-line" />
        </>
      )}

      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={n > 60 ? 1.5 : 2.6} className="mc-dot" />
      ))}

      {/* x axis end labels */}
      <text x={padL} y={h - 7} fontSize="10" fill="var(--ink-faint)" fontFamily="var(--mono)">
        1
      </text>
      <text
        x={w - padR}
        y={h - 7}
        textAnchor="end"
        fontSize="10"
        fill="var(--ink-faint)"
        fontFamily="var(--mono)"
      >
        {n}
      </text>
      {xLabel && (
        <text
          x={(padL + w - padR) / 2}
          y={h - 7}
          textAnchor="middle"
          fontSize="10"
          fill="var(--ink-faint)"
        >
          {xLabel}
        </text>
      )}
    </svg>
  )
}
