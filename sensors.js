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
    vpdMin: 0.5, vpdMax: 1.2, heat: 27, rhRisk: 90, dewGap: 2, gradMax: 4, dliMin: 12, dliMax: 17, luxPpfd: 0.0185,
    msgHot: "الحرارة مرتفعة", msgCold: "الحرارة منخفضة", msgHumid: "الرطوبة مرتفعة: خطر أمراض فطرية", msgDry: "الجو جاف",
    msgOff: "حساس لا يرسل قراءات أو بطاريته ضعيفة: بلّغ المشرف"
  };
  function sc(k) { var o = (window.S && S.settings && S.settings.sens) || {}; var v = o[k]; return v != null && v !== "" ? v : SDEF[k]; }
  function scn(k) { var v = sc(k); return typeof num === "function" ? num(v) : +v; }
  function isSupU() { return typeof isSup === "function" && isSup(); }
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
      X.all = q.docs.map(function (d) { return d.data(); });
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
  function stOf(k, v, sec) {
    if (k === "vpd") { if (v == null) return null; return v < scn("vpdMin") ? "lo" : v > scn("vpdMax") ? "hi" : "ok"; }
    var c = KINDS[k] && KINDS[k].c; if (!c || v == null || typeof chk !== "function") return null;
    return chk(c, v, S.sec);
  }
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
      codes.forEach(function (c) { ((d.p || {})[c] || []).forEach(function (p) { if (p && p.v != null && isFinite(p.v)) pts.push({ t: t0 + p.t * 1000, y: +p.v }); }); });
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
    var out = []; codesFor(s, k).forEach(function (c) { ((doc.p || {})[c] || []).forEach(function (p) { if (p && p.v != null && isFinite(p.v)) out.push({ t: +p.t, v: +p.v }); }); });
    return out.sort(function (a, b) { return a.t - b.t; });
  }
  function sampler(pts) {
    var i = 0; return function (t) { if (!pts.length) return null; while (i + 1 < pts.length && pts[i + 1].t <= t) i++; var q = pts[i]; return q.t > t || t - q.t > HOLD ? null : q.v; };
  }
  function dayEnd(date) { return typeof todayStr === "function" && date === todayStr() ? Math.max(0, Math.min(86400, Math.floor((Date.now() - dayStart(date)) / 1000))) : 86400; }
  function dayMetrics(doc, s) {
    var T = sampler(ptsOf(doc, s, "temp")), H = sampler(ptsOf(doc, s, "hum")), Lx = sampler(ptsOf(doc, s, "lux"));
    var lo = num(cfg("airMin")), hi = num(cfg("airMax")), rlo = num(cfg("rhMin")), rhi = num(cfg("rhMax"));
    var vmin = scn("vpdMin"), vmax = scn("vpdMax"), heat = scn("heat"), risk = scn("rhRisk"), gap = scn("dewGap"), k = scn("luxPpfd"), h = STEP / 3600;
    var m = { cov: 0, inT: 0, heat: 0, hCov: 0, inH: 0, vCov: 0, inV: 0, risk: 0, dS: 0, dN: 0, dMax: null, nS: 0, nN: 0, nMin: null, vS: 0, vN: 0, lCov: 0, dli: 0, hasLux: codesFor(s, "lux").length > 0 };
    for (var t = 0, end = dayEnd(doc.date); t < end; t += STEP) {
      var tv = T(t), hv = H(t), lv = Lx(t), day = t >= 21600 && t < 64800;
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

  /* ================= الصفحة ================= */
  function view() {
    start();
    var list = sensorList(), sup = isSupU();
    var h = '<section class="sec"><div class="sec-h"><h2>الحساسات · ' + (SECS[S.sec] ? SECS[S.sec].icon + " " + SECS[S.sec].name : "") + '</h2><button class="btn sm" type="button" data-sact="refresh">تحديث</button></div>' + statusHTML() + "</section>";
    if (X.err && !X.user) return h;
    if (!X.user) return h + '<div class="empty">جارٍ الاتصال بالحساسات…</div>';
    if (!Object.keys(X.sensors).length) return h + '<div class="empty">لم تصل بيانات حساسات بعد.</div>';
    if (!list.length) return h + '<div class="empty">لا توجد حساسات في ' + SECS[S.sec].name + '. حدّد قسم كل حساس من ورقة Devices في جدول Tuya Sensors.</div>';

    h += '<section class="sec">' + alertsHTML(list) + '<div class="grid2">' + list.map(cardHTML).join("") + "</div></section><!--sn-night-->";

    var kinds = kindsAvail(list); if (kinds.indexOf(X.kind) < 0) X.kind = kinds[0];
    var R = rangeOf(), isToday = typeof todayStr === "function" && R.to === todayStr();
    var dayLab = isToday ? "اليوم" : (typeof fmtShort === "function" ? fmtShort(R.to) : R.to);
    var periods = sup ? [[1, dayLab], [7, "7 أيام"], [30, "30 يوم"]] : [[1, dayLab], [7, "7 أيام"]];
    h += '<section class="sec"><h2>' + (sup ? "السجل" : "القراءات") + "</h2>" +
      '<div class="seg" role="group" aria-label="الفترة">' + periods.map(function (p) { return '<button type="button" data-sact="period" data-n="' + p[0] + '" aria-pressed="' + (P() === p[0]) + '">' + E(p[1]) + "</button>"; }).join("") + "</div>" +
      '<div class="seg wrap" role="group" aria-label="القياس">' + kinds.map(function (k) { return '<button type="button" data-sact="kind" data-k="' + E(k) + '" aria-pressed="' + (X.kind === k) + '">' + E(kindInfo(k, list[0]).l) + "</button>"; }).join("") + "</div>";
    var withK = list.filter(function (s) { return codesFor(s, X.kind).length; });
    if (withK.length > 1) h += '<div class="sn-pick">' + withK.map(function (s) { var on = !X.off[s.id]; return '<button type="button" class="sn-chip" data-sact="toggle" data-id="' + E(s.id) + '" aria-pressed="' + on + '"><i style="background:' + colorOf(s) + '"></i><bdi>' + E(nm(s)) + "</bdi></button>"; }).join("") + "</div>";
    loadDays(false);
    if (!X.days || X.key !== R.from + "|" + R.to) return h + '<div class="card"><div class="empty" style="border:0">جارٍ تحميل القراءات…</div></div></section>';
    var ki = kindInfo(X.kind, withK[0]);
    var night = nightHTML(list, R.to); h = h.replace("<!--sn-night-->", function () { return night; });
    h += '<div class="card chart sn-chart" id="snChart"></div><p class="help muted sn-hint">المس الرسم أو حرّك إصبعك عليه لترى الوقت والقيمة بالضبط.' + (X.kind === "vpd" ? " VPD يقيس قوة سحب الهواء للماء من الورقة. المنطقة المظللة هي المثالي (" + F(scn("vpdMin"), 1) + "–" + F(scn("vpdMax"), 1) + " kPa): أقل منها جو رطب يضعف النتح ووصول الكالسيوم (احتراق الحواف وأمراض)، وأعلى منها جو جاف يُجهد النبات. انخفاضه في الليل طبيعي، والمهم قيمته في النهار." : "") + (X.kind === "dew" || X.kind === "vpd" ? " في النافذة بجانب كل قيمة: الحرارة والرطوبة اللتان حُسبت منهما." : "") + (X.kind === "dew" ? " نقطة الندى هي الحرارة التي يبدأ عندها تكثّف الماء على الأوراق: كلما اقتربت من حرارة الجو (أقل من " + F(scn("dewGap")) + "°) زاد خطر الأمراض الفطرية." : "") + (P() === 1 && (X.kind === "temp" || X.kind === "hum") && withK.some(function (s) { return manualKeys(s, X.kind).length; }) ? " المربعات = القراءات اليدوية لنفس الموقع." : "") + "</p>";
    if (sup && P() === 1) h += rawHTML(withK.filter(function (s) { return !X.off[s.id]; }), ki, R.to);
    h += "</section>";
    if (!sup) return h;
    h += analysisHTML(list, R) + profileHTML(withK.filter(function (s) { return !X.off[s.id]; }), ki) + coolingHTML(list, R) + summaryHTML(withK, ki, R);
    h += '<section class="sec"><button class="btn block" type="button" data-sact="export">تنزيل قراءات الفترة (Excel)</button><button class="btn block" type="button" data-sact="set">إعدادات الحساسات وحدود التحليل</button></section>';
    h += '<p class="muted sn-foot">لتغيير اسم الحساس أو قسمه أو موقعه: ورقة <b>Devices</b> في جدول Tuya Sensors. يظهر التغيير مع القراءة التالية.</p>';
    return h;
  }

  /* ================= حالة الأجواء الآن (للجميع) ================= */
  function alertsHTML(list) {
    var lo = num(cfg("airMin")), hi = num(cfg("airMax")), rlo = num(cfg("rhMin")), rhi = num(cfg("rhMax")), heat = scn("heat"), risk = scn("rhRisk");
    var g = { hot: [], cold: [], humid: [], dry: [], off: [] }, fresh = 0;
    list.forEach(function (s) {
      var seen = ms(s.lastSeen), stale = !seen || Date.now() - seen > STALE_H * 3600e3, sn = nm(s), last = s.last || {}, batt = null;
      Object.keys(last).forEach(function (c) { if (kindOf(c) === "batt" && last[c]) batt = last[c].v; });
      if (stale || (batt != null && batt < 20)) { g.off.push(sn); if (stale) return; }
      fresh++;
      Object.keys(last).forEach(function (c) {
        var k = kindOf(c), v = last[c] && last[c].v; if (v == null) return;
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
  function rng(a, b, u, d) { return '<bdi dir="ltr" class="num">' + F(a, d || 0) + "–" + F(b, d || 0) + (u || "") + "</bdi>"; }
  function colHead(s) { return '<th><i class="sn-sw" style="background:' + colorOf(s) + '"></i><bdi>' + E(nm(s)) + "</bdi></th>"; }
  function hrs(x, of) { return x == null ? "—" : '<b class="num">' + F(x, 1) + "</b> س" + (of ? ' <small class="muted num">' + F(of ? x / of * 100 : 0) + "%</small>" : ""); }
  function analysisHTML(list, R) {
    var ss = list.filter(function (s) { return codesFor(s, "temp").length || codesFor(s, "hum").length || codesFor(s, "lux").length; });
    var M = ss.map(metricsFor); if (!M.some(Boolean)) return "";
    var lo = num(cfg("airMin")), hi = num(cfg("airMax")), rlo = num(cfg("rhMin")), rhi = num(cfg("rhMax")), vmin = scn("vpdMin"), vmax = scn("vpdMax"), per = P() > 1;
    var cl = function (bad, warn) { return bad ? "sn-bad" : warn ? "sn-warn" : ""; };
    var rows = [
      ["حرارة النهار <small>6ص–6م · متوسط / أعلى</small>", function (m) { return m.tDay == null ? "—" : '<b class="num">' + F(m.tDay, 1) + '</b> / <b class="num ' + cl(m.dMax > hi) + '">' + F(m.dMax, 1) + "</b>°"; }],
      ["حرارة الليل <small>متوسط / أدنى</small>", function (m) { return m.tNight == null ? "—" : '<b class="num">' + F(m.tNight, 1) + '</b> / <b class="num ' + cl(m.nMin < lo) + '">' + F(m.nMin, 1) + "</b>°"; }],
      ["الحرارة ضمن الحد <small>" + rng(lo, hi, "°") + "</small>", function (m) { return m.cov ? hrs(m.inT, m.cov) : "—"; }],
      ["ساعات الإجهاد الحراري <small class=\"num\">فوق " + F(scn("heat")) + "°</small>", function (m) { return m.cov ? '<span class="' + cl(m.heat >= 3, m.heat > 0.4) + '">' + hrs(m.heat) + "</span>" : "—"; }],
      ["الرطوبة ضمن الحد <small>" + rng(rlo, rhi, "%") + "</small>", function (m) { return m.hCov ? hrs(m.inH, m.hCov) : "—"; }],
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
        var st = stOf(X.kind, x.m, r.s.sec);
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
    var lo = null, hi = null, c = KINDS[X.kind] && KINDS[X.kind].c;
    if (c && typeof cfg === "function" && CHECK[c]) { lo = num(cfg(CHECK[c][0])); hi = num(cfg(CHECK[c][1])); }
    if (X.kind === "vpd") { lo = scn("vpdMin"); hi = scn("vpdMax"); }
    var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys), sp = Math.max(1, ymax - ymin);
    if (lo != null && lo > ymin - sp * 1.5) ymin = Math.min(ymin, lo);
    if (hi != null && hi < ymax + sp * 1.5) ymax = Math.max(ymax, hi);
    var pad = (ymax - ymin) * 0.12 || 1; ymin -= pad; ymax += pad; if (Math.min.apply(null, ys) >= 0 && ymin < 0) ymin = 0;
    var Xh = function (h) { return L + (h + 0.5) / 24 * (W - L - Rr); }, Y = function (y) { return T + (1 - (y - ymin) / (ymax - ymin)) * (H - T - B); };
    var g = "";
    for (var i = 0; i <= 4; i++) { var v = ymin + (ymax - ymin) * i / 4; g += '<line class="gl" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/><text class="ax" x="' + (L - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + F(v, (ymax - ymin) < 6 ? 1 : 0) + "</text>"; }
    if (lo != null && hi != null) { var y1 = Math.max(T, Y(Math.min(hi, ymax))), y2 = Math.min(H - B, Y(Math.max(lo, ymin))); if (y2 > y1) g = '<rect x="' + L + '" width="' + (W - L - Rr) + '" y="' + y1.toFixed(1) + '" height="' + (y2 - y1).toFixed(1) + '" fill="var(--band)"/>' + g; }
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
    var lastT = function (s) { var l = s.last || {}, v = null; Object.keys(l).forEach(function (c) { if (kindOf(c) === "temp" && l[c] && ms(l[c].at) && Date.now() - ms(l[c].at) < STALE_H * 3600e3) v = l[c].v; }); return v; };
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
        if (here) { var st = stOf(X.kind, here.v, s.sec); return '<td class="num sn-real ' + (bad(st) ? "sn-bad" : "") + '" title="' + hm(t0 + here.t * 1000) + '">' + F(here.v, ki.d) + "</td>"; }
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
    var nf = [["vpdMin", "VPD الأدنى المثالي", "kPa"], ["vpdMax", "VPD الأعلى المثالي", "kPa"], ["heat", "حد الإجهاد الحراري", "°C"], ["rhRisk", "رطوبة خطر الأمراض", "%"], ["dewGap", "الاقتراب من نقطة الندى", "°C"], ["gradMax", "أقصى فرق مقبول بين أول البيت وآخره", "°C"], ["dliMin", "DLI الأدنى", "mol"], ["dliMax", "DLI الأعلى", "mol"]];
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

  function cardHTML(s) {
    var last = s.last || {}, codes = Object.keys(last), seen = ms(s.lastSeen), stale = seen && Date.now() - seen > STALE_H * 3600e3;
    var anyBad = false, batt = null, vals = [];
    codes.sort(function (a, b) { var ka = ORDER.indexOf(kindOf(a)), kb = ORDER.indexOf(kindOf(b)); return (ka < 0 ? 99 : ka) - (kb < 0 ? 99 : kb); }).forEach(function (c) {
      var k = kindOf(c), v = last[c] && last[c].v; if (v == null) return;
      if (k === "batt") { batt = v; return; }
      var ki = kindInfo(k, s), st = stOf(k, v, s.sec); if (bad(st)) anyBad = true;
      vals.push('<span class="sn-v' + (bad(st) ? " bad" : "") + '"><b class="num">' + F(v, ki.d) + "</b><small>" + E(ki.u) + "</small><i>" + E(ki.l) + "</i></span>");
    });
    var pl = posLabel(s), where = s.loc || (pl && pl !== nm(s) ? pl : "") || (secs(s.sec).length ? secs(s.sec).map(function (x) { return x === "g" ? "المعدات" : SECS[x] ? SECS[x].name : x; }).join(" + ") : "");
    return '<div class="stat sn-card' + (anyBad ? " s-bad" : stale ? " s-warn" : "") + '">' +
      '<div class="sn-h"><i style="background:' + colorOf(s) + '"></i><b dir="auto">' + E(nm(s)) + "</b></div>" +
      '<span class="sub">' + (where ? E(where) : '<span class="pill n">لم يُحدَّد الموقع</span>') + "</span>" +
      '<div class="sn-vals">' + (vals.join("") || '<span class="muted">لا قراءات</span>') + "</div>" +
      '<span class="sub' + (stale ? " sn-stale" : "") + '">' + (seen ? (stale ? "آخر قراءة " : "") + ago(seen) : "—") +
      (batt != null ? ' · <span class="' + (batt < 20 ? "sn-low" : "") + '">🔋 ' + F(batt) + "%</span>" : "") + "</span>" + (stale ? "" : vpdHTML(s) + dewHTML(s) + ydayHTML(s)) + "</div>";
  }

  /* ================= أمس في نفس الوقت، والليلة الماضية (للجميع) ================= */
  function docOf(s, date) {
    return (X.all || []).filter(function (d) { return d.deviceId === s.id && d.date === date && secOk(d.sec != null && d.sec !== "" ? d.sec : s.sec); })[0] || null;
  }
  function lastOfKind(s, k) { var l = s.last || {}, v = null; Object.keys(l).forEach(function (c) { if (kindOf(c) === k && l[c] && l[c].v != null) v = +l[c].v; }); return v; }
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
  /* الليلة = من 6 مساءً أمس حتى 6 صباحاً في اليوم المختار (نفس تقسيم النهار والليل في التحليل) */
  function nightHTML(list, date) {
    if (!X.all || typeof addDays !== "function") return "";
    var prev = addDays(date, -1), t0 = dayStart(prev), endT = Math.min(dayStart(date) + 21600e3, Date.now());
    if (endT <= t0 + 64800e3) return "";
    var live = endT < dayStart(date) + 21600e3, lo = num(cfg("airMin")), risk = scn("rhRisk"), rows = [];
    list.forEach(function (s) {
      var pick = function (k) {
        var a = [], d1 = docOf(s, prev), d2 = docOf(s, date);
        if (d1) ptsOf(d1, s, k).forEach(function (p) { if (p.t >= 64800) a.push({ t: t0 + p.t * 1000, v: p.v }); });
        if (d2) ptsOf(d2, s, k).forEach(function (p) { if (p.t < 21600) a.push({ t: dayStart(date) + p.t * 1000, v: p.v }); });
        return a;
      };
      var T = pick("temp"), H = pick("hum"); if (!T.length && !H.length) return;
      var mg = null, hi = 0;
      if (T.length && H.length) { H.sort(function (a, b) { return a.t - b.t; }); T.slice().sort(function (a, b) { return a.t - b.t; }).forEach(function (p) {
        while (hi + 1 < H.length && H[hi + 1].t <= p.t) hi++; var q = H[hi]; if (!q || q.t > p.t || p.t - q.t > HOLD * 1000) return;
        var g = p.v - dewOf(p.v, q.v); if (!mg || g < mg.v) mg = { t: p.t, v: g };
      }); }
      var mn = T.reduce(function (b, p) { return !b || p.v < b.v ? p : b; }, null), mx = H.reduce(function (b, p) { return !b || p.v > b.v ? p : b; }, null), parts = [];
      if (mn) parts.push('أدنى حرارة <b class="num' + (mn.v < lo ? " sn-bad" : "") + '"><bdi dir="ltr">' + F(mn.v, 1) + '°</bdi></b> <small class="muted num">' + tLabel(mn.t) + "</small>");
      if (mx) parts.push('أعلى رطوبة <b class="num' + (mx.v >= risk ? " sn-bad" : "") + '"><bdi dir="ltr">' + F(mx.v) + '%</bdi></b> <small class="muted num">' + tLabel(mx.t) + "</small>");
      if (mg) parts.push('أقل هامش ندى <b class="num' + (mg.v <= scn("dewGap") ? " sn-bad" : "") + '"><bdi dir="ltr">' + F(mg.v, 1) + '°</bdi></b> <small class="muted num">' + tLabel(mg.t) + "</small>");
      rows.push('<li><i style="background:' + colorOf(s) + '"></i><b><bdi>' + E(nm(s)) + "</bdi>:</b> " + parts.join(" · ") + "</li>");
    });
    if (!rows.length) return "";
    return '<section class="sec"><h2>' + (live ? "الليلة حتى الآن" : "الليلة الماضية") + ' <small class="muted">6 مساءً – 6 صباحاً</small></h2><ul class="sn-notes">' + rows.join("") + "</ul>" +
      '<p class="help sn-hint">الأحمر: حرارة أقل من الحد الأدنى، أو رطوبة ' + F(risk) + "% فأكثر، أو هامش ندى " + F(scn("dewGap")) + "° أو أقل (خطر تكثّف وأمراض فطرية). هامش الندى = حرارة الجو ناقص نقطة الندى.</p></section>";
  }

  function summaryHTML(list, ki, R) {
    var dates = [], d = R.to; for (var i = 0; i < P(); i++) { dates.push(d); d = typeof addDays === "function" ? addDays(d, -1) : d; }
    var by = {}; (X.days || []).forEach(function (doc) { by[doc.date + "|" + doc.deviceId] = doc; });
    var cell = function (s, date) {
      var doc = by[date + "|" + s.id]; if (!doc || !secOk(doc.sec != null && doc.sec !== "" ? doc.sec : s.sec)) return '<td class="muted">—</td>';
      var mn = null, mx = null, sm = 0, n = 0;
      if (X.kind === "dew" || X.kind === "vpd") ptsOf(doc, s, X.kind).forEach(function (p) { mn = mn == null ? p.v : Math.min(mn, p.v); mx = mx == null ? p.v : Math.max(mx, p.v); sm += p.v; n++; });
      else codesFor(s, X.kind).forEach(function (c) { var q = (doc.s || {})[c]; if (!q || !q.n) return; mn = mn == null ? q.min : Math.min(mn, q.min); mx = mx == null ? q.max : Math.max(mx, q.max); sm += q.sum || 0; n += q.n; });
      if (!n) return '<td class="muted">—</td>';
      var b1 = bad(stOf(X.kind, mn, s.sec)), b2 = bad(stOf(X.kind, mx, s.sec));
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
    var ys = all.map(function (p) { return p.y; }), lo = null, hi = null, c = KINDS[X.kind] && KINDS[X.kind].c;
    if (c && typeof cfg === "function" && CHECK[c]) { lo = num(cfg(CHECK[c][0])); hi = num(cfg(CHECK[c][1])); }
    if (X.kind === "vpd") { lo = scn("vpdMin"); hi = scn("vpdMax"); }
    var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
    // نُظهر نطاق الحدود فقط إن كان قريباً من القراءات، كي لا تنضغط الخطوط
    var span0 = Math.max(1, ymax - ymin);
    if (lo != null && lo > ymin - span0 * 1.5) ymin = Math.min(ymin, lo);
    if (hi != null && hi < ymax + span0 * 1.5) ymax = Math.max(ymax, hi);
    var padv = (ymax - ymin) * 0.12 || 1; ymin -= padv; ymax += padv; if (Math.min.apply(null, ys) >= 0 && ymin < 0) ymin = 0;
    var X_ = function (t) { return L + (t - t0) / (t1 - t0) * (W - L - Rr); }, Y = function (y) { return T + (1 - (y - ymin) / (ymax - ymin)) * (H - T - B); };
    var g = "", dec = ki.d;
    for (var i = 0; i <= 4; i++) { var v = ymin + (ymax - ymin) * i / 4; g += '<line class="gl" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/><text class="ax" x="' + (L - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + F(v, (ymax - ymin) < 6 ? 1 : 0) + "</text>"; }
    var band = "";
    if (lo != null && hi != null) { var yb1 = Math.max(T, Y(Math.min(hi, ymax))), yb2 = Math.min(H - B, Y(Math.max(lo, ymin))); if (yb2 > yb1) band = '<rect x="' + L + '" width="' + (W - L - Rr) + '" y="' + yb1.toFixed(1) + '" height="' + (yb2 - yb1).toFixed(1) + '" fill="var(--band)"/>'; }
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
      var dots = many ? "" : sr.pts.map(function (p) { return '<circle cx="' + X_(p.t).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="2.6" fill="' + (bad(stOf(X.kind, p.y, sr.s.sec)) ? "var(--bad)" : sr.col) + '"/>'; }).join("");
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
        var st = stOf(X.kind, q.y, sr.s.sec);
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
        (d.p[c] || []).forEach(function (p) { rows.push([t0 + p.t * 1000, d.date, hm(t0 + p.t * 1000), nm(s), secName, loc, ki.l, p.v, u]); });
        var q = (d.s || {})[c]; if (q && q.n) sumr.push([d.date, nm(s), ki.l, q.min, Math.round(q.sum / q.n * 100) / 100, q.max, q.n, u]);
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
    var pill = nBad ? '<span class="pill bad">' + nBad + " خارج الحدود</span>" : nOff ? '<span class="pill warn">' + nOff + " متوقف</span>" : '<span class="pill ok">ضمن الحدود</span>';
    return '<section class="sec"><button class="mybar snbar" type="button" data-act="goSens"><span class="mb-t">🌡️ الحساسات الآن ' + pill + '</span><span class="muted">' + (newest ? ago(newest) : "") + " ‹</span>" +
      '<span class="snb-row">' + chips + "</span></button></section>";
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
    var tot = { cov: 0, inT: 0, heat: 0, hCov: 0, inH: 0, risk: 0, vCov: 0, inV: 0 }, tD = [], tN = [], vD = [], dMax = null, nMin = null;
    var stat = function (doc, k) {
      var mn = null, mx = null, sm = 0, n = 0;
      codesFor(s, k).forEach(function (c) { var q = (doc.s || {})[c]; if (!q || !q.n) return; mn = mn == null ? q.min : Math.min(mn, q.min); mx = mx == null ? q.max : Math.max(mx, q.max); sm += q.sum || 0; n += q.n; });
      return n ? { mn: mn, mx: mx, av: sm / n } : null;
    };
    var days = mine.map(function (doc) {
      var m = dayMetrics(doc, s);
      Object.keys(tot).forEach(function (k) { tot[k] += m[k] || 0; });
      if (m.tDay != null) tD.push(m.tDay); if (m.tNight != null) tN.push(m.tNight); if (m.vDay != null) vD.push(m.vDay);
      if (m.dMax != null) dMax = dMax == null ? m.dMax : Math.max(dMax, m.dMax);
      if (m.nMin != null) nMin = nMin == null ? m.nMin : Math.min(nMin, m.nMin);
      return { date: doc.date, t: stat(doc, "temp"), h: stat(doc, "hum"), cov: m.cov, inT: m.inT, heat: m.heat, hCov: m.hCov, inH: m.inH, risk: m.risk, vDay: m.vDay, vCov: m.vCov, inV: m.inV };
    });
    var mean = function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; };
    return { id: s.id, name: nm(s), col: colorOf(s), days: days, tot: tot, tDay: mean(tD), tNight: mean(tN), vDay: mean(vD), vMin: scn("vpdMin"), vMax: scn("vpdMax"), dMax: dMax, nMin: nMin,
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
    else if (a === "setDef") { Object.keys(SDEF).forEach(function (k) { var el = document.getElementById("sn_" + k); if (el) el.value = SDEF[k]; }); return; }
    if (typeof render === "function") render(true);
  });

  return { view: view, bind: bind, start: start, selfTest: selfTest, report: report, strip: strip, _x: X };
})();
