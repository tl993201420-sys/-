import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import KLineChart from '../components/KLineChart.jsx'
import CloseForm from '../components/CloseForm.jsx'
import DisciplineForm from '../components/DisciplineForm.jsx'
import { api } from '../api/client.js'
import { fmtMoney, fmtPct, fmtPrice, pnlColor } from '../lib/format.js'

export default function TradeDetail() {
  const { id } = useParams()
  const [trade, setTrade] = useState(null)
  const [kline, setKline] = useState(null)
  const [review, setReview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showClose, setShowClose] = useState(false)
  const [showReview, setShowReview] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const t = await api.getTrade(id)
      setTrade(t)
      // 行情（容错：取不到不阻塞）
      api.kline(t.stock_code, 90).then(setKline).catch(() => setKline(null))
      if (t.status === 'closed') {
        api.getReview(id).then(setReview).catch(() => setReview(null))
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <div className="text-slate-400">加载中…</div>
  if (error) return <div className="text-gain">加载失败：{error}</div>
  if (!trade) return null

  const p = trade.pnl || {}
  const isOpen = trade.status === 'open'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/trades" className="text-sm text-brand-600 hover:underline">← 返回列表</Link>
          <h1 className="text-xl font-bold mt-1">
            {trade.stock_name} <span className="text-slate-400 text-base">{trade.stock_code}</span>
            <span className={`ml-3 text-sm px-2 py-0.5 rounded ${isOpen ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500'}`}>
              {isOpen ? '持仓中' : '已平仓'}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          {isOpen && (
            <button onClick={() => setShowClose(true)} className="bg-brand-500 hover:bg-brand-600 text-white text-sm px-4 py-2 rounded-lg">
              填写平仓
            </button>
          )}
          {!isOpen && (
            <button onClick={() => setShowReview(true)} className="bg-brand-500 hover:bg-brand-600 text-white text-sm px-4 py-2 rounded-lg">
              {review ? '编辑复盘' : '填写复盘'}
            </button>
          )}
        </div>
      </div>

      {/* K线图 */}
      <div className="bg-white rounded-xl border border-slate-100 p-4">
        {kline?.data?.length ? (
          <>
            <KLineChart
              data={kline.data}
              entry={{ date: trade.entry_date, price: trade.entry_price }}
              exit={trade.exit_date ? { date: trade.exit_date, price: trade.exit_price } : null}
              stopLoss={trade.stop_loss}
              targetPrice={trade.target_price}
            />
            <p className="text-xs text-slate-400 mt-2">
              数据来源 AkShare（T+1，次日刷新）· 数据日期 {kline.data_date}。买入↑绿 / 卖出↓红 / 止损红虚线 / 目标绿虚线。
            </p>
          </>
        ) : (
          <div className="py-16 text-center text-slate-400">暂无K线数据（AkShare 取数失败或代码无效）</div>
        )}
      </div>

      {/* 盈亏速览（持仓中） */}
      {isOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Quick label="今日涨跌幅" value={fmtPct(p.today_pct)} cls={pnlColor(p.today_pct)} />
          <Quick label="今日单日盈亏" value={fmtMoney(p.today_pnl)} cls={pnlColor(p.today_pnl)} />
          <Quick label="持仓累计盈亏" value={fmtMoney(p.total_pnl)} cls={pnlColor(p.total_pnl)} />
          <Quick label="累计盈亏(%)" value={fmtPct(p.total_pct)} cls={pnlColor(p.total_pct)} />
        </div>
      )}

      {/* 已平仓最终盈亏 */}
      {!isOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Quick label="最终盈亏(元)" value={fmtMoney(trade.realized_pnl)} cls={pnlColor(trade.realized_pnl)} />
          <Quick label="最终盈亏(%)" value={fmtPct(trade.realized_pct)} cls={pnlColor(trade.realized_pct)} />
          <Quick label="卖出价" value={fmtPrice(trade.exit_price)} cls="text-slate-700" />
          <Quick label="纪律分" value={trade.discipline_score ? `${trade.discipline_score} / 5` : '未评'} cls="text-slate-700" />
        </div>
      )}

      {/* 基本信息 */}
      <div className="bg-white rounded-xl border border-slate-100 p-5">
        <h2 className="font-semibold mb-3">交易信息</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
          <Info label="买入价" value={`${fmtPrice(trade.entry_price)} 元`} />
          <Info label="持仓数量" value={`${trade.entry_qty} 股`} />
          <Info label="仓位比例" value={`${trade.position_pct}%`} />
          <Info label="止损价 ⚠️" value={`${fmtPrice(trade.stop_loss)} 元`} valueCls="text-orange-500" />
          <Info label="目标价" value={`${fmtPrice(trade.target_price)} 元`} valueCls="text-loss" />
          <Info label="买入日期" value={trade.entry_date} />
          <Info label="买入理由" value={trade.entry_reason} />
          {trade.entry_note && <Info label="买入备注" value={trade.entry_note} />}
          {!isOpen && <Info label="卖出原因" value={trade.exit_reason || '—'} />}
        </div>
      </div>

      {/* 复盘内容展示 */}
      {!isOpen && review && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h2 className="font-semibold mb-3">复盘记录</h2>
          <div className="space-y-3 text-sm">
            <ReviewItem q="Q1 入场判断，准确在哪里？" a={review.review_q1} />
            <ReviewItem q="Q2 最大的误判点是什么？" a={review.review_q2} />
            <ReviewItem q="Q3 可复用的规律？" a={review.review_q3} />
            <ReviewItem q="Q4 下次相似情况怎么做？" a={review.review_q4} />
          </div>
        </div>
      )}

      {showClose && (
        <CloseForm
          trade={trade}
          onClose={() => setShowClose(false)}
          onDone={() => { setShowClose(false); load() }}
        />
      )}
      {showReview && (
        <DisciplineForm
          trade={trade}
          existing={review}
          onClose={() => setShowReview(false)}
          onDone={() => { setShowReview(false); load() }}
        />
      )}
    </div>
  )
}

function Quick({ label, value, cls }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${cls}`}>{value}</div>
    </div>
  )
}

function Info({ label, value, valueCls = 'text-slate-800' }) {
  return (
    <div>
      <div className="text-slate-400 text-xs mb-0.5">{label}</div>
      <div className={valueCls}>{value}</div>
    </div>
  )
}

function ReviewItem({ q, a }) {
  return (
    <div>
      <div className="text-slate-500">{q}</div>
      <div className="text-slate-800 whitespace-pre-wrap mt-0.5">{a || '—'}</div>
    </div>
  )
}
