import fs from "node:fs";

const migration = fs.readFileSync(
  "supabase/migrations/phase_m15_25_3_al_ahsa_canonical_geography_repair.sql",
  "utf8"
);
const verification = fs.readFileSync(
  "supabase/verification/phase_m15_25_3_al_ahsa_canonical_geography_repair_verification.sql",
  "utf8"
);
const geography = fs.readFileSync("assets/js/geographic-address.js","utf8");

const checks = [
  ["canonical National Address Al Ahsa retained", migration.includes("national_address_city_id = 3677")],
  ["legacy normalized Al Ahsa duplicates handled", migration.includes("= 'الاحساء'") && migration.includes("is_active = false")],
  ["four principal Al Ahsa source cities used", ["الهفوف","المبرز","العيون","العمران"].every(x => migration.includes(`'${x}'`))],
  ["source National Address district rows remain untouched", migration.includes("national_address_district_id,") && migration.includes("\n  null,\n  true\nfrom missing m") && !migration.includes("set national_address_district_id = null")],
  ["district aliases are inserted under canonical Al Ahsa", migration.includes("insert into public.installation_neighborhoods") && migration.includes("cross join ahsa")],
  ["existing installation request neighborhood references protected", migration.includes("update public.installation_requests")],
  ["geography cache key bumped", geography.includes('geography:canonical-catalog:v2')],
  ["geography cache schema bumped", geography.includes("GEO_CACHE_SCHEMA_VERSION = 2")],
  ["verification checks one active Al Ahsa", verification.includes("active_ahsa_rows")],
  ["verification checks source-city regression", verification.includes("Existing source cities retain their own neighborhoods")]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed++;
}
console.log(`${checks.length - failed}/${checks.length} PASS`);
process.exitCode = failed ? 1 : 0;
