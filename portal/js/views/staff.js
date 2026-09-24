/* Staff (teacher) portal */
import * as store from "../store.js";
import { CLASSES, classById, className, shortName, DAYS, PERIODS, EXAM_TYPES } from "../school.js";
import {
  $, $$, esc, icon, kpi, card, empty, pill, person, statusPill, bars, toast, dialog, field, options, armed,
  fmtDate, dayBox, today, dayName, attendanceStats, examResult, pct
} from "../ui.js";
import { idCardPage } from "./idcard.js";
import { timetableGrid, todayList, noticesView, noticeList, noticesFor, profileView, messagesView, unreadCount, currentPeriod } from "./shared.js";

let me, myId, myClasses = [];

export async function init(user) {
  myId = user.linkId;
  me = await store.get("staff", myId);
  if (!me) throw new Error("Your staff record is missing. Contact the academy office.");
  myClasses = [...new Set([me.classTeacherOf, ...(me.classIds || [])].filter(Boolean))]
    .sort((a, b) => CLASSES.findIndex((c) => c.id === a) - CLASSES.findIndex((c) => c.id === b));
}

export const nav = [
  { id: "home", label: "Dashboard", icon: "home" },
  { id: "attendance", label: "Mark attendance", icon: "checklist" },
  { id: "marks", label: "Enter marks", icon: "edit" },
  { id: "homework", label: "Homework diary", icon: "book" },
  { id: "timetable", label: "My timetable", icon: "calendar" },
  { id: "students", label: "My students", icon: "users" },
  { id: "leaves", label: "Leave", icon: "leave" },
  { id: "messages", label: "Parent messages", icon: "chat" },
  { id: "notices", label: "Notices", icon: "bell" },
  { id: "idcard", label: "Employee card", icon: "user" }
];

/* subjects this teacher teaches in a class */
function mySubjects(classId) {
  const c = classById(classId);
  return (c?.subjects || []).filter((s) => me.subjects.includes(s));
}
/* my weekly schedule assembled from every class timetable */
async function mySchedule() {
  const tts = await Promise.all(CLASSES.map((c) => store.get("timetable", c.id)));
  const days = {};
  DAYS.forEach((d) => {
    days[d] = PERIODS.map((_, i) => {
      for (const tt of tts) {
        const s = tt?.days?.[d]?.[i];
        if (s && s.teacherId === myId) return { subject: s.subject, classId: tt.classId, teacherId: myId };
      }
      return null;
    });
  });
  return { days };
}
const shortClass = (id) => { const c = classById(id); return !c ? id : c.band === "course" ? c.subjects[0] : /^\d+$/.test(c.id) ? "Class " + c.id : c.id === "PG" ? "Play Group" : c.id; };

