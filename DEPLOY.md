# 部署到腾讯云服务器（Docker 一键部署）

适用于腾讯云 **OpenCloudOS / CentOS / TencentOS / Ubuntu**，2核2G 即可。
整体流程：**装 Docker → 拉代码 → 跑 `deploy.sh` → 开放 80 端口 → 访问公网IP**。

> 不确定系统版本？先跑一条命令看看：
> ```bash
> cat /etc/os-release | grep PRETTY_NAME
> ```

---

## ⚠️ 2核2G 内存提醒
内存较小时，构建前端/后端镜像可能因内存不足（OOM）失败。
`deploy.sh` 会**自动检测并创建 2G swap**，无需手动操作。若你想手动加：
```bash
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 一、把代码拉到服务器

仓库是**私有**的，clone 需要鉴权。推荐用 GitHub 个人令牌（PAT）：

1. GitHub → Settings → Developer settings → Personal access tokens →
   **Generate new token (classic)** → 勾选 `repo` → 复制令牌。
2. 服务器上执行（先装 git）：
   ```bash
   # CentOS 系： sudo dnf install -y git    Ubuntu： sudo apt install -y git
   git clone https://<你的令牌>@github.com/tl993201420-sys/-.git trading-journal
   cd trading-journal
   ```
   > 把 `<你的令牌>` 换成第 1 步复制的串。

---

## 二、一键部署

```bash
bash deploy.sh
```
脚本会自动完成：检测系统 → 加 swap → 装 Docker 与 compose 插件 → 放通本机防火墙 80 → `docker compose up -d --build` → 打印访问地址。

首次构建后端要装 pandas/akshare，**比较慢（5-10 分钟）属正常**。

---

## 三、开放安全组 80 端口（务必）

腾讯云本机防火墙脚本已处理，但**云平台安全组需手动放通**：

控制台 → 你的实例 → **安全组 → 入站规则 → 添加规则**：
- 类型：自定义 / 来源 `0.0.0.0/0` / 协议端口 `TCP:80` / 策略 允许

---

## 四、访问

浏览器打开 **`http://你的公网IP`** 即可使用。

---

## 五、日常运维

```bash
docker compose ps               # 查看状态
docker compose logs -f          # 看日志（Ctrl+C 退出）
docker compose restart          # 重启
docker compose down             # 停止（数据保留）

# 更新代码后重新部署
git pull && docker compose up -d --build
```

- 数据库持久化在 `./data/trading.db`，`down` / 重启不会丢数据。
- **备份**：`cp data/trading.db data/trading.db.$(date +%F).bak`

---

## 六、可选：本地构建镜像再上传（内存实在不够时）

若 2G+swap 仍构建失败，可在**你本机**（已装 Docker）构建好镜像传上去，服务器不再 build：

```bash
# 本机
docker compose build
docker save 000000stock-backend 000000stock-frontend nginx:1.25-alpine -o images.tar
scp images.tar root@你的公网IP:/root/trading-journal/

# 服务器
docker load -i images.tar
docker compose up -d            # 注意：不带 --build
```

---

## 七、可选：HTTPS / 域名

有域名的话，可把根目录 `nginx/nginx.conf` 换成带证书的配置，或在前面加一层
[Caddy](https://caddyserver.com/) 自动签发 Let's Encrypt 证书。需要我配可以告诉我。
