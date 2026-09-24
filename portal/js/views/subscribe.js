/* Student portal subscription: payment screen, renewal reminder, admin approvals */
import * as store from "../store.js";
import { SUBSCRIPTION as SUB, className, shortName, CLASSES } from "../school.js";
import { $, $$, esc, icon, kpi, card, empty, pill, person, statusPill, toast, dialog, field, options, fmtDate, money, today, iso } from "../ui.js";

const addDays = (s, n) => { const d = new Date(s + "T12:00"); d.setDate(d.getDate() + n); return iso(d); };
export const daysLeft = (u) => (u.subscribedUntil ? Math.round((new Date(u.subscribedUntil + "T12:00") - new Date(today() + "T12:00")) / 864e5) : -1);
export const needsSubscription = (u) => SUB.enabled && u.role === "student" && !(u.subscribedUntil && u.subscribedUntil >= today());

const payBox = () => `
  <div class="pay">
    <div class="pay__head"><span class="pay__logo">easypaisa</span><span class="pay__amt">${money(SUB.amount)}<small> / ${SUB.days} days</small></span></div>
    <div class="pay__row"><span>Account number</span><b id="acc">${esc(SUB.account)}</b><button type="button" class="linkbtn" id="copyAcc">Copy</button></div>
    <div class="pay__row"><span>Account title</span><b>${esc(SUB.title)}</b></div>
    <div class="pay__row"><span>Amount</span><b>${money(SUB.amount)}</b></div>
  </div>`;

const steps = `<ol class="pay-steps">
  <li>Open the <b>${esc(SUB.method)}</b> app (or visit any ${esc(SUB.method)} shop) and send <b>${money(SUB.amount)}</b> to the account above.</li>
  <li>Check that the name shown is <b>${esc(SUB.title)}</b> before you confirm.</li>
  <li>Copy the <b>Transaction ID (TID)</b> from the SMS or the app receipt.</li>
  <li>Enter it below. Your portal opens as soon as the payment is verified.</li></ol>`;

function payForm(renew) {
  return `<form class="form" id="subf" novalidate>
    ${field("s-tid", "Transaction ID (TID)", `<input id="s-tid" name="tid" required inputmode="numeric" autocomplete="off" maxlength="20" placeholder="e.g. 41823912345"><div class="field__hint">The number in your ${esc(SUB.method)} SMS, usually 11 digits.</div>`)}
    ${field("s-from", "Paid from mobile number", `<input id="s-from" name="sender" required inputmode="tel" placeholder="03XX-XXXXXXX">`)}
    <div class="form-status full" role="alert"></div>
    <div class="full"><button class="btn btn--gold" type="submit">${renew ? "Submit renewal payment" : "I have paid — submit"}</button></div>
  </form>`;
}

function wireForm(user, done) {
  $("#copyAcc")?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(SUB.account.replace(/\D/g, "")); toast("Account number copied"); } catch { toast(SUB.account); } });
  $("#subf").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.currentTarget, st = $(".form-status", f), btn = $("[type=submit]", f);
    const tid = f.tid.value.replace(/\s/g, ""), sender = f.sender.value.trim();
    st.className = "form-status full";
    const err = !/^[A-Za-z0-9]{6,20}$/.test(tid) ? "Enter the Transaction ID exactly as it appears in the SMS (letters and numbers only)."
      : !/^03\d{2}-?\d{7}$/.test(sender) ? "Mobile number should look like 03XX-XXXXXXX." : "";
    if (err) { st.textContent = err; st.className = "form-status full is-err"; return; }
    btn.disabled = true;
    try {
      const DUP = "This Transaction ID has already been submitted. If you think this is a mistake, contact the academy office.";
      const docId = "TID-" + tid.toUpperCase();   // one record per TID, so a TID can't be used twice
      if (!store.IS_LIVE && await store.get("subscriptions", docId)) throw new Error(DUP);
      await store.set("subscriptions", docId, { userId: user.id, studentId: user.linkId || user.id, name: user.name, classId: user.classId || "", amount: SUB.amount, method: SUB.method, tid, sender, submittedAt: today(), submittedAtTs: new Date().toISOString(), status: "pending" }).catch((x) => { throw /permission|insufficient/i.test(x.code || x.message) ? new Error(DUP) : x; });
      toast("Payment submitted for verification");
      done();
    } catch (x) { st.textContent = x.message; st.className = "form-status full is-err"; btn.disabled = false; }
  };
}

