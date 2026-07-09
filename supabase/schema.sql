create extension if not exists "pgcrypto";

do $$
begin
  create type public.admin_item_status as enum ('inbox', 'tracked', 'done');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.admin_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Other',
  company text,
  due_date date not null,
  amount text,
  action text not null,
  note text,
  document_name text,
  document_path text,
  document_type text,
  status public.admin_item_status not null default 'inbox',
  created_at timestamptz not null default now()
);

alter table public.admin_items
  add column if not exists document_name text,
  add column if not exists document_path text,
  add column if not exists document_type text;

alter table public.admin_items enable row level security;

drop policy if exists "Users can read their own admin items" on public.admin_items;
create policy "Users can read their own admin items"
  on public.admin_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own admin items" on public.admin_items;
create policy "Users can create their own admin items"
  on public.admin_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own admin items" on public.admin_items;
create policy "Users can update their own admin items"
  on public.admin_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own admin items" on public.admin_items;
create policy "Users can delete their own admin items"
  on public.admin_items
  for delete
  using (auth.uid() = user_id);

create index if not exists admin_items_user_due_idx
  on public.admin_items (user_id, due_date);

create index if not exists admin_items_user_status_idx
  on public.admin_items (user_id, status);

insert into storage.buckets (id, name, public, file_size_limit)
values ('lifeadmin-documents', 'lifeadmin-documents', false, 8388608)
on conflict (id) do update
set public = false,
    file_size_limit = 8388608;

drop policy if exists "Users can read their own LifeAdmin documents" on storage.objects;
create policy "Users can read their own LifeAdmin documents"
  on storage.objects
  for select
  using (
    bucket_id = 'lifeadmin-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can upload their own LifeAdmin documents" on storage.objects;
create policy "Users can upload their own LifeAdmin documents"
  on storage.objects
  for insert
  with check (
    bucket_id = 'lifeadmin-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own LifeAdmin documents" on storage.objects;
create policy "Users can delete their own LifeAdmin documents"
  on storage.objects
  for delete
  using (
    bucket_id = 'lifeadmin-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
