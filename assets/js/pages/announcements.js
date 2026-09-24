import { listAnnouncements } from "../data.js";
import { ANNOUNCEMENT_CATEGORIES } from "../config.js";
import { esc, noticeItem } from "../utils.js";

const listEl = document.getElementById("ann-list");
const filter = document.getElementById("ann-filter");
let all = [], cat = "All";

filter.innerHTML = ["All", ...ANNOUNCEMENT_CATEGORIES].map((c) =>
  `<button type="button" aria-pressed="${c === cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
filter.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  cat = b.dataset.cat;
  filter.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  render();
});

function render() {
  const list = all.filter((a) => cat === "All" || a.category === cat || (cat === "Urgent" && a.urgent));
  listEl.innerHTML = list.length ? list.map(noticeItem).join("")
    : `<li class="empty">No ${cat === "All" ? "" : esc(cat.toLowerCase()) + " "}announcements right now.</li>`;
}

listAnnouncements().then((l) => {
  all = l; render();
  if (location.hash) {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) { el.scrollIntoView({ block: "center" }); el.style.outline = "3px solid var(--gold)"; el.style.outlineOffset = "4px"; el.style.borderRadius = "12px"; }
  }
}).catch(() => { listEl.innerHTML = `<li class="empty">Announcements could not be loaded. Refresh the page to try again.</li>`; });
