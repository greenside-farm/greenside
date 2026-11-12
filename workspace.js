/* GREEN SIDE 3.7.0 — unified workspace, existing member/entry permissions. التقارير (RPT) في آخر الملف. */
var GSUI=(function(){
'use strict';
var care={uid:null,rows:[],ready:false,error:'',off:null,revision:0},cache={},pending=0,group='all',search='',review='all';
function E(x){return esc(x);}
/* تواريخ وأوقات للعرض بالعربي: «9 نوفمبر» و«4:00 م» */
function DT(d){return d?fmtDate(d,d.slice(0,4)===todayStr().slice(0,4)?{day:'numeric',month:'long'}:{day:'numeric',month:'long',year:'numeric'}):'';}
function DW(d){return d?fmtDate(d,{weekday:'long',day:'numeric',month:'long'}):'';}
function TM(t){return new Date(t+10800000).toISOString().slice(11,16);}
/* موقع الحساس للعرض: يُخفى الرمز التقني (n:1 أو t:b) لأن اسم الحساس يكفي */
function placeText(l){l=String(l||'').replace(' · موقع سجل اليوم','');return (/^[ntg]\s*[:,]|^[ntg]$|الموقع التاريخي غير مؤكد|^غير محدد$/.test(l))?'':l;}function F(x,d){return x==null?'—':f(x,d==null?1:d);}function at(e){return Date.parse(e.date+'T'+(e.time||'00:00')+':00+03:00');}
function stop(){if(care.off)care.off();care={uid:null,rows:[],ready:false,error:'',off:null,revision:0};cache={};}
function start(){if(!S.uid||!S.role||!S.db||care.uid===S.uid)return;stop();care.uid=S.uid;care.off=S.db.collection('entries').where('type','==','cal').onSnapshot(function(q){care.rows=q.docs.map(entryOf).filter(function(e){return e.v&&e.v.careKind;});care.ready=true;care.error='';care.revision++;cache={};render();},function(e){care.ready=false;care.error=errMsg(e);render();});}
function careKey(){if(care.keyRev===care.revision&&care.key)return care.key;var text=JSON.stringify(care.rows.map(function(e){return [e.id,e.v.deviceId,e.v.careKind,e.v.start,e.v.end];}).sort()),hash=2166136261;for(var i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}care.keyRev=care.revision;return care.key=(care.ready?'ready:':'unknown:')+(hash>>>0).toString(16);}
function windows(id){return care.rows.filter(function(e){return e.v.careKind==='maintenance'&&e.v.deviceId===id;}).map(function(e){return {start:+e.v.start,end:e.v.end==null?Infinity:+e.v.end};}).filter(function(w){return isFinite(w.start)&&w.end>w.start;});}
function maintained(id,t){return windows(id).some(function(w){return t>=w.start&&t<w.end;});}
function interrupted(id,a,b){return windows(id).some(function(w){return w.start<b&&w.end>a;});}
function active(id){return care.rows.filter(function(e){return e.v.careKind==='maintenance'&&e.v.deviceId===id&&e.v.end==null;});}
function list(){return window.SENS?SENS.api.list():[];}function metrics(s){return SENS.api.kinds([s]).filter(function(k){return ['batt','vpd','dew'].indexOf(k)<0;});}
function button(label,action,attrs){return '<button type="button" class="btn" data-ux="'+action+'" '+(attrs||'')+'>'+label+'</button>';}
function heading(title,sub){return '<header class="ux-heading"><span class="eyebrow">'+E(SECS[S.sec].name)+'</span><h2>'+title+'</h2><p>'+sub+'</p></header>';}
function status(){return '<div class="ux-status" role="status">'+(pending?'⏳ '+pending+' عملية تنتظر تأكيد الحفظ':navigator.onLine?'متصل بالشبكة · '+E(S.settings?.farmName||window.GS_CONFIG?.farmName||'البيت المحمي'):'غير متصل · تأكيد الحفظ ينتظر عودة الاتصال')+'</div>';}
function commit(p,b,success){pending++;if(b){b.disabled=true;b.textContent='بانتظار تأكيد الحفظ…';}toast(navigator.onLine?'جارٍ إرسال التسجيل…':S.persistence?'في قائمة الإرسال المحلية؛ لم يؤكد الخادم الحفظ بعد.':'بانتظار الاتصال؛ لا تغلق الصفحة قبل تأكيد الحفظ.');return p.then(function(){pending--;success();render();}).catch(function(e){pending--;if(b){b.disabled=false;b.textContent='إعادة محاولة الحفظ';}var box=document.getElementById('formErrors');if(box && b && b.closest('.sheet')===box.closest('.sheet')){box.hidden=false;box.textContent='لم يؤكد الخادم الحفظ: '+errMsg(e)+'؛ بياناتك ما زالت في النموذج، ويمكن إعادة المحاولة.';}toast('لم يؤكد الخادم الحفظ: '+errMsg(e));render();});}
function careForm(id,kind){
 if(!isSup()||!care.ready)return;var s=SENS._x.sensors[id];if(!s)return;
 openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true">'+sheetHead(kind==='maintenance'?'بدء صيانة':'تسجيل معايرة',S.sec,'cal')+'<p>'+E(s.name||s.tuyaName)+'</p><form id="uxCare"><label class="f">التاريخ والوقت (الشفا)<input type="datetime-local" class="in" id="uxStart" value="'+todayStr()+'T'+nowTime()+'" required></label><label class="f">'+(kind==='maintenance'?'سبب الصيانة':'المحلول المرجعي وطريقة المعايرة')+'<textarea class="in" id="uxMemo" maxlength="1000" required></textarea></label>'+(kind==='calibration'?'<label class="f">النتيجة<select class="in" id="uxResult"><option>ناجحة</option><option>تحتاج إعادة</option><option>الجهاز يحتاج صيانة</option></select></label>':'')+'<p class="help">'+(kind==='maintenance'?'اختر وقت بداية الصيانة الفعلي، ثم أنهِ الحالة عند عودة الجهاز للعمل.':'سجل توثيق؛ لا يطبّق تعويضاً حسابياً على القراءات.')+'</p>'+button('حفظ','save-care','data-id="'+E(id)+'" data-kind="'+kind+'"')+'</form></div></div>');
}
function saveCare(b){
 if(!isSup()||!care.ready||b.disabled)return;var id=b.dataset.id,kind=b.dataset.kind,t=Date.parse($('uxStart').value+':00+03:00'),memo=$('uxMemo').value.trim();
 if(!memo||!isFinite(t)||t>Date.now()){toast('اكتب الوصف واختر وقتاً صحيحاً لا يتجاوز الآن.');return;}
 if(kind==='maintenance'&&active(id).length){toast('توجد صيانة مفتوحة لهذا الحساس.');return;}
 var v={careKind:kind,deviceId:id,start:t,end:null,memo:memo,what:kind==='maintenance'?'صيانة حساس':'معايرة حساس',time:tsHM(t)};
 if(kind==='calibration'){v.result=$('uxResult').value;v.sol=memo;v.end=t;}
 var data={type:'cal',sec:S.sec,date:todayStr(new Date(t)),time:v.time,ts:Date.now(),by:S.uid,v:v},form=$('uxCare');
 if(!form._ref)form._ref=S.db.collection('entries').doc();commit(form._ref.set(data),b,function(){if($('uxCare')===form)closeSheet();toast('تم حفظ السجل');});
}
function endCare(b){if(!isSup()||!care.ready||b.disabled)return;var rows=active(b.dataset.id);if(!rows.length)return;var batch=S.db.batch();rows.forEach(function(e){batch.update(S.db.collection('entries').doc(e.id),{'v.end':Date.now()});});commit(batch.commit(),b,function(){toast('انتهت الصيانة؛ ستُحتسب القراءات التالية ضمن التشغيل.');});}
function carePanel(){
 start();if(!care.ready)return '<p class="banner warn">'+E(care.error||'جارٍ تحميل سجل الصيانة…')+'</p>';
 return '<section class="sec"><h3>الصيانة والمعايرة</h3><p class="help">تبقى القراءات الأصلية محفوظة. يستبعد تقرير المتابعة فترات الصيانة، ولا يغيّر سجل المعايرة قيم الحساس تلقائياً.</p>'+list().map(function(s){var a=active(s.id);return '<div class="ux-row"><span>'+E(s.name||s.tuyaName)+'<small>'+(a.length?'قيد الصيانة':'لا صيانة مفتوحة مسجلة')+'</small></span><div class="ux-actions">'+(isSup()?(a.length?button('إنهاء الصيانة','end-care','data-id="'+E(s.id)+'"'):button('بدء صيانة','care','data-kind="maintenance" data-id="'+E(s.id)+'"'))+button('تسجيل معايرة','care','data-kind="calibration" data-id="'+E(s.id)+'"'):'')+'</div></div>';}).join('')+'<details><summary>سجل الصيانة والمعايرة (آخر 50)</summary>'+care.rows.filter(function(e){return e.sec===S.sec||e.sec==='g';}).slice().sort(function(a,b){return b.ts-a.ts;}).slice(0,50).map(function(e){var v=e.v,s=SENS._x.sensors[v.deviceId];return '<div class="ux-row"><span>'+E(s?(s.name||s.tuyaName):v.deviceId)+'<small>'+E(e.date+' '+(e.time||'وقت غير محدد'))+(e.ts&&todayStr(new Date(e.ts))>e.date?' · أُدخل لاحقًا':'')+' · '+(v.careKind==='maintenance'?'صيانة':'معايرة')+' · '+E(v.memo||v.sol||'')+'</small></span><b>'+E(v.careKind==='maintenance'?(v.end==null?'مفتوحة':'منتهية'):(v.result||'مسجلة'))+'</b></div>';}).join('')+'</details></section>';
}
function liveCards(){
 if(!window.SENS)return '';SENS.start();var access=SENS.api.access();if(access)return '<p class="banner warn">'+E(access)+'</p>'+button('إعادة فتح الاتصال','sensor-retry');var h='',sensors=list();
 ['water','air','medium','other'].forEach(function(g){var members=sensors.filter(function(s){return SENS.api.group(s)===g;});if(!members.length)return;h+='<section class="sec"><div class="sec-h"><h3>'+({water:'الخزان',air:'المناخ',medium:'بلل الوسط',other:'حساسات أخرى'}[g])+'</h3>'+button('التفاصيل','monitor','data-group="'+g+'"')+'</div>';
 if(g==='medium')h+='<p class="muted">'+members.length+' حساس · البلل مؤشر موضعي، ولا يثبت تدفق الماء أو سلامة المضخة.</p>';
 h+='<div class="ux-live-grid">'+members.map(function(s){var m=active(s.id).length>0;return '<article class="card ux-live '+(m?'ux-maint':'')+'"><h4>'+E(s.name||s.tuyaName)+'</h4>'+(m?'<span class="pill warn">صيانة · مستبعد من التحليل</span>':'')+'<dl>'+metrics(s).map(function(k){var q=SENS.api.live(s,k),ki=SENS.api.info(k,s);return '<div><dt>'+E(ki.l)+'</dt><dd><bdi dir="ltr">'+F(q.v,ki.d)+' '+E(ki.u)+'</bdi></dd><small>'+E(!care.ready?'حالة الصيانة غير مؤكدة':m?'صيانة مفتوحة':q.at&&interrupted(s.id,q.at,Date.now())?'بانتظار قراءة بعد الصيانة':q.label)+' · '+(q.at?E(tsTime(q.at)+' · '+SENS.api.age(q.at)):'لم تصل قراءة')+'</small></div>';}).join('')+'</dl></article>';}).join('')+'</div>';h+='</section>';});return h||'<p class="empty">لم تصل حساسات لهذا القسم بعد.</p>';
}
function sensorNotice(){
 if(!window.SENS)return '';
 SENS.start();
 var unavailable=SENS.api.access(), message=unavailable, group='all';
 if(!message && SENS._x.devicesCached)message='القراءات من النسخة المحلية؛ حداثة الاتصال غير مؤكدة.';
 if(!message && SENS._x.statusError)message=SENS._x.statusError;
 if(!message && !care.ready)message='لم يتأكد وضع صيانة الحساسات بعد.';
 if(!message && care.ready){
   var reasons=[];
   if(S.sec==='t'&&!list().some(s=>SENS.api.group(s)==='water'))reasons.push('لا يظهر حساس خزان في القسم');
   list().filter(function(s){return SENS.api.group(s)==='water';}).forEach(function(s){
     if(active(s.id).length){reasons.push('الخزان في الصيانة');return;}
     metrics(s).forEach(function(k){
       var q=SENS.api.live(s,k);
       if(q.state==='missing'||q.state==='stale'||(q.at&&interrupted(s.id,q.at,Date.now()))){
         reasons.push(SENS.api.info(k,s).l+' · '+(q.at?SENS.api.age(q.at):'بلا قراءة'));
       }
     });
   });
   if(reasons.length){message='حالة الخزان غير مؤكدة · '+reasons.join('، ');group='water';}
 }
 return message?'<div class="banner warn"><span>'+E(message)+'</span>'+button('فتح المراقبة','monitor','data-group="'+group+'"')+'</div>':'';
}
function home(){
 start();
 if(lsGet('gs_home_mode_'+S.uid)!=='classic')return Shift.home({status,notice:sensorNotice,liveCards});
 return Shift.action('العودة إلى لوحة الوردية','modern')+classicHome();
}
function classicHome(){
 start();var today=S.date===todayStr(),rows=secEntries(S.entries,S.sec),tk=tasksFor(S.sec,S.entries),unreviewed=rows.filter(function(e){return !e.review;}).length;
 var h=status()+(today?sensorNotice():'')+Farm.home(today);

 h+='<div class="ux-kpis"><div><span>مهام متبقية</span><b>'+(tk.need?tk.left:'—')+'</b></div><div><span>تسجيلات اليوم</span><b>'+rows.length+'</b></div>'+(isSup()?'<div><span>بانتظار المراجعة</span><b>'+unreviewed+'</b></div>':'')+'</div>';
 if(today&&SENS._x.status&&SENS._x.status.ok===false)h+='<div class="banner warn">تعثّر جزء من المزامنة. راجع حالة الجامع في المراقبة؛ قد تكون آخر القراءات متاحة.</div>';
 var issues=badReadings(rows),open=S.openNotes.filter(function(e){return secOf(e)===S.sec;});
 if(issues.length||open.length)h+='<div class="banner warn"><span>يحتاج متابعة: '+issues.length+' قراءة يدوية خارج الحدود · '+open.length+' ملاحظة مفتوحة.</span>'+button('مراجعة العمليات','ops')+'</div>';
 if(today&&SENS._x.status&&Date.now()-SENS.api.ms(SENS._x.status.lastRun)>2700000)h+='<p class="banner warn">آخر مزامنة أقدم من 45 دقيقة؛ راجع الجامع والاتصال.</p>';
 var tasks='<section class="sec"><h3>المهام المتبقية</h3>'+TASKS[S.sec].filter(function(x){return doneOf(rows,x[0])<needOf(S.sec,x);}).map(function(x){var done=doneOf(rows,x[0]),n=needOf(S.sec,x);return '<div class="ux-row"><span>'+E(typeDef(x[0],S.sec).label)+'<small>'+done+' من '+n+'</small></span><button class="btn pri" type="button" data-act="new" data-type="'+x[0]+'">سجّل</button></div>';}).join('')+(!tk.left?'<p class="muted">'+(tk.need?'اكتملت المهام المحددة لهذا اليوم.':'لم تُحدد مهام يومية بعد.')+'</p>':'')+'</section>';
 if(!isSup())h+=tasks;if(today)h+=liveCards();if(isSup())h+=tasks;
 return h;
}
function operations(){
 start();var q=search.trim().toLowerCase(),rows=viewEntries().slice().reverse().filter(function(e){var t=typeDef(e.type,secOf(e));return (!q||(JSON.stringify(e.v||{})+' '+(t?t.label:e.type)+' '+nameOf(e.by)).toLowerCase().indexOf(q)>=0)&&(review==='all'||review===Shift.stateOf(e));});
 return heading('العمليات','سجل '+E(fmtDate(S.date))+' · غيّر التاريخ أعلاه للرجوع إلى يوم سابق.')+status()+'<div class="ux-filters"><label>البحث<input class="in" id="uxSearch" value="'+E(search)+'" placeholder="عملية، ملاحظة، اسم عامل"></label><label>المراجعة<select class="in" id="uxReview">'+[['all','الكل'],['pending','بانتظار المراجعة'],['fix','مطلوب تصحيح'],['again','أُعيد للمراجعة'],['ok','معتمد']].map(function(x){return '<option value="'+x[0]+'" '+(review===x[0]?'selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></label>'+button('بحث','filter')+'</div><div class="ux-actions">'+button('+ تسجيل','record')+(isSup()?'<button class="btn" data-act="signoff">اعتماد اليوم</button>':'')+button('التفاصيل والمعدات','legacy')+'</div>'+rows.map(function(e){return entryCard(e);}).join('')+(!rows.length?'<p class="empty">لا توجد تسجيلات مطابقة.</p>':'');
}
function theme(){var next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;lsSet('gs_theme',next);}
function monitorPrefix(){start();return '<div class="ux-actions">'+[['all','الكل'],['air','المناخ'],['water','الخزان'],['medium','بلل الوسط']].map(function(g){return button(g[1],'group','data-group="'+g[0]+'" aria-pressed="'+(group===g[0])+'"');}).join('')+'</div>'+(!care.ready?'<p class="banner warn">'+E(care.error||'جارٍ تحميل حالة الصيانة…')+'</p>':'');}
function filterSensors(xs){return group==='all'?xs:xs.filter(function(s){return SENS.api.group(s)===group;});}
document.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('[data-ux]');if(!b)return;var a=b.dataset.ux;
 if(a==='sensor-retry'){SENS.api.retry();return;}if(a==='record')setTab('add');else if(a==='ops')setTab('ops');else if(a==='admin')setTab('sup');else if(a==='legacy')setTab('equipment');else if(a==='theme')theme();
 else if(a==='monitor'){group=b.dataset.group||'all';setTab('sens');}else if(a==='group'){group=b.dataset.group;render(true);}else if(a==='filter'){search=$('uxSearch').value;review=$('uxReview').value;render(true);}
 else if(a==='care')careForm(b.dataset.id,b.dataset.kind);else if(a==='save-care')saveCare(b);else if(a==='end-care')endCare(b);
});
document.addEventListener('submit',function(ev){if(ev.target.id==='uxCare'){ev.preventDefault();saveCare(ev.target.querySelector('[data-ux="save-care"]'));}});
function init(){setInterval(function(){if(!document.hidden&&S.role&&(S.tab==='today'||S.tab==='sens'))render();},60000);document.documentElement.dataset.theme=lsGet('gs_theme')||'light';}
return {reviewQueue:function(kind){review=kind;search='';setTab('ops');},endReport:function(){},invalidate:function(){cache={};},careRows:function(){return care.ready?care.rows:[];},retryCare:function(){stop();start();},init:init,home:home,operations:operations,reports:function(){return RPT.view();},carePanel:carePanel,start:start,stop:stop,maintained:maintained,interrupted:interrupted,careKey:careKey,ready:function(){return care.ready;},monitorPrefix:monitorPrefix,filterSensors:filterSensors,commit:commit,_test:{at:at,setCare:function(rows){care.rows=rows;care.ready=true;care.revision++;}}};
})();
/* ===== 3.7.0 · التقارير: صفحة واحدة بدل «تقرير المتابعة» و«التقارير التفصيلية»، وكل رقم بتعريف واحد =====
   الحسابات دوال صافية تأخذ التسجيلات وسياقاً (الحدود، الجدول الساري، المهلة، الآن)، فتُختبر بأرقام معروفة (selfCheck) في «فحص النظام».
   القراءة: تسجيلات كل يوم تُقرأ مرة وتُحفظ في الجلسة (تتجدد بعد 10 دقائق أو بزر «تحديث»)، ويوم التاريخ المختار حيّ من الاشتراك.
   قراءات الحساسات للفترتين (الحالية والسابقة) في طلب واحد من مشروع الحساسات. */
var RPT=(function(){
'use strict';
const TOL=30,TTL=600000,E=x=>esc(x),I=(n,s,w)=>Board.icon(n,s,w);
const ls=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};/* workspace.js يُحمَّل قبل app.js */
const st={kind:['day','7','30','month'].includes(ls('gs_rep_kind'))?ls('gs_rep_kind'):'7',off:0,tab:['sum','comp','sol','clim','prod','equip'].includes(ls('gs_rep_tab'))?ls('gs_rep_tab'):'sum'};
const DAYS={},SN={key:'',docs:null,err:'',loading:false,force:false};let loading=null,loadErr='',ver=0,memo={key:'',m:null};

/* ---------- أدوات ---------- */
const atMs=(d,t)=>Date.parse(d+'T'+(okHM(t)?t:'12:00')+':00+03:00');
const byTime=(a,b)=>String(a.time||'').localeCompare(String(b.time||''))||(a.ts||0)-(b.ts||0);
/* النسبة لا تُقرَّب إلى 100% إلا إن كانت كاملة، ولا إلى 0% إلا إن كانت صفراً */
const pc=(a,b)=>{if(!b)return null;const r=a/b*100;return a>=b?100:a<=0?0:Math.max(1,Math.min(99,Math.round(r)));};
const P=x=>x==null?'—':'⁦'+x+'%⁩';
const L2R=x=>'<bdi dir="ltr">'+x+'</bdi>';
function median(a){a=a.filter(x=>x!=null&&isFinite(x)).sort((x,y)=>x-y);const n=a.length;return n?(n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2):null;}
function mean(a){a=a.filter(x=>x!=null&&isFinite(x));return a.length?a.reduce((x,y)=>x+y,0)/a.length:null;}
function datesIn(a,b){const o=[];for(let d=a;d<=b&&o.length<400;d=addDays(d,1))o.push(d);return o;}
function uniq(list){const seen={},o=[];list.forEach(e=>{const g=e.grp||e.id;if(!seen[g]){seen[g]=1;o.push(e);}});return o;}
function monthAdd(m,k){let y=+m.slice(0,4),mo=+m.slice(5,7)-1+k;y+=Math.floor(mo/12);mo=((mo%12)+12)%12;return y+'-'+String(mo+1).padStart(2,'0');}
function monthEnd(m){return m+'-'+String(new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7),0)).getUTCDate()).padStart(2,'0');}
const hrs=h=>h==null?'—':f(h,h<10?1:0);

