/* GREEN SIDE — تطبيق متابعة المشتل والبيت المحمي
   البيانات في Firebase Firestore، والدخول عبر Firebase Authentication.
   لإضافة قسم جديد (مثل الأبراج): أضف نوعاً جديداً في TYPES وأضف اسمه إلى ORDER. */
"use strict";
var APP_VERSION = "1.0.0";

/* ---------- defaults ---------- */
var DEF = {
  ecMin: 800, ecMax: 1500, ecTarget: 1200, phMin: 5.5, phMax: 6.5,
  wtMin: 18, wtMax: 26, airMin: 15, airMax: 32, rhMin: 50, rhMax: 85, luxMin: 10000, luxMax: 40000,
  nMix: 1, nEcph: 3, nTemp: 3, nLight: 3, nIrr: 4, pumpL: 20, tankL: 1000,
  ecPerMl: 200, abRatio: 1
};
var CHECK = { ec: ["ecMin", "ecMax"], ph: ["phMin", "phMax"], wt: ["wtMin", "wtMax"], air: ["airMin", "airMax"], rh: ["rhMin", "rhMax"], lux: ["luxMin", "luxMax"] };
var ZONES = ["كل المشتل", "البداية", "الوسط", "النهاية"];
var PH_ADJ = ["لا شيء", "خافض pH فقط", "رافع pH فقط", "خافض ورافع معاً"];
var IC = {
  mix: '<path d="M9 3h6M10 3v6l-5.2 9.2A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.8L14 9V3"/><path d="M7.5 15h9"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2M8 18h2M14 18h2"/>',
  ecph: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/><circle cx="12" cy="18" r="1.4"/>',
  temp: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
  irr: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>',
  light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  note: '<path d="M5 20c0-9 6-15 15-15 0 9-6 15-14 15"/><path d="M5 20l8.5-8.5"/>',
  today: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  add: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  rep: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  sup: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'
};
function ico(k, w) { w = w || 24; return '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + '</svg>'; }

/* field: k key, l label, t type (n number, t time, s select, x text, ta textarea), u unit, req, c check,
   w width (third/full), grp group heading before it, show(values) visibility, def setting default */
var TYPES = {
  mix: { label: "خلط محلول الري", short: "خلط المحلول", desc: "كمية A و B، الأملاح وpH بعد الضبط، حرارة الماء", target: "nMix", fields: [
    { k: "time", l: "وقت الخلط", t: "t", req: 1, w: "full" },
    { k: "water", l: "كمية الماء في الخزان", t: "n", u: "لتر", def: "tankL" },
    { k: "ecRaw", l: "أملاح الماء قبل الخلط", t: "n", u: "µS/cm" },
    { k: "mlA", l: "محلول A المستخدم", t: "n", u: "مل", req: 1 },
    { k: "mlB", l: "محلول B المستخدم", t: "n", u: "مل", req: 1 },
    { k: "ec", l: "الأملاح بعد الضبط", t: "n", u: "µS/cm", req: 1, c: "ec" },
    { k: "wt", l: "حرارة ماء المحلول عند الخلط", t: "n", u: "°C", req: 1, c: "wt" },
    { k: "phRaw", l: "pH قبل الضبط", t: "n", u: "pH", grp: "ضبط pH" },
    { k: "ph", l: "pH بعد الضبط", t: "n", u: "pH", req: 1, c: "ph" },
    { k: "phAdj", l: "مُعدّل pH المستخدم", t: "s", o: PH_ADJ, w: "full" },
    { k: "phDownMl", l: "كمية الخافض (حمض)", t: "n", u: "مل", show: function (v) { return v.phAdj === PH_ADJ[1] || v.phAdj === PH_ADJ[3]; } },
    { k: "phUpMl", l: "كمية الرافع", t: "n", u: "مل", show: function (v) { return v.phAdj === PH_ADJ[2] || v.phAdj === PH_ADJ[3]; } },
    { k: "memo", l: "ملاحظة", t: "x", w: "full" }] },
  ecph: { label: "قراءة الأملاح و pH", short: "أملاح و pH", desc: "مراجعة النسب خلال اليوم", target: "nEcph", fields: [
    { k: "time", l: "وقت القراءة", t: "t", req: 1, w: "full" },
    { k: "ec", l: "الأملاح", t: "n", u: "µS/cm", req: 1, c: "ec" },
    { k: "ph", l: "pH", t: "n", u: "pH", req: 1, c: "ph" },
    { k: "wt", l: "حرارة الماء", t: "n", u: "°C", c: "wt" },
    { k: "memo", l: "ملاحظة", t: "x", w: "full" }] },
  temp: { label: "حرارة الماء والجو", short: "الحرارة", desc: "حرارة الماء، وحرارة الجو والرطوبة في 3 نقاط", target: "nTemp", fields: [
    { k: "time", l: "وقت القياس", t: "t", req: 1, w: "full" },
    { k: "wt", l: "حرارة ماء المحلول", t: "n", u: "°C", req: 1, c: "wt", w: "full" },
    { k: "air1", l: "البداية", t: "n", u: "°C", c: "air", w: "third", grp: "حرارة الجو داخل البيت", pg: "air" },
    { k: "air2", l: "الوسط", t: "n", u: "°C", c: "air", w: "third", pg: "air" },
    { k: "air3", l: "النهاية", t: "n", u: "°C", c: "air", w: "third", pg: "air" },
    { k: "rh1", l: "البداية", t: "n", u: "%", c: "rh", w: "third", grp: "الرطوبة النسبية", pg: "rh" },
    { k: "rh2", l: "الوسط", t: "n", u: "%", c: "rh", w: "third", pg: "rh" },
    { k: "rh3", l: "النهاية", t: "n", u: "%", c: "rh", w: "third", pg: "rh" },
    { k: "memo", l: "ملاحظة", t: "x", w: "full" }] },
  irr: { label: "ري الشتلات", short: "الري", desc: "وقت كل رية بمضخة البطارية", target: "nIrr", fields: [
    { k: "time", l: "وقت الري", t: "t", req: 1, w: "full" },
    { k: "liters", l: "كمية المحلول", t: "n", u: "لتر", req: 1, def: "pumpL" },
    { k: "zone", l: "المنطقة", t: "s", o: ZONES },
    { k: "mins", l: "مدة الري", t: "n", u: "دقيقة" },
    { k: "batt", l: "بطارية المضخة", t: "s", o: ["مشحونة", "متوسطة", "ضعيفة"] },
    { k: "memo", l: "ملاحظة", t: "x", w: "full" }] },
  light: { label: "قياس الضوء", short: "الضوء", desc: "ثلاث نقاط: البداية، الوسط، النهاية", target: "nLight", fields: [
    { k: "time", l: "وقت القياس", t: "t", req: 1, w: "full" },
    { k: "sky", l: "حالة الجو", t: "s", o: ["مشمس", "غائم جزئياً", "غائم"], w: "full" },
    { k: "l1", l: "البداية", t: "n", u: "lux", req: 1, c: "lux", w: "third", grp: "شدة الإضاءة", pg: "lux" },
    { k: "l2", l: "الوسط", t: "n", u: "lux", req: 1, c: "lux", w: "third", pg: "lux" },
    { k: "l3", l: "النهاية", t: "n", u: "lux", req: 1, c: "lux", w: "third", pg: "lux" },
    { k: "memo", l: "ملاحظة", t: "x", w: "full" }] },
  note: { label: "ملاحظة على النبات", short: "ملاحظات", desc: "تعب، إصابة، مرض، رش أو أي ملاحظة", fields: [
    { k: "time", l: "الوقت", t: "t", req: 1, w: "full" },
    { k: "cat", l: "النوع", t: "s", o: ["تعب / ذبول", "إصابة حشرية", "مرض فطري أو بكتيري", "اصفرار / نقص عناصر", "حروق أو إجهاد حراري", "رش / علاج", "صيانة / عطل", "أخرى"], req: 1, w: "full" },
    { k: "sev", l: "الشدة", t: "s", o: ["خفيفة", "متوسطة", "شديدة"] },
    { k: "loc", l: "المكان", t: "s", o: ZONES },
    { k: "crop", l: "الصنف / رقم الصواني", t: "x", w: "full" },
    { k: "text", l: "وصف الملاحظة", t: "ta", req: 1, w: "full" },
    { k: "action", l: "الإجراء المتخذ (اسم المبيد والجرعة إن وجد)", t: "ta", w: "full" }] }
};
var ORDER = ["mix", "ecph", "temp", "irr", "light", "note"];
var GROUPS = { air: "حرارة الجو", rh: "الرطوبة", lux: "الضوء" };
var FERTS = ["نترات الكالسيوم", "نترات البوتاسيوم", "سلفات المغنيسيوم", "أحادي فوسفات البوتاسيوم MKP", "سلفات البوتاسيوم", "نترات الأمونيوم", "حديد مخلبي", "عناصر صغرى", "حمض الفوسفوريك", "حمض النيتريك"];

/* ---------- state ---------- */
var S = {
  fb: null, auth: null, db: null, user: null, uid: null, me: null, ownerUid: null, role: null,
  settings: Object.assign({}, DEF), users: {}, date: todayStr(), entries: [], signoff: null, openNotes: [], recipes: [],
  tab: "today", repDays: 7, rep: null, stock: null, photos: {}, dirty: false, installEvt: null, booted: false
};
var unsubDay = [], unsubAll = [];

/* ---------- utils ---------- */
function pad(n) { return (n < 10 ? "0" : "") + n; }
function todayStr(d) { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function nowTime() { var d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
function addDays(s, n) { var d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return todayStr(d); }
function fmtDate(s, opt) { try { return new Date(s + "T12:00:00").toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", opt || { weekday: "long", day: "numeric", month: "long" }); } catch (e) { return s; } }
function fmtTime(t) { if (!t) return ""; var p = t.split(":"); var h = +p[0]; var ap = h < 12 ? "ص" : "م"; var h12 = h % 12 || 12; return h12 + ":" + p[1] + " " + ap; }
function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function num(v) { if (v === "" || v == null) return null; var s = String(v).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }).replace(/[٫,]/g, "."); var n = Number(s); return isFinite(n) ? n : null; }
function f(n, d) { if (n == null || !isFinite(n)) return "—"; return Number(n).toLocaleString("en-US", { maximumFractionDigits: d || 0, minimumFractionDigits: 0 }); }
function avg(a) { a = a.filter(function (x) { return x != null && isFinite(x); }); return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
function sum(a) { return a.filter(function (x) { return x != null && isFinite(x); }).reduce(function (s, x) { return s + x; }, 0); }
function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); if (!a.length) return null; var m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
function chk(c, v) { if (!c || v == null) return null; var lo = S.settings[CHECK[c][0]], hi = S.settings[CHECK[c][1]]; if (lo != null && v < lo) return "lo"; if (hi != null && v > hi) return "hi"; return "ok"; }
function rangeTxt(c) { return f(S.settings[CHECK[c][0]], 1) + " – " + f(S.settings[CHECK[c][1]], 1); }
function toast(m) { var t = document.createElement("div"); t.className = "toast"; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800); }
function nameOf(id) { var u = S.users[id]; return (u && u.name) || "مستخدم"; }
function initials(id) { var n = nameOf(id).trim(); return esc(n ? n.charAt(0) : "؟"); }
function grpAvg(v, g) { var ks = { air: ["air1", "air2", "air3"], rh: ["rh1", "rh2", "rh3"], lux: ["l1", "l2", "l3"] }[g]; return avg(ks.map(function (k) { return num(v[k]); })); }
function isSup() { return S.role === "sup"; }
function isWorker() { return S.role === "worker"; }
function canAdd() { return isSup() || isWorker(); }
function toEmail(id) { id = id.trim().toLowerCase(); return id.indexOf("@") >= 0 ? id : id.replace(/\s+/g, "") + "@" + (window.GS_CONFIG.usernameDomain || "greenside.local"); }
function showLogin(id) { if (!id) return ""; var d = "@" + (window.GS_CONFIG.usernameDomain || "greenside.local"); return id.slice(-d.length) === d ? id.slice(0, -d.length) : id; }
function $(id) { return document.getElementById(id); }
function errMsg(e) {
  var c = e && e.code || "";
  var m = {
    "auth/invalid-credential": "اسم المستخدم أو كلمة المرور غير صحيحة.", "auth/wrong-password": "كلمة المرور غير صحيحة.", "auth/user-not-found": "لا يوجد حساب بهذا الاسم.",
    "auth/invalid-email": "اكتب اسم مستخدم أو بريداً صحيحاً.", "auth/too-many-requests": "محاولات كثيرة. انتظر قليلاً ثم حاول.", "auth/network-request-failed": "لا يوجد اتصال بالإنترنت.",
    "auth/email-already-in-use": "اسم المستخدم مستخدم من قبل.", "auth/weak-password": "كلمة المرور قصيرة. استخدم 6 أحرف أو أكثر.", "auth/requires-recent-login": "سجّل الخروج ثم الدخول من جديد، ثم غيّر كلمة المرور.",
    "permission-denied": "ليس لديك صلاحية لهذا الإجراء.", "unavailable": "لا يوجد اتصال بالخادم حالياً."
  }[c];
  return m || "حدث خطأ. حاول مرة أخرى.";
}

/* ---------- boot ---------- */
function boot() {
  var cfg = window.GS_CONFIG && window.GS_CONFIG.firebase;
  if (!window.firebase || !cfg || !cfg.apiKey) { $("view").innerHTML = setupNeededView(); return; }
  S.fb = firebase.initializeApp(cfg);
  S.auth = firebase.auth();
  S.db = firebase.firestore();
  S.db.enablePersistence({ synchronizeTabs: true }).catch(function () {});
  bindTop();
  window.addEventListener("online", netState); window.addEventListener("offline", netState);
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); S.installEvt = e; });
  S.auth.onAuthStateChanged(function (u) {
    stopAll(); memberSubs = false;
    S.user = u; S.uid = u ? u.uid : null; S.role = null; S.me = null;
    if (!u) { showAuth(); return; }
    startSession();
  });
}
function setupNeededView() {
  return '<div class="login"><div class="logo"><img src="icons/icon-192.png" alt=""><span class="wm big">GREEN SIDE</span></div>' +
    '<div class="card"><h2>التطبيق بانتظار الربط</h2><p class="muted">أضف بيانات مشروع Firebase في ملف config.js ثم افتح الصفحة من جديد. الخطوات في ملف README.md.</p></div></div>';
}
function netState() { var nb = $("netbar"); if (nb) nb.hidden = navigator.onLine; }
function stopAll() { unsubDay.concat(unsubAll).forEach(function (u) { try { u(); } catch (e) {} }); unsubDay = []; unsubAll = []; }

