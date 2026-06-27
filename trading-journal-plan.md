# A股交易复盘与纪律管理系统
## Claude Code 开发规划文档

> **目标**：构建一个以"照镜子"为核心的交易复盘工具，帮助持续改进交易纪律、沉淀可复用规律。
> **部署环境**：腾讯云 2核2G 服务器 | Web访问 | 单用户

---

## 一、项目结构

```
trading-journal/
├── backend/
│   ├── main.py                  # FastAPI 入口
│   ├── database.py              # SQLite 初始化
│   ├── models.py                # 数据模型
│   ├── routers/
│   │   ├── trades.py            # 交易记录 API
│   │   ├── reviews.py           # 复盘笔记 API
│   │   ├── stats.py             # 统计分析 API
│   │   └── market.py            # AkShare 行情 API
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # 统计总览
│   │   │   ├── TradeForm.jsx    # 新建/编辑交易
│   │   │   ├── TradeList.jsx    # 交易列表
│   │   │   ├── TradeDetail.jsx  # 交易详情 + K线
│   │   │   └── Review.jsx       # 复盘笔记
│   │   ├── components/
│   │   │   ├── KLineChart.jsx   # K线图组件
│   │   │   ├── DisciplineForm.jsx  # 纪律自评组件
│   │   │   └── StatsCard.jsx    # 统计卡片
│   │   └── App.jsx
│   ├── package.json
│   └── tailwind.config.js
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

---

## 二、技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | React | 18.x | 组件化开发 |
| 前端样式 | Tailwind CSS | 3.x | 明亮清晰风格 |
| K线图表 | Lightweight Charts | 4.x | TradingView 开源，专业K线 |
| 统计图表 | Recharts | 2.x | Dashboard 折线/柱状图 |
| 后端框架 | FastAPI | 0.110+ | Python，轻量高性能 |
| 数据库 | SQLite | 内置 | 无需额外服务，文件型存储 |
| 历史行情 | AkShare | 最新版 | 免费A股日K数据，T+1延迟 |
| 容器化 | Docker Compose | 2.x | 一键启动，方便维护 |
| 反向代理 | Nginx | 1.25 | 统一端口，可配置HTTPS |

---

## 三、数据库设计

### 表一：trades（交易记录主表）

```sql
CREATE TABLE trades (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_code      TEXT NOT NULL,           -- 股票代码，如 601958
    stock_name      TEXT NOT NULL,           -- 股票名称，如 金钼股份
    direction       TEXT DEFAULT 'long',     -- long（做多，A股默认）
    entry_price     REAL NOT NULL,           -- 买入价格
    entry_qty       INTEGER NOT NULL,        -- 买入数量（股）
    entry_date      TEXT NOT NULL,           -- 买入日期 YYYY-MM-DD
    position_pct    REAL NOT NULL,           -- 仓位比例 0-100
    stop_loss       REAL NOT NULL,           -- 止损价（必填）
    target_price    REAL NOT NULL,           -- 目标价（必填）
    entry_reason    TEXT NOT NULL,           -- 买入理由标签（逗号分隔）
    entry_note      TEXT,                    -- 买入备注
    exit_price      REAL,                    -- 卖出价格（平仓后填）
    exit_date       TEXT,                    -- 卖出日期
    exit_reason     TEXT,                    -- 卖出原因标签
    status          TEXT DEFAULT 'open',     -- open / closed
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);
```

### 表二：discipline_reviews（纪律自评表）

```sql
CREATE TABLE discipline_reviews (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id            INTEGER NOT NULL REFERENCES trades(id),
    followed_stop_loss  INTEGER NOT NULL,    -- 1=是 0=否（是否按止损执行）
    actual_exit_reason  TEXT NOT NULL,       -- stop_loss/take_profit/emotional/changed_view
    discipline_score    INTEGER NOT NULL,    -- 1-5 分（纪律评分）
    review_q1           TEXT,               -- 入场判断准确在哪？
    review_q2           TEXT,               -- 最大误判点？
    review_q3           TEXT,               -- 可复用的规律？
    review_q4           TEXT,               -- 下次相似情况怎么做？
    created_at          TEXT DEFAULT (datetime('now'))
);
```

### 表三：market_cache（行情缓存表）

```sql
CREATE TABLE market_cache (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_code  TEXT NOT NULL,
    trade_date  TEXT NOT NULL,
    open        REAL,
    high        REAL,
    low         REAL,
    close       REAL,
    volume      REAL,
    cached_at   TEXT DEFAULT (datetime('now')),
    UNIQUE(stock_code, trade_date)
);
```

---

## 四、后端 API 设计

### 4.1 交易记录

```
POST   /api/trades              新建交易（买入）
GET    /api/trades              获取交易列表（支持 ?status=open/closed）
GET    /api/trades/{id}         获取单笔交易详情
PUT    /api/trades/{id}         更新交易（平仓时填写卖出信息）
DELETE /api/trades/{id}         删除交易
```

### 4.2 纪律自评

```
POST   /api/reviews             提交纪律自评（平仓后触发）
GET    /api/reviews/{trade_id}  获取某笔交易的自评
```

### 4.3 统计分析

```
GET    /api/stats/summary       总体统计（胜率/盈亏比/最大亏损）
GET    /api/stats/by-reason     按买入理由分组的胜率
GET    /api/stats/discipline    纪律分趋势（按时间）
GET    /api/stats/violations    纪律违规次数统计
```

### 4.4 行情数据

```
GET    /api/market/{code}/kline?days=60    获取历史日K（AkShare）
GET    /api/market/{code}/quote            获取最新收盘价（T+1）
GET    /api/market/search?q=金钼           股票代码/名称搜索
```

### 4.5 盈亏计算（后端统一计算，前端直接展示）

```python
# 持仓中每笔交易的盈亏数据结构
{
    "trade_id": 1,
    "stock_code": "601958",
    "last_close": 28.50,          # 最新收盘价（T+1）
    "prev_close": 27.57,          # 昨日收盘价
    "today_pct": 3.37,            # 今日涨跌幅（%）
    "today_pnl": 648.0,           # 今日单日盈亏（元）= 今日涨跌额 × 持仓数量
    "total_pnl": 1820.0,          # 持仓累计盈亏（元）= (当前价 - 买入价) × 数量
    "total_pct": 9.42,            # 持仓累计盈亏（%）
    "data_date": "2026-06-26",    # 数据日期（T+1，提示非实时）
}