/* ---------- الفترة: اليوم «حتى الآن» · 7 أو 30 يوماً مكتملة · شهر تقويمي. السهمان يرجعان بخطوة الفترة نفسها ---------- */
function period(o){
 o=o||st;const t=todayStr(),anchor=S.date>t?t:S.date,k=o.kind,off=Math.max(0,o.off|0);let from,to,pf,pt;
 if(k==='day'){from=to=addDays(anchor,-off);pf=pt=addDays(from,-1);}
 else if(k==='month'){const m=monthAdd(anchor.slice(0,7),-off),e=monthEnd(m),pm=monthAdd(m,-1);from=m+'-01';to=e<t?e:t;pf=pm+'-01';pt=monthEnd(pm);}
 else{const n=k==='30'?30:7,e0=anchor<t?anchor:addDays(t,-1);to=addDays(e0,-n*off);from=addDays(to,1-n);pt=addDays(from,-1);pf=addDays(pt,1-n);}
 const dates=datesIn(from,to),live=to>=t;
 return {k,off,from,to,pf,pt,live,dates,n:dates.length,a:Date.parse(from+'T00:00:00+03:00'),b:Date.parse(to+'T00:00:00+03:00')+864e5,pa:Date.parse(pf+'T00:00:00+03:00'),pb:Date.parse(pt+'T00:00:00+03:00')+864e5};
}
const DM=d=>fmtDate(d,{day:'numeric',month:'long'});
function rangeText(a,b){if(a===b)return fmtDate(a,{weekday:'long',day:'numeric',month:'long'});if(a.slice(0,7)===b.slice(0,7))return (+a.slice(8))+' – '+DM(b);return DM(a)+' – '+DM(b);}

/* ---------- السياق: الحدود والجدول والمهلة والآن (قابل للاستبدال في الاختبارات) ---------- */
function ctx(sec,o){return Object.assign({sec,tol:TOL,today:todayStr(),now:Date.now(),tasks:TASKS[sec],st:(c,v,s2,t)=>chk(c,v,s2,t),sched:(type,d)=>schedAt(sec,type,d),recipes:S.recipes||[]},o||{});}

/* ---------- ت1: مطابقة المواعيد. أولاً أقرب تسجيل خلال المهلة لكل موعد (الأقرب فالأقرب)، ثم ما بقي من تسجيلات لأقرب موعد شاغر ---------- */
function matchDay(recs,times,tol){
 const S_=times.map(t=>({t,m:tMin(t),e:null,dl:null,ok:false})),R_=recs.map(e=>({e,m:okHM(e.time)?tMin(e.time):null,used:false})),pairs=[];
 S_.forEach((s,i)=>R_.forEach((r,j)=>{if(r.m==null)return;const d=Math.abs(r.m-s.m);if(d<=tol)pairs.push([d,i,j]);}));
 pairs.sort((a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2]).forEach(([,i,j])=>{if(S_[i].e||R_[j].used)return;S_[i].e=R_[j].e;S_[i].dl=R_[j].m-S_[i].m;S_[i].ok=true;R_[j].used=true;});
 R_.filter(r=>!r.used).sort((a,b)=>(a.m==null?1e4:a.m)-(b.m==null?1e4:b.m)).forEach(r=>{let bi=-1,bd=1e9;S_.forEach((s,i)=>{if(s.e)return;const d=r.m==null?0:Math.abs(r.m-s.m);if(d<bd){bd=d;bi=i;}});if(bi>=0){S_[bi].e=r.e;S_[bi].dl=r.m==null?null:r.m-S_[bi].m;r.used=true;}});
 return {slots:S_,extra:R_.filter(r=>!r.used).map(r=>r.e)};
}
/* «سُجّل لاحقاً»: حُفظ بعد الوقت المكتوب بأكثر من المهلة (أو في يوم تالٍ) */
function lateEntry(e,tol){const at=atMs(e.date,e.time);return okTs(e.ts)&&isFinite(at)&&e.ts-at>tol*60000;}
/* ت1–ت4: كل يوم بجدوله الساري، اليوم الجاري بالمواعيد التي مضت فقط، و«خزان جديد» يُحتسب عن «تعويض الخزان» */
function compliance(rows,X,dates){
 const by={};rows.forEach(r=>{(by[r.date]=by[r.date]||[]).push(r);});
 const nowM=tMin(tsHM(X.now)),C={days:[],types:{},slots:[],need:0,done:0,ok:0,later:0,dl:0,dn:0};
 X.tasks.forEach(x=>{C.types[x[0]]={type:x[0],need:0,done:0,ok:0,later:0,dl:0,dn:0,count:false,times:0};});
 dates.forEach(d=>{
  const live=d===X.today,a=by[d]||[],D={d,live,need:0,done:0,ok:0,miss:[],up:0,cnt:[]};
  X.tasks.forEach(x=>{
   const type=x[0],sc=X.sched(type,d),T=C.types[type],ks=taskTypes(type),recs=uniq(a.filter(e=>ks.includes(e.type)).sort(byTime));
   if(sc.times.length){
    T.times=Math.max(T.times,sc.times.length);
    matchDay(recs,sc.times,X.tol).slots.forEach(s=>{
     if(!s.e&&live&&nowM<=s.m+X.tol){D.up++;C.slots.push({d,type,t:s.t,state:nowM>=s.m?'due':'next'});return;}
     D.need++;T.need++;
     if(!s.e){D.miss.push(type);C.slots.push({d,type,t:s.t,state:'miss'});return;}
     const later=lateEntry(s.e,X.tol);D.done++;T.done++;if(s.ok){D.ok++;T.ok++;}if(later)T.later++;if(s.dl!=null){T.dl+=Math.max(0,s.dl);T.dn++;}
     C.slots.push({d,type,t:s.t,e:s.e,ok:s.ok,dl:s.dl,later,state:s.ok?'ok':'late'});
    });
   }else if(sc.n){
    T.count=true;const dn=Math.min(sc.n,recs.length);
    /* بلا مواعيد: اليوم الجاري يُعرض «X من Y» ولا يدخل في النسب */
    if(live){D.cnt.push({type,done:dn,n:sc.n});return;}
    D.need+=sc.n;D.done+=dn;D.ok+=dn;T.need+=sc.n;T.done+=dn;T.ok+=dn;if(dn<sc.n)D.miss.push(type);
    recs.slice(0,dn).forEach(e=>{const later=lateEntry(e,X.tol);if(later)T.later++;C.slots.push({d,type,t:'',e,ok:true,dl:null,later,state:'ok',count:true});});
    for(let i=dn;i<sc.n;i++)C.slots.push({d,type,t:'',state:'miss',count:true});
   }
  });
  C.days.push(D);C.need+=D.need;C.done+=D.done;C.ok+=D.ok;
 });
 Object.values(C.types).forEach(T=>{C.later+=T.later;C.dl+=T.dl;C.dn+=T.dn;});
 return C;
}
/* م4: الجولة = تسجيل مهمة (التسجيل المقسوم على جهتين جولة واحدة) */
function workers(rows,C){
 const W={},w=id=>W[id]=W[id]||{id,rounds:0,ok:0,prior:0,flag:0,n:0};
 C.slots.forEach(s=>{if(!s.e||!s.e.by)return;const x=w(s.e.by);x.rounds++;if(s.ok)x.ok++;});
 uniq(rows).forEach(e=>{if(!e.by||e.sec==='g')return;const x=w(e.by);x.n++;if(okTs(e.ts)&&tsDay(e.ts)>e.date)x.prior++;});
 rows.forEach(e=>{if(e.by&&e.review&&e.review.s==='flag')w(e.by).flag++;});
 return Object.values(W).filter(x=>x.rounds||x.n).sort((a,b)=>b.rounds-a.rounds||b.n-a.n);
}
function reviewStats(rows,dates){
 const pend=rows.filter(e=>!e.review),flag=rows.filter(e=>e.review&&e.review.s==='flag'),pd={};pend.forEach(e=>{pd[e.date]=1;});
 const waits=rows.filter(e=>e.review&&e.review.s==='ok'&&okTs(e.review.at)&&okTs(e.ts)&&e.review.at>=e.ts).map(e=>(e.review.at-e.ts)/36e5);
 return {pend:pend.length,flag:flag.length,days:Object.keys(pd).length,of:dates.filter(d=>rows.some(e=>e.date===d)).length,wait:median(waits)};
}

/* ---------- ح1–ح3: الحدود خانة بخانة، ومنها «قبل التعويض»، بحد وقت القراءة ---------- */
const LIM_ORDER=['ec','ph','wt','air','rh','lux'],LIM_L={ec:'الأملاح EC',ph:'pH',wt:'حرارة الماء',air:'حرارة الجو',rh:'الرطوبة',lux:'الضوء'};
function limits(rows,X){
 const M={};
 rows.forEach(e=>{limitCells(e,X.st).forEach(x=>{
  const m=M[x.c]=M[x.c]||{c:x.c,l:LIM_L[x.c]||x.c,cells:0,out:0,lo:0,hi:0,rd:{},ro:{},min:null,max:null,bad:[],na:0};
  m.rd[e.id]=1;if(!m.min||x.v<m.min.v)m.min=x;if(!m.max||x.v>m.max.v)m.max=x;
  if(!x.j){m.na++;return;}m.cells++;if(isBad(x.st)){m.out++;m[x.st]++;m.ro[e.id]=1;m.bad.push(x);}
 });});
 const list=LIM_ORDER.filter(c=>M[c]).map(c=>Object.assign(M[c],{readings:Object.keys(M[c].rd).length,outReadings:Object.keys(M[c].ro).length}));
 return {list,by:M,cells:list.reduce((n,m)=>n+m.cells,0),out:list.reduce((n,m)=>n+m.out,0)};
}

