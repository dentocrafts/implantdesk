-- ImplantDesk Supabase Schema
-- Run this in your Supabase SQL Editor

-- =============================================
-- TABLES
-- =============================================

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  clinic_name text,
  phone text,
  role text default 'dentist' check (role in ('dentist', 'admin')),
  created_at timestamptz default now()
);

create table if not exists public.implant_components (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  system text not null,
  abutment_type text,
  gingival_height_mm numeric,
  platform_diameter numeric,
  material text,
  component_code text not null unique,
  manufacturer_code text,
  image_url text,
  price numeric not null default 0,
  stock_qty integer not null default 0,
  description text,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'delivered')),
  total_amount numeric not null default 0,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  component_id uuid references public.implant_components(id) on delete set null,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  created_at timestamptz default now()
);

-- =============================================
-- INDEXES
-- =============================================

create index if not exists idx_implant_components_system on public.implant_components(system);
create index if not exists idx_implant_components_active on public.implant_components(is_active);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table public.profiles enable row level security;
alter table public.implant_components enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Profiles: users can read/update their own profile; admins can read all
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Components: anyone authenticated can read active; admins can CRUD all
create policy "Authenticated users can view active components" on public.implant_components
  for select using (auth.role() = 'authenticated' and is_active = true);

create policy "Admins can view all components" on public.implant_components
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can insert components" on public.implant_components
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update components" on public.implant_components
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete components" on public.implant_components
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Orders: users can CRUD own orders; admins can read/update all
create policy "Users can view own orders" on public.orders
  for select using (auth.uid() = user_id);

create policy "Users can insert own orders" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "Admins can view all orders" on public.orders
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update orders" on public.orders
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Order items: inherit from orders
create policy "Users can view own order items" on public.order_items
  for select using (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  );

create policy "Users can insert order items" on public.order_items
  for insert with check (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  );

create policy "Admins can view all order items" on public.order_items
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'dentist'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- STORAGE BUCKET FOR PRODUCT IMAGES
-- =============================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Anyone can view product images" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "Admins can upload product images" on storage.objects
  for insert with check (
    bucket_id = 'product-images' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete product images" on storage.objects
  for delete using (
    bucket_id = 'product-images' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
