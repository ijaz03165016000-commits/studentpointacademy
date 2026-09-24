/* Shared UI helpers for all portals */
import { grade as gradeOf } from "./school.js";

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- dates & numbers ---------- */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const iso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const today = () => iso(new Date());
export function fmtDate(s, withYear = true) {
  if (!s) return "—";
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return withYear ? `${d} ${MON[m - 1]} ${y}` : `${d} ${MON[m - 1]}`;
}
export function fmtMonth(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en", { month: "long" }) + " " + y;
}
export function fmtTime(isoStr) {
  const d = new Date(isoStr);
  const same = iso(d) === today();
  return (same ? "Today" : fmtDate(iso(d), false)) + ", " + d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}
export const dayBox = (s) => { const [, m, d] = String(s).split("-").map(Number); return `<div class="datebox"><b>${d}</b><span>${MON[m - 1]}</span></div>`; };
export const money = (n) => "Rs. " + Number(n || 0).toLocaleString("en-PK");
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const dayName = (d = new Date()) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
export function initials(name) {
  const w = String(name || "?").replace(/\(.*?\)/g, "").replace(/^((Prof|Dr|Mr|Ms|Mrs|Miss)\.?|Hafiz)\s+/gi, "").replace(/^(Dr\.?)\s+/i, "").split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] || "?") + (w.length > 1 ? w.at(-1)[0] : "")).toUpperCase();
}

/* ---------- icons (Material-style paths) ---------- */
const P = {
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  calendar: "M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V9h14zM7 11h5v5H7z",
  check: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z",
  checklist: "M22 7h-9v2h9zm0 8h-9v2h9zM5.54 11 2 7.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41zm0 8L2 15.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41z",
  chart: "M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z",
  book: "M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12z",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7z",
  money: "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z",
  bell: "M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1z",
  mail: "M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z",
  chat: "M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM6 9h12v2H6zm8 5H6v-2h8zm4-6H6V6h12z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  users: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  school: "M5 13.18v4L12 21l7-3.82v-4L12 17zM12 3 1 9l11 6 9-4.91V17h2V9z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z",
  leave: "M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.95 8.95 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z",
  star: "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  settings: "M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.59-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54A.48.48 0 0 0 13.93 2h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.59.22L2.73 8.47a.49.49 0 0 0 .12.61l2.03 1.58a7.3 7.3 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z",
  web: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14a8.2 8.2 0 0 1 0-4h3.38a16.5 16.5 0 0 0 0 4zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 0 1 5.08 16zm2.95-8H5.08a7.99 7.99 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66a14.7 14.7 0 0 1 0-4h4.68a14.7 14.7 0 0 1 0 4zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14a16.5 16.5 0 0 0 0-4h3.38a8.2 8.2 0 0 1 0 4z",
  logout: "M10.09 15.59 11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67zM19 3H5a2 2 0 0 0-2 2v4h2V5h14v14H5v-4H3v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z",
  menu: "M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z",
  print: "M19 8H5a3 3 0 0 0-3 3v6h4v4h12v-4h4v-6a3 3 0 0 0-3-3zm-3 11H8v-5h8zm3-7a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm-1-9H6v4h12z",
  teacher: "M20 17a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H9.46c.35.61.54 1.3.54 2h10v11h-9v2zM15 7v2H9v13H7v-6H5v6H3v-8H1.5V9a2 2 0 0 1 2-2zM8 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  crown: "M5 16 3 5l5.5 5L12 4l3.5 6L21 5l-2 11zm14 3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-1h14z",
  shield: "M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z",
  family: "M16 4a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm4 18v-6h2.5l-2.54-7.63A2 2 0 0 0 18.06 7h-.12a2 2 0 0 0-1.9 1.37l-.86 2.58A3 3 0 0 1 17 13.5V22zM12.5 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5.5 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm2 16v-7H9V9a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6h1.5v7zm6.5 0v-4h1v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4h1v4z",
  plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z",
  search: "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z",
  trophy: "M19 5h-2V3H7v2H5a2 2 0 0 0-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7a2 2 0 0 0-2-2zM5 8V7h2v3.82A3 3 0 0 1 5 8zm14 0a3 3 0 0 1-2 2.82V7h2z"
};
export const icon = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n] || P.star}"/></svg>`;
export const STAR_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${P.star}"/></svg>`;

