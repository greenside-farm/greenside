/* GREEN SIDE — صفحة الحساسات (الإصدار 2.5.1)
   العامل: حالة الأجواء الآن، القراءات الحالية مع المقارنة بأمس في نفس الوقت، ملخص الليلة الماضية، والرسم لليوم أو آخر 7 أيام. المشرف: إضافةً لذلك تحليل البيئة (VPD، ساعات الحدود، الإجهاد الحراري،
   خطر الأمراض، النهار والليل، DLI)، أداء التبريد بين الخلايا والمراوح، السجل حتى 30 يوماً، جدول القراءات، والتصدير.
   تقرأ قراءات حساسات Tuya من مشروع Firebase منفصل (green-side-sensors) يكتب فيه "جامع" Google Apps Script كل 15 دقيقة.
   قاعدة بيانات التطبيق الأساسية لا تُلمس: الحساسات لها حصتها وقواعدها الخاصة، والتطبيق يقرأ فقط.
   البيانات:
     sensors/{deviceId}        بطاقة الحساس: name, sec ("t,n")، loc, manual (الموقع مثل "t:b n:1"), measures{code:{label,unit}}, last{code:{v,at}}, lastSeen
     sensorDays/{date}_{id}    يوم واحد لحساس واحد: p{code:[{t: ثانية من منتصف الليل (توقيت الرياض), v}]}, s{code:{min,max,sum,n}}
     sensorMeta/status         حالة الجامع: lastRun, ok, error
   القيم في هذا الملف ليست سرية (مثل config.js)؛ الحماية في قواعد مشروع الحساسات: القراءة لأي مسجّل، والكتابة للجامع وحده. */
