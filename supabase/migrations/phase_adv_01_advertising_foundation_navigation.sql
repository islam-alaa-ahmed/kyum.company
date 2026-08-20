-- Phase ADV-01 — Advertising Department Foundation & Navigation
begin;

insert into public.app_screens(screen_key,screen_name,group_name,display_order,is_active) values
('advertisingDashboard','لوحة متابعة القسم','قسم الدعاية والإعلان',200,true),
('advertisingProjects','المشاريع','قسم الدعاية والإعلان',210,true),
('advertisingMaterialIssue','صرف المواد','قسم الدعاية والإعلان',220,true),
('advertisingInventory','المخزون','قسم الدعاية والإعلان',230,true),
('advertisingCustodyPurchases','العهد والمشتريات','قسم الدعاية والإعلان',240,true),
('advertisingProjectCosts','تكلفة وربحية المشاريع','قسم الدعاية والإعلان',250,true),
('advertisingReports','التقارير','قسم الدعاية والإعلان',260,true),
('advertisingReferenceData','البيانات المرجعية','قسم الدعاية والإعلان',270,true)
on conflict(screen_key) do update set screen_name=excluded.screen_name,group_name=excluded.group_name,display_order=excluded.display_order,is_active=true;

-- New screens are granted only to super_admin by default. Other roles remain denied
-- until explicitly configured through the existing permissions matrix.
insert into public.role_screen_permissions(role,screen_key,can_view,can_add,can_edit,can_delete,can_export)
select 'super_admin'::public.app_role, screen_key, true,true,true,true,true
from public.app_screens
where screen_key in ('advertisingDashboard','advertisingProjects','advertisingMaterialIssue','advertisingInventory','advertisingCustodyPurchases','advertisingProjectCosts','advertisingReports','advertisingReferenceData')
on conflict(role,screen_key) do update set can_view=true,can_add=true,can_edit=true,can_delete=true,can_export=true,updated_at=now();

commit;
