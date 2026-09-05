import os


def lcg(seed, n, a=1103515245, c=12345, m=2 ** 31):
    x = seed
    out = []
    for _ in range(n):
        x = (a * x + c) % m
        out.append(x)
    return out


def _is_probable_prime(n, k=20):
    if n < 2:
        return False
    for p in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]:
        if n % p == 0:
            return n == p
    d, r = n - 1, 0
    while d % 2 == 0:
        d //= 2
        r += 1
    import random
    for _ in range(k):
        a = random.randrange(2, n - 1)
        x = pow(a, d, n)
        if x == 1 or x == n - 1:
            continue
        for _ in range(r - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False
    return True


def _blum_prime(bits):
    import random
    while True:
        cand = random.getrandbits(bits) | (1 << (bits - 1)) | 1
        if cand % 4 == 3 and _is_probable_prime(cand):
            return cand


def bbs(seed=None, n=20, bits=16):
    """Blum Blum Shub. bits controls prime size (small so the demo is fast)."""
    p = _blum_prime(bits)
    q = _blum_prime(bits)
    while q == p:
        q = _blum_prime(bits)
    modulus = p * q
    x = (seed or 3) % modulus
    if x <= 1:
        x = 3
    x = (x * x) % modulus
    out_bits = []
    values = []
    for _ in range(n):
        x = (x * x) % modulus
        values.append(x)
        out_bits.append(x & 1)
    return {"p": p, "q": q, "n": modulus, "bits": out_bits, "values": values}


def ansi_x917(key32, seed8, n=5):
    """ANSI X9.17-style PRNG using AES as the underlying block cipher (24CS3105 report variant)."""
    import time
    from Crypto.Cipher import AES
    cipher = AES.new(key32, AES.MODE_ECB)
    V = seed8.ljust(16, b"\0")[:16]
    outputs = []
    for _ in range(n):
        dt = int(time.time() * 1000).to_bytes(16, "big", signed=False)[-16:]
        edt = cipher.encrypt(dt)
        Ri = cipher.encrypt(bytes(a ^ b for a, b in zip(V, edt)))
        V = cipher.encrypt(bytes(a ^ b for a, b in zip(Ri, edt)))
        outputs.append(Ri.hex())
    return outputs
