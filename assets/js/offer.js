/* Online Classroom offer on the public website.
   The offer (price, end date, seats, classes, perks) is edited by the admin in
   Portal → Admin → Online classroom → Offer; this file shows it on the pages:
   • fills every [data-o="…"] element
   • a slim offer strip under the menu, and a one-time pop-up on the home page */
import { getOffer, countdown } from "../../portal/js/classroom-kit.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rs = (n) => Number(n).toLocaleString("en-PK");

export const CLASS_LABEL = { PG: "Play Group", 11: "1st Year", 12: "2nd Year (Intermediate)" };
export const classLabel = (id) => CLASS_LABEL[id] || (/^\d+$/.test(id) ? "Class " + id : id);
export function rangeText(ids) {
  if (!ids.length) return "";
  const has = (x) => ids.includes(x);
  if (has("PG") && has("12") && ids.length >= 13) return "Play Group to Intermediate";
  return ids.length <= 3 ? ids.map(classLabel).join(", ") : `${classLabel(ids[0])} to ${classLabel(ids.at(-1))}`;
}

let offerP = null;
export const loadOffer = () => (offerP ||= getOffer());

function tick(el, endsOn, onEnd) {
  const b = el.querySelector("b") || el;
  const run = () => { const c = countdown(endsOn); if (!c) { clearInterval(t); onEnd?.(); return; } b.textContent = c.text; };
  const t = setInterval(run, 1000); run();
}

export function fillOffer(root, o) {
  const q = (k) => [...root.querySelectorAll(`[data-o="${k}"]`)];
  q("badge").forEach((e) => { e.textContent = o.badge || "Special offer"; e.hidden = !o.badge; });
  q("title").forEach((e) => (e.textContent = o.title));
  q("tagline").forEach((e) => (e.textContent = o.tagline));
  q("price").forEach((e) => (e.textContent = rs(o.price)));
  q("oldPrice").forEach((e) => (e.hidden = true));
  q("demo").forEach((e) => { e.hidden = !o.demo; const b = e.querySelector("b") || e; b.textContent = o.demo || ""; });
  q("packages").forEach((e) => packages(e, o));
  q("range").forEach((e) => (e.textContent = rangeText(o.classes)));
  q("perks").forEach((e) => (e.innerHTML = o.perks.map((p) => `<li><i class="fas fa-check-circle"></i> ${esc(p)}</li>`).join("")));
  q("classes").forEach((e) => (e.innerHTML = o.classes.map((id) => `<span>${esc(classLabel(id))}</span>`).join("")));
  q("seats").forEach((e) => { e.hidden = o.seatsLeft === null || !o.open; const b = e.querySelector("b"); if (b) b.textContent = o.seatsLeft; });
  q("countdown").forEach((e) => { e.hidden = !o.endsOn || !o.open; if (o.endsOn && o.open) tick(e, o.endsOn, () => (e.hidden = true)); });
  q("closed").forEach((e) => {
    e.hidden = o.open;
    e.textContent = o.open ? "" : !o.active ? "This offer is paused right now. Message us on WhatsApp to join the next batch."
      : o.expired ? "This offer has ended. Message us on WhatsApp to ask about the next one."
      : "All seats are taken. Message us on WhatsApp to join the waiting list.";
  });
}

/* Silver / Gold / Diamond cards with a class-group switcher.
   "Choose" buttons fire a spa:package event { band, tier, classId } */
