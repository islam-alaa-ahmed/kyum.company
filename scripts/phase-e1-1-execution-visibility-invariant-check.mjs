import fs from "node:fs";
const service=fs.readFileSync("assets/js/installations-service.js","utf8");
const execution=fs.readFileSync("assets/js/installation-execution.js","utf8");
const pwa=fs.readFileSync("assets/js/pwa.js","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
const checks=[
["version",version.version==="18.54.08"],
["active visit progress exported",service.includes("hasOperationalProgress:Boolean(v.on_route_at||v.map_opened_at||v.arrived_at||v.started_at)")],
["legacy rows explicitly no progress",service.includes("hasOperationalProgress:false")],
["closed classifier",execution.includes("function isExecutionClosed(r)")],
["in-progress classifier",execution.includes("function isExecutionInProgressRow(r)")],
["pending classifier no selection dependency",execution.includes("return !isExecutionClosed(r)&&!isExecutionInProgressRow(r)")],
["today queue includes progress",execution.includes("pending||inProgress")&&execution.includes("r.scheduledDate<=date")],
["resume action",execution.includes("استئناف التنفيذ")],
["current tab includes actual progress",execution.includes("r.isCurrentUserSelection===true||isExecutionInProgressRow(r)")],
["current fallback candidate",execution.includes("||candidates[0];current=preferred")],
["no ID workaround",!execution.includes("INS-2026-")&&!service.includes("INS-2026-")],
["safe update background policy retained",pwa.includes("showDialog: false")&&pwa.includes('window.addEventListener("kyum-view-changed"')]
];
let f=0;for(const[n,o]of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)f++;}
console.log(`${checks.length-f}/${checks.length} PASS`);process.exitCode=f?1:0;