/* ---------- م1/م3: المحلول «كما وُجد» و«بعد التدخل»، بالوسيط والأدنى والأعلى ---------- */
const SOL={t:{found:[['ecph','ec','ph','wt'],['refill','ec0','ph0','wt']],after:[['refill','ec','ph',null],['mix','ec','ph','wt']]},
 n:{found:[['irr','ec','ph','wt'],['ecph','ec','ph','wt']],after:[['mix','ec','ph','wt'],['refill','ec','ph',null]]}};
function series(rows,sec,which,m,X){
 const out=[];(SOL[sec]||SOL.n)[which].forEach(([type,ek,pk,wk])=>{const key=m==='ec'?ek:m==='ph'?pk:wk;if(!key)return;
  rows.forEach(e=>{if(e.type!==type)return;const v=num((e.v||{})[key]);if(v==null)return;out.push({e,v,d:e.date,t:e.time||'',st:X.st(m,v,sec,e.time),key});});});
 return out.sort((a,b)=>(a.d+a.t).localeCompare(b.d+b.t));
}
function waterTemps(rows,sec,X){
 const out=[];rows.forEach(e=>{if(!['ecph','irr','refill','mix'].includes(e.type))return;const v=num((e.v||{}).wt);if(v!=null)out.push({e,v,d:e.date,t:e.time||'',st:X.st('wt',v,sec,e.time)});});
 return out.sort((a,b)=>(a.d+a.t).localeCompare(b.d+b.t));
}
function sstat(L){
 const j=L.filter(x=>x.st!=null);
 return {n:L.length,med:median(L.map(x=>x.v)),min:L.length?L.reduce((a,b)=>b.v<a.v?b:a):null,max:L.length?L.reduce((a,b)=>b.v>a.v?b:a):null,jn:j.length,ok:j.filter(x=>x.st==='ok').length,bad:j.filter(x=>isBad(x.st)).length,lo:j.filter(x=>x.st==='lo').length,hi:j.filter(x=>x.st==='hi').length};
}

/* ---------- س1/س2: الاستهلاك. ماء التعويض منفصل عن تعبئة الخزان الجديد، والوصفة بآخر ما حُفظ قبل وقت الخلط ---------- */
function recEff(r){const d0=Date.parse(r.date+'T00:00:00+03:00'),ts=+r.ts||0;return ts>=d0&&ts<d0+864e5?ts:d0;}
function recipeAt(list,tank,at){let best=null,bt=-Infinity;(list||[]).forEach(r=>{if(!r||r.tank!==tank||!okDay(r.date))return;const e=recEff(r);if(e<=at&&e>bt){best=r;bt=e;}});return best;}
function consumption(rows,X,nDays){
 const sumK=(L,k)=>L.reduce((n,r)=>n+(num((r.v||{})[k])||0),0),ty=t=>rows.filter(r=>r.type===t);
 const refill=ty('refill'),wo=ty('waterOnly'),mix=ty('mix'),irr=ty('irr'),dose=mix.concat(refill);
 const C={days:nDays,topup:sumK(refill,'waterAdd')+sumK(wo,'waterAdd'),topupN:refill.length,woN:wo.length,fill:sumK(mix,'water'),fillN:mix.length,fillDates:mix.map(r=>r.date).sort(),
  irr:irr.reduce((n,r)=>n+(irrL(r.v)||0),0),irrN:irr.length,mlA:sumK(dose,'mlA'),mlB:sumK(dose,'mlB'),down:sumK(dose,'phDownMl'),up:sumK(dose,'phUpMl'),per:{},miss:{A:{ml:0,first:''},B:{ml:0,first:''}},recFirst:{}};
 dose.forEach(r=>{const v=r.v||{},at=atMs(r.date,r.time);[['A','mlA'],['B','mlB']].forEach(([tk,k])=>{const ml=num(v[k]);if(!ml||ml<0)return;const rc=recipeAt(X.recipes,tk,at),vol=rc?recipeMl(rc):null;
  if(!rc||!vol){const m=C.miss[tk];m.ml+=ml;if(!m.last||r.date>m.last)m.last=r.date;return;}
  (rc.items||[]).forEach(it=>{const g=toBase(it);if(g==null)return;const key=it.name+'|'+unitBase(it);C.per[key]=(C.per[key]||0)+g*ml/vol;});});});
 ['A','B'].forEach(tk=>{const r=(X.recipes||[]).filter(x=>x&&x.tank===tk&&okDay(x.date)).sort((a,b)=>recEff(a)-recEff(b))[0];C.recFirst[tk]=r?r.date:'';});
 return C;
}

/* ---------- م2: الملخص اليومي ---------- */
function daily(rows,C,sec,X,dates){
 const by={};rows.forEach(r=>{(by[r.date]=by[r.date]||[]).push(r);});
 return dates.slice().reverse().map(d=>{
  const a=by[d]||[],g=t=>a.filter(r=>r.type===t),cd=C.days.find(x=>x.d===d)||{},ec=series(a,sec,'found','ec',X),ph=series(a,sec,'found','ph',X),cs=consumption(a,X,1);
  return {d,live:d===X.today,need:cd.need||0,done:cd.done||0,ok:cd.ok||0,ec:median(ec.map(x=>x.v)),ecBad:ec.some(x=>isBad(x.st)),ph:median(ph.map(x=>x.v)),phBad:ph.some(x=>isBad(x.st)),
   air:mean(g('temp').map(r=>metric(r.v,'air'))),water:sec==='t'?cs.topup:cs.irr,fill:cs.fill,kg:g('harvest').reduce((n,r)=>n+(num(r.v.weight)||0),0),seeds:g('sow').reduce((n,r)=>n+(num(r.v.seeds)||0),0),
   notes:g('note').filter(r=>(r.v||{}).cat!==NOTE_NONE).length,pend:a.filter(r=>!r.review).length};
 });
}

/* ---------- م3: شبكة المناطق: متوسط واحد لكل القراءات (لا متوسط المتوسطات)، وعدّ الخانات خارج الحد ---------- */
function zoneGrid(rows,m,sec,X){
 const ty=m==='lux'?'light':'temp',T=typeDef(ty,sec),fd=T&&(T.fields||[]).find(x=>x.k===m&&x.t==='grid');if(!fd)return null;
 const D=dimOf(fd),cell=D.rows.map(()=>D.cols.map(()=>({s:0,n:0,out:0}))),R=D.rows.map(()=>({s:0,n:0})),Cc=D.cols.map(()=>({s:0,n:0})),A={s:0,n:0};let readings=0,outR=0,cells=0,out=0;
 rows.forEach(e=>{if(e.type!==ty)return;let any=false,bad=false;limitCells(e,X.st).forEach(x=>{if(x.k!==m||!x.cell)return;any=true;const c=cell[x.ri][x.ci];c.s+=x.v;c.n++;R[x.ri].s+=x.v;R[x.ri].n++;Cc[x.ci].s+=x.v;Cc[x.ci].n++;A.s+=x.v;A.n++;if(x.j){cells++;if(isBad(x.st)){c.out++;out++;bad=true;}}});if(any)readings++;if(bad)outR++;});
 if(!A.n)return null;const av=o=>o.n?o.s/o.n:null;
 return {m,D,cell:cell.map(r=>r.map(c=>({v:av(c),n:c.n,out:c.out}))),rows:R.map(av),cols:Cc.map(av),all:av(A),readings,outR,cells,out};
}

/* ---------- الإنتاج والملاحظات ---------- */
function notesOf(rows){
 const L=rows.filter(r=>r.type==='note'&&(r.v||{}).cat!==NOTE_NONE),by={};
 L.forEach(r=>{const v=r.v||{},k=v.cat===NOTE_OTHER?(txt(v.catX,40)||'أخرى'):(txt(v.cat,40)||'أخرى'),x=by[k]=by[k]||{k,n:0,open:0,sev:{}};x.n++;if(r.open)x.open++;if(v.sev)x.sev[v.sev]=(x.sev[v.sev]||0)+1;});
 return {n:L.length,open:L.filter(r=>r.open).length,list:Object.values(by).sort((a,b)=>b.n-a.n)};
}
function production(all,R){
 const g=t=>all.filter(r=>r.type===t),sm=(L,k)=>L.reduce((n,r)=>n+(num((r.v||{})[k])||0),0);
 const hv=g('harvest'),o={seeds:sm(g('sow'),'seeds'),counted:sm(g('count'),'usable'),moved:sm(g('xplant'),'count'),heads:sm(hv,'count'),rej:sm(hv,'rejected'),kg:sm(hv,'weight'),germ:null,batches:null};
 o.headG=o.heads&&o.kg?o.kg*1000/o.heads:null;o.rejP=o.heads?o.rej/o.heads*100:null;
 if(window.Cycle&&window.Farm&&Farm.cropReady()){
  const L=Cycle.all(),t=todayStr(),cnt=L.filter(b=>b.lastCount&&b.lastCount.date>=R.from&&b.lastCount.date<=R.to&&b.seeds&&b.usable!=null);
  if(cnt.length){const sd=cnt.reduce((n,b)=>n+b.seeds,0);o.germ=sd?cnt.reduce((n,b)=>n+b.usable,0)/sd*100:null;}
  o.batches={ready:L.filter(b=>b.stage==='ready'),late:L.filter(b=>b.stage!=='done'&&b.inTowers&&b.harvestDue&&b.harvestDue<t),closed:L.filter(b=>b.final&&b.final.date>=R.from&&b.final.date<=R.to)};
 }
 return o;
}
function money(R,kg){
 if(!window.Farm||S.ownerUid!==S.uid||!Farm.ledgerReady())return null;
 const L=Farm.ledger().filter(l=>l.date>=R.from&&l.date<=R.to),cost=L.filter(l=>l.kind==='تكلفة').reduce((n,l)=>n+l.amount,0),sales=L.filter(l=>l.kind==='مبيعات').reduce((n,l)=>n+l.amount,0);
 return {cost,sales,margin:sales-cost,perKg:kg?cost/kg:null};
}
function equipment(allRows,R){
 const g=t=>allRows.filter(r=>r.type===t),pump=g('pump'),batt=g('batt'),cal=g('cal').filter(e=>!(e.v&&e.v.careKind));
 let gN=0,gOk=0;pump.forEach(e=>{const v=e.v||{};['gauge1','gauge2'].forEach(k=>{const n=num(v[k]),sp=v.pressureSpecs&&v.pressureSpecs[k];if(n==null||!sp||num(sp.ideal)==null)return;gN++;if(Math.abs(n-num(sp.ideal))<1e-9)gOk++;});});
 const last=L=>L.slice().sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||''))).pop()||null;
 const svc=window.Farm&&Farm.services?Farm.services().filter(x=>x.date>=R.from&&x.date<=R.to):[];
 const care=(window.GSUI&&GSUI.careRows?GSUI.careRows():[]).filter(e=>e.v.careKind==='maintenance'&&+e.v.start<R.b&&(e.v.end==null||+e.v.end>R.a));
 return {pump:pump.length,pumpOk:pump.filter(e=>(e.v||{}).status==='تعمل بشكل طبيعي').length,gN,gOk,batt:batt.length,battLast:last(batt),cal:cal.length,calLast:last(cal),svc,care};
}

/* ---------- ن1–ن7: الحساسات (sensors.js: SENS.rpt) والبيت كله ---------- */
function sensorsOf(docs,a,b,now,L){if(!docs||!window.SENS||!SENS.rpt)return null;return SENS.rpt.sensors(docs,a,b,now,L);}
/* ساعات خارج الحد في البيت: حرارة أو رطوبة أي حساس (الساعة الواحدة تُعدّ مرة واحدة مهما تعدد الحساسات) */
function houseOut(list){const n=Math.max(0,...list.map(s=>s.outSteps.length));let k=0;for(let i=0;i<n;i++)if(list.some(s=>s.outSteps[i]===1))k++;return k*(window.SENS&&SENS.rpt?SENS.rpt.step:300)/3600;}
/* ن5: المقارنة بالفترة السابقة فقط إن غطّت البيانات 70% من الفترتين */
const cmpOk=(c,p)=>!!(c&&p&&c.pct>=.7&&p.pct>=.7);

/* ---------- القراءة ---------- */
function have(d){return (d===S.date&&S.dayLoaded)||!!DAYS[d];}
function rowsIn(a,b){const out=[];datesIn(a,b).forEach(d=>{const L=d===S.date&&S.dayLoaded?S.entries:DAYS[d]?DAYS[d].rows:[];L.forEach(e=>{if(e&&e.type!=='selftest')out.push(e);});});return out;}
function ensure(a,b){
 const miss=datesIn(a,b).filter(d=>!(d===S.date&&S.dayLoaded)&&!(DAYS[d]&&Date.now()-DAYS[d].at<TTL));
 if(!miss.length||loading||!S.db)return;
 const lo=miss[0],hi=miss[miss.length-1];loading=lo+'|'+hi;loadErr='';
 S.db.collection('entries').where('date','>=',lo).where('date','<=',hi).get().then(q=>{
  const by={},at=Date.now();entriesOf(q).forEach(e=>{(by[e.date]=by[e.date]||[]).push(e);});datesIn(lo,hi).forEach(d=>{DAYS[d]={rows:by[d]||[],at};});
  loading=null;ver++;if(S.tab==='rep')render();
 }).catch(e=>{loading=null;loadErr=errMsg(e);if(S.tab==='rep')render();});
}
function ensureSens(R){
 if(!window.SENS||!SENS.rpt)return;SENS.start();if(window.GSUI)GSUI.start();
 if(SENS.api.access()||(window.GSUI&&!GSUI.ready()))return;
 const key=R.pf+'|'+R.to;if(SN.key===key&&(SN.docs||SN.loading||SN.err))return;
 SN.key=key;SN.docs=null;SN.err='';SN.loading=true;const force=SN.force;SN.force=false;
 SENS.rpt.load(R.pf,R.to,force).then(d=>{if(SN.key!==key)return;SN.docs=d;SN.loading=false;ver++;if(S.tab==='rep')render();}).catch(e=>{if(SN.key!==key)return;SN.loading=false;SN.err=String(e&&e.message||e);if(S.tab==='rep')render();});
}
function refresh(){Object.keys(DAYS).forEach(k=>delete DAYS[k]);SN.key='';SN.docs=null;SN.err='';SN.force=true;memo={key:'',m:null};ver++;if(window.GSUI&&!GSUI.ready())GSUI.retryCare();render(true);}

