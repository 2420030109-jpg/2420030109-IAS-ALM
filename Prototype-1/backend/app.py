import time
import functools

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

import database
import classical
import sdes
import crypto_engine
import prng_engine
import attack_simulator

app = Flask(__name__)
app.secret_key = "change-this-secret-in-production"
CORS(app, supports_credentials=True)

database.init_db()


# ---------- response envelope helpers ----------

def ok(data=None, message="ok"):
    return jsonify({"success": True, "message": message, "data": data})


def err(message, code="ERROR", status=400):
    return jsonify({"success": False, "message": message, "error": {"code": code}}), status


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
    database.log_run(uid, module, algorithm, params, result, elapsed_ms)
    return result, elapsed_ms


# ---------- auth ----------

@app.route("/api/auth/register", methods=["POST"])
def register():
    body = request.get_json(force=True)
    username, password = body.get("username"), body.get("password")
    if not username or not password:
        return err("username and password are required")
    if database.get_user(username):
        return err("username already exists", "USER_EXISTS", 409)
    database.create_user(username, generate_password_hash(password))
    return ok(message="registered")


@app.route("/api/auth/login", methods=["POST"])
def login():
    body = request.get_json(force=True)
    username, password = body.get("username"), body.get("password")
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
    body = request.get_json(force=True)
    text, shift = body["text"], int(body["shift"])
    result, ms = log_and_time("classical.caesar", "caesar", body, lambda: {
        "ciphertext": classical.caesar_encrypt(text, shift),
        "plaintext_frequency": classical.letter_frequency(text),
        "ciphertext_frequency": classical.letter_frequency(classical.caesar_encrypt(text, shift)),
    })
    return ok(result)


@app.route("/api/classical/playfair", methods=["POST"])
@login_required
def playfair():
    body = request.get_json(force=True)
    text, key = body["text"], body["key"]
    result, ms = log_and_time("classical.playfair", "playfair", body, lambda: (
        lambda ct, grid: {"ciphertext": ct, "key_square": grid}
    )(*classical.playfair_encrypt(text, key)))
    return ok(result)


# ---------- S-DES lab (with round-by-round trace) ----------

@app.route("/api/sdes/encrypt", methods=["POST"])
@login_required
def sdes_encrypt():
    body = request.get_json(force=True)
    text, key10 = body["text"], int(body["key"])
    def run():
        first_byte = text.encode("utf-8")[0]
        bits = [(first_byte >> (7 - i)) & 1 for i in range(8)]
        keybits = [(key10 >> (9 - i)) & 1 for i in range(10)]
        cipher_bits, trace = sdes.encrypt_byte(bits, keybits)
        full_cipher = sdes.encrypt_text(text, key10)
        return {"ciphertext_hex": bytes(full_cipher).hex(), "first_byte_trace": trace}
    result, ms = log_and_time("sdes", "sdes", body, run)
    return ok(result)


# ---------- CryptoEngine facade: DES / AES-256 / RC4 ----------

@app.route("/api/crypto/encrypt", methods=["POST"])
@login_required
def crypto_encrypt():
    body = request.get_json(force=True)
    algo = body["algorithm"]
    text = body["text"].encode("utf-8")
    mode = body.get("mode", "ECB")
    key_hex = body["key_hex"]
    key = bytes.fromhex(key_hex) if algo in ("des", "aes256") else key_hex.encode("utf-8")
    result, ms = log_and_time("crypto_engine", algo, body, lambda:
        crypto_engine.encrypt(algo, text, key, mode=mode))
    return ok(result)


@app.route("/api/modes/compare", methods=["POST"])
@login_required
def modes_compare():
    body = request.get_json(force=True)
    algo = body.get("algorithm", "aes256")
    text = body["text"].encode("utf-8")
    key = bytes.fromhex(body["key_hex"])
    result, ms = log_and_time("modes_compare", algo, body, lambda:
        crypto_engine.compare_all_modes(algo, text, key))
    return ok(result)


# ---------- PRNG engine ----------

@app.route("/api/prng/lcg", methods=["POST"])
@login_required
def prng_lcg():
    body = request.get_json(force=True)
    seed, n = int(body.get("seed", 7)), int(body.get("n", 20))
    result, ms = log_and_time("prng.lcg", "lcg", body, lambda: {"sequence": prng_engine.lcg(seed, n)})
    return ok(result)


@app.route("/api/prng/bbs", methods=["POST"])
@login_required
def prng_bbs():
    body = request.get_json(force=True)
    seed, n = int(body.get("seed", 3)), int(body.get("n", 20))
    result, ms = log_and_time("prng.bbs", "bbs", body, lambda: prng_engine.bbs(seed, n))
    return ok(result)


@app.route("/api/prng/ansi", methods=["POST"])
@login_required
def prng_ansi():
    body = request.get_json(force=True)
    key = bytes.fromhex(body["key_hex"]) if "key_hex" in body else b"0" * 32
    seed = bytes.fromhex(body["seed_hex"]) if "seed_hex" in body else b"1" * 8
    n = int(body.get("n", 5))
    result, ms = log_and_time("prng.ansi", "ansi_x917", body, lambda: {
        "outputs": prng_engine.ansi_x917(key, seed, n)
    })
    return ok(result)


# ---------- attack simulator ----------

@app.route("/api/attack/bruteforce", methods=["POST"])
@login_required
def attack_bruteforce():
    body = request.get_json(force=True)
    result, ms = log_and_time("attack.bruteforce", "sdes", body, lambda:
        attack_simulator.brute_force_sdes(body["ciphertext_hex"], int(body["known_first_plain_byte"])))
    return ok(result)


@app.route("/api/attack/frequency", methods=["POST"])
@login_required
def attack_frequency():
    body = request.get_json(force=True)
    result, ms = log_and_time("attack.frequency", "caesar", body, lambda:
        attack_simulator.frequency_analysis(body["ciphertext"]))
    return ok(result)


@app.route("/api/attack/known-plaintext", methods=["POST"])
@login_required
def attack_known_plaintext():
    body = request.get_json(force=True)
    ct = bytes.fromhex(body["ciphertext_hex"])
    pt = body["known_plaintext"].encode("utf-8")
    result, ms = log_and_time("attack.known_plaintext", "stream", body, lambda:
        attack_simulator.known_plaintext_rc4(ct, pt))
    return ok(result)


@app.route("/api/attack/ecb-leakage", methods=["POST"])
@login_required
def attack_ecb_leakage():
    body = request.get_json(force=True)
    # demo pattern: repeating 16-byte block, simulating a flat region of an image
    pattern = bytes(body.get("pattern_byte", 65) for _ in range(int(body.get("length", 256))))
    result, ms = log_and_time("attack.ecb_leakage", "aes256", body, lambda:
        attack_simulator.ecb_pattern_leakage(pattern))
    return ok(result)


# ---------- run history ----------

@app.route("/api/runs", methods=["GET"])
@login_required
def runs():
    return ok(database.get_runs(session["user_id"]))


if __name__ == "__main__":
    app.run(debug=True, port=5000)
