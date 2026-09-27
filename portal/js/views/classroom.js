/* ==========================================================
   Online Classroom
   • Student: tasks from teachers (homework, Dua & Qirat, lessons),
     submit work as photos / PDF / voice note, see feedback,
     voice chat with teachers.
   • Tutor: post tasks with files and a voice recording, check
     submissions, give written / voice feedback, voice chat.
   • Admin: website enrolments (Rs. offer) and the offer itself.
   Database: classPosts, classWork, classChat, classroomEnrollments,
   settings/classroomOffer
   ========================================================== */
import * as store from "../store.js";
import { CLASSES, CLASSROOM, classById, className, classroomKind } from "../school.js";
import { $, $$, esc, icon, kpi, card, empty, pill, person, avatar, toast, dialog, field, options, armed, fmtDate, fmtTime, today, money } from "../ui.js";
import { getOffer, bandFor, priceFor, countdown, attachBox, wireAttach, voiceBox, wireVoice, uploadBundle, audioPlayer, filesView, stars } from "../classroom-kit.js";
import { payPanel, wireForm, approve as approvePayment, plansFor, tierName } from "./subscribe.js";

export const isOnline = (u) => u?.plan === "classroom";
const plusIc = icon("plus").replace("<svg", '<svg width="18" height="18" fill="currentColor"');
const byNew = (k) => (a, b) => String(b[k] || "").localeCompare(String(a[k] || ""));
const shortClass = (id) => { const c = classById(id); return !c ? id : /^\d+$/.test(c.id) ? "Class " + c.id : c.id === "PG" ? "Play Group" : c.name; };

function workPill(post, w) {
  if (post.kind === "lesson" && !w) return pill("Lesson", "grey");
  if (!w) return post.due && post.due < today() ? pill("Late — not submitted", "red") : pill("To do", "gold");
  return { submitted: pill("Submitted", "grey"), reviewed: pill("Checked ✓", "green"), redo: pill("Redo", "red") }[w.status] || pill(w.status, "grey");
}
const tierPill = (st) => st?.onlineTier ? pill(tierName(st.onlineTier), st.onlineTier === "diamond" ? "green" : "gold") + " " : "";
const kindPill = (k) => `<span class="kind kind--${esc(k)}">${icon(classroomKind(k).icon)}${esc(classroomKind(k).label)}</span>`;

function feedbackBlock(w) {
  const fb = w?.feedback; if (!fb) return "";
  return `<div class="feedback">
    <div class="feedback__head">${avatar(fb.by || "T", "avatar--gold")}<div><b>${esc(fb.by || "Teacher")}</b><span class="muted small">${fb.at ? fmtTime(fb.at) : ""}</span></div>${stars(fb.stars)}</div>
    ${fb.text ? `<p class="feedback__text">${esc(fb.text)}</p>` : ""}
    ${audioPlayer(fb.audio, "Teacher's voice feedback")}
    ${filesView(fb.files)}
  </div>`;
}
function postBody(p) {
  return `${p.text ? `<p class="post__text">${esc(p.text)}</p>` : ""}${p.arabic ? `<p class="arabic" lang="ar" dir="rtl">${esc(p.arabic)}</p>` : ""}${audioPlayer(p.audio, p.kind === "dua" ? "Listen to the teacher's recitation" : "Teacher's voice note")}${filesView(p.files)}`;
}

/* ==========================================================
   Upgrade page (student not on the classroom plan)
   ========================================================== */
async function upgradePage({ el, user }) {
  const offer = await getOffer();
  const mine = (await store.list("subscriptions", { userId: user.id })).filter((s) => s.plan === "classroom" && s.status === "pending");
  const eligible = offer.classes.includes(user.classId);
  const perks = `<ul class="perks">${offer.perks.map((p) => `<li>${icon("check")}${esc(p)}</li>`).join("")}</ul>`;
  if (mine.length) {
    el.innerHTML = `<div class="paywall"><div class="paywall__card" style="text-align:center"><div class="paywall__badge paywall__badge--wait">${icon("clock")}</div>
      <h2>Your Online Classroom payment is being checked</h2><p class="muted">TID <b>${esc(mine[0].tid)}</b> · ${money(mine[0].amount)}. The classroom opens here as soon as the office approves it.</p>
      <button class="btn btn--navy" onclick="location.reload()">Check again</button></div></div>`;
    return;
  }
  const plans = (await plansFor(user)).filter((p) => p.plan === "classroom");
  const band = bandFor(offer, user.classId);
  const cd = countdown(offer.endsOn);
  el.innerHTML = `<div class="paywall"><div class="paywall__card">
    <div class="offer-hero">
      <span class="offer-hero__badge">${esc(offer.badge || "Special offer")}</span>
      <h2>${esc(offer.title)}</h2>
      <p>${esc(offer.tagline)}</p>
      ${band ? `<div class="offer-hero__price"><span>${esc(band.label)}: from</span><b>${money(Math.min(...Object.values(band.prices).filter(Boolean)))}</b><span>/ month</span></div>` : ""}
      ${offer.demo ? `<p class="offer-hero__cd">🎁 ${esc(offer.demo)}</p>` : ""}
      ${cd ? `<p class="offer-hero__cd">⏳ Offer ends in <b data-cd>${esc(cd.text)}</b></p>` : ""}
      ${offer.seatsLeft !== null ? `<p class="offer-hero__cd">🔥 Only <b>${offer.seatsLeft}</b> seats left</p>` : ""}
    </div>
    ${!eligible || !plans.length ? `<p class="form-status is-err" style="display:block">The Online Classroom is for Play Group to Intermediate, GCSE, O &amp; A Level. Your class (${esc(className(user.classId))}) is not included — contact the academy office.</p>`
      : !offer.open ? `<p class="form-status is-err" style="display:block">This offer is closed right now${offer.expired ? " (it ended on " + fmtDate(offer.endsOn) + ")" : offer.full ? " (all seats are taken)" : ""}. Ask the academy office about the next batch.</p>`
      : `<div class="paywall__grid"><div><h3>Every package includes</h3>${perks}</div><div>${payPanel(plans, "classroom-gold", false, { form: false })}</div></div>
         <h3 style="margin-top:22px">Choose your package and pay</h3>${payPanel(plans, "classroom-gold", false, { box: false })}
         <p class="muted small">Your current portal time continues; the classroom days are added on top once the payment is verified.</p>`}
  </div></div>`;
  if (eligible && offer.open && plans.length) wireForm(user, () => upgradePage({ el, user }), plans);
  tickCountdown(el, offer.endsOn);
}
function tickCountdown(el, endsOn) {
  const n = $("[data-cd]", el); if (!n) return;
  const t = setInterval(() => { if (!document.body.contains(n)) return clearInterval(t); const c = countdown(endsOn); n.textContent = c ? c.text : "ended"; }, 1000);
}

