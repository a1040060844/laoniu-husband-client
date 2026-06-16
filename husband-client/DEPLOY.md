# PWA Static Deployment

## Local Checks

```bash
npm install
npm run dev
npm run build
npm run check
```

`npm run build` writes the static site to `dist/`. Deploy the contents of `dist/` as the website root.

## Environment Variables

Copy `.env.example` to `.env` when local overrides are needed:

```bash
VITE_API_BASE_URL=
VITE_PUBLIC_BASE_PATH=/
```

- `VITE_API_BASE_URL` can stay empty during local development. Vite then serves
  `/api/state` itself and persists shared LAN state to `../app-data/state.json`.
- Set `VITE_API_BASE_URL` only when an external state service is available.
- `VITE_PUBLIC_BASE_PATH` defaults to `/`. Set it to a subpath such as `/app/` only when deploying under that subdirectory.

## SPA Fallback

This is a single-page app. Static hosts must return `index.html` for frontend routes such as `/wife`.

The repo includes `public/_redirects`, which is copied into `dist/` for Netlify and Cloudflare Pages:

```text
/* /index.html 200
```

Nginx equivalent:

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

PWA install and Service Worker require HTTPS in production. `localhost` is allowed for local testing.
