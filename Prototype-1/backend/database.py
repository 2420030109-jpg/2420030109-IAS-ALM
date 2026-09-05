"""
Persistence layer: users + run history.

Two backends behind one interface:
  * PostgreSQL (Neon) when DATABASE_URL is set - the real deployment target.
  * SQLite when it isn't, or whenever CRYPTOSHIELD_DB is set.

CRYPTOSHIELD_DB deliberately wins over DATABASE_URL: the pytest suite points it
at a throw-away file, so tests stay fast and can never write to the hosted DB.
"""
import json
import os
import sqlite3
import time

_DATABASE_URL = (os.environ.get("DATABASE_URL") or "").strip()
_SQLITE_OVERRIDE = (os.environ.get("CRYPTOSHIELD_DB") or "").strip()

USE_POSTGRES = bool(_DATABASE_URL) and not _SQLITE_OVERRIDE

DB_PATH = _SQLITE_OVERRIDE or os.path.join(os.path.dirname(__file__), "cryptoshield.db")

# Parameter placeholder differs between the two drivers.
PH = "%s" if USE_POSTGRES else "?"


def backend_name():
    return "postgresql" if USE_POSTGRES else "sqlite"


if USE_POSTGRES:
    import psycopg
    from psycopg.rows import dict_row

    def get_conn():
        return psycopg.connect(_DATABASE_URL, row_factory=dict_row)

else:

    def get_conn():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn


_SCHEMA_PG = [
    """
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DOUBLE PRECISION NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS runs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        module TEXT NOT NULL,
        algorithm TEXT,
        params_json TEXT,
        result_json TEXT,
        elapsed_ms DOUBLE PRECISION,
        created_at DOUBLE PRECISION NOT NULL
    )
    """,
]

_SCHEMA_SQLITE = [
    """
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at REAL NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        module TEXT NOT NULL,
        algorithm TEXT,
        params_json TEXT,
        result_json TEXT,
        elapsed_ms REAL,
        created_at REAL NOT NULL
    )
    """,
]


def init_db():
    statements = _SCHEMA_PG if USE_POSTGRES else _SCHEMA_SQLITE
    conn = get_conn()
    try:
        for stmt in statements:
            conn.execute(stmt)
        conn.commit()
    finally:
        conn.close()


def create_user(username, password_hash):
    conn = get_conn()
    try:
        conn.execute(
            f"INSERT INTO users (username, password_hash, created_at) VALUES ({PH}, {PH}, {PH})",
            (username, password_hash, time.time()),
        )
        conn.commit()
    finally:
        conn.close()


def get_user(username):
    sql = f"SELECT * FROM users WHERE username = {PH}"
    conn = get_conn()
    try:
        if USE_POSTGRES:
            with conn.cursor() as cur:
                cur.execute(sql, (username,))
                return cur.fetchone()
        return conn.execute(sql, (username,)).fetchone()
    finally:
        conn.close()


def ensure_user(username, password_hash):
    """Create the user only if it doesn't exist. Used to seed the demo login."""
    if get_user(username):
        return False
    create_user(username, password_hash)
    return True


def log_run(user_id, module, algorithm, params, result, elapsed_ms):
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO runs (user_id, module, algorithm, params_json, result_json, elapsed_ms, created_at) "
            f"VALUES ({PH}, {PH}, {PH}, {PH}, {PH}, {PH}, {PH})",
            (user_id, module, algorithm, json.dumps(params), json.dumps(result),
             elapsed_ms, time.time()),
        )
        conn.commit()
    finally:
        conn.close()


def get_runs(user_id, limit=50):
    sql = f"SELECT * FROM runs WHERE user_id = {PH} ORDER BY id DESC LIMIT {PH}"
    conn = get_conn()
    try:
        if USE_POSTGRES:
            with conn.cursor() as cur:
                cur.execute(sql, (user_id, limit))
                return [dict(r) for r in cur.fetchall()]
        return [dict(r) for r in conn.execute(sql, (user_id, limit)).fetchall()]
    finally:
        conn.close()


def clear_runs(user_id):
    """Delete every run belonging to a single user (history 'clear' button)."""
    conn = get_conn()
    try:
        conn.execute(f"DELETE FROM runs WHERE user_id = {PH}", (user_id,))
        conn.commit()
    finally:
        conn.close()
