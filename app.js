/* GREEN SIDE 3.7.0 — متابعة المشتل والأبراج في البيت المحمي
   البيانات في Firebase Firestore، والدخول عبر Firebase Authentication.
   القسمان: n = المشتل (نظام مفتوح)، t = الأبراج (نظام مغلق). المعدات: g.
   لإضافة نوع تسجيل: أضفه في TYPES_N أو TYPES_T وأضف اسمه إلى ORDER. */
"use strict";
var APP_VERSION = "3.7.0";

/* ================= constants ================= */
var SECS = { n: { name: "المشتل", icon: "🌱", sys: "نظام مفتوح" }, t: { name: "الأبراج", icon: "🗼", sys: "نظام مغلق" } };
var DEF = {
  ecMin: 800, ecMax: 1500, ecTarget: 1200, phMin: 5.5, phMax: 6.5, wtMin: 18, wtMax: 26,
  airMin: 15, airMax: 32, rhMin: 50, rhMax: 85, luxMin: 10000, luxMax: 40000,
  /* حدود النهار والليل للجو (المشتل = مرحلة الشتلة) */
  airDayMin: 18, airDayMax: 28, airNightMin: 12, airNightMax: 22, rhDayMin: 50, rhDayMax: 85, rhNightMin: 55, rhNightMax: 92, avgMin: 18, avgMax: 23, dayFrom: 6, dayTo: 18,
  nMix: 1, nEcph: 3, nTemp: 5, nLight: 5, nIrr: 3, nPhoto: 1, nNote: 1, pumpL: 20, tankL: 25, zoneNote: "",
  flowLitres: 60, flowMinutes: 1, flowSeconds: 6, atc: false, ecCoef: 0.019, battHours: 24, battMaxCharge: 8, calDays: 14, capacity: 6000, capR: 3000, capL: 3000, daysToTransplant: 21, daysToHarvest: 35,
  levelUnit: "L", lPerCm: 10, useLearned: true, noteCats: [], atcChecked: "",
  caFirst: 7, caEvery: 7, caUntil: 42, insEvery: 0, fungEvery: 0,
  doses: [2.5, 5, 7.5, 10, 12.5], fullDose: 12.5,
  sched: { n: { mix: ["08:00"], irr: ["08:00", "12:00", "16:00"], temp: ["08:00", "10:00", "12:00", "14:00", "16:00"], light: ["08:00", "10:00", "12:00", "14:00", "16:00"], note: ["16:00"], photo: ["16:00"] }, t: {} },
  formula: { name: "خس ليما — مرحلة N (المشتل)", fullA: 10, fullB: 10, ecFull: 1330, ecRaw: 400, date: "2026-10-07" }
};
var DEF_T = {
  ecMin: 1200, ecMax: 1800, ecTarget: 1500, phMin: 5.7, phMax: 6.3, wtMin: 18, wtMax: 24,
  airMin: 15, airMax: 30, rhMin: 50, rhMax: 80, luxMin: 15000, luxMax: 45000,
  /* الأبراج = مرحلة النمو حتى الحصاد */
  airDayMin: 16, airDayMax: 27, airNightMin: 10, airNightMax: 18, rhDayMin: 50, rhDayMax: 80, rhNightMin: 55, rhNightMax: 90, avgMin: 17, avgMax: 21,
  nEcph: 3, nTemp: 3, nLight: 3, nRefill: 1, nPump: 1, nPhoto: 1, tankL: 1000,
  zoneNote: "البداية: الأبراج جهة الخلايا · الوسط: منتصف البيت · النهاية: الأبراج جهة المراوح"
};
var CHECK = { ec: ["ecMin", "ecMax"], ph: ["phMin", "phMax"], wt: ["wtMin", "wtMax"], air: ["airMin", "airMax"], rh: ["rhMin", "rhMax"], lux: ["luxMin", "luxMax"] };
var ZONES = ["البداية", "الوسط", "النهاية"], ZK = ["b", "m", "e"], LEVELS = ["أسفل", "وسط", "أعلى"];
var ZONE_N = ["كل المشتل"].concat(ZONES), ZONE_T = ["كل البيت"].concat(ZONES), LEVEL_OPTS = ["كل البرج"].concat(LEVELS);
var SIDES = ["اليمين", "اليسار"], SK = ["r", "l"], SIDE_FULL = ["الجهة اليمنى", "الجهة اليسرى"];
/* grids: towers = 3 zones × 3 levels (keys air_b1…), nursery = 2 sides × 3 positions (keys air_r1…) */
var DIMS = {
  t: { rows: ZK, rowL: ZONES, cols: ["1", "2", "3"], colL: LEVELS, rowName: "المنطقة", colName: "المستوى", all: "البيت" },
  n: { rows: SK, rowL: SIDES, cols: ["1", "2", "3"], colL: ZONES, rowName: "الجهة", colName: "الموقع", all: "المشتل" }
};
var PH_ADJ = ["لا شيء", "خافض pH فقط", "رافع pH فقط", "خافض ورافع معاً"];
var REFILL_MODES = ["تخفيف: ماء فقط", "تعويض قياسي: محلول بتركيز الهدف", "تعزيز: محلول مُعزَّز"];
var NK = { air: ["air1", "air2", "air3"], rh: ["rh1", "rh2", "rh3"], lux: ["l1", "l2", "l3"] };
var MNAME = { air: "حرارة الجو", rh: "الرطوبة", lux: "الضوء" };
var IC = {
  mix: '<path d="M9 3h6M10 3v6l-5.2 9.2A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.8L14 9V3"/><path d="M7.5 15h9"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2M8 18h2M14 18h2"/>',
  ecph: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/><circle cx="12" cy="18" r="1.4"/>',
  temp: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
  irr: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>',
  light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  note: '<path d="M5 20c0-9 6-15 15-15 0 9-6 15-14 15"/><path d="M5 20l8.5-8.5"/>',
  sow: '<path d="M12 21v-8"/><path d="M12 13c0-4 3-7 7-7 0 4-3 7-7 7z"/><path d="M12 15c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z"/><path d="M5 21h14"/>',
  photo: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  refill: '<path d="M5 7h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M5 12h14"/><path d="M12 2v6M9.5 5.5 12 8l2.5-2.5"/>',
  pump: '<circle cx="12" cy="12" r="8"/><path d="M12 12l4-3"/><path d="M12 4v2M20 12h-2M6 12H4"/>',
  xplant: '<path d="M7 20V11"/><path d="M7 11c0-3 2-5 5-5"/><path d="M14 3l3 3-3 3"/><path d="M17 6h-5"/><path d="M4 20h16"/>',
  harvest: '<path d="M5 9h14l-1.5 11h-11z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  batt: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 11v2"/><path d="M11.5 9l-2 3h4l-2 3"/>',
  cal: '<path d="M4 18 18 4l3 3L7 21z"/><path d="M8 14l2 2M11 11l2 2M14 8l2 2"/>',
  gallery: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  today: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  add: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  rep: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  sup: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  sens: '<path d="M11 13.8V5a2 2 0 0 0-4 0v8.8a3.6 3.6 0 1 0 4 0z"/><path d="M9 9v6"/><path d="M15 8.5a4.5 4.5 0 0 1 0 7M18 6a8 8 0 0 1 0 12"/>',
  spray: '<path d="M9 8h6v12a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/><path d="M10 8V5h4v3"/><path d="M14 5h3l2-2"/><path d="M19 7h2M19 10l1.5 1M19 4.5l1.5-1"/>'
};
function ico(k, w) { w = w || 24; return '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[k] || IC.note) + "</svg>"; }

/* ================= record types ================= */
function lvlUnit() { return cfg("levelUnit") === "cm" ? "سم" : "لتر"; }
function phFields(lbl) {
  return [
    { k: "phRaw", l: lbl || "pH قبل الضبط", t: "n", u: "pH", grp: "ضبط pH", comp: "ph" },
    { k: "phAdj", l: "مُعدّل pH المستخدم", t: "s", o: PH_ADJ, w: "full" },
    { k: "phDownMl", l: "كمية الخافض (حمض)", t: "n", u: "مل", show: function (v) { return v.phAdj === PH_ADJ[1] || v.phAdj === PH_ADJ[3]; } },
    { k: "phUpMl", l: "كمية الرافع", t: "n", u: "مل", show: function (v) { return v.phAdj === PH_ADJ[2] || v.phAdj === PH_ADJ[3]; } },
    { k: "ph", l: "pH بعد الضبط", t: "n", u: "pH", req: 1, c: "ph", comp: "ph", w: "full" }
  ];
}
var MEMO = { k: "memo", l: "ملاحظة", t: "x", w: "full" };
function mixFields() {
  return [
    { k: "time", l: "وقت الخلط", t: "t", req: 1, w: "full" },
    { k: "ecRaw", l: "أملاح ماء المصدر", t: "n", u: "µS/cm", grp: "1. ماء المصدر", comp: "ec" },
    { k: "water", l: "كمية الماء", t: "n", u: "لتر", req: 1, def: "tankL" },
    { k: "mlA", l: "محلول A المستخدم", t: "n", u: "مل", req: 1, grp: "2. السماد" },
    { k: "mlB", l: "محلول B المستخدم", t: "n", u: "مل", req: 1 },
    { k: "wt", l: "حرارة ماء المحلول", t: "n", u: "°C", req: 1, c: "wt", grp: "3. القياس بعد الخلط" },
    { k: "ec", l: "الأملاح بعد الخلط", t: "n", u: "µS/cm", req: 1, c: "ec", comp: "ec" }
  ].concat(phFields(), [MEMO]);
}
var ECPH_FIELDS = [
  { k: "time", l: "وقت القراءة", t: "t", req: 1, w: "full" },
  { k: "wt", l: "حرارة الماء", t: "n", u: "°C", req: 1, c: "wt", w: "full" },
  { k: "ec", l: "الأملاح", t: "n", u: "µS/cm", req: 1, c: "ec", comp: "ec" },
  { k: "ph", l: "pH", t: "n", u: "pH", req: 1, c: "ph", comp: "ph" },
  MEMO
];
var NOTE_CATS = ["تعب / ذبول", "إصابة حشرية", "مرض فطري أو بكتيري", "اصفرار / نقص عناصر", "حروق أو إجهاد حراري", "رش / علاج", "صيانة / عطل", "أخرى"];
var NOTE_NONE = "لا يوجد ملاحظات", NOTE_OTHER = "نوع آخر";
function noteCats() { var c = (Array.isArray(S.settings.noteCats) ? S.settings.noteCats : []).filter(function (x) { return x && NOTE_CATS.indexOf(x) < 0; }); return [NOTE_NONE].concat(NOTE_CATS.slice(0, -1), c, [NOTE_OTHER]); }
function noteHas(v) { return v.cat !== NOTE_NONE; }
function noteOther(v) { return v.cat === NOTE_OTHER; }
var NSIDE_LOC = ["كل المشتل"].concat(SIDES);
/* الرش: تغذية ورقية بالكالسيوم أو مبيد وقائي/علاجي. فترة الأمان (PHI) تمنع الحصاد قبل انقضائها */
var SPRAY_K = ["رش كالسيوم (تغذية ورقية)", "مبيد حشري وقائي", "مبيد فطري وقائي", "مبيد علاجي (حشري أو فطري)"];
function isPest(v) { return (v || {}).kind && v.kind !== SPRAY_K[0]; }
function sprayFields(zones) {
  return [
    { k: "time", l: "وقت الرش", t: "t", req: 1, w: "full" },
    { k: "kind", l: "نوع الرش", t: "s", o: SPRAY_K, req: 1, w: "full" },
    { k: "product", l: "اسم المنتج", t: "x", req: 1, w: "full" },
    { k: "ai", l: "المادة الفعالة", t: "x", w: "full", show: isPest },
    { k: "dose", l: "الجرعة", t: "x", w: "full", ph: "مثال: 2 مل لكل لتر" },
    { k: "vol", l: "كمية المحلول المرشوش", t: "n", u: "لتر" },
    { k: "zone", l: "المكان", t: "s", o: zones },
    { k: "phi", l: "فترة الأمان قبل الحصاد", t: "n", u: "يوم", show: isPest },
    MEMO];
}
/* split: 1 → a new record shows the right and left sides on one screen and saves one record per filled side (fields marked ps).
   edit: 1 → field shown only when editing a saved record. blk → fields drawn together in one box. */
var TYPES_N = {
  mix: { label: "خلط محلول الري", short: "خلط المحلول", desc: "ماء المصدر، كمية A و B، الحرارة، الأملاح وpH", target: "nMix", fields: mixFields() },
  ecph: { label: "قراءة الأملاح و pH", short: "أملاح و pH", desc: "أصبحت داخل ري الشتلات", legacy: 1, fields: ECPH_FIELDS },
  temp: { label: "حرارة ورطوبة الجو", short: "الجو", desc: "اليمين واليسار × البداية والوسط والنهاية", target: "nTemp", needOne: ["air", "rh"], fields: [
    { k: "time", l: "وقت القياس", t: "t", req: 1, w: "full" },
    { k: "air", l: "حرارة الجو", t: "grid", dim: "n", u: "°C", c: "air" },
    { k: "rh", l: "الرطوبة النسبية", t: "grid", dim: "n", u: "%", c: "rh" },
    MEMO] },
  irr: { label: "ري الشتلات", short: "الري", desc: "قراءة المحلول (حرارة، أملاح، pH) ثم ري اليمين واليسار", target: "nIrr", needOne: ["liters_r", "liters_l", "liters"], fields: [
    { k: "time", l: "وقت الري", t: "t", req: 1, w: "full" },
    { k: "wt", l: "حرارة ماء المحلول", t: "n", u: "°C", req: 1, c: "wt", w: "full", blk: "rd", blkT: "1. قراءة المحلول قبل الري" },
    { k: "ec", l: "الأملاح", t: "n", u: "µS/cm", req: 1, c: "ec", comp: "ec", blk: "rd" },
    { k: "ph", l: "pH", t: "n", u: "pH", req: 1, c: "ph", comp: "ph", blk: "rd" },
    { k: "liters_r", l: "كمية المحلول", cl: "ري اليمين", t: "n", u: "لتر", blk: "r", blkT: "2. ري الجهة اليمنى" },
    { k: "mins_r", l: "مدة الري", cl: "مدة اليمين", t: "n", u: "دقيقة", blk: "r" },
    { k: "liters_l", l: "كمية المحلول", cl: "ري اليسار", t: "n", u: "لتر", blk: "l", blkT: "3. ري الجهة اليسرى" },
    { k: "mins_l", l: "مدة الري", cl: "مدة اليسار", t: "n", u: "دقيقة", blk: "l" },
    MEMO] },
  light: { label: "قياس الضوء", short: "الضوء", desc: "اليمين واليسار × البداية والوسط والنهاية", target: "nLight", needOne: ["lux"], fields: [
    { k: "time", l: "وقت القياس", t: "t", req: 1, w: "full" },
    { k: "sky", l: "حالة الجو", t: "s", o: ["مشمس", "غائم جزئياً", "غائم"], w: "full" },
    { k: "lux", l: "شدة الإضاءة", t: "grid", dim: "n", u: "lux", c: "lux" },
    MEMO] },
  sow: { label: "زراعة البذور", short: "الزراعة", desc: "اليمين واليسار في شاشة واحدة · الصنف والكمية", split: 1, fields: [
    { k: "time", l: "وقت الزراعة", t: "t", req: 1, w: "full" },
    { k: "side", l: "الجهة", t: "s", o: SIDES, req: 1, w: "full", edit: 1 },
    { k: "crop", l: "الصنف / نوع البذور", t: "x", req: 1, w: "full", list: "crops", ps: 1 },
    { k: "seeds", l: "عدد البذور", t: "n", u: "بذرة", req: 1, ps: 1 },
    { k: "trays", l: "عدد الصواني", t: "n", u: "صينية", ps: 1 },
    { k: "lot", l: "المورد / رقم التشغيلة", t: "x", w: "full" },
    MEMO] },
  note: { label: "ملاحظة على النبات", short: "ملاحظات", desc: "تعب، إصابة، مرض، رش، أو لا يوجد ملاحظات", target: "nNote", photo: "opt", photoShow: noteHas, fields: [
    { k: "time", l: "الوقت", t: "t", req: 1, w: "full" },
    { k: "cat", l: "النوع", t: "s", o: noteCats, req: 1, w: "full" },
    { k: "catX", l: "اكتب نوع الملاحظة", t: "x", req: 1, w: "full", show: noteOther },
    { k: "sev", l: "الشدة", t: "s", o: ["خفيفة", "متوسطة", "شديدة"], show: noteHas },
    { k: "loc", l: "الجهة", t: "s", o: NSIDE_LOC, show: noteHas },
    { k: "pos", l: "الموقع", t: "s", o: ZONES, show: noteHas },
    { k: "crop", l: "الصنف / رقم الصواني", t: "x", show: noteHas },
    { k: "text", l: "وصف الملاحظة", t: "ta", req: 1, w: "full", show: noteHas },
    { k: "action", l: "الإجراء المتخذ (اسم المبيد والجرعة إن وجد)", t: "ta", w: "full", show: noteHas }] },
  spray: { label: "الرش والوقاية", short: "الرش", desc: "كالسيوم ورقي، مبيد حشري أو فطري وقائي، أو علاجي", fields: sprayFields(NSIDE_LOC) },
  photo: { label: "التصوير اليومي", short: "التصوير", desc: "صورة لكل جهة في شاشة واحدة", target: "nPhoto", photo: "req", split: 1, fields: [
    { k: "time", l: "الوقت", t: "t", req: 1, w: "full" },
    { k: "side", l: "الجهة", t: "s", o: SIDES, req: 1, w: "full", edit: 1 },
    { k: "batch", l: "دفعة الزراعة", t: "batch", w: "full", ps: 1 },
    { k: "height", l: "ارتفاع النبات", t: "n", u: "سم", ps: 1 },
    MEMO] }
};
var TYPES_T = {
  refill: { label: "تعويض الخزان", short: "تعويض الخزان", desc: "مستوى الماء، الأملاح قبل وبعد، نوع التعويض", target: "nRefill", fields: [
    { k: "time", l: "وقت التعويض", t: "t", req: 1, w: "full" },
    { k: "wt", l: "حرارة الماء", t: "n", u: "°C", req: 1, c: "wt", grp: "1. قبل التعويض" },
    { k: "level0", l: "مستوى الماء قبل التعويض (اختياري)", t: "n", u: lvlUnit },
    { k: "ec0", l: "الأملاح قبل التعويض", t: "n", u: "µS/cm", req: 1, c: "ec", comp: "ec" },
    { k: "ph0", l: "pH قبل التعويض", t: "n", u: "pH", c: "ph", comp: "ph" },
    { k: "mode", l: "نوع التعويض", t: "s", o: REFILL_MODES, req: 1, w: "full", grp: "2. التعويض" },
    { k: "drained", l: "كمية مصرّفة", t: "n", u: "لتر" },
    { k: "waterAdd", l: "الماء المضاف", t: "n", u: "لتر", req: 1 },
    { k: "mlA", l: "محلول A المضاف", t: "n", u: "مل", show: function (v) { return v.mode !== REFILL_MODES[0]; } },
    { k: "mlB", l: "محلول B المضاف", t: "n", u: "مل", show: function (v) { return v.mode !== REFILL_MODES[0]; } },
    { k: "level1", l: "مستوى الماء بعد التعويض", t: "n", u: lvlUnit, grp: "3. بعد التعويض" },
    { k: "ec", l: "الأملاح بعد التعويض", t: "n", u: "µS/cm", req: 1, c: "ec", comp: "ec" }
  ].concat(phFields("pH بعد التعويض قبل الضبط"), [MEMO]) },
  mix: { label: "تجهيز خزان جديد", short: "خزان جديد", desc: "تفريغ وتعبئة الخزان بمحلول جديد", fields: mixFields() },
  ecph: { label: "قراءة الأملاح و pH", short: "أملاح و pH", desc: "قراءة من خزان الأبراج خلال اليوم", target: "nEcph", fields: ECPH_FIELDS },
  temp: { label: "حرارة ورطوبة الجو", short: "الجو", desc: "3 مناطق × 3 مستويات في البرج", target: "nTemp", needOne: ["air"], fields: [
    { k: "time", l: "وقت القياس", t: "t", req: 1, w: "full" },
    { k: "air", l: "حرارة الجو", t: "grid", u: "°C", c: "air" },
    { k: "rh", l: "الرطوبة النسبية", t: "grid", u: "%", c: "rh" },
    MEMO] },
  light: { label: "قياس الضوء", short: "الضوء", desc: "3 مناطق × 3 مستويات في البرج", target: "nLight", needOne: ["lux"], fields: [
    { k: "time", l: "وقت القياس", t: "t", req: 1, w: "full" },
    { k: "sky", l: "حالة الجو", t: "s", o: ["مشمس", "غائم جزئياً", "غائم"], w: "full" },
    { k: "lux", l: "شدة الإضاءة", t: "grid", u: "lux", c: "lux" },
    MEMO] },
  pump: { label: "فحص المضخة والتدفق", short: "المضخة", desc: "تشغيل المضخة والمؤقت وتدفق الماء", target: "nPump", fields: [
    { k: "time", l: "وقت الفحص", t: "t", req: 1, w: "full" },
    { k: "status", l: "حالة المضخة", t: "s", o: ["تعمل بشكل طبيعي", "ضعيفة", "متوقفة"], req: 1, w: "full" },
    { k: "flow", l: "تدفق الماء في الأبراج", t: "s", o: ["منتظم في كل الأبراج", "ضعيف في بعض الأبراج", "انسداد في بعض الأبراج"], w: "full" },
    { k: "towers", l: "أرقام الأبراج المتأثرة", t: "x", w: "full" },
    { k: "onMin", l: "مدة التشغيل", t: "n", u: "دقيقة" },
    { k: "offMin", l: "مدة الإيقاف", t: "n", u: "دقيقة" },
    MEMO] },
  xplant: { label: "نقل الشتلات للأبراج", short: "النقل", desc: "نقل دفعة من المشتل إلى الأبراج", fields: [
    { k: "time", l: "وقت النقل", t: "t", req: 1, w: "full" },
    { k: "batch", l: "دفعة الزراعة", t: "batch", w: "full" },
    { k: "count", l: "عدد الشتلات المنقولة", t: "n", u: "شتلة", req: 1 },
    { k: "zone", l: "المنطقة", t: "s", o: ZONE_T },
    { k: "towers", l: "أرقام الأبراج", t: "x", w: "full" },
    MEMO] },
  harvest: { label: "الحصاد", short: "الحصاد", desc: "عدد النباتات والوزن المحصود", fields: [
    { k: "time", l: "وقت الحصاد", t: "t", req: 1, w: "full" },
    { k: "crop", l: "الصنف", t: "x", w: "full", list: "crops" },
    { k: "count", l: "عدد النباتات", t: "n", u: "نبتة" },
    { k: "weight", l: "الوزن", t: "n", u: "كغ", req: 1 },
    { k: "zone", l: "المنطقة", t: "s", o: ZONE_T },
    { k: "grade", l: "الجودة", t: "s", o: ["ممتاز", "جيد", "مقبول"] },
    MEMO] },
  photo: { label: "التصوير اليومي", short: "التصوير", desc: "صورة يومية لمتابعة النمو", target: "nPhoto", photo: "req", fields: [
    { k: "time", l: "الوقت", t: "t", req: 1, w: "full" },
    { k: "loc", l: "المنطقة", t: "s", o: ZONE_T },
    { k: "lvl", l: "المستوى في البرج", t: "s", o: LEVEL_OPTS },
    { k: "batch", l: "دفعة الزراعة", t: "batch", w: "full" },
    { k: "height", l: "ارتفاع النبات", t: "n", u: "سم" },
    MEMO] },
  note: { label: "ملاحظة على النبات", short: "ملاحظات", desc: "تعب، إصابة، مرض، رش، أو لا يوجد ملاحظات", target: "nNote", photo: "opt", photoShow: noteHas, fields: [
    { k: "time", l: "الوقت", t: "t", req: 1, w: "full" },
    { k: "cat", l: "النوع", t: "s", o: noteCats, req: 1, w: "full" },
    { k: "catX", l: "اكتب نوع الملاحظة", t: "x", req: 1, w: "full", show: noteOther },
    { k: "loc", l: "المنطقة", t: "s", o: ZONE_T, show: noteHas },
    { k: "lvl", l: "المستوى في البرج", t: "s", o: LEVEL_OPTS, show: noteHas },
    { k: "sev", l: "الشدة", t: "s", o: ["خفيفة", "متوسطة", "شديدة"], show: noteHas },
    { k: "crop", l: "الصنف / رقم البرج", t: "x", show: noteHas },
    { k: "text", l: "وصف الملاحظة", t: "ta", req: 1, w: "full", show: noteHas },
    { k: "action", l: "الإجراء المتخذ (اسم المبيد والجرعة إن وجد)", t: "ta", w: "full", show: noteHas }] },
  spray: { label: "الرش والوقاية", short: "الرش", desc: "كالسيوم ورقي، مبيد حشري أو فطري وقائي، أو علاجي", fields: sprayFields(ZONE_T) }
};
var TYPES_G = {
  batt: { label: "شحن بطارية مضخة الري", short: "شحن البطارية", fields: [
    { k: "time", l: "وقت بدء الشحن", t: "t", req: 1, w: "full" },
    { k: "endTime", l: "وقت انتهاء الشحن", t: "t", w: "full", opt: 1 },
    { k: "before", l: "حالة البطارية قبل الشحن", t: "s", o: ["فارغة", "ضعيفة", "متوسطة"], w: "full" },
    MEMO] },
  cal: { label: "معايرة جهاز القياس", short: "المعايرة", fields: [
    { k: "time", l: "وقت المعايرة", t: "t", req: 1, w: "full" },
    { k: "what", l: "ما تمت معايرته", t: "s", o: ["EC و pH", "EC فقط", "pH فقط"], req: 1, w: "full" },
    { k: "sol", l: "محاليل المعايرة المستخدمة", t: "x", w: "full", ph: "مثال: pH 4 و 7، و 1413 µS/cm" },
    { k: "result", l: "النتيجة", t: "s", o: ["ناجحة", "تحتاج إعادة", "الجهاز يحتاج صيانة أو استبدال"], req: 1, w: "full" },
    MEMO] }
};
TYPES_T.pump.fields.splice(2,0,{k:"gauge1",l:"عداد ١",t:"n",u:"بار"},{k:"gauge2",l:"عداد ٢",t:"n",u:"بار"});
TYPES_N.sow.fields.splice(-1,0,{k:"usable",l:"شتلات صالحة تم عدها",t:"n",ps:1},{k:"lossAfter",l:"فاقد بعد عد الصالح",t:"n",ps:1});
TYPES_T.xplant.fields.find(x=>x.k==="batch").req=1;
TYPES_T.harvest.fields.splice(1,0,{k:"batch",l:"دفعة البذر",t:"batch"},{k:"saleable",l:"رؤوس قابلة للبيع",t:"n"},{k:"rejected",l:"رؤوس مستبعدة",t:"n"});
[TYPES_N.irr,TYPES_N.mix,TYPES_T.mix,TYPES_T.refill].forEach(function(type){if(!type.fields.some(f=>f.k==='stockSource'))type.fields.splice(1,0,{k:'stockSource',l:'مصدر الماء لهذه العملية',t:'s',req:1,w:'full',o:()=>Farm.sourceOptions(type===TYPES_N.irr?'irr':'mix')});});
TYPES_T.waterOnly = {
  label:"تعويض خزان الأبراج · ماء فقط",short:"ماء فقط",desc:"تسجيل كمية الماء من دون قياسات",fields:[
    {k:"time",l:"وقت الإضافة",t:"t",req:1},
    {k:"stockSource",l:"مصدر الماء",t:"s",req:1,o:()=>Farm.sourceOptions("refill").slice(0,2)},
    {k:"waterAdd",l:"الكمية المضافة",t:"n",u:"لتر",req:1},MEMO
  ]
};
/* 3.4.0 دورة الزراعة: «عدّ الشتلات» يسجّله العامل، والنقل والحصاد بأزرار سريعة (المنطقة والجودة)، و«آخر حصاد» يُقفل الدفعة */
TYPES_N.count = { label: "عدّ الشتلات", short: "العدّ", desc: "عدد الشتلات الصالحة في دفعة الآن", fields: [
  { k: "batch", l: "دفعة البذر", t: "batch", req: 1, w: "full" },
  { k: "usable", l: "عدد الشتلات الصالحة الآن", t: "n", u: "شتلة", req: 1, w: "full", integer: 1, sep: 1, big: 1 },
  { k: "time", l: "وقت العدّ", t: "t", req: 1, w: "full" },
  MEMO] };
TYPES_T.xplant.fields = [
  { k: "batch", l: "دفعة الزراعة", t: "batch", req: 1, w: "full" },
  { k: "count", l: "عدد الشتلات المنقولة", t: "n", u: "شتلة", req: 1, w: "full", integer: 1, sep: 1, big: 1 },
  { k: "zone", l: "المنطقة", t: "chips", o: ZONE_T, w: "full" },
  { k: "towers", l: "أرقام الأبراج", t: "x", w: "full" },
  { k: "time", l: "وقت النقل", t: "t", req: 1, w: "full" },
  { k: "emptied", l: "لم يبقَ شيء في المشتل من هذه الدفعة", t: "chk", hint: "استخدمه عند نقل آخر الشتلات إن لم تُعدّ الدفعة", w: "full" },
  MEMO];
TYPES_T.harvest.fields = [
  { k: "batch", l: "دفعة البذر", t: "batch", w: "full" },
  { k: "weight", l: "الوزن", t: "n", u: "كغ", req: 1, big: 1 },
  { k: "count", l: "عدد الرؤوس", t: "n", u: "رأس", integer: 1, big: 1 },
  { k: "rejected", l: "منها مستبعدة", t: "n", u: "رأس", integer: 1 },
  { k: "saleable", l: "الصالح للبيع", t: "calc" },
  { k: "grade", l: "الجودة", t: "chips", o: ["ممتاز", "جيد", "مقبول"], w: "full" },
  { k: "zone", l: "المنطقة", t: "chips", o: ZONE_T, w: "full" },
  { k: "crop", l: "الصنف", t: "x", w: "full", list: "crops", show: function (v) { return !v.batch; } },
  { k: "time", l: "وقت الحصاد", t: "t", req: 1, w: "full" },
  { k: "final", l: "هذا آخر حصاد للدفعة", t: "chk", hint: "تُقفل الدفعة وتُحسب نتيجتها النهائية", w: "full" },
  MEMO];
/* 3.5.0: أُزيلت بطاقة «ماء فقط» من «سجّل»؛ النوع باقٍ لعرض التسجيلات القديمة */
var ORDER = { n: ["mix", "temp", "irr", "light", "sow", "count", "note", "spray", "photo"], t: ["refill", "ecph", "temp", "light", "pump", "photo", "note", "spray", "xplant", "harvest", "mix"] };
var TASKS = { n: [["mix", "nMix"], ["temp", "nTemp"], ["irr", "nIrr"], ["light", "nLight"], ["note", "nNote"], ["photo", "nPhoto"]],
  t: [["refill", "nRefill"], ["ecph", "nEcph"], ["temp", "nTemp"], ["light", "nLight"], ["pump", "nPump"], ["photo", "nPhoto"]] };
var SHARED = ["mix", "ecph", "note", "photo"];
var FERTS = ["ULTRASOL CALCIUM", "AGRIFER EDDHA", "ULTRASOLINE KNO3", "MGSO4", "ULTRASOL SOP", "SOLUMKP", "VSP Stock", "Micro Stock", "نترات الكالسيوم", "نترات البوتاسيوم", "سلفات المغنيسيوم", "حديد مخلبي"];

/* ================= state ================= */
var S = {
  auth: null, db: null, user: null, uid: null, me: null, ownerUid: null, role: null,
  settings: clone(DEF), users: {}, date: todayStr(), entries: [], signoff: {}, openNotes: [], recipes: [], hist: [], meta: [],
  tab: "today", sec: lsGet("gs_sec") === "t" ? "t" : "n", photos: {}, dirty: false, installEvt: null
};
var unsubDay = [], unsubAll = [], unsubMe = [], memberSubs = false;

/* ================= utils ================= */
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function pad(n) { return (n < 10 ? "0" : "") + n; }
/* وقت المزرعة (الرياض). تاريخ غير صالح يُعامل كـ«الآن» بدل أن يوقف الصفحة */
function farmDate(d){var t=d&&!isNaN(d)?d.getTime():Date.now(),r=new Date(t+10800000);return isNaN(r)?new Date(Date.now()+10800000):r;}
function todayStr(d){return farmDate(d).toISOString().slice(0,10);}
function nowTime(){return farmDate().toISOString().slice(11,16);}
function addDays(s,n){return todayStr(new Date(Date.parse((okDay(s)?s:todayStr())+'T12:00:00+03:00')+(+n||0)*864e5));}
function daysBetween(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5); }
function fmtDate(s, opt) { if (!okDay(s)) return ""; try { return new Date(s + "T12:00:00").toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", opt || { weekday: "long", day: "numeric", month: "long" }); } catch (e) { return ""; } }
function fmtShort(s) { return fmtDate(s, { day: "numeric", month: "short" }); }
/* «13:05» ← «1:05 م». أي قيمة ليست وقتاً صحيحاً تُعرض فارغة (لا يُعاد النص كما هو: كان ثغرة حقن) */
function fmtTime(t) { var m = /^(\d{1,2}):(\d{2})$/.exec(typeof t === "string" ? t : ""); if (!m || +m[1] > 23 || +m[2] > 59) return ""; var h = +m[1]; return (h % 12 || 12) + ":" + m[2] + " " + (h < 12 ? "ص" : "م"); }
function okTs(ts) { return typeof ts === "number" && isFinite(ts) && ts > 0 && ts < 4102444800000; }
function tsHM(ts) { ts = +ts; return okTs(ts) ? farmDate(new Date(ts)).toISOString().slice(11,16) : ""; }
function tsTime(ts) { return fmtTime(tsHM(ts)); }
function fmtAgo(h) { if (h == null) return "—"; if (h < 1) return "أقل من ساعة"; if (h < 48) return Math.round(h) + " ساعة"; return Math.round(h / 24) + " يوم"; }
function safeImg(v) { v = String(v || ""); return /^data:image\/(jpeg|png|gif|webp);base64,[A-Za-z0-9+\/=]+$/.test(v) ? v : ""; }
function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function num(v) { if (v === "" || v == null) return null; if (typeof v === "number") return isFinite(v) ? v : null; var s = String(v).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }).replace(/[٫,]/g, ".").trim(); if (s === "") return null; var n = Number(s); return isFinite(n) ? n : null; }
/* الأرقام للعرض. القيمة التي تُقرَّب إلى صفر تظهر «0» وليس «-0» */
function f(n, d) { if (n == null || !isFinite(n)) return "—"; var r = Number(Number(n).toFixed(Math.min(20, d || 0))); if (r === 0) r = 0; return r.toLocaleString("en-US", { maximumFractionDigits: d || 0, minimumFractionDigits: 0 }); }
function fml(n) { return f(n, Math.abs(n) < 20 ? 1 : 0); }
function avg(a) { a = a.filter(function (x) { return x != null && isFinite(x); }); return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
function sum(a) { return a.filter(function (x) { return x != null && isFinite(x); }).reduce(function (s, x) { return s + x; }, 0); }
function median(a) { a = a.filter(function (x) { return x != null && isFinite(x); }).sort(function (x, y) { return x - y; }); if (!a.length) return null; var m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
/* ===== تنقية ما يُقرأ من قاعدة البيانات =====
   قواعد الحماية تتحقق من الأنواع عند الكتابة، وهذه طبقة ثانية عند القراءة: وثيقة واحدة بقيمة غير متوقعة
   (تسجيل قديم، أو حساب عضو أُسيء استخدامه) لا تعطّل الصفحة عند بقية الفريق ولا تُدخل نصاً غير آمن. */
function okHM(t) { return typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t); }
function okDay(d) { return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d + "T12:00:00Z")); }
function plain(o) { return !!o && typeof o === "object" && !Array.isArray(o) && typeof o.toMillis !== "function"; }
function txt(x, max) { return (typeof x === "string" ? x : typeof x === "number" && isFinite(x) ? String(x) : "").slice(0, max || 5000); }
function normHM(t) { if (okHM(t)) return t; var m = /^(\d{1,2}):(\d{2})$/.exec(typeof t === "string" ? t : ""); return m && +m[1] < 24 && +m[2] < 60 ? pad(+m[1]) + ":" + m[2] : ""; }
function normStamp(x) { return x && typeof x === "object" && typeof x.seconds === "number" && isFinite(x.seconds) && x.seconds > 0 && x.seconds < 4102444800 ? x : null; }
function normSpecs(x) {
  if (!plain(x)) return null; var out = {};
  ["gauge1", "gauge2"].forEach(function (k) {
    var g = x[k]; if (!plain(g)) return;
    var n = [g.min, g.max, g.step, g.ideal];
    if (n.every(function (q) { return typeof q === "number" && isFinite(q); }) && g.step > 0 && g.max > g.min && (g.max - g.min) / g.step <= 500)
      out[k] = { name: txt(g.name, 60) || (k === "gauge1" ? "عداد ١" : "عداد ٢"), min: g.min, max: g.max, step: g.step, ideal: g.ideal };
  });
  return out.gauge1 && out.gauge2 ? out : null;
}
function normEntry(e) {
  if (!plain(e)) e = {};
  e.id = txt(e.id, 200); e.type = txt(e.type, 24); e.by = txt(e.by, 128);
  if (e.sec != null && e.sec !== "n" && e.sec !== "t" && e.sec !== "g") e.sec = "n";
  if (!okDay(e.date)) e.date = "";
  if (e.time != null) e.time = normHM(e.time);
  if (e.ts != null && !okTs(e.ts)) e.ts = 0;
  var v = plain(e.v) ? e.v : {}; e.v = v;
  Object.keys(v).forEach(function (k) {
    var x = v[k]; if (x === null || typeof x !== "object") return;
    if (k === "pressureSpecs") { var sp = normSpecs(x); if (sp) v[k] = sp; else delete v[k]; }
    else if (k === "flowCalibration") v[k] = plain(x) && [x.litres, x.minutes, x.seconds].every(function (q) { return num(q) != null; }) ? x : null;
    else v[k] = "";
  });
  ["start", "end"].forEach(function (k) { if (v[k] != null && !okTs(v[k])) v[k] = null; });
  if (v.stockAt != null && !okTs(v.stockAt)) delete v.stockAt;
  if (v.time != null) v.time = normHM(v.time);
  if (e.review != null) { var r = plain(e.review) ? e.review : {}; e.review = { s: txt(r.s, 12), by: txt(r.by, 128), at: okTs(r.at) ? r.at : 0, c: txt(r.c, 2000) }; }
  if (e.photo != null && !(typeof e.photo === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(e.photo))) delete e.photo;
  if (e.thumb != null && typeof e.thumb !== "string") delete e.thumb;
  if (e.grp != null) e.grp = txt(e.grp, 40);
  if (e.open != null) e.open = e.open === true;
  return e;
}
function entryOf(d) { return normEntry(Object.assign({}, d.data(), { id: d.id })); }
function entriesOf(q) { return q.docs.map(entryOf); }
function normUser(u) { u = plain(u) ? u : {}; u.name = txt(u.name, 80); u.role = txt(u.role, 16); u.login = txt(u.login, 160); return u; }
function normRecipe(r) {
  r = plain(r) ? r : {}; r.id = txt(r.id, 200); r.tank = txt(r.tank, 4); r.date = okDay(r.date) ? r.date : ""; r.ts = okTs(r.ts) ? r.ts : 0; r.by = txt(r.by, 128); r.notes = txt(r.notes, 2000);
  r.items = (Array.isArray(r.items) ? r.items : []).filter(plain).map(function (it) { return { name: txt(it.name, 120), qty: num(it.qty), unit: txt(it.unit, 12) }; });
  return r;
}
function $(id) { return document.getElementById(id); }
function toast(m) { var t = document.createElement("div"); t.className = "toast"; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800); }
function nameOf(id) { var u = S.users[id]; return (u && u.name) || "مستخدم"; }
function initials(id) { var n = nameOf(id).trim(); return esc(n ? n.charAt(0) : "؟"); }
function isSup() { return S.role === "sup"; }
function isWorker() { return S.role === "worker"; }
function canAdd() { return isSup() || isWorker(); }
function secOf(e) { return e.sec || "n"; }
function secTag(s) { return '<span class="sectag s-' + s + '"><i></i>' + (s === "g" ? "المعدات" : SECS[s].name) + "</span>"; }
function toEmail(id) { id = id.trim().toLowerCase(); return id.indexOf("@") >= 0 ? id : id.replace(/\s+/g, "") + "@" + (window.GS_CONFIG.usernameDomain || "greenside.local"); }
function showLogin(id) { if (!id) return ""; var d = "@" + (window.GS_CONFIG.usernameDomain || "greenside.local"); return id.slice(-d.length) === d ? id.slice(0, -d.length) : id; }
/* 3.5.0: خطأ يحمل رسالة عربية موجّهة للمستخدم؛ errMsg تعرض نصه كما هو بدل الرسالة العامة */
function userError(message, extra) { return Object.assign(new Error(message), { userMsg: true }, extra || {}); }
function errMsg(e) {
  if (e && (e.userMsg || e.code === "crop-balance") && e.message) return e.message;
  var c = e && e.code || "";
  /* احتياط: خطأ بلا رمز ونصه عربي كُتب في التطبيق نفسه (أخطاء Firebase تحمل رمزاً دائماً) */
  if (!c && e && typeof e.message === "string" && /[؀-ۿ]/.test(e.message)) return e.message;
  var known = {
    "auth/invalid-credential": "اسم المستخدم أو كلمة المرور غير صحيحة.", "auth/wrong-password": "كلمة المرور غير صحيحة.", "auth/user-not-found": "لا يوجد حساب بهذا الاسم.",
    "auth/invalid-email": "اكتب اسم مستخدم أو بريداً صحيحاً.", "auth/too-many-requests": "محاولات كثيرة. انتظر قليلاً ثم حاول.", "auth/network-request-failed": "لا يوجد اتصال بالإنترنت.",
    "auth/email-already-in-use": "اسم المستخدم مستخدم من قبل.", "auth/weak-password": "كلمة المرور قصيرة. استخدم 6 أحرف أو أكثر.", "auth/requires-recent-login": "سجّل الخروج ثم الدخول من جديد، ثم أعد المحاولة.", "auth/email-already-exists": "هذا البريد مستخدم في حساب آخر.",
    "permission-denied": "ليس لديك صلاحية لهذا الإجراء.", "unavailable": "لا يوجد اتصال بالخادم حالياً.",
    "not-found": "لم يعد هذا السجل موجوداً. ربما حُذف من جهاز آخر.", "resource-exhausted": "تجاوز التطبيق حد الاستخدام اليومي. حاول لاحقاً.",
    "unauthenticated": "انتهت الجلسة. سجّل الدخول من جديد.", "failed-precondition": "تعذّر تنفيذ الطلب الآن. أعد المحاولة بعد قليل، وإن تكرر فأبلغ المالك.",
    "aborted": "تعارض الحفظ مع تعديل آخر في اللحظة نفسها. أعد المحاولة.", "deadline-exceeded": "الاتصال بطيء ولم يكتمل الطلب. أعد المحاولة.",
    "invalid-argument": "البيانات أكبر من المسموح أو غير صالحة (مثل صورة كبيرة).", "already-exists": "هذا السجل محفوظ من قبل.",
    "auth/user-disabled": "هذا الحساب موقوف. راجع المالك.", "auth/invalid-login-credentials": "اسم المستخدم أو كلمة المرور غير صحيحة.", "cancelled": "أُلغي الطلب قبل اكتماله. أعد المحاولة.", "internal": "خطأ مؤقت في الخادم. أعد المحاولة بعد قليل.", "auth/missing-password": "اكتب كلمة المرور.", "auth/operation-not-allowed": "طريقة الدخول هذه غير مفعّلة. راجع المالك."
  };
  if (known[c]) return known[c];
  try { console.warn("خطأ غير متوقع", e); } catch (x) {}
  return "حدث خطأ. حاول مرة أخرى.";
}

