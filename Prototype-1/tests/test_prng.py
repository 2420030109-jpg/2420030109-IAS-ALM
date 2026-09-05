from helpers import data_of


def test_lcg_is_deterministic_and_normalized(client):
    payload = {"seed": 424242, "n": 30}
    a = data_of(client.post("/api/prng/lcg", json=payload))
    b = data_of(client.post("/api/prng/lcg", json=payload))

    assert a["sequence"] == b["sequence"]
    assert len(a["sequence"]) == 30
    assert len(a["normalized"]) == 30
    assert all(0.0 <= x < 1.0 for x in a["normalized"])
    assert a["params"]["seed"] == 424242
    assert a["params"]["n"] == 30


def test_bbs_bits_and_blum_primes(client):
    d = data_of(client.post("/api/prng/bbs", json={"seed": 3, "n": 24, "bits": 16}))
    assert len(d["bits"]) == 24
    assert all(bit in (0, 1) for bit in d["bits"])
    assert d["p"] % 4 == 3
    assert d["q"] % 4 == 3
    assert d["n"] == d["p"] * d["q"]


def test_ansi_outputs_are_hex32(client):
    d = data_of(client.post("/api/prng/ansi", json={"n": 5}))
    assert len(d["outputs"]) == 5
    for h in d["outputs"]:
        assert len(h) == 32
        int(h, 16)  # valid hex or raises
