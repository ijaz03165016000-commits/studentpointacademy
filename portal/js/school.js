/* ==========================================================
   Student Point Academy portals — academy structure
   Edit classes, subjects, slots and fees here.
   ========================================================== */

export const SESSION = "2026–27";

const PRIMARY = ["English", "Urdu", "Mathematics", "General Science", "Islamiat", "Social Studies"];
const MIDDLE = ["English", "Urdu", "Mathematics", "Science", "Islamiat", "Social Studies", "Computer"];
const MATRIC = ["English", "Urdu", "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Islamiat / Pak Studies"];
const INTER = ["English", "Urdu", "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Accounting", "Economics", "Islamiat / Pak Studies"];
const BS = ["Mathematics", "Statistics", "Physics", "Chemistry", "Computer Science", "Programming (C / C++)", "English"];

/* Fee bands. Tuition is charged per subject the student takes (the student record
   lists their subjects); Play Group is a flat package; computer courses split the
   complete-course fee into monthly instalments. */
export const BANDS = {
  pg:      { label: "Play Group",         flat: 1000 },
  primary: { label: "Class 1 – 5",        perSubject: 500 },
  middle:  { label: "Class 6 – 8",        perSubject: 1000 },
  matric:  { label: "Matric (9 – 10)",    perSubject: 2500 },
  inter:   { label: "Intermediate",       perSubject: 3500 },
  bs:      { label: "BS / University",    perSubject: 5000 },
  course:  { label: "Computer courses" }
};

const course = (id, name, courseFee, months) =>
  ({ id, level: 20, band: "course", name: `Course · ${name}`, short: id.replace("CC-", ""), subjects: [name], courseFee, months });

/* id is used everywhere in the database — don't change an id once students are enrolled */
export const CLASSES = [
  { id: "PG", level: 0, band: "pg", name: "Play Group", short: "PG", subjects: ["Alphabet & Phonics (A–Z, Alif Ba)", "Numbers & Counting", "Colours, Shapes & Drawing", "Rhymes & Activities"] },
  ...[1, 2, 3, 4, 5].map((n) => ({ id: String(n), level: n, band: "primary", name: `Class ${n}`, short: String(n), subjects: PRIMARY })),
  ...[6, 7, 8].map((n) => ({ id: String(n), level: n, band: "middle", name: `Class ${n}`, short: String(n), subjects: MIDDLE })),
  { id: "9", level: 9, band: "matric", name: "Class 9 (Matric)", short: "9", subjects: MATRIC },
  { id: "10", level: 10, band: "matric", name: "Class 10 (Matric)", short: "10", subjects: MATRIC },
  { id: "11", level: 11, band: "inter", name: "1st Year (FSc / ICS / I.Com)", short: "11", subjects: INTER },
  { id: "12", level: 12, band: "inter", name: "2nd Year (FSc / ICS / I.Com)", short: "12", subjects: INTER },
  { id: "BS", level: 13, band: "bs", name: "BS / BCS (University)", short: "BS", subjects: BS },
  course("CC-BASIC", "Computer Basics & Typing", 2500, 1),
  course("CC-SCRATCH", "Scratch Coding for Kids", 5000, 2),
  course("CC-OFFICE", "MS Office", 5000, 2),
  course("CC-AI", "AI Tools for Students", 4000, 1),
  course("CC-DESIGN", "Graphic Design (Canva & Photoshop)", 8000, 2),
  course("CC-VIDEO", "Video Editing", 10000, 2),
  course("CC-PYTHON", "Python Programming", 10000, 3),
  course("CC-WEB", "Web Development", 15000, 3),
  course("CC-ARDUINO", "Arduino Programming", 15000, 3),
  course("CC-IOT", "IoT (Internet of Things)", 15000, 3),
  course("CC-FREELANCE", "Freelancing & Digital Marketing", 12000, 2),
  course("CC-DIPLOMA", "Complete IT Diploma", 25000, 6)
];
export const classById = (id) => CLASSES.find((c) => c.id === id);
export const className = (id) => classById(id)?.name || id || "—";
/* compact label for charts and tight spaces, e.g. "PG", "9", "BS", "PYTHON" */
export const shortName = (id) => classById(id)?.short || id || "—";
export const bandLabel = (id) => BANDS[classById(id)?.band]?.label || "Other";

/* Subjects a student actually takes (tuition is subject-wise). Older records
   without a list count as taking every subject of the class. */
export const studentSubjects = (st) => {
  const c = classById(st?.classId);
  const own = (st?.subjects || []).filter((s) => c?.subjects.includes(s));
  return own.length ? own : (c?.subjects || []);
};

/* Monthly fee (PKR) for one student */
export function monthlyFee(st) {
  const c = classById(st?.classId); if (!c) return 0;
  if (c.courseFee) return Math.round(c.courseFee / c.months);
  const b = BANDS[c.band];
  return b.perSubject ? b.perSubject * studentSubjects(st).length : b.flat || 0;
}
const rs = (n) => "Rs. " + Number(n).toLocaleString("en-PK");
export function feeLabel(st) {
  const c = classById(st?.classId); if (!c) return "Tuition fee";
  if (c.courseFee) return c.months > 1 ? `Course fee — instalment (${rs(c.courseFee)} ÷ ${c.months} months)` : "Course fee";
  const b = BANDS[c.band];
  if (b.perSubject) { const n = studentSubjects(st).length; return `Tuition — ${n} subject${n === 1 ? "" : "s"} × ${rs(b.perSubject)}`; }
  return "Monthly package";
}
export const FEE_SUMMARY = "Play Group Rs. 1,000 package · Class 1–5 Rs. 500, Class 6–8 Rs. 1,000, Matric Rs. 2,500, Inter Rs. 3,500, BS Rs. 5,000 per subject · computer courses in monthly instalments";