/* ---------------- Dashboard ---------------- */
async function home({ el, user }) {
  const [sched, att, leaves, msgs, notices] = await Promise.all([
    mySchedule(), Promise.all(myClasses.map((c) => store.get("attendance", `${c}_${today()}`))),
    me.classTeacherOf ? store.list("leaves", { classId: me.classTeacherOf, status: "pending" }) : [],
    unreadCount("staff", myId), noticesFor("staff")
  ]);
  const todaySlots = sched.days[dayName()] || [];
  const periodsToday = todaySlots.filter(Boolean).length;
  const unmarked = myClasses.filter((c, i) => !att[i] && c === me.classTeacherOf);
  const ctAtt = me.classTeacherOf ? att[myClasses.indexOf(me.classTeacherOf)] : null;
  const ctStats = ctAtt ? Object.values(ctAtt.records) : [];
  el.innerHTML = `
  <div class="hello"><div><h2>Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${esc(me.name)}</h2>
    <p>${esc(me.designation)} · ${esc(me.subjects.join(", "))}${me.classTeacherOf ? ` · Class teacher of <b>${esc(className(me.classTeacherOf))}</b>` : ""}</p></div>
    ${unmarked.length ? `<a class="btn btn--gold" href="#/attendance?c=${encodeURIComponent(unmarked[0])}">Mark today's attendance</a>` : ""}
    <svg class="hello__star" viewBox="0 0 24 24"><path d="M12 3 1 9l11 6 9-4.91V17h2V9zM5 13.18v4L12 21l7-3.82v-4L12 17z"/></svg></div>
  <div class="grid grid--kpi">
    ${kpi({ label: "Periods today", value: periodsToday, sub: `${myClasses.length} classes in all`, ic: "calendar", href: "#/timetable" })}
    ${kpi({ label: "My class today", value: ctAtt ? `${ctStats.filter((x) => x === "P").length}/${ctStats.length}` : "Not marked", sub: me.classTeacherOf ? className(me.classTeacherOf) : "Not a class teacher", ic: "checklist", tone: ctAtt ? "green" : "red", href: "#/attendance" })}
    ${kpi({ label: "Leave requests", value: leaves.length, sub: "Waiting for you", ic: "leave", tone: leaves.length ? "gold" : "", href: "#/leaves" })}
    ${kpi({ label: "Unread messages", value: msgs, sub: "From parents", ic: "chat", tone: msgs ? "gold" : "", href: "#/messages" })}
  </div>
  <div class="grid grid--main">
    ${card("Today's schedule", todayList(todaySlots, (s) => shortClass(s.classId)), `<a href="#/timetable">Week</a>`)}
    <div>${card("My classes", `<ul class="list">${myClasses.map((c) => `<li><div class="list__main"><b>${esc(className(c))}</b><span class="list__meta">${esc(mySubjects(c).join(", ") || "Class teacher")}</span></div>${c === me.classTeacherOf ? pill("Class teacher", "gold") : ""}</li>`).join("")}</ul>`)}
    ${card("Notices", noticeList(notices.slice(0, 3)), `<a href="#/notices">All</a>`)}</div>
  </div>`;
}

/* ---------------- Attendance ---------------- */
async function attendance({ el, params }) {
  const classes = me.classTeacherOf ? [me.classTeacherOf, ...myClasses.filter((c) => c !== me.classTeacherOf)] : myClasses;
  if (!classes.length) { el.innerHTML = card("Mark attendance", empty("You have no classes assigned yet.")); return; }
  const classId = classes.includes(params.c) ? params.c : classes[0];
  const date = params.d && params.d <= today() ? params.d : today();
  const [students, doc] = await Promise.all([store.list("students", { classId }), store.get("attendance", `${classId}_${date}`)]);
  students.sort((a, b) => a.rollNo - b.rollNo);
  const active = students.filter((s) => s.status !== "left");
  const rec = doc?.records || {};
  const leaves = (await store.list("leaves", { classId, status: "approved" })).filter((l) => l.from <= date && l.to >= date);
  const onLeave = new Set(leaves.map((l) => l.personId));
  const isSun = new Date(date + "T00:00").getDay() === 0;

  el.innerHTML = `
  <div class="toolbar">
    ${field("ac", "Class", `<select id="ac">${options(classes.map((c) => [c, className(c) + (c === me.classTeacherOf ? " (my class)" : "")]), classId)}</select>`)}
    ${field("ad", "Date", `<input id="ad" type="date" value="${date}" max="${today()}">`)}
    <span class="toolbar__spacer"></span>
    <button class="btn btn--outline btn--sm" id="allP" type="button">Mark all present</button>
  </div>
  ${isSun ? `<p class="form-status is-err" style="display:block;margin-bottom:14px">${fmtDate(date)} is a Sunday.</p>` : ""}
  ${doc ? `<p class="muted small">Already marked${doc.markedAt ? " at " + new Date(doc.markedAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" }) : ""}. You can change it and save again.</p>` : `<p class="muted small">Not marked yet for ${fmtDate(date)}. Everyone starts as present — change only the absentees.</p>`}
  <form id="attf">
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Roll</th><th>Student</th><th>Status</th></tr></thead><tbody>
    ${active.map((s) => {
      const v = rec[s.id] || (onLeave.has(s.id) ? "L" : "P");
      return `<tr><td>${s.rollNo}</td><td>${person(s.name, s.id + (onLeave.has(s.id) ? " · approved leave" : ""))}</td><td><div class="mark-row" role="radiogroup" aria-label="${esc(s.name)}">
        ${["P", "A", "L"].map((k) => `<label><input type="radio" name="${esc(s.id)}" value="${k}"${v === k ? " checked" : ""}><span class="m-${k}" title="${{ P: "Present", A: "Absent", L: "Leave" }[k]}">${k}</span></label>`).join("")}
      </div></td></tr>`;
    }).join("") || `<tr><td colspan="3">${empty("No students in this class")}</td></tr>`}
    </tbody></table></div>
    <div class="sticky-save"><button class="btn btn--navy" type="submit">Save attendance</button><span id="att-sum" class="muted"></span></div>
  </form>`;
  const sum = () => {
    const f = $("#attf"); const vals = active.map((s) => f.querySelector(`input[name="${CSS.escape(s.id)}"]:checked`)?.value);
    $("#att-sum").textContent = `Present ${vals.filter((v) => v === "P").length} · Absent ${vals.filter((v) => v === "A").length} · Leave ${vals.filter((v) => v === "L").length}`;
  };
  sum();
  $("#attf").addEventListener("change", sum);
  $("#ac").onchange = () => (location.hash = `#/attendance?c=${encodeURIComponent($("#ac").value)}&d=${$("#ad").value}`);
  $("#ad").onchange = $("#ac").onchange;
  $("#allP").onclick = () => { $$('#attf input[value="P"]').forEach((i) => (i.checked = true)); sum(); };
  $("#attf").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.currentTarget, records = {};
    active.forEach((s) => (records[s.id] = f.querySelector(`input[name="${CSS.escape(s.id)}"]:checked`)?.value || "P"));
    await store.set("attendance", `${classId}_${date}`, { classId, date, records, markedBy: myId, markedAt: new Date().toISOString() });
    toast(`Attendance saved for ${className(classId)}`);
    attendance({ el, params: { c: classId, d: date } });
  };
}

