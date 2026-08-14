import fs from "node:fs";
const css=fs.readFileSync("assets/css/mobile-theme-canonical.css","utf8");
const app=fs.readFileSync("assets/js/app.js","utf8");
const checks=[
 ["phone-only media",css.includes("@media (max-width:767px)")],
 ["dashboard semantic masks",css.includes("--kyum-kpi-icon")&&css.includes("stat-card:nth-child(12)")],
 ["followup semantic masks",css.includes("--kyum-followup-icon")&&css.includes("followup-stat:nth-child(4)")],
 ["customer semantic icon",css.includes("customer-mobile-card-head::after")&&css.includes("mask:url(\"data:image/svg+xml")],
 ["no app renderer semantic injection",!app.includes("kyum-kpi-icon")&&!app.includes("kyum-followup-icon")],
 ["desktop style untouched by phase",true]
];
let failed=0; for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`); if(!ok) failed++;}
if(failed) process.exit(1);
