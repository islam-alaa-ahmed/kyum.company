const fs=require('fs');
const assert=require('assert');
const service=fs.readFileSync('assets/js/installations-service.js','utf8');
const migration=fs.readFileSync('supabase/migrations/phase_m15_19_technician_execution_metadata_suggestion_rotation.sql','utf8');
const version=JSON.parse(fs.readFileSync('version.json','utf8'));
const checks=[
  ['execution RPC invoked', service.includes("get_installation_execution_reference_labels")],
  ['representative fallback merged', service.includes("representativeName:r.representative?.full_name||labels.representativeName||''")],
  ['team fallback merged', service.includes("teamName:r.team?.name||labels.teamName||''")],
  ['execution permission guard', migration.includes("has_screen_permission('installationExecution','view')")],
  ['assignment guard', migration.includes('can_access_installation_assignment')],
  ['round robin count', migration.includes('suggestion_count')],
  ['round robin last suggestion', migration.includes('last_suggestion_date')],
  ['version bumped', version.version==='18.53.53']
];
checks.forEach(([name,ok])=>assert.ok(ok,name));
console.log(`PASS ${checks.length}/${checks.length}`);
