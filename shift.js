/* GREEN SIDE 3.4.0 — إيصال تعويض الماء وقائمة الإرسال المحلية (واجهة الوردية القديمة محفوظة للرجوع) */
var Shift=(()=>{
'use strict';
const sending=new Set(), errors=new Map();
const E=x=>esc(String(x??''));
const route=(title,page)=>Farm.action(title,'route',page);
const action=(title,key)=>'<button type="button" class="btn" data-shift="'+key+'">'+E(title)+'</button>';
const newEntry=(title,type)=>'<button type="button" class="btn pri" data-act="new" data-type="'+type+'">'+E(title)+'</button>';
const key=(part,uid=S.uid)=>'gs213:'+uid+':'+part;
function read(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}}
function draft(date){return read(key('draft:'+date));}
function remember(date,id,values){
 try{localStorage.setItem(key('draft:'+date),JSON.stringify({id,values}));}
 catch(e){toast('تعذر حفظ المسودة على الجهاز');}
}
function pending(uid=S.uid){
 const prefix=key('send:',uid),items=[];
 let count;try{count=localStorage.length;}catch(e){return items;}
 for(let i=0;i<count;i++){
   const k=localStorage.key(i);
   if(k?.startsWith(prefix)){const item=read(k);if(item)items.push(item);}
 }
 return items;
}
function hasPending(){return pending().length>0;}
function enqueue(id,data,reason){
 if(data.by!==S.uid||!id)throw Error('تعذر تحديد صاحب العملية');
 const item={id,data,reason,auditId:S.db.collection('farmChanges').doc().id};
 const k=key('send:'+id);
 if(!read(k))localStorage.setItem(k,JSON.stringify(item));
 const dk=key('draft:'+data.date);
 if(read(dk)?.id===id)localStorage.removeItem(dk);
 toast('سُجلت العملية على الجهاز · بانتظار تأكيد الخادم');
}
async function flush(){
 const uid=S.uid, db=S.db;if(!uid||!S.role||!db||!navigator.onLine)return;
 for(const item of pending(uid)){
   const k=key('send:'+item.id,uid);
   if(sending.has(k)||S.uid!==uid)continue;
   sending.add(k);errors.delete(k);
   try{
     const ref=db.collection('entries').doc(item.id),data=item.data;
     await db.runTransaction(async tx=>{
       const prior=await tx.get(ref);
       if(prior.exists){
         const d=prior.data();
         if(d.by!==uid||d.ts!==data.ts||d.type!=='waterOnly')throw Error('معرّف مرتبط بعملية مختلفة؛ راجع المشرف');
         return;
       }
       if(S.uid!==uid)throw Error('تغيّر الحساب');
       if(data.date<todayStr() && isWorker()){
         const v={...data.v,auditId:item.auditId};
         tx.set(db.collection('farmChanges').doc(item.auditId),{entry:item.id,by:uid,date:data.date,type:data.type,sec:data.sec,before:null,after:v,requested:false,reason:item.reason||'اكتمل إرسال تسجيل محفوظ على الجهاز بعد نهاية اليوم',created:firebase.firestore.FieldValue.serverTimestamp()});
         tx.set(ref,{...data,v});
       }else tx.set(ref,data);
     });
     localStorage.setItem(key('receipt',uid),JSON.stringify({id:item.id,qty:data.v.waterAdd,date:data.date,time:data.time}));
     localStorage.removeItem(k);if(S.uid===uid)toast('أكّد الخادم تعويض '+data.v.waterAdd+' لتر');
   }catch(e){errors.set(k,errMsg(e));}finally{sending.delete(k);if(S.uid===uid)render();}
 }
}
function showPending(){toast('هناك تعويض بانتظار التأكيد. افتح إيصال الإرسال في الرئيسية.');setTab('today');flush();}
function receipts(){
 const items=pending(),last=read(key('receipt'));if(!items.length&&!last)return '';
 if(!items.length)return '<p class="shift-receipt">✓ آخر إيصال ماء مؤكد على هذا الجهاز · '+E(last.qty)+' لتر · '+E(fmtDate(last.date,{day:'numeric',month:'long'})+' · '+fmtTime(last.time))+'</p>';
 return items.map(x=>'<div class="banner warn"><span>تعويض '+E(x.data.v.waterAdd)+' لتر · '+E(fmtDate(x.data.date,{day:'numeric',month:'long'})+' · '+fmtTime(x.data.time))+' · '+E(errors.get(key('send:'+x.id))||'محفوظ على هذا الجهاز بانتظار الخادم')+'</span>'+action('تحقق وأعد الإرسال','retry')+'</div>').join('');
}
function stateOf(e){
 if(Farm.pendingChange(e.id))return 'again';
 if(e.review?.s==='flag')return 'fix';
 return e.review?'ok':'pending';
}
function climate(){
 if(SENS.api.access()||SENS._x.devicesCached||!GSUI.ready())return null;
 for(const s of SENS.api.list()){
   if(GSUI.maintained(s.id,Date.now()))continue;
   for(const k of ['temp','hum','ph','waterTemp']){
     const q=SENS.api.live(s,k);
     if((q.state==='hi'||q.state==='lo')&&Date.now()-q.at<=45*60000&&!GSUI.interrupted(s.id,q.at,Date.now())){
       const m=SENS.api.info(k,s);
       return {title:m.l+' '+q.label,detail:(s.name||s.tuyaName||'حساس')+' · '+q.v+' '+m.u+' · '+SENS.api.age(q.at),cta:'عرض القراءة واتجاهها',page:'sens'};
     }
   }
 }
 return null;
}
function priority(rows,todo,live){
 if(!live)return {title:'ملخص يوم '+fmtDate(S.date,{day:'numeric',month:'long'}),detail:'السجلات والمهام تخص التاريخ المختار.',cta:'فتح سجل اليوم',page:'ops'};
 const jobs=Farm.shiftJobs().filter(j=>j.due<=S.date).sort((a,b)=>a.due.localeCompare(b.due));
 const leak=jobs.find(j=>j.title.startsWith('إصلاح تسريب'));
 if(leak)return {title:leak.title,detail:'مهمة إصلاح مفتوحة · '+leak.due,cta:'متابعة الإصلاح',page:'jobs'};
 const alarm=climate();if(alarm)return alarm;
 const fix=rows.find(e=>stateOf(e)==='fix'&&(isSup()||e.by===S.uid));
 if(fix)return {title:'سجل يحتاج تصحيحًا',detail:(typeDef(fix.type,secOf(fix))?.label||fix.type)+' · '+(fix.review.c||'راجع ملاحظة المشرف'),cta:'عرض المطلوب',filter:'fix'};
 if(jobs.length)return {title:jobs[0].title,detail:'الاستحقاق '+jobs[0].due+' · '+nameOf(jobs[0].assignee),cta:'فتح المهمة',page:'jobs'};
 if(isSup()&&Farm.shiftChanges().length)return {title:'تصحيح ينتظر قرار المشرف',detail:Farm.shiftChanges().length+' طلب في المزرعة',cta:'مراجعة الفروق',page:'changes'};
 if(!S.dayLoaded||S.dayCached||S.dayError)return {title:'سجل الوردية قيد التحقق',detail:S.dayError||'آخر اتصال بالسجل لم يؤكَّد بعد.',cta:'فتح السجل',page:'ops'};
 if(!isSup()&&todo.length)return {title:typeDef(todo[0][0],S.sec).label,detail:'جولة متبقية لهذا اليوم · '+SECS[S.sec].name,cta:'تسجيل الجولة',type:todo[0][0]};
 const waiting=rows.filter(e=>stateOf(e)==='pending').length;
 if(isSup()&&waiting)return {title:waiting+' تسجيل بانتظار المراجعة',detail:'سجل القسم · '+fmtDate(S.date,{day:'numeric',month:'long'}),cta:'مراجعة السجلات',filter:'pending'};
 return {title:'متابعة '+SECS[S.sec].name,detail:'راجع القراءات المؤرخة وآخر تدخل مسجل أدناه.',cta:'فتح المراقبة',page:'sens'};
}
function production(){
 const status=Farm.shiftCropStatus();
 if(!Farm.cropReady())return '<p class="muted">'+E(status||'جارٍ التحقق من سجل الإنتاج…')+'</p>';
 const all=Farm.crops(),summary=Farm.harvestSummary(all,S.date,S.date);
 const kg=summary.records.length>summary.missing?f(summary.total,2):'—',unlinked=summary.unlinked,missing=summary.missing;
 const moved=all.filter(e=>e.type==='xplant'&&e.date===S.date).reduce((n,e)=>n+(num(e.v.count)||0),0);
 return '<section class="shift-panel"><small>إنتاج البيت · '+E(fmtDate(S.date,{day:'numeric',month:'long'}))+'</small><p>'+E(status)+'</p><h3>الحصاد المسجّل</h3><strong class="shift-value">'+kg+' <small>كغ</small></strong><p>'+f(unlinked,1)+' كغ دون دفعة معروفة · نُقلت '+moved+' شتلة'+(missing?' · '+missing+' سجلات دون وزن صالح':'')+'</p>'+route('تفاصيل الدفعات','crop')+'</section>';
}
function home(tools){
 const live=S.date===todayStr(), owner=!!S.uid&&S.uid===S.ownerUid,rows=secEntries(S.entries,S.sec);
 const todo=TASKS[S.sec].filter(x=>doneOf(rows,x[0])<needOf(S.sec,x));
 const notice=live?tools.notice():'',p=priority(rows,todo,live);
 let cta=p.type?newEntry(p.cta,p.type):p.filter?action(p.cta,p.filter):route(p.cta,p.page);
 const water=S.sec==='t'&&live?newEntry('＋ تعويض ماء فقط','waterOnly'):'';
 const kpis=[['تسجيلات القسم',rows.length],['جولات متبقية',tasksFor(S.sec,S.entries).left],['تحتاج تصحيحًا',rows.filter(e=>stateOf(e)==='fix').length]];
 let h='<section class="shift-head"><div class="shift-id"><span>'+E(owner?'لوحة المالك':isSup()?'لوحة المشرف':'وردية العامل')+'</span></div><h2>'+E(SECS[S.sec].name)+' <small> / '+(live?'اليوم':'الأرشيف')+'</small></h2>'+tools.status()+'</section>';
 if(live)h+=receipts();
 h+=notice+'<section class="shift-focus"><small>'+(!live?'التاريخ المختار':isSup()?'أولوية المتابعة':'الخطوة التالية')+'</small><h2>'+E(p.title)+'</h2><p>'+E(p.detail)+'</p>'+cta+'</section>';
 h+='<div class="shift-metrics">'+kpis.map(([l,v])=>'<div><small>'+l+'</small><strong>'+(!S.dayLoaded?'—':v)+'</strong></div>').join('')+'</div>';
 if(water)h+='<div class="shift-tools">'+water+route('توريد ناقلة','deliveries')+'</div>';
 if(owner)h+=production();
 if(live)h+=tools.liveCards();
 if(!owner&&!isWorker())h+=production();
 h+='<section class="shift-panel"><h3>جولات القسم</h3>'+(!S.dayLoaded||S.dayError?'<p>لم يكتمل تحميل سجل الجولات.</p>':todo.length?todo.map(x=>'<div class="ux-row"><span>'+E(typeDef(x[0],S.sec).label)+' · '+doneOf(rows,x[0])+' / '+needOf(S.sec,x)+'</span>'+newEntry('سجّل',x[0])+'</div>').join(''):'<p>لا جولات متبقية بحسب السجل المحمّل.</p>')+'</section>';
 const lastRows=rows.filter(e=>['waterOnly','refill','mix','irr','pump','harvest'].includes(e.type)),last=lastRows[lastRows.length-1];
 if(last)h+='<section class="shift-panel"><small>آخر تدخل مسجّل في القسم</small><h3>'+E(typeDef(last.type,S.sec).label)+'</h3><p>'+E(fmtTime(last.time))+' · '+E(nameOf(last.by))+'</p>'+route('فتح سجل القسم','ops')+'</section>';
 h+='<details class="shift-panel"><summary>أدوات المزرعة وبقية الملخصات</summary>'+Farm.home(live)+'</details>';
 return h+'<p class="shift-alt"><button type="button" class="linkbtn" data-shift="classic">التبديل إلى الواجهة السابقة للرئيسية</button></p>';
}
document.addEventListener('click',ev=>{
 const b=ev.target.closest?.('[data-shift]');if(!b)return;
 const cmd=b.dataset.shift;
 if(cmd==='retry')flush();
 else if(cmd==='classic'||cmd==='modern'){lsSet('gs_home_mode_'+S.uid,cmd);render(true);}
 else GSUI.reviewQueue(cmd);
});
window.addEventListener('online',()=>flush());
return {home,flush,hasPending,showPending,receipts,draft,remember,enqueue,stateOf,action};
})();
