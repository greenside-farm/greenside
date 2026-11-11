/* GREEN SIDE 3.4.0 — اللوحة الرئيسية (المشرف والعامل) ومركز المزرعة وتخصيص اللوحة.
   يقرأ البيانات المحمّلة فقط (التسجيلات، الإعدادات، الحساسات، المزرعة) ولا يكتب شيئاً في قاعدة البيانات. */
var Board=(()=>{
'use strict';
/* للعرض فقط: الرقم مع ° أو % يُعزل باتجاه يسار-يمين حتى لا ينقلب داخل النص العربي (‎27°‎ وليس °27) */
const E=x=>esc(String(x??'')).replace(/(-?\d[\d,.]*)(°|%)/g,'\u2066$1$2\u2069');
/* أيقونات بخط واحد وحواف مستديرة */
const P={
 grid:'<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
 chat:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 sprout:'<path d="M7 20h10"/><path d="M12 20v-8"/><path d="M12 12c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6z"/><path d="M12 14c0-2.8-2.2-5-5-5 0 2.8 2.2 5 5 5z"/>',
 chart:'<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M8 17v-5M13 17V8M18 17v-9"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
 gauge:'<path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 cal:'<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/>',
 calok:'<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="M8 15l2 2 4-4"/>',
 drop:'<path d="M12 2.7s6.5 6.8 6.5 11.8a6.5 6.5 0 0 1-13 0c0-5 6.5-11.8 6.5-11.8z"/>',
 therm:'<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5L19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5L19 5"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 radio:'<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9C23 8.8 23 15.1 19.1 19"/><circle cx="12" cy="12" r="2"/>',
 wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
 clip:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14l2 2 4-4"/>',
 chev:'<path d="M15 18l-6-6 6-6"/>',
 camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
 basket:'<path d="M4 10h16l-1.6 9.2a1 1 0 0 1-1 .8H6.6a1 1 0 0 1-1-.8z"/><path d="M8 10l4-6 4 6"/><path d="M10 14v3M14 14v3"/>',
 moveup:'<path d="M12 20V8"/><path d="M7 12l5-5 5 5"/><path d="M5 4h14"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 send:'<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
 back:'<path d="M9 18l6-6-6-6"/>',
 down:'<path d="M6 9l6 6 6-6"/>',
 up:'<path d="M6 15l6-6 6 6"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 bang:'<path d="M12 6v7M12 18v.5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 batt:'<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 10v4"/>',
 leaf:'<path d="M5 20c0-9 6-15 15-15 0 9-6 15-14 15"/><path d="M5 20l8.5-8.5"/>',
 flask:'<path d="M9 3h6M10 3v6l-5.2 9.2A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.8L14 9V3"/><path d="M7.5 15h9"/>',
 coins:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
 list:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
 tasks:'<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
 edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
 spray:'<path d="M9 8h6v12a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/><path d="M10 8V5h4v3"/><path d="M14 5h3l2-2"/><path d="M19 7h2M19 10l1.5 1M19 4.5l1.5-1"/>',
 cloud:'<path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4 12.5 3.5 3.5 0 0 0 6.5 19z"/>',
 history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
 sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
 moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
 truck:'<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
 layers:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'
};
const I=(n,s=20,w=1.8)=>'<svg aria-hidden="true" width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round">'+(P[n]||'')+'</svg>';
const live=()=>S.date===todayStr();
const DT=d=>d?fmtDate(d,{day:'numeric',month:'long'}):'';
const DW=d=>d?fmtDate(d,{weekday:'long',day:'numeric',month:'long'}):'';
/* العدد مع المعدود: واحد، اثنان، 3–10، 11 فأكثر */
const pl=(n,one,two,few,many)=>n===1?one:n===2?two:n>=3&&n<=10?n+' '+few:n+' '+(many||one);
const dN=n=>pl(n,'يوم','يومين','أيام','يوماً');
const hN=h=>h<1?'أقل من ساعة':h<48?pl(Math.round(h),'ساعة','ساعتين','ساعات','ساعة'):dN(Math.round(h/24));
function withSec(sec,fn){const o=S.sec;if(o===sec)return fn();S.sec=sec;try{return fn();}finally{S.sec=o;}}
function firstName(id){return String(nameOf(id)||'').trim().split(/\s+/)[0]||'';}
function names(ids){const n=[...new Set(ids)].map(firstName).filter(Boolean);return n.length<=1?n.join(''):n.slice(0,-1).join('، ')+' و'+n[n.length-1];}

/* ---------- بيانات الحساسات: تُحسب مرة واحدة لكل قسم في الرسم الواحد ---------- */
let SC=null;
function sensors(sec,full){
 if(!window.SENS||!SENS.api||!SENS.api.dash)return null;
 if(!SC){SC={};Promise.resolve().then(()=>{SC=null;});}
 const k=sec+'|'+S.date,c=SC[k];
 if(c&&(c.full||!full))return c.d;
 let d=null;try{d=withSec(sec,()=>SENS.api.dash(S.date,!full));}catch(e){console.warn(e);}
 SC[k]={d,full:!!full};return d;
}
function liveLux(sec){
 if(!window.SENS||!SENS.api||SENS.api.access())return null;
 return withSec(sec,()=>{let best=null;SENS.api.list().forEach(s=>{if(SENS.api.group(s)!=='air'||!SENS.api.codes(s,'lux').length)return;if(window.GSUI&&GSUI.maintained(s.id,Date.now()))return;const q=SENS.api.live(s,'lux');if(q.v!=null&&q.state!=='stale'&&q.state!=='missing'&&(!best||q.at>best.at))best={v:q.v,at:q.at,name:SENS.api.name(s)};});return best;});
}

/* ---------- جولات اليوم: كل موعد في الجدول يقابله تسجيل بالترتيب ---------- */
function slots(sec){
 const rows=secEntries(S.entries,sec),t=todayStr(),isT=S.date===t,past=S.date<t,nm=nowMin(),out=[];
 TASKS[sec].forEach(x=>{
  const type=x[0],T=typeDef(type,sec);if(!T)return;
  const times=schedOf(sec,type),need=needOf(sec,x),seen={},done=[];
  rows.filter(e=>e.type===type).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))||(a.ts||0)-(b.ts||0)).forEach(e=>{const g=e.grp||e.id;if(seen[g])return;seen[g]=1;done.push(e);});
  /* كل تسجيل يُحسب للموعد الأقرب إلى وقته (تسجيل 12:05 يغطي موعد 12:00 وليس 10:00) */
  const slotT=times.length?times.slice(0,need):[],taken=new Array(slotT.length).fill(false),extra=[];
  done.forEach(e=>{
   if(!slotT.length){extra.push(e);return;}
   const m=tMin(e.time||'12:00');let bi=-1,bd=1e9;
   slotT.forEach((st,i)=>{if(taken[i])return;const d=Math.abs(tMin(st)-m);if(d<bd){bd=d;bi=i;}});
   if(bi<0)extra.push(e);else{taken[bi]=true;out.push({type,label:T.label,state:'done',time:e.time||slotT[bi],e});}
  });
  extra.forEach(e=>out.push({type,label:T.label,state:'done',time:e.time||'',e}));
  if(slotT.length)slotT.forEach((st,i)=>{if(taken[i])return;const m=tMin(st);out.push({type,label:T.label,state:past?'late':isT?(nm>m+30?'late':nm>=m?'due':'next'):'next',time:st});});
  else for(let i=done.length;i<need;i++)out.push({type,label:T.label,state:past?'late':'next',time:''});
 });
 return out;
}
/* مواعيد اليوم خارج الجولات: الصيانة والمعايرة والرش */
function chores(sec){
 if(!live())return [];
 const t=todayStr(),out=[];
 (Farm.maintenance()||[]).filter(m=>m.due<=t).forEach(m=>out.push({kind:'chore',maint:true,icon:'wrench',shared:true,label:m.name,state:m.due<t?'late':'due',sub:m.due<t?'متأخرة منذ '+dN(daysBetween(m.due,t)):'صيانة مستحقة اليوم',act:'data-farm="service" data-id="'+E(m.name)+'"'}));
 const c=lastCal(),cd=num(cfg('calDays'))||0;
 if(c&&cd){const over=daysBetween(c.date,t)-cd;if(over>=0)out.push({kind:'chore',icon:'wrench',shared:true,label:'معايرة جهاز EC/pH',state:over>0?'late':'due',sub:over>0?'متأخرة منذ '+dN(over):'مستحقة اليوم',act:'data-act="new" data-type="cal"'});}
 const SP=sprayPlan(sec);
 if(SP.ca&&SP.ca.list.length)out.push({kind:'chore',icon:'spray',label:'رش الكالسيوم',state:'due',sub:'للدفعات المنقولة · '+pl(SP.ca.list.length,'دفعة واحدة','دفعتان','دفعات','دفعة'),act:'data-act="new" data-type="spray"'});
 SP.prev.filter(x=>x.due<=t).forEach(x=>out.push({kind:'chore',icon:'spray',label:x.name,state:x.due<t?'late':'due',sub:x.last?'آخر رش منذ '+dN(daysBetween(x.last.date,t)):'لم يُسجَّل رش بعد',act:'data-act="new" data-type="spray"'}));
 return out;
}
/* ملخص قصير لقيم التسجيل */
function brief(e){
 const v=e.v||{},o=[],ec=num(v.ec),ph=num(v.ph);
 switch(e.type){
  case 'irr':{const l=irrL(v);if(l!=null)o.push(f(l,1)+' لتر');if(ec!=null)o.push('EC '+f(ec));break;}
  case 'mix':case 'ecph':case 'refill':if(ec!=null)o.push('EC '+f(ec));if(ph!=null)o.push('pH '+f(ph,1));if(e.type==='refill'&&num(v.waterAdd)!=null)o.push(f(num(v.waterAdd))+' لتر');break;
  case 'waterOnly':if(num(v.waterAdd)!=null)o.push(f(num(v.waterAdd))+' لتر');break;
  case 'temp':{const a=metric(v,'air'),r=metric(v,'rh');if(a!=null)o.push(f(a,1)+'°');if(r!=null)o.push(f(r)+'%');break;}
  case 'light':{const l=metric(v,'lux');if(l!=null)o.push(f(l)+' لوكس');break;}
  case 'note':if(v.cat)o.push(v.cat===NOTE_OTHER&&v.catX?v.catX:v.cat);break;
  case 'spray':if(v.product)o.push(v.product);break;
  case 'pump':if(num(v.gauge1)!=null)o.push(f(num(v.gauge1),1)+' بار');break;
  case 'harvest':if(num(v.weight)!=null)o.push(f(num(v.weight),1)+' كغ');break;
  case 'sow':if(num(v.seeds)!=null)o.push(f(num(v.seeds))+' بذرة');break;
  case 'count':if(num(v.usable)!=null)o.push(f(num(v.usable))+' شتلة صالحة');break;
  case 'xplant':if(num(v.count)!=null)o.push(f(num(v.count))+' شتلة');if(v.zone)o.push(v.zone);break;
 }
 return o.slice(0,2).join(' · ');
}