/* ================= settings ================= */
function cfg(k, sec) {
  if(k==="atc")return true; // Operational readings are recorded as displayed.
  sec = sec || S.sec;
  if (sec === "t" && Object.prototype.hasOwnProperty.call(DEF_T, k)) { var tw = S.settings.tw || {}; return tw[k] != null && tw[k] !== "" ? tw[k] : DEF_T[k]; }
  var v = S.settings[k]; return v != null && v !== "" ? v : DEF[k];
}
function formula() { return Object.assign({}, DEF.formula, S.settings.formula || {}); }
/* النهار والليل: حرارة الجو والرطوبة لهما حدود مختلفة. ts = وقت القراءة (رقم بالمللي ثانية أو "HH:MM")؛ بدونه تُستخدم حدود النهار */
function dayHours() { var a = num(cfg("dayFrom")), b = num(cfg("dayTo")); return [a == null ? 6 : a, b == null ? 18 : b]; }
function isDayAt(ts) {
  if (ts == null || ts === "") return true;
  // الأوقات الرقمية (من الحساسات) بتوقيت الرياض مثل بقية بيانات الحساسات، والنصية "HH:MM" كما سُجّلت
  var r = typeof ts === "number" ? new Date(ts + 3 * 3600e3) : null, h = r ? r.getUTCHours() + r.getUTCMinutes() / 60 : tMin(ts) / 60, d = dayHours();
  return h >= d[0] && h < d[1];
}
/* 3.7.0: حد الضوء اليدوي يُطبَّق بين 9 ص و3 م فقط؛ قراءة يدوية خارجها تُعرض بلا حكم (ضوء أول النهار وآخره منخفض طبيعياً) */
var LUX_WIN = [9 * 60, 15 * 60];
function luxJudged(ts) { if (typeof ts !== "string" || !okHM(ts)) return true; var m = tMin(ts); return m >= LUX_WIN[0] && m <= LUX_WIN[1]; }
function judged(c, ts) { return c !== "lux" || luxJudged(ts); }
function lim(c, sec, ts) {
  if (c === "lux" && !luxJudged(ts)) return [null, null];
  if (c === "air" || c === "rh") { var p = c + (isDayAt(ts) ? "Day" : "Night"); return [num(cfg(p + "Min", sec)), num(cfg(p + "Max", sec))]; }
  return CHECK[c] ? [num(cfg(CHECK[c][0], sec)), num(cfg(CHECK[c][1], sec))] : [null, null];
}
function chk(c, v, sec, ts) { if (!c || v == null) return null; var L = lim(c, sec, ts); if (L[0] != null && v < L[0]) return "lo"; if (L[1] != null && v > L[1]) return "hi"; return "ok"; }
function rangeTxt(c, sec, ts) { var L = lim(c, sec, ts); return f(L[0], 1) + " – " + f(L[1], 1) + (c === "air" || c === "rh" ? (isDayAt(ts) ? " نهاراً" : " ليلاً") : ""); }
function dnTxt(c, sec, u) { var d = lim(c, sec, null), n = lim(c, sec, "00:00"), r = function (L) { return "\u2066" + f(L[0]) + "–" + f(L[1]) + (u || "") + "\u2069"; }; return "نهار " + r(d) + " · ليل " + r(n); }
function hShort(h) { h = ((h % 24) + 24) % 24; return (h === 0 ? 12 : h > 12 ? h - 12 : h) + (h < 12 ? "ص" : "م"); }
function dnSpan(dayOnly) { var d = dayHours(), a = hShort(d[0]) + "–" + hShort(d[1]); return dayOnly ? a : a + " / " + hShort(d[1]) + "–" + hShort(d[0]); }
function isBad(st) { return st === "lo" || st === "hi"; }
function lvlToL(x) { if (x == null) return null; return cfg("levelUnit") === "cm" ? x * num(cfg("lPerCm")) : x; }

/* temperature compensation (reference 25 °C) */
function ec25(ec, t) { return ec; }
function ph25(ph, t) { return ph; }
function phAt(p25, t) { return p25; }
function compVal(fd, raw, v) { var n = num(raw); if (n == null) return null; var t = num(v.wt); if (fd.comp === "ec") return ec25(n, t); if (fd.comp === "ph") return ph25(n, t); return n; }
function unitOf(fd) { return typeof fd.u === "function" ? fd.u() : (fd.u || ""); }

/* grid helpers */
function dimOf(fd) { return DIMS[fd.dim || "t"]; }
function gkey(k, r, c) { return k + "_" + r + c; }
function gridKeysD(k, D) { var a = []; D.rows.forEach(function (r) { D.cols.forEach(function (c) { a.push(gkey(k, r, c)); }); }); return a; }
function gridKeys(k) { return gridKeysD(k, DIMS.t).concat(gridKeysD(k, DIMS.n)); }
function metric(v, m) { v = v || {}; return avg(NK[m].concat(gridKeys(m)).map(function (k) { return num(v[k]); })); }
function rowAvg(v, m, D, ri) { v = v || {}; return avg(D.cols.map(function (c) { return num(v[gkey(m, D.rows[ri], c)]); })); }
function colAvg(v, m, D, ci) { v = v || {}; return avg(D.rows.map(function (r) { return num(v[gkey(m, r, D.cols[ci])]); })); }
function zoneAvg(v, m, zi) { var g = rowAvg(v, m, DIMS.t, zi); if (g != null) return g; return num((v || {})[NK[m][zi]]); }
function levelAvg(v, m, li) { return colAvg(v, m, DIMS.t, li); }
function sideAvg(v, m, si) { return rowAvg(v, m, DIMS.n, si); }
function sideIdx(v) { return SIDES.indexOf((v || {}).side); }
/* irrigation litres: per side (si = 0 right, 1 left) or total; old records have one "liters" value */
function irrL(v, si) { v = v || {}; if (si != null) return num(v["liters_" + SK[si]]); var a = num(v.liters_r), b = num(v.liters_l); if (a == null && b == null) return num(v.liters); return (a || 0) + (b || 0); }

/* ================= types ================= */
function typeDef(type, sec) { if (TYPES_G[type]) return TYPES_G[type]; return (sec === "t" ? TYPES_T : TYPES_N)[type] || TYPES_N[type] || TYPES_T[type]; }
function secEntries(list, sec) { return list.filter(function (e) { return secOf(e) === sec && e.type !== "selftest"; }); }
function viewEntries() { return S.entries.filter(function (e) { return e.type !== "selftest" && (secOf(e) === S.sec || e.sec === "g"); }); }
/* task times: settings.sched[sec][type] = ["08:00", …]. A task with times needs one record per time; without times it uses the daily count. */
function schedOf(sec, type) { var s = S.settings.sched, x = s && s[sec] && s[sec][type]; if (!Array.isArray(x)) x = (DEF.sched[sec] && DEF.sched[sec][type]) || []; return x.slice().sort(); }
/* 3.6.0: التحكم في المهام. settings.taskOff[sec][type] = {from} يوقف المهمة كلياً من ذلك اليوم،
   و settings.slotOff[sec][type]["HH:MM"] = {from, until} يوقف موعداً واحداً مؤقتاً (until فارغ = حتى يُفعَّل). الأيام قبل from لا تتأثر */
function objAt(o) { for (var i = 1; i < arguments.length; i++) { o = o && typeof o === "object" && !Array.isArray(o) ? o[arguments[i]] : null; } return o && typeof o === "object" && !Array.isArray(o) ? o : null; }
function pauseOn(o, day) { if (!o) return false; if (o === true) return true; var fr = okDay(o.from) ? o.from : "", un = okDay(o.until) ? o.until : ""; if (o.until && !un) return false; day = day || S.date; return (!fr || fr <= day) && (!un || day < un); }
function taskOff(sec, type, day) { return pauseOn(objAt(S.settings.taskOff, sec, type) || (objAt(S.settings.taskOff, sec) && objAt(S.settings.taskOff, sec)[type] === true ? true : null), day); }
function taskOn(sec, type, day) { return !taskOff(sec, type, day); }
function slotPause(sec, type, t) { return objAt(S.settings.slotOff, sec, type, t); }
function slotPaused(sec, type, t, day) { return pauseOn(slotPause(sec, type, t), day); }
function activeTimes(sec, type, day) { if (taskOff(sec, type, day)) return []; return schedOf(sec, type).filter(function (t) { return !slotPaused(sec, type, t, day); }); }
/* 3.7.0: الجدول الساري في يوم سابق. settings.schedHist[sec][type] = [{until, times, n}]: الجدول الذي كان سارياً قبل until.
   يُحفظ عند كل تغيير في المواعيد أو العدد؛ الأيام قبل أول تغيير محفوظ تُحسب بالجدول الحالي (hist:false) */
function schedAt(sec, type, day) {
  var h = objAt(S.settings.schedHist, sec), list = h && Array.isArray(h[type]) ? h[type] : [], snap = schedPick(list, day), x = TASKS[sec].filter(function (y) { return y[0] === type; })[0];
  var all = snap ? (Array.isArray(snap.times) ? snap.times.filter(okHM).sort() : []) : schedOf(sec, type), n = snap ? (num(snap.n) || 0) : (x ? num(cfg(x[1], sec)) || 0 : 0);
  var known = !!snap || list.some(function (q) { return q && okDay(q.until) && q.until <= day; });
  if (taskOff(sec, type, day)) return { times: [], n: 0, off: true, known: known };
  var times = all.filter(function (t) { return !slotPaused(sec, type, t, day); });
  return { times: times, n: all.length ? times.length : n, known: known };
}
function schedPick(list, day) { var snap = null; (list || []).forEach(function (q) { if (q && okDay(q.until) && q.until > day && (!snap || q.until < snap.until)) snap = q; }); return snap; }
function schedSnap(sec, type) {
  var t = todayStr(), h = clone(S.settings.schedHist && typeof S.settings.schedHist === "object" ? S.settings.schedHist : {}), x = TASKS[sec].filter(function (y) { return y[0] === type; })[0];
  if (!h[sec] || typeof h[sec] !== "object" || Array.isArray(h[sec])) h[sec] = {};
  var list = (Array.isArray(h[sec][type]) ? h[sec][type] : []).filter(function (q) { return q && okDay(q.until) && daysBetween(q.until, t) <= 400; });
  if (!list.some(function (q) { return q.until === t; })) list.push({ until: t, times: schedOf(sec, type), n: x ? num(cfg(x[1], sec)) || 0 : 0 });
  h[sec][type] = list; return { schedHist: h };
}
function needOf(sec, x) { if (taskOff(sec, x[0])) return 0; var t = schedOf(sec, x[0]); return t.length ? activeTimes(sec, x[0]).length : (num(cfg(x[1], sec)) || 0); }
/* 3.7.0: «تجهيز خزان جديد» يُحتسب عن جولة «تعويض الخزان» في يومه (فيه قياس بعد الخلط). «ماء فقط» لا يُحتسب */
function taskTypes(type) { return type === "refill" ? ["refill", "mix"] : [type]; }
function doneOf(E, type) { var seen = {}, n = 0, ks = taskTypes(type); E.forEach(function (e) { if (ks.indexOf(e.type) < 0) return; var g = e.grp || e.id; if (!seen[g]) { seen[g] = 1; n++; } }); return n; }
function tasksFor(sec, entries) {
  var E = secEntries(entries, sec), need = 0, done = 0;
  TASKS[sec].forEach(function (x) { var n = needOf(sec, x); need += n; done += Math.min(n, doneOf(E, x[0])); });
  return { need: need, done: done, left: Math.max(0, need - done) };
}
function nowMin() { return tMin(nowTime()); }
function tMin(t) { var p = String(t).split(":"); return (+p[0]) * 60 + (+p[1] || 0); }

/* ================= navigation (Android back button) ================= */
var NAV = { kp: false, sheet: false, ignore: 0, tabs: [], lastBack: 0, backs: 0, armed: false, hintTimer: null, rearmTimer: null, disarmed: false, restore: null };
function navInit() {
  if (NAV.armed) return; NAV.armed = true;
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
  try { history.replaceState({ gs: "base" }, ""); history.pushState({ gs: "app" }, ""); } catch (e) {}
  window.addEventListener("popstate", onPop);
  /* أي لمس أو تمرير من المستخدم يلغي استعادة موضع التمرير المعلّقة، ويعيد تجهيز زر الرجوع إن كان في خطوة الخروج الأخيرة */
  ["touchstart", "wheel", "keydown", "pointerdown"].forEach(function (k) { window.addEventListener(k, function () { NAV.restore = null; if (NAV.disarmed) rearm(); }, { passive: true, capture: true }); });
}
/* 3.5.0: الخروج بثلاث ضغطات رجوع متتالية من الصفحة الأولى (بدل شريط الخروج).
   الضغطة الأولى والثانية تُظهران تلميحاً صغيراً. بعد الثانية لا نضيف خطوة في السجل، فتصل الثالثة إلى النظام فيُغلق التطبيق.
   إن لم تأتِ الثالثة خلال المهلة تعود الخطوة ويبدأ العدّ من جديد. */
var BACK_WINDOW = 2500;
function onPop() {
  if (NAV.ignore > 0) { NAV.ignore--; return; }
  if (NAV.kp) { var ai = document.activeElement; kpHide(true); if (ai && ai.blur) ai.blur(); return; }
  if (NAV.sheet) { closeSheet(true); return; }
  if (NAV.tabs.length) { var p = NAV.tabs.pop(); NAV.backs = 0; hideBackHint(); setTab(p.t, true, p.y); return; }
  var now = Date.now();
  NAV.backs = now - NAV.lastBack < BACK_WINDOW ? NAV.backs + 1 : 1; NAV.lastBack = now;
  if (NAV.backs >= 3) { NAV.backs = 0; hideBackHint(); try { history.back(); } catch (e) {} return; }
  showBackHint(NAV.backs === 1 ? "اضغط «رجوع» مرتين أخريين للخروج" : "اضغط «رجوع» مرة أخرى للخروج");
  clearTimeout(NAV.rearmTimer);
  if (NAV.backs === 1) { try { history.pushState({ gs: "app" }, ""); } catch (e) {} }
  else { NAV.disarmed = true; NAV.rearmTimer = setTimeout(rearm, BACK_WINDOW); }
}
function rearm() {
  clearTimeout(NAV.rearmTimer); NAV.disarmed = false; NAV.backs = 0; hideBackHint();
  try { if (history.state && history.state.gs === "base") history.pushState({ gs: "app" }, ""); } catch (e) {}
}
function showBackHint(m) { var b = $("backhint"); if (!b) return; b.textContent = m; b.hidden = false; clearTimeout(NAV.hintTimer); NAV.hintTimer = setTimeout(hideBackHint, BACK_WINDOW); }
function hideBackHint() { var b = $("backhint"); if (b) b.hidden = true; }
/* 3.5.0: الرجوع يعيد موضع التمرير في الصفحة السابقة. المحتوى قد يكتمل بعد الرسم الأول (تحميل البيانات)،
   فتبقى الاستعادة معلّقة لثوانٍ قليلة وتُطبَّق بعد كل رسم حتى يصبح طول الصفحة كافياً، ما لم يلمس المستخدم الشاشة */
function applyRestore() {
  var r = NAV.restore; if (!r) return;
  if (Date.now() > r.until || S.tab !== r.tab) { NAV.restore = null; return; }
  var max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, Math.min(r.y, Math.max(0, max)));
  if (max >= r.y) NAV.restore = null;
}
function restoreScroll(t, y) {
  NAV.restore = y > 0 ? { tab: t, y: y, until: Date.now() + 3000 } : null;
  if (!NAV.restore) { window.scrollTo(0, 0); return; }
  applyRestore(); requestAnimationFrame(applyRestore); setTimeout(applyRestore, 120); setTimeout(applyRestore, 400);
}
function setTab(t, fromPop, y) {
  if (t === "repLegacy") t = "rep"; /* 3.7.0: صفحة تقارير واحدة */
  if (NAV.disarmed) rearm();
  if (!fromPop && t !== S.tab) { NAV.tabs.push({ t: S.tab, y: window.scrollY || 0 }); try { history.pushState({ gs: "tab" }, ""); } catch (e) {} }
  NAV.restore = null;
  S.tab = t; render(true);
  if (fromPop) restoreScroll(t, y || 0); else window.scrollTo(0, 0);
}
function openSheet(html) {
  if (NAV.kp) kpHide();
  $("sheetRoot").innerHTML = html;
  document.documentElement.classList.add("lock");
  if (!NAV.sheet) { NAV.sheet = true; try { history.pushState({ gs: "sheet" }, ""); } catch (e) {} }
  var sh = $("sheetRoot").querySelector(".sheet"); if (sh) sh.scrollTop = 0;
}
/* بعض جوالات Android تُبقي أجزاء قديمة من الشاشة بعد إغلاق النافذة أو الرجوع للتطبيق، فتظهر الخانات مكررة فوق بعضها.
   نُجبر المتصفح على إعادة رسم الصفحة في الإطار التالي (تغيير غير مرئي لإطارين فقط) */
var RP = 0;
function repaint() {
  var v = $("view"); if (!v || RP) return;
  RP = requestAnimationFrame(function () { v.classList.add("rp"); requestAnimationFrame(function () { v.classList.remove("rp"); RP = 0; }); });
}
function closeSheet(fromPop) {
  var had = NAV.sheet;
  var kpw = NAV.kp; NAV.kp = false; kpHide(true); $("sheetRoot").innerHTML = ""; FORM = null; CALC.open = false;
  document.documentElement.classList.remove("lock");
  NAV.sheet = false;
  var steps = (had && !fromPop ? 1 : 0) + (kpw ? 1 : 0);
  if (steps) { NAV.ignore++; history.go(-steps); }
  if (S.dirty) render();
  repaint(); dayTick();
}
function sheetHead(title, sec, icon) {
  return '<div class="sheet-h">' + (icon ? '<span class="e-ic">' + ico(icon, 19) + "</span>" : "") + '<div class="sh-t">' + (sec ? secTag(sec) : "") + "<h2>" + esc(title) + '</h2></div><button class="iconbtn" type="button" data-act="close" aria-label="إغلاق">✕</button></div>';
}

/* ================= boot ================= */
/* App Check (اختياري): يمنع استخدام مفاتيح Firebase من خارج موقع التطبيق.
   يعمل فقط إذا وُضع appCheckKey (مفتاح reCAPTCHA v3) في config.js */
function withAppCheck(app) {
  var k = window.GS_CONFIG && window.GS_CONFIG.appCheckKey;
  if (k && app && typeof app.appCheck === "function") { try { app.appCheck().activate(k, true); } catch (e) { console.warn(e); } }
  var emu = window.GS_CONFIG && window.GS_CONFIG.emulator;
  if (emu && app) { try { app.firestore().useEmulator(emu.host, emu.firestore); app.auth().useEmulator("http://" + emu.host + ":" + emu.auth, { disableWarnings: true }); } catch (e) { console.warn(e); } }
  return app;
}
function boot() {
  var cfgF = window.GS_CONFIG && window.GS_CONFIG.firebase;
  if (!window.firebase || !firebase.firestore || !firebase.auth) {
    /* ملفات المكتبة لم تُحمَّل (اتصال ضعيف عند أول فتح، أو نسخة محفوظة تالفة): نعرض السبب الحقيقي مع إعادة محاولة تمسح النسخة المحفوظة */
    $("view").innerHTML = '<div class="login"><div class="logo"><img src="icons/icon-192.png" alt=""><span class="wm big">GREEN SIDE</span></div><div class="card"><h2>تعذّر تحميل التطبيق</h2><p class="muted">لم تكتمل ملفات التطبيق. تحقق من اتصال الإنترنت ثم أعد المحاولة.</p><button class="btn pri block" type="button" id="bootRetry">إعادة المحاولة</button></div></div>';
    $("bootRetry").onclick = function () { hardReload(true); }; return;
  }
  if (!cfgF || !cfgF.apiKey) { $("view").innerHTML = '<div class="login"><div class="logo"><img src="icons/icon-192.png" alt=""><span class="wm big">GREEN SIDE</span></div><div class="card"><h2>التطبيق بانتظار الربط</h2><p class="muted">أضف بيانات مشروع Firebase في ملف config.js.</p></div></div>'; return; }
  withAppCheck(firebase.initializeApp(cfgF));
  S.auth = firebase.auth(); S.db = firebase.firestore();
  S.db.enablePersistence({ synchronizeTabs: true }).then(function(){S.persistence=true;}).catch(function(){S.persistence=false;});
  applySec(); bindTop();
  window.addEventListener("online", netState); window.addEventListener("offline", netState);
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); S.installEvt = e; });
  S.auth.onAuthStateChanged(function (u) {
    stopAll(); memberSubs = false;
    S.user = u; S.uid = u ? u.uid : null; S.role = null; S.me = null;
    if (!u) { showAuth(); return; }
    startSession();
  });
}
function netState() { var nb = $("netbar"); if (nb) nb.hidden = navigator.onLine; }
/* إعادة التحميل. clear = امسح ملفات التطبيق المحفوظة على الجوال أولاً (لا يمس البيانات ولا التسجيلات المنتظرة للإرسال) */
function hardReload(clear) {
  if (!navigator.onLine) { toast("لا يوجد اتصال بالإنترنت الآن"); return; }
  var go = function () { location.reload(); };
  if (clear) { try { if (window.caches && caches.keys) { caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf("greenside-") === 0; }).map(function (k) { return caches.delete(k); })); }).then(go, go); return; } } catch (e) {} }
  go();
}
/* ===== التحديث: التطبيق المثبّت يبقى مفتوحاً أياماً فلا يصله الإصدار الجديد. عند العودة إليه نسأل الخادم عن رقم الإصدار ===== */
var UPD = { at: 0, ver: "", busy: false };
function checkUpdate(force) {
  if (!navigator.onLine || UPD.busy || location.protocol === "file:") return;
  var now = Date.now(); if (!force && now - UPD.at < 30 * 60000) return; UPD.at = now; UPD.busy = true;
  fetch("sw.js?t=" + now, { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (t) {
    UPD.busy = false; var m = /app\.js\?v=(\d+\.\d+\.\d+)/.exec(t || "");
    if (!m || m[1] === APP_VERSION) return;
    UPD.ver = m[1]; showUpdate();
  }).catch(function () { UPD.busy = false; });
}
function showUpdate() {
  if (!UPD.ver || $("updbar")) return;
  var b = document.createElement("div"); b.id = "updbar"; b.className = "updbar"; b.setAttribute("role", "status");
  b.innerHTML = "<span>يتوفر إصدار جديد من التطبيق (" + esc(UPD.ver) + ")</span><button class=\"btn sm pri\" type=\"button\" id=\"updGo\">تحديث الآن</button>";
  document.body.appendChild(b); $("updGo").onclick = applyUpdate;
}
function updTried() { try { var x = (sessionStorage.getItem("gs_upd") || "").split("|"); return x[0] === UPD.ver && Date.now() - (+x[1] || 0) < 20 * 60000; } catch (e) { return true; } }
function applyUpdate() { try { sessionStorage.setItem("gs_upd", UPD.ver + "|" + Date.now()); } catch (e) {} hardReload(false); }
/* عند العودة للتطبيق وهناك إصدار جديد معروف: يُحدَّث تلقائياً إن لم يكن المستخدم يكتب شيئاً */
function resumeUpdate() {
  if (UPD.ver && !NAV.sheet && S.tab !== "chat" && S.persistence !== false && !(window.Shift && Shift.hasPending()) && !updTried()) { applyUpdate(); return; }
  checkUpdate();
}
function stopMember() { if(window.Team)Team.stop(); if(window.Rec)Rec.stop(); if(window.Farm)Farm.stop(); if(window.GSUI)GSUI.stop(); unsubDay.concat(unsubAll).forEach(function (u) { try { u(); } catch (e) {} }); unsubDay = []; unsubAll = []; memberSubs = false; }
function stopAll() { stopMember(); unsubMe.forEach(function (u) { try { u(); } catch (e) {} }); unsubMe = []; }
function applySec() {
  document.body.classList.toggle("sec-t", S.sec === "t"); document.body.classList.toggle("sec-n", S.sec === "n");
  document.querySelectorAll("#secsw [data-sec]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-sec") === S.sec); });
  paintChrome();
}
/* 3.0: الشريط العلوي بلون القسم في اللوحة، وبلون الصفحة في غيرها. لون شريط الجوال (theme-color) يتبعه */
function paintChrome() {
  var home = !!S.role && S.tab === "today", dark = document.documentElement.dataset.theme === "dark";
  document.body.classList.toggle("on-home", home);
  document.body.classList.toggle("in-chat", !!S.role && S.tab === "chat");
  var c = home ? (dark ? (S.sec === "t" ? "#163F4C" : "#173F2D") : (S.sec === "t" ? "#1E6278" : "#1F5A3F")) : (dark ? "#19211D" : "#FFFFFF");
  var m = document.querySelector('meta[name="theme-color"]'); if (m && m.getAttribute("content") !== c) m.setAttribute("content", c);
}

/* ================= auth screens ================= */
var AUTH_MODE = "login";
function showAuth() {
  $("top").hidden = true; $("tabsNav").hidden = true; if (NAV.sheet) closeSheet(true);
  S.db.collection("config").doc("owner").get().then(function (s) { S.ownerUid = s.exists ? s.data().uid : null; S.ownerChecked = true; if (!S.ownerUid) AUTH_MODE = "setup"; renderAuth(); }).catch(function () { renderAuth(); });
  renderAuth();
}
function renderAuth() {
  var h = '<div class="login"><div class="logo"><img src="icons/icon-192.png" alt=""><span class="wm big">GREEN SIDE</span><span class="muted">سجل متابعة المشتل والأبراج</span></div>';
  if (AUTH_MODE === "setup") {
    h += '<div class="card"><h2>إعداد الحساب الأول</h2><p class="muted" style="font-size:13.5px">هذا الحساب سيكون مالك التطبيق والمشرف الرئيسي.</p><form id="authForm" class="fgrid" novalidate>' +
      '<label class="f full" for="a_name">الاسم<input class="in" id="a_name" autocomplete="name"></label>' +
      '<label class="f full" for="a_id">البريد الإلكتروني<input class="in" id="a_id" type="email" dir="ltr" autocomplete="email"></label>' +
      '<label class="f full" for="a_pw">كلمة المرور (6 أحرف أو أكثر)<input class="in" id="a_pw" type="password" dir="ltr" autocomplete="new-password"></label>' +
      '<div class="err full" id="a_err"></div><button class="btn pri block full" type="submit">إنشاء الحساب والبدء</button></form></div>' +
      '<button class="linkbtn" type="button" data-act="authMode" data-m="login">لدي حساب، تسجيل الدخول</button>';
  } else if (AUTH_MODE === "reset") {
    h += '<div class="card"><h2>استعادة كلمة المرور</h2><p class="muted" style="font-size:13.5px">تصل رسالة الاستعادة للحسابات المسجلة ببريد حقيقي. حسابات العمال (اسم مستخدم بدون بريد) لا تصلها رسالة الاستعادة: يوقف المالك الحساب القديم وينشئ للعامل حساباً جديداً.</p><form id="authForm" class="fgrid" novalidate><label class="f full" for="a_id">البريد الإلكتروني<input class="in" id="a_id" type="email" dir="ltr"></label><div class="err full" id="a_err"></div><button class="btn pri block full" type="submit">إرسال رابط الاستعادة</button></form></div>' +
      '<button class="linkbtn" type="button" data-act="authMode" data-m="login">رجوع لتسجيل الدخول</button>';
  } else {
    h += '<div class="card"><form id="authForm" class="fgrid" novalidate><label class="f full" for="a_id">اسم المستخدم أو البريد<input class="in" id="a_id" dir="ltr" autocapitalize="off" autocomplete="username"></label>' +
      '<label class="f full" for="a_pw">كلمة المرور<input class="in" id="a_pw" type="password" dir="ltr" autocomplete="current-password"></label><div class="err full" id="a_err"></div><button class="btn pri block full" type="submit">تسجيل الدخول</button></form></div>' +
      '<button class="linkbtn" type="button" data-act="authMode" data-m="reset">نسيت كلمة المرور</button>' + (S.ownerChecked && S.ownerUid === null ? '<button class="linkbtn" type="button" data-act="authMode" data-m="setup">إعداد الحساب الأول</button>' : "");
  }
  $("view").innerHTML = h + '<p class="muted" style="text-align:center;font-size:12px">الإصدار ' + APP_VERSION + ' · بواسطة <bdi>Hamed</bdi></p></div>';
  $("authForm").addEventListener("submit", onAuthSubmit);
}
function onAuthSubmit(ev) {
  ev.preventDefault();
  var btn = ev.target.querySelector("button[type=submit]"), er = $("a_err"); er.textContent = "";
  var id = ($("a_id").value || "").trim(), pw = $("a_pw") ? $("a_pw").value : "";
  if (!id) { er.textContent = "اكتب اسم المستخدم أو البريد."; return; }
  btn.disabled = true; var p;
  if (AUTH_MODE === "reset") p = S.auth.sendPasswordResetEmail(id).then(function () { toast("أُرسل رابط الاستعادة إلى بريدك"); AUTH_MODE = "login"; renderAuth(); });
  else if (AUTH_MODE === "setup") { var name = $("a_name").value.trim(); if (!name) { er.textContent = "اكتب الاسم."; btn.disabled = false; return; } window.__setupName = name; p = S.auth.createUserWithEmailAndPassword(toEmail(id), pw); }
  else p = S.auth.signInWithEmailAndPassword(toEmail(id), pw);
  p.catch(function (e) { er.textContent = errMsg(e); btn.disabled = false; });
}

/* ================= session ================= */
function startSession() {
  var db = S.db, uid = S.uid;
  $("view").innerHTML = '<div class="splash"><span class="wm big">GREEN SIDE</span><span class="muted">جارٍ التحميل…</span></div>';
  db.collection("config").doc("owner").get().then(function (s) {
    if (!s.exists && window.__setupName) {
      return db.collection("config").doc("owner").set({ uid: uid, at: Date.now() })
        .then(function () { return db.collection("users").doc(uid).set({ name: window.__setupName, login: S.user.email, role: "sup", createdAt: Date.now() }); })
        .then(function () { return db.collection("config").doc("settings").set(clone(DEF)); })
        .then(function () { window.__setupName = null; S.ownerUid = uid; });
    }
    S.ownerUid = s.exists ? s.data().uid : null;
  }).then(function () {
    unsubMe.push(db.collection("users").doc(uid).onSnapshot(function (s) {
      if (S.uid !== uid) return;
      S.me = s.exists ? normUser(s.data()) : null;
      if (S.me && S.ownerUid === uid && S.user && S.user.email && S.me.login !== S.user.email) db.collection("users").doc(uid).update({ login: S.user.email }).catch(logErr);
      var r = S.ownerUid === uid ? "sup" : (S.me && S.me.role);
      var nr = (r === "sup" || r === "worker") ? r : null, changed = nr !== S.role; S.role = nr;
      if (changed) onRole(); else render();
    }, function () { S.role = null; onRole(); }));
  }).catch(function (e) { console.warn(e); $("view").innerHTML = '<div class="sec"><div class="empty">تعذّر الاتصال. تحقق من الإنترنت ثم أعد فتح التطبيق.<button class="btn" data-act="logout">تسجيل الخروج</button></div></div>'; });
}
function onRole() { if(window.Farm)Farm.start(); if(S.role && window.Shift)Shift.flush(); if(S.role && window.Rec)Rec.start(); if(S.role && window.Team)Team.start();
  if (!S.role) {
    /* الحساب أُوقف والتطبيق مفتوح: نوقف كل الاستماع للبيانات ونغلق أي نافذة مفتوحة */
    stopMember(); if (NAV.sheet) closeSheet(true); S.entries = []; S.openNotes = []; S.hist = []; S.meta = []; S.recipes = [];
    $("top").hidden = true; $("tabsNav").hidden = true; document.body.classList.remove("on-home", "in-chat");
    $("view").innerHTML = '<div class="login"><div class="logo"><span class="wm big">GREEN SIDE</span></div><div class="card"><h2>الحساب غير مفعّل</h2><p class="muted">حسابك غير مفعّل أو موقوف. تواصل مع المشرف.</p><button class="btn block" data-act="logout">تسجيل الخروج</button></div></div>';
    return;
  }
  $("top").hidden = false; $("tabsNav").hidden = false; netState(); navInit();
  if (isWorker() && (S.tab === "sup" || S.tab === "rep")) S.tab = "today";
  if (!memberSubs) {
    memberSubs = true; var db = S.db;
    unsubAll.push(db.collection("config").doc("settings").onSnapshot(function (s) { S.settings = Object.assign(clone(DEF), s.exists ? s.data() : {}); render(); }, logErr));
    unsubAll.push(db.collection("users").onSnapshot(function (q) { var m = {}; q.forEach(function (d) { m[d.id] = normUser(d.data()); }); S.users = m; render(); }, logErr));
    unsubAll.push(db.collection("recipes").orderBy("ts", "desc").limit(300).onSnapshot(function (q) { S.recipes = q.docs.map(function (d) { return normRecipe(Object.assign({}, d.data(), { id: d.id })); }); render(); }, logErr));
    unsubAll.push(db.collection("entries").where("type", "==", "note").where("open", "==", true).onSnapshot(function (q) { S.openNotes = entriesOf(q); render(); }, logErr));
    subWindowed(["mix", "refill"], function (q) { S.hist = entriesOf(q).sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); }); render(); });
    subWindowed(["sow", "count", "xplant", "batt", "cal", "harvest", "spray"], function (q) { S.meta = entriesOf(q).sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); }); render(); });
    subDay();
  }
  render();
}
function logErr(e) { console.warn(e); }
/* اعتماد عدد كبير من التسجيلات على دفعات من 8: كل اعتماد تتحقق منه قواعد الحماية بقراءات إضافية، وللطلب الواحد حد أقصى من هذه القراءات */
function approveChunks(ids) {
  var at = Date.now(), p = Promise.resolve();
  for (var i = 0; i < ids.length; i += 8) (function (part) {
    p = p.then(function () { var bt = S.db.batch(); part.forEach(function (id) { bt.update(S.db.collection("entries").doc(id), { review: { s: "ok", by: S.uid, at: at, c: "" } }); }); return bt.commit(); });
  })(ids.slice(i, i + 8));
  return p;
}
/* حفظ الجزء المعدَّل فقط من الإعدادات: كان كل حفظ يكتب الوثيقة كاملة فيمحو تعديل مشرف آخر (أو تعديلاً أحدث وصل والجوال بلا اتصال) */
function saveSettings(patch) {
  var ref = S.db.collection("config").doc("settings");
  return ref.update(patch).catch(function (e) { if (e && e.code === "not-found") return ref.set(Object.assign({}, S.settings, patch)); throw e; });
}
/* reads are limited to the last WINDOW_DAYS for history used by the calculator, stock, sowing and equipment.
   Needs one composite index on entries (type ↑, date ↑). Until it exists the app falls back to full reads. */
