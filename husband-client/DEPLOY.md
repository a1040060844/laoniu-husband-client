# 老妞大人宠宠我上线说明

## 本地上线检查

```bash
npm install
npm install --prefix server
npm test
npm run build
npm run server:build
```

前端产物输出到 `dist/`，正式服务端入口为 `server/dist/app.js`。

## 推荐生产模式

使用新版 Node + SQLite 服务端。它会同时提供：

- `/husband`
- `/wife`
- `/admin`
- `GET /api/health`
- `GET /api/state`
- `PUT /api/state`
- `POST /api/admin/system/backup`

服务器目录示例：

```bash
/var/www/laoniu-husband-client
├── dist/
├── server/
│   ├── dist/
│   ├── migrations/
│   ├── package.json
│   └── package-lock.json
```

数据目录建议放到独立持久化路径：

```bash
/var/lib/laoniu-husband
├── laoniu.sqlite
├── backups/
└── uploads/
```

## 服务端环境变量

在服务器 `server/.env` 中配置：

```bash
NODE_ENV=production
HOST=127.0.0.1
PORT=4180
DATABASE_PATH=/var/lib/laoniu-husband/laoniu.sqlite
BACKUP_DIR=/var/lib/laoniu-husband/backups
UPLOAD_DIR=/var/lib/laoniu-husband/uploads
CLIENT_DIST_DIR=../dist
JSON_LIMIT=8mb
BACKUP_RETENTION=10
```

## 启动命令

```bash
cd /var/www/laoniu-husband-client/server
npm ci --omit=dev
node dist/app.js
```

## systemd 示例

```ini
[Unit]
Description=Laoniu Husband Client
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/laoniu-husband-client/server
EnvironmentFile=/var/www/laoniu-husband-client/server/.env
ExecStart=/usr/bin/node dist/app.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

启用：

```bash
sudo mkdir -p /var/lib/laoniu-husband/backups /var/lib/laoniu-husband/uploads
sudo chown -R www-data:www-data /var/lib/laoniu-husband
sudo systemctl daemon-reload
sudo systemctl enable --now laoniu-husband
```

## Nginx 示例

```nginx
server {
  listen 80;
  server_name your-domain.example;

  location / {
    proxy_pass http://127.0.0.1:4180;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

生产 PWA 建议配置 HTTPS。

## 健康检查

```bash
curl http://127.0.0.1:4180/api/health
curl http://127.0.0.1:4180/api/state
```

如果 `/admin/dashboard`、`/husband`、`/wife` 都返回页面，说明 SPA fallback 正常。
