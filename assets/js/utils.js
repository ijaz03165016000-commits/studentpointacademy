/* Shared helpers used by page scripts */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function parseDate(d) {
  const [y, m, day] = String(d || "").slice(0, 10).split("-").map(Number);
  return y ? { y, m: m - 1, d: day } : null;
}
export function formatDate(d) {
  const p = parseDate(d);
  return p ? `${p.d} ${MONTHS[p.m]} ${p.y}` : "";
}
export function dayMonth(d) {
  const p = parseDate(d);
  return p ? { day: p.d, mon: `${MONTHS[p.m]} ${p.y}` } : { day: "", mon: "" };
}

export function readingTime(html) {
  const words = String(html || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200)) + " min read";
}

/* Allow-list sanitizer for article HTML written in the admin editor */
const ALLOWED = new Set(["P", "H2", "H3", "H4", "UL", "OL", "LI", "STRONG", "B", "EM", "I", "U", "A", "BLOCKQUOTE", "BR", "IMG", "FIGURE", "FIGCAPTION", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "HR", "SPAN"]);
const ATTRS = { A: ["href", "title"], IMG: ["src", "alt"], TD: ["colspan"], TH: ["colspan"] };
export function sanitize(html) {
  const doc = new DOMParser().parseFromString(`<div>${html || ""}</div>`, "text/html");
  const walk = (node) => {
    [...node.children].forEach((el) => {
      if (!ALLOWED.has(el.tagName)) {
        if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED"].includes(el.tagName)) { el.remove(); return; }
        el.replaceWith(...el.childNodes); walk(node); return;
      }
      [...el.attributes].forEach((a) => {
        const ok = (ATTRS[el.tagName] || []).includes(a.name);
        const bad = /^\s*javascript:/i.test(a.value);
        if (!ok || bad) el.removeAttribute(a.name);
      });
      if (el.tagName === "A") { el.setAttribute("rel", "noopener"); if (/^https?:/i.test(el.getAttribute("href") || "")) el.setAttribute("target", "_blank"); }
      if (el.tagName === "IMG") el.setAttribute("loading", "lazy");
      walk(el);
    });
  };
  walk(doc.body.firstChild);
  return doc.body.firstChild.innerHTML;
}

export function excerptOf(a, n = 150) {
  if (a.excerpt) return a.excerpt;
  const t = String(a.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "…" : t;
}

export function articleCard(a) {
  const cover = a.cover || "assets/img/cover-default.svg";
  return `
  <a class="article-card" href="article.html?id=${encodeURIComponent(a.id)}">
    <img class="article-card__img" src="${esc(cover)}" alt="" loading="lazy" width="640" height="360">
    <div class="article-card__body">
      <div class="article-card__meta"><span class="chip chip--gold">${esc(a.category)}</span><span>${formatDate(a.date)}</span></div>
      <h3>${esc(a.title)}</h3>
      <p>${esc(excerptOf(a))}</p>
    </div>
  </a>`;
}

export function noticeItem(a) {
  const dm = dayMonth(a.date);
  const urgent = a.urgent || a.category === "Urgent";
  const chip = urgent ? `<span class="chip chip--red">Urgent</span>` : `<span class="chip">${esc(a.category)}</span>`;
  const isPdf = /\.pdf($|\?)|application\/pdf/i.test(a.attachment || "");
  const attach = a.attachment
    ? `<a class="notice__attach" href="${esc(a.attachment)}" target="_blank" rel="noopener">${isPdf ? "Download PDF" : "View attachment"}</a>` : "";
  return `
  <li class="notice${urgent ? " notice--urgent" : ""}" id="n-${esc(a.id)}">
    <div class="notice__date"><span class="notice__day">${dm.day}</span><span class="notice__mon">${dm.mon}</span></div>
    <div>
      ${chip}${a.pinned && !urgent ? ' <span class="chip chip--gold">Pinned</span>' : ""}
      <h3>${esc(a.title)}</h3>
      <p>${esc(a.description)}</p>
      ${attach}
    </div>
  </li>`;
}

export function initials(name) {
  return String(name).replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Miss)\s+/i, "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

/* Pakistani mobile: 03XX-XXXXXXX (dash optional) */
export const PHONE_RE = /^03\d{2}-?\d{7}$/;
