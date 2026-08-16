import fs from 'node:fs';
const migration=fs.readFileSync('supabase/migrations/phase_e1_2_execution_visit_rls_canonical_scope.sql','utf8');
const verify=fs.readFileSync('supabase/verification/phase_e1_2_execution_visit_rls_canonical_scope_verification.sql','utf8');
const service=fs.readFileSync('assets/js/installations-service.js','utf8');
const pwa=fs.readFileSync('assets/js/pwa.js','utf8');
const version=JSON.parse(fs.readFileSync('version.json','utf8'));
const checks=[
 ['version',version.version==='18.54.09'],
 ['visit helper',migration.includes('can_access_installation_visit_scope')&&migration.includes('can_access_installation_assignment(p_installation_team_id,p_technician_name)')],
 ['active request helper',migration.includes('can_access_installation_request_via_active_visit')&&migration.includes("v.status in ('مجدولة','قيد التنفيذ')")],
 ['request legacy branch preserved',migration.includes("public.has_screen_permission('installationReports','view')")&&migration.includes('can_access_installation_request_scope(representative_id,installation_team_id)')&&migration.includes('can_access_installation_assignment(installation_team_id,assigned_technician_name)')],
 ['request execution fallback narrow',migration.includes('or public.can_access_installation_request_via_active_visit(id)')],
 ['request services fallback',migration.includes('or public.can_access_installation_request_via_active_visit(installation_request_id)')],
 ['visit policy uses actual visit assignment',migration.includes('installation_request_id,\n    installation_team_id,\n    technician_name')],
 ['schedule read preserved',migration.includes("public.has_screen_permission('installationSchedule','view')")],
 ['visit service policy follows visit',migration.includes('from public.installation_execution_visits v')&&migration.includes('v.installation_team_id')&&migration.includes('v.technician_name')],
 ['reference labels visit-aware',migration.includes('left join lateral')&&migration.includes('accessible_visit.installation_team_id is not null')],
 ['writes remain revoked',migration.includes('revoke insert,update,delete on public.installation_execution_visits from authenticated')&&migration.includes('revoke insert,update,delete on public.installation_execution_visit_services from authenticated')],
 ['no write policy replacement',!migration.includes('installation requests scoped update')&&!migration.includes('installation visits scoped write')],
 ['execution service still visit canonical',service.includes(".in('status',['مجدولة','قيد التنفيذ'])")&&service.includes('activeRequestIds')],
 ['safe update behavior retained',pwa.includes('showDialog: false')&&pwa.includes('kyum-view-changed')],
 ['verification checks mutation rpc guards',verify.includes('advance_uses_visit_team')&&verify.includes('advance_uses_visit_technician')],
 ['verification checks diagnostics only',verify.includes('active_visits_missing_parent')&&verify.includes('Recovery candidates')]
];
let fail=0; for(const [n,o] of checks){console.log(`${o?'PASS':'FAIL'} ${n}`); if(!o) fail++;}
console.log(`${checks.length-fail}/${checks.length} PASS`); process.exitCode=fail?1:0;