export const FEE_DUE_DAY = 10;
export const LATE_FEE = 100;

/* Four daily slots, 4 PM to 8 PM, Monday to Saturday */
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const PERIODS = ["4:00 – 5:00", "5:00 – 6:00", "6:00 – 7:00", "7:00 – 8:00"];
export const BREAK_AFTER = -1;   // no break between slots

export const EXAM_TYPES = ["Weekly Test", "Monthly Test", "Mid-Term", "Final Term", "Course Assessment"];

export function grade(pct) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  if (pct >= 40) return "E";
  return "F";
}

export const ROLES = {
  student:   { label: "Student",   home: "Student portal" },
  parent:    { label: "Parent",    home: "Parent portal" },
  staff:     { label: "Tutor",     home: "Staff portal" },
  principal: { label: "Principal", home: "Principal's office" },
  admin:     { label: "Admin",     home: "Admin portal" }
};

/* ==========================================================
   Student portal subscription (paid access)
   Students must have an approved payment before the portal opens.
   Set enabled: false to switch the paywall off.
   ========================================================== */
export const SUBSCRIPTION = {
  enabled: true,
  amount: 200,               // Rs. per period
  days: 30,                  // access given per approved payment
  method: "NayaPay",
  account: "0344-0807888",
  title: "Muhammad Ijaz",
  remindDays: 5              // show a renewal reminder this many days before expiry
};

/* ==========================================================
   Online Classroom (homework uploads, teacher feedback, voice notes,
   Dua & Qirat learning). These are only the STARTING values of the offer:
   the admin changes the live offer from Admin → Online classroom → Offer,
   and the website and portal pick it up straight away.
   ========================================================== */
export const CLASSROOM = {
  // classes that can join the online classroom (Play Group to Intermediate)
  eligible: ["PG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  maxFileMB: 2,            // per file — files are saved in Firestore (free plan); photos are shrunk automatically
  maxFiles: 6,             // per submission
  maxVoiceSec: 90,         // longest voice note (1½ minutes keeps it under 2 MB)
  kinds: {
    homework: { label: "Homework", icon: "book" },
    dua:      { label: "Dua & Qirat", icon: "star" },
    lesson:   { label: "Lesson / notes", icon: "school" }
  },
  offer: {
    active: true,
    title: "Online Classroom — Silver, Gold & Diamond Packages",
    tagline: "Upload homework, get teacher feedback, and learn Duas with voice notes — from home.",
    demo: "Free demo class — try it for 1 day",
    days: 30,
    endsOn: "",            // YYYY-MM-DD — shows a countdown; empty = no end date
    seats: 0,              // 0 = no seat limit
    taken: 0,              // approved enrolments counted against seats
    badge: "New packages",
    /* Three packages. The admin can rename them and change what each includes. */
    tiers: [
      { id: "silver",  name: "Silver",  perks: ["15 minutes daily one-to-one time with the teacher", "Homework checked with written feedback", "Weekly Dua & Kalma lesson", "Voice chat with teacher (reply within 24 hours)"] },
      { id: "gold",    name: "Gold",    perks: ["30 minutes daily one-to-one time with the teacher", "Written + voice feedback on every homework", "Daily Dua & Qirat practice with corrections", "Monthly progress report for parents"] },
      { id: "diamond", name: "Diamond", perks: ["1 hour daily one-to-one time with the teacher", "Individual consultancy: study plan & exam guidance", "Same-day homework checking (priority)", "Extra worksheets, weekly test & parent meeting every month"] }
    ],
    /* Monthly price of each package, by class group (Rs.) */
    bands: [
      { id: "junior", label: "Play Group – Class 5", classes: ["PG", "1", "2", "3", "4", "5"], prices: { silver: 1000, gold: 2500, diamond: 5000 } },
      { id: "middle", label: "Class 6 – 8",          classes: ["6", "7", "8"],                   prices: { silver: 1500, gold: 3000, diamond: 6000 } },
      { id: "senior", label: "Class 9 – 12",         classes: ["9", "10", "11", "12"],           prices: { silver: 2500, gold: 5000, diamond: 10000 } }
    ],
    perks: [
      "Upload homework as photos, PDF or a voice note",
      "Teacher checks it and sends written or voice feedback",
      "Dua, Kalma & Qirat lessons with the teacher's voice",
      "Send and receive voice messages with your teacher",
      "Full student portal: results, attendance, timetable"
    ]
  }
};
export const classroomKind = (k) => CLASSROOM.kinds[k] || CLASSROOM.kinds.lesson;

/* ==========================================================
   ID cards (student card / employee card)
   ========================================================== */
export const ID_CARD = {
  studentValidUntil: "2027-03-31",   // end of session 2026–27
  staffValidYears: 2,                // employee card valid this many years from issue
  bloodGroups: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
};
