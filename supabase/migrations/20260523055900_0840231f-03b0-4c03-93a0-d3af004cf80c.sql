
-- Enums
create type public.app_role as enum ('buyer','seller','admin');
create type public.shop_status as enum ('pending','approved','suspended');
create type public.product_status as enum ('draft','active','archived');
create type public.order_status as enum ('pending_payment','paid','shipped','delivered','cancelled');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- User roles (SEPARATE)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  image_url text,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;

-- Shops
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  banner_url text,
  status shop_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);
alter table public.shops enable row level security;

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'XOF',
  stock integer not null default 0 check (stock >= 0),
  images text[] not null default '{}',
  status product_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create index on public.products (shop_id);
create index on public.products (category_id);
create index on public.products (status);

-- Addresses
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  country text not null default 'CI',
  created_at timestamptz not null default now()
);
alter table public.addresses enable row level security;

-- Carts
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.carts enable row level security;

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, product_id)
);
alter table public.cart_items enable row level security;

-- Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  status order_status not null default 'pending_payment',
  total_cents integer not null default 0,
  currency text not null default 'XOF',
  shipping_full_name text not null,
  shipping_phone text not null,
  shipping_line1 text not null,
  shipping_line2 text,
  shipping_city text not null,
  shipping_country text not null,
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  shop_id uuid not null references public.shops(id) on delete restrict,
  title text not null,
  unit_price_cents integer not null,
  quantity integer not null,
  created_at timestamptz not null default now()
);
alter table public.order_items enable row level security;
create index on public.order_items (shop_id);
create index on public.order_items (order_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_shops_updated before update on public.shops for each row execute function public.set_updated_at();
create trigger trg_products_updated before update on public.products for each row execute function public.set_updated_at();

-- New user trigger: create profile + buyer role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.user_roles (user_id, role) values (new.id, 'buyer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =================== RLS POLICIES ===================

-- profiles
create policy "profiles self read" on public.profiles for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);
create policy "profiles public read names" on public.profiles for select using (true);

-- user_roles
create policy "roles self read" on public.user_roles for select using (auth.uid() = user_id);
create policy "roles admin read all" on public.user_roles for select using (public.has_role(auth.uid(),'admin'));
create policy "roles admin manage" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- categories
create policy "categories public read" on public.categories for select using (true);
create policy "categories admin manage" on public.categories for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- shops
create policy "shops public read approved" on public.shops for select using (status = 'approved' or owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "shops owner insert" on public.shops for insert with check (owner_id = auth.uid());
create policy "shops owner update" on public.shops for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "shops admin manage" on public.shops for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- products
create policy "products public read active" on public.products for select using (
  status = 'active' and exists (select 1 from public.shops s where s.id = shop_id and s.status = 'approved')
);
create policy "products owner read" on public.products for select using (
  exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
create policy "products owner manage" on public.products for all using (
  exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
) with check (
  exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
create policy "products admin manage" on public.products for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- addresses
create policy "addresses self all" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- carts
create policy "carts self all" on public.carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- cart_items
create policy "cart_items self all" on public.cart_items for all using (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
);

-- orders
create policy "orders buyer read" on public.orders for select using (buyer_id = auth.uid());
create policy "orders buyer insert" on public.orders for insert with check (buyer_id = auth.uid());
create policy "orders seller read" on public.orders for select using (
  exists (select 1 from public.order_items oi join public.shops s on s.id = oi.shop_id where oi.order_id = orders.id and s.owner_id = auth.uid())
);
create policy "orders admin read" on public.orders for select using (public.has_role(auth.uid(),'admin'));

-- order_items
create policy "order_items buyer read" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
);
create policy "order_items buyer insert" on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
);
create policy "order_items seller read" on public.order_items for select using (
  exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
create policy "order_items admin read" on public.order_items for select using (public.has_role(auth.uid(),'admin'));

-- =================== STORAGE ===================
insert into storage.buckets (id, name, public) values ('shop-assets','shop-assets', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('product-images','product-images', true) on conflict do nothing;

create policy "shop-assets public read" on storage.objects for select using (bucket_id = 'shop-assets');
create policy "shop-assets owner write" on storage.objects for insert with check (bucket_id = 'shop-assets' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "shop-assets owner update" on storage.objects for update using (bucket_id = 'shop-assets' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "shop-assets owner delete" on storage.objects for delete using (bucket_id = 'shop-assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "product-images public read" on storage.objects for select using (bucket_id = 'product-images');
create policy "product-images owner write" on storage.objects for insert with check (bucket_id = 'product-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "product-images owner update" on storage.objects for update using (bucket_id = 'product-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "product-images owner delete" on storage.objects for delete using (bucket_id = 'product-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- Seed some default categories
insert into public.categories (name, slug) values
 ('Vêtements','vetements'),
 ('Chaussures','chaussures'),
 ('Accessoires','accessoires'),
 ('Électronique','electronique'),
 ('Maison','maison'),
 ('Beauté','beaute')
on conflict do nothing;
