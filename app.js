/* GREEN SIDE 2.0 — متابعة المشتل والأبراج في البيت المحمي
   البيانات في Firebase Firestore، والدخول عبر Firebase Authentication.
   القسمان: n = المشتل (نظام مفتوح)، t = الأبراج (نظام مغلق). المعدات: g.
   لإضافة نوع تسجيل: أضفه في TYPES_N أو TYPES_T وأضف اسمه إلى ORDER. */
"use strict";
var APP_VERSION = "2.0.1";

/* ================= constants ================= */
var SECS = { n: { name: "المشتل", icon: "🌱", sys: "نظام مفتوح" }, t: { name: "الأبراج", icon: "🗼", sys: "نظام مغلق" } };
var DEF = {
  ecMin: 800, ecMax: 1500, ecTarget: 1200, phMin: 5.5, phMax: 6.5, wtMin: 18, wtMax: 26,
  airMin: 15, airMax: 32, rhMin: 50, rhMax: 85, luxMin: 10000, luxMax: 40000,
  nMix: 1, nEcph: 3, nTemp: 3, nLight: 3, nIrr: 4, nPhoto: 1, pumpL: 20, tankL: 25, zoneNote: "",
  atc: false, ecCoef: 0.019, battHours: 24, battMaxCharge: 8, calDays: 14, capacity: 6000, daysToTransplant: 21,
  levelUnit: "L", lPerCm: 10, useLearned: true,
  formula: { name: "خس ليما — مرحلة N (المشتل)", fullA: 10, fullB: 10, ecFull: 1330, ecRaw: 400, date: "2026-10-07" }
};
var DEF_T = {
  ecMin: 1200, ecMax: 1800, ecTarget: 1500, phMin: 5.7, phMax: 6.3, wtMin: 18, wtMax: 24,
  airMin: 15, airMax: 30, rhMin: 50, rhMax: 80, luxMin: 15000, luxMax: 45000,
  nEcph: 3, nTemp: 3, nLight: 3, nRefill: 1, nPump: 1, nPhoto: 1, tankL: 1000,
  zoneNote: "البداية: الأبراج جهة الخلايا · الوسط: منتصف البيت · النهاية: الأبراج جهة المراوح"
};
var CHECK = { ec: ["ecMin", "ecMax"], ph: ["phMin", "phMax"], wt: ["wtMin", "wtMax"], air: ["airMin", "airMax"], rh: ["rhMin", "rhMax"], lux: ["luxMin", "luxMax"] };
var ZONES = ["البداية", "الوسط", "النهاية"], ZK = ["b", "m", "e"], LEVELS = ["أسفل", "وسط", "أعلى"];
var ZONE_N = ["كل المشتل"].concat(ZONES), ZONE_T = ["كل البيت"].concat(ZONES), LEVEL_OPTS = ["كل البرج"].concat(LEVELS);
var PH_ADJ = ["لا شيء", "خافض pH فقط", "رافع pH فقط", "خافض ورافع معاً"];
var REFILL_MODES = ["تخفيف: ماء فقط", "تعويض قياسي: محلول بتركيز الهدف", "تعزيز: محلول مُعزَّز"];
var STAGES = [[0.25, "ربع الجرعة"], [0.5, "نصف الجرعة"], [0.75, "ثلاثة أرباع"], [1, "الجرعة الكاملة"]];
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
  sup: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'
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
var TYPES_N = {
  mix: { label: "خلط محلول الري", short: "خلط المحلول", desc: "ماء المصدر، كمية A و B، الحرارة، الأملاح وpH", target: "nMix", fields: mixFields() },
  ecph: { label: "قراءة الأملاح و pH", short: "أملاح و pH", desc: "حرارة الماء ثم الأملاح وpH خلال اليوم", target: "nEcph", fields: ECPH_FIELDS },
  temp: { label: "حرارة ورطوبة الجو", short: "الجو", desc: "حرارة الجو والرطوبة في 3 مناطق", target: "nTemp", needOne: ["air1", "air2", "air3"], fields: [
    { k: "time", l: "وقت القياس", t: "t", req: 1, w: "full" },
    { k: "air1", l: "البداية", t: "n", u: "°C", c: "air", w: "third", grp: "حرارة الجو", pg: "air", zn: 1 },
    { k: "air2", l: "الوسط", t: "n", u: "°C", c: "air", w: "third", pg: "air" },
    { k: "air3", l: "النهاية", t: "n", u: "°C", c: "air", w: "third", pg: "air" },
    { k: "rh1", l: "البداية", t: "n", u: "%", c: "rh", w: "third", grp: "الرطوبة النسبية", pg: "rh" },
    { k: "rh2", l: "الوسط", t: "n", u: "%", c: "rh", w: "third", pg: "rh" },
    { k: "rh3", l: "النهاية", t: "n", u: "%", c: "rh", w: "third", pg: "rh" },
    MEMO] },
  irr: { label: "ري الشتلات", short: "الري", desc: "وقت كل رية بمضخة البطارية", target: "nIrr", fields: [
    { k: "time", l: "وقت الري", t: "t", req: 1, w: "full" },
    { k: "liters", l: "كمية المحلول", t: "n", u: "لتر", req: 1, def: "pumpL" },
    { k: "mins", l: "مدة الري", t: "n", u: "دقيقة" },
    { k: "zone", l: "المنطقة", t: "s", o: ZONE_N, w: "full" },
    MEMO] },
  light: { label: "قياس الضوء", short: "الضوء", desc: "ثلاث نقاط: البداية، الوسط، النهاية", target: "nLight", fields: [
    { k: "time", l: "وقت القياس", t: "t", req: 1, w: "full" },
    { k: "sky", l: "حالة الجو", t: "s", o: ["مشمس", "غائم جزئياً", "غائم"], w: "full" },
    { k: "l1", l: "البداية", t: "n", u: "lux", req: 1, c: "lux", w: "third", grp: "شدة الإضاءة", pg: "lux", zn: 1 },
    { k: "l2", l: "الوسط", t: "n", u: "lux", req: 1, c: "lux", w: "third", pg: "lux" },
    { k: "l3", l: "النهاية", t: "n", u: "lux", req: 1, c: "lux", w: "third", pg: "lux" },
    MEMO] },
  sow: { label: "زراعة البذور", short: "الزراعة", desc: "تاريخ ووقت الزراعة، الصنف والكمية", fields: [
    { k: "time", l: "وقت الزراعة", t: "t", req: 1, w: "full" },
    { k: "crop", l: "الصنف / نوع البذور", t: "x", req: 1, w: "full", list: "crops" },
    { k: "seeds", l: "عدد البذور المزروعة", t: "n", u: "بذرة", req: 1 },
    { k: "trays", l: "عدد الصواني", t: "n", u: "صينية" },
    { k: "lot", l: "المورد / رقم التشغيلة", t: "x", w: "full" },
    MEMO] },
  photo: { label: "التصوير اليومي", short: "التصوير", desc: "صورة يومية لمتابعة النمو", target: "nPhoto", photo: "req", fields: [
    { k: "time", l: "الوقت", t: "t", req: 1, w: "full" },
    { k: "batch", l: "دفعة الزراعة", t: "batch", w: "full" },
    { k: "loc", l: "المكان", t: "s", o: ZONE_N },
    { k: "height", l: "ارتفاع النبات", t: "n", u: "سم" },
    MEMO] },
  note: { label: "ملاحظة على النبات", short: "ملاحظات", desc: "تعب، إصابة، مرض، رش أو أي ملاحظة", photo: "opt", fields: [
    { k: "time", l: "الوقت", t: "t", req: 1, w: "full" },
    { k: "cat", l: "النوع", t: "s", o: NOTE_CATS, req: 1, w: "full" },
    { k: "sev", l: "الشدة", t: "s", o: ["خفيفة", "متوسطة", "شديدة"] },
    { k: "loc", l: "المكان", t: "s", o: ZONE_N },
    { k: "crop", l: "الصنف / رقم الصواني", t: "x", w: "full" },
    { k: "text", l: "وصف الملاحظة", t: "ta", req: 1, w: "full" },
    { k: "action", l: "الإجراء المتخذ (اسم المبيد والجرعة إن وجد)", t: "ta", w: "full" }] }
};
var TYPES_T = {
  refill: { label: "تعويض الخزان", short: "تعويض الخزان", desc: "مستوى الماء، الأملاح قبل وبعد، نوع التعويض", target: "nRefill", fields: [
    { k: "time", l: "وقت التعويض", t: "t", req: 1, w: "full" },
    { k: "wt", l: "حرارة الماء", t: "n", u: "°C", req: 1, c: "wt", grp: "1. قبل التعويض" },
    { k: "level0", l: "مستوى الماء", t: "n", u: lvlUnit, req: 1 },
    { k: "ec0", l: "الأملاح قبل التعويض", t: "n", u: "µS/cm", req: 1, c: "ec", comp: "ec" },
    { k: "ph0", l: "pH قبل التعويض", t: "n", u: "pH", comp: "ph" },
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
  note: { label: "ملاحظة على النبات", short: "ملاحظات", desc: "تعب، إصابة، مرض، رش أو أي ملاحظة", photo: "opt", fields: [
    { k: "time", l: "الوقت", t: "t", req: 1, w: "full" },
    { k: "cat", l: "النوع", t: "s", o: NOTE_CATS, req: 1, w: "full" },
    { k: "loc", l: "المنطقة", t: "s", o: ZONE_T },
    { k: "lvl", l: "المستوى في البرج", t: "s", o: LEVEL_OPTS },
    { k: "sev", l: "الشدة", t: "s", o: ["خفيفة", "متوسطة", "شديدة"] },
    { k: "crop", l: "الصنف / رقم البرج", t: "x" },
    { k: "text", l: "وصف الملاحظة", t: "ta", req: 1, w: "full" },
    { k: "action", l: "الإجراء المتخذ (اسم المبيد والجرعة إن وجد)", t: "ta", w: "full" }] }
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
var ORDER = { n: ["mix", "ecph", "temp", "irr", "light", "sow", "photo", "note"], t: ["refill", "ecph", "temp", "light", "pump", "photo", "note", "xplant", "harvest", "mix"] };
var TASKS = { n: [["mix", "nMix"], ["ecph", "nEcph"], ["temp", "nTemp"], ["irr", "nIrr"], ["light", "nLight"], ["photo", "nPhoto"]],
  t: [["refill", "nRefill"], ["ecph", "nEcph"], ["temp", "nTemp"], ["light", "nLight"], ["pump", "nPump"], ["photo", "nPhoto"]] };
var SHARED = ["mix", "ecph", "note", "photo"];
var FERTS = ["ULTRASOL CALCIUM", "AGRIFER EDDHA", "ULTRASOLINE KNO3", "MGSO4", "ULTRASOL SOP", "SOLUMKP", "VSP Stock", "Micro Stock", "نترات الكالسيوم", "نترات البوتاسيوم", "سلفات المغنيسيوم", "حديد مخلبي"];

/* ================= state ================= */
var S = {
  auth: null, db: null, user: null, uid: null, me: null, ownerUid: null, role: null,
  settings: clone(DEF), users: {}, date: todayStr(), entries: [], signoff: {}, openNotes: [], recipes: [], hist: [], meta: [],
  tab: "today", sec: lsGet("gs_sec") === "t" ? "t" : "n", repDays: 7, rep: null, photos: {}, dirty: false, installEvt: null
};
var unsubDay = [], unsubAll = [], memberSubs = false;

/* ================= utils ================= */
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function pad(n) { return (n < 10 ? "0" : "") + n; }
function todayStr(d) { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function nowTime() { var d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
function addDays(s, n) { var d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return todayStr(d); }
function daysBetween(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5); }
function fmtDate(s, opt) { try { return new Date(s + "T12:00:00").toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", opt || { weekday: "long", day: "numeric", month: "long" }); } catch (e) { return s; } }
function fmtShort(s) { return fmtDate(s, { day: "numeric", month: "short" }); }
function fmtTime(t) { if (!t) return ""; var p = String(t).split(":"); var h = +p[0]; if (isNaN(h)) return t; return (h % 12 || 12) + ":" + p[1] + " " + (h < 12 ? "ص" : "م"); }
function tsHM(ts) { var d = new Date(ts); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
function tsTime(ts) { return fmtTime(tsHM(ts)); }
function fmtAgo(h) { if (h == null) return "—"; if (h < 1) return "أقل من ساعة"; if (h < 48) return Math.round(h) + " ساعة"; return Math.round(h / 24) + " يوم"; }
function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function num(v) { if (v === "" || v == null) return null; if (typeof v === "number") return isFinite(v) ? v : null; var s = String(v).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }).replace(/[٫,]/g, ".").trim(); if (s === "") return null; var n = Number(s); return isFinite(n) ? n : null; }
function f(n, d) { if (n == null || !isFinite(n)) return "—"; return Number(n).toLocaleString("en-US", { maximumFractionDigits: d || 0, minimumFractionDigits: 0 }); }
function fml(n) { return f(n, Math.abs(n) < 20 ? 1 : 0); }
function avg(a) { a = a.filter(function (x) { return x != null && isFinite(x); }); return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
function sum(a) { return a.filter(function (x) { return x != null && isFinite(x); }).reduce(function (s, x) { return s + x; }, 0); }
function median(a) { a = a.filter(function (x) { return x != null && isFinite(x); }).sort(function (x, y) { return x - y; }); if (!a.length) return null; var m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
function $(id) { return document.getElementById(id); }
function toast(m) { var t = document.createElement("div"); t.className = "toast"; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800); }
function nameOf(id) { var u = S.users[id]; return (u && u.name) || "مستخدم"; }
function initials(id) { var n = nameOf(id).trim(); return esc(n ? n.charAt(0) : "؟"); }
function isSup() { return S.role === "sup"; }
function isWorker() { return S.role === "worker"; }
function canAdd() { return isSup() || isWorker(); }
function secOf(e) { return e.sec || "n"; }
function secTag(s) { return '<span class="sectag s-' + s + '">' + (s === "g" ? "⚙️ المعدات" : SECS[s].icon + " " + SECS[s].name) + "</span>"; }
function toEmail(id) { id = id.trim().toLowerCase(); return id.indexOf("@") >= 0 ? id : id.replace(/\s+/g, "") + "@" + (window.GS_CONFIG.usernameDomain || "greenside.local"); }
function showLogin(id) { if (!id) return ""; var d = "@" + (window.GS_CONFIG.usernameDomain || "greenside.local"); return id.slice(-d.length) === d ? id.slice(0, -d.length) : id; }
function errMsg(e) {
  var c = e && e.code || "";
  return {
    "auth/invalid-credential": "اسم المستخدم أو كلمة المرور غير صحيحة.", "auth/wrong-password": "كلمة المرور غير صحيحة.", "auth/user-not-found": "لا يوجد حساب بهذا الاسم.",
    "auth/invalid-email": "اكتب اسم مستخدم أو بريداً صحيحاً.", "auth/too-many-requests": "محاولات كثيرة. انتظر قليلاً ثم حاول.", "auth/network-request-failed": "لا يوجد اتصال بالإنترنت.",
    "auth/email-already-in-use": "اسم المستخدم مستخدم من قبل.", "auth/weak-password": "كلمة المرور قصيرة. استخدم 6 أحرف أو أكثر.", "auth/requires-recent-login": "سجّل الخروج ثم الدخول من جديد، ثم غيّر كلمة المرور.",
    "permission-denied": "ليس لديك صلاحية لهذا الإجراء.", "unavailable": "لا يوجد اتصال بالخادم حالياً."
  }[c] || "حدث خطأ. حاول مرة أخرى.";
}

/* ================= settings ================= */
function cfg(k, sec) {
  sec = sec || S.sec;
  if (sec === "t" && Object.prototype.hasOwnProperty.call(DEF_T, k)) { var tw = S.settings.tw || {}; return tw[k] != null && tw[k] !== "" ? tw[k] : DEF_T[k]; }
  var v = S.settings[k]; return v != null && v !== "" ? v : DEF[k];
}
function formula() { return Object.assign({}, DEF.formula, S.settings.formula || {}); }
function chk(c, v, sec) { if (!c || v == null) return null; var lo = num(cfg(CHECK[c][0], sec)), hi = num(cfg(CHECK[c][1], sec)); if (lo != null && v < lo) return "lo"; if (hi != null && v > hi) return "hi"; return "ok"; }
function rangeTxt(c, sec) { return f(num(cfg(CHECK[c][0], sec)), 1) + " – " + f(num(cfg(CHECK[c][1], sec)), 1); }
function isBad(st) { return st === "lo" || st === "hi"; }
function lvlToL(x) { if (x == null) return null; return cfg("levelUnit") === "cm" ? x * num(cfg("lPerCm")) : x; }

/* temperature compensation (reference 25 °C) */
function ec25(ec, t) { if (ec == null) return null; if (cfg("atc") || t == null) return ec; return ecTo25(ec, t, num(cfg("ecCoef"))); }
function ph25(ph, t) { if (ph == null) return null; if (cfg("atc") || t == null) return ph; return phTo25(ph, t); }
function phAt(p25, t) { if (p25 == null) return null; if (cfg("atc") || t == null) return p25; return 7 + (p25 - 7) * (t + 273.15) / 298.15; }
function compVal(fd, raw, v) { var n = num(raw); if (n == null) return null; var t = num(v.wt); if (fd.comp === "ec") return ec25(n, t); if (fd.comp === "ph") return ph25(n, t); return n; }
function unitOf(fd) { return typeof fd.u === "function" ? fd.u() : (fd.u || ""); }

/* grid helpers (towers: 3 zones × 3 levels) */
function gridKeys(k) { var a = []; ZK.forEach(function (z) { [1, 2, 3].forEach(function (l) { a.push(k + "_" + z + l); }); }); return a; }
function metric(v, m) { v = v || {}; return avg(NK[m].concat(gridKeys(m)).map(function (k) { return num(v[k]); })); }
function zoneAvg(v, m, zi) { var z = ZK[zi]; var g = avg([1, 2, 3].map(function (l) { return num(v[m + "_" + z + l]); })); if (g != null) return g; return num(v[NK[m][zi]]); }
function levelAvg(v, m, li) { return avg(ZK.map(function (z) { return num(v[m + "_" + z + (li + 1)]); })); }

/* ================= types ================= */
function typeDef(type, sec) { if (TYPES_G[type]) return TYPES_G[type]; return (sec === "t" ? TYPES_T : TYPES_N)[type] || TYPES_N[type] || TYPES_T[type]; }
function secEntries(list, sec) { return list.filter(function (e) { return secOf(e) === sec && e.type !== "selftest"; }); }
function viewEntries() { return S.entries.filter(function (e) { return e.type !== "selftest" && (secOf(e) === S.sec || e.sec === "g"); }); }
function tasksFor(sec, entries) {
  var E = secEntries(entries, sec), need = 0, done = 0;
  TASKS[sec].forEach(function (x) { var n = num(cfg(x[1], sec)) || 0; need += n; done += Math.min(n, E.filter(function (e) { return e.type === x[0]; }).length); });
  return { need: need, done: done, left: Math.max(0, need - done) };
}

/* ================= navigation (Android back button) ================= */
var NAV = { sheet: false, ignore: 0, tabs: [], lastBack: 0, armed: false, exitTimer: null };
function navInit() {
  if (NAV.armed) return; NAV.armed = true;
  try { history.replaceState({ gs: "base" }, ""); history.pushState({ gs: "app" }, ""); } catch (e) {}
  window.addEventListener("popstate", onPop);
}
function onPop() {
  if (NAV.ignore > 0) { NAV.ignore--; return; }
  if (NAV.sheet) { closeSheet(true); return; }
  if (NAV.tabs.length) { setTab(NAV.tabs.pop(), true); return; }
  var now = Date.now();
  if (now - NAV.lastBack < 2500) { hideExit(); history.back(); return; }
  NAV.lastBack = now; showExit();
  try { history.pushState({ gs: "app" }, ""); } catch (e) {}
}
function showExit() { var b = $("exitbar"); b.hidden = false; clearTimeout(NAV.exitTimer); NAV.exitTimer = setTimeout(hideExit, 2500); }
function hideExit() { $("exitbar").hidden = true; }
function setTab(t, fromPop) {
  if (!fromPop && t !== S.tab) { NAV.tabs.push(S.tab); try { history.pushState({ gs: "tab" }, ""); } catch (e) {} }
  S.tab = t; if (t === "rep") loadReport(); render(true); window.scrollTo(0, 0);
}
function openSheet(html) {
  $("sheetRoot").innerHTML = html;
  document.documentElement.classList.add("lock");
  if (!NAV.sheet) { NAV.sheet = true; try { history.pushState({ gs: "sheet" }, ""); } catch (e) {} }
  var sh = $("sheetRoot").querySelector(".sheet"); if (sh) sh.scrollTop = 0;
}
function closeSheet(fromPop) {
  var had = NAV.sheet;
  $("sheetRoot").innerHTML = ""; FORM = null; CALC.open = false;
  document.documentElement.classList.remove("lock");
  NAV.sheet = false;
  if (had && !fromPop) { NAV.ignore++; history.back(); }
  if (S.dirty) render();
}
function sheetHead(title, sec, icon) {
  return '<div class="sheet-h">' + (icon ? '<span class="e-ic">' + ico(icon, 19) + "</span>" : "") + '<div class="sh-t">' + (sec ? secTag(sec) : "") + "<h2>" + esc(title) + '</h2></div><button class="iconbtn" type="button" data-act="close" aria-label="إغلاق">✕</button></div>';
}

/* ================= boot ================= */
function boot() {
  var cfgF = window.GS_CONFIG && window.GS_CONFIG.firebase;
  if (!window.firebase || !cfgF || !cfgF.apiKey) { $("view").innerHTML = '<div class="login"><div class="logo"><img src="icons/icon-192.png" alt=""><span class="wm big">GREEN SIDE</span></div><div class="card"><h2>التطبيق بانتظار الربط</h2><p class="muted">أضف بيانات مشروع Firebase في ملف config.js.</p></div></div>'; return; }
  firebase.initializeApp(cfgF);
  S.auth = firebase.auth(); S.db = firebase.firestore();
  S.db.enablePersistence({ synchronizeTabs: true }).catch(function () {});
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
function stopAll() { unsubDay.concat(unsubAll).forEach(function (u) { try { u(); } catch (e) {} }); unsubDay = []; unsubAll = []; }
function applySec() {
  document.body.classList.toggle("sec-t", S.sec === "t"); document.body.classList.toggle("sec-n", S.sec === "n");
  document.querySelectorAll("#secsw [data-sec]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-sec") === S.sec); });
  var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", S.sec === "t" ? "#1E6278" : "#1F5A3F");
}

/* ================= auth screens ================= */
var AUTH_MODE = "login";
function showAuth() {
  $("top").hidden = true; $("tabsNav").hidden = true; if (NAV.sheet) closeSheet(true);
  S.db.collection("config").doc("owner").get().then(function (s) { S.ownerUid = s.exists ? s.data().uid : null; if (!S.ownerUid) AUTH_MODE = "setup"; renderAuth(); }).catch(function () { renderAuth(); });
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
    h += '<div class="card"><h2>استعادة كلمة المرور</h2><p class="muted" style="font-size:13.5px">تصل رسالة الاستعادة للحسابات المسجلة ببريد حقيقي. حسابات العمال يعيد المشرف كلمة مرورها.</p><form id="authForm" class="fgrid" novalidate><label class="f full" for="a_id">البريد الإلكتروني<input class="in" id="a_id" type="email" dir="ltr"></label><div class="err full" id="a_err"></div><button class="btn pri block full" type="submit">إرسال رابط الاستعادة</button></form></div>' +
      '<button class="linkbtn" type="button" data-act="authMode" data-m="login">رجوع لتسجيل الدخول</button>';
  } else {
    h += '<div class="card"><form id="authForm" class="fgrid" novalidate><label class="f full" for="a_id">اسم المستخدم أو البريد<input class="in" id="a_id" dir="ltr" autocapitalize="off" autocomplete="username"></label>' +
      '<label class="f full" for="a_pw">كلمة المرور<input class="in" id="a_pw" type="password" dir="ltr" autocomplete="current-password"></label><div class="err full" id="a_err"></div><button class="btn pri block full" type="submit">تسجيل الدخول</button></form></div>' +
      '<button class="linkbtn" type="button" data-act="authMode" data-m="reset">نسيت كلمة المرور</button>' + (S.ownerUid === null ? '<button class="linkbtn" type="button" data-act="authMode" data-m="setup">إعداد الحساب الأول</button>' : "");
  }
  $("view").innerHTML = h + '<p class="muted" style="text-align:center;font-size:12px">الإصدار ' + APP_VERSION + "</p></div>";
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
    unsubAll.push(db.collection("users").doc(uid).onSnapshot(function (s) {
      S.me = s.exists ? s.data() : null;
      var r = S.ownerUid === uid ? "sup" : (S.me && S.me.role);
      var nr = (r === "sup" || r === "worker") ? r : null, changed = nr !== S.role; S.role = nr;
      if (changed) onRole(); else render();
    }, function () { S.role = null; onRole(); }));
  }).catch(function (e) { console.warn(e); $("view").innerHTML = '<div class="sec"><div class="empty">تعذّر الاتصال. تحقق من الإنترنت ثم أعد فتح التطبيق.<button class="btn" data-act="logout">تسجيل الخروج</button></div></div>'; });
}
function onRole() {
  if (!S.role) {
    unsubDay.forEach(function (u) { u(); }); unsubDay = []; memberSubs = false;
    $("top").hidden = true; $("tabsNav").hidden = true;
    $("view").innerHTML = '<div class="login"><div class="logo"><span class="wm big">GREEN SIDE</span></div><div class="card"><h2>الحساب غير مفعّل</h2><p class="muted">حسابك غير مفعّل أو موقوف. تواصل مع المشرف.</p><button class="btn block" data-act="logout">تسجيل الخروج</button></div></div>';
    return;
  }
  $("top").hidden = false; $("tabsNav").hidden = false; netState(); navInit();
  if (isWorker() && (S.tab === "sup" || S.tab === "rep")) S.tab = "today";
  if (!memberSubs) {
    memberSubs = true; var db = S.db;
    unsubAll.push(db.collection("config").doc("settings").onSnapshot(function (s) { S.settings = Object.assign(clone(DEF), s.exists ? s.data() : {}); render(); }, logErr));
    unsubAll.push(db.collection("users").onSnapshot(function (q) { var m = {}; q.forEach(function (d) { m[d.id] = d.data(); }); S.users = m; render(); }, logErr));
    unsubAll.push(db.collection("recipes").orderBy("ts", "desc").limit(300).onSnapshot(function (q) { S.recipes = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); render(); }, logErr));
    unsubAll.push(db.collection("entries").where("type", "==", "note").where("open", "==", true).onSnapshot(function (q) { S.openNotes = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); render(); }, logErr));
    unsubAll.push(db.collection("entries").where("type", "in", ["mix", "refill"]).onSnapshot(function (q) { S.hist = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); }); render(); }, logErr));
    unsubAll.push(db.collection("entries").where("type", "in", ["sow", "xplant", "batt", "cal", "harvest"]).onSnapshot(function (q) { S.meta = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); }); render(); }, logErr));
    subDay();
  }
  render();
}
function logErr(e) { console.warn(e); }
function subDay() {
  unsubDay.forEach(function (u) { u(); }); unsubDay = [];
  S.entries = []; S.signoff = {};
  unsubDay.push(S.db.collection("entries").where("date", "==", S.date).onSnapshot(function (q) {
    S.entries = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (a.time || "").localeCompare(b.time || "") || (a.ts - b.ts); });
    render();
  }, logErr));
  [["n", S.date + "_n"], ["n0", S.date], ["t", S.date + "_t"]].forEach(function (p) {
    unsubDay.push(S.db.collection("signoffs").doc(p[1]).onSnapshot(function (s) { S.signoff[p[0]] = s.exists ? s.data() : null; render(); }, logErr));
  });
}
function signoffOf(sec) { return S.signoff[sec] || (sec === "n" ? S.signoff.n0 : null); }