/* Full-screen payment wall shown to students without an active subscription */
export async function paywall({ el, user, title }) {
  title("Activate your portal");
  const mine = (await store.list("subscriptions", { userId: user.id })).sort((a, b) => String(b.submittedAtTs || b.submittedAt).localeCompare(String(a.submittedAtTs || a.submittedAt)));
  const pending = mine.find((s) => s.status === "pending");
  const lastRejected = !pending && mine[0]?.status === "rejected" ? mine[0] : null;
  const expired = user.subscribedUntil && user.subscribedUntil < today();
  const first = user.name.split(" ")[0];

  if (pending) {
    el.innerHTML = `<div class="paywall">
      <div class="paywall__card" style="text-align:center">
        <div class="paywall__badge paywall__badge--wait">${icon("clock")}</div>
        <h2>Payment received — checking it now</h2>
        <p class="muted">Thank you, ${esc(first)}. Your ${money(pending.amount)} payment (TID <b>${esc(pending.tid)}</b>, from ${esc(pending.sender)}) is being verified. This usually takes a few hours during academy days.</p>
        <p class="muted small">Submitted ${fmtDate(pending.submittedAt)}. Your portal opens automatically once it's approved.</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px"><button class="btn btn--navy" id="recheck">Check again</button></div>
      </div></div>`;
    $("#recheck").onclick = () => location.reload();
    return;
  }

  el.innerHTML = `<div class="paywall">
    <div class="paywall__card">
      <div class="paywall__top">
        <div class="paywall__badge">${icon("star")}</div>
        <div><h2>${expired ? "Your subscription has ended" : `Welcome, ${esc(first)}!`}</h2>
        <p class="muted" style="margin:0">${expired ? `It expired on ${fmtDate(user.subscribedUntil)}. Renew to keep using the portal.` : `Activate your Student Point Academy portal for just <b>${money(SUB.amount)} a month</b>.`}</p></div>
      </div>
      ${lastRejected ? `<p class="form-status is-err" style="display:block">Your last payment (TID ${esc(lastRejected.tid)}) could not be verified${lastRejected.reason ? ": " + esc(lastRejected.reason) : "."} Please check and submit again.</p>` : ""}
      <div class="paywall__grid">
        <div>
          <h3>What you get</h3>
          <ul class="perks">
            <li>${icon("checklist")}Daily attendance calendar</li><li>${icon("chart")}Result cards, class position and progress</li>
            <li>${icon("book")}Homework diary</li><li>${icon("calendar")}Class timetable</li><li>${icon("money")}Fee challans and receipts</li><li>${icon("bell")}Academy notices and leave requests</li>
          </ul>
        </div>
        <div>${payBox()}</div>
      </div>
      <h3 style="margin-top:22px">How to pay</h3>${steps}
      ${payForm(false)}
    </div></div>`;
  wireForm(user, () => paywall({ el, user, title }));
}

/* Small banner on the student dashboard when renewal is due soon */
export function renewBanner(user) {
  if (!SUB.enabled || user.role !== "student") return "";
  const d = daysLeft(user);
  if (d < 0 || d > SUB.remindDays) return "";
  return `<div class="renew">${icon("clock")}<span><b>${d === 0 ? "Your portal subscription ends today." : `Your portal subscription ends in ${d} day${d > 1 ? "s" : ""}`}</b> (${fmtDate(user.subscribedUntil)}). Renew for ${money(SUB.amount)} to keep access.</span><a class="btn btn--gold btn--sm" href="#/subscription">Renew</a></div>`;
}

