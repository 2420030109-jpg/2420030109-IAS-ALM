import time
import functools

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from werkzeug.security import generate_password_hash, check_password_hash

import database
import classical
import sdes
import crypto_engine
import prng_engine
import attack_simulator

app = Flask(__name__)
app.secret_key = "change-this-secret-in-production"
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_HTTPONLY"] = True
CORS(app, supports_credentials=True)

database.init_db()


# ---------- response envelope helpers ----------

def ok(data=None, message="ok"):
    return jsonify({"success": True, "message": message, "data": data})


def err(message, code="ERROR", status=400):
    return jsonify({"success": False, "message": message, "error": {"code": code}}), status


class ApiError(Exception):
    """Raised anywhere in a handler to short-circuit to a proper error envelope."""

    def __init__(self, message, code="BAD_REQUEST", status=400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status


@app.errorhandler(ApiError)
def _handle_api_error(e):
    return err(e.message, e.code, e.status)


@app.errorhandler(HTTPException)
def _handle_http_exception(e):
    code = (e.name or "HTTP_ERROR").upper().replace(" ", "_")
    return err(e.description or e.name, code, e.code or 500)


@app.errorhandler(Exception)
def _handle_unexpected(e):
    # Last-resort safety net: never emit a bare 500 without an envelope.
    return err(f"internal error: {e}", "INTERNAL", 500)


# ---------- request parsing / validation helpers ----------

def get_body():
    body = request.get_json(force=True, silent=True)
    if body is None:
        raise ApiError("request body must be valid JSON", "BAD_REQUEST", 400)
    if not isinstance(body, dict):
        raise ApiError("request body must be a JSON object", "BAD_REQUEST", 400)
    return body


def require_fields(body, *names):
    out = []
    for n in names:
        if n not in body or body[n] is None:
            raise ApiError(f"missing required field: {n}", "BAD_REQUEST", 400)
        out.append(body[n])
    return out if len(out) != 1 else out[0]


def parse_int(value, name, lo=None, hi=None):
    try:
        v = int(value)
    except (TypeError, ValueError):
        raise ApiError(f"field '{name}' must be an integer", "BAD_REQUEST", 400)
    if lo is not None and v < lo:
        raise ApiError(f"field '{name}' must be >= {lo}", "BAD_REQUEST", 400)
    if hi is not None and v > hi:
        raise ApiError(f"field '{name}' must be <= {hi}", "BAD_REQUEST", 400)
    return v


def parse_hex(value, name):
    if not isinstance(value, str):
        raise ApiError(f"field '{name}' must be a hex string", "BAD_HEX", 400)
    s = value.strip()
    try:
        return bytes.fromhex(s)
    except ValueError:
        raise ApiError(f"field '{name}' is not valid hexadecimal", "BAD_HEX", 400)


def resolve_crypto_key(algorithm, key_hex):
    """des/aes256 -> hex bytes with an exact length; rc4 -> raw UTF-8 text bytes."""
    if algorithm == "rc4":
        if not isinstance(key_hex, str) or key_hex == "":
            raise ApiError("rc4 key (key_hex) must be non-empty text", "BAD_KEY", 400)
        return key_hex.encode("utf-8")
    kb = parse_hex(key_hex, "key_hex")
    if algorithm == "des" and len(kb) != 8:
        raise ApiError(f"des requires an 8-byte key (16 hex chars), got {len(kb)}", "BAD_KEY", 400)
    if algorithm == "aes256" and len(kb) != 32:
        raise ApiError(f"aes256 requires a 32-byte key (64 hex chars), got {len(kb)}", "BAD_KEY", 400)
    return kb


VALID_MODES = {"ECB", "CBC", "CFB", "OFB", "CTR"}
CRYPTO_ALGOS = {"des", "aes256", "rc4"}


def require_mode(body):
    mode = str(body.get("mode", "ECB")).upper()
    if mode not in VALID_MODES:
        raise ApiError(f"mode must be one of {sorted(VALID_MODES)}", "BAD_REQUEST", 400)
    return mode


def require_str(body, name, allow_empty=True):
    v = require_fields(body, name)
    if not isinstance(v, str):
        raise ApiError(f"field '{name}' must be a string", "BAD_REQUEST", 400)
    if not allow_empty and v == "":
        raise ApiError(f"field '{name}' must not be empty", "BAD_REQUEST", 400)
    return v


# ---------- auth ----------

def login_required(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return err("Authentication required", "UNAUTHENTICATED", 401)
        return fn(*args, **kwargs)
    return wrapper


def log_and_time(module, algorithm, params, fn):
    start = time.time()
    result = fn()
    elapsed_ms = round((time.time() - start) * 1000, 3)
    uid = session.get("user_id")
    try:
        database.log_run(uid, module, algorithm, params, result, elapsed_ms)
    except Exception:
        # logging must never break a successful crypto operation
        pass
    return result, elapsed_ms


@app.route("/api/auth/register", methods=["POST"])
def register():
    body = get_body()
    username, password = require_fields(body, "username", "password")
    if not isinstance(username, str) or not isinstance(password, str) or not username or not password:
        return err("username and password are required", "BAD_REQUEST", 400)
    if database.get_user(username):
        return err("username already exists", "USER_EXISTS", 409)
    database.create_user(username, generate_password_hash(password))
    return ok(message="registered")


@app.route("/api/auth/login", methods=["POST"])
def login():
    body = get_body()
    username, password = require_fields(body, "username", "password")
    user = database.get_user(username)
    if not user or not check_password_hash(user["password_hash"], password):
        return err("invalid credentials", "BAD_CREDENTIALS", 401)
    session["user_id"] = user["id"]
    session["username"] = username
    return ok({"username": username}, "logged in")


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return ok(message="logged out")


@app.route("/api/auth/me", methods=["GET"])
def me():
    if "user_id" not in session:
        return ok({"authenticated": False})
    return ok({"authenticated": True, "username": session.get("username")})


# ---------- classical cipher lab ----------

@app.route("/api/classical/caesar", methods=["POST"])
@login_required
def caesar():
    body = get_body()
    text = require_str(body, "text")
    shift = parse_int(require_fields(body, "shift"), "shift")
    action = str(body.get("action", "encrypt")).lower()
    if action not in ("encrypt", "decrypt"):
        raise ApiError("action must be 'encrypt' or 'decrypt'", "BAD_REQUEST", 400)

    def run():
        if action == "encrypt":
            output = classical.caesar_encrypt(text, shift)
        else:
            output = classical.caesar_decrypt(text, shift)
        return {
            "action": action,
            "input": text,
            "shift": shift,
            "output": output,
            "input_frequency": classical.letter_frequency(text),
            "output_frequency": classical.letter_frequency(output),
        }

    result, _ = log_and_time("classical.caesar", "caesar", body, run)
    return ok(result)


@app.route("/api/classical/caesar/attack", methods=["POST"])
@login_required
def caesar_attack():
    body = get_body()
    ciphertext = require_str(body, "ciphertext")

    def run():
        start = time.time()
        best_shift, candidates = classical.caesar_frequency_attack(ciphertext)
        return {
            "recovered_shift": best_shift,
            "recovered_plaintext": classical.caesar_decrypt(ciphertext, best_shift),
            "elapsed_seconds": round(time.time() - start, 6),
            "candidates": candidates,
        }

    result, _ = log_and_time("classical.caesar_attack", "caesar", body, run)
    return ok(result)


@app.route("/api/classical/playfair", methods=["POST"])
@login_required
def playfair():
    body = get_body()
    text = require_str(body, "text")
    key = require_str(body, "key", allow_empty=False)
    action = str(body.get("action", "encrypt")).lower()
    if action not in ("encrypt", "decrypt"):
        raise ApiError("action must be 'encrypt' or 'decrypt'", "BAD_REQUEST", 400)

    def run():
        if action == "encrypt":
            output, grid = classical.playfair_encrypt(text, key)
            digraphs = [[a, b] for a, b in classical._prepare_digraphs(text)]
        else:
            grid = classical._prepare_playfair_key(key)
            clean = "".join(c for c in text.upper() if c.isalpha()).replace("J", "I")
            digraphs = [[clean[i], clean[i + 1]] for i in range(0, len(clean) - 1, 2)]
            output = classical.playfair_decrypt(clean, key)
        return {
            "action": action,
            "input": text,
            "output": output,
            "key_square": [list(row) for row in grid],
            "digraphs": digraphs,
        }

    result, _ = log_and_time("classical.playfair", "playfair", body, run)
    return ok(result)


# ---------- S-DES lab (with round-by-round trace) ----------

def _key_bits_10(key10):
    return [(key10 >> (9 - i)) & 1 for i in range(10)]


@app.route("/api/sdes/encrypt", methods=["POST"])
@login_required
def sdes_encrypt():
    body = get_body()
    text = require_str(body, "text", allow_empty=False)
    key10 = parse_int(require_fields(body, "key"), "key", lo=0, hi=1023)

    def run():
        key_bits = _key_bits_10(key10)
        pt_bytes = text.encode("utf-8")
        first = pt_bytes[0]
        first_bits = [(first >> (7 - i)) & 1 for i in range(8)]
        _, trace = sdes.encrypt_byte(first_bits, key_bits)
        cipher_ints = sdes.encrypt_text(text, key10)
        blocks = [
            {"char": chr(p), "plain_byte": p, "cipher_byte": c}
            for p, c in zip(pt_bytes, cipher_ints)
        ]
        return {
            "ciphertext_hex": bytes(cipher_ints).hex(),
            "key_bits": key_bits,
            "first_byte_trace": trace,
            "blocks": blocks,
        }

    result, _ = log_and_time("sdes", "sdes", body, run)
    return ok(result)


@app.route("/api/sdes/decrypt", methods=["POST"])
@login_required
def sdes_decrypt():
    body = get_body()
    ct_hex = require_str(body, "ciphertext_hex", allow_empty=False)
    key10 = parse_int(require_fields(body, "key"), "key", lo=0, hi=1023)
    ct = parse_hex(ct_hex, "ciphertext_hex")
    if len(ct) == 0:
        raise ApiError("ciphertext_hex must decode to at least one byte", "BAD_HEX", 400)

    def run():
        key_bits = _key_bits_10(key10)
        plain_ints = [sdes.decrypt_block_int(b, key10) for b in ct]
        first_bits = [(ct[0] >> (7 - i)) & 1 for i in range(8)]
        _, trace = sdes.decrypt_byte(first_bits, key_bits)
        return {
            "plaintext": bytes(plain_ints).decode("utf-8", errors="replace"),
            "key_bits": key_bits,
            "first_byte_trace": trace,
        }

    result, _ = log_and_time("sdes", "sdes", body, run)
    return ok(result)


# ---------- CryptoEngine facade: DES / AES-256 / RC4 ----------

def _require_crypto_algo(body):
    algo = str(require_fields(body, "algorithm")).lower()
    if algo not in CRYPTO_ALGOS:
        raise ApiError(f"algorithm must be one of {sorted(CRYPTO_ALGOS)}", "BAD_REQUEST", 400)
    return algo


@app.route("/api/crypto/encrypt", methods=["POST"])
@login_required
def crypto_encrypt():
    body = get_body()
    algo = _require_crypto_algo(body)
    text = require_str(body, "text").encode("utf-8")
    mode = require_mode(body)
    key = resolve_crypto_key(algo, require_fields(body, "key_hex"))

    def run():
        try:
            return crypto_engine.encrypt(algo, text, key, mode=mode)
        except ValueError as e:
            raise ApiError(str(e), "BAD_REQUEST", 400)

    result, _ = log_and_time("crypto_engine", algo, body, run)
    return ok(result)


@app.route("/api/crypto/decrypt", methods=["POST"])
@login_required
def crypto_decrypt():
    body = get_body()
    algo = _require_crypto_algo(body)
    ct = parse_hex(require_fields(body, "ciphertext_hex"), "ciphertext_hex")
    mode = require_mode(body)
    key = resolve_crypto_key(algo, require_fields(body, "key_hex"))

    iv = nonce = None
    if algo in ("des", "aes256"):
        if mode in ("CBC", "CFB", "OFB"):
            if body.get("iv_hex") is None:
                raise ApiError(f"iv_hex is required for {mode} mode", "BAD_REQUEST", 400)
            iv = parse_hex(body["iv_hex"], "iv_hex")
        elif mode == "CTR":
            if body.get("nonce_hex") is None:
                raise ApiError("nonce_hex is required for CTR mode", "BAD_REQUEST", 400)
            nonce = parse_hex(body["nonce_hex"], "nonce_hex")

    def run():
        try:
            return crypto_engine.decrypt(algo, ct, key, mode=mode, iv=iv, nonce=nonce)
        except ValueError as e:
            raise ApiError(str(e), "BAD_REQUEST", 400)

    result, _ = log_and_time("crypto_engine", algo, body, run)
    return ok(result)


@app.route("/api/crypto/roundtrip", methods=["POST"])
@login_required
def crypto_roundtrip():
    body = get_body()
    algo = _require_crypto_algo(body)
    text = require_str(body, "text").encode("utf-8")
    mode = require_mode(body)
    key = resolve_crypto_key(algo, require_fields(body, "key_hex"))

    def run():
        try:
            return crypto_engine.roundtrip(algo, text, key, mode=mode)
        except ValueError as e:
            raise ApiError(str(e), "BAD_REQUEST", 400)

    result, _ = log_and_time("crypto_engine.roundtrip", algo, body, run)
    return ok(result)


@app.route("/api/modes/compare", methods=["POST"])
@login_required
def modes_compare():
    body = get_body()
    algo = str(body.get("algorithm", "aes256")).lower()
    if algo not in ("des", "aes256"):
        raise ApiError("modes/compare supports 'des' or 'aes256'", "BAD_REQUEST", 400)
    text = require_str(body, "text").encode("utf-8")
    key = resolve_crypto_key(algo, require_fields(body, "key_hex"))
    block_size = 16 if algo == "aes256" else 8

    def run():
        try:
            results = crypto_engine.compare_all_modes(algo, text, key)
        except ValueError as e:
            raise ApiError(str(e), "BAD_REQUEST", 400)

        def dup_and_total(hex_ct):
            raw = bytes.fromhex(hex_ct)
            blocks = [raw[i:i + block_size] for i in range(0, len(raw), block_size)
                      if len(raw[i:i + block_size]) == block_size]
            return len(blocks) - len(set(blocks)), len(blocks)

        for m, r in results.items():
            reps, total = dup_and_total(r["ciphertext_hex"])
            r["repeated_blocks"] = reps
            r["total_blocks"] = total

        ecb_reps, ecb_total = dup_and_total(results["ECB"]["ciphertext_hex"])
        return {
            "results": results,
            "analysis": {
                "ecb_repeated_blocks": ecb_reps,
                "total_blocks": ecb_total,
                "note": (
                    "ECB maps identical plaintext blocks to identical ciphertext "
                    "blocks, so structure in the plaintext leaks; CBC/CFB/OFB/CTR "
                    "randomise every block."
                ),
            },
        }

    result, _ = log_and_time("modes_compare", algo, body, run)
    return ok(result)


# ---------- PRNG engine ----------

@app.route("/api/prng/lcg", methods=["POST"])
@login_required
def prng_lcg():
    body = get_body()
    seed = parse_int(body.get("seed", 7), "seed")
    n = parse_int(body.get("n", 20), "n", lo=0, hi=100000)
    a = parse_int(body.get("a", 1103515245), "a")
    c = parse_int(body.get("c", 12345), "c")
    m = parse_int(body.get("m", 2 ** 31), "m", lo=1)

    def run():
        sequence = prng_engine.lcg(seed, n, a, c, m)
        return {
            "sequence": sequence,
            "normalized": [x / m for x in sequence],
            "params": {"a": a, "c": c, "m": m, "seed": seed, "n": n},
        }

    result, _ = log_and_time("prng.lcg", "lcg", body, run)
    return ok(result)


@app.route("/api/prng/bbs", methods=["POST"])
@login_required
def prng_bbs():
    body = get_body()
    seed = parse_int(body.get("seed", 3), "seed")
    n = parse_int(body.get("n", 20), "n", lo=0, hi=100000)
    bits = parse_int(body.get("bits", 16), "bits", lo=4, hi=64)

    result, _ = log_and_time("prng.bbs", "bbs", body, lambda: prng_engine.bbs(seed, n, bits))
    return ok(result)


@app.route("/api/prng/ansi", methods=["POST"])
@login_required
def prng_ansi():
    body = get_body()
    if body.get("key_hex") is not None:
        key = parse_hex(body["key_hex"], "key_hex")
        if len(key) != 32:
            raise ApiError("key_hex must decode to 32 bytes", "BAD_KEY", 400)
    else:
        key = b"\x00" * 32
    if body.get("seed_hex") is not None:
        seed = parse_hex(body["seed_hex"], "seed_hex")
        if len(seed) != 8:
            raise ApiError("seed_hex must decode to 8 bytes", "BAD_KEY", 400)
    else:
        seed = b"\x00" * 8
    n = parse_int(body.get("n", 5), "n", lo=0, hi=10000)

    result, _ = log_and_time("prng.ansi", "ansi_x917", body,
                             lambda: {"outputs": prng_engine.ansi_x917(key, seed, n)})
    return ok(result)


# ---------- attack simulator ----------

@app.route("/api/attack/bruteforce", methods=["POST"])
@login_required
def attack_bruteforce():
    body = get_body()
    ct = parse_hex(require_fields(body, "ciphertext_hex"), "ciphertext_hex")
    if len(ct) == 0:
        raise ApiError("ciphertext_hex must decode to at least one byte", "BAD_HEX", 400)
    known = parse_int(require_fields(body, "known_first_plain_byte"), "known_first_plain_byte", lo=0, hi=255)

    result, _ = log_and_time("attack.bruteforce", "sdes", body,
                             lambda: attack_simulator.brute_force_sdes(ct.hex(), known))
    return ok(result)


@app.route("/api/attack/frequency", methods=["POST"])
@login_required
def attack_frequency():
    body = get_body()
    ciphertext = require_str(body, "ciphertext")
    result, _ = log_and_time("attack.frequency", "caesar", body,
                             lambda: attack_simulator.frequency_analysis(ciphertext))
    return ok(result)


@app.route("/api/attack/known-plaintext", methods=["POST"])
@login_required
def attack_known_plaintext():
    body = get_body()
    ct = parse_hex(require_fields(body, "ciphertext_hex"), "ciphertext_hex")
    pt = require_str(body, "known_plaintext").encode("utf-8")
    result, _ = log_and_time("attack.known_plaintext", "stream", body,
                             lambda: attack_simulator.known_plaintext_rc4(ct, pt))
    return ok(result)


@app.route("/api/attack/ecb-leakage", methods=["POST"])
@login_required
def attack_ecb_leakage():
    body = get_body()
    block_repeats = parse_int(body.get("block_repeats", 8), "block_repeats", lo=1, hi=4096)
    pattern_byte = parse_int(body.get("pattern_byte", 65), "pattern_byte", lo=0, hi=255)
    result, _ = log_and_time("attack.ecb_leakage", "aes256", body,
                             lambda: attack_simulator.ecb_pattern_leakage(block_repeats, pattern_byte))
    return ok(result)


# ---------- run history ----------

@app.route("/api/runs", methods=["GET", "DELETE"])
@login_required
def runs():
    if request.method == "DELETE":
        database.clear_runs(session["user_id"])
        return ok(None, "history cleared")
    return ok(database.get_runs(session["user_id"]))


if __name__ == "__main__":
    app.run(debug=True, port=5000)
