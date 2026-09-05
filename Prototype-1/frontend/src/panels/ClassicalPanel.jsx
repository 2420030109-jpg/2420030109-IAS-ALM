import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiPost } from '../api/client.js'
import { useAsync } from '../lib/useAsync.js'
import {
  ActionToggle,
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorText,
  Field,
  Mono,
  Note,
  NumberInput,
  OutRow,
  PanelHead,
  Pill,
  Stat,
  Stats,
  TextInput,
  Workspace,
} from '../components/ui.jsx'
import FreqChart from '../components/FreqChart.jsx'

/* -------------------------------------------------------------- Caesar --- */

function useCaesar({ onBreak } = {}) {
  const [text, setText] = useState('ATTACKATDAWN')
  const [shift, setShift] = useState('3')
  const [action, setAction] = useState('encrypt')
  const { data, error, loading, run } = useAsync((body) => apiPost('/classical/caesar', body))

  // Land on a worked example instead of a blank form. `run` is stable, so this
  // fires exactly once.
  useEffect(() => {
    run({ text: 'ATTACKATDAWN', shift: 3, action: 'encrypt' })
  }, [run])

  const submit = (e) => {
    e.preventDefault()
    run({ text, shift: parseInt(shift, 10) || 0, action })
  }

  const controls = (
    <Card title="Caesar" sub="shift every letter by n">
      <form onSubmit={submit}>
        <Field label="Text">
          <TextInput mono value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <div className="row">
          <Field label="Shift">
            <NumberInput value={shift} onChange={(e) => setShift(e.target.value)} />
          </Field>
          <div className="field">
            <span className="field-label">
              <span>Direction</span>
            </span>
            <ActionToggle value={action} onChange={setAction} />
          </div>
        </div>
        <div className="actions">
          <Button type="submit" loading={loading}>
            Run
          </Button>
        </div>
      </form>
    </Card>
  )

  const results = (
    <Card
      title="Caesar"
      actions={
        data ? (
          <div className="row tight" style={{ flex: 'none' }}>
            <Pill>
              {data.action} · shift {data.shift}
            </Pill>
            {onBreak && (
              <Button size="sm" variant="secondary" onClick={() => onBreak(data.output)}>
                Break this →
              </Button>
            )}
          </div>
        ) : null
      }
    >
      <ErrorText error={error} />
      {!data && !error && <EmptyState>Press Run to encrypt a sample message.</EmptyState>}
      {data && (
        <>
          <OutRow label="Input">
            <Mono>{data.input}</Mono>
          </OutRow>
          <OutRow label="Output" copy={data.output}>
            <span className="big-out">{data.output}</span>
          </OutRow>
          <div style={{ marginTop: 14 }}>
            <FreqChart input={data.input_frequency} output={data.output_frequency} />
          </div>
        </>
      )}
    </Card>
  )

  return { controls, results }
}

/** Self-contained Caesar (controls + result) — used by the panel test. */
export function CaesarBox() {
  const { controls, results } = useCaesar()
  return (
    <>
      {controls}
      {results}
    </>
  )
}

/* ------------------------------------------------------------ Playfair --- */

