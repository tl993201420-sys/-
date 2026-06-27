"""盈亏计算。后端统一计算，前端直接展示。"""
from typing import Optional

from models import PnL
from services.market import get_quote


def compute_pnl(stock_code: str, entry_price: float, entry_qty: int) -> Optional[PnL]:
    """计算单笔持仓的盈亏。行情取数失败返回 None（前端显示「—」）。"""
    quote = get_quote(stock_code)
    if quote is None:
        return None

    last_close = quote["last_close"]
    prev_close = quote["prev_close"]

    today_pct = (last_close - prev_close) / prev_close * 100 if prev_close else None
    today_pnl = (last_close - prev_close) * entry_qty
    total_pnl = (last_close - entry_price) * entry_qty
    total_pct = (last_close - entry_price) / entry_price * 100 if entry_price else None

    return PnL(
        last_close=round(last_close, 3),
        prev_close=round(prev_close, 3),
        today_pct=round(today_pct, 2) if today_pct is not None else None,
        today_pnl=round(today_pnl, 2),
        total_pnl=round(total_pnl, 2),
        total_pct=round(total_pct, 2) if total_pct is not None else None,
        data_date=quote["data_date"],
    )