/* ---------- auth screens ---------- */
var AUTH_MODE = "login";
function showAuth() {
  $("top").hidden = true; $("tabsNav").hidden = true; closeSheet();
  S.db.collection("config").doc("owner").get().then(function (s) {
    S.ownerUid = s.exists ? s.data().uid : null;
    if (!S.ownerUid) AUTH_MODE = "setup";
    renderAuth();
  }).catch(function () { renderAuth(); });
  renderAuth();
}
function renderAuth() {
  var h = '<div class="login"><div class="logo"><img src="icons/icon-192.png" alt=""><span class="wm big">GREEN SIDE</span><span class="muted">سجل متابعة المشتل والبيت المحمي</span></div>';
  if (AUTH_MODE === "setup") {
    h += '<div class="card"><h2>إعداد الحساب الأول</h2><p class="muted" style="font-size:13.5px">هذا الحساب سيكون مالك التطبيق والمشرف الرئيسي. يظهر هذا النموذج مرة واحدة فقط.</p>' +
      '<form id="authForm" class="fgrid" novalidate>' +
      '<label class="f full" for="a_name">الاسم<input class="in" id="a_name" autocomplete="name"></label>' +
      '<label class="f full" for="a_id">البريد الإلكتروني<input class="in" id="a_id" type="email" dir="ltr" autocomplete="email"></label>' +
      '<label class="f full" for="a_pw">كلمة المرور (6 أحرف أو أكثر)<input class="in" id="a_pw" type="password" dir="ltr" autocomplete="new-password"></label>' +
      '<div class="err full" id="a_err"></div><button class="btn pri block full" type="submit">إنشاء الحساب والبدء</button></form></div>' +
      '<button class="linkbtn" type="button" data-act="authMode" data-m="login">لدي حساب، تسجيل الدخول</button>';
  } else if (AUTH_MODE === "reset") {
    h += '<div class="card"><h2>استعادة كلمة المرور</h2><p class="muted" style="font-size:13.5px">تصل رسالة الاستعادة للحسابات المسجلة ببريد حقيقي. حسابات العمال باسم مستخدم يعيد المشرف كلمة مرورها.</p>' +
      '<form id="authForm" class="fgrid" novalidate><label class="f full" for="a_id">البريد الإلكتروني<input class="in" id="a_id" type="email" dir="ltr"></label>' +
      '<div class="err full" id="a_err"></div><button class="btn pri block full" type="submit">إرسال رابط الاستعادة</button></form></div>' +
      '<button class="linkbtn" type="button" data-act="authMode" data-m="login">رجوع لتسجيل الدخول</button>';
  } else {
    h += '<div class="card"><form id="authForm" class="fgrid" novalidate>' +
      '<label class="f full" for="a_id">اسم المستخدم أو البريد<input class="in" id="a_id" dir="ltr" autocapitalize="off" autocomplete="username"></label>' +
      '<label class="f full" for="a_pw">كلمة المرور<input class="in" id="a_pw" type="password" dir="ltr" autocomplete="current-password"></label>' +
      '<div class="err full" id="a_err"></div><button class="btn pri block full" type="submit">تسجيل الدخول</button></form></div>' +
      '<button class="linkbtn" type="button" data-act="authMode" data-m="reset">نسيت كلمة المرور</button>' +
      (S.ownerUid === null ? '<button class="linkbtn" type="button" data-act="authMode" data-m="setup">إعداد الحساب الأول</button>' : "");
  }
  $("view").innerHTML = h + '<p class="muted" style="text-align:center;font-size:12px">الإصدار ' + APP_VERSION + '</p></div>';
  $("authForm").addEventListener("submit", onAuthSubmit);
}
function onAuthSubmit(ev) {
  ev.preventDefault();
  var btn = ev.target.querySelector("button[type=submit]"), er = $("a_err"); er.textContent = "";
  var id = ($("a_id").value || "").trim(), pw = $("a_pw") ? $("a_pw").value : "";
  if (!id) { er.textContent = "اكتب اسم المستخدم أو البريد."; return; }
  btn.disabled = true;
  var p;
  if (AUTH_MODE === "reset") p = S.auth.sendPasswordResetEmail(id).then(function () { er.textContent = ""; toast("أُرسل رابط الاستعادة إلى بريدك"); AUTH_MODE = "login"; renderAuth(); });
  else if (AUTH_MODE === "setup") {
    var name = $("a_name").value.trim();
    if (!name) { er.textContent = "اكتب الاسم."; btn.disabled = false; return; }
    window.__setupName = name;
    p = S.auth.createUserWithEmailAndPassword(toEmail(id), pw);
  } else p = S.auth.signInWithEmailAndPassword(toEmail(id), pw);
  p.catch(function (e) { er.textContent = errMsg(e); btn.disabled = false; });
}

/* ---------- session ---------- */
function startSession() {
  var db = S.db, uid = S.uid;
  $("view").innerHTML = '<div class="splash"><span class="wm big">GREEN SIDE</span><span class="muted">جارٍ التحميل…</span></div>';
  db.collection("config").doc("owner").get().then(function (s) {
    if (!s.exists && window.__setupName) {
      return db.collection("config").doc("owner").set({ uid: uid, at: Date.now() }).then(function () {
        return db.collection("users").doc(uid).set({ name: window.__setupName, login: S.user.email, role: "sup", createdAt: Date.now() });
      }).then(function () {
        return db.collection("config").doc("settings").set(DEF);
      }).then(function () { window.__setupName = null; S.ownerUid = uid; });
    }
    S.ownerUid = s.exists ? s.data().uid : null;
  }).then(function () {
    unsubAll.push(db.collection("users").doc(uid).onSnapshot(function (s) {
      S.me = s.exists ? s.data() : null;
      var r = S.ownerUid === uid ? "sup" : (S.me && S.me.role);
      var changed = r !== S.role; S.role = (r === "sup" || r === "worker") ? r : null;
      if (changed) onRole();
      else render();
    }, function () { S.role = null; onRole(); }));
  }).catch(function (e) { console.warn(e); $("view").innerHTML = '<div class="sec"><div class="empty">تعذّر الاتصال. تحقق من الإنترنت ثم أعد فتح التطبيق.<button class="btn" data-act="logout">تسجيل الخروج</button></div></div>'; });
}
var memberSubs = false;
function onRole() {
  if (!S.role) {
    unsubDay.forEach(function (u) { u(); }); unsubDay = []; memberSubs = false;
    $("top").hidden = true; $("tabsNav").hidden = true;
    $("view").innerHTML = '<div class="login"><div class="logo"><span class="wm big">GREEN SIDE</span></div><div class="card"><h2>الحساب غير مفعّل</h2><p class="muted">حسابك غير مفعّل أو موقوف. تواصل مع المشرف.</p><button class="btn block" data-act="logout">تسجيل الخروج</button></div></div>';
    return;
  }
  $("top").hidden = false; $("tabsNav").hidden = false; netState();
  if (isWorker() && (S.tab === "sup" || S.tab === "rep")) S.tab = "today";
  if (!memberSubs) {
    memberSubs = true;
    var db = S.db;
    unsubAll.push(db.collection("config").doc("settings").onSnapshot(function (s) { S.settings = Object.assign({}, DEF, s.exists ? s.data() : {}); render(); }, logErr));
    unsubAll.push(db.collection("users").onSnapshot(function (q) { var m = {}; q.forEach(function (d) { m[d.id] = d.data(); }); S.users = m; render(); }, logErr));
    unsubAll.push(db.collection("recipes").orderBy("ts", "desc").limit(300).onSnapshot(function (q) { S.recipes = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); if (S.tab === "sup") loadStock(); else render(); }, logErr));
    unsubAll.push(db.collection("entries").where("type", "==", "note").where("open", "==", true).onSnapshot(function (q) { S.openNotes = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); render(); }, logErr));
    subDay();
  }
  render();
}
function logErr(e) { console.warn(e); }
function subDay() {
  unsubDay.forEach(function (u) { u(); }); unsubDay = [];
  S.entries = []; S.signoff = null;
  unsubDay.push(S.db.collection("entries").where("date", "==", S.date).onSnapshot(function (q) {
    S.entries = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (a.time || "").localeCompare(b.time || "") || (a.ts - b.ts); });
    render();
  }, logErr));
  unsubDay.push(S.db.collection("signoffs").doc(S.date).onSnapshot(function (s) { S.signoff = s.exists ? s.data() : null; render(); }, logErr));
}

