import fs from "node:fs";
import crypto from "node:crypto";
const mobile=fs.readFileSync("assets/css/mobile-theme-canonical.css","utf8");
const schedule=fs.readFileSync("assets/css/installation-scheduling.css","utf8");
const desktop=fs.readFileSync("assets/css/desktop-visual-identity-canonical.css","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
const desktopBlock=schedule.match(/\/\* D1\.6 — Desktop scheduling structural-fidelity owner\.[\s\S]*?@media \(min-width:1024px\)\{([\s\S]*?)\n\}/);
const hash=crypto.createHash("sha256").update(desktopBlock?.[0]||"").digest("hex");
const checks=[
["version",version.version==="18.53.93"],
["mobile metric fallback removed",mobile.includes("inner representative metrics must never fall back to legacy #fff")],
["mobile metric uses glass",mobile.includes("#dashboardView .performance-metric{")&&mobile.includes("var(--kyum-content-glass-blue)!important")],
["mobile scheduling marker",schedule.includes("D1.10.1 — Mobile scheduling structural fidelity")],
["mobile calendar 3 columns",schedule.includes("grid-template-columns:repeat(3,minmax(0,1fr))")],
["mobile calendar no 860px inheritance",schedule.includes("min-width:0;\n    width:100%;")],
["mobile cards rounded",schedule.includes("border-radius:20px")],
["mobile current day gold",schedule.includes("border-color:var(--kyum-content-gold,#d5a132)")],
["desktop scheduling unchanged",hash==="e3f27cbce8d85240c3d08674e7cce613735d8ea0a5433e86dd54d688b6cb4c68"],
["desktop canonical untouched by mobile repair",desktop.includes("@media (min-width:1024px)")],
["desktop header not targeted",!desktop.includes("#appHeader")],
["desktop sidebar not targeted",!desktop.includes("#mainSidebar")&&!desktop.includes("#sidebar")]
];
let fail=0;for(const[n,o]of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)fail++;}
console.log(`${checks.length-fail}/${checks.length} PASS`);process.exitCode=fail?1:0;
