import sqlite3
import os
import json
import time

# The DB location can be overridden with the CRYPTOSHIELD_DB env var (used by the
# test-suite to point the app at a throw-away SQLite file).
DB_PATH = os.environ.get("CRYPTOSHIELD_DB") or os.path.join(
    os.path.dirname(__file__), "cryptoshield.db"
)


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            module TEXT NOT NULL,
            algorithm TEXT,
            params_json TEXT,
            result_json TEXT,
            elapsed_ms REAL,
            created_at REAL NOT NULL
        );
        """
    )
    conn.commit()
    conn.close()


def create_user(username, password_hash):
    conn = get_conn()
    conn.execute(
        "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
        (username, password_hash, time.time()),
    )
    conn.commit()
    conn.close()


def get_user(username):
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    return row


def log_run(user_id, module, algorithm, params, result, elapsed_ms):
    conn = get_conn()
    conn.execute(
        "INSERT INTO runs (user_id, module, algorithm, params_json, result_json, elapsed_ms, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, module, algorithm, json.dumps(params), json.dumps(result), elapsed_ms, time.time()),
    )
    conn.commit()
    conn.close()


def get_runs(user_id, limit=50):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM runs WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user_id, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def clear_runs(user_id):
    """Delete every run belonging to a single user (history 'clear' button)."""
    conn = get_conn()
    conn.execute("DELETE FROM runs WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
