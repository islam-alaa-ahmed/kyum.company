import fs from "node:fs";
const migration=fs.readFileSync("supabase/migrations/phase_m15_25_2_daily_suggestions_selected_scope_alignment.sql","utf8");
const app=fs.readFileSync("assets/js/app.js","utf8");
const customers=fs.readFileSync("assets/js/customers-service.js","utf8");
const mobile=fs.readFileSync("assets/js/mobile.js","utf8");
const dataScope=fs.readFileSync("assets/js/data-access-scope.js","utf8");

const checks=[
  ["target-user canonical scope helper",migration.includes("create or replace function public.can_user_access_representative")],
  ["selected representatives included",migration.includes("user_data_access_representatives")&&migration.includes("tu.access_mode = 'selected'")],
  ["own representative included",migration.includes("p_representative_id = tu.own_representative_id")],
  ["all mode included",migration.includes("tu.access_mode = 'all'")],
  ["suggestion engine uses canonical helper",migration.includes("public.can_user_access_representative(p_user_id,c.representative_id)")],
  ["strict rotation cycle retained",migration.includes("v_cycle_floor")&&migration.includes("completed_count=v_cycle_floor")],
  ["10-per-type target retained",migration.includes("greatest(10-count(*),0)")],
  ["same-day contacted exclusion retained",migration.includes("f.contact_date=p_suggestion_date")],
  ["customer list selected scope retained",customers.includes('.in("representative_id", scope.representativeIds)')],
  ["client selected scope includes own plus allowed",dataScope.includes("ids.unshift(currentProfile.representative_id)")&&dataScope.includes("user_data_access_representatives")],
  ["customer view button not owner-gated",app.includes('data-details="${customer.id}"')],
  ["follow-up button permission-only",app.includes('canManageFollowups("add") ? `<button class="edit-btn" data-add-followup="${customer.id}">متابعة</button>`')],
  ["mobile call visible for any loaded customer with phone",app.includes('mobile-customer-call')&&app.includes('customer.phone ?')],
  ["mobile WhatsApp visible for any loaded customer with phone",app.includes('mobile-customer-whatsapp')&&app.includes('customer.phone ?')],
  ["mobile enhancer does not owner-gate contact buttons",mobile.includes("mobile-customer-whatsapp")&&!mobile.includes("representativeId===")]
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed++;}
console.log(`${checks.length-failed}/${checks.length} PASS`);
process.exitCode=failed?1:0;
