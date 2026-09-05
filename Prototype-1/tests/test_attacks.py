from helpers import data_of


def test_known_plaintext_recovers_rc4_keystream(client):
    known = "ATTACK AT DAWN"
    enc = data_of(client.post("/api/crypto/encrypt", json={
        "algorithm": "rc4", "text": known, "key_hex": "battle-key",
    }))
    ct = bytes.fromhex(enc["ciphertext_hex"])

    r = client.post("/api/attack/known-plaintext", json={
        "ciphertext_hex": enc["ciphertext_hex"], "known_plaintext": known,
    })
    d = data_of(r)
    keystream = bytes.fromhex(d["recovered_keystream_hex"])
    assert bytes(c ^ k for c, k in zip(ct, keystream)) == known.encode()
    assert d["success"] is True


def test_ecb_leakage_shows_more_repeats_than_ctr(client):
    d = data_of(client.post("/api/attack/ecb-leakage", json={
        "block_repeats": 8, "pattern_byte": 65,
    }))
    assert d["ecb_repeated_blocks"] > d["ctr_repeated_blocks"]
    assert d["ecb_repeated_blocks"] > 0
    assert d["success"] is True


def test_frequency_attack_endpoint_recovers_shift(client):
    plain = ("we hold these truths to be self evident that all men are created "
             "equal in the eyes of the law and of history")
    enc = data_of(client.post("/api/classical/caesar", json={"text": plain, "shift": 11}))
    r = client.post("/api/attack/frequency", json={"ciphertext": enc["output"]})
    d = data_of(r)
    assert d["recovered_shift"] == 11
    assert d["recovered_plaintext"] == plain.upper()
    assert d["success"] is True


def test_bruteforce_endpoint_shape(client):
    enc = data_of(client.post("/api/sdes/encrypt", json={"text": "Zebra", "key": 511}))
    r = client.post("/api/attack/bruteforce", json={
        "ciphertext_hex": enc["ciphertext_hex"], "known_first_plain_byte": ord("Z"),
    })
    d = data_of(r)
    assert d["success"] is True
    assert d["keys_tried"] >= 1
    assert d["recovered_key"] is not None
