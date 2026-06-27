import { NavLink, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import TradeList from './pages/TradeList.jsx'
import TradeForm from './pages/TradeForm.jsx'

function NavItem({ to, children, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6">
          <div className="font-bold text-lg text-brand-600">交易复盘 · 纪律管理</div>
          <nav className="flex gap-1">
            <NavItem to="/" end>总览</NavItem>
            <NavItem to="/trades">交易列表</NavItem>
            <NavItem to="/trades/new">新建交易</NavItem>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trades" element={<TradeList />} />
          <Route path="/trades/new" element={<TradeForm />} />
        </Routes>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-6 text-center text-xs text-slate-400">
        个人交易记录工具，不构成投资建议。行情数据来源 AkShare（T+1，非实时）。
      </footer>
    </div>
  )
}
