/* Student card & employee card: completeness checklist, data entry, preview, issue, print */
import * as store from "../store.js";
import { SITE } from "../../../assets/js/config.js";
import { ID_CARD, className, SESSION } from "../school.js";
import { $, $$, esc, icon, card, pill, toast, field, options, fmtDate, today, initials } from "../ui.js";

/* edit: "self" = the student/staff member can fill it; "office" = only the academy office; "record" = comes from the main record */
export const FIELDS = {
  student: [
    { key: "photo", label: "Photo", edit: "self" },
    { key: "name", label: "Full name", edit: "record" },
    { key: "fatherName", label: "Father's name", edit: "record" },
    { key: "classId", label: "Class", edit: "record" },
    { key: "rollNo", label: "Roll no.", edit: "record" },
    { key: "dob", label: "Date of birth", edit: "self", type: "date" },
    { key: "bloodGroup", label: "Blood group", edit: "self", type: "blood" },
    { key: "phone", label: "Parent's phone", edit: "office", type: "tel" },
    { key: "address", label: "Home address", edit: "self", type: "text" }
  ],
  staff: [
    { key: "photo", label: "Photo", edit: "self" },
    { key: "name", label: "Full name", edit: "record" },
    { key: "designation", label: "Designation", edit: "record" },
    { key: "phone", label: "Mobile number", edit: "self", type: "tel" },
    { key: "bloodGroup", label: "Blood group", edit: "self", type: "blood" },
    { key: "joinDate", label: "Joining date", edit: "office", type: "date" },
    { key: "address", label: "Home address", edit: "self", type: "text" }
  ]
};
const COL = { student: "students", staff: "staff" };
const LABEL = { student: "Student card", staff: "Employee card" };

export const missing = (kind, r) => FIELDS[kind].filter((f) => r[f.key] === undefined || r[f.key] === null || String(r[f.key]).trim() === "");
const addYears = (s, n) => { const d = new Date(s + "T12:00"); d.setFullYear(d.getFullYear() + n); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

/* ---------------- Photo: crop to 4:5 and shrink so it fits in the database record ---------------- */
export function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) return reject(new Error("Choose a photo (JPG or PNG)."));
    if (file.size > 12 * 1024 * 1024) return reject(new Error("That photo is too large. Use one under 12 MB."));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const W = 300, H = 375, r = W / H;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (sw / sh > r) { sw = sh * r; sx = (img.width - sw) / 2; } else { sh = sw / r; sy = Math.max(0, (img.height - sh) * 0.25); }
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
      g.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that photo. Try a JPG or PNG.")); };
    img.src = url;
  });
}

/* ---------------- Card design ---------------- */
const logo = "../assets/img/logo-light.svg";
const photoBox = (r) => r.photo ? `<img class="idc__photo" src="${esc(r.photo)}" alt="">` : `<div class="idc__photo idc__photo--empty"><span>${esc(initials(r.name || "?"))}</span><small>Photo</small></div>`;

