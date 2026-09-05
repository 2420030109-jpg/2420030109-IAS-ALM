from helpers import data_of, error_of


def test_register_duplicate_login_me_logout(anon_client):
    c = anon_client

    r = c.post("/api/auth/register", json={"username": "alice", "password": "secret1"})
    assert r.status_code == 200
    assert data_of(r) is None
    assert r.get_json()["message"] == "registered"

    # duplicate registration -> 409 USER_EXISTS
    r = c.post("/api/auth/register", json={"username": "alice", "password": "secret1"})
    assert r.status_code == 409
    assert error_of(r) == "USER_EXISTS"

    # /me before login
    r = c.get("/api/auth/me")
    assert r.status_code == 200
    assert data_of(r) == {"authenticated": False}

    # wrong password -> 401 BAD_CREDENTIALS
    r = c.post("/api/auth/login", json={"username": "alice", "password": "nope"})
    assert r.status_code == 401
    assert error_of(r) == "BAD_CREDENTIALS"

    # good login
    r = c.post("/api/auth/login", json={"username": "alice", "password": "secret1"})
    assert r.status_code == 200
    assert data_of(r) == {"username": "alice"}

    # /me after login
    d = data_of(c.get("/api/auth/me"))
    assert d["authenticated"] is True
    assert d["username"] == "alice"

    # logout, then /me shows unauthenticated again
    assert c.post("/api/auth/logout").status_code == 200
    assert data_of(c.get("/api/auth/me")) == {"authenticated": False}


def test_missing_fields_is_enveloped(anon_client):
    r = anon_client.post("/api/auth/login", json={"username": "x"})
    assert r.status_code == 400
    assert error_of(r) == "BAD_REQUEST"


def test_protected_endpoint_requires_session(anon_client):
    r = anon_client.post("/api/classical/caesar", json={"text": "hi", "shift": 1})
    assert r.status_code == 401
    assert error_of(r) == "UNAUTHENTICATED"
