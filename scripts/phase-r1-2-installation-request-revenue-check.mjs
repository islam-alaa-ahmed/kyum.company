import fs from "node:fs";
const service=fs.readFileSync("assets/js/installations-service.js","utf8");
const reports=fs.readFileSync("assets/js/installation-operations-reports.js","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
const checks=[
["version",version.version==="18.54.05"],
["operational request revenue canonical",service.includes("const revenue=requestRevenue;")&&service.includes("const requestRevenue=Number(r.total_services_amount??serviceAmount.get(requestId)??0)")],
["invoice amount no longer drives revenue",!service.includes("const revenue=inv?Number(inv.invoiceAmount||0):serviceValue")],
["invoice metadata retained",service.includes("invoiceNumbers")&&service.includes("invoiceDate")&&service.includes("invoiceStatus")],
["summary request factor exists",service.includes("const requestRevenueFactor=new Map()")&&service.includes("canonicalRevenue/serviceBase")],
["summary canonical request total",service.includes("Number(request.total_services_amount??serviceBase??0)")],
["multi-day breakdown reconciled",service.includes("requestRevenueFactor.get(String(visit.installation_request_id||''))??1")],
["single-day breakdown reconciled",service.includes("requestRevenueFactor.get(String(request.id||''))??1")],
["zero revenue factor preserved",service.includes("if(!Number.isFinite(revenueFactor))revenueFactor=1")],
["operational executed value reconciled",service.includes("operationalRequestRevenueFactor")&&service.includes("*revenueFactor")],
["profit remains revenue minus expenses",service.includes("const profit=revenue-expenses")],
["R1.1 period filters retained",reports.includes("كل السنوات")&&reports.includes("كل الشهور")&&reports.includes("كل الأيام")],
["R1.1 active reps retained",service.includes("select('id,full_name,is_active').eq('is_active',true).order('full_name')")]
];
let fail=0;for(const[n,o]of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)fail++;}
console.log(`${checks.length-fail}/${checks.length} PASS`);process.exitCode=fail?1:0;
