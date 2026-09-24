/* Student Point Academy admin panel
   Works in DEMO MODE (this browser only) until Firebase is set up in
   ../assets/js/config.js — then it reads and writes the live database. */
import * as db from "../assets/js/data.js";
import { ARTICLE_CATEGORIES, ANNOUNCEMENT_CATEGORIES } from "../assets/js/config.js";
import { esc, formatDate, sanitize } from "../assets/js/utils.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const today = () => new Date().toISOString().slice(0, 10);
/* Paths saved in the database are relative to the site root; the admin lives one folder down */
const src = (u) => (!u || /^(https?:|data:|\/)/.test(u) ? u : "../" + u);

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("is-on");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("is-on"), 2600);
}

/* Two-step delete: first click asks, second click (within 4s) confirms */
function confirmClick(btn, action) {
  if (btn.dataset.armed) { action(); return; }
  const label = btn.textContent;
  btn.dataset.armed = "1"; btn.textContent = "Click again to delete";
  setTimeout(() => { delete btn.dataset.armed; btn.textContent = label; }, 4000);
}

/* ================= AUTH ================= */
if (!db.IS_LIVE) {
  $("#login-demo").innerHTML = `<p class="demo-note">Demo mode. Sign in with <strong>demo@spa</strong> and password <strong>demo123</strong>. Changes are saved in this browser only.</p>`;
}
$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.currentTarget, st = $(".form-status", f), btn = $("button[type=submit]", f);
  st.className = "form-status"; btn.disabled = true; btn.textContent = "Signing in…";
  try {
    await db.signIn(f.email.value.trim(), f.password.value);
    if (!db.IS_LIVE) showApp({ email: "demo@spa" });
  } catch (err) {
    st.textContent = db.IS_LIVE ? "Email or password is incorrect." : err.message;
    st.className = "form-status is-err";
  } finally { btn.disabled = false; btn.textContent = "Sign in"; }
});
$("#logout").addEventListener("click", async () => { await db.signOutAdmin(); if (!db.IS_LIVE) showLogin(); });

function showLogin() { $("#app-view").hidden = true; $("#login-view").hidden = false; $("#l-email").focus(); }
let started = false;
function showApp(user) {
  $("#login-view").hidden = true; $("#app-view").hidden = false;
  $("#who").textContent = user.email;
  if (!started) { started = true; init(); }
}

