import fs from "node:fs";
const style=fs.readFileSync("assets/css/style.css","utf8");
const desktop=fs.readFileSync("assets/css/desktop-visual-identity-canonical.css","utf8");
const mobile=fs.readFileSync("assets/css/mobile-theme-canonical.css","utf8");
const html=fs.readFileSync("index.html","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
const dialogIds=[
"customerDialog","followupDialog","quotationDialog","representativeDialog","referenceItemDialog","userDialog",
"representativeImportDialog","customerImportDialog","customerImportOverrideDialog","installationDayDetailsDialog",
"installationRequestViewDialog","installationServicesEditDialog","installationAssignmentDialog",
"installationQuantityConfirmationDialog","installationCompletionDialog","installationRevisitDialog",
"installationReferenceDialog"
];
const checks=[
["version",version.version==="18.53.95"],
["shared dialog token owner",style.includes("background:var(--dialog-bg,var(--surface,#fff))")],
["shared header token owner",style.includes("--dialog-header-padding")&&style.includes("--dialog-header-bg")],
["shared body token owner",style.includes("dialog .form-grid")&&style.includes("--dialog-body-bg")],
["shared action token owner",style.includes("--dialog-actions-bg")&&style.includes("--dialog-actions-padding")],
["icon button token owner",style.includes("var(--icon-btn-bg,#f1f5f9)")],
["desktop track scoped",desktop.includes("@media (min-width:1024px)")&&desktop.includes("D1.11-A — Desktop modal/form visual identity tokens")],
["desktop top-layer tokens",desktop.includes("D1.11-A — Top-layer dialogs")&&desktop.includes("--control-bg:linear-gradient")],
["desktop dark native options",desktop.includes('html[data-theme="dark"] dialog')&&desktop.includes("--option-bg:#081930")],
["mobile track scoped",mobile.includes("@media (max-width: 768px)")&&mobile.includes("D1.11-B — Mobile modal/form visual identity tokens")],
["mobile one-column dialog forms",mobile.includes("dialog .form-grid{grid-template-columns:minmax(0,1fr)!important}")],
["mobile safe internal scroll",mobile.includes("dialog > form:not(.dialog-shell)")&&mobile.includes("-webkit-overflow-scrolling:touch")],
["desktop tokens do not appear in mobile owner",!mobile.includes("--desk-glass-strong")&&!mobile.includes("--desk-line-strong")],
["mobile tokens do not appear in desktop owner",!desktop.includes("--kyum-mobile-surface")&&!desktop.includes("--kyum-mobile-border")],
["known form dialogs retained",dialogIds.every(id=>html.includes(`id="${id}"`))],
["version link updated",html.includes("18.53.95")]
];
let f=0;for(const[n,o]of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)f++;}
console.log(`${checks.length-f}/${checks.length} PASS`);process.exitCode=f?1:0;
