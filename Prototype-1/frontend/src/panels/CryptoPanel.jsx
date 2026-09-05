import { useEffect, useMemo, useState } from 'react'
import { apiPost } from '../api/client.js'
import { useAsync } from '../lib/useAsync.js'
import { hexByteLength } from '../lib/hex.js'
import { chunkHex } from '../lib/bits.js'
import {
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorText,
  Field,
  Mono,
  Note,
  OutRow,
  PanelHead,
  Pill,
  Select,
  Stat,
  Stats,
  TextInput,
  Verdict,
  Workspace,
} from '../components/ui.jsx'

const ALGOS = [
  { value: 'des', label: 'DES' },
  { value: 'aes256', label: 'AES-256' },
  { value: 'rc4', label: 'RC4' },
]
const MODES = ['ECB', 'CBC', 'CFB', 'OFB', 'CTR']
const ALGO_LABEL = { des: 'DES', aes256: 'AES-256', rc4: 'RC4' }

const KEY_SPEC = {
  des: { bytes: 8, hint: 'hex · 16 chars · 8 bytes' },
  aes256: { bytes: 32, hint: 'hex · 64 chars · 32 bytes' },
  rc4: { bytes: null, hint: 'text · any length' },
}

const DEFAULT_KEY = {
  des: '0011223344556677',
  aes256: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
  rc4: 'secretkey',
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function randomBytes(n) {
  const buf = new Uint8Array(n)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(buf)
  else for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256)
  return buf
}

