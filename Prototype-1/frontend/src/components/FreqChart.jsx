const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function peak(freq) {
  let best = null
  let bestVal = 0
  for (const ch of LETTERS) {
    const v = Number(freq[ch] || 0)
    if (v > bestVal) {
      bestVal = v
      best = ch
    }
  }
  return best ? { letter: best, value: bestVal } : null
}

/**
 * Side-by-side input vs output letter-frequency bars.
 *
 * `input` / `output` are maps { A: pct, ... } as returned by the caesar
 * endpoint. The teaching point is that a substitution cipher *slides* the
 * distribution instead of flattening it, so the two peaks are called out
 * explicitly under the legend.
 */
export default function FreqChart({
  input = {},
  output = {},
  inLabel = 'plaintext',
  outLabel = 'ciphertext',
}) {
  const all = [...Object.values(input), ...Object.values(output)]
  const max = Math.max(1, ...all)
  const pIn = peak(input)
  const pOut = peak(output)
  const slide =
    pIn && pOut ? (LETTERS.indexOf(pOut.letter) - LETTERS.indexOf(pIn.letter) + 26) % 26 : null

  return (
    <div>
      <div className="freq-legend">
        <span>
          <i className="swatch in" /> {inLabel}
        </span>
        <span>
          <i className="swatch out" /> {outLabel}
        </span>
        {pIn && pOut && (
          <span className="muted">
            peak {pIn.letter} → {pOut.letter}
            {slide !== null && ` (slid ${slide})`}
          </span>
        )}
      </div>

      <div className="freq-chart">
        {LETTERS.map((ch) => {
          const iv = Number(input[ch] || 0)
          const ov = Number(output[ch] || 0)
          return (
            <div
              className="freq-col"
              key={ch}
              title={`${ch} — ${inLabel} ${iv.toFixed(1)}% · ${outLabel} ${ov.toFixed(1)}%`}
            >
              <div className="freq-bars">
                <span className="freq-bar in" style={{ height: `${(iv / max) * 100}%` }} />
                <span className="freq-bar out" style={{ height: `${(ov / max) * 100}%` }} />
              </div>
              <span className="freq-label">{ch}</span>
            </div>
          )
        })}
      </div>

      <p className="card-note" style={{ marginTop: 10, marginBottom: 0 }}>
        Same shape, different letters: the cipher moves the histogram sideways but never levels
        it. That surviving shape is exactly what the frequency attack below scores against
        English.
      </p>
    </div>
  )
}
