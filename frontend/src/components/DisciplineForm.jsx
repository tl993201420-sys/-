import { useState } from 'react'
import Modal from './Modal.jsx'
import { api } from '../api/client.js'

const EXIT_REASON_OPTIONS = [
  { value: 'stop_loss', label: '触发止损（按计划）' },
  { value: 'take_profit', label: '达到目标价（按计划）' },
  { value: 'emotional', label: '情绪性卖出（恐慌/贪婪）' },
  { value: 'changed_view', label: '改变了原有判断' },
]

const QUESTIONS = [
  ['review_q1', 'Q1. 入场判断，准确在哪里？'],
  ['review_q2', 'Q2. 最大的误判点是什么？'],
  ['review_q3', 'Q3. 这次有什么可复用的规律？'],
  ['review_q4', 'Q4. 下次遇到相似情况，你会怎么做？'],
]

export default function DisciplineForm({ trade, existing, onClose, onDone }) {
  const [followed, setFollowed] = useState(existing ? existing.followed_stop_loss : null)
  const [actualReason, setActualReason] = useState(existing?.actual_exit_reason || '')
  const [score, setScore] = useState(existing?.discipline_score || 0)
  const [qs, setQs] = useState({
    review_q1: existing?.review_q1 || '',
    review_q2: existing?.review_q2 || '',
    review_q3: existing?.review_q3 || '',
    review_q4: existing?.review_q4 || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const allAnswered = QUESTIONS.every(([k]) => qs[k].trim() !== '')
  const canSubmit =
    followed !== null && actualReason && score >= 1 && allAnswered && !submitting

  async function submit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      await api.createReview({
        trade_id: trade.id,
        followed_stop_loss: followed,
        actual_exit_reason: actualReason,
        discipline_score: score,
        ...qs,
      })
      onDone()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`复盘 · ${trade.stock_name}`} onClose={onClose} width="max-w-2xl">
      <form onSubmit={submit} className="space-y-5">
        {/* 第一步：纪律评分 */}
        <section className="space-y-4">
          <h4 className="text-sm font-semibold text-brand-600">第一步 · 纪律评分</h4>

          <div>
            <label className="block text-sm text-slate-600 mb-2">1. 是否按止损计划执行？</label>
            <div className="flex gap-2">
              {[[1, '是'], [0, '否']].map(([v, t]) => (
                <button type="button" key={v} onClick={() => setFollowed(v)}
                  className={`px-4 py-1.5 rounded-lg text-sm border ${
                    followed === v ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-slate-600 border-slate-300'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-2">2. 实际卖出原因</label>
            <div className="space-y-1.5">
              {EXIT_REASON_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="actualReason" checked={actualReason === o.value}
                    onChange={() => setActualReason(o.value)} className="accent-brand-500" />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-2">3. 纪律评分（1-5 分）</label>
            <div className="flex gap-1 text-2xl">
              {[1, 2, 3, 4, 5].map((s) => (
                <button type="button" key={s} onClick={() => setScore(s)}
                  className={s <= score ? 'text-amber-400' : 'text-slate-300'}>
                  ★
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 第二步：复盘四题 */}
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-brand-600">第二步 · 复盘四题（均需填写）</h4>
          {QUESTIONS.map(([k, label]) => (
            <div key={k}>
              <label className="block text-sm text-slate-600 mb-1">{label}</label>
              <textarea rows={2} value={qs[k]} onChange={(e) => setQs((p) => ({ ...p, [k]: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-brand-500 focus:outline-none" />
            </div>
          ))}
        </section>

        {!allAnswered && (
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            复盘四题均需填写，不可留空直接提交。
          </div>
        )}
        {error && <div className="text-sm text-gain bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-3">
          <button type="submit" disabled={!canSubmit}
            className={`px-5 py-2 rounded-lg text-white ${canSubmit ? 'bg-brand-500 hover:bg-brand-600' : 'bg-slate-300 cursor-not-allowed'}`}>
            保存复盘
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border border-slate-300 text-slate-600">取消</button>
        </div>
      </form>
    </Modal>
  )
}
