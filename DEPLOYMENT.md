# Deployment Guide

Recommended prototype deployment:

- Frontend: Vercel
- Backend: Render Web Service
- Database/Auth/Storage: Supabase
- AI: Groq

## Before You Push

Do not commit local secrets. This repo includes `.gitignore` entries for `.env`, `node_modules`, and build output.

Because the Groq key was pasted during setup, rotate it in Groq before using this for a public demo.

## Backend on Render

Create a new Render Web Service from this repo.

Use:

```text
Root directory: backend
Build command: npm install
Start command: npm run start
```

Set these Render environment variables:

```text
NODE_ENV=production
CORS_ORIGIN=https://your-vercel-app.vercel.app
SUPABASE_URL=https://qfhpqafeuvebpllzbcyf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_STORAGE_BUCKET=college-documents
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.1-8b-instant
AI_TIMEOUT_MS=12000
```

After deploy, test:

```text
https://your-render-service.onrender.com/api/health
```

It should return:

```json
{"status":"ok","service":"college-internal-gpt-api"}
```

## Frontend on Vercel

Create a new Vercel project from this repo.

Use:

```text
Root directory: frontend
Framework preset: Vite
Build command: npm run build
Output directory: dist
```

Set these Vercel environment variables:

```text
VITE_API_BASE_URL=https://your-render-service.onrender.com
VITE_SUPABASE_URL=https://qfhpqafeuvebpllzbcyf.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Redeploy the frontend after changing `VITE_API_BASE_URL`; Vite bakes frontend env vars during build.

## Supabase Auth URLs

In Supabase Dashboard:

```text
Authentication -> URL Configuration
```

Set:

```text
Site URL: https://your-vercel-app.vercel.app
Redirect URLs:
http://localhost:5173/**
https://your-vercel-app.vercel.app/**
```

For Vercel preview deployments, Supabase supports wildcard redirect URLs, but use your exact production URL for the final demo.

## Final Production Wiring

Once both services are deployed:

1. Copy the Vercel URL.
2. Put it into Render `CORS_ORIGIN`.
3. Copy the Render backend URL.
4. Put it into Vercel `VITE_API_BASE_URL`.
5. Redeploy both services.
6. Test login, document upload, chat, citations, and feedback.

## Common Issues

### CORS Error

Render `CORS_ORIGIN` must exactly match the Vercel site origin, for example:

```text
https://college-internal-gpt.vercel.app
```

No trailing slash.

### Frontend Still Calls Localhost

Update Vercel `VITE_API_BASE_URL` and redeploy the frontend.

### Signup Email Problems

For a demo, either disable email confirmation in Supabase or create an admin user from the backend:

```bash
cd backend
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=StrongPass123 npm run create:admin
```

### Render Free Tier Delay

Free web services can sleep after inactivity. The first request after sleep may be slow.
