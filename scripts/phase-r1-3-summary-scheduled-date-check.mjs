import fs from "node:fs";
const reports=fs.readFileSync("assets/js/installation-operations-reports.js","utf8");
const service=fs.readFileSync("assets/js/installations-service.js","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
const checks=[
 ["version",version.version==="18.54.06"],
 ["scheduled date rendered",reports.includes("تاريخ الجدولة: ${fmt(order.scheduledDate)}")],
 ["scheduled time retained",reports.includes("وقت الجدولة: ${esc(order.scheduledTime||'غير محدد')}")],
 ["service still supplies scheduled date",service.includes("scheduledDate:scheduledDate||request?.scheduled_date||''")],
 ["timeline retained",reports.includes("${summaryTimeline(order)}")],
 ["R1.2 request revenue retained",service.includes("const revenue=requestRevenue;")],
 ["R1.1 all-period filters retained",reports.includes("كل السنوات")&&reports.includes("كل الشهور")&&reports.includes("كل الأيام")]
];
let fail=0;for(const[n,o]of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)fail++;}
console.log(`${checks.length-fail}/${checks.length} PASS`);process.exitCode=fail?1:0;
