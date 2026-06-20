# Deployment Guide — Hostinger VPS

This app has two parts that run on one Hostinger VPS:

- **Backend** — Node/Express API, kept alive by PM2
- **Frontend** — static Vite build (`dist/`), served by Nginx
- **Database / Auth / Storage** — Supabase (hosted)
- **AI** — Groq

Nginx is the public entry point: it serves the frontend and reverse-proxies
`/api` to the Node backend.

---

## 0. Before you start

- A Hostinger **VPS** (Ubuntu recommended) with SSH access.
- A domain (or subdomain) pointed at the VPS IP via an `A` record.
- **Rotate any keys that were ever committed or pasted** (Groq, OpenAI,
  Supabase service-role) and use the fresh ones below. Never put real keys
  in the repo — only in `backend/.env` on the server.

---

## 1. Supabase setup (once)

In the Supabase dashboard SQL editor, run in order:

1. `supabase/schema.sql`
2. `supabase/policies.sql`

Then under **Authentication → URL Configuration** set:

```text
Site URL:      https://yourdomain.com
Redirect URLs: https://yourdomain.com/**
               http://localhost:5173/**
```

---

## 2. Prepare the VPS

SSH in, then install Node 20 LTS, Nginx, and PM2:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo npm install -g pm2
```

Clone your repo:

```bash
cd /var/www
git clone <your-repo-url> campus-gpt
cd campus-gpt
```

---

## 3. Backend (Node + PM2)

```bash
cd /var/www/campus-gpt/backend
npm install
cp .env.example .env
nano .env   # fill in real values (see below)
```

`backend/.env` for production:

```text
PORT=5050
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com

AI_PROVIDER=groq
GROQ_API_KEY=your_fresh_groq_key
GROQ_MODEL=llama-3.1-8b-instant
AI_TIMEOUT_MS=12000

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_fresh_service_role_key
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_STORAGE_BUCKET=college-documents

# Optional: chat rate limit (defaults: 15 questions / 60s per user)
CHAT_RATE_MAX=15
CHAT_RATE_WINDOW_MS=60000
```

Start it under PM2 and enable boot startup:

```bash
pm2 start src/server.js --name campus-gpt-api
pm2 save
pm2 startup    # run the command it prints
```

Verify locally on the box:

```bash
curl http://localhost:5050/api/health
# {"status":"ok","service":"college-internal-gpt-api"}
```

---

## 4. Frontend (static build)

```bash
cd /var/www/campus-gpt/frontend
npm install
cp .env.example .env
nano .env
```

`frontend/.env` — note the API base is just `/api` because Nginx proxies it
on the same domain (no CORS, no hardcoded backend URL):

```text
VITE_API_BASE_URL=
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

> If your API client requires an absolute URL, use `https://yourdomain.com`.

Build:

```bash
npm run build
# outputs to frontend/dist
```

---

## 5. Nginx (serve frontend + proxy API)

Create `/etc/nginx/sites-available/campus-gpt`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/campus-gpt/frontend/dist;
    index index.html;

    # SPA routing — fall back to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to the Node backend
    location /api/ {
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 10M;  # allow document uploads
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/campus-gpt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. HTTPS (free, Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot rewrites the Nginx config for TLS and sets up auto-renewal.

---

## 7. First admin + smoke test

Create an already-confirmed admin (avoids email confirmation friction):

```bash
cd /var/www/campus-gpt/backend
ADMIN_EMAIL=admin@yourcollege.edu ADMIN_PASSWORD=StrongPass123 npm run create:admin
```

Then test the live site:

1. `https://yourdomain.com` loads the app.
2. Sign in as admin → Documents → upload `sample-data/sample-college-notice.txt` (visibility `student`).
3. Open Quest Chat → ask "When is the DBMS exam?" → expect an answer + source card.
4. Confirm feedback thumbs work.

---

## Updating after code changes

```bash
cd /var/www/campus-gpt
git pull
# backend changed:
cd backend && npm install && pm2 restart campus-gpt-api
# frontend changed:
cd ../frontend && npm install && npm run build
```

---

## Troubleshooting

- **502 Bad Gateway** — backend isn't running. Check `pm2 logs campus-gpt-api`.
- **Frontend calls wrong API** — `VITE_*` vars are baked at build time; rebuild
  the frontend after changing `frontend/.env`.
- **Login redirect issues** — Supabase Site URL / Redirect URLs must match your
  exact `https://yourdomain.com` (no trailing slash).
- **Upload fails on large files** — raise `client_max_body_size` in Nginx and
  the `express.json` limit in `backend/src/server.js`.
- **"Too many requests"** — the chat rate limit; tune `CHAT_RATE_MAX` /
  `CHAT_RATE_WINDOW_MS` in `backend/.env`.