export function cardFront(kind, r) {
  const rows = kind === "student"
    ? [["Father", r.fatherName], ["Class", className(r.classId).replace("Class ", "")], ["Roll no.", r.rollNo], ["Blood group", r.bloodGroup], ["Date of birth", r.dob ? fmtDate(r.dob) : ""]]
    : [["Designation", r.designation], ["Department", (r.subjects || []).slice(0, 2).join(", ") || "Administration"], ["Blood group", r.bloodGroup], ["Mobile", r.phone], ["Joined", r.joinDate ? fmtDate(r.joinDate) : ""]];
  const valid = r.cardValidUntil || (kind === "student" ? ID_CARD.studentValidUntil : addYears(today(), ID_CARD.staffValidYears));
  return `<div class="idc idc--front idc--${kind}">
    <div class="idc__top"><img src="${logo}" alt=""><div><b>${esc(SITE.name)}</b><span>${esc(SITE.city)}</span></div></div>
    <div class="idc__ribbon">${kind === "student" ? "STUDENT CARD" : "EMPLOYEE CARD"}</div>
    ${photoBox(r)}
    <div class="idc__name">${esc(r.name || "Your name")}</div>
    <div class="idc__id">${esc(kind === "student" ? r.id : "EMP-" + r.id)}</div>
    <dl class="idc__rows">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || "—")}</dd>`).join("")}</dl>
    <div class="idc__foot"><span>${kind === "student" ? "Session " + esc(SESSION) : "Staff"}</span><span>Valid till ${fmtDate(valid)}</span></div>
  </div>`;
}

export function cardBack(kind, r) {
  return `<div class="idc idc--back idc--${kind}">
    <div class="idc__backtop"><img src="${logo}" alt=""><b>${esc(SITE.name)}</b></div>
    <div class="idc__backbody">
      <p class="idc__note">This card is the property of ${esc(SITE.name)} and must be carried at all times at the academy. It is not transferable.</p>
      <dl class="idc__rows idc__rows--back">
        <dt>Address</dt><dd>${esc(r.address || "—")}</dd>
        <dt>${kind === "student" ? "Emergency" : "Mobile"}</dt><dd>${esc(r.phone || "—")}</dd>
        <dt>Blood group</dt><dd>${esc(r.bloodGroup || "—")}</dd>
        <dt>Issued</dt><dd>${r.cardIssuedAt ? fmtDate(r.cardIssuedAt) : "Not issued yet"}</dd>
      </dl>
      <div class="idc__sign"><span></span>Principal</div>
      <div class="idc__return"><b>If found, please return to:</b>${esc(SITE.address)}<br>${esc(SITE.phone)} · ${esc(SITE.email || SITE.website.replace(/^https?:\/\/(www\.)?/, ""))}</div>
    </div>
    <div class="idc__stripe"></div>
  </div>`;
}

/* ---------------- Page ---------------- */
/* kind: "student" | "staff"; office: true when the admin/principal is editing someone else's card */
export function idCardPage(kind, { office = false, canIssue = true } = {}) {
  return async function idCard({ el, user, params, title }) {
    const id = office ? params.id : user.linkId;
    const col = COL[kind];
    const rec = await store.get(col, id);
    if (!rec) { el.innerHTML = card(LABEL[kind], `<p class="muted">Record not found.</p>`); return; }
    if (office) title(`${LABEL[kind]} — ${rec.name}`);
    const draft = { ...rec };
    const issued = !!rec.cardIssuedAt;
    const canEdit = (f) => f.edit === "self" || (office && f.edit === "office") ? !(issued && !office) : false;
    const back = office ? `<a class="linkbtn" href="#/${kind === "student" ? "students" : "staff"}">← Back to ${kind === "student" ? "students" : "staff"}</a>` : "";

    const inputFor = (f) => {
      const v = draft[f.key] ?? "";
      if (f.key === "photo") return `<div class="photo-pick">${photoBox(draft)}<div><label class="btn btn--outline btn--sm" for="ph">${draft.photo ? "Change photo" : "Upload photo"}</label><input id="ph" type="file" accept="image/*" capture="user" hidden><div class="field__hint">Passport-style photo, face clearly visible, plain background.</div>${draft.photo ? `<button type="button" class="linkbtn linkbtn--danger" id="phx">Remove</button>` : ""}</div></div>`;
      if (f.type === "blood") return `<select id="f-${f.key}" data-k="${f.key}"><option value="">Select…</option>${options(ID_CARD.bloodGroups, v)}</select>`;
      if (f.type === "date") return `<input id="f-${f.key}" data-k="${f.key}" type="date" value="${esc(v)}" max="${today()}">`;
      if (f.type === "tel") return `<input id="f-${f.key}" data-k="${f.key}" inputmode="tel" placeholder="03XX-XXXXXXX" value="${esc(v)}">`;
      return `<input id="f-${f.key}" data-k="${f.key}" value="${esc(v)}" maxlength="120">`;
    };
    const shown = (f) => f.key === "classId" ? className(draft.classId) : f.type === "date" && draft[f.key] ? fmtDate(draft[f.key]) : draft[f.key];

    function render() {
      const miss = missing(kind, draft);
      const done = FIELDS[kind].length - miss.length;
      const pctDone = Math.round((done / FIELDS[kind].length) * 100);
      el.innerHTML = `${back ? `<p style="margin:0 0 12px">${back}</p>` : ""}
      <div class="grid grid--main idcard-layout">
        <div>
          ${card(issued ? "Card details" : "Complete your details", `
            <div class="progress"><span style="width:${pctDone}%"></span></div>
            <p class="muted small" style="margin:6px 0 16px">${done} of ${FIELDS[kind].length} details complete${miss.length ? " — still needed: " + miss.map((f) => f.label.toLowerCase()).join(", ") : ". Ready to issue!"}</p>
            <form id="cf" class="card-form" novalidate>
              ${FIELDS[kind].map((f) => {
                const ok = !miss.includes(f);
                const tick = `<span class="tick${ok ? " tick--ok" : ""}">${ok ? icon("check") : ""}</span>`;
                if (canEdit(f)) return `<div class="cf-row">${tick}<div class="field" style="flex:1"><label for="${f.key === "photo" ? "ph" : "f-" + f.key}">${f.label}</label>${inputFor(f)}</div></div>`;
                if (f.key === "photo") return `<div class="cf-row">${tick}<div style="flex:1"><div class="cf-label">${f.label}</div><div class="photo-pick">${photoBox(draft)}</div></div></div>`;
                return `<div class="cf-row">${tick}<div style="flex:1"><div class="cf-label">${f.label}</div><div class="cf-val">${esc(shown(f) || "—")}${!ok ? ` <span class="muted small">— ${f.edit === "office" || f.edit === "record" ? "the academy office will add this" : ""}</span>` : ""}</div></div></div>`;
              }).join("")}
              ${FIELDS[kind].some(canEdit) ? `<div class="form-status" role="alert"></div><div><button class="btn btn--navy" type="submit">Save details</button></div>` : ""}
            </form>
            ${issued && !office ? `<p class="muted small" style="margin-top:14px">Your card has been issued. To change any detail, contact the academy office.</p>` : ""}
            ${office && (FIELDS[kind].some((f) => f.edit === "record")) ? `<p class="muted small" style="margin-top:14px">Name, ${kind === "student" ? "father's name, class and roll no." : "designation"} are changed from the ${kind === "student" ? "Students" : "Staff"} page → Edit.</p>` : ""}
          `)}
        </div>
        <div>
          <section class="card2">
            <div class="card2__head"><h3>${LABEL[kind]} preview</h3>${issued ? pill("Issued " + fmtDate(rec.cardIssuedAt, false), "green") : miss.length ? pill("Incomplete", "gold") : pill("Ready to issue", "green")}</div>
            <div class="idc-pair" id="cardPrint">${cardFront(kind, draft)}${cardBack(kind, draft)}</div>
            <div class="idc-actions">
              ${!issued && canIssue ? `<button class="btn btn--gold" id="issue"${miss.length ? " disabled" : ""}>${icon("star").replace("<svg", '<svg width="18" height="18" fill="currentColor"')} Issue card</button>` : ""}
              ${issued ? `<button class="btn btn--navy" id="print">${icon("print").replace("<svg", '<svg width="18" height="18" fill="currentColor"')} Print / save as PDF</button>` : ""}
              ${issued && office ? `<button class="btn btn--outline btn--sm" id="reissue">Re-issue with current details</button>` : ""}
            </div>
            ${!issued && miss.length ? `<p class="muted small" style="margin-top:10px">The <b>Issue card</b> button unlocks when all details above are complete.</p>` : ""}
            ${issued ? `<p class="muted small" style="margin-top:10px">Prints at real ID-card size (54 × 86 mm), front and back. Choose “Save as PDF” in the print window to keep a copy, or take it to any print shop for PVC printing.</p>` : ""}
          </section>
        </div>
      </div>`;
      wire();
    }

    function wire() {
      const f = $("#cf");
      const refreshPreview = () => { $("#cardPrint").innerHTML = cardFront(kind, draft) + cardBack(kind, draft); };
      $$("[data-k]", f).forEach((i) => i.addEventListener("input", () => { draft[i.dataset.k] = i.value.trim(); refreshPreview(); }));
      $("#ph")?.addEventListener("change", async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try { draft.photo = await resizePhoto(file); render(); toast("Photo added — press Save details"); }
        catch (x) { toast(x.message, true); }
      });
      $("#phx")?.addEventListener("click", () => { draft.photo = ""; render(); });
      if (f.querySelector("[type=submit]")) f.onsubmit = async (e) => {
        e.preventDefault();
        const st = $(".form-status", f);
        const patch = {};
        FIELDS[kind].filter(canEdit).forEach((fl) => { if ((draft[fl.key] ?? "") !== (rec[fl.key] ?? "")) patch[fl.key] = draft[fl.key] ?? ""; });
        if (patch.phone && !/^03\d{2}-?\d{7}$/.test(patch.phone)) { st.textContent = "Phone should look like 03XX-XXXXXXX."; st.className = "form-status is-err"; return; }
        if (!Object.keys(patch).length) { toast("Nothing changed"); return; }
        try { await store.update(col, id, patch); Object.assign(rec, patch); toast("Details saved"); render(); }
        catch (x) { st.textContent = x.message; st.className = "form-status is-err"; }
      };
      const doIssue = async () => {
        if (missing(kind, draft).length) { toast("Complete all details first", true); return; }
        const unsaved = FIELDS[kind].filter(canEdit).some((fl) => (draft[fl.key] ?? "") !== (rec[fl.key] ?? ""));
        if (unsaved) { toast("Save your details first", true); return; }
        const patch = { cardNo: kind === "student" ? id : "EMP-" + id, cardIssuedAt: today(), cardValidUntil: kind === "student" ? ID_CARD.studentValidUntil : addYears(today(), ID_CARD.staffValidYears) };
        await store.update(col, id, patch); Object.assign(rec, patch); Object.assign(draft, patch);
        toast("Card issued!"); idCard({ el, user, params, title });
      };
      $("#issue")?.addEventListener("click", doIssue);
      $("#reissue")?.addEventListener("click", doIssue);
      $("#print")?.addEventListener("click", () => {
        document.body.classList.add("printing-card");
        window.print();
        setTimeout(() => document.body.classList.remove("printing-card"), 500);
      });
    }
    render();
  };
}

/* Small status used in admin tables */
export function cardStatus(kind, r) {
  if (r.cardIssuedAt) return pill("Issued", "green");
  return missing(kind, r).length ? pill("Incomplete", "grey") : pill("Ready", "gold");
}