var WINDOW_DAYS = 120;
function windowStart() { return addDays(todayStr(), -WINDOW_DAYS); }
function onIndexErr(e) { if (e && e.code === "failed-precondition") { S.indexOk = false; var m = String(e.message || "").match(/https:\/\/console\.firebase\.google\.com\S+/); if (m) S.indexUrl = m[0].replace(/[).,]+$/, ""); return true; } return false; }
function subWindowed(types, assign) {
  var col = S.db.collection("entries");
  unsubAll.push(col.where("type", "in", types).where("date", ">=", windowStart()).onSnapshot(function (q) { if (S.indexOk !== false) S.indexOk = true; assign(q); }, function (e) {
    if (onIndexErr(e)) { unsubAll.push(col.where("type", "in", types).onSnapshot(assign, logErr)); render(); } else logErr(e);
  }));
}
function photoQuery() {
  var col = S.db.collection("entries");
  return col.where("type", "==", "photo").where("date", ">=", windowStart()).get().catch(function (e) { if (onIndexErr(e)) return col.where("type", "==", "photo").get(); throw e; });
}
function subDay() {
  unsubDay.forEach(function (u) { u(); }); unsubDay = [];
  S.entries = []; S.signoff = {}; S.dayLoaded=false; S.dayCached=false; S.dayError="";
  unsubDay.push(S.db.collection("entries").where("date", "==", S.date).onSnapshot({includeMetadataChanges:true},function (q) {
    S.dayLoaded=true; S.dayCached=q.metadata.fromCache; S.dayError="";
    S.entries = entriesOf(q).sort(function (a, b) { return String(a.time || "").localeCompare(String(b.time || "")) || ((a.ts || 0) - (b.ts || 0)); });
    GSUI.invalidate();render();
  }, function(e){S.dayError=errMsg(e);render();}));
  [["n", S.date + "_n"], ["n0", S.date], ["t", S.date + "_t"]].forEach(function (p) {
    unsubDay.push(S.db.collection("signoffs").doc(p[1]).onSnapshot(function (s) { S.signoff[p[0]] = s.exists ? s.data() : null; render(); }, logErr));
  });
}
function signoffOf(sec) { return S.signoff[sec] || (sec === "n" ? S.signoff.n0 : null); }

/* ================= top bar & tabs ================= */
function bindTop() {
  var dp = $("datePick"); dp.value = S.date;
  function go(d) { if (!d || d === S.date) return; S.date = d; dp.value = d; subDay(); render(true); window.scrollTo(0, 0); }
  dp.addEventListener("change", function () { go(dp.value); });
  /* على الحاسوب: فتح التقويم بالضغط على أي مكان في شريحة التاريخ */
  dp.addEventListener("click", function () { try { if (dp.showPicker && window.matchMedia && matchMedia("(pointer:fine)").matches) dp.showPicker(); } catch (e) {} });
  $("goToday").onclick = function () { go(todayStr()); };
  $("tabs").addEventListener("click", function (e) { var b = e.target.closest("[data-tab]"); if (b) setTab(b.getAttribute("data-tab")); });
  $("secsw").addEventListener("click", function (e) { var b = e.target.closest("[data-sec]"); if (b) switchSec(b.getAttribute("data-sec")); });
  $("view").addEventListener("focusout", function () { setTimeout(function () { if (S.dirty && !NAV.sheet && !$("view").contains(document.activeElement)) render(); }, 0); });
}
/* منتصف الليل: التطبيق المثبّت يبقى مفتوحاً من الأمس. إن كان المستخدم على «اليوم» ينتقل تلقائياً إلى اليوم الجديد
   (كان يبقى على تاريخ الأمس فتُحفظ تسجيلات الصباح بتاريخ قديم ويُطلب من العامل «سبب التسجيل المتأخر») */
var LIVE_DAY = todayStr();
function dayTick() {
  var t = todayStr(); if (t === LIVE_DAY) return;
  if (NAV.sheet) return;                       /* نافذة مفتوحة: ننتظر إغلاقها حتى لا يتغيّر تاريخ تسجيل قيد الكتابة */
  var was = LIVE_DAY; LIVE_DAY = t;
  if (!S.role) return;
  if (S.date === was) { S.date = t; var dp = $("datePick"); if (dp) dp.value = t; subDay(); render(true); toast("بدأ يوم جديد · " + fmtDate(t, { weekday: "long", day: "numeric", month: "long" })); }
  else render(true);
}
function switchSec(s) {
  if (s === S.sec) return; S.sec = s; lsSet("gs_sec", s); applySec();
  /* التقرير يُحمَّل لكل الأقسام معاً، فتبديل القسم لا يحتاج قراءة جديدة من الخادم */
  render(true); window.scrollTo(0, 0);
}
function renderTop() {
  var t = S.date === todayStr(), dp = $("datePick");
  $("dateLabel").textContent = t ? "اليوم" : fmtDate(S.date, { day: "numeric", month: "long" });
  $("datechip").classList.toggle("past", !t);
  $("datechip").title = fmtDate(S.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  dp.setAttribute("aria-label", "التاريخ: " + fmtDate(S.date) + ". اختر يوماً آخر");
  if (dp.value !== S.date) dp.value = S.date;
  $("goToday").hidden = t;
  $("who").innerHTML = '<span class="av">' + initials(S.uid) + "</span>";
  $("who").setAttribute("aria-label", "حسابي · " + nameOf(S.uid));
  var other = S.sec === "n" ? "t" : "n", flag = !!(window.Board && Board.dot(other));
  ["n", "t"].forEach(function (s) {
    var b = document.querySelector('#secsw [data-sec="' + s + '"]'); if (!b) return;
    var d = b.querySelector(".dot"), on = s === other && flag; if (d) d.hidden = !on;
    b.setAttribute("aria-label", SECS[s].name + (on ? " · فيه تنبيه" : ""));
  });
}
/* الشريط السفلي: اللوحة · الفريق · سجّل (الزر الأوسط) · المزرعة · التقارير (للعامل: حسابي) */
var NAV_OF = { muted: "farm", gallery: "farm", chat: "team", recType: "add", recDetail: "add", review: "today", sens: "farm", ops: "farm", sup: "farm", legacy: "farm", equipment: "farm", deliveries: "farm", crop: "farm", finance: "farm", changes: "farm", jobs: "farm", repLegacy: "rep" };
var MAIN_TABS = ["today", "team", "add", "farm", "rep"];
function renderTabs() {
  var cur = NAV_OF[S.tab] || S.tab, un = window.Team ? Team.unread() : window.Farm ? Farm.unread() : 0, I = Board.icon;
  var it = function (id, label, icon, badge) {
    return '<button class="tab" type="button" data-tab="' + id + '"' + (cur === id ? ' aria-current="page"' : "") + (badge ? ' aria-label="' + label + " · " + badge + ' غير مقروءة"' : "") + ">" + I(icon, 22) + "<span>" + label + "</span>" + (badge ? '<b class="tab-badge" aria-hidden="true">' + (badge > 99 ? "99+" : badge) + "</b>" : "") + "</button>";
  };
  var h = it("today", "اللوحة", "grid") + it("team", "الفريق", "chat", un);
  h += canAdd() ? '<button class="tab fab" type="button" data-tab="add" aria-label="سجّل عملية جديدة"' + (cur === "add" ? ' aria-current="page"' : "") + '><span class="fab-c">' + I("plus", 28, 2.4) + "</span><span>سجّل</span></button>" : "<span></span>";
  h += it("farm", "المزرعة", "sprout");
  h += isSup() ? it("rep", "التقارير", "chart") : '<button class="tab" type="button" data-act="account">' + I("user", 22) + "<span>حسابي</span></button>";
  if ($("tabs").__h !== h) { $("tabs").innerHTML = h; $("tabs").__h = h; }
}
/* الفريق: الرسائل والمهام (المرحلة الثالثة تعيد تصميم المحادثات) */
function teamView() {
  var jobs = Farm.shiftJobs().length, un = Farm.unread(), list = [["msg", "المحادثات", un || ""], ["jobs", "المهام", jobs || ""]];
  var cur = subGet("team", list);
  return '<header class="bd-page"><h1>الفريق</h1><p>الرسائل والمهام بين المشرف والعمال</p></header>' + subTabs("team", list) + Farm.view(cur === "jobs" ? "jobs" : "team");
}

/* ================= render ================= */
/* تحديثات البيانات المتتالية (عند الفتح تصل عدة دفعات معاً) تُدمج في رسم واحد لكل إطار */
var renderQ = 0;
function render(force) {
  if (force) { if (renderQ) { cancelAnimationFrame(renderQ); renderQ = 0; } renderNow(true); return; }
  if (!renderQ) renderQ = requestAnimationFrame(function () { renderQ = 0; renderNow(false); });
}
function renderNow(force) {
  if (!S.role) return;
  renderTop(); renderTabs();
  var v = $("view"), ae = document.activeElement;
  if (!force && ae && v.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) { S.dirty = true; if (S.tab === "chat" && window.Team) Team.patch(); return; }
  if (!force && NAV.sheet) { S.dirty = true; return; }
  S.dirty = false;
  var html, after = null;
  try {
  if (window.Rec) Rec.leave(S.tab);
  if (S.tab === "add" && canAdd()) html = Rec.view();
  else if (S.tab === "recType" && canAdd()) html = Rec.typeLog();
  else if (S.tab === "recDetail") { html = Rec.detail(); }
  else if (S.tab === "review" && isSup()) html = Rec.review();
  else if(S.tab === "rep" && isSup()) html=GSUI.reports();
  else if (S.tab === "sup" && isSup()) html = Farm.settings()+supView();
  else if (S.tab === "farm") html = Board.hub();
  else if (S.tab === "muted" && isSup()) html = Board.mutedPage();
  else if (S.tab === "gallery" && window.Rec) { html = Rec.gallery(); after = Rec.galleryAfter; }
  else if (S.tab === "team") html = window.Team ? Team.view() : teamView();
  else if (S.tab === "chat" && window.Team) { html = Team.roomView(); after = Team.after; }
  else if(Farm.pages.includes(S.tab))html=Farm.view(S.tab);
  else if (S.tab === "sens" && window.SENS) { html = SENS.view(); after = function () { SENS.bind(v); }; }
  else if(S.tab === "ops") html=GSUI.operations();
  else if(S.tab === "legacy") html=legacyTodayView();
  else { S.tab = "today"; html = isSup() ? Board.home() : Board.worker(); }
  } catch (err) { logCrash(err, "عرض صفحة " + S.tab); html = crashHTML(err); after = null; }
  paintChrome();
  // تحديثات البيانات التي لا تغيّر شيئاً في الصفحة لا تعيد بناءها (أقل وميضاً وأخف على الجوال). الرسوم تُحدَّث دائماً
  /* الصفحات الفرعية (المعدات، المهام، الفريق، التقارير التفصيلية…) ليس لها زر في الشريط السفلي: زر رجوع ظاهر أعلاها */
  if (MAIN_TABS.indexOf(S.tab) < 0 && S.tab !== "chat" && NAV.tabs.length) html = '<div class="backbar"><button class="backbtn" type="button" data-act="goBack">' + Board.icon("back", 18, 2.2) + "<span>رجوع</span></button></div>" + html;
  var run = function () { if (!after) return; try { after(); } catch (err) { logCrash(err, "تجهيز صفحة " + S.tab); } };
  if (!force && html === v.__h && v.firstElementChild) { run(); applyRestore(); return; }
  v.innerHTML = html; v.__h = html; run();
  loadPhotos(v); applyRestore();
}
/* ===== شبكة أمان العرض: خطأ في صفحة لا يترك الشاشة بيضاء. يُعرض ما حدث مع طريق للرجوع، ويُحفظ آخر 20 خطأ على الجوال (تظهر في «فحص النظام») ===== */
var CRASH = [];
try { CRASH = JSON.parse(lsGet("gs_errs") || "[]") || []; if (!Array.isArray(CRASH)) CRASH = []; } catch (e) { CRASH = []; }
function logCrash(err, where) {
  try {
    console.error(err);
    var m = txt(err && (err.message || String(err)), 300), st = txt(err && err.stack, 2000).split("\n").slice(1, 3).join(" ").replace(/https?:\/\/[^\s)]*\//g, "").slice(0, 200);
    var last = CRASH[CRASH.length - 1];
    if (last && last.m === m && last.w === where) { last.n = (last.n || 1) + 1; last.t = Date.now(); }
    else CRASH.push({ t: Date.now(), v: APP_VERSION, w: txt(where, 60), m: m, s: st });
    CRASH = CRASH.slice(-20); lsSet("gs_errs", JSON.stringify(CRASH));
  } catch (e) {}
}
function crashLogHTML() {
  if (!CRASH.length) return "";
  return '<details class="crashlog"><summary>أخطاء سُجّلت على هذا الجوال (' + CRASH.length + ")</summary>" + CRASH.slice().reverse().map(function (c) {
    return '<p class="num" dir="ltr">' + esc(tsDay(c.t) + " " + tsHM(c.t) + " · " + c.v + " · " + c.m + (c.n ? " ×" + c.n : "") + (c.s ? " · " + c.s : "")) + '</p><p class="muted">' + esc(c.w) + "</p>";
  }).join("") + '<button class="btn sm" type="button" data-act="clearCrash">مسح السجل</button></details>';
}
function tsDay(ts) { return okTs(+ts) ? todayStr(new Date(+ts)) : ""; }
function crashHTML(err) {
  return '<section class="sec"><div class="card crash"><h2>تعذّر عرض هذه الصفحة</h2><p class="muted">حدث خطأ غير متوقع. بياناتك محفوظة ولم تتأثر.</p><p class="crash-m num" dir="ltr">' + esc(txt(err && (err.message || String(err)), 200)) + '</p>' +
    '<div class="ux-actions"><button class="btn pri" type="button" data-act="goTab" data-t="today">العودة إلى اللوحة</button><button class="btn" type="button" data-act="reloadApp">إعادة تحميل التطبيق</button></div>' +
    '<p class="muted" style="font-size:12.5px">إن تكرر الخطأ صوّر هذه الشاشة وأرسلها · الإصدار ' + APP_VERSION + "</p></div></section>";
}
window.addEventListener("error", function (ev) { if (ev && ev.error) logCrash(ev.error, "تشغيل"); });
window.addEventListener("unhandledrejection", function (ev) { var r = ev && ev.reason; if (r && r.code !== "permission-denied" && r.code !== "unavailable" && !(r.code && String(r.code).indexOf("auth/") === 0)) logCrash(r, "عملية غير مكتملة"); });

/* ---------- تبويبات داخلية وأقسام قابلة للطي (يُحفظ اختيار كل مستخدم في جواله) ---------- */
var SUB = {}, FOLD = {};
try { FOLD = JSON.parse(lsGet("gs_fold") || "{}") || {}; } catch (e) { FOLD = {}; }
function subGet(k, list) { var ids = list.map(function (x) { return x[0]; }), v = SUB[k] || lsGet("gs_sub_" + k); if (ids.indexOf(v) < 0) v = ids[0]; SUB[k] = v; return v; }
function subTabs(k, list) {
  var cur = subGet(k, list);
  return '<div class="subtabs" role="tablist">' + list.map(function (x) { return '<button type="button" role="tab" data-act="sub" data-k="' + k + '" data-v="' + x[0] + '" aria-selected="' + (x[0] === cur) + '">' + x[1] + (x[2] ? ' <b class="cnt">' + x[2] + "</b>" : "") + "</button>"; }).join("") + "</div>";
}
function fold(k, title, inner, o) {
  o = o || {}; if (!inner) return ""; var open = FOLD[k] != null ? FOLD[k] : !!o.open;
  return '<details class="fold" data-fold="' + k + '"' + (open ? " open" : "") + '><summary>' + (o.icon ? '<span class="e-ic sm">' + ico(o.icon, 17) + "</span>" : "") + '<span class="fold-t">' + title + "</span>" + (o.badge != null && o.badge !== "" ? '<span class="pill ' + (o.tone || "n") + '">' + o.badge + "</span>" : "") + '<span class="fold-i" aria-hidden="true"></span></summary><div class="fold-b">' + inner + "</div></details>";
}
document.addEventListener("toggle", function (e) { var d = e.target; if (d && d.matches && d.matches("details[data-fold]")) { FOLD[d.getAttribute("data-fold")] = d.open; lsSet("gs_fold", JSON.stringify(FOLD)); } }, true);
function jumpTo(id) { var el = $(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - $("top").offsetHeight - 10, behavior: "smooth" }); }

/* ---------- today ---------- */
function lastOf(list, test) { for (var i = list.length - 1; i >= 0; i--) if (test(list[i])) return list[i]; return null; }
function statTile(lab, val, unit, c, sub, dec, ts) {
  var st = chk(c, val, null, ts), bad = isBad(st);
  return '<div class="stat sm' + (bad ? " s-bad" : "") + '"><span class="lab">' + lab + (sub ? ' <span class="t">' + sub + "</span>" : "") + '</span><span class="val num' + (bad ? " tx-bad" : "") + '">' + (val == null ? "—" : f(val, dec != null ? dec : (c === "ph" ? 2 : 1))) + " <small>" + unit + "</small>" + (bad ? ' <span class="st">' + (st === "lo" ? "منخفض" : "مرتفع") + "</span>" : "") + "</span></div>";
}
/* 3.7.0: كل قيمة لها حد في تسجيل، خانة بخانة في الشبكات، ومنها «قبل التعويض». يُحكم بحد وقت التسجيل (نهار/ليل) كما كُتب "HH:MM".
   st(c, v, sec, time) اختياري لاختبارات الحسابات. j = خاضعة لحد (الضوء خارج 9 ص – 3 م بلا حكم) */
function limitCells(e, st) {
  var sec = secOf(e), out = []; if (sec === "g") return out; var T = typeDef(e.type, sec); if (!T || !Array.isArray(T.fields)) return out; var v = e.v || {};
  st = st || chk;
  T.fields.forEach(function (fd) {
    if (!fd.c) return;
    if (fd.t === "grid") {
      var D = dimOf(fd);
      D.rows.forEach(function (r, ri) { D.cols.forEach(function (c, ci) { var n = num(v[gkey(fd.k, r, c)]); if (n == null) return; var s2 = st(fd.c, n, sec, e.time); out.push({ e: e, c: fd.c, k: fd.k, l: fd.l, cell: D.rowL[ri] + "/" + D.colL[ci], ri: ri, ci: ci, D: D, v: n, st: s2, j: judged(fd.c, e.time) && s2 != null, u: unitOf(fd) }); }); });
      return;
    }
    var n = compVal(fd, v[fd.k], v); if (n == null) return; var s3 = st(fd.c, n, sec, e.time);
    out.push({ e: e, c: fd.c, k: fd.k, l: (fd.pg ? MNAME[fd.pg] + " " : "") + (fd.cl || fd.l), v: n, st: s3, j: judged(fd.c, e.time) && s3 != null, u: unitOf(fd) });
  });
  return out;
}
function cellText(x) { var sec = secOf(x.e), T = typeDef(x.e.type, sec); return (x.cell ? x.l + " " + x.cell : (T ? T.short : "") + ": " + x.l) + " " + f(x.v, x.c === "ph" ? 2 : x.cell ? 1 : 0) + " " + x.u + " (" + (x.st === "lo" ? "أقل" : "أعلى") + " من " + rangeTxt(x.c, sec, x.e.time) + ")"; }
function badCells(E) { var out = []; E.forEach(function (e) { limitCells(e).forEach(function (x) { if (isBad(x.st)) out.push(x); }); }); return out; }
function badReadings(E) { return badCells(E).map(function (x) { return fmtTime(x.e.time) + " · " + cellText(x); }); }
/* ===== 3.7.0 · تفاصيل اليوم: ملخص منظم أعلى الصفحة، ثم بطاقات مرتبة ===== */
function dayCard(ic, tone, title, body, link, id) { return '<section class="bd-card"' + (id ? ' id="' + id + '"' : "") + '><div class="bd-h"><span class="bd-hic ' + (tone || "") + '">' + Board.icon(ic, 18) + '</span><h2 class="bd-title">' + title + "</h2>" + (link || "") + "</div>" + body + "</section>"; }
function dayLink(t, attrs) { return '<a href="#" class="bd-link" ' + attrs + ">" + esc(t) + Board.icon("chev", 14, 2.2) + "</a>"; }
function legacyTodayView() {
  var sec = S.sec, I = Board.icon, E = viewEntries(), SE = secEntries(S.entries, sec), t0 = todayStr(), isToday = S.date === t0, rec = canAdd() && (isToday || isSup()), h = "";
  var X = RPT._t.ctx(sec), C = RPT._t.compliance(SE, X, [S.date]), D = C.days[0] || { need: 0, done: 0, ok: 0, up: 0, cnt: [] };
  var so = signoffOf(sec), pend = SE.filter(function (e) { return !e.review; }).length, on = S.openNotes.filter(function (e) { return secOf(e) === sec; });
  var bad = badCells(SE), alerts = isToday ? equipAlerts().concat(sprayAlerts(sec)) : [], style = window.Rec && Rec.style ? Rec.style : function () { return ["list", "gray"]; };
  /* الرأس والتنقل بين الأيام */
  h += '<header class="bd-page"><h1>تفاصيل اليوم</h1><p>' + esc(SECS[sec].name) + " · كل ما سُجّل في يوم واحد</p></header>";
  h += '<div class="rp-range"><button type="button" data-act="dayStep" data-d="-1" aria-label="اليوم السابق">' + I("back", 16, 2.4) + "</button><div><b>" + esc(fmtDate(S.date, { weekday: "long", day: "numeric", month: "long" })) + "</b><small>" + (isToday ? "اليوم · حتى " + fmtTime(nowTime()) : S.date === addDays(t0, -1) ? "أمس" : "قبل " + Board.dN(daysBetween(S.date, t0))) + '</small></div><button type="button" data-act="dayStep" data-d="1" aria-label="اليوم التالي"' + (isToday ? " disabled" : "") + ">" + I("chev", 16, 2.4) + "</button></div>";
  /* الملخص */
  var cntN = 0, cntD = 0; (D.cnt || []).forEach(function (x) { cntN += x.n; cntD += x.done; });
  var sl = C.slots, nOk = sl.filter(function (x) { return x.state === "ok"; }).length, nLate = sl.filter(function (x) { return x.state === "late"; }).length, nMiss = sl.filter(function (x) { return x.state === "miss"; }).length, nUp = D.up + (cntN - cntD);
  var total = D.need + D.up + cntN, done = D.done + cntD, pctD = total ? Math.round(done / total * 100) : null, w = function (n) { return total ? (n / total * 100).toFixed(1) : 0; };
  h += '<section class="dy-sum"><div class="dy-sum-h"><div><small>' + (isToday ? "المهام حتى الآن" : "مهام اليوم") + "</small><h2>" + (total ? "أُنجزت " + done + " من " + total : "لا مهام محددة") + "</h2></div>" + (pctD == null ? "" : "<b>" + pctD + "<small>%</small></b>") + "</div>" +
    (total ? '<div class="dy-bar"><i class="ok" style="width:' + w(nOk + cntD) + '%"></i><i class="late" style="width:' + w(nLate) + '%"></i><i class="miss" style="width:' + w(nMiss) + '%"></i></div>' +
      '<div class="dy-leg"><span><i class="ok"></i>في موعدها <b>' + (nOk + cntD) + '</b></span><span><i class="late"></i>سُجّلت متأخرة <b>' + nLate + '</b></span><span><i class="miss"></i>' + (isToday ? "متأخرة" : "لم تُسجَّل") + " <b>" + nMiss + "</b></span>" + (nUp ? "<span><i></i>" + (isToday ? "قادمة" : "متبقية") + " <b>" + nUp + "</b></span>" : "") + "</div>" : "");
  var tile = function (cls, lab, n, sub, to) { return '<button type="button" class="dy-tile ' + (n ? cls : "") + '"' + (n && to ? ' data-act="jump" data-to="' + to + '"' : " disabled") + "><span>" + lab + '</span><b class="num">' + n + "</b><small>" + sub + "</small></button>"; };
  var badN = {}; bad.forEach(function (x) { badN[x.e.id] = 1; }); var nBadR = Object.keys(badN).length;
  h += '<div class="dy-tiles">' + tile("bad", "خارج الحدود", bad.length, bad.length ? Board.pl(nBadR, "في قراءة واحدة", "في قراءتين", "في قراءات", "في قراءة") : "كل القراءات ضمن الحد", "actSec") +
    tile("warn", "تنبيهات", alerts.length, alerts.length ? esc(alerts.slice(0, 2).map(function (a) { return a.t.split(" ")[0] === "عبوة" ? "العبوات" : a.ic === "batt" ? "البطارية" : a.ic === "wrench" ? "المعايرة" : "الرش"; }).filter(function (x, i, A) { return A.indexOf(x) === i; }).join(" و")) : isToday ? "لا تنبيهات" : "لليوم الجاري فقط", "actSec") +
    tile("warn", "ملاحظات مفتوحة", on.length, on.length ? esc(txt((on[0].v || {}).cat, 30)) : "لا ملاحظات مفتوحة", "actSec") +
    (isSup() ? tile("", "بانتظار المراجعة", pend, SE.length ? "من " + Board.pl(SE.length, "تسجيل واحد", "تسجيلين", "تسجيلات", "تسجيلاً") : "لا تسجيلات", "logSec") : tile("", "تسجيلات اليوم", SE.length, "في " + esc(SECS[sec].name), "logSec")) + "</div>";
  if (isSup() && SE.length) h += so ? '<div class="dy-sign ok"><span>' + I("check", 14, 2.4) + " اعتمد " + esc(nameOf(so.by)) + " سجل " + esc(SECS[sec].name) + (so.at ? " الساعة " + tsTime(so.at) : "") + "</span></div>" :
    '<div class="dy-sign"><span>اليوم <b>غير معتمد</b> بعد' + (pend ? " · " + pend + " بانتظار المراجعة" : "") + "</span>" + (pend ? '<button class="btn sm pri" type="button" data-bd="queue" data-k="pending">مراجعة سريعة</button>' : '<button class="btn sm pri" type="button" data-act="signoff">اعتماد ' + esc(SECS[sec].name) + "</button>") + "</div>";
  h += "</section>";
  /* 1. يحتاج تصرفاً */
  var act = "";
  bad.slice(0, 6).forEach(function (x) { var st = style(x.e.type); act += '<a href="#" data-rc="detail" data-id="' + esc(x.e.id) + '"><span class="bd-hic sm" style="background:var(--bad-soft);color:var(--bad)">' + I(st[0], 16) + '</span><span class="dy-act-t"><b>' + esc((x.cell ? x.l + " · " + x.cell : (typeDef(x.e.type, sec) || {}).short + " · " + x.l) + " " + f(x.v, x.c === "ph" ? 2 : x.cell && x.c !== "lux" ? 1 : 0)) + (x.c === "lux" ? "" : esc(x.u === "°C" ? "°" : x.u ? " " + x.u : "")) + '</b><small class="bad">' + esc((x.st === "lo" ? "أقل من " : "أعلى من ") + rangeTxt(x.c, sec, x.e.time) + " · " + fmtTime(x.e.time)) + "</small></span>" + I("chev", 16, 2) + "</a>"; });
  if (bad.length > 6) act += '<div><span class="dy-act-t"><small>و' + (bad.length - 6) + " قيم أخرى خارج الحد · افتح التسجيل لتفاصيله</small></span></div>";
  alerts.forEach(function (a) { act += '<div><span class="bd-hic sm ' + (a.tone === "bad" ? "" : "warn") + '"' + (a.tone === "bad" ? ' style="background:var(--bad-soft);color:var(--bad)"' : "") + ">" + I(a.ic, 16) + '</span><span class="dy-act-t"><b>' + esc(a.t) + "</b><small>" + esc(a.s) + "</small></span>" + (a.btn || "") + "</div>"; });
  on.sort(function (a, b) { return b.ts - a.ts; }).slice(0, 6).forEach(function (e) { var v = e.v || {}; act += '<a href="#" data-rc="detail" data-id="' + esc(e.id) + '"><span class="bd-hic sm warn">' + I("leaf", 16) + '</span><span class="dy-act-t"><b>' + esc([v.cat === NOTE_OTHER ? v.catX : v.cat, v.loc || v.pos || ""].filter(Boolean).join(" · ")) + "</b><small>" + esc("ملاحظة مفتوحة · " + (e.date === S.date ? fmtTime(e.time) : fmtShort(e.date)) + (v.sev ? " · " + v.sev : "")) + "</small></span>" + I("chev", 16, 2) + "</a>"; });
  h += act ? dayCard("bang", "warn", "يحتاج تصرفاً", '<div class="dy-act">' + act + "</div>", "", "actSec") : '<div id="actSec"></div>';
  /* 2. المهام والجولات */
  var rows = "";
  TASKS[sec].forEach(function (x) {
    var type = x[0], T = typeDef(type, sec); if (!T) return;
    var my = sl.filter(function (q) { return q.type === type; }), cn = (D.cnt || []).filter(function (q) { return q.type === type; })[0];
    if (!my.length && !cn) return;
    var dn = my.filter(function (q) { return q.e; }).length + (cn ? cn.done : 0), need = my.length + (cn ? cn.n : 0), st = style(type);
    var lateN = my.filter(function (q) { return q.state === "miss" || q.state === "due"; }).length + (cn && isToday && cn.done < cn.n ? 0 : 0);
    var chips = my.map(function (q) {
      var tt = q.t ? fmtTime(q.t) : "";
      if (q.state === "ok" || q.state === "late") return '<span class="' + q.state + '">' + I("check", 12, 2.6) + (tt ? tt + " · " : "") + fmtTime(q.e.time) + (q.state === "late" && q.dl != null ? " (" + (q.dl > 0 ? "+" : "−") + Math.abs(q.dl) + " د)" : "") + "</span>";
      if (q.state === "miss") return '<span class="miss">' + (tt ? tt + " · " : "") + (isToday ? "متأخر" : "لم يُسجَّل") + "</span>";
      if (q.state === "due") return '<span class="due">حان الآن · ' + tt + "</span>";
      return "<span>" + tt + "</span>";
    }).join("");
    if (cn) { SE.filter(function (e) { return taskTypes(type).indexOf(e.type) >= 0; }).slice(0, cn.done).forEach(function (e) { chips += '<span class="ok">' + I("check", 12, 2.6) + fmtTime(e.time) + "</span>"; }); if (cn.n > cn.done) chips += "<span>متبقٍ " + (cn.n - cn.done) + " · بلا موعد</span>"; }
    var full = dn >= need, btn = !full && rec && (lateN || cn) ? '<button class="btn sm pri" type="button" data-act="new" data-type="' + type + '">سجّل</button>' : full ? '<span class="dy-done" aria-label="تمت">' + I("check", 16, 2.6) + "</span>" : rec ? '<button class="btn sm" type="button" data-act="new" data-type="' + type + '">سجّل</button>' : "<span></span>";
    rows += '<div class="dy-task"><span class="bd-hic sm ' + (st[1] || "") + '">' + I(st[0], 16) + "</span><b><bdi>" + esc(T.short || T.label) + '</bdi> <small class="' + (full ? "ok" : "") + '">' + dn + " من " + need + "</small></b>" + btn + '<div class="dy-slots">' + chips + "</div></div>";
  });
  h += dayCard("tasks", "", "المهام والجولات", rows ? "<div>" + rows + '</div><p class="bd-foot">الأخضر في موعده (±30 دقيقة) · البرتقالي سُجّل خارج المهلة · الأحمر ' + (isToday ? "فات موعده" : "لم يُسجَّل") + ".</p>" : '<p class="bd-empty">لا مهام محددة لهذا اليوم.</p>', "", "tasksSec");
  /* 3. قراءات اليوم */
  var cells = []; SE.forEach(function (e) { limitCells(e).forEach(function (x) { cells.push(x); }); });
  var MS = [["ec", "الأملاح" + (cfg("atc") ? "" : " (25°)"), "µS/cm", 0], ["ph", "pH", "", 2], ["wt", "حرارة المحلول", "°C", 1], ["air", "حرارة الجو", "°C", 1], ["rh", "الرطوبة", "%", 0], ["lux", "الضوء", "lux", 0]];
  var tiles = MS.map(function (m) {
    var L = cells.filter(function (x) { return x.c === m[0]; }); if (!L.length) return '<div class="none"><span>' + m[1] + "</span><b>لم تُسجَّل</b><small>لا قراءات في هذا اليوم</small></div>";
    var by = {}; L.forEach(function (x) { (by[x.e.id] = by[x.e.id] || []).push(x); });
    var ids = Object.keys(by), last = ids.map(function (k) { return by[k]; }).sort(function (a, b) { return (String(a[0].e.time) + (a[0].e.ts || 0)).localeCompare(String(b[0].e.time) + (b[0].e.ts || 0)); }).pop();
    var lv = last[0].cell ? avg(last.map(function (x) { return x.v; })) : last[last.length - 1].v, /* الشبكة: متوسط خاناتها · قبل/بعد التعويض: القيمة الأخيرة (بعد) */ vs = L.map(function (x) { return x.v; }), nb = L.filter(function (x) { return isBad(x.st); }).length;
    return '<div class="' + (nb ? "bad" : "") + '"><span>' + m[1] + "<em>" + fmtTime(last[0].e.time) + "</em></span><b>" + f(lv, m[3]) + (m[2] ? " <small>" + m[2] + "</small>" : "") + '</b><small class="' + (nb ? "x" : "") + '">المدى ' + "⁦" + f(Math.min.apply(null, vs), m[3]) + " – " + f(Math.max.apply(null, vs), m[3]) + "⁩ · " + (nb ? Board.pl(nb, "قيمة واحدة خارج الحد", "قيمتان خارج الحد", "قيم خارج الحد", "قيمة خارج الحد") : Board.pl(ids.length, "قراءة واحدة", "قراءتان", "قراءات", "قراءة")) + "</small></div>";
  }).join("");
  var foot = "الرقم الكبير آخر قراءة (متوسط خاناتها) · المدى من كل خانات اليوم · الأحمر فيه قيمة خارج الحد.";
  if (sec === "t") { var tk = tankState(); if (tk && tk.vol != null) foot += " خزان الأبراج " + f(tk.vol) + " لتر (" + (tk.date === S.date ? "" : fmtShort(tk.date) + " ") + fmtTime(tk.time) + ")."; }
  else { var irr = SE.filter(function (e) { return e.type === "irr"; }); if (irr.length) foot += " الري: " + Board.pl(irr.length, "رية واحدة", "ريتان", "ريات", "رية") + " · " + f(sum(irr.map(function (e) { return irrL(e.v); })), 1) + " لتر."; }
  h += dayCard("flask", "teal", "قراءات اليوم", '<div class="dy-read">' + tiles + '</div><p class="bd-foot">' + esc(foot) + "</p>", "", "readSec");
  /* 4. الحساسات الآن */
  if (isToday && window.SENS && SENS.api && !SENS.api.access()) {
    var sens = SENS.api.list().filter(function (s2) { var g = SENS.api.group(s2); return g === "air" || g === "water"; }).slice(0, 6);
    var cell = function (q, d, u) { return q && q.v != null && q.state !== "stale" && q.state !== "missing" ? '<b class="' + (isBad(q.state) ? "bad" : "") + '">' + "⁦" + f(q.v, d) + u + "⁩</b>" : "<b>—</b>"; };
    if (sens.length) h += dayCard("radio", "info", "الحساسات الآن", '<div class="dy-sens"><div class="h"><span></span><b>الحرارة</b><b>الرطوبة / pH</b><b>VPD</b></div>' + sens.map(function (s2) {
      var g = SENS.api.group(s2), T = SENS.api.live(s2, g === "water" ? "waterTemp" : "temp"), Hm = SENS.api.live(s2, g === "water" ? "ph" : "hum"), at = Math.max(T.at || 0, Hm.at || 0);
      var vp = g !== "water" && T.v != null && Hm.v != null && T.state !== "stale" && Hm.state !== "stale" ? 0.6108 * Math.exp(17.27 * T.v / (T.v + 237.3)) * (1 - Hm.v / 100) : null;
      return "<div><span><bdi>" + esc(SENS.api.name(s2)) + "</bdi><small>" + (at ? esc(SENS.api.age(at)) : "لا قراءة") + "</small></span>" + cell(T, 1, "°") + cell(Hm, g === "water" ? 2 : 0, g === "water" ? "" : "%") + "<b>" + (vp == null ? "—" : f(vp, 2)) + "</b></div>";
    }).join("") + "</div>", dayLink("المراقبة", 'data-ux="monitor" data-group="all"'));
  }
  /* 5. المناطق أو اليمين واليسار، والزراعة (المشتل) */
  h += placeCard(SE, sec);
  if (sec === "n") { var sb = sowBody(); h += dayCard("sprout", "green", "الزراعة هذا الشهر", sb.h, ""); }
  /* 6. الرش والمعدات */
  var P = sprayPlan(sec), spDue = (P.ca && P.ca.list.length ? 1 : 0) + P.prev.filter(function (x) { return x.due <= t0; }).length, lastSp = lastOf(sprays(sec), function () { return true; });
  var eqA = alerts.filter(function (a) { return a.ic !== "spray"; }).length, pump = sec === "t" ? lastOf(SE, function (e) { return e.type === "pump"; }) : null, c = lastCal(), bi = battInfo();
  h += '<div class="rp-kpis">' +
    '<button type="button" class="rp-kpi ' + (spDue ? "warn" : "") + '"' + (rec ? ' data-act="new" data-type="spray"' : " disabled") + "><span>" + I("spray", 15, 2) + "الرش والوقاية</span><b style=\"font-size:17px\">" + (spDue ? "مستحق الآن" : "لا شيء مستحق") + "</b><p>" + (lastSp ? "آخر رش " + esc(fmtShort(lastSp.date)) + (lastSp.v && lastSp.v.product ? " · " + esc(txt(lastSp.v.product, 30)) : "") : "لم يُسجَّل رش بعد") + "</p><em>" + (P.phi.length ? "فترة أمان حتى " + esc(fmtShort(P.phi[0].until)) : P.prev.length ? "القادم " + esc(fmtShort(P.prev.map(function (x) { return x.due; }).sort()[0])) : "") + "</em></button>" +
    '<button type="button" class="rp-kpi ' + (eqA ? "warn" : "") + '" data-act="goTab" data-t="equipment"><span>' + I("batt", 15, 2) + "المعدات</span><b style=\"font-size:17px\">" + (eqA ? Board.pl(eqA, "تنبيه واحد", "تنبيهان", "تنبيهات", "تنبيهاً") : "لا تنبيهات") + "</b><p>" + (pump ? "المضخة " + fmtTime(pump.time) + ": " + esc(txt((pump.v || {}).status, 40) || "فُحصت") : bi.state === "charging" ? "البطارية على الشاحن" : bi.state === "idle" ? "آخر شحن قبل " + fmtAgo(bi.h) : "لا شحن مسجّل") + "</p><em>" + (c ? "آخر معايرة " + esc(fmtShort(c.date)) : "لا معايرة مسجّلة") + "</em></button></div>";
  /* 7. سجل اليوم */
  var log = E.slice().reverse().map(function (e) {
    var st = style(e.type), T = typeDef(e.type, secOf(e)) || { label: e.type }, rv = e.review, pc = window.Farm && Farm.pendingChange(e.id);
    var pill = pc ? '<span class="dy-st warn">أُعيد للمراجعة</span>' : rv ? (rv.s === "ok" ? '<span class="dy-st ok">معتمد</span>' : '<span class="dy-st bad">تصحيح</span>') : '<span class="dy-st warn">بانتظار</span>';
    var vals = window.Rec && Rec.vals ? Rec.vals(e) : [], sub = vals.slice(0, 4).map(function (q) { return q.bad ? '<span class="tx-bad">' + esc(q.t) + "</span>" : esc(q.t); }).join(" · ");
    return '<a href="#" data-rc="detail" data-id="' + esc(e.id) + '"><time>' + (fmtTime(e.time) || "—") + '</time><span class="bd-hic sm ' + (st[1] || "") + '">' + I(st[0], 16) + "</span><b>" + esc(T.short || T.label) + "</b>" + pill + "<small>" + (sub ? sub + " · " : "") + esc(nameOf(e.by)) + "</small></a>";
  }).join("");
  h += '<section class="bd-card" id="logSec"><div class="bd-h"><span class="bd-hic gray">' + I("list", 18) + '</span><h2 class="bd-title">سجل ' + (isToday ? "اليوم" : esc(fmtShort(S.date))) + ' <small class="muted" style="font-size:12px;font-weight:500">' + Board.pl(E.length, "تسجيل واحد", "تسجيلان", "تسجيلات", "تسجيلاً") + "</small></h2>" + (isSup() && pend ? dayLink("مراجعة سريعة", 'data-bd="queue" data-k="pending"') : "") + "</div>" +
    (E.length ? '<div class="dy-log">' + log + '</div><p class="bd-foot">اضغط أي تسجيل لتفاصيله وأزرار التعديل والمراجعة.</p>' : '<div class="empty">لا توجد تسجيلات في ' + SECS[sec].name + " لهذا اليوم بعد." + (rec ? '<button class="btn pri" type="button" data-act="goTab" data-t="add">سجّل أول قراءة</button>' : "") + "</div>") + "</section>";
  return h;
}
/* المناطق (الأبراج) أو اليمين واليسار (المشتل): آخر قياس، والخانة حمراء إن كان فيها قيمة خارج الحد */
function placeCard(SE, sec) {
  var te = lastOf(SE, function (e) { return e.type === "temp" && (metric(e.v, "air") != null || metric(e.v, "rh") != null); }), le = lastOf(SE, function (e) { return e.type === "light" && metric(e.v, "lux") != null; });
  var D = DIMS[sec === "t" ? "t" : "n"], cols = D.rowL, irr = sec === "n" ? SE.filter(function (e) { return e.type === "irr"; }) : [];
  if (!te && !le && !irr.length) return "";
  var row = function (lab, e, m, dec) {
    if (!e) return ""; var cs = limitCells(e).filter(function (x) { return x.k === m && x.cell; });
    var vals = D.rows.map(function (r, ri) { return rowAvg(e.v, m, D, ri) != null ? rowAvg(e.v, m, D, ri) : (sec === "t" ? zoneAvg(e.v, m, ri) : null); }); if (vals.every(function (v) { return v == null; })) return "";
    return "<tr><th>" + lab + "</th>" + vals.map(function (v, ri) { var b = cs.filter(function (x) { return x.ri === ri && isBad(x.st); }).length; return '<td class="' + (b ? "bad" : "") + '">' + (v == null ? "—" : f(v, dec)) + (b ? "<small>" + (b > 1 ? b + " خارج" : "خارج") + "</small>" : "") + "</td>"; }).join("") + (sec === "n" ? "<td>" + f(avg(vals), dec) + "</td>" : "") + "</tr>";
  };
  var il = sec === "n" ? [0, 1].map(function (si) { return sum(irr.map(function (e) { return irrL(e.v, si); })); }) : null;
  var body = '<table class="rp-zone"><thead><tr><th></th>' + cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + (sec === "n" ? "<th>" + esc(D.all) + "</th>" : "") + "</tr></thead><tbody>" +
    row("حرارة °", te, "air", 1) + row("رطوبة %", te, "rh", 0) + row("ضوء", le, "lux", 0) +
    (il && irr.length ? "<tr><th>الري لتر</th>" + il.map(function (x) { return "<td>" + f(x, 1) + "</td>"; }).join("") + "<td>" + f(il[0] + il[1], 1) + "</td></tr>" : "") + "</tbody></table>" +
    (sec === "t" ? '<p class="bd-foot">' + esc(cfg("zoneNote", "t")) + "</p>" : "");
  var tt = te || le, when = tt ? " · آخر قياس " + fmtTime(tt.time) : "";
  return dayCard("therm", "", (sec === "t" ? "المناطق" : "اليمين واليسار") + when, body, "");
}
function tankState() {
  var e = lastOf(S.hist, function (r) { return secOf(r) === "t"; }); if (!e) return null; var v = e.v || {};
  var vol = e.type === "refill" ? (lvlToL(num(v.level1)) || ((lvlToL(num(v.level0)) || 0) + (num(v.waterAdd) || 0) - (num(v.drained) || 0))) : num(v.water);
  return { vol: vol, ec: ec25(num(v.ec), num(v.wt)), ph: ph25(num(v.ph), num(v.wt)), date: e.date, time: e.time };
}
function sowBatches() { return (window.Farm && Farm.cropReady()?Farm.crops():S.meta).filter(function (e) { return e.type === "sow"; }); }
function transplanted(id) { return sum(S.meta.filter(function (e) { return e.type === "xplant" && e.v && e.v.batch === id; }).map(function (e) { return num(e.v.count); })); }
function sowBody() {
  var m = S.date.slice(0, 7), caps = [num(cfg("capR")) || 0, num(cfg("capL")) || 0], sow = sowBatches().filter(function (e) { return (e.date || "").slice(0, 7) === m; });
  var bySide = [0, 0], unk = 0; sow.forEach(function (e) { var n = num(e.v.seeds) || 0, si = sideIdx(e.v); if (si >= 0) bySide[si] += n; else unk += n; });
  var d = new Date(S.date + "T12:00:00"), last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), left = last - d.getDate() + 1;
  var inNow = [0, 0], ready;
  if (window.Cycle && Farm.cropReady()) { var run = Cycle.active().filter(function (b) { return b.inNursery; }); run.forEach(function (b) { var si = sideIdx(b.e.v); if (si >= 0) inNow[si] += b.nursery; }); ready = run.filter(function (b) { return b.stage === "ready"; }); }
  else {
  sowBatches().forEach(function (e) { var si = sideIdx(e.v), age = daysBetween(e.date, todayStr()); if (si < 0 || age < 0 || age > 60) return; inNow[si] += Math.max(0, (num(e.v.seeds) || 0) - transplanted(e.id)); });
  ready = sowBatches().filter(function (e) { var age = daysBetween(e.date, todayStr()); return age >= num(cfg("daysToTransplant")) && transplanted(e.id) < (num(e.v.seeds) || 0) && age < 60; });
  }
  var h = '<div class="fold-act"><span class="muted">' + fmtDate(S.date, { month: "long" }) + '</span><button class="btn sm" data-act="sowPlan">جدول الزراعة</button></div>';
  [0, 1].forEach(function (si) {
    var cap = caps[si], seeds = bySide[si], p = cap ? Math.min(100, seeds / cap * 100) : 0, rem = Math.max(0, cap - seeds);
    h += '<div class="side-sow s-' + SK[si] + '"><div class="ss-h"><b>' + SIDES[si] + '</b><span class="num"><b>' + f(seeds) + "</b> / " + f(cap) + ' <span class="muted">بذرة</span></span></div><div class="bar"><i class="' + (p >= 100 ? "full" : "") + '" style="width:' + p + '%"></i></div>' +
      '<div class="help">' + (rem ? "المتبقي " + f(rem) + " · نحو <b>" + f(Math.ceil(left ? rem / left : 0)) + "</b> بذرة يومياً" : "اكتملت طاقة هذا الشهر ✓") + " · في المشتل الآن ≈ " + f(inNow[si]) + "</div></div>";
  });
  if (unk) h += '<div class="help">مسجّلة قبل تقسيم المشتل (بدون جهة): ' + f(unk) + " بذرة</div>";
  if (ready.length) h += '<div class="help"><a href="#" data-farm="route" data-id="crop"><b style="color:var(--warn)">' + esc(Board.pl(ready.length, "دفعة جاهزة للنقل", "دفعتان جاهزتان للنقل", "دفعات جاهزة للنقل", "دفعة جاهزة للنقل")) + " إلى الأبراج</b></a></div>";
  return { h: h, ready: ready.length };
}