/* ================= top bar & tabs ================= */
function bindTop() {
  var dp = $("datePick"); dp.value = S.date;
  function go(d) { S.date = d; dp.value = d; subDay(); render(true); }
  dp.addEventListener("change", function () { if (dp.value) go(dp.value); });
  $("prevDay").onclick = function () { go(addDays(S.date, -1)); };
  $("nextDay").onclick = function () { go(addDays(S.date, 1)); };
  $("goToday").onclick = function () { go(todayStr()); };
  $("tabs").addEventListener("click", function (e) { var b = e.target.closest("[data-tab]"); if (b) setTab(b.getAttribute("data-tab")); });
  $("secsw").addEventListener("click", function (e) { var b = e.target.closest("[data-sec]"); if (b) switchSec(b.getAttribute("data-sec")); });
  $("view").addEventListener("focusout", function () { setTimeout(function () { if (S.dirty && !NAV.sheet && !$("view").contains(document.activeElement)) render(); }, 0); });
}
function switchSec(s) {
  if (s === S.sec) return; S.sec = s; lsSet("gs_sec", s); applySec();
  if (S.tab === "rep") loadReport(); render(true); window.scrollTo(0, 0);
}
function renderTop() {
  var t = S.date === todayStr();
  $("dateLabel").textContent = (t ? "اليوم · " : "") + fmtDate(S.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $("who").innerHTML = '<span class="av">' + initials(S.uid) + '</span><span class="nm"></span><span class="pill ' + (isSup() ? "ok" : "n") + '">' + (isSup() ? "مشرف" : "عامل") + "</span>";
  $("who").querySelector(".nm").textContent = nameOf(S.uid);
  ["n", "t"].forEach(function (s) { var b = document.querySelector('#secsw [data-sec="' + s + '"] .cnt'); if (b) { var tk = tasksFor(s, S.entries); b.textContent = t && tk.left ? tk.left : ""; } });
}
function renderTabs() {
  var tabs = [["today", "اليوم", "today"]];
  if (canAdd()) tabs.push(["add", "تسجيل", "add"]);
  if (isSup()) { tabs.push(["rep", "التقارير", "rep"]); tabs.push(["sup", "المشرف", "sup"]); }
  $("tabs").innerHTML = tabs.map(function (x) { return '<button class="tab" type="button" data-tab="' + x[0] + '" ' + (S.tab === x[0] ? 'aria-current="page"' : "") + ">" + ico(x[2]) + "<span>" + x[1] + "</span></button>"; }).join("");
}

/* ================= render ================= */
function render(force) {
  if (!S.role) return;
  renderTop(); renderTabs();
  var v = $("view"), ae = document.activeElement;
  if (!force && ae && v.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) { S.dirty = true; return; }
  if (!force && NAV.sheet) { S.dirty = true; return; }
  S.dirty = false;
  if (S.tab === "add" && canAdd()) v.innerHTML = addView();
  else if (S.tab === "rep" && isSup()) { v.innerHTML = repView(); bindCharts(); }
  else if (S.tab === "sup" && isSup()) v.innerHTML = supView();
  else { S.tab = "today"; v.innerHTML = todayView(); }
  loadPhotos(v);
}

/* ---------- today ---------- */
function lastOf(list, test) { for (var i = list.length - 1; i >= 0; i--) if (test(list[i])) return list[i]; return null; }
function statTile(lab, val, unit, c, sub, dec) {
  var st = chk(c, val), cls = isBad(st) ? "s-bad" : "";
  var pill = st == null ? "" : st === "ok" ? '<span class="pill ok">ضمن الحد</span>' : '<span class="pill bad">' + (st === "lo" ? "منخفض" : "مرتفع") + "</span>";
  return '<div class="stat ' + cls + '"><span class="lab">' + lab + '</span><span class="val num">' + (val == null ? "—" : f(val, dec != null ? dec : (c === "ph" ? 2 : 1))) + " <small>" + unit + '</small></span><span class="sub">' + pill + " " + (sub || "") + "</span></div>";
}
function badReadings(E) {
  var out = [];
  E.forEach(function (e) {
    var sec = secOf(e); if (sec === "g") return; var T = typeDef(e.type, sec); if (!T) return; var v = e.v || {};
    T.fields.forEach(function (fd) {
      if (!fd.c) return;
      if (fd.t === "grid") {
        ZK.forEach(function (z, zi) { [1, 2, 3].forEach(function (l) { var n = num(v[fd.k + "_" + z + l]), st = chk(fd.c, n, sec); if (isBad(st)) out.push(fmtTime(e.time) + " · " + fd.l + " " + ZONES[zi] + "/" + LEVELS[l - 1] + ": " + f(n, 1) + " " + fd.u + " (" + (st === "lo" ? "أقل" : "أعلى") + " من " + rangeTxt(fd.c, sec) + ")"); }); });
        return;
      }
      var n = compVal(fd, v[fd.k], v), st = chk(fd.c, n, sec);
      if (isBad(st)) out.push(fmtTime(e.time) + " · " + T.short + ": " + (fd.pg ? MNAME[fd.pg] + " " : "") + fd.l + " " + f(n, fd.c === "ph" ? 2 : 0) + " " + unitOf(fd) + (fd.comp && !cfg("atc") ? " (عند 25°)" : "") + " — " + (st === "lo" ? "أقل" : "أعلى") + " من " + rangeTxt(fd.c, sec));
    });
  });
  return out;
}
function todayView() {
  var sec = S.sec, E = viewEntries(), SE = secEntries(S.entries, sec), isToday = S.date === todayStr(), h = "";
  var os = sec === "n" ? "t" : "n", ot = tasksFor(os, S.entries);
  h += '<section class="sec"><button class="otherbar" type="button" data-act="switchSec" data-s="' + os + '"><span>' + SECS[os].icon + " " + SECS[os].name + ": " + ot.done + " / " + ot.need + " مهام اليوم" + (ot.left ? " · متبقي " + ot.left : " ✓") + '</span><span class="muted">انتقال ‹</span></button></section>';
  var alerts = equipAlerts();
  if (alerts.length) h += '<section class="sec alerts">' + alerts.join("") + "</section>";
  var ecE = lastOf(SE, function (e) { return e.v && num(e.v.ec) != null; }), phE = lastOf(SE, function (e) { return e.v && num(e.v.ph) != null; }), wtE = lastOf(SE, function (e) { return e.v && num(e.v.wt) != null && e.type !== "temp"; });
  var airE = lastOf(SE, function (e) { return e.type === "temp" && metric(e.v, "air") != null; }), lE = lastOf(SE, function (e) { return e.type === "light" && metric(e.v, "lux") != null; });
  var ecv = ecE ? ec25(num(ecE.v.ec), num(ecE.v.wt)) : null, phv = phE ? ph25(num(phE.v.ph), num(phE.v.wt)) : null;
  h += '<section class="sec"><div class="grid2 grid-stat">' +
    statTile("آخر قراءة أملاح" + (cfg("atc") ? "" : " (25°)"), ecv, "µS/cm", "ec", ecE ? fmtTime(ecE.time) : "", 0) +
    statTile("آخر قراءة pH", phv, "", "ph", phE ? fmtTime(phE.time) : "") +
    statTile("حرارة ماء المحلول", wtE ? num(wtE.v.wt) : null, "°C", "wt", wtE ? fmtTime(wtE.time) : "") +
    statTile("حرارة الجو (متوسط)", airE ? metric(airE.v, "air") : null, "°C", "air", airE ? fmtTime(airE.time) : "") +
    statTile("متوسط الضوء", lE ? metric(lE.v, "lux") : null, "lux", "lux", lE ? fmtTime(lE.time) : "", 0);
  if (sec === "n") { var irr = SE.filter(function (e) { return e.type === "irr"; }); h += '<div class="stat"><span class="lab">الري</span><span class="val num">' + irr.length + ' <small>رية</small></span><span class="sub">' + f(sum(irr.map(function (e) { return num(e.v.liters); })), 1) + " لتر محلول</span></div>"; }
  else { var tk = tankState(); h += '<div class="stat"><span class="lab">خزان الأبراج</span><span class="val num">' + (tk && tk.vol != null ? f(tk.vol) : "—") + ' <small>لتر</small></span><span class="sub">' + (tk ? (tk.date === todayStr() ? "" : fmtShort(tk.date) + " ") + fmtTime(tk.time) : "لا توجد بيانات") + "</span></div>"; }
  h += "</div></section>";
  if (sec === "t") h += zoneCard(SE);
  if (sec === "n") h += sowCard();
  var bad = badReadings(SE);
  if (bad.length) h += '<section class="sec"><div class="card" style="border-color:var(--bad)"><h3 style="color:var(--bad)">قراءات خارج الحدود (' + bad.length + ')</h3><ul style="margin:8px 0 0;padding-right:18px;font-size:13.5px">' + bad.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul></div></section>";
  h += '<section class="sec"><div class="sec-h"><h2>مهام اليوم · ' + SECS[sec].name + '</h2></div><div class="card chk">';
  TASKS[sec].forEach(function (x) {
    var need = num(cfg(x[1], sec)) || 0, done = SE.filter(function (e) { return e.type === x[0]; }).length, p = need ? Math.min(100, done / need * 100) : 100;
    if (!need && !done) return;
    h += '<div class="chk-row"><span>' + typeDef(x[0], sec).label + '</span><span class="num" style="font-size:13px">' + done + " / " + need + '</span><div class="bar"><i class="' + (p >= 100 ? "full" : "") + '" style="width:' + p + '%"></i></div></div>';
  });
  h += "</div></section>";
  h += equipCard();
  h += '<section class="sec"><button class="btn block" type="button" data-act="gallery">' + ico("gallery", 18) + "&nbsp; صور النمو · " + SECS[sec].name + "</button></section>";
  var so = signoffOf(sec), pend = SE.filter(function (e) { return !e.review; }).length, flags = SE.filter(function (e) { return e.review && e.review.s === "flag"; }).length;
  if (so) h += '<section class="sec"><div class="banner ok">' + ico("sup", 20) + "<span>اعتمد " + esc(nameOf(so.by)) + " سجل " + SECS[sec].name + " لهذا اليوم" + (so.at ? " الساعة " + tsTime(so.at) : "") + "</span></div></section>";
  else if (SE.length) h += '<section class="sec"><div class="banner ' + (pend ? "warn" : "n") + '"><span style="flex:1">مراجعة المشرف: <b>' + pend + "</b> بانتظار المراجعة" + (flags ? " · <b>" + flags + "</b> عليها ملاحظة" : "") + "</span>" + (isSup() ? '<button class="btn sm pri" data-act="signoff">اعتماد ' + SECS[sec].name + "</button>" : "") + "</div></section>";
  var on = S.openNotes.filter(function (e) { return secOf(e) === sec; });
  if (on.length) h += '<section class="sec"><div class="sec-h"><h2>ملاحظات مفتوحة على النبات</h2><span class="pill warn">' + on.length + '</span></div><div class="list">' + on.sort(function (a, b) { return b.ts - a.ts; }).slice(0, 8).map(function (e) { return entryCard(e, true); }).join("") + "</div></section>";
  h += '<section class="sec"><div class="sec-h"><h2>سجل ' + (isToday ? "اليوم" : "اليوم المحدد") + " · " + SECS[sec].name + '</h2><span class="muted num" style="font-size:13px">' + E.length + "</span></div>";
  if (!E.length) h += '<div class="empty">لا توجد تسجيلات في ' + SECS[sec].name + " لهذا اليوم بعد." + (canAdd() ? '<button class="btn pri" data-act="goTab" data-t="add">سجّل أول قراءة</button>' : "") + "</div>";
  else h += '<div class="list">' + E.slice().reverse().map(function (e) { return entryCard(e); }).join("") + "</div>";
  return h + "</section>";
}
function tankState() {
  var e = lastOf(S.hist, function (r) { return secOf(r) === "t"; }); if (!e) return null; var v = e.v || {};
  var vol = e.type === "refill" ? (lvlToL(num(v.level1)) || ((lvlToL(num(v.level0)) || 0) + (num(v.waterAdd) || 0) - (num(v.drained) || 0))) : num(v.water);
  return { vol: vol, ec: ec25(num(v.ec), num(v.wt)), ph: ph25(num(v.ph), num(v.wt)), date: e.date, time: e.time };
}
function zoneCard(SE) {
  var te = lastOf(SE, function (e) { return e.type === "temp" && metric(e.v, "air") != null; }), le = lastOf(SE, function (e) { return e.type === "light" && metric(e.v, "lux") != null; });
  if (!te && !le) return "";
  var row = function (lab, e, m, dec) {
    if (!e) return "";
    return "<tr><td>" + lab + "</td>" + ZONES.map(function (z, zi) { var v = zoneAvg(e.v, m, zi); return '<td class="' + (isBad(chk(m, v)) ? "bad" : "") + '">' + f(v, dec) + "</td>"; }).join("") + "<td><b>" + f(metric(e.v, m), dec) + "</b></td></tr>";
  };
  return '<section class="sec"><div class="card"><div class="sec-h"><h3>متوسط المناطق (آخر قياس)</h3></div><div class="tbl-wrap" style="border:0;margin-top:6px"><table class="minitable"><thead><tr><th></th>' + ZONES.map(function (z) { return "<th>" + z + "</th>"; }).join("") + "<th>البيت</th></tr></thead><tbody>" +
    row("حرارة °C", te, "air", 1) + row("رطوبة %", te, "rh", 0) + row("ضوء lux", le, "lux", 0) + '</tbody></table></div><p class="help" style="margin:6px 0 0">' + esc(cfg("zoneNote", "t")) + "</p></div></section>";
}
function sowBatches() { return S.meta.filter(function (e) { return e.type === "sow"; }); }
function transplanted(id) { return sum(S.meta.filter(function (e) { return e.type === "xplant" && e.v && e.v.batch === id; }).map(function (e) { return num(e.v.count); })); }
function sowCard() {
  var m = S.date.slice(0, 7), cap = num(cfg("capacity")) || 0, sow = sowBatches().filter(function (e) { return (e.date || "").slice(0, 7) === m; });
  var seeds = sum(sow.map(function (e) { return num(e.v.seeds); })), d = new Date(S.date + "T12:00:00"), last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), left = last - d.getDate() + 1;
  var rem = Math.max(0, cap - seeds), perDay = left ? rem / left : 0, p = cap ? Math.min(100, seeds / cap * 100) : 0;
  var ready = sowBatches().filter(function (e) { var age = daysBetween(e.date, todayStr()); return age >= num(cfg("daysToTransplant")) && transplanted(e.id) < (num(e.v.seeds) || 0) && age < 60; });
  return '<section class="sec"><div class="card"><div class="sec-h"><h3>الزراعة في ' + fmtDate(S.date, { month: "long" }) + '</h3><button class="btn sm" data-act="sowPlan">جدول الزراعة</button></div>' +
    '<div style="margin-top:8px" class="num"><b style="font-size:20px">' + f(seeds) + "</b> / " + f(cap) + ' <span class="muted">بذرة</span></div><div class="bar" style="margin:6px 0"><i class="' + (p >= 100 ? "full" : "") + '" style="width:' + p + '%"></i></div>' +
    '<div class="help">' + (rem ? "المتبقي " + f(rem) + " · يلزم تقريباً <b>" + f(Math.ceil(perDay)) + "</b> بذرة يومياً لبقية الشهر (" + left + " يوم)" : "تم الوصول للطاقة الإنتاجية لهذا الشهر ✓") + (ready.length ? '<br><b style="color:var(--warn)">' + ready.length + " دفعة جاهزة للنقل إلى الأبراج</b>" : "") + "</div></div></section>";
}

