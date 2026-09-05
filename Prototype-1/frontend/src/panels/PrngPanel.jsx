import { useState } from 'react'
import { apiPost } from '../api/client.js'
import { useAsync } from '../lib/useAsync.js'
import { formatBits } from '../lib/bits.js'
import {
  Button,
  Card,
  Explainer,
  Field,
  TextInput,
  NumberInput,
  ErrorText,
  Mono,
} from '../components/ui.jsx'
import MiniChart from '../components/MiniChart.jsx'

function LcgCard() {
  const [seed, setSeed] = useState('7')
  const [n, setN] = useState('20')
  const { data, error, loading, run } = useAsync((body) => apiPost('/prng/lcg', body))
  return (
    <Card title="Linear Congruential Generator">
      <Explainer>Xₙ₊₁ = (a·Xₙ + c) mod m — fast, periodic, and not cryptographically safe.</Explainer>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run({ seed: parseInt(seed, 10) || 0, n: parseInt(n, 10) || 1 })
        }}
      >
        <div className="row">
          <Field label="Seed">
            <NumberInput value={seed} onChange={(e) => setSeed(e.target.value)} />
          </Field>
          <Field label="n">
            <NumberInput value={n} onChange={(e) => setN(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" loading={loading}>
          Generate
        </Button>
      </form>
      <ErrorText error={error} />
      {data && (
        <div className="result">
          {data.params && (
            <p className="muted">
              a={data.params.a} c={data.params.c} m={data.params.m}
            </p>
          )}
          <p>
            Sequence: <Mono>{(data.sequence || []).join(', ')}</Mono>
          </p>
          <MiniChart values={data.normalized || []} mode="line" />
          <p className="muted">normalized to [0, 1)</p>
        </div>
      )}
    </Card>
  )
}

function BbsCard() {
  const [seed, setSeed] = useState('3')
  const [n, setN] = useState('20')
  const [bits, setBits] = useState('16')
  const { data, error, loading, run } = useAsync((body) => apiPost('/prng/bbs', body))
  return (
    <Card title="Blum Blum Shub">
      <Explainer>
        xₙ₊₁ = xₙ² mod (p·q); take the low bit each step. Slow, but its security reduces to
        factoring.
      </Explainer>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run({
            seed: parseInt(seed, 10) || 0,
            n: parseInt(n, 10) || 1,
            bits: parseInt(bits, 10) || 1,
          })
        }}
      >
        <div className="row">
          <Field label="Seed">
            <NumberInput value={seed} onChange={(e) => setSeed(e.target.value)} />
          </Field>
          <Field label="n">
            <NumberInput value={n} onChange={(e) => setN(e.target.value)} />
          </Field>
          <Field label="bits">
            <NumberInput value={bits} onChange={(e) => setBits(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" loading={loading}>
          Generate
        </Button>
      </form>
      <ErrorText error={error} />
      {data && (
        <div className="result">
          <p className="muted">
            p={String(data.p)} q={String(data.q)} n={String(data.n)}
          </p>
          <p>
            Bitstream: <Mono>{formatBits(data.bits || [], 8)}</Mono>
          </p>
          {data.values && (
            <p>
              Values: <Mono>{data.values.join(', ')}</Mono>
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

function AnsiCard() {
  const [keyHex, setKeyHex] = useState('')
  const [seedHex, setSeedHex] = useState('')
  const [n, setN] = useState('5')
  const { data, error, loading, run } = useAsync((body) => apiPost('/prng/ansi', body))
  return (
    <Card title="ANSI X9.17">
      <Explainer>
        A DES-based generator seeded from a timestamp; key and seed are optional here.
      </Explainer>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run({
            ...(keyHex ? { key_hex: keyHex } : {}),
            ...(seedHex ? { seed_hex: seedHex } : {}),
            n: parseInt(n, 10) || 1,
          })
        }}
      >
        <Field label="key_hex (optional, 32 bytes)">
          <TextInput value={keyHex} onChange={(e) => setKeyHex(e.target.value)} />
        </Field>
        <Field label="seed_hex (optional, 8 bytes)">
          <TextInput value={seedHex} onChange={(e) => setSeedHex(e.target.value)} />
        </Field>
        <Field label="n">
          <NumberInput value={n} onChange={(e) => setN(e.target.value)} />
        </Field>
        <Button type="submit" loading={loading}>
          Generate
        </Button>
      </form>
      <ErrorText error={error} />
      {data && (
        <div className="result">
          <ul className="hex-list">
            {(data.outputs || []).map((o, i) => (
              <li key={i} className="mono">
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

export default function PrngPanel() {
  return (
    <div className="panel">
      <h2>PRNG</h2>
      <Explainer>
        Three pseudo-random generators side by side — two you should never key a cipher with, and
        one you could.
      </Explainer>
      <LcgCard />
      <BbsCard />
      <AnsiCard />
    </div>
  )
}
