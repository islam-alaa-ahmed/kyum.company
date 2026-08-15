import fs from "node:fs";
const style=fs.readFileSync("assets/css/style.css","utf8");
const mobile=fs.readFileSync("assets/css/mobile.css","utf8");
const mobileTheme=fs.readFileSync("assets/css/mobile-theme-canonical.css","utf8");
const html=fs.readFileSync("index.html","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));

const desktopStart=style.indexOf("/* Phase M15.27.3 — Desktop Header Compact Identity");
const desktopEnd=style.indexOf("/* M15.28 regression preservation",desktopStart);
const header=style.slice(desktopStart,desktopEnd);

const checks=[
 ["version",version.version==="18.53.96"&&version.build===185396],
 ["desktop owner retained",header.includes("@media (min-width:1181px)")],
 ["light frosted shell",header.includes("linear-gradient(112deg,rgba(248,251,255,.98)")],
 ["dark midnight shell",header.includes("linear-gradient(112deg,#020813 0%,#061427 47%,#020812 100%)")],
 ["upper blue contour",header.includes("rgba(45,134,255,.88)")&&header.includes("top 1px center/96% 2px no-repeat")],
 ["gold side accents",header.includes("#e6b74d")&&header.includes("left 10px center/2px 62% no-repeat")],
 ["curved lower contour",header.includes("radial-gradient(ellipse at 50% 158%")&&header.includes("bottom:-8px")],
 ["premium rounded geometry",header.includes("border-radius:28px 28px 34px 34px")],
 ["header height preserved",header.includes("height:142px !important")&&header.includes("min-height:142px !important")],
 ["grid preserved",header.includes('grid-template-areas:"desktop-brand actions title menu"')],
 ["buttons/icons still owned by existing selectors",header.includes("#appHeader .notification-bell-btn")&&header.includes("#appHeader .theme-toggle-button")&&header.includes("#appHeader .desktop-menu-glyph")],
 ["mobile stylesheet still has mobile header owner",mobile.includes("#appHeader")],
 ["mobile canonical still registered",mobileTheme.includes("@media (max-width: 768px)")],
 ["no new mobile header shell marker",!mobile.includes("H1.1")&&!mobileTheme.includes("H1.1")],
 ["cache link updated",html.includes("18.53.96")]
];
let fail=0;
for(const[n,o]of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)fail++;}
console.log(`${checks.length-fail}/${checks.length} PASS`);
process.exitCode=fail?1:0;
