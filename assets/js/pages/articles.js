import { listArticles } from "../data.js";
import { ARTICLE_CATEGORIES } from "../config.js";
import { articleCard, esc, excerptOf } from "../utils.js";

const PAGE = 9;
const listEl = document.getElementById("art-list");
const moreBtn = document.getElementById("load-more");
const search = document.getElementById("art-search");
const filter = document.getElementById("cat-filter");

const params = new URLSearchParams(location.search);
let all = [], cat = params.get("category") || "All", shown = PAGE;

filter.innerHTML = ["All", ...ARTICLE_CATEGORIES].map((c) =>
  `<button type="button" aria-pressed="${c === cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
filter.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  cat = b.dataset.cat; shown = PAGE;
  filter.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  render();
});
let t;
search.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { shown = PAGE; render(); }, 200); });
moreBtn.addEventListener("click", () => { shown += PAGE; render(); });

function render() {
  const q = search.value.trim().toLowerCase();
  const list = all.filter((a) =>
    (cat === "All" || a.category === cat) &&
    (!q || (a.title + " " + excerptOf(a) + " " + a.category).toLowerCase().includes(q)));
  listEl.innerHTML = list.length
    ? list.slice(0, shown).map(articleCard).join("")
    : `<p class="empty" style="grid-column:1/-1">No articles match${q ? ` "${esc(q)}"` : ""}${cat !== "All" ? ` in ${esc(cat)}` : ""}. Try another category or search word.</p>`;
  moreBtn.hidden = list.length <= shown;
}

listArticles().then((l) => { all = l; render(); })
  .catch(() => { listEl.innerHTML = `<p class="empty" style="grid-column:1/-1">Articles could not be loaded. Refresh the page to try again.</p>`; });
