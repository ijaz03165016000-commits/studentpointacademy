/* classroom.html — Online Classroom offer + enrolment form.
   Enrolments are saved as classroomEnrollments/ENR-<TID> (so a TID is used once)
   and approved by the admin in Portal → Admin → Online classroom. */
import * as store from "../../../portal/js/store.js";
import { loadOffer, fillOffer, classLabel } from "../offer.js";

const $ = (id) => document.getElementById(id);
const form = $("enrolForm"), err = $("enrolErr");
const showErr = (m, el) => { err.textContent = m; err.hidden = !m; if (el) el.focus(); };

loadOffer().then((o) => {
  fillOffer(document, o);
  $("eClass").innerHTML = `<option value="">Select class</option>` + o.classes.map((id) => `<option value="${id}">${classLabel(id)}</option>`).join("");
  if (!o.open) {
    form.querySelectorAll("input,select,button").forEach((x) => (x.disabled = true));
    showErr(document.querySelector('[data-o="closed"]').textContent);
  }
  form.dataset.price = o.price;
}).catch(() => showErr("The offer could not be loaded. Refresh the page, or message us on WhatsApp."));

const PHONE = /^03\d{2}-?\d{7}$/;
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showErr("");
  const v = (id) => $(id).value.trim();
  const tid = v("eTid").replace(/\s/g, "").toUpperCase();
  if (!v("eName")) return showErr("Please write the student's name.", $("eName"));
  if (!v("eFather")) return showErr("Please write the father's / guardian's name.", $("eFather"));
  if (!v("eClass")) return showErr("Please select the class.", $("eClass"));
  if (!PHONE.test(v("ePhone"))) return showErr("WhatsApp number should look like 03XX-XXXXXXX.", $("ePhone"));
  if (!/^[A-Z0-9]{6,20}$/.test(tid)) return showErr("Enter the Transaction ID exactly as in the Easypaisa SMS (letters and numbers only).", $("eTid"));
  if (!PHONE.test(v("eSender"))) return showErr("'Paid from' number should look like 03XX-XXXXXXX.", $("eSender"));
  const file = $("eReceipt").files[0];
  if (file && file.size > 5 * 1024 * 1024) return showErr("The screenshot must be smaller than 5 MB.", $("eReceipt"));

  const btn = form.querySelector("[type=submit]"); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
  try {
    const price = Number(form.dataset.price) || 500;
    const data = {
      studentName: v("eName"), fatherName: v("eFather"), classId: v("eClass"), gender: v("eGender"),
      phone: v("ePhone"), city: v("eCity"), tid, sender: v("eSender"), amount: price, method: "EasyPaisa",
      status: "pending", submittedAt: new Date().toISOString().slice(0, 10), submittedAtTs: new Date().toISOString(), source: "website"
    };
    if (file) { try { data.receipt = await store.uploadFile(file, { visitor: true }); } catch (x) { console.warn("Receipt upload failed", x); } }
    const id = "ENR-" + tid;
    if (!store.IS_LIVE && await store.get("classroomEnrollments", id)) throw new Error("dup");
    await store.set("classroomEnrollments", id, data).catch((x) => { throw /permission|insufficient/i.test(x.code || x.message) ? new Error("dup") : x; });

    const msg = `Assalam o Alaikum! I have enrolled in the Online Classroom.\n\nStudent: ${data.studentName}\nFather: ${data.fatherName}\nClass: ${classLabel(data.classId)}\nWhatsApp: ${data.phone}\nPaid: Rs. ${price} (Easypaisa)\nTID: ${tid}\nFrom: ${data.sender}`;
    $("doneTo").textContent = data.phone;
    $("doneWa").href = "https://wa.me/923440807888?text=" + encodeURIComponent(msg);
    form.hidden = true; $("enrolDone").hidden = false;
    $("enrolDone").scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (x) {
    showErr(x.message === "dup" ? "This Transaction ID has already been used for an enrolment. If this is a mistake, message us on WhatsApp." : "Could not send the form. Check your internet and try again, or send the details on WhatsApp.");
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit enrolment';
  }
});
