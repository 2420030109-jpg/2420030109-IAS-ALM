import { useState } from 'react'
import { apiPost } from '../api/client.js'
import { useAsync } from '../lib/useAsync.js'
import { useAppState } from '../state/AppState.jsx'
import { chunkHex } from '../lib/bits.js'
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

function Verdict({ ok }) {
  return <span className={ok ? 'ok-text' : 'error-text'}>{ok ? '✓ recovered' : '✗ failed'}</span>
}

function BruteForceCard() {
  const { lastSdesCipherHex } = useAppState()
  const [manual, setManual] = useState('')
  const [knownByte, setKnownByte] = useState('72')
  const { data, error, loading, run } = useAsync((body) => apiPost('/attack/bruteforce', body))
  const ciphertextHex = manual || lastSdesCipherHex

  return (
    <Card title="Brute-force S-DES">
      <Explainer>
        Only 1024 keys — try them all against one known plaintext byte and read off the key.
      </Explainer>
      <Field
        label="Ciphertext hex"
        hint={lastSdesCipherHex ? `using S-DES panel output: ${lastSdesCipherHex}` : 'run S-DES first, or paste here'}
      >
        <TextInput
          value={manual}
          placeholder={lastSdesCipherHex}
          onChange={(e) => setManual(e.target.value)}
        />
      </Field>
      <Field label="Known first plaintext byte (e.g. 72 = 'H')">
        <NumberInput value={knownByte} onChange={(e) => setKnownByte(e.target.value)} />
      </Field>
      <Button
        loading={loading}
        disabled={!ciphertextHex}
        onClick={() =>
          run({ ciphertext_hex: ciphertextHex, known_first_plain_byte: parseInt(knownByte, 10) || 0 })
        }
      >
        Attack
      </Button>
      <ErrorText error={error} />
      {data && (
        <div className="result">
          <p>
            Recovered key: <Mono>{data.recovered_key ?? '—'}</Mono> · keys tried{' '}
            {data.keys_tried} · {Number(data.elapsed_seconds).toFixed(4)}s{' '}
            <Verdict ok={data.success} />
          </p>
        </div>
      )}
    </Card>
  )
}

function FrequencyCard() {
  const [ciphertext, setCiphertext] = useState('DWWDFNDWGDZQ')
  const { data, error, loading, run } = useAsync((body) => apiPost('/attack/frequency', body))
  return (
    <Card title="Frequency analysis (Caesar)">
      <Explainer>Chi-squared against English frequencies picks the shift with no key search.</Explainer>
      <Field label="Ciphertext">
        <TextInput value={ciphertext} onChange={(e) => setCiphertext(e.target.value)} />
      </Field>
      <Button loading={loading} onClick={() => run({ ciphertext })}>
        Attack
      </Button>
      <ErrorText error={error} />
      {data && (
        <div className="result">
          <p>
            Shift <Mono>{data.recovered_shift}</Mono> · {Number(data.elapsed_seconds).toFixed(4)}s{' '}
            <Verdict ok={data.success} />
          </p>
          <p>
            Plaintext: <Mono>{data.recovered_plaintext}</Mono>
          </p>
        </div>
      )}
    </Card>
  )
}

function KnownPlaintextCard() {
  const [ciphertextHex, setCiphertextHex] = useState('')
  const [knownPlaintext, setKnownPlaintext] = useState('')
  const { data, error, loading, run } = useAsync((body) =>
    apiPost('/attack/known-plaintext', body),
  )
  return (
    <Card title="Known-plaintext (stream / RC4)">
      <Explainer>
        keystream = ciphertext ⊕ known plaintext — recovering it lets you forge any message of the
        same length under a reused key.
      </Explainer>
      <Field label="Ciphertext hex">
        <TextInput value={ciphertextHex} onChange={(e) => setCiphertextHex(e.target.value)} />
      </Field>
      <Field label="Known plaintext">
        <TextInput value={knownPlaintext} onChange={(e) => setKnownPlaintext(e.target.value)} />
      </Field>
      <Button
        loading={loading}
        disabled={!ciphertextHex || !knownPlaintext}
        onClick={() => run({ ciphertext_hex: ciphertextHex, known_plaintext: knownPlaintext })}
      >
        Recover keystream
      </Button>
      <ErrorText error={error} />
      {data && (
        <div className="result">
          <p>
            Keystream hex: <Mono>{data.recovered_keystream_hex}</Mono>{' '}
            <Verdict ok={data.success} />
          </p>
          {data.note && <p className="warn-text">{data.note}</p>}
        </div>
      )}
    </Card>
  )
}

function EcbLeakageCard() {
  const [blockRepeats, setBlockRepeats] = useState('8')
  const [patternByte, setPatternByte] = useState('65')
  const { data, error, loading, run } = useAsync((body) => apiPost('/attack/ecb-leakage', body))
  return (
    <Card title="ECB leakage">
      <Explainer>
        Encrypt a flat, repeating buffer under ECB vs CTR and count how many 16-byte ciphertext
        blocks repeat.
      </Explainer>
      <div className="row">
        <Field label="Block repeats">
          <NumberInput value={blockRepeats} onChange={(e) => setBlockRepeats(e.target.value)} />
        </Field>
        <Field label="Pattern byte">
          <NumberInput value={patternByte} onChange={(e) => setPatternByte(e.target.value)} />
        </Field>
      </div>
      <Button
        loading={loading}
        onClick={() =>
          run({
            block_repeats: parseInt(blockRepeats, 10) || 1,
            pattern_byte: parseInt(patternByte, 10) || 0,
          })
        }
      >
        Run
      </Button>
      <ErrorText error={error} />
      {data && (
        <div className="result">
          <p>
            ECB repeated blocks: <strong>{data.ecb_repeated_blocks}</strong> · CTR repeated blocks:{' '}
            <strong>{data.ctr_repeated_blocks}</strong> <Verdict ok={data.success} />
          </p>
          <p>
            ECB preview:
            <br />
            <Mono block>{chunkHex(data.ecb_ciphertext_hex_preview || '').join('\n')}</Mono>
          </p>
          <p>
            CTR preview:
            <br />
            <Mono block>{chunkHex(data.ctr_ciphertext_hex_preview || '').join('\n')}</Mono>
          </p>
          {data.note && <p className="muted">{data.note}</p>}
        </div>
      )}
    </Card>
  )
}

export default function AttackPanel() {
  return (
    <div className="panel">
      <h2>Attack Simulator</h2>
      <Explainer>
        Four classic breaks — small keyspace, letter frequency, keystream reuse, and mode
        misuse — run against the platform's own ciphers.
      </Explainer>
      <BruteForceCard />
      <FrequencyCard />
      <KnownPlaintextCard />
      <EcbLeakageCard />
    </div>
  )
}