const TIER_ICON = { silver: "🥈", gold: "🥇", diamond: "💎" };
export function packages(el, o, bandId) {
  const band = o.bands.find((b) => b.id === bandId) || o.bands[0];
  const tiers = o.tiers.filter((t) => band.prices[t.id] > 0);
  el.innerHTML = `
    <div class="pkg-switch" role="tablist" aria-label="Class group">${o.bands.map((b) => `<button type="button" role="tab" aria-selected="${b.id === band.id}" data-band="${esc(b.id)}">${esc(b.label)}</button>`).join("")}</div>
    <div class="pkg-grid">${tiers.map((t) => `
      <div class="pkg pkg--${esc(t.id)}">
        ${t.id === "gold" ? `<span class="pkg__flag">Most popular</span>` : ""}
        <div class="pkg__head"><span class="pkg__ic">${TIER_ICON[t.id] || "⭐"}</span><h3>${esc(t.name)}</h3></div>
        <div class="pkg__price"><b>Rs. ${rs(band.prices[t.id])}</b><span>/ month</span></div>
        <ul>${t.perks.map((p) => `<li><i class="fas fa-check"></i> ${esc(p)}</li>`).join("")}</ul>
        <button type="button" class="btn ${t.id === "gold" ? "btn-orange" : "btn-outline"} pkg__go" data-tier="${esc(t.id)}">Choose ${esc(t.name)}</button>
      </div>`).join("")}</div>`;
  el.querySelectorAll("[data-band]").forEach((b) => (b.onclick = () => packages(el, o, b.dataset.band)));
  el.querySelectorAll("[data-tier]").forEach((b) => (b.onclick = () => el.dispatchEvent(new CustomEvent("spa:package", { bubbles: true, detail: { band: band.id, tier: b.dataset.tier, classId: band.classes[0] } }))));
}

/* Slim strip under the menu (home page) */
export function offerStrip(o, { link = "classroom.html" } = {}) {
  if (!o.open || document.querySelector(".offer-strip")) return;
  const nav = document.getElementById("navbar"); if (!nav) return;
  const a = document.createElement("a");
  a.className = "offer-strip"; a.href = link;
  a.innerHTML = `<span class="offer-strip__fire">🔥</span><span><b>${esc(o.title)}</b> — Silver, Gold & Diamond from <b>Rs. ${rs(o.price)}</b>/month · ${esc(rangeText(o.classes))}</span>${o.endsOn ? `<span class="offer-strip__cd">ends in <b></b></span>` : ""}<span class="offer-strip__go">Enroll now →</span>`;
  nav.after(a);
  const cd = a.querySelector(".offer-strip__cd"); if (cd) tick(cd, o.endsOn, () => cd.remove());
}

/* One-time pop-up per visit (home page) */
export function offerPopup(o, { delay = 6000 } = {}) {
  if (!o.open) return;
  try { if (sessionStorage.getItem("spa_offer_seen")) return; } catch {}
  setTimeout(() => {
    if (document.querySelector("dialog[open]")) return;
    const d = document.createElement("dialog");
    d.className = "offer-pop"; d.setAttribute("aria-labelledby", "offerPopTitle");
    d.innerHTML = `<button type="button" class="offer-pop__x" aria-label="Close">×</button>
      <div class="offer-pop__top"><span class="offer-pop__badge">${esc(o.badge || "Special offer")}</span><div class="offer-pop__emoji">🎧📚🤲</div></div>
      <div class="offer-pop__body">
        <h2 id="offerPopTitle">${esc(o.title)}</h2>
        <p>${esc(o.tagline)}</p>
        <div class="offer-pop__price"><span>from</span><b>Rs. ${rs(o.price)}</b><span>/ month</span></div>
        <p class="offer-pop__small">🥈 Silver · 🥇 Gold · 💎 Diamond packages</p>
        ${o.demo ? `<p class="offer-pop__small">🎁 ${esc(o.demo)}</p>` : ""}
        <p class="offer-pop__small">${esc(rangeText(o.classes))}${o.seatsLeft !== null ? ` · only ${o.seatsLeft} seats left` : ""}</p>
        ${o.endsOn ? `<p class="offer-pop__cd">⏳ Ends in <b></b></p>` : ""}
        <a class="btn btn-orange" href="classroom.html#packages"><i class="fas fa-gem"></i> Must try — See packages</a>
        <button type="button" class="offer-pop__later">Maybe later</button>
      </div>`;
    document.body.append(d);
    const close = () => { d.close(); d.remove(); };
    d.querySelector(".offer-pop__x").onclick = close;
    d.querySelector(".offer-pop__later").onclick = close;
    d.addEventListener("click", (e) => { if (e.target === d) close(); });
    const cd = d.querySelector(".offer-pop__cd"); if (cd) tick(cd, o.endsOn, () => cd.remove());
    d.showModal();
    try { sessionStorage.setItem("spa_offer_seen", "1"); } catch {}
  }, delay);
}
