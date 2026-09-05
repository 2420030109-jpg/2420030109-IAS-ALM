import time
import sdes
import classical
import modes


def brute_force_sdes(ciphertext_hex, known_first_plain_byte):
    cipher_bytes = bytes.fromhex(ciphertext_hex)
    start = time.time()
    key, attempts = sdes.brute_force(list(cipher_bytes), known_first_plain_byte)
    elapsed = time.time() - start
    return {
        "attack": "brute_force",
        "target": "S-DES (10-bit key space = 1024)",
        "keys_tried": len(attempts),
        "recovered_key": key,
        "elapsed_seconds": round(elapsed, 6),
        "success": key is not None,
    }


def frequency_analysis(ciphertext):
    start = time.time()
    shift, results = classical.caesar_frequency_attack(ciphertext)
    elapsed = time.time() - start
    return {
        "attack": "frequency_analysis",
        "target": "Caesar cipher",
        "recovered_shift": shift,
        "recovered_plaintext": classical.caesar_decrypt(ciphertext, shift),
        "elapsed_seconds": round(elapsed, 6),
        "success": True,
    }


def known_plaintext_rc4(ciphertext_bytes, known_plaintext_bytes):
    """Recover the keystream (and hence future bytes) from a known plaintext/ciphertext pair."""
    start = time.time()
    n = min(len(ciphertext_bytes), len(known_plaintext_bytes))
    keystream = bytes(c ^ p for c, p in zip(ciphertext_bytes[:n], known_plaintext_bytes[:n]))
    elapsed = time.time() - start
    return {
        "attack": "known_plaintext",
        "target": "stream cipher / OFB-CTR style XOR keystream",
        "recovered_keystream_hex": keystream.hex(),
        "elapsed_seconds": round(elapsed, 6),
        "success": True,
        "note": "If this keystream/IV pair is ever reused, XORing two ciphertexts cancels it out.",
    }


def ecb_pattern_leakage(image_bytes, key32=None):
    from Crypto.Cipher import AES
    key32 = key32 or (b"\x01" * 32)
    cipher = AES.new(key32, AES.MODE_ECB)
    enc_block = lambda b: cipher.encrypt(b.ljust(16, b"\0")[:16])
    ecb_ct, ctr_ct = modes.ecb_leak_demo(image_bytes, enc_block, 16)
    return {
        "attack": "ecb_pattern_leakage",
        "target": "ECB-mode image encryption",
        "ecb_ciphertext_hex_preview": ecb_ct[:64].hex(),
        "ctr_ciphertext_hex_preview": ctr_ct[:64].hex(),
        "note": "Repeated plaintext blocks stay identical under ECB; CTR output is uniformly random-looking.",
        "success": True,
    }
