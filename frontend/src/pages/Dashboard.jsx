import { useEffect, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import StatsCard from '../components/StatsCard.jsx'
import { api } from '../api/client.js'
import { fmtMoney, fmtPct, pnlColor } from '../lib/format.js'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [holdingPct, setHoldingPct] = useState(null)
  const [stats, setStats] = useState(null)
  const [byReason, setByReason] = useState([])
  const [discipline, setDiscipline] = useState([])
  const [violations, setViolations] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      api.pnlSummary(), api.listTrades('open'), api.statsSummary(),
      api.statsByReason(), api.statsDiscipline(), api.statsViolations(),
    ])
      .then(([s, trades, st, br, dt, vi]) => {
        if (!alive) return
        setSummary(s)
        let cost = 0
        trades.forEach((t) => { cost += t.entry_price * t.entry_qty })
        setHoldingPct(cost > 0 ? (s.total_holding_pnl / cost) * 100 : null)
        setStats(st)
        setByReason(br)
        setDiscipline(dt.map((d, i) => ({ ...d, idx: i + 1 })))
        setViolations(vi)
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  if (loading) return <div className="text-slate-400">加载中…</div>
  if (error) return <div className="text-gain">加载失败：{error}</div>

  const dateNote = summary?.data_date
    ? `行情数据 AkShare（T+1，次日刷新）· 数据日期 ${summary.data_date}`
    : '行情数据 AkShare（T+1，次日刷新）· 暂无行情数据'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-1">总览</h1>
        <p className="text-xs text-slate-400">{dateNote}</p>
      </div>

      {/* 第一行：实时持仓 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="今日总盈亏（元）" value={fmtMoney(summary?.today_total_pnl)}
          valueClass={pnlColor(summary?.today_total_pnl)} sub={`持仓 ${summary?.open_count ?? 0} 笔`} />
        <StatsCard title="持仓总盈亏（元）" value={fmtMoney(summary?.total_holding_pnl)}
          valueClass={pnlColor(summary?.total_holding_pnl)} />
        <StatsCard title="持仓总盈亏（%）" value={fmtPct(holdingPct)}
          valueClass={pnlColor(holdingPct)} sub="按持仓成本加权" />
      </div>

      {/* 第二行：历史统计 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="总交易 / 胜率"
          value={stats?.win_rate != null ? `${stats.win_rate}%` : '—'}
          valueClass="text-brand-600"
          sub={`共 ${stats?.total_trades ?? 0} 笔 · 已平仓 ${stats?.closed_trades ?? 0} 笔（胜 ${stats?.win_count ?? 0}/负 ${stats?.loss_count ?? 0}）`} />
        <StatsCard title="平均盈亏比"
          value={stats?.profit_loss_ratio != null ? `${stats.profit_loss_ratio} : 1` : '—'}
          valueClass="text-brand-600"
          sub={`均盈 ${fmtMoney(stats?.avg_win, { sign: false })} / 均亏 ${fmtMoney(stats?.avg_loss, { sign: false })}`} />
        <StatsCard title="平均纪律分"
          value={stats?.avg_discipline != null ? `${stats.avg_discipline} / 5` : '—'}
          valueClass="text-amber-500"
          sub={violations ? `违规：未止损 ${violations.not_followed_stop_loss} 次 · 情绪卖出 ${violations.emotional_exit} 次` : ''} />
      </div>

      {/* 图表区 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="按买入理由的胜率（%）">
          {byReason.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byReason} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="reason" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip formatter={(v, n, p) => [`${v}%（${p.payload.wins}/${p.payload.count}）`, '胜率']} />
                <Bar dataKey="win_rate" radius={[4, 4, 0, 0]}>
                  {byReason.map((d, i) => (
                    <Cell key={i} fill={d.win_rate >= 50 ? '#e11d48' : '#0891b2'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="纪律分时间趋势">
          {discipline.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={discipline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip formatter={(v, n, p) => [`${v} 分`, p.payload.stock_name]} />
                <Line type="monotone" dataKey="score" stroke="#0891b2" strokeWidth={2}
                  dot={{ r: 4, fill: '#0891b2' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>
      </div>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Empty() {
  return <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">暂无已平仓/复盘数据</div>
}
