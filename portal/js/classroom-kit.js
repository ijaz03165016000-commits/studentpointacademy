/* ==========================================================
   Online Classroom building blocks, shared by the portal and
   the public website: the live offer, file pickers, the voice
   recorder, and how attachments are shown.
   ========================================================== */
import * as store from "./store.js";
import { CLASSROOM, CLASSES } from "./school.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/* ---------------- The offer (admin-editable) ---------------- */
export async function getOffer() {
  let saved = null;
  try { saved = await store.get("settings", "classroomOffer"); } catch { /* offline or rules not published yet */ }
  const o = { ...CLASSROOM.offer, ...(saved || {}) };
  o.price = Number(o.price) || CLASSROOM.offer.price;
  o.oldPrice = Number(o.oldPrice) || 0;
  o.days = Number(o.days) || 30;
  o.seats = Number(o.seats) || 0;
  o.taken = Number(o.taken) || 0;
  o.classes = (o.classes?.length ? o.classes : CLASSROOM.eligible).filter((id) => CLASSES.some((c) => c.id === id));
  o.perks = (o.perks || []).filter(Boolean);
  o.seatsLeft = o.seats ? Math.max(0, o.seats - o.taken) : null;
  o.expired = !!o.endsOn && o.endsOn < todayIso();
  o.full = o.seats > 0 && o.seatsLeft === 0;
  o.open = !!o.active && !o.expired && !o.full;
  return o;
}

/* "3 days 04:12:09" until the end of the offer's last day */
export function countdown(endsOn) {
  if (!endsOn) return null;
  const ms = new Date(endsOn + "T23:59:59").getTime() - Date.now();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return { d, h, m, s: sec, text: `${d ? d + (d === 1 ? " day " : " days ") : ""}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` };
}

/* ---------------- Files ---------------- */
export const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");

/* Shrink large photos (phone cameras make 4–8 MB images) to ~1600px JPEG */
export async function shrinkImage(file, max = 1600, quality = 0.82) {
  if (!/^image\/(jpeg|png|webp|heic|heif)/i.test(file.type) || file.size < 350 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch { return file; }
}

/* A multi-file picker (photos from camera/gallery, PDFs, audio files) */
export function attachBox(id, { label = "Attach photos or PDF", accept = "image/*,application/pdf,audio/*" } = {}) {
  return `<div class="attach" id="${id}">
    <div class="attach__btns">
      <label class="btn btn--outline btn--sm attach__btn"><input type="file" accept="${accept}" multiple hidden data-pick>📎 ${esc(label)}</label>
      <label class="btn btn--outline btn--sm attach__btn"><input type="file" accept="image/*" capture="environment" hidden data-pick>📷 Take photo</label>
    </div>
    <ul class="attach__list" data-list></ul>
  </div>`;
}
export function wireAttach(root, id) {
  const box = root.querySelector("#" + id); let files = [];
  const draw = () => {
    box.querySelector("[data-list]").innerHTML = files.map((f, i) => `<li><span class="attach__ic">${f.type.startsWith("image/") ? "🖼️" : f.type.startsWith("audio/") ? "🎧" : "📄"}</span><span class="attach__name">${esc(f.name)}</span><span class="muted small">${fmtSize(f.size)}</span><button type="button" class="linkbtn linkbtn--danger" data-rm="${i}" aria-label="Remove ${esc(f.name)}">Remove</button></li>`).join("");
    box.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => { files.splice(Number(b.dataset.rm), 1); draw(); }));
  };
  box.querySelectorAll("[data-pick]").forEach((inp) => (inp.onchange = async () => {
    const add = [...inp.files]; inp.value = "";
    for (const f of add) {
      if (files.length >= CLASSROOM.maxFiles) { alertBox(box, `You can attach up to ${CLASSROOM.maxFiles} files.`); break; }
      const s = await shrinkImage(f);
      if (s.size > CLASSROOM.maxFileMB * 1048576) { alertBox(box, `“${f.name}” is larger than ${CLASSROOM.maxFileMB} MB.`); continue; }
      files.push(s);
    }
    draw();
  }));
  return { files: () => files.slice(), reset: () => { files = []; draw(); } };
}
function alertBox(box, msg) {
  let p = box.querySelector(".attach__err");
  if (!p) { p = document.createElement("p"); p.className = "attach__err"; p.setAttribute("role", "alert"); box.append(p); }
  p.textContent = msg; setTimeout(() => p.remove(), 5000);
}

/* ---------------- Voice notes ---------------- */
const pickMime = () => {
  if (typeof MediaRecorder === "undefined") return null;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
};
const extFor = (t) => (/mp4|m4a|aac/.test(t) ? "m4a" : /ogg/.test(t) ? "ogg" : /mpeg|mp3/.test(t) ? "mp3" : /wav/.test(t) ? "wav" : "webm");

