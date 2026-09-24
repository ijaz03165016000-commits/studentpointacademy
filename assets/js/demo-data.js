/* Sample content shown in DEMO MODE (before Firebase is connected).
   Once Firebase is connected, the site reads from the database instead. */

export const DEMO_ARTICLES = [
  {
    id: "matric-board-exam-90-day-plan",
    title: "A 90-day plan for Matric and Intermediate board exams",
    category: "Board Exams",
    author: "Student Point Academy",
    date: "2026-09-18",
    status: "published",
    cover: "assets/img/demo/article-1.svg",
    excerpt: "Three months is enough time to cover the syllabus twice if you split it well. Here is the week-by-week plan we use with our Matric and FSc students.",
    content: `
<p>Three months before the annual exams is when most students either settle into a rhythm or start to panic. The difference is almost always a plan. This is the schedule we follow in our evening classes.</p>
<h2>Weeks 1–4: finish the syllabus once</h2>
<p>If any chapters are still untouched, close them now. Aim for one chapter per subject every three days and keep one notebook of formulas, definitions and diagrams.</p>
<ul>
<li>Physics, Chemistry and Biology: a one-page summary for every chapter.</li>
<li>Mathematics: solve every exercise question at least once.</li>
<li>English and Urdu: one essay and one letter every week.</li>
</ul>
<h2>Weeks 5–9: past papers under exam conditions</h2>
<p>Sit one full past paper every two days with a timer. Mark it honestly and write down every question you lost marks on.</p>
<blockquote>Past papers show you what the examiner actually asks, not what you hope they will ask.</blockquote>
<h2>Weeks 10–13: revise your weak list</h2>
<p>Spend the final month on the topics that keep costing you marks, sleep eight hours, and do not start any new book.</p>
<p>Our monthly tests follow the same plan, and parents receive a result card after every test.</p>`
  },
  {
    id: "arduino-iot-student-projects",
    title: "Line-follower robots and a mobile-controlled fan: our first Arduino & IoT batch",
    category: "Arduino & IoT",
    author: "Student Point Academy",
    date: "2026-09-10",
    status: "published",
    cover: "assets/img/demo/article-2.svg",
    excerpt: "In three months, students aged 10 to 18 went from blinking an LED to building robots and smart-home projects. Here is what they built.",
    content: `
<p>Our Arduino Programming and IoT courses run two days a week for three months. Every class is hands-on: the academy provides the boards, sensors and computers.</p>
<h2>What students built</h2>
<ul>
<li><strong>Line-follower robot</strong> using two IR sensors and a motor driver.</li>
<li><strong>Obstacle-avoiding car</strong> with an ultrasonic sensor.</li>
<li><strong>Mobile-controlled fan and light</strong> with an ESP32 and the Blynk app.</li>
<li><strong>Smart plant monitor</strong> that sends soil moisture readings to a cloud dashboard.</li>
</ul>
<h2>Who can join</h2>
<p>Arduino is open to students aged 10 to 18 and IoT to ages 12 to 18. No previous coding is needed. The complete course fee is Rs. 15,000.</p>`
  },
  {
    id: "improve-handwriting-at-home",
    title: "Five simple ways parents can improve a child's handwriting at home",
    category: "Parents' Corner",
    author: "Student Point Academy",
    date: "2026-08-28",
    status: "published",
    cover: "assets/img/demo/article-3.svg",
    excerpt: "Ten minutes a day is enough. These are the same exercises our Creative Kids teachers use in class.",
    content: `
<p>Neat handwriting builds confidence and saves marks in exams. It improves fastest with short, regular practice rather than long sessions.</p>
<ol>
<li>Check the pencil grip: a relaxed tripod grip, not a tight fist.</li>
<li>Use four-line English copies and Urdu practice sheets for letter height.</li>
<li>Practise one letter family a day (a, c, d, g, q share the same start).</li>
<li>Copy one short sentence slowly, then once more at normal speed.</li>
<li>Praise the best-written word on the page, every day.</li>
</ol>
<p>Printable handwriting worksheets are available from the academy. Ask on WhatsApp.</p>`
  }
];

export const DEMO_ANNOUNCEMENTS = [
  {
    id: "a1",
    title: "Admissions open for the new session — free demo class for every new student",
    category: "Admissions",
    date: "2026-09-20",
    description: "Play Group to Intermediate, O/A Level support, Quran and computer courses. Book a free demo class online or on WhatsApp 0344-0807888.",
    pinned: true, urgent: false, expires: "", attachment: ""
  },
  {
    id: "a2",
    title: "Monthly fee for October due by the 10th",
    category: "Fee",
    date: "2026-09-22",
    description: "Pay through Easypaisa to 0344-0807888 (Muhammad Ijaz) and upload the receipt on the website, or send it on WhatsApp with the student's name.",
    pinned: false, urgent: true, expires: "", attachment: ""
  },
  {
    id: "a3",
    title: "New Arduino & IoT batch starts 1 October",
    category: "Classes & Slots",
    date: "2026-09-15",
    description: "Two classes a week for three months, 6–7 PM. Limited seats; kits are provided in class.",
    pinned: false, urgent: false, expires: "", attachment: ""
  },
  {
    id: "a4",
    title: "Monthly test schedule for Matric and Intermediate",
    category: "Tests & Results",
    date: "2026-09-12",
    description: "Tests are held in the last week of every month in your normal slot. Result cards are shared with parents on WhatsApp.",
    pinned: false, urgent: false, expires: "", attachment: ""
  }
];
