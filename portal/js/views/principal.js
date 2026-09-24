/* Principal's office */
import * as store from "../store.js";
import { CLASSES, className, SESSION } from "../school.js";
import { $, esc, kpi, card, empty, pill, bars, ring, fmtDate, money, today } from "../ui.js";
import { noticeList, profileView } from "./shared.js";
import { idCardPage } from "./idcard.js";
import { snapshot, schoolCharts, studentsView, attendanceOverview, resultsOverview, feesView, noticesManager, staffView, leaveApprovals, timetableView } from "./manage.js";

let me;
export function init(user) { me = user; }

export const parentOf = { idcard: "students" };
export const nav = [
  { id: "home", label: "Overview", icon: "home" },
  { id: "attendance", label: "Attendance", icon: "checklist" },
  { id: "results", label: "Results & publishing", icon: "chart" },
  { id: "students", label: "Students", icon: "school" },
  { id: "staff", label: "Staff", icon: "teacher" },
  { id: "leaves", label: "Leave approvals", icon: "leave" },
  { id: "fees", label: "Fee collection", icon: "money" },
  { id: "timetable", label: "Timetables", icon: "calendar" },
  { id: "notices", label: "Notices", icon: "bell" }
];

async function home({ el }) {
  const s = await snapshot();
  const ch = schoolCharts(s);
  const exams = await store.list("exams", { published: false });
  const drafts = new Set(exams.map((e) => e.examKey)).size;
  const unmarked = CLASSES.filter((c) => !s.marked.has(c.id));
  el.innerHTML = `
  <div class="hello"><div><h2>Welcome, ${esc(me.name)}</h2><p>Student Point Academy at a glance — ${fmtDate(today())} · Session ${SESSION}</p></div>
    <svg class="hello__star" viewBox="0 0 24 24"><path d="M12 3 1 9l11 6 9-4.91V17h2V9zM5 13.18v4L12 21l7-3.82v-4L12 17z"/></svg></div>
  <div class="grid grid--kpi">
    ${kpi({ label: "Students enrolled", value: s.students.length, sub: `${CLASSES.length} classes · ${s.staff.length} staff`, ic: "school", href: "#/students" })}
    ${kpi({ label: "Present today", value: s.markedTotal ? s.attPct + "%" : "—", sub: `${s.marked.size}/${CLASSES.length} classes marked`, ic: "checklist", tone: s.attPct >= 85 ? "green" : "red", href: "#/attendance" })}
    ${kpi({ label: "Fee collected", value: s.feePct + "%", sub: `${money(s.collected)} this month`, ic: "money", tone: "gold", href: "#/fees" })}
    ${kpi({ label: "Waiting for you", value: s.pendingStaffLeaves.length + drafts, sub: `${s.pendingStaffLeaves.length} staff leave · ${drafts} result${drafts === 1 ? "" : "s"} to publish`, ic: "bell", tone: "red", href: "#/leaves" })}
  </div>
  <div class="grid grid--main">
    <div>
      ${card("Attendance today by class", bars(ch.byClass.filter(([, v]) => v !== null)) + (unmarked.length ? `<p class="small" style="margin-top:14px"><b style="color:var(--red)">Not marked yet:</b> ${unmarked.map((c) => esc(c.name.replace("Class ", ""))).join(", ")}</p>` : ""), `<a href="#/attendance">Details</a>`)}
      ${card("Fee paid this month, by class", bars(ch.feeByClass, { tone: "gold" }), `<a href="#/fees">Details</a>`)}
    </div>
    <div>
      ${card("Today", `<div class="ring-row" style="justify-content:space-around">${ring(s.attPct, "students", "var(--green)")}${ring(s.staffMarked ? Math.round((s.staffPresent / s.staff.length) * 100) : 0, "staff", "var(--navy-3)")}${ring(s.feePct, "fees", "var(--gold)")}</div>`)}
      ${card("Students by group", bars(Object.entries(ch.groups).sort((a, b) => b[1] - a[1]), { max: Math.max(...Object.values(ch.groups)), suffix: "", tone: "" }))}
      ${card("Staff leave waiting", s.pendingStaffLeaves.length ? `<ul class="list">${s.pendingStaffLeaves.map((l) => `<li><div class="list__main"><b>${esc(l.name)}</b>${fmtDate(l.from, false)}${l.to !== l.from ? " – " + fmtDate(l.to, false) : ""} · ${esc(l.reason)}</div>${pill("Pending", "gold")}</li>`).join("")}</ul>` : empty("Nothing waiting", "leave"), `<a href="#/leaves">Review</a>`)}
    </div>
  </div>`;
}

export const views = {
  idcard: (ctx) => idCardPage(ctx.params.kind === "staff" ? "staff" : "student", { office: true })(ctx),
  home,
  attendance: attendanceOverview({ canMarkStaff: true }),
  results: resultsOverview({ canPublish: true }),
  students: studentsView({ canEdit: false }),
  staff: staffView({ canEdit: false }),
  leaves: (ctx) => leaveApprovals({ byName: me.name })(ctx),
  fees: feesView({ canEdit: false }),
  timetable: timetableView({ canEdit: false }),
  notices: noticesManager("Principal"),
  profile: profileView(async (u) => [["Login ID", u.loginId], ["Role", "Principal"]])
};

export async function counts() {
  const l = await store.list("leaves", { kind: "staff", status: "pending" });
  return { leaves: l.length };
}