/* ---------- النموذج: كل أرقام الصفحة مرة واحدة لكل تغيير في البيانات ---------- */
/* أي تغيير في تسجيلات اليوم أو الإعدادات أو الوصفات أو الدفعات أو القيود يعيد الحساب (كل لقطة من Firestore كائن جديد) */
const REF=new WeakMap();let refN=0;const rid=o=>{if(!o||typeof o!=='object')return 0;if(!REF.has(o))REF.set(o,++refN);return REF.get(o);};
function model(R,sec){
 const key=[R.from,R.to,sec,ver,S.dayLoaded?rid(S.entries):'-',rid(S.settings),rid(S.recipes),rid(S.openNotes),window.GSUI?GSUI.careKey():'',window.Farm&&Farm.cropReady()?rid(Farm.crops()):0,window.Farm&&Farm.ledgerReady&&Farm.ledgerReady()?rid(Farm.ledger()):0].join('|');
 if(memo.key===key)return memo.m;
 const X=ctx(sec),all=rowsIn(R.from,R.to),rows=all.filter(e=>secOf(e)===sec),pReady=datesIn(R.pf,R.pt).every(have);
 const C=compliance(rows,X,R.dates),Lm=limits(rows,X),cons=consumption(rows,X,R.n),m={R,sec,X,all,rows,C,L:Lm,cons,
  work:workers(rows,C),rev:reviewStats(rows,R.dates),daily:daily(rows,C,sec,X,R.dates),notes:notesOf(rows),prod:production(all,R),equip:equipment(all,R),
  sol:{ec:{found:sstat(series(rows,sec,'found','ec',X)),after:sstat(series(rows,sec,'after','ec',X)),fs:series(rows,sec,'found','ec',X),as:series(rows,sec,'after','ec',X)},
   ph:{found:sstat(series(rows,sec,'found','ph',X)),after:sstat(series(rows,sec,'after','ph',X)),fs:series(rows,sec,'found','ph',X),as:series(rows,sec,'after','ph',X)},wt:sstat(waterTemps(rows,sec,X))},
  zones:['air','rh','lux'].map(k=>zoneGrid(rows,k,sec,X)).filter(Boolean),sprays:rows.filter(r=>r.type==='spray'),photos:rows.filter(r=>r.type==='photo').length};
 m.money=money(R,m.prod.kg);
 if(pReady){const pr=rowsIn(R.pf,R.pt).filter(e=>secOf(e)===sec),pd=datesIn(R.pf,R.pt);if(pr.length)m.prev={C:compliance(pr,X,pd),L:limits(pr,X),cons:consumption(pr,X,pd.length),kg:production(rowsIn(R.pf,R.pt),{from:R.pf,to:R.pt}).kg,n:pd.length};}
 if(SN.docs&&SN.key===R.pf+'|'+R.to){
  const cur=sensorsOf(SN.docs,R.a,R.b,X.now),prv=sensorsOf(SN.docs,R.pa,R.pb,X.now),th=cur.filter(s=>s.th);
  const hours=Math.max(1/12,Math.max(0,...th.map(s=>s.hours)));m.sens={list:cur,prev:prv,th,out:th.length?houseOut(th):null,days:hours/24};
  m.sens.outDay=m.sens.out==null?null:m.sens.out/m.sens.days;
  const pth=(prv||[]).filter(s=>s.th);if(pth.length){const ph=Math.max(...pth.map(s=>s.hours));m.sens.prevOutDay=pth.every(s=>s.pct>=.7)&&th.every(s=>s.pct>=.7)?houseOut(pth)/(ph/24):null;}
 }
 m.att=attention(m);memo={key,m};return m;
}

/* ---------- ما يحتاج انتباهك: 3 إلى 5 جمل مرتبة بالخطورة، كل جملة تفتح قسمها ---------- */
function attention(m){
 const out=[],add=(tone,tab,html,rank)=>out.push({tone,tab,html,rank:rank||0}),C=m.C,R=m.R;
 if(C.need){const p=pc(C.ok,C.need),worst=Object.values(C.types).filter(t=>t.need).map(t=>Object.assign({p:t.ok/t.need},t)).sort((a,b)=>a.p-b.p)[0];
  if(p<90&&worst)add(p<70?'bad':'warn','comp',E(typeDef(worst.type,m.sec).short||typeDef(worst.type,m.sec).label)+': <b>'+worst.ok+' من '+worst.need+'</b> '+(worst.count?'مُنجزة':'جولة في موعدها')+(worst.dn&&!worst.count?'، ومتوسط التأخر <b>'+Math.round(worst.dl/worst.dn)+' دقيقة</b>':'')+'.'+(p<90?' الالتزام كله '+P(p)+'.':''),p<70?3:2);}
 if(m.sens){m.sens.th.forEach(s=>{const mx=s.t&&s.t.max;if(mx&&mx.st==='hi')add('bad','clim','حرارة الجو عند '+E(s.name)+' بلغت <b>'+L2R(f(mx.v,1)+'°')+'</b> '+E(whenTxt(mx.t,R))+' (الحد '+L2R(f(mx.lim[1],1)+'°')+')، وكانت ضمن الحد <b>'+P(pc(s.inT,1))+'</b> من الوقت.',3);
   else if(s.inT!=null&&s.inT<.85)add('warn','clim','الحرارة عند '+E(s.name)+' ضمن الحد <b>'+P(pc(s.inT,1))+'</b> من الوقت.',2);
   if(s.cond>0)add('bad','clim','تكثّف محتمل على الأوراق <b>'+hrs(s.cond)+' س</b> عند '+E(s.name)+' في '+Board.dN(s.condDays)+'. افحص الأوراق وحسّن التهوية ليلاً.',3);
   if(s.pct<.8)add('warn','equip','حساس '+E(s.name)+' غطّى <b>'+P(pc(s.pct,1))+'</b> من ساعات الفترة؛ أرقامه تقريبية.',1);});}
 const f0=m.sol.ec.found,fb=m.sol.ec.fs.filter(x=>x.key==='ec0'),fbBad=fb.filter(x=>isBad(x.st));
 if(fbBad.length)add('warn','sol','الأملاح قبل التعويض خارج الحد في <b>'+fbBad.length+' من '+fb.length+'</b> '+(fb.length===1?'تعويض':'تعويضات')+'، '+(fbBad.some(x=>x.st==='lo')?'أدناها <b>'+f(Math.min(...fbBad.map(x=>x.v)))+'</b>':'أعلاها <b>'+f(Math.max(...fbBad.map(x=>x.v)))+'</b>')+'.',2);
 else if(f0.bad)add('warn','sol','الأملاح كما وُجدت خارج الحد في <b>'+f0.bad+' من '+f0.jn+'</b> قراءة.',2);
 const air=m.L.by.air;if(air&&air.out&&!(m.sens&&m.sens.th.some(s=>s.t&&s.t.max&&s.t.max.st==='hi')))add(air.out>air.cells*.1?'bad':'warn','clim','حرارة الجو اليدوية خارج الحد في <b>'+air.out+' خانة</b> من '+air.cells+' (في '+air.outReadings+' من '+air.readings+' قراءة).',2);
 ['A','B'].forEach(tk=>{const x=m.cons.miss[tk];if(x.ml)add('warn','sol','<b>'+L2R(f(x.ml)+' مل')+'</b> من محلول '+tk+(m.cons.recFirst[tk]?' قبل '+E(DM(m.cons.recFirst[tk])):'')+' بلا وصفة مطابقة؛ لم تدخل في استهلاك السماد.',1);});
 if(m.rev.pend&&isSup())add('warn','comp','<b>'+m.rev.pend+'</b> '+(m.rev.pend===1?'تسجيل':'تسجيلات')+' بانتظار المراجعة في '+Board.dN(m.rev.days)+'.',0);
 if(m.notes.open)add('warn','prod','<b>'+m.notes.open+'</b> '+(m.notes.open===1?'ملاحظة مفتوحة':'ملاحظات مفتوحة')+' على النبات.',1);
 const rank={bad:0,warn:1,ok:2};out.sort((a,b)=>rank[a.tone]-rank[b.tone]||b.rank-a.rank);
 if(!out.length)out.push({tone:'ok',tab:'sum',html:'لا شيء يستدعي الانتباه في هذه الفترة.'});
 return out.slice(0,5);
}
function whenTxt(t,R){const d=todayStr(new Date(t));return (R.n<=7?fmtDate(d,{weekday:'long'}):DM(d))+' '+tsTime(t);}

