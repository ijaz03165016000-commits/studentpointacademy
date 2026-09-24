/* Views shared by several portals */
import * as store from "../store.js";
import { SITE } from "../../../assets/js/config.js";
import { classById, className, DAYS, PERIODS, BREAK_AFTER, LATE_FEE, SESSION } from "../school.js";
import {
  $, $$, esc, icon, kpi, card, empty, pill, person, avatar, gradePill, statusPill, bars, ring, lineChart, toast, dialog, field, options,
  fmtDate, fmtMonth, fmtTime, dayBox, money, pct, today, iso, dayName, attendanceStats, examResult, classPositions, ordinal, feeState
} from "../ui.js";

/* ---------- time helpers ---------- */
const toMin = (t) => { let [h, m] = t.trim().split(":").map(Number); if (h < 9) h += 12; /* academy slots run 4 PM – 8 PM */ return h * 60 + m; };
export function currentPeriod() {
  const d = new Date(); const now = d.getHours() * 60 + d.getMinutes();
  if (d.getDay() === 0) return -1;
  return PERIODS.findIndex((p) => { const [a, b] = p.split("–"); return now >= toMin(a) && now < toMin(b); });
}
export const staffName = (staffList, id) => staffList.find((s) => s.id === id)?.name || "";

/* ---------- Timetable ---------- */
export function timetableGrid(tt, staffList, { mineId = "", showClass = null } = {}) {
  if (!tt) return empty("Timetable not set yet", "calendar");
  const nowP = currentPeriod(), todayName = dayName();
  const head = PERIODS.map((p, i) => `<th>P${i + 1}<small>${p}</small></th>${i === BREAK_AFTER ? "<th></th>" : ""}`).join("");
  const rows = DAYS.map((d) => {
    const cells = PERIODS.map((_, i) => {
      const slot = tt.days?.[d]?.[i];
      const brk = i === BREAK_AFTER ? `<td class="is-break" aria-label="Break">${d === "Mon" ? "Break" : ""}</td>` : "";
      if (!slot || !slot.subject) return `<td>—</td>${brk}`;
      const cls = [d === todayName && i === nowP ? "is-now" : "", mineId && slot.teacherId === mineId ? "is-mine" : ""].join(" ").trim();
      const sub = showClass ? showClass(slot) : staffName(staffList, slot.teacherId);
      return `<td${cls ? ` class="${cls}"` : ""}><b>${esc(slot.subject)}</b><span>${esc(sub)}</span></td>${brk}`;
    }).join("");
    return `<tr><th scope="row" class="tt-day" style="border-radius:10px">${d}</th>${cells}</tr>`;
  }).join("");
  return `<div style="overflow-x:auto"><table class="tt"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function todayList(slots, labelFn) {
  if (!slots || !slots.length) return empty(new Date().getDay() === 0 ? "Sunday — no classes today" : "No classes scheduled today", "calendar");
  const nowP = currentPeriod();
  return `<ul class="today-list">${slots.map((s, i) => s && s.subject ? `<li class="${i === nowP ? "is-now" : ""}"><time>${PERIODS[i]}</time><span><b>${esc(s.subject)}</b> <span class="muted small">· ${esc(labelFn(s))}</span></span></li>` : "").join("")}</ul>`;
}

/* ---------- Attendance calendar ---------- */
export function attendanceCalendar(docs, sid, ym) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate();
  const map = {}; docs.forEach((d) => { if (d.date.startsWith(ym) && d.records?.[sid]) map[d.date] = d.records[sid]; });
  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<div class="cal__dow">${d}</div>`).join("");
  let cells = "".padStart(0);
  for (let i = 0; i < first.getDay(); i++) cells += `<div></div>`;
  for (let d = 1; d <= days; d++) {
    const date = `${ym}-${String(d).padStart(2, "0")}`;
    const r = map[date], sun = new Date(y, m - 1, d).getDay() === 0;
    const label = r === "P" ? "present" : r === "A" ? "absent" : r === "L" ? "on leave" : sun ? "Sunday" : "not marked";
    cells += `<div class="cal__day${r ? " cal__day--" + r : sun ? " cal__day--off" : ""}${date === today() ? " cal__day--today" : ""}" title="${fmtDate(date)}: ${label}" aria-label="${fmtDate(date)}: ${label}">${d}</div>`;
  }
  return `<div class="cal">${dows}${cells}</div>
  <div class="legend"><span><i style="background:#E3F3EA;border:1px solid var(--green)"></i>Present</span><span><i style="background:var(--red-soft);border:1px solid var(--red)"></i>Absent</span><span><i style="background:var(--gold-soft);border:1px solid var(--gold)"></i>Leave</span><span><i style="background:var(--paper);border:1px solid var(--line)"></i>Not marked</span></div>`;
}

