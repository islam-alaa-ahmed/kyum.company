begin;

create table if not exists public.installation_revisits (
  id uuid primary key default gen_random_uuid(),
  installation_request_id uuid not null references public.installation_requests(id) on delete cascade,
  scheduled_date date not null,
  time_slot text not null check (time_slot in ('صباحية','مسائية')),
  technician_id uuid not null references public.installation_technicians(id),
  action_type text not null default 'إعادة زيارة' check (action_type in ('إعادة زيارة','زيارة استكمال','زيارة معاينة')),
  status text not null default 'مجدولة' check (status in ('مجدولة','مغلقة','ملغاة')),
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists installation_revisits_request_idx on public.installation_revisits(installation_request_id);
create index if not exists installation_revisits_schedule_idx on public.installation_revisits(scheduled_date,status);
create unique index if not exists installation_revisits_one_active_idx on public.installation_revisits(installation_request_id) where status='مجدولة';

alter table public.installation_revisits enable row level security;
drop policy if exists installation_revisits_select on public.installation_revisits;
create policy installation_revisits_select on public.installation_revisits for select to authenticated using (
  exists(select 1 from public.installation_requests r where r.id=installation_request_id and public.can_access_representative(r.representative_id))
);
drop policy if exists installation_revisits_write on public.installation_revisits;
create policy installation_revisits_write on public.installation_revisits for all to authenticated using (
  public.has_screen_permission('installationExceptions','edit') and exists(select 1 from public.installation_requests r where r.id=installation_request_id and public.can_access_representative(r.representative_id))
) with check (
  public.has_screen_permission('installationExceptions','edit') and exists(select 1 from public.installation_requests r where r.id=installation_request_id and public.can_access_representative(r.representative_id))
);

insert into public.app_screens(screen_key,screen_name,group_key,sort_order,is_active) values
('installationExceptions','الاستثناءات وإعادة الزيارة','installations-management',60,true),
('installationReports','تقارير التركيبات','installations-management',70,true)
on conflict(screen_key) do update set screen_name=excluded.screen_name,group_key=excluded.group_key,sort_order=excluded.sort_order,is_active=true;

insert into public.role_screen_permissions(role_id,screen_key,can_view,can_add,can_edit,can_delete,can_export,can_import)
select r.id,s.screen_key,true,false,(s.screen_key='installationExceptions'),false,(s.screen_key='installationReports'),false
from public.roles r cross join (values('installationExceptions'),('installationReports')) s(screen_key)
where lower(coalesce(r.role_key,r.role_name,'')) in ('super_admin','super admin','مدير النظام')
on conflict(role_id,screen_key) do update set can_view=excluded.can_view,can_edit=excluded.can_edit,can_export=excluded.can_export;

commit;
