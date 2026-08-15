import fs from 'node:fs';
const canonical=fs.readFileSync('assets/css/desktop-visual-identity-canonical.css','utf8');
const execution=fs.readFileSync('assets/css/installation-execution.css','utf8');
const completion=fs.readFileSync('assets/css/installation-completion.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const tests=[
 ['desktop canonical media',canonical.includes('@media (min-width:1024px)')],
 ['execution desktop surface token',canonical.includes('--desktop-exec-surface:var(--desk-glass-strong)')],
 ['completion desktop surface token',canonical.includes('--desktop-completion-shell:var(--desk-glass-strong)')],
 ['dark option scheme remains',canonical.includes('--control-color-scheme:dark')],
 ['execution root tokenized',execution.includes('--exec-surface:var(--desktop-exec-surface,#fff)')],
 ['execution cards tokenized',execution.includes('background:var(--exec-surface);box-shadow:0 7px 20px')],
 ['execution dark owner tokenized',execution.includes('background:var(--exec-soft);color:var(--exec-text)')],
 ['completion light shell tokenized',completion.includes('background:var(--desktop-completion-shell,#f6f8fb) !important')],
 ['completion dark shell tokenized',completion.includes('background:var(--desktop-completion-shell,#0b1526) !important')],
 ['completion dark controls tokenized',completion.includes('background:var(--desktop-completion-control,#182740) !important')],
 ['service worker cache updated',sw.includes('18-53-90-desktop-light-dark-consistency-d1-8')],
 ['version assets updated',html.includes('18.53.90')],
 ['header excluded from canonical phase tokens',!canonical.includes('--desktop-header-')],
 ['sidebar excluded from canonical phase tokens',!canonical.includes('--desktop-sidebar-')]
];
let fail=0;for(const [n,ok] of tests){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++;}console.log(`${tests.length-fail}/${tests.length} PASS`);process.exitCode=fail?1:0;
