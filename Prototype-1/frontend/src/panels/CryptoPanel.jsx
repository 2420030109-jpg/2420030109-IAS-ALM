import { useMemo, useState } from 'react'
import { apiPost } from '../api/client.js'
import { useAsync } from '../lib/useAsync.js'
import { hexByteLength } from '../lib/hex.js'
import { chunkHex } from '../lib/bits.js'
import {
  Button,
  Card,
  Explainer,
  Field,
  TextInput,
  Select,
  ErrorText,
  Mono,
} from '../components/ui.jsx'

const ALGOS = [
  { value: 'des', label: 'DES' },
  { value: 'aes256', label: 'AES-256' },
  { value: 'rc4', label: 'RC4' },
]
const MODES = ['ECB', 'CBC', 'CFB', 'OFB', 'CTR']
const DEFAULT_KEY = {
  des: '0011223344556677',
  aes256: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
  rc4: 'secretkey',
}
const KEY_LABEL = {
  des: 'key (hex, 16 chars → 8 bytes)',
  aes256: 'key (hex, 64 chars → 32 bytes)',
  rc4: 'key (text, any length)',
}

function keyHint(algo, value) {
  if (!value) return 'required'
  if (algo === 'rc4') return null
  const bytes = hexByteLength(value)
  if (bytes === null) return 'not valid hex'
  const need = algo === 'des' ? 8 : 32
  if (bytes !== need) return `${bytes} bytes — needs exactly ${need}`
  return null
}

export default function CryptoPanel() {
  const [algorithm, setAlgorithm] = useState('aes256')
  const [mode, setMode] = useState('CBC')
  const [text, setText] = useState('Attack at dawn!')
  const [keys, setKeys] = useState(DEFAULT_KEY)
  const keyHex = keys[algorithm]
  const isStream = algorithm === 'rc4'

  const [dec, setDec] = useState({ ciphertext_hex: '', iv_hex: '', nonce_hex: '' })

  const enc = useAsync((body) => apiPost('/crypto/encrypt', body))
  const decr = useAsync((body) => apiPost('/crypto/decrypt', body))
  const rt = useAsync((body) => apiPost('/crypto/roundtrip', body))

  const effMode = isStream ? undefined : mode
  const hint = useMemo(() => keyHint(algorithm, keyHex), [algorithm, keyHex])

  function setKey(v) {
    setKeys((k) => ({ ...k, [algorithm]: v }))
  }

  function doEncrypt(e) {
    e.preventDefault()
    enc.run({ algorithm, text, key_hex: keyHex, ...(effMode ? { mode: effMode } : {}) })
  }
  function doRoundtrip() {
    rt.run({ algorithm, text, key_hex: keyHex, ...(effMode ? { mode: effMode } : {}) })
  }
  function doDecrypt(e) {
    e.preventDefault()
    decr.run({
      algorithm,
      key_hex: keyHex,
      ciphertext_hex: dec.ciphertext_hex,
      ...(effMode ? { mode: effMode } : {}),
      ...(dec.iv_hex ? { iv_hex: dec.iv_hex } : {}),
      ...(dec.nonce_hex ? { nonce_hex: dec.nonce_hex } : {}),
    })
  }
  function useEncResult() {
    const d = enc.data
    if (!d) return
    setDec({
      ciphertext_hex: d.ciphertext_hex || '',
      iv_hex: d.iv_hex || '',
      nonce_hex: d.nonce_hex || '',
    })
  }

  return (
    <div className="panel">
      <h2>DES / AES-256 / RC4</h2>
      <Explainer>
        Real block and stream ciphers through one facade — see how key length, mode, and the IV or
        nonce all have to line up for a clean round-trip.
      </Explainer>

      <Card title="Configuration">
        <div className="row">
          <Field label="Algorithm">
            <Select
              options={ALGOS}
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
            />
          </Field>
          <Field label="Mode" hint={isStream ? 'RC4 is a stream cipher — no mode' : undefined}>
            <Select
              options={MODES}
              value={mode}
              disabled={isStream}
              onChange={(e) => setMode(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Text">
          <TextInput value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <Field label={KEY_LABEL[algorithm]} error={hint}>
          <TextInput value={keyHex} onChange={(e) => setKey(e.target.value)} />
        </Field>
        <div className="row">
          <Button onClick={doEncrypt} loading={enc.loading}>
            Encrypt
          </Button>
          <Button onClick={doRoundtrip} loading={rt.loading}>
            Round-trip
          </Button>
        </div>
      </Card>

      <Card title="Encrypt result">
        <ErrorText error={enc.error} />
        {enc.data ? (
          <div className="result">
            <p>
              {enc.data.algorithm} / {enc.data.mode || 'stream'}
            </p>
            <p>
              Ciphertext hex:
              <br />
              <Mono block>{chunkHex(enc.data.ciphertext_hex).join('\n')}</Mono>
            </p>
            {enc.data.iv_hex && (
              <p>
                iv_hex: <Mono>{enc.data.iv_hex}</Mono>
              </p>
            )}
            {enc.data.nonce_hex && (
              <p>
                nonce_hex: <Mono>{enc.data.nonce_hex}</Mono>
              </p>
            )}
            <Button type="button" onClick={useEncResult}>
              Use these in Decrypt ↓
            </Button>
          </div>
        ) : (
          <p className="muted">Run Encrypt to populate this.</p>
        )}
      </Card>

      <Card title="Round-trip check">
        <ErrorText error={rt.error} />
        {rt.data && (
          <div className="result">
            <p>
              Ciphertext hex: <Mono>{rt.data.ciphertext_hex}</Mono>
            </p>
            <p>
              Recovered: <Mono>{rt.data.recovered_plaintext}</Mono>
            </p>
            <p className={rt.data.match ? 'ok-text' : 'error-text'}>
              {rt.data.match ? '✓ match' : '✗ mismatch'}
            </p>
          </div>
        )}
      </Card>

      <Card title="Decrypt">
        <form onSubmit={doDecrypt}>
          <Field label="Ciphertext hex">
            <TextInput
              value={dec.ciphertext_hex}
              onChange={(e) => setDec((d) => ({ ...d, ciphertext_hex: e.target.value }))}
            />
          </Field>
          {!isStream && mode !== 'ECB' && mode !== 'CTR' && (
            <Field label="iv_hex (CBC/CFB/OFB)">
              <TextInput
                value={dec.iv_hex}
                onChange={(e) => setDec((d) => ({ ...d, iv_hex: e.target.value }))}
              />
            </Field>
          )}
          {!isStream && mode === 'CTR' && (
            <Field label="nonce_hex (CTR)">
              <TextInput
                value={dec.nonce_hex}
                onChange={(e) => setDec((d) => ({ ...d, nonce_hex: e.target.value }))}
              />
            </Field>
          )}
          <Button type="submit" loading={decr.loading}>
            Decrypt
          </Button>
        </form>
        <ErrorText error={decr.error} />
        {decr.data && (
          <div className="result">
            <p>
              Plaintext: <Mono>{decr.data.plaintext}</Mono>
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
