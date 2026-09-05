const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/**
 * Side-by-side input vs output letter-frequency bars.
 * `input` / `output` are maps { A: pct, ... } as returned by the caesar endpoint.
 */
export default function FreqChart({ input = {}, output = {} }) {
  const all = [...Object.values(input), ...Object.values(output)]
  const max = Math.max(1, ...all)
  return (
    <div className="freq-chart">
      {LETTERS.map((ch) => {
        const iv = Number(input[ch] || 0)
        const ov = Number(output[ch] || 0)
        return (
          <div className="freq-col" key={ch} title={`${ch}: in ${iv.toFixed(1)}%  out ${ov.toFixed(1)}%`}>
            <div className="freq-bars">
              <span className="freq-bar in" style={{ height: `${(iv / max) * 100}%` }} />
              <span className="freq-bar out" style={{ height: `${(ov / max) * 100}%` }} />
            </div>
            <span className="freq-label">{ch}</span>
          </div>
        )
      })}
      <div className="freq-legend">
        <span><i className="swatch in" /> input</span>
        <span><i className="swatch out" /> output</span>
      </div>
    </div>
  )
}