/* ---------- العرض ---------- */
const TABS=[['sum','grid','الخلاصة'],['comp','clock','الالتزام'],['sol','flask','المحلول'],['clim','therm','المناخ'],['prod','sprout','الإنتاج'],['equip','wrench','المعدات']];
function card(ic,tone,title,body,link,id){return '<section class="bd-card"'+(id?' id="'+id+'"':'')+'><div class="bd-h"><span class="bd-hic '+(tone||'')+'">'+I(ic,18)+'</span><h2 class="bd-title">'+title+'</h2>'+(link||'')+'</div>'+body+'</section>';}
const link=(t,attrs)=>'<a href="#" class="bd-link" '+attrs+'>'+E(t)+I('chev',14,2.2)+'</a>';
const small=t=>' <small class="muted" style="font-size:12px;font-weight:500">'+t+'</small>';
function head(R,m){
 const dots={};if(m)m.att.forEach(a=>{if(a.tone==='ok'||a.tab==='sum')return;if(!dots[a.tab]||a.tone==='bad')dots[a.tab]=a.tone;});
 const sub=st.kind==='day'?(R.live?'اليوم · حتى '+fmtTime(nowTime()):'يوم مكتمل · المقارنة مع '+DM(R.pf)):(st.kind==='month'?(R.live?'هذا الشهر حتى الآن':'شهر كامل'):R.n+' أيام مكتملة')+(st.kind!=='day'?' · المقارنة مع '+rangeText(R.pf,R.pt):'');
 return '<header class="bd-page"><h1>التقارير</h1><p>'+E(SECS[S.sec].name)+' · كل رقم بتعريف واحد ومعه مصدره</p></header>'+
  '<div class="rc-seg rp-seg" role="tablist">'+[['day','اليوم'],['7','7 أيام'],['30','30 يوماً'],['month','شهر']].map(x=>'<button type="button" role="tab" data-rp="kind" data-v="'+x[0]+'" aria-selected="'+(st.kind===x[0])+'">'+x[1]+'</button>').join('')+'</div>'+
  '<div class="rp-range"><button type="button" data-rp="step" data-v="1" aria-label="الفترة السابقة">'+I('back',16,2.4)+'</button><div><b>'+E(st.kind==='month'?fmtDate(R.from,{month:'long',year:'numeric'}):rangeText(R.from,R.to))+'</b><small>'+E(sub)+'</small></div><button type="button" data-rp="step" data-v="-1" aria-label="الفترة التالية"'+(R.off>0?'':' disabled')+'>'+I('chev',16,2.4)+'</button></div>'+
  '<div class="rp-nav" role="tablist">'+TABS.map(x=>'<button type="button" role="tab" data-rp="tab" data-v="'+x[0]+'" aria-selected="'+(st.tab===x[0])+'">'+(dots[x[0]]&&st.tab!==x[0]?'<i class="'+dots[x[0]]+'"></i>':'')+I(x[1],18)+x[2]+'</button>').join('')+'</div>';
}
function view(){
 if(!isSup())return '<p class="bd-empty">التقارير للمشرف والمالك.</p>';
 const R=period(),sec=S.sec;ensure(R.from,R.to);ensureSens(R);
 const ready=datesIn(R.from,R.to).every(have);
 if(ready)ensure(R.pf,R.pt);
 if(!ready)return head(R,null)+(loadErr?'<p class="banner warn">'+E(loadErr)+' <button class="btn sm" type="button" data-rp="refresh">إعادة المحاولة</button></p>':'<p class="bd-empty">جارٍ تجهيز التقرير…</p>');
 let m;try{m=model(R,sec);}catch(e){logCrash(e,'حساب التقارير');return head(R,null)+crashHTML(e);}
 const body={sum:vSum,comp:vComp,sol:vSol,clim:vClim,prod:vProd,equip:vEquip}[st.tab]||vSum;
 return head(R,m)+body(m)+(st.tab!=='sum'?'':'')+'<p class="bd-foot" style="text-align:center;margin:4px 0 10px"><a href="#" data-rp="refresh">تحديث البيانات</a></p>';
}
function sensNote(){
 if(!window.SENS||!SENS.rpt)return '';const acc=SENS.api.access();
 if(acc)return '<p class="banner warn">'+E(acc)+'</p>';if(window.GSUI&&!GSUI.ready())return '<p class="bd-empty">جارٍ التحقق من فترات صيانة الحساسات…</p>';
 if(SN.err)return '<p class="banner warn">تعذّر قراءة الحساسات: '+E(SN.err)+' <button class="btn sm" type="button" data-rp="refresh">إعادة المحاولة</button></p>';
 return SN.loading||!SN.docs?'<p class="bd-empty">جارٍ قراءة الحساسات…</p>':'';
}
function kpi(tab,ic,lab,val,unit,sub,cmp,tone,cc){return '<button type="button" class="rp-kpi '+(tone||'')+'" data-rp="tab" data-v="'+tab+'"><span>'+I(ic,15,2)+E(lab)+'</span><b>'+val+(unit?' <small>'+unit+'</small>':'')+'</b><p>'+sub+'</p>'+(cmp?'<em class="'+(cc||'')+'">'+cmp+'</em>':'<em></em>')+'</button>';}
function dPts(a,b){if(a==null||b==null)return '';const d=a-b;return d===0?'دون تغيير عن الفترة السابقة':(d>0?'▲ ':'▼ ')+Math.abs(d)+' '+(Math.abs(d)===1?'نقطة':'نقاط')+' عن الفترة السابقة';}
function vSum(m){
 const C=m.C,R=m.R,p=pc(C.ok,C.need),lp=m.L.cells?pc(m.L.cells-m.L.out,m.L.cells):null,pv=m.prev,sec=m.sec,cons=m.cons,pr=m.prod;
 let h=card('bang','warn','ما يحتاج انتباهك','<div class="rp-att">'+m.att.map(a=>'<a href="#" data-rp="tab" data-v="'+a.tab+'"><i class="'+a.tone+'"></i><span>'+a.html+(a.tab!=='sum'?'<em>'+E((TABS.find(x=>x[0]===a.tab)||[])[2]||'')+'</em>':'')+'</span>'+(a.tab!=='sum'?I('chev',16,2):'')+'</a>').join('')+'</div>');
 const ks=[];
 ks.push(kpi('comp','clock','في موعده',p==null?'—':p,p==null?'':'%',C.need?'أُنجز '+C.done+' من '+C.need+' · '+P(pc(C.done,C.need)):'لا مواعيد مطلوبة في الفترة',pv&&pv.C.done?dPts(p,pc(pv.C.ok,pv.C.need)):'',p==null?'':p<70?'bad':p<90?'warn':'ok',pv&&pv.C.done&&p>=pc(pv.C.ok,pv.C.need)?'up':'down'));
 ks.push(kpi('sol','flask','القراءات ضمن الحد',lp==null?'—':lp,lp==null?'':'%',m.L.cells?m.L.out+' قيمة خارج الحد من '+f(m.L.cells):'لا قراءات يدوية',pv&&pv.L.cells?dPts(lp,pc(pv.L.cells-pv.L.out,pv.L.cells)):'',lp==null?'':lp<80?'bad':lp<95?'warn':'',pv&&pv.L.cells&&lp>=pc(pv.L.cells-pv.L.out,pv.L.cells)?'up':'down'));
 const so=m.sens;ks.push(kpi('clim','therm','المناخ خارج الحد',so&&so.outDay!=null?f(so.outDay,1):'—',so&&so.outDay!=null?'س/يوم':'',so?(so.th.length?'حرارة أو رطوبة · أي حساس':'لا حساسات حرارة في القسم'):sensNote()?'الحساسات غير متاحة الآن':'جارٍ قراءة الحساسات…',so&&so.prevOutDay!=null?'كان '+f(so.prevOutDay,1)+' س/يوم':'',so&&so.outDay!=null?(so.outDay>2?'bad':so.outDay>.5?'warn':'ok'):'',so&&so.prevOutDay!=null&&so.outDay<=so.prevOutDay?'up':'down'));
 if(sec==='t')ks.push(kpi('prod','basket','الحصاد',f(pr.kg,pr.kg<10?1:0),'كغ',pr.heads?f(pr.heads)+' رأس'+(pr.rejP!=null?' · المستبعد '+P(f(pr.rejP,0)):''):'لا حصاد مسجّل',pv&&R.k!=='month'&&R.k!=='day'&&pv.kg?(pr.kg>=pv.kg?'▲ ':'▼ ')+f(Math.abs(pr.kg-pv.kg),1)+' كغ':'','',pv&&pr.kg>=pv.kg?'up':'down'));
 else ks.push(kpi('prod','sprout','البذور',f(pr.seeds),'',(pr.germ!=null?'إنبات '+P(f(pr.germ,0))+' · ':'')+'نُقل '+f(pr.moved),'',''));
 const wDay=sec==='t'?cons.topup/R.n:cons.irr/R.n,wPrev=pv?(sec==='t'?pv.cons.topup:pv.cons.irr)/pv.n:null;
 ks.push(kpi('sol','drop',sec==='t'?'ماء التعويض':'محلول الري',f(wDay,wDay<10?1:0),'لتر/يوم',L2R('A '+f(cons.mlA)+' · B '+f(cons.mlB))+' مل',wPrev!=null&&R.k!=='day'?'كان '+f(wPrev,wPrev<10?1:0)+' لتر/يوم':''));
 ks.push(kpi('comp','edit','بانتظار المراجعة',String(m.rev.pend),'',m.rev.pend?Board.pl(m.rev.days,'يوم واحد','يومان','أيام','يوماً')+' فيها ما لم يُعتمد':'كل تسجيلات الفترة معتمدة','',m.rev.pend?'warn':'ok'));
 h+='<div class="rp-kpis">'+ks.join('')+'</div>';
 /* الملخص اليومي */
 const D=m.daily;
 h+='<details class="rp-how"><summary>'+I('cal',18)+'<span>الملخص اليومي</span>'+I('down',16,2)+'</summary><div class="rp-wrap"><table class="rp-tbl"><thead><tr><th>اليوم</th><th>المهام</th><th>في موعده</th><th>EC كما وُجد</th><th>pH</th><th>حرارة الجو</th><th>'+(sec==='t'?'ماء التعويض':'ري لتر')+'</th>'+(sec==='t'?'<th>حصاد كغ</th>':'<th>بذور</th>')+'<th>ملاحظات</th><th>بانتظار</th></tr></thead><tbody>'+
  D.map(r=>'<tr><td>'+E(fmtDate(r.d,{weekday:'short',day:'numeric'}))+(r.live?' <small style="color:var(--muted)">حتى الآن</small>':'')+'</td><td>'+(r.need?r.done+'/'+r.need:'—')+'</td><td>'+(r.need?r.ok:'—')+'</td><td class="'+(r.ecBad?'bad':'')+'">'+(r.ec==null?'—':f(r.ec))+'</td><td class="'+(r.phBad?'bad':'')+'">'+(r.ph==null?'—':f(r.ph,1))+'</td><td>'+(r.air==null?'—':f(r.air,1))+'</td><td>'+(r.water?f(r.water,r.water<10?1:0):'—')+(r.fill?' <small style="color:var(--muted)">+'+f(r.fill)+'</small>':'')+'</td><td>'+(sec==='t'?(r.kg?f(r.kg,1):'—'):(r.seeds?f(r.seeds):'—'))+'</td><td>'+r.notes+'</td><td>'+r.pend+'</td></tr>').join('')+
  '</tbody></table></div><p class="bd-foot" style="margin-bottom:12px">الوسيط لقراءات EC و pH «كما وُجد» · حرارة الجو اليدوية متوسط القراءات (ساعات العمل)'+(sec==='t'?' · «+» تعبئة خزان جديد':'')+'</p></details>';
 h+=card('history','gray','تصدير','<p class="bd-foot" style="margin-top:8px;font-size:12.5px">ملف Excel لـ'+E(SECS[sec].name)+': ورقة لكل نوع تسجيل، والملخص اليومي، والالتزام بالمواعيد (كل موعد)، والقراءات خارج الحد (بالخانة)، والاستهلاك، والعمال، والحساسات.</p><div class="rp-acts"><button class="pri" type="button" data-rp="xlsx">'+I('down',16,2.2)+'ملف Excel</button><button type="button" data-rp="print">'+I('list',16,2.2)+'طباعة PDF</button></div>');
 h+=howHTML();
 return h;
}
function howHTML(){
 return '<details class="rp-how"><summary>'+I('bang',18)+'<span>كيف تُحسب الأرقام؟</span>'+I('down',16,2)+'</summary><ul>'+
  '<li><b>الفترة:</b> 7 و30 يوماً أيام مكتملة بتوقيت الرياض. «اليوم» و«هذا الشهر» حتى الآن: تُحسب المواعيد التي مضت فقط، والمهام بلا مواعيد لا تدخل في نسبة اليوم الجاري.</li>'+
  '<li><b>في موعده:</b> لكل موعد في الجدول أقرب تسجيل من النوع نفسه خلال '+TOL+' دقيقة. كل يوم يُحسب بالجدول الذي كان سارياً فيه (يُحفظ كل تغيير منذ الإصدار 3.7.0؛ ما قبله بالجدول الحالي). «تجهيز خزان جديد» يُحتسب عن جولة «تعويض الخزان» في يومه، و«ماء فقط» لا. «سُجّل لاحقاً» = حُفظ بعد الوقت المكتوب بأكثر من '+TOL+' دقيقة.</li>'+
  '<li><b>ضمن الحد:</b> كل خانة على حدة (لا متوسط الشبكة)، بحد النهار أو الليل حسب وقت القراءة، ويشمل «قبل التعويض». حد الضوء اليدوي بين 9 ص و3 م فقط.</li>'+
  '<li><b>كما وُجد / بعد التدخل:</b> «كما وُجد» قراءات الخزان وقبل التعويض (ما عاشه النبات)'+(S.sec==='n'?' وقراءة المحلول قبل الري':'')+'. «بعد التدخل» بعد التعويض أو الخلط. الوسيط والأدنى والأعلى.</li>'+
  '<li><b>الاستهلاك:</b> ماء التعويض منفصل عن تعبئة الخزان الجديد. السماد من آخر وصفة حُفظت قبل وقت الخلط أو التعويض، وما لا وصفة له يُذكر ولا يُحسب.</li>'+
  '<li><b>الحساسات:</b> قراءات مصحَّحة بتعويض المعايرة، المتوسط موزون بالزمن (عيّنة كل 5 دقائق)، وتبقى آخر قراءة صالحة حتى ساعتين. التغطية = الساعات التي فيها قراءة ÷ ساعات الفترة التي مضت. فترات الصيانة مستبعدة. VPD «ضمن المثالي» على ساعات النهار.</li>'+
  '<li><b>المقارنة:</b> مع الفترة السابقة بالطول نفسه، وللحساسات فقط إن غطّت البيانات 70% من الفترتين.</li></ul></details>';
}
function vComp(m){
 const C=m.C,R=m.R,sec=m.sec;
 const dayCls=D=>D.live?'now':!D.need?'none':D.done>=D.need?'':D.need-D.done>2?'low':'part';
 let h=card('clock',C.need&&C.ok/C.need<.7?'warn':'','الالتزام بالمواعيد','<div class="rp-stats"><div><span>أُنجز</span><b>'+C.done+'<small>/'+C.need+'</small></b><em>'+P(pc(C.done,C.need))+'</em></div><div class="'+(C.need&&C.ok/C.need<.9?'warn':'ok')+'"><span>في موعده</span><b>'+C.ok+'</b><em>'+P(pc(C.ok,C.need))+'</em></div><div><span>سُجّل لاحقاً</span><b>'+C.later+'</b><em>'+(C.later===1?'جولة':'جولات')+'</em></div></div>'+
  '<div class="rp-days'+(R.n>14?' many':'')+'">'+C.days.map(D=>'<div title="'+E(D.d+' · '+D.done+'/'+D.need)+'"><i class="'+dayCls(D)+'"></i><small>'+(+D.d.slice(8))+'</small></div>').join('')+'</div>'+
  '<div class="rp-legend"><span><i></i>كاملة</span><span><i class="part"></i>ينقص جولة أو جولتان</span><span><i class="low"></i>ينقص أكثر</span>'+(R.live?'<span><i class="now"></i>اليوم حتى الآن</span>':'')+'</div>'+
  '<p class="bd-foot">مهلة «في موعده» ±'+TOL+' دقيقة. كل يوم بالجدول الساري فيه.'+(R.live&&C.days.length&&C.days[C.days.length-1].up?' اليوم: '+C.days[C.days.length-1].up+' مواعيد لم يحن وقتها بعد.':'')+'</p>');
 const rows=Object.values(C.types).filter(T=>T.need).map(T=>{const ty=typeDef(T.type,sec)||{label:T.type},ic=window.Rec?Rec.style(T.type):['list','gray'],r=T.ok/T.need,tone=r<.7?'bad':r<.9?'warn':'ok';
  return '<div class="rp-row"><span class="bd-hic sm '+(ic[1]||'')+'">'+I(ic[0],16)+'</span><b>'+E(ty.short||ty.label)+'</b><strong>'+T.done+'/'+T.need+'</strong><p><i><i class="'+tone+'" style="width:'+Math.round(r*100)+'%"></i></i><span>'+(T.count?'بدون مواعيد · أُنجز '+T.done:'في موعده <b class="'+(tone==='ok'?'':'tx-'+tone)+'">'+T.ok+'</b>'+(T.dn?' · تأخر '+Math.round(T.dl/T.dn)+' د':''))+'</span></p></div>';}).join('');
 h+=card('tasks','','حسب المهمة',rows?'<div class="rp-rows">'+rows+'</div><p class="bd-foot">'+L2R('X/Y')+': أُنجز من المطلوب · الشريط: ما سُجّل في موعده · التأخر: المتوسط عن الموعد للمنجز.</p>':'<p class="bd-empty">لا مواعيد مطلوبة في الفترة.</p>');
 const ws=m.work;
 h+=card('users','purple','الفريق',ws.length?'<div class="rp-rows">'+ws.map((w,i)=>{const nmx=nameOf(w.id)||'—';return '<div class="rp-row"><span class="bd-av av-c'+(Math.abs([...String(w.id)].reduce((n,c)=>n+c.charCodeAt(0),0))%6)+'" style="width:30px;height:30px;font-size:13px">'+E(nmx.slice(0,1))+'</span><b>'+E(nmx)+'</b><strong>'+w.rounds+' '+(w.rounds===1?'جولة':'جولة')+'</strong><p>في موعده '+P(pc(w.ok,w.rounds))+' · بتاريخ سابق '+w.prior+' · أُعيد للتصحيح '+w.flag+'</p></div>';}).join('')+'</div><p class="bd-foot">الجولة = تسجيل مهمة (التسجيل المقسوم على جهتين جولة واحدة). «بتاريخ سابق» = حُفظ في يوم بعد تاريخه.</p>':'<p class="bd-empty">لا تسجيلات في الفترة.</p>');
 const rv=m.rev;
 h+=card('edit','gold','المراجعة','<div class="rp-stats"><div class="'+(rv.pend?'warn':'ok')+'"><span>بانتظار المراجعة</span><b>'+rv.pend+'</b></div><div class="'+(rv.flag?'bad':'')+'"><span>أُعيد للتصحيح</span><b>'+rv.flag+'</b></div><div class="'+(rv.days?'warn':'')+'"><span>أيام فيها ما لم يُعتمد</span><b>'+rv.days+'<small>/'+rv.of+'</small></b></div></div>'+(rv.wait!=null?'<p class="bd-foot">الوقت المعتاد حتى الاعتماد (الوسيط): '+(rv.wait<1?'أقل من ساعة':hrs(rv.wait)+' ساعة')+'.</p>':'')+(rv.pend?'<div class="rp-acts" style="grid-template-columns:1fr"><button type="button" data-bd="queue" data-k="pending">مراجعة سريعة</button></div>':''));
 return h;
}
/* رسم بخطين ونطاق الحد: أكثر من يوم = وسيط كل يوم، ويوم واحد = كل قراءة بوقتها */
function chart(fs,as,c,R,dec){
 const one=R.n===1,L=lim(c,S.sec,null),key=x=>one?tMin(x.t||'12:00'):R.dates.indexOf(x.d);
 const agg=list=>{if(one)return list.map(x=>({x:key(x),y:x.v}));const by={};list.forEach(x=>{(by[x.d]=by[x.d]||[]).push(x.v);});return Object.keys(by).map(d=>({x:R.dates.indexOf(d),y:median(by[d])}));};
 const A=agg(fs).filter(p=>p.x>=0),B=agg(as).filter(p=>p.x>=0),ys=A.concat(B).map(p=>p.y).concat([L[0],L[1]].filter(x=>x!=null));if(A.length+B.length<2)return '';
 let lo=Math.min(...ys),hi=Math.max(...ys);const pad=(hi-lo)*.12||1;lo-=pad;hi+=pad;
 const xs=A.concat(B).map(p=>p.x),x0=one?Math.min(...xs):0,x1=one?Math.max(...xs):Math.max(1,R.n-1),W=340,H=130,X=x=>34+(x1>x0?(x-x0)/(x1-x0):.5)*(W-44),Y=y=>8+(hi-y)/(hi-lo)*(H-30);
 const line=(P2,col)=>{const s=P2.slice().sort((a,b)=>a.x-b.x);return '<path d="'+s.map((p,i)=>(i?'L':'M')+X(p.x).toFixed(1)+' '+Y(p.y).toFixed(1)).join(' ')+'" fill="none" stroke="'+col+'" stroke-width="2.2" stroke-linejoin="round"/>'+s.map(p=>'<circle cx="'+X(p.x).toFixed(1)+'" cy="'+Y(p.y).toFixed(1)+'" r="2.6" fill="'+col+'"/>').join('');};
 let g='';if(L[0]!=null&&L[1]!=null)g+='<rect x="30" y="'+Y(Math.min(hi,L[1])).toFixed(1)+'" width="'+(W-34)+'" height="'+Math.max(0,Y(Math.max(lo,L[0]))-Y(Math.min(hi,L[1]))).toFixed(1)+'" fill="var(--band)"/>';
 [L[0],L[1]].forEach(v=>{if(v!=null&&v>lo&&v<hi)g+='<text x="0" y="'+(Y(v)+3).toFixed(1)+'">'+f(v,dec)+'</text>';});
 const labs=one?[x0,(x0+x1)/2,x1].map(x=>[x,fmtTime(String(Math.floor(x/60)).padStart(2,'0')+':'+String(Math.round(x%60)).padStart(2,'0'))]):R.dates.map((d,i)=>[i,+d.slice(8)]).filter((x,i,a)=>a.length<=10||i%Math.ceil(a.length/8)===0||i===a.length-1);
 g+=labs.map(x=>'<text x="'+X(x[0]).toFixed(1)+'" y="'+(H-4)+'" text-anchor="middle">'+x[1]+'</text>').join('');
 return '<svg class="rp-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="رسم القراءات">'+g+line(B,'var(--accent)')+line(A,'var(--chart2)')+'</svg>';
}
function twoBox(s,dec){
 const b=(x,lab)=>'<b>'+(x.med==null?'—':f(x.med,dec))+'</b><p>'+(x.n?'الوسيط · '+Board.pl(x.n,'قراءة واحدة','قراءتان','قراءات','قراءة'):'لا قراءات في الفترة')+'</p>'+(x.n?'<p>الأدنى <span class="'+(x.min&&isBad(x.min.st)?'tx-bad':'')+'">'+f(x.min.v,dec)+'</span> · الأعلى <span class="'+(x.max&&isBad(x.max.st)?'tx-bad':'')+'">'+f(x.max.v,dec)+'</span></p><p>ضمن الحد <b style="font-size:13px">'+P(pc(x.ok,x.jn))+'</b>'+(x.jn&&x.ok<x.jn?' ('+x.ok+' من '+x.jn+')':'')+'</p>':'');
 return '<div class="rp-two"><div><h3><i></i>كما وُجد</h3>'+b(s.found)+'</div><div class="b"><h3><i></i>بعد التدخل</h3>'+b(s.after)+'</div></div>';
}
function vSol(m){
 const sec=m.sec,R=m.R,L=c=>{const x=lim(c,sec,null);return x[0]!=null&&x[1]!=null?'الحد '+f(x[0],c==='ph'?1:0)+' – '+f(x[1],c==='ph'?1:0)+'.':'';};
 let h=card('flask','','الأملاح EC'+small('µS/cm'),twoBox(m.sol.ec,0)+chart(m.sol.ec.fs,m.sol.ec.as,'ec',R,0)+'<p class="bd-foot">«كما وُجد»: '+(sec==='t'?'قراءات «أملاح و pH» و«قبل التعويض»':'قراءة المحلول قبل الري')+'. «بعد التدخل»: '+(sec==='t'?'بعد التعويض أو تجهيز خزان جديد':'بعد الخلط')+'. '+L('ec')+'</p>');
 h+=card('flask','teal','pH',twoBox(m.sol.ph,1)+chart(m.sol.ph.fs,m.sol.ph.as,'ph',R,1)+'<p class="bd-foot">'+L('ph')+'</p>');
 const w=m.sol.wt;h+=card('therm','info','حرارة الماء',w.n?'<div class="rp-stats"><div><span>الوسيط</span><b>'+L2R(f(w.med,1)+'°')+'</b></div><div><span>الأدنى – الأعلى</span><b style="font-size:16px">'+L2R(f(w.min.v,1)+' – '+f(w.max.v,1)+'°')+'</b></div><div class="'+(w.bad?'warn':'ok')+'"><span>ضمن الحد</span><b>'+P(pc(w.ok,w.jn))+'</b><em>'+w.ok+' من '+w.jn+'</em></div></div>':'<p class="bd-empty">لا قراءات لحرارة الماء.</p>');
 /* حساس الخزان إن وُجد */
 if(m.sens){const ws=m.sens.list.filter(s=>s.group==='water'&&!s.th);ws.forEach(s=>{const ks=Object.values(s.kinds);if(!ks.length)return;h+=card('radio','info',E(s.name)+small('حساس'),'<div class="rp-kv">'+ks.map(k=>'<div><span>'+E(k.l)+'<small>تغطية '+P(pc(k.pct,1))+'</small></span><b>'+(k.avg==null?'—':L2R(f(k.avg,k.d)+' '+E(k.u)))+(k.min?' <small>'+L2R(f(k.min.v,k.d)+' – '+f(k.max.v,k.d))+'</small>':'')+'</b></div>').join('')+'</div>');});}
 const c=m.cons;
 h+=card('drop','info','الاستهلاك','<div class="rp-kv">'+(sec==='t'?
  '<div><span>ماء التعويض<small>'+Board.pl(c.topupN,'تعويض واحد','تعويضان','تعويضات','تعويضاً')+(c.woN?' + ماء فقط '+c.woN:'')+'</small></span><b>'+f(c.topup)+' <small>لتر · '+f(c.topup/R.n,1)+' لتر/يوم</small></b></div>'+
  '<div><span>تعبئة خزان جديد<small>'+(c.fillN?E(c.fillDates.map(d=>fmtDate(d,{weekday:'long',day:'numeric'})).join('، ')):'لا تعبئة في الفترة')+'</small></span><b>'+c.fillN+' <small>'+(c.fillN?'مرة · '+f(c.fill)+' لتر':'')+'</small></b></div>':
  '<div><span>محلول الري<small>'+Board.pl(c.irrN,'رية واحدة','ريتان','ريات','رية')+'</small></span><b>'+f(c.irr,1)+' <small>لتر · '+f(c.irr/R.n,1)+' لتر/يوم</small></b></div>'+
  '<div><span>ماء الخلط<small>'+Board.pl(c.fillN,'خلطة واحدة','خلطتان','خلطات','خلطة')+'</small></span><b>'+f(c.fill)+' <small>لتر</small></b></div>')+
  '<div><span>محلول A</span><b>'+f(c.mlA)+' <small>مل</small></b></div><div><span>محلول B</span><b>'+f(c.mlB)+' <small>مل</small></b></div><div><span>خافض pH / رافع pH</span><b>'+L2R(f(c.down)+' / '+f(c.up))+' <small>مل</small></b></div></div>');
 const per=Object.keys(c.per).map(k=>[k,c.per[k]]).sort((a,b)=>b[1]-a[1]),miss=['A','B'].filter(tk=>c.miss[tk].ml);
 h+=card('coins','gold','السماد التقديري',(per.length?'<div class="rp-kv">'+per.map(p=>{const n=p[0].split('|'),g=p[1];return '<div><span>'+E(n[0])+'</span><b>'+(g>=1000?f(g/1000,2)+' <small>'+(n[1]==='غ'?'كغ':'لتر')+'</small>':f(g,g<10?1:0)+' <small>'+(n[1]==='غ'?'غ':'مل')+'</small>')+'</b></div>';}).join('')+'</div>':'<p class="bd-empty">'+(c.mlA||c.mlB?'لا وصفة مطابقة لكميات الفترة.':'لا خلط ولا تعويض بسماد في الفترة.')+'</p>')+
  (miss.length?'<p class="rp-note">'+miss.map(tk=>L2R(f(c.miss[tk].ml)+' مل')+' من '+tk).join(' و')+' بلا وصفة مطابقة'+(miss.some(tk=>c.recFirst[tk])?' (قبل أول وصفة: '+miss.filter(tk=>c.recFirst[tk]).map(tk=>tk+' '+E(DM(c.recFirst[tk]))).join('، ')+')':'')+'؛ لم تُحسب أعلاه. سجّل وصفة بتاريخ أقدم ليُحسب استهلاكها.</p>':'')+'<p class="bd-foot">الوصفة تُختار بتاريخ ووقت التسجيل: آخر وصفة حُفظت قبل الخلط أو التعويض.</p>');
 return h;
}
function extTxt(x,R,dec){return x?L2R(f(x.v,dec)+'°')+' <small>'+E(whenTxt(x.t,R))+'</small>':'—';}
function vClim(m){
 const R=m.R,sn=sensNote();let h='';
 if(!m.sens)h+=sn||'<p class="bd-empty">لا حساسات في هذا القسم.</p>';
 else{
  if(!m.sens.th.length)h+='<p class="bd-empty">لا حساسات حرارة ورطوبة في '+E(SECS[m.sec].name)+'.</p>';
  m.sens.th.forEach(s=>{
   const pv=(m.sens.prev||[]).find(x=>x.id===s.id),ok=cmpOk(s,pv),cov=pc(s.pct,1),tl=s.tLim||[[],[]];
   let b='<div class="rp-stats"><div><span>متوسط 24 ساعة</span><b>'+(s.tAvg==null?'—':L2R(f(s.tAvg,1)+'°'))+'</b></div><div><span>نهاراً</span><b>'+(s.tDay==null?'—':L2R(f(s.tDay,1)+'°'))+'</b></div><div><span>ليلاً</span><b>'+(s.tNight==null?'—':L2R(f(s.tNight,1)+'°'))+'</b></div></div>';
   b+='<div class="rp-kv"><div><span>الأدنى</span><b class="'+(s.t&&s.t.min&&isBad(s.t.min.st)?'bad':'')+'">'+extTxt(s.t&&s.t.min,R,1)+'</b></div><div><span>الأعلى</span><b class="'+(s.t&&s.t.max&&isBad(s.t.max.st)?'bad':'')+'">'+extTxt(s.t&&s.t.max,R,1)+'</b></div>'+
    '<div><span>الحرارة ضمن الحد<small>'+dnTxt('air',S.sec,'°')+'</small></span><b class="'+(s.inT!=null&&s.inT<.85?'warn':'')+'">'+P(s.inT==null?null:pc(s.inT,1))+'</b></div><div><span>الرطوبة ضمن الحد</span><b>'+P(s.inH==null?null:pc(s.inH,1))+'</b></div>'+
    (s.vDay!=null?'<div><span>VPD نهاراً<small>ضمن المثالي '+L2R(f(s.vMin,1)+'–'+f(s.vMax,1))+' kPa</small></span><b class="'+(s.vIn<.6?'warn':'')+'">'+f(s.vDay,2)+' <small>kPa · '+P(pc(s.vIn,1))+' من النهار</small></b></div>':'')+
    '<div><span>الإجهاد الحراري<small>فوق '+L2R(f(s.heatAt,0)+'°')+'</small></span><b class="'+(s.heatDay>=1?'bad':s.heatDay>=.25?'warn':'')+'">'+hrs(s.heatDay)+' <small>س/يوم'+(R.n>1?' · '+hrs(s.heat)+' س في الفترة':'')+'</small></b></div>'+
    (s.hasDew||s.cond!=null?'<div><span>تكثّف محتمل على الأوراق<small>هامش الندى ≤ '+L2R(f(s.condGap,1)+'°')+'</small></span><b class="'+(s.cond>0?'bad':'ok')+'">'+(s.cond>0?hrs(s.cond)+' <small>س في '+Board.dN(s.condDays)+'</small>':'لا يوجد')+'</b></div>':'')+
    '<div><span>خطر الأمراض الفطرية</span><b class="'+(s.riskDay>=6?'bad':s.riskDay>=2?'warn':'')+'">'+hrs(s.riskDay)+' <small>س/يوم</small></b></div>'+
    (s.minMg?'<div><span>أقل هامش ندى</span><b>'+L2R(f(s.minMg.v,1)+'°')+' <small>'+E(whenTxt(s.minMg.t,R))+'</small></b></div>':'')+'</div>';
   if(ok&&s.tAvg!=null&&pv.tAvg!=null){const d=s.tAvg-pv.tAvg;b+='<p class="rp-cmp">مقارنة بـ'+E(rangeText(R.pf,R.pt))+': المتوسط '+(Math.abs(d)<.05?'دون تغيير':'<b class="'+(d>0?'up':'down')+'">'+(d>0?'▲ ':'▼ ')+L2R(f(Math.abs(d),1)+'°')+'</b>')+(pv.inT!=null?' · ضمن الحد كان '+P(pc(pv.inT,1)):'')+'</p>';}
   else if(pv&&pv.pct<.7)b+='<p class="rp-note n">المقارنة غير موثوقة: تغطية الفترة السابقة '+P(pc(pv.pct,1))+'.'+(s.pct<.8?' والأرقام تقريبية (تغطية هذه الفترة '+P(cov)+').':'')+'</p>';
   else if(s.pct<.8)b+='<p class="rp-note n">الأرقام تقريبية: تغطية هذه الفترة '+P(cov)+'.</p>';
   h+='<section class="bd-card"><div class="bd-h"><span class="bd-hic">'+I('radio',18)+'</span><h2 class="bd-title"><span class="rp-sens"><i style="background:'+E(s.col)+'"></i>'+E(s.name)+'</span></h2><span class="rp-cov '+(s.pct<.7?'bad':s.pct<.9?'warn':'')+'">تغطية '+P(cov)+'</span></div>'+b+'</section>';
  });
 }
 /* القياس اليدوي */
 const zs=m.zones,air=zs.find(z=>z.m==='air');
 if(zs.length){
  let b='';
  if(air){const D=air.D,rev=m.sec==='t';const rowsIdx=D.cols.map((c,i)=>i);if(rev)rowsIdx.reverse();
   b+='<p class="bd-foot" style="margin-top:6px;font-size:12.5px">حرارة الجو · متوسط كل خانة على '+Board.pl(air.readings,'قراءة واحدة','قراءتين','قراءات','قراءة')+' (ساعات العمل)</p><table class="rp-zone"><thead><tr><th></th>'+D.rowL.map(l=>'<th>'+E(l)+'</th>').join('')+'</tr></thead><tbody>'+
    rowsIdx.map(ci=>'<tr><th>'+E(D.colL[ci])+'</th>'+D.rows.map((r,ri)=>{const c=air.cell[ri][ci];return '<td class="'+(c.out?'bad':'')+'">'+(c.v==null?'—':f(c.v,1))+(c.out?'<small>'+c.out+' خارج</small>':'')+'</td>';}).join('')+'</tr>').join('')+'</tbody></table><p class="bd-foot">متوسط '+E(D.all)+' '+L2R(f(air.all,1)+'°')+' من كل الخانات (لا متوسط المتوسطات).</p>';}
  b+='<div class="rp-kv">'+zs.map(z=>'<div><span>'+E(LIM_L[z.m])+' · خانات خارج الحد</span><b class="'+(z.out?'bad':'')+'">'+z.out+' <small>من '+f(z.cells)+(z.out?' · في '+z.outR+' من '+z.readings+' قراءة':'')+'</small></b></div>').join('');
  if(m.sens){const rows=m.rows.filter(e=>e.type==='temp');m.sens.th.forEach(s=>{const sx=window.SENS&&SENS.api.list().find(q=>q.id===s.id),d=sx?SENS.rpt.diff(sx,SN.docs,rows,'temp'):null;if(d)b+='<div><span>فرق الحساس عن اليدوي<small>'+E(s.name)+' مقابل نفس الموقع والوقت</small></span><b>'+L2R((d.avg>0?'+':'')+f(d.avg,1)+'°')+' <small>'+Board.pl(d.n,'قراءة واحدة','قراءتان','قراءات','قراءة')+'</small></b></div>';});}
  b+='</div>';
  if(zs.some(z=>z.m==='lux'))b+='<p class="bd-foot">حد الضوء يُطبَّق بين 9 ص و3 م فقط.</p>';
  h+=card('therm',air&&air.out?'warn':'','القياس اليدوي',b);
 }
 return h;
}
function vProd(m){
 const p=m.prod,R=m.R,mx=Math.max(p.seeds,p.counted,p.moved,p.heads,1),w=x=>Math.max(x?2:0,Math.round(x/mx*100));
 let h=card('layers','','مسار الفترة','<div class="cy-fun"><div'+(p.seeds?'':' class="dim"')+'><span>بذور</span><i style="width:'+w(p.seeds)+'%"></i><b>'+f(p.seeds)+'</b></div>'+
  '<div'+(p.counted?'':' class="dim"')+'><span>شتلات معدودة</span><i style="width:'+w(p.counted)+'%"></i><b>'+f(p.counted)+'</b>'+(p.germ!=null?'<em>إنبات '+P(f(p.germ,0))+'</em>':'')+'</div>'+
  '<div'+(p.moved?'':' class="dim"')+'><span>منقولة للأبراج</span><i class="t" style="width:'+w(p.moved)+'%"></i><b>'+f(p.moved)+'</b></div>'+
  '<div'+(p.heads||p.kg?'':' class="dim"')+'><span>محصودة</span><i class="g" style="width:'+w(p.heads)+'%"></i><b>'+(p.heads?f(p.heads):'—')+'</b>'+(p.kg?'<em>'+E(f(p.kg,1)+' كغ'+(p.headG?' · متوسط الرأس '+f(p.headG)+' غ':'')+(p.rejP!=null?' · المستبعد '+f(p.rejP,0)+'%':''))+'</em>':'')+'</div></div><p class="bd-foot">تسجيلات الفترة نفسها من المشتل والأبراج. الإنبات = آخر عدّ ÷ بذور الدفعات التي عُدّت في الفترة.</p>');
 const B=p.batches;
 if(B)h+=card('sprout','green','الدفعات','<div class="rp-stats"><div class="'+(B.ready.length?'warn':'')+'"><span>جاهزة للنقل الآن</span><b>'+B.ready.length+'</b></div><div class="'+(B.late.length?'bad':'')+'"><span>تأخر حصادها</span><b>'+B.late.length+'</b></div><div class="'+(B.closed.length?'ok':'')+'"><span>أُقفلت في الفترة</span><b>'+B.closed.length+'</b></div></div>'+
  (B.closed.length?'<div class="rp-kv">'+B.closed.map(b=>'<div><span>'+E(b.crop+(b.side?' · '+b.side:''))+'<small>أُقفلت '+E(DM(b.final.date))+' · '+Board.dN(daysBetween(b.date,b.final.date))+'</small></span><b>'+f(b.kg,b.kg<10?1:0)+' <small>كغ'+(b.heads?' · '+f(b.heads&&b.saleable!=null?(b.heads-b.saleable)/b.heads*100:0,1)+'% مستبعد':'')+'</small></b></div>').join('')+'</div>':''),link('دورة الزراعة','data-farm="route" data-id="crop"'));
 if(m.money){const M=m.money;h+=card('coins','gold','التكلفة والمبيعات'+small('للمالك'),'<div class="rp-stats four"><div><span>التكاليف</span><b>'+f(M.cost)+'</b><em>ريال</em></div><div><span>المبيعات</span><b>'+f(M.sales)+'</b><em>ريال</em></div><div class="'+(M.margin>0?'ok':M.margin<0?'bad':'')+'"><span>الهامش</span><b>'+L2R((M.margin>0?'+':M.margin<0?'−':'')+f(Math.abs(M.margin)))+'</b><em>ريال</em></div><div><span>تكلفة الكيلو</span><b>'+(M.perKg==null?'—':f(M.perKg,1))+'</b><em>ريال</em></div></div><p class="bd-foot">قيود الفترة · تكلفة الكيلو = تكاليف الفترة ÷ الوزن المحصود فيها.</p>');}
 const N=m.notes,sp=m.sprays,phi=window.sprayPlan?sprayPlan(m.sec).phi:[];
 h+=card('leaf',N.open?'warn':'green','ملاحظات النبات',(N.list.length?'<div class="rp-kv">'+N.list.map(x=>{const sv=Object.keys(x.sev).sort((a,b)=>x.sev[b]-x.sev[a])[0];return '<div><span>'+E(x.k)+'</span><b>'+x.n+' <small>· '+(x.open?'مفتوحة '+x.open:'محلولة')+(sv?' · '+E(sv):'')+'</small></b></div>';}).join('')+'</div>':'<p class="bd-empty">لا ملاحظات على النبات في الفترة.</p>')+
  '<div class="rp-chips"><span>الرش <b>'+sp.length+'</b></span>'+(sp.length?'<span>آخره '+E(DM(sp.map(e=>e.date).sort().pop()))+'</span>':'')+phi.map(x=>'<span class="warn">فترة أمان حتى '+E(DM(x.until))+'</span>').join('')+'<span>صور النمو <b>'+m.photos+'</b></span></div>');
 return h;
}
function vEquip(m){
 const R=m.R,sn=sensNote();let h='';
 if(!m.sens)h+=card('radio','info','صحة الحساسات',sn||'<p class="bd-empty">لا حساسات.</p>');
 else{
  const list=m.sens.list;
  h+=card('radio','info','صحة الحساسات',(list.length?'<div class="rp-rows">'+list.map(s=>{const cov=pc(s.pct,1),tone=s.pct>=.9?'ok':s.pct>=.7?'warn':'bad';return '<div class="rp-row"><span class="bd-hic sm gray">'+I('radio',16)+'</span><b><span class="rp-sens"><i style="background:'+E(s.col)+'"></i>'+E(s.name)+'</span></b><strong>'+P(cov)+'</strong><p><i><i class="'+tone+'" style="width:'+cov+'%"></i></i><span>'+(s.gaps.n?Board.pl(s.gaps.n,'انقطاع واحد','انقطاعان','انقطاعات','انقطاعاً')+(s.gaps.n>1?' أطولها ':' ')+hrs(s.gaps.longest)+' س':'لا انقطاعات')+(s.batt!=null?' · بطارية <span class="'+(s.batt<20?'tx-bad':'')+'">'+P(f(s.batt))+'</span>':'')+'</span></p></div>';}).join('')+'</div>':'<p class="bd-empty">لا حساسات في هذا القسم.</p>')+
   (m.equip.care.length?'<p class="rp-note n">صيانة مستبعدة من الحساب: '+m.equip.care.map(e=>{const s=SENS.api.list().find(x=>x.id===e.v.deviceId);return E((s?SENS.api.name(s):'حساس')+'، '+DM(todayStr(new Date(+e.v.start)))+' '+tsTime(+e.v.start)+(e.v.end?' – '+tsTime(+e.v.end):' (مفتوحة)'));}).join(' · ')+'.</p>':'')+
   '<p class="bd-foot">الانقطاع = فترة بلا قراءة صالحة بعد مهلة الساعتين. التغطية من ساعات الفترة التي مضت.</p><div class="rp-acts"><button type="button" data-rp="csv">'+I('down',16,2.2)+'تصدير CSV</button><button type="button" data-ux="monitor" data-group="all">'+I('radio',16,2.2)+'المراقبة</button></div>');
 }
 const q=m.equip,last=e=>e?E(fmtDate(e.date,{weekday:'long',day:'numeric'})):'';
 h+=card('wrench',q.gN&&q.gOk<q.gN?'warn':'','المعدات في الفترة','<div class="rp-kv">'+
  (m.sec==='t'?'<div><span>فحص المضخة<small>'+(q.pump?(q.pumpOk===q.pump?'تعمل بشكل طبيعي في كل الفحوص':'طبيعية في '+q.pumpOk+' من '+q.pump):'لا فحوص')+'</small></span><b class="'+(q.pump&&q.pumpOk<q.pump?'warn':'')+'">'+q.pump+' <small>'+(q.pump===1?'فحص':'فحوص')+'</small></b></div>'+
   (q.gN?'<div><span>ضغط العدادات<small>على علامة المرجع</small></span><b class="'+(q.gOk<q.gN?'warn':'')+'">'+q.gOk+' <small>من '+q.gN+' قراءة</small></b></div>':''):'')+
  '<div><span>شحن بطارية المضخة</span><b>'+q.batt+' <small>'+(q.battLast?'· آخره '+last(q.battLast):'')+'</small></b></div>'+
  '<div><span>معايرة جهاز EC/pH</span><b>'+q.cal+' <small>'+(q.calLast?'· '+last(q.calLast)+(q.calLast.v&&q.calLast.v.result?' · '+E(q.calLast.v.result):''):'')+'</small></b></div>'+
  '<div><span>صيانة المعدات</span><b>'+q.svc.length+' <small>'+E(q.svc.slice(0,2).map(x=>x.kind||x.name||'').filter(Boolean).join('، '))+'</small></b></div></div>');
 return h;
}

