import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/phase_e1_3_execution_parent_state_synchronization.sql','utf8');
const verify=fs.readFileSync('supabase/verification/phase_e1_3_execution_parent_state_synchronization_verification.sql','utf8');
const pwa=fs.readFileSync('assets/js/pwa.js','utf8');
const version=JSON.parse(fs.readFileSync('version.json','utf8'));
const checks=[
 ['version',version.version==='18.54.10'],
 ['canonical sync helper',sql.includes('sync_installation_request_execution_state')],
 ['exception states preserved',sql.includes("if r.status in ('مؤجل','متعذر','ملغي') then return")],
 ['running visit precedence',sql.includes("v_target_status:='قيد التنفيذ'")],
 ['waiting confirmation handoff',sql.includes("elsif v_has_waiting_confirmation then")&&sql.includes("v_target_status:='مكتمل'")],
 ['future scheduled handoff',sql.includes("elsif v_has_scheduled then")&&sql.includes("v_target_status:='مسند'")],
 ['trigger installed',sql.includes('trg_installation_execution_visit_parent_state_sync')],
 ['stage RPC calls synchronizer',sql.includes('perform public.sync_installation_request_execution_state(p_request_id)')],
 ['selection cleared at completion',sql.includes("selected_for_execution_at=case when p_next_status='مكتمل' then null")],
 ['generic historical repair',sql.includes('select distinct installation_request_id')&&!sql.includes('INS-2026-')],
 ['verification checks stale parents',verify.includes('stale_waiting_confirmation_parents')],
 ['safe update policy retained',pwa.includes('showDialog: false')&&pwa.includes('kyum-view-changed')]
];
let fail=0;for(const[n,o] of checks){console.log(`${o?'PASS':'FAIL'} ${n}`);if(!o)fail++;}
console.log(`${checks.length-fail}/${checks.length} PASS`);process.exitCode=fail?1:0;
