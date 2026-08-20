-- Phase ADV-01 verification — READ ONLY
select screen_key,screen_name,group_name,display_order,is_active
from public.app_screens
where screen_key like 'advertising%'
order by display_order;

select role,screen_key,can_view,can_add,can_edit,can_delete,can_export
from public.role_screen_permissions
where screen_key like 'advertising%'
order by role,screen_key;
