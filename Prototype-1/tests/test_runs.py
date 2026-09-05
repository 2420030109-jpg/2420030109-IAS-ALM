from helpers import data_of, error_of


def test_runs_are_logged_then_cleared(client):
    # generate a couple of runs
    client.post("/api/classical/caesar", json={"text": "abc", "shift": 1})
    client.post("/api/prng/lcg", json={"seed": 1, "n": 5})

    runs = data_of(client.get("/api/runs"))
    assert isinstance(runs, list)
    assert len(runs) >= 2
    row = runs[0]
    assert {"id", "module", "algorithm", "params_json", "result_json",
            "elapsed_ms", "created_at"} <= set(row)
    assert isinstance(row["params_json"], str)

    # DELETE clears history for this user
    assert data_of(client.delete("/api/runs")) is None
    assert data_of(client.get("/api/runs")) == []


def test_runs_requires_auth(anon_client):
    assert error_of(anon_client.get("/api/runs")) == "UNAUTHENTICATED"
    assert error_of(anon_client.delete("/api/runs")) == "UNAUTHENTICATED"
