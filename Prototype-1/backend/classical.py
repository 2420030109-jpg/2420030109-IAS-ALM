import string
from collections import Counter

ALPHA = string.ascii_uppercase


def caesar_encrypt(text, shift):
    out = []
    for ch in text.upper():
        if ch in ALPHA:
            out.append(ALPHA[(ALPHA.index(ch) + shift) % 26])
        else:
            out.append(ch)
    return "".join(out)


def caesar_decrypt(text, shift):
    return caesar_encrypt(text, -shift)


def letter_frequency(text):
    text = [c for c in text.upper() if c in ALPHA]
    counts = Counter(text)
    total = max(len(text), 1)
    return {c: round(counts.get(c, 0) / total * 100, 2) for c in ALPHA}


# Standard English letter-frequency table (percent), used for chi-squared scoring.
ENGLISH_FREQ = {
    "A": 8.20, "B": 1.50, "C": 2.80, "D": 4.30, "E": 12.70, "F": 2.20, "G": 2.00,
    "H": 6.10, "I": 7.00, "J": 0.15, "K": 0.77, "L": 4.00, "M": 2.40, "N": 6.70,
    "O": 7.50, "P": 1.90, "Q": 0.095, "R": 6.00, "S": 6.30, "T": 9.10, "U": 2.80,
    "V": 0.98, "W": 2.40, "X": 0.15, "Y": 2.00, "Z": 0.074,
}


def _chi_squared(freq):
    return sum(((freq.get(c, 0) - ENGLISH_FREQ[c]) ** 2) / ENGLISH_FREQ[c] for c in ALPHA)


def caesar_frequency_attack(ciphertext):
    """Try all 26 shifts, score each candidate against standard English letter
    frequencies with a chi-squared statistic; the lowest score wins."""
    best_shift, best_score = 0, float("inf")
    results = []
    for shift in range(26):
        candidate = caesar_decrypt(ciphertext, shift)
        freq = letter_frequency(candidate)
        score = round(_chi_squared(freq), 2)
        results.append({"shift": shift, "candidate": candidate, "chi_squared": score})
        if score < best_score:
            best_score, best_shift = score, shift
    return best_shift, results


def _prepare_playfair_key(key):
    key = "".join(dict.fromkeys(key.upper().replace("J", "I")))
    alphabet = "ABCDEFGHIKLMNOPQRSTUVWXYZ"  # no J
    seen = set(key)
    full = key + "".join(c for c in alphabet if c not in seen)
    return [full[i:i + 5] for i in range(0, 25, 5)]


def _find_pos(grid, ch):
    for r, row in enumerate(grid):
        if ch in row:
            return r, row.index(ch)
    return None


def _prepare_digraphs(text):
    text = "".join(c for c in text.upper() if c.isalpha()).replace("J", "I")
    pairs = []
    i = 0
    while i < len(text):
        a = text[i]
        b = text[i + 1] if i + 1 < len(text) else "X"
        if a == b:
            pairs.append((a, "X"))
            i += 1
        else:
            pairs.append((a, b))
            i += 2
    if len(pairs) and len(pairs[-1][1]) == 0:
        pairs[-1] = (pairs[-1][0], "X")
    return pairs


def playfair_encrypt(text, key):
    grid = _prepare_playfair_key(key)
    pairs = _prepare_digraphs(text)
    out = []
    for a, b in pairs:
        ra, ca = _find_pos(grid, a)
        rb, cb = _find_pos(grid, b)
        if ra == rb:
            out.append(grid[ra][(ca + 1) % 5])
            out.append(grid[rb][(cb + 1) % 5])
        elif ca == cb:
            out.append(grid[(ra + 1) % 5][ca])
            out.append(grid[(rb + 1) % 5][cb])
        else:
            out.append(grid[ra][cb])
            out.append(grid[rb][ca])
    return "".join(out), grid


def playfair_decrypt(text, key):
    grid = _prepare_playfair_key(key)
    pairs = [(text[i], text[i + 1]) for i in range(0, len(text) - 1, 2)]
    out = []
    for a, b in pairs:
        ra, ca = _find_pos(grid, a)
        rb, cb = _find_pos(grid, b)
        if ra == rb:
            out.append(grid[ra][(ca - 1) % 5])
            out.append(grid[rb][(cb - 1) % 5])
        elif ca == cb:
            out.append(grid[(ra - 1) % 5][ca])
            out.append(grid[(rb - 1) % 5][cb])
        else:
            out.append(grid[ra][cb])
            out.append(grid[rb][ca])
    return "".join(out)
