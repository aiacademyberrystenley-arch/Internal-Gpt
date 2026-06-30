-- ============================================================================
-- Guest leads — standalone Supabase migration
-- ----------------------------------------------------------------------------
-- Captures name / email / phone entered on the public "Continue as guest"
-- login step. Written by the backend service role (which bypasses RLS);
-- only admins may read.
--
-- This is a separate, self-contained migration — it does NOT depend on
-- schema.sql or policies.sql. Run it once in the Supabase SQL editor
-- (Dashboard → SQL Editor → paste → Run). Safe to re-run (idempotent).
-- ============================================================================

create extension if not exists "uuid-ossp";

create table if not exists public.guest_leads (
  id uuid primary key default uuid_generate_v4(),
  full_name text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create index if not exists guest_leads_created_at_idx on public.guest_leads(created_at desc);

-- Lock the table down: the backend service role bypasses RLS for inserts,
-- and only admins can read leads. No public insert/select policy on purpose.
alter table public.guest_leads enable row level security;

drop policy if exists "Admins read guest leads" on public.guest_leads;
create policy "Admins read guest leads" on public.guest_leads
for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
