"""盈亏计算。后端统一计算，前端直接展示。"""
from typing import Optional

from models import PnL
from services.market import get_quote


def compute_pnl(
    stock_code: str,
    entry_price: float,
    entry_qty: int,
    entry_date: Optional[str] = None,
) -> Optional[PnL]:
    """计算单笔持仓的盈亏。行情取数失败返回 None（前端显示「—」）。

    「今日单日盈亏」的基准随是否跨日持有而不同（与券商「当日参考盈亏」一致）：
      - 行情日 > 买入日：已持有跨日，以昨收为基准  (今收 - 昨收)
      - 否则（买入当日，或行情尚未更新到买入日之后）：以买入价为基准 (收盘 - 买入价)
        —— 买入第一天「今日盈亏」即等于「累计盈亏」。
    「持仓累计盈亏」始终以买入价为基准。
    """
    quote = get_quote(stock_code)
    if quote is None:
        return None

    last_close = quote["last_close"]
    prev_close = quote["prev_close"]
    data_date = quote["data_date"]

    # 累计盈亏（始终基于买入价）
    total_pnl = (last_close - entry_price) * entry_qty
    total_pct = (last_close - entry_price) / entry_price * 100 if entry_price else None

    # 今日盈亏基准：持有跨日用昨收，买入当日用买入价
    if entry_date and data_date and data_date > entry_date:
        base = prev_close
    else:
        base = entry_price
    today_pnl = (last_close - base) * entry_qty
    today_pct = (last_close - base) / base * 100 if base else None

    return PnL(
        last_close=round(last_close, 3),
        prev_close=round(prev_close, 3),
        today_pct=round(today_pct, 2) if today_pct is not None else None,
        today_pnl=round(today_pnl, 2),
        total_pnl=round(total_pnl, 2),
        total_pct=round(total_pct, 2) if total_pct is not None else None,
        data_date=data_date,
    )
