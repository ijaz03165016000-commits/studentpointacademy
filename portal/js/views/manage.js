/* Management views shared by the Principal and Admin portals */
import * as store from "../store.js";
import { CLASSES, classById, className, shortName, bandLabel, monthlyFee, feeLabel, studentSubjects, FEE_SUMMARY, FEE_DUE_DAY, LATE_FEE, DAYS, PERIODS } from "../school.js";
import {
  $, $$, esc, icon, kpi, card, empty, pill, person, avatar, statusPill, bars, ring, toast, dialog, field, options, armed,
  fmtDate, fmtMonth, dayBox, money, pct, today, attendanceStats, examResult, classPositions, feeState, gradePill
} from "../ui.js";
import { timetableGrid, showChallan } from "./shared.js";
import { cardStatus } from "./idcard.js";

const plusIcon = icon("plus").replace("<svg", '<svg width="18" height="18" fill="currentColor"');
const classOpts = (sel, withAll = true) => (withAll ? `<option value="">All classes</option>` : "") + options(CLASSES.map((c) => [c.id, c.name]), sel);
const hashWith = (view, obj) => "#/" + view + "?" + new URLSearchParams(Object.entries(obj).filter(([, v]) => v)).toString();

/* ==========================================================
   School-wide snapshot used by dashboards
   ========================================================== */
export async function snapshot() {
  const [students, staff, att, staffAtt, fees, leaves] = await Promise.all([
    store.list("students"), store.list("staff"), store.list("attendance", { date: today() }),
    store.get("staffAttendance", today()), store.list("fees", { month: today().slice(0, 7) }), store.list("leaves", { status: "pending" })
  ]);
  const active = students.filter((s) => s.status !== "left");
  let P = 0, T = 0;
  att.forEach((d) => Object.values(d.records).forEach((v) => { T++; if (v === "P") P++; }));
  const marked = new Set(att.map((d) => d.classId));
  const collected = fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);
  const expected = fees.reduce((s, f) => s + f.amount, 0);
  const staffRec = staffAtt?.records || {};
  return {
    students: active, staff, att, marked, attPct: pct(P, T), present: P, markedTotal: T,
    staffPresent: Object.values(staffRec).filter((v) => v === "P").length, staffMarked: Object.keys(staffRec).length,
    fees, collected, expected, feePct: pct(collected, expected), pendingStaffLeaves: leaves.filter((l) => l.kind === "staff"), pendingLeaves: leaves
  };
}

export function schoolCharts(s) {
  const byClass = CLASSES.map((c) => {
    const d = s.att.find((x) => x.classId === c.id);
    if (!d) return [shortName(c.id), null];
    const v = Object.values(d.records); return [shortName(c.id), pct(v.filter((x) => x === "P").length, v.length)];
  });
  const feeByClass = CLASSES.map((c) => {
    const f = s.fees.filter((x) => x.classId === c.id);
    return [shortName(c.id), pct(f.filter((x) => x.status === "paid").length, f.length)];
  });
  const groups = {};
  s.students.forEach((st) => { const g = bandLabel(st.classId); groups[g] = (groups[g] || 0) + 1; });
  return { byClass, feeByClass, groups };
}

/* ==========================================================
   Students directory (admin can edit)
   ========================================================== */
