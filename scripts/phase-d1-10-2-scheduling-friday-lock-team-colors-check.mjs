import fs from "node:fs";
const js=fs.readFileSync("assets/js/installation-scheduling.js","utf8");
const css=fs.readFileSync("assets/css/installation-scheduling.css","utf8");
const sql=fs.readFileSync("supabase/migrations/phase_d1_10_2_default_friday_schedule_lock.sql","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
const checks=[
["version",version.version==="18.53.94"],
["friday UI default",js.includes("d.getDay()===5")&&js.includes("dayLocks.has(date)")],
["explicit lock row wins",js.includes("if(dayLocks.has(date))return dayLocks.get(date)")],
["stable team color palette",js.includes("TEAM_DOT_COLORS")&&js.includes("stableTeamColor(team)")],
["team color keyed not index",!js.includes('style="--team-index:${i}"')],
["team summary stable color",js.includes('style="${teamDotStyle(g)}"')],
["day details stable color",js.includes('installation-day-team-column')&&js.includes('style="${teamDotStyle(g)}"')],
["CSS dot uses stable var",css.includes("background:var(--team-color,#2f83ff)")],
["desktop calendar gap increased",css.includes(".installation-schedule-view .installation-calendar-grid{\n    gap:6px")],
["desktop shell differentiated",css.includes("--installation-calendar-shell-bg")&&css.includes("background:var(--installation-calendar-shell-bg)")],
["locked day matches team summary",css.includes("background:var(--installation-team-summary-bg)")],
["mobile locked day parity",css.includes(".installation-schedule-view .installation-calendar-day.is-locked{\n    opacity:1;")],
["Friday server fallback",sql.includes("extract(isodow from p_schedule_date)=5")],
["Friday explicit override preserved",sql.includes("select is_locked")&&sql.includes("coalesce(")]
];
let failed=0;for(const[n,o]of checks){console.log(`${o?"PASS":"FAIL"} ${n}`);if(!o)failed++;}
console.log(`${checks.length-failed}/${checks.length} PASS`);process.exitCode=failed?1:0;
