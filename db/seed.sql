-- Demo data for an empty local database (`pnpm db:seed` after `pnpm db:migrate`). Never run on the server.
-- Sign in at http://localhost:3000/sign-in as demo@pakto.local with the local-only password pakto-dev-2026.
-- What it holds: the landing story's company, a client, a project and offer ОФ-001 „Преместване на контакти“
-- as a draft for 450 € (send it, then revise it to 384 € to get v1 → v2). Emails go to Mailpit.
-- Re-running is safe: every row has a fixed id and is skipped when it exists.
begin;

insert into app.auth_users (id, name, email, email_verified)
values ('00000000-0000-4000-8000-000000000001', 'Демо Собственик', 'demo@pakto.local', true)
on conflict do nothing;

insert into app.auth_accounts (user_id, account_id, provider_id, password)
select '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'credential',
  -- bcrypt of the local-only password pakto-dev-2026
  '$2b$11$rpEVGQ2VZVJSn0r5VwYCTOSv9zzb115CDS2TiN2M2Nx6X6MJcEKFi'
where not exists (select 1 from app.auth_accounts where user_id = '00000000-0000-4000-8000-000000000001');

insert into app.profiles (id, display_name, email, welcome_seen_at)
values ('00000000-0000-4000-8000-000000000001', 'Демо Собственик', 'demo@pakto.local', now())
on conflict do nothing;

insert into app.organizations (id, name, slug, phone)
values ('00000000-0000-4000-8000-000000000010', 'Демо Ремонти', 'demo-remonti', '+359888000000')
on conflict do nothing;

insert into app.organization_members (organization_id, user_id, role, all_projects)
values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'owner', true)
on conflict do nothing;

insert into app.clients (id, organization_id, name, email, phone, created_by)
values ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000010', 'Иван Петров',
  'ivan@pakto.local', '+359888111111', '00000000-0000-4000-8000-000000000001')
on conflict do nothing;

insert into app.projects (id, organization_id, client_id, name, site_address, reference, created_by)
values ('00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000020', 'Апартамент Петрови', 'гр. София, ул. Примерна 12', 'ПР-042',
  '00000000-0000-4000-8000-000000000001')
on conflict do nothing;

insert into app.project_members (project_id, user_id, permission)
values ('00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000001', 'view')
on conflict do nothing;

insert into app.project_contacts (id, project_id, organization_id, client_id, name, email, phone, portal_role, is_primary)
values ('00000000-0000-4000-8000-000000000040', '00000000-0000-4000-8000-000000000030',
  '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000020', 'Иван Петров',
  'ivan@pakto.local', '+359888111111', 'approver', true)
on conflict do nothing;

-- The offer and its first (draft) version with two lines: 2 × 150 € + 1 × 150 € = 450 € without VAT.
do $$
declare
  revision bigint;
begin
  if exists (select 1 from app.change_orders where id = '00000000-0000-4000-8000-000000000050') then return; end if;
  insert into app.change_orders (id, organization_id, project_id, sequence_number, document_kind, created_by)
  values ('00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000030', 1, 'offer', '00000000-0000-4000-8000-000000000001');
  insert into app.change_order_revisions (change_order_id, revision_number, title, description, currency, subtotal,
    tax_rate, tax_amount, total, agreed_deadline, created_by)
  values ('00000000-0000-4000-8000-000000000050', 1, 'Преместване на контакти',
    'Преместване на два контакта в кухнята и един в хола, с къртене и замазка.', 'EUR', 450.00, 0, 0, 450.00,
    current_date + 21, '00000000-0000-4000-8000-000000000001')
  returning id into revision;
  insert into app.change_order_line_items (revision_id, "position", description, quantity, unit, unit_price, line_total)
  values (revision, 1, 'Преместване на контакт в кухнята', 2, 'бр.', 150.00, 300.00),
         (revision, 2, 'Преместване на контакт в хола', 1, 'бр.', 150.00, 150.00);
  update app.change_orders set current_revision_id = revision where id = '00000000-0000-4000-8000-000000000050';
end $$;

commit;