export function studentsView({ canEdit }) {
  return async function studentsList({ el, params }) {
    const [all, parents] = await Promise.all([store.list("students"), canEdit ? store.list("users", { role: "parent" }) : []]);
    const q = (params.q || "").toLowerCase(), cls = params.c || "";
    const list = all.filter((s) => (!cls || s.classId === cls) && (!q || `${s.name} ${s.id} ${s.fatherName} ${s.phone}`.toLowerCase().includes(q)))
      .sort((a, b) => CLASSES.findIndex((c) => c.id === a.classId) - CLASSES.findIndex((c) => c.id === b.classId) || a.rollNo - b.rollNo);
    el.innerHTML = `
    <div class="toolbar">
      ${field("sq", "Search", `<input id="sq" type="search" value="${esc(params.q || "")}" placeholder="Name, ID, father or phone">`)}
      ${field("sc", "Class", `<select id="sc">${classOpts(cls)}</select>`)}
      <span class="toolbar__spacer"></span>
      ${canEdit ? `<button class="btn btn--gold btn--sm" id="addS">${plusIcon} Add student</button>` : ""}
    </div>
    ${card(`${list.length} student${list.length === 1 ? "" : "s"}${cls ? " in " + className(cls) : ""}`, list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Class</th><th>Roll</th><th>Father</th><th>Phone</th><th>Status</th><th>ID card</th><th></th></tr></thead><tbody>
      ${list.slice(0, 300).map((s) => `<tr><td>${person(s.name, s.id)}</td><td class="nowrap">${esc(className(s.classId))}</td><td>${s.rollNo}</td><td>${esc(s.fatherName)}</td><td class="nowrap">${esc(s.phone)}</td><td>${s.status === "left" ? pill("Left", "grey") : pill("Active", "green")}</td><td>${cardStatus("student", s)}</td>
        <td class="nowrap"><button class="linkbtn" data-view="${esc(s.id)}">View</button>${canEdit ? ` · <button class="linkbtn" data-edit="${esc(s.id)}">Edit</button>` : ""} · <a href="#/idcard?kind=student&id=${encodeURIComponent(s.id)}">Card</a></td></tr>`).join("")}
    </tbody></table></div>` : empty("No students match", "search"))}`;
    let t; $("#sq").oninput = (e) => { clearTimeout(t); t = setTimeout(() => (location.hash = hashWith("students", { q: e.target.value, c: $("#sc").value })), 350); };
    $("#sc").onchange = (e) => (location.hash = hashWith("students", { q: $("#sq").value, c: e.target.value }));
    if (params.q) { const i = $("#sq"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    $$("[data-view]").forEach((b) => (b.onclick = () => studentCard(all.find((s) => s.id === b.dataset.view))));
    const reload = () => studentsList({ el, params });
    if (canEdit) {
      $("#addS").onclick = () => editStudent(null, all, parents, reload);
      $$("[data-edit]").forEach((b) => (b.onclick = () => editStudent(all.find((s) => s.id === b.dataset.edit), all, parents, reload)));
    }
  };
}

async function studentCard(s) {
  const [att, exams, fees] = await Promise.all([store.list("attendance", { classId: s.classId }), store.list("exams", { classId: s.classId }), store.list("fees", { studentId: s.id })]);
  const a = attendanceStats(att, s.id);
  exams.sort((x, y) => x.date.localeCompare(y.date));
  const due = fees.filter((f) => f.status !== "paid");
  dialog({
    title: s.name, wide: true,
    body: `<div class="profile-top" style="margin-bottom:16px">${avatar(s.name, "avatar--lg")}<div><b style="color:var(--navy);font-size:1.15rem">${esc(s.name)}</b><div class="muted">${esc(s.id)} · ${esc(className(s.classId))} · Roll ${s.rollNo}</div></div></div>
    <div class="grid grid--kpi">${kpi({ label: "Attendance", value: a.total ? a.pct + "%" : "—", sub: `${a.A} absent of ${a.total}`, ic: "checklist", tone: a.pct >= 85 ? "green" : "red" })}
    ${kpi({ label: "Fee due", value: due.length ? money(due.reduce((x, f) => x + f.amount, 0)) : "Nil", sub: due.length ? due.map((f) => fmtMonth(f.month)).join(", ") : "All clear", ic: "money", tone: due.length ? "red" : "green" })}</div>
    <dl class="dl" style="margin-bottom:16px"><dt>Subjects</dt><dd>${esc(studentSubjects(s).join(", "))}</dd><dt>Monthly fee</dt><dd>${money(monthlyFee(s))}</dd><dt>Father</dt><dd>${esc(s.fatherName)}</dd><dt>Phone</dt><dd>${esc(s.phone)}</dd><dt>Date of birth</dt><dd>${fmtDate(s.dob)}</dd><dt>Address</dt><dd>${esc(s.address)}</dd><dt>Admitted</dt><dd>${fmtDate(s.admissionDate)}</dd><dt>Parent login</dt><dd>${esc(s.parentId || "—")}</dd></dl>
    <h3 style="font-size:1.05rem">Results</h3>
    ${exams.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Exam</th><th class="num">Marks</th><th class="num">%</th><th class="center">Grade</th><th class="center">Position</th></tr></thead><tbody>${exams.map((e) => { const r = examResult(e, s.id); const { pos, list } = classPositions(e); return `<tr><td>${esc(e.name)} ${e.published ? "" : pill("Not published", "grey")}</td><td class="num">${r.got}/${r.max}</td><td class="num">${r.pct}</td><td class="center">${r.max ? gradePill(r.grade) : "—"}</td><td class="center">${pos[s.id] || "—"} / ${list.length}</td></tr>`; }).join("")}</tbody></table></div>` : empty("No exams yet")}`
  });
}

