// 轻量 fetch 封装，baseURL = /api

const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || JSON.stringify(body)
    } catch (e) {
      /* ignore */
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  listTrades: (status = 'open') => request(`/trades?status=${status}`),
  getTrade: (id) => request(`/trades/${id}`),
  createTrade: (data) => request('/trades', { method: 'POST', body: JSON.stringify(data) }),
  closeTrade: (id, data) => request(`/trades/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  pnlSummary: () => request('/trades/pnl-summary'),
  kline: (code, days = 60) => request(`/market/${code}/kline?days=${days}`),
  getReview: (tradeId) => request(`/reviews/${tradeId}`),
  createReview: (data) => request('/reviews', { method: 'POST', body: JSON.stringify(data) }),
  statsSummary: () => request('/stats/summary'),
  statsByReason: () => request('/stats/by-reason'),
  statsDiscipline: () => request('/stats/discipline'),
  statsViolations: () => request('/stats/violations'),
}
