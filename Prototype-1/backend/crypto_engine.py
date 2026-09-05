"""
CryptoEngine: single facade exposing a uniform encrypt/decrypt interface
over S-DES, DES, AES-256 and RC4. Route handlers never touch a cipher
module directly - everything goes through here (see report section 2.1).
"""
import os
from Crypto.Cipher import DES, AES

import sdes
import rc4
import modes


REGISTRY = {
    "sdes": {"block_size": 1, "key_size": "10-bit"},
    "des": {"block_size": 8, "key_size": "64-bit (56 effective)"},
    "aes256": {"block_size": 16, "key_size": "256-bit"},
    "rc4": {"stream": True, "key_size": "variable (5-256 bit)"},
}


def _des_block_funcs(key8):
    cipher = DES.new(key8, DES.MODE_ECB)
    return (lambda b: cipher.encrypt(b.ljust(8, b"\0")[:8])), (lambda b: cipher.decrypt(b))


def _aes256_block_funcs(key32):
    cipher = AES.new(key32, AES.MODE_ECB)
    return (lambda b: cipher.encrypt(b.ljust(16, b"\0")[:16])), (lambda b: cipher.decrypt(b))


def encrypt(algorithm, plaintext: bytes, key, mode="ECB", iv=None):
    """Uniform entry point. Returns dict with ciphertext (hex), iv/nonce (hex) and metadata."""
    algorithm = algorithm.lower()

    if algorithm == "sdes":
        key10 = key if isinstance(key, int) else int(key)
        cipher_ints = sdes.encrypt_text(plaintext.decode("utf-8", errors="ignore"), key10)
        return {"algorithm": "sdes", "ciphertext_hex": bytes(cipher_ints).hex(), "mode": "N/A (single block per byte)"}

    if algorithm == "des":
        enc_block, dec_block = _des_block_funcs(key)
        return _mode_dispatch(enc_block, dec_block, 8, plaintext, mode, iv, "des")

    if algorithm == "aes256":
        enc_block, dec_block = _aes256_block_funcs(key)
        return _mode_dispatch(enc_block, dec_block, 16, plaintext, mode, iv, "aes256")

    if algorithm == "rc4":
        key_bytes = key if isinstance(key, (bytes, bytearray)) else bytes(key, "utf-8")
        ct = rc4.encrypt(plaintext, key_bytes)
        return {"algorithm": "rc4", "ciphertext_hex": ct.hex(), "mode": "stream"}

    raise ValueError(f"Unknown algorithm: {algorithm}")


def _mode_dispatch(enc_block, dec_block, block_size, plaintext, mode, iv, algo_name):
    mode = mode.upper()
    if mode == "ECB":
        ct = modes.ecb_encrypt(plaintext, enc_block, block_size)
        return {"algorithm": algo_name, "mode": "ECB", "ciphertext_hex": ct.hex()}
    if mode == "CBC":
        used_iv, ct = modes.cbc_encrypt(plaintext, enc_block, block_size, iv)
        return {"algorithm": algo_name, "mode": "CBC", "iv_hex": used_iv.hex(), "ciphertext_hex": ct.hex()}
    if mode == "CFB":
        used_iv, ct = modes.cfb_encrypt(plaintext, enc_block, block_size, iv)
        return {"algorithm": algo_name, "mode": "CFB", "iv_hex": used_iv.hex(), "ciphertext_hex": ct.hex()}
    if mode == "OFB":
        used_iv, ct = modes.ofb_encrypt(plaintext, enc_block, block_size, iv)
        return {"algorithm": algo_name, "mode": "OFB", "iv_hex": used_iv.hex(), "ciphertext_hex": ct.hex()}
    if mode == "CTR":
        nonce, ct = modes.ctr_encrypt(plaintext, enc_block, block_size, iv)
        return {"algorithm": algo_name, "mode": "CTR", "nonce_hex": nonce.hex(), "ciphertext_hex": ct.hex()}
    raise ValueError(f"Unknown mode: {mode}")


def _block_funcs(algorithm, key):
    if algorithm == "des":
        return _des_block_funcs(key), 8
    if algorithm == "aes256":
        return _aes256_block_funcs(key), 16
    raise ValueError(f"Unknown algorithm: {algorithm}")


def decrypt(algorithm, ciphertext: bytes, key, mode="ECB", iv=None, nonce=None):
    """Counterpart to encrypt(). Returns {algorithm, mode, plaintext}."""
    algorithm = algorithm.lower()

    if algorithm == "sdes":
        key10 = key if isinstance(key, int) else int(key)
        plain = bytes(sdes.decrypt_block_int(b, key10) for b in ciphertext)
        return {"algorithm": "sdes", "mode": "N/A (single block per byte)",
                "plaintext": plain.decode("utf-8", errors="replace")}

    if algorithm == "rc4":
        key_bytes = key if isinstance(key, (bytes, bytearray)) else bytes(key, "utf-8")
        pt = rc4.decrypt(ciphertext, key_bytes)
        return {"algorithm": "rc4", "mode": "stream",
                "plaintext": pt.decode("utf-8", errors="replace")}

    (enc_block, dec_block), block_size = _block_funcs(algorithm, key)
    m = mode.upper()
    if m == "ECB":
        pt = modes.ecb_decrypt(ciphertext, dec_block, block_size)
    elif m == "CBC":
        pt = modes.cbc_decrypt(ciphertext, dec_block, block_size, iv)
    elif m == "CFB":
        pt = modes.cfb_decrypt(ciphertext, enc_block, block_size, iv)
    elif m == "OFB":
        pt = modes.ofb_decrypt(ciphertext, enc_block, block_size, iv)
    elif m == "CTR":
        pt = modes.ctr_decrypt(ciphertext, enc_block, block_size, nonce)
    else:
        raise ValueError(f"Unknown mode: {m}")
    return {"algorithm": algorithm, "mode": m,
            "plaintext": pt.decode("utf-8", errors="replace")}


def roundtrip(algorithm, plaintext: bytes, key, mode="ECB"):
    """encrypt() then decrypt() with the produced iv/nonce; reports whether they match."""
    enc = encrypt(algorithm, plaintext, key, mode=mode)
    iv = bytes.fromhex(enc["iv_hex"]) if "iv_hex" in enc else None
    nonce = bytes.fromhex(enc["nonce_hex"]) if "nonce_hex" in enc else None
    dec = decrypt(algorithm, bytes.fromhex(enc["ciphertext_hex"]), key,
                  mode=mode, iv=iv, nonce=nonce)
    recovered = dec["plaintext"]
    return {
        "algorithm": enc.get("algorithm", algorithm.lower()),
        "mode": enc.get("mode"),
        "ciphertext_hex": enc["ciphertext_hex"],
        "recovered_plaintext": recovered,
        "match": recovered == plaintext.decode("utf-8", errors="replace"),
    }


def compare_all_modes(algorithm, plaintext: bytes, key):
    """Run the same plaintext through all five modes - powers the block-mode visualizer."""
    results = {}
    for m in ["ECB", "CBC", "CFB", "OFB", "CTR"]:
        results[m] = encrypt(algorithm, plaintext, key, mode=m)
    return results