/* ---------- equipment ---------- */
function lastBatt() { return lastOf(S.meta, function (e) { return e.type === "batt"; }); }
function lastCal() { return lastOf(S.meta, function (e) { return e.type === "cal"; }); }
function battInfo() {
  var b = lastBatt(), now = Date.now();
  if (!b) return { state: "none" };
  if (!b.v || !b.v.end) return { state: "charging", b: b, h: (now - (b.v && b.v.start || b.ts)) / 36e5 };
  return { state: "idle", b: b, h: (now - b.v.end) / 36e5 };
}
function equipAlerts() {
  var out = [], bi = battInfo(), lim = num(cfg("battHours")), mx = num(cfg("battMaxCharge"));
  if (bi.state === "none") out.push('<div class="alert warn">' + ico("batt", 20) + '<span class="tx">لم يُسجَّل شحن لبطارية مضخة الري بعد.</span>' + (canAdd() ? '<button class="btn sm" data-act="battStart">بدء الشحن</button>' : "") + "</div>");
  else if (bi.state === "idle" && bi.h > lim) out.push('<div class="alert bad">' + ico("batt", 20) + '<span class="tx"><b>تأخر شحن بطارية المضخة:</b> آخر شحن انتهى قبل ' + fmtAgo(bi.h) + ".</span>" + (canAdd() ? '<button class="btn sm pri" data-act="battStart">بدء الشحن</button>' : "") + "</div>");
  else if (bi.state === "charging" && bi.h > mx) out.push('<div class="alert warn">' + ico("batt", 20) + '<span class="tx"><b>البطارية على الشاحن منذ ' + fmtAgo(bi.h) + "</b>. افصل الشاحن إذا اكتمل الشحن.</span>" + (canAdd() ? '<button class="btn sm pri" data-act="battEnd" data-id="' + bi.b.id + '">انتهى الشحن</button>' : "") + "</div>");
  var c = lastCal(), cd = num(cfg("calDays"));
  if (!c) out.push('<div class="alert warn">' + ico("cal", 20) + '<span class="tx">لم تُسجَّل معايرة لجهاز القياس بعد.</span>' + (canAdd() ? '<button class="btn sm" data-act="new" data-type="cal">تسجيل معايرة</button>' : "") + "</div>");
  else { var dd = daysBetween(c.date, todayStr()); if (dd >= cd) out.push('<div class="alert warn">' + ico("cal", 20) + '<span class="tx"><b>حان موعد معايرة جهاز القياس:</b> آخر معايرة قبل ' + dd + " يوم.</span>" + (canAdd() ? '<button class="btn sm" data-act="new" data-type="cal">تسجيل معايرة</button>' : "") + "</div>"); }
  var st = computeStock();
  ["A", "B"].forEach(function (tk) { var o = st[tk]; if (o && o.pct < 15) out.push('<div class="alert warn"><span class="tx"><b>عبوة ' + tk + " المركزة قاربت على النفاد:</b> المتبقي تقريباً " + f(Math.max(0, o.left)) + " مل.</span></div>"); });
  return out;
}
function equipCard() {
  var bi = battInfo(), c = lastCal(), h = '<section class="sec"><div class="card"><h3>المعدات</h3>', bt, bb;
  if (bi.state === "none") bt = "لا يوجد شحن مسجل";
  else if (bi.state === "charging") bt = "جارٍ الشحن منذ " + fmtAgo(bi.h) + " (بدأ " + tsTime(bi.b.v.start || bi.b.ts) + ")";
  else bt = "آخر شحن انتهى قبل " + fmtAgo(bi.h) + " (" + tsTime(bi.b.v.end) + ")";
  bb = bi.state === "charging" ? '<button class="btn sm pri" data-act="battEnd" data-id="' + bi.b.id + '">انتهى الشحن</button>' : '<button class="btn sm" data-act="battStart">بدء الشحن</button>';
  h += '<div class="eq-row"><span class="e-ic">' + ico("batt", 19) + '</span><span class="tx"><b>بطارية مضخة الري</b><span>' + bt + " · التذكير بعد " + f(num(cfg("battHours"))) + " ساعة</span></span>" + (canAdd() ? bb : "") + "</div>";
  var ct = c ? "آخر معايرة: " + fmtShort(c.date) + " (قبل " + daysBetween(c.date, todayStr()) + " يوم) · " + esc(c.v && c.v.result || "") : "لا توجد معايرة مسجلة";
  h += '<div class="eq-row"><span class="e-ic">' + ico("cal", 19) + '</span><span class="tx"><b>معايرة جهاز EC/pH</b><span>' + ct + " · كل " + f(num(cfg("calDays"))) + " يوم</span></span>" + (canAdd() ? '<button class="btn sm" data-act="new" data-type="cal">تسجيل معايرة</button>' : "") + "</div>";
  return h + "</div></section>";
}

/* ---------- entry cards ---------- */
function summaryChips(e) {
  var sec = secOf(e), T = typeDef(e.type, sec); if (!T) return "";
  var v = e.v || {}, out = "", seen = {};
  T.fields.forEach(function (fd) {
    if (["time", "memo", "text", "action", "crop", "batch", "lot", "endTime"].indexOf(fd.k) >= 0) return;
    if (fd.show && !fd.show(v)) return;
    if (fd.t === "grid") {
      var vals = gridKeys(fd.k).map(function (k) { return num(v[k]); }); if (vals.every(function (x) { return x == null; })) return;
      var anyBad = vals.some(function (x) { return isBad(chk(fd.c, x, sec)); }), dec = fd.c === "lux" ? 0 : 1;
      out += '<span class="chip ' + (anyBad ? "bad" : "") + '"><span class="k">' + fd.l + '</span>متوسط <b class="num">' + f(metric(v, fd.k), dec) + "</b> " + fd.u + ' <span class="k">· ' + ZONES.map(function (z, zi) { return z + " " + f(zoneAvg(v, fd.k, zi), dec); }).join(" · ") + "</span></span>";
      return;
    }
    if (fd.pg) {
      if (seen[fd.pg]) return; seen[fd.pg] = 1;
      var vs = NK[fd.pg].map(function (k) { return num(v[k]); }); if (vs.every(function (x) { return x == null; })) return;
      var b2 = vs.some(function (x) { return isBad(chk(fd.c, x, sec)); }), d2 = fd.c === "lux" ? 0 : 1;
      out += '<span class="chip ' + (b2 ? "bad" : "") + '"><span class="k">' + MNAME[fd.pg] + ' (ب/و/ن)</span><span class="num">' + vs.map(function (x) { return f(x, d2); }).join(" · ") + "</span> " + fd.u + ' <span class="k">· متوسط ' + f(avg(vs), d2) + "</span></span>";
      return;
    }
    var raw = v[fd.k]; if (raw === "" || raw == null) return;
    if (fd.t === "s" || fd.t === "x") { out += '<span class="chip"><span class="k">' + fd.l + "</span>" + esc(raw) + "</span>"; return; }
    if (fd.t !== "n") return;
    var n = num(raw), cv = compVal(fd, raw, v), st = chk(fd.c, cv, sec), dec = fd.c === "ph" || fd.comp === "ph" ? 2 : 1;
    var extra = (fd.comp && cv != null && Math.abs(cv - n) > (fd.comp === "ph" ? 0.005 : 1)) ? ' <span class="k">(≈' + f(cv, fd.comp === "ph" ? 2 : 0) + " عند 25°)</span>" : "";
    out += '<span class="chip ' + (isBad(st) ? "bad" : "") + '"><span class="k">' + fd.l + '</span><span class="num">' + f(n, dec) + "</span>" + (unitOf(fd) && unitOf(fd) !== "pH" ? " " + unitOf(fd) : "") + extra + "</span>";
  });
  if (e.type === "temp" && num(v.wt) != null) out += '<span class="chip"><span class="k">حرارة الماء</span><span class="num">' + f(num(v.wt), 1) + "</span> °C</span>";
  if (v.batch) { var b = sowBatches().filter(function (x) { return x.id === v.batch; })[0]; if (b) out += '<span class="chip"><span class="k">الدفعة</span>' + esc(b.v.crop) + " · " + fmtShort(b.date) + ' <span class="k">(عمر ' + daysBetween(b.date, e.date) + " يوم)</span></span>"; }
  if (e.type === "sow") out += '<span class="chip"><span class="k">النقل المتوقع</span>' + fmtShort(addDays(e.date, num(cfg("daysToTransplant")))) + "</span>";
  if (e.type === "batt") { out += '<span class="chip"><span class="k">بدء الشحن</span>' + tsTime(v.start || e.ts) + "</span>" + (v.end ? '<span class="chip"><span class="k">انتهاء الشحن</span>' + tsTime(v.end) + ' <span class="k">(' + f((v.end - (v.start || e.ts)) / 36e5, 1) + " ساعة)</span></span>" : '<span class="chip bad">جارٍ الشحن</span>'); }
  return out;
}
function canEditEntry(e) { return isSup() || (isWorker() && e.by === S.uid && !e.review && (e.date === todayStr() || e.type === "batt")); }
function entryCard(e, showDate) {
  var sec = secOf(e), T = typeDef(e.type, sec) || { label: e.type }, v = e.v || {}, txt = [];
  if (e.type === "sow" || e.type === "harvest") { if (v.crop) txt.push(v.crop + (v.lot ? " · " + v.lot : "")); }
  else if (v.crop) txt.push((sec === "t" ? "الصنف / البرج: " : "الصنف: ") + v.crop);
  if (v.memo) txt.push(v.memo); if (v.text) txt.push(v.text); if (v.action) txt.push("الإجراء: " + v.action);
  var rev = e.review, foot = '<span class="muted" style="font-size:12.5px">' + esc(nameOf(e.by)) + "</span>";
  foot += rev ? (rev.s === "ok" ? '<span class="pill ok">✓ تمت المراجعة</span>' : '<span class="pill warn">⚑ ملاحظة المشرف</span>') : '<span class="pill n">بانتظار المراجعة</span>';
  if (e.type === "note") foot += e.open ? '<span class="pill bad">مفتوحة</span>' : '<span class="pill ok">تم الحل</span>';
  foot += '<span class="sp"></span>';
  if (isSup()) {
    if (!rev || rev.s !== "ok") foot += '<button class="btn sm ok" data-act="approve" data-id="' + e.id + '">اعتماد</button>';
    foot += '<button class="btn sm warn" data-act="flag" data-id="' + e.id + '">ملاحظة</button>';
    if (e.type === "note") foot += '<button class="btn sm" data-act="toggleNote" data-id="' + e.id + '">' + (e.open ? "تم الحل" : "إعادة فتح") + "</button>";
  }
  if (canEditEntry(e) && SHARED.indexOf(e.type) >= 0 && sec !== "g") { var os = sec === "n" ? "t" : "n"; foot += '<button class="btn sm ghost" data-act="move" data-id="' + e.id + '">نقل إلى ' + SECS[os].name + "</button>"; }
  if (canEditEntry(e)) foot += '<button class="btn sm ghost" data-act="edit" data-id="' + e.id + '">تعديل</button>';
  var chips = summaryChips(e), img = e.thumb ? '<img class="e-thumb" alt="صورة" src="' + e.thumb + '" data-act="lightbox" data-pid="' + esc(e.photo || "") + '">' : (e.photo ? '<img class="e-photo" alt="صورة" data-photo="' + esc(e.photo) + '">' : "");
  return '<article class="entry ' + (rev && rev.s === "flag" ? "flag" : "") + '"><div class="e-head"><span class="e-ic">' + ico(e.type, 19) + '</span><div class="e-t"><b>' + esc(T.label) + "</b><span>" + (showDate ? esc(fmtShort(e.date)) + " · " : "") + fmtTime(e.time) + "</span></div>" + (sec === "g" ? secTag("g") : "") + "</div>" +
    (chips ? '<div class="chips">' + chips + "</div>" : "") + (txt.length ? '<div class="e-text">' + esc(txt.join("\n")) + "</div>" : "") + img +
    (rev && rev.c ? '<div class="rev-note"><b>' + esc(nameOf(rev.by)) + ":</b> " + esc(rev.c) + "</div>" : "") + '<div class="e-foot">' + foot + "</div></article>";
}
function loadPhotos(root) {
  (root || document).querySelectorAll("img[data-photo]").forEach(function (img) {
    var id = img.getAttribute("data-photo"); if (!id) return;
    if (S.photos[id]) { img.src = S.photos[id]; return; }
    S.db.collection("photos").doc(id).get().then(function (s) { if (s.exists) { S.photos[id] = s.data().data; img.src = S.photos[id]; } }).catch(function () {});
  });
}

