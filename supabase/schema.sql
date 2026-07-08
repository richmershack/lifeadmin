create extension if not exists "pgcrypto";

create type public.admin_item_status as enum ('inbox', 'tracked', 'done');

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
  status public.admin_item_status not null default 'inbox',
  created_at timestamptz not null default now()
);

alter table public.admin_items enable row level security;

create policy "Users can read their own admin items" on public.admin_items for select using (auth.uid() = user_id);
create policy "Users can create their own admin items" on public.admin_items for insert with check (auth.uid() = user_id);
create policy "Users can update their own admin items" on public.admin_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own admin items" on public.admin_items for delete using (auth.uid() = user_id);

create index if not exists admin_items_user_due_idx on public.admin_items (user_id, due_date);
create index if not exists admin_items_user_status_idx on public.admin_items (user_id, status);
