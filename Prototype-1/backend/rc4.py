"""RC4 stream cipher: Key-Scheduling Algorithm (KSA) + Pseudo-Random Generation Algorithm (PRGA)."""


def ksa(key_bytes):
    S = list(range(256))
    j = 0
    keylen = len(key_bytes)
    for i in range(256):
        j = (j + S[i] + key_bytes[i % keylen]) % 256
        S[i], S[j] = S[j], S[i]
    return S


def prga(S, n_bytes):
    S = S.copy()
    i = j = 0
    out = []
    for _ in range(n_bytes):
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        out.append(S[(S[i] + S[j]) % 256])
    return out


def keystream(key_bytes, n_bytes):
    return prga(ksa(key_bytes), n_bytes)


def encrypt(plaintext_bytes, key_bytes):
    ks = keystream(key_bytes, len(plaintext_bytes))
    return bytes(p ^ k for p, k in zip(plaintext_bytes, ks))


def decrypt(ciphertext_bytes, key_bytes):
    # XOR stream cipher: decryption is identical to encryption.
    return encrypt(ciphertext_bytes, key_bytes)
