import psycopg2
import requests
import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "")


def _pg_connect():
    return psycopg2.connect(
        host="localhost", port=5432,
        user="postgres", password="admin123", dbname="antigravity"
    )


def test_health():
    r = requests.get("http://localhost:8000/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_db_deal_table():
    conn = _pg_connect()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM deal")
    count = cur.fetchone()[0]
    cur.close()
    conn.close()
    assert count >= 0


def test_db_user_table():
    conn = _pg_connect()
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) FROM "user"')
    count = cur.fetchone()[0]
    cur.close()
    conn.close()
    assert count > 0


def test_login():
    r = requests.post(
        "http://localhost:8000/auth/login",
        data={"username": "admin", "password": "admin123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200
    body = r.json()
    assert "user" in body
    assert body["user"]["username"] == "admin"
    # Token dans cookie HttpOnly (pas dans le body)
    assert "access_token" in r.cookies


def test_rate_limit():
    # 6 tentatives avec mauvais mdp -> la 6e doit retourner 429
    for _ in range(5):
        requests.post(
            "http://localhost:8000/auth/login",
            data={"username": "admin", "password": "wrong"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    r = requests.post(
        "http://localhost:8000/auth/login",
        data={"username": "admin", "password": "wrong"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 429


def test_cors_invalid_origin():
    r = requests.get(
        "http://localhost:8000/health",
        headers={"Origin": "https://evil.com"},
    )
    # CORS invalide: pas d'Access-Control-Allow-Origin pour evil.com
    assert r.headers.get("access-control-allow-origin") != "https://evil.com"
