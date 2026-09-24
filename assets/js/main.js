/* Runs on every public page: announcement ticker, and the mobile menu on sub-pages */
import { listAnnouncements } from "./data.js";
import { esc } from "./utils.js";

/* ---- Announcement ticker ---- */
const track = document.querySelector(".ticker__track");
if (track) {
  listAnnouncements().then((list) => {
    const items = list.slice(0, 6);
    if (!items.length) { document.querySelector(".ticker")?.remove(); return; }
    track.innerHTML = items.map((a) => {
      const urgent = a.urgent || a.category === "Urgent";
      return `<a href="announcements.html#n-${esc(a.id)}"${urgent ? ' class="is-urgent"' : ""}>${urgent ? "🔴 Urgent: " : "📢 "}${esc(a.title)}</a>`;
    }).join("");
    const dur = Math.max(25, items.reduce((n, a) => n + a.title.length, 0) / 6);
    track.style.animationDuration = dur + "s";
  }).catch(() => document.querySelector(".ticker")?.remove());
}

/* ---- Mobile menu (sub-pages; the home page has its own) ---- */
if (document.body.dataset.subpage !== undefined) {
  const hb = document.getElementById("hamburger");
  const mm = document.getElementById("mobileMenu");
  hb?.addEventListener("click", () => { hb.classList.toggle("open"); mm.classList.toggle("open"); });
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
}
