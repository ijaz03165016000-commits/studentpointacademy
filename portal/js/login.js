import * as store from "./store.js";
import { SITE } from "../../assets/js/config.js";
import { $, $$ } from "./ui.js";

const LABELS = {
  student: ["Student ID", "e.g. SPA-0101"],
  parent: ["Parent ID", "e.g. P-9B-02"],
  staff: ["Staff ID", "e.g. T01"],
  principal: ["Principal ID", "principal"],
  admin: ["Admin ID", "admin"]
};
const DEMO = {
  student: ["SPA-0101", "Hamza Aslam, Class 9 (Matric)"],
  parent: ["P-ASLAM", "Muhammad Aslam — father of two students"],
  staff: ["T01", "Sir Tariq Mehmood, Mathematics & Physics"],
  principal: ["principal", "Principal, Student Point Academy"],
  admin: ["admin", "Academy office"]
};

const form = $("#login");
const role = () => form.role.value;

$$("[data-site]").forEach((el) => {
  const v = SITE[el.dataset.site]; if (!v) return;
  el.textContent = v; if (el.dataset.site === "phone") el.href = "tel:" + v.replace(/[^\d+]/g, "");
});

function syncRole() {
  const [label, ph] = LABELS[role()];
  $("#uid-label").textContent = label; $("#uid").placeholder = ph;
  try { localStorage.setItem("spa_portal_lastrole", role()); } catch {}
  if (!store.IS_LIVE) {
    const [id, who] = DEMO[role()];
    $("#demo").innerHTML = `<div class="demo-box"><strong>Demo mode.</strong> Try the ${LABELS[role()][0].split(" ")[0].toLowerCase()} portal as ${who}: ID <strong>${id}</strong>, password <strong>${store.DEMO_PASSWORD}</strong>. <button type="button" class="linkbtn" id="fill">Fill it in for me</button></div>`;
    $("#fill").onclick = () => { $("#uid").value = id; $("#pw").value = store.DEMO_PASSWORD; form.requestSubmit(); };
  }
}
try { const r = localStorage.getItem("spa_portal_lastrole"); if (r && LABELS[r]) form.querySelector(`[value="${r}"]`).checked = true; } catch {}
const pre = new URLSearchParams(location.search).get("role");
if (pre && LABELS[pre]) form.querySelector(`[value="${pre}"]`).checked = true;
$$("[name=role]").forEach((r) => r.addEventListener("change", syncRole));
syncRole();

$("#pw-toggle").addEventListener("click", (e) => {
  const on = $("#pw").type === "password";
  $("#pw").type = on ? "text" : "password"; e.currentTarget.textContent = on ? "Hide" : "Show"; e.currentTarget.setAttribute("aria-pressed", on);
});

/* already signed in? go straight to the dashboard */
store.currentUser().then((u) => { if (u) location.replace("app.html"); }).catch(() => {});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const st = $(".form-status", form), btn = $("[type=submit]", form);
  st.className = "form-status";
  if (!form.uid.value.trim() || !form.pw.value) { st.textContent = "Enter your ID and password."; st.className = "form-status is-err"; return; }
  btn.disabled = true; btn.textContent = "Signing in…";
  try {
    const u = await store.signIn(form.uid.value, form.pw.value);
    if (u.role !== role()) {
      await store.signOut();
      throw new Error(`That is a ${u.role} account. Choose “${u.role[0].toUpperCase() + u.role.slice(1)}” above and sign in again.`);
    }
    location.replace("app.html");
  } catch (err) {
    const code = String(err.code || "");
    st.textContent = /invalid|wrong-password|user-not-found/.test(code) ? "ID or password is incorrect." : (err.message || "Could not sign in.");
    st.className = "form-status is-err";
    btn.disabled = false; btn.textContent = "Sign in";
  }
});
