/* ==========================================================
   Portal data layer — the only file that talks to the database.
   • LIVE MODE: Firebase Firestore + Auth, when FIREBASE_CONFIG in
     /assets/js/config.js is filled in.
   • DEMO MODE: sample school data kept in this browser, so every
     portal can be tried without any setup.
   ========================================================== */

import { FIREBASE_CONFIG } from "../../assets/js/config.js";

export const IS_LIVE = !!FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith("YOUR_");
export const DEMO_PASSWORD = "demo123";

/* Students and staff sign in with an ID (e.g. SPA-0101). In live mode the ID
   becomes a Firebase Auth email behind the scenes. */
export const LOGIN_DOMAIN = "portal.studentpointacademy.online";
/* The academy's main admin account (the same one used for the website's /admin/
   panel). Signing in to the portal as "admin" uses this email, and its portal
   profile is created automatically the first time. */
export const OWNER_EMAIL = "admin@studentpointacademy.online";
export const idToEmail = (id) => {
  const v = String(id).trim();
  if (v.toLowerCase() === "admin") return OWNER_EMAIL;
  return v.includes("@") ? v : `${v.toLowerCase()}@${LOGIN_DOMAIN}`;
};

/* ---------------- Firebase (live) ---------------- */
const FB_VER = "10.12.2";
const FB = (m) => `https://www.gstatic.com/firebasejs/${FB_VER}/firebase-${m}.js`;
let fbP = null;
function fb() {
  if (!fbP) fbP = (async () => {
    const [appMod, fs, au] = await Promise.all([import(FB("app")), import(FB("firestore")), import(FB("auth"))]);
    const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FIREBASE_CONFIG);
    return { appMod, fs, au, db: fs.getFirestore(app), auth: au.getAuth(app) };
  })();
  return fbP;
}

/* ---------------- Demo store (localStorage) ---------------- */
const PREFIX = "spa_portal_";
const SEED_VERSION = "spa1";
const mem = {};            // fallback if storage is blocked
function lsGet(col) {
  try { const v = localStorage.getItem(PREFIX + col); if (v) return JSON.parse(v); } catch {}
  return mem[col] || {};
}
function lsSet(col, obj) {
  mem[col] = obj;
  try { localStorage.setItem(PREFIX + col, JSON.stringify(obj)); } catch {}
}
let seeded = null;
async function ensureSeed() {
  if (seeded) return seeded;
  seeded = (async () => {
    let ok = false;
    try { ok = localStorage.getItem(PREFIX + "_seed") === SEED_VERSION; } catch {}
    if (ok && Object.keys(lsGet("users")).length) return;
    const { buildDemoSchool } = await import("./demo-school.js");
    const data = buildDemoSchool();
    for (const [col, docs] of Object.entries(data)) lsSet(col, docs);
    try { localStorage.setItem(PREFIX + "_seed", SEED_VERSION); } catch {}
  })();
  return seeded;
}
export function resetDemo() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
    sessionStorage.removeItem(PREFIX + "session");
  } catch {}
  Object.keys(mem).forEach((k) => delete mem[k]);
  seeded = null;
}

/* where: { field: value } equality, or { field: { has: value } } for array-contains */
function matches(doc, where) {
  return Object.entries(where).every(([k, v]) => {
    const d = doc[k];
    if (v && typeof v === "object" && "has" in v) return Array.isArray(d) && d.includes(v.has);
    return d === v;
  });
}
function setPath(obj, path, val) {
  const parts = path.split(".");
  let o = obj;
  parts.slice(0, -1).forEach((p) => { if (typeof o[p] !== "object" || o[p] === null) o[p] = {}; o = o[p]; });
  if (val === undefined) delete o[parts.at(-1)]; else o[parts.at(-1)] = val;
}
const clone = (x) => JSON.parse(JSON.stringify(x));

/* ==========================================================
   Generic document API
   ========================================================== */
