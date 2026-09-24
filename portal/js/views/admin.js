/* Admin portal (academy office) */
import * as store from "../store.js";
import { CLASSES, className, shortName, ROLES } from "../school.js";
import { $, $$, esc, icon, kpi, card, empty, pill, person, bars, toast, dialog, field, options, armed, money, fmtDate, today } from "../ui.js";
import { profileView } from "./shared.js";
import { subscriptionsAdmin, pendingCount } from "./subscribe.js";
import { idCardPage } from "./idcard.js";
import { snapshot, schoolCharts, studentsView, attendanceOverview, resultsOverview, feesView, noticesManager, staffView, timetableView } from "./manage.js";

let me;
export function init(user) { me = user; }

export const parentOf = { idcard: "students" };
export const nav = [
  { id: "home", label: "Dashboard", icon: "home" },
  { label: "People" },
  { id: "students", label: "Students", icon: "school" },
  { id: "staff", label: "Staff", icon: "teacher" },
  { id: "accounts", label: "Logins & passwords", icon: "shield" },
  { label: "Academy" },
  { id: "subscriptions", label: "Portal subscriptions", icon: "star" },
  { id: "fees", label: "Fees", icon: "money" },
  { id: "attendance", label: "Attendance", icon: "checklist" },
  { id: "results", label: "Results", icon: "chart" },
  { id: "timetable", label: "Timetables", icon: "calendar" },
  { id: "notices", label: "Portal notices", icon: "bell" },
  { label: "Website" },
  { id: "website", label: "Website content", icon: "web", href: "../admin/" },
  { id: "settings", label: "Settings", icon: "settings" }
];

async function home({ el }) {
  const s = await snapshot();
  const ch = schoolCharts(s);
  const [users, inquiries] = await Promise.all([store.list("users"), store.list("inquiries").catch(() => [])]);
  const perClass = CLASSES.map((c) => [shortName(c.id), s.students.filter((x) => x.classId === c.id).length]);
  el.innerHTML = `
  <div class="hello"><div><h2>Academy office</h2><p>Manage admissions, staff, logins, fees and timetables. ${fmtDate(today())}</p></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;position:relative"><a class="btn btn--gold btn--sm" href="#/students">Add a student</a><a class="btn btn--ghost btn--sm" href="#/fees">Record a fee</a></div>
    <svg class="hello__star" viewBox="0 0 24 24"><path d="M12 3 1 9l11 6 9-4.91V17h2V9zM5 13.18v4L12 21l7-3.82v-4L12 17z"/></svg></div>
  <div class="grid grid--kpi">
    ${kpi({ label: "Students", value: s.students.length, sub: `${CLASSES.length} classes`, ic: "school", href: "#/students" })}
    ${kpi({ label: "Staff", value: s.staff.length, sub: `${s.staffPresent} present today`, ic: "teacher", href: "#/staff" })}
    ${kpi({ label: "Portal logins", value: users.length, sub: ["student", "parent", "staff"].map((r) => `${users.filter((u) => u.role === r).length} ${r === "staff" ? "staff" : r + "s"}`).join(" · "), ic: "shield", href: "#/accounts" })}
    ${kpi({ label: "Fee outstanding", value: money(s.expected - s.collected), sub: `${s.feePct}% collected this month`, ic: "money", tone: "red", href: "#/fees" })}
  </div>
  <div class="grid grid--2">
    ${card("Students per class", bars(perClass, { max: Math.max(...perClass.map((x) => x[1]), 1), suffix: "", tone: "" }))}
    <div>${card("Fee paid this month", bars(ch.feeByClass, { tone: "gold" }), `<a href="#/fees">Open</a>`)}
    ${card("Website", `<p class="muted">Articles, announcements and admission inquiries on the public website are managed in the website admin panel.</p><a class="btn btn--outline btn--sm" href="../admin/" target="_blank" rel="noopener">Open website admin${inquiries.length ? ` (${inquiries.filter((q) => !q.contacted).length} new inquiries)` : ""}</a>`)}</div>
  </div>`;
}