/* ---------- ما يحتاج انتباهك: مرتب من الأخطر ---------- */
const RANK={bad:0,warn:1,info:2};
function attention(sec){
 return withSec(sec,()=>{
  const out=[],t=todayStr(),isT=S.date===t,rows=secEntries(S.entries,sec),sup=isSup();
  const add=(sev,o)=>out.push(Object.assign({sev,pri:5},o));
  if(!sup){const fx=window.Rec?Rec.flags():rows.filter(e=>e.review&&e.review.s==='flag'&&e.by===S.uid);
   if(fx.length)add('bad',{icon:'edit',title:pl(fx.length,'تسجيل يحتاج تصحيحاً','تسجيلان يحتاجان تصحيحاً','تسجيلات تحتاج تصحيحاً','تسجيلاً يحتاج تصحيحاً'),sub:((typeDef(fx[0].type,secOf(fx[0])==='g'?sec:secOf(fx[0]))||{}).label||'')+' · '+(fx[0].review.c||'راجع ملاحظة المشرف'),act:'data-bd="queue" data-k="fix"',shared:true,pri:0});}
  if(isT){
   const D=sensors(sec);
   if(D&&!D.access&&D.live){const L=D.live;
    [['temp','air','°','حرارة ',1],['hum','rh','%','رطوبة ',0]].forEach(([k,c,u,lab,d])=>{const q=L[k];if(!q||!isBad(q.state))return;const lm=lim(c,sec,Date.now());
     add('warn',{icon:k==='temp'?'therm':'drop',title:lab+L.name+' '+f(q.v,d)+u,sub:(q.state==='hi'?'فوق الحد '+f(lm[1])+u:'تحت الحد '+f(lm[0])+u)+(q.at?' · '+SENS.api.age(q.at):''),act:'data-bd="tab" data-t="sens"',pri:1});});}
   if(D&&!D.access&&D.water){[['wt','حرارة ماء الخزان ','°',1],['ph','pH الخزان ','',2]].forEach(([k,lab,u,d])=>{const q=D.water[k];if(q&&isBad(q.state))add('warn',{icon:'drop',title:lab+f(q.v,d)+u,sub:q.label+(q.at?' · '+SENS.api.age(q.at):''),act:'data-bd="tab" data-t="sens"',pri:1});});}
   if(S.dayLoaded){const late=slots(sec).filter(x=>x.state==='late');
    if(late.length)add(late.length>1?'bad':'warn',{icon:'clock',title:late.length===1?late[0].label+' متأخر':pl(late.length,'','','جولات متأخرة','جولة متأخرة'),sub:late.length===1?(late[0].time?'موعده '+fmtTime(late[0].time)+' · ':'')+'لم يُسجَّل بعد':lateSummary(late),btn:'سجّل',act:'data-act="new" data-type="'+late[0].type+'"',pri:2});}
   const ch=chores(sec),mt=ch.filter(c=>c.maint);
   /* أكثر من عمل صيانة مستحق: تنبيه واحد يفتح صفحة المعدات */
   if(mt.length>1){const lateM=mt.filter(c=>c.state==='late').length;add(lateM?'bad':'warn',{icon:'wrench',title:lateM?'صيانة متأخرة':'صيانة مستحقة اليوم',sub:mt.map(c=>c.label).join('، '),act:'data-farm="route" data-id="equipment"',shared:true,pri:3});}
   ch.filter(c=>!(c.maint&&mt.length>1)).forEach(c=>add(c.state==='late'?'bad':'warn',{icon:c.icon,title:c.label,sub:c.sub,btn:'سجّل',act:c.act,shared:!!c.shared,pri:3}));
   if(!lastCal())add('warn',{icon:'wrench',title:'معايرة جهاز EC/pH',sub:'لم تُسجَّل معايرة بعد',btn:'سجّل',act:'data-act="new" data-type="cal"',shared:true,pri:4});
   const bi=battInfo(),bh=num(cfg('battHours')),bm=num(cfg('battMaxCharge'));
   if(bi.state==='none')add('warn',{icon:'batt',title:'بطارية مضخة الري',sub:'لم يُسجَّل شحن بعد',btn:canAdd()?'بدء الشحن':'',act:'data-act="battStart"',shared:true,pri:4});
   else if(bi.state==='idle'&&bh&&bi.h>bh)add('bad',{icon:'batt',title:'شحن بطارية مضخة الري',sub:'آخر شحن انتهى منذ '+hN(bi.h),btn:canAdd()?'بدء الشحن':'',act:'data-act="battStart"',shared:true,pri:3});
   else if(bi.state==='charging'&&bm&&bi.h>bm)add('warn',{icon:'batt',title:'البطارية على الشاحن منذ '+hN(bi.h),sub:'افصل الشاحن إذا اكتمل الشحن',btn:canAdd()?'انتهى الشحن':'',act:'data-act="battEnd" data-id="'+E(bi.b.id)+'"',shared:true,pri:4});
   if(D&&!D.access&&D.health&&D.health.n&&D.health.late&&!D.health.cached)add('warn',{icon:'radio',title:'الحساسات لم تُحدَّث',sub:D.health.lastRun?'آخر مزامنة '+SENS.api.age(D.health.lastRun):'لا توجد مزامنة بعد',act:'data-bd="tab" data-t="sens"',shared:true,pri:5});
   const br=badReadings(rows);
   if(br.length)add('warn',{icon:'bang',title:pl(br.length,'قراءة يدوية خارج الحدود','قراءتان يدويتان خارج الحدود','قراءات يدوية خارج الحدود','قراءة يدوية خارج الحدود'),sub:br[0],act:'data-rc="list"',pri:5});
   if(window.Shift&&Shift.hasPending())add('warn',{icon:'cloud',title:'تعويض ماء بانتظار الإرسال',sub:'محفوظ على هذا الجهاز · اضغط لإعادة المحاولة',act:'data-shift="retry"',shared:true,pri:6});
   sprayPlan(sec).phi.forEach(x=>add('info',{icon:'spray',title:'لا تحصد قبل '+DT(x.until),sub:'فترة أمان بعد رش '+(x.e.v.product||''),act:'data-rc="list" data-f="spray"',pri:7}));
  }
  Farm.shiftJobs().filter(j=>j.due<=t).forEach(j=>add(j.title.startsWith('إصلاح تسريب')||j.due<t?'bad':'warn',{icon:'tasks',title:j.title,sub:(j.due<t?'متأخرة منذ '+DT(j.due):'موعدها اليوم')+' · '+nameOf(j.assignee),act:'data-tm="tasks"',shared:true,pri:3}));
  if(sup){
   const pend=rows.filter(e=>!e.review&&!Farm.pendingChange(e.id));
   if(pend.length)add('info',{icon:'clip',title:pl(pend.length,'تسجيل بانتظار مراجعتك','تسجيلان بانتظار مراجعتك','تسجيلات بانتظار مراجعتك','تسجيلاً بانتظار مراجعتك'),sub:'من '+names(pend.map(e=>e.by)),act:'data-bd="queue" data-k="pending"',pri:8});
   const ch=Farm.shiftChanges().length;
   if(ch)add('info',{icon:'edit',title:pl(ch,'طلب تصحيح بانتظار قرارك','طلبا تصحيح بانتظار قرارك','طلبات تصحيح بانتظار قرارك','طلب تصحيح بانتظار قرارك'),sub:'من الفريق',act:'data-farm="route" data-id="changes"',shared:true,pri:8});
   if(isT){const stc=computeStock();['A','B'].forEach(k=>{const o=stc[k];if(o&&o.pct<15)add('warn',{icon:'flask',title:'عبوة '+k+' قاربت على النفاد',sub:'المتبقي نحو '+f(o.pct)+'%',act:'data-bd="tab" data-t="sup"',shared:true,pri:6});});}
  }
  const notes=S.openNotes.filter(e=>secOf(e)===sec);
  if(notes.length)add('info',{icon:'leaf',title:pl(notes.length,'ملاحظة مفتوحة على النبات','ملاحظتان مفتوحتان','ملاحظات مفتوحة','ملاحظة مفتوحة'),sub:brief(notes[0])||(notes[0].v&&notes[0].v.memo)||'',act:'data-rc="list" data-f="note"',pri:9});
  return out.sort((a,b)=>RANK[a.sev]-RANK[b.sev]||a.pri-b.pri);
 });
}
function lateSummary(late){const c=new Map();late.forEach(x=>c.set(x.label,(c.get(x.label)||0)+1));return [...c].map(([l,n])=>n>1?l+' ('+n+')':l).join('، ');}
/* نقطة على زر القسم الآخر: فيه تنبيه خاص به (غير مشترك بين القسمين) */
function dot(sec){try{return live()&&attention(sec).some(a=>a.sev!=='info'&&!a.shared);}catch(e){return false;}}