# 汇总接口返回
GET /api/trades/pnl-summary
{
    "today_total_pnl": 1240.0,    # 今日所有持仓合计盈亏（元）
    "total_holding_pnl": 5680.0,  # 所有持仓累计盈亏（元）
    "data_date": "2026-06-26"
}
```

---

## 五、前端页面设计

### 页面一：Dashboard（总览）

布局：顶部6个统计卡片 + 下方两列图表

**统计卡片（第一行，实时感知）：**
- 今日总盈亏（元）— 所有持仓当日合计，涨红跌绿
- 持仓总盈亏（元）— 所有持仓累计，盈红亏绿
- 持仓总盈亏（%）— 加权平均收益率

**统计卡片（第二行，历史统计）：**
- 总交易笔数 / 胜率（%）
- 平均盈亏比
- 平均纪律分

**图表区：**
- 左：按买入理由分类的胜率柱状图（题材 vs 基本面 vs 技术 vs 跟风）
- 右：纪律分时间趋势折线图（是否在进步）

---

### 页面二：交易列表

- Tab切换：持仓中 / 已平仓 / 全部
- 每行显示（持仓中）：

| 字段 | 说明 | 颜色规则 |
|------|------|----------|
| 股票名+代码 | 如 金钼股份 601958 | — |
| 买入日期 | 入场日 | — |
| 买入价 | 入场成本 | — |
| 今日涨跌幅 | 当日收盘价 vs 昨收（T+1，次日刷新） | 涨红跌绿 |
| 今日单日盈亏（元） | 今日涨跌幅 × 持仓市值 | 涨红跌绿 |
| 持仓累计盈亏（元） | (当前价 - 买入价) × 持仓数量 | 盈红亏绿 |
| 持仓累计盈亏（%） | (当前价 - 买入价) / 买入价 | 盈红亏绿 |
| 止损价 | 橙色显示，接近时高亮警告 | — |
| 操作 | 平仓 / 查看详情 | — |

- 每行显示（已平仓）：股票名+代码 / 买入日期 / 卖出日期 / 最终盈亏（元/%) / 纪律分
- 列表底部显示汇总行：**今日总盈亏 / 持仓总盈亏**
- 右上角"新建交易"按钮
- 点击行进入详情页

---

### 页面三：新建/编辑交易（TradeForm）

**买入信息（必填）：**
```
股票代码    [搜索框，输入自动补全名称]
买入日期    [日期选择器]
买入价格    [数字输入]
买入数量    [数字输入，自动计算金额]
仓位比例    [滑块 0-100%]
止损价      [数字输入] ⚠️ 必填，低于此价触发止损
目标价      [数字输入] 必填
```

**买入理由（必选一个以上标签）：**
```
[ 题材炒作 ]  [ 基本面改善 ]  [ 技术突破 ]  [ 跟风 ]  [ 其他 ]
```

**备注：** [自由文本]

> ⚠️ **系统规则**：止损价和目标价未填写时，保存按钮禁用，显示红色提示："设定止损是交易纪律的基础，请填写后再保存"

---

### 页面四：交易详情 + K线图

上半部分：K线图（Lightweight Charts）
- 展示买入前15日 + 买入后至今（或至平仓日后15日）
- 买入点：绿色三角向上标注
- 卖出点：红色三角向下标注
- 止损价：红色虚线水平线
- 目标价：绿色虚线水平线

K线图下方：盈亏速览栏（持仓中状态显示）
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   今日涨跌幅     │  今日单日盈亏    │  持仓累计盈亏    │  累计盈亏(%)    │
│   +3.25%  🔴   │  +648 元  🔴   │  +1,820 元 🔴  │   +9.42%  🔴  │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```
> 数据来源：AkShare T+1，次日开盘前刷新。页面显示最后更新时间，避免误判为实时数据。

