/* Parent portal — same views as the student portal, for a chosen child, plus messages */
import * as store from "../store.js";
import { className } from "../school.js";
import { $$, esc, avatar } from "../ui.js";
import { studentViews, noticesView, profileView, messagesView, unreadCount } from "./shared.js";

let kids = [], current = "";
const KEY = "spa_portal_child";

export async function init(user) {
  const all = await Promise.all((user.children || []).map((id) => store.get("students", id)));
  kids = all.filter(Boolean);
  try { current = sessionStorage.getItem(KEY) || ""; } catch {}
  if (!kids.find((k) => k.id === current)) current = kids[0]?.id || "";
}

/* child switcher shown on top of each child view */
function header() {
  if (kids.length < 2) return "";
  return `<div class="kid-switch" role="group" aria-label="Choose child">${kids.map((k) => `<button type="button" data-kid="${esc(k.id)}" aria-pressed="${k.id === current}">${avatar(k.name)}<span>${esc(k.name)}<small>${esc(className(k.classId))}</small></span></button>`).join("")}</div>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-kid]"); if (!b) return;
  current = b.dataset.kid;
  try { sessionStorage.setItem(KEY, current); } catch {}
  window.dispatchEvent(new HashChangeEvent("hashchange"));
});

export const nav = [
  { id: "home", label: "Dashboard", icon: "home" },
  { id: "attendance", label: "Attendance", icon: "checklist" },
  { id: "results", label: "Results", icon: "chart" },
  { id: "fees", label: "Fees", icon: "money" },
  { id: "homework", label: "Homework", icon: "book" },
  { id: "timetable", label: "Timetable", icon: "calendar" },
  { id: "leave", label: "Apply leave", icon: "leave" },
  { id: "messages", label: "Message teachers", icon: "chat" },
  { id: "notices", label: "Notices", icon: "bell" }
];

const sv = studentViews(() => current, { forParent: true, header });
const guard = (fn) => async (ctx) => {
  if (!current) { ctx.el.innerHTML = `<div class="card2"><h3>No children linked yet</h3><p class="muted">Ask the academy office to link your children to this parent account.</p></div>`; return; }
  return fn(ctx);
};
export const views = Object.fromEntries(Object.entries(sv).map(([k, f]) => [k, guard(f)]));
Object.assign(views, {
  messages: messagesView({ side: "parent" }),
  notices: noticesView("parents"),
  profile: profileView(async (u) => [["Parent ID", u.loginId], ["Children", kids.map((k) => `${k.name} (${className(k.classId)})`).join(", ")], ["Phone on record", kids[0]?.phone]])
});

export async function counts(user) { return { messages: await unreadCount("parent", user.id) }; }
