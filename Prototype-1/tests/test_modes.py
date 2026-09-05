from helpers import data_of, error_of

BS = 16


def _dup_blocks(hex_str, block_size=BS):
    raw = bytes.fromhex(hex_str)
    blocks = [raw[i:i + block_size] for i in range(0, len(raw), block_size)
              if len(raw[i:i + block_size]) == block_size]
    return len(blocks) - len(set(blocks))


def test_ecb_leaks_repeats_other_modes_do_not(client):
    key = "00" * 32
    r = client.post("/api/modes/compare", json={"text": "A" * 64, "key_hex": key})
    d = data_of(r)

    assert set(d["results"]) == {"ECB", "CBC", "CFB", "OFB", "CTR"}
    assert d["analysis"]["ecb_repeated_blocks"] > 0
    assert d["analysis"]["total_blocks"] >= 4
    assert _dup_blocks(d["results"]["ECB"]["ciphertext_hex"]) > 0
    for mode in ("CBC", "CFB", "OFB", "CTR"):
        assert _dup_blocks(d["results"][mode]["ciphertext_hex"]) == 0


def test_short_key_is_400_not_500(client):
    r = client.post("/api/modes/compare", json={"text": "A" * 64, "key_hex": "aa"})
    assert r.status_code == 400
    assert error_of(r) == "BAD_KEY"


def test_bad_hex_key_is_400(client):
    r = client.post("/api/modes/compare", json={"text": "hello", "key_hex": "zzzz"})
    assert r.status_code == 400
    assert error_of(r) == "BAD_HEX"