/* ---------- top bar & tabs ---------- */
function bindTop() {
  var dp = $("datePick"); dp.value = S.date;
  function go(d) { S.date = d; dp.value = d; subDay(); render(); }
  dp.addEventListener("change", function () { if (dp.value) go(dp.value); });
  $("prevDay").onclick = function () { go(addDays(S.date, -1)); };
  $("nextDay").onclick = function () { go(addDays(S.date, 1)); };
  $("goToday").onclick = function () { go(todayStr()); };
  $("tabs").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]"); if (!b) return;
    S.tab = b.dataset.tab; if (S.tab === "rep") loadReport(); if (S.tab === "sup") loadStock();
    render(true); window.scrollTo(0, 0);
  });
  $("view").addEventListener("focusout", function () { setTimeout(function () { if (S.dirty && !$("view").contains(document.activeElement)) render(); }, 0); });
}
function renderTop() {
  var t = S.date === todayStr();
  $("dateLabel").textContent = (t ? "اليوم · " : "") + fmtDate(S.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $("who").innerHTML = '<span class="av">' + initials(S.uid) + '</span><span class="nm"></span><span class="pill ' + (isSup() ? "ok" : "n") + '">' + (isSup() ? "مشرف" : "عامل") + '</span>';
  $("who").querySelector(".nm").textContent = nameOf(S.uid);
}
function renderTabs() {
  var tabs = [["today", "اليوم", "today"]];
  if (canAdd()) tabs.push(["add", "تسجيل", "add"]);
  if (isSup()) { tabs.push(["rep", "التقارير", "rep"]); tabs.push(["sup", "المشرف", "sup"]); }
  $("tabs").innerHTML = tabs.map(function (x) { return '<button class="tab" type="button" data-tab="' + x[0] + '" ' + (S.tab === x[0] ? 'aria-current="page"' : "") + '>' + ico(x[2]) + '<span>' + x[1] + '</span></button>'; }).join("");
}

/* ---------- render ---------- */
function render(force) {
  if (!S.role) return;
  renderTop(); renderTabs();
  var v = $("view"), ae = document.activeElement;
  if (!force && ae && v.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) { S.dirty = true; return; }
  S.dirty = false;
  if (S.tab === "add" && canAdd()) v.innerHTML = addView();
  else if (S.tab === "rep" && isSup()) { v.innerHTML = repView(); bindCharts(); }
  else if (S.tab === "sup" && isSup()) v.innerHTML = supView();
  else { S.tab = "today"; v.innerHTML = todayView(); }
  loadPhotos();
}

/* today */
function last(type) { var a = S.entries.filter(function (e) { return e.type === type; }); return a[a.length - 1]; }
function lastWith(key) { var a = S.entries.filter(function (e) { return e.v && num(e.v[key]) != null; }); return a[a.length - 1]; }
function statTile(lab, val, unit, c, sub) {
  var st = chk(c, val), cls = st === "lo" || st === "hi" ? "s-bad" : "";
  var pill = st == null ? "" : st === "ok" ? '<span class="pill ok">ضمن الحد</span>' : '<span class="pill bad">' + (st === "lo" ? "منخفض" : "مرتفع") + "</span>";
  return '<div class="stat ' + cls + '"><span class="lab">' + lab + '</span><span class="val num">' + (val == null ? "—" : f(val, c === "ph" ? 2 : 1)) + ' <small>' + unit + '</small></span><span class="sub">' + pill + " " + (sub || "") + "</span></div>";
}
function todayView() {
  var E = S.entries, s = S.settings, isToday = S.date === todayStr();
  var ecE = lastWith("ec"), phE = lastWith("ph"), wtE = lastWith("wt"), lE = last("light"), tE = S.entries.filter(function (e) { return e.type === "temp" && grpAvg(e.v, "air") != null; }).pop();
  var irr = E.filter(function (e) { return e.type === "irr"; }), liters = sum(irr.map(function (e) { return num(e.v.liters); }));
  var h = '<section class="sec"><div class="grid2 grid-stat">' +
    statTile("آخر قراءة أملاح", ecE ? num(ecE.v.ec) : null, "µS/cm", "ec", ecE ? fmtTime(ecE.time) : "") +
    statTile("آخر قراءة pH", phE ? num(phE.v.ph) : null, "", "ph", phE ? fmtTime(phE.time) : "") +
    statTile("حرارة ماء المحلول", wtE ? num(wtE.v.wt) : null, "°C", "wt", wtE ? fmtTime(wtE.time) : "") +
    statTile("حرارة الجو (متوسط)", tE ? grpAvg(tE.v, "air") : null, "°C", "air", tE ? fmtTime(tE.time) : "") +
    statTile("متوسط الضوء", lE ? grpAvg(lE.v, "lux") : null, "lux", "lux", lE ? fmtTime(lE.time) : "") +
    '<div class="stat"><span class="lab">الري</span><span class="val num">' + irr.length + ' <small>رية</small></span><span class="sub">' + f(liters, 1) + " لتر محلول</span></div></div></section>";
  var bad = [];
  E.forEach(function (e) { var T = TYPES[e.type]; if (!T) return; T.fields.forEach(function (fd) { if (!fd.c) return; var n = num(e.v[fd.k]), st = chk(fd.c, n); if (st === "lo" || st === "hi") bad.push(fmtTime(e.time) + " · " + T.short + ": " + (fd.pg ? GROUPS[fd.pg] + " " : "") + fd.l + " " + f(n, 2) + " " + fd.u + " (" + (st === "lo" ? "أقل" : "أعلى") + " من " + rangeTxt(fd.c) + ")"); }); });
  if (bad.length) h += '<section class="sec"><div class="card" style="border-color:var(--bad)"><h3 style="color:var(--bad)">قراءات خارج الحدود (' + bad.length + ')</h3><ul style="margin:8px 0 0;padding-right:18px;font-size:13.5px">' + bad.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul></div></section>";
  h += '<section class="sec"><div class="sec-h"><h2>مهام اليوم</h2></div><div class="card chk">';
  ORDER.filter(function (t) { return TYPES[t].target; }).forEach(function (t) {
    var need = s[TYPES[t].target] || 0, done = E.filter(function (e) { return e.type === t; }).length, p = need ? Math.min(100, done / need * 100) : 100;
    h += '<div class="chk-row"><span>' + TYPES[t].label + '</span><span class="num" style="font-size:13px">' + done + " / " + need + '</span><div class="bar"><i class="' + (p >= 100 ? "full" : "") + '" style="width:' + p + '%"></i></div></div>';
  });
  h += "</div></section>";
  var pend = E.filter(function (e) { return !e.review; }).length, flags = E.filter(function (e) { return e.review && e.review.s === "flag"; }).length;
  if (S.signoff) h += '<section class="sec"><div class="banner ok">' + ico("sup", 20) + "<span>اعتمد " + esc(nameOf(S.signoff.by)) + " سجل هذا اليوم" + (S.signoff.at ? " الساعة " + fmtTime(pad(new Date(S.signoff.at).getHours()) + ":" + pad(new Date(S.signoff.at).getMinutes())) : "") + "</span></div></section>";
  else if (E.length) h += '<section class="sec"><div class="banner ' + (pend ? "warn" : "n") + '"><span style="flex:1">مراجعة المشرف: <b>' + pend + "</b> بانتظار المراجعة" + (flags ? " · <b>" + flags + "</b> عليها ملاحظة" : "") + "</span>" + (isSup() ? '<button class="btn sm pri" data-act="signoff">اعتماد اليوم كاملاً</button>' : "") + "</div></section>";
  if (S.openNotes.length) h += '<section class="sec"><div class="sec-h"><h2>ملاحظات مفتوحة على النبات</h2><span class="pill warn">' + S.openNotes.length + '</span></div><div class="list">' + S.openNotes.slice().sort(function (a, b) { return b.ts - a.ts; }).slice(0, 8).map(function (e) { return entryCard(e, true); }).join("") + "</div></section>";
  h += '<section class="sec"><div class="sec-h"><h2>سجل ' + (isToday ? "اليوم" : "اليوم المحدد") + '</h2><span class="muted num" style="font-size:13px">' + E.length + "</span></div>";
  if (!E.length) h += '<div class="empty">لا توجد تسجيلات في هذا اليوم بعد.' + (canAdd() ? '<button class="btn pri" data-act="goTab" data-t="add">سجّل أول قراءة</button>' : "") + "</div>";
  else h += '<div class="list">' + E.slice().reverse().map(function (e) { return entryCard(e); }).join("") + "</div>";
  return h + "</section>";
}
function summaryChips(e) {
  var T = TYPES[e.type]; if (!T) return "";
  var v = e.v || {}, out = "", seen = {};
  T.fields.forEach(function (fd) {
    if (["time", "memo", "text", "action", "crop"].indexOf(fd.k) >= 0) return;
    if (fd.show && !fd.show(v)) return;
    if (fd.pg) {
      if (seen[fd.pg]) return; seen[fd.pg] = 1;
      var ks = T.fields.filter(function (x) { return x.pg === fd.pg; });
      var vals = ks.map(function (x) { return num(v[x.k]); });
      if (vals.every(function (x) { return x == null; })) return;
      var anyBad = vals.some(function (x) { var st = chk(fd.c, x); return st === "lo" || st === "hi"; });
      out += '<span class="chip ' + (anyBad ? "bad" : "") + '"><span class="k">' + GROUPS[fd.pg] + ' (ب/و/ن)</span><span class="num">' + vals.map(function (x) { return f(x, fd.c === "lux" ? 0 : 1); }).join(" · ") + "</span> " + fd.u + " <span class=\"k\">· متوسط " + f(avg(vals), fd.c === "lux" ? 0 : 1) + "</span></span>";
      return;
    }
    var raw = v[fd.k]; if (raw === "" || raw == null) return;
    if (fd.t === "s") { out += '<span class="chip"><span class="k">' + fd.l + "</span>" + esc(raw) + "</span>"; return; }
    var n = num(raw), st = chk(fd.c, n);
    out += '<span class="chip ' + (st === "lo" || st === "hi" ? "bad" : "") + '"><span class="k">' + fd.l + '</span><span class="num">' + f(n, fd.c === "ph" ? 2 : 1) + "</span>" + (fd.u && fd.u !== "pH" ? " " + fd.u : "") + "</span>";
  });
  return out;
}
function canEditEntry(e) { return isSup() || (isWorker() && e.by === S.uid && !e.review && e.date === todayStr()); }
function entryCard(e, showDate) {
  var T = TYPES[e.type] || { label: e.type }, v = e.v || {}, txt = [];
  if (v.memo) txt.push(v.memo); if (v.crop) txt.push("الصنف/الصواني: " + v.crop); if (v.text) txt.push(v.text); if (v.action) txt.push("الإجراء: " + v.action);
  var rev = e.review;
  var foot = '<span class="muted" style="font-size:12.5px">' + esc(nameOf(e.by)) + "</span>";
  foot += rev ? (rev.s === "ok" ? '<span class="pill ok">✓ تمت المراجعة</span>' : '<span class="pill warn">⚑ ملاحظة المشرف</span>') : '<span class="pill n">بانتظار المراجعة</span>';
  if (e.type === "note") foot += e.open ? '<span class="pill bad">مفتوحة</span>' : '<span class="pill ok">تم الحل</span>';
  foot += '<span class="sp"></span>';
  if (isSup()) {
    if (!rev || rev.s !== "ok") foot += '<button class="btn sm ok" data-act="approve" data-id="' + e.id + '">اعتماد</button>';
    foot += '<button class="btn sm warn" data-act="flag" data-id="' + e.id + '">ملاحظة</button>';
    if (e.type === "note") foot += '<button class="btn sm" data-act="toggleNote" data-id="' + e.id + '">' + (e.open ? "تم الحل" : "إعادة فتح") + "</button>";
  }
  if (canEditEntry(e)) foot += '<button class="btn sm ghost" data-act="edit" data-id="' + e.id + '">تعديل</button>';
  var chips = summaryChips(e);
  return '<article class="entry ' + (rev && rev.s === "flag" ? "flag" : "") + '">' +
    '<div class="e-head"><span class="e-ic">' + ico(e.type, 19) + '</span><div class="e-t"><b>' + esc(T.label) + '</b><span>' + (showDate ? esc(e.date) + " · " : "") + fmtTime(e.time) + "</span></div></div>" +
    (chips ? '<div class="chips">' + chips + "</div>" : "") +
    (txt.length ? '<div class="e-text">' + esc(txt.join("\n")) + "</div>" : "") +
    (e.photo ? '<img class="e-photo" alt="صورة الملاحظة" data-photo="' + esc(e.photo) + '">' : "") +
    (rev && rev.c ? '<div class="rev-note"><b>' + esc(nameOf(rev.by)) + ":</b> " + esc(rev.c) + "</div>" : "") +
    '<div class="e-foot">' + foot + "</div></article>";
}
function loadPhotos() {
  document.querySelectorAll("img[data-photo]").forEach(function (img) {
    var id = img.getAttribute("data-photo");
    if (S.photos[id]) { img.src = S.photos[id]; return; }
    S.db.collection("photos").doc(id).get().then(function (s) { if (s.exists) { S.photos[id] = s.data().data; img.src = S.photos[id]; } }).catch(function () {});
  });
}

/* add */
function addView() {
  if (S.date !== todayStr() && !isSup()) return '<div class="sec"><div class="empty">التسجيل متاح لليوم الحالي فقط.<button class="btn pri" data-act="gotoday">الانتقال إلى اليوم</button></div></div>';
  var h = '<section class="sec"><div class="sec-h"><h2>تسجيل جديد</h2><span class="muted" style="font-size:13px">' + (S.date === todayStr() ? "لليوم" : "للتاريخ " + esc(S.date)) + "</span></div>";
  h += '<button class="tile" style="min-height:0;flex-direction:row;align-items:center;width:100%;border-color:var(--accent-2)" data-act="calc"><span class="e-ic">' + ico("calc", 22) + '</span><span style="margin:0 12px 0 0;display:flex;flex-direction:column;align-items:flex-start"><b style="color:var(--ink)">حاسبة خلط المحلول</b><span>احسب كمية A و B للخزان حسب الأملاح المستهدفة</span></span></button>';
  h += '<div class="tiles">' + ORDER.map(function (t) {
    var T = TYPES[t], n = S.entries.filter(function (e) { return e.type === t; }), l = n[n.length - 1];
    return '<button class="tile" data-act="new" data-type="' + t + '"><span class="e-ic">' + ico(t, 22) + "</span><b>" + T.label + "</b><span>" + T.desc + "</span><em>" + (n.length ? n.length + " اليوم · آخرها " + fmtTime(l.time) : "لم يُسجّل اليوم") + "</em></button>";
  }).join("") + "</div></section>";
  return h + '<p class="muted" style="font-size:13px">الحدود المستهدفة: الأملاح ' + rangeTxt("ec") + " µS/cm · pH " + rangeTxt("ph") + " · حرارة الماء " + rangeTxt("wt") + " °C · حرارة الجو " + rangeTxt("air") + " °C · الضوء " + rangeTxt("lux") + " lux</p>";
}

/* ---------- time picker ---------- */
function timePicker(id, val) {
  var p = (val || nowTime()).split(":"), H = +p[0], M = +p[1], ap = H < 12 ? "am" : "pm", h12 = H % 12 || 12, hs = "", ms = "";
  for (var i = 1; i <= 12; i++) hs += '<option value="' + i + '"' + (i === h12 ? " selected" : "") + ">" + i + "</option>";
  for (var j = 0; j < 60; j++) ms += '<option value="' + j + '"' + (j === M ? " selected" : "") + ">" + pad(j) + "</option>";
  return '<div class="tp" id="' + id + '" data-ap="' + ap + '"><select class="in tp-h" aria-label="الساعة">' + hs + '</select><span class="tp-sep">:</span><select class="in tp-m" aria-label="الدقيقة">' + ms + '</select>' +
    '<div class="seg" role="group" aria-label="صباحاً أو مساءً"><button type="button" data-ap="am" aria-pressed="' + (ap === "am") + '">ص</button><button type="button" data-ap="pm" aria-pressed="' + (ap === "pm") + '">م</button></div></div>';
}
function readTime(id) {
  var el = $(id); if (!el) return "";
  var h = +el.querySelector(".tp-h").value, m = +el.querySelector(".tp-m").value, ap = el.getAttribute("data-ap");
  var H = h % 12 + (ap === "pm" ? 12 : 0); return pad(H) + ":" + pad(m);
}

/* ---------- entry form ---------- */
var FORM = null;
function openForm(type, e, prefill) {
  var T = TYPES[type]; FORM = { type: type, e: e };
  var v = e ? e.v : (prefill || {});
  var h = '<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true" aria-label="' + T.label + '">' +
    '<div class="sheet-h"><span class="e-ic">' + ico(type, 19) + "</span><h2>" + T.label + '</h2><button class="iconbtn" type="button" data-act="close" aria-label="إغلاق">✕</button></div><form id="entryForm" class="fgrid" novalidate>';
  T.fields.forEach(function (fd) {
    var id = "f_" + fd.k, val = v[fd.k], inp;
    if (val == null) val = fd.def ? S.settings[fd.def] : "";
    if (fd.grp) h += '<div class="grp-h">' + fd.grp + "</div>";
    if (fd.t === "s") inp = '<select class="in" id="' + id + '"><option value="">—</option>' + fd.o.map(function (o) { return "<option" + (o === val ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select>";
    else if (fd.t === "ta") inp = '<textarea class="in" id="' + id + '">' + esc(val) + "</textarea>";
    else if (fd.t === "t") inp = timePicker(id, v.time || (e ? e.time : ""));
    else if (fd.t === "x") inp = '<input class="in" id="' + id + '" value="' + esc(val) + '">';
    else inp = '<div class="unitwrap"><input class="in num" id="' + id + '" inputmode="decimal" autocomplete="off" value="' + esc(val) + '"><span class="u">' + (fd.u || "") + "</span></div>";
    h += '<label class="f ' + (fd.w || "") + '" id="w_' + fd.k + '" for="' + id + '"><span>' + fd.l + (fd.req ? ' <span class="req">*</span>' : "") + "</span>" + inp + (fd.c ? '<span class="hint" id="h_' + fd.k + '"></span>' : "") + "</label>";
  });
  if (type === "note") h += '<label class="f full" for="f_photo"><span>صورة (اختياري)</span><input class="in" type="file" accept="image/*" id="f_photo">' + (e && e.photo ? '<img class="e-photo" alt="" data-photo="' + esc(e.photo) + '">' : "") + "</label>";
  if (type === "mix") h += '<div class="full muted" style="font-size:12.5px" id="mixHint"></div>';
  h += '</form><div class="sheet-actions">' + (e ? '<button class="btn danger" type="button" data-act="del" data-id="' + e.id + '">حذف</button>' : "") + '<button class="btn pri" type="button" data-act="save">حفظ</button></div></div></div>';
  $("sheetRoot").innerHTML = h;
  var form = $("entryForm");
  form.addEventListener("input", updForm); form.addEventListener("change", updForm);
  form.addEventListener("submit", function (ev) { ev.preventDefault(); });
  updForm(); loadPhotos();
}
function formValues() {
  var v = {};
  TYPES[FORM.type].fields.forEach(function (fd) { if (fd.t === "t") v[fd.k] = readTime("f_" + fd.k); else { var el = $("f_" + fd.k); v[fd.k] = el ? el.value.trim() : ""; } });
  return v;
}
function updForm() {
  if (!FORM) return;
  var v = formValues();
  TYPES[FORM.type].fields.forEach(function (fd) {
    if (fd.show) $("w_" + fd.k).hidden = !fd.show(v);
    if (!fd.c) return;
    var el = $("h_" + fd.k); if (!el) return;
    var n = num(v[fd.k]), st = chk(fd.c, n);
    el.className = "hint " + (st || "");
    if (fd.w === "third") el.textContent = n == null ? "" : st === "ok" ? "✓" : (st === "lo" ? "منخفض" : "مرتفع");
    else el.textContent = n == null ? "المستهدف " + rangeTxt(fd.c) : st === "ok" ? "✓ ضمن المستهدف " + rangeTxt(fd.c) : (st === "lo" ? "أقل" : "أعلى") + " من المستهدف " + rangeTxt(fd.c);
  });
  if (FORM.type === "mix") {
    var w = num(v.water), a = num(v.mlA), b = num(v.mlB), el = $("mixHint");
    if (el) el.textContent = w && (a || b) ? "المعدل: A " + f(a / w, 2) + " مل/لتر · B " + f(b / w, 2) + " مل/لتر" : "";
  }
}
function closeSheet() { $("sheetRoot").innerHTML = ""; FORM = null; }
function saveForm(btn) {
  var type = FORM.type, e = FORM.e, T = TYPES[type], raw = formValues(), v = {}, miss = [];
  T.fields.forEach(function (fd) {
    var x = raw[fd.k];
    if (fd.show && !fd.show(raw)) { v[fd.k] = ""; return; }
    if (fd.t === "n" && x !== "") { var n = num(x); if (n == null) { miss.push(fd.l + " (رقم غير صحيح)"); return; } x = n; }
    if (fd.req && (x === "" || x == null)) miss.push((fd.pg ? GROUPS[fd.pg] + " " : "") + fd.l);
    v[fd.k] = x;
  });
  if (miss.length) { toast("أكمل: " + miss.join("، ")); return; }
  btn.disabled = true; btn.textContent = "جارٍ الحفظ…";
  var fi = $("f_photo"), file = fi && fi.files && fi.files[0];
  (file ? shrink(file) : Promise.resolve(null)).then(function (dataUrl) {
    var photoId = e && e.photo || null, ops = [];
    if (dataUrl) { var pref = S.db.collection("photos").doc(); photoId = pref.id; ops.push(pref.set({ data: dataUrl, by: S.uid, ts: Date.now() })); S.photos[photoId] = dataUrl; }
    var ref;
    if (e) { ref = S.db.collection("entries").doc(e.id); var up = { v: v, time: v.time }; if (photoId) up.photo = photoId; ops.push(ref.update(up)); }
    else {
      ref = S.db.collection("entries").doc();
      var d = { type: type, date: S.date, time: v.time, ts: Date.now(), by: S.uid, v: v };
      if (photoId) d.photo = photoId; if (type === "note") d.open = true;
      ops.push(ref.set(d));
    }
    Promise.all(ops).catch(function (err) { console.warn(err); toast("لم يُحفظ التسجيل: " + errMsg(err)); });
    closeSheet();
    toast(navigator.onLine ? "تم الحفظ" : "حُفظ في الجوال وسيُرسل عند رجوع الإنترنت");
  });
}
function shrink(file) {
  return new Promise(function (res) {
    var img = new Image(), u = URL.createObjectURL(file);
    img.onload = function () {
      var m = 900, r = Math.min(1, m / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      var q = .7, out = c.toDataURL("image/jpeg", q);
      while (out.length > 700000 && q > .3) { q -= .15; out = c.toDataURL("image/jpeg", q); }
      res(out);
    };
    img.onerror = function () { res(null); };
    img.src = u;
  });
}

/* ---------- mixing calculator ---------- */
var CALC = { learned: null, n: 0 };
function openCalc() {
  var s = S.settings, lastMix = S.entries.filter(function (e) { return e.type === "mix" && num(e.v.ecRaw) != null; }).pop();
  var h = '<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true" aria-label="حاسبة خلط المحلول">' +
    '<div class="sheet-h"><span class="e-ic">' + ico("calc", 19) + '</span><h2>حاسبة خلط المحلول</h2><button class="iconbtn" type="button" data-act="close" aria-label="إغلاق">✕</button></div>' +
    '<form id="calcForm" class="fgrid" novalidate>' +
    '<label class="f full" for="c_water">كمية الماء في الخزان<div class="unitwrap"><input class="in num" id="c_water" inputmode="decimal" value="' + esc(s.tankL) + '"><span class="u">لتر</span></div></label>' +
    '<label class="f" for="c_raw">أملاح الماء الخام<div class="unitwrap"><input class="in num" id="c_raw" inputmode="decimal" value="' + esc(lastMix ? lastMix.v.ecRaw : "") + '"><span class="u">µS/cm</span></div><span class="hint">قِس الماء قبل إضافة أي سماد</span></label>' +
    '<label class="f" for="c_target">الأملاح المستهدفة<div class="unitwrap"><input class="in num" id="c_target" inputmode="decimal" value="' + esc(s.ecTarget) + '"><span class="u">µS/cm</span></div><span class="hint">المسموح ' + rangeTxt("ec") + "</span></label>" +
    '</form><div id="calcOut" style="margin-top:14px"></div>' +
    '<div class="sheet-actions"><button class="btn pri" type="button" data-act="calcToMix">تسجيل الخلط بهذه الكميات</button></div></div></div>';
  $("sheetRoot").innerHTML = h;
  $("calcForm").addEventListener("input", calcRun);
  $("calcForm").addEventListener("submit", function (ev) { ev.preventDefault(); });
  calcRun();
  learnFactor().then(calcRun);
}
function learnFactor() {
  return S.db.collection("entries").where("date", ">=", addDays(todayStr(), -45)).get().then(function (q) {
    var ks = [];
    q.forEach(function (d) {
      var r = d.data(); if (r.type !== "mix" || !r.v) return;
      var w = num(r.v.water), a = num(r.v.mlA), ec = num(r.v.ec), raw = num(r.v.ecRaw);
      if (w > 0 && a > 0 && ec != null && raw != null && ec > raw) ks.push((ec - raw) / (a / w));
    });
    CALC.n = ks.length; CALC.learned = ks.length >= 3 ? median(ks) : null;
  }).catch(function () {});
}
function calcFactor() { return CALC.learned || num(S.settings.ecPerMl) || DEF.ecPerMl; }
function calcRun() {
  var out = $("calcOut"); if (!out) return;
  var w = num($("c_water").value), raw = num($("c_raw").value), tg = num($("c_target").value), k = calcFactor(), ab = num(S.settings.abRatio) || 1;
  CALC.res = null;
  if (!w || tg == null) { out.innerHTML = '<div class="empty">اكتب كمية الماء والأملاح المستهدفة.</div>'; return; }
  if (raw == null) raw = 0;
  if (tg <= raw) { out.innerHTML = '<div class="banner warn">أملاح الماء الخام (' + f(raw) + ") أعلى من أو تساوي الهدف (" + f(tg) + "). لا تضف سماداً قبل مراجعة المشرف أو خلط ماء أقل ملوحة.</div>"; return; }
  var perL = (tg - raw) / k, mlA = perL * w, mlB = mlA * ab, step = 0.1 * mlA;
  CALC.res = { water: w, ecRaw: raw, mlA: Math.round(mlA), mlB: Math.round(mlB) };
  var tgSt = chk("ec", tg);
  out.innerHTML =
    '<div class="grid2"><div class="stat" style="border-color:var(--accent-2)"><span class="lab">محلول A</span><span class="val num">' + f(mlA) + ' <small>مل</small></span><span class="sub num">' + f(perL, 2) + ' مل لكل لتر</span></div>' +
    '<div class="stat" style="border-color:var(--accent-2)"><span class="lab">محلول B</span><span class="val num">' + f(mlB) + ' <small>مل</small></span><span class="sub num">' + f(perL * ab, 2) + " مل لكل لتر</span></div></div>" +
    '<div class="card" style="margin-top:10px"><dl class="kv"><dt>الأملاح المتوقعة بعد الخلط</dt><dd><b class="num">' + f(tg) + "</b> µS/cm " + (tgSt === "ok" ? '<span class="pill ok">ضمن الحد</span>' : '<span class="pill bad">خارج الحد ' + rangeTxt("ec") + "</span>") + "</dd>" +
    "<dt>الزيادة من السماد</dt><dd class=\"num\">" + f(tg - raw) + " µS/cm</dd>" +
    "<dt>pH المستهدف بعد الخلط</dt><dd class=\"num\">" + rangeTxt("ph") + "</dd>" +
    "<dt>أساس الحساب</dt><dd>" + (CALC.learned ? "كل 1 مل/لتر من A (مع B) يرفع الأملاح " + f(k) + " µS/cm، محسوب من آخر " + CALC.n + " عمليات خلط" : "معامل المشرف: " + f(k) + " µS/cm لكل 1 مل/لتر") + "</dd></dl></div>" +
    '<div class="card" style="margin-top:10px"><h3>خطوات الخلط</h3><ol style="margin:8px 0 0;padding-right:20px;font-size:14px;line-height:1.8">' +
    "<li>املأ الخزان بـ <b class=\"num\">" + f(w) + "</b> لتر وقِس أملاح الماء.</li>" +
    "<li>أضف <b>محلول A</b>: <b class=\"num\">" + f(mlA * 0.9) + "</b> مل أولاً (90%) وحرّك جيداً 2–3 دقائق.</li>" +
    "<li>أضف <b>محلول B</b>: <b class=\"num\">" + f(mlB * 0.9) + "</b> مل وحرّك جيداً. لا تخلط A و B مركّزين معاً أبداً.</li>" +
    "<li>قِس الأملاح. إذا كانت أقل من <b class=\"num\">" + f(tg) + "</b> أضف <b class=\"num\">" + f(step) + "</b> مل من A ثم مثلها من B، وكرر القياس. كل إضافة ترفع تقريباً <b class=\"num\">" + f(k * 0.1 * perL) + "</b> µS/cm.</li>" +
    "<li>اضبط pH إلى " + rangeTxt("ph") + " بعد ضبط الأملاح، بكميات صغيرة مع التحريك والقياس.</li>" +
    "<li>سجّل الكميات الفعلية المستخدمة بزر التسجيل أدناه.</li></ol></div>";
}

/* ---------- review ---------- */
function findEntry(id) { return S.entries.filter(function (x) { return x.id === id; })[0] || S.openNotes.filter(function (x) { return x.id === id; })[0]; }
function openFlag(id) {
  var e = findEntry(id);
  $("sheetRoot").innerHTML = '<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-h"><h2>ملاحظة المشرف</h2><button class="iconbtn" type="button" data-act="close" aria-label="إغلاق">✕</button></div>' +
    '<label class="f" for="flagTxt">اكتب ما يجب تصحيحه أو متابعته<textarea class="in" id="flagTxt">' + esc(e && e.review && e.review.c || "") + "</textarea></label>" +
    '<div class="sheet-actions"><button class="btn pri" type="button" data-act="saveFlag" data-id="' + id + '">حفظ الملاحظة</button></div></div></div>';
}

/* ---------- reports ---------- */
function loadReport() {
  S.rep = { loading: true }; render(true);
  var start = addDays(todayStr(), -(S.repDays - 1));
  S.db.collection("entries").where("date", ">=", start).get().then(function (q) {
    S.rep = { start: start, rows: q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }) };
    render(true);
  }).catch(function () { S.rep = { err: 1 }; render(true); });
}
function recipeFor(tank, date) { return S.recipes.filter(function (r) { return r.tank === tank && r.date <= date; }).sort(function (a, b) { return (b.date + b.ts).localeCompare(a.date + a.ts); })[0]; }
function toBase(it) { var q = num(it.qty); if (q == null) return null; return (it.unit === "كغ" || it.unit === "لتر") ? q * 1000 : q; }
function unitBase(it) { return (it.unit === "مل" || it.unit === "لتر") ? "مل" : "غ"; }
function consumption(rows) {
  var per = {}, mlA = 0, mlB = 0, down = 0, up = 0;
  rows.filter(function (r) { return r.type === "mix"; }).forEach(function (r) {
    down += num(r.v.phDownMl) || 0; up += num(r.v.phUpMl) || 0;
    [["A", "mlA"], ["B", "mlB"]].forEach(function (p) {
      var ml = num(r.v[p[1]]); if (!ml) return; if (p[0] === "A") mlA += ml; else mlB += ml;
      var rc = recipeFor(p[0], r.date); if (!rc || !num(rc.volL)) return;
      var frac = ml / (num(rc.volL) * 1000);
      (rc.items || []).forEach(function (it) { var g = toBase(it); if (g == null) return; var key = it.name + "|" + unitBase(it); per[key] = (per[key] || 0) + g * frac; });
    });
  });
  return { mlA: mlA, mlB: mlB, down: down, up: up, per: per };
}
function daily(rows) {
  var by = {}; rows.forEach(function (r) { (by[r.date] = by[r.date] || []).push(r); });
  return Object.keys(by).sort().reverse().map(function (d) {
    var a = by[d], g = function (t) { return a.filter(function (r) { return r.type === t; }); };
    var col = function (k) { return a.map(function (r) { return num(r.v && r.v[k]); }); };
    return { d: d, mix: g("mix").length, mlA: sum(g("mix").map(function (r) { return num(r.v.mlA); })), mlB: sum(g("mix").map(function (r) { return num(r.v.mlB); })),
      ec: avg(col("ec")), ph: avg(col("ph")), wt: avg(col("wt")), air: avg(g("temp").map(function (r) { return grpAvg(r.v, "air"); })), rh: avg(g("temp").map(function (r) { return grpAvg(r.v, "rh"); })),
      irr: g("irr").length, lit: sum(g("irr").map(function (r) { return num(r.v.liters); })), lux: avg(g("light").map(function (r) { return grpAvg(r.v, "lux"); })),
      notes: g("note").length, pend: a.filter(function (r) { return !r.review; }).length };
  });
}
function ptsFor(rows, k) {
  var t = function (r) { return new Date(r.date + "T" + (r.time || "12:00") + ":00").getTime(); };
  var lab = function (r) { return r.date.slice(5) + " " + fmtTime(r.time); };
  if (k === "air" || k === "lux" || k === "rh") { var ty = k === "lux" ? "light" : "temp"; return rows.filter(function (r) { return r.type === ty && grpAvg(r.v, k) != null; }).map(function (r) { return { t: t(r), y: grpAvg(r.v, k), lab: lab(r) }; }); }
  return rows.filter(function (r) { return r.v && num(r.v[k]) != null; }).map(function (r) { return { t: t(r), y: num(r.v[k]), lab: lab(r) }; });
}
function repView() {
  var h = '<section class="sec"><div class="sec-h"><h2>التقارير والمتابعة</h2><button class="btn sm" data-act="refreshRep">تحديث</button></div>' +
    '<div class="seg" role="group" aria-label="الفترة">' + [7, 30, 90].map(function (n) { return '<button type="button" data-act="repDays" data-n="' + n + '" aria-pressed="' + (S.repDays === n) + '">آخر ' + n + " يوم</button>"; }).join("") + "</div></section>";
  var R = S.rep;
  if (!R || R.loading) return h + '<div class="empty">جارٍ تجهيز التقرير…</div>';
  if (R.err) return h + '<div class="empty">تعذّر تحميل التقرير. اضغط تحديث.</div>';
  var rows = R.rows;
  if (!rows.length) return h + '<div class="empty">لا توجد تسجيلات في هذه الفترة.</div>';
  var C = consumption(rows), D = daily(rows), irr = rows.filter(function (r) { return r.type === "irr"; });
  h += '<section class="sec"><div class="grid2 grid-stat">' +
    '<div class="stat"><span class="lab">محلول A المستهلك</span><span class="val num">' + f(C.mlA / 1000, 2) + ' <small>لتر</small></span><span class="sub num">' + f(C.mlA) + " مل</span></div>" +
    '<div class="stat"><span class="lab">محلول B المستهلك</span><span class="val num">' + f(C.mlB / 1000, 2) + ' <small>لتر</small></span><span class="sub num">' + f(C.mlB) + " مل</span></div>" +
    '<div class="stat"><span class="lab">خافض / رافع pH</span><span class="val num">' + f(C.down) + " / " + f(C.up) + ' <small>مل</small></span><span class="sub">مجموع الفترة</span></div>' +
    '<div class="stat"><span class="lab">محلول الري المستخدم</span><span class="val num">' + f(sum(irr.map(function (r) { return num(r.v.liters); }))) + ' <small>لتر</small></span><span class="sub">' + irr.length + " رية</span></div></div></section>";
  h += '<section class="sec"><h2>الأملاح (µS/cm)</h2><div class="card chart" data-chart="ec"></div><h2>pH</h2><div class="card chart" data-chart="ph"></div>' +
    '<h2>حرارة ماء المحلول (°C)</h2><div class="card chart" data-chart="wt"></div><h2>حرارة الجو، متوسط النقاط الثلاث (°C)</h2><div class="card chart" data-chart="air"></div>' +
    '<h2>متوسط الضوء (lux)</h2><div class="card chart" data-chart="lux"></div></section>';
  var per = Object.keys(C.per).map(function (k) { return [k, C.per[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  h += '<section class="sec"><h2>استهلاك الأسمدة التقديري</h2><p class="muted" style="margin:0;font-size:13px">محسوب من كمية A و B في سجلات الخلط وآخر وصفة لكل خزان.</p>';
  h += per.length ? '<div class="tbl-wrap"><table><thead><tr><th>السماد</th><th>الكمية المستهلكة</th></tr></thead><tbody>' + per.map(function (p) { var n = p[0].split("|"), g = p[1]; return "<tr><td>" + esc(n[0]) + '</td><td class="num">' + (g >= 1000 ? f(g / 1000, 2) + (n[1] === "غ" ? " كغ" : " لتر") : f(g, 1) + " " + n[1]) + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<div class="empty">سجّل وصفة لكل خزان من قسم المشرف ليظهر استهلاك كل سماد.</div>';
  h += '</section><section class="sec"><h2>الملخص اليومي</h2><div class="tbl-wrap"><table><thead><tr><th>التاريخ</th><th>خلط</th><th>A مل</th><th>B مل</th><th>EC</th><th>pH</th><th>حرارة الماء</th><th>حرارة الجو</th><th>الرطوبة</th><th>ريات</th><th>لتر</th><th>الضوء</th><th>ملاحظات</th><th>بانتظار المراجعة</th></tr></thead><tbody>' +
    D.map(function (r) { return '<tr><td class="num">' + r.d + '</td><td class="num">' + r.mix + '</td><td class="num">' + f(r.mlA) + '</td><td class="num">' + f(r.mlB) + '</td><td class="num">' + f(r.ec) + '</td><td class="num">' + f(r.ph, 2) + '</td><td class="num">' + f(r.wt, 1) + '</td><td class="num">' + f(r.air, 1) + '</td><td class="num">' + f(r.rh) + '</td><td class="num">' + r.irr + '</td><td class="num">' + f(r.lit, 1) + '</td><td class="num">' + f(r.lux) + '</td><td class="num">' + r.notes + '</td><td class="num">' + r.pend + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
  h += '<section class="sec"><div class="card"><h2>تصدير إلى Excel</h2><p class="muted" style="font-size:13.5px">ملف فيه ورقة لكل نوع تسجيل، والملخص اليومي، والوصفات، واستهلاك الأسمدة للفترة المختارة.</p><button class="btn pri block" data-act="export">تنزيل ملف Excel</button></div></section>';
  return h;
}
function bindCharts() {
  var R = S.rep; if (!R || !R.rows) return;
  document.querySelectorAll("[data-chart]").forEach(function (el) { var k = el.getAttribute("data-chart"); drawChart(el, ptsFor(R.rows, k), k); });
}
function drawChart(el, pts, c) {
  if (!pts.length) { el.innerHTML = '<div class="muted" style="font-size:13px;text-align:center;padding:16px">لا توجد قراءات</div>'; return; }
  pts.sort(function (a, b) { return a.t - b.t; });
  var W = 600, H = 190, L = 50, Rr = 12, T = 12, B = 26, lo = S.settings[CHECK[c][0]], hi = S.settings[CHECK[c][1]];
  var ys = pts.map(function (p) { return p.y; });
  var ymin = Math.min.apply(null, ys.concat([lo])), ymax = Math.max.apply(null, ys.concat([hi])), padv = (ymax - ymin) * 0.12 || 1; ymin -= padv; ymax += padv;
  var t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  var X = function (t) { return L + (t1 === t0 ? (W - L - Rr) / 2 : (t - t0) / (t1 - t0) * (W - L - Rr)); }, Y = function (y) { return T + (1 - (y - ymin) / (ymax - ymin)) * (H - T - B); };
  var dec = c === "ph" ? 1 : 0, g = "";
  for (var i = 0; i <= 3; i++) { var v = ymin + (ymax - ymin) * i / 3; g += '<line class="gl" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="ax" x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + f(v, dec) + "</text>"; }
  var band = '<rect x="' + L + '" width="' + (W - L - Rr) + '" y="' + Y(hi) + '" height="' + Math.max(0, Y(lo) - Y(hi)) + '" fill="var(--band)"/>';
  var xl = [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]].filter(function (p, i, a) { return a.map(function (q) { return q.lab.slice(0, 5); }).indexOf(p.lab.slice(0, 5)) === i; });
  var xs = xl.map(function (p) { return '<text class="ax" x="' + X(p.t) + '" y="' + (H - 6) + '" text-anchor="middle">' + p.lab.slice(0, 5) + "</text>"; }).join("");
  var path = pts.map(function (p, i) { return (i ? "L" : "M") + X(p.t).toFixed(1) + " " + Y(p.y).toFixed(1); }).join(" ");
  var dots = pts.map(function (p) { var st = chk(c, p.y); return '<circle cx="' + X(p.t) + '" cy="' + Y(p.y) + '" r="' + (pts.length > 60 ? 2.2 : 3.5) + '" fill="' + (st === "ok" ? "var(--chart)" : "var(--bad)") + '" stroke="var(--surface)" stroke-width="1.5"/>'; }).join("");
  el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img">' + band + g + '<path d="' + path + '" fill="none" stroke="var(--chart)" stroke-width="2" stroke-linejoin="round"/>' + dots + xs + '<line class="hov" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--muted)" stroke-dasharray="3 3" visibility="hidden"/></svg><div class="tip" hidden></div>';
  var svg = el.querySelector("svg"), tip = el.querySelector(".tip"), hv = svg.querySelector(".hov");
  function mv(ev) {
    var r = svg.getBoundingClientRect(), cx = (ev.touches ? ev.touches[0].clientX : ev.clientX), x = (cx - r.left) / r.width * W, best = pts[0], bd = 1e9;
    pts.forEach(function (p) { var d = Math.abs(X(p.t) - x); if (d < bd) { bd = d; best = p; } });
    hv.setAttribute("x1", X(best.t)); hv.setAttribute("x2", X(best.t)); hv.setAttribute("visibility", "visible");
    tip.hidden = false; tip.textContent = best.lab + " · " + f(best.y, c === "ph" ? 2 : 0);
    tip.style.left = Math.max(60, Math.min(r.width - 60, X(best.t) / W * r.width)) + "px";
  }
  svg.addEventListener("mousemove", mv); svg.addEventListener("touchstart", mv, { passive: true }); svg.addEventListener("touchmove", mv, { passive: true });
  svg.addEventListener("mouseleave", function () { tip.hidden = true; hv.setAttribute("visibility", "hidden"); });
}
function exportXlsx(btn) {
  if (!window.XLSX || !S.rep || !S.rep.rows) { toast("التصدير غير متاح الآن، تحقق من الإنترنت"); return; }
  btn.disabled = true;
  try {
    var wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
    var add = function (name, aoa) { var ws = XLSX.utils.aoa_to_sheet(aoa); ws["!cols"] = aoa[0].map(function (_, i) { return { wch: Math.min(40, Math.max.apply(null, [10].concat(aoa.map(function (r) { return String(r[i] == null ? "" : r[i]).length + 2; })))) }; }); XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); };
    var rows = S.rep.rows;
    add("الملخص اليومي", [["التاريخ", "مرات الخلط", "A مل", "B مل", "متوسط EC", "متوسط pH", "حرارة الماء", "حرارة الجو", "الرطوبة", "ريات", "لتر", "الضوء", "ملاحظات", "بانتظار المراجعة"]].concat(daily(rows).map(function (r) { return [r.d, r.mix, r.mlA, r.mlB, r.ec && Math.round(r.ec), r.ph && +r.ph.toFixed(2), r.wt && +r.wt.toFixed(1), r.air && +r.air.toFixed(1), r.rh && Math.round(r.rh), r.irr, r.lit, r.lux && Math.round(r.lux), r.notes, r.pend]; })));
    ORDER.forEach(function (t) {
      var T = TYPES[t], fs = T.fields;
      var head = ["التاريخ"].concat(fs.map(function (x) { return (x.pg ? GROUPS[x.pg] + " - " : "") + x.l + (x.u && x.u !== "pH" ? " (" + x.u + ")" : ""); }));
      if (t === "temp") head = head.concat(["متوسط حرارة الجو", "متوسط الرطوبة"]); if (t === "light") head.push("متوسط الضوء"); if (t === "note") head.push("الحالة");
      head = head.concat(["المسجّل", "المراجعة", "ملاحظة المشرف"]);
      var data = rows.filter(function (r) { return r.type === t; }).map(function (r) {
        var row = [r.date].concat(fs.map(function (x) { var v = r.v[x.k]; if (x.t === "t") return fmtTime(v); return x.t === "n" ? num(v) : (v == null ? "" : v); }));
        if (t === "temp") row = row.concat([grpAvg(r.v, "air"), grpAvg(r.v, "rh")]); if (t === "light") row.push(Math.round(grpAvg(r.v, "lux") || 0)); if (t === "note") row.push(r.open ? "مفتوحة" : "تم الحل");
        return row.concat([nameOf(r.by), r.review ? (r.review.s === "ok" ? "معتمد" : "عليه ملاحظة") : "بانتظار", r.review && r.review.c || ""]);
      });
      add(T.label, [head].concat(data));
    });
    add("وصفات المحلول المركز", [["التاريخ", "الخزان", "حجم المحلول المركز (لتر)", "نسبة الحقن", "EC المستهدف", "السماد", "الكمية", "الوحدة", "ملاحظات", "المشرف"]].concat(S.recipes.reduce(function (acc, r) { return acc.concat((r.items || [{}]).map(function (it) { return [r.date, r.tank, num(r.volL), r.ratio || "", num(r.ecT), it.name || "", num(it.qty), it.unit || "", r.notes || "", nameOf(r.by)]; })); }, [])));
    var C = consumption(rows);
    add("استهلاك الأسمدة", [["البند", "الكمية", "الوحدة"]].concat(Object.keys(C.per).map(function (k) { var n = k.split("|"); return [n[0], +C.per[k].toFixed(1), n[1]]; })).concat([[], ["محلول A", C.mlA, "مل"], ["محلول B", C.mlB, "مل"], ["خافض pH", C.down, "مل"], ["رافع pH", C.up, "مل"]]));
    XLSX.writeFile(wb, "GREEN-SIDE-" + S.rep.start + "-" + todayStr() + ".xlsx");
    toast("تم تنزيل الملف");
  } catch (e) { console.warn(e); toast("تعذّر إنشاء الملف"); }
  btn.disabled = false;
}

/* ---------- supervisor ---------- */
function loadStock() {
  var out = {}, minDate = null;
  ["A", "B"].forEach(function (tk) { var rc = recipeFor(tk, todayStr()); out[tk] = rc ? { rc: rc, used: 0 } : null; if (rc && (!minDate || rc.date < minDate)) minDate = rc.date; });
  if (!minDate) { S.stock = out; render(); return; }
  S.db.collection("entries").where("date", ">=", minDate).get().then(function (q) {
    q.forEach(function (d) { var r = d.data(); if (r.type !== "mix") return; ["A", "B"].forEach(function (tk) { var o = out[tk]; if (o && (r.ts || 0) >= (o.rc.ts || 0)) o.used += num(r.v["ml" + tk]) || 0; }); });
    ["A", "B"].forEach(function (tk) { if (out[tk]) out[tk].left = num(out[tk].rc.volL) * 1000 - out[tk].used; });
    S.stock = out; render();
  }).catch(function () { S.stock = out; render(); });
}
function supView() {
  var s = S.settings, isOwner = S.ownerUid === S.uid;
  var h = '<section class="sec"><div class="sec-h"><h2>خزانات المحلول المركز</h2><button class="btn sm pri" data-act="newRecipe">+ وصفة جديدة</button></div><div class="grid2">';
  ["A", "B"].forEach(function (tk) {
    var st = S.stock && S.stock[tk];
    if (!st || st.left == null) h += '<div class="stat"><span class="lab">خزان ' + tk + '</span><span class="val">—</span><span class="sub">' + (st ? "جارٍ الحساب…" : "لا توجد وصفة مسجلة") + "</span></div>";
    else { var pct = Math.max(0, st.left / (num(st.rc.volL) * 1000) * 100);
      h += '<div class="stat ' + (pct < 15 ? "s-warn" : "") + '"><span class="lab">خزان ' + tk + ' · المتبقي التقديري</span><span class="val num">' + f(Math.max(0, st.left) / 1000, 2) + " <small>لتر من " + f(num(st.rc.volL), 1) + '</small></span><div class="bar" style="margin:4px 0"><i style="width:' + pct + '%"></i></div><span class="sub">حُضّر في ' + esc(st.rc.date) + " · استُهلك " + f(st.used) + " مل</span></div>"; }
  });
  h += '</div></section><section class="sec"><h2>سجل الوصفات</h2>';
  h += S.recipes.length ? '<div class="list">' + S.recipes.slice(0, 30).map(function (r) {
    return '<article class="entry"><div class="e-head"><span class="e-ic"><b class="num">' + esc(r.tank) + '</b></span><div class="e-t"><b>محلول ' + esc(r.tank) + " · " + f(num(r.volL), 1) + ' لتر</b><span class="num">' + esc(r.date) + " · " + esc(nameOf(r.by)) + '</span></div><button class="btn sm ghost" data-act="editRecipe" data-id="' + r.id + '">تعديل</button></div>' +
      '<div class="tbl-wrap"><table><thead><tr><th>السماد / العنصر</th><th>الكمية</th></tr></thead><tbody>' + (r.items || []).map(function (it) { return "<tr><td>" + esc(it.name) + '</td><td class="num">' + f(num(it.qty), 2) + " " + esc(it.unit || "") + "</td></tr>"; }).join("") + "</tbody></table></div>" +
      (r.ratio || r.ecT || r.notes ? '<dl class="kv">' + (r.ratio ? "<dt>نسبة الحقن</dt><dd>" + esc(r.ratio) + "</dd>" : "") + (r.ecT ? '<dt>EC المستهدف</dt><dd class="num">' + esc(r.ecT) + "</dd>" : "") + (r.notes ? "<dt>ملاحظات</dt><dd>" + esc(r.notes) + "</dd>" : "") + "</dl>" : "") + "</article>";
  }).join("") + "</div>" : '<div class="empty">سجّل وصفة تحضير محلول A ومحلول B لحساب استهلاك الأسمدة والمتبقي في كل خزان.<button class="btn pri" data-act="newRecipe">إضافة أول وصفة</button></div>';
  h += "</section>";
  // users
  var ids = Object.keys(S.users).sort(function (a, b) { return (S.users[a].createdAt || 0) - (S.users[b].createdAt || 0); });
  h += '<section class="sec"><div class="sec-h"><h2>المستخدمون والصلاحيات</h2>' + (isOwner ? '<button class="btn sm pri" data-act="newUser">+ مستخدم جديد</button>' : "") + '</div><div class="card">';
  ids.forEach(function (id) {
    var u = S.users[id], r = id === S.ownerUid ? "owner" : u.role;
    var pill = r === "owner" ? '<span class="pill ok">المالك · مشرف</span>' : r === "sup" ? '<span class="pill ok">مشرف</span>' : r === "worker" ? '<span class="pill n">عامل</span>' : '<span class="pill bad">موقوف</span>';
    h += '<div class="user-row"><span class="av">' + initials(id) + '</span><span class="nm">' + esc(u.name) + (id === S.uid ? ' <span class="muted">(أنت)</span>' : "") + "<small>" + esc(showLogin(u.login)) + "</small></span>" + pill;
    if (isOwner && r !== "owner") h += '<span>' + (r !== "worker" ? '<button class="btn sm" data-act="setRole" data-id="' + id + '" data-r="worker">عامل</button> ' : "") + (r !== "sup" ? '<button class="btn sm" data-act="setRole" data-id="' + id + '" data-r="sup">مشرف</button> ' : "") + (r !== "disabled" ? '<button class="btn sm danger" data-act="setRole" data-id="' + id + '" data-r="disabled">إيقاف</button>' : "") + "</span>";
    h += "</div>";
  });
  if (!isOwner) h += '<p class="muted" style="font-size:12.5px">إضافة المستخدمين وتغيير صلاحياتهم متاحة لمالك التطبيق فقط.</p>';
  h += "</div></section>";
  // settings
  var sf = [["ecMin", "الأملاح الحد الأدنى", "µS/cm"], ["ecMax", "الأملاح الحد الأعلى", "µS/cm"], ["ecTarget", "الأملاح المستهدفة للخلط", "µS/cm"], ["ecPerMl", "معامل الحاسبة (µS لكل 1 مل/لتر)", "µS/cm"], ["abRatio", "نسبة B إلى A", "×"], ["tankL", "سعة خزان الري", "لتر"],
    ["phMin", "pH الأدنى", "pH"], ["phMax", "pH الأعلى", "pH"], ["wtMin", "حرارة الماء الدنيا", "°C"], ["wtMax", "حرارة الماء العليا", "°C"], ["airMin", "حرارة الجو الدنيا", "°C"], ["airMax", "حرارة الجو العليا", "°C"],
    ["rhMin", "الرطوبة الدنيا", "%"], ["rhMax", "الرطوبة العليا", "%"], ["luxMin", "الضوء الأدنى", "lux"], ["luxMax", "الضوء الأعلى", "lux"], ["pumpL", "سعة مضخة الري", "لتر"],
    ["nMix", "مرات الخلط يومياً", ""], ["nEcph", "قراءات الأملاح وpH يومياً", ""], ["nTemp", "قراءات الحرارة يومياً", ""], ["nLight", "قراءات الضوء يومياً", ""], ["nIrr", "مرات الري يومياً", ""]];
  h += '<section class="sec"><h2>الحدود المستهدفة والإعدادات</h2><form class="card fgrid" id="setForm" novalidate>' + sf.map(function (x) { return '<label class="f" for="s_' + x[0] + '">' + x[1] + '<div class="unitwrap"><input class="in num" inputmode="decimal" id="s_' + x[0] + '" value="' + esc(s[x[0]]) + '"><span class="u">' + x[2] + "</span></div></label>"; }).join("") +
    '<div class="full"><button class="btn pri block" type="button" data-act="saveSettings">حفظ الإعدادات</button></div></form>' +
    '<p class="muted" style="font-size:12.5px;margin:0">معامل الحاسبة: كم ترتفع الأملاح عند إضافة 1 مل من A (مع B) لكل لتر ماء. بعد 3 عمليات خلط مسجلة تحسبه الحاسبة تلقائياً من سجلاتكم.</p></section>';
  return h;
}
function openRecipe(r) {
  var items = r ? (r.items || []) : [{ name: "", qty: "", unit: "غ" }];
  $("sheetRoot").innerHTML = '<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-h"><h2>' + (r ? "تعديل وصفة" : "وصفة تحضير محلول مركز") + '</h2><button class="iconbtn" type="button" data-act="close" aria-label="إغلاق">✕</button></div>' +
    '<form class="fgrid" id="recForm" novalidate>' +
    '<label class="f" for="r_date">تاريخ التحضير<input class="in num" type="date" id="r_date" value="' + esc(r ? r.date : todayStr()) + '"></label>' +
    '<label class="f" for="r_tank">الخزان<select class="in" id="r_tank"><option' + (r && r.tank === "A" ? " selected" : "") + ">A</option><option" + (r && r.tank === "B" ? " selected" : "") + ">B</option></select></label>" +
    '<label class="f" for="r_vol">حجم المحلول المركز <span class="req">*</span><div class="unitwrap"><input class="in num" inputmode="decimal" id="r_vol" value="' + esc(r ? r.volL : "") + '"><span class="u">لتر</span></div></label>' +
    '<label class="f" for="r_ratio">نسبة الحقن<input class="in" id="r_ratio" placeholder="مثال 1:100" value="' + esc(r ? r.ratio : "") + '"></label>' +
    '<label class="f full" for="r_ec">EC المستهدف لمحلول الري<div class="unitwrap"><input class="in num" inputmode="decimal" id="r_ec" value="' + esc(r ? r.ecT : "") + '"><span class="u">µS/cm</span></div></label>' +
    '<div class="full"><h3 style="margin-bottom:8px">الأسمدة والعناصر</h3><datalist id="ferts">' + FERTS.map(function (x) { return '<option value="' + x + '">'; }).join("") + '</datalist><div id="riList">' + items.map(riRow).join("") + '</div><button class="btn sm" type="button" data-act="addRi">+ إضافة سماد</button></div>' +
    '<label class="f full" for="r_notes">ملاحظات (التركيز بالعناصر ppm، المورد، رقم التشغيلة…)<textarea class="in" id="r_notes">' + esc(r ? r.notes : "") + "</textarea></label>" +
    '</form><div class="sheet-actions">' + (r ? '<button class="btn danger" type="button" data-act="delRecipe" data-id="' + r.id + '">حذف</button>' : "") + '<button class="btn pri" type="button" data-act="saveRecipe" data-id="' + (r ? r.id : "") + '">حفظ الوصفة</button></div></div></div>';
}
function riRow(it) { return '<div class="ri"><input class="in" list="ferts" aria-label="اسم السماد" placeholder="اسم السماد" data-ri="name" value="' + esc(it.name) + '"><input class="in num" inputmode="decimal" aria-label="الكمية" placeholder="الكمية" data-ri="qty" value="' + esc(it.qty) + '"><select class="in" aria-label="الوحدة" data-ri="unit">' + ["غ", "كغ", "مل", "لتر"].map(function (u) { return "<option" + (it.unit === u ? " selected" : "") + ">" + u + "</option>"; }).join("") + '</select><button class="iconbtn" type="button" data-act="rmRi" aria-label="حذف السطر">✕</button></div>'; }
function openNewUser() {
  $("sheetRoot").innerHTML = '<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-h"><h2>مستخدم جديد</h2><button class="iconbtn" type="button" data-act="close" aria-label="إغلاق">✕</button></div>' +
    '<form class="fgrid" id="userForm" novalidate>' +
    '<label class="f full" for="u_name">الاسم<input class="in" id="u_name"></label>' +
    '<label class="f full" for="u_id">اسم المستخدم (بالإنجليزي) أو البريد<input class="in" id="u_id" dir="ltr" autocapitalize="off" placeholder="worker1"></label>' +
    '<label class="f full" for="u_pw">كلمة المرور (6 أحرف أو أكثر)<input class="in" id="u_pw" dir="ltr" autocapitalize="off"></label>' +
    '<div class="f full"><span>الصلاحية</span><div class="seg" id="u_role" role="group"><button type="button" data-r="worker" aria-pressed="true">عامل</button><button type="button" data-r="sup" aria-pressed="false">مشرف</button></div></div>' +
    '<div class="err full" id="u_err"></div></form><div class="sheet-actions"><button class="btn pri" type="button" data-act="createUser">إنشاء الحساب</button></div></div></div>';
}
function createUser(btn) {
  var name = $("u_name").value.trim(), id = $("u_id").value.trim(), pw = $("u_pw").value, role = $("u_role").querySelector('[aria-pressed="true"]').getAttribute("data-r"), er = $("u_err");
  if (!name || !id || pw.length < 6) { er.textContent = "أكمل الاسم واسم المستخدم وكلمة مرور من 6 أحرف أو أكثر."; return; }
  btn.disabled = true; er.textContent = "";
  var email = toEmail(id), sec = firebase.apps.filter(function (a) { return a.name === "secondary"; })[0] || firebase.initializeApp(window.GS_CONFIG.firebase, "secondary");
  sec.auth().createUserWithEmailAndPassword(email, pw).then(function (cred) {
    var uid = cred.user.uid;
    return sec.auth().signOut().then(function () { return S.db.collection("users").doc(uid).set({ name: name, login: email, role: role, createdAt: Date.now() }); });
  }).then(function () {
    $("sheetRoot").innerHTML = '<div class="sheet-bg" data-close><div class="sheet"><div class="sheet-h"><h2>تم إنشاء الحساب</h2><button class="iconbtn" type="button" data-act="close" aria-label="إغلاق">✕</button></div>' +
      '<p>أرسل هذه البيانات إلى ' + esc(name) + ':</p><div class="card"><dl class="kv"><dt>الرابط</dt><dd class="num">' + esc(location.origin + location.pathname) + '</dd><dt>اسم المستخدم</dt><dd class="num">' + esc(showLogin(email)) + '</dd><dt>كلمة المرور</dt><dd class="num">' + esc(pw) + "</dd></dl></div>" +
      '<div class="sheet-actions"><button class="btn pri" type="button" data-act="close">تم</button></div></div></div>';
  }).catch(function (e) { er.textContent = errMsg(e); btn.disabled = false; });
}
function openAccount() {
  var canInstall = !!S.installEvt;
  $("sheetRoot").innerHTML = '<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-h"><h2>حسابي</h2><button class="iconbtn" type="button" data-act="close" aria-label="إغلاق">✕</button></div>' +
    '<div class="card"><dl class="kv"><dt>الاسم</dt><dd>' + esc(nameOf(S.uid)) + '</dd><dt>الدخول</dt><dd class="num">' + esc(showLogin(S.user.email)) + "</dd><dt>الصلاحية</dt><dd>" + (isSup() ? "مشرف" : "عامل") + "</dd></dl></div>" +
    '<form class="fgrid" id="pwForm" style="margin-top:14px" novalidate><label class="f full" for="p_new">تغيير كلمة المرور<input class="in" id="p_new" type="password" dir="ltr" autocomplete="new-password" placeholder="كلمة المرور الجديدة"></label><button class="btn full" type="button" data-act="changePw">حفظ كلمة المرور</button></form>' +
    (canInstall ? '<button class="btn pri block" style="margin-top:14px" type="button" data-act="install">تثبيت التطبيق على الجوال</button>' : '<p class="muted" style="font-size:13px;margin-top:14px">لتثبيت التطبيق: من قائمة المتصفح (⋮) اختر "إضافة إلى الشاشة الرئيسية" أو "تثبيت التطبيق".</p>') +
    '<div class="sheet-actions"><button class="btn danger" type="button" data-act="logout">تسجيل الخروج</button></div><p class="muted" style="font-size:12px;text-align:center">GREEN SIDE · الإصدار ' + APP_VERSION + "</p></div></div>";
}

/* ---------- actions ---------- */
var delArm = null;
function armDelete(b, id) { if (delArm === id) { delArm = null; return true; } delArm = id; b.textContent = "اضغط مرة أخرى للحذف"; setTimeout(function () { delArm = null; if (b.isConnected) b.textContent = "حذف"; }, 3000); return false; }
document.addEventListener("click", function (ev) {
  var tp = ev.target.closest(".tp [data-ap]");
  if (tp) { var w = tp.closest(".tp"); w.setAttribute("data-ap", tp.getAttribute("data-ap")); w.querySelectorAll("[data-ap]").forEach(function (x) { if (x !== w) x.setAttribute("aria-pressed", x === tp); }); updForm(); return; }
  var ur = ev.target.closest("#u_role [data-r]");
  if (ur) { ur.parentNode.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === ur); }); return; }
  var bg = ev.target.closest("[data-close]"); if (bg && ev.target === bg) { closeSheet(); return; }
  var b = ev.target.closest("[data-act]"); if (!b) return;
  var a = b.getAttribute("data-act"), id = b.getAttribute("data-id"), db = S.db;
  var fail = function (err) { console.warn(err); b.disabled = false; toast(errMsg(err)); };
  switch (a) {
    case "authMode": AUTH_MODE = b.getAttribute("data-m"); renderAuth(); break;
    case "logout": closeSheet(); memberSubs = false; S.auth.signOut(); break;
    case "account": openAccount(); break;
    case "install": if (S.installEvt) { S.installEvt.prompt(); S.installEvt = null; closeSheet(); } break;
    case "changePw": var np = $("p_new").value; if (np.length < 6) { toast("كلمة المرور 6 أحرف أو أكثر"); return; } b.disabled = true; S.user.updatePassword(np).then(function () { toast("تم تغيير كلمة المرور"); closeSheet(); }).catch(fail); break;
    case "close": closeSheet(); break;
    case "goTab": S.tab = b.getAttribute("data-t"); render(true); break;
    case "gotoday": S.date = todayStr(); $("datePick").value = S.date; subDay(); render(true); break;
    case "calc": openCalc(); break;
    case "calcToMix": var res = CALC.res; closeSheet(); openForm("mix", null, res ? { water: res.water, ecRaw: res.ecRaw, mlA: res.mlA, mlB: res.mlB } : null); break;
    case "new": openForm(b.getAttribute("data-type")); break;
    case "edit": var e1 = findEntry(id); if (e1) openForm(e1.type, e1); break;
    case "save": saveForm(b); break;
    case "del": if (!armDelete(b, id)) return; db.collection("entries").doc(id).delete().catch(fail); closeSheet(); toast("تم الحذف"); break;
    case "approve": db.collection("entries").doc(id).update({ review: { s: "ok", by: S.uid, at: Date.now(), c: "" } }).catch(fail); break;
    case "flag": openFlag(id); break;
    case "saveFlag": var c = $("flagTxt").value.trim(); if (!c) { toast("اكتب الملاحظة"); return; } db.collection("entries").doc(id).update({ review: { s: "flag", by: S.uid, at: Date.now(), c: c } }).catch(fail); closeSheet(); toast("حُفظت ملاحظة المشرف"); break;
    case "toggleNote": var e2 = findEntry(id); db.collection("entries").doc(id).update({ open: !e2.open }).catch(fail); break;
    case "signoff":
      b.disabled = true; var batch = db.batch();
      S.entries.filter(function (x) { return !x.review; }).forEach(function (x) { batch.update(db.collection("entries").doc(x.id), { review: { s: "ok", by: S.uid, at: Date.now(), c: "" } }); });
      batch.set(db.collection("signoffs").doc(S.date), { by: S.uid, at: Date.now() });
      batch.commit().then(function () { toast("تم اعتماد اليوم"); }).catch(fail); break;
    case "repDays": S.repDays = +b.getAttribute("data-n"); loadReport(); break;
    case "refreshRep": loadReport(); break;
    case "export": exportXlsx(b); break;
    case "newRecipe": openRecipe(null); break;
    case "editRecipe": openRecipe(S.recipes.filter(function (r) { return r.id === id; })[0]); break;
    case "addRi": $("riList").insertAdjacentHTML("beforeend", riRow({ name: "", qty: "", unit: "غ" })); break;
    case "rmRi": b.closest(".ri").remove(); break;
    case "saveRecipe":
      var vol = num($("r_vol").value); if (!vol) { toast("اكتب حجم المحلول المركز"); return; }
      var items = Array.prototype.map.call(document.querySelectorAll("#riList .ri"), function (r) { return { name: r.querySelector('[data-ri="name"]').value.trim(), qty: num(r.querySelector('[data-ri="qty"]').value), unit: r.querySelector('[data-ri="unit"]').value }; }).filter(function (x) { return x.name; });
      if (!items.length) { toast("أضف سماداً واحداً على الأقل"); return; }
      var d = { date: $("r_date").value || todayStr(), tank: $("r_tank").value, volL: vol, ratio: $("r_ratio").value.trim(), ecT: num($("r_ec").value), items: items, notes: $("r_notes").value.trim() };
      if (id) { var old = S.recipes.filter(function (r) { return r.id === id; })[0]; db.collection("recipes").doc(id).set(Object.assign(d, { ts: old.ts || Date.now(), by: old.by || S.uid, editedBy: S.uid })).catch(fail); }
      else db.collection("recipes").add(Object.assign(d, { ts: Date.now(), by: S.uid })).catch(fail);
      closeSheet(); toast("حُفظت الوصفة"); break;
    case "delRecipe": if (!armDelete(b, id)) return; db.collection("recipes").doc(id).delete().catch(fail); closeSheet(); break;
    case "newUser": openNewUser(); break;
    case "createUser": createUser(b); break;
    case "setRole": db.collection("users").doc(id).update({ role: b.getAttribute("data-r") }).then(function () { toast("تم تحديث الصلاحية"); }).catch(fail); break;
    case "saveSettings":
      var o = {}; document.querySelectorAll("#setForm [id^=s_]").forEach(function (el) { var n = num(el.value); if (n != null) o[el.id.slice(2)] = n; });
      db.collection("config").doc("settings").set(Object.assign({}, S.settings, o)).then(function () { toast("حُفظت الإعدادات"); }).catch(fail); break;
  }
});
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && $("sheetRoot").innerHTML) closeSheet(); });
if ("serviceWorker" in navigator) window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
boot();