export async function list(col, where = {}) {
  if (IS_LIVE) {
    const { fs, db } = await fb();
    const clauses = Object.entries(where).map(([k, v]) =>
      v && typeof v === "object" && "has" in v ? fs.where(k, "array-contains", v.has) : fs.where(k, "==", v));
    const snap = await fs.getDocs(clauses.length ? fs.query(fs.collection(db, col), ...clauses) : fs.collection(db, col));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  await ensureSeed();
  return Object.entries(lsGet(col)).map(([id, d]) => ({ id, ...clone(d) })).filter((d) => matches(d, where));
}

export async function get(col, id) {
  if (!id) return null;
  if (IS_LIVE) {
    const { fs, db } = await fb();
    const s = await fs.getDoc(fs.doc(db, col, id));
    return s.exists() ? { id: s.id, ...s.data() } : null;
  }
  await ensureSeed();
  const d = lsGet(col)[id];
  return d ? { id, ...clone(d) } : null;
}

export async function set(col, id, data) {
  const clean = { ...data }; delete clean.id;
  if (IS_LIVE) {
    const { fs, db } = await fb();
    await fs.setDoc(fs.doc(db, col, id), clean);
    return id;
  }
  await ensureSeed();
  const all = lsGet(col); all[id] = clean; lsSet(col, all);
  return id;
}

export async function add(col, data) {
  const clean = { ...data }; delete clean.id;
  if (IS_LIVE) {
    const { fs, db } = await fb();
    return (await fs.addDoc(fs.collection(db, col), clean)).id;
  }
  const id = col.slice(0, 2) + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  await set(col, id, clean);
  return id;
}

/* patch keys may be dotted paths, e.g. { "records.SPA-0101": "P" } */
export async function update(col, id, patch) {
  if (IS_LIVE) {
    const { fs, db } = await fb();
    // FieldPath objects allow keys like "Islamiat / Pak Studies" that string paths reject
    const args = Object.entries(patch).flatMap(([k, v]) => [new fs.FieldPath(...k.split(".")), v === undefined ? fs.deleteField() : v]);
    await fs.updateDoc(fs.doc(db, col, id), ...args);
    return;
  }
  await ensureSeed();
  const all = lsGet(col);
  if (!all[id]) throw new Error("That record no longer exists.");
  for (const [k, v] of Object.entries(patch)) setPath(all[id], k, v);
  lsSet(col, all);
}

export async function remove(col, id) {
  if (IS_LIVE) {
    const { fs, db } = await fb();
    await fs.deleteDoc(fs.doc(db, col, id));
    return;
  }
  await ensureSeed();
  const all = lsGet(col); delete all[id]; lsSet(col, all);
}

/* ==========================================================
   Accounts & sign-in
   users/{uid}: { role, name, loginId, linkId, classId, children[] }
   ========================================================== */
const SESSION_KEY = PREFIX + "session";

export async function signIn(loginId, password) {
  loginId = String(loginId).trim();
  if (IS_LIVE) {
    const { au, auth } = await fb();
    const cred = await au.signInWithEmailAndPassword(auth, idToEmail(loginId), password);
    const profile = await profileFor(cred.user);
    if (!profile) { await au.signOut(auth); throw new Error("This account has no portal profile yet. Ask the academy office."); }
    return profile;
  }
  await ensureSeed();
  const users = await list("users");
  const u = users.find((x) => x.loginId.toLowerCase() === loginId.toLowerCase());
  if (!u || u.password !== password) throw new Error("ID or password is incorrect.");
  if (u.disabled) throw new Error("This account is switched off. Contact the academy office.");
  try { sessionStorage.setItem(SESSION_KEY, u.id); } catch { mem._session = u.id; }
  return u;
}

async function profileFor(authUser) {
  const p = await get("users", authUser.uid);
  if (p || String(authUser.email).toLowerCase() !== OWNER_EMAIL) return p;
  await set("users", authUser.uid, { role: "admin", name: "Academy Office", loginId: "admin" });
  return get("users", authUser.uid);
}

export async function signOut() {
  if (IS_LIVE) { const { au, auth } = await fb(); await au.signOut(auth); }
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  delete mem._session;
}

export async function currentUser() {
  if (IS_LIVE) {
    const { au, auth } = await fb();
    const u = await new Promise((res) => { const off = au.onAuthStateChanged(auth, (x) => { off(); res(x); }); });
    return u ? profileFor(u) : null;
  }
  let id = mem._session;
  try { id = sessionStorage.getItem(SESSION_KEY) || id; } catch {}
  if (!id) return null;
  const u = await get("users", id);
  return u && !u.disabled ? u : null;
}

/* Create a login for a student, parent or staff member (admin only).
   In live mode a second Firebase app is used so the admin stays signed in. */
export async function createAccount({ loginId, password, ...profile }) {
  loginId = String(loginId).trim();
  if (!loginId || String(password).length < 6) throw new Error("ID is required and the password needs at least 6 characters.");
  const existing = await list("users", { loginId });
  if (existing.length) throw new Error(`The login ID ${loginId} is already taken.`);
  if (IS_LIVE) {
    const { appMod, au } = await fb();
    const name = "account-maker";
    const second = appMod.getApps().find((a) => a.name === name) || appMod.initializeApp(FIREBASE_CONFIG, name);
    const a2 = au.getAuth(second);
    const cred = await au.createUserWithEmailAndPassword(a2, idToEmail(loginId), password);
    await au.signOut(a2);
    await set("users", cred.user.uid, { ...profile, loginId });
    return cred.user.uid;
  }
  await set("users", loginId, { ...profile, loginId, password });
  return loginId;
}

/* Demo only: change a password. In live mode passwords are reset from the
   Firebase console (Authentication → Users). */
export async function setDemoPassword(uid, password) {
  if (IS_LIVE) throw new Error("Reset passwords from the Firebase console → Authentication.");
  await update("users", uid, { password });
}

export async function changeOwnPassword(current, next) {
  if (String(next).length < 6) throw new Error("The new password needs at least 6 characters.");
  if (IS_LIVE) {
    const { au, auth } = await fb();
    const u = auth.currentUser;
    await au.reauthenticateWithCredential(u, au.EmailAuthProvider.credential(u.email, current));
    await au.updatePassword(u, next);
    return;
  }
  const me = await currentUser();
  if (!me || me.password !== current) throw new Error("Your current password is not correct.");
  await update("users", me.id, { password: next });
}
