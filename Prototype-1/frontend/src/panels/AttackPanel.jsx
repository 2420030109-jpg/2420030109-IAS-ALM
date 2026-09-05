import { useState } from 'react'
import { apiPost } from '../api/client.js'
import { useAsync } from '../lib/useAsync.js'
import { useAppState } from '../state/AppState.jsx'
import { chunkHex } from '../lib/bits.js'
import { isValidHex } from '../lib/hex.js'
import {
  Banner,
  Button,
  Card,
  CopyButton,
  EmptyState,
  ErrorText,
  Field,
  NumberInput,
  PanelHead,
  Stat,
  Stats,
  TextInput,
  Verdict,
  Workspace,
} from '../components/ui.jsx'

/* Two attack cards per row on a wide screen, one when narrow. */
function Col({ children }) {
  return <div style={{ flex: 1, minWidth: 380 }}>{children}</div>
}

const secs = (v) => `${Number(v ?? 0).toFixed(4)}s`

/** Printable ASCII for a byte value, or null. */
function asciiOf(byte) {
  return byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : null
}

function Waiting({ loading, children }) {
  return <EmptyState icon={loading ? '⟳' : '↖'}>{loading ? 'Running attack…' : children}</EmptyState>
}

/* --------------------------------------------------- brute force S-DES */