下半部分：交易基本信息卡片
```
买入价：X.XX 元    当前价：X.XX 元（T+1）    止损价：X.XX 元 ⚠️
目标价：X.XX 元    持仓数量：XXX 股           买入理由：题材炒作
```

操作按钮：
- 持仓中：「填写平仓」按钮
- 平仓后：「填写复盘」按钮 / 「查看复盘」按钮

---

### 页面五：纪律自评 + 复盘（Review）

分两步：

**第一步：纪律评分**
```
1. 是否按止损计划执行？
   ● 是  ○ 否

2. 实际卖出原因
   ○ 触发止损（按计划）
   ○ 达到目标价（按计划）
   ○ 情绪性卖出（恐慌/贪婪）
   ○ 改变了原有判断

3. 纪律评分（1-5分）
   ★ ★ ★ ★ ★
```

**第二步：复盘四题**
```
Q1. 入场判断，准确在哪里？
    [文本框]

Q2. 最大的误判点是什么？
    [文本框]

Q3. 这次有什么可复用的规律？
    [文本框]

Q4. 下次遇到相似情况，你会怎么做？
    [文本框]
```

---

## 六、纪律强制规则（系统层面落地）

| 规则 | 触发条件 | 系统行为 |
|------|----------|----------|
| 止损价必填 | 新建交易未填止损价 | 保存按钮禁用，显示警告文字 |
| 目标价必填 | 新建交易未填目标价 | 同上 |
| 纪律自评必填 | 平仓后7天内未填自评 | 交易详情页显示橙色提醒横幅 |
| 复盘四题引导 | 填写自评时 | 四个问题逐步展开，不可留空直接提交 |

---

## 七、AkShare 行情数据集成