/* Student "Subscription" page: status, history, renew */
export async function subscriptionPage({ el, user }) {
  const mine = (await store.list("subscriptions", { userId: user.id })).sort((a, b) => String(b.submittedAtTs || b.submittedAt).localeCompare(String(a.submittedAtTs || a.submittedAt)));
  const pending = mine.find((s) => s.status === "pending");
  const d = daysLeft(user);
  el.innerHTML = `<div class="grid grid--2">
    <div>${card("My subscription", `<div class="grid grid--kpi" style="margin:0">${kpi({ label: "Active until", value: fmtDate(user.subscribedUntil, false), sub: d >= 0 ? `${d} day${d === 1 ? "" : "s"} left` : "Expired", ic: "calendar", tone: d > SUB.remindDays ? "green" : "red" })}${kpi({ label: "Plan", value: money(SUB.amount), sub: `every ${SUB.days} days`, ic: "star", tone: "gold" })}</div>`)}
    ${card("Payment history", mine.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>TID</th><th class="num">Amount</th><th>Status</th><th>Valid until</th></tr></thead><tbody>${mine.map((s) => `<tr><td class="nowrap">${fmtDate(s.submittedAt)}</td><td><code>${esc(s.tid)}</code></td><td class="num">${money(s.amount)}</td><td>${statusPill(s.status)}</td><td class="nowrap">${s.validUntil ? fmtDate(s.validUntil) : "—"}</td></tr>`).join("")}</tbody></table></div>` : empty("No payments yet", "money"))}</div>
    ${card(pending ? "Renewal submitted" : "Renew now", pending ? `<p>Your payment with TID <b>${esc(pending.tid)}</b> is being verified. The extra ${SUB.days} days will be added to your current subscription.</p>` : `${payBox()}${steps}${payForm(true)}<p class="muted small">Renewing early is fine: the new ${SUB.days} days start after your current subscription ends.</p>`)}
  </div>`;
  if (!pending) wireForm(user, () => subscriptionPage({ el, user }));
}

/* ==========================================================
   Admin: verify payments
   ========================================================== */
export async function approve(sub, by) {
  const u = await store.get("users", sub.userId);
  if (!u) throw new Error("This student's login no longer exists.");
  const start = u.subscribedUntil && u.subscribedUntil >= today() ? addDays(u.subscribedUntil, 1) : today();
  const until = addDays(start, SUB.days - 1);
  await store.update("subscriptions", sub.id, { status: "approved", decidedAt: today(), decidedBy: by, validFrom: start, validUntil: until });
  await store.update("users", sub.userId, { subscribedUntil: until, subscribedUntilMs: new Date(until + "T23:59:59").getTime() });
  return until;
}

export function subscriptionsAdmin(byName) {
  return async function subscriptions({ el, params, refreshCounts }) {
    const [subs, users] = await Promise.all([store.list("subscriptions"), store.list("users", { role: "student" })]);
    const status = params.s ?? "pending";
    const list = subs.filter((s) => !status || s.status === status).sort((a, b) => String(b.submittedAtTs || b.submittedAt).localeCompare(String(a.submittedAtTs || a.submittedAt)));
    const month = today().slice(0, 7);
    const active = users.filter((u) => u.subscribedUntil && u.subscribedUntil >= today()).length;
    const collected = subs.filter((s) => s.status === "approved" && (s.decidedAt || "").startsWith(month)).reduce((a, s) => a + (s.amount || 0), 0);
    const pendingN = subs.filter((s) => s.status === "pending").length;
    const expiring = users.filter((u) => { const d = daysLeft(u); return d >= 0 && d <= SUB.remindDays; }).length;
    el.innerHTML = `
    <div class="grid grid--kpi">
      ${kpi({ label: "Waiting for verification", value: pendingN, sub: "Check each TID in your EasyPaisa app", ic: "clock", tone: pendingN ? "red" : "green", href: "#/subscriptions?s=pending" })}
      ${kpi({ label: "Active students", value: `${active}/${users.length}`, sub: `${users.length - active} not subscribed`, ic: "school", tone: "green" })}
      ${kpi({ label: "Collected this month", value: money(collected), sub: `${money(SUB.amount)} per student`, ic: "money", tone: "gold" })}
      ${kpi({ label: "Ending soon", value: expiring, sub: `within ${SUB.remindDays} days`, ic: "calendar" })}
    </div>
    <div class="toolbar">
      ${field("ss", "Show", `<select id="ss">${options([["pending", "Waiting for verification"], ["approved", "Approved"], ["rejected", "Rejected"], ["", "All payments"]], status)}</select>`)}
      <span class="toolbar__spacer"></span>
      <button class="btn btn--outline btn--sm" id="manual">${icon("plus").replace("<svg", '<svg width="18" height="18" fill="currentColor"')} Record cash / manual payment</button>
    </div>
    ${card(`${list.length} payment${list.length === 1 ? "" : "s"}`, list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>TID</th><th>Paid from</th><th class="num">Amount</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>
      ${list.map((s) => `<tr><td>${person(s.name, `${s.studentId} · ${esc(className(s.classId))}`)}</td><td><code>${esc(s.tid)}</code></td><td class="nowrap">${esc(s.sender)}</td><td class="num">${money(s.amount)}</td><td class="nowrap">${fmtDate(s.submittedAt)}</td>
        <td>${statusPill(s.status)}${s.validUntil ? `<div class="muted small">until ${fmtDate(s.validUntil, false)}</div>` : ""}${s.reason ? `<div class="muted small">${esc(s.reason)}</div>` : ""}</td>
        <td class="nowrap">${s.status === "pending" ? `<button class="btn btn--navy btn--sm" data-ok="${esc(s.id)}">Approve</button> <button class="btn btn--outline btn--sm" data-no="${esc(s.id)}">Reject</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div>` : empty(status === "pending" ? "No payments waiting. All caught up!" : "No payments here", "money"))}
    <p class="muted small" style="margin-top:12px">Before approving, open your ${esc(SUB.method)} app and confirm that a payment of ${money(SUB.amount)} with this Transaction ID reached ${esc(SUB.account)}. Approving gives the student ${SUB.days} days of access (added after any time they still have).</p>`;
    const reload = () => { refreshCounts?.(); subscriptions({ el, params, refreshCounts }); };
    $("#ss").onchange = (e) => (location.hash = "#/subscriptions?s=" + e.target.value);
    $$("[data-ok]").forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      try { const until = await approve(subs.find((x) => x.id === b.dataset.ok), byName); toast(`Approved — access until ${fmtDate(until)}`); reload(); }
      catch (e) { toast(e.message, true); b.disabled = false; }
    }));
    $$("[data-no]").forEach((b) => (b.onclick = () => {
      const s = subs.find((x) => x.id === b.dataset.no);
      dialog({
        title: "Reject payment — " + s.name, submit: "Reject",
        body: field("rj", "Reason (the student will see this)", `<select id="rj" name="reason">${options(["TID not found in EasyPaisa", "Amount received is less than " + money(SUB.amount), "Payment was sent to a different account", "Duplicate / already used TID"])}</select>`),
        onSubmit: async (f) => { await store.update("subscriptions", s.id, { status: "rejected", reason: f.reason.value, decidedAt: today(), decidedBy: byName }); toast("Payment rejected"); reload(); }
      });
    }));
    $("#manual").onclick = () => dialog({
      title: "Record a payment manually", submit: "Save and activate",
      body: `<div class="form">
        ${field("m-st", "Student", `<select id="m-st" name="uid">${options(users.sort((a, b) => CLASSES.findIndex((c) => c.id === a.classId) - CLASSES.findIndex((c) => c.id === b.classId) || a.loginId.localeCompare(b.loginId)).map((u) => [u.id, `${u.name} — ${u.loginId}${u.subscribedUntil >= today() ? " (active)" : ""}`]))}</select>`, "full")}
        ${field("m-how", "Paid by", `<select id="m-how" name="method">${options(["Cash at office", SUB.method, "Bank transfer", "Free (scholarship)"])}</select>`)}
        ${field("m-ref", "Receipt / TID", `<input id="m-ref" name="ref" placeholder="optional">`)}
      </div>`,
      onSubmit: async (f) => {
        const u = users.find((x) => x.id === f.uid.value);
        const free = f.method.value.startsWith("Free");
        const id = await store.add("subscriptions", { userId: u.id, studentId: u.linkId || u.id, name: u.name, classId: u.classId || "", amount: free ? 0 : SUB.amount, method: f.method.value, tid: f.ref.value.trim() || "MANUAL-" + Date.now().toString(36).toUpperCase(), sender: "—", submittedAt: today(), submittedAtTs: new Date().toISOString(), status: "pending" });
        const until = await approve({ id, userId: u.id }, byName);
        toast(`${u.name} is active until ${fmtDate(until)}`); reload();
      }
    });
  };
}

export async function pendingCount() {
  return (await store.list("subscriptions", { status: "pending" })).length;
}