function editStudent(s, all, parents, done) {
  const isNew = !s;
  s = s || { classId: CLASSES[0].id, status: "active", admissionDate: today(), gender: "M" };
  const nextSid = () => "SPA-" + String(Math.max(100, ...all.map((x) => Number(String(x.id).replace(/\D/g, "")) || 0)) + 1).padStart(4, "0");
  const nextRoll = (cid) => Math.max(0, ...all.filter((x) => x.classId === cid).map((x) => x.rollNo || 0)) + 1;
  const d = dialog({
    title: isNew ? "Add student" : "Edit " + s.name, wide: true, submit: isNew ? "Add student" : "Save changes",
    body: `<div class="form">
      ${field("s-name", "Full name", `<input id="s-name" name="name" required value="${esc(s.name || "")}">`)}
      ${field("s-father", "Father's name", `<input id="s-father" name="fatherName" required value="${esc(s.fatherName || "")}">`)}
      ${field("s-class", "Class", `<select id="s-class" name="classId">${classOpts(s.classId, false)}</select>`)}
      ${field("s-roll", "Roll no.", `<input id="s-roll" name="rollNo" type="number" min="1" required value="${s.rollNo || nextRoll(s.classId)}">`)}
      ${field("s-gender", "Gender", `<select id="s-gender" name="gender">${options([["M", "Male"], ["F", "Female"]], s.gender)}</select>`)}
      ${field("s-dob", "Date of birth", `<input id="s-dob" name="dob" type="date" value="${esc(s.dob || "")}">`)}
      ${field("s-phone", "Parent's phone", `<input id="s-phone" name="phone" inputmode="tel" placeholder="03XX-XXXXXXX" value="${esc(s.phone || "")}">`)}
      ${field("s-adm", "Admission date", `<input id="s-adm" name="admissionDate" type="date" value="${esc(s.admissionDate || "")}">`)}
      ${field("s-addr", "Address", `<input id="s-addr" name="address" value="${esc(s.address || "")}">`, "full")}
      <fieldset class="full" style="border:0;padding:0;margin:0"><legend style="font-weight:700;color:var(--navy);margin-bottom:6px">Subjects taken <span class="muted small" id="s-feeinfo"></span></legend><div id="s-subs" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:4px"></div></fieldset>
      ${isNew ? `
      ${field("s-id", "Student ID (login)", `<input id="s-id" name="sid" required placeholder="e.g. SPA-0101" value="${nextSid()}" style="text-transform:uppercase"><div class="field__hint">Used to sign in. Can't be changed later.</div>`)}
      ${field("s-pw", "Student password", `<input id="s-pw" name="pw" required minlength="6" value="${Math.random().toString(36).slice(2, 8)}"><div class="field__hint">Give this to the student. At least 6 characters.</div>`)}
      ${field("s-parent", "Parent account", `<select id="s-parent" name="parent"><option value="new">Create a new parent login</option><option value="">No parent login</option>${options(parents.map((p) => [p.id, `${p.name} (${p.loginId})`]))}</select><div class="field__hint">Brothers and sisters can share one parent login.</div>`, "full")}
      ` : field("s-status", "Status", `<select id="s-status" name="status">${options([["active", "Active"], ["left", "Left the academy"]], s.status)}</select>`)}
    </div>`,
    onSubmit: async (f) => {
      const data = { subjects: $$("input[name=subj]:checked", f).map((i) => i.value), name: f.name.value.trim(), fatherName: f.fatherName.value.trim(), classId: f.classId.value, rollNo: Number(f.rollNo.value), gender: f.gender.value, dob: f.dob.value, phone: f.phone.value.trim(), admissionDate: f.admissionDate.value, address: f.address.value.trim() };
      if (!data.subjects.length) throw new Error("Tick at least one subject.");
      if (data.phone && !/^03\d{2}-?\d{7}$/.test(data.phone)) throw new Error("Phone should look like 03XX-XXXXXXX.");
      if (isNew) {
        const sid = f.sid.value.trim().toUpperCase();
        if (all.some((x) => x.id === sid)) throw new Error("That Student ID already exists.");
        let parentId = f.parent.value;
        await store.createAccount({ loginId: sid, password: f.pw.value, role: "student", name: data.name, linkId: sid, classId: data.classId });
        let parentMsg = "";
        if (parentId === "new") {
          const pid = "P-" + sid.replace(/^SPA-/, "");
          const ppw = Math.random().toString(36).slice(2, 8);
          const uid = await store.createAccount({ loginId: pid, password: ppw, role: "parent", name: data.fatherName, children: [sid], childClassIds: [data.classId] });
          parentId = uid; parentMsg = `Parent login: ${pid} / ${ppw}`;
        } else if (parentId) {
          const p = parents.find((x) => x.id === parentId);
          await store.update("users", parentId, { children: [...(p.children || []), sid], childClassIds: [...(p.childClassIds || []), data.classId] });
        }
        await store.set("students", sid, { ...data, status: "active", parentId: parentId || "" });
        dialog({ title: "Student added", body: `<p><b>${esc(data.name)}</b> is enrolled in ${esc(className(data.classId))}.</p><div class="challan"><div class="challan__row"><span>Student login</span><b>${esc(sid)} / ${esc(f.pw.value)}</b></div>${parentMsg ? `<div class="challan__row"><span>Parent login</span><b>${esc(parentMsg.replace("Parent login: ", ""))}</b></div>` : ""}</div><p class="muted small" style="margin-top:12px">Write these down and hand them over — passwords are not shown again.</p>` });
      } else {
        await store.set("students", s.id, { ...s, ...data, status: f.status.value });
        const u = await store.list("users", { linkId: s.id });
        await Promise.all(u.map((x) => store.update("users", x.id, { name: data.name, classId: data.classId, disabled: f.status.value === "left" })));
        toast("Student updated");
      }
      done();
    }
  });
  const drawSubs = (cid, keep) => {
    const c = classById(cid); const cur = keep && keep.length ? keep : (c.subjects.length <= 1 ? c.subjects : []);
    $("#s-subs", d).innerHTML = c.subjects.map((x) => `<label><input type="checkbox" name="subj" value="${esc(x)}"${cur.includes(x) ? " checked" : ""}> ${esc(x)}</label>`).join("");
    const info = () => { const n = $$("input[name=subj]:checked", d).map((i) => i.value); $("#s-feeinfo", d).textContent = n.length ? "· " + money(monthlyFee({ classId: cid, subjects: n })) + " / month" : ""; };
    $$("input[name=subj]", d).forEach((i) => (i.onchange = info)); info();
  };
  drawSubs(s.classId, s.subjects || (isNew ? [] : classById(s.classId)?.subjects));
  $("#s-class", d).onchange = (e) => { if (isNew) $("#s-roll", d).value = nextRoll(e.target.value); drawSubs(e.target.value, []); };
}

/* ==========================================================
   Attendance overview (+ staff attendance for principal)
   ========================================================== */
