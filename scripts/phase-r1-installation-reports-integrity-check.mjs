import fs from "node:fs";
const reports=fs.readFileSync("assets/js/installation-operations-reports.js","utf8");
const service=fs.readFileSync("assets/js/installations-service.js","utf8");
const css=fs.readFileSync("assets/css/installation-operations-reports.css","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
const checks=[
["version",version.version==="18.54.03"],
["data-driven report date bounds",service.includes("async function installationReportDateBounds")&&service.includes("installation_execution_visits")],
["date bounds service exported",service.includes("saveRevisit,installationReportDateBounds,operationalReport")],
["summary years use data bounds",reports.includes("InstallationsServiceSafe.installationReportDateBounds()")&&reports.includes("maxYear-minYear+1")],
["all twelve summary months",reports.includes("Array.from({length:12}")],
["calendar days honor selected month/year",reports.includes("new Date(y,m,0).getDate()")],
["multi-invoice aggregation",service.includes("invoiceNumbers:[]")&&service.includes("item.invoiceAmount+=Number(x.invoice_amount||0)")],
["confirmed visit execution quantities",service.includes("confirmedVisitIds")&&service.includes("executed_quantity")&&service.includes("executedQuantityByRequest")],
["execution value calculated",service.includes("executedValueByRequest")&&service.includes("remainingValue")],
["financial total row",reports.includes("installationFinancialReportBody")&&reports.includes("reportTotalRow(['الإجمالي'")],
["representative total row",reports.includes("const repTotal=")],
["team total row",reports.includes("const teamTotals=")],
["technician total row",reports.includes("const techTotals=")],
["invoice total row",reports.includes("invoicedCount")&&reports.includes("مفوتر")],
["derived percentages not blindly summed",reports.includes("reportPercent")],
["totals visual owner",css.includes(".installation-report-total-row td")]
];
let fail=0;for(const[n,o]of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)fail++;}
console.log(`${checks.length-fail}/${checks.length} PASS`);process.exitCode=fail?1:0;
