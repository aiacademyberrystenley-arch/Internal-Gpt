alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.answer_feedback enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "Users can read own profile" on public.profiles
for select using (id = auth.uid() or public.current_role() = 'admin');

create policy "Users can upsert own profile" on public.profiles
for insert with check (id = auth.uid());

create policy "Users can update own profile" on public.profiles
for update using (id = auth.uid() or public.current_role() = 'admin');

create policy "Role-filtered document reads" on public.documents
for select using (
  visibility = 'public'
  or public.current_role() = 'admin'
  or (public.current_role() = 'student' and visibility in ('student'))
  or (public.current_role() in ('teacher', 'staff') and visibility in ('student', 'teacher', 'staff'))
);

create policy "Admins and teachers insert documents" on public.documents
for insert with check (public.current_role() in ('admin', 'teacher'));

create policy "Admins update documents" on public.documents
for update using (public.current_role() = 'admin');

create policy "Admins delete documents" on public.documents
for delete using (public.current_role() = 'admin');

create policy "Chunks follow document visibility" on public.document_chunks
for select using (
  exists (
    select 1 from public.documents d
    where d.id = document_id
    and (
      d.visibility = 'public'
      or public.current_role() = 'admin'
      or (public.current_role() = 'student' and d.visibility in ('student'))
      or (public.current_role() in ('teacher', 'staff') and d.visibility in ('student', 'teacher', 'staff'))
    )
  )
);

create policy "Admins and teachers insert chunks" on public.document_chunks
for insert with check (public.current_role() in ('admin', 'teacher'));

create policy "Admins delete chunks" on public.document_chunks
for delete using (public.current_role() = 'admin');

create policy "Users read own sessions" on public.chat_sessions
for select using (user_id = auth.uid());

create policy "Users create own sessions" on public.chat_sessions
for insert with check (user_id = auth.uid());

create policy "Users read own messages" on public.chat_messages
for select using (
  exists (select 1 from public.chat_sessions s where s.id = session_id and s.user_id = auth.uid())
);

create policy "Users create messages in own sessions" on public.chat_messages
for insert with check (
  exists (select 1 from public.chat_sessions s where s.id = session_id and s.user_id = auth.uid())
);

create policy "Users create own feedback" on public.answer_feedback
for insert with check (user_id = auth.uid());

create policy "Staff read feedback" on public.answer_feedback
for select using (public.current_role() in ('admin', 'teacher', 'staff'));

create policy "Admins read audit logs" on public.audit_logs
for select using (public.current_role() = 'admin');

create policy "Users create audit logs" on public.audit_logs
for insert with check (user_id = auth.uid());

create policy "Authenticated upload college files" on storage.objects
for insert with check (
  bucket_id = 'college-documents'
  and auth.role() = 'authenticated'
  and public.current_role() in ('admin', 'teacher')
);

create policy "Authenticated read college files" on storage.objects
for select using (bucket_id = 'college-documents' and auth.role() = 'authenticated');
