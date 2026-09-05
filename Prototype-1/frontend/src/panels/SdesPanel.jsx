import { useState } from 'react'
import { apiPost } from '../api/client.js'
import { useAsync } from '../lib/useAsync.js'
import { useAppState } from '../state/AppState.jsx'
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
import TraceView from '../components/TraceView.jsx'

function keyError(raw) {
  if (raw === '') return 'required'
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0 || n > 1023) return 'must be an integer 0–1023'
  return null
}

function EncryptBox() {
  const [text, setText] = useState('Hi')
  const [key, setKey] = useState('642')
  const { setLastSdesCipherHex } = useAppState()
  const { data, error, loading, run } = useAsync(async (body) => {
    const d = await apiPost('/sdes/encrypt', body)
    if (d?.ciphertext_hex) setLastSdesCipherHex(d.ciphertext_hex)
    return d
  })
  const kerr = keyError(key)

  return (
    <Card title="Encrypt">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!kerr) run({ text, key: parseInt(key, 10) })
        }}
      >
        <Field label="Text">
          <TextInput value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <Field label="10-bit key (0–1023)" error={kerr}>
          <NumberInput
            value={key}
            min="0"
            max="1023"
            onChange={(e) => setKey(e.target.value)}
          />
        </Field>
        <Button type="submit" loading={loading} disabled={!!kerr}>
          Encrypt
        </Button>
      </form>
      <ErrorText error={error} />
      {data && (
        <div className="result">
          <p>
            Ciphertext hex: <Mono>{data.ciphertext_hex}</Mono>
          </p>
          {data.key_bits && (
            <p>
              Key bits: <Mono>{formatBits(data.key_bits, 5)}</Mono>
            </p>
          )}
          {Array.isArray(data.blocks) && data.blocks.length > 0 && (
            <div className="scroll-table">
              <table>
                <thead>
                  <tr>
                    <th>char</th>
                    <th>plain byte</th>
                    <th>cipher byte</th>
                  </tr>
                </thead>
                <tbody>
                  {data.blocks.map((b, i) => (
                    <tr key={i}>
                      <td className="mono">{JSON.stringify(b.char)}</td>
                      <td className="mono">
                        {b.plain_byte} ({formatBits(toBits(b.plain_byte), 4)})
                      </td>
                      <td className="mono">
                        {b.cipher_byte} ({formatBits(toBits(b.cipher_byte), 4)})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h4>Round-by-round trace — first byte</h4>
          <TraceView trace={data.first_byte_trace} />
        </div>
      )}
    </Card>
  )
}

function toBits(byte) {
  const n = Number(byte) & 0xff
  return Array.from({ length: 8 }, (_, i) => (n >> (7 - i)) & 1)
}

function DecryptBox() {
  const { lastSdesCipherHex } = useAppState()
  const [ciphertextHex, setCiphertextHex] = useState('')
  const [key, setKey] = useState('642')
  const { data, error, loading, run } = useAsync((body) => apiPost('/sdes/decrypt', body))
  const kerr = keyError(key)
  const effectiveHex = ciphertextHex || lastSdesCipherHex

  return (
    <Card title="Decrypt">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!kerr) run({ ciphertext_hex: effectiveHex, key: parseInt(key, 10) })
        }}
      >
        <Field
          label="Ciphertext hex"
          hint={lastSdesCipherHex ? `defaults to last encrypt: ${lastSdesCipherHex}` : undefined}
        >
          <TextInput
            value={ciphertextHex}
            placeholder={lastSdesCipherHex}
            onChange={(e) => setCiphertextHex(e.target.value)}
          />
        </Field>
        <Field label="10-bit key (0–1023)" error={kerr}>
          <NumberInput value={key} min="0" max="1023" onChange={(e) => setKey(e.target.value)} />
        </Field>
        <Button type="submit" loading={loading} disabled={!!kerr || !effectiveHex}>
          Decrypt
        </Button>
      </form>
      <ErrorText error={error} />
      {data && (
        <div className="result">
          <p>
            Plaintext: <Mono>{data.plaintext}</Mono>
          </p>
          <h4>Round-by-round trace — first byte</h4>
          <TraceView trace={data.first_byte_trace} />
        </div>
      )}
    </Card>
  )
}

export default function SdesPanel() {
  return (
    <div className="panel">
      <h2>S-DES</h2>
      <Explainer>
        A toy 8-bit Feistel cipher: watch the 10-bit key expand into K1/K2 and one byte march
        through IP, two rounds, the swap, and IP⁻¹.
      </Explainer>
      <EncryptBox />
      <DecryptBox />
    </div>
  )
}
