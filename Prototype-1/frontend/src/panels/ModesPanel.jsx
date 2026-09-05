import { useState } from 'react'
import { apiPost } from '../api/client.js'
import { useAsync } from '../lib/useAsync.js'
import { chunkHex } from '../lib/bits.js'
import { Button, Card, Explainer, Field, TextInput, ErrorText } from '../components/ui.jsx'

const MODES = ['ECB', 'CBC', 'CFB', 'OFB', 'CTR']
const DEFAULT_KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'

function dupSet(blocks) {
  const seen = new Map()
  blocks.forEach((b) => seen.set(b, (seen.get(b) || 0) + 1))
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([b]) => b))
}

export default function ModesPanel() {
  const [text, setText] = useState('THE SAME BLOCK REPEATS THE SAME BLOCK REPEATS!!')
  const [keyHex, setKeyHex] = useState(DEFAULT_KEY)
  const { data, error, loading, run } = useAsync((body) => apiPost('/modes/compare', body))

  return (
    <div className="panel">
      <h2>Block Modes</h2>
      <Explainer>
        The same AES-256 key in five modes: ECB encrypts each 16-byte block independently, so equal
        plaintext blocks yield equal ciphertext blocks — a pattern the others hide.
      </Explainer>

      <Card title="Compare modes (AES-256)">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            run({ algorithm: 'aes256', text, key_hex: keyHex })
          }}
        >
          <Field label="Text">
            <TextInput value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <Field label="AES-256 key (hex, 64 chars)">
            <TextInput value={keyHex} onChange={(e) => setKeyHex(e.target.value)} />
          </Field>
          <Button type="submit" loading={loading}>
            Compare all 5 modes
          </Button>
        </form>
        <ErrorText error={error} />
      </Card>

      {data && (
        <Card title="Ciphertext by mode (16-byte blocks)">
          <div className="modes-grid">
            {MODES.map((m) => {
              const res = data.results?.[m]
              const blocks = chunkHex(res?.ciphertext_hex || '')
              const dups = m === 'ECB' ? dupSet(blocks) : new Set()
              return (
                <div className="modes-col" key={m}>
                  <h4>{m}</h4>
                  {blocks.map((b, i) => (
                    <div
                      key={i}
                      className={'mode-block' + (dups.has(b) ? ' dup' : '')}
                      title={dups.has(b) ? 'repeated block' : undefined}
                    >
                      {b}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
          {data.analysis && (
            <div className="result">
              <p>
                ECB repeated blocks: <strong>{data.analysis.ecb_repeated_blocks}</strong> of{' '}
                {data.analysis.total_blocks} — every other mode: <strong>0</strong>.
              </p>
              {data.analysis.note && <p className="muted">{data.analysis.note}</p>}
              <p className="muted">
                ECB leaks because it is a pure codebook: identical input blocks map to identical
                output blocks, with no chaining or counter to break the symmetry.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
