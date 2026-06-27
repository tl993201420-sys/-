"""纪律自评 + 复盘 API。"""
from fastapi import APIRouter, HTTPException

from database import get_conn
from models import ReviewCreate, ReviewOut

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("", response_model=ReviewOut)
@router.post("/", response_model=ReviewOut)
def create_review(payload: ReviewCreate):
    """提交某笔交易的纪律自评与复盘四题。每笔交易仅保留一份（重复提交覆盖）。"""
    with get_conn() as conn:
        trade = conn.execute(
            "SELECT id FROM trades WHERE id = ?", (payload.trade_id,)
        ).fetchone()
        if trade is None:
            raise HTTPException(status_code=404, detail="交易记录不存在")

        # 已存在则更新，否则插入
        existing = conn.execute(
            "SELECT id FROM discipline_reviews WHERE trade_id = ?", (payload.trade_id,)
        ).fetchone()
        if existing:
            conn.execute(
                """
                UPDATE discipline_reviews SET
                    followed_stop_loss=?, actual_exit_reason=?, discipline_score=?,
                    review_q1=?, review_q2=?, review_q3=?, review_q4=?
                WHERE trade_id=?
                """,
                (
                    payload.followed_stop_loss, payload.actual_exit_reason,
                    payload.discipline_score, payload.review_q1, payload.review_q2,
                    payload.review_q3, payload.review_q4, payload.trade_id,
                ),
            )
            review_id = existing["id"]
        else:
            cur = conn.execute(
                """
                INSERT INTO discipline_reviews
                    (trade_id, followed_stop_loss, actual_exit_reason, discipline_score,
                     review_q1, review_q2, review_q3, review_q4)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.trade_id, payload.followed_stop_loss,
                    payload.actual_exit_reason, payload.discipline_score,
                    payload.review_q1, payload.review_q2, payload.review_q3,
                    payload.review_q4,
                ),
            )
            review_id = cur.lastrowid

        row = conn.execute(
            "SELECT * FROM discipline_reviews WHERE id = ?", (review_id,)
        ).fetchone()
    return ReviewOut(**dict(row))


@router.get("/{trade_id}", response_model=ReviewOut)
def get_review(trade_id: int):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM discipline_reviews WHERE trade_id = ?", (trade_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="尚未填写复盘")
    return ReviewOut(**dict(row))
