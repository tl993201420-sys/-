// 统计卡片：标题 + 大数值（可上色）+ 副标题
export default function StatsCard({ title, value, valueClass = 'text-slate-800', sub }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="text-sm text-slate-500 mb-2">{title}</div>
      <div className={`text-3xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-2">{sub}</div>}
    </div>
  )
}
