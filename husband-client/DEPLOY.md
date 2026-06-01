# PWA 静态部署说明

## 本地检查

```bash
npm install
npm run dev
npm run build
```

`npm run build` 会生成 `dist/`，部署时只需要把 `dist/` 目录作为静态网站根目录。

## 环境变量

复制 `.env.example` 为 `.env`，按需配置：

```bash
VITE_API_BASE_URL=
VITE_PUBLIC_BASE_PATH=/
```

- `VITE_API_BASE_URL` 留空时，请求默认走同域 `/api`。
- `VITE_PUBLIC_BASE_PATH` 默认 `/`，如果部署到子目录可改为 `/your-sub-path/`。

## 服务器配置

这是单页应用，刷新 `/wife` 等前端路由时，服务器需要回退到 `index.html`。

Nginx 示例：

```nginx
server {
  listen 80;
  server_name example.com;
  root /path/to/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

Netlify / Cloudflare Pages 可直接部署 `dist/`，项目已在 `public/_redirects` 中提供：

```text
/* /index.html 200
```

部署完成后建议用 HTTPS 访问，PWA 安装和 Service Worker 需要 HTTPS 或 localhost。
