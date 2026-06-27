// 盈亏格式化与配色（A股习惯：涨/盈=红，跌/亏=绿，零=灰）

export function pnlColor(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'text-slate-400'
  if (value > 0) return 'text-gain'
  if (value < 0) return 'text-loss'
  return 'text-slate-500'
}

// 金额：带千分位与正负号
export function fmtMoney(value, { sign = true } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const s = sign && value > 0 ? '+' : ''
  return s + value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 百分比
export function fmtPct(value, { sign = true } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const s = sign && value > 0 ? '+' : ''
  return s + value.toFixed(2) + '%'
}

// 普通价格
export function fmtPrice(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toFixed(2)
}
