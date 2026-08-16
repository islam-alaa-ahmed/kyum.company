import fs from "node:fs";
const service=fs.readFileSync("assets/js/installations-service.js","utf8");
const execution=fs.readFileSync("assets/js/installation-execution.js","utf8");
const pwa=fs.readFileSync("assets/js/pwa.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));

const checks=[
 ["version",version.version==="18.54.07"],
 ["active visits loaded before request parents",service.includes("const activeRequestIds=")&&service.includes("db().from('installation_requests').select(requestSelect).in('id',activeRequestIds)")],
 ["legacy execution requests retained",service.includes("legacyRequestQuery")&&service.includes("installation_team_id.not.is.null,assigned_technician_name.not.is.null")],
 ["active parent requests merged by id",service.includes("requestMapById")&&service.includes("requestResults.flatMap")],
 ["active visit statuses preserved",service.includes(".in('status',['مجدولة','قيد التنفيذ'])")],
 ["no ID-specific workaround",!service.includes("INS-2026-000019-01")&&!service.includes("INS-2026-000024-01")],
 ["pending execution predicate",execution.includes("function isPendingExecutionRow(r)")],
 ["today includes overdue pending",execution.includes("includeOverdue=date===today()")&&execution.includes("r.scheduledDate<=date")],
 ["historical date remains exact",execution.includes("r.scheduledDate===date&&pending")],
 ["overdue rows sorted oldest first",execution.includes("localeCompare(String(b.scheduledDate||''))")],
 ["scheduled date visible in execution card",execution.includes("تاريخ الجدولة:")&&execution.includes("status-badge\">متأخر")],
 ["background update checks silent",pwa.includes("window.setInterval(() => checkForUpdate({ silent: true, showDialog: false })")],
 ["navigation is safe update point",pwa.includes('window.addEventListener("kyum-view-changed"')&&pwa.includes("showUpdateDialog(release)")],
 ["reload/startup is safe update point",pwa.includes("checkForUpdate({ silent: true, showDialog: true })")],
 ["execution copy documents backlog",html.includes("تشمل الطلبات المتأخرة التي لم يبدأ تنفيذها")]
];
let fail=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)fail++;}
console.log(`${checks.length-fail}/${checks.length} PASS`);
process.exitCode=fail?1:0;
