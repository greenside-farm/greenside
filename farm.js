/* GREEN SIDE 2.11.0 — تشغيل المزرعة */
var Farm=(()=>{
'use strict';
const pages=['equipment','deliveries','crop','finance','team','jobs','changes'];
const tanks=['الخزان الرئيسي لمياه الخلايا','الخزان الرئيسي لمياه الري'];
const cycles={'فحص تسريبات خطوط الري':1,'تنظيف الفلتر الشبكي':7,'تنظيف الفلتر القرصي':14,'تنظيف فلتر السلة':14};
const categories=['بذور','أسمدة ومحاليل','ماء الري','ماء الخلايا','رواتب','كهرباء','صيانة','تعبئة وتسويق','مشتريات أخرى'];
let identity='',off=[],data={},errors={},cropID='',financeID='',room='team',deliveryFilter='',waterFrom='',waterTo='';
const E=x=>esc(String(x??''));
const owner=()=>S.ownerUid===S.uid;
const action=(label,key,id='')=>'<button type="button" class="btn" data-farm="'+E(key)+'" data-id="'+E(id)+'">'+E(label)+'</button>';
const rows=k=>data[k]||[];
let cached={};
let stockOff=null,stockDay='',stockRevision=0;
function stop(){stockOff?.();stockOff=null;stockDay='';stockRevision++;off.forEach(f=>f());off=[];identity='';data={};errors={};cached={};cropID=financeID='';room='team';}
function watch(key,query,after){
 const token=identity;
 off.push(query.onSnapshot(q=>{if(identity!==token)return;cached[key]=!!q.metadata?.fromCache;data[key]=q.docs.map(d=>({...d.data(),id:d.id}));delete errors[key];if(after)after(data[key]);render();},e=>{if(identity!==token)return;delete data[key];errors[key]=errMsg(e);render();}));
}
function start(){
 const key=[S.uid,S.role,S.ownerUid].join('/');
 if(identity===key)return;stop();if(!S.db||!S.role||!S.uid)return;identity=key;
 const c=k=>S.db.collection(k);
 watch('crop',c('entries').where('type','in',['sow','xplant','harvest']));
 watch('levels',c('farmLevels').orderBy('observed','desc').limit(1),subscribeStock);
 watch('water',c('farmWater').orderBy('date','desc'));
 watch('jobs',c('farmJobs').orderBy('created','desc'));
 watch('service',c('farmService').orderBy('date','desc'));
 watch('messages',c('farmMessages').where('audience','==','team'));
 watch('sent',c('farmMessages').where('by','==',S.uid));watch('received',c('farmMessages').where('audience','==',S.uid));
 watch('changes',isSup()?c('farmChanges'):c('farmChanges').where('by','==',S.uid));
 if(owner())watch('ledger',c('farmLedger').orderBy('date','desc'));
}
function notice(...keys){return keys.map(k=>errors[k]?'<p class="banner warn">'+E(errors[k])+'</p>':!data[k]?'<p class="muted">جارٍ تحميل السجل…</p>':'').join('');}
function box(title,content){return '<section class="sec"><h2>'+E(title)+'</h2>'+content+'</section>';}
function bar(...buttons){return '<div class="ux-actions">'+buttons.join('')+'</div>';}
function card(title,body,buttons=''){return '<article class="card"><h3>'+E(title)+'</h3>'+body+(buttons?bar(buttons):'')+'</article>';}
function info(value){return '<p>'+E(value)+'</p>';}
function route(label,page){return action(label,'route',page);}
function field(key,label,kind='text',required=true,initial='',other=''){
 return '<label class="f"><span>'+E(label)+'</span><input class="in" name="'+E(key)+'" type="'+kind+'" '+(required?'required':'')+' value="'+E(initial)+'" '+other+'></label>';
}
function pick(key,label,choices,required=true,current=''){
 return '<label class="f"><span>'+E(label)+'</span><select class="in" name="'+key+'" '+(required?'required':'')+'><option value="">اختر</option>'+choices.map(x=>{const [v,l]=Array.isArray(x)?x:[x,x];return '<option value="'+E(v)+'" '+(v===current?'selected':'')+'>'+E(l)+'</option>';}).join('')+'</select></label>';
}
function numField(k,label,required=true,initial=''){return field(k,label,'number',required,initial,'min="0" step="any"');}
function dateInput(value=S.date){return field('date','تاريخ العملية','date',true,value,'max="'+todayStr()+'"');}
function form(title,body,save){
 openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog">'+sheetHead(title,S.sec,'note')+'<form class="fgrid" id="farmForm">'+body+'<p class="full banner warn" role="alert" hidden></p><button class="full btn pri" type="submit">حفظ</button></form></div></div>');
 const f=$('farmForm');f.onsubmit=async ev=>{ev.preventDefault();const btn=f.querySelector('[type=submit]');if(btn.disabled||!f.reportValidity())return;btn.disabled=true;btn.textContent='بانتظار تأكيد الحفظ…';const msg=f.querySelector('[role=alert]');msg.hidden=true;
 try{await save(Object.fromEntries(new FormData(f)));if(f.isConnected)closeSheet();toast('تم تأكيد الحفظ');}catch(e){msg.textContent=errMsg(e);msg.hidden=false;btn.disabled=false;btn.textContent='إعادة محاولة الحفظ';}};
}
const coll=k=>S.db.collection(k);
const money=n=>f(n,2)+' ريال';
const today=()=>todayStr();
const stamp=()=>firebase.firestore.FieldValue.serverTimestamp();
const dates=(a,b)=>String(b.date).localeCompare(String(a.date))||String(b.time||'').localeCompare(String(a.time||''));
const members=()=>Object.keys(S.users).filter(k=>['worker','sup'].includes(S.users[k].role)||k===S.ownerUid).map(k=>[k,nameOf(k)]);
const sowings=()=>rows('crop').filter(e=>e.type==='sow').sort(dates);
const batchName=e=>e?(e.v.crop+' · '+e.date+' · '+(e.v.side||'جهة غير محددة')+' · '+e.id.slice(-5)):'دفعة غير مرتبطة';
const batchList=()=>sowings().map(e=>[e.id,batchName(e)]);
function nursery(e){
 const related=rows('crop').filter(x=>x.v?.batch===e.id);
 const moves=related.filter(x=>x.type==='xplant').sort(dates);
 const harvested=related.filter(x=>x.type==='harvest');
 const moved=moves.reduce((n,x)=>n+(num(x.v.count)||0),0);
 const ready=num(e.v.usable),loss=num(e.v.lossAfter)||0;
 return {moves,moved,harvested,remaining:ready===null?null:ready-loss-moved};
}
function cropPage(){
 const crops=sowings(),selected=crops.find(x=>x.id===cropID);
 const detail=selected?(()=>{const n=nursery(selected);
 return card(batchName(selected),info('بذور: '+selected.v.seeds+' · صالح معدود: '+(num(selected.v.usable)??'غير معدود')+' · فاقد بعد العد: '+(selected.v.lossAfter||0))+info('منقول: '+n.moved+' · متبقٍ: '+(n.remaining===null?'غير معروف':n.remaining<0?'تعارض في العد':n.remaining))+n.moves.map(x=>info(x.date+' · '+x.v.count+' شتلة من '+(selected.v.side||'جهة غير محددة')+' إلى '+(x.v.zone||'جهة غير محددة')+' · أبراج '+(x.v.towers||'غير محددة'))).join('')+n.harvested.map(x=>info('حصاد '+x.date+' · '+x.v.weight+' كغ')).join(''),action('نقل من الدفعة','moveBatch',selected.id)+action('حصاد من الدفعة','harvestBatch',selected.id));})():'';
 const orphan=rows('crop').filter(e=>e.type!=='sow'&&!crops.some(s=>s.id===e.v?.batch));
 return box('دفعات البذر ونقل الشتلات',notice('crop')+bar(action('تسجيل زراعة بذور','sow'),action('تسجيل نقل','moveBatch'))+detail+crops.map(e=>{const n=nursery(e);return card(batchName(e),info('المنقول '+n.moved+' · المتبقي '+(n.remaining??'غير معدود')),action('تفاصيل الدفعة','batch',e.id));}).join('')+(orphan.length?card('سجلات دون دفعة معروفة',orphan.sort(dates).map(x=>info(x.date+' · '+(x.type==='harvest'?'حصاد':'نقل')+' · '+(x.v.count||'—'))).join('')):''));
}
function validateEntry(type,v,miss){
 if(type==='pump'){
 const specs=FORM.pressureSpecs;v.pressureSpecs=specs;
 for(const k of ['gauge1','gauge2'])if(v[k]!==''&&v[k]!=null&&!gaugeChoices(specs[k],FORM.e?.v[k]).includes(num(v[k])))miss.push('قراءة خارج تدريج العداد');
 }
 if(['refill','mix','irr'].includes(type)&&v.stockSource===MAIN){const n=litresTaken({type,v});if(n==null||n<0)miss.push('كمية السحب من الخزان الرئيسي للري');}

 if(type==='sow'){for(const side of ['','__r','__l']){const u=num(v['usable'+side]),l=num(v['lossAfter'+side]),n=num(v['seeds'+side]);if([u,l,n].some(x=>x!==null&&(x<0||!Number.isInteger(x)))||(u!==null&&n!==null&&u>n)||(l!==null&&u!==null&&l>u))miss.push('راجع عدد البذور والشتلات والفاقد');}}
 if(type==='xplant'||type==='harvest'){
 if(type==='harvest'&&[v.saleable,v.rejected].some(x=>num(x)!==null&&(!Number.isInteger(+x)||+x<0)))miss.push('أعداد الحصاد يجب أن تكون أعدادًا صحيحة غير سالبة');
 if(type==='harvest'&&num(v.count)!==null&&num(v.saleable)!==null&&num(v.rejected)!==null&&+v.saleable + +v.rejected!==+v.count)miss.push('عدد الحصاد لا يساوي الصالح والمستبعد');
 if(type==='xplant'&&(!Number.isInteger(+v.count)||+v.count<=0))miss.push('عدد الشتلات المنقولة يجب أن يكون موجبًا وصحيحًا');
 const batch=sowings().find(s=>s.id===v.batch);
 if(batch){const n=nursery(batch),old=FORM.e && FORM.e.v.batch===batch.id?num(FORM.e.v.count)||0:0;
 if(batch.date>(FORM.e?.date||S.date))miss.push('تاريخ العملية سابق للبذر');
 if(type==='xplant'&&n.remaining!==null&&+v.count>n.remaining+old)miss.push('الكمية تتجاوز عدد الشتلات المتبقية');}
 }
}
const CAPACITY=18;
const MAIN='الخزان الرئيسي لمياه الري', PREPARED='محلول سبق احتسابه', OTHER='مصدر آخر', UNKNOWN='غير محدد (سجل سابق)';
function subscribeStock(levels){
 const day=levels[0]?.date||'';
 if(stockDay===day)return;
 stockOff?.();stockOff=null;stockDay=day;const token=++stockRevision;delete data.stock;
 if(!day)return;
 stockOff=coll('entries').where('date','>=',day).onSnapshot(q=>{
 if(token!==stockRevision)return;
 cached.stock=!!q.metadata?.fromCache;data.stock=q.docs.map(d=>({...d.data(),id:d.id})).filter(e=>['refill','mix','irr'].includes(e.type));delete errors.stock;render();
 },e=>{if(token===stockRevision){delete data.stock;errors.stock=errMsg(e);render();}});
}
function eventTime(date,time,recorded=Date.now()){
 const minute=Date.parse(date+'T'+time+':00+03:00');
 return recorded>=minute&&recorded<minute+60000?recorded:minute;
}
function litresTaken(e){
 if(e.v?.stockSource!==MAIN)return 0;
 if(e.type==='refill')return num(e.v.waterAdd);
 if(e.type==='mix')return num(e.v.water);
 if(e.type==='irr')return irrL(e.v);
 return 0;
}
function stockBalance(level,water,entries,now=Date.now()){
 if(!level)return null;
 let received=0,used=0,unknown=0,estimated=false;
 const movements=[];
 for(const w of water){
 const t=w.occurred??eventTime(w.date,w.time||'00:00',w.created?.toMillis?.()||0);
 if(w.tank===tanks[1]&&t>level.observed&&t<=now){received+=w.tons;movements.push([t,w.tons]);}
 }
 for(const e of entries){
 const t=e.v.stockAt??eventTime(e.date,e.time||'00:00',e.ts);
 if(t<=level.observed||t>now)continue;
 if(!e.v.stockSource || e.v.stockSource===UNKNOWN){unknown++;continue;}
 const litres=litresTaken(e);
 if(litres===null||litres<0){unknown++;continue;}
 used+=litres;if(litres>0){estimated ||= !!e.v.waterEstimated;movements.push([t,-litres/1000]);}
 }
 let balance=level.tons,bad=false;
 for(const [,amount] of movements.sort((a,b)=>a[0]-b[0])){balance+=amount;if(balance < -0.000001 || balance>CAPACITY+0.000001)bad=true;}
 return {balance,received,used,unknown,bad,estimated};
}
function stockCard(){
 const level=rows('levels')[0],ready=data.water && data.stock && data.levels;
 const b=ready?stockBalance(level,rows('water'),rows('stock')):null;
 let text=!level?'يلزم تسجيل الكمية الموجودة فعليًا لبدء الحساب.':'جارٍ تحميل الحركات بعد الجرد…';
 if(b)text='رصيد الجرد '+f(level.tons,3)+' طن + التوريد '+f(b.received,3)+' طن − السحب '+f(b.used/1000,3)+' طن';
 const stale=cached.stock||cached.water||cached.levels||!navigator.onLine;
 const title=b && !b.bad && !b.unknown?f(b.balance,3)+' طن متبقٍ تقديريًا':'الرصيد غير مؤكد';
 return card(tanks[1]+' · سعة 18 طن',notice('levels')+(level?notice('stock','water'):'')+info(title)+(stale?info('بيانات محفوظة محليًا؛ قد توجد حركات لم تصل بعد.'):'')+info(text)+(level?info('آخر جرد '+level.date+' '+level.time):'')+(b?.unknown?info(b.unknown+' عملية دون مصدر أو كمية مؤكدة بعد الجرد؛ راجعها أو سجّل جردًا جديدًا.'):'')+(b?.bad?info('تجاوز سجل الحركات السعة أو وصل إلى عجز. راجع الكميات والتوقيت قبل اعتماد الرصيد.'):'')+(b?.estimated?info('يتضمن سحبًا مقدرًا بزمن التعبئة.'):''),
 isSup()?action('جرد الرصيد الآن','level'):'')+
 card(tanks[0]+' · سعة 18 طن',info('المتبقي غير معلوم · الخزان يسحب مباشرة دون قياس. يُسجّل التوريد فقط.'));
}
function levelForm(){if(!isSup())return;
 form('جرد الخزان الرئيسي لمياه الري',info('أدخل الكمية الموجودة فعليًا الآن بالطن. يصبح وقت الحفظ نقطة البدء الجديدة؛ لا تُحتسب الحركات السابقة مرة أخرى.')+numField('tons','الكمية الحالية (٠ إلى ١٨ طن)')+field('memo','ملاحظة الجرد','text',false),v=>{
 if(+v.tons<0||+v.tons>CAPACITY)throw Error('السعة 18 طنًا');const observed=Date.now();
 return coll('farmLevels').add({tons:+v.tons,memo:v.memo,observed,date:todayStr(new Date(observed)),time:tsHM(observed),by:S.uid,created:stamp()});
 });
}
function sourceOptions(type){return type==='irr'?[PREPARED,MAIN,OTHER,UNKNOWN]:[MAIN,OTHER,UNKNOWN];}
function sourceDefault(type,edit){return edit?UNKNOWN:type==='irr'?PREPARED:MAIN;}
function setStockTime(e,type,date,v){if(!['refill','mix','irr'].includes(type))return;
 v.stockAt=(e && e.time===v.time && e.date===date && e.v.stockAt!=null)?e.v.stockAt:eventTime(date,v.time,e?.ts||Date.now());
}
function gaugeSpec(key){
 const g=S.settings[key+'Spec']||{};return {name:gaugeName(key),min:g.min??0,max:g.max??5,step:g.step??0.1,ideal:g.ideal??2.3};
}
function validSpec(g){
 const count=(g.max-g.min)/g.step,index=(g.ideal-g.min)/g.step;
 return [g.min,g.max,g.step,g.ideal].every(x=>Number.isFinite(x)&&Math.abs(x*1000-Math.round(x*1000))<1e-6)&&g.min>=0&&g.max>g.min&&g.step>0&&g.ideal>=g.min&&g.ideal<=g.max&&count<=500&&Math.abs(count-Math.round(count))<1e-6&&Math.abs(index-Math.round(index))<1e-6;
}
function gaugeChoices(g,prior){
 const a=Array.from({length:Math.round((g.max-g.min)/g.step)+1},(_,i)=>+(g.min+i*g.step).toFixed(3));
 if(prior!==''&&prior!=null&&Number.isFinite(+prior)&&!a.includes(+prior))a.push(+prior);
 return a.sort((x,y)=>x-y);
}
function gaugeForm(){if(!isSup())return;
 const body=['gauge1','gauge2'].map((k,i)=>{const g=gaugeSpec(k);return '<h3 class="full">العداد '+(i+1)+'</h3>'+field(k+'Name','اسم العداد','text',true,g.name)+numField(k+'Min','أقل قراءة (بار)',true,g.min)+numField(k+'Max','أعلى قراءة (بار)',true,g.max)+numField(k+'Step','فرق التدريج (بار)',true,g.step)+numField(k+'Ideal','الضغط المثالي (بار)',true,g.ideal);}).join('');
 form('ضبط عدادات الضغط',body,v=>{const update={};
 for(const k of ['gauge1','gauge2']){const g={min:+v[k+'Min'],max:+v[k+'Max'],step:+v[k+'Step'],ideal:+v[k+'Ideal']};if(!validSpec(g))throw Error('راجع المدى والتدريج: يجب أن يقع الضغط المثالي على إحدى درجات العداد، وبحد أقصى 500 درجة.');update[k+'Spec']=g;update[k+'Name']=v[k+'Name'];}
 return coll('config').doc('settings').set(update,{merge:true});});
}
function waterForm(){
 const price=owner()?numField('price','إجمالي سعر الحمولة بالريال (اختياري)',false):'';
 form('استلام حمولة ماء',pick('tank','الخزان المستلم',tanks)+dateInput()+field('time','وقت الاستلام','time',true,nowTime())+numField('tons','وزن الحمولة بالطن (حتى 18)')+field('supplier','المورّد','text',false)+field('invoice','رقم الفاتورة','text',false)+price,async v=>{
 if(+v.tons<=0||+v.tons>CAPACITY)throw Error('أدخل الوزن المفرّغ في هذا الخزان بين صفر و18 طنًا، ويجب أن يزيد على صفر');
 const ref=coll('farmWater').doc(),batch=S.db.batch();batch.set(ref,{tank:v.tank,tons:+v.tons,time:v.time,occurred:eventTime(v.date,v.time),supplier:v.supplier.trim(),invoice:v.invoice.trim(),date:v.date,by:S.uid,created:stamp()});
 if(v.price!==undefined&&v.price!=='')batch.set(coll('farmLedger').doc('water_'+ref.id),{kind:'تكلفة',category:v.tank===tanks[0]?'ماء الخلايا':'ماء الري',amount:+v.price,date:v.date,by:S.uid,memo:'استلام حمولة ماء',source:ref.id,allocation:[],basis:'غير موزع',created:stamp()});await batch.commit();});
}
function waterPage(){
 const water=rows('water').filter(v=>(!deliveryFilter||v.tank===deliveryFilter)&&(!waterFrom||v.date>=waterFrom)&&(!waterTo||v.date<=waterTo));
 return box('سجل تعبئات خزانات الماء',stockCard()+notice('water')+bar(action('استلام حمولة ماء','water'),action('الكل','water-filter'),...tanks.map(t=>action(t,'water-filter',t)))+bar(action('الفترة: '+(waterFrom||'البداية')+' — '+(waterTo||'الآن'),'water-period'))+info(water.length+' تعبئة · '+f(water.reduce((a,v)=>a+v.tons,0),2)+' طن')+(owner()?info('مجموع فواتير الحمولات المسجلة في الفترة: '+money(rows('ledger').filter(l=>water.some(w=>w.id===l.source)).reduce((n,l)=>n+l.amount,0))):'')+water.sort(dates).map(x=>{const cost=rows('ledger').find(l=>l.source===x.id);return card(x.tank,info(x.date+' · '+f(x.tons,2)+' طن · '+(x.supplier||'المورّد غير مسجل'))+info('المستلم '+nameOf(x.by)+' · الفاتورة '+(x.invoice||'—'))+(cost?info(money(cost.amount)):''),owner()&&!cost?action('تسجيل التكلفة','water-cost',x.id):'');}).join(''));
}
function gaugeName(key){return String(S.settings[key+'Name']||(key==='gauge1'?'عداد ١':'عداد ٢'));}
function equipment(){
 const log=rows('service').slice().sort(dates);
 return box('المعدات والصيانة',notice('service')+bar(action('فحص المضخة والتدفق','pump'))+Object.entries(cycles).map(([name,interval])=>{
 const last=log.find(x=>x.kind===name),due=last?addDays(last.date,interval):today();
 return card(name,info('كل '+interval+' يوم · آخر تنفيذ '+(last?.date||'لم يسجّل')+' · الاستحقاق '+due),action('تسجيل التنفيذ','service',name));}).join('')+box('سجل الصيانة',log.map(x=>info(x.date+' · '+x.kind+' · '+(x.result||'')+' · '+(x.memo||'')+' · '+nameOf(x.by))).join('')||info('لا توجد عمليات مسجّلة.'))+box('معدات وأدوات المزرعة',equipBody()));
}
function serviceForm(kind){
 const leak=kind===Object.keys(cycles)[0];
 form(kind,dateInput()+ (leak?pick('result','نتيجة الفحص',['لا يوجد تسريب','يوجد تسريب']):'')+field('memo','الموقع أو الملاحظة','text',false),async v=>{
 if(v.result==='يوجد تسريب'&&!v.memo.trim())throw Error('أدخل موقع التسريب لإنشاء مهمة إصلاح');
 const batch=S.db.batch(),ref=coll('farmService').doc();batch.set(ref,{kind,result:v.result||'تم التنظيف',date:v.date,memo:v.memo,by:S.uid,created:stamp()});
 if(v.result==='يوجد تسريب')batch.set(coll('farmJobs').doc(ref.id),{title:'إصلاح تسريب · '+v.memo,by:S.uid,assignee:S.uid,due:v.date,status:'معلقة',note:'من فحص خطوط الري',created:stamp()});await batch.commit();});
}
function jobForm(){form('مهمة عامة',field('title','المطلوب')+pick('assignee','المسؤول',members())+field('due','تاريخ الاستحقاق','date',true,today()),v=>coll('farmJobs').add({...v,by:S.uid,status:'معلقة',note:'',created:stamp()}));}
function jobList(closed=false){
 return rows('jobs').filter(j=>(j.status==='مكتملة')===closed && (isSup()||j.assignee===S.uid)).map(j=>card(j.title,info(nameOf(j.assignee)+' · '+j.due+' · '+j.status+(j.due<today()&&!closed?' · متأخرة':''))+info(j.note||'')+(j.history?.length?'<details><summary>سجل المهمة</summary>'+j.history.map(h=>info(h.day+' · '+nameOf(h.by)+' · '+h.status+' · الموعد '+h.due+' · '+h.note)).join('')+'</details>':''),closed?'':action('تم الإنجاز','job-done',j.id)+action('تأجيل','job-defer',j.id)+action('مراسلة بشأن المهمة','message-job',j.id))).join('')||info(closed?'لا مهام مكتملة.':'لا توجد مهام عامة معلقة.');
}
function jobChange(id,done){const j=rows('jobs').find(x=>x.id===id);if(!j||(!isSup()&&j.assignee!==S.uid))return;
 form(done?'إنجاز المهمة':'تأجيل المهمة',(done?'':field('due','الموعد الجديد','date',true,addDays(today(),1),'min="'+today()+'"'))+field('note',done?'ملاحظة التنفيذ':'سبب التأجيل','text',!done),
 async v=>{const ref=coll('farmJobs').doc(id);await S.db.runTransaction(async tx=>{const current=await tx.get(ref);if(!current.exists||current.data().status==='مكتملة')throw Error('المهمة مكتملة بالفعل');const event={status:done?'مكتملة':'مؤجلة',due:v.due||current.data().due,note:v.note,by:S.uid,day:today()};tx.update(ref,{status:event.status,due:event.due,note:event.note,changedBy:S.uid,changedAt:stamp(),history:[...(current.data().history||[]),event]});});});}
function messages(){const unique=new Map();['messages','sent','received'].forEach(k=>rows(k).forEach(x=>unique.set(x.id,x)));return [...unique.values()].sort((a,b)=>(b.created?.seconds||0)-(a.created?.seconds||0));}
function compose(task=''){form('رسالة للفريق',pick('audience','المستلم',[['team','كل الفريق'],...members().filter(x=>x[0]!==S.uid)],true,room==='all'?'team':room)+field('body','الرسالة','text',true,'','maxlength="2000"'),v=>coll('farmMessages').add({...v,task,by:S.uid,created:stamp()}));}
function unread(){return messages().filter(x=>x.by!==S.uid&&!lsGet('gs_read_'+S.uid+'_'+x.id)).length;}
function team(){
 return box('تواصل الفريق',notice('messages','sent','received')+bar(action('رسالة جديدة','compose'),action('كل الرسائل','room','all'),action('الفريق','room','team'),...members().filter(x=>x[0]!==S.uid).map(x=>action(x[1],'room',x[0])))+messages().filter(x=>room==='all'||(room==='team'?x.audience==='team':x.audience!=='team'&&(x.by===room||x.audience===room))).map(x=>card(nameOf(x.by)+' ← '+(x.audience==='team'?'الفريق':nameOf(x.audience)),info(x.body)+(x.task?info('المهمة: '+(rows('jobs').find(j=>j.id===x.task)?.title||x.task)):'')+info(x.created?.seconds?new Date(x.created.seconds*1000).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'}):'بانتظار الحفظ'),x.by!==S.uid&&!lsGet('gs_read_'+S.uid+'_'+x.id)?action('تحديد كمقروءة','read',x.id):'')).join(''));}
const bases=['غير موزع','مباشر للدفعة','ساعات العمل','أيام إشغال الأبراج','عدد الرؤوس','أوزان يحددها المالك'];
function allocations(basis,weights){
 if(basis==='غير موزع')return [];
 const chosen=weights.filter(x=>x.weight>0);
 if(!chosen.length || (basis==='مباشر للدفعة'&&chosen.length!==1))throw Error('حدد وزنًا موجبًا للدفعة المستفيدة، أو اختر غير موزع.');
 return chosen;
}
function financeForm(waterID='',existingID=''){
 if(!owner())return;
 const water=rows('water').find(w=>w.id===waterID),existing=rows('ledger').find(l=>l.id===existingID);
 const fixed=existing?.source||waterID;
 const choices=sowings().map(s=>numField('weight_'+s.id,batchName(s),false,existing?.allocation?.find(x=>x.batch===s.id)?.weight??'')).join('');
 form(existing?'توزيع قيد مالي':water?'تكلفة حمولة الماء':'قيد الدورة الزراعية',
 dateInput(existing?.date||water?.date||S.date)+(fixed?info('تكلفة توريد الماء مرتبطة بهذه الحمولة') :pick('kind','نوع القيد',['تكلفة','مبيعات','شراء مخزون','شراء أصل'],true,existing?.kind||'تكلفة')+
 pick('category','البند',categories,true,existing?.category||'مشتريات أخرى'))+numField('amount','إجمالي المبلغ بالريال',true,existing?.amount??'')+
 field('memo','وصف القيد أو مرجع الفاتورة','text',true,existing?.memo||'')+
 pick('basis','أساس تحميل التكلفة',bases,true,existing?.basis||'غير موزع')+'<details class="full"><summary>تحديد الدفعات وأوزان التوزيع</summary><p>اكتب 1 للدفعة المباشرة أو عدد الساعات / أيام إشغال الأبراج لكل دفعة مشتركة. يوزّع المبلغ بنسبة الأوزان.</p>'+choices+'</details>',async v=>{
 const selected=allocations(v.basis,sowings().map(s=>({batch:s.id,weight:Number(v['weight_'+s.id])||0})));
 if(!(Number(v.amount)>0))throw Error('المبلغ يجب أن يكون أكبر من صفر');
 const ref=existing?coll('farmLedger').doc(existing.id):fixed?coll('farmLedger').doc('water_'+fixed):coll('farmLedger').doc();
 const record={kind:fixed?'تكلفة':v.kind,category:existing&&fixed?existing.category:fixed?(water.tank===tanks[0]?'ماء الخلايا':'ماء الري'):v.category,amount:+v.amount,date:v.date,by:S.uid,memo:v.memo,source:fixed||'',allocation:selected,basis:v.basis};
 await S.db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!existing&&snap.exists)throw Error('تم تسجيل هذه التكلفة بالفعل');if(existing&&!snap.exists)throw Error('القيد لم يعد موجودًا');tx.set(ref,{...record,created:existing?snap.data().created:stamp()});});});
}
function measureCost(ledger,batch){
 const totals={cost:0,sales:0,unassigned:0};
 for(const l of ledger){if(!['تكلفة','مبيعات'].includes(l.kind))continue;
 const a=l.allocation||[],sum=a.reduce((v,x)=>v+x.weight,0),share=a.find(x=>x.batch===batch);
 if(!sum&&l.kind==='تكلفة')totals.unassigned+=l.amount;
 if(share&&sum)totals[l.kind==='مبيعات'?'sales':'cost']+=l.amount*share.weight/sum;}
 return totals;
}
function finance(){
 if(!owner())return info('الحسابات متاحة للمالك.');
 const l=rows('ledger'),s=sowings().find(x=>x.id===financeID),t=measureCost(l,financeID);
 let detail=info('تكاليف لم توزع على دفعات: '+money(t.unassigned));
 if(s){const {harvested}=nursery(s),completeCount=harvested.length>0&&harvested.every(x=>num(x.v.saleable)!==null);
 const heads=completeCount?harvested.reduce((n,x)=>n+Number(x.v.saleable),0):null;
 const kg=harvested.reduce((n,x)=>n+(num(x.v.weight)||0),0);
 detail+=card(batchName(s),info('التكاليف المحملة '+money(t.cost)+' · المبيعات '+money(t.sales))+info('تكلفة الرأس الصالح: '+(heads?money(t.cost/heads):'لم يُحسب بعد')+' · تكلفة الكيلو: '+(kg?money(t.cost/kg):'لم يُحسب بعد'))+info('الهامش: '+(t.sales?money(t.sales-t.cost):'لم تسجل مبيعات')+' · القيم تقديرية إلى إقفال الحصاد وتوزيع تكاليف الدورة'));}
 return box('تكلفة الدورة الزراعية',notice('crop','ledger')+bar(action('إضافة قيد مالي','cost'),action('تصدير PDF','print'))+bar(...batchList().map(x=>action(x[1],'finance-batch',x[0])))+detail+box('دفتر القيود',l.slice().sort(dates).map(x=>card(x.kind+' · '+x.category,info(x.date+' · '+money(x.amount)+' · '+x.memo)+info('أساس التوزيع: '+x.basis),action('عرض وتوزيع','edit-cost',x.id))).join('')));}
function audit(batch,id,entry,next,reason){
 const ref=coll('farmChanges').doc(),reviewed=Boolean(entry?.review);next.auditId=ref.id;
 batch.set(ref,{entry:id,by:S.uid,date:entry?.date||S.date,type:FORM.type,sec:FORM.sec,before:entry?.v||null,after:next,requested:reviewed,reason:reason.trim(),created:stamp()});
}
function notifyChanges(){
 const items=rows('changes').slice().sort((a,b)=>(b.created?.seconds||0)-(a.created?.seconds||0));
 return box('تنبيهات التسجيل والتعديل',notice('changes')+items.map(x=>{
 const keys=Object.keys(x.after||{}).filter(k=>k!=='auditId'&&JSON.stringify(x.after[k])!==JSON.stringify((x.before||{})[k]));
 const fields=typeDef(x.type,x.sec||'t')?.fields||[];
 return card((x.requested?'طلب تصحيح':x.before?'تعديل':'إضافة بتاريخ سابق')+' · '+x.date,info(nameOf(x.by)+' · '+x.reason)+info(x.resolution||'')+'<details><summary>ما تغيّر</summary>'+keys.map(k=>info((fields.find(fd=>fd.k===k)?.l||k)+' : '+(x.before?.[k]??'—')+' ← '+(typeof x.after[k]==='object'?JSON.stringify(x.after[k]):x.after[k]))).join('')+'</details>',isSup()&&x.requested&&!x.resolution?action('اعتماد التصحيح','accept',x.id)+action('رفض التصحيح','reject',x.id):'');
 }).join(''));}
function comparable(obj){if(obj===null||typeof obj!=='object')return obj;if(Array.isArray(obj))return obj.map(comparable);return Object.fromEntries(Object.keys(obj).sort().map(k=>[k,comparable(obj[k])]));}
async function decide(id,accept){
 if(!isSup())return;
 await S.db.runTransaction(async tx=>{const req=coll('farmChanges').doc(id),r=(await tx.get(req)).data();if(!r?.requested||r.resolution)throw Error('سبق اتخاذ قرار');
 if(accept){const ref=coll('entries').doc(r.entry),old=(await tx.get(ref)).data();if(!old||JSON.stringify(comparable(old.v))!==JSON.stringify(comparable(r.before)))throw Error('تغيّر التسجيل منذ إرسال الطلب؛ راجع القيم قبل الاعتماد.');
 tx.update(ref,{v:r.after,time:r.after.time,review:{s:'ok',by:S.uid,at:Date.now(),c:'اعتماد تصحيح'}});}
 tx.update(req,{resolution:accept?'معتمد':'مرفوض',reviewedBy:S.uid,reviewedAt:stamp()});});GSUI.invalidate();toast('تم حفظ قرار المراجعة');
}
function home(current){
 const late=rows('jobs').filter(j=>j.status!=='مكتملة'&&(isSup()||j.assignee===S.uid)),due=Object.entries(cycles).filter(([name,n])=>{const last=rows('service').filter(x=>x.kind===name).sort(dates)[0];return !last||addDays(last.date,n)<=today();});
 const moves=rows('crop').filter(e=>e.type==='xplant'&&e.date===S.date),harvests=rows('crop').filter(e=>e.type==='harvest'&&e.date===S.date);
 const remaining=sowings().filter(e=>e.date<=S.date).map(e=>nursery(e).remaining),known=remaining.filter(x=>x!==null&&x>=0);
 const lastRun=window.SENS && SENS.api.ms(SENS._x.status?.lastRun);
 let h=bar(route('البذور والشتلات','crop'),route('تعبئات الماء','deliveries'),route('المعدات والصيانة','equipment'),route('المهام العامة','jobs'),route('تواصل الفريق'+(unread()?' ('+unread()+')':''),'team'),route('تنبيهات التسجيل','changes'));
 if(current){const balance=data.water&&data.stock&&data.levels?stockBalance(rows('levels')[0],rows('water'),rows('stock')):null;h+=card('الخزان الرئيسي لمياه الري',info(balance&&!balance.unknown&&!balance.bad?f(balance.balance,3)+' طن متبقٍ تقديريًا':'الرصيد غير مؤكد')+((cached.stock||cached.water||cached.levels||!navigator.onLine)?info('آخر بيانات محفوظة') : ''),route('التوريدات والجرد','deliveries'));h+=info('آخر مزامنة للحساسات: '+(lastRun?tsTime(lastRun):'غير متاحة'))+notice('jobs','service','changes');
 if(late.length)h+=card('مهام عامة معلقة ('+late.length+')',info(late.slice(0,3).map(x=>x.title).join(' · ')),route('فتح المهام','jobs'));
 if(data.service&&due.length)h+=card('صيانة وفحص مستحق',info(due.map(x=>x[0]).join(' · ')),route('التنفيذ والسجل','equipment'));
 if(isSup()&&data.changes?.length){const n=data.changes.filter(x=>!lsGet('gs_change_'+S.uid+'_'+x.id)).length;if(n)h+=card('تسجيلات وتعديلات من الفريق',info(n+' تنبيه جديد'),route('التفاصيل','changes'));}}
 if(!data.crop)return h+notice('crop');return h+card('حركة الزراعة · '+S.date,info('نُقل '+moves.reduce((n,x)=>n+(num(x.v.count)||0),0)+' شتلة · حصاد '+f(harvests.reduce((n,x)=>n+(num(x.v.weight)||0),0),1)+' كغ')+(current?info('المتبقي من الدفعات المعدودة: '+(known.length?known.reduce((n,x)=>n+x,0):'غير معروف')+' · دفعات دون رصيد مؤكد: '+(remaining.length-known.length)):''),route('تفاصيل الدفعات','crop'));}
function settings(){return box('إعدادات المزرعة',bar(route('المعدات','equipment'),action('ضبط عدادات الضغط والقراءة المثالية','gauges'),action('تغيير المظهر','theme'),...(owner()?[route('تكلفة الدورة','finance')]:[])));}
function view(page){switch(page){case 'equipment':return equipment();case 'deliveries':return waterPage();case 'crop':return cropPage();case 'finance':return finance();case 'team':return team();case 'changes':return notifyChanges();case 'jobs':return box('المهام العامة',notice('jobs')+(isSup()?action('مهمة جديدة','new-job'):'')+jobList()+'<details><summary>مهام مكتملة</summary>'+jobList(true)+'</details>');}}
async function click(b){
 const {farm:key,id}=b.dataset;
 switch(key){
 case 'route':setTab(id);if(id==='changes')rows('changes').forEach(x=>lsSet('gs_change_'+S.uid+'_'+x.id,'1'));break;
 case 'water-period':form('فترة تعبئات الماء',field('from','من','date',false,waterFrom)+field('to','إلى','date',false,waterTo),v=>{if(v.from&&v.to&&v.from>v.to)throw Error('راجع ترتيب التاريخين');waterFrom=v.from;waterTo=v.to;render(true)});break;
 case 'water':waterForm();break;case 'water-filter':deliveryFilter=id;render(true);break;
 case 'water-cost':financeForm(id);break;case 'cost':financeForm();break;case 'edit-cost':financeForm('',id);break;
 case 'finance-batch':financeID=id;render(true);break;
 case 'sow':S.sec='n';applySec();openForm('sow');break;
 case 'moveBatch':case 'harvestBatch':S.sec='t';applySec();openForm(key==='moveBatch'?'xplant':'harvest',null,{batch:id});break;
 case 'batch':cropID=id;render(true);window.scrollTo(0,0);break;
 case 'pump':S.sec='t';applySec();openForm('pump');break;case 'service':serviceForm(id);break;
 case 'new-job':jobForm();break;case 'job-defer':case 'job-done':jobChange(id,key==='job-done');break;
 case 'compose':case 'message-job':compose(key==='message-job'?id:'');break;
 case 'room':room=id;render(true);break;case 'read':lsSet('gs_read_'+S.uid+'_'+id,'1');render(true);break;
 case 'correct':{const e=findEntry(id);if(e&&e.by===S.uid)openForm(e.type,e);break;}
 case 'accept':case 'reject':await decide(id,key==='accept');break;
 case 'print':$('view').dataset.printTitle='GREEN SIDE · الشفا، الطائف · '+(S.tab==='finance'?'تكلفة الدورة':'تقرير التشغيل')+' · أُنشئ '+today()+' '+nowTime();window.print();break;
 case 'theme':document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';lsSet('gs_theme',document.documentElement.dataset.theme);break;
 case 'gauges':gaugeForm();break;case 'level':levelForm();break;
 }}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-farm]');if(b)click(b).catch(err=>toast(errMsg(err)));});
return {pages,action,start,stop,home,settings,view,validateEntry,gaugeName,gaugeChoices,gaugeSpec,sourceDefault,sourceOptions,setStockTime,stockCard,audit,cropReady:()=>!!data.crop,crops:()=>rows('crop'),test:{allocations,measureCost,nursery,stockBalance,validSpec}};
})();