/* ==========================================================
   Student data bundle
   ========================================================== */
export async function loadStudent(sid) {
  const student = await store.get("students", sid);
  if (!student) throw new Error("Student record not found.");
  const [attendance, exams, fees, homework, timetable, staff, leaves] = await Promise.all([
    store.list("attendance", { classId: student.classId }),
    store.list("exams", { classId: student.classId, published: true }),
    store.list("fees", { studentId: sid }),
    store.list("homework", { classId: student.classId }),
    store.get("timetable", student.classId),
    store.list("staff"),
    store.list("leaves", { personId: sid })
  ]);
  attendance.sort((a, b) => a.date.localeCompare(b.date));
  exams.sort((a, b) => a.date.localeCompare(b.date));
  fees.sort((a, b) => b.month.localeCompare(a.month));
  homework.sort((a, b) => b.date.localeCompare(a.date));
  leaves.sort((a, b) => b.from.localeCompare(a.from));
  return { sid, student, attendance, exams, fees, homework, timetable, staff, leaves };
}

const unpaidTotal = (fees) => fees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount + (feeState(f) === "overdue" ? LATE_FEE : 0), 0);

/* ==========================================================
   Student-facing views, reused by the parent portal.
   getSid() returns the student to show; forParent changes wording.
   ========================================================== */
