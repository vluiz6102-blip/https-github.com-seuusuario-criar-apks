-- VIC Assistência: customer-facing data model.
-- Customers are read-only. The store manages records through the Supabase Dashboard.
-- Never add a service_role key to the mobile app.

create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete restrict,
  order_number text not null unique,
  device_description text not null,
  reported_issue text not null,
  status text not null check (status in (
    'recebido', 'em_analise', 'aguardando_aprovacao', 'aguardando_peca',
    'em_reparo', 'finalizado', 'retirado', 'cancelado'
  )),
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_orders_id_customer_unique unique (id, customer_id)
);

create table public.service_order_events (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null,
  customer_id uuid not null references auth.users (id) on delete restrict,
  status text not null check (status in (
    'recebido', 'em_analise', 'aguardando_aprovacao', 'aguardando_peca',
    'em_reparo', 'finalizado', 'retirado', 'cancelado'
  )),
  message text not null,
  is_customer_visible boolean not null default true,
  created_at timestamptz not null default now(),
  constraint service_order_events_order_customer_fk
    foreign key (service_order_id, customer_id)
    references public.service_orders (id, customer_id) on delete cascade
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null,
  customer_id uuid not null references auth.users (id) on delete restrict,
  amount_cents bigint not null check (amount_cents >= 0),
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovado', 'recusado', 'expirado')),
  notes text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint quotes_order_customer_fk
    foreign key (service_order_id, customer_id)
    references public.service_orders (id, customer_id) on delete cascade,
  constraint quotes_id_customer_unique unique (id, customer_id)
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null,
  customer_id uuid not null references auth.users (id) on delete restrict,
  description text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_amount_cents bigint not null check (unit_amount_cents >= 0),
  constraint quote_items_quote_customer_fk
    foreign key (quote_id, customer_id)
    references public.quotes (id, customer_id) on delete cascade
);

create index service_orders_customer_received_idx
  on public.service_orders (customer_id, received_at desc);
create index service_order_events_customer_created_idx
  on public.service_order_events (customer_id, created_at desc);
create index quotes_customer_created_idx
  on public.quotes (customer_id, created_at desc);
create index quote_items_customer_idx
  on public.quote_items (customer_id);

alter table public.service_orders enable row level security;
alter table public.service_order_events enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

-- No anonymous access. Authenticated customers may only SELECT their own rows.
revoke all on table public.service_orders from anon, authenticated;
revoke all on table public.service_order_events from anon, authenticated;
revoke all on table public.quotes from anon, authenticated;
revoke all on table public.quote_items from anon, authenticated;

grant select on table public.service_orders to authenticated;
grant select on table public.service_order_events to authenticated;
grant select on table public.quotes to authenticated;
grant select on table public.quote_items to authenticated;

create policy "customers read their own service orders"
  on public.service_orders for select to authenticated
  using ((select auth.uid()) = customer_id);

create policy "customers read visible events of their own orders"
  on public.service_order_events for select to authenticated
  using (
    (select auth.uid()) = customer_id
    and is_customer_visible = true
  );

create policy "customers read their own quotes"
  on public.quotes for select to authenticated
  using ((select auth.uid()) = customer_id);

create policy "customers read their own quote items"
  on public.quote_items for select to authenticated
  using ((select auth.uid()) = customer_id);

-- No INSERT, UPDATE, or DELETE policies are intentionally defined.
-- Store staff use the authenticated Supabase Dashboard, not the customer app.
