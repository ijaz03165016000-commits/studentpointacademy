import { getArticle, listArticles } from "../data.js";
import { articleCard, esc, excerptOf, formatDate, readingTime, sanitize } from "../utils.js";

const id = new URLSearchParams(location.search).get("id");
const top = document.getElementById("article-top");
const body = document.getElementById("article-body");

function notFound() {
  top.innerHTML = `<h1>Article not found</h1><p>This article may have been moved or removed.</p><a class="btn btn-primary" href="articles.html">Browse all articles</a>`;
  body.innerHTML = `<div style="height:60px"></div>`;
}

function setMeta(a) {
  document.title = `${a.title} | Student Point Academy`;
  const desc = excerptOf(a, 155);
  document.querySelector('meta[name="description"]')?.setAttribute("content", desc);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", a.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", desc);
}

const ICONS = {
  wa: '<svg viewBox="0 0 32 32" fill="#25D366" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm5.9 15.7c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7a.6.6 0 0 0 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8 1 3.9.8a3.3 3.3 0 0 0 2.1-1.5 2.7 2.7 0 0 0 .2-1.5c-.1-.2-.3-.3-.7-.5z"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true"><path d="M14 8V6.2c0-.8.2-1.2 1.4-1.2H17V2h-2.6C11.3 2 10 3.5 10 6v2H8v3h2v11h4V11h2.7l.3-3z"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a1 1 0 1 1 1.4 1.4L12 13.4a1 1 0 0 1-1.4 0zM8 20a5 5 0 0 1-3.5-8.5l2-2 1.4 1.4-2 2A3 3 0 0 0 10.1 17l2-2 1.4 1.4-2 2A5 5 0 0 1 8 20zm9.5-5.5-1.4-1.4 2-2A3 3 0 0 0 13.9 7l-2 2-1.4-1.4 2-2a5 5 0 0 1 7 7z"/></svg>'
};

getArticle(id).then((a) => {
  if (!a || a.status !== "published") return notFound();
  setMeta(a);
  const url = location.href;
  const share = encodeURIComponent(`${a.title} — ${url}`);
  top.innerHTML = `
    <span class="chip chip--gold">${esc(a.category)}</span>
    <h1 style="margin-top:14px">${esc(a.title)}</h1>
    <div class="article-meta"><span>By ${esc(a.author || "Student Point Academy")}</span><span>${formatDate(a.date)}</span><span>${readingTime(a.content)}</span></div>`;
  body.innerHTML = `
    ${a.cover ? `<img class="article-cover" src="${esc(a.cover)}" alt="">` : ""}
    <div class="article-layout" style="padding-bottom:72px">
      <article class="prose">${sanitize(a.content)}</article>
      <aside class="share">
        <h2>Share this article</h2>
        <div class="share__btns">
          <a href="https://wa.me/?text=${share}" target="_blank" rel="noopener">${ICONS.wa}WhatsApp</a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">${ICONS.fb}Facebook</a>
          <button type="button" id="copy-link">${ICONS.link}<span>Copy link</span></button>
        </div>
      </aside>
    </div>`;
  document.getElementById("copy-link").addEventListener("click", async (e) => {
    const label = e.currentTarget.querySelector("span");
    try { await navigator.clipboard.writeText(url); label.textContent = "Link copied"; }
    catch { label.textContent = "Copy failed, use the address bar"; }
    setTimeout(() => (label.textContent = "Copy link"), 2500);
  });

  listArticles().then((all) => {
    const others = all.filter((x) => x.id !== a.id);
    const related = [...others.filter((x) => x.category === a.category), ...others.filter((x) => x.category !== a.category)].slice(0, 3);
    if (related.length) {
      document.getElementById("related").innerHTML = related.map(articleCard).join("");
      document.getElementById("related-wrap").hidden = false;
    }
  }).catch(() => {});
}).catch(notFound);
