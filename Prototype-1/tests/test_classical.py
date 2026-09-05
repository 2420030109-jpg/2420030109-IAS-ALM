import pytest

from helpers import data_of

ENGLISH = (
    "the quick brown fox jumps over the lazy dog near the river bank while "
    "the golden sun sets slowly behind the ancient snow capped mountains"
)


def test_caesar_encrypt_then_decrypt_roundtrips(client):
    r = client.post("/api/classical/caesar", json={"text": "HELLO WORLD", "shift": 3})
    enc = data_of(r)
    assert enc["action"] == "encrypt"
    assert enc["shift"] == 3
    assert enc["output"] != "HELLO WORLD"

    r = client.post(
        "/api/classical/caesar",
        json={"text": enc["output"], "shift": 3, "action": "decrypt"},
    )
    dec = data_of(r)
    assert dec["action"] == "decrypt"
    assert dec["output"] == "HELLO WORLD"


def test_caesar_frequency_dicts_sum_to_100(client):
    r = client.post("/api/classical/caesar", json={"text": ENGLISH, "shift": 5})
    d = data_of(r)
    for name in ("input_frequency", "output_frequency"):
        freq = d[name]
        assert len(freq) == 26
        assert sum(freq.values()) == pytest.approx(100.0, abs=1.0)


def test_caesar_attack_recovers_shift(client):
    r = client.post("/api/classical/caesar", json={"text": ENGLISH, "shift": 7})
    ciphertext = data_of(r)["output"]

    r = client.post("/api/classical/caesar/attack", json={"ciphertext": ciphertext})
    d = data_of(r)
    assert d["recovered_shift"] == 7
    assert d["recovered_plaintext"] == ENGLISH.upper()
    assert len(d["candidates"]) == 26
    assert {"shift", "candidate", "chi_squared"} <= set(d["candidates"][0])
    assert "elapsed_seconds" in d


def test_playfair_encrypt_decrypt_recovers_text(client):
    r = client.post(
        "/api/classical/playfair",
        json={"text": "HELLOWORLD", "key": "MONARCHY"},
    )
    enc = data_of(r)
    assert len(enc["key_square"]) == 5
    assert all(len(row) == 5 for row in enc["key_square"])
    assert enc["output"] != "HELLOWORLD"

    r = client.post(
        "/api/classical/playfair",
        json={"text": enc["output"], "key": "MONARCHY", "action": "decrypt"},
    )
    dec = data_of(r)
    # standard Playfair 'X' padding is allowed to differ
    assert dec["output"].replace("X", "") == "HELLOWORLD".replace("X", "")
