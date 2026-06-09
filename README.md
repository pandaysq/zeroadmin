# ZeroAdmin — Mission Control for Your Servers

> Платформа мониторинга серверов с AI-анализом инцидентов. Видишь что происходит на всех серверах в реальном времени — CPU, RAM, диск, аптайм, алерты. При критических событиях AI-сисадмин объясняет причину и даёт команду для исправления.

![ZeroAdmin Dashboard](https://img.shields.io/badge/ZeroAdmin-Mission_Control-00ffd1?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-24-green?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-gray?style=flat-square)

---

## Что умеет

- **Dashboard** — обзор всего флота серверов: онлайн/оффлайн/warning, активные алерты
- **Серверы** — добавление, редактирование, удаление; каждый сервер получает уникальный `agentToken`
- **Детали сервера** — живые метрики (CPU, RAM, Disk, Uptime), история в виде графиков
- **Алерты** — автоматические при CPU > 90% или RAM > 90%; ручное разрешение
- **AI-анализ** — при критическом алерте OpenRouter объясняет причину и даёт SSH-команду для исправления
- **Python-агент** — лёгкий скрипт, который ставится на любой Linux-сервер и шлёт метрики + системные логи

---

## Стек

| Слой | Технологии |
|------|-----------|
| Frontend | React 19, Vite, Tailwind CSS, shadcn/ui, Recharts, Wouter |
| Backend | Node.js 24, Express 5, TypeScript 5.9 |
| База данных | PostgreSQL 16 + Drizzle ORM |
| AI | OpenRouter API (модель настраивается через `.env`) |
| Монорепо | pnpm workspaces |

---

## Быстрый старт (локально)

### Требования
- Node.js 20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL 14+

### 1. Клонируй и установи зависимости

```bash
git clone https://github.com/ТВО_ИМЯ/zeroadmin.git
cd zeroadmin
pnpm install
```

### 2. Настрой переменные окружения

```bash
cp .env.example .env
```

Открой `.env` и заполни:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/zeroadmin
SESSION_SECRET=замени_на_случайную_строку_50_символов
NODE_ENV=development

# AI-анализ (опционально, бесплатно на openrouter.ai)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=meta-llama/llama-3-8b-instruct:free
```

> **Получить OPENROUTER_API_KEY:** зарегистрируйся на [openrouter.ai](https://openrouter.ai) → Keys → Create Key. Модель `meta-llama/llama-3-8b-instruct:free` полностью бесплатна.

### 3. Создай базу данных и применй схему

```bash
# Создай базу (если ещё не создана)
createdb zeroadmin

# Примени схему
pnpm --filter @workspace/db run push
```

### 4. Запусти

Открой два терминала:

```bash
# Терминал 1 — Backend API (порт 8080)
pnpm --filter @workspace/api-server run dev

# Терминал 2 — Frontend (порт 19103)
pnpm --filter @workspace/tg-devops run dev
```

Открывай: [http://localhost:19103](http://localhost:19103)

---

## Деплой на VPS (Ubuntu 22.04+)

### 1. Подготовка сервера

```bash
# Подключись по SSH
ssh root@IP_ТВОЕГО_VPS

# Установи Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Установи pnpm и pm2
npm install -g pnpm pm2

# Установи PostgreSQL
sudo apt install -y postgresql postgresql-contrib nginx
```

### 2. Настрой PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE USER zeroadmin WITH PASSWORD 'СИЛЬНЫЙ_ПАРОЛЬ_ЗДЕСЬ';
CREATE DATABASE zeroadmin OWNER zeroadmin;
\q
```

### 3. Задеплой код

```bash
cd /var/www
git clone https://github.com/ТВО_ИМЯ/zeroadmin.git
cd zeroadmin

# Создай .env
nano .env
```

Вставь в `.env`:

```env
DATABASE_URL=postgresql://zeroadmin:СИЛЬНЫЙ_ПАРОЛЬ_ЗДЕСЬ@localhost:5432/zeroadmin
SESSION_SECRET=любая_длинная_случайная_строка
NODE_ENV=production
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=meta-llama/llama-3-8b-instruct:free
```

```bash
# Установи зависимости
pnpm install

# Примени схему БД
pnpm --filter @workspace/db run push

# Собери API
pnpm --filter @workspace/api-server run build

# Собери фронтенд
pnpm --filter @workspace/tg-devops run build
```

### 4. Запусти через PM2

```bash
pm2 start /var/www/zeroadmin/artifacts/api-server/dist/index.mjs \
  --name "zeroadmin-api" \
  --env production

pm2 save
pm2 startup
```

### 5. Настрой Nginx

```bash
nano /etc/nginx/sites-available/zeroadmin
```

```nginx
server {
    listen 80;
    server_name ВАШ_ДОМЕН_ИЛИ_IP;

    # Статика фронтенда
    root /var/www/zeroadmin/artifacts/tg-devops/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API прокси
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/zeroadmin /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

### 6. HTTPS через Let's Encrypt (рекомендуется)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ВАШ_ДОМЕН
```

---

## Python-агент (для мониторинга серверов)

Ставь этот скрипт на **каждый сервер**, который хочешь мониторить.

### Установка

```bash
pip3 install psutil requests

# Скачай агент
curl -O https://raw.githubusercontent.com/ТВО_ИМЯ/zeroadmin/main/agent/zeroadmin-agent.py
```

### Настройка (`zeroadmin-agent.py`)

```python
#!/usr/bin/env python3
"""
ZeroAdmin Agent — мониторинг сервера
Шлёт метрики и системные логи на ZeroAdmin платформу каждые N секунд.
"""
import time, requests, psutil, os

# === НАСТРОЙКИ ===
API_URL   = "https://ВАШ_ДОМЕН/api"   # адрес вашей ZeroAdmin платформы
SERVER_ID = 1                           # ID сервера (смотри в платформе)
TOKEN     = "ВАШ_AGENT_TOKEN"          # agentToken из карточки сервера
INTERVAL  = 30                          # секунд между отправками
LOG_FILE  = "/var/log/syslog"          # путь к логам (или /var/log/messages)
CPU_LOG_THRESHOLD = 85                  # шлём логи когда CPU выше этого %
# =================

def get_last_logs(lines=30):
    try:
        with open(LOG_FILE, "r", errors="ignore") as f:
            return "".join(f.readlines()[-lines:])
    except Exception:
        return None

def get_top_process():
    try:
        procs = sorted(
            psutil.process_iter(["name", "cpu_percent"]),
            key=lambda p: p.info["cpu_percent"] or 0,
            reverse=True
        )
        return procs[0].info["name"] if procs else None
    except Exception:
        return None

print(f"[ZeroAdmin Agent] Стартую. Сервер #{SERVER_ID} -> {API_URL}")

while True:
    try:
        cpu    = psutil.cpu_percent(interval=1)
        mem    = psutil.virtual_memory()
        disk   = psutil.disk_usage("/")
        net    = psutil.net_io_counters()
        uptime = int(time.time() - psutil.boot_time())

        payload = {
            "cpuPercent":    cpu,
            "memoryUsedMb":  mem.used / 1024**2,
            "memoryTotalMb": mem.total / 1024**2,
            "diskUsedGb":    disk.used / 1024**3,
            "diskTotalGb":   disk.total / 1024**3,
            "uptimeSeconds": uptime,
            "topProcess":    get_top_process(),
            "lastLogs":      get_last_logs() if cpu > CPU_LOG_THRESHOLD else None,
        }

        r = requests.post(
            f"{API_URL}/servers/{SERVER_ID}/metrics",
            json=payload,
            headers={"Authorization": f"Bearer {TOKEN}"},
            timeout=10
        )
        r.raise_for_status()
        print(f"[OK] CPU:{cpu:.1f}% MEM:{mem.percent:.1f}% DISK:{disk.percent:.1f}%")

    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Сеть: {e}")
    except Exception as e:
        print(f"[ERROR] {e}")

    time.sleep(INTERVAL)
```

### Запуск как systemd-сервис (чтобы стартовал автоматически)

```bash
# Создай файл сервиса
sudo nano /etc/systemd/system/zeroadmin-agent.service
```

```ini
[Unit]
Description=ZeroAdmin Monitoring Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/zeroadmin-agent
ExecStart=/usr/bin/python3 /opt/zeroadmin-agent/zeroadmin-agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo mkdir -p /opt/zeroadmin-agent
sudo cp zeroadmin-agent.py /opt/zeroadmin-agent/

sudo systemctl daemon-reload
sudo systemctl enable zeroadmin-agent
sudo systemctl start zeroadmin-agent

# Проверь статус
sudo systemctl status zeroadmin-agent
```

---

## Как добавить новый сервер

1. Открой ZeroAdmin → **Servers** → **New Server**
2. Заполни название, IP/hostname, описание
3. Скопируй `agentToken` из карточки сервера
4. Установи агент на сервер (см. выше) и вставь токен в `TOKEN = "..."`
5. Готово — сервер появится онлайн через 30 секунд

---

## Структура проекта

```
zeroadmin/
├── artifacts/
│   ├── api-server/          # Express API (Node.js)
│   │   └── src/
│   │       ├── routes/      # Маршруты: servers, alerts, dashboard
│   │       └── lib/
│   │           └── openrouter.ts  # AI-модуль
│   └── tg-devops/           # React фронтенд
│       └── src/
│           ├── pages/       # Dashboard, Servers, Alerts, ServerDetail
│           └── components/  # Layout (ZA logo), StatusBadge, ServerForm
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml     # Контракт API (источник правды)
│   ├── api-client-react/    # Сгенерированные React Query хуки
│   ├── api-zod/             # Сгенерированные Zod-схемы
│   └── db/
│       └── src/schema/      # Drizzle ORM схемы таблиц
└── agent/
    └── zeroadmin-agent.py   # Python-агент для серверов
```

---

## Обновление после изменений в API

```bash
# После правок в lib/api-spec/openapi.yaml:
pnpm --filter @workspace/api-spec run codegen

# После правок в lib/db/src/schema/:
pnpm --filter @workspace/db run push
```

---

## Переменные окружения

| Переменная | Обязательная | Описание |
|-----------|-------------|---------|
| `DATABASE_URL` | Да | PostgreSQL connection string |
| `SESSION_SECRET` | Да | Секрет для сессий (любая длинная строка) |
| `NODE_ENV` | Нет | `development` или `production` |
| `OPENROUTER_API_KEY` | Нет | API ключ для AI-анализа инцидентов |
| `OPENROUTER_MODEL` | Нет | Модель (по умолчанию: `meta-llama/llama-3-8b-instruct:free`) |

---

## Лицензия

MIT — делай что хочешь, ставь куда хочешь.
