import fs from "node:fs";
const css=fs.readFileSync("assets/css/mobile.css","utf8");
const desktop=fs.readFileSync("assets/css/style.css","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
const checks=[
 ["version",version.version==="18.54.01"],
 ["mobile header height corrected",css.includes("--kyum-mobile-header-height:104px")],
 ["upper rail below safe area",css.includes("calc(env(safe-area-inset-top) + 5px)")&&css.includes("calc(env(safe-area-inset-top) + 6px)")],
 ["gold rails start below safe area",css.includes("top:calc(env(safe-area-inset-top) + 8px);bottom:12px")],
 ["lower neon contour inside shell",css.includes("left:14px;right:14px;bottom:3px;height:20px")],
 ["strong neon blue",css.includes("#13d0ff")&&css.includes("#32a9ff")],
 ["strong gold rails",css.includes("#e3b44a")],
 ["safe area follows variant",css.includes("Safe-area is part of the selected mobile header surface")&&css.includes('data-mobile-header-style="premium_gold"] body::before')],
 ["buttons retain 52px",css.includes("width:52px!important;height:52px!important")],
 ["three variants retained",css.includes('data-mobile-header-style="original"')&&css.includes('data-mobile-header-style="visual_blue_gold"')&&css.includes('data-mobile-header-style="premium_gold"')],
 ["desktop H1.4 retained",desktop.includes("Phase H1.4 — Three selectable Desktop Header Variants")],
 ["phone scope retained",css.includes("@media (max-width: 767px)")]
];let f=0;for(const[n,o]of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)f++;}console.log(`${checks.length-f}/${checks.length} PASS`);process.exitCode=f?1:0;