/* ---------- add ---------- */
function addView() {
  var sec = S.sec;
  if (S.date !== todayStr() && !isSup()) return '<div class="sec"><div class="empty">التسجيل متاح لليوم الحالي فقط.<button class="btn pri" data-act="gotoday">الانتقال إلى اليوم</button></div></div>';
  var h = '<section class="sec"><div class="sec-h"><h2>تسجيل جديد · ' + SECS[sec].icon + " " + SECS[sec].name + '</h2><span class="muted" style="font-size:13px">' + (S.date === todayStr() ? "لليوم" : "للتاريخ " + esc(S.date)) + "</span></div>";
  h += '<button class="tile" style="min-height:0;flex-direction:row;align-items:center;width:100%;border-color:var(--accent-2)" data-act="calc"><span class="e-ic">' + ico("calc", 22) + '</span><span style="margin:0 12px 0 0;display:flex;flex-direction:column;align-items:flex-start"><b style="color:var(--ink)">حاسبة المحلول · ' + SECS[sec].name + "</b><span>" + (sec === "t" ? "تعويض الخزان أو تجهيز خزان جديد (نظام مغلق)" : "خلطة جديدة حسب الجرعة أو الأملاح المستهدفة (نظام مفتوح)") + "</span></span></button>";
  h += '<div class="tiles">' + ORDER[sec].map(function (t) {
    var T = typeDef(t, sec), n = secEntries(S.entries, sec).filter(function (e) { return e.type === t; }), l = n[n.length - 1];
    return '<button class="tile" data-act="new" data-type="' + t + '"><span class="e-ic">' + ico(t, 22) + "</span><b>" + T.label + "</b><span>" + T.desc + "</span><em>" + (n.length ? n.length + " اليوم · آخرها " + fmtTime(l.time) : "لم يُسجّل اليوم") + "</em></button>";
  }).join("") + "</div></section>";
  return h + '<p class="muted" style="font-size:13px">الحدود المستهدفة لـ' + SECS[sec].name + ": الأملاح " + rangeTxt("ec") + " µS/cm · pH " + rangeTxt("ph") + " · حرارة الماء " + rangeTxt("wt") + " °C · حرارة الجو " + rangeTxt("air") + " °C</p>";
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
  var list = sowBatches().filter(function (e) { return daysBetween(e.date, todayStr()) <= 90 || e.id === val; }).slice().reverse();
  return '<option value="">—</option>' + list.map(function (e) { return '<option value="' + e.id + '"' + (e.id === val ? " selected" : "") + ">" + esc(fmtShort(e.date) + " · " + (e.v.crop || "") + " · " + f(num(e.v.seeds)) + " بذرة · عمر " + daysBetween(e.date, todayStr()) + " يوم") + "</option>"; }).join("");
}
function gridHTML(fd, v) {
  var h = '<div class="g3wrap" id="w_' + fd.k + '"><div class="grp-h" style="margin:0">' + fd.l + " (" + fd.u + ")</div>" +
    '<div class="tbl-wrap" style="border:0;background:none"><table class="g3"><thead><tr><th class="zh"></th>' + LEVELS.map(function (l) { return "<th>" + l + "</th>"; }).join("") + "<th>المتوسط</th></tr></thead><tbody>";
  ZK.forEach(function (z, zi) {
    h += '<tr><th class="zh">' + ZONES[zi] + "</th>" + [1, 2, 3].map(function (l) { var k = fd.k + "_" + z + l; return '<td><input class="in num gin" inputmode="decimal" autocomplete="off" id="f_' + k + '" aria-label="' + ZONES[zi] + " " + LEVELS[l - 1] + '" value="' + esc(v[k] == null ? "" : v[k]) + '"></td>'; }).join("") + '<td class="avg" id="avg_' + fd.k + "_" + z + '">—</td></tr>';
  });
  return h + '</tbody><tfoot><tr><td colspan="5" id="avgall_' + fd.k + '"></td></tr></tfoot></table></div><span class="hint" id="h_' + fd.k + '">المستهدف ' + rangeTxt(fd.c, FORM.vsec) + "</span></div>";
}
function fieldHTML(fd, v) {
  if (fd.t === "grid") return gridHTML(fd, v);
  var id = "f_" + fd.k, val = v[fd.k], inp, out = "";
  if (val == null) val = fd.def ? cfg(fd.def, FORM.vsec) : "";
  if (fd.grp) out += '<div class="grp-h">' + fd.grp + "</div>";
  if (fd.zn) { var zn = cfg("zoneNote", FORM.vsec); if (zn) out += '<div class="zone-note">' + esc(zn) + "</div>"; }
  if (fd.t === "s") inp = '<select class="in" id="' + id + '"><option value="">—</option>' + fd.o.map(function (o) { return "<option" + (o === val ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select>";
  else if (fd.t === "batch") inp = '<select class="in" id="' + id + '">' + batchOptions(val) + "</select>";
  else if (fd.t === "ta") inp = '<textarea class="in" id="' + id + '">' + esc(val) + "</textarea>";
  else if (fd.t === "t") inp = (fd.opt && !val ? '<span class="muted" style="font-size:12.5px"><input type="checkbox" id="on_' + fd.k + '"> تسجيل هذا الوقت</span>' : "") + timePicker(id, val || (fd.k === "time" && FORM.e ? FORM.e.time : ""));
  else if (fd.t === "x") inp = '<input class="in" id="' + id + '" value="' + esc(val) + '"' + (fd.list ? ' list="dl_' + fd.list + '"' : "") + (fd.ph ? ' placeholder="' + esc(fd.ph) + '"' : "") + ">";
  else inp = '<div class="unitwrap"><input class="in num" id="' + id + '" inputmode="decimal" autocomplete="off" value="' + esc(val) + '"><span class="u">' + unitOf(fd) + "</span></div>";
  out += '<label class="f ' + (fd.w || "") + '" id="w_' + fd.k + '" for="' + id + '"><span>' + fd.l + (fd.req ? ' <span class="req">*</span>' : "") + "</span>" + inp + (fd.c || fd.comp ? '<span class="hint" id="h_' + fd.k + '"></span>' : "") + "</label>";
  return out;
}
function openForm(type, e, prefill) {
  var sec = e ? secOf(e) : (TYPES_G[type] ? "g" : S.sec), vsec = sec === "g" ? S.sec : sec, T = typeDef(type, vsec);
  FORM = { type: type, e: e, sec: sec, vsec: vsec, photo: null, modeTouched: !!e };
  var v = e ? clone(e.v || {}) : (prefill || {});
  if (type === "batt" && e) { if (v.start) v.time = tsHM(v.start); if (v.end) v.endTime = tsHM(v.end); }
  var h = '<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(T.label) + '">' + sheetHead(T.label, sec, type) + '<form id="entryForm" class="fgrid" novalidate>';
  if (vsec === "t" && T.fields.some(function (x) { return x.t === "grid"; })) { var zn = cfg("zoneNote", "t"); if (zn) h += '<div class="zone-note" style="margin:0">' + esc(zn) + "</div>"; }
  T.fields.forEach(function (fd) { h += fieldHTML(fd, v); });
  if (T.photo) h += '<div class="f full"><span>الصورة' + (T.photo === "req" ? ' <span class="req">*</span>' : " (اختياري)") + '</span><div class="photo-btns"><label class="btn" for="f_cam">📷 فتح الكاميرا</label><label class="btn" for="f_gal">🖼️ من المعرض</label></div>' +
    '<input type="file" accept="image/*" capture="environment" id="f_cam" class="photo-in" hidden><input type="file" accept="image/*" id="f_gal" class="photo-in" hidden>' +
    '<img class="photo-prev" id="f_prev" alt="" ' + (e && (e.thumb || e.photo) ? (e.thumb ? 'src="' + e.thumb + '"' : 'data-photo="' + esc(e.photo) + '"') : "hidden") + "></div>";
  if (type === "mix") h += '<div class="full help" id="mixHint"></div>';
  h += '<datalist id="dl_crops">' + uniqueCrops().map(function (c) { return '<option value="' + esc(c) + '">'; }).join("") + "</datalist>";
  h += '</form><div class="sheet-actions">' + (e ? '<button class="btn danger" type="button" data-act="del" data-id="' + e.id + '">حذف</button>' : "") + '<button class="btn pri" type="button" data-act="save">' + (sec === "g" ? "حفظ" : "حفظ في " + SECS[sec].name) + "</button></div></div></div>";
  openSheet(h);
  var form = $("entryForm");
  form.addEventListener("input", updForm); form.addEventListener("change", updForm);
  form.addEventListener("submit", function (ev) { ev.preventDefault(); });
  var md = $("f_mode"); if (md) md.addEventListener("change", function () { if (FORM) FORM.modeTouched = true; });
  document.querySelectorAll(".photo-in").forEach(function (inp) { inp.addEventListener("change", onPhotoPick); });
  updForm(); loadPhotos($("sheetRoot"));
}
function uniqueCrops() { var s = {}; S.meta.forEach(function (e) { if (e.v && e.v.crop) s[e.v.crop] = 1; }); return Object.keys(s); }
function onPhotoPick(ev) {
  var file = ev.target.files && ev.target.files[0]; if (!file || !FORM) return;
  var pv = $("f_prev"); pv.hidden = false; pv.style.opacity = .4;
  shrink(file).then(function (r) { if (!FORM || !r.full) { if (pv) pv.style.opacity = 1; return; } FORM.photo = r; pv.src = r.thumb; pv.removeAttribute("data-photo"); pv.style.opacity = 1; });
}
function formValues() {
  var v = {}, T = typeDef(FORM.type, FORM.vsec);
  T.fields.forEach(function (fd) {
    if (fd.t === "grid") { gridKeys(fd.k).forEach(function (k) { var el = $("f_" + k); v[k] = el ? el.value.trim() : ""; }); return; }
    if (fd.t === "t") { var on = $("on_" + fd.k); v[fd.k] = on && !on.checked ? "" : readTime("f_" + fd.k); return; }
    var el = $("f_" + fd.k); v[fd.k] = el ? el.value.trim() : "";
  });
  return v;
}
function refillSuggest(v, sec) {
  var e0 = ec25(num(v.ec0), num(v.wt)); if (e0 == null) return null;
  if (e0 > num(cfg("ecMax", sec))) return REFILL_MODES[0];
  if (e0 < num(cfg("ecMin", sec))) return REFILL_MODES[2];
  return REFILL_MODES[1];
}
function updForm() {
  if (!FORM) return;
  var v = formValues(), T = typeDef(FORM.type, FORM.vsec), sec = FORM.vsec;
  if (FORM.type === "refill" && !FORM.modeTouched) { var sg = refillSuggest(v, sec); if (sg && $("f_mode")) { $("f_mode").value = sg; v.mode = sg; } }
  T.fields.forEach(function (fd) {
    if (fd.show) $("w_" + fd.k).hidden = !fd.show(v);
    if (fd.t === "grid") {
      var dec = fd.c === "lux" ? 0 : 1;
      ZK.forEach(function (z) { var vals = [1, 2, 3].map(function (l) { var el = $("f_" + fd.k + "_" + z + l), n = num(el.value); el.classList.toggle("bad", isBad(chk(fd.c, n, sec))); return n; }); $("avg_" + fd.k + "_" + z).textContent = f(avg(vals), dec); });
      var all = avg(gridKeys(fd.k).map(function (k) { return num(v[k]); }));
      $("avgall_" + fd.k).textContent = all == null ? "" : "متوسط البيت " + f(all, dec) + " · " + LEVELS.map(function (l, i) { return l + " " + f(levelAvg(v, fd.k, i), dec); }).join(" / ");
      return;
    }
    var el = $("h_" + fd.k); if (!el) return;
    var n = num(v[fd.k]), cv = compVal(fd, v[fd.k], v), st = chk(fd.c, cv, sec), tag = "";
    if (fd.comp && n != null && cv != null && !cfg("atc") && num(v.wt) != null) tag = "≈" + f(cv, fd.comp === "ph" ? 2 : 0) + " عند 25°";
    el.className = "hint " + (fd.c ? (st || "") : "");
    if (!fd.c) { el.textContent = tag; return; }
    if (fd.w === "third") { el.textContent = n == null ? "" : st === "ok" ? "✓" : (st === "lo" ? "منخفض" : "مرتفع"); return; }
    el.textContent = (n == null ? "المستهدف " + rangeTxt(fd.c, sec) : st === "ok" ? "✓ ضمن المستهدف " + rangeTxt(fd.c, sec) : (st === "lo" ? "أقل" : "أعلى") + " من المستهدف " + rangeTxt(fd.c, sec)) + (tag ? " · " + tag : "");
  });
  if (FORM.type === "mix") { var w = num(v.water), a = num(v.mlA), b = num(v.mlB), mh = $("mixHint"); if (mh) mh.textContent = w && (a || b) ? "المعدل: A " + f(a / w, 2) + " مل/لتر · B " + f(b / w, 2) + " مل/لتر" + (a ? " · الجرعة ≈ " + Math.round(a / w / num(formula().fullA) * 100) + "% من الجرعة الكاملة" : "") : ""; }
}
function needOneOk(T, v) {
  if (!T.needOne) return true;
  return T.needOne.some(function (k) { var keys = (k === "air" || k === "rh" || k === "lux") ? gridKeys(k) : [k]; return keys.some(function (kk) { return num(v[kk]) != null; }); });
}
function saveForm(btn) {
  var type = FORM.type, e = FORM.e, T = typeDef(type, FORM.vsec), raw = formValues(), v = {}, miss = [];
  T.fields.forEach(function (fd) {
    if (fd.t === "grid") { gridKeys(fd.k).forEach(function (k) { var x = raw[k]; if (x === "") { v[k] = ""; return; } var n = num(x); if (n == null) miss.push(fd.l + " (رقم غير صحيح)"); else v[k] = n; }); return; }
    var x = raw[fd.k];
    if (fd.show && !fd.show(raw)) { v[fd.k] = ""; return; }
    if (fd.t === "n" && x !== "") { var n = num(x); if (n == null) { miss.push(fd.l + " (رقم غير صحيح)"); return; } x = n; }
    if (fd.req && (x === "" || x == null)) miss.push((fd.pg ? MNAME[fd.pg] + " " : "") + fd.l);
    v[fd.k] = x;
  });
  if (!needOneOk(T, v)) miss.push("قراءة واحدة على الأقل");
  if (T.photo === "req" && !FORM.photo && !(e && e.photo)) miss.push("الصورة");
  if (miss.length) { toast("أكمل: " + miss.join("، ")); return; }
  btn.disabled = true; btn.textContent = "جارٍ الحفظ…";
  var ops = [], photoId = e && e.photo || null, thumb = e && e.thumb || null;
  if (FORM.photo) { var pref = S.db.collection("photos").doc(); photoId = pref.id; thumb = FORM.photo.thumb; ops.push(pref.set({ data: FORM.photo.full, by: S.uid, ts: Date.now(), sec: FORM.sec })); S.photos[photoId] = FORM.photo.full; }
  var date = e ? e.date : S.date;
  if (type === "batt") { v.start = hmToTs(date, v.time); v.end = v.endTime ? hmToTs(date, v.endTime, v.start) : null; delete v.endTime; }
  if (e) { var up = { v: v, time: v.time }; if (photoId) { up.photo = photoId; up.thumb = thumb; } ops.push(S.db.collection("entries").doc(e.id).update(up)); }
  else {
    var d = { type: type, sec: FORM.sec, date: date, time: v.time, ts: Date.now(), by: S.uid, v: v };
    if (photoId) { d.photo = photoId; d.thumb = thumb; } if (type === "note") d.open = true;
    ops.push(S.db.collection("entries").doc().set(d));
  }
  Promise.all(ops).catch(function (err) { console.warn(err); toast("لم يُحفظ التسجيل: " + errMsg(err)); });
  var where = FORM.sec === "g" ? "" : " في " + SECS[FORM.sec].name;
  closeSheet();
  toast(navigator.onLine ? "تم الحفظ" + where : "حُفظ في الجوال وسيُرسل عند رجوع الإنترنت");
}
function hmToTs(date, hm, after) { var d = new Date(date + "T" + hm + ":00").getTime(); if (after && d < after) d += 864e5; return d; }
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
    '<label class="f c-ref" for="c_level">مستوى الماء الآن<div class="unitwrap"><input class="in num" id="c_level" inputmode="decimal"><span class="u">' + lvlUnit() + "</span></div></label>" +
    '<label class="f c-ref" for="c_vol">الحجم بعد التعويض<div class="unitwrap"><input class="in num" id="c_vol" inputmode="decimal" value="' + esc(cfg("tankL", "t")) + '"><span class="u">لتر</span></div><span class="hint">سعة الخزان ' + f(num(cfg("tankL", "t"))) + " لتر</span></label>" +
    '<label class="f c-ref full" for="c_ecCur">أملاح الخزان الآن<div class="unitwrap"><input class="in num" id="c_ecCur" inputmode="decimal"><span class="u">µS/cm</span></div><span class="hint" id="hc_ecCur"></span></label>';
  h += '<div class="grp-h c-fresh">الماء</div><label class="f c-fresh full" for="c_water">كمية الماء<div class="unitwrap"><input class="in num" id="c_water" inputmode="decimal" value="' + esc(cfg("tankL", sec)) + '"><span class="u">لتر</span></div></label>';
  h += '<label class="f" for="c_raw">أملاح ماء المصدر<div class="unitwrap"><input class="in num" id="c_raw" inputmode="decimal" value="' + esc(lastRaw()) + '"><span class="u">µS/cm</span></div><span class="hint" id="hc_raw"></span></label>' +
    '<label class="f" for="c_wt">حرارة الماء<div class="unitwrap"><input class="in num" id="c_wt" inputmode="decimal" value="' + esc(lastWt()) + '"><span class="u">°C</span></div></label>';
  h += '<div class="grp-h">الهدف</div><div class="full c-fresh"><div class="stagebar" id="c_stages"><button type="button" data-act="cstage" data-s="ec" aria-pressed="true">حسب الأملاح<b>المستهدفة</b></button>' + STAGES.map(function (s) { return '<button type="button" data-act="cstage" data-s="' + s[0] + '" aria-pressed="false">' + s[1] + "<b>" + fml(num(F.fullA) * s[0]) + " مل/لتر</b></button>"; }).join("") + "</div></div>";
  h += '<label class="f full" for="c_target" id="w_c_target">الأملاح المستهدفة (عند 25°)<div class="unitwrap"><input class="in num" id="c_target" inputmode="decimal" value="' + esc(cfg("ecTarget", sec)) + '"><span class="u">µS/cm</span></div><span class="hint">الحدود لـ' + SECS[sec].name + ": " + rangeTxt("ec", sec) + "</span></label>";
  h += '</form><div id="calcOut" style="margin-top:14px"></div>';
  h += '<div class="card" style="margin-top:12px"><h3>ضبط pH</h3><div class="fgrid" style="margin-top:8px"><label class="f full" for="c_ph">قراءة pH بعد إضافة السماد<div class="unitwrap"><input class="in num" id="c_ph" inputmode="decimal"><span class="u">pH</span></div></label></div><div id="phOut" class="help" style="margin-top:8px"></div></div>';
  h += '<p class="help" style="margin-top:10px">أساس الحساب: ' + esc(F.name) + " · كل 1 مل A + " + fml(num(F.fullB) / num(F.fullA)) + " مل B لكل لتر يرفع الأملاح ≈ <b>" + f(ki.k) + "</b> µS/cm " + (ki.src === "learned" ? "(محسوب من آخر " + ki.n + " خلطات مسجلة)" : "(من الخلطة المعتمدة)") + ". " + (cfg("atc") ? "جهازك يعوّض الحرارة تلقائياً (ATC)." : "القراءات مصححة إلى 25° لأن الجهاز مضبوط في الإعدادات على أنه بدون تعويض حرارة.") + "</p>";
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
  $("c_mode_help").textContent = fresh ? (sec === "t" ? "تجهيز خزان جديد: تفريغ الخزان وتعبئته بماء المصدر ثم إضافة A و B." : "نظام مفتوح: كل خلطة تُحضّر من ماء المصدر مباشرة.") : "نظام مغلق: الحساب على الماء الموجود في الخزان وأملاحه الحالية، ثم ما يلزم إضافته للوصول للهدف.";
  var rawR = num($("c_raw").value), raw = ec25(rawR == null ? 0 : rawR, wt), tgt = num($("c_target").value);
  var corr = function (id, val) { var el = $(id); if (el) el.textContent = val != null && !atc && wt != null ? "≈ " + f(val) + " عند 25°" : ""; };
  corr("hc_raw", rawR != null ? raw : null);
  var expRead = function (t25) { return atc || wt == null ? t25 : t25 * (1 + coef * (wt - 25)); };
  var res = null, h = "", Vph = null;
  if (rawR == null) h = '<div class="empty">اكتب أملاح ماء المصدر.</div>';
  else if (fresh) {
    var V = num($("c_water").value), perL, t25;
    if (CALC.stage !== "ec") { perL = num(F.fullA) * CALC.stage; t25 = raw + k * perL; } else { t25 = tgt; perL = tgt != null ? (tgt - raw) / k : null; }
    if (!V || perL == null) h = '<div class="empty">اكتب كمية الماء والهدف.</div>';
    else if (perL <= 0) h = '<div class="banner warn">أملاح ماء المصدر (' + f(raw) + ") أعلى من أو تساوي الهدف. لا تضف سماداً قبل مراجعة المشرف.</div>";
    else {
      var FM = freshMath(raw, t25, V, k, ratio), mlA = FM.mlA, mlB = FM.mlB, st = chk("ec", t25, sec); Vph = V;
      res = { kind: "fresh", water: V, ecRaw: rawR, wt: wt, mlA: Math.round(mlA * 10) / 10, mlB: Math.round(mlB * 10) / 10 };
      h = '<div class="res-big"><div class="stat" style="border-color:var(--accent-2)"><span class="lab">محلول A</span><span class="val num">' + fml(mlA) + ' <small>مل</small></span><span class="sub num">' + f(perL, 2) + ' مل لكل لتر</span></div><div class="stat" style="border-color:var(--accent-2)"><span class="lab">محلول B</span><span class="val num">' + fml(mlB) + ' <small>مل</small></span><span class="sub num">' + f(perL * ratio, 2) + " مل لكل لتر</span></div></div>" +
        '<div class="card" style="margin-top:10px"><dl class="kv"><dt>الجرعة</dt><dd>' + Math.round(perL / num(F.fullA) * 100) + "% من الجرعة الكاملة</dd><dt>الأملاح المتوقعة (عند 25°)</dt><dd><b class=\"num\">" + f(t25) + "</b> µS/cm " + (st === "ok" ? '<span class="pill ok">ضمن الحد</span>' : '<span class="pill bad">خارج الحد ' + rangeTxt("ec", sec) + "</span>") + "</dd>" +
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
        '<div class="card" style="margin-top:10px"><dl class="kv"><dt>الأملاح الآن (عند 25°)</dt><dd class="num">' + f(cur) + "</dd><dt>الأملاح المتوقعة بعد التعويض</dt><dd><b class=\"num\">" + f(tgt) + "</b> µS/cm</dd>" + (!atc && wt != null ? "<dt>القراءة المتوقعة على جهازك</dt><dd><b class=\"num\">" + f(expRead(tgt)) + "</b> عند " + f(wt, 1) + "°</dd>" : "") + "</dl></div>" +
        '<div class="card" style="margin-top:10px"><h3>الخطوات</h3><ol class="cal-steps">' + (drain > 0 ? "<li>صرّف <b class=\"num\">" + f(drain) + "</b> لتر من الخزان.</li>" : "") + "<li>أضف <b class=\"num\">" + f(water) + "</b> لتر من ماء المصدر وشغّل المضخة للتقليب.</li>" + (mA > 0 ? "<li>أضف <b>A</b>: <b class=\"num\">" + fml(mA * .9) + "</b> مل (90%) في الخزان مع التقليب.</li><li>أضف <b>B</b>: <b class=\"num\">" + fml(mB * .9) + "</b> مل بعد امتزاج A.</li><li>بعد 10–15 دقيقة تقليب قِس الأملاح، وأكمل الباقي إن لزم.</li>" : "<li>بعد 10–15 دقيقة تقليب قِس الأملاح.</li>") + "<li>اضبط pH ثم سجّل التعويض.</li></ol></div>";
    }
  }
  out.innerHTML = h; CALC.res = res;
  var phR = num($("c_ph").value), po = $("phOut"), lo = num(cfg("phMin", sec)), hi = num(cfg("phMax", sec)), mid = (lo + hi) / 2;
  if (phR == null) { po.innerHTML = "المستهدف " + f(lo, 1) + " – " + f(hi, 1) + (!atc && wt != null ? " · القراءة المتوقعة للهدف على جهازك عند " + f(wt, 1) + "°: <b class=\"num\">" + f(phAt(mid, wt), 2) + "</b>" : ""); return; }
  if (res) res.phRaw = phR;
  var p25 = ph25(phR, wt), txt = (!atc && wt != null && Math.abs(p25 - phR) > .005 ? "pH المصحح إلى 25°: <b class=\"num\">" + f(p25, 2) + "</b> (تأثير الحرارة على pH صغير). " : "");
  if (p25 > hi) { var rd = phRate(sec, "down"); txt += "pH أعلى من المستهدف، يلزم <b>خافض</b>. " + (rd.r && Vph ? "الكمية التقديرية من سجلاتكم: <b class=\"num\">" + fml(rd.r * Vph * (p25 - mid)) + "</b> مل. أضف 70% منها ثم قِس." : "سجّل 2–3 عمليات ضبط pH بالكميات لتظهر الكمية المقترحة تلقائياً."); }
  else if (p25 < lo) { var ru = phRate(sec, "up"); txt += "pH أقل من المستهدف، يلزم <b>رافع</b>. " + (ru.r && Vph ? "الكمية التقديرية: <b class=\"num\">" + fml(ru.r * Vph * (mid - p25)) + "</b> مل. أضف 70% منها ثم قِس." : "سجّل عمليات ضبط بالرافع لتظهر الكمية المقترحة."); }
  else txt += '<span class="pill ok">pH ضمن المستهدف</span> لا يحتاج ضبطاً.';
  po.innerHTML = txt;
}

/* ================= gallery & sow plan ================= */
function openGallery() {
  var sec = S.sec;
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("صور النمو", sec, "gallery") + '<div id="galBody"><div class="empty">جارٍ التحميل…</div></div></div></div>');
  S.db.collection("entries").where("type", "==", "photo").get().then(function (q) {
    var list = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (e) { return secOf(e) === sec; }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    var groups = {}, order = [];
    list.forEach(function (e) {
      var v = e.v || {}, b = v.batch ? sowBatches().filter(function (x) { return x.id === v.batch; })[0] : null;
      var key = b ? "b:" + b.id : "l:" + (v.loc || "") + "|" + (v.lvl || ""), lab = b ? "دفعة " + (b.v.crop || "") + " · زُرعت " + fmtShort(b.date) : ((v.loc || "بدون مكان") + (v.lvl ? " · " + v.lvl : ""));
      if (!groups[key]) { groups[key] = { lab: lab, b: b, items: [] }; order.push(key); }
      groups[key].items.push(e);
    });
    var gb = $("galBody"); if (!gb) return;
    if (!order.length) { gb.innerHTML = '<div class="empty">لا توجد صور بعد في ' + SECS[sec].name + '. سجّل "التصوير اليومي" من تبويب التسجيل.</div>'; return; }
    gb.innerHTML = order.reverse().map(function (k) {
      var g = groups[k];
      return '<div class="card" style="margin-bottom:10px"><h3 style="margin-bottom:8px">' + esc(g.lab) + '</h3><div class="strip">' + g.items.slice().reverse().map(function (e) {
        var age = g.b ? "يوم " + daysBetween(g.b.date, e.date) : fmtTime(e.time);
        return '<button class="ph" type="button" data-act="lightbox" data-pid="' + esc(e.photo || "") + '" data-cap="' + esc(fmtShort(e.date) + " · " + fmtTime(e.time) + (e.v && e.v.height ? " · " + e.v.height + " سم" : "")) + '"><img alt="" ' + (e.thumb ? 'src="' + e.thumb + '"' : 'data-photo="' + esc(e.photo || "") + '"') + "><span>" + age + "</span><span>" + fmtShort(e.date) + (e.v && e.v.height ? " · " + e.v.height + " سم" : "") + "</span></button>";
      }).join("") + "</div></div>";
    }).join("");
    loadPhotos(gb);
  }).catch(function () { var gb = $("galBody"); if (gb) gb.innerHTML = '<div class="empty">تعذّر تحميل الصور.</div>'; });
}
function openLightbox(pid, cap) {
  var fromGal = !!$("galBody");
  openSheet('<div class="sheet-bg" data-close><div class="sheet lightbox" role="dialog" aria-modal="true">' + sheetHead(cap || "الصورة", null, "photo") + '<img alt="" ' + (S.photos[pid] ? 'src="' + S.photos[pid] + '"' : 'data-photo="' + esc(pid) + '"') + ">" + (fromGal ? '<div class="sheet-actions"><button class="btn" type="button" data-act="gallery">رجوع للصور</button></div>' : "") + "</div></div>");
  loadPhotos($("sheetRoot"));
}
function openSowPlan() {
  var list = sowBatches().slice().reverse().filter(function (e) { return daysBetween(e.date, todayStr()) <= 90; }), dt = num(cfg("daysToTransplant"));
  var rows = list.map(function (e) {
    var age = daysBetween(e.date, todayStr()), tp = transplanted(e.id), seeds = num(e.v.seeds) || 0, due = addDays(e.date, dt);
    var st = tp >= seeds && seeds ? '<span class="pill ok">نُقلت</span>' : tp ? '<span class="pill n">نُقل ' + f(tp) + "</span>" : age >= dt ? '<span class="pill warn">جاهزة للنقل</span>' : '<span class="pill n">في المشتل</span>';
    return '<tr><td class="num">' + fmtShort(e.date) + " " + fmtTime(e.time) + "</td><td>" + esc(e.v.crop || "") + '</td><td class="num">' + f(seeds) + '</td><td class="num">' + f(num(e.v.trays)) + '</td><td class="num">' + age + '</td><td class="num">' + fmtShort(due) + "</td><td>" + st + "</td></tr>";
  }).join("");
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("جدول الزراعة", "n", "sow") +
    (list.length ? '<div class="tbl-wrap"><table><thead><tr><th>تاريخ الزراعة</th><th>الصنف</th><th>البذور</th><th>الصواني</th><th>العمر (يوم)</th><th>النقل المتوقع</th><th>الحالة</th></tr></thead><tbody>' + rows + "</tbody></table></div>" : '<div class="empty">لا توجد دفعات زراعة مسجلة.</div>') +
    '<p class="help">النقل المتوقع = تاريخ الزراعة + ' + dt + ' يوم (يُعدّل من إعدادات المشرف). الحالة تتحدث تلقائياً عند تسجيل "نقل الشتلات للأبراج".</p></div></div>');
}