var SENS = (function () {
  "use strict";
  var CFG = {
    apiKey: "AIzaSyAa_UWcautOYN2_sYGIHfzdTrMbKeqA1H8",
    authDomain: "green-side-sensors.firebaseapp.com",
    projectId: "green-side-sensors",
    storageBucket: "green-side-sensors.firebasestorage.app",
    messagingSenderId: "808348037215",
    appId: "1:808348037215:web:9d8485d8211e1a945e6bea"
  };
  var TZ_MS = 3 * 3600 * 1000; // توقيت الرياض ثابت (+03:00) بلا توقيت صيفي
  /* أنواع القياس: c = مفتاح حدود التطبيق في CHECK (حرارة الجو، الرطوبة، الضوء) */
  var KINDS = {
    temp: { l: "الحرارة", u: "°C", d: 1, c: "air" },
    hum: { l: "رطوبة الهواء", u: "%", d: 0, c: "rh" },
    dew: { l: "نقطة الندى", u: "°C", d: 1 }, // محسوبة من الحرارة والرطوبة لنفس الحساس
    vpd: { l: "VPD", u: "kPa", d: 2 }, // عجز ضغط البخار: محسوب من الحرارة والرطوبة، وحدوده vpdMin–vpdMax
    soil: { l: "رطوبة التربة", u: "%", d: 0 },
    lux: { l: "الإضاءة", u: "lux", d: 0, c: "lux" },
    co2: { l: "CO₂", u: "ppm", d: 0 },
    batt: { l: "البطارية", u: "%", d: 0 }
  };
  var ORDER = ["temp", "hum", "vpd", "dew", "soil", "lux", "co2"];
  var CODE_KIND = {
    va_temperature: "temp", temp_current: "temp", temp_value: "temp", temp_indoor: "temp",
    va_humidity: "hum", humidity_value: "hum", humidity_indoor: "hum",
    humidity: "soil", soil_moisture: "soil",
    bright_value: "lux", illuminance_value: "lux",
    co2_value: "co2",
    va_battery: "batt", battery_percentage: "batt", battery: "batt"
  };
  var PAL = ["#2E7A55", "#D9480F", "#1C7ED6", "#AE3EC9", "#B07B00", "#0C8599", "#D6336C", "#5C940D", "#7048E8", "#868E96"];
  var STALE_H = 3;
  /* حدود الحساسات (تُعدَّل من زر "إعدادات الحساسات" وتُحفظ في config/settings.sens). القيم المبدئية للخس الورقي (لولو بيوندا). */
  var SDEF = {
    vpdMin: 0.5, vpdMax: 1.2, heat: 27, rhRisk: 90, dewGap: 2, condGap: 1, gradMax: 4, dliMin: 12, dliMax: 17, luxPpfd: 0.0185,
    msgHot: "الحرارة مرتفعة", msgCold: "الحرارة منخفضة", msgHumid: "الرطوبة مرتفعة: خطر أمراض فطرية", msgDry: "الجو جاف",
    msgOff: "حساس لا يرسل قراءات أو بطاريته ضعيفة: بلّغ المشرف"
  };
  function sc(k) { var o = (window.S && S.settings && S.settings.sens) || {}; var v = o[k]; return v != null && v !== "" ? v : SDEF[k]; }
  function scn(k) { var v = sc(k); return typeof num === "function" ? num(v) : +v; }
  function isSupU() { return typeof isSup === "function" && isSup(); }
  /* تصحيح المعايرة لكل حساس (من صفحة صحة الحساسات): يُضاف لقراءة الحرارة والرطوبة قبل أي عرض أو حساب */
  function offs() { return (window.S && S.settings && S.settings.sens && S.settings.sens.off) || {}; }
  function offOf(s, k) { if (k !== "temp" && k !== "hum") return 0; var x = s && offs()[s.id], v = x ? +x[k] : 0; return isFinite(v) ? v : 0; }
  function corr(s, k, v) { var o = offOf(s, k); if (!o || v == null) return v; v = +v + o; if (k === "hum") v = Math.max(0, Math.min(100, v)); return Math.round(v * 100) / 100; }
  function statOf(s, c, q) { var o = offOf(s, kindOf(c)); return !o ? q : { min: corr(s, kindOf(c), q.min), max: corr(s, kindOf(c), q.max), sum: (q.sum || 0) + o * q.n, n: q.n }; }
  function P() { return isSupU() ? X.period : (X.period > 1 ? 7 : 1); } // العامل: اليوم أو آخر 7 أيام، والمشرف حتى 30 يوماً
  var POS = { t: ["b", "m", "e"], n: ["1", "2", "3"] };

  var X = {
    started: false, app: null, auth: null, db: null, user: null, err: "",
    sensors: {}, status: null, days: null, all: null, key: "", loading: "",
    period: 1, kind: lsG("gs_sens_kind") || "temp", off: {}
  };
  try { X.off = JSON.parse(lsG("gs_sens_off") || "{}") || {}; } catch (e) { X.off = {}; }
  var p0 = +lsG("gs_sens_period"); if (p0 === 7 || p0 === 30) X.period = p0;

  function lsG(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsS(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function E(v) { return typeof esc === "function" ? esc(v) : String(v == null ? "" : v); }
  function F(n, d) { return typeof f === "function" ? f(n, d) : (n == null ? "—" : Number(n).toFixed(d || 0)); }
  function ms(x) { if (!x) return null; if (typeof x.toMillis === "function") return x.toMillis(); if (typeof x === "number") return x; var t = Date.parse(x); return isNaN(t) ? null : t; }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function riy(ts) { return new Date(ts + TZ_MS); } // استخدم دوال UTC على الناتج
  function hm(ts) { var d = riy(ts); return p2(d.getUTCHours()) + ":" + p2(d.getUTCMinutes()); }
  function dkey(ts) { var d = riy(ts); return d.getUTCFullYear() + "-" + p2(d.getUTCMonth() + 1) + "-" + p2(d.getUTCDate()); }
  function dayStart(ds) { return Date.parse(ds + "T00:00:00+03:00"); }
  function tLabel(ts) { return typeof fmtTime === "function" ? fmtTime(hm(ts)) : hm(ts); }
  function ago(ts) {
    if (!ts) return "—"; var m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return "الآن"; if (m < 60) return "منذ " + m + " دقيقة";
    var h = Math.round(m / 60); if (h < 48) return "منذ " + h + " ساعة"; return "منذ " + Math.round(h / 24) + " يوم";
  }
  function rr() { if (window.S && (S.tab === "sens" || (S.tab === "today" && S.date === dkey(Date.now()))) && typeof render === "function") render(); }

  /* ================= الاتصال ================= */
  function start() {
    if (X.started) return; X.started = true;
    try {
      X.app = firebase.initializeApp(CFG, "sensors");
      X.auth = X.app.auth(); X.db = X.app.firestore();
    } catch (e) { X.err = "تعذّر تشغيل اتصال الحساسات."; console.warn(e); return; }
    X.auth.onAuthStateChanged(function (u) {
      if (!u) {
        X.auth.signInAnonymously().catch(function (e) {
          console.warn(e);
          X.err = e && e.code === "auth/operation-not-allowed" ? "الدخول المجهول (Anonymous) غير مفعّل في مشروع الحساسات." :
            e && e.code === "auth/network-request-failed" ? "لا يوجد اتصال بالإنترنت." : "تعذّر الاتصال بقاعدة الحساسات.";
          rr();
        });
        return;
      }
      if (X.user) return;
      X.user = u; X.err = ""; subscribe(); rr();
    });
  }
  function subscribe() {
    X.db.collection("sensors").onSnapshot(function (q) {
      var m = {}; q.forEach(function (d) { m[d.id] = Object.assign({ id: d.id }, d.data()); }); X.sensors = m; rr();
    }, onErr);
    X.db.collection("sensorMeta").doc("status").onSnapshot(function (s) {
      var old = X.status && ms(X.status.lastRun); X.status = s.exists ? s.data() : null;
      var nw = X.status && ms(X.status.lastRun);
      if (old && nw && nw !== old && X.days && rangeOf().to >= dkey(old)) refreshToday(); // وصلت قراءات جديدة: نقرأ اليوم الحالي فقط بدل الفترة كلها
      rr();
    }, onErr);
  }
  function onErr(e) { console.warn(e); X.err = e && e.code === "permission-denied" ? "لا توجد صلاحية قراءة في مشروع الحساسات (راجع قواعد الحماية)." : "تعذّر قراءة بيانات الحساسات."; rr(); }

  function rangeOf() {
    var to = (window.S && S.date) || dkey(Date.now());
    return { from: typeof addDays === "function" ? addDays(to, -(P() - 1)) : to, to: to };
  }
  function loadDays(force) {
    if (!X.user) return;
    var R = rangeOf(), key = R.from + "|" + R.to;
    if (!force && (X.key === key || X.loading === key)) return;
    X.loading = key;
    // يوم إضافي قبل الفترة لملخص الليلة الماضية والمقارنة مع أمس؛ X.days تبقى للفترة نفسها فقط
    var from0 = typeof addDays === "function" ? addDays(R.from, -1) : R.from;
    X.db.collection("sensorDays").where("date", ">=", from0).where("date", "<=", R.to).get().then(function (q) {
      if (X.loading !== key) return;
      X.all = q.docs.map(function (d) { return d.data(); }); X.from0 = from0;
      X.days = X.all.filter(function (d) { return d.date >= R.from; }); X.key = key; X.loading = ""; rr();
    }).catch(function (e) { if (X.loading === key) X.loading = ""; onErr(e); });
  }

  /* كل تشغيل للجامع (كل 15 دقيقة) يحدّث وثائق اليوم فقط، فلا داعي لإعادة قراءة 7 أو 30 يوماً */
  function refreshToday() {
    var td = dkey(Date.now()), R = rangeOf(), key = X.key;
    if (!X.user || !X.all || !key || td > R.to) return;
    X.db.collection("sensorDays").where("date", "==", td).get().then(function (q) {
      if (X.key !== key || !X.all) return; // تغيّرت الفترة أثناء القراءة
      X.all = X.all.filter(function (d) { return d.date !== td; }).concat(q.docs.map(function (d) { return d.data(); }));
      X.days = X.all.filter(function (d) { return d.date >= R.from; }); rr();
    }).catch(onErr);
  }

  /* ================= أدوات البيانات ================= */
  function kindOf(code) { return CODE_KIND[code] || code; }
  function kindInfo(k, s) {
    if (KINDS[k]) return KINDS[k];
    var m = s && s.measures && s.measures[k];
    return { l: (m && m.label) || k, u: (m && m.unit) || "", d: 1 };
  }
  /* القسم: نص مثل "t" أو "t,n" (الحساس يخدم القسمين). الفارغ يظهر في كل الأقسام حتى يُحدَّد */
  function secs(sec) { return String(sec || "").split(/[\s,،+]+/).filter(Boolean); }
  function secOk(sec) { var a = secs(sec); return !a.length || a.indexOf("g") >= 0 || a.indexOf(S.sec) >= 0; }
  /* الموقع في شبكة Green Side: "t:b n:1" = الأبراج البداية، والمشتل البداية. ويُقبل الشكل القديم r2 للمشتل */
  function posMap(s) {
    var m = {}, raw = String((s && s.manual) || "").toLowerCase();
    raw.replace(/([tn])\s*[:=]\s*([a-z0-9]+)/g, function (_, k, v) { m[k] = v; return ""; });
    if (!m.n && /^[rl][123]$/.test(raw.trim())) m.n = raw.trim();
    return m;
  }
  function posOf(s, sec) { return posMap(s)[sec || S.sec] || ""; }
  function posRank(s) { var p = posOf(s); if (!p) return 9; var a = POS[S.sec] || []; var i = a.indexOf(p.slice(-1)); if (i < 0) i = a.indexOf(p); return i < 0 ? 8 : i; }
  function posLabel(s) {
    var p = posOf(s); if (!p) return "";
    var Z = typeof ZONES !== "undefined" ? ZONES : ["البداية", "الوسط", "النهاية"];
    if (S.sec === "t") { var i = POS.t.indexOf(p.charAt(0)); return i < 0 ? p : Z[i] + (i === 0 ? " (جهة الخلايا)" : i === 2 ? " (جهة المراوح)" : ""); }
    var j = POS.n.indexOf(p.slice(-1)), side = /^[rl]/.test(p) ? (p.charAt(0) === "r" ? "اليمين · " : "اليسار · ") : "";
    return j < 0 ? p : side + Z[j];
  }
  /* الاسم الظاهر: الاسم الذي كتبته في ورقة Devices، وإلا موقع الحساس (البداية/الوسط/النهاية)، وإلا اسمه في Tuya */
  function nm(s) { if (!s) return "حساس"; if (s.name && s.name !== s.tuyaName) return s.name; var pl = posLabel(s); return pl ? pl.replace(/ \(.*\)$/, "") : (s.name || s.tuyaName || "حساس"); }
  function sensorList() {
    return Object.keys(X.sensors).map(function (id) { return X.sensors[id]; })
      .filter(function (s) { return s.enabled !== false && secOk(s.sec); })
      .sort(function (a, b) { return (secs(a.sec).length ? 0 : 1) - (secs(b.sec).length ? 0 : 1) || posRank(a) - posRank(b) || String(a.name || "").localeCompare(String(b.name || ""), "ar"); });
  }
  function colorOf(s) {
    var ids = Object.keys(X.sensors).sort(); var i = ids.indexOf(s.id);
    return PAL[(i < 0 ? 0 : i) % PAL.length];
  }
  function codesFor(s, k) {
    if (k === "dew" || k === "vpd") return codesFor(s, "temp").length && codesFor(s, "hum").length ? ["__" + k] : [];
    return Object.keys((s && s.measures) || {}).filter(function (c) { return kindOf(c) === k; });
  }
  function kindsAvail(list) {
    var seen = {};
    list.forEach(function (s) { Object.keys(s.measures || {}).forEach(function (c) { seen[kindOf(c)] = 1; }); if (codesFor(s, "dew").length) { seen.dew = 1; seen.vpd = 1; } });
    var ks = ORDER.filter(function (k) { return seen[k]; });
    Object.keys(seen).forEach(function (k) { if (ks.indexOf(k) < 0 && k !== "batt") ks.push(k); });
    if (seen.batt) ks.push("batt");
    return ks;
  }
  /* حالة القيمة حسب الحدود، مع حدود منفصلة للنهار والليل في الحرارة والرطوبة. ts = وقت القراءة (الافتراضي: الآن) */
  function stOf(k, v, ts) {
    if (v == null) return null;
    if (k === "vpd") return v < scn("vpdMin") ? "lo" : v > scn("vpdMax") ? "hi" : "ok";
    var c = KINDS[k] && KINDS[k].c; if (!c || typeof chk !== "function") return null;
    return chk(c, v, S.sec, ts == null ? Date.now() : ts);
  }
  function limAt(k, ts) {
    if (k === "vpd") return [scn("vpdMin"), scn("vpdMax")];
    var c = KINDS[k] && KINDS[k].c; if (!c || typeof lim !== "function") return [null, null];
    return lim(c, S.sec, ts);
  }
  function DH() { return typeof dayHours === "function" ? dayHours() : [6, 18]; }
  /* شرائط النطاق المسموح: للحرارة والرطوبة شريط للنهار وآخر لليل */
  function bandRects(k, t0, t1, X_, Y, ymin, ymax, top, bot, left, right) {
    var out = "", d = DH(), segs = [];
    for (var day = dkey(t0); dayStart(day) < t1; day = addDays(day, 1)) {
      var s0 = dayStart(day);
      [[0, d[0], "00:00"], [d[0], d[1], "12:00"], [d[1], 24, "23:00"]].forEach(function (x) { var a = Math.max(t0, s0 + x[0] * 3600e3), b = Math.min(t1, s0 + x[1] * 3600e3); if (b > a) segs.push([a, b, s0 + (x[0] + x[1]) / 2 * 3600e3]); });
    }
    segs.forEach(function (sg) {
      var L = limAt(k, sg[2]); if (L[0] == null || L[1] == null) return;
      var y1 = Math.max(top, Y(Math.min(L[1], ymax))), y2 = Math.min(bot, Y(Math.max(L[0], ymin))), x1 = Math.max(left, X_(sg[0])), x2 = Math.min(right, X_(sg[1]));
      if (y2 > y1 && x2 > x1) out += '<rect x="' + x1.toFixed(1) + '" width="' + (x2 - x1).toFixed(1) + '" y="' + y1.toFixed(1) + '" height="' + (y2 - y1).toFixed(1) + '" fill="var(--band)"/>';
    });
    return out;
  }
  function limSpan(k) { var a = limAt(k, dayStart(dkey(Date.now())) + 12 * 3600e3), b = limAt(k, dayStart(dkey(Date.now())) + 2 * 3600e3); var lo = [a[0], b[0]].filter(function (x) { return x != null; }), hi = [a[1], b[1]].filter(function (x) { return x != null; }); return [lo.length ? Math.min.apply(null, lo) : null, hi.length ? Math.max.apply(null, hi) : null]; }
  function bad(st) { return st === "lo" || st === "hi"; }
  /* يوم الحساس صالح للقسم الحالي: نعتمد موقع الحساس في ذلك اليوم إن حُفظ، وإلا موقعه الحالي */
  function dayDocs(s) {
    return (X.days || []).filter(function (d) { return d.deviceId === s.id && secOk(d.sec != null && d.sec !== "" ? d.sec : s.sec); });
  }
  function seriesFor(s, k) {
    if (k === "dew" || k === "vpd") { var dp = []; dayDocs(s).forEach(function (d) { var t0 = dayStart(d.date); ptsOf(d, s, k).forEach(function (p) { dp.push({ t: t0 + p.t * 1000, y: p.v, T: p.T, H: p.H }); }); }); return dp.sort(function (a, b) { return a.t - b.t; }); }
    var codes = codesFor(s, k), pts = [];
    dayDocs(s).forEach(function (d) {
      var t0 = dayStart(d.date);
      codes.forEach(function (c) { ((d.p || {})[c] || []).forEach(function (p) { if (p && p.v != null && isFinite(p.v)) pts.push({ t: t0 + p.t * 1000, y: corr(s, k, +p.v) }); }); });
    });
    pts.sort(function (a, b) { return a.t - b.t; });
    return pts;
  }
  /* القراءات اليدوية لنفس الموقع (يوم واحد): أبراج b = متوسط air_b1..b3، مشتل 1 = متوسط air_r1 و air_l1، و r2 = air_r2 */
  function manualKeys(s, k) {
    var p = posOf(s), pre = k === "temp" ? "air_" : "rh_"; if (!p) return [];
    if (S.sec === "t") return POS.t.indexOf(p.charAt(0)) < 0 ? [] : (p.length > 1 ? [pre + p] : ["1", "2", "3"].map(function (l) { return pre + p.charAt(0) + l; }));
    return /^[rl][123]$/.test(p) ? [pre + p] : POS.n.indexOf(p) < 0 ? [] : [pre + "r" + p, pre + "l" + p];
  }
  function manualFor(s, k) {
    if (P() !== 1 || (k !== "temp" && k !== "hum") || !window.S || !S.entries) return [];
    var keys = manualKeys(s, k); if (!keys.length) return [];
    return S.entries.filter(function (e) { return e.type === "temp" && e.v && (e.sec || "n") === S.sec; })
      .map(function (e) { var vals = keys.map(function (q) { return typeof num === "function" ? num(e.v[q]) : +e.v[q]; }).filter(function (x) { return x != null && isFinite(x); });
        return { t: Date.parse(e.date + "T" + (e.time || "12:00") + ":00+03:00"), y: vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : null }; })
      .filter(function (p) { return p.y != null && isFinite(p.y); });
  }

  /* ================= تحليل البيئة ================= */
  function vpdOf(T, RH) { return 0.6108 * Math.exp(17.27 * T / (T + 237.3)) * (1 - RH / 100); } // kPa
  function dewOf(T, RH) { var a = 17.27, b = 237.7, g = a * T / (b + T) + Math.log(Math.max(1, RH) / 100); return b * g / (a - g); }
  var STEP = 300, HOLD = 3600; // نأخذ عينة كل 5 دقائق، وتبقى آخر قراءة صالحة حتى ساعة
  function ptsOf(doc, s, k) {
    if (k === "dew" || k === "vpd") {
      if (!codesFor(s, k).length) return [];
      var H = sampler(ptsOf(doc, s, "hum")), fn = k === "dew" ? dewOf : vpdOf;
      return ptsOf(doc, s, "temp").map(function (p) { var h = H(p.t); return h == null ? null : { t: p.t, v: +fn(p.v, h).toFixed(3), T: p.v, H: h }; }).filter(Boolean);
    }
    var out = []; codesFor(s, k).forEach(function (c) { ((doc.p || {})[c] || []).forEach(function (p) { if (p && p.v != null && isFinite(p.v)) out.push({ t: +p.t, v: corr(s, k, +p.v) }); }); });
    return out.sort(function (a, b) { return a.t - b.t; });
  }
  function samplerP(pts) { // مثل sampler لكنه يعيد القراءة نفسها (القيمة ووقتها)
    var i = 0; return function (t) { if (!pts.length) return null; while (i + 1 < pts.length && pts[i + 1].t <= t) i++; var q = pts[i]; return q.t > t || t - q.t > HOLD ? null : q; };
  }
  function sampler(pts) {
    var i = 0; return function (t) { if (!pts.length) return null; while (i + 1 < pts.length && pts[i + 1].t <= t) i++; var q = pts[i]; return q.t > t || t - q.t > HOLD ? null : q.v; };
  }
  function dayEnd(date) { return typeof todayStr === "function" && date === todayStr() ? Math.max(0, Math.min(86400, Math.floor((Date.now() - dayStart(date)) / 1000))) : 86400; }
  function dayMetrics(doc, s) {
    var T = sampler(ptsOf(doc, s, "temp")), H = sampler(ptsOf(doc, s, "hum")), Lx = sampler(ptsOf(doc, s, "lux"));
    var dh = DH(), tD = limAt("temp", "12:00"), tN = limAt("temp", "00:00"), hD = limAt("hum", "12:00"), hN = limAt("hum", "00:00");
    var vmin = scn("vpdMin"), vmax = scn("vpdMax"), heat = scn("heat"), risk = scn("rhRisk"), gap = scn("dewGap"), k = scn("luxPpfd"), h = STEP / 3600;
    var m = { cov: 0, inT: 0, heat: 0, hCov: 0, inH: 0, vCov: 0, inV: 0, risk: 0, dS: 0, dN: 0, dMax: null, nS: 0, nN: 0, nMin: null, vS: 0, vN: 0, lCov: 0, dli: 0, hasLux: codesFor(s, "lux").length > 0 };
    for (var t = 0, end = dayEnd(doc.date); t < end; t += STEP) {
      var tv = T(t), hv = H(t), lv = Lx(t), day = t >= dh[0] * 3600 && t < dh[1] * 3600, lo = day ? tD[0] : tN[0], hi = day ? tD[1] : tN[1], rlo = day ? hD[0] : hN[0], rhi = day ? hD[1] : hN[1];
      if (tv != null) {
        m.cov += h; if (tv >= lo && tv <= hi) m.inT += h; if (tv > heat) m.heat += h;
        if (day) { m.dS += tv; m.dN++; m.dMax = m.dMax == null ? tv : Math.max(m.dMax, tv); } else { m.nS += tv; m.nN++; m.nMin = m.nMin == null ? tv : Math.min(m.nMin, tv); }
      }
      if (hv != null) { m.hCov += h; if (hv >= rlo && hv <= rhi) m.inH += h; }
      if (tv != null && hv != null) {
        var v = vpdOf(tv, hv); m.vCov += h; if (v >= vmin && v <= vmax) m.inV += h; if (day) { m.vS += v; m.vN++; }
        if (hv >= risk || tv - dewOf(tv, hv) <= gap) m.risk += h;
      } else if (hv != null && hv >= risk) m.risk += h;
      if (lv != null) { m.lCov += h; m.dli += lv * k * STEP / 1e6; }
    }
    m.tDay = m.dN ? m.dS / m.dN : null; m.tNight = m.nN ? m.nS / m.nN : null; m.vDay = m.vN ? m.vS / m.vN : null;
    return m;
  }
  function metricsFor(s) { // متوسط يومي على الفترة (أو اليوم نفسه)
    var ds = dayDocs(s).map(function (d) { return dayMetrics(d, s); }).filter(function (m) { return m.cov > 0 || m.hCov > 0 || m.lCov > 0; });
    if (!ds.length) return null;
    var avgOf = function (k) { var a = ds.map(function (m) { return m[k]; }).filter(function (x) { return x != null; }); return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; };
    var r = { n: ds.length, hasLux: ds[0].hasLux };
    ["cov", "inT", "heat", "hCov", "inH", "vCov", "inV", "risk", "tDay", "tNight", "vDay", "lCov", "dli"].forEach(function (k) { r[k] = avgOf(k); });
    r.dMax = Math.max.apply(null, ds.map(function (m) { return m.dMax == null ? -1e9 : m.dMax; })); if (r.dMax < -1e8) r.dMax = null;
    r.nMin = Math.min.apply(null, ds.map(function (m) { return m.nMin == null ? 1e9 : m.nMin; })); if (r.nMin > 1e8) r.nMin = null;
    return r;
  }

  /* ================= مؤشرات النمو (للمشرف): آخر 24 ساعة مقارنة بأمس ومتوسط 7 أيام =================
     متوسط البيت كل 5 دقائق: الحرارة وVPD متوسط الحساسات، وساعات التكثّف والإجهاد الحراري إن حدثت في أي موقع.
     الأيام قبل أمس نهائية، فتُحفظ نتيجتها على الجهاز ولا تُقرأ من القاعدة مرة ثانية. */
  function mean(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
  function myDocs(s, docs) { return (docs || []).filter(function (d) { return d.deviceId === s.id && secOk(d.sec != null && d.sec !== "" ? d.sec : s.sec); }); }
  function absPts(s, k, docs) {
    var out = []; docs.forEach(function (d) { var b = dayStart(d.date) / 1000; ptsOf(d, s, k).forEach(function (p) { out.push({ t: b + p.t, v: p.v }); }); });
    return out.sort(function (a, b) { return a.t - b.t; });
  }
  function houseKPI(list, docs, w0, w1) {
    var ss = list.map(function (s) { var my = myDocs(s, docs); return { T: samplerP(absPts(s, "temp", my)), H: samplerP(absPts(s, "hum", my)), L: codesFor(s, "lux").length ? sampler(absPts(s, "lux", my)) : null }; });
    var dh = DH(), h = STEP / 3600, heat = scn("heat"), cg = scn("condGap"), vmin = scn("vpdMin"), vmax = scn("vpdMax"), kL = scn("luxPpfd");
    var m = { cov: 0, n: 0, sum: 0, dS: 0, dN: 0, nS: 0, nN: 0, vCov: 0, vIn: 0, cond: 0, heat: 0, lux: ss.some(function (x) { return x.L; }), lCov: 0, dli: 0 };
    for (var t = Math.ceil(w0 / 1000 / STEP) * STEP, e = Math.floor(w1 / 1000); t < e; t += STEP) {
      var ts = [], vs = [], c = false, hot = false, lx = [];
      ss.forEach(function (x) {
        var a = x.T(t), b = x.H(t);
        if (a) { ts.push(a.v); if (a.v > heat) hot = true; }
        if (a && b && Math.abs(a.t - b.t) <= 1800) { vs.push(vpdOf(a.v, b.v)); if (a.v - dewOf(a.v, b.v) <= cg) c = true; }
        if (x.L) { var l = x.L(t); if (l != null) lx.push(l); }
      });
      var hr = ((t + 10800) % 86400) / 3600, day = hr >= dh[0] && hr < dh[1];
      if (lx.length) { m.lCov += h; m.dli += mean(lx) * kL * STEP / 1e6; }
      if (!ts.length) continue;
      var tm = mean(ts); m.cov += h; m.sum += tm; m.n++;
      if (day) { m.dS += tm; m.dN++; } else { m.nS += tm; m.nN++; }
      if (hot) m.heat += h;
      if (vs.length) { if (c) m.cond += h; if (day) { m.vCov += h; var vm = mean(vs); if (vm >= vmin && vm <= vmax) m.vIn += h; } }
    }
    if (!m.n) return null;
    var r = function (x, d) { return x == null ? null : Math.round(x * d) / d; };
    var tD = m.dN ? m.dS / m.dN : null, tN = m.nN ? m.nS / m.nN : null;
    return { cov: r(m.cov, 100), tMean: r(m.sum / m.n, 100), tDay: r(tD, 100), tNight: r(tN, 100), dif: tD != null && tN != null ? r(tD - tN, 100) : null,
      vCov: r(m.vCov, 100), vIn: r(m.vIn, 100), cond: r(m.cond, 100), heat: r(m.heat, 100), lux: m.lux, lCov: r(m.lCov, 100), dli: m.lux ? r(m.dli, 100) : null };
  }
  var KH = { docs: [], have: {}, loading: false, fail: 0 };
  function kpiSig(list) {
    var o = offs();
    return ["k1", S.sec, DH().join("-"), scn("heat"), scn("condGap"), scn("vpdMin"), scn("vpdMax"), scn("luxPpfd"),
      list.map(function (s) { var x = o[s.id]; return s.id + (x ? ":" + (+x.temp || 0) + "/" + (+x.hum || 0) : ""); }).sort().join(",")].join("|");
  }
  function kcGet() { try { return JSON.parse(lsG("gs_kpi") || "{}") || {}; } catch (e) { return {}; } }
  function kcPut(o) { var ks = Object.keys(o); if (ks.length > 150) ks.sort(function (a, b) { return o[a].at - o[b].at; }).slice(0, ks.length - 150).forEach(function (k) { delete o[k]; }); lsS("gs_kpi", JSON.stringify(o)); }
  /* مؤشرات يوم تقويمي كامل. undefined = لم تُقرأ بياناته بعد، null = لا بيانات */
  function kpiDay(list, date, C) {
    var ck = C.sig + "|" + date; if (C.c[ck]) return C.c[ck].m;
    var prev = addDays(date, -1), by = {};
    (X.all || []).concat(KH.docs).forEach(function (d) { if (d.date === date || d.date === prev) by[d.date + "|" + d.deviceId] = d; });
    var docs = Object.keys(by).map(function (k) { return by[k]; });
    var inAll = X.from0 && X.key && X.from0 <= date && date <= X.key.split("|")[1];
    if (!KH.have[date] && !inAll) return undefined;
    var m = houseKPI(list, docs, dayStart(date), dayStart(date) + 864e5);
    if (date < addDays(dkey(Date.now()), -1)) { C.c[ck] = { at: Date.now(), m: m }; C.dirty = true; }
    return m;
  }
  function kpiFetch(dates) {
    if (KH.loading || !X.user || !dates.length || Date.now() - KH.fail < 60000) return;
    var a = dates[0], b = dates[dates.length - 1]; KH.loading = true;
    X.db.collection("sensorDays").where("date", ">=", a).where("date", "<=", b).get().then(function (q) {
      var by = {}; KH.docs.concat(q.docs.map(function (d) { return d.data(); })).forEach(function (d) { by[d.date + "|" + d.deviceId] = d; });
      KH.docs = Object.keys(by).map(function (k) { return by[k]; });
      for (var d = a; d <= b; d = addDays(d, 1)) KH.have[d] = 1;
      KH.loading = false; rr();
    }).catch(function (e) { KH.loading = false; KH.fail = Date.now(); console.warn(e); });
  }
  function kpiHTML(list, R) {
    if (!isSupU() || typeof addDays !== "function" || !X.all) return "";
    var ss = list.filter(function (s) { return codesFor(s, "temp").length; }); if (!ss.length) return "";
    var today = dkey(Date.now()), live = R.to >= today, w1 = live ? Date.now() : dayStart(R.to) + 864e5;
    var cur = houseKPI(ss, X.all, w1 - 864e5, w1); if (!cur) return "";
    var C = { sig: kpiSig(ss), c: kcGet(), dirty: false }, base = live ? today : R.to, y = kpiDay(ss, addDays(base, -1), C), wk = [], miss = [];
    for (var i = 1; i <= 7; i++) { var d = addDays(base, -i), m = kpiDay(ss, d, C); if (m === undefined) miss.push(d); else if (m && m.cov >= 12) wk.push(m); }
    if (C.dirty) kcPut(C.c);
    kpiFetch(miss.sort());
    var avgOf = function (k) { var a = wk.map(function (m) { return m[k]; }).filter(function (x) { return x != null; }); return a.length ? mean(a) : null; };
    var L = function (x) { return '<bdi dir="ltr" class="num">' + x + "</bdi>"; };
    var deg = function (x) { return L(F(x, 1) + "°"); }, hr = function (x) { return '<span class="num">' + F(x, 1) + "</span> س"; }, sgn = function (x) { return L((x > 0 ? "+" : "") + F(x, 1) + "°"); };
    var cmp = function (k, fm) { var a = y ? y[k] : null, b = avgOf(k), o = []; if (a != null) o.push("أمس " + fm(a)); if (b != null && wk.length > 1) o.push("متوسط " + (wk.length === 2 ? "يومين" : wk.length + " أيام") + " " + fm(b)); return o.length ? o.join(" · ") : miss.length && KH.loading ? "جارٍ تحميل المقارنة…" : ""; };
    /* الوحدة الرمزية (° %) تُلصق بالرقم من اليسار، والوحدة العربية (س) تأتي بعده بالترتيب العربي */
    var tile = function (tone, lab, val, unit, note, cm) { var sym = unit === "°" || unit === "%"; return '<div class="gk ' + tone + '"><span class="gk-l">' + lab + '</span><b class="gk-v num"><bdi dir="ltr">' + val + (unit && sym ? "<small>" + unit + "</small>" : "") + "</bdi>" + (unit && !sym ? "<small>" + unit + "</small>" : "") + "</b>" + (note ? '<span class="gk-n">' + note + "</span>" : "") + (cm ? '<span class="gk-c">' + cm + "</span>" : "") + "</div>"; };
    var aMin = typeof cfg === "function" ? num(cfg("avgMin")) : null, aMax = typeof cfg === "function" ? num(cfg("avgMax")) : null, tm = cur.tMean;
    var tT = aMin == null || aMax == null ? "" : tm < aMin - 1 || tm > aMax + 1 ? "bad" : tm < aMin || tm > aMax ? "warn" : "ok";
    var vp = cur.vCov ? cur.vIn / cur.vCov : null, tV = vp == null ? "" : vp >= 0.7 ? "ok" : vp >= 0.4 ? "warn" : "bad";
    var t = [
      tile(tT, "متوسط الحرارة", F(tm, 1), "°", aMin != null ? 'المستهدف <bdi dir="ltr" class="num">' + F(aMin) + "–" + F(aMax) + "°</bdi>" : "", cmp("tMean", deg)),
      tile("", "DIF <small>النهار − الليل</small>", cur.dif == null ? "—" : (cur.dif > 0 ? "+" : "") + F(cur.dif, 1), cur.dif == null ? "" : "°", cur.dif == null ? "" : 'نهار <bdi dir="ltr" class="num">' + F(cur.tDay, 1) + '°</bdi> · ليل <bdi dir="ltr" class="num">' + F(cur.tNight, 1) + "°</bdi>", cmp("dif", sgn)),
      tile(tV, "VPD المثالي <small>نهاراً</small>", cur.vCov ? F(cur.vIn, 1) : "—", cur.vCov ? " س" : "", cur.vCov ? 'من <span class="num">' + F(cur.vCov, 1) + "</span> س · " + '<span class="num">' + F(vp * 100) + "%</span>" : "يحتاج حرارة ورطوبة", cmp("vIn", hr)),
      tile(cur.cond >= 2 ? "bad" : cur.cond > 0 ? "warn" : "ok", "تكثّف محتمل", F(cur.cond, 1), " س", 'هامش الندى ≤ <bdi dir="ltr" class="num">' + F(scn("condGap"), 1) + "°</bdi>", cmp("cond", hr)),
      tile(cur.heat >= 3 ? "bad" : cur.heat > 0.4 ? "warn" : "ok", "إجهاد حراري", F(cur.heat, 1), " س", 'فوق <bdi dir="ltr" class="num">' + F(scn("heat")) + "°</bdi> في أي موقع", cmp("heat", hr)),
      cur.lux && cur.lCov >= 1 ? tile(cur.dli < scn("dliMin") * 0.75 ? "bad" : cur.dli < scn("dliMin") || cur.dli > scn("dliMax") ? "warn" : "ok", "DLI <small>الضوء اليومي</small>", F(cur.dli, 1), " mol", 'المستهدف <bdi dir="ltr" class="num">' + F(scn("dliMin")) + "–" + F(scn("dliMax")) + "</bdi>", cmp("dli", function (x) { return F(x, 1); }))
        : '<div class="gk na"><span class="gk-l">DLI <small>الضوء اليومي</small></span><b class="gk-v">—</b><span class="gk-n">يحتاج حساس ضوء داخل البيت</span></div>'
    ];
    return '<section class="sec"><div class="sec-h"><h2>مؤشرات النمو</h2><span class="muted" style="font-size:12.5px">' + (live ? "آخر 24 ساعة" : E(typeof fmtShort === "function" ? fmtShort(R.to) : R.to)) + "</span></div>" +
      (cur.cov < 20 ? '<p class="help sn-warn" style="margin:0 0 6px">البيانات تغطي <span class="num">' + F(cur.cov, 1) + "</span> ساعة فقط من 24، فالأرقام تقريبية.</p>" : "") +
      '<div class="gks">' + t.join("") + "</div>" +
      (typeof fold === "function" ? fold("gkHelp", "ماذا تعني هذه المؤشرات؟", '<ul class="gk-help"><li><b>متوسط الحرارة على 24 ساعة</b> هو ما يحدد سرعة نمو الخس وطول الدورة: أعلى من المستهدف = نمو أسرع لكن أوراق أخف وخطر الحرقان والتزهير، وأقل منه = دورة أطول.</li><li><b>DIF</b> = متوسط النهار ناقص متوسط الليل. الموجب الكبير يزيد استطالة الشتلات، والصغير أو السالب يعطي نباتاً مندمجاً.</li><li><b>VPD المثالي</b>: ساعات النهار التي كان فيها النتح جيداً (يصل الكالسيوم للأوراق).</li><li><b>التكثّف والإجهاد الحراري</b> تُحسب إذا حدثت في أي موقع في البيت، لأن أسوأ نقطة هي التي تمرض أو تحترق.</li><li>المقارنة مع أمس ومتوسط الأيام السابقة الكاملة تبيّن هل الأجواء تتحسن أو تسوء.</li></ul>') : "") + "</section>";
  }

  /* ================= الصفحة: تبويبات الآن · الرسم البياني · التحليل ================= */
  function view() {
    start();
    var list = sensorList(), sup = isSupU();
    var tabs = sup ? [["now", "الآن"], ["chart", "الرسم"], ["an", "التحليل"], ["dev", "الأجهزة"]] : [["now", "الآن"], ["chart", "الرسم البياني"]];
    var h = '<section class="sec"><div class="sec-h"><h2>الحساسات · ' + (SECS[S.sec] ? SECS[S.sec].icon + " " + SECS[S.sec].name : "") + '</h2><button class="btn sm" type="button" data-sact="refresh">تحديث</button></div>' + statusHTML();
    if (X.err && !X.user) return h + "</section>";
    if (!X.user) return h + '</section><div class="empty">جارٍ الاتصال بالحساسات…</div>';
    if (!Object.keys(X.sensors).length) return h + '</section><div class="empty">لم تصل بيانات حساسات بعد.</div>';
    if (!list.length) return h + '</section><div class="empty">لا توجد حساسات في ' + SECS[S.sec].name + '. حدّد قسم كل حساس من ورقة Devices في جدول Tuya Sensors.</div>';
    h += subTabs("sens", tabs) + "</section>";
    var tab = subGet("sens", tabs);
    loadDays(false);
    var R = rangeOf(), ready = X.days && X.key === R.from + "|" + R.to, wait = '<div class="card"><div class="empty" style="border:0">جارٍ تحميل القراءات…</div></div>';

    if (tab === "now") {
      var al = alertsHTML(list);
      h += (al ? '<section class="sec">' + al + "</section>" : "") + mapHTML(list) + (ready ? kpiHTML(list, R) + nightHTML(list, R.to) : "");
      return h + '<section class="sec"><h2>تفاصيل الحساسات</h2><div class="sncards">' + list.map(cardHTML).join("") + "</div></section>";
    }
    if (tab === "dev") return h + (ready ? healthHTML(list) : wait);

    var kinds = kindsAvail(list); if (kinds.indexOf(X.kind) < 0) X.kind = kinds[0];
    var isToday = typeof todayStr === "function" && R.to === todayStr(), dayLab = isToday ? "اليوم" : (typeof fmtShort === "function" ? fmtShort(R.to) : R.to);
    var periods = sup ? [[1, dayLab], [7, "7 أيام"], [30, "30 يوم"]] : [[1, dayLab], [7, "7 أيام"]];
    var segP = '<div class="seg" role="group" aria-label="الفترة">' + periods.map(function (p) { return '<button type="button" data-sact="period" data-n="' + p[0] + '" aria-pressed="' + (P() === p[0]) + '">' + E(p[1]) + "</button>"; }).join("") + "</div>";
    var segK = '<div class="seg wrap" role="group" aria-label="القياس">' + kinds.map(function (k) { return '<button type="button" data-sact="kind" data-k="' + E(k) + '" aria-pressed="' + (X.kind === k) + '">' + E({ hum: "الرطوبة", soil: "رطوبة التربة" }[k] || kindInfo(k, list[0]).l) + "</button>"; }).join("") + "</div>";
    var withK = list.filter(function (s) { return codesFor(s, X.kind).length; }), shown = withK.filter(function (s) { return !X.off[s.id]; });
    var ki = kindInfo(X.kind, withK[0]);

    if (tab === "chart") {
      h += '<section class="sec">' + segP + segK;
      if (withK.length > 1) h += '<div class="sn-pick">' + withK.map(function (s) { var on = !X.off[s.id]; return '<button type="button" class="sn-chip" data-sact="toggle" data-id="' + E(s.id) + '" aria-pressed="' + on + '"><i style="background:' + colorOf(s) + '"></i><bdi>' + E(nm(s)) + "</bdi></button>"; }).join("") + "</div>";
      if (!ready) return h + wait + "</section>";
      h += '<div class="card chart sn-chart" id="snChart"></div><p class="help muted sn-hint">المس الرسم أو حرّك إصبعك عليه لترى الوقت والقيمة.' + (X.kind === "vpd" ? " المنطقة المظللة هي المدى المثالي (" + F(scn("vpdMin"), 1) + "–" + F(scn("vpdMax"), 1) + " kPa). أقل منه: جو رطب يضعف النتح ووصول الكالسيوم. أعلى منه: جو جاف يُجهد النبات. انخفاضه في الليل طبيعي." : "") + (X.kind === "dew" ? " نقطة الندى هي الحرارة التي يتكثّف عندها الماء على الأوراق: كلما اقتربت من حرارة الجو زاد خطر الأمراض الفطرية." : "") + (X.kind === "dew" || X.kind === "vpd" ? " في النافذة بجانب كل قيمة: الحرارة والرطوبة اللتان حُسبت منهما." : "") + (P() === 1 && (X.kind === "temp" || X.kind === "hum") && withK.some(function (s) { return manualKeys(s, X.kind).length; }) ? " المربعات = القراءات اليدوية لنفس الموقع." : "") + "</p>";
      if (sup && P() === 1) h += rawHTML(shown, ki, R.to);
      return h + "</section>";
    }

    /* التحليل (للمشرف) */
    h += '<section class="sec">' + segP + segK + "</section>";
    if (!ready) return h + wait;
    h += analysisHTML(list, R) + coolingHTML(list, R) + profileHTML(shown, ki) + summaryHTML(withK, ki, R);
    h += '<section class="sec"><button class="btn block" type="button" data-sact="export">تنزيل قراءات الفترة (Excel)</button><button class="btn block" type="button" data-sact="set">إعدادات الحساسات وحدود التحليل</button></section>';
    h += '<p class="muted sn-foot">لتغيير اسم الحساس أو قسمه أو موقعه: ورقة <b>Devices</b> في جدول Tuya Sensors. يظهر التغيير مع القراءة التالية.</p>';
    return h;
  }

  /* ================= خريطة البيت (للجميع): كل حساس في مكانه، ولونه حسب حالته الآن ================= */
  function nodeSt(s) {
    var seen = ms(s.lastSeen); if (!seen || Date.now() - seen > STALE_H * 3600e3) return "off";
    var t = lastOfKind(s, "temp"), h = lastOfKind(s, "hum");
    if (bad(stOf("temp", t)) || bad(stOf("hum", h))) return "bad";
    if (t != null && h != null && (bad(stOf("vpd", vpdOf(t, h))) || t - dewOf(t, h) <= scn("dewGap"))) return "warn";
    return "ok";
  }
  function mapNode(s) {
    var st = nodeSt(s), t = lastOfKind(s, "temp"), h = lastOfKind(s, "hum");
    var v = st === "off" ? '<span class="hm-v hm-off">متوقف</span>' :
      '<span class="hm-v">' + (t != null ? '<b class="num"><bdi dir="ltr">' + F(t, 1) + "°</bdi></b>" : "") + (h != null ? '<span class="num"><bdi dir="ltr">' + F(h) + "%</bdi></span>" : "") + "</span>" +
      (t != null && h != null ? '<small class="num">VPD <bdi dir="ltr">' + vpdOf(t, h).toFixed(2) + "</bdi></small>" : "");
    return '<button type="button" class="hm-n ' + st + '" data-act="jump" data-to="snc_' + E(s.id) + '"><span class="hm-nm"><i style="background:' + colorOf(s) + '"></i><bdi>' + E(nm(s)) + "</bdi></span>" + v + "</button>";
  }
  function mapHTML(list) {
    var ss = list.filter(function (s) { return codesFor(s, "temp").length || codesFor(s, "hum").length; }); if (!ss.length) return "";
    var Z = typeof ZONES !== "undefined" ? ZONES : ["البداية", "الوسط", "النهاية"], t = S.sec === "t", loose = [];
    var lanes = t ? { a: [[], [], []] } : { r: [[], [], []], c: [[], [], []], l: [[], [], []] };
    ss.forEach(function (s) {
      var p = posOf(s), i = t ? POS.t.indexOf(p.charAt(0)) : POS.n.indexOf(p.slice(-1));
      if (!p || i < 0) { loose.push(s); return; }
      (t ? lanes.a : /^[rl]/.test(p) ? lanes[p.charAt(0)] : lanes.c)[i].push(s);
    });
    var zone = function (arr) { return '<div class="hm-z">' + (arr.length ? arr.map(mapNode).join("") : '<span class="hm-none">لا حساس</span>') + "</div>"; };
    var head = '<div class="hm-row hm-head">' + (t ? "" : "<span></span>") + Z.map(function (z, i) { return "<span>" + E(z) + (t && i === 0 ? "<small>جهة الخلايا</small>" : t && i === 2 ? "<small>جهة المراوح</small>" : "") + "</span>"; }).join("") + "</div>";
    var body = t ? '<div class="hm-row">' + lanes.a.map(zone).join("") + "</div>" :
      [["r", "يمين"], ["c", "الممر"], ["l", "يسار"]].filter(function (x) { return x[0] !== "c" || lanes.c.some(function (a) { return a.length; }); })
        .map(function (x) { return '<div class="hm-row"><span class="hm-ll">' + x[1] + "</span>" + lanes[x[0]].map(zone).join("") + "</div>"; }).join("");
    // فرق الحرارة من أول البيت إلى آخره (التبريد)
    var avgT = function (arr) { var a = arr.filter(function (s) { return nodeSt(s) !== "off"; }).map(function (s) { return lastOfKind(s, "temp"); }).filter(function (v) { return v != null; }); return a.length ? mean(a) : null; };
    var first = t ? lanes.a[0] : lanes.r[0].concat(lanes.c[0], lanes.l[0]), last = t ? lanes.a[2] : lanes.r[2].concat(lanes.c[2], lanes.l[2]);
    var a0 = avgT(first), z0 = avgT(last), gd = a0 != null && z0 != null ? z0 - a0 : null, gm = scn("gradMax");
    var foot = (gd != null ? '<span class="' + (gd > gm ? "sn-warn" : "") + '">فرق الحرارة من البداية إلى النهاية <b class="num"><bdi dir="ltr">' + (gd > 0 ? "+" : "") + F(gd, 1) + "°</bdi></b>" + (gd > gm ? " · أعلى من " + F(gm, 1) + "°: افحص التبريد" : "") + "</span>" : "") +
      (isSupU() ? '<span class="hm-out">خارج البيت: لا يوجد حساس بعد</span>' : "");
    return '<section class="sec"><div class="sec-h"><h2>خريطة ' + (t ? "البيت" : "المشتل") + '</h2><span class="muted" style="font-size:12.5px">اضغط الحساس لتفاصيله</span></div>' +
      '<div class="hmap ' + (t ? "t" : "n") + '">' + head + '<div class="hm-house">' + body + "</div>" + (t ? '<div class="hm-air"><span>الخلايا</span><i></i><span>المراوح</span></div>' : "") + "</div>" +
      (loose.length ? '<div class="hm-loose"><span class="muted">بدون موقع:</span>' + loose.map(mapNode).join("") + "</div>" : "") +
      (foot ? '<p class="hm-foot">' + foot + "</p>" : "") + "</section>";
  }

  /* ================= صحة الحساسات وتصحيح المعايرة (للمشرف) ================= */
  var HM = { key: "", rows: null, loading: false };
  function manRows() { // تسجيلات القياس اليدوي لآخر 8 أيام (تُقرأ مرة لكل يوم، أو تؤخذ من التقارير إن غطّتها)
    var to = dkey(Date.now()), from = addDays(to, -7), key = from + "|" + to;
    if (window.S && S.rep && S.rep.all && S.rep.start <= from && S.rep.end >= to) return S.rep.all;
    if (HM.key === key) return HM.rows;
    if (!HM.loading && window.S && S.db) {
      HM.loading = true;
      S.db.collection("entries").where("date", ">=", from).where("date", "<=", to).get().then(function (q) { HM = { key: key, rows: q.docs.map(function (d) { return d.data(); }), loading: false }; rr(); })
        .catch(function (e) { HM = { key: key, rows: [], loading: false }; console.warn(e); });
    }
    return null;
  }
  function dayCov(s, doc) { // تغطية يوم: الساعات التي فيها قراءة صالحة، وأطول انقطاع
    var pts = ptsOf(doc, s, codesFor(s, "temp").length ? "temp" : "hum"), end = dayEnd(doc.date), f = sampler(pts), c = 0, n = 0;
    for (var t = 0; t < end; t += STEP) { n++; if (f(t) != null) c++; }
    var gap = { s: 0, at: 0 }, prev = 0; pts.concat([{ t: end }]).forEach(function (p) { if (p.t - prev > gap.s) gap = { s: p.t - prev, at: prev }; prev = p.t; });
    return { pct: n ? c / n : 0, gap: gap, n: pts.length };
  }
  function healthHTML(list) {
    var today = dkey(Date.now()), rows = manRows(), days = [];
    for (var i = 7; i >= 0; i--) days.push(addDays(today, -i));
    var miss = days.filter(function (d) { return !KH.have[d] && !(X.from0 && X.key && X.from0 <= d && d <= X.key.split("|")[1]); });
    kpiFetch(miss.sort());
    var all = {}; (X.all || []).concat(KH.docs).forEach(function (d) { all[d.date + "|" + d.deviceId] = d; });
    var o = offs(), kpa = typeof KPA === "function" ? KPA() : 'inputmode="decimal"';
    var cards = list.map(function (s) {
      var seen = ms(s.lastSeen), stale = !seen || Date.now() - seen > STALE_H * 3600e3, batt = lastOfKind(s, "batt"), mine = [];
      var cov = days.map(function (d) { var doc = all[d + "|" + s.id]; if (doc && secOk(doc.sec != null && doc.sec !== "" ? doc.sec : s.sec)) mine.push(doc); return doc ? dayCov(s, doc) : null; });
      var td = cov[cov.length - 1], bars = days.map(function (d, i) { var c = cov[i], loaded = KH.have[d] || (X.from0 && X.from0 <= d), p = c ? c.pct : 0;
        return '<i class="' + (!loaded ? "na" : p >= 0.95 ? "ok" : p >= 0.7 ? "warn" : "bad") + '" title="' + E(d) + " · " + (loaded ? F(p * 100) + "%" : "…") + '"></i>'; }).join("");
      var gapTxt = !td ? "لا قراءات اليوم" : td.gap.s > HOLD ? '<span class="sn-warn">' + F(td.gap.s / 3600, 1) + " س من " + tLabel(dayStart(today) + td.gap.at * 1000) + "</span>" : '<span class="sn-good">لا يوجد</span>';
      var ox = o[s.id] || {}, hasTH = codesFor(s, "temp").length || codesFor(s, "hum").length;
      var dT = rows ? manualDiff(s, mine, rows.filter(function (e) { return (e.sec || "n") === S.sec; }), "temp") : null, dH = rows ? manualDiff(s, mine, rows.filter(function (e) { return (e.sec || "n") === S.sec; }), "hum") : null;
      var dTxt = function (d, u, dec, lim) { if (!d) return '<span class="muted">لا توجد قراءات يدوية مطابقة</span>'; var a = d.avg; return (Math.abs(a) < lim ? '<span class="sn-good">متطابق تقريباً</span>' : "الحساس " + (a > 0 ? "أعلى" : "أقل") + ' بـ <b class="num"><bdi dir="ltr">' + F(Math.abs(a), dec) + u + "</bdi></b>") + ' <small class="muted">(' + d.n + " قراءة)</small>"; };
      var sugT = dT && dT.n >= 3 && Math.abs(dT.avg) >= 0.3 ? Math.round(((+ox.temp || 0) - dT.avg) * 10) / 10 : null, sugH = dH && dH.n >= 3 && Math.abs(dH.avg) >= 2 ? Math.round((+ox.hum || 0) - dH.avg) : null;
      var pl = posLabel(s), where = s.loc || pl || "لم يُحدَّد الموقع";
      return '<article class="card snh"><div class="snc-h"><i class="sw" style="background:' + colorOf(s) + '"></i><div class="snc-n"><b dir="auto">' + E(nm(s)) + "</b><span>" + E(where) + '</span></div><div class="snc-meta"><span class="snc-t' + (stale ? " stale" : "") + '"><i></i>' + (seen ? ago(seen) : "لا قراءات") + "</span></div></div>" +
        '<dl class="kv snh-kv"><dt>البطارية</dt><dd>' + (batt == null ? '<span class="muted">لا تُرسل</span>' : '<b class="num ' + (batt < 20 ? "sn-bad" : batt < 40 ? "sn-warn" : "") + '">' + F(batt) + "%</b>" + (batt < 20 ? " · اشحن أو بدّل البطارية" : "")) + "</dd>" +
        "<dt>تغطية اليوم</dt><dd>" + (td ? '<b class="num">' + F(td.pct * 100) + '%</b> <small class="muted">' + td.n + " قراءة</small>" : "—") + "</dd>" +
        "<dt>أطول انقطاع اليوم</dt><dd>" + gapTxt + "</dd>" +
        '<dt>آخر 8 أيام</dt><dd><span class="snh-bars" aria-label="تغطية آخر 8 أيام">' + bars + "</span></dd></dl>" +
        (hasTH ? '<div class="snh-man"><b>مقابل القياس اليدوي</b> <small class="muted">آخر 8 أيام، نفس الموقع والوقت</small>' + (rows ? (codesFor(s, "temp").length ? "<div>الحرارة: " + dTxt(dT, "°", 1, 0.3) + "</div>" : "") + (codesFor(s, "hum").length ? "<div>الرطوبة: " + dTxt(dH, "%", 0, 2) + "</div>" : "") : '<div class="muted">جارٍ التحميل…</div>') + "</div>" : "") +
        (hasTH ? '<div class="snh-cal"><b>تصحيح المعايرة</b><div class="snh-in">' +
          (codesFor(s, "temp").length ? '<label>الحرارة<div class="unitwrap"><input class="in num" ' + kpa + ' id="off_t_' + E(s.id) + '" value="' + E(ox.temp != null ? ox.temp : "") + '" placeholder="0"><span class="u">°C</span></div></label>' : "") +
          (codesFor(s, "hum").length ? '<label>الرطوبة<div class="unitwrap"><input class="in num" ' + kpa + ' id="off_h_' + E(s.id) + '" value="' + E(ox.hum != null ? ox.hum : "") + '" placeholder="0"><span class="u">%</span></div></label>' : "") +
          '</div><div class="snh-act">' + (sugT != null || sugH != null ? '<button type="button" class="btn sm" data-sact="offSug" data-id="' + E(s.id) + '" data-t="' + (sugT != null ? sugT : "") + '" data-h="' + (sugH != null ? sugH : "") + '">اقتراح من اليدوي: ' + [sugT != null ? '<bdi dir="ltr">' + (sugT > 0 ? "+" : "") + F(sugT, 1) + "°</bdi>" : "", sugH != null ? '<bdi dir="ltr">' + (sugH > 0 ? "+" : "") + F(sugH) + "%</bdi>" : ""].filter(Boolean).join(" ") + "</button>" : "") +
          '<button type="button" class="btn sm pri" data-sact="offSave" data-id="' + E(s.id) + '">حفظ التصحيح</button></div>' +
          (ox.at ? '<p class="help" style="margin:4px 0 0">آخر تعديل ' + E(typeof fmtShort === "function" ? fmtShort(ox.at) : ox.at) + "</p>" : "") + "</div>" : "") + "</article>";
    });
    return '<section class="sec"><h2>صحة الحساسات</h2><div class="snh-list">' + cards.join("") + "</div>" +
      '<p class="help sn-hint">التغطية = نسبة الوقت الذي فيه قراءة صالحة (الحساس يرسل عند تغيّر القيمة، فغياب القراءة أقل من ساعة طبيعي). المربعات = آخر 8 أيام: أخضر 95% فأكثر، برتقالي ناقص، أحمر ضعيف.<br>' +
      "<b>التصحيح</b> رقم يُضاف لقراءة الحساس في كل الصفحات والتقارير (مثلاً −0.8 إذا كان الحساس يقرأ أعلى من الحقيقة بـ 0.8°). استخدم الاقتراح فقط إذا كان جهاز القياس اليدوي موثوقاً ومعايَراً، والأفضل وضع الجهازين متجاورين في الظل 15 دقيقة ثم المقارنة.</p></section>";
  }
  function saveOff(b) {
    var id = b.getAttribute("data-id"), gv = function (k) { var el = document.getElementById("off_" + k + "_" + id); return el ? (el.value.trim() === "" ? 0 : num(el.value)) : 0; };
    var t = gv("t"), h = gv("h");
    if (t == null || h == null || Math.abs(t) > 5 || Math.abs(h) > 20) { toast("التصحيح يجب أن يكون بين −5 و +5 للحرارة، وبين −20 و +20 للرطوبة"); return; }
    var off = Object.assign({}, offs()); if (!t && !h) delete off[id]; else off[id] = { temp: t, hum: h, at: dkey(Date.now()), by: S.uid || "" };
    b.disabled = true;
    S.db.collection("config").doc("settings").set(Object.assign({}, S.settings, { sens: Object.assign({}, S.settings.sens || {}, { off: off }) }))
      .then(function () { toast(!t && !h ? "أُلغي التصحيح" : "حُفظ التصحيح، ويُطبّق على كل القراءات"); }).catch(function (e) { b.disabled = false; toast(typeof errMsg === "function" ? errMsg(e) : "تعذّر الحفظ"); });
  }

  /* ================= حالة الأجواء الآن (للجميع) ================= */
  function alertsHTML(list) {
    var now = Date.now(), lo = limAt("temp", now)[0], hi = limAt("temp", now)[1], rlo = limAt("hum", now)[0], rhi = limAt("hum", now)[1], heat = scn("heat"), risk = scn("rhRisk");
    var g = { hot: [], cold: [], humid: [], dry: [], off: [] }, fresh = 0;
    list.forEach(function (s) {
      var seen = ms(s.lastSeen), stale = !seen || Date.now() - seen > STALE_H * 3600e3, sn = nm(s), last = s.last || {}, batt = null;
      Object.keys(last).forEach(function (c) { if (kindOf(c) === "batt" && last[c]) batt = last[c].v; });
      if (stale || (batt != null && batt < 20)) { g.off.push(sn); if (stale) return; }
      fresh++;
      Object.keys(last).forEach(function (c) {
        var k = kindOf(c), v = last[c] && corr(s, k, last[c].v); if (v == null) return;
        if (k === "temp") { if (v > hi || v > heat) g.hot.push(sn + " " + F(v, 1) + "°"); else if (v < lo) g.cold.push(sn + " " + F(v, 1) + "°"); }
        if (k === "hum") { if (v >= risk || v > rhi) g.humid.push(sn + " " + F(v) + "%"); else if (v < rlo) g.dry.push(sn + " " + F(v) + "%"); }
      });
    });
    var out = [["hot", "bad", "msgHot"], ["humid", "warn", "msgHumid"], ["cold", "warn", "msgCold"], ["dry", "warn", "msgDry"], ["off", "warn", "msgOff"]].filter(function (x) { return g[x[0]].length; })
      .map(function (x) { return '<div class="alert ' + x[1] + ' sn-alert"><span class="tx"><b>' + E(sc(x[2])) + '</b><small><bdi>' + g[x[0]].map(E).join("</bdi> · <bdi>") + "</bdi></small></span></div>"; });
    if (!out.length && fresh) return '<div class="banner ok sn-ok"><span>✓ الأجواء ضمن الحدود في كل الحساسات</span></div>';
    return out.length ? '<div class="alerts">' + out.join("") + "</div>" : "";
  }

  /* ================= تحليل البيئة (للمشرف) ================= */
  function hS(h) { h = ((h % 24) + 24) % 24; return (h === 0 ? 12 : h > 12 ? h - 12 : h) + (h < 12 ? "ص" : "م"); }
  function dnLab(c, u) { return typeof dnTxt === "function" ? dnTxt(c, S.sec, u) : ""; }
  function rng(a, b, u, d) { return '<bdi dir="ltr" class="num">' + F(a, d || 0) + "–" + F(b, d || 0) + (u || "") + "</bdi>"; }
  function colHead(s) { return '<th><i class="sn-sw" style="background:' + colorOf(s) + '"></i><bdi>' + E(nm(s)) + "</bdi></th>"; }
  function hrs(x, of) { return x == null ? "—" : '<b class="num">' + F(x, 1) + "</b> س" + (of ? ' <small class="muted num">' + F(of ? x / of * 100 : 0) + "%</small>" : ""); }
  function analysisHTML(list, R) {
    var ss = list.filter(function (s) { return codesFor(s, "temp").length || codesFor(s, "hum").length || codesFor(s, "lux").length; });
    var M = ss.map(metricsFor); if (!M.some(Boolean)) return "";
    var lo = limAt("temp", "00:00")[0], hi = limAt("temp", "12:00")[1], vmin = scn("vpdMin"), vmax = scn("vpdMax"), per = P() > 1;
    var cl = function (bad, warn) { return bad ? "sn-bad" : warn ? "sn-warn" : ""; };
    var rows = [
      ["حرارة النهار <small>" + hS(DH()[0]) + "–" + hS(DH()[1]) + " · متوسط / أعلى</small>", function (m) { return m.tDay == null ? "—" : '<b class="num">' + F(m.tDay, 1) + '</b> / <b class="num ' + cl(m.dMax > hi) + '">' + F(m.dMax, 1) + "</b>°"; }],
      ["حرارة الليل <small>متوسط / أدنى</small>", function (m) { return m.tNight == null ? "—" : '<b class="num">' + F(m.tNight, 1) + '</b> / <b class="num ' + cl(m.nMin < lo) + '">' + F(m.nMin, 1) + "</b>°"; }],
      ["الحرارة ضمن الحد <small>" + dnLab("air", "°") + "</small>", function (m) { return m.cov ? hrs(m.inT, m.cov) : "—"; }],
      ["ساعات الإجهاد الحراري <small class=\"num\">فوق " + F(scn("heat")) + "°</small>", function (m) { return m.cov ? '<span class="' + cl(m.heat >= 3, m.heat > 0.4) + '">' + hrs(m.heat) + "</span>" : "—"; }],
      ["الرطوبة ضمن الحد <small>" + dnLab("rh", "%") + "</small>", function (m) { return m.hCov ? hrs(m.inH, m.hCov) : "—"; }],
      ["VPD نهاراً <small>kPa · المثالي " + rng(vmin, vmax, "", 1) + "</small>", function (m) { return m.vDay == null ? "—" : '<b class="num ' + cl(m.vDay < vmin - 0.2 || m.vDay > vmax + 0.3, m.vDay < vmin || m.vDay > vmax) + '">' + F(m.vDay, 2) + "</b>"; }],
      ["ساعات VPD ضمن المثالي", function (m) { return m.vCov ? hrs(m.inV, m.vCov) : "—"; }],
      ["ساعات خطر الأمراض الفطرية <small>رطوبة ≥ " + F(scn("rhRisk")) + "% أو قرب نقطة الندى</small>", function (m) { return m.hCov ? '<span class="' + cl(m.risk >= 6, m.risk >= 2) + '">' + hrs(m.risk) + "</span>" : "—"; }]
    ];
    if (M.some(function (m) { return m && m.hasLux; })) rows.push(["DLI <small>mol/m²/يوم · تقريبي من lux</small>", function (m) { if (!m.hasLux || !m.lCov) return "—"; var full = m.lCov >= 20 || per; return '<b class="num ' + (full ? cl(m.dli < scn("dliMin") * 0.75, m.dli < scn("dliMin") || m.dli > scn("dliMax")) : "") + '">' + F(m.dli, 1) + "</b>" + (full ? "" : ' <small class="muted">حتى الآن</small>'); }]);
    rows.push(["تغطية البيانات <small>ساعات فيها قراءات</small>", function (m) { return '<span class="muted">' + hrs(Math.max(m.cov || 0, m.hCov || 0, m.lCov || 0)) + "</span>"; }]);
    return '<section class="sec"><h2>تحليل البيئة · ' + (per ? "متوسط يومي لآخر " + P() + " يوم" : (R.to === todayStr() ? "اليوم حتى الآن" : E(fmtShort(R.to)))) + '</h2>' +
      '<div class="tbl-wrap"><table class="sn-tbl sn-an"><thead><tr><th>المؤشر</th>' + ss.map(colHead).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) { return "<tr><td>" + r[0] + "</td>" + M.map(function (m) { return "<td>" + (m ? r[1](m) : "—") + "</td>"; }).join("") + "</tr>"; }).join("") +
      '</tbody></table></div><p class="help sn-hint">VPD: أقل من المثالي = جو رطب (نتح ضعيف وخطر أمراض)، وأعلى منه = جو جاف يجهد النبات. الساعات محسوبة من قراءات فعلية كل 5 دقائق.</p></section>';
  }


  /* ================= اليوم النموذجي وخريطة الحرارة: متوسط كل ساعة على الفترة ================= */
  var PROF = null;
  function hourly(s, k) {
    var acc = []; for (var i = 0; i < 24; i++) acc.push({ s: 0, n: 0, mn: null, mx: null });
    var days = 0;
    dayDocs(s).forEach(function (d) {
      var pts = ptsOf(d, s, k); if (!pts.length) return; days++;
      var f = sampler(pts);
      for (var t = 0, end = dayEnd(d.date); t < end; t += STEP) {
        var v = f(t); if (v == null) continue; var a = acc[Math.floor(t / 3600)];
        a.s += v; a.n++; a.mn = a.mn == null ? v : Math.min(a.mn, v); a.mx = a.mx == null ? v : Math.max(a.mx, v);
      }
    });
    return { days: days, h: acc.map(function (a) { return a.n ? { m: a.s / a.n, mn: a.mn, mx: a.mx } : null; }) };
  }
  function hl(h) { return typeof fmtTime === "function" ? fmtTime(p2(h) + ":00") : p2(h) + ":00"; }
  function profileHTML(list, ki) {
    PROF = null;
    var rows = list.map(function (s) { var r = hourly(s, X.kind); return { s: s, name: nm(s), col: colorOf(s), h: r.h, days: r.days }; }).filter(function (r) { return r.days; });
    if (!rows.length) return "";
    PROF = { rows: rows, ki: ki };
    var per = P() > 1, all = [];
    rows.forEach(function (r) { r.h.forEach(function (x) { if (x) all.push(x.m); }); });
    var vmin = Math.min.apply(null, all), vmax = Math.max.apply(null, all), span = Math.max(0.5, vmax - vmin);
    // ألوان الخريطة: الحرارة من الأزرق (بارد) إلى الأحمر (حار)، والرطوبة من البرتقالي (جاف) إلى الأزرق (رطب)
    var hueOf = function (v) { var q = (v - vmin) / span; return X.kind === "temp" ? 210 - q * 210 : X.kind === "hum" || X.kind === "soil" ? 30 + q * 180 : 140; };
    var alphaOf = function (v) { var q = (v - vmin) / span; return X.kind === "temp" || X.kind === "hum" || X.kind === "soil" ? 0.12 + 0.5 * Math.abs(q - 0.5) * 2 * 0.8 : 0.1 + q * 0.45; };
    // ملخص لكل موقع: ساعة الذروة وأدنى ساعة، وساعات تجاوز حد الإجهاد (للحرارة)
    var heat = scn("heat"), notes = rows.map(function (r) {
      var mxI = -1, mnI = -1; r.h.forEach(function (x, i) { if (!x) return; if (mxI < 0 || x.m > r.h[mxI].m) mxI = i; if (mnI < 0 || x.m < r.h[mnI].m) mnI = i; });
      var val = function (v) { return '<bdi dir="ltr"><b class="num">' + F(v, ki.d) + "</b>" + (X.kind === "temp" ? "°" : E(ki.u)) + "</bdi>"; };
      var t = '<li><i style="background:' + r.col + '"></i><b><bdi>' + E(r.name) + "</bdi>:</b> الأعلى " + val(r.h[mxI].m) + " الساعة " + hl(mxI) + " · الأدنى " + val(r.h[mnI].m) + " الساعة " + hl(mnI);
      if (X.kind === "temp") { var hot = []; r.h.forEach(function (x, i) { if (x && x.m > heat) hot.push(i); }); if (hot.length) t += ' · <span class="sn-warn">فوق ' + F(heat) + "° من " + hl(hot[0]) + " حتى " + hl(hot[hot.length - 1] + 1) + "</span>"; }
      return t + "</li>";
    });
    var tbl = '<div class="tbl-wrap sn-heat"><table class="sn-tbl"><thead><tr><th>الساعة</th>' + rows.map(function (r) { return '<th><i class="sn-sw" style="background:' + r.col + '"></i><bdi>' + E(r.name) + "</bdi></th>"; }).join("") + "</tr></thead><tbody>";
    for (var i = 0; i < 24; i++) {
      tbl += '<tr><td class="num">' + hl(i) + "</td>" + rows.map(function (r) {
        var x = r.h[i]; if (!x) return '<td class="muted">—</td>';
        var st = stOf(X.kind, x.m, p2(i) + ":30");
        return '<td class="num sn-hc' + (bad(st) ? " sn-hbad" : "") + '" style="background:hsla(' + hueOf(x.m).toFixed(0) + ",75%,50%," + alphaOf(x.m).toFixed(2) + ')"' + (per ? ' title="أدنى ' + F(x.mn, ki.d) + " · أعلى " + F(x.mx, ki.d) + '"' : "") + ">" + F(x.m, ki.d) + "</td>";
      }).join("") + "</tr>";
    }
    tbl += "</tbody></table></div>";
    return '<section class="sec"><h2>اليوم النموذجي · ' + E(ki.l) + (per ? ' <small class="muted">متوسط كل ساعة لآخر ' + P() + " يوم</small>" : ' <small class="muted">متوسط كل ساعة</small>') + "</h2>" +
      '<div class="card chart sn-chart" id="snProf"></div><ul class="sn-notes">' + notes.join("") + "</ul>" +
      '<button type="button" class="otherbar" data-sact="heat" aria-expanded="' + !!X.heat + '"><span>' + (X.heat ? "▾ إخفاء" : "▸ عرض") + ' خريطة الحرارة (كل ساعة × كل موقع)</span></button>' + (X.heat ? tbl + '<p class="help sn-hint">كل خانة = متوسط تلك الساعة' + (per ? " على الأيام المختارة، ولمسها يُظهر الأدنى والأعلى" : "") + ". " + (X.kind === "hum" ? "البرتقالي أجف، والأزرق أرطب." : "الأزرق أبرد، والأحمر أحر.") + " الإطار الأحمر = خارج الحدود.</p>" : "") + "</section>";
  }
  /* مكان نافذة القراءة: فوق الرسم حتى لا تغطي الخطوط والنقاط. إن لم يتسع لها فوقه (قرب أعلى الشاشة)
     توضع بجانب خط المؤشر، وإلا في النصف البعيد عن النقاط */
  function placeTip(tip, r, px, ys) {
    var tw = tip.offsetWidth || 160, th = tip.offsetHeight || 80, w = r.width, h = r.height, gap = 8;
    var top = document.getElementById("top"), barB = top && !top.hidden ? top.getBoundingClientRect().bottom : 0;
    var cx = Math.max(4, Math.min(w - tw - 4, px - tw / 2));
    if (r.top - th - gap >= barB + 4) { tip.style.left = cx + "px"; tip.style.top = (-th - gap) + "px"; return; }
    if (px + 14 + tw <= w - 4) { tip.style.left = (px + 14) + "px"; tip.style.top = "0px"; return; }
    if (px - 14 - tw >= 4) { tip.style.left = (px - 14 - tw) + "px"; tip.style.top = "0px"; return; }
    var avg = ys.length ? ys.reduce(function (a, b) { return a + b; }, 0) / ys.length : 0;
    tip.style.left = cx + "px"; tip.style.top = (avg < h / 2 ? Math.max(0, h - th) : 0) + "px";
  }
  function drawProfile(el, P_) {
    var rows = P_.rows, ki = P_.ki, W = 420, H = 230, L = 34, Rr = 8, T = 10, B = 26;
    var ys = []; rows.forEach(function (r) { r.h.forEach(function (x) { if (x) ys.push(x.m); }); });
    var LS = limSpan(X.kind), lo = LS[0], hi = LS[1];
    var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys), sp = Math.max(1, ymax - ymin);
    if (lo != null && lo > ymin - sp * 1.5) ymin = Math.min(ymin, lo);
    if (hi != null && hi < ymax + sp * 1.5) ymax = Math.max(ymax, hi);
    var pad = (ymax - ymin) * 0.12 || 1; ymin -= pad; ymax += pad; if (Math.min.apply(null, ys) >= 0 && ymin < 0) ymin = 0;
    var Xh = function (h) { return L + (h + 0.5) / 24 * (W - L - Rr); }, Y = function (y) { return T + (1 - (y - ymin) / (ymax - ymin)) * (H - T - B); };
    var g = "";
    for (var i = 0; i <= 4; i++) { var v = ymin + (ymax - ymin) * i / 4; g += '<line class="gl" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/><text class="ax" x="' + (L - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + F(v, (ymax - ymin) < 6 ? 1 : 0) + "</text>"; }
    var d0 = dayStart(dkey(Date.now()));
    g = bandRects(X.kind, d0, d0 + 86400e3, function (t) { return L + (t - d0) / 86400e3 * (W - L - Rr); }, Y, ymin, ymax, T, H - B, L, W - Rr) + g;
    [0, 6, 12, 18, 23].forEach(function (h, i, a) { g += '<text class="ax" x="' + Xh(h).toFixed(1) + '" y="' + (H - 9) + '" text-anchor="' + (i === 0 ? "start" : i === a.length - 1 ? "end" : "middle") + '">' + p2(h) + ":00</text>"; });
    var lines = rows.map(function (r) {
      var d = "", prev = false;
      r.h.forEach(function (x, h) { if (!x) { prev = false; return; } d += (prev ? "L" : "M") + Xh(h).toFixed(1) + " " + Y(x.m).toFixed(1) + " "; prev = true; });
      return '<path d="' + d + '" fill="none" stroke="' + r.col + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
    }).join("");
    var legend = '<div class="legend sn-legend">' + rows.map(function (r) { return '<span><i style="background:' + r.col + '"></i><bdi>' + E(r.name) + "</bdi></span>"; }).join("") + "</div>";
    el.innerHTML = legend + '<div class="sn-plot"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="اليوم النموذجي">' + g + lines + '<line class="hov" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--ink)" stroke-width="1" visibility="hidden"/><g class="hovd"></g></svg><div class="sn-tip" hidden></div></div>';
    var svg = el.querySelector("svg"), tip = el.querySelector(".sn-tip"), hv = svg.querySelector(".hov"), hd = svg.querySelector(".hovd");
    function mv(ev) {
      var r = svg.getBoundingClientRect(), cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      var h = Math.max(0, Math.min(23, Math.floor(((cx - r.left) / r.width * W - L) / (W - L - Rr) * 24)));
      var out = [], dots = "";
      var ys = [];
      rows.forEach(function (rw) { var x = rw.h[h]; if (!x) return; ys.push(Y(x.m) / H * r.height); out.push('<div><i style="background:' + rw.col + '"></i><bdi>' + E(rw.name) + '</bdi> <b class="num">' + F(x.m, ki.d) + "</b><bdi>" + E(ki.u) + "</bdi>" + (P() > 1 ? ' <small class="num">(' + F(x.mn, ki.d) + "–" + F(x.mx, ki.d) + ")</small>" : "") + "</div>"); dots += '<circle cx="' + Xh(h).toFixed(1) + '" cy="' + Y(x.m).toFixed(1) + '" r="5" fill="' + rw.col + '" stroke="var(--surface)" stroke-width="2"/>'; });
      if (!out.length) { tip.hidden = true; return; }
      hv.setAttribute("x1", Xh(h)); hv.setAttribute("x2", Xh(h)); hv.setAttribute("visibility", "visible"); hd.innerHTML = dots;
      tip.innerHTML = '<div class="sn-tt">الساعة ' + hl(h) + " – " + hl((h + 1) % 24) + "</div>" + out.join(""); tip.hidden = false;
      placeTip(tip, r, Xh(h) / W * r.width, ys);
    }
    svg.addEventListener("mousemove", mv); svg.addEventListener("touchstart", mv, { passive: true }); svg.addEventListener("touchmove", mv, { passive: true });
    svg.addEventListener("mouseleave", function () { tip.hidden = true; hv.setAttribute("visibility", "hidden"); hd.innerHTML = ""; });
  }

  /* ================= التبريد وتجانس البيت: من أول البيت (الخلايا) إلى آخره ================= */
  function coolingHTML(list, R) {
    var ps = list.filter(function (s) { return posOf(s) && codesFor(s, "temp").length; }).sort(function (a, b) { return posRank(a) - posRank(b); });
    if (ps.length < 2) return "";
    var A = ps[0], Z = ps[ps.length - 1], gmax = scn("gradMax");
    var lastT = function (s) { var l = s.last || {}, v = null; Object.keys(l).forEach(function (c) { if (kindOf(c) === "temp" && l[c] && ms(l[c].at) && Date.now() - ms(l[c].at) < STALE_H * 3600e3) v = corr(s, "temp", l[c].v); }); return v; };
    var chain = ps.map(function (s) { var v = lastT(s); return '<span class="sn-step"><small>' + E(posLabel(s) || nm(s)) + '</small><b class="num">' + (v == null ? "—" : F(v, 1) + "°") + "</b></span>"; }).join('<span class="sn-arr">←</span>');
    var a0 = lastT(A), z0 = lastT(Z), now = a0 != null && z0 != null ? z0 - a0 : null;
    var byDate = {}; (X.days || []).forEach(function (d) { byDate[d.date + "|" + d.deviceId] = d; });
    var days = [], d = R.to; for (var i = 0; i < P(); i++) { days.push(d); d = addDays(d, -1); }
    var rows = days.map(function (dt) {
      var da = byDate[dt + "|" + A.id], dz = byDate[dt + "|" + Z.id]; if (!da || !dz) return null;
      var fa = sampler(ptsOf(da, A, "temp")), fz = sampler(ptsOf(dz, Z, "temp")), pk = 0, pn = 0, mx = null, mxT = 0;
      for (var t = 0, end = dayEnd(dt); t < end; t += STEP) { var va = fa(t), vz = fz(t); if (va == null || vz == null) continue; var df = vz - va; if (t >= 43200 && t < 57600) { pk += df; pn++; } if (mx == null || df > mx) { mx = df; mxT = t; } }
      return mx == null ? null : { d: dt, peak: pn ? pk / pn : null, max: mx, at: dayStart(dt) + mxT * 1000 };
    }).filter(Boolean);
    var sg = function (x) { return x == null ? "—" : '<bdi dir="ltr">' + (x > 0 ? "+" : "") + F(x, 1) + "°</bdi>"; };
    var h = '<section class="sec"><h2>التبريد وتجانس ' + (S.sec === "t" ? "البيت" : "المشتل") + '</h2><div class="card"><div class="sn-chain">' + chain + "</div>" +
      '<div class="grid2 sn-cool"><div class="stat' + (now != null && now > gmax ? " s-warn" : "") + '"><span class="lab">الفرق الآن بين الأول والآخر</span><span class="val num">' + sg(now) + "</span></div>";
    if (P() === 1 && rows[0]) h += '<div class="stat' + (rows[0].peak > gmax ? " s-warn" : "") + '"><span class="lab">متوسط الفرق وقت الذروة <small>12–4م</small></span><span class="val num">' + sg(rows[0].peak) + '</span><span class="sub">أعلى فرق ' + sg(rows[0].max) + " الساعة " + tLabel(rows[0].at) + "</span></div>";
    h += "</div>";
    if (P() > 1 && rows.length) h += '<div class="tbl-wrap" style="margin-top:10px"><table class="sn-tbl"><thead><tr><th>التاريخ</th><th>متوسط فرق الذروة</th><th>أعلى فرق</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td class="num">' + E(fmtShort(r.d)) + '</td><td class="num ' + (r.peak > gmax ? "sn-warn" : "") + '">' + sg(r.peak) + '</td><td class="num">' + sg(r.max) + ' <small class="muted">' + tLabel(r.at) + "</small></td></tr>"; }).join("") + "</tbody></table></div>";
    return h + '<p class="help sn-hint" style="margin-top:8px">الفرق = حرارة آخر نقطة (جهة المراوح) ناقص أول نقطة (جهة الخلايا). ارتفاعه عن ' + F(gmax, 1) + "° أو زيادته يوماً بعد يوم مؤشر يستحق فحص الخلايا وتدفق الماء والمراوح.</p></div></section>";
  }

  /* ================= جدول القراءات المفصّل (يوم واحد، مغلق افتراضياً) ================= */
  function rawHTML(list, ki, date) {
    var by = {}; (X.days || []).forEach(function (d) { if (d.date === date) by[d.deviceId] = d; });
    var B = 900, ser = [], n = 0, b0 = 1e9, b1 = -1;
    list.forEach(function (s) {
      var pts = by[s.id] ? ptsOf(by[s.id], s, X.kind) : []; ser.push(pts); n += pts.length;
      pts.forEach(function (p) { var b = Math.floor(p.t / B); if (b < b0) b0 = b; if (b > b1) b1 = b; });
    });
    if (!n) return "";
    var h = '<button type="button" class="otherbar sn-rawbtn" data-sact="raw" aria-expanded="' + !!X.raw + '"><span>' + (X.raw ? "▾ إخفاء" : "▸ عرض") + " كل قراءات " + E(ki.l) + ' <small class="muted num">(' + n + ")</small></span></button>";
    if (!X.raw) return h;
    var t0 = dayStart(date), rows = [];
    for (var b = b1; b >= b0; b--) {
      var cells = list.map(function (s, si) {
        var pts = ser[si], last = null, here = null;
        for (var k = 0; k < pts.length && pts[k].t < (b + 1) * B; k++) { last = pts[k]; if (pts[k].t >= b * B) here = pts[k]; }
        if (here) { var st = stOf(X.kind, here.v, t0 + here.t * 1000); return '<td class="num sn-real ' + (bad(st) ? "sn-bad" : "") + '" title="' + hm(t0 + here.t * 1000) + '">' + F(here.v, ki.d) + "</td>"; }
        if (last && b * B - last.t < HOLD) return '<td class="num sn-carry" title="آخر قراءة ' + hm(t0 + last.t * 1000) + '">' + F(last.v, ki.d) + "</td>";
        return '<td class="muted">—</td>';
      });
      rows.push('<tr><td class="num">' + tLabel(t0 + b * B * 1000) + "</td>" + cells.join("") + "</tr>");
    }
    return h + '<div class="tbl-wrap sn-raw"><table class="sn-tbl"><thead><tr><th>الوقت</th>' + list.map(colHead).join("") + "</tr></thead><tbody>" + rows.join("") +
      '</tbody></table></div><p class="help sn-hint">سطر لكل ربع ساعة. <b>الرقم الواضح</b> قراءة أرسلها الحساس في هذا الوقت، و<span class="sn-carry">الرقم الباهت</span> لم يرسل فيه الحساس لأن القيمة لم تتغير، فهو آخر قيمة معروفة. و— تعني لا قراءة منذ أكثر من ساعة.</p>';
  }

  /* ================= إعدادات الحساسات (للمشرف) ================= */
  function openSet() {
    var kpa = typeof KPA === "function" ? KPA() : 'inputmode="decimal"';
    var nf = [["vpdMin", "VPD الأدنى المثالي", "kPa"], ["vpdMax", "VPD الأعلى المثالي", "kPa"], ["heat", "حد الإجهاد الحراري", "°C"], ["rhRisk", "رطوبة خطر الأمراض", "%"], ["dewGap", "الاقتراب من نقطة الندى", "°C"], ["condGap", "هامش التكثّف المحتمل على الأوراق", "°C"], ["gradMax", "أقصى فرق مقبول بين أول البيت وآخره", "°C"], ["dliMin", "DLI الأدنى", "mol"], ["dliMax", "DLI الأعلى", "mol"]];
    var tf = [["msgHot", "رسالة الحرارة المرتفعة"], ["msgCold", "رسالة الحرارة المنخفضة"], ["msgHumid", "رسالة الرطوبة المرتفعة"], ["msgDry", "رسالة الجو الجاف"], ["msgOff", "رسالة الحساس المنقطع أو البطارية"]];
    openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("إعدادات الحساسات") +
      '<form class="fgrid" id="snSet" novalidate><p class="help full" style="margin:0">حدود الحرارة والرطوبة نفسها تُؤخذ من "الحدود المستهدفة" لكل قسم في صفحة المشرف. هذه الحدود إضافية للتحليل، والقيم المبدئية للخس الورقي.</p>' +
      nf.map(function (x) { return '<label class="f" for="sn_' + x[0] + '">' + x[1] + '<div class="unitwrap"><input class="in num" ' + kpa + ' id="sn_' + x[0] + '" value="' + E(sc(x[0])) + '"><span class="u">' + x[2] + "</span></div></label>"; }).join("") +
      '<div class="grp-h full">رسائل الحالة التي يراها العامل (اكتب الإجراء المطلوب)</div>' +
      tf.map(function (x) { return '<label class="f full" for="sn_' + x[0] + '">' + x[1] + '<input class="in" id="sn_' + x[0] + '" value="' + E(sc(x[0])) + '"></label>'; }).join("") +
      '</form><div class="sheet-actions"><button class="btn" type="button" data-sact="setDef">القيم المبدئية</button><button class="btn pri" type="button" data-sact="saveSet">حفظ</button></div></div></div>');
  }
  function saveSet(b) {
    var o = {};
    document.querySelectorAll("#snSet [id^=sn_]").forEach(function (el) { var k = el.id.slice(3); if (/^msg/.test(k)) o[k] = el.value.trim(); else { var n = num(el.value); if (n != null) o[k] = n; } });
    if (o.vpdMin != null && o.vpdMax != null && o.vpdMin >= o.vpdMax) { toast("VPD الأدنى يجب أن يكون أقل من الأعلى"); return; }
    b.disabled = true;
    S.db.collection("config").doc("settings").set(Object.assign({}, S.settings, { sens: Object.assign({}, S.settings.sens || {}, o) }))
      .then(function () { toast("حُفظت إعدادات الحساسات"); closeSheet(); }).catch(function (e) { b.disabled = false; toast(typeof errMsg === "function" ? errMsg(e) : "تعذّر الحفظ"); });
  }

  function statusHTML() {
    if (X.err) return '<div class="banner warn"><span>' + E(X.err) + "</span></div>";
    var st = X.status; if (!st) return "";
    var t = ms(st.lastRun), late = t && Date.now() - t > 45 * 60000;
    if (st.ok === false && st.error) return '<div class="banner warn"><span><b>تنبيه من الجامع:</b> ' + E(String(st.error).slice(0, 160)) + " · آخر محاولة " + ago(t) + "</span></div>";
    if (late) return '<div class="banner warn"><span>لم تصل قراءات جديدة ' + ago(t) + ". تأكد أن الجامع يعمل واشتراك Tuya مفعّل.</span></div>";
    return '<p class="muted sn-status"><span class="sn-dot"></span>التحديث تلقائي كل 15 دقيقة · آخر تحديث ' + ago(t) + "</p>";
  }

  /* بطاقة الحساس: الاسم والموقع وحالة الاتصال في الرأس، ثم القياسات في شبكة واحدة متساوية */
  var UNIT_S = { temp: "°", hum: "%", soil: "%", lux: "", co2: "" };
  function ydVal(s, k) { // نفس الوقت أمس
    var today = dkey(Date.now()); if (!window.S || S.date !== today || !X.all || typeof addDays !== "function") return null;
    var yd = docOf(s, addDays(today, -1)); if (!yd) return null;
    return sampler(ptsOf(yd, s, k))(Math.floor((Date.now() - dayStart(today)) / 1000));
  }
  function mCell(val, unit, lab, isBad, sub) {
    return '<div class="m' + (isBad ? " bad" : "") + '"><b class="num"><bdi dir="ltr">' + val + (unit ? "<small>" + E(unit) + "</small>" : "") + "</bdi></b><span>" + lab + "</span>" + (sub ? "<em>" + sub + "</em>" : "") + "</div>";
  }
  function cardHTML(s) {
    var last = s.last || {}, seen = ms(s.lastSeen), stale = !seen || Date.now() - seen > STALE_H * 3600e3, batt = lastOfKind(s, "batt"), anyBad = false, cells = [], kinds = [];
    Object.keys(last).forEach(function (c) { var k = kindOf(c); if (k !== "batt" && kinds.indexOf(k) < 0 && last[c] && last[c].v != null) kinds.push(k); });
    kinds.sort(function (a, b) { var x = ORDER.indexOf(a), y = ORDER.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
    kinds.forEach(function (k) {
      var v = lastOfKind(s, k), ki = kindInfo(k, s), b = !stale && bad(stOf(k, v)); if (b) anyBad = true;
      var y = !stale && (k === "temp" || k === "hum") ? ydVal(s, k) : null, dl = "";
      if (y != null) { var d = v - y; dl = Math.abs(d) < (k === "temp" ? 0.5 : 2) ? "مثل أمس" : '<bdi dir="ltr">' + (d > 0 ? "↑" : "↓") + F(Math.abs(d), ki.d) + "</bdi> عن أمس"; }
      cells.push(mCell(F(v, ki.d), UNIT_S[k] != null ? UNIT_S[k] : ki.u, E(k === "hum" ? "الرطوبة" : ki.l), b, dl));
    });
    var t = lastOfKind(s, "temp"), hm = lastOfKind(s, "hum");
    if (!stale && t != null && hm != null) {
      var vp = vpdOf(t, hm), vs = stOf("vpd", vp), dp = dewOf(t, hm), mg = t - dp;
      cells.push(mCell(vp.toFixed(2), "", "VPD", bad(vs), vs === "lo" ? "رطب" : vs === "hi" ? "جاف" : "مثالي"));
      cells.push(mCell(F(mg, 1), "°", "هامش الندى", mg <= scn("dewGap"), "الندى " + F(dp, 1) + "°"));
    }
    var pl = posLabel(s), where = s.loc || (pl && pl !== nm(s) ? pl : "") || (secs(s.sec).length ? secs(s.sec).map(function (x) { return x === "g" ? "المعدات" : SECS[x] ? SECS[x].name : x; }).join(" + ") : "");
    var meta = '<span class="snc-t' + (stale ? " stale" : "") + '"><i></i>' + (seen ? ago(seen) : "لا قراءات") + "</span>" + (batt != null ? '<span class="snc-b' + (batt < 20 ? " low" : "") + '">🔋' + F(batt) + "%</span>" : "");
    return '<article class="sncard' + (anyBad ? " bad" : stale ? " stale" : "") + '" id="snc_' + E(s.id) + '"><div class="snc-h"><i class="sw" style="background:' + colorOf(s) + '"></i><div class="snc-n"><b dir="auto">' + E(nm(s)) + "</b><span>" + (where ? E(where) : "لم يُحدَّد الموقع") + '</span></div><div class="snc-meta">' + meta + "</div></div>" +
      '<div class="snc-m">' + (cells.join("") || '<span class="muted">لا قراءات</span>') + "</div>" + (stale ? '<p class="snc-warn">لم يرسل قراءات منذ أكثر من ' + STALE_H + " ساعات: تحقق من البطارية والاتصال.</p>" : "") + "</article>";
  }

  /* ================= أمس في نفس الوقت، والليلة الماضية (للجميع) ================= */
  function docOf(s, date) {
    return (X.all || []).filter(function (d) { return d.deviceId === s.id && d.date === date && secOk(d.sec != null && d.sec !== "" ? d.sec : s.sec); })[0] || null;
  }
  function lastOfKind(s, k) { var l = s.last || {}, v = null; Object.keys(l).forEach(function (c) { if (kindOf(c) === k && l[c] && l[c].v != null) v = corr(s, k, +l[c].v); }); return v; }
  /* VPD الآن مقارنة بالنطاق المثالي من الإعدادات */
  function vpdHTML(s) {
    var t = lastOfKind(s, "temp"), h = lastOfKind(s, "hum"); if (t == null || h == null) return "";
    var v = vpdOf(t, h), st = stOf("vpd", v), lab = st === "lo" ? "رطب" : st === "hi" ? "جاف" : "مثالي";
    return '<span class="sub sn-vpd">VPD <b class="num ' + (st === "ok" ? "sn-good" : "sn-bad") + '"><bdi dir="ltr">' + v.toFixed(2) + '</bdi></b> <small class="muted">kPa</small> · <span class="' + (st === "ok" ? "sn-good" : "sn-bad") + '">' + lab + "</span></span>";
  }
  /* نقطة الندى الآن والهامش (الحرارة ناقص نقطة الندى) */
  function dewHTML(s) {
    var t = lastOfKind(s, "temp"), h = lastOfKind(s, "hum"); if (t == null || h == null) return "";
    var dp = dewOf(t, h), mg = t - dp, low = mg <= scn("dewGap");
    return '<span class="sub sn-dew">الندى <bdi dir="ltr" class="num">' + F(dp, 1) + '°</bdi> · الهامش <b class="num' + (low ? " sn-bad" : "") + '"><bdi dir="ltr">' + F(mg, 1) + "°</bdi></b>" + (low ? ' <small class="sn-bad">خطر تكثّف</small>' : "") + "</span>";
  }
  function ydayHTML(s) {
    var today = dkey(Date.now()); if (!window.S || S.date !== today || !X.all || typeof addDays !== "function") return "";
    var yd = docOf(s, addDays(today, -1)); if (!yd) return "";
    var t = Math.floor((Date.now() - dayStart(today)) / 1000), out = [];
    [["temp", "°", 1], ["hum", "%", 0]].forEach(function (x) {
      var now = lastOfKind(s, x[0]), y = sampler(ptsOf(yd, s, x[0]))(t); if (now == null || y == null) return;
      var d = now - y, arr = Math.abs(d) < (x[0] === "temp" ? 0.5 : 2) ? "" : d > 0 ? "↑" : "↓";
      out.push('<bdi dir="ltr" class="num">' + F(y, x[2]) + x[1] + "</bdi>" + (arr ? ' <small class="muted">(الآن <bdi dir="ltr">' + arr + F(Math.abs(d), x[2]) + "</bdi>)</small>" : ""));
    });
    return out.length ? '<span class="sub sn-yd">أمس في نفس الوقت: ' + out.join(" · ") + "</span>" : "";
  }
  /* الليلة = من نهاية النهار أمس حتى بدايته في اليوم المختار (نفس تقسيم النهار والليل في الحدود والتحليل) */
  function nightHTML(list, date) {
    if (!X.all || typeof addDays !== "function") return "";
    var dh = DH(), nS = dh[1] * 3600, nE = dh[0] * 3600;
    var prev = addDays(date, -1), t0 = dayStart(prev), endT = Math.min(dayStart(date) + nE * 1000, Date.now());
    if (endT <= t0 + nS * 1000) return "";
    var live = endT < dayStart(date) + nE * 1000, lo = limAt("temp", "00:00")[0], risk = scn("rhRisk"), rows = [];
    list.forEach(function (s) {
      var pick = function (k) {
        var a = [], d1 = docOf(s, prev), d2 = docOf(s, date);
        if (d1) ptsOf(d1, s, k).forEach(function (p) { if (p.t >= nS) a.push({ t: t0 + p.t * 1000, v: p.v }); });
        if (d2) ptsOf(d2, s, k).forEach(function (p) { if (p.t < nE) a.push({ t: dayStart(date) + p.t * 1000, v: p.v }); });
        return a;
      };
      var T = pick("temp"), H = pick("hum"); if (!T.length && !H.length) return;
      var mg = null, hi = 0;
      if (T.length && H.length) { H.sort(function (a, b) { return a.t - b.t; }); T.slice().sort(function (a, b) { return a.t - b.t; }).forEach(function (p) {
        while (hi + 1 < H.length && H[hi + 1].t <= p.t) hi++; var q = H[hi]; if (!q || q.t > p.t || p.t - q.t > HOLD * 1000) return;
        var g = p.v - dewOf(p.v, q.v); if (!mg || g < mg.v) mg = { t: p.t, v: g };
      }); }
      var mn = T.reduce(function (b, p) { return !b || p.v < b.v ? p : b; }, null), mx = H.reduce(function (b, p) { return !b || p.v > b.v ? p : b; }, null);
      var cc = codesFor(s, "dew").length ? condOf(s, X.all, date) : null;
      var cv = function (v, u, d, isBad, t) { return v == null ? '<td class="muted">—</td>' : '<td><b class="num' + (isBad ? " sn-bad" : "") + '"><bdi dir="ltr">' + F(v, d) + u + "</bdi></b>" + (t ? '<small class="num">' + tLabel(t) + "</small>" : "") + "</td>"; };
      rows.push({ s: s, c: [cv(mn && mn.v, "°", 1, mn && mn.v < lo, mn && mn.t), cv(mx && mx.v, "%", 0, mx && mx.v >= risk, mx && mx.t), cv(mg && mg.v, "°", 1, mg && mg.v <= scn("dewGap"), mg && mg.t),
        !cc ? '<td class="muted">—</td>' : cc.h > 0 ? '<td><b class="num sn-bad">' + F(cc.h, cc.h < 10 ? 1 : 0) + ' س</b><small class="num">' + tLabel(cc.spans[0].a) + "</small></td>" : '<td><span class="sn-good">لا</span></td>'] });
    });
    if (!rows.length) return "";
    var labs = ["أدنى حرارة", "أعلى رطوبة", "أقل هامش ندى", "تكثّف على الأوراق"];
    rows = labs.map(function (l, i) { return "<tr><td>" + l + "</td>" + rows.map(function (r) { return r.c[i]; }).join("") + "</tr>"; }).concat(['<tr class="hd"><th></th>' + rows.map(function (r) { return '<th><i class="sn-sw" style="background:' + colorOf(r.s) + '"></i><bdi>' + E(nm(r.s)) + "</bdi></th>"; }).join("") + "</tr>"]);
    rows.unshift(rows.pop());
    return '<section class="sec"><div class="sec-h"><h2>' + (live ? "الليلة حتى الآن" : "الليلة الماضية") + '</h2><span class="muted" style="font-size:12.5px">من ' + hS(dh[1]) + " إلى " + hS(dh[0]) + '</span></div><div class="tbl-wrap"><table class="sn-tbl sn-night">' + rows.join("") + "</table></div>" +
      '<p class="help sn-hint">الأحمر: خارج الحد. هامش الندى = حرارة الجو ناقص نقطة الندى، وكلما صغر زاد خطر الأمراض الفطرية. التكثّف المحتمل: هامش ' + F(scn("condGap")) + "° أو أقل، لأن الورقة في الليل أبرد من الهواء.</p></section>";
  }

  function summaryHTML(list, ki, R) {
    var dates = [], d = R.to; for (var i = 0; i < P(); i++) { dates.push(d); d = typeof addDays === "function" ? addDays(d, -1) : d; }
    var by = {}; (X.days || []).forEach(function (doc) { by[doc.date + "|" + doc.deviceId] = doc; });
    var cell = function (s, date) {
      var doc = by[date + "|" + s.id]; if (!doc || !secOk(doc.sec != null && doc.sec !== "" ? doc.sec : s.sec)) return '<td class="muted">—</td>';
      var mn = null, mx = null, sm = 0, n = 0;
      if (X.kind === "dew" || X.kind === "vpd") ptsOf(doc, s, X.kind).forEach(function (p) { mn = mn == null ? p.v : Math.min(mn, p.v); mx = mx == null ? p.v : Math.max(mx, p.v); sm += p.v; n++; });
      else codesFor(s, X.kind).forEach(function (c) { var q = (doc.s || {})[c]; if (!q || !q.n) return; q = statOf(s, c, q); mn = mn == null ? q.min : Math.min(mn, q.min); mx = mx == null ? q.max : Math.max(mx, q.max); sm += q.sum || 0; n += q.n; });
      if (!n) return '<td class="muted">—</td>';
      // الأدنى يُقارن بحد الليل والأعلى بحد النهار (حيث يحدث كل منهما عادة)
      var b1 = bad(stOf(X.kind, mn, "03:00")), b2 = bad(stOf(X.kind, mx, "13:00"));
      return '<td><span class="num"><span class="' + (b1 ? "sn-bad" : "") + '">' + F(mn, ki.d) + '</span> – <span class="' + (b2 ? "sn-bad" : "") + '">' + F(mx, ki.d) + '</span></span><small class="sn-avg">متوسط <b class="num">' + F(sm / n, ki.d) + "</b> · " + n + " قراءة</small></td>";
    };
    var rows = dates.filter(function (dt) { return list.some(function (s) { return by[dt + "|" + s.id]; }); });
    if (!rows.length) return '<section class="sec"><div class="empty">لا توجد قراءات ' + E(ki.l) + " في هذه الفترة.</div></section>";
    return '<section class="sec"><h2>الملخص اليومي · ' + E(ki.l) + (ki.u ? " (" + E(ki.u) + ")" : "") + '</h2><p class="muted sn-hint">الأدنى – الأعلى، والمتوسط وعدد القراءات لكل يوم.</p><div class="tbl-wrap"><table class="sn-tbl"><thead><tr><th>التاريخ</th>' +
      list.map(colHead).join("") + "</tr></thead><tbody>" +
      rows.map(function (dt) { return '<tr><td class="num">' + E(typeof fmtShort === "function" ? fmtShort(dt) : dt) + "</td>" + list.map(function (s) { return cell(s, dt); }).join("") + "</tr>"; }).join("") +
      "</tbody></table></div></section>";
  }

  /* ================= الرسم ================= */
  function bind(root) {
    var pe = root && root.querySelector("#snProf"); if (pe && PROF) drawProfile(pe, PROF);
    var el = root && root.querySelector("#snChart"); if (!el) return;
    var list = sensorList().filter(function (s) { return codesFor(s, X.kind).length && !X.off[s.id]; });
    var ki = kindInfo(X.kind, list[0]);
    var series = list.map(function (s) { return { s: s, name: nm(s), col: colorOf(s), pts: seriesFor(s, X.kind), man: manualFor(s, X.kind) }; })
      .filter(function (sr) { return sr.pts.length || sr.man.length; });
    drawChart(el, series, ki);
  }
  function drawChart(el, series, ki) {
    if (!series.length) { el.innerHTML = '<div class="muted" style="font-size:13px;text-align:center;padding:16px">لا توجد قراءات في هذه الفترة' + (Object.keys(X.off).length ? " (أو كل الحساسات مخفية)" : "") + "</div>"; return; }
    var R = rangeOf(), t0 = dayStart(R.from), t1 = dayStart(R.to) + 864e5;
    var W = 420, H = 250, L = 34, Rr = 8, T = 10, B = 26;
    var all = []; series.forEach(function (sr) { all = all.concat(sr.pts, sr.man); });
    var ys = all.map(function (p) { return p.y; }), LS = limSpan(X.kind), lo = LS[0], hi = LS[1];
    var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
    // نُظهر نطاق الحدود فقط إن كان قريباً من القراءات، كي لا تنضغط الخطوط
    var span0 = Math.max(1, ymax - ymin);
    if (lo != null && lo > ymin - span0 * 1.5) ymin = Math.min(ymin, lo);
    if (hi != null && hi < ymax + span0 * 1.5) ymax = Math.max(ymax, hi);
    var padv = (ymax - ymin) * 0.12 || 1; ymin -= padv; ymax += padv; if (Math.min.apply(null, ys) >= 0 && ymin < 0) ymin = 0;
    var X_ = function (t) { return L + (t - t0) / (t1 - t0) * (W - L - Rr); }, Y = function (y) { return T + (1 - (y - ymin) / (ymax - ymin)) * (H - T - B); };
    var g = "", dec = ki.d;
    for (var i = 0; i <= 4; i++) { var v = ymin + (ymax - ymin) * i / 4; g += '<line class="gl" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/><text class="ax" x="' + (L - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + F(v, (ymax - ymin) < 6 ? 1 : 0) + "</text>"; }
    var band = bandRects(X.kind, t0, t1, X_, Y, ymin, ymax, T, H - B, L, W - Rr);
    // محور الوقت
    var xs = "", ticks = [];
    if (P() === 1) { for (var hh = 0; hh <= 24; hh += 3) ticks.push([t0 + hh * 3600e3, hh % 6 ? "" : p2(hh) + ":00"]); }
    else { var step = P() <= 7 ? 1 : 5; for (var dd = 0; dd <= P(); dd += step) { var tt = t0 + dd * 864e5, dk = dkey(tt); ticks.push([tt, dk.slice(8, 10) + "/" + dk.slice(5, 7)]); } }
    ticks.forEach(function (k, i) { var x = X_(k[0]), an = i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"; xs += '<line class="gl" x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + T + '" y2="' + (H - B) + '" stroke-dasharray="2 4"/><text class="ax" x="' + x.toFixed(1) + '" y="' + (H - 9) + '" text-anchor="' + an + '">' + k[1] + "</text>"; });
    var now = Date.now(), nowL = now > t0 && now < t1 ? '<line x1="' + X_(now).toFixed(1) + '" x2="' + X_(now).toFixed(1) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--muted)" stroke-width="1" opacity=".5"/>' : "";
    var GAP = P() === 1 ? 3 * 3600e3 : 6 * 3600e3, many = all.length > 160;
    var lines = series.map(function (sr) {
      var path = "", prev = null;
      sr.pts.forEach(function (p) { path += (prev && p.t - prev.t <= GAP ? "L" : "M") + X_(p.t).toFixed(1) + " " + Y(p.y).toFixed(1) + " "; prev = p; });
      var dots = many ? "" : sr.pts.map(function (p) { return '<circle cx="' + X_(p.t).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="2.6" fill="' + (bad(stOf(X.kind, p.y, p.t)) ? "var(--bad)" : sr.col) + '"/>'; }).join("");
      var man = sr.man.map(function (p) { return '<rect x="' + (X_(p.t) - 4).toFixed(1) + '" y="' + (Y(p.y) - 4).toFixed(1) + '" width="8" height="8" fill="var(--surface)" stroke="' + sr.col + '" stroke-width="2"/>'; }).join("");
      return '<path d="' + path + '" fill="none" stroke="' + sr.col + '" stroke-width="' + (many ? 1.6 : 2) + '" stroke-linejoin="round" stroke-linecap="round"/>' + dots + man;
    }).join("");
    var legend = '<div class="legend sn-legend">' + series.map(function (sr) { return '<span><i style="background:' + sr.col + '"></i><bdi>' + E(sr.name) + "</bdi></span>"; }).join("") + "</div>";
    el.innerHTML = legend + '<div class="sn-plot"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + E(ki.l) + '">' + band + g + xs + nowL + lines +
      '<line class="hov" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--ink)" stroke-width="1" visibility="hidden"/><g class="hovd"></g></svg><div class="sn-tip" hidden></div></div>';
    var svg = el.querySelector("svg"), tip = el.querySelector(".sn-tip"), hv = svg.querySelector(".hov"), hd = svg.querySelector(".hovd");
    function near(pts, t) { // أقرب قراءة (بحث ثنائي)
      var a = 0, b = pts.length - 1; if (b < 0) return null;
      while (b - a > 1) { var m = (a + b) >> 1; if (pts[m].t < t) a = m; else b = m; }
      var q = Math.abs(pts[a].t - t) <= Math.abs(pts[b].t - t) ? pts[a] : pts[b];
      return Math.abs(q.t - t) <= GAP ? q : null;
    }
    function mv(ev) {
      var r = svg.getBoundingClientRect(), cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      var x = Math.max(L, Math.min(W - Rr, (cx - r.left) / r.width * W)), t = t0 + (x - L) / (W - L - Rr) * (t1 - t0);
      var best = null, rows = [], dots = "", ys = [];
      series.forEach(function (sr) { var q = near(sr.pts, t); if (q && (!best || Math.abs(q.t - t) < Math.abs(best.t - t))) best = q; });
      if (!best) { tip.hidden = true; hv.setAttribute("visibility", "hidden"); hd.innerHTML = ""; return; }
      series.forEach(function (sr) {
        var q = near(sr.pts, best.t); if (!q) return;
        var st = stOf(X.kind, q.y, q.t);
        rows.push('<div><i style="background:' + sr.col + '"></i><bdi>' + E(sr.name) + '</bdi> <b class="num' + (bad(st) ? " sn-bad" : "") + '">' + F(q.y, ki.d) + "</b><bdi>" + E(ki.u) + "</bdi>" + (q.T != null ? ' <small>من <bdi dir="ltr" class="num">' + F(q.T, 1) + '°</bdi> و<bdi dir="ltr" class="num">' + F(q.H) + "%</bdi></small>" : "") + (Math.abs(q.t - best.t) > 5 * 60000 ? ' <small class="num">' + tLabel(q.t) + "</small>" : "") + "</div>");
        dots += '<circle cx="' + X_(q.t).toFixed(1) + '" cy="' + Y(q.y).toFixed(1) + '" r="5" fill="' + sr.col + '" stroke="var(--surface)" stroke-width="2"/>';
        ys.push(Y(q.y) / H * r.height);
      });
      hv.setAttribute("x1", X_(best.t)); hv.setAttribute("x2", X_(best.t)); hv.setAttribute("visibility", "visible"); hd.innerHTML = dots;
      tip.innerHTML = '<div class="sn-tt">' + (P() === 1 ? "" : E(typeof fmtShort === "function" ? fmtShort(dkey(best.t)) : dkey(best.t)) + " · ") + '<span class="num">' + tLabel(best.t) + "</span></div>" + rows.join("");
      tip.hidden = false;
      placeTip(tip, r, X_(best.t) / W * r.width, ys);
    }
    svg.addEventListener("mousemove", mv);
    svg.addEventListener("touchstart", mv, { passive: true });
    svg.addEventListener("touchmove", mv, { passive: true });
    svg.addEventListener("mouseleave", function () { tip.hidden = true; hv.setAttribute("visibility", "hidden"); hd.innerHTML = ""; });
  }

  /* ================= التصدير ================= */
  function exportX(btn) {
    if (!window.XLSX || !X.days) { if (typeof toast === "function") toast("التصدير غير متاح الآن، تحقق من الإنترنت"); return; }
    var R = rangeOf(), raw = [["التاريخ", "الوقت", "الحساس", "القسم", "الموقع", "القياس", "القيمة", "الوحدة"]], sumr = [["التاريخ", "الحساس", "القياس", "الأدنى", "المتوسط", "الأعلى", "عدد القراءات", "الوحدة"]];
    var rows = [];
    X.days.forEach(function (d) {
      var s = X.sensors[d.deviceId] || { id: d.deviceId, name: d.deviceId, measures: {} }, sec = d.sec != null && d.sec !== "" ? d.sec : s.sec;
      if (s.enabled === false || !secOk(sec)) return;
      var secName = secs(sec).map(function (x) { return x === "g" ? "المعدات" : SECS[x] ? SECS[x].name : x; }).join(" + "), loc = d.loc != null && d.loc !== "" ? d.loc : (s.loc || posLabel(s) || ""), t0 = dayStart(d.date);
      Object.keys(d.p || {}).forEach(function (c) {
        var ki = kindInfo(kindOf(c), s), u = (s.measures && s.measures[c] && s.measures[c].unit) || ki.u;
        (d.p[c] || []).forEach(function (p) { rows.push([t0 + p.t * 1000, d.date, hm(t0 + p.t * 1000), nm(s), secName, loc, ki.l, corr(s, kindOf(c), p.v), u]); });
        var q = (d.s || {})[c]; if (q && q.n) q = statOf(s, c, q); if (q && q.n) sumr.push([d.date, nm(s), ki.l, q.min, Math.round(q.sum / q.n * 100) / 100, q.max, q.n, u]);
      });
    });
    rows.sort(function (a, b) { return a[0] - b[0]; }).forEach(function (r) { raw.push(r.slice(1)); });
    var wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
    [["القراءات", raw], ["الملخص اليومي", sumr]].forEach(function (x) { var ws = XLSX.utils.aoa_to_sheet(x[1]); ws["!cols"] = x[1][0].map(function () { return { wch: 16 }; }); XLSX.utils.book_append_sheet(wb, ws, x[0]); });
    XLSX.writeFile(wb, "GREEN-SIDE-SENSORS-" + (S.sec === "t" ? "TOWERS" : "NURSERY") + "-" + R.from + "-" + R.to + ".xlsx");
  }


  /* ================= فحص الحساسات (يُستدعى من "فحص النظام" في صفحة المشرف) ================= */
  async function selfTest(step) {
    var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    await step("الحساسات: الاتصال بقاعدة الحساسات", async function () {
      start(); for (var i = 0; i < 40 && !X.user && !X.err; i++) await wait(250);
      if (!X.user) throw new Error(X.err || "لم يتم الاتصال خلال 10 ثوانٍ"); return "متصل (دخول مجهول للقراءة فقط)";
    });
    if (!X.user) return;
    await step("الحساسات: قراءة بطاقات الحساسات", async function () {
      var q = await X.db.collection("sensors").get({ source: "server" }); if (!q.size) throw new Error("لا توجد حساسات في القاعدة");
      return q.size + " حساس";
    });
    await step("الحساسات: الجامع يعمل", async function () {
      var d = await X.db.collection("sensorMeta").doc("status").get({ source: "server" }); if (!d.exists) throw new Error("لا توجد حالة للجامع");
      var st = d.data(), t = ms(st.lastRun), m = Math.round((Date.now() - t) / 60000);
      if (st.ok === false) throw new Error("آخر تشغيل فيه خطأ: " + String(st.error || "").slice(0, 120));
      if (m > 45) throw new Error("آخر تشغيل قبل " + m + " دقيقة (المتوقع كل 15)"); return "آخر تشغيل قبل " + m + " دقيقة";
    });
    await step("الحساسات: قراءات اليوم محفوظة", async function () {
      var q = await X.db.collection("sensorDays").where("date", "==", dkey(Date.now())).get({ source: "server" }); if (!q.size) throw new Error("لا توجد قراءات لليوم بعد");
      var n = 0; q.forEach(function (d) { var p = d.data().p || {}; Object.keys(p).forEach(function (c) { n += (p[c] || []).length; }); });
      return q.size + " حساس · " + n + " قراءة اليوم";
    });
    await step("الحساسات: كل حساس يرسل قراءات", async function () {
      var late = Object.keys(X.sensors).map(function (k) { return X.sensors[k]; }).filter(function (s) { var t = ms(s.lastSeen); return s.enabled !== false && (!t || Date.now() - t > STALE_H * 3600e3); });
      if (late.length) throw new Error("لا قراءات منذ أكثر من " + STALE_H + " ساعات: " + late.map(function (s) { return s.name || s.tuyaName; }).join("، ")); return "كلها ترسل";
    });
    await step("الحساسات: التطبيق لا يستطيع تعديل قراءاتها", function () {
      return X.db.collection("sensorMeta").doc("selftest").set({ x: 1 }).then(function () { var e = new Error("سُمح بالكتابة ولم تُمنع"); e.code = "allowed"; throw e; },
        function (e) { if (e && e.code === "permission-denied") return "مُنع كما يجب (الكتابة للجامع وحده)"; throw e; });
    });
    await step("الحساسات: صحة حسابات VPD ونقطة الندى", async function () {
      var errs = [];
      if (Math.abs(vpdOf(25, 60) - 1.267) > 0.01) errs.push("VPD");
      if (Math.abs(dewOf(25, 60) - 16.7) > 0.2) errs.push("نقطة الندى");
      if (Math.abs(vpdOf(20, 100)) > 0.001) errs.push("VPD عند تشبع الرطوبة");
      if (errs.length) throw new Error("خطأ في: " + errs.join("، ")); return "صحيحة";
    });
  }

  /* ================= التكثّف المحتمل على الأوراق ================= */
  /* الورقة في الليل أبرد من الهواء بدرجة أو درجتين، فيتكثف عليها الماء قبل أن يتشبع الهواء.
     نعدّه محتملاً عندما يكون هامش الندى (حرارة الهواء ناقص نقطة الندى) condGap أو أقل، بعيّنة كل 5 دقائق،
     وبحرارة ورطوبة متقاربتين في الوقت (30 دقيقة). الليلة = من نهاية النهار في اليوم السابق حتى بدايته (إعداد بداية/نهاية النهار). */
  function condOf(s, docs, date) {
    var res = { h: 0, spans: [] }; if (!codesFor(s, "dew").length || typeof addDays !== "function") return res;
    var gap = scn("condGap"), cur = null, prev = addDays(date, -1), dh = DH();
    [[prev, dh[1] * 3600, 86400], [date, 0, dh[0] * 3600]].forEach(function (x) {
      var d = (docs || []).filter(function (dd) { return dd.deviceId === s.id && dd.date === x[0] && secOk(dd.sec != null && dd.sec !== "" ? dd.sec : s.sec); })[0]; if (!d) return;
      var fT = samplerP(ptsOf(d, s, "temp")), fH = samplerP(ptsOf(d, s, "hum")), end = Math.min(x[2], dayEnd(d.date)), base = dayStart(x[0]);
      for (var t = x[1]; t < end; t += STEP) {
        var a = fT(t), b = fH(t); if (!a || !b || Math.abs(a.t - b.t) > 1800) continue;
        if (a.v - dewOf(a.v, b.v) > gap) continue;
        var at = base + t * 1000; res.h += STEP / 3600;
        if (cur && at - cur.b <= 1000) cur.b = at + STEP * 1000; else { cur = { a: at, b: at + STEP * 1000 }; res.spans.push(cur); }
      }
    });
    return res;
  }
  function condTxt(c) {
    if (!c.spans.length) return "";
    var f = c.spans[0], l = c.spans[c.spans.length - 1];
    return '<b class="num sn-bad">' + F(c.h, c.h < 10 ? 1 : 0) + ' س</b> <small class="muted num">(' + tLabel(f.a) + "–" + tLabel(l.b) + (c.spans.length > 1 ? " · " + c.spans.length + " فترات" : "") + ")</small>";
  }
  /* للصفحة الرئيسية: وثائق أمس واليوم فقط، تُقرأ مرة ثم تُحدَّث مع الجامع حتى السابعة صباحاً */
  var NC = { key: "", run: 0, docs: null, loading: false };
  function nightDocs() {
    var today = dkey(Date.now()), run = X.status ? ms(X.status.lastRun) || 0 : 0, hr = riy(Date.now()).getUTCHours();
    var need = NC.key !== today || (hr < 7 && run && run !== NC.run);
    if (need && !NC.loading && X.user && typeof addDays === "function") {
      NC.loading = true;
      X.db.collection("sensorDays").where("date", ">=", addDays(today, -1)).where("date", "<=", today).get().then(function (q) {
        NC = { key: today, run: run, docs: q.docs.map(function (d) { return d.data(); }), loading: false }; rr();
      }).catch(function (e) { NC.loading = false; console.warn(e); });
    }
    return NC.key === today ? NC.docs : null;
  }

  /* ================= شريط الحساسات في الصفحة الرئيسية (للجميع) ================= */
  function strip() {
    start();
    if (!X.user || !Object.keys(X.sensors).length) return "";
    var list = sensorList().filter(function (s) { return codesFor(s, "temp").length || codesFor(s, "hum").length; });
    if (!list.length) return "";
    var nBad = 0, nOff = 0, newest = 0;
    var chips = list.map(function (s) {
      var seen = ms(s.lastSeen), stale = !seen || Date.now() - seen > STALE_H * 3600e3; if (seen > newest) newest = seen;
      var t = lastOfKind(s, "temp"), hm_ = lastOfKind(s, "hum"), bt = t != null && bad(stOf("temp", t)), bh = hm_ != null && bad(stOf("hum", hm_));
      if (stale) nOff++; else if (bt || bh) nBad++;
      var v = stale ? '<span class="muted">متوقف</span>' :
        (t != null ? '<b class="num' + (bt ? " sn-bad" : "") + '"><bdi dir="ltr">' + F(t, 1) + "°</bdi></b>" : "") +
        (hm_ != null ? ' <span class="num' + (bh ? " sn-bad" : "") + '"><bdi dir="ltr">' + F(hm_) + "%</bdi></span>" : "");
      return '<span class="snb-c' + (stale ? " off" : bt || bh ? " bad" : "") + '"><i style="background:' + colorOf(s) + '"></i><small><bdi>' + E(nm(s)) + "</bdi></small>" + v + "</span>";
    }).join("");
    var nd = nightDocs(), today = dkey(Date.now()), condL = [];
    if (nd) list.forEach(function (s) { var c = condOf(s, nd, today); if (c.h > 0) condL.push(E(nm(s)) + " " + F(c.h, c.h < 10 ? 1 : 0) + " س"); });
    var cond = condL.length ? '<span class="snb-cond">💧 <b>تكثّف محتمل على الأوراق ' + (riy(Date.now()).getUTCHours() < 6 ? "الليلة" : "ليلة أمس") + ":</b> " + condL.join(" · ") + ' <small>افحص الأوراق وحسّن التهوية</small></span>' : "";
    var pill = nBad ? '<span class="pill bad">' + nBad + " خارج الحدود</span>" : nOff ? '<span class="pill warn">' + nOff + " متوقف</span>" : '<span class="pill ok">ضمن الحدود</span>';
    return '<section class="sec"><button class="mybar snbar" type="button" data-act="goSens"><span class="mb-t">🌡️ الحساسات الآن ' + pill + '</span><span class="muted">' + (newest ? ago(newest) : "") + " ‹</span>" +
      '<span class="snb-row">' + chips + "</span>" + cond + "</button></section>";
  }

  /* ================= ملخص الحساسات لقسم التقارير ================= */
  /* يقرأ أيام الفترة كاملة (منفصلة عن صفحة الحساسات) ويحسب لكل حساس في القسم الحالي:
     المؤشرات على الفترة، والملخص اليومي، والفرق بين الحساس والقياس اليدوي في نفس الوقت والموقع. */
  var REPC = { key: "", docs: null }; // آخر فترة قُرئت للتقارير: تبديل القسم لا يعيد القراءة
  function report(from, to, rows, force) {
    start();
    var ck = from + "|" + to;
    var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var ready = function (i) { return X.user ? Promise.resolve() : X.err || i > 40 ? Promise.reject(new Error(X.err || "تعذّر الاتصال بقاعدة الحساسات")) : wait(250).then(function () { return ready(i + 1); }); };
    return ready(0).then(function () {
      if (!force && REPC.key === ck && REPC.docs) return REPC.docs;
      return X.db.collection("sensorDays").where("date", ">=", from).where("date", "<=", to).get().then(function (q) {
        REPC = { key: ck, docs: q.docs.map(function (d) { return d.data(); }) }; return REPC.docs;
      });
    }).then(function (docs) {
      var list = sensorList().filter(function (s) { return codesFor(s, "temp").length || codesFor(s, "hum").length; });
      return { from: from, to: to, sensors: list.map(function (s) { return repSensor(s, docs, rows || []); }).filter(function (r) { return r.days.length; }) };
    });
  }
  function repSensor(s, docs, rows) {
    var mine = docs.filter(function (d) { return d.deviceId === s.id && secOk(d.sec != null && d.sec !== "" ? d.sec : s.sec); }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var tot = { cov: 0, inT: 0, heat: 0, hCov: 0, inH: 0, risk: 0, vCov: 0, inV: 0, cond: 0 }, tD = [], tN = [], vD = [], dMax = null, nMin = null, minMg = null, dewS = 0, dewN = 0;
    var stat = function (doc, k) {
      var mn = null, mx = null, sm = 0, n = 0;
      codesFor(s, k).forEach(function (c) { var q = (doc.s || {})[c]; if (!q || !q.n) return; q = statOf(s, c, q); mn = mn == null ? q.min : Math.min(mn, q.min); mx = mx == null ? q.max : Math.max(mx, q.max); sm += q.sum || 0; n += q.n; });
      return n ? { mn: mn, mx: mx, av: sm / n } : null;
    };
    var days = mine.map(function (doc) {
      var m = dayMetrics(doc, s);
      Object.keys(tot).forEach(function (k) { tot[k] += m[k] || 0; });
      if (m.tDay != null) tD.push(m.tDay); if (m.tNight != null) tN.push(m.tNight); if (m.vDay != null) vD.push(m.vDay);
      if (m.dMax != null) dMax = dMax == null ? m.dMax : Math.max(dMax, m.dMax);
      if (m.nMin != null) nMin = nMin == null ? m.nMin : Math.min(nMin, m.nMin);
      // نقطة الندى: متوسطها، وأقل هامش (الحرارة ناقص نقطة الندى) ووقته
      // موزونة بالوقت: عيّنة كل 5 دقائق (مثل باقي ساعات التقرير)، فلا تطغى ساعات النهار التي يرسل فيها الحساس قراءات أكثر
      // ونقرن الحرارة بالرطوبة فقط إذا كانت القراءتان متقاربتين (30 دقيقة)، كي لا تُحسب حرارة جديدة مع رطوبة قديمة عند تشغيل التبريد مثلاً
      var fT = samplerP(ptsOf(doc, s, "temp")), fH = samplerP(ptsOf(doc, s, "hum")), dSum = 0, dN = 0, mg = null, cH = 0, cGap = scn("condGap");
      for (var tt = 0, te = dayEnd(doc.date); tt < te; tt += STEP) {
        var qT = fT(tt), qH = fH(tt); if (!qT || !qH || Math.abs(qT.t - qH.t) > 1800) continue;
        var tv = qT.v, hv = qH.v;
        var dv = dewOf(tv, hv), g = tv - dv; dSum += dv; dN++; if (g <= cGap) cH += STEP / 3600;
        if (!mg || g < mg.v) mg = { v: g, t: dayStart(doc.date) + tt * 1000 };
      }
      if (mg && (!minMg || mg.v < minMg.v)) minMg = { v: mg.v, t: mg.t };
      dewS += dSum; dewN += dN; tot.cond += cH;
      return { date: doc.date, cond: cH, dewAvg: dN ? dSum / dN : null, mgMin: mg ? mg.v : null, t: stat(doc, "temp"), h: stat(doc, "hum"), cov: m.cov, inT: m.inT, heat: m.heat, hCov: m.hCov, inH: m.inH, risk: m.risk, vDay: m.vDay, vCov: m.vCov, inV: m.inV };
    });
    var mean = function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; };
    return { id: s.id, name: nm(s), col: colorOf(s), days: days, tot: tot, tDay: mean(tD), tNight: mean(tN), vDay: mean(vD), vMin: scn("vpdMin"), vMax: scn("vpdMax"), dewAvg: dewN ? dewS / dewN : null, minMg: minMg, dewGap: scn("dewGap"), condGap: scn("condGap"), hasDew: codesFor(s, "dew").length > 0, dMax: dMax, nMin: nMin,
      diffT: manualDiff(s, mine, rows, "temp"), diffH: manualDiff(s, mine, rows, "hum") };
  }
  /* الحساس ناقص القياس اليدوي لنفس الموقع والوقت (القراءة اليدوية مقابل آخر قراءة للحساس خلال ساعة) */
  function manualDiff(s, docs, rows, k) {
    var keys = manualKeys(s, k), by = {}, out = [];
    if (!keys.length) return null;
    docs.forEach(function (d) { by[d.date] = d; });
    rows.forEach(function (e) {
      if (e.type !== "temp" || !e.v || !e.time || !by[e.date]) return;
      var vals = keys.map(function (q) { return typeof num === "function" ? num(e.v[q]) : +e.v[q]; }).filter(function (x) { return x != null && isFinite(x); });
      if (!vals.length) return;
      var man = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length, hm2 = String(e.time).split(":");
      var sv = sampler(ptsOf(by[e.date], s, k))((+hm2[0]) * 3600 + (+hm2[1] || 0) * 60);
      if (sv != null) out.push(sv - man);
    });
    if (!out.length) return null;
    var a = out.reduce(function (x, y) { return x + y; }, 0) / out.length, ab = out.reduce(function (x, y) { return x + Math.abs(y); }, 0) / out.length;
    return { n: out.length, avg: a, abs: ab };
  }

  /* ================= الأزرار ================= */
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-sact]"); if (!b) return;
    var a = b.getAttribute("data-sact");
    if (a === "period") { X.period = +b.getAttribute("data-n") || 1; lsS("gs_sens_period", X.period); }
    else if (a === "kind") { X.kind = b.getAttribute("data-k"); lsS("gs_sens_kind", X.kind); }
    else if (a === "toggle") { var id = b.getAttribute("data-id"); if (X.off[id]) delete X.off[id]; else X.off[id] = 1; lsS("gs_sens_off", JSON.stringify(X.off)); }
    else if (a === "refresh") { X.key = ""; loadDays(true); if (typeof toast === "function") toast("جارٍ تحديث القراءات"); }
    else if (a === "export") { exportX(b); return; }
    else if (a === "raw") { X.raw = !X.raw; }
    else if (a === "heat") { X.heat = !X.heat; }
    else if (a === "set") { openSet(); return; }
    else if (a === "saveSet") { saveSet(b); return; }
    else if (a === "offSave") { saveOff(b); return; }
    else if (a === "offSug") { [["t", "data-t"], ["h", "data-h"]].forEach(function (x) { var v = b.getAttribute(x[1]), el = document.getElementById("off_" + x[0] + "_" + b.getAttribute("data-id")); if (el && v !== "") el.value = v; }); if (typeof toast === "function") toast("راجع الأرقام ثم اضغط حفظ التصحيح"); return; }
    else if (a === "setDef") { Object.keys(SDEF).forEach(function (k) { var el = document.getElementById("sn_" + k); if (el) el.value = SDEF[k]; }); return; }
    if (typeof render === "function") render(true);
  });

  return { view: view, bind: bind, start: start, selfTest: selfTest, report: report, strip: strip, _x: X };
})();
