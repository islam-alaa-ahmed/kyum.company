import fs from "node:fs";
const service=fs.readFileSync("assets/js/installations-service.js","utf8");
const module=fs.readFileSync("assets/js/installations-module.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const css=fs.readFileSync("assets/css/installation-requests.css","utf8");
const pwa=fs.readFileSync("assets/js/pwa.js","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));

const checks=[
["version",version.version==="18.54.11"],
["list loads execution visits",service.includes("installation_execution_visits")],
["visit schedule/progress fields loaded",service.includes("scheduled_date,scheduled_time,status,on_route_at,map_opened_at,arrived_at,started_at,completed_at")],
["normalized rows preserve visits",service.includes("executionVisits:row.executionVisits||[]")],
["Riyadh canonical clock",module.includes("timeZone:'Asia/Riyadh'")],
["closed visits excluded",module.includes("function isClosedExecutionVisit")&&module.includes("بانتظار التأكيد")&&module.includes("مؤكدة")],
["progressed visits not overdue",module.includes("function hasExecutionVisitProgress")],
["same-day time overdue supported",module.includes("String(time).slice(0,8)<now.time")],
["visit-level overdue classification",module.includes("const overdueVisits=visits.filter")&&module.includes("['مجدولة','قيد التنفيذ']")],
["unique request KPI",module.includes('rows.filter(row => row.isOverdue === true).length')],
["legacy fallback retained",module.includes("Legacy fallback only for historical requests that never received execution visits")],
["virtual overdue filter",html.includes('value="__overdue__">متأخرة')&&module.includes("state === '__overdue__'")],
["status remains unchanged",module.includes('data-status="${esc(row.status)}">${esc(row.status)}</span>${row.isOverdue?')],
["overdue badge themed",css.includes('.installation-status-badge[data-status="متأخرة"]')],
["E1.3 sync retained",fs.readFileSync("supabase/migrations/phase_e1_3_execution_parent_state_synchronization.sql","utf8").includes("sync_installation_request_execution_state")],
["safe update policy retained",pwa.includes('window.addEventListener("kyum-view-changed"')&&pwa.includes("showDialog: false")]
];
let fail=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)fail++;}
console.log(`${checks.length-fail}/${checks.length} PASS`);
process.exitCode=fail?1:0;