/* ================= NAVIGATION ================= */
function go(view) {
  $$("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== view));
  const navKey = view.replace("-edit", "s");   // article-edit → articles
  $$(".side__nav button").forEach((b) => {
    if (b.dataset.view === navKey) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
  ({ dashboard: loadDashboard, articles: loadArticles, announcements: loadAnnouncements, inquiries: loadInquiries }[view] || (() => {}))();
}

function init() {
  if (!db.IS_LIVE) $("#demo-banner").innerHTML = `<p class="demo-note">Demo mode: changes are stored in this browser only and are visible on the website in this browser. Connect Firebase (see README) to publish for everyone. <button class="linkbtn" id="reset-demo">Reset demo data</button></p>`;
  $("#reset-demo")?.addEventListener("click", () => { db.resetDemo(); toast("Demo data reset"); go("dashboard"); });
  $$(".side__nav button").forEach((b) => b.addEventListener("click", () => go(b.dataset.view)));
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  $$("[data-back]").forEach((b) => b.addEventListener("click", () => go(b.dataset.back)));
  document.addEventListener("click", (e) => {
    const n = e.target.closest("[data-new]"); if (!n) return;
    n.dataset.new === "article" ? editArticle(null) : editAnnouncement(null);
  });
  $("#a-cat").innerHTML = ARTICLE_CATEGORIES.map((c) => `<option>${esc(c)}</option>`).join("");
  $("#n-cat").innerHTML = ANNOUNCEMENT_CATEGORIES.map((c) => `<option>${esc(c)}</option>`).join("");
  go("dashboard");
}

/* ================= DASHBOARD ================= */
async function loadDashboard() {
  try {
    const [arts, anns, inqs] = await Promise.all([db.listArticles({ includeDrafts: true }), db.listAnnouncements({ includeExpired: true }), db.listInquiries()]);
    const pub = arts.filter((a) => a.status === "published").length;
    const active = anns.filter((a) => !db.isExpired(a)).length;
    const fresh = inqs.filter((q) => !q.contacted).length;
    $("#k-art").textContent = pub; $("#k-draft").textContent = `${arts.length - pub} draft${arts.length - pub === 1 ? "" : "s"}`;
    $("#k-ann").textContent = active; $("#k-exp").textContent = `${anns.length - active} expired`;
    $("#k-inq").textContent = inqs.length; $("#k-new").textContent = `${fresh} not handled yet`;
    setBadge(fresh);
    $("#dash-inq").innerHTML = inqs.length
      ? `<div class="table-wrap"><table class="admin-table"><thead><tr><th>Received</th><th>Name</th><th>Phone</th><th>Type</th><th>Details</th></tr></thead><tbody>${inqs.slice(0, 5).map((q) => `<tr><td>${formatDate(q.createdAt)}</td><td>${esc(q.studentName)}</td><td><a href="https://wa.me/${waNum(q.phone)}" target="_blank" rel="noopener">${esc(q.phone)}</a></td><td>${typeChip(q)}</td><td>${esc(classLabel(q))}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="empty">No form entries yet. Demo bookings, fee receipts and join applications from the website appear here.</p>`;
  } catch (e) { toast("Could not load the dashboard. Check your connection."); }
}
function setBadge(n) { const b = $("#new-count"); b.hidden = !n; b.textContent = n; }

/* ================= ARTICLES ================= */
async function loadArticles() {
  const tb = $("#art-rows");
  tb.innerHTML = `<tr class="empty-row"><td colspan="5">Loading…</td></tr>`;
  const list = await db.listArticles({ includeDrafts: true });
  tb.innerHTML = list.length ? list.map((a) => `
    <tr>
      <td>${esc(a.title)}</td><td>${esc(a.category)}</td><td>${formatDate(a.date)}</td>
      <td><span class="status ${a.status === "published" ? "status--pub" : "status--draft"}">${a.status === "published" ? "Published" : "Draft"}</span></td>
      <td class="actions">
        ${a.status === "published" ? `<a class="linkbtn" href="../article.html?id=${encodeURIComponent(a.id)}" target="_blank" rel="noopener">View</a>` : ""}
        <button class="linkbtn" data-edit="${esc(a.id)}">Edit</button>
        <button class="linkbtn linkbtn--danger" data-del="${esc(a.id)}">Delete</button>
      </td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="5">No articles yet. Click “New article” to write the first one.</td></tr>`;
  $$("[data-edit]", tb).forEach((b) => b.addEventListener("click", () => editArticle(list.find((a) => a.id === b.dataset.edit))));
  $$("[data-del]", tb).forEach((b) => b.addEventListener("click", () => confirmClick(b, async () => {
    await db.deleteArticle(b.dataset.del); toast("Article deleted"); loadArticles();
  })));
}

let editingArticle = null, coverUrl = "";
const af = $("#article-form"), rte = $("#a-content");

function editArticle(a) {
  editingArticle = a;
  $("#ae-title").textContent = a ? "Edit article" : "New article";
  af.reset(); $$(".has-error", af).forEach((x) => x.classList.remove("has-error"));
  $(".form-status", af).className = "form-status";
  af.title.value = a?.title || "";
  af.excerpt.value = a?.excerpt || "";
  af.status.value = a?.status || "published";
  af.category.value = a?.category || ARTICLE_CATEGORIES[0];
  af.author.value = a?.author || "";
  af.date.value = (a?.date || today()).slice(0, 10);
  rte.innerHTML = a ? sanitize(a.content) : "";
  setCover(a?.cover || "");
  go("article-edit");
  af.title.focus();
}
function setCover(u) {
  coverUrl = u;
  const img = $("#a-cover-prev");
  img.hidden = !u; if (u) img.src = src(u);
  $("#a-cover-remove").hidden = !u;
}
$("#a-cover-remove").addEventListener("click", () => { setCover(""); $("#a-cover").value = ""; });
$("#a-cover").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { toast("Uploading cover…"); setCover(await db.uploadFile(f, "covers")); toast("Cover uploaded"); }
  catch (err) { toast(err.message); e.target.value = ""; }
});

/* Rich-text toolbar */
$$(".rte-bar button").forEach((b) => b.addEventListener("mousedown", (e) => e.preventDefault()));
$$(".rte-bar button").forEach((b) => b.addEventListener("click", () => {
  rte.focus();
  const cmd = b.dataset.cmd;
  if (cmd === "link") {
    const url = prompt("Link address (https://…)");
    if (url && /^https?:\/\//i.test(url)) document.execCommand("createLink", false, url);
  } else if (cmd === "image") {
    $("#rte-img").click();
  } else document.execCommand(cmd, false, b.dataset.val ? `<${b.dataset.val}>` : null);
}));
$("#rte-img").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    toast("Uploading image…");
    const url = await db.uploadFile(f, "article-images");
    rte.focus(); document.execCommand("insertHTML", false, `<img src="${esc(url)}" alt="">`);
    toast("Image added");
  } catch (err) { toast(err.message); }
  e.target.value = "";
});
rte.addEventListener("paste", (e) => {   // paste as clean text, keeping line breaks as paragraphs
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData("text/plain");
  const html = text.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  document.execCommand("insertHTML", false, html);
});

af.addEventListener("submit", async (e) => {
  e.preventDefault();
  const st = $(".form-status", af); st.className = "form-status";
  const content = sanitize(rte.innerHTML).trim();
  const okTitle = af.title.value.trim().length > 0;
  const okBody = rte.textContent.trim().length > 0;
  af.title.closest(".field").classList.toggle("has-error", !okTitle);
  rte.closest(".field").classList.toggle("has-error", !okBody);
  if (!okTitle || !okBody) { (okTitle ? rte : af.title).focus(); return; }
  const btn = $("button[type=submit]", af); btn.disabled = true; btn.textContent = "Saving…";
  try {
    const id = await db.saveArticle({
      id: editingArticle?.id,
      title: af.title.value.trim(), excerpt: af.excerpt.value.trim(), content,
      category: af.category.value, author: af.author.value.trim() || "Student Point Academy",
      date: af.date.value || today(), status: af.status.value, cover: coverUrl
    });
    toast(af.status.value === "published" ? "Article published" : "Draft saved");
    editingArticle = { id }; go("articles");
  } catch (err) {
    st.textContent = err.message || "Could not save. Check your connection and try again."; st.className = "form-status is-err";
  } finally { btn.disabled = false; btn.textContent = "Save article"; }
});

/* ================= ANNOUNCEMENTS ================= */
async function loadAnnouncements() {
  const tb = $("#ann-rows");
  tb.innerHTML = `<tr class="empty-row"><td colspan="5">Loading…</td></tr>`;
  const list = await db.listAnnouncements({ includeExpired: true });
  tb.innerHTML = list.length ? list.map((a) => {
    const tags = [
      db.isExpired(a) ? `<span class="status status--exp">Expired</span>` : `<span class="status status--pub">Live</span>`,
      a.urgent ? `<span class="status status--urgent">Urgent</span>` : "",
      a.pinned ? `<span class="status status--pin">Pinned</span>` : ""
    ].join(" ");
    return `<tr>
      <td>${esc(a.title)}${a.expires ? `<div class="small muted" style="font-weight:400">Hides after ${formatDate(a.expires)}</div>` : ""}</td>
      <td>${esc(a.category)}</td><td>${formatDate(a.date)}</td><td>${tags}</td>
      <td class="actions"><button class="linkbtn" data-edit="${esc(a.id)}">Edit</button><button class="linkbtn linkbtn--danger" data-del="${esc(a.id)}">Delete</button></td>
    </tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="5">No announcements yet. Click “New announcement” to post one.</td></tr>`;
  $$("[data-edit]", tb).forEach((b) => b.addEventListener("click", () => editAnnouncement(list.find((a) => a.id === b.dataset.edit))));
  $$("[data-del]", tb).forEach((b) => b.addEventListener("click", () => confirmClick(b, async () => {
    await db.deleteAnnouncement(b.dataset.del); toast("Announcement deleted"); loadAnnouncements();
  })));
}

let editingAnn = null, attachUrl = "";
const nf = $("#ann-form");
function setAttach(u) {
  attachUrl = u;
  $("#n-file-cur").innerHTML = u ? `Current: <a href="${esc(src(u))}" target="_blank" rel="noopener">open attachment</a>` : "";
  $("#n-file-remove").hidden = !u;
}
$("#n-file-remove").addEventListener("click", () => { setAttach(""); $("#n-file").value = ""; });
$("#n-file").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { toast("Uploading attachment…"); setAttach(await db.uploadFile(f, "attachments")); toast("Attachment uploaded"); }
  catch (err) { toast(err.message); e.target.value = ""; }
});
nf.category.addEventListener("change", () => { if (nf.category.value === "Urgent") nf.urgent.checked = true; });

function editAnnouncement(a) {
  editingAnn = a;
  $("#ne-title").textContent = a ? "Edit announcement" : "New announcement";
  nf.reset(); $$(".has-error", nf).forEach((x) => x.classList.remove("has-error"));
  $(".form-status", nf).className = "form-status";
  nf.title.value = a?.title || "";
  nf.category.value = a?.category || ANNOUNCEMENT_CATEGORIES[0];
  nf.date.value = (a?.date || today()).slice(0, 10);
  nf.description.value = a?.description || "";
  nf.expires.value = a?.expires || "";
  nf.urgent.checked = !!a?.urgent; nf.pinned.checked = !!a?.pinned;
  setAttach(a?.attachment || "");
  go("announcement-edit");
  nf.title.focus();
}

nf.addEventListener("submit", async (e) => {
  e.preventDefault();
  const st = $(".form-status", nf); st.className = "form-status";
  const checks = {
    title: nf.title.value.trim().length > 0,
    description: nf.description.value.trim().length > 0,
    expires: !nf.expires.value || nf.expires.value >= nf.date.value
  };
  Object.entries(checks).forEach(([k, ok]) => nf[k].closest(".field").classList.toggle("has-error", !ok));
  const bad = Object.keys(checks).find((k) => !checks[k]);
  if (bad) { nf[bad].focus(); return; }
  const btn = $("button[type=submit]", nf); btn.disabled = true; btn.textContent = "Saving…";
  try {
    await db.saveAnnouncement({
      id: editingAnn?.id,
      title: nf.title.value.trim(), category: nf.category.value, date: nf.date.value || today(),
      description: nf.description.value.trim(), expires: nf.expires.value,
      urgent: nf.urgent.checked || nf.category.value === "Urgent", pinned: nf.pinned.checked,
      attachment: attachUrl
    });
    toast("Announcement saved"); go("announcements");
  } catch (err) {
    st.textContent = err.message || "Could not save. Check your connection and try again."; st.className = "form-status is-err";
  } finally { btn.disabled = false; btn.textContent = "Save announcement"; }
});

/* ================= FORM ENTRIES =================
   type: "demo" (free demo booking) | "payment" (Easypaisa receipt) | "application" (Join Us) */
let inqs = [], inqFilter = "all";
const TYPES = { demo: ["Demo booking", "status--pub"], payment: ["Fee payment", "status--pin"], application: ["Join application", "status--draft"] };
const typeChip = (q) => { const t = TYPES[q.type] || [q.type || "Entry", "status--draft"]; return `<span class="status ${t[1]}">${esc(t[0])}</span>`; };
const waNum = (p) => { const d = String(p || "").replace(/\D/g, ""); return d.startsWith("92") ? d : d.startsWith("0092") ? d.slice(2) : "92" + d.replace(/^0/, ""); };
function classLabel(q) {
  if (q.type === "payment") return `Rs. ${q.amount || "?"} · ${q.feeFor || "Fee"}${q.feeMonth ? " (" + q.feeMonth + ")" : ""}`;
  if (q.type === "application") return `${q.role || "Application"}${q.subject ? " · " + q.subject : ""}`;
  return [q.subject, q.classGrade, q.age && "Age " + q.age].filter(Boolean).join(" · ") || "Demo class";
}
function details(q) {
  const rows = {
    demo: [["Parent", q.parentName], ["Slot", q.slot], ["Mode", q.mode], ["Curriculum", q.curriculum]],
    payment: [["Class / course", q.classGrade], ["TID", q.tid], ["Father / guardian", q.parentName]],
    application: [["City", q.city], ["Institute", q.institute], ["Program", q.program], ["University", q.university], ["Duration", q.duration], ["Qualification", q.qualification], ["Experience", q.experience], ["Mode", q.mode], ["Curriculum", q.curriculum], ["Slots", q.slot]]
  }[q.type] || [];
  return rows.filter((r) => r[1]).map(([k, v]) => `<div class="small muted">${k}: ${esc(v)}</div>`).join("");
}

$("#inq-filter").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  inqFilter = b.dataset.f;
  $$("#inq-filter button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  renderInquiries();
});

async function loadInquiries() {
  $("#inq-rows").innerHTML = `<tr class="empty-row"><td colspan="7">Loading…</td></tr>`;
  inqs = await db.listInquiries();
  setBadge(inqs.filter((q) => !q.contacted).length);
  renderInquiries();
}
function renderInquiries() {
  const tb = $("#inq-rows");
  const list = inqs.filter((q) => inqFilter === "all" || (inqFilter === "new" ? !q.contacted : q.type === inqFilter));
  tb.innerHTML = list.length ? list.map((q) => {
    const fileLabel = q.type === "payment" ? "View receipt" : "View CV";
    const file = q.file ? `<div><button class="linkbtn" data-file="${esc(q.id)}">${fileLabel}</button></div>`
      : q.fileError ? `<div class="small" style="color:var(--red)">File not saved: ${esc(q.fileError)}</div>` : "";
    return `<tr class="${q.contacted ? "row-done" : ""}">
      <td>${formatDate(q.createdAt)}<div style="margin-top:6px">${typeChip(q)}</div></td>
      <td>${esc(q.studentName)}${q.parentName && q.type !== "payment" ? `<div class="small muted" style="font-weight:400">c/o ${esc(q.parentName)}</div>` : ""}</td>
      <td><a href="https://wa.me/${waNum(q.phone)}" target="_blank" rel="noopener">${esc(q.phone)}</a>${q.email ? `<div class="small">${esc(q.email)}</div>` : ""}</td>
      <td><strong>${esc(classLabel(q))}</strong>${details(q)}</td>
      <td class="msg">${esc(q.message || (q.file ? "" : "—"))}${file}</td>
      <td><label class="check"><input type="checkbox" data-done="${esc(q.id)}" ${q.contacted ? "checked" : ""}><span class="sr-only">Mark as handled</span></label></td>
      <td class="actions"><button class="linkbtn linkbtn--danger" data-del="${esc(q.id)}">Delete</button></td>
    </tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="7">${inqs.length ? "No entries match this filter." : "No form entries yet. Demo bookings, fee receipts and join applications from the website appear here."}</td></tr>`;
  $$("[data-file]", tb).forEach((b) => b.addEventListener("click", async () => {
    const q = inqs.find((x) => x.id === b.dataset.file);
    const w = window.open("", "_blank");
    try {
      const url = await db.fileUrl(q.file);
      if (/^data:/.test(url)) {   // demo mode: data URLs can't be opened directly in a new tab
        const isPdf = url.startsWith("data:application/pdf");
        w.document.write(isPdf ? `<iframe src="${url}" style="border:0;width:100%;height:100vh"></iframe>` : `<img src="${url}" style="max-width:100%">`);
      } else w.location = url;
    } catch { w?.close(); toast("Could not open the file."); }
  }));
  $$("[data-done]", tb).forEach((c) => c.addEventListener("change", async () => {
    await db.updateInquiry(c.dataset.done, { contacted: c.checked });
    inqs.find((q) => q.id === c.dataset.done).contacted = c.checked;
    setBadge(inqs.filter((q) => !q.contacted).length);
    renderInquiries(); toast(c.checked ? "Marked as handled" : "Marked as not handled");
  }));
  $$("[data-del]", tb).forEach((b) => b.addEventListener("click", () => confirmClick(b, async () => {
    await db.deleteInquiry(b.dataset.del); toast("Entry deleted"); loadInquiries();
  })));
}

$("#csv").addEventListener("click", () => {
  const list = inqs.filter((q) => inqFilter === "all" || (inqFilter === "new" ? !q.contacted : q.type === inqFilter));
  if (!list.length) { toast("No entries to export"); return; }
  const cols = [["createdAt", "Received"], ["type", "Type"], ["studentName", "Name"], ["parentName", "Parent / guardian"], ["phone", "Phone"], ["email", "Email"],
    ["age", "Age"], ["classGrade", "Class / course"], ["subject", "Subject / skills"], ["slot", "Slot"], ["mode", "Mode"], ["curriculum", "Curriculum"],
    ["amount", "Amount (Rs.)"], ["tid", "Transaction ID"], ["feeFor", "Fee for"], ["feeMonth", "Fee month"],
    ["role", "Join as"], ["city", "City"], ["institute", "Institute"], ["program", "Program"], ["university", "University"], ["duration", "Duration"],
    ["qualification", "Qualification"], ["experience", "Experience"], ["message", "Message"], ["contacted", "Handled"]];
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [cols.map((c) => cell(c[1])).join(",")].concat(list.map((q) => cols.map(([k]) => cell(k === "contacted" ? (q[k] ? "Yes" : "No") : k === "type" ? (TYPES[q.type]?.[0] || q.type) : q[k])).join(",")));
  const blob = new Blob(["﻿" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `spa-form-entries-${today()}.csv` });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  toast("CSV downloaded");
});

/* Start once everything above is defined */
db.onAdminAuth((u) => (u ? showApp(u) : showLogin()));
