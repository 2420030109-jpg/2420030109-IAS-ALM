import { formatBits, isBitList } from '../lib/bits.js'

// The S-DES endpoints return the trace as a plain object, and Flask serialises
// object keys alphabetically - so we CANNOT trust key order. We impose the real
// data-path order here: key schedule, then IP -> round 1 -> SW -> round 2 ->
// IP-1, with each round's internals in execution order and indented underneath.
// Every key still prints its raw backend name; anything unrecognised falls
// through to the end in its original order - an unexpected key must never crash.

const HUMAN = {
  key_schedule: 'Key schedule',
  'P10(K)': 'Permuted key (P10)',
  'LS-1': 'Left shift 1 (LS-1)',
  K1: 'Subkey K1',
  'LS-2 (from LS-1)': 'Left shift 2 (LS-2)',
  'LS-2': 'Left shift 2 (LS-2)',
  K2: 'Subkey K2',

  IP: 'Initial permutation (IP)',
  SW: 'Swap halves (SW)',
  'IP_INV (ciphertext)': 'Inverse permutation (IP⁻¹) → ciphertext',
  'IP_INV (plaintext)': 'Inverse permutation (IP⁻¹) → plaintext',
  IP_INV: 'Inverse permutation (IP⁻¹)',

  'round1 (fK1)': 'Round 1 — fK1',
  'round1 (fK2)': 'Round 1 — fK2',
  'round2 (fK1)': 'Round 2 — fK1',
  'round2 (fK2)': 'Round 2 — fK2',

  'EP(right)': 'Expand right half (E/P)',
  'XOR with subkey': 'XOR with subkey',
  S0_out: 'S-box S0 output',
  S1_out: 'S-box S1 output',
  P4_out: 'Permutation P4',
  new_left: 'New left half',
  right_unchanged: 'Right half (unchanged)',
}

// Preferred execution order at each level. Keys are matched by prefix so
// "round1 (fK1)" / "round1 (fK2)" both sort as "round1".
const ORDER = [
  'key_schedule',
  'P10(K)',
  'LS-1',
  'K1',
  'LS-2',
  'K2',
  'IP_INV', // only ranked low so it can't jump ahead of IP; real IP_INV handled below
  'IP',
  'round1',
  'SW',
  'round2',
  'EP(right)',
  'XOR with subkey',
  'S0_out',
  'S1_out',
  'P4_out',
  'new_left',
  'right_unchanged',
]

function rank(key) {
  // IP-1 variants must come last on the data path, before genuinely unknown keys.
  if (key.startsWith('IP_INV')) return ORDER.length
  for (let i = 0; i < ORDER.length; i++) {
    if (key === ORDER[i] || key.startsWith(ORDER[i])) return i
  }
  return ORDER.length + 1
}

function orderedEntries(obj) {
  return Object.entries(obj)
    .map((e, i) => [e, i])
    .sort((a, b) => {
      const d = rank(a[0][0]) - rank(b[0][0])
      return d !== 0 ? d : a[1] - b[1]
    })
    .map(([e]) => e)
}

const groupHeadStyle = { color: 'var(--ink)', fontWeight: 600, marginBottom: 2 }
const rawStyle = { fontSize: '11px' }

function isGroup(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v) && !isBitList(v)
}

function bitsToInt(bits) {
  return bits.reduce((acc, b) => (acc << 1) | (b ? 1 : 0), 0)
}

function Bits({ bits }) {
  const groups = formatBits(bits, 4).split(' ')
  const showValue = bits.length === 8 || bits.length === 10
  return (
    <span className="trace-bits">
      {groups.map((g, i) => (
        <span className="bit-group" key={i}>
          {g}
        </span>
      ))}
      {showValue && <span className="muted">= {bitsToInt(bits)}</span>}
    </span>
  )
}

function Label({ name }) {
  const human = HUMAN[name]
  if (!human) return <span>{name}</span>
  return (
    <span>
      {human}{' '}
      <span className="muted" style={rawStyle}>
        {name}
      </span>
    </span>
  )
}

function Value({ value }) {
  if (isBitList(value)) return <Bits bits={value} />
  if (Array.isArray(value)) return <span className="trace-bits">[{value.join(', ')}]</span>
  return <span className="trace-scalar">{String(value)}</span>
}

export function TraceBlock({ data, nested = false }) {
  if (!data || typeof data !== 'object') return null
  const entries = Array.isArray(data)
    ? data.map((v, i) => [String(i), v])
    : orderedEntries(data)
  return (
    <div className={'trace-block' + (nested ? ' nested' : '')}>
      {entries.map(([k, v]) =>
        isGroup(v) ? (
          <div className="trace-row group" key={k}>
            <div className="trace-key" style={groupHeadStyle}>
              <Label name={k} />
            </div>
            <TraceBlock data={v} nested />
          </div>
        ) : (
          <div className="trace-row" key={k}>
            <span className="trace-key">
              <Label name={k} />
            </span>
            <Value value={v} />
          </div>
        ),
      )}
    </div>
  )
}

export default function TraceView({ trace }) {
  if (!trace || typeof trace !== 'object') return null
  return (
    <div className="trace-view">
      <TraceBlock data={trace} />
    </div>
  )
}