/* ==========================================================
   STUDENT
   ========================================================== */
export function studentClassroom() {
  async function classroom({ el, user, params }) {
    if (!isOnline(user)) return upgradePage({ el, user });
    const sid = user.linkId;
    const [posts, work, chat] = await Promise.all([store.list("classPosts", { classId: user.classId }), store.list("classWork", { studentId: sid }), store.list("classChat", { studentId: sid })]);
    posts.sort(byNew("createdAt"));
    const wBy = Object.fromEntries(work.map((w) => [w.postId, w]));
    const tab = ["all", "homework", "dua", "lesson"].includes(params.tab) ? params.tab : "all";
    const list = posts.filter((p) => tab === "all" || p.kind === tab);
    const todo = posts.filter((p) => p.kind !== "lesson" && (!wBy[p.id] || wBy[p.id].status === "redo"));
    const checked = work.filter((w) => w.status === "reviewed");
    const newFb = checked.filter((w) => !w.seen).length;
    const unread = chat.filter((m) => m.from === "staff" && !m.read).length;
    el.innerHTML = `
    <div class="hello hello--class"><div><h2>Online Classroom</h2><p>${esc(className(user.classId))} · Upload your work, listen to lessons and talk to your teachers.</p></div>
      <a class="btn btn--gold" href="#/cchat">🎤 Voice chat with teacher${unread ? ` (${unread})` : ""}</a>
      <svg class="hello__star" viewBox="0 0 24 24"><path d="M12 3 1 9l11 6 9-4.91V17h2V9zM5 13.18v4L12 21l7-3.82v-4L12 17z"/></svg></div>
    <div class="grid grid--kpi">
      ${kpi({ label: "To do", value: todo.length, sub: "Homework & Dua practice", ic: "book", tone: todo.length ? "gold" : "green" })}
      ${kpi({ label: "Checked by teacher", value: checked.length, sub: newFb ? `${newFb} new feedback` : "All seen", ic: "check", tone: newFb ? "gold" : "green" })}
      ${kpi({ label: "Dua & Qirat lessons", value: posts.filter((p) => p.kind === "dua").length, sub: "Listen and practise", ic: "star", href: "#/classroom?tab=dua" })}
      ${kpi({ label: "Messages", value: unread, sub: "Unread from teachers", ic: "chat", tone: unread ? "gold" : "", href: "#/cchat" })}
    </div>
    <div class="tabs" role="group" aria-label="Show">${[["all", "All"], ["homework", "Homework"], ["dua", "Dua & Qirat"], ["lesson", "Lessons"]].map(([k, l]) => `<button type="button" data-tab="${k}" aria-pressed="${k === tab}">${l}</button>`).join("")}</div>
    ${list.length ? `<div class="posts">${list.map((p) => { const w = wBy[p.id]; return `<a class="post-card" href="#/task?id=${encodeURIComponent(p.id)}">
      <div class="post-card__top">${kindPill(p.kind)}${workPill(p, w)}${w?.status === "reviewed" && !w.seen ? pill("New feedback", "gold") : ""}</div>
      <b class="post-card__title">${esc(p.title)}</b>
      <span class="post-card__meta">${esc(p.subject || "")}${p.subject ? " · " : ""}${esc(p.teacherName || "")} · ${fmtDate(p.createdAt?.slice(0, 10), false)}${p.due ? ` · due ${fmtDate(p.due, false)}` : ""}</span>
      <span class="post-card__icons">${p.audio ? "🎧 voice" : ""}${p.files?.length ? ` 📎 ${p.files.length}` : ""}${w?.feedback?.stars ? " " + stars(w.feedback.stars) : ""}</span>
    </a>`; }).join("")}</div>` : card("Nothing here yet", empty(tab === "dua" ? "Your teacher hasn't posted a Dua lesson yet." : "Your teachers haven't posted anything yet. Check back soon.", "book"))}`;
    $$("[data-tab]").forEach((b) => (b.onclick = () => (location.hash = "#/classroom?tab=" + b.dataset.tab)));
  }

  async function task({ el, user, params, title, refreshCounts }) {
    if (!isOnline(user)) return upgradePage({ el, user });
    const sid = user.linkId;
    const p = await store.get("classPosts", params.id);
    if (!p || p.classId !== user.classId) { el.innerHTML = card("Not found", empty("This task was removed by the teacher.")); return; }
    title(p.title);
    const w = (await store.list("classWork", { studentId: sid })).find((x) => x.postId === p.id);
    if (w?.status === "reviewed" && !w.seen) { store.update("classWork", w.id, { seen: true }).then(refreshCounts).catch(() => {}); }
    const canSubmit = p.kind !== "lesson" && (!w || w.status !== "reviewed");
    const isDua = p.kind === "dua";
    el.innerHTML = `<p><a href="#/classroom" class="linkbtn">← Back to classroom</a></p>
    <div class="grid grid--main">
      <div>
        ${card(esc(p.title), `<div class="post__meta">${kindPill(p.kind)} ${esc(p.subject || "")} · ${esc(p.teacherName || "")} · posted ${fmtDate(p.createdAt?.slice(0, 10))}${p.due ? ` · <b>due ${fmtDate(p.due)}</b>` : ""}</div>${postBody(p)}`)}
        ${w ? card("My submission", `<div class="post__meta">${workPill(p, w)} Sent ${fmtTime(w.submittedAt)}</div>${w.text ? `<p class="post__text">${esc(w.text)}</p>` : ""}${audioPlayer(w.audio, isDua ? "My recitation" : "My voice note")}${filesView(w.files)}`) : ""}
        ${w?.feedback ? card(w.status === "redo" ? "Teacher asked you to do it again" : "Teacher's feedback", feedbackBlock(w)) : ""}
      </div>
      <div>${canSubmit ? card(w ? (w.status === "redo" ? "Send it again" : "Update my submission") : isDua ? "Send my recitation" : "Submit my homework", `
        <form class="form form--1" id="subw" novalidate>
          ${isDua ? `<p class="muted small" style="margin:0">Listen to the teacher, practise, then record yourself reciting. Speak clearly, close to the phone.</p>` : ""}
          <div class="full"><div class="field__label">${isDua ? "Record your recitation" : "Voice note (optional)"}</div>${voiceBox("vw", { label: isDua ? "Record recitation" : "Record voice note" })}</div>
          <div class="full"><div class="field__label">Photos / PDF of your work${isDua ? " (optional)" : ""}</div>${attachBox("aw", { label: "Add photos or PDF" })}</div>
          ${field("tw", "Message for the teacher (optional)", `<textarea id="tw" name="text" maxlength="800" placeholder="e.g. I found Q4 difficult">${esc(w?.status === "redo" ? "" : w?.text || "")}</textarea>`, "full")}
          <div class="form-status full" role="alert"></div>
          <div class="full"><button class="btn btn--gold" type="submit">${w ? "Send again" : "Submit to teacher"}</button></div>
        </form>`) : p.kind === "lesson" ? card("Questions?", `<p class="muted">Ask ${esc(p.teacherName || "your teacher")} by text or voice message.</p><a class="btn btn--navy btn--sm" href="#/cchat?t=${encodeURIComponent(p.teacherId)}">Message teacher</a>`) : card("Done ✓", `<p class="muted">Your teacher has checked this. Well done!</p><a class="btn btn--outline btn--sm" href="#/cchat?t=${encodeURIComponent(p.teacherId)}">Message teacher</a>`)}</div>
    </div>`;
    if (!canSubmit) return;
    const voice = wireVoice(el, "vw"), att = wireAttach(el, "aw");
    $("#subw").onsubmit = async (e) => {
      e.preventDefault();
      const f = e.currentTarget, st = $(".form-status", f), btn = $("[type=submit]", f);
      if (voice.recording()) { st.textContent = "Stop the recording first."; st.className = "form-status full is-err"; return; }
      const files = att.files(), vf = voice.file(), text = f.text.value.trim();
      if (!files.length && !vf && !text) { st.textContent = isDua ? "Record your recitation first." : "Add a photo, PDF, voice note or a message."; st.className = "form-status full is-err"; return; }
      btn.disabled = true; st.className = "form-status full is-ok";
      try {
        const up = await uploadBundle(files, vf, (m) => (st.textContent = m));
        st.textContent = "Saving…";
        const data = { text, files: up.files, audio: up.audio, submittedAt: new Date().toISOString(), status: "submitted" };
        if (w) await store.update("classWork", w.id, data);
        else await store.set("classWork", `${p.id}_${sid}`, { ...data, postId: p.id, classId: p.classId, kind: p.kind, postTitle: p.title, teacherId: p.teacherId, studentId: sid, studentName: user.name });
        toast("Sent to " + (p.teacherName || "your teacher") + " ✓");
        task({ el, user, params, title, refreshCounts });
      } catch (x) { st.textContent = x.message || "Upload failed. Check your internet and try again."; st.className = "form-status full is-err"; btn.disabled = false; }
    };
  }

  async function cchat({ el, user, params, refreshCounts }) {
    if (!isOnline(user)) return upgradePage({ el, user });
    const sid = user.linkId;
    const [staff, msgs] = await Promise.all([store.list("staff"), store.list("classChat", { studentId: sid })]);
    const teachers = staff.filter((t) => (t.classIds || []).includes(user.classId) || t.classTeacherOf === user.classId);
    const contacts = teachers.map((t) => ({ key: t.id, title: t.name, sub: (t.subjects || []).filter((s) => classById(user.classId)?.subjects.includes(s)).join(", ") || t.designation, studentId: sid, teacherId: t.id }));
    return chatPage({ el, params, side: "student", contacts, msgs, keyOf: (m) => m.teacherId, route: "cchat", refreshCounts, again: (p) => cchat({ el, user, params: p, refreshCounts }) });
  }

  return { classroom, task, cchat };
}

