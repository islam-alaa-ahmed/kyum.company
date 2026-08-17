import fs from "node:fs";
const service=fs.readFileSync("assets/js/installations-service.js","utf8");
const reports=fs.readFileSync("assets/js/installation-operations-reports.js","utf8");
const migration=fs.readFileSync("supabase/migrations/phase_e1_5_execution_timeline_integrity_guard.sql","utf8");
const pwa=fs.readFileSync("assets/js/pwa.js","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
const checks=[
 ["version",version.version==="18.54.12"],
 ["canonical resolver",service.includes("resolveInstallationExecutionTimelineState")],
 ["empty timeline remains not started",service.includes("return {code:'not_started',label:'لم يبدأ'}")],
 ["on route state",service.includes("code:'on_route',label:'في الطريق'")],
 ["arrived state",service.includes("code:'arrived',label:'وصل إلى العميل'")],
 ["in progress state",service.includes("code:'in_progress',label:'قيد التنفيذ'")],
 ["waiting confirmation state",service.includes("code:'waiting_confirmation',label:'بانتظار التأكيد'")],
 ["confirmed state",service.includes("code:'confirmed',label:'مؤكدة'")],
 ["summary consumes canonical state",reports.includes("order.executionState")&&reports.includes("order.status||'لم يبدأ'")],
 ["central db guard",migration.includes("guard_installation_execution_visit_timeline_integrity")],
 ["advanced state requires completion",migration.includes("new.status in ('بانتظار التأكيد','مؤكدة')")&&migration.includes("new.completed_at is null")],
 ["legacy ensure cannot synthesize completion",migration.includes("Never synthesize")||migration.includes("لا توجد زيارة تنفيذ مكتملة فعليًا")],
 ["safe repair excludes executed quantities",migration.includes("executed_quantity,0)>0")],
 ["safe repair excludes audit",migration.includes("installation_execution_quantity_audit")],
 ["safe repair excludes invoices",migration.includes("sales_invoices")],
 ["safe update policy retained",pwa.includes('window.addEventListener("kyum-view-changed"')&&pwa.includes("showDialog: false")]
];
let f=0;for(const[n,o]of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)f++;}console.log(`${checks.length-f}/${checks.length} PASS`);process.exitCode=f?1:0;
