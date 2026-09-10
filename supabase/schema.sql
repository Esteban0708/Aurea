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

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_note text default '',
  total numeric(12, 2) not null default 0 check (total >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0)
);

alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

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

drop policy if exists "Anyone can create pending orders" on public.orders;
create policy "Anyone can create pending orders"
on public.orders for insert
to anon, authenticated
with check (status = 'pending');

drop policy if exists "Authenticated users can view orders" on public.orders;
create policy "Authenticated users can view orders"
on public.orders for select
to authenticated
using (true);

drop policy if exists "Authenticated users can update orders" on public.orders;
create policy "Authenticated users can update orders"
on public.orders for update
to authenticated
using (true)
with check (status in ('pending', 'confirmed', 'cancelled'));

drop policy if exists "Anyone can create order items" on public.order_items;
create policy "Anyone can create order items"
on public.order_items for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated users can view order items" on public.order_items;
create policy "Authenticated users can view order items"
on public.order_items for select
to authenticated
using (true);

create or replace function public.confirm_order(order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  item record;
begin
  select status into current_status from public.orders where id = order_id for update;
  if current_status is null then raise exception 'Pedido no encontrado'; end if;
  if current_status <> 'pending' then raise exception 'El pedido ya fue procesado'; end if;

  for item in
    select oi.product_id, oi.quantity, p.stock
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = confirm_order.order_id
  loop
    if item.stock < item.quantity then
      raise exception 'Stock insuficiente para uno de los productos';
    end if;
  end loop;

  update public.products p
  set stock = p.stock - oi.quantity
  from public.order_items oi
  where oi.order_id = confirm_order.order_id and p.id = oi.product_id;

  update public.orders set status = 'confirmed' where id = confirm_order.order_id;
end;
$$;

revoke all on function public.confirm_order(uuid) from public;
grant execute on function public.confirm_order(uuid) to authenticated;

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
