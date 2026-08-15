import fs from "node:fs";
const app=fs.readFileSync("assets/js/app.js","utf8");
const mobile=fs.readFileSync("assets/js/mobile.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
const checks=[
["version",version.version==="18.54.02"],
["mobile cards container",html.includes('id="customersMobileCards"')],
["shared Saudi normalizer exists",mobile.includes("function normalizeSaudiPhone")&&mobile.includes('digits = `966${digits.slice(1)}`')],
["mobile WhatsApp uses international builder",app.includes("window.KYUMMobilePhone?.whatsappUrl?.(customer.phone)")],
["no old local wa mobile template",!app.includes('href="https://wa.me/${normalizePhone(customer.phone)}"')],
["shared customer action handler",app.includes("function handleCustomerActionClick(event)")],
["desktop customer actions retained",app.includes('getElementById("customersTableBody")?.addEventListener("click", handleCustomerActionClick)')],
["mobile customer actions bound",app.includes('getElementById("customersMobileCards")?.addEventListener("click", handleCustomerActionClick)')],
["nested click target supported",app.includes('event.target.closest?.("[data-edit],[data-delete],[data-details],[data-add-followup]")')],
["desktop handlers reused",app.includes("openCustomerDialog(customer)")&&app.includes("deleteCustomer(deleteId)")&&app.includes("showCustomerDetails(detailsId)")&&app.includes("openFollowupDialog(addFollowupCustomerId)")]
];
let f=0; for(const [n,o] of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)f++;}
console.log(`${checks.length-f}/${checks.length} PASS`); process.exitCode=f?1:0;
