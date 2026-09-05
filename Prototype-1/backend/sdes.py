"""
Simplified DES (S-DES) - 8-bit block cipher, 10-bit key.
Every step is returned so the frontend can show the round-by-round trace.
"""

P10 = [3, 5, 2, 7, 4, 10, 1, 9, 8, 6]
P8 = [6, 3, 7, 4, 8, 5, 10, 9]
IP = [2, 6, 3, 1, 4, 8, 5, 7]
IP_INV = [4, 1, 3, 5, 7, 2, 8, 6]
EP = [4, 1, 2, 3, 2, 3, 4, 1]
P4 = [2, 4, 3, 1]

S0 = [[1, 0, 3, 2], [3, 2, 1, 0], [0, 2, 1, 3], [3, 1, 3, 2]]
S1 = [[0, 1, 2, 3], [2, 0, 1, 3], [3, 0, 1, 0], [2, 1, 0, 3]]


def _permute(bits, table):
    return [bits[i - 1] for i in table]


def _left_shift(bits, n):
    return bits[n:] + bits[:n]


def _xor(a, b):
    return [x ^ y for x, y in zip(a, b)]


def _bits_to_int(bits):
    v = 0
    for b in bits:
        v = (v << 1) | b
    return v


def _int_to_bits(value, width):
    return [(value >> (width - 1 - i)) & 1 for i in range(width)]


def key_schedule(key10):
    """key10: list of 10 bits. Returns (K1, K2, trace)."""
    trace = {}
    p10 = _permute(key10, P10)
    trace["P10(K)"] = p10
    left, right = p10[:5], p10[5:]
    ls1_l, ls1_r = _left_shift(left, 1), _left_shift(right, 1)
    trace["LS-1"] = ls1_l + ls1_r
    k1 = _permute(ls1_l + ls1_r, P8)
    trace["K1"] = k1

    ls2_l, ls2_r = _left_shift(ls1_l, 2), _left_shift(ls1_r, 2)
    trace["LS-2 (from LS-1)"] = ls2_l + ls2_r
    k2 = _permute(ls2_l + ls2_r, P8)
    trace["K2"] = k2
    return k1, k2, trace


def _sbox_lookup(sbox, four_bits):
    row = (four_bits[0] << 1) | four_bits[3]
    col = (four_bits[1] << 1) | four_bits[2]
    val = sbox[row][col]
    return [(val >> 1) & 1, val & 1]


def _fk(bits8, subkey8, trace, label):
    left, right = bits8[:4], bits8[4:]
    ep = _permute(right, EP)
    xored = _xor(ep, subkey8)
    left4, right4 = xored[:4], xored[4:]
    s0_out = _sbox_lookup(S0, left4)
    s1_out = _sbox_lookup(S1, right4)
    p4_out = _permute(s0_out + s1_out, P4)
    new_left = _xor(left, p4_out)
    trace[label] = {
        "EP(right)": ep,
        "XOR with subkey": xored,
        "S0_out": s0_out,
        "S1_out": s1_out,
        "P4_out": p4_out,
        "new_left": new_left,
        "right_unchanged": right,
    }
    return new_left + right


def encrypt_byte(plain8, key10):
    """plain8: list[8] of 0/1. key10: list[10] of 0/1."""
    k1, k2, ks_trace = key_schedule(key10)
    trace = {"key_schedule": ks_trace}

    ip = _permute(plain8, IP)
    trace["IP"] = ip

    after_f1 = _fk(ip, k1, trace, "round1 (fK1)")
    swapped = after_f1[4:] + after_f1[:4]
    trace["SW"] = swapped

    after_f2 = _fk(swapped, k2, trace, "round2 (fK2)")
    cipher = _permute(after_f2, IP_INV)
    trace["IP_INV (ciphertext)"] = cipher
    return cipher, trace


def decrypt_byte(cipher8, key10):
    k1, k2, ks_trace = key_schedule(key10)
    trace = {"key_schedule": ks_trace}

    ip = _permute(cipher8, IP)
    trace["IP"] = ip

    after_f1 = _fk(ip, k2, trace, "round1 (fK2)")
    swapped = after_f1[4:] + after_f1[:4]
    trace["SW"] = swapped

    after_f2 = _fk(swapped, k1, trace, "round2 (fK1)")
    plain = _permute(after_f2, IP_INV)
    trace["IP_INV (plaintext)"] = plain
    return plain, trace


def encrypt_block_int(plain_byte, key_10bit):
    """Convenience wrapper used by modes.py: 8-bit int in, 8-bit int out."""
    p = _int_to_bits(plain_byte, 8)
    k = _int_to_bits(key_10bit, 10)
    c, _ = encrypt_byte(p, k)
    return _bits_to_int(c)


def decrypt_block_int(cipher_byte, key_10bit):
    c = _int_to_bits(cipher_byte, 8)
    k = _int_to_bits(key_10bit, 10)
    p, _ = decrypt_byte(c, k)
    return _bits_to_int(p)


def encrypt_text(text, key_10bit):
    """Encrypt a string byte-by-byte using S-DES on each byte's low 8 bits."""
    return [encrypt_block_int(b, key_10bit) for b in text.encode("utf-8")]


def brute_force(ciphertext_bytes, known_plain_byte0):
    """Try every 10-bit key (1024) until the first byte matches. Returns list of attempts."""
    attempts = []
    for k in range(1024):
        guess = decrypt_block_int(ciphertext_bytes[0], k)
        attempts.append(k)
        if guess == known_plain_byte0:
            return k, attempts
    return None, attempts