function BruteForceCard() {
  const { lastSdesCipherHex } = useAppState()
  const [manual, setManual] = useState('')
  const [knownByte, setKnownByte] = useState('72')
  const { data, error, loading, run } = useAsync((body) => apiPost('/attack/bruteforce', body))

  const ciphertextHex = (manual || lastSdesCipherHex || '').trim()
  const inherited = !manual && !!lastSdesCipherHex
  const hexError = ciphertextHex && !isValidHex(ciphertextHex) ? 'Not valid hex' : null

  const byte = Math.max(0, Math.min(255, parseInt(knownByte, 10) || 0))
  const chr = asciiOf(byte)

  const key = data?.recovered_key
  const keyBits = key === null || key === undefined ? null : Number(key).toString(2).padStart(10, '0')

  return (
    <Card title="Brute-force S-DES" sub="1024-key search">
      <p className="card-note">
        A 10-bit key means 1024 candidates. Decrypt the first ciphertext byte under every one of
        them and keep the key that produces the plaintext byte you already know.
      </p>

      {inherited && (
        <Banner kind="info">
          Ciphertext carried over from the S-DES panel. Paste a different one below to override it.
        </Banner>
      )}

      <Field
        label="Ciphertext"
        hint={
          inherited
            ? `using ${lastSdesCipherHex}`
            : 'hex — run the S-DES panel first, or paste a ciphertext here'
        }
        error={hexError}
        aside={<CopyButton value={ciphertextHex} />}
      >
        <TextInput
          mono
          invalid={!!hexError}
          value={manual}
          placeholder={lastSdesCipherHex || 'e.g. 9d2f'}
          onChange={(e) => setManual(e.target.value)}
        />
      </Field>

      <Field
        label="Known first plaintext byte"
        hint={chr ? `${byte} = '${chr}'` : `${byte} — not a printable character`}
      >
        <NumberInput
          min="0"
          max="255"
          value={knownByte}
          onChange={(e) => setKnownByte(e.target.value)}
        />
      </Field>

      <div className="actions">
        <Button
          loading={loading}
          disabled={!ciphertextHex || !!hexError}
          onClick={() => run({ ciphertext_hex: ciphertextHex, known_first_plain_byte: byte })}
        >
          Break it
        </Button>
      </div>

      <ErrorText error={error} />

      {!data && !error && (
        <Waiting loading={loading}>
          {ciphertextHex ? 'Press Break it to search the key space.' : 'Needs a ciphertext first.'}
        </Waiting>
      )}

      {data && (
        <div style={{ marginTop: 14 }}>
          <Verdict pass={!!data.success}>
            {data.success
              ? `Key recovered in ${secs(data.elapsed_seconds)}`
              : 'No key matched that plaintext byte'}
          </Verdict>
          {data.success && (
            <div style={{ margin: '12px 0' }}>
              <div className="big-out">{String(key)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <code className="mono muted">{keyBits}</code>
                <CopyButton value={String(key)} label="Copy key" />
              </div>
            </div>
          )}
          <Stats>
            <Stat label="Keys tried" value={`${data.keys_tried} / 1024`} tone="bad" />
            <Stat label="Elapsed" value={secs(data.elapsed_seconds)} tone="bad" />
            <Stat
              label="Recovered key"
              value={data.success ? String(key) : '—'}
              tone={data.success ? 'bad' : undefined}
            />
          </Stats>
        </div>
      )}
    </Card>
  )
}

/* ---------------------------------------------------------- frequency */

function FrequencyCard() {
  const [ciphertext, setCiphertext] = useState('DWWDFN DW GDZQ')
  const { data, error, loading, run } = useAsync((body) => apiPost('/attack/frequency', body))

  return (
    <Card title="Frequency analysis" sub="Caesar — no key search at all">
      <p className="card-note">
        Score all 26 shifts against English letter frequencies with chi-squared and take the best
        one. The key never has to be guessed; the language gives it away.
      </p>

      <Field label="Ciphertext" aside={<CopyButton value={ciphertext} />}>
        <TextInput
          mono
          value={ciphertext}
          onChange={(e) => setCiphertext(e.target.value)}
          placeholder="DWWDFN DW GDZQ"
        />
      </Field>

      <div className="actions">
        <Button loading={loading} disabled={!ciphertext.trim()} onClick={() => run({ ciphertext })}>
          Break it
        </Button>
      </div>

      <ErrorText error={error} />

      {!data && !error && <Waiting loading={loading}>Press Break it to recover the shift.</Waiting>}

      {data && (
        <div style={{ marginTop: 14 }}>
          <Verdict pass={!!data.success}>
            Plaintext recovered in {secs(data.elapsed_seconds)} — zero keys tried
          </Verdict>
          <div style={{ margin: '12px 0' }}>
            <div className="big-out">{data.recovered_plaintext}</div>
            <div style={{ marginTop: 6 }}>
              <CopyButton value={data.recovered_plaintext} label="Copy plaintext" />
            </div>
          </div>
          <Stats>
            <Stat label="Recovered shift" value={data.recovered_shift} tone="bad" />
            <Stat label="Keys tried" value={0} tone="bad" />
            <Stat label="Elapsed" value={secs(data.elapsed_seconds)} tone="bad" />
          </Stats>
        </div>
      )}
    </Card>
  )
}

/* ----------------------------------------------------- known plaintext */

function KnownPlaintextCard() {
  const [ciphertextHex, setCiphertextHex] = useState('2b3f1a44e0c9de71a5f0')
  const [knownPlaintext, setKnownPlaintext] = useState('ATTACKATDA')
  const { data, error, loading, run } = useAsync((body) => apiPost('/attack/known-plaintext', body))

  const hexError = ciphertextHex && !isValidHex(ciphertextHex) ? 'Not valid hex' : null
  const ready = !!ciphertextHex && !!knownPlaintext && !hexError

  return (
    <Card title="Known-plaintext" sub="stream cipher / RC4">
      <p className="card-note">
        A stream cipher is just plaintext XOR keystream. Know one plaintext and you get the
        keystream for free — and with it every other message sent under the same key and IV.
      </p>

      <Field
        label="Ciphertext"
        hint="hex"
        error={hexError}
        aside={<CopyButton value={ciphertextHex} />}
      >
        <TextInput
          mono
          invalid={!!hexError}
          value={ciphertextHex}
          onChange={(e) => setCiphertextHex(e.target.value)}
        />
      </Field>
      <Field label="Known plaintext" hint="the bytes you already know, from the start">
        <TextInput value={knownPlaintext} onChange={(e) => setKnownPlaintext(e.target.value)} />
      </Field>

      <div className="actions">
        <Button
          loading={loading}
          disabled={!ready}
          onClick={() => run({ ciphertext_hex: ciphertextHex, known_plaintext: knownPlaintext })}
        >
          Recover keystream
        </Button>
      </div>

      <ErrorText error={error} />

      {!data && !error && (
        <Waiting loading={loading}>Press Recover keystream to XOR the pair.</Waiting>
      )}

      {data && (
        <div style={{ marginTop: 14 }}>
          <Verdict pass={!!data.success}>
            Keystream recovered in {secs(data.elapsed_seconds)}
          </Verdict>
          <div style={{ margin: '12px 0' }}>
            <div className="big-out">{data.recovered_keystream_hex}</div>
            <div style={{ marginTop: 6 }}>
              <CopyButton value={data.recovered_keystream_hex} label="Copy keystream" />
            </div>
          </div>
          <Stats>
            <Stat
              label="Bytes recovered"
              value={(data.recovered_keystream_hex || '').length / 2}
              tone="bad"
            />
            <Stat label="Elapsed" value={secs(data.elapsed_seconds)} tone="bad" />
          </Stats>
          {data.note && (
            <div style={{ marginTop: 12 }}>
              <Banner kind="warn">{data.note}</Banner>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

/* --------------------------------------------------------- ECB leakage */

function BlockColumn({ title, hex, markDups, repeats }) {
  const blocks = chunkHex(hex || '', 32)
  const counts = new Map()
  blocks.forEach((b) => counts.set(b, (counts.get(b) || 0) + 1))
  const dups = markDups
    ? new Set([...counts.entries()].filter(([, c]) => c > 1).map(([b]) => b))
    : new Set()

  return (
    <div className="modes-col" style={{ flex: 1, minWidth: 240 }}>
      <div className="modes-col-head">
        <h4>{title}</h4>
        <span className={repeats > 0 ? 'error-text' : 'ok-text'}>
          {repeats > 0 ? `${repeats} repeats` : '0 repeats'}
        </span>
      </div>
      {blocks.map((b, i) => (
        <div key={i} className={'mode-block' + (dups.has(b) ? ' dup' : '')}>
          {b}
        </div>
      ))}
      <div style={{ marginTop: 6 }}>
        <CopyButton value={hex} label="Copy hex" />
      </div>
    </div>
  )
}

function EcbLeakageCard() {
  const [blockRepeats, setBlockRepeats] = useState('8')
  const [patternByte, setPatternByte] = useState('65')
  const { data, error, loading, run } = useAsync((body) => apiPost('/attack/ecb-leakage', body))

  const byte = Math.max(0, Math.min(255, parseInt(patternByte, 10) || 0))
  const chr = asciiOf(byte)

  return (
    <Card title="ECB leakage" sub="mode misuse">
      <p className="card-note">
        Encrypt a flat, repeating buffer under ECB and under CTR with the same key, then count how
        many 16-byte ciphertext blocks are identical.
      </p>

      <div className="row">
        <Field label="Identical blocks in" hint="how many 16-byte blocks">
          <NumberInput
            min="1"
            max="4096"
            value={blockRepeats}
            onChange={(e) => setBlockRepeats(e.target.value)}
          />
        </Field>
        <Field
          label="Fill byte"
          hint={chr ? `${byte} = '${chr}'` : `${byte} — not printable`}
        >
          <NumberInput
            min="0"
            max="255"
            value={patternByte}
            onChange={(e) => setPatternByte(e.target.value)}
          />
        </Field>
      </div>

      <div className="actions">
        <Button
          loading={loading}
          onClick={() =>
            run({ block_repeats: Math.max(1, parseInt(blockRepeats, 10) || 1), pattern_byte: byte })
          }
        >
          Compare ECB vs CTR
        </Button>
      </div>

      <ErrorText error={error} />

      {!data && !error && (
        <Waiting loading={loading}>Press Compare to encrypt the same buffer both ways.</Waiting>
      )}

      {data && (
        <div style={{ marginTop: 14 }}>
          <Verdict pass={false}>
            ECB leaked {data.ecb_repeated_blocks} repeated blocks — CTR leaked{' '}
            {data.ctr_repeated_blocks}
          </Verdict>
          <div style={{ marginTop: 12 }}>
            <Stats>
              <Stat label="ECB repeated blocks" value={data.ecb_repeated_blocks} tone="bad" />
              <Stat label="CTR repeated blocks" value={data.ctr_repeated_blocks} tone="good" />
            </Stats>
          </div>

          <div className="row" style={{ marginTop: 14, alignItems: 'flex-start' }}>
            <BlockColumn
              title="ECB"
              hex={data.ecb_ciphertext_hex_preview}
              markDups
              repeats={data.ecb_repeated_blocks}
            />
            <BlockColumn
              title="CTR"
              hex={data.ctr_ciphertext_hex_preview}
              repeats={data.ctr_repeated_blocks}
            />
          </div>
          <p className="card-note" style={{ margin: '10px 0 0' }}>
            First 32 bytes of each ciphertext.
          </p>

          {data.note && (
            <div style={{ marginTop: 10 }}>
              <Banner kind="warn">{data.note}</Banner>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

/* ---------------------------------------------------------------- panel */

export default function AttackPanel() {
  return (
    <div className="panel">
      <PanelHead title="Attack Simulator">
        Four classic breaks run against this platform's own ciphers — a key space small enough to
        exhaust, a cipher that leaks through letter frequencies, a keystream given away by known
        plaintext, and a block mode that preserves structure. Each one reports what it recovered and
        what it cost.
      </PanelHead>

      <Workspace wide>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Col>
            <BruteForceCard />
          </Col>
          <Col>
            <FrequencyCard />
          </Col>
        </div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Col>
            <KnownPlaintextCard />
          </Col>
          <Col>
            <EcbLeakageCard />
          </Col>
        </div>
      </Workspace>
    </div>
  )
}