/* ---------- التصدير ---------- */
function exportXlsx(btn){
 const R=period(),m=memo.m;if(!window.XLSX||!m){toast('التصدير غير متاح الآن، تحقق من الإنترنت');return;}
 btn.disabled=true;
 try{
  const sec=m.sec,rows=m.rows,wb=XLSX.utils.book_new(),names={};wb.Workbook={Views:[{RTL:true}]};
  const add=(name,aoa)=>{name=name.slice(0,31);if(names[name])name=name.slice(0,28)+' '+(++names[name]);names[name]=1;const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!cols']=aoa[0].map((_,i)=>({wch:Math.min(40,Math.max(10,...aoa.map(r=>String(r[i]==null?'':r[i]).length+2)))}));XLSX.utils.book_append_sheet(wb,ws,name);};
  const r1=(x,d)=>x==null||!isFinite(x)?'':+(+x).toFixed(d);
  add('الملخص اليومي',[['التاريخ','المطلوب','المنجز','في موعده','EC كما وُجد (الوسيط)','pH كما وُجد (الوسيط)','حرارة الجو اليدوية',sec==='t'?'ماء التعويض (لتر)':'محلول الري (لتر)','تعبئة خزان جديد / خلط (لتر)',sec==='t'?'حصاد كغ':'بذور','ملاحظات','بانتظار المراجعة']].concat(m.daily.map(r=>[r.d,r.need,r.done,r.ok,r1(r.ec,0),r1(r.ph,2),r1(r.air,1),r1(r.water,1),r1(r.fill,0),sec==='t'?r1(r.kg,1):r.seeds,r.notes,r.pend])));
  add('الالتزام بالمواعيد',[['التاريخ','المهمة','الموعد','وقت التسجيل','الفرق (دقيقة)','الحالة','سُجّل لاحقاً','المسجّل']].concat(m.C.slots.filter(s=>s.state!=='next'&&s.state!=='due').map(s=>[s.d,(typeDef(s.type,sec)||{label:s.type}).label,s.t?fmtTime(s.t):'بدون موعد',s.e?fmtTime(s.e.time):'',s.dl==null?'':s.dl,s.state==='ok'?'في موعده':s.state==='late'?'متأخر':'لم يُسجَّل',s.later?'نعم':'',s.e?nameOf(s.e.by):''])));
  add('حسب المهمة',[['المهمة','المطلوب','المنجز','في موعده','في موعده %','متوسط التأخر (دقيقة)','سُجّل لاحقاً']].concat(Object.values(m.C.types).filter(T=>T.need).map(T=>[(typeDef(T.type,sec)||{label:T.type}).label,T.need,T.done,T.ok,pc(T.ok,T.need),T.dn?Math.round(T.dl/T.dn):'',T.later])));
  const bad=[];m.L.list.forEach(x=>x.bad.forEach(c=>bad.push([c.e.date,fmtTime(c.e.time),(typeDef(c.e.type,sec)||{}).label||c.e.type,c.l,c.cell||'',c.v,c.st==='lo'?'أقل من الحد':'أعلى من الحد',rangeTxt(c.c,sec,c.e.time),nameOf(c.e.by)])));
  add('خارج الحد (بالخانة)',[['التاريخ','الوقت','النوع','القياس','الخانة','القيمة','الحالة','الحد','المسجّل']].concat(bad.sort((a,b)=>(a[0]+a[1]).localeCompare(b[0]+b[1]))));
  add('الحدود',[['القياس','القيم المحكومة','خارج الحد','أقل','أعلى','ضمن الحد %','قراءات فيها قيمة خارج الحد','القراءات','الأدنى','الأعلى']].concat(m.L.list.map(x=>[x.l,x.cells,x.out,x.lo,x.hi,pc(x.cells-x.out,x.cells),x.outReadings,x.readings,x.min?x.min.v:'',x.max?x.max.v:''])));
  const sol=(lab,s,dec)=>[lab,s.n,r1(s.med,dec),s.min?s.min.v:'',s.max?s.max.v:'',pc(s.ok,s.jn)];
  add('المحلول',[['السلسلة','القراءات','الوسيط','الأدنى','الأعلى','ضمن الحد %']].concat([sol('EC كما وُجد',m.sol.ec.found,0),sol('EC بعد التدخل',m.sol.ec.after,0),sol('pH كما وُجد',m.sol.ph.found,2),sol('pH بعد التدخل',m.sol.ph.after,2),sol('حرارة الماء',m.sol.wt,1)]));
  const c=m.cons;add('الاستهلاك',[['البند','الكمية','الوحدة']].concat([[sec==='t'?'ماء التعويض':'محلول الري',sec==='t'?c.topup:r1(c.irr,1),'لتر'],[sec==='t'?'تعبئة خزان جديد':'ماء الخلط',c.fill,'لتر'],['محلول A',c.mlA,'مل'],['محلول B',c.mlB,'مل'],['خافض pH',c.down,'مل'],['رافع pH',c.up,'مل'],['A بلا وصفة (لم يُحسب)',c.miss.A.ml,'مل'],['B بلا وصفة (لم يُحسب)',c.miss.B.ml,'مل'],[]]).concat(Object.keys(c.per).map(k=>{const n=k.split('|');return [n[0],+c.per[k].toFixed(3),n[1]];})));
  add('العمال',[['الاسم','الجولات','في موعده','في موعده %','تسجيلات بتاريخ سابق','أُعيد للتصحيح','كل التسجيلات']].concat(m.work.map(w=>[nameOf(w.id),w.rounds,w.ok,pc(w.ok,w.rounds),w.prior,w.flag,w.n])));
  /* ورقة لكل نوع تسجيل (كما في الإصدارات السابقة) */
  const types=ORDER[sec].slice();rows.forEach(r=>{if(!types.includes(r.type)&&typeDef(r.type,sec)&&!TYPES_G[r.type])types.push(r.type);});
  types.forEach(t=>{
   const T=typeDef(t,sec),cols=[],head=['التاريخ'];if(!T||!Array.isArray(T.fields))return;
   T.fields.forEach(x=>{
    if(x.t==='grid'){const D=dimOf(x);D.rows.forEach((r,ri)=>{D.cols.forEach((cc,ci)=>{cols.push({gk:gkey(x.k,r,cc)});head.push(x.l+' - '+D.rowL[ri]+'/'+D.colL[ci]);});});cols.push({gm:x.k});head.push(x.l+' - متوسط الخانات');return;}
    cols.push({fd:x});head.push((x.pg?MNAME[x.pg]+' - ':'')+(x.cl||x.l)+(unitOf(x)&&unitOf(x)!=='pH'?' ('+unitOf(x)+')':''));
   });
   if(t==='irr'){cols.push({irrT:1});head.push('مجموع الري (لتر)');}
   const hd=head.concat(t==='note'?['الحالة']:[]).concat(['المسجّل','المراجعة','ملاحظة المشرف']);
   const data=rows.filter(r=>r.type===t).map(r=>{const v=r.v||{},row=[r.date];
    cols.forEach(cc=>{if(cc.gm){const mm=metric(v,cc.gm);row.push(mm==null?'':+mm.toFixed(1));return;}if(cc.gk){row.push(num(v[cc.gk]));return;}if(cc.irrT){row.push(irrL(v));return;}
     const x=cc.fd,val=v[x.k];if(x.t==='t')row.push(fmtTime(val));else if(x.t==='batch'){const b=sowBatches().find(s=>s.id===val);row.push(b?b.date+' '+(b.v.crop||''):'');}else row.push(x.t==='n'?num(val):(val==null?'':typeof val==='object'?'':val));});
    if(t==='note')row.push(v.cat===NOTE_NONE?'—':r.open?'مفتوحة':'تم الحل');
    return row.concat([nameOf(r.by),r.review?(r.review.s==='ok'?'معتمد':'مطلوب تصحيح'):'بانتظار',r.review&&r.review.c||'']);});
   if(data.length)add(T.label,[hd].concat(data));
  });
  const eq=m.all.filter(r=>r.sec==='g');
  if(eq.length)add('المعدات',[['التاريخ','النوع','البداية / الوقت','الانتهاء','التفاصيل','المسجّل']].concat(eq.map(r=>{const v=r.v||{};return [r.date,(typeDef(r.type)||{label:r.type}).label,r.type==='batt'?tsTime(v.start||r.ts):fmtTime(r.time),v.end?tsTime(v.end):'',r.type==='cal'?(v.what||'')+' · '+(v.result||''):(v.before||''),nameOf(r.by)];})));
  add('وصفات العبوات المركزة',[['التاريخ','العبوة','حجم المحلول المركز (مل)','المادة','الكمية','الوحدة','ملاحظات','المشرف']].concat((S.recipes||[]).reduce((acc,r)=>acc.concat((r.items||[{}]).map(it=>[r.date,r.tank,recipeMl(r),it.name||'',num(it.qty),it.unit||'',r.notes||'',nameOf(r.by)])),[])));
  if(m.sens&&m.sens.th.length){
   add('الحساسات - الفترة',[['الحساس','التغطية %','متوسط 24 ساعة','نهاراً','ليلاً','الأدنى','وقت الأدنى','الأعلى','وقت الأعلى','الحرارة ضمن الحد %','الرطوبة ضمن الحد %','VPD نهاراً (kPa)','VPD ضمن المثالي % (النهار)','الإجهاد الحراري (س)','الإجهاد الحراري (س/يوم)','التكثّف المحتمل (س)','خطر الأمراض (س/يوم)','متوسط نقطة الندى','أقل هامش ندى','الانقطاعات','أطول انقطاع (س)']].concat(m.sens.th.map(s=>[s.name,pc(s.pct,1),r1(s.tAvg,1),r1(s.tDay,1),r1(s.tNight,1),s.t&&s.t.min?r1(s.t.min.v,1):'',s.t&&s.t.min?todayStr(new Date(s.t.min.t))+' '+tsHM(s.t.min.t):'',s.t&&s.t.max?r1(s.t.max.v,1):'',s.t&&s.t.max?todayStr(new Date(s.t.max.t))+' '+tsHM(s.t.max.t):'',s.inT==null?'':pc(s.inT,1),s.inH==null?'':pc(s.inH,1),r1(s.vDay,2),s.vIn==null?'':pc(s.vIn,1),r1(s.heat,1),r1(s.heatDay,2),r1(s.cond,1),r1(s.riskDay,2),r1(s.dewAvg,1),s.minMg?r1(s.minMg.v,1):'',s.gaps.n,r1(s.gaps.longest,1)])));
   add('الحساسات - يومي',[['التاريخ','الحساس','ساعات فيها قراءة','متوسط الحرارة','متوسط الرطوبة','ساعات الحرارة ضمن الحد','ساعات الإجهاد','VPD نهاراً (kPa)','ساعات VPD ضمن المثالي','ساعات التكثّف','ساعات خطر الأمراض','أقل هامش ندى']].concat(m.sens.th.reduce((acc,s)=>acc.concat(Object.values(s.days).map(d=>[d.date,s.name,r1(Math.max(d.cov,d.hCov),1),d.tN?r1(d.tS/d.tN,1):'',d.hN?r1(d.hS/d.hN,0):'',r1(d.inT,1),r1(d.heat,1),d.vDCov?r1(d.vDS/(d.vDCov*12),2):'',r1(d.vDIn,1),r1(d.cond,1),r1(d.risk,1),r1(d.mg,1)])),[]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))));
  }
  XLSX.writeFile(wb,'GREEN-SIDE-'+(sec==='t'?'TOWERS':'NURSERY')+'-'+R.from+'-'+R.to+'.xlsx');toast('تم تنزيل الملف');
 }catch(e){console.warn(e);toast('تعذّر إنشاء الملف');}
 btn.disabled=false;
}
function csv(){
 const R=period();if(!SN.docs||!window.SENS){toast('قراءات الحساسات لم تُحمَّل بعد');return;}
 const rows=[['الحساس','القياس','الوقت (توقيت الرياض)','القيمة','الوحدة']].concat(SENS.rpt.points(SN.docs,R.a,R.b).map(r=>[r[0],r[1],todayStr(new Date(r[2]))+' '+tsHM(r[2]),r[3],r[4]]));
 const text='﻿'+rows.map(row=>row.map(v=>{let s=String(v==null?'':v);if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.download='GREEN-SIDE-sensors-'+S.sec+'-'+R.from+'-'+R.to+'.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
}

/* ---------- الأزرار ---------- */
document.addEventListener('click',ev=>{
 const b=ev.target.closest&&ev.target.closest('[data-rp]');if(!b)return;ev.preventDefault();const a=b.dataset.rp,v=b.dataset.v;
 if(a==='kind'){st.kind=v;st.off=0;lsSet('gs_rep_kind',v);}
 else if(a==='step'){st.off=Math.max(0,st.off+(+v||0));}
 else if(a==='tab'){st.tab=v;lsSet('gs_rep_tab',v);window.scrollTo(0,0);}
 else if(a==='refresh'){refresh();return;}
 else if(a==='xlsx'){exportXlsx(b);return;}
 else if(a==='csv'){csv();return;}
 else if(a==='print'){window.print();return;}
 render(true);
});

/* ---------- فحص الحسابات بأرقام معروفة (يعمل في «فحص النظام» وفي اختبارات المحاكي) ---------- */
function selfCheck(){
 const errs=[],ok=[],eq=(name,got,exp,tol)=>{const g=typeof got==='number'&&typeof exp==='number'?Math.abs(got-exp)<=(tol==null?1e-6:tol):JSON.stringify(got)===JSON.stringify(exp);(g?ok:errs).push(name+(g?'':' (الناتج '+JSON.stringify(got)+' والمتوقع '+JSON.stringify(exp)+')'));};
 const LIM={ec:[1200,1800],ph:[5.5,6.5],wt:[18,26],airD:[16,27],airN:[10,18],rhD:[50,80],rhN:[60,90],lux:[15000,40000]};
 const stF=(c,v,sec,t)=>{if(!c||v==null)return null;if(c==='lux'&&!luxJudged(t))return 'ok';const day=!okHM(t)||(tMin(t)>=360&&tMin(t)<1080),L=c==='air'?(day?LIM.airD:LIM.airN):c==='rh'?(day?LIM.rhD:LIM.rhN):LIM[c];return v<L[0]?'lo':v>L[1]?'hi':'ok';};
 const SC={refill:['16:00'],ecph:['09:00','12:00','15:00'],temp:['08:00','12:00','16:00'],light:['09:00','12:00','15:00'],pump:['10:00'],photo:[]};
 const d1='2026-11-10',d2='2026-11-11',d0='2026-11-09',T0='2026-11-12';let id=0;
 const X=ctx('t',{today:T0,now:Date.parse(T0+'T13:20:00+03:00'),st:stF,sched:(type,d)=>({times:SC[type]||[],n:type==='photo'?1:0}),tasks:TASKS.t,
  recipes:[{tank:'A',date:d1,ts:Date.parse(d1+'T07:00:00+03:00'),volMl:10000,items:[{name:'نترات الكالسيوم',qty:1000,unit:'غ'}]},{tank:'A',date:d2,ts:Date.parse(d2+'T18:00:00+03:00'),volMl:10000,items:[{name:'نترات الكالسيوم',qty:2000,unit:'غ'}]},{tank:'B',date:'2026-11-01',ts:Date.parse('2026-11-01T07:00:00+03:00'),volMl:10000,items:[{name:'سلفات المغنيسيوم',qty:500,unit:'غ'}]}]});
 const E_=(type,date,time,v,o)=>Object.assign({id:'x'+(++id),type,sec:'t',date,time,ts:atMs(date,time)+60000,by:'w1',v:Object.assign({time},v)},o||{});
 const grid=(k,val,over)=>{const o={};['b','m','e'].forEach(z=>['1','2','3'].forEach(l=>{o[k+'_'+z+l]=over&&over[z+l]!=null?over[z+l]:val;}));return o;};
 /* ت1/ت4: مواعيد اليوم d1 */
 const rows=[E_('temp',d1,'08:10',grid('air',22,{e3:31})),E_('temp',d1,'12:40',grid('air',23)),E_('temp',d1,'17:30',grid('air',24)),
  E_('ecph',d1,'15:10',{ec:1400,ph:5.5,wt:22}),E_('ecph',d1,'15:20',{ec:1500,ph:6.5,wt:22}),E_('ecph',d1,'15:25',{ec:1450,ph:6.0,wt:22}),
  E_('mix',d1,'16:05',{water:1000,mlA:200,mlB:200,ec:1700,ph:6.0,wt:22}),E_('refill',d0,'16:00',{wt:22,ec0:1100,ph0:6.2,waterAdd:100,mlA:1400,mlB:1400,ec:1700,ph:6.0}),
  E_('waterOnly',d2,'16:00',{waterAdd:50}),E_('refill',d2,'09:00',{wt:22,ec0:1300,waterAdd:0,mlA:100,mlB:0,ec:1500,ph:6.0}),E_('refill',d2,'19:00',{wt:22,ec0:1300,waterAdd:0,mlA:100,mlB:0,ec:1500,ph:6.0}),
  E_('light',d1,'08:00',grid('lux',5000)),E_('light',d1,'12:00',grid('lux',5000)),
  E_('note',d1,'16:05',{cat:NOTE_NONE}),E_('note',d1,'16:10',{cat:'إصابة حشرية',sev:'خفيفة'},{open:true}),
  E_('photo',d1,'16:20',{side:'',loc:'البداية'},{grp:'g1'}),E_('photo',d1,'16:20',{side:'',loc:'الوسط'},{grp:'g1'}),
  E_('ecph',T0,'09:05',{ec:1500,ph:6.0,wt:22}),E_('temp',T0,'12:00',grid('air',23))];
 const C1=compliance(rows,X,[d1]),Tt=C1.types.temp,Te=C1.types.ecph,Tr=C1.types.refill;
 eq('ت1 الجو: أُنجز 3 من 3',[Tt.done,Tt.need],[3,3]);eq('ت1 الجو: في موعده 1 فقط (8:10؛ و12:40 و5:30 م متأخرتان)',Tt.ok,1);
 /* 8:10 ← 8:00 (10 د) في موعده · 12:40 ← 12:00 (40 د) متأخر · 17:30 ← 16:00 (90 د) متأخر */
 eq('ت1 الجو: متوسط التأخر (10+40+90)/3',Tt.dl/Tt.dn,(10+40+90)/3,1e-9);
 eq('ت1 أملاح وpH كلها آخر اليوم: في موعده 1 من 3',[Te.done,Te.ok],[3,1]);
 eq('ت4 «خزان جديد» يُحتسب عن «تعويض الخزان»',[Tr.done,Tr.ok],[1,1]);
 const C2=compliance(rows,X,[d2]);eq('ت4 «ماء فقط» لا يُحتسب (تعويضا d2 خارج المهلة: 9:00 و7:00 م)',[C2.types.refill.done,C2.types.refill.ok],[1,0]);
 const C3=compliance(rows,X,[T0]),T3=C3.types;
 eq('ت3 اليوم حتى 1:20 م: أملاح وpH مطلوب 2 (9:00 و12:00) والمنجز 1',[T3.ecph.need,T3.ecph.done,T3.ecph.ok],[2,1,1]);
 eq('ت3 اليوم: موعد 3:00 م لم يحن فلا يُحسب',C3.days[0].up,1+1+1+1);
 eq('ت3 اليوم: المهام بلا مواعيد خارج النسبة',T3.photo.need,0);
 eq('م4 التصوير بجهتين = جولة واحدة',C1.types.photo.done,1);
 /* ت2 */
 const H=[{until:'2026-11-10',times:['08:00','12:00','16:00'],n:0}],pk=d=>{const q=schedPick(H,d);return q?q.times.length:5;};
 eq('ت2 الجدول الساري: يوم 9 بثلاثة مواعيد (قبل التغيير) ويوم 10 بخمسة',[pk('2026-11-09'),pk('2026-11-10')],[3,5]);
 /* م1/ح2 */
 const ec=series(rows.filter(e=>e.date===d1||e.date===d0),'t','found','ec',X),s1=sstat(ec);
 eq('م1 EC كما وُجد يشمل «قبل التعويض»: الوسيط',s1.med,(1400+1450)/2);eq('م1 EC: الأدنى 1100 خارج الحد',[s1.min.v,s1.min.st],[1100,'lo']);
 eq('م1 EC بعد التدخل منفصل',sstat(series(rows.filter(e=>e.date===d1||e.date===d0),'t','after','ec',X)).med,1700);
 eq('م3 pH بالوسيط',sstat(series(rows.filter(e=>e.date===d1),'t','found','ph',X)).med,6.0);
 /* ح1/ح2/ح3/ف1 */
 const Lm=limits(rows.filter(e=>e.date===d1||e.date===d0),X);
 eq('ح1 حرارة الجو: الخانة 31° وحدها خارج الحد',[Lm.by.air.out,Lm.by.air.hi,Lm.by.air.outReadings],[1,1,1]);
 eq('ح2 الأملاح «قبل التعويض» 1100 خارج الحد',Lm.by.ec.lo,1);
 eq('ح3 الضوء 8:00 ص بلا حكم و12:00 خارج الحد',[Lm.by.lux.cells,Lm.by.lux.out,Lm.by.lux.na],[9,9,9]);
 eq('ف1 قراءة 5:30 م تُعامل نهاراً (24° ضمن 16–27)',limitCells(rows[2],stF).filter(x=>isBad(x.st)).length,0);
 /* س1/س2 */
 const cs=consumption(rows,X,3);
 eq('س1 A قبل أول وصفة لم يُحسب',cs.miss.A.ml,1400);
 eq('س1 الوصفة بوقتها: 200 مل (20 غ) + 9:00 بالوصفة الأولى (10 غ) + 7:00 م بالثانية (20 غ)',cs.per['نترات الكالسيوم|غ'],50,1e-9);
 eq('س1 B بوصفة قديمة: 1600 مل = 80 غ',cs.per['سلفات المغنيسيوم|غ'],80,1e-9);
 eq('س2 ماء التعويض منفصل عن تعبئة الخزان الجديد',[cs.topup,cs.fill,cs.fillN],[150,1000,1]);
 /* م2 */
 eq('م2 الملاحظات لا تعدّ «لا يوجد ملاحظات»',notesOf(rows).n,1);
 /* م3 الشبكة */
 const zr=[E_('temp',d1,'10:00',{air_b1:20}),E_('temp',d1,'11:00',grid('air',26))],zg=zoneGrid(zr,'air','t',X);
 eq('م3 متوسط الخانة من كل القراءات',zg.cell[0][0].v,23);eq('م3 متوسط البيت من كل الخانات (لا متوسط المتوسطات)',zg.all,(20+9*26)/10,1e-9);eq('م3 متوسط المنطقة',zg.rows[0],(20+26*3)/4,1e-9);
 /* م4 */
 eq('ن5 المقارنة تحتاج 70% من الفترتين',[cmpOk({pct:.99},{pct:.08}),cmpOk({pct:.8},{pct:.75})],[false,true]);
 /* ن1–ن7: دوال sensors.js الحقيقية على قراءات مصطنعة */
 let sens='';
 if(window.SENS&&SENS.rpt&&window.GSUI&&GSUI.ready()){
  const s={id:'__rpt_selfcheck',name:'اختبار',sec:'',manual:'',enabled:true,measures:{va_temperature:{},va_humidity:{}}},Ld={dh:[6,18],tD:[16,27],tN:[10,18],hD:[50,80],hN:[60,90],vmin:.8,vmax:1.2,heat:28,risk:90,gap:1,cond:1,luxK:.0185};
  const day=(date,fn)=>{const t=[],h=[];for(let x=0;x<86400;x+=900){const q=fn(x/3600);if(q){t.push({t:x,v:q[0]});h.push({t:x,v:q[1]});}}return {date,deviceId:s.id,sec:'',p:{va_temperature:t,va_humidity:h},s:{}};};
  const std=hr=>hr>=6&&hr<18?(hr<6.75?[9,60]:hr>=13&&hr<14?[29,60]:[24,60]):[14,85];
  const a='2026-11-01',b='2026-11-03',docs=[day(a,std),day(b,std)],A=Date.parse(a+'T00:00:00+03:00'),B=Date.parse(b+'T00:00:00+03:00')+864e5,r=SENS.rpt.sensor(s,docs,A,B,B+864e5,Ld);
  eq('ن3 التغطية من ساعات الفترة كلها (يوم أوسط بلا قراءات)',r.pct,(48+22*5/60)/72,1e-6);
  eq('ن1 VPD ضمن المثالي على ساعات النهار',r.vIn,20.5/24,1e-6);
  eq('ن2 الأدنى الفعلي 9° الساعة 6:00 ص (خارج حد النهار)',[r.t.min.v,tsHM(r.t.min.t),r.t.min.st],[9,'06:00','lo']);
  eq('ن2 الأعلى 29° خارج الحد',[r.t.max.v,r.t.max.st],[29,'hi']);
  eq('ن7 المتوسط موزون بالعيّنات على الفترة',r.tAvg,(2*(81+348+2952+2016)+22*14)/(2*288+22),1e-6);
  eq('ن4 الإجهاد الحراري ساعة/يوم على أيام الفترة',r.heatDay,2/3,1e-6);
  const r2=SENS.rpt.sensor(Object.assign({},s,{id:'__rpt_selfcheck2'}),docs.map(d=>Object.assign({},d,{deviceId:'__rpt_selfcheck2'})),A,B,B+864e5,Ld);
  eq('ن4 ساعات خارج الحد في البيت لا تُجمع بين الحساسات',houseOut([r,r2]),2*1.75,1e-6);
  const chg=[day('2026-11-05',hr=>hr>=6&&hr<18?[24,60]:Number.isInteger(hr)?[12,70]:null)],A2=Date.parse('2026-11-05T00:00:00+03:00'),r3=SENS.rpt.sensor(s,chg,A2,A2+864e5,A2+2*864e5,Ld);
  eq('ن6 حساس يرسل عند التغيّر: المتوسط الفعلي 18° والتغطية كاملة',[+r3.tAvg.toFixed(6),+r3.pct.toFixed(6)],[18,1]);
  eq('ف2 وقت أقل هامش ندى بتوقيت الرياض',tsHM(r.minMg.t),'00:00');
 }else sens=' (حسابات الحساسات تُختبر بعد تحميل سجل الصيانة)';
 return {ok:!errs.length,errs,pass:ok.length,n:ok.length+errs.length,note:sens};
}

return {view,period,selfCheck,refresh,invalidate:()=>{memo={key:'',m:null};},_t:{matchDay,compliance,limits,series,sstat,consumption,daily,zoneGrid,workers,reviewStats,notesOf,production,houseOut,cmpOk,recipeAt,model:()=>memo.m,ctx,st}};
})();
