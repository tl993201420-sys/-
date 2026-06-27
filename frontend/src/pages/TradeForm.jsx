import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'

const REASON_TAGS = ['题材炒作', '基本面改善', '技术突破', '跟风', '其他']

const today = () => new Date().toISOString().slice(0, 10)

const initialForm = {
  stock_code: '',
  stock_name: '',
  entry_date: today(),
  entry_price: '',
  entry_qty: '',
  position_pct: '',
  stop_loss: '',
  target_price: '',
  entry_note: '',
}

export default function TradeForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [reasons, setReasons] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const toggleReason = (r) =>
    setReasons((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]))

  // 核心纪律校验：止损价 / 目标价 必填
  const missingDiscipline = !form.stop_loss || !form.target_price

  const canSubmit = useMemo(() => {
    return (
      form.stock_code &&
      form.stock_name &&
      form.entry_date &&
      Number(form.entry_price) > 0 &&
      Number(form.entry_qty) > 0 &&
      form.position_pct !== '' &&
      Number(form.stop_loss) > 0 &&
      Number(form.target_price) > 0 &&
      reasons.length > 0 &&
      !submitting
    )
  }, [form, reasons, submitting])

  const amount = useMemo(() => {
    const a = Number(form.entry_price) * Number(form.entry_qty)
    return a > 0 ? a.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '—'
  }, [form.entry_price, form.entry_qty])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      await api.createTrade({
        stock_code: form.stock_code.trim(),
        stock_name: form.stock_name.trim(),
        entry_date: form.entry_date,
        entry_price: Number(form.entry_price),
        entry_qty: Number(form.entry_qty),
        position_pct: Number(form.position_pct),
        stop_loss: Number(form.stop_loss),
        target_price: Number(form.target_price),
        entry_reason: reasons.join(','),
        entry_note: form.entry_note || null,
      })
      navigate('/trades')
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-4">新建交易</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="股票代码" required>
            <input className={inputCls} placeholder="如 601958" value={form.stock_code} onChange={set('stock_code')} />
          </Field>
          <Field label="股票名称" required>
            <input className={inputCls} placeholder="如 金钼股份" value={form.stock_name} onChange={set('stock_name')} />
          </Field>
          <Field label="买入日期" required>
            <input type="date" className={inputCls} value={form.entry_date} onChange={set('entry_date')} />
          </Field>
          <Field label="买入价格" required>
            <input type="number" step="0.01" min="0" className={inputCls} value={form.entry_price} onChange={set('entry_price')} />
          </Field>
          <Field label="买入数量（股）" required>
            <input type="number" step="100" min="0" className={inputCls} value={form.entry_qty} onChange={set('entry_qty')} />
          </Field>
          <Field label="买入金额（自动）">
            <div className="px-3 py-2 rounded-lg bg-slate-50 text-slate-600 tabular-nums">{amount}</div>
          </Field>
          <Field label="仓位比例（%）" required>
            <input type="number" step="1" min="0" max="100" className={inputCls} value={form.position_pct} onChange={set('position_pct')} />
          </Field>
          <div />
          <Field label="止损价 ⚠️" required>
            <input
              type="number" step="0.01" min="0"
              className={form.stop_loss ? inputCls : inputClsWarn}
              value={form.stop_loss} onChange={set('stop_loss')}
            />
          </Field>
          <Field label="目标价" required>
            <input
              type="number" step="0.01" min="0"
              className={form.target_price ? inputCls : inputClsWarn}
              value={form.target_price} onChange={set('target_price')}
            />
          </Field>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-2">
            买入理由 <span className="text-gain">*</span>（至少选一个）
          </label>
          <div className="flex flex-wrap gap-2">
            {REASON_TAGS.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => toggleReason(r)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  reasons.includes(r)
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-brand-500'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <Field label="备注">
          <textarea className={inputCls} rows={2} value={form.entry_note} onChange={set('entry_note')} />
        </Field>

        {missingDiscipline && (
          <div className="text-sm text-gain bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
            设定止损是交易纪律的基础，请填写止损价和目标价后再保存。
          </div>
        )}

        {error && (
          <div className="text-sm text-gain bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
            保存失败：{error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`px-5 py-2.5 rounded-lg text-white font-medium ${
              canSubmit ? 'bg-brand-500 hover:bg-brand-600' : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            保存交易
          </button>
          <button type="button" onClick={() => navigate('/trades')} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600">
            取消
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'
const inputClsWarn =
  'w-full px-3 py-2 rounded-lg border border-rose-300 bg-rose-50 focus:border-gain focus:outline-none focus:ring-1 focus:ring-gain'

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm text-slate-600 mb-1.5">
        {label} {required && <span className="text-gain">*</span>}
      </label>
      {children}
    </div>
  )
}
