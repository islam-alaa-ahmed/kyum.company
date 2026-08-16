import fs from "node:fs";
const reports=fs.readFileSync("assets/js/installation-operations-reports.js","utf8");
const service=fs.readFileSync("assets/js/installations-service.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const css=fs.readFileSync("assets/css/installation-operations-reports.css","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
const checks=[
["version",version.version==="18.54.04"],
["all years option",reports.includes('<option value="">كل السنوات</option>')],
["all months option",reports.includes('<option value="">كل الشهور</option>')],
["all days option",reports.includes('<option value="">كل الأيام</option>')],
["all 12 months retained",reports.includes("Array.from({length:12}")],
["month days dynamic",reports.includes("new Date(y,m,0).getDate()")],
["summary period supports all",reports.includes("kind:'all'")&&reports.includes("kind:'year'")&&reports.includes("kind:'month'")&&reports.includes("kind:'day'")],
["summary load uses date range",reports.includes("dateFrom:period.dateFrom,dateTo:period.dateTo")],
["active reps only",service.includes("select('id,full_name,is_active').eq('is_active',true).order('full_name')")],
["summary footer exists",html.includes('tfoot id="installationSummaryReportFoot"')],
["grand total rendered in footer",reports.includes("installationSummaryReportFoot")&&reports.includes("الإجمالي العام")],
["team totals retained",reports.includes("installation-summary-service-total")&&reports.includes("إجمالي ${esc(team.name)}")],
["period shown in print filters",reports.includes("الفترة: ${period.label}")],
["PDF supports non-day period",reports.includes("summaryPeriodFileKey()")&&reports.includes("summaryPeriodShareLabel()")],
["summary footer themed",css.includes("installation-summary-table tfoot .installation-summary-grand-total td")]
];
let fail=0;for(const[n,o]of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)fail++;}
console.log(`${checks.length-fail}/${checks.length} PASS`);process.exitCode=fail?1:0;
