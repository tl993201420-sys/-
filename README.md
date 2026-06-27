# A股交易复盘与纪律管理系统

> 90天养成一个好习惯 —— 以「照镜子」为核心的交易复盘工具，帮助持续改进交易纪律、沉淀可复用规律。

> 当前进度：**Phase 1 — 核心骨架**（交易录入 / 交易列表带盈亏 / Dashboard 卡片 / Docker 部署）。
> 详细规划见 [`trading-journal-plan.md`](./trading-journal-plan.md)。

## 技术栈
- 前端：React 18 + Vite + Tailwind CSS（Phase 2 加入 Lightweight Charts / Recharts）
- 后端：Python FastAPI + SQLite（标准库 sqlite3，无 ORM）
- 行情：AkShare（历史日K线 + 最新收盘价，T+1 非实时）
- 部署：Docker Compose + Nginx

## 目录结构
```
backend/    FastAPI + SQLite
frontend/   React + Vite + Tailwind
nginx/      反向代理（/ → 前端，/api → 后端）
data/       SQLite 持久化（trading.db，不入库）
docker-compose.yml
```

## 一键启动（推荐）
```bash
docker compose up -d --build
# 访问 http://localhost   （服务器上为 http://你的IP）
docker compose logs -f    # 查看日志
docker compose down       # 停止
```
- 数据库持久化在宿主机 `./data/trading.db`。
- 首次构建后端会安装 AkShare/pandas，耗时较长属正常。

## API（Phase 1）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/trades` | 新建交易（止损价/目标价必填，缺失返回 422） |
| GET  | `/api/trades?status=open\|closed\|all` | 交易列表（持仓中附盈亏） |
| GET  | `/api/trades/pnl-summary` | 今日总盈亏 / 持仓总盈亏汇总 |
| GET  | `/api/trades/{id}` | 单笔详情 |
| GET  | `/api/health` | 健康检查 |

盈亏字段：`today_pct`（今日涨跌幅%）、`today_pnl`（今日盈亏元）、`total_pnl`（持仓累计盈亏元）、`total_pct`（持仓累计盈亏%）、`data_date`（数据日期，T+1）。

## 盈亏颜色规则
A股习惯：**涨/盈 = 红色，跌/亏 = 绿色**，零 = 灰色。

## 本地开发（可选）
> 本机 Node 需 ≥18（Vite 5 要求），Python 建议 3.11。否则请直接用 Docker。
```bash
# 后端
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
# 前端（另开终端）
cd frontend && npm install && npm run dev   # http://localhost:3000，已代理 /api → 8000
```

---
*个人交易记录工具，不构成投资建议。*