export function attendanceOverview({ canMarkStaff }) {
  return async function att({ el, params }) {
    const date = params.d && params.d <= today() ? params.d : today();
    const [docs, students, staff, sAtt] = await Promise.all([store.list("attendance", { date }), store.list("students"), store.list("staff"), store.get("staffAttendance", date)]);
    let tp = 0, tt = 0;
    const rows = CLASSES.map((c) => {
      const d = docs.find((x) => x.classId === c.id); const n = students.filter((s) => s.classId === c.id && s.status !== "left").length;
      if (!d) return { c, n, d: null };
      const v = Object.values(d.records); const P = v.filter((x) => x === "P").length; tp += P; tt += v.length;
      return { c, n, d, P, A: v.filter((x) => x === "A").length, L: v.filter((x) => x === "L").length, p: pct(P, v.length) };
    });
    const ct = (id) => staff.find((t) => t.classTeacherOf === id)?.name || "—";
    const srec = sAtt?.records || {};
    el.innerHTML = `
    <div class="toolbar">${field("ad", "Date", `<input id="ad" type="date" value="${date}" max="${today()}">`)}</div>
    <div class="grid grid--kpi">
      ${kpi({ label: "Students present", value: tt ? `${tp}/${tt}` : "—", sub: tt ? pct(tp, tt) + "% of marked" : "Nothing marked yet", ic: "checklist", tone: "green" })}
      ${kpi({ label: "Classes marked", value: `${docs.length}/${CLASSES.length}`, sub: docs.length < CLASSES.length ? `${CLASSES.length - docs.length} still pending` : "All done", ic: "school", tone: docs.length < CLASSES.length ? "red" : "green" })}
      ${kpi({ label: "Staff present", value: Object.keys(srec).length ? `${Object.values(srec).filter((v) => v === "P").length}/${staff.length}` : "—", sub: Object.keys(srec).length ? "" : "Not marked", ic: "teacher", tone: "gold" })}
    </div>
    <div class="grid grid--main">
      ${card("Classes", `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Class</th><th>Class teacher</th><th class="num">Present</th><th class="num">Absent</th><th class="num">Leave</th><th class="num">%</th><th></th></tr></thead><tbody>
      ${rows.map((r) => r.d ? `<tr><td><b>${esc(r.c.name)}</b></td><td>${esc(ct(r.c.id))}</td><td class="num">${r.P}</td><td class="num">${r.A}</td><td class="num">${r.L}</td><td class="num"><span class="pill ${r.p >= 85 ? "pill--green" : "pill--red"}">${r.p}%</span></td><td><button class="linkbtn" data-cls="${r.c.id}">Absentees</button></td></tr>`
        : `<tr><td><b>${esc(r.c.name)}</b></td><td>${esc(ct(r.c.id))}</td><td colspan="4">${pill("Not marked", "red")}</td><td></td></tr>`).join("")}
      </tbody></table></div>`)}
      ${card("Staff attendance", `<form id="sf"><ul class="list">${staff.map((t) => `<li><div class="list__main">${person(t.name, t.subjects.join(", "))}</div>${canMarkStaff ? `<div class="mark-row">${["P", "A", "L"].map((k) => `<label><input type="radio" name="${t.id}" value="${k}"${(srec[t.id] || "P") === k ? " checked" : ""}><span class="m-${k}">${k}</span></label>`).join("")}</div>` : statusPill(srec[t.id] || "—")}</li>`).join("")}</ul>
        ${canMarkStaff ? `<div class="sticky-save"><button class="btn btn--navy btn--sm" type="submit">Save staff attendance</button></div>` : ""}</form>`)}
    </div>`;
    $("#ad").onchange = (e) => (location.hash = "#/attendance?d=" + e.target.value);
    $$("[data-cls]").forEach((b) => (b.onclick = () => {
      const d = docs.find((x) => x.classId === b.dataset.cls);
      const off = Object.entries(d.records).filter(([, v]) => v !== "P").map(([sid, v]) => ({ s: students.find((x) => x.id === sid), v }));
      dialog({ title: `${className(b.dataset.cls)} — ${fmtDate(date)}`, body: off.length ? `<ul class="list">${off.map(({ s, v }) => `<li><div class="list__main">${person(s?.name || "?", `${s?.id} · ${s?.phone || ""}`)}</div>${statusPill(v)}</li>`).join("")}</ul>` : empty("Everyone was present", "star") });
    }));
    if (canMarkStaff) $("#sf").onsubmit = async (e) => {
      e.preventDefault(); const records = {};
      staff.forEach((t) => (records[t.id] = e.currentTarget.querySelector(`input[name="${t.id}"]:checked`).value));
      await store.set("staffAttendance", date, { date, records });
      toast("Staff attendance saved");
    };
  };
}

/* ==========================================================
   Results: completeness, analysis, publish
   ========================================================== */