export async function studentCounts(user) {
  if (!isOnline(user)) return {};
  const sid = user.linkId;
  const [posts, work, chat] = await Promise.all([store.list("classPosts", { classId: user.classId }), store.list("classWork", { studentId: sid }), store.list("classChat", { studentId: sid })]);
  const done = new Set(work.filter((w) => w.status !== "redo").map((w) => w.postId));
  return { classroom: posts.filter((p) => p.kind !== "lesson" && !done.has(p.id)).length + work.filter((w) => w.status === "reviewed" && !w.seen).length, cchat: chat.filter((m) => m.from === "staff" && !m.read).length };
}

/* ==========================================================
   Voice chat (student ↔ teacher) — text, voice notes, files
   ========================================================== */
async function chatPage({ el, params, side, contacts, msgs, keyOf, route, refreshCounts, again }) {
  const threads = {};
  msgs.forEach((m) => (threads[keyOf(m)] ||= []).push(m));
  Object.values(threads).forEach((t) => t.sort((a, b) => a.at.localeCompare(b.at)));
  const last = (k) => threads[k]?.at(-1);
  contacts.sort((a, b) => String(last(b.key)?.at || "").localeCompare(String(last(a.key)?.at || "")));
  if (!contacts.length) { el.innerHTML = card("Voice chat", empty(side === "staff" ? "No online-classroom students in your classes yet." : "No teachers are assigned to your class yet.", "chat")); return; }
  const active = contacts.find((c) => c.key === params.t) || contacts[0];
  const thread = threads[active.key] || [];
  const unread = (k) => (threads[k] || []).filter((m) => !m.read && m.from !== side).length;
  const preview = (m) => !m ? "" : m.text || (m.audio ? "🎤 Voice message" : m.files?.length ? "📎 File" : "");
  el.innerHTML = `<div class="chat chat--voice">
    <div class="chat__list" role="list">${contacts.map((c) => `<button type="button" role="listitem" data-t="${esc(c.key)}" aria-current="${c.key === active.key}">${avatar(c.title)}<span style="min-width:0;flex:1"><b>${esc(c.title)}</b><span>${esc(preview(last(c.key)) || c.sub)}</span></span>${unread(c.key) ? `<span class="pill pill--gold">${unread(c.key)}</span>` : ""}</button>`).join("")}</div>
    <div class="chat__pane">
      <div class="chat__head">${esc(active.title)} <span>· ${esc(active.sub)}</span></div>
      <div class="chat__msgs" id="msgs">${thread.length ? thread.map((m) => `<div class="bubble${m.from === side ? " bubble--me" : ""}">${m.text ? `<div>${esc(m.text)}</div>` : ""}${audioPlayer(m.audio)}${filesView(m.files)}<time>${fmtTime(m.at)}</time></div>`).join("") : `<p class="muted" style="margin:auto;text-align:center">No messages yet.<br>Send a text or record a voice message below.</p>`}</div>
      <form class="chat__compose" id="send" novalidate>
        ${voiceBox("cv", { label: "Record voice message" })}
        <div class="chat__form"><label for="msg" class="sr-only">Message</label><textarea id="msg" name="msg" placeholder="Write a message…" maxlength="1000"></textarea>
          <label class="btn btn--outline btn--sm" title="Attach a file"><input type="file" id="cfile" accept="image/*,application/pdf,audio/*" hidden>📎</label>
          <button class="btn btn--navy btn--sm" type="submit">Send</button></div>
        <p class="muted small" id="cstat" role="status" style="margin:0 12px 10px"></p>
      </form>
    </div></div>`;
  const box = $("#msgs"); box.scrollTop = box.scrollHeight;
  $$("[data-t]").forEach((b) => (b.onclick = () => (location.hash = `#/${route}?t=` + encodeURIComponent(b.dataset.t))));
  await Promise.all(thread.filter((m) => !m.read && m.from !== side).map((m) => store.update("classChat", m.id, { read: true }).catch(() => {})));
  refreshCounts?.();
  const voice = wireVoice(el, "cv"); let file = null;
  $("#cfile").onchange = (e) => { file = e.target.files[0] || null; $("#cstat").textContent = file ? "📎 " + file.name : ""; };
  $("#send").onsubmit = async (e) => {
    e.preventDefault();
    const text = $("#msg").value.trim(), vf = voice.file(), st = $("#cstat"), btn = $("#send [type=submit]");
    if (voice.recording()) { st.textContent = "Stop the recording first."; return; }
    if (!text && !vf && !file) { st.textContent = "Write a message or record a voice note."; return; }
    btn.disabled = true;
    try {
      const up = await uploadBundle(file ? [file] : [], vf, (m) => (st.textContent = m));
      await store.add("classChat", { studentId: active.studentId, teacherId: active.teacherId, from: side, text, audio: up.audio, files: up.files, at: new Date().toISOString(), read: false });
      again({ t: active.key });
    } catch (x) { st.textContent = x.message || "Could not send. Try again."; btn.disabled = false; }
  };
  $("#msg").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) $("#send").requestSubmit(); });
}

