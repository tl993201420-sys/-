"""SQLite 连接与建表。使用标准库 sqlite3，保持轻量（无 ORM）。"""
import os
import sqlite3
from contextlib import contextmanager

# 数据库路径：容器内默认 /app/data/trading.db；本地默认 ./data/trading.db
DATABASE_PATH = os.environ.get("DATABASE_PATH", os.path.join("data", "trading.db"))


def _connect() -> sqlite3.Connection:
    # 确保父目录存在
    db_dir = os.path.dirname(DATABASE_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_conn():
    """上下文管理：自动提交/回滚并关闭连接。"""
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ---- 建表 SQL（与规划文档一致）----

CREATE_TRADES = """
CREATE TABLE IF NOT EXISTS trades (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_code      TEXT NOT NULL,
    stock_name      TEXT NOT NULL,
    direction       TEXT DEFAULT 'long',
    entry_price     REAL NOT NULL,
    entry_qty       INTEGER NOT NULL,
    entry_date      TEXT NOT NULL,
    position_pct    REAL NOT NULL,
    stop_loss       REAL NOT NULL,
    target_price    REAL NOT NULL,
    entry_reason    TEXT NOT NULL,
    entry_note      TEXT,
    exit_price      REAL,
    exit_date       TEXT,
    exit_reason     TEXT,
    status          TEXT DEFAULT 'open',
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);
"""

CREATE_DISCIPLINE_REVIEWS = """
CREATE TABLE IF NOT EXISTS discipline_reviews (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id            INTEGER NOT NULL REFERENCES trades(id),
    followed_stop_loss  INTEGER NOT NULL,
    actual_exit_reason  TEXT NOT NULL,
    discipline_score    INTEGER NOT NULL,
    review_q1           TEXT,
    review_q2           TEXT,
    review_q3           TEXT,
    review_q4           TEXT,
    created_at          TEXT DEFAULT (datetime('now'))
);
"""

CREATE_MARKET_CACHE = """
CREATE TABLE IF NOT EXISTS market_cache (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_code  TEXT NOT NULL,
    trade_date  TEXT NOT NULL,
    open        REAL,
    high        REAL,
    low         REAL,
    close       REAL,
    volume      REAL,
    cached_at   TEXT DEFAULT (datetime('now')),
    UNIQUE(stock_code, trade_date)
);
"""


def init_db() -> None:
    """创建三张表（幂等）。FastAPI startup 时调用。"""
    with get_conn() as conn:
        conn.execute(CREATE_TRADES)
        conn.execute(CREATE_DISCIPLINE_REVIEWS)
        conn.execute(CREATE_MARKET_CACHE)
