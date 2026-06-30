-- ============================================================================
-- Document audiences — standalone Supabase migration
-- ----------------------------------------------------------------------------
-- Adds multi-select "visible to" roles to documents, so a single document can
-- be shared with any combination of roles (e.g. Student + Teacher). Admins
-- always see everything. The legacy single `visibility` column is kept and
-- still derived on upload, so nothing else breaks.
--
-- Standalone, idempotent migration. Run once in the Supabase SQL editor.
-- ============================================================================

alter table public.documents
  add column if not exists visible_to text[] not null default '{}';

-- Backfill from the old hierarchical `visibility` so existing documents keep
-- showing to the same people.
update public.documents set visible_to = case visibility
  when 'public'  then array['public']
  when 'student' then array['student', 'teacher', 'staff']
  when 'teacher' then array['teacher', 'staff']
  when 'staff'   then array['teacher', 'staff']
  when 'admin'   then array['admin']
  else array['student', 'teacher', 'staff']
end
where array_length(visible_to, 1) is null;

create index if not exists documents_visible_to_idx
  on public.documents using gin (visible_to);
