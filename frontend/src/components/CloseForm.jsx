import { useState } from 'react'
import Modal from './Modal.jsx'
import { api } from '../api/client.js'

const today = () => new Date().toISOString().slice(0, 10)

const EXIT_REASONS = ['触发止损', '达到目标价', '情绪性卖出', '改变判断', '其他']

export default function CloseForm({ trade, onClose, onDone }) {
  const [exitPrice, setExitPrice] = useState('')
  const [exitDate, setExitDate] = useState(today())
  const [exitReason, setExitReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = Number(exitPrice) > 0 && exitDate && !submitting

  async function submit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      await api.closeTrade(trade.id, {
        exit_price: Number(exitPrice),
        exit_date: exitDate,
        exit_reason: exitReason || null,
      })
      onDone()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  // 预估最终盈亏
  const diff = Number(exitPrice) - trade.entry_price
  const estPnl = Number(exitPrice) > 0 ? diff * trade.entry_qty : null

  return (
    <Modal title={`平仓 · ${trade.stock_name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1.5">卖出价格 <span className="text-gain">*</span></label>
          <input type="number" step="0.01" min="0" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-brand-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1.5">卖出日期 <span className="text-gain">*</span></label>
          <input type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-brand-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-2">卖出原因</label>
          <div className="flex flex-wrap gap-2">
            {EXIT_REASONS.map((r) => (
              <button type="button" key={r} onClick={() => setExitReason(r)}
                className={`px-3 py-1.5 rounded-full text-sm border ${
                  exitReason === r ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-slate-600 border-slate-300'
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {estPnl !== null && (
          <div className="text-sm text-slate-500">
            预估最终盈亏：
            <span className={estPnl >= 0 ? 'text-gain font-semibold' : 'text-loss font-semibold'}>
              {estPnl >= 0 ? '+' : ''}{estPnl.toFixed(2)} 元
            </span>
          </div>
        )}

        {error && <div className="text-sm text-gain bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={!canSubmit}
            className={`px-5 py-2 rounded-lg text-white ${canSubmit ? 'bg-brand-500 hover:bg-brand-600' : 'bg-slate-300 cursor-not-allowed'}`}>
            确认平仓
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border border-slate-300 text-slate-600">取消</button>
        </div>
        <p className="text-xs text-slate-400">平仓后请记得填写纪律复盘，这是「照镜子」的关键一步。</p>
      </form>
    </Modal>
  )
}