/* ---------- equipment ---------- */
function lastBatt() { return lastOf(S.meta, function (e) { return e.type === "batt"; }); }
function lastCal() { return lastOf(S.meta, function (e) { return e.type === "cal" && !(e.v && e.v.careKind); }); }
function battInfo() {
  var b = lastBatt(), now = Date.now();
  if (!b) return { state: "none" };
  if (!b.v || !b.v.end) return { state: "charging", b: b, h: (now - (b.v && b.v.start || b.ts)) / 36e5 };
  return { state: "idle", b: b, h: (now - b.v.end) / 36e5 };
}
/* 3.7.0: تنبيهات المعدات كبيانات (تُرسم في «يحتاج تصرفاً» بتفاصيل اليوم) */
function equipAlerts() {
  var out = [], bi = battInfo(), lim = num(cfg("battHours")), mx = num(cfg("battMaxCharge")), add = canAdd();
  var mu = function (k) { return window.Board && Board.muted ? Board.muted(k) : false; };
  if (bi.state !== "charging" && mu("batt")) {}
  else if (bi.state === "none") out.push({ tone: "warn", ic: "batt", t: "شحن بطارية مضخة الري", s: "لم يُسجَّل شحن بعد", btn: add ? '<button class="btn sm" type="button" data-act="battStart">بدء الشحن</button>' : "" });
  else if (bi.state === "idle" && bi.h > lim) out.push({ tone: "bad", ic: "batt", t: "تأخر شحن بطارية المضخة", s: "آخر شحن انتهى قبل " + fmtAgo(bi.h), btn: add ? '<button class="btn sm pri" type="button" data-act="battStart">بدء الشحن</button>' : "" });
  else if (bi.state === "charging" && bi.h > mx && !mu("battEnd")) out.push({ tone: "warn", ic: "batt", t: "البطارية على الشاحن منذ " + fmtAgo(bi.h), s: "افصل الشاحن إذا اكتمل الشحن", btn: add ? '<button class="btn sm pri" type="button" data-act="battEnd" data-id="' + esc(bi.b.id) + '">انتهى الشحن</button>' : "" });
  var c = lastCal(), cd = num(cfg("calDays")), calBtn = add ? '<button class="btn sm" type="button" data-act="new" data-type="cal">سجّل</button>' : "";
  if (mu("cal")) {}
  else if (!c) out.push({ tone: "warn", ic: "wrench", t: "معايرة جهاز EC/pH", s: "لم تُسجَّل معايرة بعد", btn: calBtn });
  else { var dd = daysBetween(c.date, todayStr()); if (dd >= cd) out.push({ tone: "warn", ic: "wrench", t: "معايرة جهاز EC/pH", s: dd > cd ? "متأخرة منذ " + Board.dN(dd - cd) : "مستحقة اليوم", btn: calBtn }); }
  var st = computeStock();
  ["A", "B"].forEach(function (tk) { var o = st[tk]; if (o && o.pct < 15 && !mu("stock" + tk)) out.push({ tone: "warn", ic: "flask", t: "عبوة " + tk + " المركزة قاربت على النفاد", s: "المتبقي تقريباً " + f(Math.max(0, o.left)) + " مل", btn: "" }); });
  return out;
}
/* ---------- الرش: مواعيد الكالسيوم بعد النقل للأبراج، والرش الوقائي، وفترة الأمان ---------- */
function sprays(sec, ki) { return S.meta.filter(function (e) { return e.type === "spray" && secOf(e) === sec && (ki == null || (e.v || {}).kind === SPRAY_K[ki]); }); }
function sprayPlan(sec) {
  var today = todayStr(), out = { ca: null, prev: [], phi: [] };
  if (sec === "t") {
    var caF = num(cfg("caFirst")) || 0, caE = num(cfg("caEvery")) || 0, caU = num(cfg("caUntil")) || 0, lastCa = lastOf(sprays("t", 0), function () { return true; });
    var batches = S.meta.filter(function (e) { return e.type === "xplant" && daysBetween(e.date, today) >= 0 && (!caU || daysBetween(e.date, today) <= caU); });
    if (caE > 0 && batches.length) {
      var due = null, list = [];
      batches.forEach(function (b) {
        var d = lastCa && lastCa.date >= b.date ? addDays(lastCa.date, caE) : addDays(b.date, caF);
        if (!due || d < due) due = d; if (d <= today) list.push(b);
      });
      out.ca = { due: due, list: list, last: lastCa };
    }
  }
  [[1, "insEvery", "الرش الوقائي الحشري"], [2, "fungEvery", "الرش الوقائي الفطري"]].forEach(function (x) {
    var ev = num(cfg(x[1])) || 0; if (!ev) return;
    var last = lastOf(sprays(sec, x[0]), function () { return true; });
    out.prev.push({ k: x[0], name: x[2], every: ev, last: last, due: last ? addDays(last.date, ev) : today });
  });
  if (sec === "t") sprays("t").forEach(function (e) { var p = num((e.v || {}).phi); if (isPest(e.v) && p > 0 && addDays(e.date, p) > today) out.phi.push({ e: e, until: addDays(e.date, p) }); });
  return out;
}
function sprayAlerts(sec) {
  var P = sprayPlan(sec), today = todayStr(), out = [], btn = canAdd() ? '<button class="btn sm" type="button" data-act="new" data-type="spray">سجّل</button>' : "";
  var mu = function (k) { return window.Board && Board.muted ? Board.muted(k) : false; };
  if (P.ca && P.ca.list.length && !mu("ca:" + sec)) out.push({ tone: "warn", ic: "spray", t: "رش الكالسيوم للأبراج", s: P.ca.list.slice(0, 2).map(function (b) { return "نقل " + fmtShort(b.date) + " (منذ " + Board.dN(daysBetween(b.date, today)) + (b.v && b.v.zone ? "، " + b.v.zone : "") + ")"; }).join(" · ") + (P.ca.list.length > 2 ? " و" + Board.pl(P.ca.list.length - 2, "نقل آخر", "نقلان آخران", "عمليات نقل أخرى", "عملية نقل أخرى") : ""), btn: btn });
  P.prev.forEach(function (x) { if (x.due <= today && !mu("sp" + x.k + ":" + sec)) out.push({ tone: "warn", ic: "spray", t: x.name, s: x.last ? "آخر رش قبل " + Board.dN(daysBetween(x.last.date, today)) + (x.last.v.product ? " (" + x.last.v.product + ")" : "") : "لم يُسجَّل رش بعد", btn: btn }); });
  P.phi.forEach(function (x) { out.push({ tone: "bad", ic: "spray", t: "فترة أمان: لا تحصد قبل " + fmtShort(x.until), s: (x.e.v.product || "") + " رُش " + fmtShort(x.e.date) + (x.e.v.zone ? " · " + x.e.v.zone : ""), btn: "" }); });
  return out;
}
function sprayBody(sec) {
  var P = sprayPlan(sec), today = todayStr(), rows = [];
  var when = function (d) { var n = daysBetween(today, d); return n <= 0 ? '<b class="tx-warn">مستحق الآن</b>' : "بعد " + n + " يوم (" + fmtShort(d) + ")"; };
  if (sec === "t") {
    var ca = P.ca, lastCa = lastOf(sprays("t", 0), function () { return true; });
    rows.push(["رش الكالسيوم", (lastCa ? "آخر رش " + fmtShort(lastCa.date) + " · " : "") + (ca ? "القادم " + when(ca.due) : "لا توجد دفعات منقولة خلال " + f(num(cfg("caUntil"))) + " يوماً") + " · أول رش بعد النقل بـ " + f(num(cfg("caFirst"))) + " يوم ثم كل " + f(num(cfg("caEvery"))) + " يوم"]);
  }
  P.prev.forEach(function (x) { rows.push([x.name, (x.last ? "آخر رش " + fmtShort(x.last.date) + " (" + esc(x.last.v.product || "") + ") · " : "") + "القادم " + when(x.due) + " · كل " + x.every + " يوم"]); });
  if (!rows.length && !isSup()) return { h: "", due: 0 };
  var due = (P.ca && P.ca.list.length ? 1 : 0) + P.prev.filter(function (x) { return x.due <= today; }).length;
  var h = canAdd() ? '<div class="fold-act"><span></span><button class="btn sm" data-act="new" data-type="spray">تسجيل رش</button></div>' : "";
  h += rows.map(function (r) { return '<div class="eq-row"><span class="e-ic">' + ico("spray", 19) + '</span><span class="tx"><b>' + r[0] + "</b><span>" + r[1] + "</span></span></div>"; }).join("");
  if (!P.prev.length && isSup()) h += '<p class="help" style="margin:6px 0 0">لتذكير الرش الوقائي الحشري أو الفطري، حدّد عدد الأيام في إعدادات المشرف.</p>';
  return { h: h, due: due };
}
function equipBody() {
  var bi = battInfo(), c = lastCal(), h = "", bt, bb;
  if (bi.state === "none") bt = "لا يوجد شحن مسجل";
  else if (bi.state === "charging") bt = "جارٍ الشحن منذ " + fmtAgo(bi.h) + " (بدأ " + tsTime(bi.b.v.start || bi.b.ts) + ")";
  else bt = "آخر شحن انتهى قبل " + fmtAgo(bi.h) + " (" + tsTime(bi.b.v.end) + ")";
  bb = bi.state === "charging" ? '<button class="btn sm pri" data-act="battEnd" data-id="' + esc(bi.b.id) + '">انتهى الشحن</button>' : '<button class="btn sm" data-act="battStart">بدء الشحن</button>';
  h += '<div class="eq-row"><span class="e-ic">' + ico("batt", 19) + '</span><span class="tx"><b>بطارية مضخة الري</b><span>' + bt + " · التذكير بعد " + f(num(cfg("battHours"))) + " ساعة</span></span>" + (canAdd() ? bb : "") + "</div>";
  var ct = c ? "آخر معايرة: " + fmtShort(c.date) + " (قبل " + daysBetween(c.date, todayStr()) + " يوم) · " + esc(c.v && c.v.result || "") : "لا توجد معايرة مسجلة";
  h += '<div class="eq-row"><span class="e-ic">' + ico("cal", 19) + '</span><span class="tx"><b>معايرة جهاز EC/pH</b><span>' + ct + " · كل " + f(num(cfg("calDays"))) + " يوم</span></span>" + (canAdd() ? '<button class="btn sm" data-act="new" data-type="cal">تسجيل معايرة</button>' : "") + "</div>";
  return h;
}

/* ---------- entry cards ---------- */
var LEGACY = { liters: ["كمية المحلول", "لتر"], mins: ["مدة الري", "دقيقة"], zone: ["المنطقة", ""], loc: ["المكان", ""] };
function pgChip(m, u, v, sec, ts) {
  var vs = NK[m].map(function (k) { return num(v[k]); }); if (vs.every(function (x) { return x == null; })) return "";
  var b2 = vs.some(function (x) { return isBad(chk(m, x, sec, ts)); }), d2 = m === "lux" ? 0 : 1;
  return '<span class="chip ' + (b2 ? "bad" : "") + '"><span class="k">' + MNAME[m] + ' (ب/و/ن)</span><span class="num">' + vs.map(function (x) { return f(x, d2); }).join(" · ") + "</span> " + u + ' <span class="k">· متوسط ' + f(avg(vs), d2) + "</span></span>";
}
function summaryChips(e) {
  var sec = secOf(e), T = typeDef(e.type, sec); if (!T || !Array.isArray(T.fields)) return "";
  var v = e.v || {}, out = "", seen = {}, keys = {};
  T.fields.forEach(function (fd) {
    keys[fd.k] = 1;
    if (["time", "memo", "text", "action", "crop", "batch", "lot", "endTime", "catX"].indexOf(fd.k) >= 0) return;
    if (fd.show && !fd.show(v)) return;
    if (fd.t === "grid") {
      var D = dimOf(fd), vals = gridKeysD(fd.k, D).map(function (k) { return num(v[k]); });
      if (vals.every(function (x) { return x == null; })) { if (NK[fd.k]) out += pgChip(fd.k, fd.u, v, sec, e.time); return; }
      var anyBad = vals.some(function (x) { return isBad(chk(fd.c, x, sec, e.time)); }), dec = fd.c === "lux" ? 0 : 1;
      out += '<span class="chip ' + (anyBad ? "bad" : "") + '"><span class="k">' + fd.l + '</span>متوسط <b class="num">' + f(avg(vals), dec) + "</b> " + fd.u + ' <span class="k">· ' + D.rowL.map(function (z, ri) { return z + " " + f(rowAvg(v, fd.k, D, ri), dec); }).join(" · ") + "</span></span>";
      return;
    }
    if (fd.pg) { if (seen[fd.pg]) return; seen[fd.pg] = 1; out += pgChip(fd.pg, fd.u, v, sec, e.time); return; }
    var raw = v[fd.k]; if (raw === "" || raw == null) return;
    if (fd.t === "s" || fd.t === "x") { out += '<span class="chip"><span class="k">' + (fd.cl || fd.l) + "</span>" + esc(raw) + "</span>"; return; }
    if (fd.t !== "n") return;
    var n = num(raw), cv = compVal(fd, raw, v), st = chk(fd.c, cv, sec, e.time), dec = fd.c === "ph" || fd.comp === "ph" ? 2 : 1;
    var extra = (fd.comp && cv != null && Math.abs(cv - n) > (fd.comp === "ph" ? 0.005 : 1)) ? ' <span class="k">(' + (fd.comp === "ph" ? "مصحح ≈" + f(cv, 2) : "≈" + f(cv, 0) + " عند 25°") + ")</span>" : "";
    out += '<span class="chip ' + (isBad(st) ? "bad" : "") + '"><span class="k">' + (fd.cl || fd.l) + '</span><span class="num">' + f(n, dec) + "</span>" + (unitOf(fd) && unitOf(fd) !== "pH" ? " " + unitOf(fd) : "") + extra + "</span>";
  });
  Object.keys(LEGACY).forEach(function (k) { if (keys[k] || v[k] === "" || v[k] == null) return; var L = LEGACY[k]; out += '<span class="chip"><span class="k">' + L[0] + "</span>" + esc(v[k]) + (L[1] ? " " + L[1] : "") + "</span>"; });
  if(e.type==="pump" && v.pressureSpecs){for(const k of ['gauge1','gauge2'])if(num(v[k])!==null&&v.pressureSpecs[k])out+='<span class="chip">'+esc(v.pressureSpecs[k].name)+' · المرجع '+esc(v.pressureSpecs[k].ideal)+' بار · '+(num(v[k])===v.pressureSpecs[k].ideal?'مطابق للمرجع':num(v[k])>v.pressureSpecs[k].ideal?'أعلى من المرجع':'أقل من المرجع')+'</span>';}
  if((e.type === "refill" || e.type === "waterOnly") && v.waterMethod){
    out += '<span class="chip"><span class="k">حساب الماء</span>'+esc(v.waterMethod)+(v.waterEstimated?' · تقديري':'')+'</span>';
    if(v.waterEstimated && v.flowCalibration)out += '<span class="chip">مدة التعبئة: '+esc(v.fillMinutes || 0)+' دقيقة و '+esc(v.fillSeconds || 0)+' ثانية · المعايرة: '+esc(v.flowCalibration.litres)+' لتر / '+esc(v.flowCalibration.minutes)+' دقيقة و '+esc(v.flowCalibration.seconds)+' ثانية</span>';
    if(v.fullMark)out += '<span class="chip">'+esc(v.fullMark)+'</span>';
  }
  if (e.type === "irr" && num(v.liters_r) != null && num(v.liters_l) != null) out += '<span class="chip"><span class="k">مجموع الري</span><span class="num">' + f(irrL(v), 1) + "</span> لتر</span>";
  if (e.type === "temp" && num(v.wt) != null) out += '<span class="chip"><span class="k">حرارة الماء</span><span class="num">' + f(num(v.wt), 1) + "</span> °C</span>";
  if (v.batch) { var b = sowBatches().filter(function (x) { return x.id === v.batch; })[0]; if (b) out += '<span class="chip"><span class="k">الدفعة</span>' + esc(b.v.crop) + " · " + fmtShort(b.date) + ' <span class="k">(عمر ' + daysBetween(b.date, e.date) + " يوم)</span></span>"; }
  if (e.type === "sow") out += '<span class="chip"><span class="k">النقل المتوقع</span>' + fmtShort(addDays(e.date, num(cfg("daysToTransplant")))) + "</span>";
  if (e.type === "batt") { out += '<span class="chip"><span class="k">بدء الشحن</span>' + tsTime(v.start || e.ts) + "</span>" + (v.end ? '<span class="chip"><span class="k">انتهاء الشحن</span>' + tsTime(v.end) + ' <span class="k">(' + f((v.end - (v.start || e.ts)) / 36e5, 1) + " ساعة)</span></span>" : '<span class="chip bad">جارٍ الشحن</span>'); }
  return out;
}
function canEditEntry(e) { return isSup() || (isWorker() && e.by === S.uid && !e.review && e.date <= todayStr()); }
function entryCard(e, showDate) {
  var sec = secOf(e), T = typeDef(e.type, sec) || { label: e.type }, v = e.v || {}, txt = [];
  if (e.type === "sow" || e.type === "harvest") { if (v.crop) txt.push(v.crop + (v.lot ? " · " + v.lot : "")); }
  else if (v.crop) txt.push((sec === "t" ? "الصنف / البرج: " : "الصنف: ") + v.crop);
  if (v.memo) txt.push(v.memo); if (v.text) txt.push(v.text); if (v.action) txt.push("الإجراء: " + v.action);
  var rev = e.review, foot = "", noneNote = e.type === "note" && v.cat === NOTE_NONE;
  var pills = (e.type === "note" && !noneNote ? (e.open ? '<span class="pill bad">مفتوحة</span>' : '<span class="pill ok">تم الحل</span>') : "") +
    (Farm.pendingChange(e.id)?'<span class="pill warn">أُعيد للمراجعة</span>':rev ? (rev.s === "ok" ? '<span class="pill ok" title="تمت المراجعة">✓ معتمد</span>' : '<span class="pill warn">'+'مطلوب تصحيح'+'</span>') : '<span class="pill n">بانتظار المراجعة</span>');
  if (isSup()) {
    if (!Farm.pendingChange(e.id) && (!rev || rev.s !== "ok")) foot += '<button class="btn sm ok" data-act="approve" data-id="' + esc(e.id) + '">اعتماد</button>';
    if(!Farm.pendingChange(e.id))foot += '<button class="btn sm warn" data-act="flag" data-id="' + esc(e.id) + '">إعادة للتصحيح</button>';
    if (e.type === "note" && !noneNote) foot += '<button class="btn sm" data-act="toggleNote" data-id="' + esc(e.id) + '">' + (e.open ? "تم الحل" : "إعادة فتح") + "</button>";
  }
  if(isWorker() && e.by===S.uid && e.review && !Farm.pendingChange(e.id))foot+=Farm.action(rev.s==="flag"?"صحّح السجل":"طلب تصحيح","correct",e.id);
  if(Farm.pendingChange(e.id))foot+=Farm.action("فتح طلب التصحيح","route","changes");
  if (canEditEntry(e)) foot += '<button class="btn sm ghost" data-act="edit" data-id="' + esc(e.id) + '">تعديل</button>';
  var chips = summaryChips(e)+(e.type==="waterOnly"?'<span class="chip">'+esc(v.waterAdd)+' لتر · '+esc(v.stockSource)+' · EC وpH لم يُقاسا</span>':""), img = e.thumb ? '<img class="e-thumb" alt="صورة" src="' + safeImg(e.thumb) + '" data-act="lightbox" data-pid="' + esc(e.photo || "") + '">' : (e.photo ? '<img class="e-photo" alt="صورة" data-photo="' + esc(e.photo) + '">' : "");
  return '<article class="entry ' + (rev && rev.s === "flag" ? "flag" : "") + '"><div class="e-head"><span class="e-ic">' + ico(e.type, 19) + '</span><div class="e-t"><b>' + esc(T.label) + "</b><span>" + (showDate ? esc(fmtShort(e.date)) + " · " : "") + fmtTime(e.time) + " · " + esc(nameOf(e.by)) + "</span></div>" + (sec === "g" ? secTag("g") : "") + '<div class="e-pills">' + pills + "</div></div>" +
    (chips ? '<div class="chips">' + chips + "</div>" : "") + (txt.length ? '<div class="e-text">' + esc(txt.join("\n")) + "</div>" : "") + img +
    (rev && rev.c ? '<div class="rev-note"><b>' + esc(nameOf(rev.by)) + ":</b> " + esc(rev.c) + "</div>" : "") + (foot ? '<div class="e-foot">' + foot + "</div>" : "") + "</article>";
}
function loadPhotos(root) {
  (root || document).querySelectorAll("img[data-photo]").forEach(function (img) {
    var id = img.getAttribute("data-photo"); if (!id) return;
    if (S.photos[id]) { img.src = safeImg(S.photos[id]); return; }
    S.db.collection("photos").doc(id).get().then(function (s) { if (s.exists) { S.photos[id] = s.data().data; img.src = safeImg(S.photos[id]); } }).catch(function () {});
  });
}

/* ---------- add ---------- */
function addView() {
  var sec = S.sec;
  if (S.date > todayStr() && !isSup()) return '<div class="sec"><div class="empty">لا يمكن التسجيل بتاريخ مستقبلي.<button class="btn pri" data-act="gotoday">الانتقال إلى اليوم</button></div></div>';
  var h = '<section class="sec"><div class="sec-h"><h2>تسجيل جديد · ' + SECS[sec].icon + " " + SECS[sec].name + '</h2><span class="muted" style="font-size:13px">' + (S.date === todayStr() ? "لليوم" : "للتاريخ " + esc(S.date)) + "</span></div>";
  h += '<button class="tile" style="min-height:0;flex-direction:row;align-items:center;width:100%;border-color:var(--accent-2)" data-act="calc"><span class="e-ic">' + ico("calc", 22) + '</span><span style="margin:0 12px 0 0;display:flex;flex-direction:column;align-items:flex-start"><b style="color:var(--ink)">حاسبة المحلول · ' + SECS[sec].name + "</b><span>" + (sec === "t" ? "تعويض الخزان أو تجهيز خزان جديد (نظام مغلق)" : "خلطة جديدة حسب الجرعة أو الأملاح المستهدفة (نظام مفتوح)") + "</span></span></button>";
  h += '<div class="tiles">' + ORDER[sec].map(function (t) {
    var T = typeDef(t, sec), n = secEntries(S.entries, sec).filter(function (e) { return e.type === t; }), l = n[n.length - 1];
    return '<button class="tile" data-act="new" data-type="' + t + '"><span class="e-ic">' + ico(t, 22) + "</span><b>" + T.label + "</b><span>" + T.desc + "</span><em>" + (n.length ? n.length + " اليوم · آخرها " + fmtTime(l.time) : "لم يُسجّل اليوم") + "</em></button>";
  }).join("") + "</div></section>";
  return h + '<p class="muted" style="font-size:13px">الحدود المستهدفة لـ' + SECS[sec].name + ": الأملاح " + rangeTxt("ec") + " µS/cm · pH " + rangeTxt("ph") + " · حرارة الماء " + rangeTxt("wt") + " °C · حرارة الجو " + dnTxt("air", sec, "°") + "</p>";
}