/* ---------------- Logins ---------------- */
async function accounts({ el, params }) {
  const users = await store.list("users");
  const role = params.r || "", q = (params.q || "").toLowerCase();
  const list = users.filter((u) => (!role || u.role === role) && (!q || `${u.name} ${u.loginId}`.toLowerCase().includes(q)))
    .sort((a, b) => Object.keys(ROLES).indexOf(a.role) - Object.keys(ROLES).indexOf(b.role) || a.loginId.localeCompare(b.loginId));
  el.innerHTML = `<div class="toolbar">
    ${field("aq", "Search", `<input id="aq" type="search" value="${esc(params.q || "")}" placeholder="Name or login ID">`)}
    ${field("ar", "Role", `<select id="ar"><option value="">All roles</option>${options(Object.entries(ROLES).map(([k, v]) => [k, v.label]), role)}</select>`)}
    <span class="toolbar__spacer"></span>
    <button class="btn btn--gold btn--sm" id="addU">${icon("plus").replace("<svg", '<svg width="18" height="18" fill="currentColor"')} Principal / admin login</button></div>
  ${card(`${list.length} logins`, `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Login ID</th><th>Role</th><th>Linked to</th><th>Status</th><th></th></tr></thead><tbody>
    ${list.slice(0, 300).map((u) => `<tr><td>${person(u.name)}</td><td class="nowrap"><code>${esc(u.loginId)}</code></td><td>${pill(ROLES[u.role]?.label || u.role, u.role === "admin" || u.role === "principal" ? "gold" : "")}</td>
      <td class="small">${u.role === "parent" ? esc((u.children || []).join(", ")) : u.role === "student" ? esc(className(u.classId)) : esc(u.linkId || "—")}</td>
      <td>${u.disabled ? pill("Off", "red") : pill("Active", "green")}</td>
      <td class="nowrap"><button class="linkbtn" data-pw="${esc(u.id)}">Reset password</button>${u.id !== me.id ? ` · <button class="linkbtn${u.disabled ? "" : " linkbtn--danger"}" data-tg="${esc(u.id)}">${u.disabled ? "Turn on" : "Turn off"}</button>` : ""}</td></tr>`).join("")}
  </tbody></table></div>`)}
  <p class="muted small" style="margin-top:12px">Student, parent and staff logins are created when you add a student or staff member. ${store.IS_LIVE ? "Turning a login off blocks the portal; to delete it completely, also remove the user in Firebase console → Authentication." : ""}</p>`;
  let t; $("#aq").oninput = (e) => { clearTimeout(t); t = setTimeout(() => (location.hash = `#/accounts?q=${encodeURIComponent(e.target.value)}&r=${$("#ar").value}`), 350); };
  $("#ar").onchange = (e) => (location.hash = `#/accounts?q=${encodeURIComponent($("#aq").value)}&r=${e.target.value}`);
  if (params.q) { const i = $("#aq"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  const reload = () => accounts({ el, params });
  $$("[data-tg]").forEach((b) => (b.onclick = () => armed(b, async () => { const u = users.find((x) => x.id === b.dataset.tg); await store.update("users", u.id, { disabled: !u.disabled }); toast(u.disabled ? "Login turned on" : "Login turned off"); reload(); }, "Sure?")));
  $$("[data-pw]").forEach((b) => (b.onclick = () => {
    const u = users.find((x) => x.id === b.dataset.pw);
    if (store.IS_LIVE) {
      dialog({ title: "Reset password — " + u.name, body: `<p>For security, passwords are reset in the Firebase console:</p><ol><li>Open <b>Firebase console → Authentication → Users</b>.</li><li>Find <code>${esc(store.idToEmail(u.loginId))}</code>.</li><li>Use the ⋮ menu → <b>Reset password</b>, or delete the user and add them again here with a new password.</li></ol>` });
      return;
    }
    dialog({
      title: "Reset password — " + u.name, submit: "Set password",
      body: field("np", "New password", `<input id="np" name="pw" required minlength="6" value="${Math.random().toString(36).slice(2, 8)}"><div class="field__hint">Give this to ${esc(u.name)}. They can change it from their profile.</div>`),
      onSubmit: async (f) => { if (f.pw.value.length < 6) throw new Error("At least 6 characters."); await store.setDemoPassword(u.id, f.pw.value); toast("Password changed"); }
    });
  }));
  $("#addU").onclick = () => dialog({
    title: "New principal or admin login", submit: "Create login",
    body: `<div class="form">${field("u-role", "Role", `<select id="u-role" name="role">${options([["admin", "Admin (academy office)"], ["principal", "Principal"]])}</select>`)}
      ${field("u-name", "Name", `<input id="u-name" name="name" required>`)}
      ${field("u-id", "Login ID", `<input id="u-id" name="loginId" required placeholder="e.g. office2">`)}
      ${field("u-pw", "Password", `<input id="u-pw" name="pw" required value="${Math.random().toString(36).slice(2, 10)}">`)}</div>`,
    onSubmit: async (f) => { await store.createAccount({ loginId: f.loginId.value.trim(), password: f.pw.value, role: f.role.value, name: f.name.value.trim() }); toast("Login created"); reload(); }
  });
}

/* ---------------- Settings ---------------- */
async function settings({ el }) {
  el.innerHTML = `<div class="grid grid--2">
    ${card("Database", store.IS_LIVE
      ? `<p>${pill("Live", "green")} Connected to Firebase. Everything saved here is visible to everyone with a login.</p>`
      : `<p>${pill("Demo mode", "gold")} The portals are running on sample data stored in this browser only.</p>
         <p>To go live, paste your Firebase web config into <code>assets/js/config.js</code>, publish <code>firestore.rules</code>, and create the first admin login (see <code>PORTALS.md</code>).</p>
         <button class="btn btn--outline btn--sm" id="reset">Reset demo data</button>`)}
    ${card("School structure", `<p class="muted">Classes, subjects, monthly fees, period timings and grading are set in <code>portal/js/school.js</code>.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Class</th><th>Subjects</th></tr></thead><tbody>${CLASSES.map((c) => `<tr><td class="nowrap"><b>${esc(c.name)}</b></td><td class="small">${esc(c.subjects.join(", "))}</td></tr>`).join("")}</tbody></table></div>`)}
  </div>`;
  $("#reset")?.addEventListener("click", (e) => armed(e.currentTarget, () => { store.resetDemo(); location.replace("index.html"); }, "Click again — this signs you out"));
}

export const views = {
  idcard: (ctx) => idCardPage(ctx.params.kind === "staff" ? "staff" : "student", { office: true })(ctx),
  home, accounts, settings,
  students: studentsView({ canEdit: true }),
  staff: staffView({ canEdit: true }),
  fees: feesView({ canEdit: true }),
  attendance: attendanceOverview({ canMarkStaff: true }),
  results: resultsOverview({ canPublish: false }),
  timetable: timetableView({ canEdit: true }),
  notices: noticesManager("Academy Office"),
  subscriptions: (ctx) => subscriptionsAdmin(me.name)(ctx),
  profile: profileView(async (u) => [["Login ID", u.loginId], ["Role", "Admin"]])
};

export async function counts() { return { subscriptions: await pendingCount() }; }