/* ---------- components ---------- */
export function kpi({ label, value, sub = "", ic = "star", tone = "", href = "" }) {
  const tag = href ? "a" : "div";
  return `<${tag} class="kpi2${tone ? " kpi2--" + tone : ""}"${href ? ` href="${href}"` : ""}>
    <span class="kpi2__icon">${icon(ic)}</span>
    <span><span class="kpi2__num">${value}</span><span class="kpi2__label">${esc(label)}</span>${sub ? `<span class="kpi2__sub">${sub}</span>` : ""}</span>
  </${tag}>`;
}
export const card = (title, body, action = "") =>
  `<section class="card2"><div class="card2__head"><h3>${esc(title)}</h3>${action}</div>${body}</section>`;
export const empty = (msg, ic = "star") => `<div class="empty">${icon(ic)}${esc(msg)}</div>`;
export const pill = (text, tone = "") => `<span class="pill${tone ? " pill--" + tone : ""}">${esc(text)}</span>`;
export const avatar = (name, cls = "") => `<span class="avatar ${cls}" aria-hidden="true">${esc(initials(name))}</span>`;
export const person = (name, sub = "") => `<div class="person">${avatar(name)}<div><b>${esc(name)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div></div>`;
export const gradePill = (g) => `<span class="grade grade--${g}">${g}</span>`;
export const grade = gradeOf;

export function statusPill(s) {
  return ({ paid: pill("Paid", "green"), unpaid: pill("Unpaid", "red"), overdue: pill("Overdue", "red"), pending: pill("Pending", "gold"), approved: pill("Approved", "green"), rejected: pill("Rejected", "red"), P: pill("Present", "green"), A: pill("Absent", "red"), L: pill("Leave", "gold") })[s] || pill(s || "—", "grey");
}

export function bars(rows, { max = 100, suffix = "%", tone = (v) => (v >= 75 ? "green" : v >= 50 ? "" : "red") } = {}) {
  if (!rows.length) return empty("No data yet");
  return `<div class="bars">${rows.map(([label, v]) => {
    const t = typeof tone === "function" ? tone(v) : tone;
    return `<div class="bar"><span class="bar__label" title="${esc(label)}">${esc(label)}</span><span class="bar__track"><span class="bar__fill${t ? " bar__fill--" + t : ""}" style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%"></span></span><span class="bar__val">${v}${suffix}</span></div>`;
  }).join("")}</div>`;
}

export function ring(value, label, color = "var(--green)") {
  const r = 52, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return `<div class="ring" role="img" aria-label="${esc(label)}: ${v}%"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" fill="none" stroke="#EEF1F5" stroke-width="12"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(v / 100) * c} ${c}"/></svg><div class="ring__txt"><span><b>${v}%</b><span>${esc(label)}</span></span></div></div>`;
}