/* ================= forms ================= */
var FORM = null;
function timePicker(id, val) {
  var p = (val || nowTime()).split(":"), H = +p[0], M = +p[1], ap = H < 12 ? "am" : "pm", h12 = H % 12 || 12, hs = "", ms = "";
  for (var i = 1; i <= 12; i++) hs += '<option value="' + i + '"' + (i === h12 ? " selected" : "") + ">" + i + "</option>";
  for (var j = 0; j < 60; j++) ms += '<option value="' + j + '"' + (j === M ? " selected" : "") + ">" + pad(j) + "</option>";
  return '<div class="tp" id="' + id + '" data-ap="' + ap + '"><select class="in tp-h" aria-label="الساعة">' + hs + '</select><span class="tp-sep">:</span><select class="in tp-m" aria-label="الدقيقة">' + ms + "</select>" +
    '<div class="seg" role="group" aria-label="صباحاً أو مساءً"><button type="button" data-ap="am" aria-pressed="' + (ap === "am") + '">ص</button><button type="button" data-ap="pm" aria-pressed="' + (ap === "pm") + '">م</button></div></div>';
}
function readTime(id) { var el = $(id); if (!el) return ""; var h = +el.querySelector(".tp-h").value, m = +el.querySelector(".tp-m").value, ap = el.getAttribute("data-ap"); return pad(h % 12 + (ap === "pm" ? 12 : 0)) + ":" + pad(m); }
function batchOptions(val) {
  var list = sowBatches().filter(function (e) { return e.date<=S.date || e.id===val; }).slice().reverse();
  return '<option value="">—</option>' + list.map(function (e) { return '<option value="' + esc(e.id) + '"' + (e.id === val ? " selected" : "") + ">" + esc(fmtShort(e.date) + " · " + (e.v.crop || "") + " · " + f(num(e.v.seeds)) + " بذرة · عمر " + daysBetween(e.date, todayStr()) + " يوم") + "</option>"; }).join("");
}
function gridHTML(fd, v) {
  var D = dimOf(fd);
  var h = '<div class="g3wrap" id="w_' + fd.k + '"><div class="grp-h" style="margin:0">' + fd.l + " (" + fd.u + ")</div>" +
    '<div class="tbl-wrap" style="border:0;background:none"><table class="g3"><thead><tr><th class="zh"></th>' + D.colL.map(function (l) { return "<th>" + l + "</th>"; }).join("") + "<th>المتوسط</th></tr></thead><tbody>";
  D.rows.forEach(function (r, ri) {
    h += '<tr class="gr-' + r + '"><th class="zh">' + D.rowL[ri] + "</th>" + D.cols.map(function (c, ci) { var k = gkey(fd.k, r, c); var sep = fd.c === "lux", val = v[k] == null || v[k] === "" ? "" : (sep && num(v[k]) != null ? f(num(v[k])) : v[k]); return '<td><input class="in num gin" ' + KPA() + (sep ? ' data-sep="1"' : "") + ' autocomplete="off" id="f_' + k + '" aria-label="' + fd.l + " · " + D.rowL[ri] + " " + D.colL[ci] + '" value="' + esc(val) + '"></td>'; }).join("") + '<td class="avg" id="avg_' + fd.k + "_" + r + '">—</td></tr>';
  });
  return h + '</tbody><tfoot><tr><td colspan="' + (D.cols.length + 2) + '" id="avgall_' + fd.k + '"></td></tr></tfoot></table></div><span class="hint" id="h_' + fd.k + '">المستهدف ' + rangeTxt(fd.c, FORM.vsec) + "</span></div>";
}
document.addEventListener("click", function (ev) {
  var b = ev.target.closest && ev.target.closest("[data-chip]"); if (!b) return;
  var inp = $(b.dataset.chip); if (!inp) return; ev.preventDefault();
  var on = b.getAttribute("aria-pressed") !== "true"; inp.value = on ? b.dataset.v : "";
  b.parentNode.querySelectorAll("[data-chip]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b && on)); });
  inp.dispatchEvent(new Event("change", { bubbles: true }));
});
function inVal(el) { return el.hasAttribute("data-sep") ? el.value.replace(/[,،]/g, "") : el.value; }
function sepFmt(raw) { raw = String(raw).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }).replace(/[^\d]/g, ""); return raw ? Number(raw).toLocaleString("en-US") : ""; }
document.addEventListener("input", function (ev) { var t = ev.target; if (t && t.hasAttribute && t.hasAttribute("data-sep") && !t.__kp) { var nv = sepFmt(t.value); if (nv !== t.value) { t.value = nv; caretEnd(t); } } }, true);
function opts(fd) { return typeof fd.o === "function" ? fd.o() : fd.o; }
function photoHTML(fd) {
  var sx = fd.side ? "_" + fd.side : "", e = FORM.e, cur = !fd.side && e && (e.thumb || e.photo);
  return '<div class="f full" id="w_' + fd.k + '"><span>الصورة' + (fd.req ? ' <span class="req">*</span>' : " (اختياري)") + '</span><div class="photo-btns"><label class="btn" for="f_cam' + sx + '">' + ico("cam", 20) + '&nbsp;الكاميرا</label><label class="btn" for="f_gal' + sx + '">' + ico("gallery", 20) + "&nbsp;المعرض</label></div>" +
    '<input type="file" accept="image/*" capture="environment" id="f_cam' + sx + '" class="photo-in" data-side="' + (fd.side || "") + '" hidden><input type="file" accept="image/*" id="f_gal' + sx + '" class="photo-in" data-side="' + (fd.side || "") + '" hidden>' +
    '<img class="photo-prev" id="f_prev' + sx + '" alt="" ' + (cur ? (e.thumb ? 'src="' + safeImg(e.thumb) + '"' : 'data-photo="' + esc(e.photo) + '"') : "hidden") + "></div>";
}
/* «1. قراءة المحلول» ← رقم في دائرة + العنوان */
function numTitle(t) { var m = /^(\d+)\.\s*(.*)$/.exec(String(t || "")); return m ? '<i class="n">' + m[1] + "</i>" + esc(m[2]) : esc(t); }
function fieldHTML(fd, v) {
  if (fd.t === "grid") return gridHTML(fd, v);
  if (fd.t === "photo") return photoHTML(fd);
  var id = "f_" + fd.k, val = v[fd.k], inp, out = "";
  if (val == null) val = fd.def ? cfg(fd.def, FORM.vsec) : "";
  if (fd.grp) out += '<div class="grp-h">' + numTitle(fd.grp) + "</div>";
  if(fd.k==="gauge1"||fd.k==="gauge2"){var choices=Farm.gaugeChoices(FORM.pressureSpecs[fd.k],val);inp='<select class="in" id="'+id+'"><option value="">لم يُقَس</option>'+choices.map(n=>'<option value="'+n+'" '+(val!==""&&val!=null&&num(val)===n?'selected':'')+'>'+String(n)+' بار</option>').join('')+'</select>';}
  else if (fd.t === "s") { var o = opts(fd); if (val && o.indexOf(val) < 0) o = o.concat([val]); inp = '<select class="in" id="' + id + '"><option value="">—</option>' + o.map(function (x) { return "<option" + (x === val ? " selected" : "") + ">" + esc(x) + "</option>"; }).join("") + "</select>"; }
  else if (fd.t === "batch" && FORM.lockBatch) return '<input type="hidden" id="' + id + '" value="' + esc(val) + '">';
  else if (fd.t === "batch") inp = '<select class="in" id="' + id + '">' + batchOptions(val) + "</select>";
  else if (fd.t === "chips") { var co = opts(fd); if (val && co.indexOf(val) < 0) co = co.concat([val]);
    return out + '<div class="f ' + (fd.w || "") + '" id="w_' + fd.k + '"><span>' + esc(fd.l) + '</span><input type="hidden" id="' + id + '" value="' + esc(val) + '"><div class="cy-chips" role="group" aria-label="' + esc(fd.l) + '">' + co.map(function (x) { return '<button type="button" data-chip="' + id + '" data-v="' + esc(x) + '" aria-pressed="' + (x === val) + '">' + esc(x) + "</button>"; }).join("") + "</div></div>"; }
  else if (fd.t === "chk") return out + '<label class="cy-check ' + (fd.w || "") + '" id="w_' + fd.k + '" for="' + id + '"><input type="checkbox" id="' + id + '"' + (val === true || val === "1" ? " checked" : "") + '><span>' + esc(fd.l) + (fd.hint ? "<small>" + esc(fd.hint) + "</small>" : "") + "</span></label>";
  else if (fd.t === "calc") return out + '<div class="f ' + (fd.w || "") + '" id="w_' + fd.k + '"><span>' + esc(fd.l) + '</span><div class="cy-calc"><span id="cv_' + fd.k + '"><b>—</b></span><small id="ch_' + fd.k + '"></small></div><input type="hidden" id="' + id + '" value="' + esc(val) + '"></div>';
  else if (fd.t === "ta") inp = '<textarea class="in" id="' + id + '">' + esc(val) + "</textarea>";
  else if (fd.t === "t") inp = (fd.opt && !val ? '<span class="muted" style="font-size:12.5px"><input type="checkbox" id="on_' + fd.k + '"> تسجيل هذا الوقت</span>' : "") + timePicker(id, val || (fd.k === "time" && FORM.e ? FORM.e.time : ""));
  else if (fd.t === "x") inp = '<input class="in" id="' + id + '" enterkeyhint="next" value="' + esc(val) + '"' + (fd.list ? ' list="dl_' + fd.list + '"' : "") + (fd.ph ? ' placeholder="' + esc(fd.ph) + '"' : "") + ">";
  else inp = '<div class="unitwrap"><input class="in num' + (fd.big ? " cy-bigin" : "") + '" id="' + id + '" ' + KPA() + ' autocomplete="off"' + (fd.integer ? ' data-integer="1"' : '') + (fd.sep ? ' data-sep="1"' : '') + ' value="' + esc(fd.sep && num(val) != null ? f(num(val)) : val) + '"><span class="u">' + unitOf(fd) + "</span></div>";
  out += '<label class="f ' + (fd.w || "") + '" id="w_' + fd.k + '" for="' + id + '"><span>' + esc(fd.l) + (fd.req ? ' <span class="req">*</span>' : "") + "</span>" + inp + (fd.c || fd.comp ? '<span class="hint" id="h_' + fd.k + '"></span>' : "") + "</label>";
  return out;
}
/* the list of inputs on the form. Split records (sowing, daily photo) repeat the per-side fields for the right and left side. */
function buildFields(T, split) {
  if (!split) { var fl = T.fields.slice(); if (T.photo) fl.push({ k: "photo", t: "photo", side: "", req: T.photo === "req", show: T.photoShow }); return fl; }
  var shared = T.fields.filter(function (fd) { return !fd.edit && !fd.ps; }), blocks = [];
  SK.forEach(function (sd, si) {
    if (T.photo) blocks.push({ k: "photo__" + sd, t: "photo", side: sd, blk: sd, blkT: SIDE_FULL[si], req: T.photo === "req" });
    T.fields.forEach(function (fd) { if (fd.ps) blocks.push(Object.assign({}, fd, { k: fd.k + "__" + sd, base: fd.k, side: sd, blk: sd, blkT: SIDE_FULL[si], grp: null })); });
  });
  return [shared[0]].concat(blocks, shared.slice(1));
}
/* forceSec: قسم التسجيل من صفحة دورة الزراعة (العدّ في المشتل، النقل والحصاد في الأبراج) دون تبديل القسم المعروض */
function openForm(type, e, prefill, forceSec) {
  var sec = e ? secOf(e) : (TYPES_G[type] ? "g" : (forceSec || S.sec)), vsec = sec === "g" ? S.sec : sec, T = typeDef(type, vsec);
  if (!T || !Array.isArray(T.fields)) { toast("نوع تسجيل غير معروف؛ لا يمكن فتحه"); return; }
  FORM = { type: type, e: e, sec: sec, vsec: vsec, photos: {}, modeTouched: !!e, split: !!(T.split && !e), lockBatch: !e && !!(prefill && prefill.batch) };
  FORM.fields = buildFields(T, FORM.split);
  if(type==="waterOnly"&&!e){
    if(Shift.hasPending()){Shift.showPending();return;}
    const draft=Shift.draft(S.date);prefill=draft?.values||{waterMethod:"إدخال اللترات مباشرة"};
    FORM.waterId=draft?.id||S.db.collection("entries").doc().id;
  }
  var v = e ? clone(e.v || {}) : (prefill || {});
  if(type === "refill" || type === "waterOnly") {
    FORM.flow = e && e.v.flowCalibration ? clone(e.v.flowCalibration) : {litres:num(cfg("flowLitres")),minutes:num(cfg("flowMinutes")),seconds:num(cfg("flowSeconds"))};
    FORM.fields = FORM.fields.slice();
    var wi=FORM.fields.findIndex(function(x){return x.k === "waterAdd";});
    FORM.fields.splice(wi,0,{k:"waterMethod",l:"طريقة حساب الماء",t:"s",req:1,o:["بالوقت حتى علامة الامتلاء","إدخال اللترات مباشرة"],w:"full"},
      {k:"fillMinutes",l:"مدة جريان الماء — دقائق",t:"n",integer:true},{k:"fillSeconds",l:"ثوانٍ (من 0 إلى 59)",t:"n",integer:true},
      {k:"fullMark",l:"مستوى الماء بعد التعبئة",t:"s",o:["لم يتم التأكيد","وصل إلى علامة الامتلاء","لم يصل إلى العلامة"],w:"full"});
    if(!v.waterMethod)v.waterMethod=e || prefill ? "إدخال اللترات مباشرة" : "بالوقت حتى علامة الامتلاء";
    FORM.modeTouched=true;
    FORM.manualWater=v.waterMethod === "إدخال اللترات مباشرة" ? (v.waterAdd == null ? "" : String(v.waterAdd)) : "";
    FORM.lastWaterMethod=v.waterMethod;
  }
  if (type === "batt" && e) { if (v.start) v.time = tsHM(v.start); if (v.end) v.endTime = tsHM(v.end); }
  var h = '<div class="sheet-bg" data-close><div class="sheet form-sheet" role="dialog" aria-modal="true" aria-label="' + esc(T.label) + '">' + (window.Rec ? Rec.formHead(T, sec, type, e, window.Cycle ? Cycle.formSub(type, FORM, v) : "") : sheetHead(T.label, sec, type)) + (window.Cycle ? Cycle.formNote(type) : "") + '<form id="entryForm" class="fgrid" novalidate>';
  if (T.fields.some(function (x) { return x.t === "grid"; })) { var zn = cfg("zoneNote", vsec); if (zn) h += '<div class="zone-note" style="margin:0">' + esc(zn) + "</div>"; }
  if(type==="xplant"&&e&&e.v.stockTracked===true)h+='<p class="help full">نقل مسجّل قبل الإصدار 3.4.0 ومرتبط برصيد الجرد: تصحيح عدده يحتاج اتصالاً، ولإلغائه صحّح العدد إلى صفر.</p>';
  if(isWorker()&&e&&e.review)h+='<p class="help full">حفظ التعديل يعيد السجل للمشرف مع السبب والقيم الجديدة.</p>';
  if(type === "refill" || type === "waterOnly")h += '<p class="help full">التعبئة مباشرة إلى خزان الري. أوقف الماء عند علامة الماسورة المثبتة في الموضع والعمق نفسيهما. احسب وقت جريان الماء فقط. الكمية تقديرية وتعتمد على ثبات التدفق. معايرة هذه العملية: '+esc(FORM.flow.litres)+' لتر / '+esc(FORM.flow.minutes)+' دقيقة و '+esc(FORM.flow.seconds)+' ثانية.</p><p class="help full" id="flowResult" aria-live="polite"></p>';
  if(isWorker() && (e || S.date<todayStr()))h+='<label class="f full">سبب التعديل أو التسجيل المتأخر<input class="in" id="changeReason" maxlength="300"></label>';
  if(type==="pump"){FORM.pressureSpecs=clone(normSpecs(e?.v.pressureSpecs)||{gauge1:Farm.gaugeSpec('gauge1'),gauge2:Farm.gaugeSpec('gauge2')});FORM.fields=FORM.fields.map(fd=>FORM.pressureSpecs[fd.k]?Object.assign({},fd,{l:FORM.pressureSpecs[fd.k].name+" · المثالي "+FORM.pressureSpecs[fd.k].ideal+" بار"}):fd);}
  if(['refill','waterOnly','mix','irr'].includes(type)&&!v.stockSource)v.stockSource=Farm.sourceDefault(type,!!e);
  if(type==="waterOnly"){
    h+='<p class="help full">إضافة ماء فقط · EC وpH لم يُقاسا. تبقى جولة القياس مفتوحة.</p>';
    FORM.fields=FORM.fields.filter(fd=>fd.k!=="fullMark");
  }
  var fl = FORM.fields;
  fl.forEach(function (fd, i) {
    if (!fd.blk) { h += fieldHTML(fd, v); return; }
    if (!fl[i - 1] || fl[i - 1].blk !== fd.blk) h += '<div class="blk full blk-' + fd.blk + '"><div class="blk-h">' + numTitle(fd.blkT) + '</div><div class="fgrid">';
    h += fieldHTML(fd, v);
    if (!fl[i + 1] || fl[i + 1].blk !== fd.blk) h += "</div></div>";
  });
  if (FORM.split) h += '<p class="help full" style="margin:0">' + (T.photo ? "صوّر كل جهة في خانتها. إذا صوّرت جهة واحدة فقط تُحفظ وحدها." : "عبّئ الجهة التي زرعتها أو الجهتين معاً. كل جهة تُحفظ كتسجيل مستقل.") + "</p>";
  if (type === "mix") h += '<div class="full help" id="mixHint"></div>';
  h += '<datalist id="dl_crops">' + uniqueCrops().map(function (c) { return '<option value="' + esc(c) + '">'; }).join("") + "</datalist>";
  h += '</form><div id="formErrors" class="full form-errors" role="alert" hidden></div><div class="sheet-actions">' + ((e && !(type==="xplant"&&e.v.stockTracked===true) && !(type==="sow"&&(Farm.balanceOf(e.id)||(window.Cycle&&Cycle.get(e.id)&&Cycle.get(e.id).events.length))) && (!isWorker() || (!e.review && e.date===todayStr()))) ? '<button class="btn danger" type="button" data-act="del" data-id="' + esc(e.id) + '">حذف</button>' : "") + '<button class="btn pri" type="button" data-act="save">' + (sec === "g" ? "حفظ" : "حفظ في " + SECS[sec].name) + "</button></div></div></div>";
  openSheet(h);
  var form = $("entryForm");
  form.addEventListener("input", updForm); form.addEventListener("change", updForm);
  form.addEventListener("submit", function (ev) { ev.preventDefault(); });
  var md = $("f_mode"); if (md) md.addEventListener("change", function () { if (FORM) FORM.modeTouched = true; });
  document.querySelectorAll(".photo-in").forEach(function (inp) { inp.addEventListener("change", onPhotoPick); });
  if(type==="waterOnly"&&!e){
    function remember(){if(FORM?.waterId)Shift.remember(S.date,FORM.waterId,formValues());}
    form.addEventListener("input",remember); form.addEventListener("change",remember);
  }
  if (window.Cycle) Cycle.formInit(FORM);
  updForm(); loadPhotos($("sheetRoot"));
}
function uniqueCrops() { var s = {}; S.meta.forEach(function (e) { if (e.v && e.v.crop) s[e.v.crop] = 1; }); return Object.keys(s); }
function onPhotoPick(ev) {
  var file = ev.target.files && ev.target.files[0]; if (!file || !FORM) return;
  var sd = ev.target.getAttribute("data-side") || "", pv = $("f_prev" + (sd ? "_" + sd : "")); pv.hidden = false; pv.style.opacity = .4;
  shrink(file).then(function (r) { if (!FORM || !r.full) { if (pv) pv.style.opacity = 1; return; } FORM.photos[sd || "_"] = r; pv.src = r.thumb; pv.removeAttribute("data-photo"); pv.style.opacity = 1; });
}
function formValues() {
  var v = {};
  FORM.fields.forEach(function (fd) {
    if (fd.t === "photo") return;
    if (fd.t === "grid") { gridKeysD(fd.k, dimOf(fd)).forEach(function (k) { var el = $("f_" + k); v[k] = el ? inVal(el).trim() : ""; }); return; }
    if (fd.t === "t") { var on = $("on_" + fd.k); v[fd.k] = on && !on.checked ? "" : readTime("f_" + fd.k); return; }
    if (fd.t === "chk") { var cb = $("f_" + fd.k); v[fd.k] = cb && cb.checked ? "1" : ""; return; }
    var el = $("f_" + fd.k); v[fd.k] = el ? inVal(el).trim() : "";
  });
  return v;
}
function flowVolume(cal, minutes, seconds) {
  if(minutes === "" && seconds === "")return null;
  var m=minutes === "" ? 0 : num(minutes),s=seconds === "" ? 0 : num(seconds),cm=num(cal.minutes),cs=num(cal.seconds),l=num(cal.litres),t=cm*60+cs;
  if(![m,s,cm,cs,l].every(Number.isFinite)||!Number.isInteger(m)||!Number.isInteger(s)||m<0||s<0||s>=60||!Number.isInteger(cm)||!Number.isInteger(cs)||cm<0||cs<0||cs>=60||l<=0||t<=0||m*60+s<=0)return null;
  var result=Math.round(l/t*(m*60+s)*100)/100;return Number.isFinite(result) && result>0 ? result : null;
}
function refillSuggest(v, sec) {
  var e0 = ec25(num(v.ec0), num(v.wt)); if (e0 == null) return null;
  if (e0 > num(cfg("ecMax", sec))) return REFILL_MODES[0];
  if (e0 < num(cfg("ecMin", sec))) return REFILL_MODES[2];
  return REFILL_MODES[1];
}
function compTag(fd, n, cv) { return fd.comp === "ph" ? "مصحح ≈" + f(cv, 2) : "≈" + f(cv, 0) + " عند 25°"; }
function updForm() {
  if (!FORM) return;
  if(FORM.type === "refill" || FORM.type === "waterOnly") {
    var timed=$("f_waterMethod").value === "بالوقت حتى علامة الامتلاء", water=$("f_waterAdd");
    var method=$("f_waterMethod").value;
    if(FORM.lastWaterMethod!==method){
      if(FORM.lastWaterMethod === "إدخال اللترات مباشرة")FORM.manualWater=water.value;
      if(!timed)water.value=FORM.manualWater || "";
      FORM.lastWaterMethod=method;
    }
    water.toggleAttribute("data-computed",timed);
    water.readOnly=timed || kpOn(); water.tabIndex=timed ? -1 : 0;
    water.setAttribute("aria-readonly",String(timed));
    $("w_waterAdd").querySelector("span").textContent=timed ? "الماء المضاف — نتيجة محسوبة تقديريًا" : "الماء المضاف باللتر *";
    if(timed && KP.inp===water)kpHide();
    ["fillMinutes","fillSeconds"].forEach(function(k){$("w_"+k).hidden=!timed;$("f_"+k).setAttribute("inputmode",kpOn()?"none":"numeric");});
    var qty=flowVolume(FORM.flow,$("f_fillMinutes").value,$("f_fillSeconds").value);
    if(timed)water.value=qty===null ? "" : String(qty);
    var flowText=timed ? (qty===null ? "أدخل الدقائق والثواني كعددين صحيحين. مثال: دقيقتان و51 ثانية = 2 في الدقائق و51 في الثواني؛ لا تكتب 2.51. الثواني أقل من 60." : "الماء المضاف تقديريًا: "+f(qty,2)+" لتر. لتعديله مباشرة اختر إدخال اللترات مباشرة.") : "سجّل كمية الماء المضافة فعليًا؛ لا تحتاج إدخال مدة.";
    $("flowResult").textContent=flowText;
    var hint=$("waterCalcHint");if(!hint){hint=document.createElement("small");hint.id="waterCalcHint";hint.className="help";$("w_waterAdd").appendChild(hint);}hint.textContent=flowText;
    ["fillMinutes","fillSeconds"].forEach(function(k){var el=$("f_"+k),n=num(el.value),bad=timed && el.value!=="" && (n===null || !Number.isInteger(n)||n<0||(k==="fillSeconds"&&n>59));el.classList.toggle("bad",bad);el.setAttribute("aria-invalid",String(bad));});
  }
  // حدود الجو تختلف بين النهار والليل: نأخذ وقت التسجيل من خانة الوقت إن وُجدت
  var v = formValues(), sec = FORM.vsec, ts = v.time && /^\d{1,2}:\d{2}$/.test(v.time) ? v.time : Date.now();
  if (FORM.type === "refill" && !FORM.modeTouched) { var sg = refillSuggest(v, sec); if (sg && $("f_mode")) { $("f_mode").value = sg; v.mode = sg; } }
  FORM.fields.forEach(function (fd) {
    if (fd.show) { var w = $("w_" + fd.k); if (w) w.hidden = !fd.show(v); }
    if (fd.t === "photo") return;
    if (fd.t === "grid") {
      var D = dimOf(fd), dec = fd.c === "lux" ? 0 : 1;
      D.rows.forEach(function (r) { var vals = D.cols.map(function (c) { var el = $("f_" + gkey(fd.k, r, c)), n = num(inVal(el)); el.classList.toggle("bad", isBad(chk(fd.c, n, sec, ts))); return n; }); $("avg_" + fd.k + "_" + r).textContent = f(avg(vals), dec); });
      var gh = $("h_" + fd.k); if (gh && fd.c) gh.textContent = "المستهدف " + rangeTxt(fd.c, sec, ts);
      var all = avg(gridKeysD(fd.k, D).map(function (k) { return num(v[k]); }));
      $("avgall_" + fd.k).textContent = all == null ? "" : "متوسط " + D.all + " " + f(all, dec) + " · " + D.colL.map(function (l, i) { return l + " " + f(colAvg(v, fd.k, D, i), dec); }).join(" / ");
      return;
    }
    var el = $("h_" + fd.k); if (!el) return;
    var n = num(v[fd.k]), cv = compVal(fd, v[fd.k], v), st = chk(fd.c, cv, sec, ts), tag = "";
    if (fd.comp && n != null && cv != null && !cfg("atc") && num(v.wt) != null) tag = compTag(fd, n, cv);
    el.className = "hint " + (fd.c ? (st || "") : "");
    if (!fd.c) { el.textContent = tag; return; }
    if (fd.w === "third") { el.textContent = n == null ? "" : st === "ok" ? "✓" : (st === "lo" ? "منخفض" : "مرتفع"); return; }
    el.textContent = (n == null ? "المستهدف " + rangeTxt(fd.c, sec, ts) : st === "ok" ? "✓ ضمن المستهدف " + rangeTxt(fd.c, sec, ts) : (st === "lo" ? "أقل" : "أعلى") + " من المستهدف " + rangeTxt(fd.c, sec, ts)) + (tag ? " · " + tag : "");
  });
  if (FORM.type === "mix") mixExpect(v);
  if (window.Cycle) Cycle.formUpdate(FORM, v);
}
/* mixing: from water + A + B, the dose per litre and the salts this mix should give on the meter (±5%) */
function mixExpect(v) {
  var w = num(v.water), a = num(v.mlA), b = num(v.mlB), mh = $("mixHint"), he = $("h_ec"); if (!mh || !he) return;
  if (!w || !a) { mh.textContent = ""; return; }
  var perL = a / w, wt = num(v.wt), atc = cfg("atc"), coef = num(cfg("ecCoef")), rr = num(v.ecRaw);
  var raw25 = rr != null ? ec25(rr, wt) : (num(lastRaw()) != null ? num(lastRaw()) : num(formula().ecRaw));
  var e25 = raw25 + kUse().k * perL, dev = function (x) { return atc || wt == null ? x : x * (1 + coef * (wt - 25)); };
  var exp = dev(e25), lo = exp * 0.95, hi = exp * 1.05, nd = doses().filter(function (d) { return Math.abs(d - perL) <= 0.15; })[0];
  var where = !atc && wt != null ? " على جهازك عند " + f(wt, 1) + "°" : "";
  mh.innerHTML = "المعدل: A <b class=\"num\">" + f(perL, 2) + "</b> مل/لتر · B <b class=\"num\">" + f(b / w, 2) + "</b> مل/لتر" + (nd != null ? " · يحاكي <b>جرعة " + fml(nd) + " مل</b>" : "");
  var n = num(v.ec), txt = "المتوقع لهذه الخلطة" + where + ": " + f(lo) + " – " + f(hi) + " (≈ " + f(exp) + ")", cls = "hint";
  if (n != null) { var dp = (n / exp - 1) * 100; if (Math.abs(dp) <= 5) { txt = "✓ مطابقة · " + txt; cls = "hint ok"; } else { txt = "قراءتك " + (dp > 0 ? "أعلى" : "أقل") + " من المتوقع بـ " + f(Math.abs(dp), 0) + "% · " + txt; cls = "hint " + (dp > 0 ? "hi" : "lo"); } }
  he.className = cls; he.textContent = txt;
}
function needOneOk(T, v) {
  if (!T.needOne) return true;
  return T.needOne.some(function (k) { var keys = NK[k] ? gridKeys(k).concat(NK[k]) : [k]; return keys.some(function (kk) { return num(v[kk]) != null; }); });
}
function saveForm(btn) {
  if(!FORM || FORM.saving || btn.disabled)return;
  updForm();
  var type = FORM.type, e = FORM.e, T = typeDef(type, FORM.vsec), raw = formValues(), v = {}, miss = [], wasOther = false;
  var sideName = function (fd) { return fd.side ? SIDES[SK.indexOf(fd.side)] + ": " : ""; };
  FORM.fields.forEach(function (fd) {
    if (fd.t === "photo") return;
    if (fd.t === "grid") { gridKeysD(fd.k, dimOf(fd)).forEach(function (k) { var x = raw[k]; if (x === "") { v[k] = ""; return; } var n = num(x); if (n == null) miss.push(fd.l + " (رقم غير صحيح)"); else v[k] = n; }); return; }
    var x = raw[fd.k];
    if((type === "refill" || type === "waterOnly") && (fd.k === "fillMinutes" || fd.k === "fillSeconds") && raw.waterMethod !== "بالوقت حتى علامة الامتلاء"){v[fd.k]="";return;}
    if (fd.show && !fd.show(raw)) { v[fd.k] = ""; return; }
    if (fd.t === "n" && x !== "") { var n = num(x); if (n == null) { miss.push(sideName(fd) + (fd.cl || fd.l) + " (رقم غير صحيح)"); return; } x = n; }
    if (fd.req && !fd.side && (x === "" || x == null)) miss.push((fd.pg ? MNAME[fd.pg] + " " : "") + fd.l);
    v[fd.k] = x;
  });
  if(type === "refill" || type === "waterOnly") {
    if(v.waterMethod === "بالوقت حتى علامة الامتلاء") {
      var amount=flowVolume(FORM.flow,raw.fillMinutes,raw.fillSeconds);
      if(amount===null)miss.push("مدة التعبئة: أدخل دقائق صحيحة وثواني من 0 إلى 59 (مثال 2 و51)، وتحقق من معايرة التدفق في الإعدادات");
      else {v.waterAdd=amount;v.flowCalibration=clone(FORM.flow);v.waterEstimated=true;}
    } else {v.flowCalibration=null;v.waterEstimated=false;v.fillMinutes="";v.fillSeconds="";}
    ["drained","mlA","mlB","level0","level1"].forEach(function(k){if(num(v[k])!==null&&num(v[k])<0)miss.push("لا تقبل "+FORM.fields.find(function(fd){return fd.k===k;}).l+" قيمة سالبة");});
    if(num(v.waterAdd)===null || num(v.waterAdd)<0)miss.push("كمية الماء يجب ألا تكون سالبة");
  }
  if (type === "note" && v.cat === NOTE_OTHER) { v.cat = v.catX; wasOther = true; }
  delete v.catX;
  var groups = [];
  if (FORM.split) {
    var shared = {}; FORM.fields.forEach(function (fd) { if (!fd.side && fd.t !== "photo") shared[fd.k] = v[fd.k]; });
    SK.forEach(function (sd, si) {
      var sv = {}, used = !!FORM.photos[sd], req = [];
      FORM.fields.forEach(function (fd) { if (fd.side !== sd || fd.t === "photo") return; sv[fd.base] = v[fd.k]; if (v[fd.k] !== "" && v[fd.k] != null) used = true; if (fd.req) req.push(fd); });
      if (!used) return;
      req.forEach(function (fd) { if (sv[fd.base] === "" || sv[fd.base] == null) miss.push(SIDES[si] + ": " + fd.l); });
      if (T.photo === "req" && !FORM.photos[sd]) miss.push(SIDES[si] + ": الصورة");
      groups.push({ v: Object.assign({}, shared, sv, { side: SIDES[si] }), photo: FORM.photos[sd] });
    });
    if (!groups.length) miss.push(T.photo === "req" ? "صورة جهة واحدة على الأقل" : "بيانات جهة واحدة على الأقل");
  } else {
    if (!needOneOk(T, e ? Object.assign({}, e.v, v) : v)) miss.push(type === "irr" ? "كمية الري لجهة واحدة على الأقل" : "قراءة واحدة على الأقل");
    if (T.photo === "req" && !FORM.photos._ && !(e && e.photo)) miss.push("الصورة");
  }
  if(isWorker() && (e?.date||S.date)>todayStr())miss.push("لا يمكن تسجيل عملية بتاريخ مستقبلي");
  if(window.Cycle)Cycle.validate(type,v,miss,FORM);
  Farm.validateEntry(type,v,miss);
  if(type==="waterOnly"&&!(num(v.waterAdd)>0))miss.push("كمية الماء المضافة يجب أن تكون موجبة");
  var reason=$("changeReason");
  if(e && isWorker() && e.review && Object.keys(FORM.photos).length)miss.push("للصورة المعتمدة اطلب من المشرف تعديل الصورة مباشرة");
  /* 3.5.0: طلب تصحيح واحد معلّق لكل تسجيل (الزر يختفي، وهذا الفحص يمنع نموذجاً فُتح قبل وصول الطلب الأول) */
  if(e && isWorker() && e.review && Farm.pendingChange(e.id))miss.push("لهذا التسجيل طلب تصحيح ينتظر قرار المشرف. انتظر القرار ثم أرسل طلباً جديداً إن لزم");
  if(reason && !reason.value.trim())miss.push("سبب التعديل أو التسجيل المتأخر");
  if (miss.length) { kpHide();var errorBox=$("formErrors");errorBox.hidden=false;errorBox.textContent="لم يُحفظ التسجيل. صحح التالي: "+Array.from(new Set(miss)).join("، ");errorBox.scrollIntoView({block:"center"});return; }
  $("formErrors").hidden=true;
  btn.disabled = true; btn.textContent = "جارٍ الحفظ…";
  if(type==="waterOnly"&&!e){
    Farm.setStockTime(null,type,S.date,v);
    try{Shift.enqueue(FORM.waterId,{type,sec:"t",date:S.date,time:v.time,ts:Date.now(),by:S.uid,v},reason?.value||"");closeSheet();Shift.flush();render();}
    catch(error){btn.disabled=false;btn.textContent="إعادة المحاولة";$("formErrors").hidden=false;$("formErrors").textContent=errMsg(error);}
    return;
  }
  /* نقل 3.3.0 المتتبَّع برصيد الجرد يُصحَّح داخل transaction. النقل الجديد تسجيل عادي (يُحفظ بدون إنترنت) */
  if(type==="xplant"&&e&&e.v.stockTracked===true){
    const submitted=FORM;submitted.saving=true;
    GSUI.commit(Farm.saveMovement(submitted,v,reason?.value.trim()||""),btn,()=>{if(FORM===submitted)closeSheet();toast(e&&isWorker()&&e.review?"أُرسل طلب التصحيح":"أكد الخادم حفظ النقل");}).finally(()=>{submitted.saving=false;});return;
  }
  var wb = S.db.batch(), date = e ? e.date : S.date, col = S.db.collection("entries");
  var putPhoto = function (ph) { var pref = S.db.collection("photos").doc(); wb.set(pref, { data: ph.full, by: S.uid, ts: Date.now(), sec: FORM.sec }); S.photos[pref.id] = ph.full; return pref.id; };
  if (type === "batt") { v.start = hmToTs(date, v.time); v.end = v.endTime ? hmToTs(date, v.endTime, v.start) : null; delete v.endTime; }
  Farm.setStockTime(e,type,date,v);
  if (e) {
    var nv = Object.assign(clone(e.v || {}), v), up = { v: nv, time: nv.time };
    if (FORM.photos._) { up.photo = putPhoto(FORM.photos._); up.thumb = FORM.photos._.thumb; }
    if (type === "note" && nv.cat === NOTE_NONE) up.open = false;
    if(reason) Farm.audit(wb,e.id,e,nv,reason.value);
    if(!(isWorker() && e.review))wb.update(col.doc(e.id), up);
  } else if (FORM.split) {
    var grp = col.doc().id;
    groups.forEach(function (g) { var d = { type: type, sec: FORM.sec, date: date, time: g.v.time, ts: Date.now(), by: S.uid, v: g.v, grp: grp }; if (g.photo) { d.photo = putPhoto(g.photo); d.thumb = g.photo.thumb; } var ref=col.doc();if(reason)Farm.audit(wb,ref.id,null,d.v,reason.value);wb.set(ref,d); });
  } else {
    var d = { type: type, sec: FORM.sec, date: date, time: v.time, ts: Date.now(), by: S.uid, v: v };
    if (FORM.photos._) { d.photo = putPhoto(FORM.photos._); d.thumb = FORM.photos._.thumb; }
    if (type === "note") d.open = v.cat !== NOTE_NONE;
    var ref=col.doc();if(reason)Farm.audit(wb,ref.id,null,d.v,reason.value);wb.set(ref,d);
  }
  if (wasOther && isSup() && v.cat && noteCats().indexOf(v.cat) < 0) wb.update(S.db.collection("config").doc("settings"), { noteCats: (Array.isArray(S.settings.noteCats) ? S.settings.noteCats : []).concat([v.cat]) });
  /* الصورة والتسجيل يُحفظان معاً أو لا يُحفظ أيٌّ منهما */
  var submitted=FORM,where=FORM.sec==='g'?'':' في '+SECS[FORM.sec].name;
  submitted.saving=true;
  GSUI.commit(wb.commit(),btn,function(){submitted.saving=false;if(FORM===submitted)closeSheet();toast(e&&isWorker()&&e.review?'أُرسل طلب التصحيح للمشرف':'تم تأكيد الحفظ'+where);}).then(function(){submitted.saving=false;});
}
function hmToTs(date, hm, after) { var d = new Date(date + "T" + hm + ":00+03:00").getTime(); if (after && d < after) d += 864e5; return d; }
function shrink(file) {
  return new Promise(function (res) {
    var img = new Image(), u = URL.createObjectURL(file);
    img.onload = function () {
      var draw = function (m, q, lim) { var r = Math.min(1, m / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); var out = c.toDataURL("image/jpeg", q); while (out.length > lim && q > .3) { q -= .1; out = c.toDataURL("image/jpeg", q); } return out; };
      var full = draw(1100, .72, 650000), thumb = draw(240, .6, 30000); URL.revokeObjectURL(u); res({ full: full, thumb: thumb });
    };
    img.onerror = function () { res({ full: null, thumb: null }); };
    img.src = u;
  });
}

/* ================= calculator ================= */
var CALC = { open: false, mode: "refill", stage: "ec", res: null };
function kFormula() { var F = formula(); return num(F.fullA) ? (num(F.ecFull) - num(F.ecRaw)) / num(F.fullA) : 93; }
function kLearned() {
  var F = formula(), ks = [];
  S.hist.forEach(function (r) {
    if (r.type !== "mix" || (r.date || "") < (F.date || "")) return; var v = r.v || {}, w = num(v.water), a = num(v.mlA), t = num(v.wt);
    var ec = ec25(num(v.ec), t), raw = ec25(num(v.ecRaw), t);
    if (w > 0 && a > 0 && ec != null && raw != null && ec > raw) ks.push((ec - raw) / (a / w));
  });
  ks = ks.slice(-12); return { k: median(ks), n: ks.length };
}
function kUse() { var L = kLearned(), kf = kFormula(); if (cfg("useLearned") && L.n >= 3) return { k: L.k, src: "learned", n: L.n }; return { k: kf, src: "formula", n: L.n }; }
function phRate(sec, dir) {
  var arr = [];
  S.hist.forEach(function (r) {
    if (sec && secOf(r) !== sec) return; var v = r.v || {}, ml = num(dir === "down" ? v.phDownMl : v.phUpMl), a = num(v.phRaw), b = num(v.ph);
    var V = r.type === "mix" ? num(v.water) : (lvlToL(num(v.level1)) || num(cfg("tankL", "t")));
    if (ml > 0 && a != null && b != null && V > 0 && (dir === "down" ? a - b : b - a) > 0.05) arr.push(ml / (V * Math.abs(a - b)));
  });
  arr = arr.slice(-10); return { r: median(arr), n: arr.length };
}
/* doses in mL of A per litre (B follows the formula ratio). The "full dose" is chosen by the supervisor (default 12.5). */
function doses() { var d = S.settings.doses; d = Array.isArray(d) && d.length ? d : DEF.doses; var u = {}; return d.map(num).filter(function (x) { if (!(x > 0) || u[x]) return false; u[x] = 1; return true; }).sort(function (a, b) { return a - b; }); }
function fullDose() { var x = num(S.settings.fullDose); if (!(x > 0)) { var d = doses(); x = d[d.length - 1] || num(formula().fullA); } return x; }
function doseRatio() { var F = formula(); return num(F.fullB) / num(F.fullA); }
function doseName(d) { return "جرعة " + fml(d) + " مل"; }
/* meter check: the same sample read cold (e1 at t1) and warm (e2 at t2). Without ATC the reading follows EC25·(1+α(t−25)),
   so α = (r−1) / ((t2−25) − r(t1−25)) with r = e2/e1. A meter with ATC gives α ≈ 0. */
