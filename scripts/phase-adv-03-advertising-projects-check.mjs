import fs from "node:fs";
const migration=fs.readFileSync("supabase/migrations/phase_adv_03_advertising_projects_core.sql","utf8");
const service=fs.readFileSync("assets/js/advertising-projects-service.js","utf8");
const module=fs.readFileSync("assets/js/advertising-projects-module.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const policy=JSON.parse(fs.readFileSync("enterprise-offline-policy.json","utf8"));
const checks=[
["projects table",migration.includes("create table if not exists public.adv_projects")],
["status history",migration.includes("adv_project_status_history")&&migration.includes("trg_adv_projects_status_history")],
["automatic project number",migration.includes("ADV-")&&migration.includes("adv_generate_project_number")],
["financial close protected",migration.includes("الإغلاق المالي سيتم تفعيله")&&migration.includes("financial_closed_at")],
["screen RLS CRUD",["view","add","edit","delete"].every(a=>migration.includes(`advertisingProjects','${a}`))],
["service canonical owner",service.includes("window.AdvertisingProjectsService")],
["offline queue registered",service.includes("register?.('advertising_projects'")],
["reference dependency resolution",service.includes("project_type_id")&&service.includes("responsible_employee_id")&&service.includes("resolveServerId")],
["smart cache",service.includes("KYUMSmartCache")],
["search activity hook",module.includes("trackSearchInput")],
["permission-controlled buttons",module.includes("allowed('add')")&&module.includes("allowed('edit')")&&module.includes("allowed('delete')")],
["projects UI",html.includes('id="advertisingProjectsTableBody"')&&html.includes('id="advertisingProjectDialog"')],
["history UI",html.includes('id="advertisingProjectHistoryDialog"')],
["offline policy domain",policy.domains?.advertising_projects?.status==="compliant"],
["offline policy direct file",policy.registeredDirectDataFiles.includes("assets/js/advertising-projects-service.js")]
];
let fail=0;for(const [n,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${n}`);if(!ok)fail++}console.log(`${checks.length-fail}/${checks.length} PASS`);process.exitCode=fail?1:0;
