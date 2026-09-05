import pytest

from helpers import data_of, error_of

KEYS = {
    "des": "0123456789abcdef",                                                  # 8 bytes
    "aes256": "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",  # 32 bytes
}
MODES = ["ECB", "CBC", "CFB", "OFB", "CTR"]
SAMPLE = "The quick brown fox jumps over 13 lazy dogs!"


@pytest.mark.parametrize("algorithm", ["des", "aes256"])
@pytest.mark.parametrize("mode", MODES)
def test_roundtrip_matches(client, algorithm, mode):
    r = client.post("/api/crypto/roundtrip", json={
        "algorithm": algorithm, "text": SAMPLE, "key_hex": KEYS[algorithm], "mode": mode,
    })
    d = data_of(r)
    assert d["mode"] == mode
    assert d["algorithm"] == algorithm
    assert d["match"] is True
    assert d["recovered_plaintext"] == SAMPLE


def test_rc4_roundtrips(client):
    r = client.post("/api/crypto/roundtrip", json={
        "algorithm": "rc4", "text": "stream cipher payload", "key_hex": "s3cr3t-passphrase",
    })
    d = data_of(r)
    assert d["match"] is True
    assert d["recovered_plaintext"] == "stream cipher payload"


def test_encrypt_then_decrypt_endpoints(client):
    key = KEYS["aes256"]
    enc = data_of(client.post("/api/crypto/encrypt", json={
        "algorithm": "aes256", "text": "secret message", "key_hex": key, "mode": "CBC",
    }))
    assert "iv_hex" in enc
    dec = data_of(client.post("/api/crypto/decrypt", json={
        "algorithm": "aes256", "ciphertext_hex": enc["ciphertext_hex"],
        "key_hex": key, "mode": "CBC", "iv_hex": enc["iv_hex"],
    }))
    assert dec["plaintext"] == "secret message"


def test_ctr_needs_nonce(client):
    r = client.post("/api/crypto/decrypt", json={
        "algorithm": "aes256", "ciphertext_hex": "00" * 16, "key_hex": KEYS["aes256"], "mode": "CTR",
    })
    assert r.status_code == 400
    assert error_of(r) == "BAD_REQUEST"


def test_decrypt_wrong_key_length_is_400_bad_key(client):
    r = client.post("/api/crypto/decrypt", json={
        "algorithm": "aes256", "ciphertext_hex": "00" * 16, "key_hex": "aabbccdd", "mode": "ECB",
    })
    assert r.status_code == 400
    assert error_of(r) == "BAD_KEY"


def test_decrypt_bad_hex_is_400_bad_hex(client):
    r = client.post("/api/crypto/decrypt", json={
        "algorithm": "aes256", "ciphertext_hex": "nothex!!", "key_hex": KEYS["aes256"], "mode": "ECB",
    })
    assert r.status_code == 400
    assert error_of(r) == "BAD_HEX"
