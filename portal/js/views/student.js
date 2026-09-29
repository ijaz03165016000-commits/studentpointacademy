/* Student portal */
import * as store from "../store.js";
import { className } from "../school.js";
import { fmtDate } from "../ui.js";
import { studentViews, noticesView, profileView } from "./shared.js";
import { renewBanner, subscriptionPage } from "./subscribe.js";
import { idCardPage, blockedBanner } from "./idcard.js";
import { studentClassroom, studentCounts } from "./classroom.js";

let sid, me, myRec = null;
export async function init(user) { me = user; sid = user.linkId || user.id; try { myRec = await store.get("students", sid); } catch {} }

export const nav = [
  { id: "home", label: "Dashboard", icon: "home" },
  { id: "classroom", label: "Online classroom", icon: "school" },
  { id: "cchat", label: "Voice chat", icon: "chat" },
  { id: "attendance", label: "Attendance", icon: "checklist" },
  { id: "results", label: "Results", icon: "chart" },
  { id: "timetable", label: "Timetable", icon: "calendar" },
  { id: "homework", label: "Homework", icon: "book" },
  { id: "remarks", label: "Teacher remarks", icon: "note" },
  { id: "fees", label: "Fees", icon: "money" },
  { id: "leave", label: "Leave", icon: "leave" },
  { id: "notices", label: "Notices", icon: "bell" },
  { id: "idcard", label: "ID card", icon: "user" },
  { id: "subscription", label: "Subscription", icon: "star" }
];

const sv = studentViews(() => sid, { header: () => (me && ["", "#/", "#/home"].includes(location.hash.split("?")[0]) ? blockedBanner(myRec) + renewBanner(me) : "") });
export const parentOf = { task: "classroom" };
export const views = {
  ...sv,
  ...studentClassroom(),
  subscription: subscriptionPage,
  idcard: idCardPage("student"),
  notices: noticesView("students"),
  profile: profileView(async () => {
    const s = await store.get("students", sid);
    return [["Student ID", sid], ["Class", className(s.classId)], ["Roll no.", s.rollNo], ["Father's name", s.fatherName], ["Date of birth", fmtDate(s.dob)], ["Phone", s.phone], ["Address", s.address], ["Admitted", fmtDate(s.admissionDate)]];
  })
};

export async function counts(user) { try { return await studentCounts(user); } catch { return {}; } }
