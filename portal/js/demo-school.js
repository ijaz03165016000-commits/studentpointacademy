/* Sample academy used in DEMO MODE only (before Firebase is connected).
   Generated relative to today's date so attendance, fees and homework always
   look current. None of this is used in live mode. */
import { CLASSES, BANDS, DAYS, PERIODS, FEE_DUE_DAY, LATE_FEE, monthlyFee, feeLabel, studentSubjects } from "./school.js";

const PW = "demo123";

/* small deterministic random generator so the demo is the same every time */
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const R = rng(20260924);
const pick = (a) => a[Math.floor(R() * a.length)];
const between = (lo, hi) => Math.round(lo + R() * (hi - lo));

export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const BOYS = ["Muhammad Ali", "Ahmed Raza", "Hamza Khan", "Usman Tariq", "Bilal Hussain", "Zain ul Abideen", "Abdullah Mir", "Hassan Javed", "Talha Mehmood", "Saad Rashid", "Umar Farooq", "Fahad Iqbal", "Arslan Shah", "Danish Akhtar", "Haris Nawaz", "Shayan Qureshi", "Rehan Aslam", "Waleed Anwar"];
const GIRLS = ["Ayesha Siddiqui", "Fatima Zahra", "Maryam Noor", "Zainab Bibi", "Hira Batool", "Iqra Shabbir", "Laiba Khan", "Mahnoor Ali", "Aleena Hussain", "Rimsha Javed", "Areeba Mir", "Kinza Rafique", "Noor ul Ain", "Eman Tariq", "Sidra Kausar", "Anum Riaz", "Hafsa Yousaf", "Mehwish Akram"];
const FATHERS = ["Muhammad Aslam", "Tariq Mehmood", "Javed Iqbal", "Raja Khalid", "Chaudhry Nadeem", "Sardar Imtiaz", "Abdul Rasheed", "Mirza Shahid", "Khurshid Ahmed", "Zafar Iqbal", "Raja Waheed", "Ghulam Mustafa", "Saeed Akhtar", "Nazir Hussain", "Mushtaq Ahmed", "Riaz Hussain"];
const AREAS = ["Sector F-1", "Sector F-2", "Sector C-4", "Sector D-1", "Allama Iqbal Road", "Chakswari Road", "Kotli Road", "New City", "Mian Muhammad Road", "Sector B-3", "Haul Road", "Sector G-1"];

const COURSE_NAMES = CLASSES.filter((c) => c.band === "course").map((c) => c.subjects[0]);
const PG_SUBJECTS = CLASSES.find((c) => c.id === "PG").subjects;
const STAFF = [
  { id: "T01", name: "Sir Tariq Mehmood", designation: "Senior Tutor", subjects: ["Mathematics", "Physics"], levels: [6, 7, 8, 9, 10, 11, 12, 13], classTeacherOf: "9", gender: "M" },
  { id: "T02", name: "Miss Saima Bashir", designation: "Senior Tutor", subjects: ["Biology", "Chemistry", "Science"], levels: [6, 7, 8, 9, 10, 11, 12], classTeacherOf: "10", gender: "F" },
  { id: "T03", name: "Miss Nadia Aslam", designation: "Tutor", subjects: ["English", "Urdu"], levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], classTeacherOf: "7", gender: "F" },
  { id: "T04", name: "Miss Rabia Noor", designation: "Early Years Tutor", subjects: [...PG_SUBJECTS, "Mathematics", "General Science", "English", "Urdu"], levels: [0, 1, 2, 3, 4, 5], classTeacherOf: "PG", gender: "F" },
  { id: "T05", name: "Hafiz Muhammad Usman", designation: "Tutor", subjects: ["Islamiat", "Islamiat / Pak Studies", "Social Studies"], levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], classTeacherOf: "5", gender: "M" },
  { id: "T06", name: "Sir Adeel Raza", designation: "Computer Instructor", subjects: ["Computer", "Computer Science", "Programming (C / C++)", "Computer Basics & Typing", "Scratch Coding for Kids", "MS Office", "AI Tools for Students", "Python Programming", "Web Development", "Complete IT Diploma"], levels: [6, 7, 8, 9, 10, 11, 12, 13, 20], classTeacherOf: "CC-PYTHON", gender: "M" },
  { id: "T07", name: "Miss Sana Javed", designation: "Design Instructor", subjects: ["Graphic Design (Canva & Photoshop)", "Video Editing", "Freelancing & Digital Marketing"], levels: [20], classTeacherOf: "CC-DESIGN", gender: "F" },
  { id: "T08", name: "Sir Kashif Mir", designation: "Tutor", subjects: ["Accounting", "Economics", "Statistics", "Mathematics"], levels: [11, 12, 13], classTeacherOf: "11", gender: "M" },
  { id: "T09", name: "Sir Waqas Ahmed", designation: "Robotics Instructor", subjects: ["Arduino Programming", "IoT (Internet of Things)", "Physics"], levels: [13, 20], classTeacherOf: "CC-ARDUINO", gender: "M" }
];