function atcAlpha(e1, t1, e2, t2) { var r = e2 / e1; return (r - 1) / ((t2 - 25) - r * (t1 - 25)); }
/* pure math (also verified by the system check) */
function ecTo25(ec, t, coef) { return ec / (1 + coef * (t - 25)); }
function phTo25(ph, t) { return 7 + (ph - 7) * 298.15 / (t + 273.15); }
function freshMath(raw25, t25, V, k, ratio) { var perL = (t25 - raw25) / k; return { perL: perL, mlA: perL * V, mlB: perL * V * ratio }; }
function refillMath(o) {
  var Vc = o.Vc, Vf = Math.max(o.Vf, o.Vc), cap = o.cap, cur = o.cur, raw = o.raw, tgt = o.tgt;
  var Vadd = Vf - Vc, base = (cur * Vc + raw * Vadd) / Vf, r = { water: Vadd, drain: 0, mA: 0, mB: 0, finalV: Vf, mode: 1 };
  if (base > tgt + 25) {
    var Vw = Vc * (cur - tgt) / (tgt - raw);
    if (Vc + Vw <= cap) { r.water = Vw; r.finalV = Vc + Vw; }
    else { r.drain = Math.max(0, (cur * Vc + raw * (cap - Vc) - tgt * cap) / (cur - raw)); r.water = cap - Vc + r.drain; r.finalV = cap; }
    r.mode = 0;
  } else if (base < tgt - 25) { r.mA = (tgt - base) * Vf / o.k; r.mode = cur < o.ecMin ? 2 : 1; }
  else r.mode = Vadd > 0 ? 0 : 1;
  r.mB = r.mA * o.ratio; return r;
}
function lastRaw() { var e = lastOf(S.hist, function (r) { return r.v && num(r.v.ecRaw) != null; }); return e ? num(e.v.ecRaw) : ""; }
function lastWt() { var e = lastOf(S.entries, function (r) { return r.type !== "temp" && r.v && num(r.v.wt) != null; }); return e ? num(e.v.wt) : ""; }
function openCalc() {
  var sec = S.sec, F = formula(), ki = kUse(); CALC.open = true; CALC.stage = "ec"; CALC.mode = sec === "n" ? "fresh" : "refill";
  var tk = sec === "t" ? tankState() : null;
  var h = '<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("حاسبة المحلول", sec, "calc");
  if (sec === "t") h += '<div class="seg" role="group" style="margin-bottom:12px"><button type="button" data-act="cmode" data-m="refill" aria-pressed="' + (CALC.mode === "refill") + '">تعويض الخزان</button><button type="button" data-act="cmode" data-m="fresh" aria-pressed="' + (CALC.mode === "fresh") + '">تجهيز خزان جديد</button></div>';
  h += '<form id="calcForm" class="fgrid" novalidate><div class="full help" id="c_mode_help"></div>';
  h += '<div class="grp-h c-ref">الخزان الآن</div>' +
    '<label class="f c-ref" for="c_level">مستوى الماء الآن<div class="unitwrap"><input class="in num" id="c_level" ' + KPA() + '><span class="u">' + lvlUnit() + "</span></div></label>" +
    '<label class="f c-ref" for="c_vol">الحجم بعد التعويض<div class="unitwrap"><input class="in num" id="c_vol" ' + KPA() + ' value="' + esc(cfg("tankL", "t")) + '"><span class="u">لتر</span></div><span class="hint">سعة الخزان ' + f(num(cfg("tankL", "t"))) + " لتر</span></label>" +
    '<label class="f c-ref full" for="c_ecCur">أملاح الخزان الآن<div class="unitwrap"><input class="in num" id="c_ecCur" ' + KPA() + '><span class="u">µS/cm</span></div><span class="hint" id="hc_ecCur"></span></label>';
  h += '<div class="grp-h c-fresh">الماء</div><label class="f c-fresh full" for="c_water">كمية الماء<div class="unitwrap"><input class="in num" id="c_water" ' + KPA() + ' value="' + esc(cfg("tankL", sec)) + '"><span class="u">لتر</span></div></label>';
  h += '<label class="f" for="c_raw">أملاح ماء المصدر<div class="unitwrap"><input class="in num" id="c_raw" ' + KPA() + ' value="' + esc(lastRaw()) + '"><span class="u">µS/cm</span></div><span class="hint" id="hc_raw"></span></label>' +
    '<label class="f" for="c_wt">حرارة الماء<div class="unitwrap"><input class="in num" id="c_wt" ' + KPA() + ' value="' + esc(lastWt()) + '"><span class="u">°C</span></div></label>';
  var DS = doses(), ratio0 = doseRatio();
  h += '<div class="grp-h">الهدف</div><div class="full c-fresh"><div class="stagebar" id="c_stages"><button type="button" data-act="cstage" data-s="ec" aria-pressed="true">حسب الأملاح<b>المستهدفة</b></button>' + DS.map(function (d) { return '<button type="button" data-act="cstage" data-s="' + d + '" aria-pressed="false"><span class="num">' + fml(d) + ' مل</span><b class="num" data-dexp="' + d + '">—</b></button>'; }).join("") + '<button type="button" data-act="cstage" data-s="custom" aria-pressed="false">جرعة أخرى<b>اكتبها</b></button></div>' +
    '<p class="help" style="margin:6px 0 0">الجرعة = مل من A ' + (Math.abs(ratio0 - 1) < 1e-6 ? "ومثلها من B" : "ومعها B بنسبة الخلطة") + ' لكل لتر ماء. الرقم تحتها = الأملاح المتوقعة على جهازك (µS/cm).' + (isSup() ? ' <button type="button" class="linkbtn" data-act="editDoses" data-from="calc">تعديل الجرعات</button>' : "") + "</p></div>";
  h += '<label class="f full c-fresh" for="c_dose" id="w_c_dose" hidden>جرعة A لكل لتر<div class="unitwrap"><input class="in num" id="c_dose" ' + KPA() + '><span class="u">مل/لتر</span></div><span class="hint">B تُحسب تلقائياً بنسبة الخلطة (' + fml(ratio0) + " مل B لكل 1 مل A)</span></label>";
  h += '<label class="f full" for="c_target" id="w_c_target">الأملاح المستهدفة<div class="unitwrap"><input class="in num" id="c_target" ' + KPA() + ' value="' + esc(cfg("ecTarget", sec)) + '"><span class="u">µS/cm</span></div><span class="hint">الحدود لـ' + SECS[sec].name + ": " + rangeTxt("ec", sec) + "</span></label>";
  h += '</form><div id="calcOut" style="margin-top:14px"></div>';
  h += '<div class="card" style="margin-top:12px"><h3>ضبط pH</h3><div class="fgrid" style="margin-top:8px"><label class="f full" for="c_ph">قراءة pH بعد إضافة السماد<div class="unitwrap"><input class="in num" id="c_ph" ' + KPA() + '><span class="u">pH</span></div></label></div><div id="phOut" class="help" style="margin-top:8px"></div></div>';
  h += '<p class="help" style="margin-top:10px">أساس الحساب: ' + esc(F.name) + " · كل 1 مل A + " + fml(num(F.fullB) / num(F.fullA)) + " مل B لكل لتر يرفع الأملاح ≈ <b>" + f(ki.k) + "</b> µS/cm " + (ki.src === "learned" ? "(محسوب من آخر " + ki.n + " خلطات مسجلة)" : "(من الخلطة المعتمدة)") + ". تُستخدم قراءة الجهاز كما سُجّلت.</p>";
  h += '<div class="sheet-actions"><button class="btn pri" type="button" data-act="calcToForm">تسجيل بهذه الكميات</button></div></div></div>';
  openSheet(h);
  $("calcForm").addEventListener("input", calcRun); $("c_ph").addEventListener("input", calcRun);
  $("calcForm").addEventListener("submit", function (ev) { ev.preventDefault(); });
  if (tk && tk.ec != null) $("c_ecCur").placeholder = "آخر قراءة ≈ " + f(tk.ec);
  calcRun();
}
function calcRun() {
  if (!CALC.open || !$("calcOut")) return;
  var sec = S.sec, out = $("calcOut"), F = formula(), k = kUse().k, ratio = num(F.fullB) / num(F.fullA), wt = num($("c_wt").value), coef = num(cfg("ecCoef")), atc = cfg("atc");
  var fresh = CALC.mode === "fresh";
  document.querySelectorAll(".c-ref").forEach(function (x) { x.hidden = fresh; }); document.querySelectorAll(".c-fresh").forEach(function (x) { x.hidden = !fresh; });
  $("w_c_target").hidden = fresh && CALC.stage !== "ec";
  $("w_c_dose").hidden = !(fresh && CALC.stage === "custom");
  $("c_mode_help").textContent = fresh ? (sec === "t" ? "تجهيز خزان جديد: تفريغ الخزان وتعبئته بماء المصدر ثم إضافة A و B." : "نظام مفتوح: كل خلطة تُحضّر من ماء المصدر مباشرة.") : "نظام مغلق: الحساب على الماء الموجود في الخزان وأملاحه الحالية، ثم ما يلزم إضافته للوصول للهدف.";
  var rawR = num($("c_raw").value), raw = ec25(rawR == null ? 0 : rawR, wt), tgt = num($("c_target").value);
  var corr = function (id, val) { var el = $(id); if (el) el.textContent = val != null && !atc && wt != null ? "≈ " + f(val) + " عند 25°" : ""; };
  corr("hc_raw", rawR != null ? raw : null);
  var expRead = function (t25) { return atc || wt == null ? t25 : t25 * (1 + coef * (wt - 25)); };
  document.querySelectorAll("#c_stages [data-dexp]").forEach(function (el) { el.textContent = rawR == null ? "—" : "≈ " + f(expRead(raw + k * num(el.getAttribute("data-dexp")))); });
  var res = null, h = "", Vph = null;
  if (rawR == null) h = '<div class="empty">اكتب أملاح ماء المصدر.</div>';
  else if (fresh) {
    var V = num($("c_water").value), perL, t25;
    if (CALC.stage !== "ec") { perL = CALC.stage === "custom" ? num($("c_dose").value) : CALC.stage; t25 = perL != null ? raw + k * perL : null; } else { t25 = tgt; perL = tgt != null ? (tgt - raw) / k : null; }
    if (!V || perL == null) h = '<div class="empty">اكتب كمية الماء و' + (CALC.stage === "custom" ? "جرعة A لكل لتر" : "الهدف") + ".</div>";
    else if (perL <= 0) h = '<div class="banner warn">أملاح ماء المصدر (' + f(raw) + ") أعلى من أو تساوي الهدف. لا تضف سماداً قبل مراجعة المشرف.</div>";
    else {
      var FM = freshMath(raw, t25, V, k, ratio), mlA = FM.mlA, mlB = FM.mlB, st = chk("ec", t25, sec); Vph = V;
      res = { kind: "fresh", water: V, ecRaw: rawR, wt: wt, mlA: Math.round(mlA * 10) / 10, mlB: Math.round(mlB * 10) / 10 };
      h = '<div class="res-big"><div class="stat" style="border-color:var(--accent-2)"><span class="lab">محلول A</span><span class="val num">' + fml(mlA) + ' <small>مل</small></span><span class="sub num">' + f(perL, 2) + ' مل لكل لتر</span></div><div class="stat" style="border-color:var(--accent-2)"><span class="lab">محلول B</span><span class="val num">' + fml(mlB) + ' <small>مل</small></span><span class="sub num">' + f(perL * ratio, 2) + " مل لكل لتر</span></div></div>" +
        '<div class="card" style="margin-top:10px"><dl class="kv"><dt>الجرعة</dt><dd class="num">' + fml(perL) + " مل A + " + fml(perL * ratio) + " مل B لكل لتر</dd><dt>الأملاح المتوقعة</dt><dd><b class=\"num\">" + f(t25) + "</b> µS/cm " + (st === "ok" ? '<span class="pill ok">ضمن الحد</span>' : '<span class="pill bad">خارج الحد ' + rangeTxt("ec", sec) + "</span>") + "</dd>" +
        (!atc && wt != null ? "<dt>القراءة المتوقعة على جهازك</dt><dd><b class=\"num\">" + f(expRead(t25)) + "</b> µS/cm عند " + f(wt, 1) + "°</dd>" : "") + "</dl></div>" +
        '<div class="card" style="margin-top:10px"><h3>خطوات الخلط</h3><ol class="cal-steps"><li>ضع <b class="num">' + f(V) + "</b> لتر ماء أولاً، ولا تضف المركّز لإناء فارغ.</li><li>أضف <b>A</b>: <b class=\"num\">" + fml(mlA * .9) + "</b> مل (90%) وحرّك جيداً.</li><li>أضف <b>B</b>: <b class=\"num\">" + fml(mlB * .9) + "</b> مل وحرّك. لا تخلط A و B مركّزين أبداً.</li><li>قِس الأملاح. إذا كانت أقل من <b class=\"num\">" + f(expRead(t25)) + "</b> أكمل الـ 10% الباقية (" + fml(mlA * .1) + " مل A ثم " + fml(mlB * .1) + " مل B).</li><li>اضبط pH بعد ضبط الأملاح، ثم سجّل الكميات الفعلية.</li></ol></div>";
    }
  } else {
    var Vc = lvlToL(num($("c_level").value)), cap = num(cfg("tankL", "t")), Vf = num($("c_vol").value) || cap, curR = num($("c_ecCur").value), cur = ec25(curR, wt);
    corr("hc_ecCur", curR != null ? cur : null);
    if (Vc == null || cur == null || tgt == null) h = '<div class="empty">اكتب مستوى الماء الآن وأملاح الخزان والهدف.</div>';
    else if (tgt <= raw) h = '<div class="banner warn">الهدف أقل من أملاح ماء المصدر، لا يمكن الوصول إليه بالتخفيف.</div>';
    else {
      var RM = refillMath({ Vc: Vc, cur: cur, raw: raw, tgt: tgt, Vf: Vf, cap: cap, k: k, ratio: ratio, ecMin: num(cfg("ecMin", "t")) });
      var water = RM.water, drain = RM.drain, mA = RM.mA, mB = RM.mB, finalV = RM.finalV, mode = RM.mode, note = RM.drain > 0 ? "الخزان لا يتسع لكمية التخفيف المطلوبة، لذلك يلزم تصريف جزء أولاً." : "";
      var perAddL = water > 0 ? mA / water : 0; Vph = finalV;
      res = { kind: "refill", wt: wt, level0: num($("c_level").value), ec0: curR, mode: REFILL_MODES[mode], waterAdd: Math.round(water), drained: Math.round(drain), mlA: Math.round(mA * 10) / 10, mlB: Math.round(mB * 10) / 10 };
      var expl = ["الأملاح أعلى من الهدف: النبات استهلك الماء أكثر من العناصر، فيُضاف ماء فقط لخفض التركيز.", "الأملاح ضمن المدى: يُعوَّض النقص بمحلول بتركيز الهدف للحفاظ على التركيز.", "الأملاح أقل من الحد: النبات استهلك العناصر أكثر من الماء، فيُضاف محلول مُعزَّز لرفع التركيز."][mode];
      h = '<div class="res-case c' + mode + '">' + REFILL_MODES[mode] + "<small>" + expl + "</small></div>" + (note ? '<div class="banner warn" style="margin-bottom:10px">' + note + "</div>" : "") +
        '<div class="res-big">' + (drain > 0 ? '<div class="stat" style="border-color:var(--bad)"><span class="lab">صرّف أولاً</span><span class="val num">' + f(drain) + " <small>لتر</small></span></div>" : "") +
        '<div class="stat" style="border-color:var(--accent-2)"><span class="lab">الماء المضاف</span><span class="val num">' + f(water) + ' <small>لتر</small></span><span class="sub">الحجم بعدها ' + f(finalV) + " لتر</span></div>" +
        (mA > 0 ? '<div class="stat" style="border-color:var(--accent-2)"><span class="lab">محلول A</span><span class="val num">' + fml(mA) + ' <small>مل</small></span><span class="sub num">' + (water > 0 ? f(perAddL, 2) + " مل لكل لتر مضاف" : "") + '</span></div><div class="stat" style="border-color:var(--accent-2)"><span class="lab">محلول B</span><span class="val num">' + fml(mB) + " <small>مل</small></span></div>" : "") + "</div>" +
        '<div class="card" style="margin-top:10px"><dl class="kv"><dt>الأملاح الآن</dt><dd class="num">' + f(cur) + "</dd><dt>الأملاح المتوقعة بعد التعويض</dt><dd><b class=\"num\">" + f(tgt) + "</b> µS/cm</dd>" + (!atc && wt != null ? "<dt>القراءة المتوقعة على جهازك</dt><dd><b class=\"num\">" + f(expRead(tgt)) + "</b> عند " + f(wt, 1) + "°</dd>" : "") + "</dl></div>" +
        '<div class="card" style="margin-top:10px"><h3>الخطوات</h3><ol class="cal-steps">' + (drain > 0 ? "<li>صرّف <b class=\"num\">" + f(drain) + "</b> لتر من الخزان.</li>" : "") + "<li>أضف <b class=\"num\">" + f(water) + "</b> لتر من ماء المصدر وشغّل المضخة للتقليب.</li>" + (mA > 0 ? "<li>أضف <b>A</b>: <b class=\"num\">" + fml(mA * .9) + "</b> مل (90%) في الخزان مع التقليب.</li><li>أضف <b>B</b>: <b class=\"num\">" + fml(mB * .9) + "</b> مل بعد امتزاج A.</li><li>بعد 10–15 دقيقة تقليب قِس الأملاح، وأكمل الباقي إن لزم.</li>" : "<li>بعد 10–15 دقيقة تقليب قِس الأملاح.</li>") + "<li>اضبط pH ثم سجّل التعويض.</li></ol></div>";
    }
  }
  out.innerHTML = h; CALC.res = res;
  var phR = num($("c_ph").value), po = $("phOut"), lo = num(cfg("phMin", sec)), hi = num(cfg("phMax", sec)), mid = (lo + hi) / 2;
  if (phR == null) { po.innerHTML = "المستهدف " + f(lo, 1) + " – " + f(hi, 1) + (!atc && wt != null && Math.abs(phAt(mid, wt) - mid) >= .01 ? " · منتصف الهدف كما يظهر على جهازك عند " + f(wt, 1) + "°: <b class=\"num\">" + f(phAt(mid, wt), 2) + "</b>" : ""); return; }
  if (res) res.phRaw = phR;
  var p25 = ph25(phR, wt), txt = (!atc && wt != null && Math.abs(p25 - phR) > .005 ? "pH بعد تصحيح أثر الحرارة على القطب: <b class=\"num\">" + f(p25, 2) + "</b> (الفرق صغير في مدى 5.5–6.5). " : "");
  if (p25 > hi) { var rd = phRate(sec, "down"); txt += "pH أعلى من المستهدف، يلزم <b>خافض</b>. " + (rd.r && Vph ? "الكمية التقديرية من سجلاتكم: <b class=\"num\">" + fml(rd.r * Vph * (p25 - mid)) + "</b> مل. أضف 70% منها ثم قِس." : "سجّل 2–3 عمليات ضبط pH بالكميات لتظهر الكمية المقترحة تلقائياً."); }
  else if (p25 < lo) { var ru = phRate(sec, "up"); txt += "pH أقل من المستهدف، يلزم <b>رافع</b>. " + (ru.r && Vph ? "الكمية التقديرية: <b class=\"num\">" + fml(ru.r * Vph * (mid - p25)) + "</b> مل. أضف 70% منها ثم قِس." : "سجّل عمليات ضبط بالرافع لتظهر الكمية المقترحة."); }
  else txt += '<span class="pill ok">pH ضمن المستهدف</span> لا يحتاج ضبطاً.';
  po.innerHTML = txt;
}

/* ================= gallery & sow plan ================= */
function openGallery() {
  var sec = S.sec;
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("صور النمو", sec, "gallery") + '<div id="galBody"><div class="empty">جارٍ التحميل…</div></div></div></div>');
  photoQuery().then(function (q) {
    var list = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (e) { return secOf(e) === sec; }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    var groups = {}, order = [];
    list.forEach(function (e) {
      var v = e.v || {}, b = v.batch ? sowBatches().filter(function (x) { return x.id === v.batch; })[0] : null;
      var sd = v.side ? " · " + v.side : "";
      var key = (b ? "b:" + b.id : "l:" + (v.loc || "") + "|" + (v.lvl || "")) + "|" + (v.side || ""), lab = (b ? "دفعة " + (b.v.crop || "") + " · زُرعت " + fmtShort(b.date) : ((v.loc || (v.side ? "" : "بدون مكان")) + (v.lvl ? " · " + v.lvl : ""))) + sd;
      lab = lab.replace(/^ · /, "");
      if (!groups[key]) { groups[key] = { lab: lab, b: b, items: [] }; order.push(key); }
      groups[key].items.push(e);
    });
    var gb = $("galBody"); if (!gb) return;
    if (!order.length) { gb.innerHTML = '<div class="empty">لا توجد صور بعد في ' + SECS[sec].name + '. سجّل "التصوير اليومي" من تبويب التسجيل.</div>'; return; }
    gb.innerHTML = order.reverse().map(function (k) {
      var g = groups[k];
      return '<div class="card" style="margin-bottom:10px"><h3 style="margin-bottom:8px">' + esc(g.lab) + '</h3><div class="strip">' + g.items.slice().reverse().map(function (e) {
        var age = g.b ? "يوم " + daysBetween(g.b.date, e.date) : fmtTime(e.time);
        return '<button class="ph" type="button" data-act="lightbox" data-pid="' + esc(e.photo || "") + '" data-cap="' + esc(fmtShort(e.date) + " · " + fmtTime(e.time) + (e.v && e.v.height ? " · " + esc(e.v.height) + " سم" : "")) + '"><img alt="" ' + (e.thumb ? 'src="' + safeImg(e.thumb) + '"' : 'data-photo="' + esc(e.photo || "") + '"') + "><span>" + age + "</span><span>" + fmtShort(e.date) + (e.v && e.v.height ? " · " + esc(e.v.height) + " سم" : "") + "</span></button>";
      }).join("") + "</div></div>";
    }).join("");
    loadPhotos(gb);
  }).catch(function () { var gb = $("galBody"); if (gb) gb.innerHTML = '<div class="empty">تعذّر تحميل الصور.</div>'; });
}
function openLightbox(pid, cap) {
  var fromGal = !!$("galBody");
  openSheet('<div class="sheet-bg" data-close><div class="sheet lightbox" role="dialog" aria-modal="true">' + sheetHead(cap || "الصورة", null, "photo") + '<img alt="" ' + (S.photos[pid] ? 'src="' + safeImg(S.photos[pid]) + '"' : 'data-photo="' + esc(pid) + '"') + ">" + (fromGal ? '<div class="sheet-actions"><button class="btn" type="button" data-act="gallery">رجوع للصور</button></div>' : "") + "</div></div>");
  loadPhotos($("sheetRoot"));
}
function openSowPlan() {
  var list = sowBatches().slice().reverse().filter(function (e) { return daysBetween(e.date, todayStr()) <= 90; }), dt = num(cfg("daysToTransplant"));
  var rows = list.map(function (e) {
    var age = daysBetween(e.date, todayStr()), tp = transplanted(e.id), seeds = num(e.v.seeds) || 0, due = addDays(e.date, dt);
    var st = tp >= seeds && seeds ? '<span class="pill ok">نُقلت</span>' : tp ? '<span class="pill n">نُقل ' + f(tp) + "</span>" : age >= dt ? '<span class="pill warn">جاهزة للنقل</span>' : '<span class="pill n">في المشتل</span>';
    return '<tr><td class="num">' + fmtShort(e.date) + " " + fmtTime(e.time) + "</td><td>" + esc(e.v.side || "—") + "</td><td>" + esc(e.v.crop || "") + '</td><td class="num">' + f(seeds) + '</td><td class="num">' + f(num(e.v.trays)) + '</td><td class="num">' + age + '</td><td class="num">' + fmtShort(due) + "</td><td>" + st + "</td></tr>";
  }).join("");
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("جدول الزراعة", "n", "sow") +
    (list.length ? '<div class="tbl-wrap"><table><thead><tr><th>تاريخ الزراعة</th><th>الجهة</th><th>الصنف</th><th>البذور</th><th>الصواني</th><th>العمر (يوم)</th><th>النقل المتوقع</th><th>الحالة</th></tr></thead><tbody>' + rows + "</tbody></table></div>" : '<div class="empty">لا توجد دفعات زراعة مسجلة.</div>') +
    '<p class="help">النقل المتوقع = تاريخ الزراعة + ' + dt + ' يوم (يُعدّل من إعدادات المشرف). الحالة تتحدث تلقائياً عند تسجيل "نقل الشتلات للأبراج".</p></div></div>');
}

/* ================= review ================= */
/* يبحث في تسجيلات اليوم المختار ثم في كل ما حُمّل (أيام سابقة، سجل النوع، صفحة التفاصيل): كان «تعديل» و«صحّح» لا يعملان لتسجيل من يوم آخر */
function findEntry(id) {
  if (!id || String(id).indexOf("svc:") === 0) return null;
  var hit = function (a) { return (a || []).filter(function (x) { return x.id === id; })[0]; };
  return hit(S.entries) || hit(S.openNotes) || hit(S.meta) || hit(S.hist) || (window.Rec && Rec.find ? Rec.find(id) : null) || null;
}
function openFlag(id) {
  var e = findEntry(id);
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("ملاحظة المشرف") + '<label class="f" for="flagTxt">اكتب ما يجب تصحيحه أو متابعته<textarea class="in" id="flagTxt">' + esc(e && e.review && e.review.c || "") + "</textarea></label>" +
    '<div class="sheet-actions"><button class="btn pri" type="button" data-act="saveFlag" data-id="' + esc(id) + '">إرسال سبب التصحيح</button></div></div></div>');
}

/* ================= reports ================= */
/* 3.7.0: حسابات التقارير وعرضها وتصديرها في workspace.js (RPT). هنا ما تحتاجه بقية الصفحات: الوصفات ومخزون العبوات */
function recipeFor(tank, date) { return S.recipes.filter(function (r) { return r.tank === tank && r.date <= date; }).sort(function (a, b) { return (b.date + b.ts).localeCompare(a.date + a.ts); })[0]; }
function recipeMl(r) { return r.volMl != null ? num(r.volMl) : num(r.volL) * 1000; }
function toBase(it) { var q = num(it.qty); if (q == null) return null; return (it.unit === "كغ" || it.unit === "لتر") ? q * 1000 : q; }
function unitBase(it) { return (it.unit === "مل" || it.unit === "لتر") ? "مل" : "غ"; }
function computeStock() {
  var out = {};
  ["A", "B"].forEach(function (tk) {
    var rc = recipeFor(tk, todayStr()); if (!rc || !recipeMl(rc)) { out[tk] = null; return; }
    var used = sum(S.hist.filter(function (r) { return (r.ts || 0) >= (rc.ts || 0); }).map(function (r) { return num(r.v && r.v["ml" + tk]); }));
    var left = recipeMl(rc) - used; out[tk] = { rc: rc, used: used, left: left, pct: Math.max(0, left / recipeMl(rc) * 100) };
  });
  return out;
}

