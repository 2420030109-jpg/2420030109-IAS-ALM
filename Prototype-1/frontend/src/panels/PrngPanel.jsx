import { useEffect, useState } from 'react'
import { apiPost } from '../api/client.js'
import { useAsync } from '../lib/useAsync.js'
import { formatBits } from '../lib/bits.js'
import { isValidHex, hexByteLength } from '../lib/hex.js'
import {
  Banner,
  Button,
  Card,
  CopyButton,
  EmptyState,
  ErrorText,
  Field,
  NumberInput,
  OutRow,
  PanelHead,
  Stat,
  Stats,
  TextInput,
  Workspace,
} from '../components/ui.jsx'
import MiniChart from '../components/MiniChart.jsx'

/* Three equal columns at desktop width, two then one as the window narrows.
   `.row` wraps and `min-width` sets the break point. */
function Col({ children }) {
  return <div style={{ flex: 1, minWidth: 320 }}>{children}</div>
}

const int = (v, fallback = 0) => {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

/* ------------------------------------------------------------------ LCG */

function LcgCard() {
  const [seed, setSeed] = useState('7')
  const [n, setN] = useState('24')
  const { data, error, loading, run } = useAsync((body) => apiPost('/prng/lcg', body))

  // Show a real sequence on landing instead of an empty card.
  useEffect(() => {
    run({ seed: 7, n: 24 })
  }, [run])

  const sequence = data?.sequence || []
  const params = data?.params

  return (
    <Card title="Linear Congruential Generator" sub="fast · predictable">
      <p className="card-note">
        X<sub>n+1</sub> = (a·X<sub>n</sub> + c) mod m. One multiply and one add per output.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run({ seed: int(seed), n: Math.max(1, int(n, 1)) })
        }}
      >
        <div className="row">
          <Field label="Seed">
            <NumberInput value={seed} onChange={(e) => setSeed(e.target.value)} />
          </Field>
          <Field label="Outputs" hint="how many numbers">
            <NumberInput min="1" max="500" value={n} onChange={(e) => setN(e.target.value)} />
          </Field>
        </div>
        <div className="actions">
          <Button type="submit" loading={loading}>
            Generate
          </Button>
        </div>
      </form>

      <ErrorText error={error} />

      {!data && !error && (
        <EmptyState icon="⟳">
          {loading ? 'Generating…' : 'Press Generate to see the sequence.'}
        </EmptyState>
      )}

      {data && (
        <div style={{ marginTop: 14 }}>
          {params && (
            <Stats>
              <Stat label="a" value={params.a} />
              <Stat label="c" value={params.c} />
              <Stat
                label="m"
                value={
                  Number.isInteger(Math.log2(params.m)) ? `2^${Math.log2(params.m)}` : String(params.m)
                }
              />
            </Stats>
          )}

          <div style={{ marginTop: 12 }}>
            <MiniChart values={data.normalized || []} domain={[0, 1]} yLabel="normalized output" />
            <p className="card-note" style={{ margin: '6px 0 0' }}>
              Each output divided by m, so the y-axis is [0, 1).
            </p>
          </div>

          <div style={{ marginTop: 10 }}>
            <OutRow label="Sequence" value={sequence.join(', ')} copy block />
          </div>

          <div style={{ marginTop: 12 }}>
            <Banner kind="warn">
              Uniform-looking, but not random: a, c and m are public, so any two consecutive outputs
              let an attacker solve for the state and print the entire rest of the stream. Never key
              a cipher with an LCG.
            </Banner>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ BBS */

function BbsCard() {
  const [seed, setSeed] = useState('3')
  const [n, setN] = useState('64')
  const [bits, setBits] = useState('16')
  const { data, error, loading, run } = useAsync((body) => apiPost('/prng/bbs', body))

  const bitList = data?.bits || []
  const bitString = bitList.map((b) => (b ? '1' : '0')).join('')

  return (
    <Card title="Blum Blum Shub" sub="slow · provable">
      <p className="card-note">
        x<sub>n+1</sub> = x<sub>n</sub><sup>2</sup> mod (p·q); emit the low bit each step. Predicting
        it is as hard as factoring n.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run({
            seed: int(seed),
            n: Math.max(1, int(n, 1)),
            bits: Math.min(64, Math.max(4, int(bits, 16))),
          })
        }}
      >
        <div className="row">
          <Field label="Seed">
            <NumberInput value={seed} onChange={(e) => setSeed(e.target.value)} />
          </Field>
          <Field label="Bits out">
            <NumberInput min="1" max="512" value={n} onChange={(e) => setN(e.target.value)} />
          </Field>
          <Field label="Prime size" hint="4–64 bits">
            <NumberInput min="4" max="64" value={bits} onChange={(e) => setBits(e.target.value)} />
          </Field>
        </div>
        <div className="actions">
          <Button type="submit" loading={loading}>
            Generate
          </Button>
        </div>
      </form>

      <ErrorText error={error} />

      {!data && !error && (
        <EmptyState icon="⟳">
          {loading ? 'Picking Blum primes…' : 'Press Generate to draw a bitstream.'}
        </EmptyState>
      )}

      {data && (
        <div style={{ marginTop: 14 }}>
          <Stats>
            <Stat label="p" value={String(data.p)} />
            <Stat label="q" value={String(data.q)} />
            <Stat label="modulus n = p·q" value={String(data.n)} />
          </Stats>

          <div style={{ marginTop: 12 }}>
            <div className="out-row">
              <div className="out-key">Bitstream</div>
              <div className="out-val">
                <div className="bitstream" style={{ flex: 1, minWidth: 0 }}>
                  {formatBits(bitList, 8)}
                </div>
                <CopyButton value={bitString} />
              </div>
            </div>
            <OutRow
              label="Ones / zeros"
              value={`${bitList.filter(Boolean).length} ones · ${
                bitList.length - bitList.filter(Boolean).length
              } zeros`}
            />
            {data.values && (
              <OutRow label="States" value={data.values.join(', ')} copy block />
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <Banner kind="info">
              These primes are tiny so the demo stays instant — real BBS uses primes of hundreds of
              bits, which is exactly why it is too slow for bulk keystream.
            </Banner>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------- ANSI X9.17 */

function AnsiCard() {
  const [keyHex, setKeyHex] = useState('')
  const [seedHex, setSeedHex] = useState('')
  const [n, setN] = useState('6')
  const { data, error, loading, run } = useAsync((body) => apiPost('/prng/ansi', body))

  const keyError =
    keyHex && (!isValidHex(keyHex) || hexByteLength(keyHex) !== 32)
      ? 'Needs 64 hex characters (32 bytes)'
      : null
  const seedError =
    seedHex && (!isValidHex(seedHex) || hexByteLength(seedHex) !== 8)
      ? 'Needs 16 hex characters (8 bytes)'
      : null

  const outputs = data?.outputs || []

  return (
    <Card title="ANSI X9.17" sub="block-cipher based">
      <p className="card-note">
        Each output is a block-cipher pass over a timestamp mixed with the secret seed, then the
        seed is advanced. This is the one of the three you could actually key with.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (keyError || seedError) return
          run({
            ...(keyHex ? { key_hex: keyHex } : {}),
            ...(seedHex ? { seed_hex: seedHex } : {}),
            n: Math.max(1, int(n, 1)),
          })
        }}
      >
        <Field label="Key" hint="optional — 64 hex characters, defaults to all zeros" error={keyError}>
          <TextInput
            mono
            invalid={!!keyError}
            placeholder="00…00 (default)"
            value={keyHex}
            onChange={(e) => setKeyHex(e.target.value)}
          />
        </Field>
        <Field label="Seed" hint="optional — 16 hex characters, defaults to all zeros" error={seedError}>
          <TextInput
            mono
            invalid={!!seedError}
            placeholder="0000000000000000 (default)"
            value={seedHex}
            onChange={(e) => setSeedHex(e.target.value)}
          />
        </Field>
        <Field label="Outputs">
          <NumberInput min="1" max="100" value={n} onChange={(e) => setN(e.target.value)} />
        </Field>
        <div className="actions">
          <Button type="submit" loading={loading} disabled={!!keyError || !!seedError}>
            Generate
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setKeyHex('')
              setSeedHex('')
            }}
          >
            Reset key &amp; seed
          </Button>
        </div>
      </form>

      <ErrorText error={error} />

      {!data && !error && (
        <EmptyState icon="⟳">
          {loading ? 'Generating…' : 'Press Generate to produce random blocks.'}
        </EmptyState>
      )}

      {data && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: 8,
            }}
          >
            <span className="card-sub">{outputs.length} blocks · 16 bytes each</span>
            <CopyButton value={outputs.join('\n')} label="Copy all" />
          </div>
          <ul className="hex-list">
            {outputs.map((o, i) => (
              <li key={i}>
                <span className="idx">{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>{o}</span>
                <CopyButton value={o} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ panel */

export default function PrngPanel() {
  return (
    <div className="panel">
      <PanelHead title="Random Number Generators">
        Three generators, same question each time: could you predict the next output? LCG — yes,
        from two samples. Blum Blum Shub — only if you can factor n. ANSI X9.17 — only if you have
        the key.
      </PanelHead>

      <Workspace wide>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Col>
            <LcgCard />
          </Col>
          <Col>
            <BbsCard />
          </Col>
          <Col>
            <AnsiCard />
          </Col>
        </div>
      </Workspace>
    </div>
  )
}
