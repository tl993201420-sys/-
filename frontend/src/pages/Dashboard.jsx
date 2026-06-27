import { useEffect, useState } from 'react'
import StatsCard from '../components/StatsCard.jsx'
import { api } from '../api/client.js'
import { fmtMoney, fmtPct, pnlColor } from '../lib/format.js'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [holdingPct, setHoldingPct] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([api.pnlSummary(), api.listTrades('open')])
      .then(([s, trades]) => {
        if (!alive) return
        setSummary(s)
        // 持仓总盈亏% = 总盈亏 / 总成本
        let cost = 0
        trades.forEach((t) => {
          cost += t.entry_price * t.entry_qty
        })
        setHoldingPct(cost > 0 ? (s.total_holding_pnl / cost) * 100 : null)
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  if (loading) return <div className="text-slate-400">加载中…</div>
  if (error) return <div className="text-gain">加载失败：{error}</div>

  const dateNote = summary?.data_date
    ? `数据来源 AkShare（T+1，次日刷新）· 数据日期 ${summary.data_date}`
    : '数据来源 AkShare（T+1，次日刷新）· 暂无行情数据'

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">总览</h1>
      <p className="text-xs text-slate-400 mb-4">{dateNote}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="今日总盈亏（元）"
          value={fmtMoney(summary?.today_total_pnl)}
          valueClass={pnlColor(summary?.today_total_pnl)}
          sub={`持仓 ${summary?.open_count ?? 0} 笔`}
        />
        <StatsCard
          title="持仓总盈亏（元）"
          value={fmtMoney(summary?.total_holding_pnl)}
          valueClass={pnlColor(summary?.total_holding_pnl)}
        />
        <StatsCard
          title="持仓总盈亏（%）"
          value={fmtPct(holdingPct)}
          valueClass={pnlColor(holdingPct)}
          sub="按持仓成本加权"
        />
      </div>

      <div className="mt-8 bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400">
        胜率 / 盈亏比 / 纪律分趋势图将在 Phase 3 实现
      </div>
    </div>
  )
}