/* ==========================================================
   TUTOR
   getCtx() → { me (staff record), myId, myClasses }
   ========================================================== */
export function staffClassroom(getCtx) {
  const subjectsFor = (me, cid) => {
    const c = classById(cid); const mine = (c?.subjects || []).filter((s) => me.subjects.includes(s));
    return [...new Set([...(mine.length ? mine : c?.subjects || []), "Quran & Duas"])];
  };

  function postDialog({ me, myId, myClasses }, post, done) {
    const isNew = !post;
    post = post || { kind: "homework", classId: myClasses[0], due: "" };
    const d = dialog({
      title: isNew ? "New classroom post" : "Edit post", wide: true, submit: isNew ? "Post to class" : "Save",
      body: `<div class="form">
        ${field("pk", "Type", `<select id="pk" name="kind">${options(Object.entries(CLASSROOM.kinds).map(([k, v]) => [k, v.label]), post.kind)}</select>`)}
        ${field("pc", "Class", `<select id="pc" name="classId"${isNew ? "" : " disabled"}>${options(myClasses.map((c) => [c, className(c)]), post.classId)}</select>`)}
        ${field("ps", "Subject", `<select id="ps" name="subject">${options(subjectsFor(me, post.classId), post.subject)}</select>`)}
        ${field("pd", "Due date (optional)", `<input id="pd" name="due" type="date" value="${esc(post.due || "")}" min="${today()}">`)}
        ${field("pt", "Title", `<input id="pt" name="title" required maxlength="140" value="${esc(post.title || "")}" placeholder="e.g. Exercise 3.1 Q1–Q10 · or · Dua before sleeping">`, "full")}
        ${field("px", "Instructions", `<textarea id="px" name="text" maxlength="2000" placeholder="What should students do?">${esc(post.text || "")}</textarea>`, "full")}
        ${field("pa", "Arabic text (for Duas, optional)", `<textarea id="pa" name="arabic" dir="rtl" lang="ar" maxlength="1500" placeholder="اَللّٰهُمَّ بِاسْمِكَ اَمُوْتُ وَاَحْيَا">${esc(post.arabic || "")}</textarea>`, "full")}
        ${isNew ? `<div class="full"><div class="field__label">Your voice (recite the Dua or explain the work)</div>${voiceBox("pv", { label: "Record" })}</div>
        <div class="full"><div class="field__label">Worksheet / photos / PDF</div>${attachBox("pf", { label: "Attach files" })}</div>` : `<p class="muted small full">To change the recording or files, delete the post and post it again.</p>`}
        <p class="muted small full" id="pstat" role="status"></p>
      </div>`,
      onSubmit: async (f) => {
        const data = { kind: f.kind.value, subject: f.subject.value, title: f.title.value.trim(), text: f.text.value.trim(), arabic: f.arabic.value.trim(), due: f.due.value };
        if (!isNew) { await store.update("classPosts", post.id, data); toast("Post updated"); done(); return; }
        if (voice.recording()) throw new Error("Stop the recording first.");
        const up = await uploadBundle(att.files(), voice.file(), (m) => ($("#pstat", d).textContent = m));
        const id = await store.add("classPosts", { ...data, classId: f.classId.value, files: up.files, audio: up.audio, teacherId: myId, teacherName: me.name, createdAt: new Date().toISOString() });
        toast("Posted — students can see it now"); done(id);
      }
    });
    let voice, att;
    if (isNew) { voice = wireVoice(d, "pv"); att = wireAttach(d, "pf"); }
    $("#pc", d).onchange = (e) => ($("#ps", d).innerHTML = options(subjectsFor(me, e.target.value)));
    $("#pk", d).onchange = (e) => { if (e.target.value === "dua") $("#ps", d).value = "Quran & Duas"; };
  }

  async function classroom({ el, params }) {
    const ctx = getCtx(); const { myId, myClasses } = ctx;
    const [posts, work, chat] = await Promise.all([store.list("classPosts", { teacherId: myId }), store.list("classWork", { teacherId: myId }), store.list("classChat", { teacherId: myId })]);
    posts.sort(byNew("createdAt"));
    const cls = params.c || "";
    const list = posts.filter((p) => !cls || p.classId === cls);
    const toCheck = work.filter((w) => w.status === "submitted").sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    const unread = chat.filter((m) => m.from === "student" && !m.read).length;
    const cnt = (pid, s) => work.filter((w) => w.postId === pid && (!s || w.status === s)).length;
    el.innerHTML = `
    <div class="grid grid--kpi">
      ${kpi({ label: "Waiting to be checked", value: toCheck.length, sub: "Student submissions", ic: "edit", tone: toCheck.length ? "gold" : "green" })}
      ${kpi({ label: "Posts", value: posts.length, sub: `${posts.filter((p) => p.kind === "dua").length} Dua & Qirat`, ic: "book" })}
      ${kpi({ label: "Voice chat", value: unread, sub: "Unread from students", ic: "chat", tone: unread ? "gold" : "", href: "#/cchat" })}
    </div>
    <div class="toolbar">
      ${field("fc", "Class", `<select id="fc"><option value="">All my classes</option>${options(myClasses.map((c) => [c, className(c)]), cls)}</select>`)}
      <span class="toolbar__spacer"></span>
      <button class="btn btn--gold btn--sm" id="newPost">${plusIc} New post</button>
    </div>
    <div class="grid grid--main">
      ${card(`My posts${cls ? " — " + className(cls) : ""}`, list.length ? `<ul class="list">${list.map((p) => `<li>${kindPill(p.kind)}<div class="list__main"><a href="#/cpost?id=${encodeURIComponent(p.id)}"><b>${esc(p.title)}</b></a><span class="list__meta">${esc(shortClass(p.classId))} · ${esc(p.subject || "")} · ${fmtDate(p.createdAt?.slice(0, 10), false)}${p.due ? ` · due ${fmtDate(p.due, false)}` : ""}</span></div>
        <span class="nowrap small">${cnt(p.id)} sent${cnt(p.id, "submitted") ? ` · ${pill(cnt(p.id, "submitted") + " to check", "gold")}` : ""}</span></li>`).join("")}</ul>` : empty("No posts yet. Use “New post” to give homework or a Dua lesson with your voice.", "book"))}
      ${card("To check", toCheck.length ? `<ul class="list">${toCheck.slice(0, 12).map((w) => `<li>${avatar(w.studentName)}<div class="list__main"><a href="#/cpost?id=${encodeURIComponent(w.postId)}&w=${encodeURIComponent(w.studentId)}"><b>${esc(w.studentName)}</b></a><span class="list__meta">${esc(w.postTitle || "")} · ${fmtTime(w.submittedAt)}${w.audio ? " · 🎧" : ""}${w.files?.length ? ` · 📎${w.files.length}` : ""}</span></div></li>`).join("")}</ul>` : empty("All checked. 👏", "check"))}
    </div>`;
    $("#fc").onchange = (e) => (location.hash = "#/classroom?c=" + encodeURIComponent(e.target.value));
    $("#newPost").onclick = () => myClasses.length ? postDialog(ctx, null, (id) => (location.hash = "#/cpost?id=" + encodeURIComponent(id))) : toast("You have no classes assigned yet.", true);
  }

  async function cpost({ el, params, title, refreshCounts }) {
    const ctx = getCtx(); const { me, myId } = ctx;
    const p = await store.get("classPosts", params.id);
    if (!p) { el.innerHTML = card("Not found", empty("This post was deleted.")); return; }
    title(p.title);
    const [work, students] = await Promise.all([store.list("classWork", { postId: p.id }), store.list("students", { classId: p.classId })]);
    work.sort((a, b) => (a.status === "submitted" ? -1 : 1) - (b.status === "submitted" ? -1 : 1) || a.submittedAt.localeCompare(b.submittedAt));
    const sent = new Set(work.map((w) => w.studentId));
    const missing = students.filter((s) => s.online && s.status !== "left" && !sent.has(s.id));
    const mine = p.teacherId === myId;
    el.innerHTML = `<p><a href="#/classroom" class="linkbtn">← Classroom</a></p>
    <div class="grid grid--main">
      <div>${work.length ? work.map((w) => `<div class="card2 work" id="w-${esc(w.studentId)}">
          <div class="card2__head"><div class="person">${avatar(w.studentName)}<div><b>${esc(w.studentName)}</b><span>${esc(w.studentId)} · ${fmtTime(w.submittedAt)}</span></div></div><span>${tierPill(students.find((s) => s.id === w.studentId))}${workPill(p, w)}</span></div>
          ${w.text ? `<p class="post__text">${esc(w.text)}</p>` : ""}${audioPlayer(w.audio, p.kind === "dua" ? "Student's recitation" : "Student's voice note")}${filesView(w.files)}
          ${w.feedback ? `<div style="margin-top:12px">${feedbackBlock(w)}</div>` : ""}
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn--navy btn--sm" data-fb="${esc(w.id)}">${w.feedback ? "Change feedback" : "Give feedback"}</button><a class="btn btn--outline btn--sm" href="#/cchat?t=${encodeURIComponent(w.studentId)}">Message</a></div>
        </div>`).join("") : card("Submissions", empty("No submissions yet.", "edit"))}</div>
      <div>
        ${card(esc(p.title), `<div class="post__meta">${kindPill(p.kind)} ${esc(shortClass(p.classId))} · ${esc(p.subject || "")}${p.due ? ` · due ${fmtDate(p.due)}` : ""}</div>${postBody(p)}
          ${mine ? `<div style="display:flex;gap:10px;margin-top:12px"><button class="btn btn--outline btn--sm" id="editP">Edit</button><button class="btn btn--outline btn--sm linkbtn--danger" id="delP">Delete post</button></div>` : ""}`)}
        ${card(`Not submitted (${missing.length})`, missing.length ? `<ul class="list">${missing.map((s) => `<li>${avatar(s.name)}<div class="list__main"><b>${esc(s.name)}</b><span class="list__meta">${esc(s.id)}</span></div><a class="linkbtn small" href="#/cchat?t=${encodeURIComponent(s.id)}">Remind</a></li>`).join("")}</ul>` : empty("Every online student has sent it.", "check"))}
      </div>
    </div>`;
    const reload = () => cpost({ el, params, title, refreshCounts });
    if (params.w) setTimeout(() => document.getElementById("w-" + params.w)?.scrollIntoView({ block: "start" }), 50);
    if (mine) {
      $("#editP").onclick = () => postDialog(ctx, p, reload);
      $("#delP").onclick = (e) => armed(e.currentTarget, async () => { await store.remove("classPosts", p.id); toast("Post deleted"); location.hash = "#/classroom"; }, "Click again to delete");
    }
    $$("[data-fb]").forEach((b) => (b.onclick = () => {
      const w = work.find((x) => x.id === b.dataset.fb), fb = w.feedback || {};
      const d = dialog({
        title: "Feedback for " + w.studentName, wide: true, submit: "Send feedback",
        body: `<div class="form form--1">
          <div class="full"><div class="field__label">Stars</div><div class="star-pick" role="radiogroup" aria-label="Stars">${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="stars" value="${n}"${(fb.stars || 0) === n ? " checked" : ""}><span>★</span><span class="sr-only">${n} stars</span></label>`).join("")}</div></div>
          ${field("fbt", "Written feedback", `<textarea id="fbt" name="text" maxlength="1200" placeholder="e.g. Very good! Pronounce ‘ض’ more clearly.">${esc(fb.text || "")}</textarea>`, "full")}
          <div class="full"><div class="field__label">Voice feedback (correct the recitation in your own voice)</div>${voiceBox("fbv", { label: "Record feedback" })}${fb.audio ? `<p class="muted small">A voice note is already attached — record a new one to replace it.</p>` : ""}</div>
          ${field("fbs", "Result", `<select id="fbs" name="status">${options([["reviewed", "Checked — well done"], ["redo", "Ask the student to do it again"]], w.status === "redo" ? "redo" : "reviewed")}</select>`, "full")}
          <p class="muted small full" id="fbstat" role="status"></p>
        </div>`,
        onSubmit: async (f) => {
          if (voice.recording()) throw new Error("Stop the recording first.");
          const vf = voice.file(), starsV = Number(f.querySelector("input[name=stars]:checked")?.value || 0);
          if (!f.text.value.trim() && !vf && !fb.audio && !starsV) throw new Error("Write something, give stars or record a voice note.");
          const up = vf ? await uploadBundle([], vf, (m) => ($("#fbstat", d).textContent = m)) : { audio: fb.audio || null };
          await store.update("classWork", w.id, { status: f.status.value, feedback: { text: f.text.value.trim(), stars: starsV, audio: up.audio || null, by: me.name, at: new Date().toISOString() } });
          toast(f.status.value === "redo" ? "Sent back to the student" : "Feedback sent ✓"); refreshCounts?.(); reload();
        }
      });
      const voice = wireVoice(d, "fbv");
    }));
  }

  async function cchat({ el, params, refreshCounts }) {
    const { myId, myClasses } = getCtx();
    const [msgs, perClass] = await Promise.all([store.list("classChat", { teacherId: myId }), Promise.all(myClasses.map((c) => store.list("students", { classId: c })))]);
    const students = perClass.flat();
    const withChat = new Set(msgs.map((m) => m.studentId));
    const contacts = students.filter((s) => (s.online && s.status !== "left") || withChat.has(s.id))
      .map((s) => ({ key: s.id, title: s.name, sub: `${shortClass(s.classId)} · ${s.id}${s.onlineTier ? " · " + tierName(s.onlineTier) : ""}`, studentId: s.id, teacherId: myId }));
    return chatPage({ el, params, side: "staff", contacts, msgs, keyOf: (m) => m.studentId, route: "cchat", refreshCounts, again: (p) => cchat({ el, params: p, refreshCounts }) });
  }

  return { classroom, cpost, cchat };
}

export async function staffCounts(myId) {
  const [work, chat] = await Promise.all([store.list("classWork", { teacherId: myId }), store.list("classChat", { teacherId: myId })]);
  return { classroom: work.filter((w) => w.status === "submitted").length, cchat: chat.filter((m) => m.from === "student" && !m.read).length };
}

/* ==========================================================
   ADMIN — website enrolments + the offer
   ========================================================== */
export function adminClassroom(byName) {
  return async function enrolments({ el, params, refreshCounts }) {
    const tab = params.tab || "enrol";
    const tabs = `<div class="tabs" role="group">${[["enrol", "Enrolments"], ["offer", "Offer & website banner"], ["students", "Online students"]].map(([k, l]) => `<button type="button" data-tab="${k}" aria-pressed="${k === tab}">${l}</button>`).join("")}</div>`;
    const go = (t, extra = "") => (location.hash = "#/enrolments?tab=" + t + extra);
    const reload = () => { refreshCounts?.(); enrolments({ el, params, refreshCounts }); };
    const offer = await getOffer();

    if (tab === "offer") {
      el.innerHTML = tabs + `<div class="grid grid--main">
        ${card("Online Classroom offer", `<form class="form" id="of" novalidate>
          <label class="full check"><input type="checkbox" name="active"${offer.active ? " checked" : ""}> <b>Offer is on</b> — show it on the website and accept enrolments</label>
          ${field("o-title", "Title", `<input id="o-title" name="title" required maxlength="80" value="${esc(offer.title)}">`, "full")}
          ${field("o-tag", "Short description", `<input id="o-tag" name="tagline" maxlength="160" value="${esc(offer.tagline)}">`, "full")}
          ${field("o-days", "Days per payment", `<input id="o-days" name="days" type="number" min="1" max="365" value="${offer.days}">`)}
          ${field("o-end", "Offer ends on (optional)", `<input id="o-end" name="endsOn" type="date" value="${esc(offer.endsOn || "")}"><div class="field__hint">Shows a live countdown. Leave empty for no end date.</div>`)}
          ${field("o-seats", "Seats (0 = unlimited)", `<input id="o-seats" name="seats" type="number" min="0" value="${offer.seats}"><div class="field__hint">${offer.taken} taken so far</div>`)}
          ${field("o-badge", "Badge text", `<input id="o-badge" name="badge" maxlength="40" value="${esc(offer.badge || "")}" placeholder="e.g. Limited-time offer">`)}
          ${field("o-demo", "Free demo note", `<input id="o-demo" name="demo" maxlength="80" value="${esc(offer.demo || "")}" placeholder="e.g. Free demo class — try it for 1 day">`)}
          <fieldset class="full" style="border:0;padding:0;margin:0"><legend class="field__label">Monthly price of each package (Rs.) — 0 hides a package for that group</legend>
            <div class="tbl-wrap"><table class="tbl pkg-tbl"><thead><tr><th>Class group</th>${offer.tiers.map((t) => `<th class="num">${esc(t.name)}</th>`).join("")}</tr></thead><tbody>
            ${offer.bands.map((b, i) => `<tr><td><b>${esc(b.label)}</b><div class="muted small">${esc(b.classes.map((c) => classById(c)?.short || c).join(", "))}</div></td>${offer.tiers.map((t) => `<td class="num"><label class="sr-only" for="pr-${i}-${t.id}">${esc(b.label)} ${esc(t.name)}</label><input id="pr-${i}-${t.id}" data-band="${i}" data-tier="${esc(t.id)}" type="number" min="0" step="50" value="${b.prices[t.id] || 0}" style="width:110px"></td>`).join("")}</tr>`).join("")}
            </tbody></table></div></fieldset>
          <div class="full grid grid--3" style="gap:12px">${offer.tiers.map((t, i) => `<div class="card2" style="padding:14px">
            ${field("tn-" + i, "Package name", `<input id="tn-${i}" data-tname="${i}" maxlength="20" value="${esc(t.name)}">`)}
            ${field("tp-" + i, "What it includes (one per line)", `<textarea id="tp-${i}" data-tperks="${i}" rows="5">${esc(t.perks.join("\n"))}</textarea>`)}</div>`).join("")}</div>
          ${field("o-perks", "Included in every package (one per line)", `<textarea id="o-perks" name="perks" rows="6">${esc(offer.perks.join("\n"))}</textarea>`, "full")}
          <div class="form-status full" role="alert"></div>
          <div class="full" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn--navy" type="submit">Save offer</button><a class="btn btn--outline" href="../classroom.html" target="_blank" rel="noopener">View on website</a></div>
        </form>`)}
        ${card("How it works", `<ol class="pay-steps"><li>Visitors see the offer on the home page and at <b>studentpointacademy.online/classroom.html</b>.</li><li>They pay by NayaPay, SadaPay, Easypaisa or JazzCash and send the TID with the enrolment form.</li><li>You check the TID here under <b>Enrolments</b> and press <b>Approve</b> — this creates the student login and opens the classroom for ${offer.days} days.</li><li>They renew from their portal (Subscription page) at the price they joined with.</li></ol><p class="muted small">Changes show on the website straight away. Existing students keep the price they joined at.</p>`)}
      </div>`;
      $$("[data-tab]").forEach((b) => (b.onclick = () => go(b.dataset.tab)));
      $("#of").onsubmit = async (e) => {
        e.preventDefault(); const f = e.currentTarget, st = $(".form-status", f);
        const tiers = offer.tiers.map((t, i) => ({ id: t.id, name: $(`[data-tname="${i}"]`, f).value.trim() || t.name, perks: $(`[data-tperks="${i}"]`, f).value.split("\n").map((x) => x.trim()).filter(Boolean) }));
        const bands = offer.bands.map((b, i) => ({ id: b.id, label: b.label, classes: b.classes, prices: Object.fromEntries(offer.tiers.map((t) => [t.id, Math.max(0, Number($(`[data-band="${i}"][data-tier="${t.id}"]`, f).value) || 0)])) }));
        if (!bands.some((b) => Object.values(b.prices).some(Boolean))) { st.textContent = "Enter at least one package price."; st.className = "form-status full is-err"; return; }
        const data = { active: f.active.checked, title: f.title.value.trim(), tagline: f.tagline.value.trim(), demo: f.demo.value.trim(), days: Number(f.days.value) || 30, endsOn: f.endsOn.value, seats: Number(f.seats.value) || 0, taken: offer.taken, badge: f.badge.value.trim(), tiers, bands, perks: f.perks.value.split("\n").map((x) => x.trim()).filter(Boolean), updatedAt: new Date().toISOString(), updatedBy: byName };
        try { await store.set("settings", "classroomOffer", data); toast("Offer saved — the website shows it now"); reload(); }
        catch (x) { st.textContent = x.message; st.className = "form-status full is-err"; }
      };
      return;
    }

    if (tab === "students") {
      const users = (await store.list("users", { role: "student" })).filter(isOnline).sort((a, b) => String(a.subscribedUntil).localeCompare(String(b.subscribedUntil)));
      el.innerHTML = tabs + card(`${users.length} online classroom student${users.length === 1 ? "" : "s"}`, users.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Class</th><th>Package</th><th class="num">Price</th><th>Active until</th></tr></thead><tbody>${users.map((u) => `<tr><td>${person(u.name, u.loginId)}</td><td>${esc(className(u.classId))}</td><td>${pill(tierName(u.planTier || "silver"), u.planTier === "diamond" ? "green" : "gold")}</td><td class="num">${money(u.planPrice || offer.price)}</td><td>${u.subscribedUntil >= today() ? pill(fmtDate(u.subscribedUntil, false), "green") : pill("Ended " + fmtDate(u.subscribedUntil, false), "red")}</td></tr>`).join("")}</tbody></table></div>` : empty("No online classroom students yet.", "school"));
      $$("[data-tab]").forEach((b) => (b.onclick = () => go(b.dataset.tab)));
      return;
    }

    const all = (await store.list("classroomEnrollments")).sort(byNew("submittedAtTs"));
    const status = params.s ?? "pending";
    const list = all.filter((x) => !status || x.status === status);
    el.innerHTML = tabs + `
    <div class="grid grid--kpi">
      ${kpi({ label: "Waiting for approval", value: all.filter((x) => x.status === "pending").length, sub: "Check each TID in the wallet app", ic: "clock", tone: all.some((x) => x.status === "pending") ? "red" : "green" })}
      ${kpi({ label: "Packages", value: "from " + money(offer.price), sub: offer.open ? (offer.endsOn ? "Ends " + fmtDate(offer.endsOn, false) : "Running") : "Closed", ic: "star", tone: offer.open ? "gold" : "red", href: "#/enrolments?tab=offer" })}
      ${kpi({ label: "Seats", value: offer.seats ? `${offer.taken}/${offer.seats}` : offer.taken, sub: offer.seats ? `${offer.seatsLeft} left` : "No limit", ic: "users" })}
    </div>
    <div class="toolbar">${field("es", "Show", `<select id="es">${options([["pending", "Waiting for approval"], ["approved", "Approved"], ["rejected", "Rejected"], ["", "All"]], status)}</select>`)}</div>
    ${card(`${list.length} enrolment${list.length === 1 ? "" : "s"}`, list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Class</th><th>Contact</th><th>Payment</th><th>Status</th><th></th></tr></thead><tbody>
      ${list.map((x) => `<tr><td>${person(x.studentName, `Father: ${x.fatherName || "—"}`)}</td><td class="nowrap">${esc(className(x.classId))}</td>
        <td class="nowrap"><a href="https://wa.me/92${esc(String(x.phone).replace(/\D/g, "").replace(/^0/, ""))}" target="_blank" rel="noopener">${esc(x.phone)}</a><div class="muted small">${esc(x.city || "")}</div></td>
        <td class="nowrap">${x.tier ? pill(tierName(x.tier), "gold") + " " : ""}${money(x.amount)}<div class="muted small">${esc(x.method || "")} · TID <code>${esc(x.tid)}</code> · ${esc(x.sender || "")}</div>${x.receipt ? `<button class="linkbtn small" data-rc="${esc(x.id)}">Receipt</button>` : ""}</td>
        <td>${x.status === "approved" ? pill("Approved", "green") + `<div class="muted small">${esc(x.studentId || "")}</div>` : x.status === "rejected" ? pill("Rejected", "red") + `<div class="muted small">${esc(x.reason || "")}</div>` : pill("Pending", "gold")}<div class="muted small">${fmtDate(x.submittedAt)}</div></td>
        <td class="nowrap">${x.status === "pending" ? `<button class="btn btn--navy btn--sm" data-ok="${esc(x.id)}">Approve</button> <button class="btn btn--outline btn--sm" data-no="${esc(x.id)}">Reject</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div>` : empty(status === "pending" ? "No new enrolments. Share classroom.html on WhatsApp to get more!" : "Nothing here", "school"))}`;
    $$("[data-tab]").forEach((b) => (b.onclick = () => go(b.dataset.tab)));
    $("#es").onchange = (e) => go("enrol", "&s=" + e.target.value);
    $$("[data-rc]").forEach((b) => (b.onclick = async () => {
      const x = all.find((y) => y.id === b.dataset.rc), w = window.open("", "_blank");   // open now so the pop-up isn't blocked
      try { const u = await store.fileUrl(x.receipt); if (!u) throw new Error("Receipt not available"); if (w) w.location.href = u; else window.open(u, "_blank"); }
      catch (e) { w?.close(); toast(e.message, true); }
    }));
    $$("[data-no]").forEach((b) => (b.onclick = () => {
      const x = all.find((y) => y.id === b.dataset.no);
      dialog({ title: "Reject — " + x.studentName, submit: "Reject", body: field("rr", "Reason", `<select id="rr" name="reason">${options(["TID not found in the wallet app", "Amount received is less", "Class not included in the offer", "Duplicate enrolment"])}</select>`),
        onSubmit: async (f) => { await store.update("classroomEnrollments", x.id, { status: "rejected", reason: f.reason.value, decidedAt: today(), decidedBy: byName }); toast("Enrolment rejected"); reload(); } });
    }));
    $$("[data-ok]").forEach((b) => (b.onclick = async () => {
      const x = all.find((y) => y.id === b.dataset.ok);
      const students = await store.list("students");
      const sid = "SPA-" + String(Math.max(100, ...students.map((s) => Number(String(s.id).replace(/\D/g, "")) || 0)) + 1).padStart(4, "0");
      const roll = Math.max(0, ...students.filter((s) => s.classId === x.classId).map((s) => s.rollNo || 0)) + 1;
      dialog({
        title: "Approve — " + x.studentName, submit: "Approve & create login",
        body: `<p>Before approving, confirm in your ${esc(x.method || "wallet")} app that <b>${money(x.amount)}</b> with TID <b>${esc(x.tid)}</b> reached the academy account.</p>
        <div class="form">
          ${field("a-cls", "Class", `<select id="a-cls" name="classId">${options(CLASSES.filter((c) => CLASSROOM.eligible.includes(c.id)).map((c) => [c.id, c.name]), x.classId)}</select>`)}
          ${field("a-id", "Student ID (login)", `<input id="a-id" name="sid" required value="${sid}" style="text-transform:uppercase">`)}
          ${field("a-pw", "Password", `<input id="a-pw" name="pw" required minlength="6" value="${Math.random().toString(36).slice(2, 8)}">`)}
          <label class="full check"><input type="checkbox" name="parent" checked> Also create a parent login</label>
        </div>`,
        onSubmit: async (f) => {
          const id = f.sid.value.trim().toUpperCase(), classId = f.classId.value;
          if (students.some((s) => s.id === id)) throw new Error("That Student ID already exists.");
          const c = classById(classId);
          const uid = await store.createAccount({ loginId: id, password: f.pw.value, role: "student", name: x.studentName, linkId: id, classId, plan: "classroom", planTier: x.tier || "silver", planPrice: x.amount });
          let parentLine = "", parentId = "";
          if (f.parent.checked) {
            const pid = "P-" + id.replace(/^SPA-/, ""), ppw = Math.random().toString(36).slice(2, 8);
            parentId = await store.createAccount({ loginId: pid, password: ppw, role: "parent", name: x.fatherName || "Parent of " + x.studentName, children: [id], childClassIds: [classId] });
            parentLine = `${pid} / ${ppw}`;
          }
          await store.set("students", id, { name: x.studentName, fatherName: x.fatherName || "", classId, rollNo: classId === x.classId ? roll : 1, gender: x.gender || "M", dob: "", phone: x.phone || "", address: x.city || "", admissionDate: today(), subjects: c.subjects.slice(), status: "active", parentId, online: true, source: "online-classroom" });
          const payId = "TID-" + String(x.tid).toUpperCase();
          const payDoc = { userId: uid, studentId: id, name: x.studentName, classId, plan: "classroom", tier: x.tier || "silver", amount: x.amount, method: x.method || "NayaPay", tid: x.tid, sender: x.sender || "", submittedAt: x.submittedAt || today(), submittedAtTs: x.submittedAtTs || new Date().toISOString(), status: "pending", source: "website" };
          let subId = payId;
          try { await store.set("subscriptions", payId, payDoc); } catch { subId = await store.add("subscriptions", payDoc); }
          const until = await approvePayment({ id: subId, userId: uid, plan: "classroom", tier: x.tier || "silver", amount: x.amount, days: offer.days }, byName);
          await store.update("classroomEnrollments", x.id, { status: "approved", studentId: id, decidedAt: today(), decidedBy: byName });
          const { seatsLeft, open, expired, full, price, classes, ...keep } = offer;
          await store.set("settings", "classroomOffer", { ...keep, taken: offer.taken + 1 }).catch(() => {});
          const portal = location.origin + location.pathname.replace(/app\.html$/, "");
          const msg = `Assalam o Alaikum! ${x.studentName}'s admission in the Student Point Academy Online Classroom is confirmed ✅\n\nPortal: ${portal}\nStudent ID: ${id}\nPassword: ${f.pw.value}${parentLine ? `\nParent login: ${parentLine}` : ""}\nActive until: ${fmtDate(until)}\n\nOpen the portal → Online Classroom to see homework and Dua lessons.`;
          const wa = "https://wa.me/92" + String(x.phone || "").replace(/\D/g, "").replace(/^0/, "") + "?text=" + encodeURIComponent(msg);
          setTimeout(() => dialog({ title: "Enrolled ✓", body: `<p><b>${esc(x.studentName)}</b> is now in the Online Classroom (${esc(className(classId))}) until ${fmtDate(until)}.</p><div class="challan"><div class="challan__row"><span>Student login</span><b>${esc(id)} / ${esc(f.pw.value)}</b></div>${parentLine ? `<div class="challan__row"><span>Parent login</span><b>${esc(parentLine)}</b></div>` : ""}</div><p style="margin-top:14px"><a class="btn btn--gold btn--sm" href="${esc(wa)}" target="_blank" rel="noopener">Send login on WhatsApp</a></p><p class="muted small">Passwords are not shown again — send or note them now.</p>` }), 50);
          reload();
        }
      });
    }));
  };
}

export async function pendingEnrolments() {
  return (await store.list("classroomEnrollments", { status: "pending" })).length;
}
