"""统计分析 API（Phase 3）。基于已平仓交易与复盘数据。"""
from fastapi import APIRouter

from database import get_conn

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _realized(row) -> float:
    return (row["exit_price"] - row["entry_price"]) * row["entry_qty"]


@router.get("/summary")
def summary():
    """总体统计：总笔数 / 已平仓 / 胜率 / 平均盈亏比 / 平均纪律分。"""
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) c FROM trades").fetchone()["c"]
        closed = conn.execute(
            "SELECT entry_price, entry_qty, exit_price FROM trades "
            "WHERE status='closed' AND exit_price IS NOT NULL"
        ).fetchall()
        avg_score_row = conn.execute(
            "SELECT AVG(discipline_score) s FROM discipline_reviews"
        ).fetchone()

    pnls = [_realized(r) for r in closed]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p < 0]
    closed_count = len(pnls)

    win_rate = round(len(wins) / closed_count * 100, 2) if closed_count else None
    avg_win = sum(wins) / len(wins) if wins else 0.0
    avg_loss = abs(sum(losses) / len(losses)) if losses else 0.0
    profit_loss_ratio = round(avg_win / avg_loss, 2) if avg_loss else None
    avg_discipline = round(avg_score_row["s"], 2) if avg_score_row["s"] is not None else None

    return {
        "total_trades": total,
        "closed_trades": closed_count,
        "win_count": len(wins),
        "loss_count": len(losses),
        "win_rate": win_rate,                  # 胜率 %
        "profit_loss_ratio": profit_loss_ratio,  # 平均盈亏比
        "avg_win": round(avg_win, 2),
        "avg_loss": round(avg_loss, 2),
        "avg_discipline": avg_discipline,      # 平均纪律分
    }


@router.get("/by-reason")
def by_reason():
    """按买入理由分组的胜率（理由为逗号分隔标签，一笔可计入多个标签）。"""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT entry_reason, entry_price, entry_qty, exit_price FROM trades "
            "WHERE status='closed' AND exit_price IS NOT NULL"
        ).fetchall()

    buckets: dict[str, dict] = {}
    for r in rows:
        pnl = _realized(r)
        for tag in (r["entry_reason"] or "").split(","):
            tag = tag.strip()
            if not tag:
                continue
            b = buckets.setdefault(tag, {"reason": tag, "count": 0, "wins": 0})
            b["count"] += 1
            if pnl > 0:
                b["wins"] += 1

    result = []
    for b in buckets.values():
        b["win_rate"] = round(b["wins"] / b["count"] * 100, 2) if b["count"] else 0
        result.append(b)
    result.sort(key=lambda x: (-x["count"], x["reason"]))
    return result


@router.get("/discipline")
def discipline_trend():
    """纪律分时间趋势：按复盘创建时间排序的评分序列。"""
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT dr.discipline_score AS score, dr.created_at AS created_at,
                   t.stock_name AS stock_name, t.exit_date AS exit_date
            FROM discipline_reviews dr
            JOIN trades t ON t.id = dr.trade_id
            ORDER BY COALESCE(t.exit_date, dr.created_at) ASC, dr.id ASC
            """
        ).fetchall()
    return [
        {
            "date": (r["exit_date"] or (r["created_at"] or "")[:10]),
            "score": r["score"],
            "stock_name": r["stock_name"],
        }
        for r in rows
    ]


@router.get("/violations")
def violations():
    """纪律违规统计：未按止损执行次数 / 情绪性卖出次数。"""
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) c FROM discipline_reviews").fetchone()["c"]
        not_followed = conn.execute(
            "SELECT COUNT(*) c FROM discipline_reviews WHERE followed_stop_loss=0"
        ).fetchone()["c"]
        emotional = conn.execute(
            "SELECT COUNT(*) c FROM discipline_reviews WHERE actual_exit_reason='emotional'"
        ).fetchone()["c"]
    return {
        "reviews_total": total,
        "not_followed_stop_loss": not_followed,
        "emotional_exit": emotional,
    }