/* ================= review ================= */
function findEntry(id) { return S.entries.filter(function (x) { return x.id === id; })[0] || S.openNotes.filter(function (x) { return x.id === id; })[0] || S.meta.filter(function (x) { return x.id === id; })[0]; }
function openFlag(id) {
  var e = findEntry(id);
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("ملاحظة المشرف") + '<label class="f" for="flagTxt">اكتب ما يجب تصحيحه أو متابعته<textarea class="in" id="flagTxt">' + esc(e && e.review && e.review.c || "") + "</textarea></label>" +
    '<div class="sheet-actions"><button class="btn pri" type="button" data-act="saveFlag" data-id="' + id + '">حفظ الملاحظة</button></div></div></div>');
}

/* ================= reports ================= */
function loadReport() {
  S.rep = { loading: true }; if (S.tab === "rep") render(true);
  var start = S.repDays === 1 ? todayStr() : addDays(todayStr(), -(S.repDays - 1));
  S.db.collection("entries").where("date", ">=", start).get().then(function (q) {
    S.rep = { start: start, all: q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }) };
    render(true);
  }).catch(function () { S.rep = { err: 1 }; render(true); });
}
function recipeFor(tank, date) { return S.recipes.filter(function (r) { return r.tank === tank && r.date <= date; }).sort(function (a, b) { return (b.date + b.ts).localeCompare(a.date + a.ts); })[0]; }
function recipeMl(r) { return r.volMl != null ? num(r.volMl) : num(r.volL) * 1000; }
function toBase(it) { var q = num(it.qty); if (q == null) return null; return (it.unit === "كغ" || it.unit === "لتر") ? q * 1000 : q; }
function unitBase(it) { return (it.unit === "مل" || it.unit === "لتر") ? "مل" : "غ"; }
function consumption(rows) {
  var per = {}, mlA = 0, mlB = 0, down = 0, up = 0, water = 0;
  rows.filter(function (r) { return r.type === "mix" || r.type === "refill"; }).forEach(function (r) {
    var v = r.v || {}; down += num(v.phDownMl) || 0; up += num(v.phUpMl) || 0; water += num(r.type === "mix" ? v.water : v.waterAdd) || 0;
    [["A", "mlA"], ["B", "mlB"]].forEach(function (p) {
      var ml = num(v[p[1]]); if (!ml) return; if (p[0] === "A") mlA += ml; else mlB += ml;
      var rc = recipeFor(p[0], r.date); if (!rc || !recipeMl(rc)) return; var frac = ml / recipeMl(rc);
      (rc.items || []).forEach(function (it) { var g = toBase(it); if (g == null) return; var key = it.name + "|" + unitBase(it); per[key] = (per[key] || 0) + g * frac; });
    });
  });
  return { mlA: mlA, mlB: mlB, down: down, up: up, water: water, per: per };
}
function computeStock() {
  var out = {};
  ["A", "B"].forEach(function (tk) {
    var rc = recipeFor(tk, todayStr()); if (!rc || !recipeMl(rc)) { out[tk] = null; return; }
    var used = sum(S.hist.filter(function (r) { return (r.ts || 0) >= (rc.ts || 0); }).map(function (r) { return num(r.v && r.v["ml" + tk]); }));
    var left = recipeMl(rc) - used; out[tk] = { rc: rc, used: used, left: left, pct: Math.max(0, left / recipeMl(rc) * 100) };
  });
  return out;
}
function daily(rows) {
  var by = {}; rows.forEach(function (r) { (by[r.date] = by[r.date] || []).push(r); });
  return Object.keys(by).sort().reverse().map(function (d) {
    var a = by[d], g = function (t) { return a.filter(function (r) { return r.type === t; }); };
    var ecs = a.map(function (r) { return r.v && ec25(num(r.v.ec), num(r.v.wt)); }), phs = a.map(function (r) { return r.v && ph25(num(r.v.ph), num(r.v.wt)); }), wts = a.filter(function (r) { return r.type !== "temp"; }).map(function (r) { return num(r.v && r.v.wt); });
    var mr = g("mix").concat(g("refill"));
    return { d: d, mix: mr.length, mlA: sum(mr.map(function (r) { return num(r.v.mlA); })), mlB: sum(mr.map(function (r) { return num(r.v.mlB); })), ec: avg(ecs), ph: avg(phs), wt: avg(wts),
      air: avg(g("temp").map(function (r) { return metric(r.v, "air"); })), rh: avg(g("temp").map(function (r) { return metric(r.v, "rh"); })), lux: avg(g("light").map(function (r) { return metric(r.v, "lux"); })),
      irr: g("irr").length, lit: sum(g("irr").map(function (r) { return num(r.v.liters); })), seeds: sum(g("sow").map(function (r) { return num(r.v.seeds); })), kg: sum(g("harvest").map(function (r) { return num(r.v.weight); })),
      notes: g("note").length, pend: a.filter(function (r) { return !r.review; }).length };
  });
}
function ptsFor(rows, k) {
  var t = function (r) { return new Date(r.date + "T" + (r.time || "12:00") + ":00").getTime(); }, lab = function (r) { return r.date.slice(5) + " " + fmtTime(r.time); };
  if (k === "air" || k === "lux" || k === "rh") { var ty = k === "lux" ? "light" : "temp"; return rows.filter(function (r) { return r.type === ty && metric(r.v, k) != null; }).map(function (r) { return { t: t(r), y: metric(r.v, k), lab: lab(r) }; }); }
  if (k === "wt") return rows.filter(function (r) { return r.type !== "temp" && r.v && num(r.v.wt) != null; }).map(function (r) { return { t: t(r), y: num(r.v.wt), lab: lab(r) }; });
  return rows.filter(function (r) { return r.v && num(r.v[k]) != null; }).map(function (r) { var y = k === "ec" ? ec25(num(r.v.ec), num(r.v.wt)) : ph25(num(r.v.ph), num(r.v.wt)); return { t: t(r), y: y, lab: lab(r) }; });
}
function zoneTable(rows, m, dec, title) {
  var ty = m === "lux" ? "light" : "temp", list = rows.filter(function (r) { return r.type === ty && metric(r.v, m) != null; }); if (!list.length) return "";
  var cell = function (zi, li) { return avg(list.map(function (r) { return num(r.v[m + "_" + ZK[zi] + (li + 1)]); })); };
  var h = "<h3>" + title + '</h3><div class="tbl-wrap" style="margin:6px 0 12px"><table class="minitable"><thead><tr><th></th>' + LEVELS.map(function (l) { return "<th>" + l + "</th>"; }).join("") + "<th>المنطقة</th></tr></thead><tbody>";
  ZK.forEach(function (z, zi) { h += "<tr><td>" + ZONES[zi] + "</td>" + [0, 1, 2].map(function (li) { var v = cell(zi, li); return '<td class="' + (isBad(chk(m, v, "t")) ? "bad" : "") + '">' + f(v, dec) + "</td>"; }).join("") + "<td><b>" + f(avg([0, 1, 2].map(function (li) { return cell(zi, li); })), dec) + "</b></td></tr>"; });
  h += "<tr><td>المستوى</td>" + [0, 1, 2].map(function (li) { return "<td><b>" + f(avg([0, 1, 2].map(function (zi) { return cell(zi, li); })), dec) + "</b></td>"; }).join("") + "<td><b>" + f(avg(list.map(function (r) { return metric(r.v, m); })), dec) + "</b></td></tr>";
  return h + "</tbody></table></div>";
}
function repView() {
  var sec = S.sec;
  var h = '<section class="sec"><div class="sec-h"><h2>التقارير · ' + SECS[sec].icon + " " + SECS[sec].name + '</h2><button class="btn sm" data-act="refreshRep">تحديث</button></div>' +
    '<div class="seg" role="group" aria-label="الفترة">' + [[1, "اليوم"], [7, "7 أيام"], [30, "30 يوم"], [90, "90 يوم"]].map(function (p) { return '<button type="button" data-act="repDays" data-n="' + p[0] + '" aria-pressed="' + (S.repDays === p[0]) + '">' + p[1] + "</button>"; }).join("") + "</div></section>";
  var R = S.rep;
  if (!R || R.loading) return h + '<div class="empty">جارٍ تجهيز التقرير…</div>';
  if (R.err) return h + '<div class="empty">تعذّر تحميل التقرير. اضغط تحديث.</div>';
  var rows = R.all.filter(function (r) { return secOf(r) === sec; });
  if (!rows.length) return h + '<div class="empty">لا توجد تسجيلات في ' + SECS[sec].name + " لهذه الفترة.</div>";
  var C = consumption(rows), D = daily(rows);
  h += '<section class="sec"><div class="grid2 grid-stat">' +
    '<div class="stat"><span class="lab">محلول A المستهلك</span><span class="val num">' + f(C.mlA) + " <small>مل</small></span></div>" +
    '<div class="stat"><span class="lab">محلول B المستهلك</span><span class="val num">' + f(C.mlB) + " <small>مل</small></span></div>" +
    '<div class="stat"><span class="lab">خافض / رافع pH</span><span class="val num">' + f(C.down) + " / " + f(C.up) + " <small>مل</small></span></div>";
  if (sec === "n") {
    var irr = rows.filter(function (r) { return r.type === "irr"; });
    h += '<div class="stat"><span class="lab">محلول الري</span><span class="val num">' + f(sum(irr.map(function (r) { return num(r.v.liters); }))) + ' <small>لتر</small></span><span class="sub">' + irr.length + " رية</span></div>" +
      '<div class="stat"><span class="lab">البذور المزروعة</span><span class="val num">' + f(sum(rows.filter(function (r) { return r.type === "sow"; }).map(function (r) { return num(r.v.seeds); }))) + "</span></div>";
  } else {
    h += '<div class="stat"><span class="lab">الماء المضاف للخزان</span><span class="val num">' + f(C.water) + " <small>لتر</small></span></div>" +
      '<div class="stat"><span class="lab">الحصاد</span><span class="val num">' + f(sum(rows.filter(function (r) { return r.type === "harvest"; }).map(function (r) { return num(r.v.weight); })), 1) + " <small>كغ</small></span></div>" +
      '<div class="stat"><span class="lab">الشتلات المنقولة</span><span class="val num">' + f(sum(rows.filter(function (r) { return r.type === "xplant"; }).map(function (r) { return num(r.v.count); }))) + "</span></div>";
  }
  h += '<div class="stat"><span class="lab">ملاحظات النبات</span><span class="val num">' + rows.filter(function (r) { return r.type === "note"; }).length + "</span></div></div></section>";
  var charts = [["ec", "الأملاح" + (cfg("atc") ? "" : " عند 25°") + " (µS/cm)"], ["ph", "pH"], ["wt", "حرارة ماء المحلول (°C)"], ["air", "حرارة الجو، متوسط (°C)"], ["rh", "الرطوبة، متوسط (%)"], ["lux", "متوسط الضوء (lux)"]];
  h += '<section class="sec">' + charts.map(function (c) { return "<h2>" + c[1] + '</h2><div class="card chart" data-chart="' + c[0] + '"></div>'; }).join("") + "</section>";
  if (sec === "t") { var zt = zoneTable(rows, "air", 1, "حرارة الجو حسب المنطقة والمستوى (°C)") + zoneTable(rows, "rh", 0, "الرطوبة حسب المنطقة والمستوى (%)") + zoneTable(rows, "lux", 0, "الضوء حسب المنطقة والمستوى (lux)"); if (zt) h += '<section class="sec"><div class="card">' + zt + "</div></section>"; }
  var per = Object.keys(C.per).map(function (k) { return [k, C.per[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  h += '<section class="sec"><h2>استهلاك الأسمدة التقديري</h2><p class="muted" style="margin:0;font-size:13px">من كميات A و B في سجلات الخلط والتعويض، وآخر وصفة لكل عبوة.</p>';
  h += per.length ? '<div class="tbl-wrap"><table><thead><tr><th>المادة</th><th>الكمية</th></tr></thead><tbody>' + per.map(function (p) { var n = p[0].split("|"), g = p[1]; return "<tr><td>" + esc(n[0]) + '</td><td class="num">' + (g >= 1000 ? f(g / 1000, 2) + (n[1] === "غ" ? " كغ" : " لتر") : f(g, 3) + " " + n[1]) + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<div class="empty">سجّل وصفة لعبوتي A و B من قسم المشرف ليظهر استهلاك كل مادة.</div>';
  h += '</section><section class="sec"><h2>الملخص اليومي</h2><div class="tbl-wrap"><table><thead><tr><th>التاريخ</th><th>خلط/تعويض</th><th>A مل</th><th>B مل</th><th>EC</th><th>pH</th><th>حرارة الماء</th><th>حرارة الجو</th><th>الرطوبة</th><th>الضوء</th>' + (sec === "n" ? "<th>ريات</th><th>لتر</th><th>بذور</th>" : "<th>حصاد كغ</th>") + "<th>ملاحظات</th><th>بانتظار المراجعة</th></tr></thead><tbody>" +
    D.map(function (r) { return '<tr><td class="num">' + r.d + '</td><td class="num">' + r.mix + '</td><td class="num">' + f(r.mlA) + '</td><td class="num">' + f(r.mlB) + '</td><td class="num">' + f(r.ec) + '</td><td class="num">' + f(r.ph, 2) + '</td><td class="num">' + f(r.wt, 1) + '</td><td class="num">' + f(r.air, 1) + '</td><td class="num">' + f(r.rh) + '</td><td class="num">' + f(r.lux) + "</td>" + (sec === "n" ? '<td class="num">' + r.irr + '</td><td class="num">' + f(r.lit, 1) + '</td><td class="num">' + f(r.seeds) + "</td>" : '<td class="num">' + f(r.kg, 1) + "</td>") + '<td class="num">' + r.notes + '</td><td class="num">' + r.pend + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
  h += '<section class="sec"><div class="card"><h2>تصدير إلى Excel</h2><p class="muted" style="font-size:13.5px">ملف ' + SECS[sec].name + ' فيه ورقة لكل نوع تسجيل، والملخص اليومي، والمعدات، والوصفات، واستهلاك الأسمدة للفترة المختارة.</p><button class="btn pri block" data-act="export">تنزيل ملف Excel</button></div></section>';
  return h;
}
function bindCharts() {
  var R = S.rep; if (!R || !R.all) return; var rows = R.all.filter(function (r) { return secOf(r) === S.sec; });
  document.querySelectorAll("[data-chart]").forEach(function (el) { var k = el.getAttribute("data-chart"); drawChart(el, ptsFor(rows, k), k); });
}
function drawChart(el, pts, c) {
  pts = pts.filter(function (p) { return p.y != null && isFinite(p.y); });
  if (!pts.length) { el.innerHTML = '<div class="muted" style="font-size:13px;text-align:center;padding:16px">لا توجد قراءات</div>'; return; }
  pts.sort(function (a, b) { return a.t - b.t; });
  var W = 600, H = 190, L = 50, Rr = 12, T = 12, B = 26, lo = num(cfg(CHECK[c][0])), hi = num(cfg(CHECK[c][1]));
  var ys = pts.map(function (p) { return p.y; }), ymin = Math.min.apply(null, ys.concat([lo])), ymax = Math.max.apply(null, ys.concat([hi])), padv = (ymax - ymin) * 0.12 || 1; ymin -= padv; ymax += padv;
  var t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  var X = function (t) { return L + (t1 === t0 ? (W - L - Rr) / 2 : (t - t0) / (t1 - t0) * (W - L - Rr)); }, Y = function (y) { return T + (1 - (y - ymin) / (ymax - ymin)) * (H - T - B); };
  var dec = c === "ph" ? 1 : 0, g = "";
  for (var i = 0; i <= 3; i++) { var v = ymin + (ymax - ymin) * i / 3; g += '<line class="gl" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="ax" x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + f(v, dec) + "</text>"; }
  var band = '<rect x="' + L + '" width="' + (W - L - Rr) + '" y="' + Y(hi) + '" height="' + Math.max(0, Y(lo) - Y(hi)) + '" fill="var(--band)"/>';
  var seen = {}, xl = [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]].filter(function (p) { var d = p.lab.slice(0, 5); if (seen[d]) return false; seen[d] = 1; return true; });
  var xs = xl.map(function (p) { return '<text class="ax" x="' + X(p.t) + '" y="' + (H - 6) + '" text-anchor="middle">' + p.lab.slice(0, 5) + "</text>"; }).join("");
  var path = pts.map(function (p, i) { return (i ? "L" : "M") + X(p.t).toFixed(1) + " " + Y(p.y).toFixed(1); }).join(" ");
  var dots = pts.map(function (p) { var st = chk(c, p.y); return '<circle cx="' + X(p.t) + '" cy="' + Y(p.y) + '" r="' + (pts.length > 60 ? 2.2 : 3.5) + '" fill="' + (st === "ok" ? "var(--chart)" : "var(--bad)") + '" stroke="var(--surface)" stroke-width="1.5"/>'; }).join("");
  el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img">' + band + g + '<path d="' + path + '" fill="none" stroke="var(--chart)" stroke-width="2" stroke-linejoin="round"/>' + dots + xs + '<line class="hov" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--muted)" stroke-dasharray="3 3" visibility="hidden"/></svg><div class="tip" hidden></div>';
  var svg = el.querySelector("svg"), tip = el.querySelector(".tip"), hv = svg.querySelector(".hov");
  function mv(ev) {
    var r = svg.getBoundingClientRect(), cx = ev.touches ? ev.touches[0].clientX : ev.clientX, x = (cx - r.left) / r.width * W, best = pts[0], bd = 1e9;
    pts.forEach(function (p) { var d = Math.abs(X(p.t) - x); if (d < bd) { bd = d; best = p; } });
    hv.setAttribute("x1", X(best.t)); hv.setAttribute("x2", X(best.t)); hv.setAttribute("visibility", "visible");
    tip.hidden = false; tip.textContent = best.lab + " · " + f(best.y, c === "ph" ? 2 : 0); tip.style.left = Math.max(60, Math.min(r.width - 60, X(best.t) / W * r.width)) + "px";
  }
  svg.addEventListener("mousemove", mv); svg.addEventListener("touchstart", mv, { passive: true }); svg.addEventListener("touchmove", mv, { passive: true });
  svg.addEventListener("mouseleave", function () { tip.hidden = true; hv.setAttribute("visibility", "hidden"); });
}
function exportXlsx(btn) {
  if (!window.XLSX || !S.rep || !S.rep.all) { toast("التصدير غير متاح الآن، تحقق من الإنترنت"); return; }
  btn.disabled = true;
  try {
    var sec = S.sec, rows = S.rep.all.filter(function (r) { return secOf(r) === sec; }), wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
    var names = {}, add = function (name, aoa) { name = name.slice(0, 31); if (names[name]) name = name.slice(0, 28) + " " + (++names[name]); names[name] = 1; var ws = XLSX.utils.aoa_to_sheet(aoa); ws["!cols"] = aoa[0].map(function (_, i) { return { wch: Math.min(40, Math.max.apply(null, [10].concat(aoa.map(function (r) { return String(r[i] == null ? "" : r[i]).length + 2; })))) }; }); XLSX.utils.book_append_sheet(wb, ws, name); };
    add("الملخص اليومي", [["التاريخ", "خلط/تعويض", "A مل", "B مل", "متوسط EC (25°)", "متوسط pH", "حرارة الماء", "حرارة الجو", "الرطوبة", "الضوء", "ريات", "لتر", "بذور", "حصاد كغ", "ملاحظات", "بانتظار المراجعة"]].concat(daily(rows).map(function (r) { return [r.d, r.mix, r.mlA, r.mlB, r.ec && Math.round(r.ec), r.ph && +r.ph.toFixed(2), r.wt && +r.wt.toFixed(1), r.air && +r.air.toFixed(1), r.rh && Math.round(r.rh), r.lux && Math.round(r.lux), r.irr, r.lit, r.seeds, r.kg, r.notes, r.pend]; })));
    ORDER[sec].forEach(function (t) {
      var T = typeDef(t, sec), cols = [], head = ["التاريخ"];
      T.fields.forEach(function (x) {
        if (x.t === "grid") { ZK.forEach(function (z, zi) { [1, 2, 3].forEach(function (l) { cols.push({ gk: x.k + "_" + z + l }); head.push(x.l + " - " + ZONES[zi] + "/" + LEVELS[l - 1]); }); }); cols.push({ gm: x.k }); head.push(x.l + " - المتوسط"); return; }
        cols.push({ fd: x }); head.push((x.pg ? MNAME[x.pg] + " - " : "") + x.l + (unitOf(x) && unitOf(x) !== "pH" ? " (" + unitOf(x) + ")" : ""));
        if (x.comp === "ec" && !cfg("atc")) { cols.push({ ec25: x.k }); head.push(x.l + " مصحح 25°"); }
      });
      if (t === "note") head.push("الحالة"); head = head.concat(["المسجّل", "المراجعة", "ملاحظة المشرف"]);
      var data = rows.filter(function (r) { return r.type === t; }).map(function (r) {
        var v = r.v || {}, row = [r.date];
        cols.forEach(function (c) {
          if (c.gm) { var mm = metric(v, c.gm); row.push(mm == null ? "" : +mm.toFixed(1)); return; }
          if (c.gk) { row.push(num(v[c.gk])); return; }
          if (c.ec25) { var e25 = ec25(num(v[c.ec25]), num(v.wt)); row.push(e25 == null ? "" : Math.round(e25)); return; }
          var x = c.fd, val = v[x.k];
          if (x.t === "t") row.push(fmtTime(val));
          else if (x.t === "batch") { var b = sowBatches().filter(function (s) { return s.id === val; })[0]; row.push(b ? b.date + " " + (b.v.crop || "") : ""); }
          else row.push(x.t === "n" ? num(val) : (val == null ? "" : val));
        });
        if (t === "note") row.push(r.open ? "مفتوحة" : "تم الحل");
        return row.concat([nameOf(r.by), r.review ? (r.review.s === "ok" ? "معتمد" : "عليه ملاحظة") : "بانتظار", r.review && r.review.c || ""]);
      });
      if (data.length) add(T.label, [head].concat(data));
    });
    var eq = S.rep.all.filter(function (r) { return r.sec === "g"; });
    if (eq.length) add("المعدات", [["التاريخ", "النوع", "البداية / الوقت", "الانتهاء", "التفاصيل", "المسجّل"]].concat(eq.map(function (r) { var v = r.v || {}; return [r.date, typeDef(r.type).label, r.type === "batt" ? tsTime(v.start || r.ts) : fmtTime(r.time), v.end ? tsTime(v.end) : "", r.type === "cal" ? (v.what || "") + " · " + (v.result || "") : (v.before || ""), nameOf(r.by)]; })));
    add("وصفات العبوات المركزة", [["التاريخ", "العبوة", "حجم المحلول المركز (مل)", "المادة", "الكمية", "الوحدة", "ملاحظات", "المشرف"]].concat(S.recipes.reduce(function (acc, r) { return acc.concat((r.items || [{}]).map(function (it) { return [r.date, r.tank, recipeMl(r), it.name || "", num(it.qty), it.unit || "", r.notes || "", nameOf(r.by)]; })); }, [])));
    var C = consumption(rows);
    add("استهلاك الأسمدة", [["البند", "الكمية", "الوحدة"]].concat(Object.keys(C.per).map(function (k) { var n = k.split("|"); return [n[0], +C.per[k].toFixed(3), n[1]]; })).concat([[], ["محلول A", C.mlA, "مل"], ["محلول B", C.mlB, "مل"], ["خافض pH", C.down, "مل"], ["رافع pH", C.up, "مل"]]));
    XLSX.writeFile(wb, "GREEN-SIDE-" + (sec === "t" ? "TOWERS" : "NURSERY") + "-" + S.rep.start + "-" + todayStr() + ".xlsx");
    toast("تم تنزيل الملف");
  } catch (e) { console.warn(e); toast("تعذّر إنشاء الملف"); }
  btn.disabled = false;
}

/* ================= supervisor ================= */
function supView() {
  var sec = S.sec, isOwner = S.ownerUid === S.uid, st = computeStock(), F = formula(), ki = kUse(), L = kLearned(), kf = kFormula();
  var h = '<section class="sec"><div class="sec-h"><h2>عبوات المحلول المركز</h2><button class="btn sm pri" data-act="newRecipe">+ وصفة جديدة</button></div><div class="grid2">';
  ["A", "B"].forEach(function (tk) {
    var o = st[tk];
    if (!o) h += '<div class="stat"><span class="lab">عبوة ' + tk + '</span><span class="val">—</span><span class="sub">لا توجد وصفة مسجلة</span></div>';
    else h += '<div class="stat ' + (o.pct < 15 ? "s-warn" : "") + '"><span class="lab">عبوة ' + tk + ' · المتبقي التقديري</span><span class="val num">' + f(Math.max(0, o.left)) + " <small>مل من " + f(recipeMl(o.rc)) + '</small></span><div class="bar" style="margin:4px 0"><i style="width:' + o.pct + '%"></i></div><span class="sub">حُضّرت في ' + esc(o.rc.date) + " · استُهلك " + f(o.used) + " مل</span></div>";
  });
  h += "</div></section>";
  var stagesTxt = STAGES.map(function (s) { return "<tr><td>" + s[1] + '</td><td class="num">' + fml(num(F.fullA) * s[0]) + " + " + fml(num(F.fullB) * s[0]) + '</td><td class="num">' + f(num(F.ecRaw) + kf * num(F.fullA) * s[0]) + "</td></tr>"; }).join("");
  h += '<section class="sec"><div class="card"><div class="sec-h"><h2>الخلطة والحاسبة</h2><button class="btn sm" data-act="editFormula">تعديل الخلطة</button></div>' +
    '<p style="margin:8px 0 4px"><b>' + esc(F.name) + '</b> <span class="muted">· معتمدة من <span class="num">' + esc(F.date) + "</span></span></p>" +
    '<div class="tbl-wrap"><table class="minitable"><thead><tr><th>الجرعة</th><th>A + B مل/لتر</th><th>EC المتوقع</th></tr></thead><tbody>' + stagesTxt + "</tbody></table></div>" +
    '<dl class="kv" style="margin-top:10px"><dt>معامل الخلطة</dt><dd class="num">' + f(kf, 1) + " µS/cm لكل 1 مل/لتر</dd><dt>المعامل من سجلاتكم</dt><dd>" + (L.n ? '<span class="num">' + f(L.k, 1) + "</span> (من " + L.n + " خلطات)" + (Math.abs(L.k - kf) / kf > .15 ? ' <span class="pill warn">يختلف أكثر من 15% عن الخلطة</span>' : "") : "لا توجد خلطات مسجلة بعد اعتماد هذه الخلطة") + "</dd><dt>المستخدم في الحاسبة</dt><dd><b>" + (ki.src === "learned" ? "من السجلات" : "من الخلطة") + "</b> (" + f(ki.k, 1) + ")</dd></dl>" +
    (S.recipes[0] && S.recipes[0].date > F.date ? '<div class="banner warn" style="margin-top:10px">سُجّلت وصفة عبوة بعد تاريخ اعتماد الخلطة. إذا تغيّرت التركيبة، حدّث الخلطة ليبقى الحساب دقيقاً.</div>' : "") + "</div></section>";
  h += '<section class="sec"><h2>سجل الوصفات</h2>';
  h += S.recipes.length ? '<div class="list">' + S.recipes.slice(0, 30).map(function (r) {
    return '<article class="entry"><div class="e-head"><span class="e-ic"><b class="num">' + esc(r.tank) + '</b></span><div class="e-t"><b>عبوة ' + esc(r.tank) + " · " + f(recipeMl(r)) + ' مل</b><span class="num">' + esc(r.date) + " · " + esc(nameOf(r.by)) + '</span></div><button class="btn sm ghost" data-act="editRecipe" data-id="' + r.id + '">تعديل</button></div>' +
      '<div class="tbl-wrap"><table><thead><tr><th>المادة</th><th>الكمية</th></tr></thead><tbody>' + (r.items || []).map(function (it) { return "<tr><td>" + esc(it.name) + '</td><td class="num">' + f(num(it.qty), 3) + " " + esc(it.unit || "") + "</td></tr>"; }).join("") + "</tbody></table></div>" +
      (r.notes ? '<div class="e-text">' + esc(r.notes) + "</div>" : "") + "</article>";
  }).join("") + "</div>" : '<div class="empty">سجّل وصفة عبوة A وعبوة B (المواد وكمياتها وحجم العبوة) لحساب استهلاك الأسمدة والمتبقي في كل عبوة.<button class="btn pri" data-act="newRecipe">إضافة أول وصفة</button></div>';
  h += "</section>";
  if (isOwner) h += '<section class="sec"><div class="card"><div class="sec-h"><h2>فحص النظام</h2><button class="btn sm pri" data-act="selfTest">تشغيل الفحص</button></div><p class="help" style="margin:6px 0 0">اختبار حقيقي للحفظ والقراءة والصلاحيات والحسابات على قاعدة بياناتك. يستغرق أقل من دقيقة ويحذف بيانات الاختبار بعد انتهائه.</p></div></section>';
  var ids = Object.keys(S.users).filter(function (id) { return !S.users[id].selftest; }).sort(function (a, b) { return (S.users[a].createdAt || 0) - (S.users[b].createdAt || 0); });
  h += '<section class="sec"><div class="sec-h"><h2>المستخدمون والصلاحيات</h2>' + (isOwner ? '<button class="btn sm pri" data-act="newUser">+ مستخدم جديد</button>' : "") + '</div><div class="card">';
  ids.forEach(function (id) {
    var u = S.users[id], r = id === S.ownerUid ? "owner" : u.role;
    var pill = r === "owner" ? '<span class="pill ok">المالك · مشرف</span>' : r === "sup" ? '<span class="pill ok">مشرف</span>' : r === "worker" ? '<span class="pill n">عامل</span>' : '<span class="pill bad">موقوف</span>';
    h += '<div class="user-row"><span class="av">' + initials(id) + '</span><span class="nm">' + esc(u.name) + (id === S.uid ? ' <span class="muted">(أنت)</span>' : "") + "<small>" + esc(showLogin(u.login)) + "</small></span>" + pill;
    if (isOwner && r !== "owner") h += "<span>" + (r !== "worker" ? '<button class="btn sm" data-act="setRole" data-id="' + id + '" data-r="worker">عامل</button> ' : "") + (r !== "sup" ? '<button class="btn sm" data-act="setRole" data-id="' + id + '" data-r="sup">مشرف</button> ' : "") + (r !== "disabled" ? '<button class="btn sm danger" data-act="setRole" data-id="' + id + '" data-r="disabled">إيقاف</button>' : "") + "</span>";
    h += "</div>";
  });
  if (!isOwner) h += '<p class="muted" style="font-size:12.5px">إضافة المستخدمين وتغيير صلاحياتهم متاحة لمالك التطبيق فقط.</p>';
  h += "</div></section>";
  var sf = [["ecMin", "الأملاح الحد الأدنى", "µS/cm"], ["ecMax", "الأملاح الحد الأعلى", "µS/cm"], ["ecTarget", "الأملاح المستهدفة للحاسبة", "µS/cm"], ["phMin", "pH الأدنى", "pH"], ["phMax", "pH الأعلى", "pH"], ["wtMin", "حرارة الماء الدنيا", "°C"], ["wtMax", "حرارة الماء العليا", "°C"],
    ["airMin", "حرارة الجو الدنيا", "°C"], ["airMax", "حرارة الجو العليا", "°C"], ["rhMin", "الرطوبة الدنيا", "%"], ["rhMax", "الرطوبة العليا", "%"], ["luxMin", "الضوء الأدنى", "lux"], ["luxMax", "الضوء الأعلى", "lux"], ["tankL", sec === "t" ? "سعة خزان الأبراج" : "كمية ماء الخلطة المعتادة", "لتر"]];
  if (sec === "n") sf = sf.concat([["pumpL", "سعة مضخة الري", "لتر"], ["nMix", "مرات الخلط يومياً", ""], ["nIrr", "مرات الري يومياً", ""]]);
  else sf = sf.concat([["nRefill", "مرات تعويض الخزان يومياً", ""], ["nPump", "فحص المضخة يومياً", ""]]);
  sf = sf.concat([["nEcph", "قراءات الأملاح وpH يومياً", ""], ["nTemp", "قراءات الجو يومياً", ""], ["nLight", "قراءات الضوء يومياً", ""], ["nPhoto", "صور النمو يومياً", ""]]);
  h += '<section class="sec"><h2>الحدود المستهدفة · ' + SECS[sec].icon + " " + SECS[sec].name + '</h2><form class="card fgrid" id="setSec" novalidate>' + sf.map(function (x) { return '<label class="f" for="ss_' + x[0] + '">' + x[1] + '<div class="unitwrap"><input class="in num" inputmode="decimal" id="ss_' + x[0] + '" value="' + esc(cfg(x[0], sec)) + '"><span class="u">' + x[2] + "</span></div></label>"; }).join("") +
    '<label class="f full" for="ss_zoneNote">تعريف المناطق (يظهر بخط صغير تحت القياسات)<input class="in" id="ss_zoneNote" value="' + esc(cfg("zoneNote", sec)) + '"></label>' +
    '<div class="full"><button class="btn pri block" type="button" data-act="saveSec">حفظ حدود ' + SECS[sec].name + "</button></div></form></section>";
  var g = [["battHours", "التذكير بشحن البطارية بعد", "ساعة"], ["battMaxCharge", "تنبيه فصل الشاحن بعد", "ساعة"], ["calDays", "معايرة جهاز القياس كل", "يوم"], ["capacity", "الطاقة الإنتاجية الشهرية", "بذرة"], ["daysToTransplant", "مدة الشتلة قبل النقل", "يوم"], ["lPerCm", "كل 1 سم في خزان الأبراج", "لتر"]];
  h += '<section class="sec"><h2>إعدادات عامة</h2><form class="card fgrid" id="setGlob" novalidate>' +
    '<label class="f full" for="sg_atc">جهاز القياس يعوّض الحرارة تلقائياً (ATC)<select class="in" id="sg_atc"><option value="0"' + (!cfg("atc") ? " selected" : "") + '>لا · التطبيق يصحح القراءات إلى 25°</option><option value="1"' + (cfg("atc") ? " selected" : "") + ">نعم · لا حاجة للتصحيح</option></select></label>" +
    '<p class="help full" style="margin:-4px 0 0">طريقة التأكد: قِس نفس الماء وهو بارد، ثم بعد تدفئته 8–10 درجات. إذا تغيّرت قراءة الأملاح أكثر من 10% فالجهاز بدون ATC، وإذا بقيت شبه ثابتة فالجهاز فيه ATC.</p>' +
    '<label class="f" for="sg_levelUnit">قياس مستوى خزان الأبراج<select class="in" id="sg_levelUnit"><option value="L"' + (cfg("levelUnit") !== "cm" ? " selected" : "") + '>باللتر</option><option value="cm"' + (cfg("levelUnit") === "cm" ? " selected" : "") + ">بالسنتيمتر</option></select></label>" +
    '<label class="f" for="sg_useLearned">معامل الحاسبة<select class="in" id="sg_useLearned"><option value="1"' + (cfg("useLearned") ? " selected" : "") + '>يتعلم من السجلات بعد 3 خلطات</option><option value="0"' + (!cfg("useLearned") ? " selected" : "") + ">من الخلطة فقط</option></select></label>" +
    g.map(function (x) { return '<label class="f" for="sg_' + x[0] + '">' + x[1] + '<div class="unitwrap"><input class="in num" inputmode="decimal" id="sg_' + x[0] + '" value="' + esc(cfg(x[0])) + '"><span class="u">' + x[2] + "</span></div></label>"; }).join("") +
    '<div class="full"><button class="btn pri block" type="button" data-act="saveGlob">حفظ الإعدادات العامة</button></div></form></section>';
  return h;
}
function openFormula() {
  var F = formula();
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("الخلطة المعتمدة للحاسبة", null, "calc") +
    '<p class="help" style="margin-top:0">أدخل الجرعة الكاملة من وصفتك والأملاح الناتجة عنها. تحسب الحاسبة كل الجرعات والكميات من هذه الأرقام. عند تعديل التركيبة أو نسبة A و B حدّثها هنا.</p><form class="fgrid" id="foForm" novalidate>' +
    '<label class="f full" for="fo_name">اسم الخلطة<input class="in" id="fo_name" value="' + esc(F.name) + '"></label>' +
    '<label class="f" for="fo_fullA">A للجرعة الكاملة<div class="unitwrap"><input class="in num" inputmode="decimal" id="fo_fullA" value="' + esc(F.fullA) + '"><span class="u">مل/لتر</span></div></label>' +
    '<label class="f" for="fo_fullB">B للجرعة الكاملة<div class="unitwrap"><input class="in num" inputmode="decimal" id="fo_fullB" value="' + esc(F.fullB) + '"><span class="u">مل/لتر</span></div></label>' +
    '<label class="f" for="fo_ecRaw">أملاح ماء المصدر<div class="unitwrap"><input class="in num" inputmode="decimal" id="fo_ecRaw" value="' + esc(F.ecRaw) + '"><span class="u">µS/cm</span></div></label>' +
    '<label class="f" for="fo_ecFull">الأملاح عند الجرعة الكاملة<div class="unitwrap"><input class="in num" inputmode="decimal" id="fo_ecFull" value="' + esc(F.ecFull) + '"><span class="u">µS/cm</span></div><span class="hint">شاملة ماء المصدر، عند 25°</span></label>' +
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
    '<label class="f full" for="r_vol">حجم المحلول المركز <span class="req">*</span><div class="unitwrap"><input class="in num" inputmode="decimal" id="r_vol" value="' + esc(r ? recipeMl(r) : "") + '"><span class="u">مل</span></div></label>' +
    '<div class="full"><h3 style="margin-bottom:8px">المواد وكمياتها</h3><datalist id="ferts">' + FERTS.map(function (x) { return '<option value="' + x + '">'; }).join("") + '</datalist><div id="riList">' + items.map(riRow).join("") + '</div><button class="btn sm" type="button" data-act="addRi">+ إضافة مادة</button></div>' +
    '<label class="f full" for="r_notes">ملاحظات (التركيز بالعناصر ppm، المورد، رقم التشغيلة…)<textarea class="in" id="r_notes">' + esc(r ? r.notes : "") + "</textarea></label>" +
    '</form><div class="sheet-actions">' + (r ? '<button class="btn danger" type="button" data-act="delRecipe" data-id="' + r.id + '">حذف</button>' : "") + '<button class="btn pri" type="button" data-act="saveRecipe" data-id="' + (r ? r.id : "") + '">حفظ الوصفة</button></div></div></div>');
}
function riRow(it) { return '<div class="ri"><input class="in" list="ferts" aria-label="اسم المادة" placeholder="اسم المادة" data-ri="name" value="' + esc(it.name) + '"><input class="in num" inputmode="decimal" aria-label="الكمية" placeholder="الكمية" data-ri="qty" value="' + esc(it.qty) + '"><select class="in" aria-label="الوحدة" data-ri="unit">' + ["غ", "كغ", "مل", "لتر"].map(function (u) { return "<option" + (it.unit === u ? " selected" : "") + ">" + u + "</option>"; }).join("") + '</select><button class="iconbtn" type="button" data-act="rmRi" aria-label="حذف السطر">✕</button></div>'; }
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
  var email = toEmail(id), sec = firebase.apps.filter(function (a) { return a.name === "secondary"; })[0] || firebase.initializeApp(window.GS_CONFIG.firebase, "secondary");
  sec.auth().createUserWithEmailAndPassword(email, pw).then(function (cred) { var uid = cred.user.uid; return sec.auth().signOut().then(function () { return S.db.collection("users").doc(uid).set({ name: name, login: email, role: role, createdAt: Date.now() }); }); })
    .then(function () {
      openSheet('<div class="sheet-bg" data-close><div class="sheet">' + sheetHead("تم إنشاء الحساب") + "<p>أرسل هذه البيانات إلى " + esc(name) + ':</p><div class="card"><dl class="kv"><dt>الرابط</dt><dd class="num">' + esc(location.origin + location.pathname) + '</dd><dt>اسم المستخدم</dt><dd class="num">' + esc(showLogin(email)) + '</dd><dt>كلمة المرور</dt><dd class="num">' + esc(pw) + "</dd></dl></div>" +
        '<div class="sheet-actions"><button class="btn pri" type="button" data-act="close">تم</button></div></div></div>');
    }).catch(function (e) { er.textContent = errMsg(e); btn.disabled = false; });
}
function openAccount() {
  openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">' + sheetHead("حسابي") +
    '<div class="card"><dl class="kv"><dt>الاسم</dt><dd>' + esc(nameOf(S.uid)) + '</dd><dt>الدخول</dt><dd class="num">' + esc(showLogin(S.user.email)) + "</dd><dt>الصلاحية</dt><dd>" + (isSup() ? "مشرف" : "عامل") + "</dd></dl></div>" +
    '<form class="fgrid" id="pwForm" style="margin-top:14px" novalidate><label class="f full" for="p_new">تغيير كلمة المرور<input class="in" id="p_new" type="password" dir="ltr" autocomplete="new-password" placeholder="كلمة المرور الجديدة"></label><button class="btn full" type="button" data-act="changePw">حفظ كلمة المرور</button></form>' +
    (S.installEvt ? '<button class="btn pri block" style="margin-top:14px" type="button" data-act="install">تثبيت التطبيق على الجوال</button>' : '<p class="muted" style="font-size:13px;margin-top:14px">لتثبيت التطبيق: من قائمة المتصفح (⋮) اختر "تثبيت التطبيق".</p>') +
    '<div class="sheet-actions"><button class="btn danger" type="button" data-act="logout">تسجيل الخروج</button></div><p class="muted" style="font-size:12px;text-align:center">GREEN SIDE · الإصدار ' + APP_VERSION + "</p></div></div>");
}

/* ================= system check (owner) ================= */
function expectDenied(p) { return p.then(function () { var e = new Error("سُمح بالعملية ولم تُمنع"); e.code = "allowed"; throw e; }, function (e) { if (e && e.code === "permission-denied") return "مُنع كما يجب"; throw e; }); }
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
    anon = firebase.initializeApp(cfgF, "anon" + Date.now());
    var r = await expectDenied(anon.firestore().collection("entries").limit(1).get({ source: "server" })); return r;
  });
  await step("إنشاء حساب عامل تجريبي", async function () {
    wApp = firebase.initializeApp(cfgF, "stw" + Date.now());
    var email = "selftest" + Date.now() + "@" + (window.GS_CONFIG.usernameDomain || "greenside.local"), pw = "St" + Math.random().toString(36).slice(2, 10) + "9";
    var cred = await wApp.auth().createUserWithEmailAndPassword(email, pw); wuid = cred.user.uid;
    await db.collection("users").doc(wuid).set({ name: "فحص النظام", login: email, role: "worker", createdAt: Date.now(), selftest: true });
    wdb = wApp.firestore(); return "تم";
  });
  if (wdb) {
    await step("العامل يسجّل قراءة", async function () { wref = wdb.collection("entries").doc(); await wref.set({ type: "selftest", sec: "t", date: today, time: nowTime(), ts: Date.now(), by: wuid, v: { ec: 1 } }); return "مسموح"; });
    await step("العامل يقرأ السجلات", async function () { await wdb.collection("entries").where("date", "==", today).get({ source: "server" }); return "مسموح"; });
    await step("العامل يعدّل تسجيله قبل المراجعة", async function () { await wref.update({ v: { ec: 2 } }); return "مسموح"; });
    await step("العامل لا يعدّل الإعدادات", function () { return expectDenied(wdb.collection("config").doc("settings").update({ x: 1 })); });
    await step("العامل لا يعتمد التسجيلات", function () { return expectDenied(wref.update({ review: { s: "ok", by: wuid } })); });
    await step("العامل لا يعدّل تسجيل غيره", function () { return expectDenied(wdb.collection("entries").doc(ownerRef.id).update({ v: { ec: 5 } })); });
    await step("العامل لا يغيّر صلاحيته", function () { return expectDenied(wdb.collection("users").doc(wuid).update({ role: "sup" })); });
    await step("العامل لا يعدّل الوصفات", function () { return expectDenied(wdb.collection("recipes").add({ x: 1, ts: 1 })); });
    await step("العامل لا يسجّل باسم شخص آخر", function () { return expectDenied(wdb.collection("entries").add({ type: "selftest", sec: "n", date: today, by: uid, v: {} })); });
    await step("العامل يحذف تسجيله قبل المراجعة", async function () { await wref.delete(); wref = null; return "مسموح"; });
    await step("إيقاف الحساب يمنع الوصول فوراً", async function () { await db.collection("users").doc(wuid).update({ role: "disabled" }); return expectDenied(wdb.collection("entries").limit(1).get({ source: "server" })); });
  }
  await step("تنظيف بيانات الاختبار", async function () {
    if (ownerRef) await ownerRef.delete();
    if (wref) await db.collection("entries").doc(wref.id).delete();
    if (wApp && wApp.auth().currentUser) { try { await wApp.auth().currentUser.delete(); } catch (e) { await wApp.auth().signOut(); } }
    if (wApp) await wApp.delete(); if (anon) await anon.delete();
    return "حُذفت بيانات وحساب الاختبار";
  });
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
    if (errs.length) throw new Error("خطأ في: " + errs.join("، "));
    return "8 حسابات مطابقة للقيم المتوقعة";
  });
  draw();
  var ok = res.filter(function (r) { return r.ok; }).length, sm = $("stSum");
  if (sm) sm.innerHTML = '<div class="banner ' + (ok === res.length ? "ok" : "warn") + '"><b>' + ok + " / " + res.length + "</b>&nbsp;" + (ok === res.length ? "نجحت كل الاختبارات" : "بعض الاختبارات لم تنجح، صوّر هذه الشاشة وأرسلها") + "</div>";
}

