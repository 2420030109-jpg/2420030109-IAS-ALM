import { formatBits, isBitList } from '../lib/bits.js'

// The S-DES endpoint returns an ordered dict of steps. Keys/labels are the
// backend's; we render whatever it sends: bit lists become monospace 0/1
// groups, nested objects become an indented sub-block, scalars print as text.

function Value({ value }) {
  if (isBitList(value)) {
    return <span className="trace-bits">{formatBits(value)}</span>
  }
  if (Array.isArray(value)) {
    return <span className="trace-bits">[{value.join(', ')}]</span>
  }
  if (value && typeof value === 'object') {
    return <TraceBlock data={value} nested />
  }
  return <span className="trace-scalar">{String(value)}</span>
}

export function TraceBlock({ data, nested = false }) {
  if (!data || typeof data !== 'object') return null
  const entries = Array.isArray(data)
    ? data.map((v, i) => [String(i), v])
    : Object.entries(data)
  return (
    <div className={'trace-block' + (nested ? ' nested' : '')}>
      {entries.map(([k, v]) => {
        const isGroup = v && typeof v === 'object' && !isBitList(v) && !Array.isArray(v)
        return (
          <div className={'trace-row' + (isGroup ? ' group' : '')} key={k}>
            <span className="trace-key">{k}</span>
            <Value value={v} />
          </div>
        )
      })}
    </div>
  )
}

export default function TraceView({ trace }) {
  if (!trace) return null
  return (
    <div className="trace-view">
      <TraceBlock data={trace} />
    </div>
  )
}