/* ---------- عناصر الرسم ---------- */
function alertHTML(a){
 return '<a href="#" class="bd-al '+a.sev+'" '+a.act+'><span class="bd-al-ic">'+I(a.icon,18)+'</span><span class="bd-al-t"><b>'+E(a.title)+'</b>'+(a.sub?'<span>'+E(a.sub)+'</span>':'')+'</span>'+(a.btn?'<span class="bd-al-b">'+E(a.btn)+'</span>':'<span class="bd-al-c">'+I('chev',18,2)+'</span>')+'</a>';
}
function head(icon,title,tone,side){return '<div class="bd-h"><span class="bd-hic '+(tone||'')+'">'+I(icon,17)+'</span><h2>'+title+'</h2>'+(side||'')+'</div>';}
function link(label,attrs){return '<a href="#" class="bd-link" '+attrs+'>'+E(label)+I('chev',16,2)+'</a>';}
function card(id,inner,cls){return '<section class="bd-card'+(cls?' '+cls:'')+'" data-card="'+id+'">'+inner+'</section>';}
function gauge(label,valTxt,v,lo,hi,min,max,minL,maxL,aria,neutral){
 const fr=x=>Math.max(0,Math.min(1,(x-min)/(max-min))),pt=q=>{const a=Math.PI*(1-q);return [50+38*Math.cos(a),56-38*Math.sin(a)];};
 const arc=(a,b)=>{const p=pt(a),q=pt(b);return 'M'+p[0].toFixed(1)+' '+p[1].toFixed(1)+' A38 38 0 0 1 '+q[0].toFixed(1)+' '+q[1].toFixed(1);};
 const has=v!=null&&isFinite(v),st=!has?'none':neutral?'ok':lo!=null&&v<lo?'lo':hi!=null&&v>hi?'hi':'ok',m=has?pt(fr(v)):null;
 const band=lo!=null&&hi!=null&&hi>lo?'<path d="'+arc(fr(lo),fr(hi))+'" class="g-band"/>':'';
 return '<div class="bd-g '+st+'"><svg role="img" aria-label="'+E(aria)+'" viewBox="0 0 100 68"><path d="M12 56 A38 38 0 0 1 88 56" class="g-trk"/>'+band+(m?'<circle cx="'+m[0].toFixed(1)+'" cy="'+m[1].toFixed(1)+'" r="7.5" class="g-dot"/>':'')+
  '<text x="50" y="52" text-anchor="middle" class="g-val">'+E(valTxt)+'</text><text x="12" y="67" text-anchor="middle" class="g-min">'+E(minL)+'</text><text x="88" y="67" text-anchor="middle" class="g-min">'+E(maxL)+'</text></svg>'+
  '<b>'+E(label)+'</b><span class="bd-st">'+(st==='none'?'لا قراءة':neutral?'قراءة ليلية':st==='hi'?'أعلى من الحد':st==='lo'?'أقل من الحد':'ضمن الحدود')+'</span></div>';
}
function ring(p,cls,center,unit,label,sub,aria){
 const C=2*Math.PI*34,q=p==null?0:Math.max(0,Math.min(1,p));
 return '<div class="bd-r '+cls+'"><svg role="img" aria-label="'+E(aria)+'" viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" class="r-trk"/>'+(q>0?'<circle cx="42" cy="42" r="34" class="r-val" stroke-dasharray="'+(C*q).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 42 42)"/>':'')+
  '<text x="42" y="45" text-anchor="middle" class="r-num">'+E(center)+'</text><text x="42" y="58" text-anchor="middle" class="r-unit">'+E(unit)+'</text></svg><b><i></i>'+E(label)+'</b><span>'+E(sub)+'</span></div>';
}
function manualDli(sec){
 const L=secEntries(S.entries,sec).filter(e=>e.type==='light').map(e=>({m:tMin(e.time||'12:00'),v:metric(e.v,'lux')})).filter(x=>x.v!=null).sort((a,b)=>a.m-b.m);
 if(L.length<2)return null;
 const dh=dayHours(),a=dh[0]*60,b=dh[1]*60,pts=[{m:a,v:0}].concat(L.filter(x=>x.m>a&&x.m<b)).concat([{m:b,v:0}]);
 if(pts.length<4)return null;
 let s=0;for(let i=1;i<pts.length;i++)s+=(pts[i].v+pts[i-1].v)/2*(pts[i].m-pts[i-1].m)*60;
 const k=window.SENS&&SENS.api.scn?SENS.api.scn('luxPpfd'):0.0185;
 return s*k/1e6;
}
function lastWith(rows,k,noTemp){for(let i=rows.length-1;i>=0;i--){const e=rows[i];if(e.v&&num(e.v[k])!=null&&!(noTemp&&e.type==='temp'))return e;}return null;}
const lastIn=a=>a.length?a[a.length-1]:null;
function byTime(list){return list.slice().sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))||(a.ts||0)-(b.ts||0));}
const KX=x=>x==null?'—':x>=1000?f(x/1000,x<10000?1:0)+'k':f(x);