export function studentViews(getSid, { forParent = false, header = () => "" } = {}) {
  const you = (s) => (forParent ? s.name.split(" ")[0] : "You");
  const your = (s) => (forParent ? s.name.split(" ")[0] + "'s" : "Your");

  async function home({ el, user }) {
    const b = await loadStudent(getSid());
    const s = b.student, att = attendanceStats(b.attendance, b.sid);
    const month = today().slice(0, 7);
    const attMonth = attendanceStats(b.attendance.filter((d) => d.date.startsWith(month)), b.sid);
    const last = b.exams.at(-1), lastRes = last ? examResult(last, b.sid) : null;
    const due = unpaidTotal(b.fees);
    const hwDue = b.homework.filter((h) => h.due >= today());
    const notices = (await noticesFor(forParent ? "parents" : "students")).slice(0, 4);
    const todaySlots = b.timetable?.days?.[dayName()] || [];
    const trend = b.exams.map((e) => [e.name.replace("Monthly Test — ", "").replace(" Examination", ""), Math.round(examResult(e, b.sid).pct)]);
    const todayRec = b.attendance.find((d) => d.date === today())?.records?.[b.sid];
    const first = forParent ? user.name.split(" ").slice(-1)[0] : s.name.split(" ")[0];

    el.innerHTML = header() + `
    <div class="hello">
      <div><h2>Assalam o Alaikum, ${esc(forParent ? user.name : first)}</h2>
      <p>${forParent ? `Here is how <b>${esc(s.name)}</b> is doing in ${esc(className(s.classId))}.` : `${esc(className(s.classId))} · Roll no. ${s.rollNo} · Session ${SESSION}`}</p>
      <p style="margin-top:8px">Today: ${todayRec ? statusPill(todayRec) : pill("Attendance not marked yet", "grey")}</p></div>
      <svg class="hello__star" viewBox="0 0 24 24"><path d="M12 3 1 9l11 6 9-4.91V17h2V9zM5 13.18v4L12 21l7-3.82v-4L12 17z"/></svg>
    </div>
    <div class="grid grid--kpi">
      ${kpi({ label: "Attendance this month", value: attMonth.total ? attMonth.pct + "%" : "—", sub: `${att.pct}% overall · ${att.A} absent`, ic: "checklist", tone: att.pct >= 85 ? "green" : "red", href: "#/attendance" })}
      ${kpi({ label: last ? "Latest result" : "Results", value: lastRes ? lastRes.pct + "%" : "—", sub: last ? esc(last.name) + " · Grade " + lastRes.grade : "No results published yet", ic: "chart", href: "#/results" })}
      ${kpi({ label: "Fee outstanding", value: due ? money(due) : "Nil", sub: due ? "Tap to view challan" : "All fees paid", ic: "money", tone: due ? "red" : "green", href: "#/fees" })}
      ${kpi({ label: "Homework due", value: hwDue.length, sub: hwDue[0] ? "Next: " + esc(hwDue.at(-1).subject) : "Nothing pending", ic: "book", tone: "gold", href: "#/homework" })}
    </div>
    <div class="grid grid--main">
      <div>
        ${card("Today's classes", todayList(todaySlots, (x) => staffName(b.staff, x.teacherId)), `<a href="#/timetable">Full timetable</a>`)}
        ${card("Result trend", lineChart(trend), `<a href="#/results">Report cards</a>`)}
      </div>
      <div>
        ${card("Homework", hwDue.length ? `<ul class="list">${hwDue.slice(0, 4).map((h) => `<li>${dayBox(h.due)}<div class="list__main"><b>${esc(h.subject)}</b>${esc(h.title)}<div class="list__meta">Due ${fmtDate(h.due, false)}</div></div></li>`).join("")}</ul>` : empty("No homework due", "book"), `<a href="#/homework">All</a>`)}
        ${card("Notices", noticeList(notices), `<a href="#/notices">All</a>`)}
      </div>
    </div>`;
  }

  async function attendance({ el, params }) {
    const b = await loadStudent(getSid());
    const months = [...new Set(b.attendance.map((d) => d.date.slice(0, 7)))].sort().reverse();
    const ym = params.m && months.includes(params.m) ? params.m : months[0] || today().slice(0, 7);
    const all = attendanceStats(b.attendance, b.sid), mon = attendanceStats(b.attendance.filter((d) => d.date.startsWith(ym)), b.sid);
    const absents = b.attendance.filter((d) => d.records?.[b.sid] === "A" || d.records?.[b.sid] === "L").reverse();
    el.innerHTML = header() + `
    <div class="toolbar"><div class="field"><label for="m">Month</label><select id="m">${options(months.map((x) => [x, fmtMonth(x)]), ym)}</select></div></div>
    <div class="grid grid--main">
      ${card(fmtMonth(ym), attendanceCalendar(b.attendance, b.sid, ym))}
      <div>
        ${card("Summary", `<div class="ring-row">${ring(all.pct, "overall", all.pct >= 85 ? "var(--green)" : "var(--red)")}
          <dl class="dl" style="grid-template-columns:auto auto;flex:1"><dt>Days marked</dt><dd>${all.total}</dd><dt>Present</dt><dd>${all.P}</dd><dt>Absent</dt><dd>${all.A}</dd><dt>Leave</dt><dd>${all.L}</dd><dt>This month</dt><dd>${mon.total ? mon.pct + "%" : "—"}</dd></dl></div>
          ${all.pct < 85 && all.total ? `<p class="form-status is-err" style="display:block;margin-top:14px">Attendance is below 85%. Regular attendance is needed to keep up with the syllabus.</p>` : ""}`)}
        ${card("Absences & leave", absents.length ? `<ul class="list">${absents.slice(0, 8).map((d) => `<li>${dayBox(d.date)}<div class="list__main">${statusPill(d.records[b.sid])}</div></li>`).join("")}</ul>` : empty(`${you(b.student)} ${forParent ? "has" : "have"} not missed a day. Well done!`, "star"))}
      </div>
    </div>`;
    $("#m").onchange = (e) => (location.hash = "#/attendance?m=" + e.target.value);
  }

  async function results({ el, params }) {
    const b = await loadStudent(getSid());
    const s = b.student;
    if (!b.exams.length) { el.innerHTML = header() + card("Results", empty("No results have been published yet.", "chart")); return; }
    const idx = params.e ? b.exams.findIndex((e) => e.id === params.e) : b.exams.length - 1;
    const exam = b.exams[idx < 0 ? b.exams.length - 1 : idx];
    const r = examResult(exam, b.sid);
    const { pos, list } = classPositions(exam);
    const trend = b.exams.map((e) => [e.name.replace("Monthly Test — ", "").replace(" Examination", ""), Math.round(examResult(e, b.sid).pct)]);
    const classAvg = list.length ? Math.round(list.reduce((a, x) => a + x.pct, 0) / list.length) : 0;
    el.innerHTML = header() + `
    <div class="tabs" role="group" aria-label="Exams">${b.exams.map((e) => `<button type="button" data-e="${esc(e.id)}" aria-pressed="${e.id === exam.id}">${esc(e.name)}</button>`).join("")}</div>
    <div class="grid grid--main">
      <article class="report">
        <div class="report__head"><img src="../assets/img/logo.svg" alt=""><div><h2>${esc(SITE.name)} — Result card</h2><div class="muted small">${esc(SITE.address)} </div></div></div>
        <div class="report__meta"><span>Student: <b>${esc(s.name)}</b></span><span>Father: <b>${esc(s.fatherName)}</b></span><span>Class: <b>${esc(className(s.classId))}</b></span><span>Roll no.: <b>${s.rollNo}</b> (${esc(b.sid)})</span><span>Exam: <b>${esc(exam.name)}</b></span><span>Date: <b>${fmtDate(exam.date)}</b></span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Subject</th><th class="num">Total</th><th class="num">Obtained</th><th class="num">%</th><th class="center">Grade</th></tr></thead>
        <tbody>${r.rows.map((x) => `<tr><td>${esc(x.subject)}</td><td class="num">${x.total}</td><td class="num">${x.marks === "AB" ? pill("Absent", "red") : x.marks}</td><td class="num">${x.pct ?? "—"}</td><td class="center">${x.grade === "—" ? "—" : gradePill(x.grade)}</td></tr>`).join("")}</tbody>
        <tfoot><tr><td>Total</td><td class="num">${r.max}</td><td class="num">${r.got}</td><td class="num">${r.pct}</td><td class="center">${gradePill(r.grade)}</td></tr></tfoot></table></div>
        <div class="report__sum"><div><b>${r.pct}%</b><span>Percentage</span></div><div><b>${r.grade}</b><span>Grade</span></div><div><b>${pos[b.sid] ? ordinal(pos[b.sid]) : "—"}</b><span>Position of ${list.length}</span></div><div><b>${classAvg}%</b><span>Class average</span></div></div>
        <p class="muted small" style="margin-top:16px">Grades: A+ 90%+, A 80%+, B 70%+, C 60%+, D 50%+, E 40%+, F below 40%.</p>
        <div class="no-print" style="margin-top:10px"><button class="btn btn--outline btn--sm" onclick="window.print()">${icon("print").replace("<svg", '<svg width="18" height="18" fill="currentColor"')} Print result card</button></div>
      </article>
      <div>
        ${card("Progress across exams", lineChart(trend))}
        ${card("Subject strength", bars(r.rows.filter((x) => x.pct != null).map((x) => [x.subject, x.pct])))}
      </div>
    </div>`;
    $$("[data-e]").forEach((btn) => (btn.onclick = () => (location.hash = "#/results?e=" + encodeURIComponent(btn.dataset.e))));
  }

  async function timetable({ el }) {
    const b = await loadStudent(getSid());
    el.innerHTML = header() + card(`${className(b.student.classId)} — weekly timetable`, timetableGrid(b.timetable, b.staff) + `<p class="muted small" style="margin-top:10px">Break: 11:00 – 11:30. Saturday ends after the 5th period.</p>`);
  }

  async function homework({ el }) {
    const b = await loadStudent(getSid());
    const up = b.homework.filter((h) => h.due >= today()).sort((a, c) => a.due.localeCompare(c.due));
    const past = b.homework.filter((h) => h.due < today());
    const item = (h) => `<li>${dayBox(h.date)}<div class="list__main"><b>${esc(h.subject)}: ${esc(h.title)}</b>${h.details ? `<div>${esc(h.details)}</div>` : ""}<div class="list__meta">Given by ${esc(h.teacherName)} · Due ${fmtDate(h.due)}</div></div>${h.due === today() ? pill("Due today", "red") : h.due >= today() ? pill("Due " + fmtDate(h.due, false), "gold") : ""}</li>`;
    el.innerHTML = header() + `<div class="grid grid--2">
      ${card("Due now", up.length ? `<ul class="list">${up.map(item).join("")}</ul>` : empty("No homework due. Revise today's lessons!", "book"))}
      ${card("Earlier", past.length ? `<ul class="list">${past.map(item).join("")}</ul>` : empty("Nothing here yet", "book"))}
    </div>`;
  }

  async function fees({ el }) {
    const b = await loadStudent(getSid());
    const due = unpaidTotal(b.fees);
    const paid = b.fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);
    el.innerHTML = header() + `
    <div class="grid grid--kpi">
      ${kpi({ label: "Outstanding", value: due ? money(due) : "Nil", ic: "money", tone: due ? "red" : "green", sub: due ? "Includes late fee where overdue" : "Nothing to pay" })}
      ${kpi({ label: "Paid this session", value: money(paid), ic: "check", tone: "green" })}
      ${kpi({ label: "Monthly fee", value: money(b.fees[0]?.amount || 0), ic: "calendar", sub: "Due on the 10th of each month" })}
    </div>
    ${card("Fee record", b.fees.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Month</th><th>Challan no.</th><th class="num">Amount</th><th>Due date</th><th>Status</th><th>Paid on</th><th></th></tr></thead><tbody>
      ${b.fees.map((f) => `<tr><td><b>${fmtMonth(f.month)}</b></td><td class="nowrap">${esc(f.challanNo)}</td><td class="num">${money(f.amount)}</td><td class="nowrap">${fmtDate(f.due)}</td><td>${statusPill(feeState(f))}</td><td class="nowrap">${f.paidOn ? fmtDate(f.paidOn) + `<div class="muted small">${esc(f.receiptNo)}</div>` : "—"}</td><td><button class="linkbtn" data-ch="${esc(f.id)}">${f.status === "paid" ? "Receipt" : "Challan"}</button></td></tr>`).join("")}
    </tbody></table></div>` : empty("No fee records yet", "money"))}
    <p class="muted small" style="margin-top:12px">Pay at the academy office or by EasyPaisa / JazzCash to ${esc(SITE.phone)} and send the receipt on WhatsApp. Late fee of ${money(LATE_FEE)} applies after the due date. Questions: ${esc(SITE.phone)}.</p>`;
    $$("[data-ch]").forEach((btn) => (btn.onclick = () => showChallan(b.fees.find((f) => f.id === btn.dataset.ch), b.student)));
  }

  async function leave({ el, user }) {
    const b = await loadStudent(getSid());
    el.innerHTML = header() + `<div class="grid grid--2">
      ${card(forParent ? `Apply for leave for ${b.student.name.split(" ")[0]}` : "Apply for leave", `<form class="form" id="lv" novalidate>
        ${field("lf", "From", `<input id="lf" name="from" type="date" required min="${today()}" value="${today()}">`)}
        ${field("lt", "To", `<input id="lt" name="to" type="date" required min="${today()}" value="${today()}">`)}
        ${field("lr", "Reason", `<textarea id="lr" name="reason" required maxlength="400" placeholder="e.g. Fever — doctor advised rest"></textarea>`, "full")}
        <div class="form-status full" role="alert"></div>
        <div class="full"><button class="btn btn--navy" type="submit">Send to class teacher</button></div></form>`)}
      ${card("Leave history", b.leaves.length ? `<ul class="list">${b.leaves.map((l) => `<li>${dayBox(l.from)}<div class="list__main"><b>${fmtDate(l.from, false)}${l.to !== l.from ? " – " + fmtDate(l.to, false) : ""}</b>${esc(l.reason)}<div class="list__meta">${l.decidedBy ? "By " + esc(l.decidedBy) : "Waiting for class teacher"}</div></div>${statusPill(l.status)}</li>`).join("")}</ul>` : empty("No leave applications yet", "leave"))}
    </div>`;
    $("#lv").onsubmit = async (e) => {
      e.preventDefault();
      const f = e.currentTarget, st = $(".form-status", f);
      st.className = "form-status";
      if (!f.reason.value.trim()) { st.textContent = "Please write the reason."; st.className = "form-status full is-err"; return; }
      if (f.to.value < f.from.value) { st.textContent = "The 'To' date is before the 'From' date."; st.className = "form-status full is-err"; return; }
      await store.add("leaves", { kind: "student", personId: b.sid, name: b.student.name, classId: b.student.classId, from: f.from.value, to: f.to.value, reason: f.reason.value.trim(), status: "pending", appliedBy: user.id, appliedAt: today() });
      toast("Leave application sent");
      leave({ el, user });
    };
  }

  return { home, attendance, results, timetable, homework, fees, leave };
}

export function showChallan(f, s) {
  const late = feeState(f) === "overdue" ? LATE_FEE : 0;
  dialog({
    title: f.status === "paid" ? "Fee receipt" : "Fee challan",
    body: `<div class="challan">
      <div class="report__head" style="margin-bottom:10px"><img src="../assets/img/logo.svg" alt="" style="width:44px;height:44px"><div><b style="color:var(--navy);font-family:var(--serif);font-size:1.15rem">${esc(SITE.name)}</b><div class="muted small">${esc(SITE.address)}</div></div></div>
      <div class="challan__row"><span>Challan no.</span><b>${esc(f.challanNo)}</b></div>
      <div class="challan__row"><span>Student</span><b>${esc(s.name)} (${esc(f.studentId)})</b></div>
      <div class="challan__row"><span>Father</span><b>${esc(s.fatherName)}</b></div>
      <div class="challan__row"><span>Class</span><b>${esc(className(f.classId))}</b></div>
      <div class="challan__row"><span>Fee month</span><b>${fmtMonth(f.month)}</b></div>
      <div class="challan__row"><span>Due date</span><b>${fmtDate(f.due)}</b></div>
      ${(f.items || []).map((i) => `<div class="challan__row"><span>${esc(i.label)}</span><b>${money(i.amount)}</b></div>`).join("")}
      ${late ? `<div class="challan__row"><span>Late fee</span><b>${money(late)}</b></div>` : ""}
      <div class="challan__row challan__total"><span>${f.status === "paid" ? "Amount paid" : "Payable"}</span><b>${money(f.amount + late)}</b></div>
      ${f.status === "paid" ? `<div class="challan__row"><span>Paid on</span><b>${fmtDate(f.paidOn)} · ${esc(f.receiptNo)}</b></div><p style="text-align:center;margin:10px 0 0">${pill("PAID", "green")}</p>` : ""}
    </div>
    <p class="no-print" style="margin:14px 0 0"><button type="button" class="btn btn--outline btn--sm" onclick="window.print()">Print</button></p>`
  });
}

/* ---------- Notices ---------- */
export async function noticesFor(group) {
  const all = await store.list("notices");
  return all.filter((n) => !group || (n.audience || []).includes(group) || (n.audience || []).includes("all"))
    .sort((a, b) => (Number(!!b.pinned) - Number(!!a.pinned)) || b.date.localeCompare(a.date));
}
export function noticeList(list) {
  if (!list.length) return empty("No notices right now", "bell");
  return `<ul class="list">${list.map((n) => `<li>${dayBox(n.date)}<div class="list__main"><b>${esc(n.title)} ${n.pinned ? pill("Pinned", "gold") : ""}</b><div>${esc(n.body)}</div><div class="list__meta">From ${esc(n.by || "Academy Office")}</div></div></li>`).join("")}</ul>`;
}
export const noticesView = (group, header = () => "") => async ({ el }) => {
  el.innerHTML = header() + card("Notices from the academy", noticeList(await noticesFor(group)));
};

/* ---------- Profile & password ---------- */
export const profileView = (details) => async ({ el, user, title }) => {
  title("My profile");
  const rows = await details(user);
  el.innerHTML = `<div class="grid grid--2">
    ${card("Profile", `<div class="profile-top" style="margin-bottom:18px">${avatar(user.name, "avatar--lg")}<div><h2 style="margin:0;font-size:1.4rem">${esc(user.name)}</h2><span class="muted">${esc(user.role[0].toUpperCase() + user.role.slice(1))} · ${esc(user.loginId)}</span></div></div>
      <dl class="dl">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v || "—")}</dd>`).join("")}</dl>
      <p class="muted small" style="margin-top:16px">To correct any detail, contact the academy office.</p>`)}
    ${card("Change password", `<form class="form" id="pwf" novalidate style="grid-template-columns:1fr">
      ${field("p0", "Current password", `<input id="p0" name="cur" type="password" autocomplete="current-password" required>`)}
      ${field("p1", "New password", `<input id="p1" name="next" type="password" autocomplete="new-password" minlength="6" required><div class="field__hint">At least 6 characters.</div>`)}
      ${field("p2", "Repeat new password", `<input id="p2" name="again" type="password" autocomplete="new-password" required>`)}
      <div class="form-status" role="alert"></div>
      <div><button class="btn btn--navy" type="submit">Update password</button></div></form>`)}
  </div>`;
  $("#pwf").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.currentTarget, st = $(".form-status", f);
    st.className = "form-status";
    try {
      if (f.next.value !== f.again.value) throw new Error("The new passwords don't match.");
      await store.changeOwnPassword(f.cur.value, f.next.value);
      f.reset(); st.textContent = "Password updated."; st.className = "form-status is-ok";
    } catch (err) { st.textContent = /wrong-password|invalid-credential/.test(err.code || "") ? "Your current password is not correct." : err.message; st.className = "form-status is-err"; }
  };
};

