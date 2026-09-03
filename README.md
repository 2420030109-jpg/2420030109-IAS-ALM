# IAS — Assignment Lab Modules

**Name:** Pujith Krishna Soma
**Roll No:** 2420090069
**Section:** 11

Two client–server cryptography labs for Information Assurance and Security,
both written in Python and both exchanging data over real TCP sockets.

---

## [ALM-1](ALM-1/) — Caesar, Playfair and SDES

A menu-driven terminal client and server that encrypt and decrypt messages
using three ciphers implemented from scratch, with no cryptography libraries:

- **Caesar** — classical substitution cipher
- **Playfair** — classical digraph substitution using a 5×5 key square
- **SDES** — Simplified Data Encryption Standard

Ciphertext travels in both directions over a live TCP connection, so the
transfer is real rather than simulated.

```bash
cd ALM-1
python3 -m pytest tests/     # 40 tests
python3 server.py            # then, in a second terminal:
python3 client.py
```

---

## [ALM-2](ALM-2/) — AES file transfer

Extends the same socket architecture to a modern block cipher, using
PyCryptodome's AES-128-CBC to encrypt and transfer human-readable text files
between client and server.

```bash
cd ALM-2
pip install -r requirements.txt
python3 -m pytest tests/     # 11 tests
python3 server.py            # then, in a second terminal:
python3 client.py
```

---

## Layout

Each module is self-contained and follows the same shape:

```text
algorithms/     the cipher implementations
network/        the socket protocol
files/          sample inputs for client and server
received/       where transferred files arrive
tests/          unit tests for the ciphers and the protocol
client.py       the client entry point
server.py       the server entry point
```

Full objectives, algorithm explanations and sample output are in each
module's own README.
