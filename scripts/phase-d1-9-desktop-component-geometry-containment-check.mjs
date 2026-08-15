import fs from "node:fs";
const s=fs.readFileSync("assets/css/style.css","utf8"),c=fs.readFileSync("assets/css/desktop-visual-identity-canonical.css","utf8"),i=fs.readFileSync("index.html","utf8");
const t=[
["shared flex child token owner",s.includes(".panel-header>*,.actions-row>*{min-width:var(--desktop-flex-child-min-width,auto)}")],
["shared grid child token owner",s.includes(".filters-row>*,.form-grid>*{min-width:var(--desktop-grid-child-min-width,auto)")],
["table cell wrapping token owner",s.includes("overflow-wrap:var(--table-cell-overflow-wrap,normal)")],
["status badge geometry tokenized",s.includes("--status-badge-white-space")],
["quotation status geometry tokenized",s.includes("--quotation-status-white-space")],
["tag geometry tokenized",s.includes("--tag-white-space")],
["simple item containment tokenized",s.includes("--simple-item-child-min-width")],
["rep card containment tokenized",s.includes("--rep-card-overflow-wrap")],
["profile item containment tokenized",s.includes("--profile-item-overflow-wrap")],
["desktop geometry marker",c.includes("Phase D1.9 — Desktop component geometry & containment contract")],
["desktop badges nowrap",c.includes("--badge-white-space:nowrap")],
["desktop row actions wrap group",c.includes("--row-actions-wrap:wrap")],
["desktop row button text nowrap",c.includes("--row-action-white-space:nowrap")],
["customer specialized nowrap retained",c.includes("#customersView")&&c.includes("--row-actions-wrap:nowrap")],
["version 18.53.91",i.includes("18.53.91")],
["header not targeted by D1.9",!c.match(/D1\.9[\s\S]{0,3000}#appHeader/)],
["sidebar not targeted by D1.9",!c.match(/D1\.9[\s\S]{0,3000}#mainSidebar/)]
];let f=0;for(const[n,o]of t){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)f++}console.log(`${t.length-f}/${t.length} PASS`);process.exitCode=f?1:0;