function randomKey(algorithm) {
  if (algorithm === 'rc4') {
    return Array.from(randomBytes(16), (b) => ALPHABET[b % ALPHABET.length]).join('')
  }
  const n = KEY_SPEC[algorithm].bytes
  return Array.from(randomBytes(n), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** null when the key is usable, otherwise a human message. */
function keyError(algorithm, value) {
  if (!value) return 'required'
  if (algorithm === 'rc4') return null
  const bytes = hexByteLength(value)
  if (bytes === null) return 'not valid hex — 0-9 and a-f only, in pairs'
  const need = KEY_SPEC[algorithm].bytes
  if (bytes !== need) return `${bytes} bytes — ${ALGO_LABEL[algorithm]} needs exactly ${need}`
  return null
}

function keyCount(algorithm, value) {
  if (algorithm === 'rc4') return `${value.length} chars`
  const bytes = hexByteLength(value)
  return bytes === null ? 'invalid hex' : `${bytes} / ${KEY_SPEC[algorithm].bytes} bytes`
}

function needsIv(algorithm, mode) {
  return algorithm !== 'rc4' && (mode === 'CBC' || mode === 'CFB' || mode === 'OFB')
}
function needsNonce(algorithm, mode) {
  return algorithm !== 'rc4' && mode === 'CTR'
}

export default function CryptoPanel() {
  const [algorithm, setAlgorithm] = useState('aes256')
  const [mode, setMode] = useState('CBC')
  const [text, setText] = useState('Attack at dawn!')
  const [keys, setKeys] = useState(DEFAULT_KEY)
  const [dec, setDec] = useState({ ciphertext_hex: '', iv_hex: '', nonce_hex: '' })
  const [carriedFrom, setCarriedFrom] = useState(null)
  const [last, setLast] = useState('encrypt')

  const keyHex = keys[algorithm]
  const isStream = algorithm === 'rc4'
  const effMode = isStream ? undefined : mode
  const kerr = useMemo(() => keyError(algorithm, keyHex), [algorithm, keyHex])
  const configLabel = `${ALGO_LABEL[algorithm]} · ${isStream ? 'stream' : mode}`

  const enc = useAsync(async (body) => {
    const d = await apiPost('/crypto/encrypt', body)
    // No "use these in decrypt" dance: the ciphertext and IV land in the
    // decrypt fields the moment they exist. They stay editable.
    setDec({
      ciphertext_hex: d.ciphertext_hex || '',
      iv_hex: d.iv_hex || '',
      nonce_hex: d.nonce_hex || '',
    })
    setCarriedFrom(`${ALGO_LABEL[d.algorithm] || d.algorithm} · ${d.mode || 'stream'}`)
    setLast('encrypt')
    return d
  })
  const decr = useAsync(async (body) => {
    const d = await apiPost('/crypto/decrypt', body)
    setLast('decrypt')
    return d
  })
  const rt = useAsync(async (body) => {
    const d = await apiPost('/crypto/roundtrip', body)
    setLast('roundtrip')
    return d
  })

  // Arrive on a finished example rather than a blank form. `run` is stable.
  const encRun = enc.run
  useEffect(() => {
    encRun({
      algorithm: 'aes256',
      text: 'Attack at dawn!',
      key_hex: DEFAULT_KEY.aes256,
      mode: 'CBC',
    })
  }, [encRun])

  function setKey(v) {
    setKeys((k) => ({ ...k, [algorithm]: v }))
  }

  function doEncrypt(e) {
    e?.preventDefault()
    if (kerr) return
    enc.run({ algorithm, text, key_hex: keyHex, ...(effMode ? { mode: effMode } : {}) })
  }
  function doDecrypt() {
    if (kerr) return
    decr.run({
      algorithm,
      key_hex: keyHex,
      ciphertext_hex: dec.ciphertext_hex,
      ...(effMode ? { mode: effMode } : {}),
      ...(needsIv(algorithm, mode) && dec.iv_hex ? { iv_hex: dec.iv_hex } : {}),
      ...(needsNonce(algorithm, mode) && dec.nonce_hex ? { nonce_hex: dec.nonce_hex } : {}),
    })
  }
  function doRoundtrip() {
    if (kerr) return
    rt.run({ algorithm, text, key_hex: keyHex, ...(effMode ? { mode: effMode } : {}) })
  }

  const busy = enc.loading || decr.loading || rt.loading
  const stale = carriedFrom && carriedFrom !== configLabel

  const controls = (
    <>
      <Card title="Configuration">
        <form onSubmit={doEncrypt}>
          <div className="row">
            <Field label="Algorithm">
              <Select
                options={ALGOS}
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
              />
            </Field>
            <Field
              label="Mode"
              hint={isStream ? 'RC4 is a stream cipher — no mode' : 'block chaining mode'}
            >
              <Select
                options={MODES}
                value={isStream ? 'ECB' : mode}
                disabled={isStream}
                onChange={(e) => setMode(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Text">
            <TextInput value={text} onChange={(e) => setText(e.target.value)} />
          </Field>

          <Field
            label="Key"
            hint={KEY_SPEC[algorithm].hint}
            error={kerr}
            aside={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className={kerr ? 'error-text' : 'muted'}>{keyCount(algorithm, keyHex)}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setKey(randomKey(algorithm))}
                >
                  Randomise
                </Button>
              </span>
            }
          >
            <TextInput
              mono
              invalid={!!kerr}
              value={keyHex}
              onChange={(e) => setKey(e.target.value)}
            />
          </Field>

          <div className="actions">
            <Button type="submit" loading={enc.loading} disabled={!!kerr || busy}>
              Encrypt
            </Button>
            <Button
              type="button"
              variant="secondary"
              loading={decr.loading}
              disabled={!!kerr || busy || !dec.ciphertext_hex}
              onClick={doDecrypt}
            >
              Decrypt
            </Button>
            <Button
              type="button"
              variant="secondary"
              loading={rt.loading}
              disabled={!!kerr || busy}
              onClick={doRoundtrip}
            >
              Round-trip
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Decrypt input" sub="filled in for you">
        <Note>
          Whatever you encrypt lands here automatically — press Decrypt and it just works. Paste
          your own ciphertext to override it.
        </Note>
        <Field label="Ciphertext" hint="hex">
          <TextInput
            mono
            value={dec.ciphertext_hex}
            onChange={(e) => setDec((d) => ({ ...d, ciphertext_hex: e.target.value }))}
          />
        </Field>
        {needsIv(algorithm, mode) && (
          <Field label="IV" hint={`required for ${mode} — hex`}>
            <TextInput
              mono
              value={dec.iv_hex}
              onChange={(e) => setDec((d) => ({ ...d, iv_hex: e.target.value }))}
            />
          </Field>
        )}
        {needsNonce(algorithm, mode) && (
          <Field label="Nonce" hint="required for CTR — hex">
            <TextInput
              mono
              value={dec.nonce_hex}
              onChange={(e) => setDec((d) => ({ ...d, nonce_hex: e.target.value }))}
            />
          </Field>
        )}
        {stale && (
          <Banner kind="warn">
            These came from {carriedFrom}. Decrypting them as {configLabel} will return garbage —
            re-encrypt first.
          </Banner>
        )}
      </Card>
    </>
  )

  return (
    <div className="panel">
      <PanelHead title="DES / AES-256 / RC4">
        One facade over three real ciphers and five block modes — key length, mode, and the IV or
        nonce all have to line up before a round-trip comes back clean.
      </PanelHead>

      <Workspace controls={controls}>
        {last === 'encrypt' && (
          <Card title="Encrypt" actions={enc.data ? <Pill>{configLabel}</Pill> : null}>
            <ErrorText error={enc.error} />
            {!enc.data && !enc.error && (
              <EmptyState>Press Encrypt to produce a ciphertext.</EmptyState>
            )}
            {enc.data && <EncryptResult data={enc.data} />}
          </Card>
        )}

        {last === 'decrypt' && (
          <Card title="Decrypt" actions={<Pill>{configLabel}</Pill>}>
            <ErrorText error={decr.error} />
            {!decr.data && !decr.error && (
              <EmptyState>Press Decrypt to recover the plaintext.</EmptyState>
            )}
            {decr.data && (
              <>
                <OutRow label="Plaintext" copy={decr.data.plaintext}>
                  <span className="big-out">{decr.data.plaintext}</span>
                </OutRow>
                <div style={{ marginTop: 12 }}>
                  <Stats>
                    <Stat label="Algorithm" value={ALGO_LABEL[decr.data.algorithm] || decr.data.algorithm} />
                    <Stat label="Mode" value={decr.data.mode || 'stream'} />
                    <Stat label="Characters" value={(decr.data.plaintext || '').length} />
                  </Stats>
                </div>
              </>
            )}
          </Card>
        )}

        {last === 'roundtrip' && (
          <Card title="Round-trip" actions={<Pill>{configLabel}</Pill>}>
            <ErrorText error={rt.error} />
            {!rt.data && !rt.error && (
              <EmptyState>Press Round-trip to encrypt and decrypt in one shot.</EmptyState>
            )}
            {rt.data && (
              <>
                <Verdict pass={rt.data.match}>
                  {rt.data.match
                    ? 'Round-trip verified — Dk(Ek(m)) == m'
                    : 'Round-trip failed — the recovered plaintext differs'}
                </Verdict>
                <div style={{ marginTop: 12 }}>
                  <OutRow label="Ciphertext" copy={rt.data.ciphertext_hex}>
                    <Mono block>{chunkHex(rt.data.ciphertext_hex).join('\n')}</Mono>
                  </OutRow>
                  <OutRow label="Recovered" copy={rt.data.recovered_plaintext}>
                    <span className="big-out">{rt.data.recovered_plaintext}</span>
                  </OutRow>
                </div>
              </>
            )}
          </Card>
        )}

        <Card title="What just happened" sub="the moving parts">
          <Note>
            {isStream
              ? 'RC4 generates a keystream from the key alone and XORs it into the plaintext — there is no block, no padding and no IV, which is exactly why reusing a key is fatal.'
              : `${ALGO_LABEL[algorithm]} encrypts ${algorithm === 'des' ? 8 : 16}-byte blocks. ${
                  mode === 'ECB'
                    ? 'ECB encrypts each block independently, so identical plaintext blocks give identical ciphertext blocks — see the Block Modes panel.'
                    : mode === 'CTR'
                      ? 'CTR turns the block cipher into a stream cipher by encrypting a nonce plus a counter; the nonce must never repeat under one key.'
                      : `${mode} chains each block against the previous one through a random IV, so the same plaintext encrypts differently every run.`
                }`}
          </Note>
          <OutRow label="Key" copy={keyHex || undefined}>
            <Mono>{keyHex || '—'}</Mono>
          </OutRow>
        </Card>
      </Workspace>
    </div>
  )
}

function EncryptResult({ data }) {
  const iv = data.iv_hex
  const nonce = data.nonce_hex
  return (
    <>
      <OutRow label="Ciphertext" copy={data.ciphertext_hex}>
        <Mono block>{chunkHex(data.ciphertext_hex).join('\n')}</Mono>
      </OutRow>
      {iv && (
        <OutRow label="IV" copy={iv}>
          <Mono>{iv}</Mono>
        </OutRow>
      )}
      {nonce && (
        <OutRow label="Nonce" copy={nonce}>
          <Mono>{nonce}</Mono>
        </OutRow>
      )}
      <div style={{ marginTop: 12 }}>
        <Stats>
          <Stat label="Algorithm" value={ALGO_LABEL[data.algorithm] || data.algorithm} />
          <Stat label="Mode" value={data.mode || 'stream'} />
          <Stat label="Ciphertext" value={`${(data.ciphertext_hex || '').length / 2} B`} />
        </Stats>
      </div>
      <div style={{ marginTop: 12 }}>
        <Banner kind="info">
          Ciphertext{iv ? ' and IV' : nonce ? ' and nonce' : ''} carried over to the decrypt
          fields — press Decrypt to get the plaintext back.
        </Banner>
      </div>
    </>
  )
}