/* ---------------- Marks ---------------- */
async function marks({ el, params }) {
  const classes = myClasses.filter((c) => mySubjects(c).length);
  if (!classes.length) { el.innerHTML = card("Enter marks", empty("No subject classes assigned to you.")); return; }
  const classId = classes.includes(params.c) ? params.c : classes[0];
  const exams = (await store.list("exams", { classId })).sort((a, b) => b.date.localeCompare(a.date));
  const subs = mySubjects(classId);
  const exam = exams.find((e) => e.id === params.e) || exams[0];
  const subject = subs.includes(params.s) ? params.s : subs[0];
  const students = (await store.list("students", { classId })).filter((s) => s.status !== "left").sort((a, b) => a.rollNo - b.rollNo);

  const tb = `<div class="toolbar">
    ${field("mc", "Class", `<select id="mc">${options(classes.map((c) => [c, className(c)]), classId)}</select>`)}
    ${field("me", "Exam / test", `<select id="me">${exams.length ? options(exams.map((e) => [e.id, e.name + (e.published ? " (published)" : "")]), exam?.id) : `<option value="">No tests yet</option>`}</select>`)}
    ${field("ms", "Subject", `<select id="ms">${options(subs, subject)}</select>`)}
    <span class="toolbar__spacer"></span>
    <button class="btn btn--gold btn--sm" id="newTest" type="button">${icon("plus").replace("<svg", '<svg width="18" height="18" fill="currentColor"')} New test</button>
  </div>`;
  const nav = () => (location.hash = `#/marks?c=${encodeURIComponent($("#mc").value)}&e=${encodeURIComponent($("#me").value)}&s=${encodeURIComponent($("#ms").value)}`);

  if (!exam) {
    el.innerHTML = tb + card("Enter marks", empty("No tests for this class yet. Create one with “New test”.", "edit"));
  } else {
    const sub = exam.subjects?.[subject] || { total: 25, marks: {} };
    const locked = exam.published;
    el.innerHTML = tb + `
    <form id="mf">
      <div class="card2" style="margin-bottom:16px;display:flex;gap:18px;flex-wrap:wrap;align-items:end">
        <div><b style="color:var(--navy)">${esc(exam.name)}</b><div class="muted small">${esc(className(classId))} · ${esc(subject)} · ${fmtDate(exam.date)}</div></div>
        ${field("mt", "Total marks", `<input id="mt" name="total" type="number" min="1" max="200" value="${sub.total}" style="width:110px"${locked ? " disabled" : ""}>`)}
        ${locked ? pill("Published — ask the principal to unpublish before changing marks", "gold") : `<span class="muted small">Type a number, or <b>AB</b> for absent. Leave blank if not checked yet.</span>`}
      </div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Roll</th><th>Student</th><th class="num">Marks</th><th class="num">%</th></tr></thead><tbody>
      ${students.map((s) => {
        const v = sub.marks?.[s.id]; const p = v !== undefined && v !== "AB" && v !== "" ? Math.round((v / sub.total) * 100) + "%" : "";
        return `<tr><td>${s.rollNo}</td><td>${person(s.name, s.id)}</td><td class="num"><label class="sr-only" for="mk-${esc(s.id)}">Marks for ${esc(s.name)}</label><input class="marks-input" id="mk-${esc(s.id)}" data-sid="${esc(s.id)}" inputmode="decimal" value="${v ?? ""}"${locked ? " disabled" : ""}></td><td class="num muted" data-p="${esc(s.id)}">${p}</td></tr>`;
      }).join("")}
      </tbody></table></div>
      ${locked ? "" : `<div class="sticky-save"><button class="btn btn--navy" type="submit">Save marks</button><span class="muted" id="mk-sum"></span></div>`}
    </form>`;
    const check = () => {
      const total = Number($("#mt").value) || 0; let bad = 0, n = 0, sumv = 0;
      $$(".marks-input").forEach((i) => {
        const v = i.value.trim().toUpperCase(); let ok = true;
        if (v && v !== "AB") { const x = Number(v); ok = !isNaN(x) && x >= 0 && x <= total; if (ok) { n++; sumv += x; } }
        i.classList.toggle("is-bad", !ok); if (!ok) bad++;
        const cell = $(`[data-p="${CSS.escape(i.dataset.sid)}"]`); if (cell) cell.textContent = v && v !== "AB" && ok ? Math.round((Number(v) / total) * 100) + "%" : v === "AB" ? "Absent" : "";
      });
      if ($("#mk-sum")) $("#mk-sum").textContent = bad ? `${bad} entr${bad > 1 ? "ies are" : "y is"} above ${total} or not a number` : n ? `${n} entered · class average ${Math.round((sumv / n / total) * 100)}%` : "";
      return bad;
    };
    check();
    $("#mf").addEventListener("input", check);
    $("#mf").onsubmit = async (e) => {
      e.preventDefault();
      if (check()) { toast("Fix the highlighted marks first", true); return; }
      const m = {};
      $$(".marks-input").forEach((i) => { const v = i.value.trim().toUpperCase(); if (v) m[i.dataset.sid] = v === "AB" ? "AB" : Number(v); });
      await store.update("exams", exam.id, { [`subjects.${subject}`]: { total: Number($("#mt").value), marks: m, teacherId: myId } });
      toast(`${subject} marks saved`);
    };
    // Enter moves to next box
    $$(".marks-input").forEach((i, k, all) => i.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); all[k + 1]?.focus(); all[k + 1]?.select(); } }));
  }
  $("#mc").onchange = () => (location.hash = `#/marks?c=${encodeURIComponent($("#mc").value)}`);
  $("#me").onchange = nav; $("#ms").onchange = nav;
  $("#newTest").onclick = () => dialog({
    title: "New test for " + className(classId),
    body: `<div class="form">
      ${field("nt-type", "Type", `<select id="nt-type" name="type">${options(EXAM_TYPES, "Weekly Test")}</select>`)}
      ${field("nt-date", "Date", `<input id="nt-date" name="date" type="date" value="${today()}" required>`)}
      ${field("nt-name", "Name shown to students", `<input id="nt-name" name="name" required placeholder="e.g. Weekly Test 3 — Physics">`, "full")}
      ${field("nt-total", "Total marks (per subject)", `<input id="nt-total" name="total" type="number" min="1" max="200" value="25" required>`)}
    </div><p class="muted small">The test is created for all subjects of the class. Each teacher enters marks for their own subject. The principal publishes it to students and parents.</p>`,
    submit: "Create test",
    onSubmit: async (f) => {
      const c = classById(classId);
      const subjects = Object.fromEntries(c.subjects.map((s) => [s, { total: Number(f.total.value), marks: {} }]));
      const key = "T" + Date.now().toString(36);
      const id = `${key}_${classId}`;
      await store.set("exams", id, { examKey: key, name: f.name.value.trim(), type: f.type.value, date: f.date.value, classId, published: false, subjects, createdBy: myId });
      toast("Test created");
      location.hash = `#/marks?c=${encodeURIComponent(classId)}&e=${encodeURIComponent(id)}&s=${encodeURIComponent(subject)}`;
    }
  });
}

