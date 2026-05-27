-- Run this in Supabase SQL Editor AFTER schema.sql

create table if not exists public.stock_movements (
  id uuid default gen_random_uuid() primary key,
  component_id uuid references public.implant_components(id) on delete cascade not null,
  type text not null check (type in ('in', 'out', 'adjustment')),
  quantity integer not null check (quantity > 0),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index if not exists idx_stock_movements_component on public.stock_movements(component_id);
create index if not exists idx_stock_movements_created on public.stock_movements(created_at desc);

alter table public.stock_movements enable row level security;

-- All authenticated users can view movements
create policy "Authenticated users can view stock movements" on public.stock_movements
  for select using (auth.role() = 'authenticated');

-- All authenticated users can log movements
create policy "Authenticated users can log movements" on public.stock_movements
  for insert with check (auth.role() = 'authenticated');

-- Admins can delete movements
create policy "Admins can delete movements" on public.stock_movements
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
