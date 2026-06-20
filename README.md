# Internal GPT for College

A full-stack RAG prototype for a college helpdesk. Admins upload college documents, the backend extracts and chunks the text, and students or staff ask questions that are answered only from visible uploaded data with citations.

## Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express
- Auth, database, storage: Supabase
- AI: Groq or OpenAI answer generation with a local chunk retrieval layer that can be upgraded to pgvector or hosted File Search

## Project Structure

```text
college-internal-gpt/
  frontend/
  backend/
  supabase/
  sample-data/
```

## Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Create Supabase project, then run:

```sql
-- Supabase SQL editor
-- 1. supabase/schema.sql
-- 2. supabase/policies.sql
```

The prototype retrieval works without pgvector. Add a vector column later when you upgrade `rag.service.js` to embedding similarity search.

3. Copy env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

4. Fill in Supabase and AI keys. For the smoothest demo, disable Supabase email confirmation while creating test accounts.

For Groq:

```bash
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.1-8b-instant
AI_TIMEOUT_MS=12000
```

If Supabase email rate limits block signup, create an already-confirmed admin from the backend:

```bash
cd backend
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=StrongPass123 npm run create:admin
```

5. Run the app:

```bash
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:5050/api/health`

## Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the Hostinger VPS deployment guide (Nginx + PM2).

## Demo Flow

1. Sign up as an `admin`.
2. Open Documents.
3. Upload `sample-data/sample-college-notice.txt` with visibility `student`.
4. Open Chat and ask: `When is the DBMS exam?`
5. The assistant should answer from the uploaded notice and show the source card.
6. Sign up as a `student`; student accounts cannot upload or delete documents.
7. Upload another document with visibility `admin`; student queries will not retrieve it.

## RAG Behavior

Upload flow:

```text
file upload -> Supabase Storage -> documents row -> text extraction -> chunking -> document_chunks rows -> indexed status
```

Query flow:

```text
question -> role visibility filter -> retrieve top chunks -> answer from context -> sources returned -> audit and chat messages stored
```

If retrieval is weak, the backend returns:

```text
I do not have enough information in the uploaded college data.
```

## Production Upgrade Notes

- Replace `rag.service.js` scoring with pgvector similarity search after enabling the `vector` extension and storing embeddings.
- Extend `openai.service.js` to upload files to an OpenAI vector store if you prefer hosted File Search.
- Add admin-only user management before using real college data.
- Use private Supabase storage signed URLs for sensitive documents.
