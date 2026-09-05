"""
Shared pytest fixtures.

Each test gets a *fresh* Flask app wired to a throw-away SQLite file: we set the
CRYPTOSHIELD_DB env var (read by database.py at import time) to a path under
pytest's tmp_path, then drop `app`/`database` from sys.modules so importing `app`
rebuilds everything against the temp DB.
"""
import sys

import pytest

_TEST_USER = {"username": "tester", "password": "Passw0rd!"}


@pytest.fixture()
def app_module(tmp_path, monkeypatch):
    db_path = tmp_path / "cryptoshield_test.db"
    monkeypatch.setenv("CRYPTOSHIELD_DB", str(db_path))
    sys.modules.pop("app", None)
    sys.modules.pop("database", None)
    import app as app_mod  # noqa: WPS433  (fresh import against the temp DB)
    # NB: we deliberately do NOT set TESTING=True — the contract requires that
    # even unexpected errors come back as a JSON envelope (never a bare 500),
    # and that is exactly the production error-handling path we want to test.
    return app_mod


@pytest.fixture()
def anon_client(app_module):
    """An unauthenticated test client (for the 401 paths)."""
    return app_module.app.test_client()


@pytest.fixture()
def client(app_module):
    """An authenticated test client: a fresh user is registered and logged in."""
    c = app_module.app.test_client()
    r = c.post("/api/auth/register", json=_TEST_USER)
    assert r.status_code == 200, r.data
    r = c.post("/api/auth/login", json=_TEST_USER)
    assert r.status_code == 200, r.data
    return c
