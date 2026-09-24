/* ==========================================================
   Student Point Academy — site settings
   1) SITE holds the academy's details used by the new pages
      (articles, announcements) and the admin panel.
   2) Paste your Firebase web config into FIREBASE_CONFIG
      (Firebase console → Project settings → Your apps → Web app).
      Until you do, the site runs in DEMO MODE with sample content,
      and form entries are kept only in the visitor's own browser.
   ========================================================== */

export const SITE = {
  name: "Student Point Academy",
  phone: "0344-0807888",
  whatsapp: "923440807888",        // international format, no + or dashes
  website: "https://www.studentpointacademy.online",
  address: "G1/Part 3, near MedBros Pharmacy, Haul Road, Mirpur AJK",
  city: "Mirpur, Azad Kashmir",
  email: "",                       // optional — shown on ID cards when filled in
  timings: "Mon–Sat, 4:00 PM – 8:00 PM"
};

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBnLBxu3KvJJ4sr70wZRaW2xYBKGDBeCWo",
  authDomain: "student-point-academy.firebaseapp.com",
  projectId: "student-point-academy",
  storageBucket: "student-point-academy.firebasestorage.app",
  messagingSenderId: "581530226068",
  appId: "1:581530226068:web:7c762c2feaad2b778d5381"
};

/* Article and announcement categories (used by the site and the admin panel) */
export const ARTICLE_CATEGORIES = [
  "Study Tips", "Board Exams", "Computer & Coding", "Arduino & IoT", "Quran & Islamic", "Parents' Corner", "Academy News"
];
export const ANNOUNCEMENT_CATEGORIES = [
  "Admissions", "Classes & Slots", "Tests & Results", "Fee", "Holidays", "Events", "Urgent"
];
