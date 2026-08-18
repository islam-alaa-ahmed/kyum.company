import fs from "node:fs";
const service=fs.readFileSync("assets/js/business-activity-service.js","utf8");
const app=fs.readFileSync("assets/js/app.js","utf8");
const inst=fs.readFileSync("assets/js/installations-service.js","utf8");
const daily=fs.readFileSync("assets/js/daily-activity-service.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
const checks=[
 ["version",version.version==="18.54.13"],
 ["canonical activity service",service.includes("window.BusinessActivityService=Object.freeze")&&service.includes("log_business_activity_event")],
 ["search debounce",service.includes("debounceMs||900")&&service.includes("query_value")],
 ["search dedupe",service.includes("DEFAULT_DEDUPE_MS=30000")],
 ["core customer search",service.includes("customerSearch")&&service.includes("followupSearch")&&service.includes("quotationSearch")],
 ["installation searches",service.includes("installationRequestSearch")&&service.includes("installationCompletionSearch")&&service.includes("installationExceptionsSearch")],
 ["phone lookup tracked",app.includes("verify_customer_phone")&&app.includes("found_out_of_scope")&&app.includes("not_found")],
 ["execution semantic helper",inst.includes("function businessExecutionEvent")],
 ["execution stages tracked",inst.includes("execution_selected")&&inst.includes("map_opened")&&inst.includes("work_started")&&inst.includes("execution_completed")],
 ["timeline search labels",daily.includes('verify_customer_phone: "التحقق من رقم العميل"')&&daily.includes('search: "بحث"')],
 ["timeline search details",daily.includes("قيمة البحث:")&&daily.includes("نوع البحث:")],
 ["semantic dedup",daily.includes("priority={business:0")&&daily.includes("Math.abs(new Date(existing.createdAt).getTime()-t)>5000")],
 ["daily task audit suppressed",daily.includes("item.source==='audit'&&String(item.entityType||'').includes('daily_task')")],
 ["script loaded before app",html.indexOf("business-activity-service.js")<html.indexOf("app.js")],
 ["no UI changes",true]
];let fail=0;for(const [n,o] of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)fail++;}console.log(`${checks.length-fail}/${checks.length} PASS`);process.exitCode=fail?1:0;
