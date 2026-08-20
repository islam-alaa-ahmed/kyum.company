import fs from "node:fs";
const html=fs.readFileSync("index.html","utf8");
const app=fs.readFileSync("assets/js/app.js","utf8");
const permissions=fs.readFileSync("assets/js/permission-engine.js","utf8");
const migration=fs.readFileSync("supabase/migrations/phase_adv_01_advertising_foundation_navigation.sql","utf8");
const keys=["advertisingDashboard","advertisingProjects","advertisingMaterialIssue","advertisingInventory","advertisingCustodyPurchases","advertisingProjectCosts","advertisingReports","advertisingReferenceData"];
const checks=[
 ["main nav group exists",html.includes('data-nav-group="advertising-department"')],
 ["nav is between reports and settings",html.indexOf('data-nav-group="reports-analytics"') < html.indexOf('data-nav-group="advertising-department"') && html.indexOf('data-nav-group="advertising-department"') < html.indexOf('data-nav-group="settings-privacy"')],
 ["all eight nav screens exist",keys.every(k=>html.includes(`data-view="${k}"`))],
 ["all eight skeleton views exist",keys.every(k=>html.includes(`id="${k}View"`))],
 ["all views registered in app router",keys.every(k=>app.includes(`${k}: document.getElementById`))],
 ["all page metadata registered",keys.every(k=>app.includes(`${k}: [`))],
 ["permission navigation group registered",keys.every(k=>permissions.includes(`"${k}"`)) && permissions.includes('"advertising-department"')],
 ["all permission screens seeded",keys.every(k=>migration.includes(`'${k}'`))],
 ["super admin only default grant",migration.includes("select 'super_admin'::public.app_role")],
 ["no advertising financial tables introduced",!migration.includes('create table') && !migration.includes('create function')],
 ["version bumped",html.includes('18.54.16')],
 ["legacy update presentation policy untouched",!app.includes('advertisingUpdate')],
];
let fail=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++;} console.log(`${checks.length-fail}/${checks.length} PASS`); process.exitCode=fail?1:0;
