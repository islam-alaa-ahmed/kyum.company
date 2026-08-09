import fs from 'node:fs';
const js=fs.readFileSync('assets/js/installation-costs.js','utf8');
const css=fs.readFileSync('assets/css/installation-costs.css','utf8');
const v=JSON.parse(fs.readFileSync('version.json','utf8'));
const checks=[
 ['workingDaysInMonth exists',js.includes('function workingDaysInMonth(year,month)')],
 ['Friday excluded',js.includes("getDay()!==5")],
 ['annual daily uses monthly base',js.includes("mode==='annual'?Number(total||0)/12:Number(total||0)")],
 ['daily KPI label explains working days',js.includes('أيام العمل بدون الجمعة')],
 ['matrix dialog widened',css.includes('width:min(1480px,calc(100vw - 24px))')],
 ['matrix desktop fits width',css.includes('table-layout:fixed') && css.includes('min-width:0')],
 ['matrix wrapper no desktop horizontal cut',css.includes('overflow-y:auto;overflow-x:hidden')],
 ['version 18.53.44',v.version==='18.53.44' && v.build===185344]
];
let ok=0; for(const [n,p] of checks){console.log(`${p?'PASS':'FAIL'}: ${n}`); if(p)ok++;}
console.log(`${ok}/${checks.length} PASS`); if(ok!==checks.length)process.exit(1);
