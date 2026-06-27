#!/usr/bin/env bash
# A股交易复盘系统 · 一键部署脚本
# 用法：在服务器上 clone 项目后，进入项目根目录执行  bash deploy.sh
# 适配：OpenCloudOS / CentOS / TencentOS (dnf/yum) 与 Ubuntu / Debian (apt)
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info(){ echo -e "${GREEN}[INFO]${NC} $*"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $*"; }
err(){  echo -e "${RED}[ERR ]${NC} $*"; }

# root 直接执行，否则用 sudo
if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

# ---------- 1. 检测包管理器 ----------
if   command -v dnf     >/dev/null 2>&1; then PM=dnf
elif command -v yum     >/dev/null 2>&1; then PM=yum
elif command -v apt-get >/dev/null 2>&1; then PM=apt
else err "未识别的包管理器（非 dnf/yum/apt），请手动安装 Docker 后再跑 docker compose up -d --build"; exit 1; fi
info "系统包管理器：$PM"

# ---------- 2. 加 swap（内存 < 3G 且无 swap 时建 2G，防止构建 OOM）----------
mem_kb=$(awk '/MemTotal/{print $2}'  /proc/meminfo)
swap_kb=$(awk '/SwapTotal/{print $2}' /proc/meminfo)
if [ "$mem_kb" -lt 3000000 ] && [ "$swap_kb" -lt 102400 ]; then
  info "内存较小且无 swap，创建 2G swap 文件..."
  $SUDO dd if=/dev/zero of=/swapfile bs=1M count=2048
  $SUDO chmod 600 /swapfile
  $SUDO mkswap /swapfile
  $SUDO swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | $SUDO tee -a /etc/fstab >/dev/null
  info "swap 已启用：$(free -h | awk '/Swap/{print $2}')"
else
  info "内存充足或已有 swap，跳过"
fi

# ---------- 3. 安装 Docker ----------
if ! command -v docker >/dev/null 2>&1; then
  info "安装 Docker..."
  if [ "$PM" = apt ]; then
    curl -fsSL https://get.docker.com | $SUDO sh
  else
    $SUDO $PM install -y dnf-plugins-core curl >/dev/null 2>&1 || true
    $SUDO dnf config-manager --add-repo https://mirrors.tencent.com/docker-ce/linux/centos/docker-ce.repo 2>/dev/null \
      || $SUDO yum-config-manager --add-repo https://mirrors.tencent.com/docker-ce/linux/centos/docker-ce.repo 2>/dev/null \
      || true
    $SUDO $PM install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  fi
  $SUDO systemctl enable --now docker
else
  info "Docker 已安装：$(docker --version)"
fi

# ---------- 4. 确认 compose 插件 ----------
if ! docker compose version >/dev/null 2>&1; then
  warn "未检测到 docker compose 插件，尝试安装..."
  $SUDO $PM install -y docker-compose-plugin
fi

# ---------- 5. 放通防火墙 80（如启用）----------
if command -v firewall-cmd >/dev/null 2>&1 && $SUDO firewall-cmd --state >/dev/null 2>&1; then
  $SUDO firewall-cmd --permanent --add-port=80/tcp >/dev/null && $SUDO firewall-cmd --reload >/dev/null
  info "firewalld 已放通 80/tcp"
elif command -v ufw >/dev/null 2>&1 && $SUDO ufw status 2>/dev/null | grep -q active; then
  $SUDO ufw allow 80/tcp >/dev/null
  info "ufw 已放通 80/tcp"
fi

# ---------- 6. 构建并启动 ----------
info "构建并启动容器（首次安装 pandas/akshare 较慢，请耐心等待 5-10 分钟）..."
$SUDO docker compose up -d --build

info "等待服务就绪..."
sleep 5
$SUDO docker compose ps

ip=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || echo "你的公网IP")
echo ""
info "部署完成！浏览器访问： http://${ip}"
warn "若打不开，请确认【腾讯云控制台 → 安全组 → 入站规则】已放通 TCP 80 端口。"
