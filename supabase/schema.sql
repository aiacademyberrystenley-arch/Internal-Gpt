create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  role text not null default 'student' check (role in ('admin', 'student', 'teacher', 'staff')),
  registration_number text,
  degree text,
  branch text,
  department text,
  semester int,
  created_at timestamptz not null default now()
);

-- For existing databases, add the student detail columns if missing:
alter table public.profiles add column if not exists registration_number text;
alter table public.profiles add column if not exists degree text;
alter table public.profiles add column if not exists branch text;

create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  file_url text,
  file_type text,
  category text,
  department text,
  semester int,
  visibility text not null default 'student' check (visibility in ('public', 'student', 'teacher', 'staff', 'admin')),
  academic_year text,
  tags text[] default '{}',
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'indexed', 'failed')),
  chunk_count int default 0,
  error_reason text,
  openai_file_id text,
  vector_store_id text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  sources jsonb default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.answer_feedback (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid references public.chat_messages(id) on delete set null,
  user_id uuid references public.profiles(id) on delete cascade,
  rating text not null check (rating in ('helpful', 'not_helpful')),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists documents_status_idx on public.documents(status);
create index if not exists documents_visibility_idx on public.documents(visibility);
create index if not exists document_chunks_document_id_idx on public.document_chunks(document_id);
create index if not exists chat_sessions_user_id_idx on public.chat_sessions(user_id);
create index if not exists chat_messages_session_id_idx on public.chat_messages(session_id);

insert into storage.buckets (id, name, public)
values ('college-documents', 'college-documents', true)
on conflict (id) do nothing;
