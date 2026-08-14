import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const css=read('assets/css/mobile-theme-canonical.css');
const mobile=read('assets/js/mobile.js');
const index=read('index.html');
const version=JSON.parse(read('version.json'));
const sw=read('service-worker.js');
const checks=[
 ['phone-only contract exists',css.includes('Phase M15.26 — Mobile Enterprise Content & Screens Certification')],
 ['phone landscape is bounded',css.includes('max-height: 560px')&&css.includes('max-device-width: 932px')],
 ['mobile record cards exist',css.includes('table.kyum-mobile-card-table')&&css.includes('content:attr(data-label)')],
 ['matrix card association exists',css.includes('.notification-matrix')&&css.includes('.daily-task-matrix-table')],
 ['forms use zero-min columns',css.includes('grid-template-columns:minmax(0,1fr)!important')],
 ['popover viewport guard exists',css.includes('max-height:min(52dvh,360px)!important')],
 ['runtime annotator is phone-only',mobile.includes('Phase M15.26 — Mobile Enterprise Content & Screens Certification')&&mobile.includes('PHONE_MEDIA')],
 ['runtime does not write business storage',!mobile.slice(mobile.indexOf('Phase M15.26')).match(/supabase|localStorage\.setItem|sessionStorage\.setItem|\.insert\(|\.update\(|\.delete\(/)],
 ['desktop/tablet untouched by new CSS scope',css.slice(css.lastIndexOf('Phase M15.26')).includes('@media (max-width: 767px)')],
 ['release version updated',version.version==='18.53.59'&&index.includes('?v=18.53.59')],
 ['service worker token updated',sw.includes('kyum-crm-pwa-18-53-59-mobile-content-certification-m15-26')]
];
let pass=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} — ${name}`);if(ok)pass++;}
console.log(`\n${pass}/${checks.length} checks passed`);if(pass!==checks.length)process.exit(1);