/* most specific teacher first (fewest class levels) */
const BY_SPECIFIC = [...STAFF].sort((a, b) => a.levels.length - b.levels.length);
function teacherFor(subject, level) {
  return (BY_SPECIFIC.find((t) => t.subjects.includes(subject) && t.levels.includes(level))
    || STAFF.find((t) => t.subjects.includes(subject)))?.id || "";
}

function schoolDaysBack(from, n) {
  const out = []; let d = new Date(from);
  while (out.length < n) { if (d.getDay() !== 0) out.push(iso(d)); d = addDays(d, -1); }
  return out.reverse();
}

export function buildDemoSchool() {
  const now = new Date();
  const today = iso(now);
  const users = {}, students = {}, staff = {}, timetable = {}, attendance = {}, staffAttendance = {};
  const exams = {}, homework = {}, fees = {}, leaves = {}, notices = {}, messages = {};

  /* ---- Principal & office ---- */
  users.principal = { role: "principal", name: "Principal, Student Point Academy", loginId: "principal", password: PW };
  users.admin = { role: "admin", name: "Academy Office (Admin)", loginId: "admin", password: PW };

  /* ---- Staff ---- */
  STAFF.forEach((t, i) => {
    const classIds = CLASSES.filter((c) => c.subjects.some((s) => teacherFor(s, c.level) === t.id)).map((c) => c.id);
    staff[t.id] = {
      name: t.name, designation: t.designation, subjects: t.subjects, classIds, classTeacherOf: t.classTeacherOf,
      phone: `0345-${String(5100000 + i * 13791).slice(0, 7)}`, email: "",
      joinDate: `20${String(19 + (i % 7)).padStart(2, "0")}-0${1 + (i % 8)}-01`, qualification: t.designation.includes("Senior") ? "M.Phil" : "BS / M.Sc", gender: t.gender,
      bloodGroup: ["B+", "O+", "A+", "AB+"][i % 4], address: `${AREAS[i % AREAS.length]}, Mirpur AJK`
    };
    users[t.id] = { role: "staff", name: t.name, loginId: t.id, linkId: t.id, password: PW };
  });

  /* subscription: positive = days of access left, negative = expired that many days ago */
  const subUntil = (daysLeft) => { const d = addDays(now, daysLeft); return { subscribedUntil: iso(d), subscribedUntilMs: new Date(iso(d) + "T23:59:59").getTime() }; };

  /* ---- Students & parents ---- */
  let fi = 0, seq = 101;
  const used = {};
  const uniqueName = (girl, cid) => {
    const pool = girl ? GIRLS : BOYS; const taken = (used[cid] ||= new Set());
    let k = Math.floor(R() * pool.length); while (taken.has(pool[k])) k = (k + 1) % pool.length;
    taken.add(pool[k]); return pool[k];
  };
  const idOf = (n) => "SPA-" + String(n).padStart(4, "0");
  /* the demo family first: two children, one parent account */
  const kidA = idOf(seq++), kidB = idOf(seq++);
  const firstIn = {};
  CLASSES.forEach((c) => {
    const count = c.band === "course" ? between(2, 4) : c.band === "bs" ? 3 : between(4, 6);
    for (let n = 1; n <= count; n++) {
      const girl = R() < 0.45;
      let id;
      if (c.id === "9" && n === 1) id = kidA; else if (c.id === "5" && n === 1) id = kidB; else id = idOf(seq++);
      const father = FATHERS[fi++ % FATHERS.length];
      const age = c.band === "course" ? between(10, 22) : c.level + 5 + (R() < 0.3 ? 1 : 0);
      const b = BANDS[c.band];
      const subjects = b.perSubject ? [...c.subjects].sort(() => R() - 0.5).slice(0, between(2, Math.min(4, c.subjects.length))) : [...c.subjects];
      students[id] = {
        name: uniqueName(girl, c.id), gender: girl ? "F" : "M", subjects,
        classId: c.id, rollNo: n, fatherName: father, phone: `03${between(0, 4)}${between(0, 9)}-${between(1000000, 9999999)}`,
        dob: `${2026 - age}-${String(between(1, 12)).padStart(2, "0")}-${String(between(1, 28)).padStart(2, "0")}`,
        address: `${pick(AREAS)}, Mirpur AJK`, admissionDate: R() < 0.5 ? "2026-04-01" : "2025-09-01",
        status: "active", bloodGroup: pick(["A+", "B+", "O+", "AB+", "A-", "B+", "O+", "O-"])
      };
      users[id] = { role: "student", name: students[id].name, loginId: id, linkId: id, classId: c.id, password: PW, ...subUntil(R() < 0.85 ? between(3, 28) : -between(1, 20)) };
      firstIn[c.id] ||= id;
    }
  });

  students[kidA] = { ...students[kidA], name: "Hamza Aslam", gender: "M", fatherName: "Muhammad Aslam", phone: "0300-1234567", subjects: ["Mathematics", "Physics", "Chemistry"] };
  students[kidB] = { ...students[kidB], name: "Ayesha Aslam", gender: "F", fatherName: "Muhammad Aslam", phone: "0300-1234567", subjects: ["English", "Mathematics", "Urdu"] };
  users[kidA].name = students[kidA].name; users[kidB].name = students[kidB].name;
  delete students[kidA].bloodGroup;   // demo: this student still has details to fill in for the ID card
  delete users[kidA].subscribedUntil; delete users[kidA].subscribedUntilMs;   // demo student sees the payment screen
  Object.assign(users[kidB], subUntil(3));                                     // …and this one gets a renewal reminder

  const families = {};
  Object.entries(students).forEach(([sid, s]) => {
    const key = sid === kidA || sid === kidB ? "P-ASLAM" : "P-" + sid.slice(4);
    (families[key] ||= { name: s.fatherName, kids: [] }).kids.push(sid);
  });
  Object.entries(families).forEach(([pid, f]) => {
    users[pid] = { role: "parent", name: f.name, loginId: pid, children: f.kids, childClassIds: f.kids.map((k) => students[k].classId), password: PW };
    f.kids.forEach((k) => (students[k].parentId = pid));
  });

  /* ---- Timetables: four slots, 4 PM to 8 PM ---- */
  CLASSES.forEach((c) => {
    const days = {};
    DAYS.forEach((day, di) => {
      days[day] = PERIODS.map((_, p) => {
        if (c.band === "course") {
          // courses meet two or three days a week in one slot
          const meets = c.months >= 3 ? (di === 1 || di === 4) : (di % 2 === 0);
          const slot = CLASSES.indexOf(c) % PERIODS.length;
          return meets && p === slot ? { subject: c.subjects[0], teacherId: teacherFor(c.subjects[0], c.level) } : { subject: "", teacherId: "" };
        }
        if (c.band === "pg" && p > 1) return { subject: "", teacherId: "" };   // Play Group: first two slots only
        const subject = c.subjects[(p + di * 2) % c.subjects.length];
        return { subject, teacherId: teacherFor(subject, c.level) };
      });
    });
    timetable[c.id] = { classId: c.id, days };
  });

  /* ---- Attendance (last 30 academy days, not future) ---- */
  const lastDay = now.getDay() === 0 ? addDays(now, -1) : now;
  const days = schoolDaysBack(lastDay, 30);
  const byClass = {};
  Object.entries(students).forEach(([sid, s]) => (byClass[s.classId] ||= []).push(sid));
  days.forEach((d) => {
    CLASSES.forEach((c) => {
      if (!byClass[c.id]) return;
      if (d === today && ["11", "CC-WEB", "4"].includes(c.id)) return;  // a few classes still to be marked today
      const records = {};
      byClass[c.id].forEach((sid) => { const r = R(); records[sid] = r < 0.06 ? "A" : r < 0.09 ? "L" : "P"; });
      attendance[`${c.id}_${d}`] = { classId: c.id, date: d, records, markedBy: STAFF.find((t) => t.classTeacherOf === c.id)?.id || "" };
    });
    const recs = {};
    STAFF.forEach((t) => { const r = R(); recs[t.id] = r < 0.04 ? "A" : r < 0.07 ? "L" : "P"; });
    staffAttendance[d] = { date: d, records: recs };
  });

  /* ---- Tests & marks (only for the subjects each student takes) ---- */
  const m = now.getMonth();
  const monthName = (k) => new Date(now.getFullYear(), k, 1).toLocaleString("en", { month: "long" });
  const examDefs = [
    { key: "MT-" + (m - 2), name: `Monthly Test — ${monthName(m - 2)}`, type: "Monthly Test", date: iso(new Date(now.getFullYear(), m - 2, 26)), total: 25, published: true },
    { key: "MT-" + (m - 1), name: `Monthly Test — ${monthName(m - 1)}`, type: "Monthly Test", date: iso(new Date(now.getFullYear(), m - 1, 26)), total: 25, published: true },
    { key: "WT-" + m, name: "Weekly Test", type: "Weekly Test", date: iso(addDays(now, -4)), total: 20, published: false }
  ];
  const ability = {};
  Object.keys(students).forEach((sid) => (ability[sid] = 0.5 + R() * 0.45));
  ability[kidA] = 0.83; ability[kidB] = 0.9;
  CLASSES.filter((c) => c.band !== "pg" && byClass[c.id]).forEach((c) => {
    examDefs.forEach((e) => {
      const subjects = {};
      const taken = [...new Set(byClass[c.id].flatMap((sid) => studentSubjects(students[sid])))];
      c.subjects.filter((s) => taken.includes(s)).forEach((s, si, arr) => {
        const marks = {};
        const pending = !e.published && si >= arr.length - 1;   // latest test: last subject not entered yet
        if (!pending) byClass[c.id].filter((sid) => studentSubjects(students[sid]).includes(s)).forEach((sid) => {
          const r = R();
          marks[sid] = r < 0.02 ? "AB" : Math.max(0, Math.min(e.total, Math.round(e.total * (ability[sid] + (R() - 0.5) * 0.25))));
        });
        subjects[s] = { total: e.total, marks, teacherId: teacherFor(s, c.level) };
      });
      exams[`${e.key}_${c.id}`] = { examKey: e.key, name: e.name, type: e.type, date: e.date, classId: c.id, published: e.published, subjects };
    });
  });

  /* ---- Fees: last 3 months, from the subjects each student takes ---- */
  const months = [-2, -1, 0].map((k) => iso(new Date(now.getFullYear(), m + k, 1)).slice(0, 7));
  let receipt = 4100;
  Object.entries(students).forEach(([sid, s]) => {
    const amount = monthlyFee(s);
    months.forEach((mo, k) => {
      const r = R();
      const paid = k < 2 ? r > 0.05 : r > 0.45;
      fees[`${sid}_${mo}`] = {
        studentId: sid, classId: s.classId, month: mo, amount, due: `${mo}-${String(FEE_DUE_DAY).padStart(2, "0")}`,
        items: [{ label: feeLabel(s), amount }], status: paid ? "paid" : "unpaid",
        paidOn: paid ? `${mo}-${String(between(2, FEE_DUE_DAY)).padStart(2, "0")}` : "", receiptNo: paid ? "RC-" + receipt++ : "",
        challanNo: `CH-${mo.replace("-", "")}-${sid.slice(4)}`
      };
    });
  });
  const lastA = fees[`${kidA}_${months[2]}`]; lastA.status = "unpaid"; lastA.paidOn = ""; lastA.receiptNo = "";

  /* ---- Homework ---- */
  const HW = {
    Physics: ["Numericals 3.1 – 3.8", "Draw a ray diagram for a convex lens"], Chemistry: ["Balance the equations on page 42", "Learn the first 20 elements with valencies"],
    Biology: ["Label the human heart diagram", "Short questions, Chapter 4"], Mathematics: ["Exercise 5.2, Q1 – Q12", "10 practice questions on fractions"],
    English: ["Essay: 'My Aim in Life' (150 words)", "Learn the spellings list 3"], Urdu: ["خلاصہ: سبق نمبر 5", "Mazmoon: 'Waqt ki Pabandi'"],
    "General Science": ["Draw and label the parts of a plant", "Name 5 living and 5 non-living things"], Science: ["Diagram of the water cycle", "Short questions, Chapter 3"],
    "Computer Science": ["Write a program to find the largest of three numbers", "Short notes on input and output devices"],
    "Python Programming": ["Write a program that prints a times table", "Practice lists and loops: Q1 – Q6"], "Graphic Design (Canva & Photoshop)": ["Design an Eid greeting post in Canva", "Make a simple logo for your name"],
    "Alphabet & Phonics (A–Z, Alif Ba)": ["Trace letters A to J", "Colour the pictures that start with 'B'"], "Numbers & Counting": ["Count and write 1 to 20", "Circle the bigger number"]
  };
  let hi = 0;
  CLASSES.filter((c) => byClass[c.id]).forEach((c) => {
    c.subjects.filter((s) => HW[s]).slice(0, 2).forEach((s, k) => {
      const t = teacherFor(s, c.level);
      homework["hw" + hi++] = {
        classId: c.id, subject: s, title: HW[s][k % 2], details: "Complete it at home and show it in the next class.",
        date: iso(addDays(now, -k * 2)), due: iso(addDays(now, 2 + k)), teacherId: t, teacherName: STAFF.find((x) => x.id === t)?.name || ""
      };
    });
  });

  /* ---- Leave requests ---- */
  const other = byClass["10"]?.[1] || kidA, other2 = byClass["10"]?.[2] || kidA;
  leaves.lv1 = { kind: "student", personId: kidA, name: students[kidA].name, classId: "9", from: iso(addDays(now, 2)), to: iso(addDays(now, 3)), reason: "Family wedding in Kotli.", status: "pending", appliedBy: "P-ASLAM", appliedAt: iso(now) };
  leaves.lv2 = { kind: "student", personId: other, name: students[other].name, classId: "10", from: iso(addDays(now, -5)), to: iso(addDays(now, -4)), reason: "Fever — doctor advised two days' rest.", status: "approved", appliedBy: other, appliedAt: iso(addDays(now, -6)), decidedBy: "Miss Saima Bashir" };
  leaves.lv3 = { kind: "student", personId: other2, name: students[other2].name, classId: "10", from: iso(addDays(now, 1)), to: iso(addDays(now, 1)), reason: "School function in the evening.", status: "pending", appliedBy: other2, appliedAt: iso(now) };
  leaves.lv4 = { kind: "staff", personId: "T03", name: "Miss Nadia Aslam", from: iso(addDays(now, 4)), to: iso(addDays(now, 6)), reason: "Sister's wedding.", status: "pending", appliedBy: "T03", appliedAt: iso(addDays(now, -1)) };

  /* ---- Notices ---- */
  const N = [
    ["Monthly test results", "Monthly test results are on the portal. Parents can view the result card from their portal.", ["students", "parents"], 0, true],
    ["Fee reminder", `This month's fee is due by the ${FEE_DUE_DAY}th. A late fee of Rs. ${LATE_FEE} applies after the due date. Pay at the academy or by EasyPaisa / JazzCash to 0344-0807888 and send the receipt on WhatsApp.`, ["students", "parents"], -2, false],
    ["Tutors' meeting on Saturday", "All tutors: short meeting at 8:00 PM on Saturday after the last slot. Bring your test-checking status.", ["staff"], -1, true],
    ["New batch: Python & Web Development", "A new evening batch of Python Programming and Web Development starts on the 1st. Register at the office or on WhatsApp.", ["students", "parents", "staff"], -4, false],
    ["Mark attendance in every slot", "Tutors must mark attendance on the portal in the first 10 minutes of each slot so parents get it on time.", ["staff"], -12, false]
  ];
  N.forEach(([title, body, audience, off, pinned], i) => (notices["nt" + i] = { title, body, audience, date: iso(addDays(now, off)), by: i === 2 || i === 4 ? "Principal" : "Academy Office", pinned }));

  /* ---- Messages (parent ↔ tutor) ---- */
  const at = (off, h) => { const d = addDays(now, off); d.setHours(h, 15, 0, 0); return d.toISOString(); };
  messages.m1 = { parentId: "P-ASLAM", staffId: "T01", studentId: kidA, from: "parent", text: "Assalam o Alaikum. Hamza finds Physics numericals difficult. Could you suggest some extra practice?", at: at(-3, 19), read: true };
  messages.m2 = { parentId: "P-ASLAM", staffId: "T01", studentId: kidA, from: "staff", text: "Wa Alaikum Assalam. Yes — I'll give him a worksheet every Monday. Please check he completes it at home.", at: at(-2, 17), read: true };
  messages.m3 = { parentId: "P-ASLAM", staffId: "T03", studentId: kidB, from: "parent", text: "Ayesha missed Tuesday's English class due to illness. Can she get the worksheet?", at: at(-1, 20), read: false };

  /* ---- Portal subscription payments ---- */
  const subscriptions = {};
  let tid = 41823900417;
  Object.entries(users).filter(([, u]) => u.role === "student").forEach(([uid, u]) => {
    if (u.subscribedUntil) {
      const approved = addDays(new Date(u.subscribedUntil + "T12:00"), -29);
      tid += 7919;
      subscriptions["TID-" + tid] = { userId: uid, studentId: uid, name: u.name, classId: u.classId, amount: 200, method: "EasyPaisa", tid: String(tid), sender: `03${between(0, 4)}${between(0, 9)}${between(1000000, 9999999)}`, submittedAt: iso(approved), status: "approved", decidedAt: iso(approved), validFrom: iso(approved), validUntil: u.subscribedUntil };
    }
  });
  [firstIn["10"], firstIn["11"], firstIn["CC-PYTHON"]].filter(Boolean).forEach((sid, k) => {
    const u = users[sid];
    tid += 104729;
    subscriptions["TID-" + tid] = { userId: sid, studentId: sid, name: u.name, classId: u.classId, amount: 200, method: "EasyPaisa", tid: String(tid), sender: `034${k}${between(1000000, 9999999)}`, submittedAt: iso(addDays(now, -k)), status: "pending" };
  });

  return { users, students, staff, timetable, attendance, staffAttendance, exams, homework, fees, leaves, notices, messages, subscriptions };
}
