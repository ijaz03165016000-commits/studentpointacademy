/* Portal shell: checks sign-in, builds the menu for the user's role and routes #/view?x=y */
import * as store from "./store.js";
import { ROLES } from "./school.js";
import { $, $$, esc, icon, avatar, toast } from "./ui.js";

const MODULES = {
  student: () => import("./views/student.js"),
  parent: () => import("./views/parent.js"),
  staff: () => import("./views/staff.js"),
  principal: () => import("./views/principal.js"),
  admin: () => import("./views/admin.js")
};

let user, mod;

function parseHash() {
  const h = location.hash.replace(/^#\/?/, "") || "home";
  const [view, qs] = h.split("?");
  return { view, params: Object.fromEntries(new URLSearchParams(qs || "")) };
}
export function go(view, params = {}) {
  const qs = new URLSearchParams(params).toString();
  location.hash = "#/" + view + (qs ? "?" + qs : "");
}

function setMenu(open) {
  $("#side").classList.toggle("is-open", open);
  $("#side-backdrop").classList.toggle("is-open", open);
  $("#menu-btn").setAttribute("aria-expanded", String(open));
}

function buildNav() {
  $("#side-nav").innerHTML = mod.nav.map((n) => n.label && !n.id
    ? `<div class="side__label">${esc(n.label)}</div>`
    : n.href ? `<a href="${n.href}" target="_blank" rel="noopener">${icon(n.icon)}<span>${esc(n.label)}</span></a>`
    : `<a href="#/${n.id}" data-nav="${n.id}">${icon(n.icon)}<span>${esc(n.label)}</span><span class="count" data-count="${n.id}" hidden></span></a>`).join("");
}

export async function refreshCounts() {
  if (!mod.counts) return;
  try {
    const c = await mod.counts(user);
    $$("[data-count]").forEach((el) => { const n = c[el.dataset.count]; el.hidden = !n; el.textContent = n || ""; });
  } catch {}
}

async function route() {
  const { view, params } = parseHash();
  const def = mod.views[view] ? view : "home";
  const nav = mod.nav.find((n) => n.id === def) || mod.nav.find((n) => n.id === (mod.parentOf?.[def]));
  $$("[data-nav]").forEach((a) => (a.dataset.nav === (nav?.id || def) ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  setMenu(false);
  const el = $("#view");
  const title = (t) => { $("#page-title").textContent = t; document.title = `${t} | Student Point Academy`; };
  title(nav?.label || "Portal");
  el.innerHTML = `<p class="loading">Loading…</p>`;
  try {
    await mod.views[def]({ el, params, user, go, title, refreshCounts });
  } catch (err) {
    console.error(err);
    el.innerHTML = `<div class="card2"><h3>Something went wrong</h3><p class="muted">${esc(err.message || err)}</p><button class="btn btn--navy btn--sm" onclick="location.reload()">Reload</button></div>`;
  }
  el.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

async function start() {
  try { user = await store.currentUser(); } catch (e) { user = null; }
  if (!user || !MODULES[user.role]) { location.replace("index.html"); return; }
  const sub = await import("./views/subscribe.js");
  if (sub.needsSubscription(user)) {
    // No active subscription: the student sees only the payment screen
    mod = { nav: [{ id: "home", label: "Activate portal", icon: "star" }], views: { home: sub.paywall } };
  } else {
    mod = await MODULES[user.role]();
    if (mod.init) await mod.init(user);
  }

  $("#side-role").textContent = ROLES[user.role].home;
  $("#me").innerHTML = `<span class="me__text"><b>${esc(user.name)}</b><span>${esc(ROLES[user.role].label)}${user.loginId ? " · " + esc(user.loginId) : ""}</span></span>${avatar(user.name, user.role === "principal" || user.role === "admin" ? "avatar--gold" : "")}`;
  $("#me").setAttribute("aria-label", "My profile");
  if (!store.IS_LIVE) {
    $("#demo-strip").innerHTML = `<div class="demo-strip">Demo mode — sample data saved in this browser only. <button class="linkbtn" id="reset">Reset demo data</button></div>`;
    $("#reset").onclick = () => { store.resetDemo(); location.replace("index.html"); };
  }
  buildNav();
  $("#menu-btn").onclick = () => setMenu(true);
  $("#side-backdrop").onclick = () => setMenu(false);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  $("#logout").onclick = async () => { await store.signOut(); location.replace("index.html"); };
  window.addEventListener("hashchange", route);
  await route();
  refreshCounts();
}

start().catch((e) => { console.error(e); toast("Could not open the portal: " + e.message, true); });
