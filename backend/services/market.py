"""行情服务：通过 AkShare 获取最新收盘价/昨收，并用 market_cache 缓存。

数据为 T+1（当日数据次日更新），适合复盘，不提供实时行情。
"""
import datetime as dt
from typing import Optional, TypedDict

from database import get_conn


class Quote(TypedDict):
    last_close: float
    prev_close: float
    data_date: str  # 最新交易日 YYYY-MM-DD


def _today() -> str:
    return dt.date.today().isoformat()


def _read_cache(stock_code: str) -> Optional[Quote]:
    """从 market_cache 读取最近两条记录；仅当数据是今天抓取的（cached_at 为今天）才视为新鲜。"""
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT trade_date, close, cached_at
            FROM market_cache
            WHERE stock_code = ?
            ORDER BY trade_date DESC
            LIMIT 2
            """,
            (stock_code,),
        ).fetchall()

    if len(rows) < 2:
        return None
    # 新鲜度：最新一行今天抓取过才复用，否则重新拉取
    cached_at = (rows[0]["cached_at"] or "")[:10]
    if cached_at != _today():
        return None
    return Quote(
        last_close=float(rows[0]["close"]),
        prev_close=float(rows[1]["close"]),
        data_date=str(rows[0]["trade_date"]),
    )


def _write_cache(stock_code: str, records: list[dict]) -> None:
    """将 K 线记录 upsert 进缓存。records: [{date, open, high, low, close, volume}]"""
    now = dt.datetime.now().isoformat(sep=" ", timespec="seconds")
    with get_conn() as conn:
        for r in records:
            conn.execute(
                """
                INSERT INTO market_cache
                    (stock_code, trade_date, open, high, low, close, volume, cached_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(stock_code, trade_date) DO UPDATE SET
                    open=excluded.open, high=excluded.high, low=excluded.low,
                    close=excluded.close, volume=excluded.volume, cached_at=excluded.cached_at
                """,
                (
                    stock_code, r["date"], r.get("open"), r.get("high"),
                    r.get("low"), r.get("close"), r.get("volume"), now,
                ),
            )


def _fetch_akshare(stock_code: str) -> Optional[list[dict]]:
    """调用 AkShare 拉取最近约 15 个交易日的日K（前复权）。失败返回 None。"""
    try:
        import akshare as ak
        import pandas as pd

        start = (dt.date.today() - dt.timedelta(days=30)).strftime("%Y%m%d")
        end = dt.date.today().strftime("%Y%m%d")
        df = ak.stock_zh_a_hist(
            symbol=stock_code, period="daily",
            start_date=start, end_date=end, adjust="qfq",
        )
        if df is None or df.empty:
            return None
        df = df[["日期", "开盘", "最高", "最低", "收盘", "成交量"]].rename(
            columns={"日期": "date", "开盘": "open", "最高": "high",
                     "最低": "low", "收盘": "close", "成交量": "volume"}
        )
        df["date"] = df["date"].astype(str)
        return df.to_dict(orient="records")
    except Exception as exc:  # noqa: BLE001 - 行情失败需降级，不可中断接口
        print(f"[market] AkShare 取数失败 {stock_code}: {exc}")
        return None


def get_quote(stock_code: str) -> Optional[Quote]:
    """获取最新收盘价与昨收。优先用当日缓存，否则拉 AkShare 并回写缓存。"""
    cached = _read_cache(stock_code)
    if cached:
        return cached

    records = _fetch_akshare(stock_code)
    if not records or len(records) < 2:
        # 拉取失败时，尝试用历史缓存（即便不新鲜）兜底
        with get_conn() as conn:
            rows = conn.execute(
                "SELECT trade_date, close FROM market_cache WHERE stock_code=? "
                "ORDER BY trade_date DESC LIMIT 2",
                (stock_code,),
            ).fetchall()
        if len(rows) >= 2:
            return Quote(
                last_close=float(rows[0]["close"]),
                prev_close=float(rows[1]["close"]),
                data_date=str(rows[0]["trade_date"]),
            )
        return None

    _write_cache(stock_code, records)
    last, prev = records[-1], records[-2]
    return Quote(
        last_close=float(last["close"]),
        prev_close=float(prev["close"]),
        data_date=str(last["date"]),
    )
