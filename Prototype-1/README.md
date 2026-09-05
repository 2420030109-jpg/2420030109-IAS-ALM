# CryptoShield — starter implementation

This is a working starter build of the project described in your report
(*CryptoShield: An Interactive Platform for Cryptography and Information
Assurance*). It's real, runnable code — a Flask REST backend plus a plain
HTML/JS console — covering every module from the report:

- **CryptoEngine** facade (`backend/crypto_engine.py`) — uniform encrypt/decrypt
  over S-DES (`backend/sdes.py`, hand-written with full round trace), DES and
  AES-256 (via PyCryptodome's raw block cipher, wrapped by your own mode logic),
  and RC4 (`backend/rc4.py`, hand-written KSA/PRGA).
- **Block cipher modes** (`backend/modes.py`) — ECB/CBC/CFB/OFB/CTR implemented
  manually on top of a raw block-encrypt function.
- **PRNG Engine** (`backend/prng_engine.py`) — LCG, Blum Blum Shub, ANSI X9.17.
- **Attack Simulator** (`backend/attack_simulator.py`) — brute force on S-DES,
  frequency analysis (chi-squared) on Caesar, known-plaintext keystream
  recovery, ECB pattern-leakage demo.
- **Auth + persistence** (`backend/database.py`) — SQLite, hashed passwords,
  every run logged with algorithm/params/result/timing.
- **REST API** (`backend/app.py`) — one response envelope
  `{success, message, data}` / `{success:false, error:{code,message}}` across
  every endpoint.
- **Console** (`frontend/`) — a single-page app that calls the API for every
  module.

Nothing here is a mockup — every button in the console makes a real API call
and every algorithm runs for real. That said, it's a **starter you should
build on**, not a finished submission: see "What to extend" below.

## 1. Install prerequisites (one time)

1. Install **Python 3.10+** from [python.org](https://python.org) if you
   don't have it. During install on Windows, tick "Add Python to PATH".
2. Install **VS Code** and open this `cryptoshield` folder in it
   (`File > Open Folder`).
3. Open a terminal inside VS Code: `` Terminal > New Terminal ``.

## 2. Set up and run the backend

In the VS Code terminal:

```bash
cd backend
python -m venv venv

# activate the virtual environment
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows (cmd/PowerShell)

pip install -r requirements.txt
python app.py
```

You should see Flask start on `http://127.0.0.1:5000`. Leave this terminal
running — it's your live backend.

## 3. Run the frontend

Open a **second** terminal in VS Code (`+` icon in the terminal panel):

```bash
cd frontend
python -m http.server 5500
```

Then open **http://127.0.0.1:5500** in your browser. (Opening `index.html`
by double-clicking also mostly works, but serving it avoids browser
file:// restrictions.)

## 4. Use it

1. Register a username/password, then log in.
2. Walk through the tabs: Classical Lab → S-DES (note the round-by-round
   trace in the JSON output) → DES/AES/RC4 → Block Modes → PRNG → Attack
   Simulator → Run History (every call you make is logged to SQLite and
   shown here).

## Project layout

```
cryptoshield/
  backend/
    app.py              REST API + auth + response envelope
    crypto_engine.py    facade: encrypt(algorithm, plaintext, key, mode)
    sdes.py             hand-written S-DES with full step trace
    rc4.py              hand-written RC4 KSA/PRGA
    classical.py        Caesar + Playfair + frequency attack
    modes.py            ECB/CBC/CFB/OFB/CTR built on a raw block-encrypt fn
    prng_engine.py       LCG, BBS, ANSI X9.17
    attack_simulator.py brute force / frequency / known-plaintext / ECB leak
    database.py          SQLite: users + run history
    requirements.txt
  frontend/
    index.html
    app.js               fetch() calls into the REST API
    style.css
```

## What to extend before submitting

The report promises more than a starter can responsibly hand you in one
shot — treat these as your next milestones, and they map directly onto
report sections so you can cite what you built against what you designed:

- **Full DES from scratch** (Section 4.3): this build uses PyCryptodome's DES
  primitive as the raw block-encrypt step (your own mode logic still wraps
  it). If your report claims a from-scratch Feistel implementation, port the
  S-DES style (`sdes.py`) up to 16 rounds with the real PC-1/PC-2/E/S-box
  tables from FIPS-46.
- **Step-by-step viewers for DES/AES rounds** (Figures 5–6): `sdes.py`
  already returns a full trace dict per round; do the same for DES/AES if
  you want the round-by-round visualizer the report describes, rather than
  only the S-DES one.
- **Known-plaintext / ECB-leakage against images** (Figure 7, Section 3.4):
  the current demo uses a synthetic byte pattern. Swap in real image bytes
  (e.g. load a bitmap, strip the header, encrypt the raw pixel data) for the
  visual "recognizable under ECB" effect the report describes.
- **Authenticated modes / GCM** — listed as future work (10.3); not
  implemented here, consistent with the report.
- **Tests** (Section 9.1): add `pytest` tests asserting `Dk(Ek(m)) == m` for
  every cipher/mode combination — the round-trip property the report cites
  as the central correctness check.

## Notes

- DES, S-DES and RC4 are implemented for the **educational** purpose the
  report describes (teaching structure/weaknesses); they are not secure and
  should never be used to protect real data. AES-256 is the only
  production-appropriate cipher in this codebase.
- The Flask `secret_key` in `app.py` and the demo AES keys in `attack_simulator.py`
  are placeholders — never reuse them outside this coursework project.
