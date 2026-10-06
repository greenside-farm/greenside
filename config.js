/* GREEN SIDE — إعدادات الربط مع Firebase
   الصق هنا القيم التي تظهر لك في Firebase Console > Project settings > Your apps > Web app.
   هذه القيم ليست سرية؛ الحماية الحقيقية في قواعد Firestore (ملف firestore.rules). */
window.GS_CONFIG = {
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },
  /* اسم المستخدم بدون @ يتحول تلقائياً إلى بريد داخلي بهذا النطاق */
  usernameDomain: "greenside.local"
};