/* ================= supervisor ================= */
function supView() {
  var sec = S.sec, isOwner = S.ownerUid === S.uid, st = computeStock(), F = formula(), ki = kUse(), L = kLearned(), kf = kFormula();
  var h = '<section class="sec"><div class="sec-h"><h2>عبوات المحلول المركز</h2><button class="btn sm pri" data-act="newRecipe">+ وصفة جديدة</button></div><div class="grid2">';
  if (S.indexOk === false) h = '<section class="sec"><div class="card" style="border-color:var(--warn)"><h2>خطوة واحدة لتخفيف القراءات</h2><p class="help" style="margin:6px 0 10px">التطبيق يعمل بشكل طبيعي، لكنه يقرأ كامل السجلات القديمة في كل فتح. لإنشاء فهرس البحث: اضغط الزر، وسجّل الدخول بحساب Firebase إن طُلب، ثم اضغط <b>Save</b> وانتظر حتى تصبح الحالة <b>Enabled</b> (2–5 دقائق).</p>' + (S.indexUrl ? '<a class="btn pri block" href="' + esc(S.indexUrl) + '" target="_blank" rel="noopener">إنشاء فهرس البحث في Firebase</a>' : '<p class="help">Firebase Console ← Firestore Database ← Indexes ← Composite ← Create index: المجموعة <b class="num">entries</b>، الحقل <b class="num">type</b> Ascending ثم <b class="num">date</b> Ascending.</p>') + "</div></section>" + h;
  ["A", "B"].forEach(function (tk) {
    var o = st[tk];
    if (!o) h += '<div class="stat"><span class="lab">عبوة ' + tk + '</span><span class="val">—</span><span class="sub">لا توجد وصفة مسجلة</span></div>';
    else h += '<div class="stat ' + (o.pct < 15 ? "s-warn" : "") + '"><span class="lab">عبوة ' + tk + ' · المتبقي التقديري</span><span class="val num">' + f(Math.max(0, o.left)) + " <small>مل من " + f(recipeMl(o.rc)) + '</small></span><div class="bar" style="margin:4px 0"><i style="width:' + o.pct + '%"></i></div><span class="sub">حُضّرت في ' + esc(o.rc.date) + " · استُهلك " + f(o.used) + " مل</span></div>";
  });
  h += "</div></section>";
  var rt = doseRatio(), stagesTxt = doses().map(function (d) { return "<tr><td>" + doseName(d) + '</td><td class="num">' + fml(d) + " + " + fml(d * rt) + '</td><td class="num">' + f(num(F.ecRaw) + kf * d) + "</td></tr>"; }).join("");
  h += '<section class="sec"><div class="card"><div class="sec-h"><h2>الخلطة والحاسبة</h2><span><button class="btn sm" data-act="editDoses">الجرعات</button> <button class="btn sm" data-act="editFormula">تعديل الخلطة</button></span></div>' +
    '<p style="margin:8px 0 4px"><b>' + esc(F.name) + '</b> <span class="muted">· معتمدة من <bdi dir="ltr" class="num" style="white-space:nowrap">' + esc(F.date) + "</bdi></span></p>" +
    '<div class="tbl-wrap"><table class="minitable"><thead><tr><th>الجرعة</th><th>A + B مل/لتر</th><th>EC المتوقع</th></tr></thead><tbody>' + stagesTxt + "</tbody></table></div>" +
    '<dl class="kv" style="margin-top:10px"><dt>معامل الخلطة</dt><dd class="num">' + f(kf, 1) + " µS/cm لكل 1 مل/لتر</dd><dt>المعامل من سجلاتكم</dt><dd>" + (L.n ? '<span class="num">' + f(L.k, 1) + "</span> (من " + L.n + " خلطات)" + (Math.abs(L.k - kf) / kf > .15 ? ' <span class="pill warn">يختلف أكثر من 15% عن الخلطة</span>' : "") : "لا توجد خلطات مسجلة بعد اعتماد هذه الخلطة") + "</dd><dt>المستخدم في الحاسبة</dt><dd><b>" + (ki.src === "learned" ? "من السجلات" : "من الخلطة") + "</b> (" + f(ki.k, 1) + ")</dd></dl>" +
    (S.recipes[0] && S.recipes[0].date > F.date ? '<div class="banner warn" style="margin-top:10px">سُجّلت وصفة عبوة بعد تاريخ اعتماد الخلطة. إذا تغيّرت التركيبة، حدّث الخلطة ليبقى الحساب دقيقاً.</div>' : "") + "</div></section>";
  h += '<section class="sec"><h2>سجل الوصفات</h2>';
  h += S.recipes.length ? '<div class="list">' + S.recipes.slice(0, 30).map(function (r) {
    return '<article class="entry"><div class="e-head"><span class="e-ic"><b class="num">' + esc(r.tank) + '</b></span><div class="e-t"><b>عبوة ' + esc(r.tank) + " · " + f(recipeMl(r)) + ' مل</b><span class="num">' + esc(r.date) + " · " + esc(nameOf(r.by)) + '</span></div><button class="btn sm ghost" data-act="editRecipe" data-id="' + esc(r.id) + '">تعديل</button></div>' +
      '<div class="tbl-wrap"><table><thead><tr><th>المادة</th><th>الكمية</th></tr></thead><tbody>' + (r.items || []).map(function (it) { return "<tr><td>" + esc(it.name) + '</td><td class="num">' + f(num(it.qty), 3) + " " + esc(it.unit || "") + "</td></tr>"; }).join("") + "</tbody></table></div>" +
      (r.notes ? '<div class="e-text">' + esc(r.notes) + "</div>" : "") + "</article>";
  }).join("") + "</div>" : '<div class="empty">سجّل وصفة عبوة A وعبوة B (المواد وكمياتها وحجم العبوة) لحساب استهلاك الأسمدة والمتبقي في كل عبوة.<button class="btn pri" data-act="newRecipe">إضافة أول وصفة</button></div>';
  h += "</section>";
  var PT = { sol: h, team: "", lim: "", set: "" }; h = "";
  if (isOwner) h += '<section class="sec"><div class="card"><div class="sec-h"><h2>فحص النظام</h2><button class="btn sm pri" data-act="selfTest">تشغيل الفحص</button></div><p class="help" style="margin:6px 0 0">اختبار حقيقي للحفظ والقراءة والصلاحيات والحسابات على قاعدة بياناتك. يستغرق أقل من دقيقة ويحذف بيانات الاختبار بعد انتهائه.</p></div></section>';
  /* 3.6.0: التنبيهات الموقوفة (يوقفها المشرف من زر ⋮ بجانب التنبيه) */
  h = '<section class="sec"><div class="card">' + Board.mutedLink() + "</div></section>" + h;
  PT.set = h; h = "";
  var ids = Object.keys(S.users).filter(function (id) { return !S.users[id].selftest; }).sort(function (a, b) { return (S.users[a].createdAt || 0) - (S.users[b].createdAt || 0); });
  h += '<section class="sec"><div class="sec-h"><h2>المستخدمون والصلاحيات</h2>' + (isOwner ? '<button class="btn sm pri" data-act="newUser">+ مستخدم جديد</button>' : "") + '</div><div class="card">';
  ids.forEach(function (id) {
    var u = S.users[id], r = id === S.ownerUid ? "owner" : u.role;
    var pill = r === "owner" ? '<span class="pill ok">المالك · مشرف</span>' : r === "sup" ? '<span class="pill ok">مشرف</span>' : r === "worker" ? '<span class="pill n">عامل</span>' : '<span class="pill bad">موقوف</span>';
    h += '<div class="user-row"><span class="av">' + initials(id) + '</span><span class="nm">' + esc(u.name) + (id === S.uid ? ' <span class="muted">(أنت)</span>' : "") + "<small>" + esc(showLogin(u.login)) + "</small></span>" + pill;
    if (isOwner && r !== "owner") h += "<span>" + (r !== "worker" ? '<button class="btn sm" data-act="setRole" data-id="' + esc(id) + '" data-r="worker">عامل</button> ' : "") + (r !== "sup" ? '<button class="btn sm" data-act="setRole" data-id="' + esc(id) + '" data-r="sup">مشرف</button> ' : "") + (r !== "disabled" ? '<button class="btn sm danger" data-act="setRole" data-id="' + esc(id) + '" data-r="disabled">إيقاف</button>' : "") + "</span>";
    h += "</div>";
  });
  if (!isOwner) h += '<p class="muted" style="font-size:12.5px">إضافة المستخدمين وتغيير صلاحياتهم متاحة لمالك التطبيق فقط.</p>';
  h += "</div></section>";
  PT.team = h; h = "";
  h += schedCard(sec);
  // مجموعات بعناوين، وكل حد أدنى بجانب الأعلى منه. ["#", عنوان] = عنوان مجموعة، والعنصر الرابع "full" = سطر كامل
  var sf = [["#", "المحلول"], ["ecMin", "الأملاح الدنيا", "µS/cm"], ["ecMax", "الأملاح العليا", "µS/cm"], ["phMin", "pH الأدنى", "pH"], ["phMax", "pH الأعلى", "pH"], ["wtMin", "حرارة الماء الدنيا", "°C"], ["wtMax", "حرارة الماء العليا", "°C"], ["ecTarget", "الأملاح المستهدفة للحاسبة", "µS/cm", "full"],
    ["#", "الجو نهاراً", "من " + fmtTime(dayHours()[0] + ":00") + " إلى " + fmtTime(dayHours()[1] + ":00") + " · تُغيَّر من الإعدادات"], ["airDayMin", "الحرارة الدنيا", "°C"], ["airDayMax", "الحرارة العليا", "°C"], ["rhDayMin", "الرطوبة الدنيا", "%"], ["rhDayMax", "الرطوبة العليا", "%"],
    ["#", "الجو ليلاً"], ["airNightMin", "الحرارة الدنيا", "°C"], ["airNightMax", "الحرارة العليا", "°C"], ["rhNightMin", "الرطوبة الدنيا", "%"], ["rhNightMax", "الرطوبة العليا", "%"],
    ["#", "متوسط الحرارة على 24 ساعة", "يحدد سرعة النمو، ويظهر في مؤشرات النمو"], ["avgMin", "المتوسط الأدنى", "°C"], ["avgMax", "المتوسط الأعلى", "°C"],
    ["#", "الضوء"], ["luxMin", "الضوء الأدنى", "lux"], ["luxMax", "الضوء الأعلى", "lux"],
    ["#", sec === "t" ? "الخزان والمهام" : "الخلطة والطاقة والمهام"], ["tankL", sec === "t" ? "سعة خزان الأبراج" : "كمية ماء الخلطة المعتادة", "لتر"]];
  if (sec === "n") sf = sf.concat([["pumpL", "سعة مضخة الري", "لتر"], ["capR", "طاقة الجهة اليمنى شهرياً", "بذرة"], ["capL", "طاقة الجهة اليسرى شهرياً", "بذرة"]]);
  /* 3.6.0: العدد اليومي للمهام بدون مواعيد صار في بطاقات «مواعيد المهام» (−/+) */
  h += '<section class="sec"><h2>الحدود المستهدفة · ' + SECS[sec].icon + " " + SECS[sec].name + '</h2><form class="card fgrid" id="setSec" novalidate>' + sf.map(function (x, i) { if (x[0] === "#") return '<div class="grp-h"' + (i ? "" : ' style="margin-top:0;padding-top:0;border-top:0"') + ">" + x[1] + (x[2] ? ' <small class="muted" style="font-weight:400;font-size:12px">' + x[2] + "</small>" : "") + "</div>"; return '<label class="f' + (x[3] === "full" ? " full" : "") + '" for="ss_' + x[0] + '">' + x[1] + '<div class="unitwrap"><input class="in num" ' + KPA() + ' id="ss_' + x[0] + '" value="' + esc(cfg(x[0], sec)) + '"><span class="u">' + x[2] + "</span></div></label>"; }).join("") +
    '<label class="f full" for="ss_zoneNote">تعريف المناطق (يظهر بخط صغير تحت القياسات)<input class="in" id="ss_zoneNote" value="' + esc(cfg("zoneNote", sec)) + '"></label>' +
    '<div class="full"><button class="btn pri block" type="button" data-act="saveSec">حفظ حدود ' + SECS[sec].name + "</button></div></form></section>";
  PT.lim = h; h = "";
  var g = [["flowLitres", "معايرة تدفق التعبئة: حجم الماء", "لتر"], ["flowMinutes", "زمن المعايرة: دقائق", "دقيقة"], ["flowSeconds", "زمن المعايرة: ثوانٍ (0–59)", "ثانية"], ["dayFrom", "بداية النهار (للحدود والتحليل)", "ساعة"], ["dayTo", "نهاية النهار", "ساعة"], ["battHours", "التذكير بشحن البطارية بعد", "ساعة"], ["battMaxCharge", "تنبيه فصل الشاحن بعد", "ساعة"], ["calDays", "معايرة جهاز القياس كل", "يوم"], ["daysToTransplant", "مدة الشتلة قبل النقل", "يوم"], ["daysToHarvest", "مدة البقاء في الأبراج حتى الحصاد", "يوم"], ["lPerCm", "كل 1 سم في خزان الأبراج", "لتر"],
    ["caFirst", "أول رش كالسيوم بعد النقل للأبراج", "يوم"], ["caEvery", "تكرار رش الكالسيوم كل", "يوم"], ["caUntil", "التوقف عن تذكير الكالسيوم بعد النقل بـ", "يوم"], ["insEvery", "الرش الوقائي الحشري كل (0 = بدون تذكير)", "يوم"], ["fungEvery", "الرش الوقائي الفطري كل (0 = بدون تذكير)", "يوم"]];
  h += '<section class="sec"><h2>إعدادات عامة</h2><form class="card fgrid" id="setGlob" novalidate>' +
    '<label class="f" for="sg_levelUnit">قياس مستوى خزان الأبراج<select class="in" id="sg_levelUnit"><option value="L"' + (cfg("levelUnit") !== "cm" ? " selected" : "") + '>باللتر</option><option value="cm"' + (cfg("levelUnit") === "cm" ? " selected" : "") + ">بالسنتيمتر</option></select></label>" +
    '<label class="f" for="sg_useLearned">معامل الحاسبة<select class="in" id="sg_useLearned"><option value="1"' + (cfg("useLearned") ? " selected" : "") + '>يتعلم من السجلات بعد 3 خلطات</option><option value="0"' + (!cfg("useLearned") ? " selected" : "") + ">من الخلطة فقط</option></select></label>" +
    g.map(function (x) { return '<label class="f" for="sg_' + x[0] + '">' + x[1] + '<div class="unitwrap"><input class="in num" ' + KPA() + ' id="sg_' + x[0] + '"' + (['flowMinutes','flowSeconds'].indexOf(x[0])>=0 ? ' data-integer="1"' : '') + ' value="' + esc(cfg(x[0])) + '"><span class="u">' + x[2] + "</span></div></label>"; }).join("") +
    '<div class="full"><button class="btn pri block" type="button" data-act="saveGlob">حفظ الإعدادات العامة</button></div></form></section>';
  PT.set = h + PT.set;
  var tabs = [["lim", "الحدود والمواعيد"], ["sol", "المحلول"], ["team", "الفريق"], ["set", "الإعدادات"]], tab = subGet("sup", tabs);
  return '<section class="sec"><div class="sec-h"><h2>المشرف · ' + SECS[sec].icon + " " + SECS[sec].name + "</h2></div>" + subTabs("sup", tabs) + "</section>" + PT[tab];
}
/* 3.6.0: مواعيد المهام — لكل نوع: مفتاح إيقاف كلي، وعدد يومي (−/+)، والضغط على موعد لتغييره أو إيقافه مؤقتاً أو حذفه */
function schedCard(sec) {
  var I = Board.icon, ST = window.Rec && Rec.style ? Rec.style : function () { return ["list", "gray"]; };
  var h = '<section class="sec" id="schedSec"><div class="sec-h"><h2>مواعيد المهام · ' + SECS[sec].icon + " " + SECS[sec].name + "</h2></div>";
  TASKS[sec].forEach(function (x) {
    var type = x[0], T = typeDef(type, sec), times = schedOf(sec, type), off = taskOff(sec, type, todayStr()), st = ST(type), act = activeTimes(sec, type, todayStr());
    var nP = times.length - act.length, n = times.length ? times.length : (num(cfg(x[1], sec)) || 0);
    var sub = off ? "موقوفة · لا تظهر في الجولات ولا التنبيهات" : times.length ? Board.pl(times.length, "مرة واحدة", "مرتان", "مرات", "مرة") + " يومياً" + (nP ? " · " + Board.pl(nP, "موعد موقوف مؤقتاً", "موعدان موقوفان مؤقتاً", "مواعيد موقوفة مؤقتاً", "موعداً موقوفاً مؤقتاً") : "") : Board.pl(n, "مرة واحدة", "مرتان", "مرات", "مرة") + " يومياً · بدون موعد محدد";
    var at = ' data-sec="' + sec + '" data-type="' + type + '"';
    h += '<div class="tk' + (off ? " off" : "") + '" data-task="' + type + '"><div class="tk-h"><span class="bd-hic ' + st[1] + '">' + I(st[0], 18) + '</span><span class="tk-t"><b>' + esc(T.label) + "</b><small>" + esc(sub) + '</small></span><button type="button" role="switch" aria-checked="' + !off + '" aria-label="' + esc((off ? "تشغيل " : "إيقاف ") + T.label) + '" class="cz-sw" data-act="schToggle"' + at + "><i></i></button></div>";
    if (!off) {
      h += '<div class="tk-b"><span class="tk-lab">العدد يومياً</span><span class="step"><button type="button" data-act="schStep" data-d="-1"' + at + ' aria-label="تقليل العدد"' + (n <= 1 ? " disabled" : "") + '>−</button><b class="num">' + n + '</b><button type="button" data-act="schStep" data-d="1"' + at + ' aria-label="زيادة العدد"' + (n >= 24 ? " disabled" : "") + ">+</button></span>" + (times.length ? "" : '<button type="button" class="tchip add" style="margin-inline-start:auto" data-act="schAdd"' + at + ">+ وقت</button>") + "</div>";
      if (times.length) h += '<div class="tchips">' + times.map(function (t) {
        var p = slotPause(sec, type, t), pz = slotPaused(sec, type, t, todayStr()), un = p && okDay(p.until) ? p.until : "";
        return '<button type="button" class="tchip edit' + (pz ? " paused" : "") + '" data-act="schOpt"' + at + ' data-t="' + t + '">' + fmtTime(t) + (pz ? "<small>" + (un ? "حتى " + esc(fmtShort(un)) : "موقوف") + "</small>" : "") + "</button>";
      }).join("") + '<button type="button" class="tchip add" data-act="schAdd"' + at + ">+ وقت</button></div>";
      else h += '<p class="tk-note">بدون مواعيد: العدد فقط، وتُحسب متأخرة آخر اليوم. أضف «+ وقت» لتحديد موعد.</p>';
    }
    h += "</div>";
  });
  return h + '<p class="help" style="margin:4px 2px 0">المفتاح يوقف المهمة كلياً. −/+ يغيّر العدد اليومي: «+» يضيف موعداً بعد آخر موعد بساعتين، و«−» يحذف آخر موعد. اضغط أي موعد لتغيير وقته أو إيقافه مؤقتاً أو حذفه. يسري على كل الفريق.</p></section>';
}
function clonePath(root, sec, type) { var o = clone(objAt(S.settings, root) || {}); if (!objAt(o, sec)) o[sec] = {}; if (type && !objAt(o, sec, type)) o[sec][type] = {}; return o; }
function saveSched(sec, type, arr, extra) {
  var sc = clone(S.settings.sched || DEF.sched); sc[sec] = sc[sec] || {};
  var u = {}; sc[sec][type] = arr.filter(function (t) { if (!okHM(t) || u[t]) return false; u[t] = 1; return true; }).sort();
  /* إيقاف المواعيد المحذوفة لا يبقى معلّقاً */
  var so = clonePath("slotOff", sec, type); Object.keys(so[sec][type]).forEach(function (t) { if (!u[t]) delete so[sec][type][t]; });
  return saveSettings(Object.assign({ sched: sc, slotOff: so }, schedSnap(sec, type), extra || {}));
}
function cntPatch(sec, k, n) { var o = {}; o[k] = n; return sec === "t" ? { tw: Object.assign({}, S.settings.tw || {}, o) } : o; }
function nextFreeTime(times) {
  var has = {}; times.forEach(function (t) { has[tMin(t)] = 1; });
  var last = times.length ? tMin(times[times.length - 1]) : 8 * 60, c = [last + 120, last + 60, last + 30];
  for (var hh = 6; hh <= 22; hh++) c.push(hh * 60);
  for (var i = 0; i < c.length; i++) if (c[i] <= 23 * 60 && c[i] >= 0 && !has[c[i]]) return pad(Math.floor(c[i] / 60)) + ":" + pad(c[i] % 60);
  return "";
}
function schToggle(sec, type) {
  var o = clonePath("taskOff", sec), now = taskOff(sec, type, todayStr()), T = typeDef(type, sec);
  /* التشغيل يُغلق فترة الإيقاف (until = اليوم) بدل حذفها، فتبقى أيام الإيقاف السابقة بلا جولات متأخرة */
  if (now) { var cur = objAt(o, sec, type); if (cur && okDay(cur.from) && cur.from < todayStr()) o[sec][type] = Object.assign({}, cur, { until: todayStr() }); else delete o[sec][type]; }
  else o[sec][type] = { from: todayStr(), until: "", by: S.uid, at: Date.now() };
  toast((now ? "شُغّلت مهمة " : "أُوقفت مهمة ") + T.label);
  return saveSettings({ taskOff: o });
}
function schStep(sec, type, d) {
  var x = TASKS[sec].filter(function (y) { return y[0] === type; })[0], times = schedOf(sec, type);
  if (!x) return Promise.resolve();
  if (!times.length) { var n = Math.max(1, Math.min(24, (num(cfg(x[1], sec)) || 0) + d)); return saveSettings(Object.assign(cntPatch(sec, x[1], n), schedSnap(sec, type))); }
  if (d > 0) { var t = nextFreeTime(times); if (!t) { toast("لا يوجد وقت متاح لموعد جديد"); return Promise.resolve(); } toast("أُضيف موعد " + fmtTime(t) + " · اضغطه لتعديله"); return saveSched(sec, type, times.concat([t])); }
  if (times.length <= 1) return Promise.resolve();
  toast("حُذف موعد " + fmtTime(times[times.length - 1]));
  return saveSched(sec, type, times.slice(0, -1));
}
function schDelete(sec, type, t) {
  var x = TASKS[sec].filter(function (y) { return y[0] === type; })[0], left = schedOf(sec, type).filter(function (y) { return y !== t; });
  /* حذف آخر موعد: تبقى المهمة مرة واحدة يومياً بدون موعد (لا يرجع العدد القديم فجأة) */
  return saveSched(sec, type, left, !left.length && x ? cntPatch(sec, x[1], 1) : null);
}
var SO = null;
function soHTML() {
  var I = Board.icon, T = typeDef(SO.type, SO.sec), t0 = todayStr(), p = slotPause(SO.sec, SO.type, SO.t), pz = slotPaused(SO.sec, SO.type, SO.t, t0), un = p && okDay(p.until) ? p.until : "";
  var mins = addDays(t0, 1), left = schedOf(SO.sec, SO.type).length - 1;
  var chip = function (k, l) { return '<button type="button" data-act="soMode" data-m="' + k + '" aria-pressed="' + (SO.mode === k) + '">' + l + "</button>"; };
  var lab = SO.mode === "today" ? "إيقاف اليوم فقط" : SO.mode === "date" ? (okDay(SO.until) && SO.until > t0 ? "إيقاف حتى " + fmtShort(SO.until) : "اختر التاريخ") : "إيقاف حتى أفعّله";
  return '<div class="sheet-bg" data-close><div class="sheet al-sh" role="dialog" aria-modal="true">' + sheetHead(T.label + " · موعد " + fmtTime(SO.t), SO.sec, "bell") +
    (pz ? '<div class="al-team">' + I("clock", 16) + (un ? "هذا الموعد موقوف حتى " + esc(fmtDate(un)) + "." : "هذا الموعد موقوف حتى تفعّله.") + "</div>" : "") +
    '<div class="sheet-actions" style="position:static;margin:10px 0 6px;padding:0">' + (pz ? '<button class="btn pri" type="button" data-act="soResume">إلغاء الإيقاف</button>' : "") + '<button class="btn" type="button" data-act="soTime">تغيير الوقت</button></div>' +
    '<div class="al-opt' + (pz ? "" : " on") + '"><span class="al-opt-ic">' + I("pause", 20) + '</span><div class="al-opt-t"><b>' + (pz ? "تغيير مدة الإيقاف" : "إيقاف هذا الموعد مؤقتاً") + "</b><small>لا يُطلب ولا يُحسب متأخراً؛ تبقى بقية المواعيد كما هي.</small>" +
    '<div class="al-days">' + chip("today", "اليوم فقط") + chip("date", "حتى تاريخ…") + chip("off", "حتى أفعّله") + "</div>" +
    (SO.mode === "date" ? '<label class="al-date" for="so_until">يعود يوم<input class="in" type="date" id="so_until" min="' + mins + '" max="' + addDays(t0, 365) + '" value="' + esc(SO.until || "") + '"></label>' : "") +
    '<button class="btn pri block" type="button" data-act="soSave" style="margin-top:12px"' + (SO.mode === "date" && !(okDay(SO.until) && SO.until > t0) ? " disabled" : "") + ">" + esc(lab) + "</button></div></div>" +
    '<button type="button" class="al-opt" data-act="soDel" style="width:100%;text-align:start;font:inherit;cursor:pointer"><span class="al-opt-ic" style="color:var(--bad)">✕</span><span class="al-opt-t"><b style="color:var(--bad)">حذف الموعد</b><small>' + (left ? "يصير العدد اليومي " + left : "تبقى المهمة مرة واحدة يومياً بدون موعد") + "</small></span></button></div></div>";
}
function openSlot(sec, type, t) { SO = { sec: sec, type: type, t: t, mode: "today", until: addDays(todayStr(), 3) }; openSheet(soHTML()); }
function soSave() {
  if (!SO || !isSup()) return Promise.resolve();
  var t0 = todayStr(), until = SO.mode === "today" ? addDays(t0, 1) : SO.mode === "date" ? SO.until : "";
  if (SO.mode === "date" && !(okDay(until) && until > t0)) { toast("اختر تاريخاً بعد اليوم"); return Promise.resolve(); }
  var o = clonePath("slotOff", SO.sec, SO.type); o[SO.sec][SO.type][SO.t] = { from: t0, until: until, by: S.uid, at: Date.now() };
  toast(until ? "أُوقف موعد " + fmtTime(SO.t) + " حتى " + fmtShort(until) : "أُوقف موعد " + fmtTime(SO.t) + " حتى تفعّله");
  return saveSettings({ slotOff: o });
}
function soResume() { var o = clonePath("slotOff", SO.sec, SO.type), cur = o[SO.sec][SO.type][SO.t]; if (cur && okDay(cur.from) && cur.from < todayStr()) o[SO.sec][SO.type][SO.t] = Object.assign({}, cur, { until: todayStr() }); else delete o[SO.sec][SO.type][SO.t]; toast("عاد موعد " + fmtTime(SO.t)); return saveSettings({ slotOff: o }); }
function openSchAdd(sec, type, old) {
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead((old ? "تغيير موعد " + fmtTime(old) : "موعد جديد") + " · " + typeDef(type, sec).label, sec, "bell") +
    '<div class="f full"><span>الوقت</span>' + timePicker("sch_tp", old || nextFreeTime(schedOf(sec, type)) || "08:00") + '</div><div class="sheet-actions"><button class="btn pri" type="button" data-act="schSave" data-sec="' + sec + '" data-type="' + type + '"' + (old ? ' data-old="' + old + '"' : "") + ">" + (old ? "حفظ الوقت" : "إضافة الموعد") + "</button></div></div></div>");
}
function openDoses(from) {
  var DS = doses(), rt = doseRatio();
  var row = function (d) { return '<div class="dose-row"><div class="unitwrap"><input class="in num" ' + KPA() + ' data-dose value="' + esc(d) + '" aria-label="جرعة A"><span class="u">مل/لتر</span></div><button class="iconbtn" type="button" data-act="rmDose" aria-label="حذف">✕</button></div>'; };
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("جرعات الحاسبة", "n", "calc") +
    '<p class="help" style="margin-top:0">اكتب جرعة A لكل لتر. جرعة B تُحسب تلقائياً بنسبة الخلطة (' + fml(rt) + ' مل B لكل 1 مل A). كل جرعة تظهر في الحاسبة ومعها الأملاح المتوقعة.</p><div id="doseList">' + DS.map(row).join("") + "</div>" +
    '<button class="btn sm" type="button" data-act="addDose">+ إضافة جرعة</button><div class="sheet-actions"><button class="btn pri" type="button" data-act="saveDoses" data-from="' + (from || "") + '">حفظ الجرعات</button></div></div></div>');
}
function doseRowHTML() { return '<div class="dose-row"><div class="unitwrap"><input class="in num" ' + KPA() + ' data-dose value="" aria-label="جرعة A"><span class="u">مل/لتر</span></div><button class="iconbtn" type="button" data-act="rmDose" aria-label="حذف">✕</button></div>'; }
function openAtcTest() {
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("اختبار جهاز القياس", null, "cal") +
    '<ol class="cal-steps" style="margin-top:0"><li>خذ كوباً من محلول الري، وبرّده (ماء بارد أو ثلاجة) حتى تقل حرارته عن 20°.</li><li>ضع المجس، حرّكه، وانتظر حتى تثبت القراءة. سجّل <b>الأملاح والحرارة</b> كما تظهر على الشاشة.</li><li>دفّئ نفس الكوب (في الشمس أو داخل ماء دافئ) حتى ترتفع الحرارة 8 درجات أو أكثر، ثم قِس مرة أخرى.</li></ol>' +
    '<form class="fgrid" id="atcForm" novalidate><div class="grp-h">القراءة الباردة</div>' +
    '<label class="f" for="at_e1">الأملاح<div class="unitwrap"><input class="in num" id="at_e1" ' + KPA() + '><span class="u">µS/cm</span></div></label><label class="f" for="at_t1">الحرارة<div class="unitwrap"><input class="in num" id="at_t1" ' + KPA() + '><span class="u">°C</span></div></label>' +
    '<div class="grp-h">القراءة الدافئة</div><label class="f" for="at_e2">الأملاح<div class="unitwrap"><input class="in num" id="at_e2" ' + KPA() + '><span class="u">µS/cm</span></div></label><label class="f" for="at_t2">الحرارة<div class="unitwrap"><input class="in num" id="at_t2" ' + KPA() + '><span class="u">°C</span></div></label></form>' +
    '<div id="atcOut" style="margin-top:12px"></div><div class="sheet-actions"><button class="btn pri" type="button" data-act="saveAtc" id="atcSave" disabled>اعتماد النتيجة</button></div></div></div>');
  $("atcForm").addEventListener("input", atcRun); atcRun();
}
var ATC_RES = null;
function atcRun() {
  var e1 = num($("at_e1").value), t1 = num($("at_t1").value), e2 = num($("at_e2").value), t2 = num($("at_t2").value), o = $("atcOut"), b = $("atcSave"); ATC_RES = null; b.disabled = true;
  if (e1 == null || t1 == null || e2 == null || t2 == null) { o.innerHTML = '<p class="help">اكتب القراءتين.</p>'; return; }
  if (Math.abs(t2 - t1) < 5 || e1 <= 0) { o.innerHTML = '<div class="banner warn">الفرق في الحرارة يجب أن يكون 5 درجات أو أكثر ليكون الاختبار دقيقاً.</div>'; return; }
  var a = atcAlpha(e1, t1, e2, t2), ch = (e2 / e1 - 1) * 100, pct = f(a * 100, 2);
  if (Math.abs(a) < 0.006) { ATC_RES = { atc: true }; o.innerHTML = '<div class="banner ok"><span><b>الجهاز يعوّض الحرارة تلقائياً (ATC).</b> تغيّرت القراءة ' + f(ch, 1) + "% فقط مع فرق " + f(Math.abs(t2 - t1), 1) + " درجة. عند الاعتماد يتوقف التطبيق عن تصحيح الأملاح وpH لأن الجهاز يصححها.</span></div>"; }
  else if (a >= 0.012 && a <= 0.03) { ATC_RES = { atc: false, coef: Math.round(a * 10000) / 10000 }; o.innerHTML = '<div class="banner ok"><span><b>الجهاز بدون تعويض حرارة.</b> القراءة تتغير ' + pct + "% لكل درجة في محلولكم (المعتاد 1.9–2%). عند الاعتماد يستخدم التطبيق هذا المعامل المقاس في تحويل كل القراءات إلى 25° وفي الحاسبة.</span></div>"; }
  else { o.innerHTML = '<div class="banner warn">النتيجة غير منطقية (' + pct + "% لكل درجة). أعد القياس: نفس الكوب، حرّك المجس، وانتظر ثبات القراءة والحرارة على الشاشة.</div>"; }
  b.disabled = !ATC_RES;
}
function openFormula() {
  var F = formula();
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("الخلطة المعتمدة للحاسبة", null, "calc") +
    '<p class="help" style="margin-top:0">أدخل جرعة جرّبتموها فعلاً وقستم الأملاح الناتجة عنها (مثال: 10 مل A + 10 مل B لكل لتر أعطت 1330). منها يُحسب أثر كل 1 مل/لتر، ثم تُحسب كل الجرعات بما فيها الجرعة الكاملة. عند تغيير التركيبة أو نسبة A و B حدّثها هنا. قائمة الجرعات تُعدّل من زر "الجرعات".</p><form class="fgrid" id="foForm" novalidate>' +
    '<label class="f full" for="fo_name">اسم الخلطة<input class="in" id="fo_name" value="' + esc(F.name) + '"></label>' +
    '<label class="f" for="fo_fullA">جرعة A المقاسة<div class="unitwrap"><input class="in num" ' + KPA() + ' id="fo_fullA" value="' + esc(F.fullA) + '"><span class="u">مل/لتر</span></div></label>' +
    '<label class="f" for="fo_fullB">جرعة B المقاسة<div class="unitwrap"><input class="in num" ' + KPA() + ' id="fo_fullB" value="' + esc(F.fullB) + '"><span class="u">مل/لتر</span></div></label>' +
    '<label class="f" for="fo_ecRaw">أملاح ماء المصدر<div class="unitwrap"><input class="in num" ' + KPA() + ' id="fo_ecRaw" value="' + esc(F.ecRaw) + '"><span class="u">µS/cm</span></div></label>' +
    '<label class="f" for="fo_ecFull">الأملاح الناتجة عنها<div class="unitwrap"><input class="in num" ' + KPA() + ' id="fo_ecFull" value="' + esc(F.ecFull) + '"><span class="u">µS/cm</span></div><span class="hint">شاملة ماء المصدر، عند 25°</span></label>' +
    '<label class="f full" for="fo_date">تاريخ اعتماد الخلطة<input class="in num" type="date" id="fo_date" value="' + esc(todayStr()) + '"></label>' +
    '<p class="help full" id="fo_k"></p></form><div class="sheet-actions"><button class="btn pri" type="button" data-act="saveFormula">اعتماد الخلطة</button></div></div></div>');
  var upd = function () { var a = num($("fo_fullA").value), e1 = num($("fo_ecFull").value), e0 = num($("fo_ecRaw").value); $("fo_k").textContent = a && e1 != null && e0 != null ? "كل 1 مل A (مع B) لكل لتر يرفع الأملاح ≈ " + f((e1 - e0) / a, 1) + " µS/cm · نسبة B إلى A = " + f(num($("fo_fullB").value) / a, 2) : ""; };
  $("foForm").addEventListener("input", upd); upd();
}
function openRecipe(r) {
  var items = r ? (r.items || []) : [{ name: "", qty: "", unit: "غ" }];
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead(r ? "تعديل وصفة" : "وصفة تحضير عبوة مركّزة", null, "mix") +
    '<form class="fgrid" id="recForm" novalidate>' +
    '<label class="f" for="r_date">تاريخ التحضير<input class="in num" type="date" id="r_date" value="' + esc(r ? r.date : todayStr()) + '"></label>' +
    '<label class="f" for="r_tank">العبوة<select class="in" id="r_tank"><option' + (r && r.tank === "A" ? " selected" : "") + ">A</option><option" + (r && r.tank === "B" ? " selected" : "") + ">B</option></select></label>" +
    '<label class="f full" for="r_vol">حجم المحلول المركز <span class="req">*</span><div class="unitwrap"><input class="in num" ' + KPA() + ' id="r_vol" value="' + esc(r ? recipeMl(r) : "") + '"><span class="u">مل</span></div></label>' +
    '<div class="full"><h3 style="margin-bottom:8px">المواد وكمياتها</h3><datalist id="ferts">' + FERTS.map(function (x) { return '<option value="' + x + '">'; }).join("") + '</datalist><div id="riList">' + items.map(riRow).join("") + '</div><button class="btn sm" type="button" data-act="addRi">+ إضافة مادة</button></div>' +
    '<label class="f full" for="r_notes">ملاحظات (التركيز بالعناصر ppm، المورد، رقم التشغيلة…)<textarea class="in" id="r_notes">' + esc(r ? r.notes : "") + "</textarea></label>" +
    '<p id="formErrors" class="banner warn full" role="alert" hidden></p></form><div class="sheet-actions">' + (r ? '<button class="btn danger" type="button" data-act="delRecipe" data-id="' + esc(r.id) + '">حذف</button>' : "") + '<button class="btn pri" type="button" data-act="saveRecipe" data-id="' + (r ? r.id : "") + '">حفظ الوصفة</button></div></div></div>');
}
function riRow(it) { return '<div class="ri"><input class="in" list="ferts" aria-label="اسم المادة" placeholder="اسم المادة" data-ri="name" value="' + esc(it.name) + '"><input class="in num" ' + KPA() + ' aria-label="الكمية" placeholder="الكمية" data-ri="qty" value="' + esc(it.qty) + '"><select class="in" aria-label="الوحدة" data-ri="unit">' + ["غ", "كغ", "مل", "لتر"].map(function (u) { return "<option" + (it.unit === u ? " selected" : "") + ">" + u + "</option>"; }).join("") + '</select><button class="iconbtn" type="button" data-act="rmRi" aria-label="حذف السطر">✕</button></div>'; }
function openNewUser() {
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("مستخدم جديد") + '<form class="fgrid" id="userForm" novalidate>' +
    '<label class="f full" for="u_name">الاسم<input class="in" id="u_name"></label>' +
    '<label class="f full" for="u_id">اسم المستخدم (بالإنجليزي) أو البريد<input class="in" id="u_id" dir="ltr" autocapitalize="off" placeholder="worker1"></label>' +
    '<label class="f full" for="u_pw">كلمة المرور (6 أحرف أو أكثر)<input class="in" id="u_pw" dir="ltr" autocapitalize="off"></label>' +
    '<div class="f full"><span>الصلاحية</span><div class="seg" id="u_role" role="group"><button type="button" data-r="worker" aria-pressed="true">عامل</button><button type="button" data-r="sup" aria-pressed="false">مشرف</button></div></div>' +
    '<div class="err full" id="u_err"></div></form><div class="sheet-actions"><button class="btn pri" type="button" data-act="createUser">إنشاء الحساب</button></div></div></div>');
}
function createUser(btn) {
  var name = $("u_name").value.trim(), id = $("u_id").value.trim(), pw = $("u_pw").value, role = $("u_role").querySelector('[aria-pressed="true"]').getAttribute("data-r"), er = $("u_err");
  if (!name || !id || pw.length < 6) { er.textContent = "أكمل الاسم واسم المستخدم وكلمة مرور من 6 أحرف أو أكثر."; return; }
  btn.disabled = true; er.textContent = "";
  var email = toEmail(id), sec = firebase.apps.filter(function (a) { return a.name === "secondary"; })[0] || withAppCheck(firebase.initializeApp(window.GS_CONFIG.firebase, "secondary"));
  sec.auth().createUserWithEmailAndPassword(email, pw).then(function (cred) { var uid = cred.user.uid; return sec.auth().signOut().then(function () { return S.db.collection("users").doc(uid).set({ name: name, login: email, role: role, createdAt: Date.now() }); }); })
    .then(function () {
      openSheet('<div class="sheet-bg" data-close><div class="sheet">' + sheetHead("تم إنشاء الحساب") + "<p>أرسل هذه البيانات إلى " + esc(name) + ':</p><div class="card selectable" id="credCard"><dl class="kv"><dt>الرابط</dt><dd class="num">' + esc(location.origin + location.pathname) + '</dd><dt>اسم المستخدم</dt><dd class="num">' + esc(showLogin(email)) + '</dd><dt>كلمة المرور</dt><dd class="num">' + esc(pw) + "</dd></dl></div>" +
        '<div class="sheet-actions"><button class="btn" type="button" data-act="copyCred">نسخ البيانات</button><button class="btn pri" type="button" data-act="close">تم</button></div></div></div>');
    }).catch(function (e) { er.textContent = errMsg(e); btn.disabled = false; });
}
function copyCred() {
  var c = $("credCard"); if (!c) return;
  var dt = c.querySelectorAll("dt"), dd = c.querySelectorAll("dd"), t = [];
  for (var i = 0; i < dt.length; i++) t.push(dt[i].textContent + ": " + dd[i].textContent);
  var txt = "GREEN SIDE\n" + t.join("\n"), ok = function () { toast("تم نسخ البيانات — الصقها في واتساب"); };
  function fallback() { var a = document.createElement("textarea"); a.value = txt; a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); ok(); } catch (e) { toast("لم يتم النسخ — اضغط مطوّلاً على البيانات لتحديدها"); } a.remove(); }
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(ok, fallback); else fallback();
}
/* 3.0: المظهر الداكن، وتخصيص اللوحة، والإعدادات من «حسابي» */
function accPrefs() {
  var dark = document.documentElement.dataset.theme === "dark", I = Board.icon, ch = I("chev", 18, 2);
  return '<div class="acc-list"><button type="button" class="acc-row" role="switch" aria-checked="' + dark + '" data-bd="theme">' + I("moon", 20) + '<span>الوضع الداكن</span><span class="acc-sw" aria-hidden="true"><i></i></span></button>' +
    (isSup() ? '<button type="button" class="acc-row" data-bd="customize">' + I("sliders", 20) + "<span>تخصيص اللوحة</span>" + ch + "</button>" +
      '<button type="button" class="acc-row" data-bd="tab" data-t="sup">' + I("settings", 20) + "<span>الإعدادات</span>" + ch + "</button>" : "") + "</div>";
}
function openAccount() {
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("حسابي") +
    '<div class="card"><dl class="kv"><dt>الاسم</dt><dd>' + esc(nameOf(S.uid)) + '</dd><dt>الدخول</dt><dd class="num">' + esc(showLogin(S.user.email)) + "</dd><dt>الصلاحية</dt><dd>" + (isSup() ? "مشرف" : "عامل") + "</dd></dl></div>" +
    accPrefs() +
    '<form class="fgrid" id="pwForm" style="margin-top:14px" novalidate><label class="f full" for="p_new">تغيير كلمة المرور<input class="in" id="p_new" type="password" dir="ltr" autocomplete="new-password" placeholder="كلمة المرور الجديدة"></label><button class="btn full" type="button" data-act="changePw">حفظ كلمة المرور</button></form>' +
    (showLogin(S.user.email) !== S.user.email ? "" : '<form class="fgrid" style="margin-top:14px" novalidate><label class="f full" for="e_new">تغيير البريد الإلكتروني<input class="in" id="e_new" type="email" dir="ltr" autocomplete="email" placeholder="البريد الجديد"></label><button class="btn full" type="button" data-act="changeEmail">إرسال رابط التأكيد</button><p class="muted full" style="font-size:12.5px;margin:0">يصل رابط تأكيد إلى البريد الجديد، وبعد فتحه يتغيّر بريد الدخول. سجّل الدخول بعدها بالبريد الجديد.</p></form>') +
    '<div class="f full" style="margin-top:14px"><span>لوحة الأرقام في خانات القياس</span><div class="seg" id="kp_on" role="group"><button type="button" data-v="1" aria-pressed="' + kpOn() + '">لوحة GREEN SIDE الكبيرة</button><button type="button" data-v="0" aria-pressed="' + !kpOn() + '">لوحة الجوال</button></div></div>' +
    (S.installEvt ? '<button class="btn pri block" style="margin-top:14px" type="button" data-act="install">تثبيت التطبيق على الجوال</button>' : '<p class="muted" style="font-size:13px;margin-top:14px">لتثبيت التطبيق: من قائمة المتصفح (⋮) اختر "تثبيت التطبيق".</p>') +
    '<div class="sheet-actions"><button class="btn danger" type="button" data-act="logout">تسجيل الخروج</button></div><p class="muted" style="font-size:12px;text-align:center">GREEN SIDE · الإصدار ' + APP_VERSION + ' · بواسطة <bdi>Hamed</bdi></p></div></div>');
}

/* ================= number pad ================= */
/* A large on-screen number pad for numeric fields: the same on every phone, with a big clear decimal point.
   Each phone can switch back to its own keyboard from "حسابي". */