/* simple line chart: points = [[label, value 0-100], ...] */
export function lineChart(points, { h = 150 } = {}) {
  if (points.length < 2) return empty("Not enough results yet to show a trend", "chart");
  const w = 520, pad = 28, step = (w - pad * 2) / (points.length - 1);
  const y = (v) => h - 24 - (v / 100) * (h - 44);
  const xy = points.map(([, v], i) => [pad + i * step, y(v)]);
  const line = xy.map(([x, yy], i) => `${i ? "L" : "M"}${x.toFixed(1)},${yy.toFixed(1)}`).join("");
  const area = line + `L${xy.at(-1)[0]},${h - 24}L${pad},${h - 24}Z`;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="Result trend">
    ${[0, 50, 100].map((g) => `<line x1="${pad}" x2="${w - pad}" y1="${y(g)}" y2="${y(g)}" stroke="#EEF1F5"/>`).join("")}
    <path d="${area}" fill="rgba(245,158,11,.14)"/><path d="${line}" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linejoin="round"/>
    ${xy.map(([x, yy], i) => `<circle cx="${x}" cy="${yy}" r="4.5" fill="#fff" stroke="#2563EB" stroke-width="2.5"/><text x="${x}" y="${yy - 10}" text-anchor="middle" style="fill:#1E3A8A;font-weight:700">${points[i][1]}%</text><text x="${x}" y="${h - 6}" text-anchor="middle">${esc(points[i][0])}</text>`).join("")}
  </svg>`;
}

/* ---------- feedback ---------- */
export function toast(msg, isErr = false) {
  let t = $("#toast2");
  if (!t) { t = document.createElement("div"); t.id = "toast2"; t.className = "toast2"; t.setAttribute("role", "status"); document.body.append(t); }
  t.textContent = msg; t.classList.toggle("is-err", isErr); t.classList.add("is-on");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("is-on"), 2800);
}

/* Two-step confirm for destructive buttons */
export function armed(btn, action, label = "Click again to confirm") {
  if (btn.dataset.armed) { delete btn.dataset.armed; action(); return; }
  const old = btn.textContent; btn.dataset.armed = "1"; btn.textContent = label;
  setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = old; } }, 4000);
}

/* Modal dialog. body is HTML; onSubmit(form) may throw to show an error. */
export function dialog({ title, body, submit = "Save", onSubmit, wide = false }) {
  const d = document.createElement("dialog");
  d.className = "dlg";
  if (wide) d.style.width = "min(860px, calc(100vw - 32px))";
  d.innerHTML = `<form method="dialog" novalidate>
    <div class="dlg__head"><h2>${esc(title)}</h2><button type="button" class="dlg__close" aria-label="Close">×</button></div>
    <div class="dlg__body">${body}<div class="form-status" role="alert" style="margin-top:14px"></div></div>
    ${onSubmit ? `<div class="dlg__foot"><button type="button" class="btn btn--outline btn--sm" data-cancel>Cancel</button><button class="btn btn--navy btn--sm" type="submit">${esc(submit)}</button></div>` : ""}
  </form>`;
  document.body.append(d);
  const close = () => { d.close(); d.remove(); };
  d.querySelector(".dlg__close").onclick = close;
  d.querySelector("[data-cancel]")?.addEventListener("click", close);
  d.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  const form = d.querySelector("form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const st = d.querySelector(".form-status"), btn = d.querySelector("[type=submit]");
    st.className = "form-status";
    const bad = [...form.querySelectorAll("[required]")].find((el) => !String(el.value).trim());
    if (bad) { st.textContent = "Please fill in: " + (form.querySelector(`label[for="${bad.id}"]`)?.textContent || "all required fields"); st.className = "form-status is-err"; bad.focus(); return; }
    btn.disabled = true;
    try { await onSubmit(form); close(); }
    catch (err) { st.textContent = err.message || "Something went wrong."; st.className = "form-status is-err"; btn.disabled = false; }
  });
  d.showModal();
  d.querySelector("input:not([type=hidden]),select,textarea")?.focus();
  return d;
}

export const field = (id, label, input, cls = "") => `<div class="field ${cls}"><label for="${id}">${label}</label>${input}</div>`;
export const options = (list, sel) => list.map((o) => {
  const [v, t] = Array.isArray(o) ? o : [o, o];
  return `<option value="${esc(v)}"${String(v) === String(sel) ? " selected" : ""}>${esc(t)}</option>`;
}).join("");

/* ---------- small data helpers ---------- */
export function attendanceStats(docs, sid) {
  let P = 0, A = 0, L = 0;
  docs.forEach((d) => { const r = d.records?.[sid]; if (r === "P") P++; else if (r === "A") A++; else if (r === "L") L++; });
  const total = P + A + L;
  return { P, A, L, total, pct: total ? Math.round(((P) / total) * 100) : 0 };
}

/* Totals for one student in one exam doc */
export function examResult(exam, sid) {
  let got = 0, max = 0, done = 0;
  const rows = Object.entries(exam.subjects || {}).map(([subject, s]) => {
    const m = s.marks?.[sid];
    const entered = m !== undefined && m !== "";
    if (entered) { done++; max += s.total; if (m !== "AB") got += Number(m); }
    const p = entered && m !== "AB" ? Math.round((m / s.total) * 100) : null;
    return { subject, total: s.total, marks: entered ? m : "—", pct: p, grade: p == null ? (m === "AB" ? "F" : "—") : gradeOf(p) };
  });
  const p = max ? Math.round((got / max) * 1000) / 10 : 0;
  return { rows, got, max, pct: p, grade: max ? gradeOf(p) : "—", complete: done === rows.length && rows.length > 0 };
}

/* Position in class for one exam */
export function classPositions(exam) {
  const sids = new Set();
  Object.values(exam.subjects || {}).forEach((s) => Object.keys(s.marks || {}).forEach((k) => sids.add(k)));
  const list = [...sids].map((sid) => ({ sid, ...examResult(exam, sid) })).sort((a, b) => b.pct - a.pct);
  const pos = {}; list.forEach((r, i) => (pos[r.sid] = i > 0 && r.pct === list[i - 1].pct ? pos[list[i - 1].sid] : i + 1));
  return { list, pos };
}
export const ordinal = (n) => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");

export function feeState(f) {
  if (f.status === "paid") return "paid";
  return f.due && f.due < today() ? "overdue" : "unpaid";
}
