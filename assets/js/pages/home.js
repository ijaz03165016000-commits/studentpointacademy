/* Home page: latest announcements & articles, live notice count,
   and saving the demo / fee-receipt / join-us forms to the admin panel. */
import { listArticles, listAnnouncements, addInquiry } from "../data.js";
import { articleCard, noticeItem } from "../utils.js";

const artBox = document.getElementById("homeArticles");
listArticles().then((list) => {
  artBox.innerHTML = list.length
    ? list.slice(0, 2).map(articleCard).join("")
    : `<p class="empty" style="grid-column:1/-1">New articles will appear here soon.</p>`;
}).catch(() => { artBox.innerHTML = `<p class="empty" style="grid-column:1/-1">Articles could not be loaded. Refresh the page to try again.</p>`; });

const nBox = document.getElementById("homeNotices");
listAnnouncements().then((list) => {
  nBox.innerHTML = list.length
    ? list.slice(0, 4).map(noticeItem).join("")
    : `<li class="empty">No announcements right now.</li>`;
  const c = document.getElementById("portalAnnCount");
  if (c) c.textContent = list.length ? `${list.length} active notice${list.length === 1 ? "" : "s"}` : "No new updates";
}).catch(() => { nBox.innerHTML = `<li class="empty">Announcements could not be loaded. Refresh the page to try again.</li>`; });

/* Forms still open WhatsApp exactly as before; each entry is also saved
   so it shows up in the admin panel. A failed save never blocks the visitor. */
window.addEventListener("spa:form", (e) => {
  const { data, file } = e.detail || {};
  if (!data) return;
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v != null && v !== ""));
  if (clean.phone) clean.phone = clean.phone.replace(/\s/g, "");
  addInquiry(clean, file).catch((err) => console.warn("Could not save form entry:", err));
});
