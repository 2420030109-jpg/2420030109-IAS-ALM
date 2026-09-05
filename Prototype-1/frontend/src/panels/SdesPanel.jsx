import { useEffect, useMemo, useState } from 'react'
import { apiPost } from '../api/client.js'
import { useAsync } from '../lib/useAsync.js'
import { useAppState } from '../state/AppState.jsx'
import { formatBits } from '../lib/bits.js'
import {
  ActionToggle,
  Banner,
  Button,
  Card,
  CopyButton,
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
import TraceView from '../components/TraceView.jsx'

const DEFAULT_TEXT = 'Hi'
const DEFAULT_KEY = '642'

function keyError(raw) {
  if (raw === '') return 'required'
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0 || n > 1023) return 'must be a whole number from 0 to 1023'
  return null
}

function keyBits(raw) {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0 || n > 1023) return null
  return Array.from({ length: 10 }, (_, i) => (n >> (9 - i)) & 1)
}

function toBits(byte) {
  const n = Number(byte) & 0xff
  return Array.from({ length: 8 }, (_, i) => (n >> (7 - i)) & 1)
}

export default function SdesPanel() {
  const [action, setAction] = useState('encrypt')
  const [text, setText] = useState(DEFAULT_TEXT)
  const [cipherHex, setCipherHex] = useState('')
  const [key, setKey] = useState(DEFAULT_KEY)
  const [carried, setCarried] = useState(false)
  const { setLastSdesCipherHex } = useAppState()

  const enc = useAsync(async (body) => {
    const d = await apiPost('/sdes/encrypt', body)
    if (d?.ciphertext_hex) {
      // The Attack panel brute-forces whatever we produced last.
      setLastSdesCipherHex(d.ciphertext_hex)
      setCipherHex(d.ciphertext_hex)
      setCarried(true)
    }
    return d
  })
  const dec = useAsync((body) => apiPost('/sdes/decrypt', body))

  // Show a real worked example on arrival. `run` is stable -> fires once.
  const encRun = enc.run
  useEffect(() => {
    encRun({ text: DEFAULT_TEXT, key: Number(DEFAULT_KEY) })
  }, [encRun])

  const kerr = keyError(key)
  const bits = keyBits(key)
  const encrypting = action === 'encrypt'
  const q = encrypting ? enc : dec
  const data = q.data
  const loading = enc.loading || dec.loading

  const blocks = useMemo(() => (Array.isArray(enc.data?.blocks) ? enc.data.blocks : []), [enc.data])

  function submit(e) {
    e.preventDefault()
    if (kerr) return
    const k = parseInt(key, 10)
    if (encrypting) enc.run({ text, key: k })
    else dec.run({ ciphertext_hex: cipherHex, key: k })
  }

  const runDisabled = !!kerr || (encrypting ? text === '' : cipherHex === '')

  const controls = (
    <Card title="S-DES" sub="8-bit block · 10-bit key">
      <form onSubmit={submit}>
        <div className="field">
          <span className="field-label">
            <span>Direction</span>
          </span>
          <ActionToggle value={action} onChange={setAction} />
        </div>

        {encrypting ? (
          <Field label="Text">
            <TextInput mono value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        ) : (
          <Field label="Ciphertext" hint="hex — two characters per byte">
            <TextInput
              mono
              value={cipherHex}
              placeholder="e.g. 1f2c"
              onChange={(e) => {
                setCipherHex(e.target.value)
                setCarried(false)
              }}
            />
          </Field>
        )}

        <Field
          label="Key"
          hint={kerr ? undefined : '10-bit integer, 0–1023'}
          error={kerr}
          aside={bits ? <Mono>{formatBits(bits, 5)}</Mono> : null}
        >
          <NumberInput
            value={key}
            min="0"
            max="1023"
            invalid={!!kerr}
            onChange={(e) => setKey(e.target.value)}
          />
        </Field>

        {!encrypting && carried && (
          <Banner kind="info">Ciphertext carried over from the last encrypt.</Banner>
        )}

        <div className="actions">
          <Button type="submit" loading={loading} disabled={runDisabled}>
            Run
          </Button>
        </div>
      </form>
      <Note>
        Only 1024 keys exist, so the Attack panel can brute-force this ciphertext in milliseconds.
      </Note>
    </Card>
  )

  return (
    <div className="panel">
      <PanelHead title="S-DES">
        A toy Feistel cipher small enough to read end to end: ten key bits expand into K1 and K2,
        then one byte walks through IP, two rounds, a swap, and IP⁻¹.
      </PanelHead>

      <Workspace controls={controls}>
        <Card
          title={encrypting ? 'Ciphertext' : 'Plaintext'}
          actions={<Pill>{encrypting ? 'encrypt' : 'decrypt'}</Pill>}
        >
          <ErrorText error={q.error} />
          {!data && !q.error && (
            <EmptyState>Press Run to push a byte through the cipher.</EmptyState>
          )}
          {data && (
            <>
              {encrypting ? (
                <OutRow label="Ciphertext" copy={data.ciphertext_hex}>
                  <span className="big-out">{data.ciphertext_hex}</span>
                </OutRow>
              ) : (
                <OutRow label="Plaintext" copy={data.plaintext}>
                  <span className="big-out">{data.plaintext}</span>
                </OutRow>
              )}
              <div style={{ marginTop: 12 }}>
                <Stats>
                  <Stat label="Key (10-bit)" value={parseInt(key, 10) || 0} />
                  <Stat
                    label="Blocks (1 byte each)"
                    value={
                      encrypting
                        ? blocks.length || Math.round((data.ciphertext_hex || '').length / 2)
                        : Math.round((cipherHex || '').length / 2)
                    }
                  />
                  <Stat label="Key space" value="1024" />
                </Stats>
              </div>
              {data.key_bits && (
                <div style={{ marginTop: 12 }}>
                  <OutRow label="Key bits" copy={formatBits(data.key_bits, 5)}>
                    <span className="bitstream">{formatBits(data.key_bits, 5)}</span>
                  </OutRow>
                </div>
              )}
            </>
          )}
        </Card>

        {encrypting && (
          <Card title="Per-byte blocks" sub="each byte is its own 8-bit block">
            {blocks.length === 0 ? (
              <EmptyState>Encrypt some text to see the byte-by-byte breakdown.</EmptyState>
            ) : (
              <div className="scroll-table">
                <table>
                  <thead>
                    <tr>
                      <th>Char</th>
                      <th>Plain byte</th>
                      <th>Plain bits</th>
                      <th>Cipher byte</th>
                      <th>Cipher bits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocks.map((b, i) => (
                      <tr key={i}>
                        <td className="mono">{JSON.stringify(b.char)}</td>
                        <td className="num">{b.plain_byte}</td>
                        <td className="mono">{formatBits(toBits(b.plain_byte), 4)}</td>
                        <td className="num">{b.cipher_byte}</td>
                        <td className="mono">{formatBits(toBits(b.cipher_byte), 4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        <Card
          title="Round trace"
          sub="first byte"
          actions={
            data?.first_byte_trace ? (
              <CopyButton value={JSON.stringify(data.first_byte_trace, null, 2)} label="Copy JSON" />
            ) : null
          }
        >
          <Note>
            Read it top to bottom: the key schedule builds K1 and K2, then the data path runs
            IP → fK1 → SW → fK2 → IP⁻¹. Indented rows are what happens inside a round.
          </Note>
          {data?.first_byte_trace ? (
            <TraceView trace={data.first_byte_trace} />
          ) : (
            <EmptyState>Press Run to see the round-by-round trace.</EmptyState>
          )}
        </Card>
      </Workspace>
    </div>
  )
}
