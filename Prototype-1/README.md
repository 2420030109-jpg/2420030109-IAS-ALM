# CryptoShield

An interactive platform for cryptography and information assurance — a Flask
REST backend implementing the ciphers by hand, and a React + Vite console that
drives every one of them.

Covers every module from the report:

- **CryptoEngine** facade (`backend/crypto_engine.py`) — one uniform
  encrypt/decrypt/round-trip interface over S-DES (`backend/sdes.py`,
  hand-written with a full round trace), DES and AES-256 (PyCryptodome supplies
  the raw block primitive; the mode logic is ours), and RC4 (`backend/rc4.py`,
  hand-written KSA/PRGA).
- **Block cipher modes** (`backend/modes.py`) — ECB/CBC/CFB/OFB/CTR implemented
  manually on top of a raw block-encrypt function.
- **PRNG Engine** (`backend/prng_engine.py`) — LCG, Blum Blum Shub, ANSI X9.17.
- **Attack Simulator** (`backend/attack_simulator.py`) — brute force on S-DES,
  chi-squared frequency analysis on Caesar, known-plaintext keystream recovery,
  ECB pattern-leakage demo.
- **Auth + persistence** (`backend/database.py`) — PostgreSQL (Neon) or SQLite,
  hashed passwords, every run logged with algorithm/params/result/timing.
- **REST API** (`backend/app.py`) — one response envelope
  `{success, message, data}` / `{success:false, error:{code,message}}` across
  every endpoint, with validation on every input.
- **Console** (`frontend/`) — a React + Vite single-page app, one panel per
  module, every button making a real API call.

## 1. Install prerequisites (one time)

1. **Python 3.10+** from [python.org](https://python.org). On Windows, tick
   "Add Python to PATH" during install.
2. **Node.js 18+** from [nodejs.org](https://nodejs.org).
3. Open this `Prototype-1` folder in VS Code (`File > Open Folder`).

## 2. Configure the backend

```bash
cd backend
cp .env.example .env      # Windows: copy .env.example .env
```

Then edit `.env`:

- `DATABASE_URL` — your Postgres connection string (e.g. a Neon database).
  **Leave it unset and the app falls back to a local SQLite file**, no setup
  needed.
- `SECRET_KEY` — Flask session signing key.
- `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` — a demo login created on
  startup so the console is usable immediately. Remove both to disable.

`.env` is gitignored — never commit it.

## 3. Run the backend

```bash
cd backend
python -m venv venv

source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows

pip install -r requirements.txt
python app.py
```

Flask starts on `http://127.0.0.1:5000`. Leave this terminal running.

## 4. Run the frontend

In a **second** terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to Flask on
port 5000, so the session cookie is same-origin and CORS never comes into play.

## 5. Use it

Log in with the seeded demo account (or register your own), then walk the tabs:
Classical Lab → S-DES → DES/AES/RC4 → Block Modes → PRNG → Attack Simulator →
Run History. Every call you make is logged and shows up under Run History.

## Running the tests

Backend (37 tests — round-trip correctness, attacks, auth, validation):

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest -q
```

The suite points `CRYPTOSHIELD_DB` at a throw-away SQLite file per test, so it
never touches your real database — even when `DATABASE_URL` is set.

Frontend (20 tests — API client, hex helpers, auth gate, panels):

```bash
cd frontend
npm run test
npm run build
```

## Project layout

```
Prototype-1/
  backend/
    app.py               REST API, auth, validation, response envelope
    crypto_engine.py     facade: encrypt / decrypt / roundtrip
    sdes.py              hand-written S-DES with full step trace
    rc4.py               hand-written RC4 KSA/PRGA
    classical.py         Caesar + Playfair + frequency attack
    modes.py             ECB/CBC/CFB/OFB/CTR on a raw block-encrypt fn
    prng_engine.py       LCG, BBS, ANSI X9.17
    attack_simulator.py  brute force / frequency / known-plaintext / ECB leak
    database.py          Postgres or SQLite: users + run history
    requirements.txt     runtime deps
    requirements-dev.txt pytest
    .env.example         config template (.env itself is gitignored)
  frontend/              React + Vite console
    src/api/client.js    fetch wrapper, envelope unwrapping, ApiError
    src/auth/            auth context + login gate
    src/panels/          one panel per module
    src/components/      trace visualiser, charts, layout, shared UI
    vite.config.js       dev proxy /api -> 127.0.0.1:5000
  tests/                 pytest suite for the backend
```

## API

All endpoints are under `/api` and return the envelope described above.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | session auth |
| GET | `/auth/me` | current session |
| POST | `/classical/caesar` | encrypt/decrypt via `action`, with frequency maps |
| POST | `/classical/caesar/attack` | chi-squared attack over all 26 shifts |
| POST | `/classical/playfair` | encrypt/decrypt + 5×5 key square |
| POST | `/sdes/encrypt`, `/sdes/decrypt` | S-DES with round-by-round trace |
| POST | `/crypto/encrypt`, `/crypto/decrypt`, `/crypto/roundtrip` | DES / AES-256 / RC4 |
| POST | `/modes/compare` | all five modes + ECB repeated-block analysis |
| POST | `/prng/lcg`, `/prng/bbs`, `/prng/ansi` | the three generators |
| POST | `/attack/bruteforce`, `/attack/frequency`, `/attack/known-plaintext`, `/attack/ecb-leakage` | attack simulator |
| GET / DELETE | `/runs` | run history, and clearing it |

## What to extend further

These map onto report sections, so you can cite what you built against what you
designed:

- **Full DES from scratch** (Section 4.3): this build uses PyCryptodome's DES
  primitive as the raw block-encrypt step (our own mode logic wraps it). If the
  report claims a from-scratch Feistel implementation, port the `sdes.py` style
  up to 16 rounds with the real PC-1/PC-2/E/S-box tables from FIPS-46.
- **Step-by-step viewers for DES/AES rounds** (Figures 5–6): `sdes.py` returns a
  full trace dict per round and the console renders it; do the same for DES/AES
  if you want those visualisers too.
- **ECB leakage against real images** (Figure 7, Section 3.4): the demo uses a
  synthetic repeating byte pattern. Swap in real image bytes (load a bitmap,
  strip the header, encrypt the raw pixels) for the visual effect.
- **Authenticated modes / GCM** — listed as future work (10.3); not implemented,
  consistent with the report.

## Notes

- DES, S-DES and RC4 are implemented for the **educational** purpose the report
  describes (teaching structure and weaknesses); they are not secure and should
  never protect real data. AES-256 is the only production-appropriate cipher
  here.
- The seeded demo login is a coursework convenience, not an access-control
  mechanism — it has no privileges beyond any other account. Don't ship it.
- Demo keys in `attack_simulator.py` are placeholders. Never reuse any
  credential from this project outside the coursework.
