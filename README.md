# Student Point Academy — website

www.studentpointacademy.online · Powered by Ijaz Software House

The website uses the same backend as the STARs College site: announcements, articles, an admin panel, and form entries saved to a database. The theme and design are the same as before.

## What's in the site

| Page | What it does |
|---|---|
| `index.html` | The home page, with the same sections and design as before. It also has a **Latest announcements ticker** under the menu and a new **Announcements & Articles** section above the FAQs. The Parent Portal's "Announcements" card shows the live number of notices. |
| `announcements.html` | All notices, with category filters. Urgent and pinned notices stay at the top. Each notice can have a PDF or image attached. |
| `articles.html` | All articles, with category filters, search and a "Load more" button. |
| `article.html?id=…` | A single article, with WhatsApp and Facebook share buttons and related articles. |
| `admin/` | The admin panel (see below). |
| `portal/` | **Student, Parent, Staff, Principal and Admin portals** — attendance, results, homework, timetable, fee challans, leave, messages. See `PORTALS.md`. |

### The forms

These forms work exactly as before and still open WhatsApp. Each one is now also saved to the admin panel:

- **Book a Free Demo Class** is saved as a *Demo booking*.
- **Upload Payment Receipt (Easypaisa)** is saved as a *Fee payment*, with the receipt screenshot, amount, TID and fee month.
- **Join Student Point Academy** is saved as a *Join application*, with the CV if one was attached.

The Google Form in "Apply Online" is unchanged. Its responses still go to Google Forms.

## Admin panel: `www.studentpointacademy.online/admin/`

- **Dashboard** shows how many articles, announcements and form entries there are, and the latest entries.
- **Articles** lets you write, edit, save as draft, publish or delete. It has a formatting toolbar, cover images and images inside the text.
- **Announcements** lets you post notices with a category, date, "hide after" date, PDF or image attachment, and Urgent or Pinned flags.
- **Form entries** lists demo bookings, fee payments and join applications. You can filter them, open receipts or CVs, click a phone number to open WhatsApp, tick an entry as *Handled*, delete it, or **Export to CSV** for Excel.

## Demo mode (before Firebase is connected)

Until Firebase is set up, the site runs in **demo mode**. It shows sample announcements and articles, and anything saved stays only in that browser.
Demo admin login: **demo@spa** / **demo123**

## Going live with Firebase (one-time, about 15 minutes)

1. Go to https://console.firebase.google.com and click **Add project**. Name it, for example, `student-point-academy`.
2. Go to **Build → Firestore Database → Create database**. Choose production mode and the region `asia-south1`.
3. Go to **Build → Storage → Get started**. Storage needs the Blaze plan, which has a free allowance. A small academy normally pays nothing.
4. Go to **Build → Authentication → Get started → Email/Password → Enable**. Then open **Users → Add user** and create the admin account, for example `admin@studentpointacademy.online`, with a strong password.
5. Go to **Project settings → Your apps → Web (</>)** and register the app. Copy the `firebaseConfig` values into `FIREBASE_CONFIG` in **`assets/js/config.js`**.
6. Open **`firestore.rules`** and **`storage.rules`** and change `admin@studentpointacademy.online` to the admin email you created. Then paste each file into **Firestore → Rules** and **Storage → Rules** and click **Publish**.
7. Go to **Authentication → Settings → Authorized domains** and add `www.studentpointacademy.online` and `studentpointacademy.online`.
8. Upload the files to GitHub. The site goes live and the admin panel now uses the real database.

With these rules, visitors can only *add* form entries. Only the admin can read bookings, receipts and CVs, and only the admin can post announcements or articles.

## Changing categories

Article and announcement categories are set in `assets/js/config.js` (`ARTICLE_CATEGORIES`, `ANNOUNCEMENT_CATEGORIES`).

## Files

```
index.html  announcements.html  articles.html  article.html
admin/            index.html, admin.js, admin.css
assets/css/       style.css (the site's theme, moved out of index.html unchanged)
assets/js/        config.js, data.js (database), utils.js, main.js, demo-data.js
assets/js/pages/  home.js, announcements.js, articles.js, article.js
assets/img/       favicon, default cover, demo covers
firestore.rules  storage.rules  sitemap.xml  robots.txt  CNAME
```