export function resultsOverview({ canPublish }) {
  return async function results({ el, params }) {
    const [exams, students] = await Promise.all([store.list("exams"), store.list("students")]);
    const keys = {}; exams.forEach((e) => { (keys[e.examKey] ||= { key: e.examKey, name: e.name, date: e.date, list: [] }).list.push(e); });
    const groups = Object.values(keys).sort((a, b) => b.date.localeCompare(a.date));
    if (!groups.length) { el.innerHTML = card("Results", empty("No exams yet", "chart")); return; }
    const g = groups.find((x) => x.key === params.k) || groups[0];
    const rows = CLASSES.map((c) => g.list.find((e) => e.classId === c.id)).filter(Boolean).map((e) => {
      const subs = Object.values(e.subjects || {}); const entered = subs.filter((s) => Object.keys(s.marks || {}).length).length;
      const { list } = classPositions(e);
      const avg = list.length ? Math.round(list.reduce((a, x) => a + x.pct, 0) / list.length) : 0;
      const pass = list.length ? pct(list.filter((x) => x.pct >= 40).length, list.length) : 0;
      return { e, entered, subs: subs.length, avg, pass, top: list.slice(0, 3) };
    });
    const nm = (sid) => students.find((s) => s.id === sid)?.name || sid;
    const allTop = rows.flatMap((r) => r.top.slice(0, 1).map((t) => ({ ...t, classId: r.e.classId }))).sort((a, b) => b.pct - a.pct).slice(0, 5);
    el.innerHTML = `
    <div class="toolbar">${field("rk", "Exam", `<select id="rk">${options(groups.map((x) => [x.key, `${x.name} (${fmtDate(x.date, false)})`]), g.key)}</select>`)}
      <span class="toolbar__spacer"></span>
      ${canPublish ? `<button class="btn btn--navy btn--sm" id="pubAll">Publish all complete classes</button>` : ""}</div>
    <div class="grid grid--main">
      ${card(g.name, `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Class</th><th>Subjects entered</th><th class="num">Average</th><th class="num">Pass</th><th>Top student</th><th>Status</th>${canPublish ? "<th></th>" : ""}</tr></thead><tbody>
        ${rows.map((r) => `<tr><td><b>${esc(className(r.e.classId))}</b></td><td>${r.entered === r.subs ? pill(`${r.entered}/${r.subs}`, "green") : pill(`${r.entered}/${r.subs}`, "gold")}</td><td class="num">${r.avg}%</td><td class="num">${r.pass}%</td><td>${r.top[0] ? esc(nm(r.top[0].sid)) + ` <span class="muted small">${r.top[0].pct}%</span>` : "—"}</td><td>${r.e.published ? pill("Published", "green") : pill("Draft", "grey")}</td>
        ${canPublish ? `<td class="nowrap"><button class="linkbtn" data-pub="${esc(r.e.id)}" data-v="${r.e.published ? "" : "1"}">${r.e.published ? "Unpublish" : "Publish"}</button></td>` : ""}</tr>`).join("")}
      </tbody></table></div>
      <p class="muted small" style="margin-top:12px">Students and parents see a result only after it is published. Teachers can't change marks once published.</p>`)}
      <div>${card("Average by class", bars(rows.map((r) => [shortName(r.e.classId), r.avg])))}
      ${card("Toppers", allTop.length ? `<ul class="list">${allTop.map((t, i) => `<li><span class="avatar ${i === 0 ? "avatar--gold" : ""}" style="width:34px;height:34px;font-size:.85rem">${i + 1}</span><div class="list__main"><b>${esc(nm(t.sid))}</b><span class="list__meta">${esc(className(t.classId))}</span></div><b style="color:var(--navy)">${t.pct}%</b></li>`).join("")}</ul>` : empty("No marks yet"))}</div>
    </div>`;
    $("#rk").onchange = (e) => (location.hash = "#/results?k=" + encodeURIComponent(e.target.value));
    if (canPublish) {
      $$("[data-pub]").forEach((b) => (b.onclick = async () => { await store.update("exams", b.dataset.pub, { published: !!b.dataset.v }); toast(b.dataset.v ? "Published to students and parents" : "Unpublished"); results({ el, params: { k: g.key } }); }));
      $("#pubAll").onclick = async () => {
        const ready = rows.filter((r) => !r.e.published && r.entered === r.subs);
        if (!ready.length) { toast("No complete classes waiting to be published"); return; }
        await Promise.all(ready.map((r) => store.update("exams", r.e.id, { published: true })));
        toast(`Published ${ready.length} class${ready.length > 1 ? "es" : ""}`); results({ el, params: { k: g.key } });
      };
    }
  };
}

/* ==========================================================
   Fees (admin can generate challans and record payments)
   ========================================================== */
export function feesView({ canEdit }) {
  return async function fees({ el, params }) {
    const month = params.m || today().slice(0, 7);
    const [list, students] = await Promise.all([store.list("fees", { month }), store.list("students")]);
    const cls = params.c || "", st = params.s || "";
    const rows = list.filter((f) => (!cls || f.classId === cls) && (!st || feeState(f) === st || (st === "unpaid" && f.status !== "paid")))
      .sort((a, b) => CLASSES.findIndex((c) => c.id === a.classId) - CLASSES.findIndex((c) => c.id === b.classId) || a.studentId.localeCompare(b.studentId));
    const collected = list.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0), expected = list.reduce((s, f) => s + f.amount, 0);
    const nm = (sid) => students.find((s) => s.id === sid);
    const months = [-3, -2, -1, 0, 1].map((k) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + k); return d.toISOString().slice(0, 7); });
    el.innerHTML = `
    <div class="toolbar">
      ${field("fm", "Month", `<select id="fm">${options(months.map((m) => [m, fmtMonth(m)]), month)}</select>`)}
      ${field("fc", "Class", `<select id="fc">${classOpts(cls)}</select>`)}
      ${field("fs", "Status", `<select id="fs">${options([["", "All"], ["paid", "Paid"], ["unpaid", "Not paid"], ["overdue", "Overdue"]], st)}</select>`)}
      <span class="toolbar__spacer"></span>
      ${canEdit ? `<button class="btn btn--gold btn--sm" id="gen">${plusIcon} Generate challans</button>` : ""}
    </div>
    <div class="grid grid--kpi">
      ${kpi({ label: "Collected", value: money(collected), sub: `${pct(collected, expected)}% of ${money(expected)}`, ic: "money", tone: "green" })}
      ${kpi({ label: "Outstanding", value: money(expected - collected), sub: `${list.filter((f) => f.status !== "paid").length} students`, ic: "clock", tone: "red" })}
      ${kpi({ label: "Challans issued", value: list.length, sub: fmtMonth(month), ic: "book" })}
    </div>
    ${card(`${fmtMonth(month)} — ${rows.length} challans`, rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Class</th><th class="num">Amount</th><th>Status</th><th>Paid on</th><th></th></tr></thead><tbody>
      ${rows.slice(0, 400).map((f) => { const s = nm(f.studentId); return `<tr><td>${person(s?.name || f.studentId, f.studentId + (s?.phone ? " · " + s.phone : ""))}</td><td class="nowrap">${esc(shortName(f.classId))}</td><td class="num">${money(f.amount)}</td><td>${statusPill(feeState(f))}</td><td class="nowrap">${f.paidOn ? fmtDate(f.paidOn) : "—"}</td>
        <td class="nowrap"><button class="linkbtn" data-ch="${esc(f.id)}">${f.status === "paid" ? "Receipt" : "Challan"}</button>${canEdit ? (f.status === "paid" ? ` · <button class="linkbtn linkbtn--danger" data-undo="${esc(f.id)}">Undo</button>` : ` · <button class="linkbtn" data-pay="${esc(f.id)}">Mark paid</button>`) : ""}</td></tr>`; }).join("")}
    </tbody></table></div>` : empty(list.length ? "No challans match the filter" : "No challans for this month yet" + (canEdit ? " — use “Generate challans”." : "."), "money"))}`;
    const go = () => (location.hash = hashWith("fees", { m: $("#fm").value, c: $("#fc").value, s: $("#fs").value }));
    $("#fm").onchange = go; $("#fc").onchange = go; $("#fs").onchange = go;
    const reload = () => fees({ el, params });
    $$("[data-ch]").forEach((b) => (b.onclick = () => { const f = list.find((x) => x.id === b.dataset.ch); showChallan(f, nm(f.studentId) || { name: f.studentId, fatherName: "" }); }));
    if (!canEdit) return;
    $$("[data-pay]").forEach((b) => (b.onclick = () => {
      const f = list.find((x) => x.id === b.dataset.pay); const late = feeState(f) === "overdue" ? LATE_FEE : 0;
      dialog({
        title: "Record payment — " + (nm(f.studentId)?.name || f.studentId), submit: "Mark as paid",
        body: `<div class="form">${field("p-date", "Paid on", `<input id="p-date" name="paidOn" type="date" value="${today()}" max="${today()}" required>`)}
          ${field("p-amt", "Amount received (Rs.)", `<input id="p-amt" name="amount" type="number" value="${f.amount + late}" required>`)}
          ${field("p-rc", "Receipt no.", `<input id="p-rc" name="receipt" value="RC-${Date.now().toString().slice(-6)}" required>`, "full")}</div>`,
        onSubmit: async (fm) => { await store.update("fees", f.id, { status: "paid", paidOn: fm.paidOn.value, receiptNo: fm.receipt.value.trim(), received: Number(fm.amount.value) }); toast("Payment recorded"); reload(); }
      });
    }));
    $$("[data-undo]").forEach((b) => (b.onclick = () => armed(b, async () => { await store.update("fees", b.dataset.undo, { status: "unpaid", paidOn: "", receiptNo: "" }); toast("Marked as not paid"); reload(); }, "Undo payment?")));
    $("#gen").onclick = () => dialog({
      title: "Generate fee challans", submit: "Generate",
      body: `<div class="form">${field("g-m", "Month", `<select id="g-m" name="month">${options(months.map((m) => [m, fmtMonth(m)]), month)}</select>`)}
        ${field("g-c", "Class", `<select id="g-c" name="classId">${classOpts("")}</select>`)}</div>
        <p class="muted small">Creates one challan per active student from the subjects they take (${esc(FEE_SUMMARY)}), due on the ${FEE_DUE_DAY}th. Students who already have a challan for that month are skipped.</p>`,
      onSubmit: async (f) => {
        const m = f.month.value, c = f.classId.value;
        const existing = new Set((await store.list("fees", { month: m })).map((x) => x.studentId));
        const targets = students.filter((s) => s.status !== "left" && (!c || s.classId === c) && !existing.has(s.id));
        for (const s of targets) {
          const amount = monthlyFee(s);
          await store.set("fees", `${s.id}_${m}`, { studentId: s.id, classId: s.classId, month: m, amount, due: `${m}-${String(FEE_DUE_DAY).padStart(2, "0")}`, items: [{ label: feeLabel(s), amount }], status: "unpaid", paidOn: "", receiptNo: "", challanNo: `CH-${m.replace("-", "")}-${s.id.replace(/^SPA-/, "")}` });
        }
        toast(targets.length ? `${targets.length} challans generated` : "Everyone already has a challan for that month");
        location.hash = hashWith("fees", { m, c });
      }
    });
  };
}

/* ==========================================================
   Notices (create / edit / delete)
   ========================================================== */
export function noticesManager(byName) {
  return async function notices({ el }) {
    const list = (await store.list("notices")).sort((a, b) => (Number(!!b.pinned) - Number(!!a.pinned)) || b.date.localeCompare(a.date));
    const AUD = { students: "Students", parents: "Parents", staff: "Staff" };
    el.innerHTML = `<div class="toolbar"><span class="toolbar__spacer"></span><button class="btn btn--gold btn--sm" id="addN">${plusIcon} New notice</button></div>
    ${card("Portal notices", list.length ? `<ul class="list">${list.map((n) => `<li>${dayBox(n.date)}<div class="list__main"><b>${esc(n.title)} ${n.pinned ? pill("Pinned", "gold") : ""}</b><div>${esc(n.body)}</div><div class="list__meta">To: ${(n.audience || []).map((a) => AUD[a] || a).join(", ")} · by ${esc(n.by || "")}</div></div>
      <div class="nowrap"><button class="linkbtn" data-ed="${esc(n.id)}">Edit</button> · <button class="linkbtn linkbtn--danger" data-del="${esc(n.id)}">Delete</button></div></li>`).join("")}</ul>` : empty("No notices yet", "bell"))}
    <p class="muted small" style="margin-top:12px">These notices appear inside the portals. For public announcements on the website, use <a href="../admin/" target="_blank" rel="noopener">Website content</a>.</p>`;
    const reload = () => notices({ el });
    const edit = (n) => dialog({
      title: n ? "Edit notice" : "New notice", submit: n ? "Save" : "Post notice",
      body: `<div class="form" style="grid-template-columns:1fr">
        ${field("n-t", "Title", `<input id="n-t" name="title" required maxlength="120" value="${esc(n?.title || "")}">`)}
        ${field("n-b", "Message", `<textarea id="n-b" name="body" required maxlength="1200">${esc(n?.body || "")}</textarea>`)}
        <fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-weight:700;color:var(--navy);margin-bottom:6px">Who should see it</legend>
          ${Object.entries(AUD).map(([k, v]) => `<label style="margin-right:18px;font-weight:600"><input type="checkbox" name="aud" value="${k}"${!n || (n.audience || []).includes(k) ? " checked" : ""}> ${v}</label>`).join("")}</fieldset>
        <label style="font-weight:600"><input type="checkbox" name="pinned"${n?.pinned ? " checked" : ""}> Pin to the top</label></div>`,
      onSubmit: async (f) => {
        const audience = $$("input[name=aud]:checked", f).map((i) => i.value);
        if (!audience.length) throw new Error("Choose at least one group.");
        const data = { title: f.title.value.trim(), body: f.body.value.trim(), audience, pinned: f.pinned.checked, date: n?.date || today(), by: n?.by || byName };
        n ? await store.set("notices", n.id, data) : await store.add("notices", data);
        toast(n ? "Notice updated" : "Notice posted"); reload();
      }
    });
    $("#addN").onclick = () => edit(null);
    $$("[data-ed]").forEach((b) => (b.onclick = () => edit(list.find((n) => n.id === b.dataset.ed))));
    $$("[data-del]").forEach((b) => (b.onclick = () => armed(b, async () => { await store.remove("notices", b.dataset.del); toast("Notice deleted"); reload(); }, "Delete?")));
  };
}

/* ==========================================================
   Staff directory (admin can edit)
   ========================================================== */
export function staffView({ canEdit }) {
  return async function staffList({ el }) {
    const [staff, sAtt] = await Promise.all([store.list("staff"), store.get("staffAttendance", today())]);
    staff.sort((a, b) => a.id.localeCompare(b.id));
    const rec = sAtt?.records || {};
    el.innerHTML = `${canEdit ? `<div class="toolbar"><span class="toolbar__spacer"></span><button class="btn btn--gold btn--sm" id="addT">${plusIcon} Add staff member</button></div>` : ""}
    ${card(`${staff.length} staff members`, `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Subjects</th><th>Class teacher</th><th>Phone</th><th>Today</th><th>ID card</th><th></th></tr></thead><tbody>
      ${staff.map((t) => `<tr><td>${person(t.name, `${t.id} · ${t.designation}`)}</td><td>${esc(t.subjects.join(", "))}</td><td class="nowrap">${t.classTeacherOf ? esc(className(t.classTeacherOf)) : "—"}</td><td class="nowrap"><a href="tel:${esc(t.phone)}">${esc(t.phone)}</a></td><td>${rec[t.id] ? statusPill(rec[t.id]) : pill("—", "grey")}</td><td>${cardStatus("staff", t)}</td><td class="nowrap">${canEdit ? `<button class="linkbtn" data-ed="${esc(t.id)}">Edit</button> · ` : ""}<a href="#/idcard?kind=staff&id=${encodeURIComponent(t.id)}">Card</a></td></tr>`).join("")}
    </tbody></table></div>`)}`;
    if (!canEdit) return;
    const reload = () => staffList({ el });
    const allSubjects = [...new Set(CLASSES.flatMap((c) => c.subjects))].sort();
    const edit = (t) => dialog({
      title: t ? "Edit " + t.name : "Add staff member", wide: true, submit: t ? "Save" : "Add",
      body: `<div class="form">
        ${field("t-name", "Full name (with title)", `<input id="t-name" name="name" required value="${esc(t?.name || "")}" placeholder="e.g. Mr. Ali Raza">`)}
        ${field("t-des", "Designation", `<select id="t-des" name="designation">${options(["Teacher", "Lecturer", "Senior Lecturer", "Head of Department", "Vice Principal", "Office Staff"], t?.designation)}</select>`)}
        ${field("t-phone", "Phone", `<input id="t-phone" name="phone" value="${esc(t?.phone || "")}">`)}
        ${field("t-email", "Email", `<input id="t-email" name="email" type="email" value="${esc(t?.email || "")}">`)}
        ${field("t-q", "Qualification", `<input id="t-q" name="qualification" value="${esc(t?.qualification || "")}">`)}
        ${field("t-ct", "Class teacher of", `<select id="t-ct" name="classTeacherOf"><option value="">None</option>${options(CLASSES.map((c) => [c.id, c.name]), t?.classTeacherOf)}</select>`)}
        <fieldset class="full" style="border:0;padding:0;margin:0"><legend style="font-weight:700;color:var(--navy);margin-bottom:6px">Subjects</legend><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:4px">${allSubjects.map((s) => `<label><input type="checkbox" name="sub" value="${esc(s)}"${t?.subjects?.includes(s) ? " checked" : ""}> ${esc(s)}</label>`).join("")}</div></fieldset>
        <fieldset class="full" style="border:0;padding:0;margin:0"><legend style="font-weight:700;color:var(--navy);margin-bottom:6px">Teaches these classes</legend><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px">${CLASSES.map((c) => `<label><input type="checkbox" name="cls" value="${c.id}"${t?.classIds?.includes(c.id) ? " checked" : ""}> ${esc(c.name)}</label>`).join("")}</div></fieldset>
        ${t ? "" : `${field("t-id", "Staff ID (login)", `<input id="t-id" name="tid" required placeholder="e.g. T14" style="text-transform:uppercase">`)}${field("t-pw", "Password", `<input id="t-pw" name="pw" required value="${Math.random().toString(36).slice(2, 8)}">`)}`}
      </div>`,
      onSubmit: async (f) => {
        const data = { name: f.name.value.trim(), designation: f.designation.value, phone: f.phone.value.trim(), email: f.email.value.trim(), qualification: f.qualification.value.trim(), classTeacherOf: f.classTeacherOf.value, subjects: $$("input[name=sub]:checked", f).map((i) => i.value), classIds: $$("input[name=cls]:checked", f).map((i) => i.value) };
        const clash = staff.find((x) => x.classTeacherOf && x.classTeacherOf === data.classTeacherOf && x.id !== t?.id);
        if (clash) throw new Error(`${clash.name} is already class teacher of ${className(data.classTeacherOf)}. Change theirs first.`);
        if (t) { await store.set("staff", t.id, { ...t, ...data }); const u = await store.list("users", { linkId: t.id }); await Promise.all(u.map((x) => store.update("users", x.id, { name: data.name }))); toast("Saved"); }
        else {
          const id = f.tid.value.trim().toUpperCase();
          if (staff.some((x) => x.id === id)) throw new Error("That Staff ID already exists.");
          await store.createAccount({ loginId: id, password: f.pw.value, role: "staff", name: data.name, linkId: id });
          await store.set("staff", id, { ...data, joinDate: today() });
          dialog({ title: "Staff member added", body: `<div class="challan"><div class="challan__row"><span>Login</span><b>${esc(id)} / ${esc(f.pw.value)}</b></div></div><p class="muted small" style="margin-top:12px">Hand these over — the password is not shown again.</p>` });
        }
        reload();
      }
    });
    $("#addT").onclick = () => edit(null);
    $$("[data-ed]").forEach((b) => (b.onclick = () => edit(staff.find((x) => x.id === b.dataset.ed))));
  };
}

/* ==========================================================
   Leave approvals (principal: staff leave; sees student leave)
   ========================================================== */
export function leaveApprovals({ byName }) {
  return async function leaves({ el, refreshCounts }) {
    const all = (await store.list("leaves")).sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1) || b.from.localeCompare(a.from));
    const staffL = all.filter((l) => l.kind === "staff"), studL = all.filter((l) => l.kind === "student");
    const row = (l, act) => `<li>${dayBox(l.from)}<div class="list__main"><b>${esc(l.name)}${l.classId ? ` <span class="muted small">· ${esc(className(l.classId))}</span>` : ""}</b>${fmtDate(l.from, false)}${l.to !== l.from ? " – " + fmtDate(l.to, false) : ""} · ${esc(l.reason)}<div class="list__meta">${l.decidedBy ? "Decided by " + esc(l.decidedBy) : "Applied " + fmtDate(l.appliedAt)}</div>
      ${act && l.status === "pending" ? `<div style="margin-top:8px;display:flex;gap:8px"><button class="btn btn--navy btn--sm" data-ok="${esc(l.id)}">Approve</button><button class="btn btn--outline btn--sm" data-no="${esc(l.id)}">Reject</button></div>` : ""}</div>${statusPill(l.status)}</li>`;
    el.innerHTML = `<div class="grid grid--2">
      ${card("Staff leave", staffL.length ? `<ul class="list">${staffL.map((l) => row(l, true)).join("")}</ul>` : empty("No staff leave requests", "leave"))}
      ${card("Student leave (handled by class teachers)", studL.length ? `<ul class="list">${studL.slice(0, 20).map((l) => row(l, false)).join("")}</ul>` : empty("No student leave requests", "leave"))}
    </div>`;
    const decide = (id, status) => async () => { await store.update("leaves", id, { status, decidedBy: byName }); toast(status === "approved" ? "Leave approved" : "Leave rejected"); refreshCounts?.(); leaves({ el, refreshCounts }); };
    $$("[data-ok]").forEach((b) => (b.onclick = decide(b.dataset.ok, "approved")));
    $$("[data-no]").forEach((b) => (b.onclick = decide(b.dataset.no, "rejected")));
  };
}

