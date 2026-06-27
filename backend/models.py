"""Pydantic 数据模型。"""
from typing import Optional
from pydantic import BaseModel, Field


class TradeCreate(BaseModel):
    """新建交易（买入）。止损价与目标价为必填字段，缺失将由 FastAPI 返回 422。"""
    stock_code: str = Field(..., min_length=1, description="股票代码，如 601958")
    stock_name: str = Field(..., min_length=1, description="股票名称")
    direction: str = Field(default="long", description="long（A股默认做多）")
    entry_price: float = Field(..., gt=0, description="买入价格")
    entry_qty: int = Field(..., gt=0, description="买入数量（股）")
    entry_date: str = Field(..., description="买入日期 YYYY-MM-DD")
    position_pct: float = Field(..., ge=0, le=100, description="仓位比例 0-100")
    stop_loss: float = Field(..., gt=0, description="止损价（必填）")
    target_price: float = Field(..., gt=0, description="目标价（必填）")
    entry_reason: str = Field(..., min_length=1, description="买入理由标签（逗号分隔）")
    entry_note: Optional[str] = Field(default=None, description="买入备注")


class PnL(BaseModel):
    """单笔持仓的盈亏数据（持仓中才计算）。"""
    last_close: Optional[float] = None
    prev_close: Optional[float] = None
    today_pct: Optional[float] = None
    today_pnl: Optional[float] = None
    total_pnl: Optional[float] = None
    total_pct: Optional[float] = None
    data_date: Optional[str] = None


class TradeOut(BaseModel):
    """交易记录返回结构（含可选盈亏）。"""
    id: int
    stock_code: str
    stock_name: str
    direction: str
    entry_price: float
    entry_qty: int
    entry_date: str
    position_pct: float
    stop_loss: float
    target_price: float
    entry_reason: str
    entry_note: Optional[str] = None
    exit_price: Optional[float] = None
    exit_date: Optional[str] = None
    exit_reason: Optional[str] = None
    status: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    pnl: Optional[PnL] = None


class PnLSummary(BaseModel):
    """所有持仓盈亏汇总。"""
    today_total_pnl: float = 0.0
    total_holding_pnl: float = 0.0
    data_date: Optional[str] = None
    open_count: int = 0
