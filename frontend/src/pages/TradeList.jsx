import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { fmtMoney, fmtPct, fmtPrice, pnlColor } from '../lib/format.js'

const TABS = [
  { key: 'open', label: '持仓中' },
  { key: 'closed', label: '已平仓' },
  { key: 'all', label: '全部' },
]

export default function TradeList() {
  const [tab, setTab] = useState('open')
  const [trades, setTrades] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    const tasks = [api.listTrades(tab)]
    if (tab === 'open') tasks.push(api.pnlSummary())
    Promise.all(tasks)
      .then(([list, s]) => {
        if (!alive) return
        setTrades(list)
        setSummary(s || null)
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [tab])

  const dataDate = summary?.data_date
  const dateNote = dataDate
    ? `数据来源 AkShare（T+1，次日刷新）· 数据日期 ${dataDate}`
    : '数据来源 AkShare（T+1，次日刷新）'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">交易列表</h1>
        <Link
          to="/trades/new"
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm px-4 py-2 rounded-lg"
        >
          + 新建交易
        </Link>
      </div>

      <div className="flex gap-2 mb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              tab === t.key ? 'bg-brand-500 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'open' && <p className="text-xs text-slate-400 mb-2">{dateNote}</p>}

      {loading ? (
        <div className="text-slate-400">加载中…</div>
      ) : error ? (
        <div className="text-gain">加载失败：{error}</div>
      ) : trades.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-10 text-center text-slate-400">
          暂无交易记录
        </div>
      ) : tab === 'open' ? (
        <OpenTable trades={trades} summary={summary} />
      ) : (
        <ClosedTable trades={trades} />
      )}
    </div>
  )
}

function OpenTable({ trades, summary }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <Th>股票</Th>
            <Th>买入日期</Th>
            <Th right>买入价</Th>
            <Th right>今日涨跌幅</Th>
            <Th right>今日盈亏(元)</Th>
            <Th right>持仓盈亏(元)</Th>
            <Th right>持仓盈亏(%)</Th>
            <Th right>止损价</Th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const p = t.pnl || {}
            return (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                <Td>
                  <div className="font-medium text-slate-800">{t.stock_name}</div>
                  <div className="text-xs text-slate-400">{t.stock_code}</div>
                </Td>
                <Td>{t.entry_date}</Td>
                <Td right>{fmtPrice(t.entry_price)}</Td>
                <Td right className={pnlColor(p.today_pct)}>{fmtPct(p.today_pct)}</Td>
                <Td right className={pnlColor(p.today_pnl)}>{fmtMoney(p.today_pnl)}</Td>
                <Td right className={pnlColor(p.total_pnl)}>{fmtMoney(p.total_pnl)}</Td>
                <Td right className={pnlColor(p.total_pct)}>{fmtPct(p.total_pct)}</Td>
                <Td right className="text-orange-500">{fmtPrice(t.stop_loss)}</Td>
              </tr>
            )
          })}
        </tbody>
        {summary && (
          <tfoot className="bg-slate-50 font-semibold">
            <tr className="border-t-2 border-slate-200">
              <Td colSpan={4}>合计</Td>
              <Td right className={pnlColor(summary.today_total_pnl)}>
                {fmtMoney(summary.today_total_pnl)}
              </Td>
              <Td right className={pnlColor(summary.total_holding_pnl)}>
                {fmtMoney(summary.total_holding_pnl)}
              </Td>
              <Td colSpan={2}></Td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

function ClosedTable({ trades }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <Th>股票</Th>
            <Th>买入日期</Th>
            <Th>卖出日期</Th>
            <Th>状态</Th>
            <Th right>买入价</Th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
              <Td>
                <div className="font-medium text-slate-800">{t.stock_name}</div>
                <div className="text-xs text-slate-400">{t.stock_code}</div>
              </Td>
              <Td>{t.entry_date}</Td>
              <Td>{t.exit_date || '—'}</Td>
              <Td>{t.status === 'open' ? '持仓中' : '已平仓'}</Td>
              <Td right>{fmtPrice(t.entry_price)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, right }) {
  return (
    <th className={`px-4 py-3 font-medium ${right ? 'text-right' : 'text-left'}`}>{children}</th>
  )
}

function Td({ children, right, className = '', colSpan }) {
  return (
    <td
      colSpan={colSpan}
      className={`px-4 py-3 tabular-nums ${right ? 'text-right' : 'text-left'} ${className}`}
    >
      {children}
    </td>
  )
}
