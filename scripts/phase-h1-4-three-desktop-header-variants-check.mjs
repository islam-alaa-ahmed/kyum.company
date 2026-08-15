import fs from "node:fs";
const html=fs.readFileSync("index.html","utf8");
const app=fs.readFileSync("assets/js/app.js","utf8");
const css=fs.readFileSync("assets/css/style.css","utf8");
const mobile=fs.readFileSync("assets/css/mobile.css","utf8");
const mobileTheme=fs.readFileSync("assets/css/mobile-theme-canonical.css","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
const checks=[
["version",version.version==="18.53.99"],
["three settings options",html.includes('value="original"')&&html.includes('value="visual_blue_gold"')&&html.includes('value="premium_gold"')],
["legacy classic maps to H1.2",app.includes('if (value === "classic") return DESKTOP_HEADER_STYLE_VISUAL')],
["original runtime accepted",app.includes('value === DESKTOP_HEADER_STYLE_ORIGINAL')],
["visual runtime accepted",app.includes('DESKTOP_HEADER_STYLE_VISUAL')],
["premium runtime accepted",app.includes('DESKTOP_HEADER_STYLE_PREMIUM')],
["original exact shell marker",css.includes('Phase H1.4 — Three selectable Desktop Header Variants')],
["original classic radius",css.includes('data-desktop-header-style="original"] #appHeader.topbar')&&css.includes('border-radius:0 0 28px 28px !important')],
["original classic lower line",css.includes('left:34px !important')&&css.includes('height:2px !important')],
["H1.2 remains canonical base",css.includes('radial-gradient(circle at 50% 128%')&&css.includes('border-radius:28px 28px 34px 34px')],
["premium still separated edge",css.includes('data-desktop-header-style="premium_gold"]')&&css.includes('border-color:rgba(214,169,61,.88)')],
["desktop-only variant scope",css.includes('@media (min-width:1181px)')],
["mobile no H1.4 marker",!mobile.includes('H1.4')&&!mobileTheme.includes('H1.4')],
["version links updated",html.includes('18.53.99')]
];
let f=0;for(const[n,o]of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)f++;}
console.log(`${checks.length-f}/${checks.length} PASS`);process.exitCode=f?1:0;