function usePlayfair() {
  const [text, setText] = useState('HELLOWORLD')
  const [key, setKey] = useState('MONARCHY')
  const [action, setAction] = useState('encrypt')
  const [hover, setHover] = useState(null)
  const { data, error, loading, run } = useAsync((body) => apiPost('/classical/playfair', body))

  const square = useMemo(
    () => (data?.key_square || []).map((row) => (Array.isArray(row) ? row : String(row).split(''))),
    [data],
  )
  const hit = useMemo(() => new Set(hover ? hover.map((c) => String(c).toUpperCase()) : []), [hover])

  const controls = (
    <Card title="Playfair" sub="digraphs on a 5×5 key square">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run({ text, key, action })
        }}
      >
        <Field label="Text">
          <TextInput mono value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <div className="row">
          <Field label="Key">
            <TextInput value={key} onChange={(e) => setKey(e.target.value)} />
          </Field>
          <div className="field">
            <span className="field-label">
              <span>Direction</span>
            </span>
            <ActionToggle value={action} onChange={setAction} />
          </div>
        </div>
        <div className="actions">
          <Button type="submit" loading={loading}>
            Run
          </Button>
        </div>
      </form>
    </Card>
  )

  const results = (
    <Card title="Playfair" actions={data ? <Pill>{data.action}</Pill> : null}>
      <ErrorText error={error} />
      {!data && !error && (
        <EmptyState>Run Playfair to build the key square and pair up the letters.</EmptyState>
      )}
      {data && (
        <>
          <OutRow label="Output" copy={data.output}>
            <span className="big-out">{data.output}</span>
          </OutRow>
          <div className="row" style={{ marginTop: 14, alignItems: 'flex-start' }}>
            <div style={{ flex: 'none' }}>
              <Note>Key square (J folded into I)</Note>
              <div className="playfair-grid">
                {square.map((row, r) => (
                  <div className="playfair-row" key={r}>
                    {row.map((ch, c) => (
                      <span
                        className={'playfair-cell' + (hit.has(String(ch).toUpperCase()) ? ' hit' : '')}
                        key={c}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ minWidth: 180 }}>
              <Note>Digraphs — hover one to light up its cells</Note>
              <div className="digraphs">
                {(data.digraphs || []).map((d, i) => {
                  const pair = Array.isArray(d) ? d : String(d).split('')
                  return (
                    <span
                      className="digraph"
                      key={i}
                      onMouseEnter={() => setHover(pair)}
                      onMouseLeave={() => setHover(null)}
                    >
                      {pair.join('')}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  )

  return { controls, results }
}

/* -------------------------------------------------------------- attack --- */

function useAttack() {
  const [ciphertext, setCiphertext] = useState('DWWDFNDWGDZQ')
  const { data, error, loading, run } = useAsync((body) =>
    apiPost('/classical/caesar/attack', body),
  )

  const start = useCallback(
    (ct) => {
      setCiphertext(ct)
      run({ ciphertext: ct })
    },
    [run],
  )

  const ranked = useMemo(() => {
    if (!data?.candidates) return []
    return [...data.candidates].sort((a, b) => a.chi_squared - b.chi_squared)
  }, [data])
  const best = ranked[0]

  const controls = (
    <Card title="Frequency attack" sub="break Caesar without the key">
      <Note>
        Every one of the 26 shifts is scored by chi-squared against English letter frequencies.
        The lowest score is the plaintext — no key needed.
      </Note>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run({ ciphertext })
        }}
      >
        <Field label="Ciphertext">
          <TextInput mono value={ciphertext} onChange={(e) => setCiphertext(e.target.value)} />
        </Field>
        <div className="actions">
          <Button type="submit" loading={loading}>
            Break it
          </Button>
        </div>
      </form>
    </Card>
  )

  const results = (
    <Card title="Frequency attack" sub={data ? '26 shifts scored' : undefined}>
      <ErrorText error={error} />
      {!data && !error && (
        <EmptyState icon="🔓">Run the attack to recover the shift and the plaintext.</EmptyState>
      )}
      {data && (
        <>
          <Stats>
            <Stat label="Recovered shift" value={data.recovered_shift} tone="good" />
            <Stat label="Keys tried" value={data.candidates?.length ?? 26} />
            <Stat
              label="Elapsed"
              value={`${(Number(data.elapsed_seconds) * 1000).toFixed(2)} ms`}
            />
          </Stats>
          <div style={{ marginTop: 12 }}>
            <OutRow label="Plaintext" copy={data.recovered_plaintext}>
              <span className="big-out">{data.recovered_plaintext}</span>
            </OutRow>
          </div>
          <Banner kind="ok">
            Shift {data.recovered_shift} scored {Number(best?.chi_squared ?? 0).toFixed(1)} — the
            runner-up scored {Number(ranked[1]?.chi_squared ?? 0).toFixed(1)}. Frequency structure
            makes the answer unambiguous.
          </Banner>
          <div className="scroll-table">
            <table>
              <thead>
                <tr>
                  <th>Shift</th>
                  <th>Candidate plaintext</th>
                  <th style={{ textAlign: 'right' }}>chi²</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((c) => (
                  <tr key={c.shift} className={c.shift === data.recovered_shift ? 'row-best' : undefined}>
                    <td className="num">{c.shift}</td>
                    <td className="mono">{c.candidate}</td>
                    <td className="num">{Number(c.chi_squared).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="card-note" style={{ marginTop: 10, marginBottom: 0 }}>
            Sorted by chi² — the winner is the top row.
          </p>
        </>
      )}
    </Card>
  )

  return { controls, results, start }
}

/* --------------------------------------------------------------- panel --- */

export default function ClassicalPanel() {
  const attack = useAttack()
  const caesar = useCaesar({ onBreak: attack.start })
  const playfair = usePlayfair()

  return (
    <div className="panel">
      <PanelHead title="Classical ciphers">
        Substitution rearranges the alphabet but leaves letter frequencies intact — encrypt on the
        left, then watch the same histogram give the key away.
      </PanelHead>
      <Workspace
        controls={
          <>
            {caesar.controls}
            {attack.controls}
            {playfair.controls}
          </>
        }
      >
        {caesar.results}
        {attack.results}
        {playfair.results}
      </Workspace>
    </div>
  )
}
