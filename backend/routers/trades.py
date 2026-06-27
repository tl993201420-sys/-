"""交易记录 API。"""
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from database import get_conn
from models import PnLSummary, TradeClose, TradeCreate, TradeOut
from services.pnl import compute_pnl

router = APIRouter(prefix="/api/trades", tags=["trades"])

_INSERT_COLS = (
    "stock_code, stock_name, direction, entry_price, entry_qty, entry_date, "
    "position_pct, stop_loss, target_price, entry_reason, entry_note, status"
)


def _row_to_out(row, with_pnl: bool, conn=None) -> TradeOut:
    data = dict(row)
    pnl = None
    realized_pnl = realized_pct = discipline_score = None
    has_review = False

    if data["status"] == "open":
        if with_pnl:
            pnl = compute_pnl(
                data["stock_code"], data["entry_price"], data["entry_qty"],
                data["entry_date"],
            )
    elif data["status"] == "closed" and data.get("exit_price"):
        # 已平仓：最终盈亏 = (卖出价 - 买入价) × 数量
        diff = data["exit_price"] - data["entry_price"]
        realized_pnl = round(diff * data["entry_qty"], 2)
        realized_pct = round(diff / data["entry_price"] * 100, 2) if data["entry_price"] else None
        if conn is not None:
            review = conn.execute(
                "SELECT discipline_score FROM discipline_reviews WHERE trade_id = ?",
                (data["id"],),
            ).fetchone()
            if review:
                has_review = True
                discipline_score = review["discipline_score"]

    return TradeOut(
        **data, pnl=pnl, realized_pnl=realized_pnl, realized_pct=realized_pct,
        discipline_score=discipline_score, has_review=has_review,
    )


@router.post("", response_model=TradeOut)
@router.post("/", response_model=TradeOut)
def create_trade(payload: TradeCreate):
    """新建交易（买入）。止损价/目标价缺失由 Pydantic 拦截返回 422。"""
    with get_conn() as conn:
        cur = conn.execute(
            f"INSERT INTO trades ({_INSERT_COLS}) VALUES "
            "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')",
            (
                payload.stock_code, payload.stock_name, payload.direction,
                payload.entry_price, payload.entry_qty, payload.entry_date,
                payload.position_pct, payload.stop_loss, payload.target_price,
                payload.entry_reason, payload.entry_note,
            ),
        )
        new_id = cur.lastrowid
        row = conn.execute("SELECT * FROM trades WHERE id = ?", (new_id,)).fetchone()
    # 新建后不强制拉行情（避免阻塞录入），列表页再计算
    return _row_to_out(row, with_pnl=False)


@router.get("", response_model=list[TradeOut])
@router.get("/", response_model=list[TradeOut])
def list_trades(status: str = Query(default="open", pattern="^(open|closed|all)$")):
    """交易列表。status=open(默认)/closed/all。持仓中(open)附带盈亏数据。"""
    sql = "SELECT * FROM trades"
    params: tuple = ()
    if status != "all":
        sql += " WHERE status = ?"
        params = (status,)
    sql += " ORDER BY entry_date DESC, id DESC"

    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
        return [_row_to_out(r, with_pnl=True, conn=conn) for r in rows]


@router.get("/pnl-summary", response_model=PnLSummary)
def pnl_summary():
    """所有持仓的盈亏汇总：今日总盈亏 / 持仓总盈亏。"""
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM trades WHERE status = 'open'").fetchall()

    today_total = 0.0
    holding_total = 0.0
    data_date: Optional[str] = None
    counted = 0

    for r in rows:
        pnl = compute_pnl(
            r["stock_code"], r["entry_price"], r["entry_qty"], r["entry_date"]
        )
        if pnl is None:
            continue
        counted += 1
        if pnl.today_pnl is not None:
            today_total += pnl.today_pnl
        if pnl.total_pnl is not None:
            holding_total += pnl.total_pnl
        if pnl.data_date:
            data_date = pnl.data_date

    return PnLSummary(
        today_total_pnl=round(today_total, 2),
        total_holding_pnl=round(holding_total, 2),
        data_date=data_date,
        open_count=len(rows),
    )


@router.get("/{trade_id}", response_model=TradeOut)
def get_trade(trade_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM trades WHERE id = ?", (trade_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="交易记录不存在")
        return _row_to_out(row, with_pnl=True, conn=conn)


@router.put("/{trade_id}", response_model=TradeOut)
def close_trade(trade_id: int, payload: TradeClose):
    """平仓：填写卖出价/日期/原因，状态置为 closed。"""
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM trades WHERE id = ?", (trade_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="交易记录不存在")
        conn.execute(
            "UPDATE trades SET exit_price=?, exit_date=?, exit_reason=?, "
            "status='closed', updated_at=datetime('now') WHERE id=?",
            (payload.exit_price, payload.exit_date, payload.exit_reason, trade_id),
        )
        new_row = conn.execute("SELECT * FROM trades WHERE id = ?", (trade_id,)).fetchone()
        return _row_to_out(new_row, with_pnl=False, conn=conn)