/* ---------------- Homework ---------------- */
async function homework({ el }) {
  const list = (await store.list("homework", { teacherId: myId })).sort((a, b) => b.date.localeCompare(a.date));
  const classes = myClasses.filter((c) => mySubjects(c).length);
  el.innerHTML = `<div class="toolbar"><span class="toolbar__spacer"></span><button class="btn btn--gold btn--sm" id="addHw">${icon("plus").replace("<svg", '<svg width="18" height="18" fill="currentColor"')} Give homework</button></div>
  ${card("Homework I have given", list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Given</th><th>Class</th><th>Subject</th><th>Homework</th><th>Due</th><th></th></tr></thead><tbody>
    ${list.map((h) => `<tr><td class="nowrap">${fmtDate(h.date, false)}</td><td class="nowrap">${esc(shortClass(h.classId))}</td><td>${esc(h.subject)}</td><td><b>${esc(h.title)}</b>${h.details ? `<div class="muted small">${esc(h.details)}</div>` : ""}</td><td class="nowrap">${h.due >= today() ? pill(fmtDate(h.due, false), "gold") : fmtDate(h.due, false)}</td><td><button class="linkbtn linkbtn--danger" data-del="${esc(h.id)}">Delete</button></td></tr>`).join("")}
  </tbody></table></div>` : empty("You haven't given any homework on the portal yet.", "book"))}`;
  $$("[data-del]").forEach((b) => (b.onclick = () => armed(b, async () => { await store.remove("homework", b.dataset.del); toast("Deleted"); homework({ el }); }, "Delete?")));
  $("#addHw").onclick = () => {
    const d = dialog({
      title: "Give homework",
      body: `<div class="form">
        ${field("hc", "Class", `<select id="hc" name="classId">${options(classes.map((c) => [c, className(c)]))}</select>`)}
        ${field("hs", "Subject", `<select id="hs" name="subject">${options(mySubjects(classes[0]))}</select>`)}
        ${field("ht", "Homework", `<input id="ht" name="title" required maxlength="140" placeholder="e.g. Exercise 5.2, Q1 – Q12">`, "full")}
        ${field("hd", "Details (optional)", `<textarea id="hd" name="details" maxlength="600"></textarea>`, "full")}
        ${field("hdue", "Due date", `<input id="hdue" name="due" type="date" required min="${today()}" value="${today()}">`)}
      </div>`,
      submit: "Post homework",
      onSubmit: async (f) => {
        await store.add("homework", { classId: f.classId.value, subject: f.subject.value, title: f.title.value.trim(), details: f.details.value.trim(), date: today(), due: f.due.value, teacherId: myId, teacherName: me.name });
        toast("Homework posted — students and parents can see it now");
        homework({ el });
      }
    });
    $("#hc", d).onchange = (e) => ($("#hs", d).innerHTML = options(mySubjects(e.target.value)));
  };
}

/* ---------------- Timetable ---------------- */
async function timetable({ el }) {
  const sched = await mySchedule();
  const n = Object.values(sched.days).flat().filter(Boolean).length;
  el.innerHTML = card(`My weekly timetable — ${n} periods`, timetableGrid(sched, [], { showClass: (s) => shortClass(s.classId) }));
}

/* ---------------- Students ---------------- */
async function students({ el, params }) {
  const classId = myClasses.includes(params.c) ? params.c : (me.classTeacherOf || myClasses[0]);
  const [list, att] = await Promise.all([store.list("students", { classId }), store.list("attendance", { classId })]);
  list.sort((a, b) => a.rollNo - b.rollNo);
  const isCT = classId === me.classTeacherOf;
  el.innerHTML = `<div class="toolbar">${field("sc", "Class", `<select id="sc">${options(myClasses.map((c) => [c, className(c) + (c === me.classTeacherOf ? " (my class)" : "")]), classId)}</select>`)}</div>
  ${card(`${className(classId)} — ${list.length} students`, `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Roll</th><th>Student</th><th>Father</th>${isCT ? "<th>Phone</th>" : ""}<th class="num">Attendance</th></tr></thead><tbody>
    ${list.map((s) => { const a = attendanceStats(att, s.id); return `<tr><td>${s.rollNo}</td><td>${person(s.name, s.id)}</td><td>${esc(s.fatherName)}</td>${isCT ? `<td class="nowrap"><a href="tel:${esc(s.phone)}">${esc(s.phone)}</a></td>` : ""}<td class="num">${a.total ? `<span class="pill ${a.pct >= 85 ? "pill--green" : "pill--red"}">${a.pct}%</span>` : "—"}</td></tr>`; }).join("")}
  </tbody></table></div>`)}`;
  $("#sc").onchange = (e) => (location.hash = "#/students?c=" + encodeURIComponent(e.target.value));
}

/* ---------------- Leave ---------------- */
async function leaves({ el, user }) {
  const [studentReq, mine] = await Promise.all([
    me.classTeacherOf ? store.list("leaves", { classId: me.classTeacherOf, kind: "student" }) : [],
    store.list("leaves", { personId: myId })
  ]);
  studentReq.sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1) || b.from.localeCompare(a.from));
  mine.sort((a, b) => b.from.localeCompare(a.from));
  const row = (l, act) => `<li>${dayBox(l.from)}<div class="list__main"><b>${esc(l.name)}${l.to !== l.from ? ` · ${fmtDate(l.from, false)} – ${fmtDate(l.to, false)}` : ""}</b>${esc(l.reason)}<div class="list__meta">Applied ${fmtDate(l.appliedAt)}${l.appliedBy?.startsWith("P-") ? " by parent" : ""}${l.decidedBy ? " · " + esc(l.decidedBy) : ""}</div>
    ${act && l.status === "pending" ? `<div style="margin-top:8px;display:flex;gap:8px"><button class="btn btn--navy btn--sm" data-ok="${esc(l.id)}">Approve</button><button class="btn btn--outline btn--sm" data-no="${esc(l.id)}">Reject</button></div>` : ""}</div>${statusPill(l.status)}</li>`;
  el.innerHTML = `<div class="grid grid--2">
    <div>${card(me.classTeacherOf ? `Student requests — ${className(me.classTeacherOf)}` : "Student requests", me.classTeacherOf ? (studentReq.length ? `<ul class="list">${studentReq.map((l) => row(l, true)).join("")}</ul>` : empty("No leave requests from your class", "leave")) : empty("Only class teachers receive student leave requests", "leave"))}</div>
    <div>${card("Apply for my leave", `<form class="form" id="lv" novalidate>
      ${field("lf", "From", `<input id="lf" name="from" type="date" required min="${today()}" value="${today()}">`)}
      ${field("lt", "To", `<input id="lt" name="to" type="date" required min="${today()}" value="${today()}">`)}
      ${field("lr", "Reason", `<textarea id="lr" name="reason" required maxlength="400"></textarea>`, "full")}
      <div class="form-status full" role="alert"></div>
      <div class="full"><button class="btn btn--navy" type="submit">Send to principal</button></div></form>`)}
    ${card("My leave history", mine.length ? `<ul class="list">${mine.map((l) => row(l, false)).join("")}</ul>` : empty("No leave taken", "leave"))}</div>
  </div>`;
  const decide = (id, status) => async () => { await store.update("leaves", id, { status, decidedBy: me.name }); toast(status === "approved" ? "Leave approved" : "Leave rejected"); leaves({ el, user }); };
  $$("[data-ok]").forEach((b) => (b.onclick = decide(b.dataset.ok, "approved")));
  $$("[data-no]").forEach((b) => (b.onclick = decide(b.dataset.no, "rejected")));
  $("#lv").onsubmit = async (e) => {
    e.preventDefault(); const f = e.currentTarget, st = $(".form-status", f);
    if (!f.reason.value.trim() || f.to.value < f.from.value) { st.textContent = !f.reason.value.trim() ? "Please write the reason." : "The 'To' date is before the 'From' date."; st.className = "form-status full is-err"; return; }
    await store.add("leaves", { kind: "staff", personId: myId, name: me.name, from: f.from.value, to: f.to.value, reason: f.reason.value.trim(), status: "pending", appliedBy: myId, appliedAt: today() });
    toast("Leave application sent to the principal"); leaves({ el, user });
  };
}

export const views = {
  home, attendance, marks, homework, timetable, students, leaves,
  idcard: idCardPage("staff"),
  messages: messagesView({ side: "staff" }),
  notices: noticesView("staff"),
  profile: profileView(async () => [["Staff ID", myId], ["Designation", me.designation], ["Subjects", me.subjects.join(", ")], ["Class teacher of", className(me.classTeacherOf)], ["Qualification", me.qualification], ["Phone", me.phone], ["Email", me.email], ["Joined", fmtDate(me.joinDate)]])
};

export async function counts() {
  const [m, l] = await Promise.all([unreadCount("staff", myId), me.classTeacherOf ? store.list("leaves", { classId: me.classTeacherOf, status: "pending" }) : []]);
  return { messages: m, leaves: l.length };
}