/* ================= actions ================= */
var delArm = null;
function armDelete(b, id) { if (delArm === id) { delArm = null; return true; } delArm = id; b.textContent = "اضغط مرة أخرى للحذف"; setTimeout(function () { delArm = null; if (b.isConnected) b.textContent = "حذف"; }, 3000); return false; }
document.addEventListener("click", function (ev) {
  var tp = ev.target.closest(".tp [data-ap]");
  if (tp) { var w = tp.closest(".tp"); w.setAttribute("data-ap", tp.getAttribute("data-ap")); w.querySelectorAll("button[data-ap]").forEach(function (x) { x.setAttribute("aria-pressed", x === tp); }); updForm(); return; }
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
    case "changePw": var np = $("p_new").value; if (np.length < 6) { toast("كلمة المرور 6 أحرف أو أكثر"); return; } b.disabled = true; S.user.updatePassword(np).then(function () { toast("تم تغيير كلمة المرور"); closeSheet(); }).catch(fail); break;
    case "close": closeSheet(); break;
    case "stay": hideExit(); NAV.lastBack = 0; break;
    case "exitApp": hideExit(); try { history.go(-2); } catch (e) {} break;
    case "switchSec": switchSec(b.getAttribute("data-s")); break;
    case "goTab": setTab(b.getAttribute("data-t")); break;
    case "gotoday": S.date = todayStr(); $("datePick").value = S.date; subDay(); render(true); break;
    case "calc": openCalc(); break;
    case "cmode": CALC.mode = b.getAttribute("data-m"); b.parentNode.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); calcRun(); break;
    case "cstage": var sv = b.getAttribute("data-s"); CALC.stage = sv === "ec" ? "ec" : +sv; b.parentNode.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); calcRun(); break;
    case "calcToForm":
      var r = CALC.res; if (!r) { toast("أكمل بيانات الحاسبة أولاً"); return; }
      var blank = function (x) { return x == null ? "" : x; };
      if (r.kind === "fresh") openForm("mix", null, { ecRaw: r.ecRaw, water: r.water, mlA: r.mlA, mlB: r.mlB, wt: blank(r.wt), phRaw: blank(r.phRaw) });
      else { openForm("refill", null, { wt: blank(r.wt), level0: r.level0, ec0: r.ec0, mode: r.mode, waterAdd: r.waterAdd, drained: r.drained || "", mlA: r.mlA || "", mlB: r.mlB || "", phRaw: blank(r.phRaw) }); FORM.modeTouched = true; }
      break;
    case "new": openForm(b.getAttribute("data-type")); break;
    case "edit": var e1 = findEntry(id); if (e1) openForm(e1.type, e1); break;
    case "save": saveForm(b); break;
    case "del": if (!armDelete(b, id)) return; db.collection("entries").doc(id).delete().catch(fail); closeSheet(); toast("تم الحذف"); break;
    case "move": var em = findEntry(id); if (!em) return; var to = secOf(em) === "n" ? "t" : "n"; db.collection("entries").doc(id).update({ sec: to }).then(function () { toast("نُقل التسجيل إلى " + SECS[to].name); }).catch(fail); break;
    case "approve": db.collection("entries").doc(id).update({ review: { s: "ok", by: S.uid, at: Date.now(), c: "" } }).catch(fail); break;
    case "flag": openFlag(id); break;
    case "saveFlag": var c = $("flagTxt").value.trim(); if (!c) { toast("اكتب الملاحظة"); return; } db.collection("entries").doc(id).update({ review: { s: "flag", by: S.uid, at: Date.now(), c: c } }).catch(fail); closeSheet(); toast("حُفظت ملاحظة المشرف"); break;
    case "toggleNote": var e2 = findEntry(id); if (e2) db.collection("entries").doc(id).update({ open: !e2.open }).catch(fail); break;
    case "signoff":
      b.disabled = true; var batch = db.batch(), sec = S.sec;
      secEntries(S.entries, sec).filter(function (x) { return !x.review; }).forEach(function (x) { batch.update(db.collection("entries").doc(x.id), { review: { s: "ok", by: S.uid, at: Date.now(), c: "" } }); });
      batch.set(db.collection("signoffs").doc(S.date + "_" + sec), { by: S.uid, at: Date.now(), sec: sec });
      batch.commit().then(function () { toast("تم اعتماد " + SECS[sec].name); }).catch(fail); break;
    case "battStart":
      var now = Date.now(), nt = nowTime();
      db.collection("entries").add({ type: "batt", sec: "g", date: todayStr(), time: nt, ts: now, by: S.uid, v: { time: nt, start: now, end: null } }).catch(fail);
      toast("سُجّل بدء شحن البطارية"); break;
    case "battEnd": var be = findEntry(id) || lastBatt(); if (!be) return; var nv = Object.assign({}, be.v || {}, { end: Date.now() });
      db.collection("entries").doc(be.id).update({ v: nv }).then(function () { toast("سُجّل انتهاء الشحن"); }).catch(function (err) { console.warn(err); toast("يمكن لمن بدأ الشحن أو للمشرف تسجيل انتهائه"); }); break;
    case "gallery": openGallery(); break;
    case "lightbox": var pid = b.getAttribute("data-pid"); if (pid) openLightbox(pid, b.getAttribute("data-cap")); break;
    case "sowPlan": openSowPlan(); break;
    case "repDays": S.repDays = +b.getAttribute("data-n"); loadReport(); break;
    case "refreshRep": loadReport(); break;
    case "export": exportXlsx(b); break;
    case "editFormula": openFormula(); break;
    case "saveFormula":
      var fo = { name: $("fo_name").value.trim() || "الخلطة", fullA: num($("fo_fullA").value), fullB: num($("fo_fullB").value), ecRaw: num($("fo_ecRaw").value), ecFull: num($("fo_ecFull").value), date: $("fo_date").value || todayStr() };
      if (!fo.fullA || !fo.fullB || fo.ecRaw == null || !fo.ecFull || fo.ecFull <= fo.ecRaw) { toast("تحقق من الأرقام: الجرعة والأملاح"); return; }
      b.disabled = true; db.collection("config").doc("settings").set(Object.assign({}, S.settings, { formula: fo })).then(function () { toast("اعتُمدت الخلطة"); closeSheet(); }).catch(fail); break;
    case "newRecipe": openRecipe(null); break;
    case "editRecipe": openRecipe(S.recipes.filter(function (r) { return r.id === id; })[0]); break;
    case "addRi": $("riList").insertAdjacentHTML("beforeend", riRow({ name: "", qty: "", unit: "غ" })); break;
    case "rmRi": b.closest(".ri").remove(); break;
    case "saveRecipe":
      var vol = num($("r_vol").value); if (!vol) { toast("اكتب حجم المحلول المركز"); return; }
      var items = Array.prototype.map.call(document.querySelectorAll("#riList .ri"), function (r) { return { name: r.querySelector('[data-ri="name"]').value.trim(), qty: num(r.querySelector('[data-ri="qty"]').value), unit: r.querySelector('[data-ri="unit"]').value }; }).filter(function (x) { return x.name; });
      if (!items.length) { toast("أضف مادة واحدة على الأقل"); return; }
      var d = { date: $("r_date").value || todayStr(), tank: $("r_tank").value, volMl: vol, items: items, notes: $("r_notes").value.trim() };
      if (id) { var old = S.recipes.filter(function (r) { return r.id === id; })[0]; db.collection("recipes").doc(id).set(Object.assign(d, { ts: old.ts || Date.now(), by: old.by || S.uid, editedBy: S.uid })).catch(fail); }
      else db.collection("recipes").add(Object.assign(d, { ts: Date.now(), by: S.uid })).catch(fail);
      closeSheet(); toast("حُفظت الوصفة"); break;
    case "delRecipe": if (!armDelete(b, id)) return; db.collection("recipes").doc(id).delete().catch(fail); closeSheet(); break;
    case "newUser": openNewUser(); break;
    case "selfTest": runSelfTest(); break;
    case "createUser": createUser(b); break;
    case "setRole": db.collection("users").doc(id).update({ role: b.getAttribute("data-r") }).then(function () { toast("تم تحديث الصلاحية"); }).catch(fail); break;
    case "saveSec":
      var o = {}; document.querySelectorAll("#setSec [id^=ss_]").forEach(function (el) { var k = el.id.slice(3); if (k === "zoneNote") o[k] = el.value.trim(); else { var n = num(el.value); if (n != null) o[k] = n; } });
      var ns = Object.assign({}, S.settings); if (S.sec === "t") ns.tw = Object.assign({}, S.settings.tw || {}, o); else Object.assign(ns, o);
      db.collection("config").doc("settings").set(ns).then(function () { toast("حُفظت حدود " + SECS[S.sec].name); }).catch(fail); break;
    case "saveGlob":
      var og = { atc: $("sg_atc").value === "1", levelUnit: $("sg_levelUnit").value, useLearned: $("sg_useLearned").value === "1" };
      document.querySelectorAll("#setGlob input[id^=sg_]").forEach(function (el) { var n = num(el.value); if (n != null) og[el.id.slice(3)] = n; });
      db.collection("config").doc("settings").set(Object.assign({}, S.settings, og)).then(function () { toast("حُفظت الإعدادات"); }).catch(fail); break;
  }
});
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && NAV.sheet) closeSheet(); });
if ("serviceWorker" in navigator) window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
boot();
