# Student Point Academy portals

Five portals share one sign-in page at **`www.studentpointacademy.online/portal/`**:

| Portal | Who | What they can do |
|---|---|---|
| **Student** | each student (ID like `SPA-0101`) | Dashboard, attendance calendar, result cards (print), timetable (4 PM – 8 PM slots), homework, fee challans, apply for leave, notices, ID card |
| **Parent** | one login per family (ID like `P-0101`) | Everything the student sees, for each child (switch between children), apply for leave, message tutors |
| **Staff / Tutor** | each tutor (ID like `T01`) | Mark attendance, create tests and enter marks, give homework, weekly timetable, class list, approve student leave, reply to parents, employee card |
| **Principal** | principal | Academy overview, attendance by class, staff attendance, publish results, fee collection, staff leave approvals, notices |
| **Admin** | academy office | Add/edit students & tutors (creates their logins), fee challans & payments, timetables, notices, portal subscriptions |

Built by Ijaz Software House · www.ijazs.online

## Classes and fees (set in `portal/js/school.js`)

- **Classes:** Play Group, Class 1–10, 1st Year, 2nd Year, BS / BCS, and each computer course (Computer Basics, Scratch, MS Office, AI Tools, Graphic Design, Video Editing, Python, Web Development, Arduino, IoT, Freelancing, IT Diploma).
- **Fees are subject-wise.** When you add a student you tick the subjects they take, and the monthly fee is worked out from that:
  Play Group Rs. 1,000 package · Class 1–5 Rs. 500 · Class 6–8 Rs. 1,000 · Matric Rs. 2,500 · Intermediate Rs. 3,500 · BS Rs. 5,000 per subject.
  Computer courses: the complete-course fee split into monthly instalments (e.g. Python Rs. 10,000 over 3 months).
- **Slots:** 4:00–5:00, 5:00–6:00, 6:00–7:00, 7:00–8:00, Monday to Saturday.
- Fee due on the 10th; late fee Rs. 100. Change any of these in `school.js`.

## Try it (demo mode)

If `FIREBASE_CONFIG` in `assets/js/config.js` is empty, the portals run on a sample academy saved in the visitor's browser. The password is always `demo123`.

| Role | Demo ID |
|---|---|
| Student — not subscribed yet (sees the payment screen) | `SPA-0101` |
| Student — subscribed (renewal reminder) | `SPA-0102` |
| Parent (two children) | `P-ASLAM` |
| Staff / Tutor | `T01` |
| Principal | `principal` |
| Admin | `admin` |

## Live (Firebase is connected)

1. **Admin login:** choose **Admin**, ID `admin`, and the password of the `admin@studentpointacademy.online` account (the same account as the website's `/admin/` panel). The portal profile is created automatically the first time.
2. **Add tutors:** Admin → Staff → *Add staff member*. Write down the login shown.
3. **Add students:** Admin → Students → *Add student*. Tick their subjects. This creates the student login and, if you choose, the parent login. Passwords are shown once — write them down.
4. **Principal login:** Admin → *Logins & passwords* → *Principal / admin login*.
5. **Timetables:** Admin → *Timetables* → *Edit timetable* for each class.
6. **Fees:** Admin → *Fees* → *Generate challans* each month, then *Mark paid* when a payment arrives.
7. Password resets in live mode: Firebase console → Authentication → Users.

`firestore.rules` holds the security rules for the website and the portals (already published). Students can only see their own records, parents only their children's, and only the office can change fees, results or logins.

## Student subscription (Rs. 200 / month, EasyPaisa)

Students need an active subscription before their portal opens (parents, tutors, principal and admin are not affected).
The student pays Rs. 200 to EasyPaisa **0344-0807888** and enters the Transaction ID. Admin → **Portal subscriptions** → check the TID in your EasyPaisa app → **Approve** (30 days) or **Reject**. Cash or free access: *Record cash / manual payment*.
To switch this off, set `enabled: false` in `portal/js/school.js` → `SUBSCRIPTION`.

## Files

```
portal/
  index.html        sign-in page (role picker)
  app.html          portal shell (menu + pages)
  base.css          buttons, forms and cards in the academy's colours
  portal.css        portal styles
  js/store.js       database layer (Firebase or demo)
  js/school.js      classes, subjects, fees, slots
  js/demo-school.js sample data for demo mode
  js/views/         student, parent, staff, principal, admin (+ shared, manage, idcard, subscribe)
firestore.rules     security rules for website + portals
```
