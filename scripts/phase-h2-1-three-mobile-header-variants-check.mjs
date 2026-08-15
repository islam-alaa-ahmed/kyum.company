import fs from "node:fs";
const html=fs.readFileSync("index.html","utf8");
const app=fs.readFileSync("assets/js/app.js","utf8");
const css=fs.readFileSync("assets/css/mobile.css","utf8");
const svc=fs.readFileSync("assets/js/system-settings-service.js","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
const checks=[
["version",version.version==="18.54.00"],
["mobile settings selector",html.includes('id="systemMobileHeaderStyle"')],
["three mobile options",html.includes('systemMobileHeaderStyle')&&html.includes('value="original"')&&html.includes('value="visual_blue_gold"')&&html.includes('value="premium_gold"')],
["mobile setting persisted",svc.includes('"mobile_header_style"')],
["independent mobile runtime",app.includes('MOBILE_HEADER_STYLE_STORAGE_KEY')&&app.includes('dataset.mobileHeaderStyle')],
["mobile load applies",app.includes('applyMobileHeaderStyle(settings.mobile_header_style || MOBILE_HEADER_STYLE_VISUAL)')],
["mobile save applies",app.includes('applyMobileHeaderStyle(settings.mobile_header_style)')],
["original mobile variant",css.includes('data-mobile-header-style="original"] #appHeader.topbar')],
["visual mobile variant",css.includes('data-mobile-header-style="visual_blue_gold"] #appHeader.topbar')],
["premium mobile variant",css.includes('data-mobile-header-style="premium_gold"] #appHeader.topbar')],
["brand artwork removed",css.includes('.mobile-app-brand::before,')&&css.includes('content:none!important')],
["lower contour inside header",css.includes('left:16px;right:16px;bottom:2px;height:16px')],
["gold rails inset",css.includes('left:12px;right:12px;top:12px;bottom:12px')],
["premium separated outer edge",css.includes('border:1px solid rgba(230,183,77,.86)')&&css.includes('left:12px;right:12px')],
["phone-only scope retained",css.includes('@media (max-width: 767px)')],
["desktop setting still independent",app.includes('dataset.desktopHeaderStyle')&&app.includes('dataset.mobileHeaderStyle')]
];
let f=0;for(const[n,o]of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)f++;}
console.log(`${checks.length-f}/${checks.length} PASS`);process.exitCode=f?1:0;