function kpOn() { return lsGet("gs_kp") !== "0"; }
/* readonly stops the phone keyboard on every phone (also when returning from another app); the pad writes the value itself */
function KPA() { return kpOn() ? 'readonly inputmode="none" data-kp="1"' : 'inputmode="decimal" enterkeyhint="next" data-kp="1"'; }
var KP = { el: null, inp: null };
function kpBuild() {
  if (KP.el) return KP.el;
  var d = document.createElement("div"); d.className = "kp"; d.id = "kp"; d.hidden = true;
  var keys = [["1"], ["2"], ["3"], ["bk", "⌫", "kp-act"], ["4"], ["5"], ["6"], ["clr", "مسح", "kp-act"], ["7"], ["8"], ["9"], ["next", "التالي", "kp-next"], [".", "", "kp-dot"], ["0"], ["done", "إخفاء", "kp-act"]];
  d.innerHTML = '<div class="kp-h"><span id="kpL"></span><b class="num" id="kpV"></b></div><div class="kp-g">' + keys.map(function (k) { return '<button type="button" tabindex="-1" class="kp-k ' + (k[2] || "") + '" data-k="' + k[0] + '" aria-label="' + (k[0] === "." ? "فاصلة عشرية" : (k[1] || k[0])) + '">' + (k[0] === "." ? '<span class="dot"></span>' : (k[1] || k[0])) + "</button>"; }).join("") + "</div>";
  d.addEventListener("pointerdown", function (ev) { ev.preventDefault(); var b = ev.target.closest("[data-k]"); if (!b) return; b.classList.add("on"); setTimeout(function () { b.classList.remove("on"); }, 120); kpKey(b.getAttribute("data-k")); });
  d.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
  d.addEventListener("click", function (ev) { ev.preventDefault(); });
  document.body.appendChild(d); KP.el = d; return d;
}
function kpShow(el) {
  if(el.disabled || el.hasAttribute("data-computed"))return;
  kpBuild(); KP.el.querySelector('[data-k="."]').disabled=el.hasAttribute("data-integer"); KP.inp = el; el.setAttribute("inputmode", "none"); el.setAttribute("readonly", "");
  if (!NAV.kp) { NAV.kp = true; try { history.pushState({ gs: "kp" }, ""); } catch (x) {} }
  var lab = el.closest("label"), t = el.getAttribute("aria-label") || "";
  if (!t && lab) { var n0 = lab.firstChild; t = n0 && n0.nodeType === 3 ? n0.textContent : ((lab.querySelector(":scope > span") || {}).textContent || ""); }
  var u = el.parentNode.querySelector(".u"); KP.unit = u ? u.textContent : "";
  $("kpL").textContent = t.replace("*", "").trim(); kpVal();
  KP.el.hidden = false; document.documentElement.classList.add("kp-open");
  setTimeout(function () { if (KP.inp !== el) return; try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (x) { el.scrollIntoView(); } }, 80);
}
function kpVal() { if (KP.inp) $("kpV").textContent = (KP.inp.value || "—") + (KP.inp.value && KP.unit ? " " + KP.unit : ""); }
function kpHide(noHist) {
  if (KP.el && !KP.el.hidden) { KP.el.hidden = true; KP.inp = null; document.documentElement.classList.remove("kp-open"); repaint(); }
  if (NAV.kp) { NAV.kp = false; if (!noHist) { NAV.ignore++; history.back(); } }
}
function kpKey(k) {
  var el = KP.inp; if (!el || el.disabled || el.hasAttribute("data-computed") || !document.body.contains(el)) { kpHide(); return; }
  if (k === "next") { focusNext(el); return; }
  if (k === "done") { el.blur(); kpHide(); return; }
  var sep = el.hasAttribute("data-sep"), v = sep ? inVal(el) : el.value;
  if (k === "bk") v = v.slice(0, -1);
  else if (k === "clr") v = "";
  else if (k === ".") { if (el.hasAttribute("data-integer") || sep || v.replace(/[٫,]/g, ".").indexOf(".") >= 0) return; v = (v === "" ? "0" : v) + "."; }
  else v += k;
  el.value = sep ? sepFmt(v) : v;
  el.__kp = 1; el.dispatchEvent(new Event("input", { bubbles: true })); el.__kp = 0;
  kpVal(); try { if (navigator.vibrate) navigator.vibrate(6); } catch (x) {}
}
/* "next" on the pad or the phone keyboard moves to the next field; after the last one it closes the pad (and shows the calculator result) */
function focusNext(el) {
  var root = el.closest(".sheet") || el.closest("form") || $("view");
  var list = Array.prototype.filter.call(root.querySelectorAll("input.in, textarea.in"), function (x) { return !x.disabled && !x.hasAttribute("data-computed") && ["hidden", "date", "checkbox", "radio", "file"].indexOf(x.type) < 0 && x.offsetParent !== null; });
  var nx = list[list.indexOf(el) + 1];
  if (nx) { nx.focus(); if (nx.matches("[data-kp]") && kpOn()) kpShow(nx); else kpHide(); return true; }
  el.blur(); kpHide();
  var out = $("calcOut"); if (out && root.contains(out)) setTimeout(function () { out.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  return false;
}
function caretEnd(t) { setTimeout(function () { try { var n = t.value.length; t.setSelectionRange(n, n); } catch (x) {} }, 0); }
var FOCUS_T = 0;
document.addEventListener("pointerdown", function (ev) { var t = ev.target.closest && ev.target.closest("[data-kp]"); if (!t || t.hasAttribute("data-computed") || t.disabled) return; if (kpOn()) { t.setAttribute("readonly", ""); t.setAttribute("inputmode", "none"); } else { t.removeAttribute("readonly"); t.setAttribute("inputmode", "decimal"); } }, true);
/* leaving the app (recent apps, home) drops the focus so the phone keyboard does not pop up on return */
document.addEventListener("visibilitychange", function () { if (document.hidden) { var a = document.activeElement; if (a && a.blur && a !== document.body) a.blur(); kpHide(); } else { repaint(); dayTick(); resumeUpdate(); } });
window.addEventListener("pageshow", function () { repaint(); dayTick(); });
window.addEventListener("focus", function () { dayTick(); });
setInterval(dayTick, 30000);
document.addEventListener("focusin", function (ev) {
  var t = ev.target; if (!t || !t.matches) return;
  if (t.matches("input.in, textarea.in")) { FOCUS_T = Date.now(); caretEnd(t); }
  if (t.matches("[data-kp]") && kpOn()) kpShow(t); else if (KP.inp && KP.inp !== t) kpHide();
});
document.addEventListener("focusout", function () { setTimeout(function () { if (KP.inp && document.activeElement !== KP.inp) kpHide(); }, 0); });
/* typing starts at the end of the text wherever the field is tapped */
document.addEventListener("click", function (ev) { var t = ev.target; if (t && t.matches && t.matches("input.in, textarea.in") && Date.now() - FOCUS_T < 700) caretEnd(t); }, true);

/* ================= system check (owner) ================= */
function expectDenied(p) { return p.then(function () { var e = new Error("سُمح بالعملية ولم تُمنع (ثغرة في قواعد الحماية)"); throw e; }, function (e) { if (e && e.code === "permission-denied") return "مُنع كما يجب"; throw e; }); }
function near(a, b, tol) { return Math.abs(a - b) <= (tol || 0.6); }
async function runSelfTest() {
  var res = [], db = S.db, uid = S.uid, today = todayStr(), cfgF = window.GS_CONFIG.firebase;
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("فحص النظام", null, "sup") + '<p class="help" style="margin-top:0">يُجري اختبارات حقيقية على قاعدة بياناتك ثم يحذف كل بيانات الاختبار. لا تغلق النافذة حتى ينتهي.</p><div id="stBody"></div><div id="stSum" style="margin-top:12px"></div></div></div>');
  var draw = function (running) {
    var b = $("stBody"); if (!b) return;
    b.innerHTML = res.map(function (r) { return '<div class="eq-row"><span class="pill ' + (r.ok ? "ok" : "bad") + '">' + (r.ok ? "✓" : "✗") + '</span><span class="tx"><b>' + esc(r.name) + "</b><span>" + esc(r.d) + "</span></span></div>"; }).join("") + (running ? '<div class="eq-row"><span class="pill n">…</span><span class="tx"><b>' + esc(running) + "</b></span></div>" : "");
  };
  var step = async function (name, fn) { draw(name); try { var d = await fn(); res.push({ name: name, ok: true, d: d || "" }); } catch (e) { res.push({ name: name, ok: false, d: (e && (e.code ? e.code + " · " : "") + (e.message || "")) || String(e) }); } draw(); };
  var ownerRef = null, wApp = null, wdb = null, wref = null, wuid = null, anon = null;
  await step("الاتصال بقاعدة البيانات", async function () { await db.collection("config").doc("settings").get({ source: "server" }); return "متصل بالخادم"; });
  await step("حفظ تسجيل وقراءته من الخادم", async function () {
    ownerRef = db.collection("entries").doc();
    await ownerRef.set({ type: "selftest", sec: "n", date: today, time: nowTime(), ts: Date.now(), by: uid, v: { ec: 1234 } });
    var s = await ownerRef.get({ source: "server" }); if (!s.exists || s.data().v.ec !== 1234) throw new Error("القيمة المقروءة لا تطابق المحفوظة"); return "حُفظ وقُرئ من الخادم بنفس القيمة";
  });
  await step("حفظ صورة وقراءتها", async function () {
    var pr = db.collection("photos").doc(); await pr.set({ data: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", by: uid, ts: Date.now(), sec: "n" });
    var s = await pr.get({ source: "server" }); if (!s.exists) throw new Error("لم تُقرأ الصورة"); await pr.delete(); return "تعمل";
  });
  await step("المشرف يعدّل الإعدادات", async function () { await db.collection("config").doc("settings").update({ lastSelfTest: Date.now() }); return "مسموح"; });
  await step("منع غير المسجلين من قراءة البيانات", async function () {
    anon = withAppCheck(firebase.initializeApp(cfgF, "anon" + Date.now()));
    var r = await expectDenied(anon.firestore().collection("entries").limit(1).get({ source: "server" })); return r;
  });
  await step("إنشاء حساب عامل تجريبي", async function () {
    wApp = withAppCheck(firebase.initializeApp(cfgF, "stw" + Date.now()));
    var email = "selftest" + Date.now() + "@" + (window.GS_CONFIG.usernameDomain || "greenside.local"), pw = "St" + Math.random().toString(36).slice(2, 10) + "9";
    var cred = await wApp.auth().createUserWithEmailAndPassword(email, pw); wuid = cred.user.uid;
    await db.collection("users").doc(wuid).set({ name: "فحص النظام", login: email, role: "worker", createdAt: Date.now(), selftest: true });
    wdb = wApp.firestore(); return "تم";
  });
  if (wdb) {
    await step("العامل يسجّل قراءة", async function () { wref = wdb.collection("entries").doc(); await wref.set({ type: "selftest", sec: "t", date: today, time: nowTime(), ts: Date.now(), by: wuid, v: { ec: 1 } }); return "مسموح"; });
    await step("العامل يقرأ السجلات", async function () { await wdb.collection("entries").where("date", "==", today).get({ source: "server" }); return "مسموح"; });
    await step("العامل يعدّل تسجيله قبل المراجعة", async function () { await wref.update({ v: { ec: 2 } }); return "مسموح"; });
    /* تسجيلات حقيقية بنوع ملاحظة (مغلقة حتى لا تظهر في الملاحظات المفتوحة) تُحذف في آخر الفحص */
    var wNote = function (date) { return { type: "note", sec: "n", date: date, time: nowTime(), ts: Date.now(), by: wuid, open: false, v: { time: nowTime(), memo: "فحص النظام" } }; };
    var stRefs = [];
    await step("العامل يسجّل ويعدّل تسجيلاً عادياً مع سبب التعديل", async function () {
      var r = wdb.collection("entries").doc(), d = wNote(today); await r.set(d); stRefs.push(r.id);
      var a = wdb.collection("farmChanges").doc(), nv = Object.assign({}, d.v, { memo: "فحص النظام · معدّل", auditId: a.id });
      var b = wdb.batch();
      b.set(a, { entry: r.id, by: wuid, date: today, type: "note", sec: "n", before: d.v, after: nv, requested: false, reason: "فحص النظام", created: firebase.firestore.FieldValue.serverTimestamp() });
      b.update(r, { v: nv, time: nv.time }); await b.commit();
      var s = await wdb.collection("entries").doc(r.id).get({ source: "server" }); if (s.data().v.memo !== nv.memo) throw new Error("لم يُحفظ التعديل"); return "مسموح ويُسجَّل في تنبيهات المشرف";
    });
    await step("تسجيل محفوظ بدون إنترنت يصل بعد منتصف الليل", async function () {
      var r = wdb.collection("entries").doc();
      try { await r.set(wNote(addDays(today, -1))); } catch (e) { if (e && e.code === "permission-denied") { var er = new Error("يُرفض: انشر ملف firestore.rules الجديد (2.15.0) في Firebase"); er.code = "rules"; throw er; } throw e; }
      stRefs.push(r.id); return "يُقبل تسجيل الأمس";
    });
    await step("العامل لا يسجّل بتاريخ أقدم دون سبب", function () { return expectDenied(wdb.collection("entries").doc().set(wNote(addDays(today, -3)))); });
    var newRules = function (what) { var er = new Error(what + ": انشر ملف firestore.rules الجديد (3.4.1) في Firebase"); er.code = "rules"; return er; };
    await step("القواعد ترفض بيانات بصيغة غير صالحة", async function () {
      var r = wdb.collection("entries").doc(), bad = wNote(today); bad.time = "<b>x</b>";
      try { await r.set(bad); } catch (e) { if (e && e.code === "permission-denied") return "مُنع كما يجب"; throw e; }
      stRefs.push(r.id); throw newRules("قُبلت");
    });
    await step("العامل يسجّل بتاريخ سابق مع السبب ولا يحذفه لاحقاً", async function () {
      var r = wdb.collection("entries").doc(), a = wdb.collection("farmChanges").doc(), d = wNote(addDays(today, -3)); d.v.auditId = a.id;
      var b = wdb.batch(); b.set(a, { entry: r.id, by: wuid, date: d.date, type: "note", sec: "n", before: null, after: d.v, requested: false, reason: "فحص النظام", created: firebase.firestore.FieldValue.serverTimestamp() }); b.set(r, d); await b.commit();
      try { await r.delete(); } catch (e) { if (e && e.code === "permission-denied") { await db.collection("entries").doc(r.id).delete(); return "يُقبل مع السبب · حذف القديم ممنوع كما يجب"; } throw e; }
      throw newRules("حُذف تسجيل قديم");
    });
    await step("العامل يقرأ سجلات المزرعة", async function () {
      var c = function (k) { return wdb.collection(k); }, w0 = addDays(today, -120);
      await Promise.all([c("cropBalances").limit(1).get({ source: "server" }), c("farmLevels").orderBy("observed", "desc").limit(1).get({ source: "server" }),
        c("farmWater").where("date", ">=", w0).orderBy("date", "desc").limit(1).get({ source: "server" }), c("farmJobs").orderBy("created", "desc").limit(1).get({ source: "server" }),
        c("farmService").where("date", ">=", w0).orderBy("date", "desc").limit(1).get({ source: "server" }), c("farmMessages").where("audience", "==", "team").limit(1).get({ source: "server" }),
        c("farmChanges").where("by", "==", wuid).get({ source: "server" })]);
      return "المعدات والمهام والتوريدات والرسائل والدفعات";
    });
    await step("العامل لا يرى التكاليف", function () { return expectDenied(wdb.collection("farmLedger").limit(1).get({ source: "server" })); });
    /* 3.4.0 دورة الزراعة: تسجيلات حقيقية باسم حساب الفحص (لا تظهر في صفحة الدورة) تُحذف في نهاية الخطوات */
    var cyRefs = [];
    await step("دورة الزراعة: العامل يبذر ويعدّ وينقل بدون جرد معتمد", async function () {
      var c = wdb.collection("entries"), sr = c.doc(), cr = c.doc(), mr = c.doc(), b = wdb.batch(), t = nowTime();
      b.set(sr, { type: "sow", sec: "n", date: today, time: t, ts: Date.now(), by: wuid, v: { time: t, crop: "فحص النظام", seeds: 10, side: SIDES[0] } });
      b.set(cr, { type: "count", sec: "n", date: today, time: t, ts: Date.now(), by: wuid, v: { time: t, batch: sr.id, usable: 9 } });
      b.set(mr, { type: "xplant", sec: "t", date: today, time: t, ts: Date.now(), by: wuid, v: { time: t, batch: sr.id, count: 4, zone: ZONE_T[0] } });
      try { await b.commit(); } catch (e) { if (e && e.code === "permission-denied") throw newRules("مُنع"); throw e; }
      cyRefs = [mr.id, cr.id, sr.id]; return "مسموح · العدّ من العامل والنقل تسجيل عادي يعمل بدون إنترنت";
    });
    if (cyRefs.length) {
      await step("دورة الزراعة: القواعد ترفض نقلاً غير صالح", async function () {
        var t = nowTime(), mv = function (v) { return { type: "xplant", sec: "t", date: today, time: t, ts: Date.now(), by: wuid, v: Object.assign({ time: t }, v) }; };
        await expectDenied(wdb.collection("entries").doc().set(mv({ batch: cyRefs[2], count: 2.5 })));
        await expectDenied(wdb.collection("entries").doc().set(mv({ batch: wdb.collection("entries").doc().id, count: 3 })));
        await expectDenied(wdb.collection("entries").doc().set(mv({ batch: cyRefs[2], count: 3, stockTracked: true })));
        return "عدد كسري، ودفعة غير موجودة، ورصيد قديم بلا خصم: مُنعت كما يجب";
      });
      await step("دورة الزراعة: «آخر حصاد» يُقفل الدفعة", async function () {
        var h = wdb.collection("entries").doc(), t = nowTime();
        await h.set({ type: "harvest", sec: "t", date: today, time: t, ts: Date.now(), by: wuid, v: { time: t, batch: cyRefs[2], weight: 0.5, count: 4, rejected: 0, saleable: 4, final: true } });
        cyRefs.unshift(h.id); return "مسموح";
      });
      await step("دورة الزراعة: العامل يحذف تسجيلاته في يومه", async function () { for (var i = 0; i < cyRefs.length; i++) await wdb.collection("entries").doc(cyRefs[i]).delete(); cyRefs = []; return "مسموح"; });
    }
    await step("العامل يحذف تسجيلاته العادية", async function () { for (var i = 0; i < stRefs.length; i++) await wdb.collection("entries").doc(stRefs[i]).delete(); stRefs = []; return "مسموح"; });
    await step("العامل لا يعدّل الإعدادات", function () { return expectDenied(wdb.collection("config").doc("settings").update({ x: 1 })); });
    await step("العامل لا يعتمد التسجيلات", function () { return expectDenied(wref.update({ review: { s: "ok", by: wuid } })); });
    await step("العامل لا يعدّل تسجيل غيره", function () { return expectDenied(wdb.collection("entries").doc(ownerRef.id).update({ v: { ec: 5 } })); });
    await step("العامل لا يغيّر صلاحيته", function () { return expectDenied(wdb.collection("users").doc(wuid).update({ role: "sup" })); });
    await step("العامل لا يعدّل الوصفات", function () { return expectDenied(wdb.collection("recipes").add({ x: 1, ts: 1 })); });
    await step("العامل لا يسجّل باسم شخص آخر", function () { return expectDenied(wdb.collection("entries").add({ type: "selftest", sec: "n", date: today, by: uid, v: {} })); });
    await step("العامل يحذف تسجيله قبل المراجعة", async function () { await wref.delete(); wref = null; return "مسموح"; });
    await step("العامل ينهي شحن بطارية بدأها غيره", async function () {
      var br = db.collection("entries").doc(); await br.set({ type: "batt", sec: "g", date: today, time: nowTime(), ts: Date.now(), by: uid, v: { start: Date.now(), end: null } });
      try { var bs = (await wdb.collection("entries").doc(br.id).get({ source: "server" })).data(); await wdb.collection("entries").doc(br.id).update({ v: Object.assign({}, bs.v, { end: Date.now(), endBy: wuid }) }); }
      catch (e) { await br.delete(); if (e && e.code === "permission-denied") { var er = new Error("مُنع: انشر ملف firestore.rules الجديد في Firebase"); er.code = "rules"; throw er; } throw e; }
      await br.delete(); return "مسموح";
    });
    await step("علامة قراءة الرسائل ✓✓", async function () {
      try { await wdb.collection("farmSeen").doc(wuid).set({ rooms: { team: Date.now() }, at: firebase.firestore.FieldValue.serverTimestamp() }); }
      catch (e) { if (e && e.code === "permission-denied") { var er = new Error("غير مفعّلة: انشر ملف firestore.rules الجديد في Firebase"); er.code = "rules"; throw er; } throw e; }
      await expectDenied(wdb.collection("farmSeen").doc(uid).set({ rooms: { team: 1 }, at: firebase.firestore.FieldValue.serverTimestamp() }));
      await wdb.collection("farmSeen").doc(wuid).delete(); return "تعمل · كل عضو يكتب قراءته فقط";
    });
    await step("إيقاف الحساب يمنع الوصول فوراً", async function () { await db.collection("users").doc(wuid).update({ role: "disabled" }); return expectDenied(wdb.collection("entries").limit(1).get({ source: "server" })); });
  }
  if (S.ownerUid === uid) await step("التكاليف والمبيعات: المالك يسجّل مبيعات ويحذفها", async function () {
    var col = db.collection("farmLedger"), r = col.doc(), bad = col.doc(), stamp = firebase.firestore.FieldValue.serverTimestamp();
    try { await r.set({ kind: "مبيعات", category: "مبيعات", amount: 1, kg: 0.1, date: today, by: uid, memo: "فحص النظام", source: "", basis: "مباشر للدفعة", allocation: [], created: stamp }); }
    catch (e) { if (e && e.code === "permission-denied") { var er = new Error("مُنع: انشر ملف firestore.rules الجديد (3.4.1) في Firebase"); er.code = "rules"; throw er; } throw e; }
    await r.delete();
    try { await expectDenied(bad.set({ kind: "مبيعات", category: "مبيعات", amount: 1, kg: "x", date: today, by: uid, allocation: [], created: stamp })); }
    catch (e) { await bad.delete().catch(function () {}); var er2 = new Error("قُبل وزن غير رقمي: انشر ملف firestore.rules الجديد (3.4.1) في Firebase"); er2.code = "rules"; throw er2; }
    return "مسموح · والقيد غير الصالح مرفوض";
  });
  await step("تنظيف بيانات الاختبار", async function () {
    if (ownerRef) await ownerRef.delete();
    if (typeof cyRefs !== "undefined") for (var c = 0; c < cyRefs.length; c++) await db.collection("entries").doc(cyRefs[c]).delete();
    if (wref) await db.collection("entries").doc(wref.id).delete();
    if (typeof stRefs !== "undefined") for (var i = 0; i < stRefs.length; i++) await db.collection("entries").doc(stRefs[i]).delete();
    if (wApp && wApp.auth().currentUser) { try { await wApp.auth().currentUser.delete(); } catch (e) { await wApp.auth().signOut(); } }
    /* وثائق حسابات الفحص (الحالي وما تراكم من فحوص سابقة) تُحذف إن سمحت القواعد الجديدة */
    var olds = Object.keys(S.users).filter(function (k) { return S.users[k] && S.users[k].selftest; }); if (wuid && olds.indexOf(wuid) < 0) olds.push(wuid);
    for (var j = 0; j < olds.length; j++) { try { await db.collection("users").doc(olds[j]).delete(); } catch (e) { break; } }
    if (wApp) await wApp.delete(); if (anon) await anon.delete();
    return "حُذفت بيانات وحساب الاختبار";
  });
  await step("فهرس البحث (تخفيف القراءات)", async function () {
    try { await db.collection("entries").where("type", "in", ["mix", "refill"]).where("date", ">=", windowStart()).limit(1).get({ source: "server" }); return "موجود · يقرأ آخر " + WINDOW_DAYS + " يوماً فقط"; }
    catch (e) { if (onIndexErr(e)) { var er = new Error("الفهرس غير موجود بعد. أنشئه من الزر في قسم المشرف"); er.code = "index"; throw er; } throw e; }
  });
  if (window.SENS && SENS.selfTest) await SENS.selfTest(step);
  await step("صحة الحسابات", async function () {
    var k = (1330 - 400) / 10, errs = [];
    if (!near(k, 93, .001)) errs.push("معامل الخلطة");
    var fm = freshMath(400, 865, 20, k, 1); if (!near(fm.mlA, 100, .01) || !near(fm.mlB, 100, .01)) errs.push("خلطة المشتل");
    var b = refillMath({ Vc: 600, cur: 1166, raw: 424, tgt: 1500, Vf: 1000, cap: 1000, k: 93, ratio: 1, ecMin: 1200 }); if (b.mode !== 2 || !near(b.water, 400) || !near(b.mA, 6782.8, 1)) errs.push("التعزيز");
    var d = refillMath({ Vc: 900, cur: 2000, raw: 400, tgt: 1500, Vf: 1000, cap: 1000, k: 93, ratio: 1, ecMin: 1200 }); if (d.mode !== 0 || !near(d.drain, 212.5) || !near(d.water, 312.5)) errs.push("التخفيف مع التصريف");
    var fin = (2000 * (900 - d.drain) + 400 * d.water) / 1000; if (!near(fin, 1500, 1)) errs.push("الأملاح بعد التخفيف");
    var w = refillMath({ Vc: 600, cur: 2000, raw: 400, tgt: 1500, Vf: 800, cap: 1000, k: 93, ratio: 1, ecMin: 1200 }); if (w.mode !== 0 || w.mA !== 0 || w.drain !== 0 || !near(w.water, 272.73, 0.1) || !near((2000 * 600 + 400 * w.water) / w.finalV, 1500, 1)) errs.push("التخفيف بالماء");
    if (!near(ecTo25(868, 20.3, 0.019), 953.1, 0.5)) errs.push("تصحيح حرارة الأملاح");
    if (!near(phTo25(6, 15), 5.965, 0.002)) errs.push("تصحيح حرارة pH");
    if (fmtTime("13:05") !== "1:05 م" || fmtTime("00:30") !== "12:30 ص") errs.push("نظام 12 ساعة");
    var sv = { air_r1: 30, air_r2: 32, air_r3: 34, air_l1: 28 }; if (!near(sideAvg(sv, "air", 0), 32, .001) || !near(sideAvg(sv, "air", 1), 28, .001) || !near(metric(sv, "air"), 31, .001)) errs.push("متوسط اليمين واليسار");
    if (!near(irrL({ liters_r: 20, liters_l: 18 }), 38, .001) || !near(irrL({ liters: 20 }), 20, .001)) errs.push("كمية الري");
    if (!near(atcAlpha(1000 * (1 + 0.019 * (15 - 25)), 15, 1000 * (1 + 0.019 * (30 - 25)), 30), 0.019, 0.0001) || Math.abs(atcAlpha(1000, 15, 1000, 30)) > 1e-9) errs.push("اختبار ATC");
    if (["irr", "temp", "light", "note", "photo"].map(function (t) { return DEF.sched.n[t].length; }).join(",") !== "3,5,5,1,1") errs.push("مواعيد المهام");
    if (!near(freshMath(400, 400 + 93 * 12.5, 20, 93, 1).mlA, 250, .01)) errs.push("الجرعة الكاملة 12.5");
    if (errs.length) throw new Error("خطأ في: " + errs.join("، "));
    return "13 حساباً مطابقاً للقيم المتوقعة";
  });
  await step("حسابات التقارير", async function () {
    if (window.GSUI) GSUI.start(); for (var i = 0; i < 24 && window.GSUI && !GSUI.ready(); i++) await new Promise(function (r) { setTimeout(r, 250); });
    var r = RPT.selfCheck(); if (!r.ok) throw new Error("خطأ في: " + r.errs.join("، "));
    return r.pass + " حساباً مطابقاً للأرقام المعروفة" + r.note;
  });
  draw();
  var ok = res.filter(function (r) { return r.ok; }).length, sm = $("stSum");
  if (sm) sm.innerHTML = '<div class="banner ' + (ok === res.length ? "ok" : "warn") + '"><b>' + ok + " / " + res.length + "</b>&nbsp;" + (ok === res.length ? "نجحت كل الاختبارات" : "بعض الاختبارات لم تنجح، صوّر هذه الشاشة وأرسلها") + "</div>" + crashLogHTML();
}

/* ================= actions ================= */
var delArm = null;
function armDelete(b, id) { if (delArm === id) { delArm = null; return true; } delArm = id; b.textContent = "اضغط مرة أخرى للحذف"; setTimeout(function () { delArm = null; if (b.isConnected) b.textContent = "حذف"; }, 3000); return false; }
document.addEventListener("click", function (ev) {
  var tp = ev.target.closest(".tp [data-ap]");
  if (tp) { var w = tp.closest(".tp"); w.setAttribute("data-ap", tp.getAttribute("data-ap")); w.querySelectorAll("button[data-ap]").forEach(function (x) { x.setAttribute("aria-pressed", x === tp); }); updForm(); return; }
  var sg = ev.target.closest("#kp_on [data-v]");
  if (sg) { sg.parentNode.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === sg); }); lsSet("gs_kp", sg.getAttribute("data-v")); return; }
  var ur = ev.target.closest("#u_role [data-r]");
  if (ur) { ur.parentNode.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === ur); }); return; }
  var bg = ev.target.closest("[data-close]"); if (bg && ev.target === bg) { closeSheet(); return; }
  var b = ev.target.closest("[data-act]"); if (!b) return;
  var a = b.getAttribute("data-act"), id = b.getAttribute("data-id"), db = S.db;
  var fail = function (err) { console.warn(err); b.disabled = false; toast(errMsg(err)); };
  switch (a) {
    case "authMode": AUTH_MODE = b.getAttribute("data-m"); renderAuth(); break;
    case "logout": if (NAV.sheet) closeSheet(); memberSubs = false; S.auth.signOut(); break;
    case "account": openAccount(); break;
    case "install": if (S.installEvt) { S.installEvt.prompt(); S.installEvt = null; closeSheet(); } break;
    case "goSens": setTab("sens"); break;
    case "changeEmail":
      var ne = ($("e_new").value || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(ne)) { toast("اكتب بريداً صحيحاً"); return; }
      if (ne === (S.user.email || "").toLowerCase()) { toast("هذا هو بريدك الحالي"); return; }
      b.disabled = true;
      S.user.verifyBeforeUpdateEmail(ne).then(function () { toast("أُرسل رابط التأكيد إلى " + ne + " · افتحه ثم سجّل الدخول بالبريد الجديد"); closeSheet(); }).catch(fail); break;
    case "changePw": var np = $("p_new").value; if (np.length < 6) { toast("كلمة المرور 6 أحرف أو أكثر"); return; } b.disabled = true; S.user.updatePassword(np).then(function () { toast("تم تغيير كلمة المرور"); closeSheet(); }).catch(fail); break;
    case "close": closeSheet(); break;
    case "copyCred": copyCred(); break;
    case "switchSec": switchSec(b.getAttribute("data-s")); break;
    case "sub": var sk = b.getAttribute("data-k"), sv = b.getAttribute("data-v"); SUB[sk] = sv; lsSet("gs_sub_" + sk, sv); render(true); var stb = document.querySelector("#view .subtabs"); if (stb && stb.getBoundingClientRect().top < $("top").offsetHeight) window.scrollTo(0, Math.max(0, stb.getBoundingClientRect().top + window.scrollY - $("top").offsetHeight - 10)); break;
    case "jump": jumpTo(b.getAttribute("data-to")); break;
    case "dayStep": { var nd = addDays(S.date, +b.getAttribute("data-d") || 0); if (nd > todayStr()) break; S.date = nd; var dpk = $("datePick"); if (dpk) dpk.value = nd; subDay(); render(true); window.scrollTo(0, 0); break; }
    case "goTasks": var ts = $("tasksSec"); if (ts) window.scrollTo({ top: ts.getBoundingClientRect().top + window.scrollY - $("top").offsetHeight - 10, behavior: "smooth" }); break;
    case "goTab": setTab(b.getAttribute("data-t")); break;
    case "reloadApp": hardReload(true); break;
    case "clearCrash": CRASH = []; lsSet("gs_errs", "[]"); var cl = b.closest(".crashlog"); if (cl) cl.remove(); break;
    case "schDel": var sd1 = b.getAttribute("data-sec"), ty1 = b.getAttribute("data-type"), tt1 = b.getAttribute("data-t"); schDelete(sd1, ty1, tt1).catch(fail); toast("حُذف موعد " + fmtTime(tt1)); break;
    case "schToggle": if (isSup()) schToggle(b.getAttribute("data-sec"), b.getAttribute("data-type")).catch(fail); break;
    case "schStep": if (isSup()) schStep(b.getAttribute("data-sec"), b.getAttribute("data-type"), +b.getAttribute("data-d")).catch(fail); break;
    case "schOpt": if (isSup()) openSlot(b.getAttribute("data-sec"), b.getAttribute("data-type"), b.getAttribute("data-t")); break;
    case "soMode": if (SO) { SO.mode = b.getAttribute("data-m"); var su0 = $("so_until"); if (su0) SO.until = su0.value; $("sheetRoot").innerHTML = soHTML(); } break;
    case "soSave": if (SO) { var su1 = $("so_until"); if (su1) SO.until = su1.value; soSave().catch(fail); closeSheet(); } break;
    case "soResume": if (SO) { soResume().catch(fail); closeSheet(); } break;
    case "soTime": if (SO) openSchAdd(SO.sec, SO.type, SO.t); break;
    case "soDel": if (SO) { schDelete(SO.sec, SO.type, SO.t).catch(fail); toast("حُذف موعد " + fmtTime(SO.t)); closeSheet(); } break;
    case "schAdd": openSchAdd(b.getAttribute("data-sec"), b.getAttribute("data-type")); break;
    case "schSave": var sd2 = b.getAttribute("data-sec"), ty2 = b.getAttribute("data-type"), tt2 = readTime("sch_tp"), od2 = b.getAttribute("data-old");
      if (od2 && od2 !== tt2 && schedOf(sd2, ty2).indexOf(tt2) >= 0) { toast("يوجد موعد في " + fmtTime(tt2) + " بالفعل"); break; }
      if (od2) { var so2 = clonePath("slotOff", sd2, ty2), pz2 = so2[sd2][ty2][od2]; delete so2[sd2][ty2][od2]; if (pz2) so2[sd2][ty2][tt2] = pz2; var sc2 = clone(S.settings.sched || DEF.sched); sc2[sd2] = sc2[sd2] || {}; sc2[sd2][ty2] = schedOf(sd2, ty2).map(function (x) { return x === od2 ? tt2 : x; }).sort(); saveSettings({ sched: sc2, slotOff: so2 }).catch(fail); closeSheet(); toast("صار الموعد " + fmtTime(tt2)); break; }
      saveSched(sd2, ty2, schedOf(sd2, ty2).concat([tt2])).catch(fail); closeSheet(); toast("أُضيف موعد " + fmtTime(tt2)); break;
    case "editDoses": openDoses(b.getAttribute("data-from")); break;
    case "addDose": $("doseList").insertAdjacentHTML("beforeend", doseRowHTML()); break;
    case "rmDose": b.closest(".dose-row").remove(); break;
    case "saveDoses":
      var rowsD = Array.prototype.map.call(document.querySelectorAll("#doseList [data-dose]"), function (el) { return num(el.value); }).filter(function (x) { return x > 0; }).sort(function (x, y) { return x - y; });
      if (!rowsD.length) { toast("أضف جرعة واحدة على الأقل"); return; }
      var fromD = b.getAttribute("data-from");
      saveSettings({ doses: rowsD, fullDose: rowsD[rowsD.length - 1] }).catch(fail);
      toast("حُفظت الجرعات"); setTimeout(function () { if (fromD === "calc") openCalc(); else closeSheet(); }, 60); break;
    case "atcTest": openAtcTest(); break;
    case "saveAtc": if (!ATC_RES) return; var oa = { atc: ATC_RES.atc, atcChecked: todayStr() }; if (!ATC_RES.atc) oa.ecCoef = ATC_RES.coef; saveSettings(oa).catch(fail); closeSheet(); toast(ATC_RES.atc ? "اعتُمد: الجهاز يعوّض الحرارة (ATC)" : "اعتُمد معامل الحرارة " + f(ATC_RES.coef * 100, 2) + "% لكل درجة"); break;
    case "gotoday": S.date = todayStr(); $("datePick").value = S.date; subDay(); render(true); break;
    case "calc": openCalc(); break;
    case "cmode": CALC.mode = b.getAttribute("data-m"); b.parentNode.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); calcRun(); break;
    case "cstage": var sv = b.getAttribute("data-s"); CALC.stage = sv === "ec" || sv === "custom" ? sv : +sv; b.parentNode.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); calcRun(); if (sv === "custom") setTimeout(function () { var cd = $("c_dose"); if (cd) cd.focus(); }, 30); break;
    case "calcToForm":
      var r = CALC.res; if (!r) { toast("أكمل بيانات الحاسبة أولاً"); return; }
      var blank = function (x) { return x == null ? "" : x; };
      if (r.kind === "fresh") openForm("mix", null, { ecRaw: r.ecRaw, water: r.water, mlA: r.mlA, mlB: r.mlB, wt: blank(r.wt), phRaw: blank(r.phRaw) });
      else { openForm("refill", null, { wt: blank(r.wt), level0: r.level0, ec0: r.ec0, mode: r.mode, waterAdd: r.waterAdd, drained: r.drained || "", mlA: r.mlA || "", mlB: r.mlB || "", phRaw: blank(r.phRaw) }); FORM.modeTouched = true; }
      break;
    case "new": openForm(b.getAttribute("data-type")); break;
    case "edit": var e1 = findEntry(id); if (e1) openForm(e1.type, e1); break;
    case "save": saveForm(b); break;
    case "del": if (!armDelete(b, id)) return; GSUI.commit(db.collection("entries").doc(id).delete(),b,function(){closeSheet();toast("تم الحذف");}); break;
    case "move": var em = findEntry(id); if (!em) return; var to = secOf(em) === "n" ? "t" : "n"; db.collection("entries").doc(id).update({ sec: to }).then(function () { toast("نُقل التسجيل إلى " + SECS[to].name); }).catch(fail); break;
    case "approve": db.collection("entries").doc(id).update({ review: { s: "ok", by: S.uid, at: Date.now(), c: "" } }).catch(fail); break;
    case "flag": openFlag(id); break;
    case "saveFlag": var c = $("flagTxt").value.trim(); if (!c) { toast("اكتب الملاحظة"); return; } GSUI.commit(db.collection("entries").doc(id).update({ review: { s: "flag", by: S.uid, at: Date.now(), c: c } }),b,function(){closeSheet();toast("حُفظت ملاحظة المشرف");}); break;
    case "toggleNote": var e2 = findEntry(id); if (e2) db.collection("entries").doc(id).update({ open: !e2.open }).catch(fail); break;
    case "signoff":
      b.disabled = true; var batch = db.batch(), sec = S.sec;
      var ids = secEntries(S.entries, sec).filter(function (x) { return !x.review; }).map(function (x) { return x.id; });
      GSUI.commit(approveChunks(ids).then(function () { return db.collection("signoffs").doc(S.date + "_" + sec).set({ by: S.uid, at: Date.now(), sec: sec }); }),b,function(){toast("تم اعتماد " + SECS[sec].name);}); break;
    case "battStart":
      var now = Date.now(), nt = nowTime();
      db.collection("entries").add({ type: "batt", sec: "g", date: todayStr(), time: nt, ts: now, by: S.uid, v: { time: nt, start: now, end: null } }).catch(fail);
      toast("سُجّل بدء شحن البطارية"); break;
    case "battEnd": var be = findEntry(id) || lastBatt(); if (!be) return; var nv = Object.assign({}, be.v || {}, { end: Date.now(), endBy: S.uid });
      db.collection("entries").doc(be.id).update({ v: nv }).then(function () { toast("سُجّل انتهاء الشحن"); }).catch(function (err) { console.warn(err); toast(err && err.code === "permission-denied" ? "قواعد الحماية لم تُحدَّث بعد: انشر firestore.rules الجديد" : errMsg(err)); }); break;
    case "gallery": if (NAV.sheet) closeSheet(); if (window.Rec && Rec.openGallery) Rec.openGallery(); else openGallery(); break;
    case "lightbox": var pid = b.getAttribute("data-pid"); if (pid) openLightbox(pid, b.getAttribute("data-cap")); break;
    case "sowPlan": openSowPlan(); break;
    case "editFormula": openFormula(); break;
    case "saveFormula":
      var fo = { name: $("fo_name").value.trim() || "الخلطة", fullA: num($("fo_fullA").value), fullB: num($("fo_fullB").value), ecRaw: num($("fo_ecRaw").value), ecFull: num($("fo_ecFull").value), date: $("fo_date").value || todayStr() };
      if (!fo.fullA || !fo.fullB || fo.ecRaw == null || !fo.ecFull || fo.ecFull <= fo.ecRaw) { toast("تحقق من الأرقام: الجرعة والأملاح"); return; }
      b.disabled = true; saveSettings({ formula: fo }).then(function () { toast("اعتُمدت الخلطة"); closeSheet(); }).catch(fail); break;
    case "newRecipe": openRecipe(null); break;
    case "editRecipe": openRecipe(S.recipes.filter(function (r) { return r.id === id; })[0]); break;
    case "addRi": $("riList").insertAdjacentHTML("beforeend", riRow({ name: "", qty: "", unit: "غ" })); break;
    case "rmRi": b.closest(".ri").remove(); break;
    case "saveRecipe":
      var vol = num($("r_vol").value); if (!vol) { toast("اكتب حجم المحلول المركز"); return; }
      var items = Array.prototype.map.call(document.querySelectorAll("#riList .ri"), function (r) { return { name: r.querySelector('[data-ri="name"]').value.trim(), qty: num(r.querySelector('[data-ri="qty"]').value), unit: r.querySelector('[data-ri="unit"]').value }; }).filter(function (x) { return x.name; });
      if (!items.length) { toast("أضف مادة واحدة على الأقل"); return; }
      var d = { date: $("r_date").value || todayStr(), tank: $("r_tank").value, volMl: vol, items: items, notes: $("r_notes").value.trim() };
      var recipeForm = $("recForm");
      if (!recipeForm || b.disabled) return;
      var recipes = db.collection("recipes");
      if (!recipeForm._ref) recipeForm._ref = id ? recipes.doc(id) : recipes.doc();
      var previousRecipe = id && S.recipes.find(function (r) { return r.id === id; });
      if (id && !previousRecipe) { toast("تعذر العثور على الوصفة؛ حدّث القائمة."); return; }
      d.ts = previousRecipe ? previousRecipe.ts : Date.now();
      d.by = previousRecipe ? previousRecipe.by : S.uid;
      if (previousRecipe) d.editedBy = S.uid;
      GSUI.commit(recipeForm._ref.set(d), b, function () {
        if ($("recForm") === recipeForm) closeSheet();
        toast("أكّد الخادم حفظ الوصفة");
      });
      break;
    case "delRecipe": if (!armDelete(b, id)) return; db.collection("recipes").doc(id).delete().catch(fail); closeSheet(); break;
    case "newUser": openNewUser(); break;
    case "selfTest": runSelfTest(); break;
    case "goBack": history.back(); break;
    case "createUser": createUser(b); break;
    case "setRole": db.collection("users").doc(id).update({ role: b.getAttribute("data-r") }).then(function () { toast("تم تحديث الصلاحية"); }).catch(fail); break;
    case "saveSec":
      var o = {}; document.querySelectorAll("#setSec [id^=ss_]").forEach(function (el) { var k = el.id.slice(3); if (k === "zoneNote") o[k] = el.value.trim(); else { var n = num(el.value); if (n != null) o[k] = n; } });
      var ns = S.sec === "t" ? { tw: Object.assign({}, S.settings.tw || {}, o) } : o;
      if (!Object.keys(ns).length) { toast("لا توجد قيم للحفظ"); return; }
      saveSettings(ns).then(function () { toast("حُفظت حدود " + SECS[S.sec].name); }).catch(fail); break;
    case "saveGlob":
      var flowValid=["flowLitres","flowMinutes","flowSeconds"].every(function(k){return $("sg_"+k).value.trim()!=="" && num($("sg_"+k).value)!==null;});
      if(!flowValid){toast("أكمل حجم وزمن معايرة التدفق بأرقام صحيحة؛ يمكن كتابة صفر للدقائق أو الثواني");return;}
      var og = { levelUnit: $("sg_levelUnit").value, useLearned: $("sg_useLearned").value === "1" };
      document.querySelectorAll("#setGlob input[id^=sg_]").forEach(function (el) { var n = num(el.value); if (n != null) og[el.id.slice(3)] = n; });
      if(flowVolume({litres:og.flowLitres,minutes:og.flowMinutes,seconds:og.flowSeconds},1,0)===null){toast("صحح معايرة التدفق: حجم موجب وزمن موجب، والثواني 0–59");return;}
      GSUI.commit(saveSettings(og),b,function(){toast("حُفظت الإعدادات");}); break;
  }
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && NAV.sheet) closeSheet();
  if (e.key === "Enter" && e.target && e.target.matches && e.target.matches("input.in") && !e.target.closest("#authForm")) { e.preventDefault(); focusNext(e.target); }
});
try { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && (k.indexOf("gs_fired_") === 0 || k === "gs_alarm" || k === "gs_wake")) localStorage.removeItem(k); } } catch (e) {}
if ("serviceWorker" in navigator) window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
if(window.GSUI)GSUI.init();
boot();