/* ---------- Messages (parent ↔ teacher) ---------- */
export function messagesView({ side }) {  // side: "parent" | "staff"
  return async function messages({ el, user, params, refreshCounts }) {
    const key = side === "parent" ? "parentId" : "staffId";
    const myId = side === "parent" ? user.id : user.linkId;
    const [msgs, staff, students, parents] = await Promise.all([
      store.list("messages", { [key]: myId }), store.list("staff"),
      side === "parent" ? Promise.all((user.children || []).map((id) => store.get("students", id))).then((l) => l.filter(Boolean)) : store.list("students"),
      side === "staff" ? store.list("users", { role: "parent" }) : Promise.resolve([])
    ]);
    const threads = {};
    msgs.forEach((m) => { const k = m.parentId + "|" + m.staffId + "|" + m.studentId; (threads[k] ||= []).push(m); });

    // teachers a parent can write to: teachers of their children's classes
    let contacts = [];
    if (side === "parent") {
      const kids = students.filter((s) => (user.children || []).includes(s.id));
      kids.forEach((k) => staff.filter((t) => (t.classIds || []).includes(k.classId) || t.classTeacherOf === k.classId).forEach((t) => {
        const tk = user.id + "|" + t.id + "|" + k.id;
        contacts.push({ key: tk, title: t.name, sub: `${t.subjects.join(", ")}${t.classTeacherOf === k.classId ? " · Class teacher" : ""} — about ${k.name.split(" ")[0]}`, parentId: user.id, staffId: t.id, studentId: k.id });
      }));
    } else {
      Object.keys(threads).forEach((k) => {
        const [pid, , sidd] = k.split("|"); const st = students.find((s) => s.id === sidd); const p = parents.find((x) => x.id === pid);
        contacts.push({ key: k, title: p?.name || pid, sub: `Parent of ${st?.name || sidd} · ${className(st?.classId)}`, parentId: pid, staffId: user.linkId, studentId: sidd });
      });
    }
    const last = (k) => (threads[k] || []).sort((a, b) => a.at.localeCompare(b.at)).at(-1);
    contacts.sort((a, b) => String(last(b.key)?.at || "").localeCompare(String(last(a.key)?.at || "")));
    if (!contacts.length) { el.innerHTML = card("Messages", empty(side === "staff" ? "No messages from parents yet." : "No teachers found for your children.", "chat")); return; }
    const active = contacts.find((c) => c.key === params.t) || contacts[0];
    const thread = (threads[active.key] || []).sort((a, b) => a.at.localeCompare(b.at));
    const unread = (k) => (threads[k] || []).filter((m) => !m.read && m.from !== side).length;

    el.innerHTML = `<div class="chat">
      <div class="chat__list" role="list">${contacts.map((c) => `<button type="button" role="listitem" data-t="${esc(c.key)}" aria-current="${c.key === active.key}">${avatar(c.title)}<span style="min-width:0;flex:1"><b>${esc(c.title)}</b><span>${esc(last(c.key)?.text || c.sub)}</span></span>${unread(c.key) ? `<span class="pill pill--gold">${unread(c.key)}</span>` : ""}</button>`).join("")}</div>
      <div class="chat__pane">
        <div class="chat__head">${esc(active.title)} <span>· ${esc(active.sub)}</span></div>
        <div class="chat__msgs" id="msgs">${thread.length ? thread.map((m) => `<div class="bubble${m.from === side ? " bubble--me" : ""}">${esc(m.text)}<time>${fmtTime(m.at)}</time></div>`).join("") : `<p class="muted" style="margin:auto;text-align:center">No messages yet. Write the first one below.</p>`}</div>
        <form class="chat__form" id="send"><label for="msg" class="sr-only">Message</label><textarea id="msg" name="msg" placeholder="Write a message…" maxlength="1000" required></textarea><button class="btn btn--navy btn--sm" type="submit">Send</button></form>
      </div></div>
      <p class="muted small" style="margin-top:10px">Messages are for school matters. Teachers usually reply within one working day.</p>`;
    const box = $("#msgs"); box.scrollTop = box.scrollHeight;
    $$("[data-t]").forEach((b) => (b.onclick = () => (location.hash = "#/messages?t=" + encodeURIComponent(b.dataset.t))));
    // mark incoming as read
    await Promise.all(thread.filter((m) => !m.read && m.from !== side).map((m) => store.update("messages", m.id, { read: true })));
    refreshCounts();
    $("#send").onsubmit = async (e) => {
      e.preventDefault();
      const text = $("#msg").value.trim(); if (!text) return;
      e.submitter && (e.submitter.disabled = true);
      await store.add("messages", { parentId: active.parentId, staffId: active.staffId, studentId: active.studentId, from: side, text, at: new Date().toISOString(), read: false });
      messages({ el, user, params: { t: active.key }, refreshCounts });
    };
    $("#msg").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) $("#send").requestSubmit(); });
  };
}

export async function unreadCount(side, id) {
  const key = side === "parent" ? "parentId" : "staffId";
  return (await store.list("messages", { [key]: id })).filter((m) => !m.read && m.from !== side).length;
}
