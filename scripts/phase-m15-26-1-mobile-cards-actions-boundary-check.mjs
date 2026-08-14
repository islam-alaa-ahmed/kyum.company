import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const checks=[];
const check=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});

const mobileJs=read('assets/js/mobile.js');
const mobileTheme=read('assets/css/mobile-theme-canonical.css');
const salesCss=read('assets/css/sales-invoices.css');
const appJs=read('assets/js/app.js');
const index=read('index.html');
const version=JSON.parse(read('version.json'));
const pkg=JSON.parse(read('package.json'));
const pwa=read('assets/js/pwa.js');
const sw=read('service-worker.js');

check('Version unified', version.version==='18.53.60' && pkg.version===version.version && pwa.includes(`CURRENT_VERSION = "${version.version}"`));
check('Index cache tokens unified', !/\?v=18\.53\.59/.test(index) && index.includes('?v=18.53.60'));
check('Service worker cache token unified', sw.includes(version.cacheToken));
check('Phone-only presentation media', mobileJs.includes('const PHONE_MEDIA') && mobileTheme.includes('(max-width: 767px)'));
check('Record/matrix separation', mobileJs.includes('kyum-mobile-card-table') && mobileJs.includes('kyum-mobile-matrix-table') && mobileJs.includes('MATRIX_SELECTOR'));
check('Permission labels are presentation-only', mobileJs.includes('kyum-mobile-permission-toggle') && mobileJs.includes('can_view: "عرض"') && mobileTheme.includes('#permissionsView .kyum-mobile-permission-toggle'));
check('Action grid contract', mobileTheme.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important') && mobileTheme.includes('word-break:keep-all!important'));
check('Suggested customer compact cards', mobileTheme.includes('daily-suggested-customers-table.kyum-mobile-card-table'));
check('Bottom sheet clears bottom nav', mobileTheme.includes('mobile-dashboard-sheet-open') && mobileTheme.includes('.mobile-bottom-nav') && mobileTheme.includes('pointer-events:none!important'));
check('Single active-view bottom clearance', mobileTheme.includes('.main-content{padding-bottom:0!important}') && mobileTheme.includes('.view-section:not(.hidden)'));
check('Dark sales invoice surfaces', salesCss.includes('--kyum-mobile-surface') && salesCss.includes('--kyum-mobile-text'));
check('Execution timeline readable on phone', mobileTheme.includes('#installationExecutionView .execution-step-label') && mobileTheme.includes('text-overflow:clip!important'));
check('Backup runtime canonicalStatus regression removed', !appJs.includes('escapeHtml(canonicalStatus)</span></td>') && appJs.includes('item.status === "completed" ? "مكتمل"'));
check('No SQL/RLS references introduced', !mobileJs.includes('supabase') && !mobileTheme.includes('supabase'));

for(const c of checks) console.log(`${c.ok?'PASS':'FAIL'} — ${c.name}${c.detail?` (${c.detail})`:''}`);
const passed=checks.filter(c=>c.ok).length;
console.log(`\n${passed}/${checks.length} checks passed`);
if(passed!==checks.length) process.exit(1);