```python
# backend/routers/market.py 示例

import akshare as ak
import pandas as pd

def get_kline_data(stock_code: str, days: int = 60):
    """
    获取A股历史日K线数据
    stock_code: 如 "601958"（沪市）或 "000811"（深市）
    """
    # AkShare 接口：东方财富日K
    df = ak.stock_zh_a_hist(
        symbol=stock_code,
        period="daily",
        start_date=(pd.Timestamp.today() - pd.Timedelta(days=days)).strftime("%Y%m%d"),
        end_date=pd.Timestamp.today().strftime("%Y%m%d"),
        adjust="qfq"  # 前复权
    )
    return df[["日期", "开盘", "最高", "最低", "收盘", "成交量"]].rename(columns={
        "日期": "date", "开盘": "open", "最高": "high",
        "最低": "low", "收盘": "close", "成交量": "volume"
    }).to_dict(orient="records")
```

> **注意**：AkShare 数据为 T+1（当日数据次日更新），不支持实时行情。适合复盘使用，完全满足需求。

---

## 八、Docker 部署配置

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    volumes:
      - ./data:/app/data          # SQLite 数据库持久化
    environment:
      - DATABASE_URL=sqlite:///./data/trading.db
    ports:
      - "8000:8000"
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
```

### nginx/nginx.conf

```nginx
server {
    listen 80;

    # 前端
    location / {
        proxy_pass http://frontend:80;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 部署命令

```bash
# 1. 克隆项目到服务器
git clone <your-repo> trading-journal
cd trading-journal

# 2. 一键启动
docker compose up -d --build

# 3. 查看日志
docker compose logs -f

# 4. 访问
# http://你的服务器IP
```

---

## 九、开发阶段拆分（建议顺序）

### Phase 1：核心骨架（预计 1-2 天）
- [ ] 初始化项目结构（React + FastAPI + Docker）
- [ ] SQLite 数据库建表
- [ ] 交易录入表单（含止损价强制校验）
- [ ] 交易列表页
- [ ] Docker Compose 联调，部署到服务器

### Phase 2：复盘核心（预计 1-2 天）
- [ ] AkShare K线数据接口
- [ ] Lightweight Charts K线图组件
- [ ] 买入/卖出点标注（三角形 + 虚线）
- [ ] 纪律自评表单
- [ ] 复盘四题模板页

### Phase 3：分析提升（预计 1 天）
- [ ] Dashboard 统计卡片
- [ ] 按买入理由分组的胜率图
- [ ] 纪律分时间趋势图
- [ ] 纪律违规次数统计

---

## 十、给 Claude Code 的初始化指令

将以下内容作为第一条指令发给 Claude Code：

```
请按照以下规划搭建一个A股交易复盘与纪律管理系统：

技术栈：
- 前端：React 18 + Tailwind CSS + Lightweight Charts（K线）+ Recharts（统计图）
- 后端：Python FastAPI + SQLite
- 行情：AkShare（历史日K线 + 最新收盘价）
- 部署：Docker Compose + Nginx

请从 Phase 1 开始：
1. 初始化前后端项目结构
2. 创建 SQLite 数据库（trades / discipline_reviews / market_cache 三张表）
3. 实现交易录入 API（POST /api/trades）和前端表单，止损价和目标价未填时禁止提交
4. 实现交易列表页（GET /api/trades），持仓中每行需展示：
   - 今日涨跌幅（%）、今日单日盈亏（元）
   - 持仓累计盈亏（元）、持仓累计盈亏（%）
   - 列表底部汇总行：今日总盈亏 / 持仓总盈亏
   - 数据来源 AkShare T+1，需显示数据日期提示
5. Dashboard 顶部展示今日总盈亏、持仓总盈亏卡片
6. 配置 docker-compose.yml 和 nginx.conf

盈亏颜色规则：涨/盈为红色，跌/亏为绿色（A股习惯）。
UI风格：明亮清晰，主色调白底 + 蓝绿强调色，数据易读。
语言：前端界面全中文。

数据库文件持久化到 ./data/trading.db。
```

---

## 十一、未来可扩展功能（Phase 4+）

- 📊 月度复盘 PDF 自动生成
- 📱 PWA 支持（手机桌面快捷方式）
- 🔔 止损价提醒（对比当日收盘价，邮件/微信推送）
- 📈 对比基准（沪深300同期表现）
- 🏷️ 行业/主题标签体系（AI算力 / 能源 / 半导体）

---

*文档版本：v1.1 | 生成日期：2026-06-27*
*声明：本系统为个人交易记录工具，不构成投资建议。*