export function voiceBox(id, { label = "Record a voice note" } = {}) {
  return `<div class="voice" id="${id}">
    <div class="voice__row">
      <button type="button" class="voice__rec" data-rec aria-label="${esc(label)}"><span class="voice__dot"></span><span data-rec-label>🎤 ${esc(label)}</span></button>
      <span class="voice__time" data-time aria-live="polite"></span>
      <label class="linkbtn voice__file"><input type="file" accept="audio/*" hidden data-audio-file>or choose an audio file</label>
    </div>
    <div class="voice__preview" data-preview hidden></div>
    <p class="voice__err" data-err role="alert" hidden></p>
  </div>`;
}
export function wireVoice(root, id) {
  const box = root.querySelector("#" + id);
  const btn = box.querySelector("[data-rec]"), lbl = box.querySelector("[data-rec-label]"), time = box.querySelector("[data-time]");
  const prev = box.querySelector("[data-preview]"), err = box.querySelector("[data-err]");
  const idle = lbl.textContent;
  let rec = null, chunks = [], stream = null, timer = null, t0 = 0, file = null;
  const showErr = (m) => { err.textContent = m; err.hidden = !m; };
  const setFile = (f) => {
    file = f;
    if (!f) { prev.hidden = true; prev.innerHTML = ""; return; }
    prev.hidden = false;
    prev.innerHTML = `<audio controls preload="metadata" src="${URL.createObjectURL(f)}"></audio><span class="muted small">${fmtSize(f.size)}</span><button type="button" class="linkbtn linkbtn--danger" data-del>Delete</button>`;
    prev.querySelector("[data-del]").onclick = () => setFile(null);
  };
  const stop = () => { if (rec && rec.state !== "inactive") rec.stop(); };
  const mime = pickMime();
  if (mime === null || !navigator.mediaDevices?.getUserMedia) {
    btn.disabled = true; lbl.textContent = "🎤 Recording isn't supported in this browser";
  }
  btn.onclick = async () => {
    if (rec && rec.state === "recording") { stop(); return; }
    showErr("");
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { showErr("Microphone permission was blocked. Allow the microphone for this site in your browser settings, or choose an audio file instead."); return; }
    chunks = [];
    rec = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 48000 }) : new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      clearInterval(timer); stream.getTracks().forEach((t) => t.stop());
      box.classList.remove("is-rec"); lbl.textContent = "🎤 Record again"; time.textContent = "";
      const type = (rec.mimeType || mime || "audio/webm").split(";")[0];
      const blob = new Blob(chunks, { type });
      if (blob.size < 800) { showErr("Nothing was recorded. Try again and speak close to the phone."); return; }
      setFile(new File([blob], `voice-note-${Date.now()}.${extFor(type)}`, { type }));
    };
    rec.start(250); t0 = Date.now(); box.classList.add("is-rec"); lbl.textContent = "⏹ Stop recording"; setFile(null);
    timer = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} / ${Math.floor(CLASSROOM.maxVoiceSec / 60)}:00`;
      if (s >= CLASSROOM.maxVoiceSec) stop();
    }, 250);
  };
  box.querySelector("[data-audio-file]").onchange = (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    if (f.size > CLASSROOM.maxFileMB * 1048576) { showErr(`That audio file is larger than ${CLASSROOM.maxFileMB} MB.`); return; }
    showErr(""); setFile(f);
  };
  return { file: () => file, recording: () => rec?.state === "recording", stop, reset: () => setFile(null) };
}

/* Upload attachments + optional voice note. onStep(text) shows progress. */
export async function uploadBundle(files = [], voice = null, onStep = () => {}) {
  const out = []; let audio = null; const all = [...files, ...(voice ? [voice] : [])];
  for (let i = 0; i < all.length; i++) {
    onStep(`Uploading ${i + 1} of ${all.length}…`);
    const m = await store.uploadFile(all[i]);
    if (voice && all[i] === voice) audio = m; else out.push(m);
  }
  return { files: out, audio };
}

/* ---------------- Showing attachments ---------------- */
export const audioPlayer = (a, label = "") => a?.url ? `<div class="vnote">${label ? `<span class="vnote__lbl">🎧 ${esc(label)}</span>` : ""}<audio controls preload="none" src="${esc(a.url)}"></audio><a class="linkbtn small" href="${esc(a.url)}" download="${esc(a.name || "voice-note")}" target="_blank" rel="noopener">Download</a></div>` : "";

export function filesView(files = []) {
  if (!files?.length) return "";
  const imgs = files.filter((f) => f.type?.startsWith("image/") && f.url), audios = files.filter((f) => f.type?.startsWith("audio/")), rest = files.filter((f) => !imgs.includes(f) && !audios.includes(f));
  return `<div class="files">
    ${imgs.length ? `<div class="files__imgs">${imgs.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener" title="${esc(f.name)}"><img src="${esc(f.url)}" alt="${esc(f.name)}" loading="lazy"></a>`).join("")}</div>` : ""}
    ${audios.map((f) => audioPlayer(f, f.name)).join("")}
    ${rest.map((f) => `<a class="files__doc" href="${esc(f.url || "#")}" target="_blank" rel="noopener" download="${esc(f.name)}">📄 ${esc(f.name)} <span class="muted small">${f.size ? fmtSize(f.size) : ""}</span></a>`).join("")}
  </div>`;
}

export const stars = (n) => n ? `<span class="stars" aria-label="${n} out of 5 stars">${"★".repeat(n)}<span>${"★".repeat(5 - n)}</span></span>` : "";
