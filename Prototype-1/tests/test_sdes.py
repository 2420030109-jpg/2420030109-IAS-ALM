from helpers import data_of, error_of


def _bits(value, width):
    return [(value >> (width - 1 - i)) & 1 for i in range(width)]


def test_sdes_encrypt_decrypt_roundtrip_and_trace(client):
    r = client.post("/api/sdes/encrypt", json={"text": "Hi", "key": 42})
    enc = data_of(r)
    assert enc["key_bits"] == _bits(42, 10)
    assert len(enc["blocks"]) == 2
    assert enc["blocks"][0] == {"char": "H", "plain_byte": ord("H"),
                                "cipher_byte": int(enc["ciphertext_hex"][0:2], 16)}

    trace = enc["first_byte_trace"]
    assert "IP" in trace
    assert "SW" in trace
    assert "key_schedule" in trace
    assert any(k.startswith("round1") for k in trace)
    assert any(k.startswith("round2") for k in trace)

    r = client.post("/api/sdes/decrypt",
                    json={"ciphertext_hex": enc["ciphertext_hex"], "key": 42})
    dec = data_of(r)
    assert dec["plaintext"] == "Hi"
    assert dec["key_bits"] == _bits(42, 10)
    assert "IP" in dec["first_byte_trace"]


def test_sdes_bruteforce_recovers_key(client):
    # single-byte message: the 10-bit key is then uniquely pinned by the known
    # plaintext byte for this instance.
    text, key = "H", 300
    enc = data_of(client.post("/api/sdes/encrypt", json={"text": text, "key": key}))
    ct_hex = enc["ciphertext_hex"]

    r = client.post("/api/attack/bruteforce",
                    json={"ciphertext_hex": ct_hex, "known_first_plain_byte": ord("H")})
    d = data_of(r)
    assert d["success"] is True
    assert d["recovered_key"] is not None
    assert 0 <= d["recovered_key"] <= 1023
    assert d["keys_tried"] <= 1024

    # the recovered key decrypts the ciphertext back to the known plaintext
    dec = data_of(client.post("/api/sdes/decrypt",
                              json={"ciphertext_hex": ct_hex, "key": d["recovered_key"]}))
    assert dec["plaintext"] == text


def test_sdes_empty_text_is_rejected(client):
    r = client.post("/api/sdes/encrypt", json={"text": "", "key": 1})
    assert r.status_code == 400
    assert error_of(r) == "BAD_REQUEST"
