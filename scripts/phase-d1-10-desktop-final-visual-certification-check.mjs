import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const style=read("assets/css/style.css");
const desktop=read("assets/css/desktop-visual-identity-canonical.css");
const schedule=read("assets/css/installation-scheduling.css");
const execution=read("assets/css/installation-execution.css");
const completion=read("assets/css/installation-completion.css");
const reports=read("assets/css/installation-operations-reports.css");
const costs=read("assets/css/installation-costs.css");
const mobileJs=read("assets/js/mobile.js");
const html=read("index.html");
const version=JSON.parse(read("version.json"));
const featureViews=["dashboardView","customersView","followupsView","quotationsView","representativesView","dailyOperationsView","dailyPerformanceReportView","installationRequestNewView","installationRequestsView","installationScheduleView","installationExecutionView","installationCompletionView","installationReportsView","installationSettingsView","installationCostsView","installationExceptionsView","installationsOverviewView","salesInvoicesView","reportsOverviewView","permissionsView","usersView","settingsView","systemSettingsView","systemHealthView","activityLogView","backupsView","notificationCenterView"];
const checks=[
["version is D1.10",version.version==="18.53.92"&&version.build===185392],
["desktop canonical linked",html.includes("desktop-visual-identity-canonical.css?v=18.53.92")],
["desktop canonical scoped",desktop.includes("@media (min-width:1024px)")],
["dashboard coverage",desktop.includes("#dashboardView")],["customers coverage",desktop.includes("#customersView")],["followups coverage",desktop.includes("#followupsView")],
["specialized rollout retained",desktop.includes("Phase D1.7 — Specialized desktop screen canonical token rollout")],
["geometry contract retained",desktop.includes("Phase D1.9 — Desktop component geometry & containment contract")],
["dark native controls retained",desktop.includes("--control-color-scheme:dark")&&desktop.includes("--option-bg:#0b1d34")],
["calendar structural fidelity retained",schedule.includes("D1.6 — Desktop scheduling structural-fidelity owner")&&schedule.includes("var(--desktop-accent-gold")],
["execution canonical tokens retained",execution.includes("--desktop-exec-")],["completion canonical tokens retained",completion.includes("--desktop-completion-")],
["reports desktop owner retained",reports.includes("@media (min-width:1024px)")],
["legacy calendar hover isolated below desktop",schedule.includes("@media(max-width:1023px){.installation-calendar-day.has-appointments:hover")],
["mobile reports teardown retained",mobileJs.includes("function teardownDesktopArtifacts()")&&mobileJs.includes('view.querySelector(".mobile-reports-toolbar")?.remove()')],
["cost matrix owner moved",costs.includes("Phase D1.10 — Cost matrix canonical feature-surface owner")],
["cost matrix forced layer removed",!desktop.match(/installation-cost-matrix[\\s\\S]{0,1200}!important/)],
["shared badge contract retained",style.includes("--status-badge-white-space")&&desktop.includes("--badge-white-space:nowrap")],
["row action containment retained",style.includes("--row-action-white-space")&&desktop.includes("--row-action-white-space:nowrap")],
["header outside owner",!desktop.includes("#appHeader")],["sidebar outside owner",!desktop.includes("#mainSidebar")&&!desktop.includes("#sidebar")],
["all feature views owned",featureViews.every(id=>id==="installationScheduleView"?schedule.includes(".installation-schedule-view"):(desktop.includes(`#${id}`)||schedule.includes(`#${id}`)))]
];
let f=0;for(const[n,o]of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)f++}console.log(`${checks.length-f}/${checks.length} PASS`);process.exitCode=f?1:0;
