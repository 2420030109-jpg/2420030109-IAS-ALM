"""
Block cipher modes of operation (NIST SP 800-38A), implemented manually.
Each mode is built on top of a raw single-block encrypt function so the
chaining/keystream logic is explicit and inspectable, independent of
whichever block cipher (AES/DES/S-DES) supplies encrypt_block().
"""

import os


def _xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))


def _pad(data, block_size):
    pad_len = block_size - (len(data) % block_size)
    return data + bytes([pad_len] * pad_len)


def _unpad(data):
    pad_len = data[-1]
    return data[:-pad_len]


def _blocks(data, block_size):
    return [data[i:i + block_size] for i in range(0, len(data), block_size)]


def ecb_encrypt(plaintext, encrypt_block, block_size):
    data = _pad(plaintext, block_size)
    return b"".join(encrypt_block(b) for b in _blocks(data, block_size))


def ecb_decrypt(ciphertext, decrypt_block, block_size):
    data = b"".join(decrypt_block(b) for b in _blocks(ciphertext, block_size))
    return _unpad(data)


def cbc_encrypt(plaintext, encrypt_block, block_size, iv=None):
    iv = iv or os.urandom(block_size)
    data = _pad(plaintext, block_size)
    out, prev = [], iv
    for b in _blocks(data, block_size):
        c = encrypt_block(_xor(b, prev))
        out.append(c)
        prev = c
    return iv, b"".join(out)


def cbc_decrypt(ciphertext, decrypt_block, block_size, iv):
    out, prev = [], iv
    for c in _blocks(ciphertext, block_size):
        p = _xor(decrypt_block(c), prev)
        out.append(p)
        prev = c
    return _unpad(b"".join(out))


def cfb_encrypt(plaintext, encrypt_block, block_size, iv=None):
    iv = iv or os.urandom(block_size)
    out, prev = [], iv
    for b in _blocks(plaintext, block_size):
        stream = encrypt_block(prev)[:len(b)]
        c = _xor(b, stream)
        out.append(c)
        prev = c.ljust(block_size, b"\0") if len(c) < block_size else c
    return iv, b"".join(out)


def cfb_decrypt(ciphertext, encrypt_block, block_size, iv):
    out, prev = [], iv
    for c in _blocks(ciphertext, block_size):
        stream = encrypt_block(prev)[:len(c)]
        p = _xor(c, stream)
        out.append(p)
        prev = c.ljust(block_size, b"\0") if len(c) < block_size else c
    return b"".join(out)


def ofb_encrypt(plaintext, encrypt_block, block_size, iv=None):
    iv = iv or os.urandom(block_size)
    out, o = [], iv
    for b in _blocks(plaintext, block_size):
        o = encrypt_block(o)
        out.append(_xor(b, o[:len(b)]))
    return iv, b"".join(out)


def ofb_decrypt(ciphertext, encrypt_block, block_size, iv):
    # OFB decryption is identical to encryption (XOR with the same keystream).
    _, plain = ofb_encrypt(ciphertext, encrypt_block, block_size, iv)
    return plain


def ctr_encrypt(plaintext, encrypt_block, block_size, nonce=None):
    nonce = nonce or os.urandom(block_size // 2)
    out = []
    counter = 0
    for b in _blocks(plaintext, block_size):
        ctr_block = (nonce + counter.to_bytes(block_size - len(nonce), "big"))
        keystream = encrypt_block(ctr_block)[:len(b)]
        out.append(_xor(b, keystream))
        counter += 1
    return nonce, b"".join(out)


def ctr_decrypt(ciphertext, encrypt_block, block_size, nonce):
    _, plain = ctr_encrypt(ciphertext, encrypt_block, block_size, nonce)
    return plain


def ecb_leak_demo(image_bytes, encrypt_block, block_size):
    """Encrypt raw pixel bytes under ECB (structure survives) vs CTR (structure hidden)."""
    ecb_out = ecb_encrypt(image_bytes, encrypt_block, block_size)
    nonce, ctr_out = ctr_encrypt(image_bytes, encrypt_block, block_size)
    return ecb_out, ctr_out
