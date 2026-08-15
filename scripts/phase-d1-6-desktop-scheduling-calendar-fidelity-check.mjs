import fs from 'node:fs';
const css=fs.readFileSync('assets/css/installation-scheduling.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const checks=[
 ['single D1.6 desktop owner',css.includes('D1.6 — Desktop scheduling structural-fidelity owner') && !css.includes('D1.5 — Desktop scheduling visual owner')],
 ['desktop owner scoped',css.includes('@media (min-width:1024px)')],
 ['calendar grid has real gap',css.includes('.installation-schedule-view .installation-calendar-grid{\n    gap:2px;border:0')],
 ['day cards rounded',css.includes('border-radius:13px;overflow:hidden')],
 ['day cards own border',css.includes('min-height:150px;padding:10px;border:1px solid var(--border);border-radius:13px')],
 ['weekday cards separated',css.includes('.installation-calendar-weekdays{\n    gap:2px') && css.includes('border-radius:10px;color:#fff')],
 ['today uses gold border',css.includes('border-color:var(--desktop-accent-gold,#d5a132)')],
 ['today remains glass not flat gold',css.includes('color-mix(in srgb,var(--desktop-accent-gold,#d5a132) 5%,var(--surface-soft))')],
 ['kpi cards compact',css.includes('min-height:94px;padding:18px 20px')],
 ['kpi accent rail',css.includes('.installation-schedule-kpis article::after')],
 ['appointment summaries rounded',css.includes('min-height:26px;padding:5px 7px')],
 ['mobile breakpoint preserved',css.includes('@media(max-width:1023px)')],
 ['header not targeted',!css.includes('#appHeader')],
 ['sidebar not targeted',!css.includes('.sidebar')],
 ['version cache updated',html.includes('installation-scheduling.css?v=18.53.88')]
];
let bad=0; for(const [n,o] of checks){console.log(`${o?'PASS':'FAIL'} ${n}`);if(!o)bad++;} if(bad)process.exit(1);
