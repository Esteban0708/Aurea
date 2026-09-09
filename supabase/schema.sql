-- Aurea: esquema inicial para catálogo, inventario y categorías

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  price numeric(12, 2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text default '',
  category text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.categories enable row level security;

drop policy if exists "Anyone can view products" on public.products;
create policy "Anyone can view products"
on public.products for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can create products" on public.products;
create policy "Authenticated users can create products"
on public.products for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update products" on public.products;
create policy "Authenticated users can update products"
on public.products for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete products" on public.products;
create policy "Authenticated users can delete products"
on public.products for delete
to authenticated
using (true);

drop policy if exists "Anyone can view categories" on public.categories;
create policy "Anyone can view categories"
on public.categories for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can create categories" on public.categories;
create policy "Authenticated users can create categories"
on public.categories for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can delete categories" on public.categories;
create policy "Authenticated users can delete categories"
on public.categories for delete
to authenticated
using (true);

-- Bucket público para las imágenes que sube la administradora.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can view product images" on storage.objects;
create policy "Anyone can view product images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "Authenticated users can upload product images" on storage.objects;
create policy "Authenticated users can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images');

drop policy if exists "Authenticated users can update product images" on storage.objects;
create policy "Authenticated users can update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

drop policy if exists "Authenticated users can delete product images" on storage.objects;
create policy "Authenticated users can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images');
