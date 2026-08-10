import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/phase_m15_14_7_super_admin_execution_full_control.sql','utf8');
const checks=[
 ['super admin role is explicit',sql.includes("public.current_user_role() = 'super_admin'::public.app_role")],
 ['map RPC replaced',sql.includes('create or replace function public.record_installation_visit_map_opened')],
 ['stage RPC replaced',sql.includes('create or replace function public.advance_installation_execution_visit_stage')],
 ['active selection still required',sql.includes("selected_for_execution_at is null")],
 ['normal users retain ownership guard',sql.includes('not is_super_admin and v.selected_for_execution_by is distinct from auth.uid()')],
 ['normal users retain assignment scope',sql.includes('not is_super_admin and (')&&sql.includes('can_access_installation_assignment')],
 ['super admin does not take visit ownership',!/(set|,)\s*selected_for_execution_by\s*=\s*auth\.uid\(\)/i.test(sql)],
 ['stage ordering preserved',sql.includes("raise exception 'يجب تنفيذ مراحل الزيارة بالترتيب'")],
 ['map-before-arrival preserved',sql.includes("raise exception 'افتح موقع العميل قبل تسجيل الوصول'")],
 ['grants preserved',sql.includes('grant execute on function public.record_installation_visit_map_opened')&&sql.includes('grant execute on function public.advance_installation_execution_visit_stage')]
];
let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++;}if(fail)process.exit(1);
