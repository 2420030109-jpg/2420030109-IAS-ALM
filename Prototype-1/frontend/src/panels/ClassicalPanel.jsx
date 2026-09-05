import { useState } from 'react'
import { apiPost } from '../api/client.js'
import { useAsync } from '../lib/useAsync.js'
import {
  Button,
  Card,
  Explainer,
  Field,
  TextInput,
  NumberInput,
  ErrorText,
  ActionToggle,
  Mono,
} from '../components/ui.jsx'
import FreqChart from '../components/FreqChart.jsx'

export function CaesarBox() {
  const [text, setText] = useState('ATTACKATDAWN')
  const [shift, setShift] = useState('3')
  const [action, setAction] = useState('encrypt')
  const { data, error, loading, run } = useAsync((body) => apiPost('/classical/caesar', body))

  function submit(e) {
    e.preventDefault()
    run({ text, shift: parseInt(shift, 10) || 0, action })
  }

  return (
    <Card title="Caesar">
      <form onSubmit={submit}>
        <Field label="Text">
          <TextInput value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <div className="row">
          <Field label="Shift">
            <NumberInput value={shift} onChange={(e) => setShift(e.target.value)} />
          </Field>
          <Field label="Action">
            <ActionToggle value={action} onChange={setAction} />
          </Field>
        </div>
        <Button type="submit" loading={loading}>
          {action === 'encrypt' ? 'Encrypt' : 'Decrypt'}
        </Button>
      </form>
      <ErrorText error={error} />
      {data && (
        <div className="result">
          <p>
            Output: <Mono>{data.output}</Mono>
          </p>
          <FreqChart input={data.input_frequency} output={data.output_frequency} />
        </div>
      )}
    </Card>
  )
}

function CaesarAttackBox() {
  const [ciphertext, setCiphertext] = useState('DWWDFNDWGDZQ')
  const { data, error, loading, run } = useAsync((body) =>
    apiPost('/classical/caesar/attack', body),
  )

  const best = data
    ? data.candidates.reduce(
        (m, c) => (c.chi_squared < m.chi_squared ? c : m),
        data.candidates[0],
      )
    : null

  return (
    <Card title="Frequency attack (break Caesar)">
      <Explainer>
        Score every one of the 26 shifts by chi-squared against English letter frequencies; the
        lowest score is the plaintext.
      </Explainer>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run({ ciphertext })
        }}
      >
        <Field label="Ciphertext">
          <TextInput value={ciphertext} onChange={(e) => setCiphertext(e.target.value)} />
        </Field>
        <Button type="submit" loading={loading}>
          Attack
        </Button>
      </form>
      <ErrorText error={error} />
      {data && (
        <div className="result">
          <p>
            Recovered shift <Mono>{data.recovered_shift}</Mono> in{' '}
            {Number(data.elapsed_seconds).toFixed(4)}s
          </p>
          <p>
            Plaintext: <Mono>{data.recovered_plaintext}</Mono>
          </p>
          <div className="scroll-table">
            <table>
              <thead>
                <tr>
                  <th>shift</th>
                  <th>candidate</th>
                  <th>chi²</th>
                </tr>
              </thead>
              <tbody>
                {data.candidates.map((c) => (
                  <tr
                    key={c.shift}
                    className={
                      c.shift === (best?.shift ?? data.recovered_shift) ? 'row-best' : undefined
                    }
                  >
                    <td>{c.shift}</td>
                    <td className="mono">{c.candidate}</td>
                    <td>{Number(c.chi_squared).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  )
}

function PlayfairBox() {
  const [text, setText] = useState('HELLOWORLD')
  const [key, setKey] = useState('MONARCHY')
  const [action, setAction] = useState('encrypt')
  const { data, error, loading, run } = useAsync((body) => apiPost('/classical/playfair', body))

  return (
    <Card title="Playfair">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run({ text, key, action })
        }}
      >
        <Field label="Text">
          <TextInput value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <div className="row">
          <Field label="Key">
            <TextInput value={key} onChange={(e) => setKey(e.target.value)} />
          </Field>
          <Field label="Action">
            <ActionToggle value={action} onChange={setAction} />
          </Field>
        </div>
        <Button type="submit" loading={loading}>
          {action === 'encrypt' ? 'Encrypt' : 'Decrypt'}
        </Button>
      </form>
      <ErrorText error={error} />
      {data && (
        <div className="result">
          <p>
            Output: <Mono>{data.output}</Mono>
          </p>
          <div className="playfair-grid">
            {(data.key_square || []).map((row, r) => (
              <div className="playfair-row" key={r}>
                {row.split('').map((ch, c) => (
                  <span className="playfair-cell" key={c}>
                    {ch}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <p className="digraphs">
            Digraphs:{' '}
            {(data.digraphs || []).map((d, i) => (
              <Mono key={i}>{Array.isArray(d) ? d.join('') : d}</Mono>
            ))}
          </p>
        </div>
      )}
    </Card>
  )
}

export default function ClassicalPanel() {
  return (
    <div className="panel">
      <h2>Classical Lab</h2>
      <Explainer>
        Substitution ciphers and why letter-frequency structure survives them — enough to break
        Caesar by hand.
      </Explainer>
      <CaesarBox />
      <CaesarAttackBox />
      <PlayfairBox />
    </div>
  )
}
