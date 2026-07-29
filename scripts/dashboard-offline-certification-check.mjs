import fs from 'node:fs';

const app = fs.readFileSync('assets/js/app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const version = JSON.parse(fs.readFileSync('version.json', 'utf8'));
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

const dashboardStart = app.indexOf('function dashboardData()');
const dashboardEnd = app.indexOf('function renderRepresentativePerformance', dashboardStart);
const dashboardBlock = app.slice(dashboardStart, dashboardEnd);

check(dashboardStart >= 0 && dashboardEnd > dashboardStart, 'Dashboard functions were not found.');
check(!/customerSupabase|supabase\s*\.\s*from|\.from\s*\(/.test(dashboardBlock), 'Dashboard contains direct data access.');
check(/const filteredCustomers = customers\.filter/.test(dashboardBlock), 'Dashboard is not derived from customer state.');
check(/const filteredFollowups = followups\.filter/.test(dashboardBlock), 'Dashboard is not derived from follow-up state.');
check(/const filteredQuotations = quotations\.filter/.test(dashboardBlock), 'Dashboard is not derived from quotation state.');

for (const eventName of ['kyum-customer-cache-updated', 'kyum-followup-cache-updated', 'kyum-quotation-cache-updated']) {
  check(app.includes(eventName), `Missing cache update listener: ${eventName}`);
}

check(/Promise\.allSettled\(\[\s*loadReferenceDataFromSupabase\(false\),\s*loadCustomersFromSupabase\(false\),\s*loadFollowupsFromSupabase\(false\),\s*loadQuotationsFromSupabase\(false\)/s.test(app), 'Authenticated startup is not cache-first and parallel.');
check(!/customer-auth-ready[\s\S]{0,700}loadCustomersFromSupabase\(true\)/.test(app), 'Authenticated startup still forces customer network loading.');
check(!/customer-auth-ready[\s\S]{0,700}loadFollowupsFromSupabase\(true\)/.test(app), 'Authenticated startup still forces follow-up network loading.');
check(!/customer-auth-ready[\s\S]{0,700}loadQuotationsFromSupabase\(true\)/.test(app), 'Authenticated startup still forces quotation network loading.');
check(index.includes(`assets/js/app.js?v=${version.version}`), 'app.js cache-busting version is inconsistent.');

if (failures.length) {
  console.error(`Dashboard Offline Certification: FAIL (${failures.length})`);
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('Dashboard Offline Certification: PASS');
console.log('Data sources: customers, followups, quotations');
console.log('Startup policy: cache-first, parallel, background Delta Sync');
console.log('Direct Supabase access in dashboard: none');