/* ---------- أقسام اللوحة ---------- */
function nowCard(sec){
 const D=sensors(sec),rows=byTime(secEntries(S.entries,sec)),L=D&&!D.access&&D.live;
 let tq=L&&L.temp&&L.temp.v!=null&&L.temp.state!=='stale'&&L.temp.state!=='missing'?L.temp.v:null,hq=L&&L.hum&&L.hum.v!=null&&L.hum.state!=='stale'&&L.hum.state!=='missing'?L.hum.v:null;
 let src=(tq!=null||hq!=null)?L.name+(L.at?' · '+SENS.api.age(L.at):''):'',when=Date.now();
 if(tq==null&&hq==null){const te=lastIn(rows.filter(e=>e.type==='temp'&&metric(e.v,'air')!=null));if(te){tq=metric(te.v,'air');hq=metric(te.v,'rh');src='قياس يدوي · '+fmtTime(te.time);when=te.time;}}
 const ll=liveLux(sec),le=lastIn(rows.filter(e=>e.type==='light'&&metric(e.v,'lux')!=null));
 const lx=ll?ll.v:le?metric(le.v,'lux'):null,lAt=ll?ll.at:le?le.time:null,night=lAt!=null&&!isDayAt(lAt);
 const at=lim('air',sec,when),ah=lim('rh',sec,when),al=lim('lux',sec);
 const tLo=at[0]??18,tHi=at[1]??30,tMn=Math.floor(Math.min(tLo-8,tq??99)/5)*5,tMx=Math.ceil(Math.max(tHi+12,tq??-99)/5)*5;
 const hMn=hq!=null&&hq<20?0:20,lMax=Math.max(60000,Math.ceil(((al[1]||40000)*1.5)/10000)*10000,lx?Math.ceil(lx*1.1/10000)*10000:0);
 const foot=ll?'الضوء من '+ll.name+' · '+SENS.api.age(ll.at):le?'الضوء من آخر قياس يدوي · '+fmtTime(le.time):'لا يوجد قياس ضوء اليوم بعد';
 return card('now',head('gauge','الآن','',src?'<span class="bd-side">'+E(src)+'</span>':'')+
  '<div class="bd-gauges">'+gauge('الحرارة',tq==null?'—':f(tq,1)+'°',tq,at[0],at[1],tMn,tMx,tMn+'°',tMx+'°','الحرارة '+(tq==null?'لا قراءة':f(tq,1)+' درجة')+'، الحد المسموح '+f(at[0])+' إلى '+f(at[1]))+
  gauge('الرطوبة',hq==null?'—':f(hq)+'%',hq,ah[0],ah[1],hMn,100,hMn+'%','100%','الرطوبة '+(hq==null?'لا قراءة':f(hq)+' بالمئة')+'، الحد المسموح '+f(ah[0])+' إلى '+f(ah[1]))+
  gauge('الضوء',KX(lx),lx,al[0],al[1],0,lMax,'0',KX(lMax),'الضوء '+(lx==null?'لا قراءة':f(lx)+' لوكس'),night)+'</div><p class="bd-foot">'+E(foot)+'</p>');
}
function totalsCard(sec){
 const D=sensors(sec,true),k=D&&!D.access&&D.kpi,rows=secEntries(S.entries,sec);
 const r1type=sec==='n'?'irr':'ecph',x1=TASKS[sec].find(x=>x[0]===r1type),need=x1?needOf(sec,x1):0,done=doneOf(rows,r1type);
 let r1;
 if(sec==='n'){const lit=sum(rows.filter(e=>e.type==='irr').map(e=>irrL(e.v)));r1=ring(need?done/need:done?1:null,'c-water',done+'/'+(need||'—'),'ريّات','الري',lit?f(lit,1)+' لتر':'لا ري بعد','الري '+done+' من '+need+(lit?'، '+f(lit,1)+' لتر':''));}
 else{const le=lastWith(byTime(rows),'ec');r1=ring(need?done/need:done?1:null,'c-water',done+'/'+(need||'—'),'قراءات','المحلول',le?'آخر EC '+f(num(le.v.ec)):'لا قراءة بعد','قراءات المحلول '+done+' من '+need);}
 const sc=x=>window.SENS&&SENS.api.scn?SENS.api.scn(x):null;
 const vp=k&&k.vCov?k.vIn/k.vCov:null,vmin=sc('vpdMin')??0.5,vmax=sc('vpdMax')??1.2;
 const r2=ring(vp,'c-vpd',vp==null?'—':f(vp*100)+'%','في النطاق','VPD',vp==null?'يحتاج حساس حرارة ورطوبة':'الهدف '+f(vmin,1)+'–'+f(vmax,1),vp==null?'VPD لا توجد بيانات':'VPD ضمن النطاق '+f(vp*100)+' بالمئة من ساعات النهار');
 const dmin=sc('dliMin')??12,dmax=sc('dliMax')??17,sDli=k&&k.lux&&k.lCov>=1?k.dli:null,md=sDli==null?manualDli(sec):null,dli=sDli??md;
 const r3=ring(dli==null?null:dli/dmax,'c-light',dli==null?'—':f(dli,1),'mol/m²','ضوء اليوم',dli==null?'سجّل قياسين للضوء':(md!=null?'تقديري · ':'')+'الهدف '+f(dmin)+'–'+f(dmax),'ضوء اليوم '+(dli==null?'غير محسوب':f(dli,1)+' مول من هدف '+f(dmax)));
 return card('totals',head('target','حصيلة اليوم','',live()?'<span class="bd-side">حتى '+E(fmtTime(nowTime()))+'</span>':'')+'<div class="bd-rings">'+r1+r2+r3+'</div>');
}
function timelineHTML(items,noNow){
 const isT=live()&&!noNow,nm=nowMin(),rec=canAdd()&&(live()||isSup()),nowRow='<div class="tl-now"><span class="tl-l"><i></i></span><span class="tl-nt">الآن · '+E(fmtTime(nowTime()))+'</span><hr></div>';
 let h='',marked=!isT;
 const mark=x=>x.state==='done'?'<span class="tl-m done">'+I('check',13,3.2)+'</span>':x.state==='late'?'<span class="tl-m late">'+I('bang',13,3.2)+'</span>':'<span class="tl-m '+x.state+'"></span>';
 items.forEach((x,i)=>{
  if(!marked&&x.state!=='done'&&x.state!=='late'&&(!x.time||tMin(x.time)>=nm||x.state==='due')){h+=nowRow;marked=true;}
  let sub,btn='',attrs='',tm=x.time?fmtTime(x.time):'';
  if(x.state==='done'){const b=brief(x.e);sub=nameOf(x.e.by)+(b?' · '+b:'');if(canEditEntry(x.e))attrs=' data-act="edit" data-id="'+E(x.e.id)+'" role="button" tabindex="0" aria-label="تعديل '+E(x.label)+'"';}
  else{sub=x.kind==='chore'?x.sub:x.state==='late'?'متأخر · لم يُسجَّل':x.state==='due'?'حان الآن':'';
   if(!tm)tm=x.kind==='chore'?'اليوم':'خلال اليوم';
   if(rec)btn='<button type="button" class="tl-b '+x.state+'" '+(x.act||'data-act="new" data-type="'+x.type+'"')+'>سجّل</button>';}
  h+='<div class="tl-row '+x.state+(i===items.length-1?' last':'')+'"'+attrs+'><div class="tl-l">'+mark(x)+'<span class="tl-rail"></span></div><div class="tl-c"><span class="tl-t"><b>'+E(x.label)+'</b><span>'+E(tm+(sub?' · '+sub:''))+'</span></span>'+btn+'</div></div>';
 });
 if(!marked)h+=nowRow;
 return h;
}
function dayItems(sec){
 const key=x=>x.time?tMin(x.time):24*60+(x.state==='late'?0:x.state==='due'?1:2);
 return slots(sec).concat(chores(sec)).sort((a,b)=>key(a)-key(b));
}
/* اليوم الطويل: الجولات المنجزة القديمة تُطوى في سطر واحد، ويبقى آخر منجزَين ظاهرين */
function foldDone(items){
 if(!live()||items.length<=10)return {items,folded:[]};
 const nm=nowMin(),past=items.filter(x=>x.state==='done'&&(!x.time||tMin(x.time)<=nm)),hide=new Set(past.slice(0,Math.max(0,past.length-2)));
 return hide.size>=3?{items:items.filter(x=>!hide.has(x)),folded:items.filter(x=>hide.has(x))}:{items,folded:[]};
}
function timelineCard(sec,compact){
 const title=compact?'جولات اليوم':'جدول اليوم';
 if(!S.dayLoaded)return card('timeline',head('calok',title)+'<div class="bd-skel"></div><p class="bd-empty">جارٍ تحميل سجل اليوم…</p>');
 const items=dayItems(sec),tk=tasksFor(sec,S.entries),rounds=items.filter(x=>x.kind!=='chore'),done=tk.need?tk.done:items.filter(x=>x.state==='done').length,n=tk.need||items.length;
 if(!items.length)return card('timeline',head('calok',title)+'<p class="bd-empty">لا جولات محددة لهذا القسم. حدّد مواعيد الجولات من الإعدادات.</p>');
 const F=foldDone(items),fold=F.folded.length?'<details class="tl-fold"><summary><span class="tl-m done">'+I('check',13,3.2)+'</span><span>'+E(pl(F.folded.length,'جولة منجزة','جولتان منجزتان','جولات منجزة','جولة منجزة')+' حتى '+fmtTime(F.folded[F.folded.length-1].time))+'</span><b>عرض</b></summary>'+timelineHTML(F.folded,true)+'</details>':'';
 return card('timeline',head('calok',title,'','<span class="bd-side"><b>'+done+'</b> من '+n+'</span>')+'<div class="bd-segs" role="img" aria-label="'+E('أُنجز '+done+' من '+n)+'">'+(rounds.length?rounds:items).map(x=>'<i class="'+x.state+'"></i>').join('')+'</div><div class="bd-tl">'+fold+timelineHTML(F.items)+'</div>');
}
function waterCard(sec){
 const rows=byTime(secEntries(S.entries,sec)),D=sensors(sec),W=D&&!D.access?D.water:null;
 let lastE=null;
 const bars=[['ec','الأملاح EC','µS/cm',0],['ph','pH','',2],['wt','حرارة الماء','°',1]].map(([k,lab,u,d])=>{
  const e=lastWith(rows,k,k==='wt');let v=e?num(e.v[k]):null,fromSensor=false;
  if(v==null&&W&&k!=='ec'){const q=k==='wt'?W.wt:W.ph;if(q&&q.v!=null&&q.state!=='stale'&&q.state!=='missing'){v=q.v;fromSensor=true;}}
  if(e&&(!lastE||String(e.time||'')>String(lastE.time||'')))lastE=e;
  const lm=lim(k,sec),lo=lm[0],hi=lm[1];
  if(v==null)return '<div class="bd-wr"><div class="bd-wr-h"><span>'+lab+'</span><span class="bd-muted">لا قراءة'+(live()?' اليوم':'')+'</span></div></div>';
  const span=lo!=null&&hi!=null&&hi>lo?hi-lo:Math.abs(v)||1,mn=Math.min(lo??v,v)-span*0.6,mx=Math.max(hi??v,v)+span*0.6,p=x=>Math.max(0,Math.min(100,(x-mn)/(mx-mn)*100)),bad=(lo!=null&&v<lo)||(hi!=null&&v>hi);
  let prev=null;
  if(e){const i=rows.indexOf(e);for(let j=i-1;j>=0;j--){const x=rows[j];if(x.v&&num(x.v[k])!=null&&!(k==='wt'&&x.type==='temp')){prev=num(x.v[k]);break;}}
   if(prev==null){const h=lastOf(S.hist,r=>secOf(r)===sec&&r.date<S.date&&r.v&&num(r.v[k])!=null);if(h)prev=num(h.v[k]);}}
  const dv=prev==null?null:Number((v-prev).toFixed(d)),chip=dv==null?'':dv===0?'<span class="bd-chg">ثابت</span>':'<span class="bd-chg '+(dv>0?'up':'dn')+'"><bdi dir="ltr">'+(dv>0?'↑ ':'↓ ')+f(Math.abs(dv),d)+'</bdi></span>';
  return '<div class="bd-wr'+(bad?' bad':'')+'"><div class="bd-wr-h"><span>'+lab+(fromSensor?' <small class="bd-src">حساس</small>':'')+'</span><span class="bd-wr-v">'+chip+'<b><bdi dir="ltr">'+f(v,d)+(u==='°'?'°':'')+'</bdi></b>'+(u&&u!=='°'?'<small>'+u+'</small>':'')+'</span></div>'+
   '<div class="bd-bar" role="img" aria-label="'+E(lab+' '+f(v,d)+(lo!=null&&hi!=null?'، المستهدف '+f(lo,d)+' إلى '+f(hi,d):''))+'"><i class="band" style="left:'+(lo==null?0:p(lo)).toFixed(1)+'%;width:'+(lo==null||hi==null?0:p(hi)-p(lo)).toFixed(1)+'%"></i><i class="pin" style="left:calc('+p(v).toFixed(1)+'% - 10px)"></i></div>'+
   '<div class="bd-wr-f"><span>'+(lo==null?'':f(lo,d))+'</span><span>المستهدف</span><span>'+(hi==null?'':f(hi,d))+'</span></div></div>';
 }).join('');
 const nextOf=type=>{const nx=slots(sec).find(x=>x.type===type&&x.state!=='done');if(!nx)return ['—',''];if(!nx.time)return ['اليوم',''];const p=fmtTime(nx.time).split(' ');return [p[0],p[1]||''];};
 let tiles;
 if(sec==='n'){const irr=rows.filter(e=>e.type==='irr'),r=sum(irr.map(e=>irrL(e.v,0))),l=sum(irr.map(e=>irrL(e.v,1))),nx=nextOf('irr');
  tiles=[['ري اليمين',irr.length?f(r,1):'—','لتر'],['ري اليسار',irr.length?f(l,1):'—','لتر'],['الريّة القادمة',nx[0],nx[1]]];}
 else{const ad=rows.filter(e=>e.type==='refill'||e.type==='waterOnly'),add=sum(ad.map(e=>num(e.v&&e.v.waterAdd))),tk=tankState(),nx=nextOf('ecph');
  tiles=[['ماء مضاف',ad.length&&add?f(add):'—','لتر'],['حجم الخزان',tk&&tk.vol>0?f(tk.vol):'—','لتر'],['القراءة القادمة',nx[0],nx[1]]];}
 return card('water',head('drop','المحلول والماء','info',lastE?'<span class="bd-side">'+E(fmtTime(lastE.time)+' · '+firstName(lastE.by))+'</span>':'')+bars+'<div class="bd-tiles">'+tiles.map(t=>'<div><span>'+t[0]+'</span><b>'+E(t[1])+(t[2]?' <small>'+E(t[2])+'</small>':'')+'</b></div>').join('')+'</div>');
}
function chartSVG(D,sec){
 const td=D.today,yd=D.yday,lm=lim('air',sec,'12:00');
 if(!td.pts.length&&!yd.pts.length)return '<p class="bd-empty">لا توجد قراءات حرارة من الحساسات لهذا اليوم.</p>';
 const vals=[].concat(td.pts.map(p=>p.v),yd.pts.map(p=>p.v),[lm[0],lm[1]].filter(x=>x!=null));
 const mn=Math.floor(Math.min.apply(null,vals)-1),mx=Math.ceil(Math.max.apply(null,vals)+1),X=h=>26+h/24*310,Y=v=>96-(v-mn)/(mx-mn||1)*82;
 const path=pts=>{let d='',last=null;pts.forEach(p=>{d+=(last&&p.h-last.h<=0.6?'L':'M')+X(p.h).toFixed(1)+' '+Y(p.v).toFixed(1)+' ';last=p;});return d;};
 const dh=dayHours();let hot='',prevHot=null;
 td.pts.forEach((p,i)=>{
  const isHot=lm[1]!=null&&p.v>lm[1]&&p.h>=dh[0]&&p.h<dh[1];
  if(!isHot){prevHot=null;return;}
  if(prevHot&&p.h-prevHot.h<=0.6)hot+='L'+X(p.h).toFixed(1)+' '+Y(p.v).toFixed(1)+' ';
  else{const q=td.pts[i-1];hot+=(q&&p.h-q.h<=0.6?'M'+X(q.h).toFixed(1)+' '+Y(q.v).toFixed(1)+' L':'M')+X(p.h).toFixed(1)+' '+Y(p.v).toFixed(1)+' ';}
  prevHot=p;
 });
 const lp=td.pts[td.pts.length-1];
 const band=lm[0]!=null&&lm[1]!=null?'<rect x="26" y="'+Y(lm[1]).toFixed(1)+'" width="310" height="'+Math.max(0,Y(lm[0])-Y(lm[1])).toFixed(1)+'" rx="4" class="c-band"/><text x="0" y="'+(Y(lm[1])+3).toFixed(1)+'" class="c-ax">'+f(lm[1])+'°</text><text x="0" y="'+(Y(lm[0])+3).toFixed(1)+'" class="c-ax">'+f(lm[0])+'°</text>':'';
 return '<svg class="bd-chart" role="img" aria-label="منحنى متوسط الحرارة اليوم مقارنة بأمس، مع النطاق المسموح نهاراً" viewBox="0 0 340 116">'+
  [18,48,78].map(y=>'<line x1="26" x2="336" y1="'+y+'" y2="'+y+'" class="c-grid"/>').join('')+band+
  (yd.pts.length?'<path d="'+path(yd.pts)+'" class="c-yd"/>':'')+(td.pts.length?'<path d="'+path(td.pts)+'" class="c-td"/>':'')+(hot?'<path d="'+hot+'" class="c-hot"/>':'')+
  (lp&&live()?'<circle cx="'+X(lp.h).toFixed(1)+'" cy="'+Y(lp.v).toFixed(1)+'" r="5" class="c-now"/>':'')+
  [[0,'12 ص','start'],[6,'6 ص','middle'],[12,'12 م','middle'],[18,'6 م','middle'],[24,'12 ص','end']].map(([h,l,a])=>'<text x="'+X(h).toFixed(0)+'" y="113" text-anchor="'+a+'" class="c-ax">'+l+'</text>').join('')+'</svg>'+
  '<div class="bd-legend"><span><i class="l-td"></i>اليوم</span><span><i class="l-yd"></i>أمس</span><span><i class="l-band"></i>النطاق نهاراً</span><span><i class="l-hot"></i>فوق الحد</span></div>';
}
function climateCard(sec){
 const D=sensors(sec,true);
 if(!D)return '';
 const H=s=>card('climate',head('therm','المناخ اليوم','warn',link('المراقبة','data-bd="tab" data-t="sens"'))+s);
 if(D.access)return H('<p class="bd-empty">'+E(D.access)+'</p>');
 if(!D.air.length)return H('<p class="bd-empty">لا يوجد حساس حرارة في '+E(SECS[sec].name)+'. القياسات اليدوية تظهر في «الآن» و«جدول اليوم».</p>');
 if(D.failed)return H('<p class="bd-empty">تعذّر تحميل قراءات اليوم من الحساسات. تُعاد المحاولة تلقائياً.</p>');
 if(D.loading||!D.today)return H('<div class="bd-skel"></div><p class="bd-empty">جارٍ تحميل قراءات اليوم…</p>');
 const k=D.kpi||{},pk=D.prevKpi||{},td=D.today,yd=D.yday,vp=k.vCov?k.vIn/k.vCov:null,heat=SENS.api.scn('heat');
 const cmp=(a,b,unit,dec)=>a==null||b==null?'':Math.abs(a-b)<0.05?'مثل أمس':(a>b?'أكثر من أمس بـ ':'أقل من أمس بـ ')+f(Math.abs(a-b),dec)+unit;
 const stats=[
  ['therm','الأدنى · الأعلى',td.min==null?'—':f(td.min,1)+'° · '+f(td.max,1)+'°',yd.minSame==null?'':'أمس '+f(yd.minSame,1)+'° · '+f(yd.maxSame,1)+'°',false],
  ['clock','فوق '+f(heat)+'°',k.heat==null?'—':f(k.heat,1)+' س',cmp(k.heat,pk.heat,' س',1),k.heat>0.4],
  ['drop','VPD في النطاق',vp==null?'—':f(vp*100)+'%',vp==null?'يحتاج حرارة ورطوبة':'من '+f(k.vCov,1)+' س نهاراً',vp!=null&&vp<0.5],
  ['sun','متوسط الحرارة',k.tMean==null?'—':f(k.tMean,1)+'°',cmp(k.tMean,pk.tMean,'°',1),false]
 ];
 const hoursSoFar=live()?Math.max(1,(Date.now()-Date.parse(S.date+'T00:00:00+03:00'))/36e5):24;
 return H(chartSVG(D,sec)+'<div class="bd-stats">'+stats.map(s=>'<div class="'+(s[4]?'warn':'')+'"><span>'+I(s[0],14,2)+E(s[1])+'</span><b>'+E(s[2])+'</b>'+(s[3]?'<small>'+E(s[3])+'</small>':'')+'</div>').join('')+'</div>'+
  (k.cov!=null&&k.cov<hoursSoFar*0.6?'<p class="bd-foot warn">القراءات تغطي '+f(k.cov,1)+' ساعة فقط من اليوم، فالأرقام تقريبية.</p>':''));
}
function batchesCard(sec){
 const B=Farm.batchesNow();
 if(!B)return card('batches',head('sprout','الدفعات والإنتاج')+'<div class="bd-skel"></div>');
 const t=todayStr(),list=sec==='n'?B.nursery.slice().sort((a,b)=>b.age-a.age).slice(0,3):B.towers.slice().sort((a,b)=>a.age-b.age).slice(0,3),caU=num(cfg('caUntil','t'))||0;
 const rows=list.map(b=>{
  if(b.kind==='n'){const left=b.target-b.age,ready=left<=0,p=Math.max(2,Math.min(100,b.age/b.target*100));
   return '<a href="#" class="bd-b" data-cy="batch" data-id="'+E(b.id)+'"><div class="bd-b-h"><span><i class="s-n"></i>'+E(b.name)+'</span><em class="'+(ready?'warn':left<=3?'soon':'')+'">'+(ready?'جاهزة للنقل':'النقل بعد '+dN(left))+'</em></div><div class="bd-prog"><i style="width:'+p.toFixed(0)+'%"></i></div><small>عمر '+b.age+' من '+b.target+' يوماً'+(b.remaining!=null?' · '+f(b.remaining)+' شتلة في المشتل':b.seeds?' · '+f(b.seeds)+' بذرة':'')+(b.counted?'':' · لم تُعدّ بعد')+'</small></a>';}
  return '<a href="#" class="bd-b" data-cy="batch" data-id="'+E(b.id)+'"><div class="bd-b-h"><span><i class="s-t"></i>'+E(b.name)+'</span><em>'+(b.age===0?'نُقلت اليوم':dN(b.age)+' في الأبراج')+'</em></div><small>نُقلت '+E(DT(b.date))+(b.count?' · '+f(b.count)+' نبتة':'')+(b.zone?' · '+E(b.zone):'')+(caU&&b.age<=caU?' · فترة رش الكالسيوم':'')+(b.harvested?' · بدأ الحصاد':'')+'</small></a>';
 }).join('');
 const weeks=[];for(let i=5;i>=0;i--){const to=addDays(t,-7*i),from=addDays(to,-6),h=Farm.harvestSummary(Farm.crops(),from,to);weeks.push({v:h.total,cur:i===0,label:i===0?'هذا':(+from.slice(8))+'/'+(+from.slice(5,7))});}
 const mxW=Math.max.apply(null,weeks.map(w=>w.v))||0,prevW=weeks[4].v,curW=weeks[5].v,pc=prevW?Math.round((curW-prevW)/prevW*100):null;
 const chart=mxW?'<div class="bd-harv"><div class="bd-harv-h"><span>الحصاد الأسبوعي · كغ</span>'+(pc!=null?'<em class="'+(pc>=0?'up':'dn')+'"><bdi dir="ltr">'+(pc>=0?'↑ ':'↓ ')+Math.abs(pc)+'%</bdi></em>':'')+'</div><div class="bd-cols" role="img" aria-label="الحصاد في آخر 6 أسابيع: '+weeks.map(w=>f(w.v)).join('، ')+' كغ">'+weeks.map(w=>'<div><small>'+(w.v?f(w.v):'')+'</small><i class="'+(w.cur?'cur':'')+'" style="height:'+Math.max(2,Math.round(w.v/mxW*44))+'px"></i><span>'+E(w.label)+'</span></div>').join('')+'</div></div>':'';
 const empty=!list.length?'<p class="bd-empty">'+(sec==='n'?'لا توجد دفعات بذر خلال آخر 60 يوماً.':'لا توجد دفعات منقولة خلال آخر 70 يوماً.')+'</p>':'';
 return card('batches',head('sprout','الدفعات والإنتاج','green',link('الكل','data-farm="route" data-id="crop"'))+rows+empty+chart);
}
function upcomingCard(sec){
 const t=todayStr(),end=addDays(t,7),out=[];
 (Farm.maintenance()||[]).filter(m=>m.due>t&&m.due<=end).forEach(m=>out.push({d:m.due,t:m.name,s:'كل '+dN(m.interval)+(m.last?' · آخر تنفيذ '+DT(m.last):''),c:'p'}));
 const c=lastCal(),cd=num(cfg('calDays'))||0;if(c&&cd){const d=addDays(c.date,cd);if(d>t&&d<=end)out.push({d,t:'معايرة جهاز EC/pH',s:'آخر معايرة '+DT(c.date),c:'p'});}
 const SP=sprayPlan(sec);if(SP.ca&&SP.ca.due>t&&SP.ca.due<=end)out.push({d:SP.ca.due,t:'رش الكالسيوم',s:'حسب موعد نقل الدفعات',c:'w'});
 SP.prev.filter(x=>x.due>t&&x.due<=end).forEach(x=>out.push({d:x.due,t:x.name,s:'كل '+dN(x.every),c:'w'}));
 const B=Farm.batchesNow();if(B&&sec==='n')B.nursery.forEach(b=>{const d=addDays(b.date,b.target);if(d>t&&d<=end)out.push({d,t:'نقل دفعة'+(b.crop?' '+b.crop:''),s:b.name,c:'g'});});
 Farm.shiftJobs().filter(j=>j.due>t&&j.due<=end).forEach(j=>out.push({d:j.due,t:j.title,s:'مهمة · '+nameOf(j.assignee),c:'i'}));
 if(isSup()){const st=computeStock();['A','B'].forEach(k=>{const o=st[k];if(o&&o.pct>=15&&o.pct<25)out.push({d:'',t:'عبوة '+k+' تقترب من النفاد',s:'المتبقي نحو '+f(o.pct)+'% · حضّر عبوة جديدة',c:'w'});});}
 out.sort((a,b)=>(a.d||'9').localeCompare(b.d||'9'));
 const day=d=>{if(!d)return 'قريباً';const n=daysBetween(t,d);return n===1?'غداً':n===2?'بعد غد':fmtDate(d,{weekday:'long'});};
 return card('upcoming',head('cal','القادم','purple','<span class="bd-side">7 أيام</span>')+(out.length?out.slice(0,5).map(u=>'<div class="bd-u"><span class="bd-u-d '+u.c+'"><i></i><span>'+E(day(u.d))+'</span></span><span class="bd-u-t"><b>'+E(u.t)+'</b><small>'+E(u.s)+'</small></span></div>').join(''):'<p class="bd-empty">لا مواعيد خلال الأيام السبعة القادمة.</p>'));
}
function teamCard(sec){
 const all=S.entries.filter(e=>e.type!=='selftest');
 const ids=Object.keys(S.users).filter(id=>{const u=S.users[id];return u&&!u.selftest&&(u.role==='worker'||u.role==='sup'||id===S.ownerUid);});
 const ppl=ids.map(id=>{const mine=byTime(all.filter(e=>e.by===id));return {id,n:mine.length,last:mine[mine.length-1],worker:S.users[id].role==='worker'};}).filter(p=>p.worker||p.n).sort((a,b)=>b.n-a.n);
 const notes=S.openNotes.filter(e=>secOf(e)===sec),unread=window.Team?Team.unread():Farm.unread();
 const rows=ppl.slice(0,5).map(p=>'<div class="bd-p"><span class="bd-av'+(p.n?' on':'')+'">'+initials(p.id)+'</span><span class="bd-p-t"><b>'+E(nameOf(p.id))+'</b><small>'+(p.n?pl(p.n,'تسجيل واحد','تسجيلان','تسجيلات','تسجيلاً')+' · آخرها '+E(fmtTime(p.last.time)):'لم يسجّل '+(live()?'اليوم بعد':'في هذا اليوم'))+'</small></span>'+(p.n?'<span class="bd-p-n">'+p.n+'</span>':'')+'</div>').join('');
 const note=notes.length?'<a href="#" class="bd-row" data-rc="detail" data-id="'+E(notes[0].id)+'"><span class="bd-hic warn sm">'+I('leaf',15,2)+'</span><span><b>'+(notes.length===1?'ملاحظة مفتوحة':pl(notes.length,'','','ملاحظات مفتوحة','ملاحظة مفتوحة'))+':</b> '+E(brief(notes[0])||(notes[0].v&&notes[0].v.memo)||'')+'</span>'+I('chev',16,2)+'</a>':'';
 return card('team',head('users','الفريق اليوم','teal',link(unread?'الرسائل · '+unread:'الرسائل','data-bd="tab" data-t="team"'))+(rows||'<p class="bd-empty">لا يوجد أعضاء في الفريق بعد.</p>')+note);
}
function sensorsCard(sec){
 const D=sensors(sec);if(!D||D.access||!D.health)return '';
 const h=D.health;if(!h.n)return card('sensors',head('radio','صحة الحساسات')+'<p class="bd-empty">لا توجد حساسات مفعّلة في '+E(SECS[sec].name)+'.</p>');
 const issues=[];
 if(h.error)issues.push(['radio','تنبيه من الجامع: '+String(h.error).slice(0,90)]);
 else if(h.late)issues.push(['radio','آخر مزامنة '+(h.lastRun?SENS.api.age(h.lastRun):'غير معروفة')+' · المتوقع كل 15 دقيقة']);
 if(h.cached)issues.push(['cloud','بيانات الحساسات من النسخة المحفوظة على الجهاز']);
 h.stale.forEach(n=>issues.push(['radio',n+' لا يرسل قراءات']));
 h.lowBatt.forEach(b=>issues.push(['batt','بطارية '+b.name+' '+f(b.v)+'% · استبدلها قريباً']));
 return card('sensors',head('radio','صحة الحساسات','',issues.length?'':'<span class="bd-ok">'+I('check',12,3)+'سليمة</span>')+'<p class="bd-line"><b>'+pl(h.n,'حساس واحد','حساسان','حساسات','حساساً')+'</b> · '+(h.lastRun?'آخر مزامنة '+E(SENS.api.age(h.lastRun)):'لا مزامنة بعد')+'</p>'+issues.map(x=>'<div class="bd-issue">'+I(x[0],18)+'<span>'+E(x[1])+'</span></div>').join(''));
}
/* شريط المناخ المختصر (لوحة العامل) */
function climStrip(sec){
 const D=sensors(sec),L=D&&!D.access&&D.live;let t=null,h=null,st='';
 if(L&&L.temp&&L.temp.v!=null&&L.temp.state!=='stale'&&L.temp.state!=='missing'){t=L.temp.v;h=L.hum&&L.hum.state!=='stale'?L.hum.v:null;st=isBad(L.temp.state)||isBad(L.hum&&L.hum.state)?'bad':'ok';}
 else{const te=lastIn(byTime(secEntries(S.entries,sec)).filter(e=>e.type==='temp'&&metric(e.v,'air')!=null));if(te){t=metric(te.v,'air');h=metric(te.v,'rh');st=isBad(chk('air',t,sec,te.time))||isBad(chk('rh',h,sec,te.time))?'bad':'ok';}}
 if(t==null)return '';
 return '<section class="bd-card bd-strip"><span>الجو الآن</span><span><b><bdi dir="ltr">'+f(t,1)+'°</bdi></b>'+(h!=null?' · رطوبة <bdi dir="ltr">'+f(h)+'%</bdi>':'')+'</span><span class="bd-pill-st '+st+'">'+(st==='bad'?'خارج الحدود':'ضمن الحدود')+'</span></section>';
}

