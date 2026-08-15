import fs from 'node:fs';
const style=fs.readFileSync('assets/css/style.css','utf8');
const scheduling=fs.readFileSync('assets/css/installation-scheduling.css','utf8');
const reports=fs.readFileSync('assets/css/installation-operations-reports.css','utf8');
const mobile=fs.readFileSync('assets/js/mobile.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const checks=[
 ['legacy surface alias',style.includes('--surface:var(--ui-final-surface)')],
 ['legacy soft surface alias',style.includes('--surface-soft:var(--ui-final-surface-2)')],
 ['dark inherited surface alias',style.includes('html[data-theme="dark"] .main-content') && style.includes('--desktop-accent-gold:#d9a837')],
 ['calendar desktop owner',scheduling.includes('D1.5 — Desktop scheduling visual owner')],
 ['calendar today gold',scheduling.includes('box-shadow:inset 0 0 0 2px var(--desktop-accent-gold')],
 ['calendar blue weekday header',scheduling.includes('background:linear-gradient(180deg,#287edc,#1e64b5)')],
 ['reports desktop isolation',reports.includes('D1.5 — Desktop installation reports theme isolation')],
 ['reports tabs tokenized',reports.includes('background:linear-gradient(145deg,var(--surface),var(--surface-soft))')],
 ['mobile reports desktop teardown',mobile.includes('function teardownDesktopArtifacts()')],
 ['mobile reports gated before DOM creation',mobile.includes('if (!MOBILE_MEDIA.matches) {') && mobile.includes('teardownDesktopArtifacts();')],
 ['mobile toolbar removed on desktop',mobile.includes('view.querySelector(".mobile-reports-toolbar")?.remove()')],
 ['mobile filter sheet removed on desktop',mobile.includes('filters.classList.remove("mobile-reports-filter-sheet")')],
 ['header not targeted in D1.5 specialized files',!scheduling.includes('#appHeader') && !reports.includes('#appHeader')],
 ['sidebar not targeted in D1.5 specialized files',!scheduling.includes('.sidebar') && !reports.includes('.sidebar')],
 ['version cache updated',html.includes('18.53.87')]
];
let bad=0; for(const [n,o] of checks){console.log(`${o?'PASS':'FAIL'} ${n}`);if(!o)bad++;} if(bad)process.exit(1);
