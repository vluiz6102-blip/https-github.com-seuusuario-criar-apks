begin;

select plan(12);

-- Two isolated test identities. Fixtures are created as the migration/test owner,
-- then all assertions run with the authenticated role and each user's JWT subject.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'vic-rls-a@example.test', '',
   now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'vic-rls-b@example.test', '',
   now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.service_orders (
  id, customer_id, order_number, device_description, reported_issue, status
) values
  ('30000000-0000-4000-8000-000000000003',
   '10000000-0000-4000-8000-000000000001',
   'TEST-A-001', 'Notebook de teste A', 'Falha de teste A', 'em_analise'),
  ('40000000-0000-4000-8000-000000000004',
   '20000000-0000-4000-8000-000000000002',
   'TEST-B-001', 'Celular de teste B', 'Falha de teste B', 'em_reparo');

insert into public.service_order_events (
  id, service_order_id, customer_id, status, message, is_customer_visible
) values
  ('50000000-0000-4000-8000-000000000005',
   '30000000-0000-4000-8000-000000000003',
   '10000000-0000-4000-8000-000000000001',
   'em_analise', 'Atualização visível A', true),
  ('60000000-0000-4000-8000-000000000006',
   '30000000-0000-4000-8000-000000000003',
   '10000000-0000-4000-8000-000000000001',
   'em_analise', 'Nota interna A', false),
  ('70000000-0000-4000-8000-000000000007',
   '40000000-0000-4000-8000-000000000004',
   '20000000-0000-4000-8000-000000000002',
   'em_reparo', 'Atualização visível B', true);

insert into public.quotes (
  id, service_order_id, customer_id, amount_cents, status
) values
  ('80000000-0000-4000-8000-000000000008',
   '30000000-0000-4000-8000-000000000003',
   '10000000-0000-4000-8000-000000000001', 15000, 'pendente'),
  ('90000000-0000-4000-8000-000000000009',
   '40000000-0000-4000-8000-000000000004',
   '20000000-0000-4000-8000-000000000002', 25000, 'aprovado');

insert into public.quote_items (
  id, quote_id, customer_id, description, quantity, unit_amount_cents
) values
  ('a0000000-0000-4000-8000-00000000000a',
   '80000000-0000-4000-8000-000000000008',
   '10000000-0000-4000-8000-000000000001', 'Peça teste A', 1, 15000),
  ('b0000000-0000-4000-8000-00000000000b',
   '90000000-0000-4000-8000-000000000009',
   '20000000-0000-4000-8000-000000000002', 'Peça teste B', 1, 25000);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.service_orders), 1, 'Cliente A vê somente uma ordem');
select is((select count(*)::integer from public.service_orders where id = '40000000-0000-4000-8000-000000000004'), 0, 'Cliente A não lê a ordem de B');
select is((select count(*)::integer from public.service_order_events), 1, 'Cliente A vê somente o evento público próprio');
select is((select count(*)::integer from public.service_order_events where message = 'Nota interna A'), 0, 'Cliente A não vê nota interna');
select is((select count(*)::integer from public.quotes), 1, 'Cliente A vê somente seu orçamento');
select is((select count(*)::integer from public.quote_items), 1, 'Cliente A vê somente seus itens de orçamento');

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.service_orders), 1, 'Cliente B vê somente uma ordem');
select is((select count(*)::integer from public.service_orders where id = '30000000-0000-4000-8000-000000000003'), 0, 'Cliente B não lê a ordem de A');
select is((select count(*)::integer from public.service_order_events), 1, 'Cliente B vê somente o evento público próprio');
select is((select count(*)::integer from public.quotes), 1, 'Cliente B vê somente seu orçamento');
select is((select count(*)::integer from public.quote_items), 1, 'Cliente B vê somente seus itens de orçamento');

reset role;
select * from finish();
rollback;