/* ==========================================================
   Timetables (admin can edit)
   ========================================================== */
export function timetableView({ canEdit }) {
  return async function tt({ el, params }) {
    const classId = classById(params.c) ? params.c : CLASSES[0].id;
    const [t, staff] = await Promise.all([store.get("timetable", classId), store.list("staff")]);
    const c = classById(classId);
    el.innerHTML = `<div class="toolbar">${field("tc", "Class", `<select id="tc">${classOpts(classId, false)}</select>`)}<span class="toolbar__spacer"></span>${canEdit ? `<button class="btn btn--navy btn--sm" id="edTT">Edit timetable</button>` : ""}</div>
      ${card(c.name, timetableGrid(t, staff))}`;
    $("#tc").onchange = (e) => (location.hash = "#/timetable?c=" + encodeURIComponent(e.target.value));
    if (!canEdit) return;
    $("#edTT").onclick = () => {
      const teachersFor = (s) => staff.filter((x) => x.subjects.includes(s));
      dialog({
        title: "Edit timetable — " + c.name, wide: true, submit: "Save timetable",
        body: `<p class="muted small">Pick a subject for each period; the teacher list shows teachers of that subject. Leave “—” for a free period.</p>
        ${DAYS.map((d) => `<h3 style="font-size:1rem;margin:14px 0 6px">${d}</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px">${PERIODS.map((p, i) => {
          const slot = t?.days?.[d]?.[i] || {};
          return `<div style="background:var(--paper);padding:8px;border-radius:10px"><div class="small muted">P${i + 1} · ${p}</div>
            <select data-d="${d}" data-i="${i}" data-k="subject" style="width:100%;margin:4px 0;padding:6px;border:1px solid var(--line);border-radius:6px"><option value="">—</option>${options(c.subjects, slot.subject)}</select>
            <select data-d="${d}" data-i="${i}" data-k="teacherId" style="width:100%;padding:6px;border:1px solid var(--line);border-radius:6px"><option value="">Teacher…</option>${options((slot.subject ? teachersFor(slot.subject) : staff).map((x) => [x.id, x.name]), slot.teacherId)}</select></div>`;
        }).join("")}</div>`).join("")}`,
        onSubmit: async (f) => {
          const days = {};
          DAYS.forEach((d) => { days[d] = PERIODS.map((_, i) => ({ subject: f.querySelector(`[data-d="${d}"][data-i="${i}"][data-k=subject]`).value, teacherId: f.querySelector(`[data-d="${d}"][data-i="${i}"][data-k=teacherId]`).value })); });
          await store.set("timetable", classId, { classId, days });
          toast("Timetable saved"); tt({ el, params });
        }
      });
      $$("select[data-k=subject]").forEach((s) => s.addEventListener("change", () => {
        const tsel = s.parentElement.querySelector("[data-k=teacherId]"); const list = teachersFor(s.value);
        tsel.innerHTML = `<option value="">Teacher…</option>` + options(list.map((x) => [x.id, x.name]), list[0]?.id);
      }));
    };
  };
}