/* ---------- تخصيص اللوحة (يُحفظ في جهاز المستخدم) ---------- */
const SECTIONS=[['now','الآن','الحرارة والرطوبة والضوء بعدّادات'],['totals','حصيلة اليوم','الري وVPD وضوء اليوم'],['timeline','جدول اليوم','الجولات والمواعيد بالترتيب'],['water','المحلول والماء','الأملاح وpH وحرارة الماء والري'],['climate','المناخ اليوم','منحنى الحرارة وساعات الحر وVPD'],['batches','الدفعات والإنتاج','أعمار الدفعات والحصاد الأسبوعي'],['upcoming','القادم','الرش والصيانة والمعايرة خلال 7 أيام'],['team','الفريق اليوم','نشاط الفريق والرسائل والملاحظات'],['sensors','صحة الحساسات','البطاريات والمزامنة']];
function layout(){
 let o=null;try{o=JSON.parse(lsGet('gs_dash_'+S.uid)||'null');}catch(e){}
 const ids=SECTIONS.map(x=>x[0]),order=o&&Array.isArray(o.order)?o.order.filter(id=>ids.includes(id)):[];
 ids.forEach(id=>{if(!order.includes(id))order.push(id);});
 return {order,off:o&&Array.isArray(o.off)?o.off.filter(id=>ids.includes(id)):[]};
}
let CZ=null;
function czHTML(){
 return '<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true" aria-label="تخصيص اللوحة">'+sheetHead('تخصيص اللوحة')+'<p class="help" style="margin-top:0">اختر الأقسام التي تظهر في لوحتك ورتّبها. التنبيهات تبقى دائماً في الأعلى. يُحفظ الترتيب على هذا الجوال.</p><div class="cz">'+
  CZ.order.map((id,i)=>{const s=SECTIONS.find(x=>x[0]===id),on=!CZ.off.includes(id);return '<div class="cz-row'+(on?'':' off')+'"><span class="cz-mv"><button type="button" data-bd="cz-up" data-id="'+id+'" aria-label="نقل '+s[1]+' للأعلى"'+(i?'':' disabled')+'>'+I('up',16,2.4)+'</button><button type="button" data-bd="cz-down" data-id="'+id+'" aria-label="نقل '+s[1]+' للأسفل"'+(i<CZ.order.length-1?'':' disabled')+'>'+I('down',16,2.4)+'</button></span><span class="cz-t"><b>'+s[1]+'</b><small>'+s[2]+'</small></span><button type="button" role="switch" aria-checked="'+on+'" aria-label="إظهار '+s[1]+'" class="cz-sw" data-bd="cz-toggle" data-id="'+id+'"><i></i></button></div>';}).join('')+
  '</div><div class="sheet-actions"><button type="button" class="btn" data-bd="cz-reset">الترتيب الأصلي</button><button type="button" class="btn pri" data-bd="cz-save">حفظ</button></div></div></div>';
}
function openCustomize(){CZ=layout();openSheet(czHTML());}
function openAlerts(){const al=attention(S.sec);openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true" aria-label="كل التنبيهات">'+sheetHead('كل التنبيهات · '+SECS[S.sec].name)+'<div class="bd-al-list">'+(al.map(alertHTML).join('')||'<p class="bd-empty">لا توجد تنبيهات.</p>')+'</div><div style="height:12px"></div></div></div>');}

/* ---------- رأس اللوحة: الحالة والتنبيهات ---------- */
function band(sec,worker){
 const al=live()||isSup()?attention(sec):[],b=al.filter(a=>a.sev==='bad').length,w=al.filter(a=>a.sev==='warn').length,name=SECS[sec].name;
 const D=live()?sensors(sec):null,hl=D&&!D.access&&D.health;
 const when=live()?DW(S.date)+' · '+fmtTime(nowTime()):DW(S.date);
 let title,sub='';
 if(worker){const tk=tasksFor(sec,S.entries);title=live()?(+nowTime().slice(0,2)<12?'صباح الخير':'مساء الخير')+(firstName(S.uid)?'، '+firstName(S.uid):''):'سجل '+name+' · '+DT(S.date);sub=tk.need?'تم إنجاز '+tk.done+' من '+tk.need+' '+(tk.need<=10?'جولات':'جولة')+(live()?' اليوم':''):'لا جولات محددة'+(live()?' اليوم':'');}
 else if(!live())title='سجل '+name+' · '+DT(S.date);
 else if(b)title=pl(b,'أمر عاجل','أمران عاجلان','أمور عاجلة','أمراً عاجلاً')+' في '+name;
 else if(w)title=name+' بحالة جيدة، مع '+(w===1?'تنبيه واحد':w===2?'تنبيهين':pl(w,'','','تنبيهات','تنبيهاً'));
 else title=name+' بحالة جيدة';
 const shown=al.slice(0,worker?2:3),more=al.length-shown.length;
 const sync=hl&&hl.n?(hl.late?'<span class="bd-sync warn"><i></i>'+(hl.lastRun?'آخر مزامنة '+E(SENS.api.age(hl.lastRun)):'لا مزامنة')+'</span>':'<span class="bd-sync"><i></i>متزامن '+E(SENS.api.age(hl.lastRun).replace('منذ ','قبل '))+'</span>'):'';
 return '<section class="bd-band"><div class="bd-when"><span>'+E((worker&&live()?name+' · ':'')+when)+'</span>'+sync+'</div><h1 class="bd-title">'+E(title)+'</h1>'+(sub?'<p class="bd-sub">'+E(sub)+'</p>':'')+
  (S.dayError?'<p class="bd-banner">'+E('تعذّر تحميل سجل اليوم: '+S.dayError)+'</p>':S.dayLoaded&&S.dayCached&&!navigator.onLine?'<p class="bd-banner">السجل من النسخة المحفوظة على الجهاز · يتحدّث عند الاتصال</p>':'')+
  (shown.length?'<div class="bd-alerts">'+shown.map(alertHTML).join('')+'</div>':'')+(more>0?'<button type="button" class="bd-more" data-bd="alerts">'+(more===1?'عرض تنبيه آخر':more===2?'عرض تنبيهين آخرين':'عرض '+pl(more,'','','تنبيهات أخرى','تنبيهاً آخر'))+I('down',14,2.2)+'</button>':'')+'</section>';
}

/* ---------- اللوحة: المشرف ---------- */
function home(){
 if(window.GSUI)GSUI.start();
 const sec=S.sec,L=layout(),isL=live();
 const parts={now:()=>isL?nowCard(sec):'',totals:()=>totalsCard(sec),timeline:()=>timelineCard(sec),water:()=>waterCard(sec),climate:()=>climateCard(sec),batches:()=>isL?batchesCard(sec):'',upcoming:()=>isL?upcomingCard(sec):'',team:()=>teamCard(sec),sensors:()=>isL?sensorsCard(sec):''};
 let h=band(sec,false)+(isL&&window.Shift?Shift.receipts():'');
 if(!isL)h+='<div class="bd-past"><span>تعرض اللوحة سجل '+E(DW(S.date))+'.</span><button type="button" class="btn sm" data-act="gotoday">العودة إلى اليوم</button></div>';
 L.order.forEach(id=>{if(L.off.includes(id))return;try{h+=parts[id]();}catch(e){console.warn('board',id,e);}});
 return h+'<div class="bd-end"><button type="button" class="bd-pill" data-bd="customize">'+I('sliders',18)+'تخصيص اللوحة</button></div>';
}
function next(sec){const items=dayItems(sec);return items.find(x=>x.state==='late')||items.find(x=>x.state==='due')||items.find(x=>x.state==='next')||null;}
/* ---------- اللوحة: العامل ---------- */
function worker(){
 if(window.GSUI)GSUI.start();
 const sec=S.sec,isL=live();
 let h=band(sec,true)+(isL&&window.Shift?Shift.receipts():'');
 if(!isL)h+='<div class="bd-past"><span>تعرض اللوحة سجل '+E(DW(S.date))+'.</span><button type="button" class="btn sm" data-act="gotoday">العودة إلى اليوم</button></div>';
 if(isL&&canAdd()&&S.dayLoaded){
  const nx=next(sec);
  h+=nx?'<section class="bd-next"><small>مهمتك التالية</small><h2>'+E(nx.label)+'</h2><p>'+E((nx.kind==='chore'?nx.sub:nx.state==='late'?'متأخر · موعده '+fmtTime(nx.time):nx.time?'الموعد '+fmtTime(nx.time):'خلال اليوم')+' · '+SECS[sec].name)+'</p><button type="button" class="bd-next-b" '+(nx.act||'data-act="new" data-type="'+nx.type+'"')+'>سجّل الآن</button></section>'
   :'<section class="bd-next done"><small>جولات اليوم</small><h2>أنهيت جولات اليوم</h2><p>شكراً لك، وصلت كل التسجيلات المطلوبة في '+E(SECS[sec].name)+'.</p></section>';
 }
 h+=timelineCard(sec,true);
 const t=todayStr(),jobs=Farm.shiftJobs().filter(j=>j.assignee===S.uid).sort((a,b)=>String(a.due).localeCompare(String(b.due)));
 jobs.slice(0,3).forEach(j=>{h+='<section class="bd-card bd-job"><span class="bd-hic info lg">'+I('tasks',20)+'</span><div><small>مهمة من '+E(firstName(j.by)||'المشرف')+' · '+(j.due<t?'متأخرة منذ '+E(DT(j.due)):j.due===t?'موعدها اليوم':'موعدها '+E(DT(j.due)))+'</small><b>'+E(j.title)+'</b>'+(j.note?'<p>'+E(j.note)+'</p>':'')+'<div class="bd-job-a"><button type="button" class="btn pri" data-farm="job-done" data-id="'+E(j.id)+'">تم التنفيذ</button><button type="button" class="btn" data-farm="job-defer" data-id="'+E(j.id)+'">تأجيل</button></div></div></section>';});
 if(jobs.length>3)h+='<a href="#" class="bd-more-link" data-tm="tasks" data-f="mine">'+pl(jobs.length-3,'مهمة أخرى','مهمتان أخريان','مهام أخرى','مهمة أخرى')+I('chev',16,2)+'</a>';
 if(isL)h+=climStrip(sec);
 return h;
}

/* ---------- مركز المزرعة ---------- */
function hub(){
 if(window.GSUI)GSUI.start();
 const t=todayStr(),M=Farm.maintenance(),due=(M||[]).filter(m=>m.due<=t),T=Farm.tank(),B=Farm.batchesNow(),owner=S.uid===S.ownerUid,sup=isSup(),fe=k=>Farm.err?Farm.err(k):'';
 const D=sensors(S.sec),stc=sup?computeStock():{};
 const act=(label,attrs,pri)=>'<a href="#" class="'+(pri?'pri':'')+'" '+attrs+'>'+(pri?I('plus',15,2.6):I('history',15,2))+E(label)+'</a>';
 const tile=(o)=>'<div class="bd-hub"><a href="#" class="bd-hub-m" '+o.main+' aria-label="'+E(o.title+' · '+o.mainLabel)+'"><span class="bd-hic '+o.tone+' lg">'+I(o.icon,22)+'</span><span class="bd-hub-t"><b>'+E(o.title)+'</b><small class="'+(o.warn?'warn':'')+'">'+E(o.sub)+'</small></span>'+(o.stat!=null&&o.stat!==''?'<span class="bd-hub-s"><b>'+E(o.stat)+'</b><small>'+E(o.statU||'')+'</small></span>':'')+'</a>'+(o.acts?'<div class="bd-hub-a">'+o.acts+'</div>':'')+'</div>';
 let h='<header class="bd-page"><h1>المزرعة</h1><p>اضغط البطاقة للإجراء الأساسي · «السجل» لعرض ما سبق</p></header><div class="bd-hubs">';
 const svc=due.length===1?'data-farm="service" data-id="'+E(due[0].name)+'"':'data-farm="route" data-id="equipment"';
 h+=tile({icon:'wrench',tone:'warn',title:'المعدات والصيانة',sub:!M?(fe('service')?'تعذّر تحميل سجل الصيانة':'جارٍ التحميل…'):due.length?due.map(m=>m.name).join('، ')+(due.length===1?' · مستحق':' · مستحقة'):'لا صيانة مستحقة اليوم',warn:due.length>0,stat:M?String(due.length):'',statU:'مستحقة',main:svc,mainLabel:'تسجيل صيانة',acts:act('تسجيل صيانة',svc,true)+act('السجل','data-farm="route" data-id="equipment"')});
 const tSub=T.error?'تعذّر تحميل سجل المياه':!T.ready?'جارٍ التحميل…':T.none?'لم يُسجَّل جرد للخزان بعد':T.old?'آخر جرد قديم · سجّل جرداً جديداً':T.lastWater?'آخر حمولة '+DT(T.lastWater.date)+' · '+f(T.lastWater.tons,1)+' طن':'لا حمولات مسجلة خلال 120 يوماً';
 const okBal=T.ready&&T.balance!=null&&!T.unknown&&!T.bad;
 h+=tile({icon:'truck',tone:'info',title:'المياه والخزان',sub:tSub,warn:T.ready&&(T.none||T.old||!!T.unknown||T.bad),stat:okBal?f(T.balance,1):'',statU:'طن متبقٍ',main:'data-farm="water"',mainLabel:'استلام حمولة ماء',acts:act('استلام حمولة ماء','data-farm="water"',true)+act('السجل','data-farm="route" data-id="deliveries"')});
 const ready=B?B.nursery.filter(b=>b.age>=b.target).length:0,nB=B?new Set(B.nursery.concat(B.towers).map(b=>b.id)).size:null;
 h+=tile({icon:'sprout',tone:'green',title:'دورة الزراعة',sub:!B?(fe('crop')?'تعذّر تحميل سجل الزراعة':'جارٍ التحميل…'):ready?pl(ready,'دفعة جاهزة للنقل','دفعتان جاهزتان للنقل','دفعات جاهزة للنقل','دفعة جاهزة للنقل'):'لا دفعات جاهزة للنقل اليوم',warn:ready>0,stat:nB==null?'':String(nB),statU:'دفعات قائمة',main:'data-farm="route" data-id="crop"',mainLabel:'الدفعات',acts:act('دفعة جديدة','data-farm="sow"',true)+act('الدفعات','data-farm="route" data-id="crop"')});
 if(sup){const low=['A','B'].filter(k=>stc[k]).map(k=>({k,o:stc[k]})).sort((a,b)=>a.o.pct-b.o.pct)[0];
  h+=tile({icon:'flask',tone:'purple',title:'المحلول والعبوات',sub:low?'عبوة '+low.k+' متبقٍ نحو '+f(low.o.pct)+'%':'سجّل وصفة العبوات لمتابعة المتبقي',warn:!!low&&low.o.pct<25,stat:low?f(low.o.pct)+'%':'',statU:low?'عبوة '+low.k:'',main:'data-bd="tab" data-t="sup"',mainLabel:'العبوات والخلطة',acts:act('وصفة عبوة جديدة','data-act="newRecipe"',true)+act('العبوات','data-bd="tab" data-t="sup"')});}
 const hs=D&&!D.access&&D.health,sIss=hs?hs.stale.length+hs.lowBatt.length+(hs.late?1:0):0;
 h+=tile({icon:'radio',tone:'teal',title:'المراقبة والحساسات',sub:!hs?'الحساسات غير متصلة الآن':!hs.n?'لا حساسات في هذا القسم':sIss?pl(sIss,'ملاحظة على الحساسات','ملاحظتان على الحساسات','ملاحظات على الحساسات','ملاحظة على الحساسات'):'كل الحساسات تعمل',warn:sIss>0,stat:hs?String(hs.n):'',statU:'حساسات',main:'data-bd="tab" data-t="sens"',mainLabel:'فتح المراقبة',acts:act('فتح المراقبة','data-bd="tab" data-t="sens"',true)+(sup?act('التقارير','data-bd="tab" data-t="rep"'):'')});
 if(owner)h+=tile({icon:'coins',tone:'gold',title:'التكاليف والمبيعات',sub:'للمالك فقط · الهامش وتكلفة الكيلو لكل دفعة',main:'data-farm="route" data-id="finance"',mainLabel:'التكاليف والمبيعات',acts:act('تكلفة','data-farm="cost"',true)+act('مبيعات','data-farm="sale"',true)+act('السجل','data-farm="route" data-id="finance"')});
 h+='</div>';
 /* أدوات أخرى: قائمة مختصرة */
 const row=(icon,title,sub,attrs,badge)=>'<a href="#" class="bd-li" '+attrs+'><span class="bd-hic sm">'+I(icon,16)+'</span><span class="bd-li-t"><b>'+E(title)+'</b><small>'+E(sub)+'</small></span>'+(badge?'<span class="bd-badge">'+E(badge)+'</span>':'')+I('chev',16,2)+'</a>';
 const ch=sup?Farm.shiftChanges().length:0;
 h+='<section class="bd-card bd-list"><h2 class="bd-list-h">أدوات أخرى</h2>'+
  row('clip','كل التسجيلات','البحث في تسجيلات اليوم والأيام السابقة','data-rc="list"')+
  (sup?row('calok','المراجعة','التسجيلات بانتظار مراجعتك اليوم','data-bd="queue" data-k="pending"'):'')+
  row('layers','تفاصيل اليوم','المناطق والرش وخطة الزراعة وصور النمو','data-bd="tab" data-t="legacy"')+
  (sup?row('edit','تنبيهات التعديل','التعديلات والتسجيلات المتأخرة وطلبات التصحيح','data-farm="route" data-id="changes"',ch?String(ch):''):'')+
  (sup?row('settings','الإعدادات','الحدود والجولات والمستخدمون وفحص النظام','data-bd="tab" data-t="sup"'):'')+'</section>';
 return h;
}

/* ---------- الأحداث ---------- */
document.addEventListener('click',ev=>{
 const b=ev.target.closest&&ev.target.closest('[data-bd]');if(!b)return;
 ev.preventDefault();const a=b.dataset.bd,id=b.dataset.id,inSheet=!!b.closest('#sheetRoot');
 switch(a){
  case 'tab':if(inSheet&&NAV.sheet)closeSheet();setTab(b.dataset.t);break;
  case 'queue':if(inSheet&&NAV.sheet)closeSheet();if(b.dataset.k==='pending'&&isSup())setTab('review');else if(window.Rec)Rec.openList(b.dataset.k==='fix'?'fix':'all');else GSUI.reviewQueue(b.dataset.k);break;
  case 'alerts':openAlerts();break;
  case 'customize':openCustomize();break;
  case 'cz-toggle':CZ.off=CZ.off.includes(id)?CZ.off.filter(x=>x!==id):CZ.off.concat([id]);$('sheetRoot').innerHTML=czHTML();break;
  case 'cz-up':case 'cz-down':{const i=CZ.order.indexOf(id),j=i+(a==='cz-up'?-1:1);if(i<0||j<0||j>=CZ.order.length)break;const o=CZ.order.slice();o[i]=o[j];o[j]=id;CZ.order=o;$('sheetRoot').innerHTML=czHTML();const nb=document.querySelector('#sheetRoot [data-bd="'+a+'"][data-id="'+id+'"]');if(nb&&!nb.disabled)nb.focus();break;}
  case 'cz-reset':CZ={order:SECTIONS.map(x=>x[0]),off:[]};$('sheetRoot').innerHTML=czHTML();break;
  case 'cz-save':lsSet('gs_dash_'+S.uid,JSON.stringify(CZ));closeSheet();if(S.tab!=='today')setTab('today');else render(true);toast('حُفظ ترتيب اللوحة');break;
  case 'theme':{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;lsSet('gs_theme',next);render(true);if(NAV.sheet&&$('sheetRoot').querySelector('[data-bd="theme"]'))openAccount();break;}
 }
});
/* لوحة المفاتيح: Enter أو المسافة على صف قابل للضغط */
document.addEventListener('keydown',ev=>{const t=ev.target;if((ev.key==='Enter'||ev.key===' ')&&t&&t.matches&&t.matches('#view [role="button"][data-act]')){ev.preventDefault();t.click();}});
/* الروابط الفارغة داخل الصفحات (أزرار مرسومة كروابط) لا تغيّر عنوان الصفحة */
document.addEventListener('click',ev=>{const a=ev.target.closest&&ev.target.closest('a[href="#"]');if(a&&(a.closest('#view')||a.closest('#sheetRoot')))ev.preventDefault();},true);
return {home,worker,hub,attention,dot,icon:I,openCustomize,slots,next,pl,dN,_test:{slots,dayItems,chores,brief,manualDli,layout,pl}};
})();
