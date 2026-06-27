"""行情数据 API。"""
from fastapi import APIRouter, HTTPException, Query

from services.market import get_kline

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/{code}/kline")
def kline(code: str, days: int = Query(default=60, ge=5, le=500)):
    """获取历史日K线（前复权，T+1）。返回 {data_date, data:[{date,open,high,low,close,volume}]}。"""
    records = get_kline(code, days=days)
    if not records:
        raise HTTPException(status_code=404, detail="未取到该股票的行情数据")
    return {"data_date": records[-1]["date"], "data": records}
