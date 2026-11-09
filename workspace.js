/* GREEN SIDE 2.16.0 — unified workspace, existing member/entry permissions. */
var GSUI=(function(){
'use strict';
var care={uid:null,rows:[],ready:false,error:'',off:null,revision:0},cache={},pending=0,group='all',search='',review='all',period=7,closedWeek=false;
function E(x){return esc(x);}
/* تواريخ وأوقات للعرض بالعربي: «9 نوفمبر» و«4:00 م» */
function DT(d){return d?fmtDate(d,d.slice(0,4)===todayStr().slice(0,4)?{day:'numeric',month:'long'}:{day:'numeric',month:'long',year:'numeric'}):'';}
function DW(d){return d?fmtDate(d,{weekday:'long',day:'numeric',month:'long'}):'';}
function TM(t){return new Date(t+10800000).toISOString().slice(11,16);}
/* موقع الحساس للعرض: يُخفى الرمز التقني (n:1 أو t:b) لأن اسم الحساس يكفي */
function placeText(l){l=String(l||'').replace(' · موقع سجل اليوم','');return (/^[ntg]\s*[:,]|^[ntg]$|الموقع التاريخي غير مؤكد|^غير محدد$/.test(l))?'':l;}function F(x,d){return x==null?'—':f(x,d==null?1:d);}function at(e){return Date.parse(e.date+'T'+(e.time||'00:00')+':00+03:00');}
var eventOff=null,eventKey='',eventRows=null,eventError='',eventsCached=false,zoom=false;
function resetEventFeed(){if(eventOff)eventOff();eventOff=null;eventKey='';eventRows=null;eventError='';eventsCached=false;}
function stop(){resetEventFeed();if(care.off)care.off();care={uid:null,rows:[],ready:false,error:'',off:null,revision:0};cache={};}
function start(){if(!S.uid||!S.role||!S.db||care.uid===S.uid)return;stop();care.uid=S.uid;care.off=S.db.collection('entries').where('type','==','cal').onSnapshot(function(q){care.rows=q.docs.map(function(d){return Object.assign({id:d.id},d.data());}).filter(function(e){return e.v&&e.v.careKind;});care.ready=true;care.error='';care.revision++;cache={};render();},function(e){care.ready=false;care.error=errMsg(e);render();});}
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
// Held-value weighting only between adjacent readings <=30 min, never over maintenance.
function stats(points,id,a,b){var raw=points.filter(function(p){return p.t>=a&&p.t<b&&Number.isFinite(p.v);}).sort(function(x,y){return x.t-y.t;}),clean=raw.filter(function(p){return !maintained(id,p.t);}),w=0,sum=0,min=null,max=null;clean.forEach(function(p,i){min=min==null?p.v:Math.min(min,p.v);max=max==null?p.v:Math.max(max,p.v);var n=clean[i+1];if(n&&n.t-p.t<=1800000&&!interrupted(id,p.t,n.t)){w+=n.t-p.t;sum+=p.v*(n.t-p.t);}});return {n:clean.length,excluded:raw.length-clean.length,min:min,max:max,avg:w?sum/w:null,coverage:b>a?w/(b-a):0,points:clean};}
function ensureReport(){
 start();SENS.start();if(!S.db)return null;
 var to=closedWeek&&S.date>=todayStr()?addDays(todayStr(),-1):S.date;
 var from=addDays(to,1-period),prev=addDays(from,-period),a=Date.parse(from+'T00:00:00+03:00'),b=Math.min(Date.parse(to+'T00:00:00+03:00')+864e5,Date.now()),pa=a-period*864e5,pb=b-period*864e5;
 var feedKey=S.uid+'|'+prev+'|'+to;
 if(feedKey!==eventKey){resetEventFeed();cache={};eventKey=feedKey;
 eventOff=S.db.collection('entries').where('date','>=',prev).where('date','<=',to).onSnapshot(function(q){
 if(feedKey!==eventKey)return;eventRows=q.docs.map(d=>Object.assign({id:d.id},d.data()));eventError='';eventsCached=!!q.metadata?.fromCache;
 for(const item of Object.values(cache))if(item.feedKey===feedKey)item.events=eventRows.filter(e=>e.sec===item.section);
 render();},function(err){if(feedKey===eventKey){eventError=errMsg(err);render();}});
 }
 if(!care.ready||SENS.api.access())return null;
 var key=S.uid+'|'+S.sec+'|'+from+'|'+to+'|'+care.revision+'|'+String(SENS._x.status&&SENS.api.ms(SENS._x.status.lastRun))+'|'+SENS._x.deviceRevision;if(cache[key])return cache[key];
 var section=S.sec,r=cache[key]={loading:true,feedKey:feedKey,section:section,a:a,b:b,pa:pa,pb:pb,from:from,to:to};
 SENS._x.db.collection('sensorDays').where('date','>=',prev).where('date','<=',to).get().then(function(q){
  r.cached=!!q.metadata?.fromCache;var docs=SENS.api.archive(q);r.events=(eventRows||[]).filter(e=>e.sec===section);r.rows=[];
  r.rows=historicalRows(docs,section,r);
  r.loading=false;render();
 }).catch(function(e){r.loading=false;r.error=errMsg(e);render();});return r;
}
function historicalRows(docs,section,r){
 const groups=new Map();
 for(const d of docs){
   const existing=SENS._x.sensors[d.deviceId]||{};
   const measures=Object.assign({},existing.measures);
   for(const code of Object.keys(d.p||{}))if(!measures[code])measures[code]={};
   const device=Object.assign({},existing,{id:d.deviceId,measures:measures});
   const base=Date.parse(d.date+'T00:00:00+03:00');
   for(const kind of metrics(device)){
     for(const code of SENS.api.codes(device,kind)){
       for(const p of d.p[code]||[]){
         const site=p.site, sections=site.sec.split(/[\s,،+]+/);
         if(site.known && site.sec && !sections.includes(section) && !sections.includes('g'))continue;
         const location=site.known?(site.loc||site.manual||site.sec||'غير محدد')+(site.legacy?' · موقع سجل اليوم':''):'الموقع التاريخي غير مؤكد';
         const key=JSON.stringify([device.id,kind,site.sec,location,site.manual]);
         if(!groups.has(key))groups.set(key,{sensor:Object.assign({},device,{name:site.name}),kind:kind,location:location,info:SENS.api.info(kind,device),raw:[]});
         groups.get(key).raw.push({t:base+p.t*1000,v:p.v});
       }
     }
   }
 }
 return Array.from(groups.values(),row=>{
   row.current=stats(row.raw,row.sensor.id,r.a,r.b);
   row.previous=stats(row.raw,row.sensor.id,r.pa,r.pb??r.a);
   return row;
 });
}
function graph(row,r){
 var pts=row.current.points;if(!pts.length)return '<p class="empty">لا قراءات تشغيلية لهذا القياس في الفترة.</p>';
 var left=zoom?pts[0].t:r.a,right=zoom?Math.max(left+1000,pts[pts.length-1].t):r.b;var min=row.current.min,max=row.current.max,span=max-min||1;function x(t){return 45+(t-left)/Math.max(1,right-left)*540;}function y(v){return 125-(v-min)/span*100;}
 var path='',last=null;pts.forEach(function(p){path+=(last&&p.t-last.t<=1800000&&!interrupted(row.sensor.id,last.t,p.t)?'L':'M')+x(p.t).toFixed(2)+' '+y(p.v).toFixed(2)+' ';last=p;});
 var h='<svg class="ux-chart" viewBox="0 0 600 160" role="img" aria-label="'+E(row.info.l)+'؛ الفجوات غير موصولة"><text x="5" y="18">'+F(max,row.info.d)+'</text><text x="5" y="138">'+F(min,row.info.d)+'</text>';
 windows(row.sensor.id).forEach(function(w){var a=Math.max(left,w.start),b=Math.min(right,w.end);if(b>a)h+='<rect x="'+x(a)+'" y="20" width="'+(x(b)-x(a))+'" height="110" fill="var(--warn-soft)"><title>صيانة مستبعدة</title></rect>';});
 r.events.filter(function(e){return ['mix','refill','waterOnly','ecph','pump','irr','cal'].indexOf(e.type)>=0;}).forEach(function(e){var t=at(e);if(t>=left&&t<right)h+='<path d="M'+x(t)+' 20V130" stroke="var(--muted)" stroke-dasharray="3 4"><title>'+E((typeDef(e.type,e.sec)||{}).label+' · '+DT(e.date)+' '+fmtTime(e.time))+'</title></path>';});
 h+='<path d="'+path+'" fill="none" stroke="var(--accent)" stroke-width="2"/>';var stride=Math.max(1,Math.floor(pts.length/180));pts.forEach(function(p,i){if(i%stride===0||i===pts.length-1)h+='<circle cx="'+x(p.t)+'" cy="'+y(p.v)+'" r="2" fill="var(--accent)"><title>'+E(DT(todayStr(new Date(p.t)))+' · '+fmtTime(TM(p.t))+' · '+F(p.v,row.info.d))+'</title></circle>';});return h+'<text x="45" y="155">'+E(DT(zoom?todayStr(new Date(left)):r.from))+'</text><text x="585" y="155" text-anchor="end">'+E(DT(zoom?todayStr(new Date(right)):r.to))+'</text></svg>';
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
function eventSection(){var end=closedWeek&&S.date>=todayStr()?addDays(todayStr(),-1):S.date;if(eventError)return '<p class="banner warn">'+E(eventError)+'</p>';if(!eventRows)return '<p>جارٍ تحميل أحداث التشغيل…</p>';
 var first=addDays(end,1-period);var events=eventRows.filter(e=>e.date>=first&&e.date<=end&&e.sec===S.sec).sort((x,y)=>y.date.localeCompare(x.date)||String(y.time||'').localeCompare(String(x.time||'')));
 var days={};events.forEach(function(e){(days[e.date]=days[e.date]||[]).push(e);});
 var body=Object.keys(days).sort().reverse().map(function(d,i){var list=days[d];return '<details class="ux-day"'+(i===0?' open':'')+'><summary><b>'+E(DW(d))+'</b><span class="muted"> · '+(list.length===1?'عملية واحدة':list.length===2?'عمليتان':list.length+(list.length<=10?' عمليات':' عملية'))+'</span></summary>'+list.map(function(e){return '<div class="ux-row"><span>'+E((typeDef(e.type,e.sec)||{}).label||e.type)+'</span><time>'+E(e.time?fmtTime(e.time):'وقت غير محدد')+(e.ts&&todayStr(new Date(e.ts))>e.date?' · أُدخل لاحقًا':'')+'</time></div>';}).join('')+'</details>';}).join('');
 return '<section class="sec"><h3>العمليات المسجلة</h3><p class="help">الخطوط المتقطعة في الرسوم تشير إلى وقت هذه العمليات.</p>'+body+(!events.length?'<p class="muted">لا عمليات مسجلة في الفترة.</p>':'')+Farm.action('تصدير التقرير PDF','print')+'</section>';
}
function reports(){
 var r=ensureReport(),h=heading('تقرير المتابعة','ملخص التشغيل، جودة البيانات، ومقارنة الفترة السابقة المساوية في المدة.')+status();
 h+='<div class="ux-actions">'+[1,7,30].map(function(n){return button(n===1?'يومي':n===7?'أسبوعي':'30 يوماً','period','data-n="'+n+'" aria-pressed="'+(!closedWeek&&period===n)+'"');}).join('')+button('أسبوعان مكتملان','closed-week','aria-pressed="'+closedWeek+'"')+button(zoom?'عرض الفترة كاملة':'تكبير فترة القراءات','zoom')+button('تحديث','report-refresh')+button('التقارير التفصيلية','legacy-report')+'</div>';
 if(!care.ready)return h+'<p class="banner warn">'+E(care.error||'جارٍ التحقق من فترات الصيانة…')+'</p>'+eventSection();if(SENS.api.access())return h+'<p class="banner warn">'+E(SENS.api.access())+'</p>'+button('إعادة فتح الاتصال','sensor-retry')+eventSection();if(!r||r.loading)return h+'<p class="empty">جارٍ إعداد التقرير من القراءات الفعلية…</p>'+eventSection();if(r.error)return h+'<p class="banner warn">'+E(r.error)+'</p>'+eventSection();
 if(eventError)h+='<p class="banner warn">تعذر تحديث أحداث التشغيل: '+E(eventError)+'</p>';
 if(r.cached||eventsCached)h+='<p class="banner warn">التقرير من بيانات محفوظة محلياً؛ اتصل بالإنترنت واضغط تحديث للتحقق من أحدث البيانات.</p>';
 var pname=period===1?'اليوم السابق':period===7?'الأسبوع السابق':'الـ30 يوماً السابقة';
 h+='<p class="ux-period"><b>'+E(r.from===r.to?DW(r.from):DT(r.from)+' – '+DT(r.to))+'</b> · '+E(SECS[S.sec].name)+'<br><span class="muted">مقارنة ب'+E(pname)+' ('+E(period===1?DT(addDays(r.from,-1)):DT(addDays(r.from,-period))+' – '+DT(addDays(r.to,-period)))+')</span></p>';
 h+='<details class="ux-how"><summary>كيف تُحسب الأرقام؟</summary><p class="help">من قراءات الحساس الخام، بتوقيت الرياض وحتى نفس الساعة في الفترتين. المتوسط موزون بالزمن: القراءة التي بقيت ساعة تُحسب أكثر من قراءة بقيت دقائق. الفجوات الأطول من 30 دقيقة وفترات الصيانة المسجلة لا تدخل في الحساب.</p></details>';
 var evN=r.events.filter(function(e){return at(e)>=r.a&&at(e)<r.b;}).length,exN=r.rows.reduce(function(n,x){return n+x.current.excluded;},0);
 h+='<div class="ux-kpis"><div><span>عمليات مسجلة</span><b>'+evN+'</b></div><div><span>حساسات في التقرير</span><b>'+new Set(r.rows.map(function(x){return x.sensor.id;})).size+'</b></div>'+(exN?'<div><span>قراءات صيانة مستبعدة</span><b>'+exN+'</b></div>':'')+'</div>';
 h+='<section class="sec"><h3>القراءات والمقارنة</h3><div class="ux-report-grid">'+r.rows.map(function(row){
  var c=row.current,p=row.previous,d=row.info.d==null?1:row.info.d,delta=c.avg!=null&&p.avg!=null?Number((c.avg-p.avg).toFixed(d)):null,u=E(row.info.u),place=placeText(row.location);
  var cmp=delta==null?'<span class="muted">لا توجد بيانات كافية للمقارنة</span>':delta===0?'بدون تغيير عن '+E(pname):'<span class="'+(delta>0?'ux-up':'ux-down')+'">'+(delta>0?'▲ أعلى':'▼ أقل')+' بـ <bdi dir="ltr">'+F(Math.abs(delta),d)+' '+u+'</bdi></span> عن '+E(pname)+' <span class="muted">(<bdi dir="ltr">'+F(p.avg,d)+' '+u+'</bdi>)</span>';
  return '<article class="card"><h4>'+E(row.sensor.name||row.sensor.tuyaName)+' · '+E(row.info.l)+'</h4>'+(place?'<p class="muted">'+E(place)+'</p>':'')+
   '<div class="ux-number"><bdi dir="ltr">'+F(c.avg,d)+' '+u+'</bdi> <small class="muted">المتوسط</small></div>'+
   '<p>الأدنى <bdi dir="ltr">'+F(c.min,d)+' '+u+'</bdi> · الأعلى <bdi dir="ltr">'+F(c.max,d)+' '+u+'</bdi></p><p>'+cmp+'</p>'+
   (c.avg!=null&&c.coverage<.9?'<small class="ux-warning">البيانات تغطي '+F(c.coverage*100,0)+'% فقط من الفترة؛ المتوسط تقريبي.</small>':'')+graph(row,r)+'</article>';}).join('')+'</div></section>';
 if(!r.rows.length)h+='<p class="empty">لا توجد نقاط في أرشيف الفترة لهذا القسم.</p>';
 return h+button('تصدير قراءات التقرير CSV','csv')+eventSection();
}
function csv(){var r=ensureReport();if(!r||r.loading||r.error)return;var rows=[['الحساس','القياس','الوقت (توقيت الرياض)','القيمة','الوحدة','صيانة','الموقع']];r.rows.forEach(function(x){x.raw.filter(function(p){return p.t>=r.a&&p.t<r.b;}).forEach(function(p){rows.push([x.sensor.name||x.sensor.id,x.info.l,new Date(p.t+10800000).toISOString().slice(0,16).replace('T',' '),p.v,x.info.u,maintained(x.sensor.id,p.t)?'نعم':'لا',placeText(x.location)]);});});var text='\ufeff'+rows.map(function(row){return row.map(function(v){var s=String(v==null?'':v);if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');var a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='GREEN_SIDE_'+r.from+'_'+r.to+'.csv';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);}
function theme(){var next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;lsSet('gs_theme',next);}
function monitorPrefix(){start();return '<div class="ux-actions">'+[['all','الكل'],['air','المناخ'],['water','الخزان'],['medium','بلل الوسط']].map(function(g){return button(g[1],'group','data-group="'+g[0]+'" aria-pressed="'+(group===g[0])+'"');}).join('')+'</div>'+(!care.ready?'<p class="banner warn">'+E(care.error||'جارٍ تحميل حالة الصيانة…')+'</p>':'');}
function filterSensors(xs){return group==='all'?xs:xs.filter(function(s){return SENS.api.group(s)===group;});}
document.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('[data-ux]');if(!b)return;var a=b.dataset.ux;
 if(a==='sensor-retry'){SENS.api.retry();return;}if(a==='record')setTab('add');else if(a==='ops')setTab('ops');else if(a==='admin')setTab('sup');else if(a==='legacy')setTab('equipment');else if(a==='legacy-report')setTab('repLegacy');else if(a==='theme')theme();
 else if(a==='monitor'){group=b.dataset.group||'all';setTab('sens');}else if(a==='group'){group=b.dataset.group;render(true);}else if(a==='filter'){search=$('uxSearch').value;review=$('uxReview').value;render(true);}
 else if(a==='care')careForm(b.dataset.id,b.dataset.kind);else if(a==='save-care')saveCare(b);else if(a==='end-care')endCare(b);else if(a==='closed-week'){closedWeek=true;period=7;render(true);}else if(a==='period'){closedWeek=false;period=+b.dataset.n;render(true);}else if(a==='report-refresh'){cache={};if(!care.ready){stop();start();}render(true);}else if(a==='zoom'){zoom=!zoom;render(true);}else if(a==='csv')csv();
});
document.addEventListener('submit',function(ev){if(ev.target.id==='uxCare'){ev.preventDefault();saveCare(ev.target.querySelector('[data-ux="save-care"]'));}});
function init(){setInterval(function(){if(!document.hidden&&S.role&&(S.tab==='today'||S.tab==='sens'))render();},60000);document.documentElement.dataset.theme=lsGet('gs_theme')||'light';}
return {reviewQueue:function(kind){review=kind;search='';setTab('ops');},endReport:resetEventFeed,invalidate:function(){cache={};},retryCare:function(){stop();start();},init:init,home:home,operations:operations,reports:reports,carePanel:carePanel,start:start,stop:stop,maintained:maintained,interrupted:interrupted,careKey:careKey,ready:function(){return care.ready;},monitorPrefix:monitorPrefix,filterSensors:filterSensors,commit:commit,_test:{stats:stats,at:at,setCare:function(rows){care.rows=rows;care.ready=true;care.revision++;},graph:graph}};
})();
