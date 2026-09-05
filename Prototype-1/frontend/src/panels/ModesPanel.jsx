import { useEffect, useState } from 'react'
import { apiPost } from '../api/client.js'
import { useAsync } from '../lib/useAsync.js'
import { chunkHex } from '../lib/bits.js'
import { isValidHex, hexByteLength } from '../lib/hex.js'
import {
  Banner,
  Button,
  Card,
  CopyButton,
  EmptyState,
  ErrorText,
  Field,
  PanelHead,
  Pill,
  Stat,
  Stats,
  TextInput,
  Workspace,
} from '../components/ui.jsx'

const MODES = ['ECB', 'CBC', 'CFB', 'OFB', 'CTR']

// Exactly 16 bytes, repeated -> four identical AES blocks, so ECB's codebook
// behaviour is visible the moment the panel loads.
const BLOCK = 'ATTACK AT DAWN!!'
const DEFAULT_TEXT = BLOCK.repeat(4)
const DEFAULT_KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'

/** Set of block strings that occur more than once. */
function dupSet(blocks) {
  const seen = new Map()
  blocks.forEach((b) => seen.set(b, (seen.get(b) || 0) + 1))
  return new Set([...seen.entries()].filter(([, count]) => count > 1).map(([b]) => b))
}

export default function ModesPanel() {
  const [text, setText] = useState(DEFAULT_TEXT)
  const [keyHex, setKeyHex] = useState(DEFAULT_KEY)
  const { data, error, loading, run } = useAsync((body) => apiPost('/modes/compare', body))

  // Land on a worked example rather than a blank form. Fires exactly once.
  useEffect(() => {
    run({ algorithm: 'aes256', text: DEFAULT_TEXT, key_hex: DEFAULT_KEY })
  }, [run])

  const keyBytes = hexByteLength(keyHex)
  const keyError =
    keyHex && (!isValidHex(keyHex) || keyBytes !== 32)
      ? `Needs 64 hex characters (32 bytes) — got ${keyHex.length}`
      : null
  const canRun = !keyError && keyHex.length > 0 && text.length > 0

  function submit(e) {
    e.preventDefault()
    if (!canRun) return
    run({ algorithm: 'aes256', text, key_hex: keyHex })
  }

  const analysis = data?.analysis
  const ecbRepeats = analysis?.ecb_repeated_blocks ?? 0

  return (
    <div className="panel">
      <PanelHead title="Block Modes">
        One AES-256 key, five modes, the same plaintext. ECB encrypts every 16-byte block on its
        own — so repeated plaintext blocks come out as repeated ciphertext blocks, highlighted
        below. The other four modes destroy that structure.
      </PanelHead>

      <Workspace wide>
        <Card title="Input" sub="AES-256">
          <form onSubmit={submit}>
            <div className="row">
              <div style={{ flex: 3, minWidth: 260 }}>
                <Field label="Plaintext" hint="Repeat a 16-byte phrase to make the ECB leak obvious">
                  <TextInput value={text} onChange={(e) => setText(e.target.value)} />
                </Field>
              </div>
              <div style={{ flex: 2, minWidth: 260 }}>
                <Field
                  label="Key"
                  hint="64 hex characters"
                  error={keyError}
                  aside={<CopyButton value={keyHex} />}
                >
                  <TextInput
                    mono
                    invalid={!!keyError}
                    value={keyHex}
                    onChange={(e) => setKeyHex(e.target.value)}
                  />
                </Field>
              </div>
              <div style={{ flex: 'none', alignSelf: 'flex-end', paddingBottom: 2 }}>
                <Button type="submit" loading={loading} disabled={!canRun}>
                  Run
                </Button>
              </div>
            </div>
          </form>
          <ErrorText error={error} />
        </Card>

        {!data && !error && (
          <Card title="Ciphertext by mode">
            <EmptyState icon="⟳">
              {loading ? 'Encrypting under all five modes…' : 'Press Run to compare the five modes.'}
            </EmptyState>
          </Card>
        )}

        {data && (
          <Card
            title="Ciphertext by mode"
            sub="one box = one 16-byte block"
            actions={<Pill>{data.results?.ECB?.total_blocks ?? 0} blocks each</Pill>}
          >
            <Stats>
              <Stat
                label="ECB repeated blocks"
                value={ecbRepeats}
                tone={ecbRepeats > 0 ? 'bad' : 'good'}
              />
              <Stat label="CBC / CFB / OFB / CTR repeats" value={0} tone="good" />
              <Stat label="Total blocks" value={analysis?.total_blocks ?? 0} />
            </Stats>

            <div style={{ marginTop: 14 }}>
              <Banner kind="warn">
                ECB is a pure codebook: block <em>i</em> of the ciphertext depends only on block{' '}
                <em>i</em> of the plaintext, so identical plaintext blocks always produce identical
                ciphertext blocks. CBC/CFB/OFB/CTR mix in an IV or counter, so no two output blocks
                match even when the input repeats.
              </Banner>
            </div>

            <div className="modes-grid">
              {MODES.map((m) => {
                const res = data.results?.[m]
                const hex = res?.ciphertext_hex || ''
                const blocks = chunkHex(hex, 32)
                const dups = m === 'ECB' ? dupSet(blocks) : new Set()
                const repeats = res?.repeated_blocks ?? 0
                const seed = res?.iv_hex || res?.nonce_hex
                return (
                  <div className="modes-col" key={m}>
                    <div className="modes-col-head">
                      <h4>{m}</h4>
                      <span className={repeats > 0 ? 'error-text' : 'ok-text'} title="repeated blocks">
                        {repeats > 0 ? `${repeats} repeat${repeats === 1 ? '' : 's'}` : '0 repeats'}
                      </span>
                    </div>
                    <p
                      className="card-note"
                      style={{ margin: '0 0 6px', fontSize: 10.5 }}
                      title={seed ? `${res.iv_hex ? 'IV' : 'nonce'} ${seed}` : undefined}
                    >
                      {seed
                        ? `${res.iv_hex ? 'IV' : 'nonce'} ${seed.slice(0, 12)}…`
                        : 'no IV — deterministic'}
                    </p>
                    {blocks.map((b, i) => (
                      <div
                        key={i}
                        className={'mode-block' + (dups.has(b) ? ' dup' : '')}
                        title={dups.has(b) ? 'this block appears more than once' : `block ${i + 1}`}
                      >
                        {b}
                      </div>
                    ))}
                    <div style={{ marginTop: 6 }}>
                      <CopyButton value={hex} label="Copy hex" />
                    </div>
                  </div>
                )
              })}
            </div>

            {analysis?.note && (
              <p className="card-note" style={{ margin: '12px 0 0' }}>
                {analysis.note}
              </p>
            )}
          </Card>
        )}
      </Workspace>
    </div>
  )
}
