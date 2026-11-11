/* GREEN SIDE 3.4.0 — دورة الزراعة: كل دفعة من البذرة إلى الحصاد في مكان واحد، والتكاليف والمبيعات للمالك.
   الدفعة = تسجيل بذر (sow). المراحل تُحسب من التسجيلات المرتبطة بها (v.batch):
   «عدّ» count (العامل يسجّله) ← «نقل» xplant (تسجيل عادي يعمل بدون إنترنت) ← «حصاد» harvest (v.final=true يُقفل الدفعة).
   الدفعات القديمة (cropBalances من 3.3.0): جرد المشرف يُعامل كأول «عدّ» بتاريخ اعتماده، والنقل المتتبَّع يُخصم منه كما كان. */
var Cycle=(()=>{
'use strict';
const E=x=>esc(String(x??'')).replace(/(-?\d[\d,.]*)(°|%)/g,'⁦$1$2⁩');
const I=(n,s,w)=>Board.icon(n,s,w);
const pl=(...a)=>Board.pl(...a), dN=n=>Board.dN(n);
const DT=d=>okDay(d)?fmtDate(d,d.slice(0,4)===todayStr().slice(0,4)?{day:'numeric',month:'long'}:{day:'numeric',month:'long',year:'numeric'}):'';
const owner=()=>!!S.uid&&S.ownerUid===S.uid;
const int=x=>{const n=num(x);return Number.isSafeInteger(n)&&n>=0?n:null;};
const kgOf=x=>{const n=num(x);return n!=null&&n>=0?n:null;};
/* مبلغ بإشارة (+ أو −) يُعزل باتجاه LTR حتى لا تنتقل الإشارة إلى آخر الرقم في سياق عربي */
const signed=(n,d)=>'\u2066'+(n>0?'+':n<0?'−':'')+f(Math.abs(n),d)+'\u2069';
const AUTO='تلقائي بعدد النباتات', ONE='مباشر للدفعة', NONE='غير موزع';
const IDLE=60;            /* دفعة بلا أي تسجيل منذ 60 يوماً تُعد منتهية (بيانات قديمة لم تُقفل) */
const SALE_KINDS=['مبيعات'], COST_KINDS=['تكلفة'];
/* البنود: الاسم المعروض ← الاسم المخزّن (الأسماء المخزنة نفسها في 3.3.0 حتى تبقى القيود القديمة في مكانها) */
const CATS=[['بذور','بذور','sprout'],['أسمدة','أسمدة ومحاليل','flask'],['ماء','ماء الري','drop'],['رواتب','رواتب','users'],['كهرباء','كهرباء','bang'],['صيانة','صيانة','wrench'],['تعبئة','تعبئة وتسويق','layers'],['أخرى','مشتريات أخرى','list']];
const catShort=c=>c==='ماء الخلايا'||c==='ماء الري'?'ماء':(CATS.find(x=>x[1]===c)||[c||'أخرى'])[0];
const catIcon=c=>c==='مبيعات'?'basket':c==='ماء الخلايا'?'drop':(CATS.find(x=>x[1]===c)||[0,0,'coins'])[2];
let tab='batches', month='', batchID='', cache=null;

/* ================= النموذج ================= */
/* وقت الحدث بتوقيت الرياض (تسجيلات بنفس الدقيقة تُرتب برقم الإنشاء) */
function at(e){const t=Date.parse((e.date||'1970-01-01')+'T'+(okHM(e.time)?e.time:'00:00')+':00+03:00');return isFinite(t)?t:0;}
const order=(a,b)=>at(a)-at(b)||(a.ts||0)-(b.ts||0)||String(a.id).localeCompare(String(b.id));
const msOf=x=>x&&typeof x.toMillis==='function'?x.toMillis():x&&typeof x.seconds==='number'?x.seconds*1000:null;
const testUser=id=>!!(S.users[id]&&S.users[id].selftest);
function build(){
 const crops=window.Farm&&Farm.cropReady()?Farm.crops():null;if(!crops)return null;
 const bal=Farm.balances(),t=todayStr(),d2t=num(cfg('daysToTransplant'))||21,d2h=num(cfg('daysToHarvest'))||35;
 if(cache&&cache.crops===crops&&cache.bal===bal&&cache.t===t&&cache.d2t===d2t&&cache.d2h===d2h&&cache.users===S.users)return cache.res;
 const by={},orphans=[];
 crops.forEach(e=>{if(e.type==='sow'&&!testUser(e.by))by[e.id]={e,ev:[]};});
 crops.forEach(e=>{if(e.type==='sow'||testUser(e.by))return;const b=by[txt(e.v.batch,64)];if(b)b.ev.push(e);else if(e.type==='xplant'||e.type==='harvest')orphans.push(e);});
 const list=Object.values(by).map(o=>batch(o,bal.find(x=>x.id===o.e.id),t,d2t,d2h)).sort((a,b)=>b.date.localeCompare(a.date)||(b.e.ts||0)-(a.e.ts||0));
 const res={list,byId:Object.fromEntries(list.map(b=>[b.id,b])),orphans:orphans.sort(order).reverse(),t,d2t,d2h};
 cache={crops,bal,t,d2t,d2h,users:S.users,res};return res;
}
function batch(o,legacy,t,d2t,d2h){
 const e=o.e,v=e.v,ev=o.ev.slice().sort(order),seeds=int(v.seeds);
 const counts=ev.filter(x=>x.type==='count'),moves=ev.filter(x=>x.type==='xplant'),harv=ev.filter(x=>x.type==='harvest');
 /* المشتل: يبدأ بعدد البذور (تقديري) أو «شتلات صالحة» المسجلة في البذر قديماً، ثم كل عدّ يضبط الرصيد وكل نقل يخصم منه */
 const oldUsable=int(v.usable),loss=int(v.lossAfter)||0,opened=legacy?msOf(legacy.opened):null;
 let rem=oldUsable!=null?oldUsable-loss:(seeds??0),known=oldUsable!=null,base=oldUsable,moved=0,lastCount=null,emptiedAt=null;
 const line=[];
 if(legacy&&Number.isSafeInteger(legacy.opening))line.push({c:legacy.opening,t:opened??at(e),ts:0,legacy:true,date:opened?todayStr(new Date(opened)):e.date});
 counts.forEach(x=>{const n=int(x.v.usable);if(n!=null)line.push({c:n,t:at(x),ts:x.ts||0,e:x,date:x.date});});
 moves.forEach(x=>{const n=int(x.v.count)||0;line.push({m:n,t:x.v.stockTracked===true&&opened!=null?Math.max(at(x),opened+1):at(x),ts:x.ts||0,e:x,empty:x.v.emptied===true,date:x.date});});
 line.sort((a,b)=>a.t-b.t||a.ts-b.ts);
 for(const x of line){
  if(x.c!=null){rem=x.c;known=true;base=x.c+moved;lastCount=x;}
  else{moved+=x.m;rem-=x.m;if(x.empty){rem=0;known=true;if(base==null)base=moved;emptiedAt=x.date;}}
 }
 const heads=harv.reduce((n,h)=>n+(int(h.v.count)||0),0),kg=harv.reduce((n,h)=>n+(kgOf(h.v.weight)||0),0);
 const saleable=harv.reduce((n,h)=>{const s=int(h.v.saleable)??(int(h.v.count)!=null?int(h.v.count)-(int(h.v.rejected)||0):null);return n+(s||0);},0);
 const final=harv.filter(h=>h.v.final===true).pop()||null;
 const nursery=Math.max(0,rem),towers=Math.max(0,moved-heads),age=Math.max(0,daysBetween(e.date,t));
 const firstMove=moves.find(x=>(int(x.v.count)||0)>0)?.date||'',lastMove=moves.length?moves[moves.length-1]:null;
 const lastAct=[e.date,...ev.map(x=>x.date)].filter(Boolean).sort().pop()||e.date;
 let stage,why='';
 if(final){stage='done';why='final';}
 else if(daysBetween(lastAct,t)>IDLE){stage='done';why='idle';}
 else if(known&&rem<=0&&moved===0){stage='done';why='empty';}
 else if(rem>0||moved===0)stage=!known&&moved===0?'count':age>=d2t?'ready':'grow';
 else stage=harv.length?'harvest':'towers';
 const name=Farm.batchName(e);
 return {id:e.id,e,name,crop:v.crop||'صنف غير محدد',side:v.side||'',date:e.date,age,seeds,trays:int(v.trays),lot:txt(v.lot,80),
  events:ev,counts,moves,harv,known,estimated:!known,usable:base,germ:base!=null&&seeds?base/seeds*100:null,nursery,conflict:known&&rem<0,
  moved,heads,kg,saleable,towers,final,stage,why,lastAct,firstMove,zone:lastMove?.v.zone||'',lastCount,emptiedAt,legacy:!!legacy,
  inNursery:['count','grow','ready'].includes(stage),inTowers:['towers','harvest'].includes(stage)||(stage!=='done'&&moved>0),
  plants:stage==='done'?0:nursery*(['count','grow','ready'].includes(stage)?1:0)+towers,
  moveDue:addDays(e.date,d2t),harvestDue:firstMove?addDays(firstMove,d2h):''};
}
const all=()=>build()?.list||[];
const get=id=>build()?.byId[id]||null;
const active=()=>all().filter(b=>b.stage!=='done');
/* للوحة الرئيسية (Board): نفس شكل البيانات في 3.3.0 */
function now(){
 const m=build();if(!m)return null;const t=m.t;
 return {nursery:m.list.filter(b=>b.inNursery).map(b=>({id:b.id,kind:'n',name:b.name,crop:b.crop,side:b.side,date:b.date,age:b.age,target:m.d2t,remaining:b.known?b.nursery:null,moved:b.moved,seeds:b.seeds,usable:b.usable,counted:b.known})),
  towers:m.list.filter(b=>b.stage!=='done'&&b.moved>0&&b.towers>0).map(b=>({id:b.id,kind:'t',name:b.name,date:b.firstMove,age:Math.max(0,daysBetween(b.firstMove,t)),count:b.towers,zone:b.zone,harvested:b.harv.length>0}))};
}

/* ================= التكاليف ================= */
const ledger=()=>owner()&&Farm.ledgerReady()?Farm.ledger():[];
function shareOf(l,id){const a=l.allocation||[],sum=a.reduce((n,x)=>n+x.weight,0),s=a.find(x=>x.batch===id);return s&&sum?l.amount*s.weight/sum:0;}
function money(id){
 const out={cost:0,sales:0,cats:{}};
 for(const l of ledger()){
  if(!COST_KINDS.includes(l.kind)&&!SALE_KINDS.includes(l.kind))continue;
  const v=shareOf(l,id);if(!v)continue;
  if(SALE_KINDS.includes(l.kind))out.sales+=v;else{out.cost+=v;const c=catShort(l.category);out.cats[c]=(out.cats[c]||0)+v;}
 }
 return out;
}
/* التوزيع التلقائي: وزن كل دفعة قائمة = عدد نباتاتها الآن (المشتل + الأبراج). يُحسب عند الحفظ ويُخزَّن */
function autoAlloc(){return active().filter(b=>b.plants>0).map(b=>({batch:b.id,weight:b.plants}));}
function allocText(l){
 const a=l.allocation||[];
 if(SALE_KINDS.includes(l.kind))return a.length===1?short(a[0].batch):'مبيعات عامة';
 if(!a.length)return 'تكلفة عامة';
 if(l.basis===AUTO)return 'تُوزَّع على '+pl(a.length,'دفعة واحدة','دفعتين','دفعات','دفعة');
 if(a.length===1)return short(a[0].batch);
 return 'توزيع يدوي على '+pl(a.length,'دفعة واحدة','دفعتين','دفعات','دفعة');
}
function short(id){const b=get(id);return b?b.crop.replace(/^خس\s+/,'')+(b.side?' · '+b.side:''):'دفعة غير معروفة';}

/* ================= أجزاء الواجهة ================= */
const STEPS=['بذر','عدّ','نقل','حصاد'];
function steps(cur,done,labels,subs){
 labels=labels||STEPS;
 return '<ol class="cy-steps'+(subs?' big':'')+'">'+labels.map((l,i)=>'<li class="'+(i<done?'done':i===cur?'cur':'')+'"><i>'+(i<done?I('check',12,3):'')+'</i><span>'+E(l)+'</span>'+(subs?'<small>'+E(subs[i]||'—')+'</small>':'')+'</li>').join('')+'</ol>';
}
function flow(parts){return '<div class="cy-flow">'+parts.map((x,i)=>(i?'<b class="ar" aria-hidden="true">'+I('chev',12,2.6)+'</b>':'')+'<span'+(x[2]?' class="'+x[2]+'"':'')+'><b>'+E(x[0])+'</b>'+E(x[1])+'</span>').join('')+'</div>';}
const LOOK={count:['sprout',''],grow:['sprout',''],ready:['moveup','warn'],towers:['leaf','info'],harvest:['basket','ok'],done:['check','gray']};
function status(b){
 switch(b.stage){
  case 'count':return [b.age>=build().d2t?'عمرها '+dN(b.age):'لم تُعدّ بعد',b.age>=build().d2t?'warn':''];
  case 'grow':return ['النقل بعد '+dN(Math.max(1,daysBetween(todayStr(),b.moveDue))),''];
  case 'ready':return ['عمرها '+dN(b.age),'warn'];
  case 'towers':{const d=b.harvestDue?daysBetween(todayStr(),b.harvestDue):0;return [d>0?'الحصاد بعد '+dN(d):'موعد الحصاد',d>0?'':'ok'];}
  case 'harvest':return ['قيد الحصاد','ok'];
  default:return [b.why==='final'?'أُقفلت':b.why==='empty'?'لم يبقَ شيء':'بلا نشاط منذ '+dN(daysBetween(b.lastAct,todayStr())),''];
 }
}
function sub(b){
 if(b.inTowers&&!b.inNursery&&b.firstMove)return (b.zone||b.side||'')+' · نُقلت '+DT(b.firstMove);
 return (b.side?b.side+' · ':'')+'بُذرت '+DT(b.date);
}
function chips(b){
 const p=[[f(b.seeds),' بذرة']];
 if(b.stage==='count')p.push(['—',' لم تُعدّ بعد','dim']);
 else if(b.stage==='harvest'||(b.stage==='done'&&b.harv.length)){p.push([f(b.moved),' منقولة']);p.push([f(b.heads),' محصودة · '+f(b.kg,1)+' كغ','hl']);}
 else if(b.inNursery){
  if(b.usable!=null)p.push([f(b.usable),' شتلة'+(!b.moved&&b.germ!=null?' · إنبات '+f(b.germ)+'%':''),b.moved?'':'hl']);else p.push(['—',' لم تُعدّ بعد','dim']);
  if(b.moved){p.push([f(b.moved),' منقولة']);p.push([f(b.nursery),b.known?' في المشتل':' في المشتل تقديرياً','hl']);}
 }
 else{if(b.usable!=null)p.push([f(b.usable),' شتلة']);p.push([f(b.towers),' في الأبراج','hl']);}
 return flow(p);
}
function stepState(b){
 if(b.stage==='done')return [4,4];
 if(b.stage==='count')return [1,1];
 if(b.inNursery)return [b.known?2:1,2];
 return [b.known||b.moved?3:1,3];
}
function action(b){
 if(b.stage==='count')return ['check','عدّ الشتلات','count'];
 if(b.inNursery)return ['moveup','انقل إلى الأبراج','move'];
 if(b.stage!=='done')return ['basket','سجّل حصاداً','harvest'];
 return null;
}
function progress(b){
 const m=build();
 if(b.inNursery)return Math.max(3,Math.min(100,b.age/m.d2t*100));
 if(b.stage==='towers'&&b.firstMove)return Math.max(3,Math.min(100,daysBetween(b.firstMove,todayStr())/m.d2h*100));
 return null;
}
function card(b){
 const [ic,tone]=LOOK[b.stage],[st,stc]=status(b),[done,cur]=stepState(b),a=action(b),p=progress(b);
 return '<article class="cy-card"><div class="cy-top"><span class="bd-hic '+tone+'">'+I(ic,18)+'</span><div class="cy-t"><b>'+E(b.crop)+'</b><small>'+E(sub(b))+'</small></div><span class="cy-st '+stc+'">'+E(st)+'</span></div>'+
  (p!=null?'<div class="bd-prog" aria-hidden="true"><i style="width:'+p.toFixed(0)+'%"></i></div>':'')+steps(cur,done)+chips(b)+
  '<div class="cy-act">'+(a?'<a href="#" class="cy-go" data-cy="'+a[2]+'" data-id="'+E(b.id)+'">'+I(a[0],16,2.4)+E(a[1])+'</a>':'')+'<a href="#" class="cy-more" data-cy="batch" data-id="'+E(b.id)+'">التفاصيل'+I('chev',14,2.2)+'</a></div></article>';
}
const head=(t,n,tone)=>'<h2 class="cy-sec '+(tone||'')+'"><i></i>'+E(t)+(n!=null?'<em>'+E(n)+'</em>':'')+'</h2>';
function segs(){return owner()?'<div class="rc-seg" role="tablist"><button type="button" role="tab" data-cy="tab" data-id="batches" aria-selected="'+(tab==='batches')+'">الدفعات</button><button type="button" role="tab" data-cy="tab" data-id="costs" aria-selected="'+(tab==='costs')+'">التكاليف والمبيعات</button></div>':'';}
function loading(){
 const err=Farm.err('crop');
 return err?'<p class="banner warn">'+E(err)+'</p>':'<div class="bd-skel"></div><div class="bd-skel"></div>';
}

/* ---------- A: الدفعات ---------- */
function listPage(){
 const m=build();
 let h='<header class="bd-page"><h1>دورة الزراعة</h1><p>كل دفعة من البذرة إلى الحصاد في مكان واحد</p></header>'+segs();
 if(tab==='costs'&&owner())return h+costsBody();
 if(!m)return h+loading();
 const L=m.list,ready=L.filter(b=>b.stage==='ready'),grow=L.filter(b=>b.stage==='grow'||b.stage==='count'),tw=L.filter(b=>b.stage==='towers'||b.stage==='harvest'),done=L.filter(b=>b.stage==='done');
 const mo=todayStr().slice(0,7),kgMonth=Farm.crops().filter(e=>e.type==='harvest'&&String(e.date).slice(0,7)===mo&&!testUser(e.by)).reduce((n,e)=>n+(kgOf(e.v.weight)||0),0);
 const sumN=a=>a.reduce((n,b)=>n+b.nursery,0);
 h+='<div class="cy-pipe"><div><span>في المشتل</span><b>'+grow.length+'</b><small>'+E(f(sumN(grow))+' شتلة')+'</small></div><div class="warn"><span>جاهزة للنقل</span><b>'+ready.length+'</b><small>'+E(f(sumN(ready))+' شتلة')+'</small></div>'+
  '<div class="t"><span>في الأبراج</span><b>'+tw.length+'</b><small>'+E(f(tw.reduce((n,b)=>n+b.towers,0))+' نبتة')+'</small></div><div class="ok"><span>حصاد الشهر</span><b>'+E(f(kgMonth,kgMonth<10?1:0))+'</b><small>كغ</small></div></div>';
 if(Farm.cropCached())h+='<p class="cy-off">'+I('cloud',14,2)+'نسخة محفوظة على الجهاز · تتحدّث عند الاتصال</p>';
 h+='<a href="#" class="rc-big" data-cy="sow">'+I('plus',20,2.6)+'دفعة جديدة · بذر</a>';
 if(ready.length)h+=head('جاهزة للنقل',ready.length,'warn')+ready.sort((a,b)=>b.age-a.age).map(card).join('');
 if(grow.length)h+=head('في المشتل',grow.length)+grow.sort((a,b)=>b.age-a.age).map(card).join('');
 if(tw.length)h+=head('في الأبراج',tw.length,'t')+tw.sort((a,b)=>(a.firstMove||'').localeCompare(b.firstMove||'')).map(card).join('');
 if(!ready.length&&!grow.length&&!tw.length)h+='<p class="bd-empty">لا توجد دفعات قائمة. ابدأ بتسجيل البذر.</p>';
 if(m.orphans.length)h+='<details class="cy-orph"><summary>'+E(pl(m.orphans.length,'تسجيل قديم بلا دفعة','تسجيلان قديمان بلا دفعة','تسجيلات قديمة بلا دفعة','تسجيلاً قديماً بلا دفعة'))+'</summary><div class="rc-box">'+m.orphans.slice(0,30).map(logRow).join('')+'</div></details>';
 if(done.length)h+='<a href="#" class="cy-done" data-cy="done">'+E('الدفعات المنتهية · '+done.length)+I('chev',16,2.2)+'</a>';
 if(isSup()&&Farm.harvestWeeks)h+='<details class="cy-orph"><summary>الحصاد الفعلي خلال أسبوعين</summary>'+Farm.harvestWeeks()+'</details>';
 return h;
}
/* ---------- الدفعات المنتهية ---------- */
function donePage(){
 const m=build();
 let h='<header class="bd-page"><h1>الدفعات المنتهية</h1><p>دفعات أُقفلت بآخر حصاد أو انتهت بلا نشاط</p></header>';
 if(!m)return h+loading();
 const L=m.list.filter(b=>b.stage==='done').sort((a,b)=>b.lastAct.localeCompare(a.lastAct));
 if(!L.length)return h+'<p class="bd-empty">لا توجد دفعات منتهية خلال آخر 180 يوماً.</p>';
 return h+'<div class="rc-box">'+L.map(b=>{const c=owner()?money(b.id):null,[st]=status(b);
  return '<a href="#" class="rc-row" data-cy="batch" data-id="'+E(b.id)+'"><span class="bd-hic gray">'+I(b.harv.length?'basket':'sprout',18)+'</span><span class="rc-row-t"><b>'+E(b.crop+(b.side?' · '+b.side:''))+'</b><small>'+E('بُذرت '+DT(b.date)+' · '+st)+'</small><span class="rc-vals">'+
   (b.kg?'<span class="rc-v">'+E(f(b.kg,1)+' كغ')+'</span>':'')+(b.heads?'<span class="rc-v">'+E(f(b.heads)+' رأس')+'</span>':'')+(c&&(c.cost||c.sales)?'<span class="rc-v">'+E('الهامش '+signed(c.sales-c.cost))+'</span>':'')+'</span></span>'+I('chev',16,2)+'</a>';}).join('')+'</div>'+
  '<p class="muted cy-foot-note">يُقرأ سجل الزراعة لآخر 180 يوماً فقط.</p>';
}

/* ---------- B: صفحة الدفعة ---------- */
const TYPE_LOOK={sow:['sprout','green'],count:['check','green'],xplant:['moveup','info'],harvest:['basket','ok']};
const REVIEW={pending:['بانتظار المراجعة','warn'],fix:['مطلوب تصحيح','bad'],again:['أُعيد للمراجعة','warn'],ok:['معتمد','ok']};
function logTitle(e){
 const v=e.v;
 switch(e.type){
  case 'sow':return 'بذر '+f(int(v.seeds))+' بذرة';
  case 'count':return 'عدّ الشتلات: '+f(int(v.usable))+' صالحة';
  case 'xplant':return 'نقل '+f(int(v.count))+' شتلة إلى الأبراج'+(v.emptied===true?' · المشتل فارغ':'');
  case 'harvest':return 'حصاد '+f(kgOf(v.weight),1)+' كغ'+(int(v.count)!=null?' · '+f(int(v.count))+' رأس':'')+(v.final===true?' · آخر حصاد':'');
 }
 return e.type;
}
function logRow(e){
 const [ic,tone]=TYPE_LOOK[e.type]||['list','gray'],v=e.v,vals=[];
 if(e.type==='sow'&&int(v.trays)!=null)vals.push(f(int(v.trays))+' صواني');
 if(e.type==='count'){const b=get(v.batch);if(b&&b.seeds&&int(v.usable)!=null&&b.lastCount?.e===e&&b.germ!=null)vals.push('إنبات '+f(b.germ)+'%');}
 if(e.type==='xplant'){if(v.zone)vals.push(v.zone);if(v.towers)vals.push('أبراج '+v.towers);if(v.stockTracked===true)vals.push('قبل 3.4.0');}
 if(e.type==='harvest'){if(v.grade)vals.push(v.grade);if(int(v.rejected))vals.push('مستبعد '+f(int(v.rejected)));}
 vals.push(String(nameOf(e.by)).trim().split(/\s+/)[0]);
 const st=window.Shift&&Shift.stateOf?REVIEW[Shift.stateOf(e)]:null;
 return '<a href="#" class="rc-row" data-rc="detail" data-id="'+E(e.id)+'"><span class="bd-hic '+tone+'">'+I(ic,18)+'</span><span class="rc-row-t"><b>'+E(logTitle(e))+'</b><small>'+E(DT(e.date)+(e.time?' · '+fmtTime(e.time):''))+'</small><span class="rc-vals">'+vals.filter(Boolean).map(x=>'<span class="rc-v">'+E(x)+'</span>').join('')+'</span></span>'+
  (st?'<span class="rc-tag '+st[1]+'">'+E(st[0])+'</span>':'')+I('chev',16,2)+'</a>';
}
function nextStep(b){
 const t=todayStr();
 switch(b.stage){
  case 'count':return ['عدّ الشتلات','بُذرت '+f(b.seeds)+' بذرة قبل '+dN(b.age)+'. سجّل عدد الشتلات الصالحة الآن.',['check','عدّ الشتلات','count']];
  case 'grow':return [b.moved?'انقل بقية الشتلات':'النقل بعد '+dN(Math.max(1,daysBetween(t,b.moveDue))),(b.known?'في المشتل ':'في المشتل تقديرياً ')+f(b.nursery)+' شتلة · موعد النقل '+DT(b.moveDue),['moveup','انقل إلى الأبراج','move']];
  case 'ready':return [b.moved?'انقل بقية الشتلات':'انقل الشتلات إلى الأبراج',(b.known?'في المشتل ':'في المشتل تقديرياً ')+f(b.nursery)+' شتلة جاهزة منذ '+(b.moveDue===t?'اليوم':DT(b.moveDue)),['moveup','انقل إلى الأبراج','move']];
  case 'towers':return ['سجّل الحصاد','في الأبراج '+f(b.towers)+' نبتة'+(b.harvestDue?' · موعد الحصاد '+DT(b.harvestDue):''),['basket','سجّل حصاداً','harvest']];
  case 'harvest':return ['تابع الحصاد','حُصد '+f(b.heads)+' رأساً · '+f(b.kg,1)+' كغ حتى الآن. اختر «هذا آخر حصاد» عند الانتهاء.',['basket','سجّل حصاداً','harvest']];
 }
 return ['انتهت الدفعة',b.why==='final'?'أُقفلت بآخر حصاد في '+DT(b.final.date)+' · '+f(b.kg,1)+' كغ':b.why==='empty'?'سُجّل العدّ صفراً ولم يُنقل شيء':'لا تسجيلات منذ '+DT(b.lastAct)+'؛ تُعرض مع الدفعات المنتهية',null];
}
function batchPage(){
 const m=build();
 if(!m)return '<header class="bd-page"><h1>الدفعة</h1></header>'+loading();
 const b=m.byId[batchID];
 if(!b)return '<header class="bd-page"><h1>الدفعة غير موجودة</h1><p>ربما حُذف تسجيل البذر أو هو أقدم من 180 يوماً.</p></header>';
 const [done,cur]=stepState(b),stepCur=b.stage==='done'?5:cur;
 const sub5=[DT(b.date),b.lastCount?DT(b.lastCount.date):(b.known&&b.usable!=null?'مع البذر':''),b.moved?f(b.moved)+(b.usable!=null?' من '+f(b.usable):''):'',b.kg?f(b.kg,1)+' كغ':'',b.final?DT(b.final.date):''];
 let h='<header class="rc-head"><div class="rc-head-r"><h1>'+E(b.crop)+'</h1>'+(b.side?'<span class="rc-sec"><i></i>'+E(b.side)+'</span>':'')+'</div><p class="rc-head-p">'+E(['بُذرت '+DT(b.date),'عمرها '+dN(b.age),b.lot?'تشغيلة '+b.lot:''].filter(Boolean).join(' · '))+'</p></header>';
 h+='<section class="bd-card">'+steps(stepCur,b.stage==='done'?5:done,['بذر','عدّ','نقل','حصاد','إقفال'],sub5)+'</section>';
 const [nt,np,na]=nextStep(b);
 h+='<section class="bd-next'+(na?'':' done')+'"><small>الخطوة التالية</small><h2>'+E(nt)+'</h2><p>'+E(np)+'</p>'+(na?'<button type="button" class="bd-next-b" data-cy="'+na[2]+'" data-id="'+E(b.id)+'">'+I(na[0],18,2.2)+' '+E(na[1])+'</button>':'')+'</section>';
 if(b.stage!=='done'&&b.inNursery&&b.moved===0&&b.stage!=='count')h+='<p class="cy-tip">النقل لا ينتظر اعتماد المشرف للعدّ. يمكن العدّ مرة أخرى في أي وقت؛ آخر عدّ هو المعتمد.</p>';
 /* أرقام الدفعة */
 const mx=Math.max(b.seeds||0,b.usable||0,b.moved,1),w=x=>Math.max(x?2:0,Math.round((x||0)/mx*100));
 const row=(l,n,cls,em,dim)=>'<div'+(dim?' class="dim"':'')+'><span>'+E(l)+'</span><i class="'+(cls||'')+'" style="width:'+w(n)+'%"></i><b>'+E(n==null?'—':f(n))+'</b>'+(em?'<em>'+E(em)+'</em>':'')+'</div>';
 h+='<section class="bd-card"><div class="bd-h"><span class="bd-hic">'+I('layers',18)+'</span><h2 class="bd-title">أرقام الدفعة</h2></div><div class="cy-fun">'+
  row('بذور',b.seeds)+row('شتلات صالحة',b.usable,'',b.germ!=null?'إنبات '+f(b.germ)+'%':b.known?'':'لم تُعدّ بعد',b.usable==null)+row('منقولة للأبراج',b.moved,'t','',!b.moved)+
  row(b.known?'باقية في المشتل':'باقية تقديرياً',b.stage==='done'&&b.why!=='final'&&!b.inNursery?0:b.nursery,'w','',!b.nursery)+
  '<div'+(b.heads||b.kg?'':' class="dim"')+'><span>محصودة</span><i class="g" style="width:'+w(b.heads)+'%"></i><b>'+E(b.heads?f(b.heads):b.kg?'—':'—')+'</b>'+(b.kg?'<em>'+E(f(b.kg,1)+' كغ'+(b.heads?' · متوسط الرأس '+f(b.kg*1000/b.heads)+' غ':''))+'</em>':'')+'</div></div>'+
  (b.conflict?'<p class="bd-foot warn">المنقول أكثر من آخر عدّ. راجع العدّ أو أعداد النقل.</p>':'')+(b.legacy?'<p class="bd-foot">دفعة من الإصدار السابق: جرد المشرف يُحسب كأول عدّ.</p>':'')+'</section>';
 /* التكلفة والعائد (للمالك) */
 if(owner()){
  const c=money(b.id),per=b.kg?['تكلفة الكيلو',c.cost/b.kg]:b.usable?['تكلفة الشتلة',c.cost/b.usable]:['تكلفة الشتلة',null];
  const cats=Object.entries(c.cats).sort((x,y)=>y[1]-x[1]);
  h+='<section class="bd-card"><div class="bd-h"><span class="bd-hic gold">'+I('coins',18)+'</span><h2 class="bd-title">التكلفة والعائد</h2><a href="#" class="bd-link" data-cy="tab" data-id="costs">التفاصيل'+I('chev',14,2.2)+'</a></div>'+
   (Farm.ledgerReady()?'':'<p class="muted">جارٍ تحميل القيود…</p>')+
   '<div class="rc-stats"><div><span>التكلفة حتى الآن</span><b>'+E(f(c.cost))+'</b><span>ريال</span></div><div><span>'+E(per[0])+'</span><b>'+E(per[1]==null?'—':f(per[1],2))+'</b><span>ريال</span></div><div class="'+(c.sales>c.cost?'ok':'')+'"><span>المبيعات</span><b>'+E(c.sales?f(c.sales):'—')+'</b><span>'+E(c.sales?'الهامش '+signed(c.sales-c.cost):'بعد الحصاد')+'</span></div></div>'+
   (cats.length?'<div class="cy-cost">'+cats.map(([k,v])=>'<span><b>'+E(f(v))+'</b> '+E(k)+'</span>').join('')+'</div>':'')+
   '<div class="cy-two"><a href="#" class="cy-add" data-cy="cost" data-id="'+E(b.id)+'">'+I('plus',16,2.4)+'تكلفة لهذه الدفعة</a>'+(b.harv.length?'<a href="#" class="cy-add" data-cy="sale" data-id="'+E(b.id)+'">'+I('plus',16,2.4)+'مبيعات</a>':'')+'</div></section>';
 }
 h+=head('سجل الدفعة')+'<div class="rc-box">'+[b.e,...b.events].slice().sort(order).reverse().map(logRow).join('')+'</div>';
 const close=b.stage==='done'?'':b.moved?'<a href="#" data-cy="close" data-id="'+E(b.id)+'">إقفال الدفعة</a>':'<a href="#" data-cy="close" data-id="'+E(b.id)+'">إقفال الدفعة (لم يبقَ شيء)</a>';
 h+='<div class="cy-foot"><a href="#" data-cy="export" data-id="'+E(b.id)+'">تصدير سجل الدفعة</a>'+close+'</div>';
 return h;
}

/* ---------- F: التكاليف والمبيعات (المالك) ---------- */
function monthLabel(m){return fmtDate(m+'-15',{month:'long',year:'numeric'});}
function costsBody(){
 if(!owner())return '';
 const err=Farm.err('ledger');if(err)return '<p class="banner warn">'+E(err)+'</p>';
 if(!Farm.ledgerReady())return loading();
 const cur=todayStr().slice(0,7);if(!month||month>cur)month=cur;
 const L=Farm.ledger().filter(l=>String(l.date).slice(0,7)===month);
 const costs=L.filter(l=>COST_KINDS.includes(l.kind)),sales=L.filter(l=>SALE_KINDS.includes(l.kind));
 const tc=costs.reduce((n,l)=>n+l.amount,0),ts=sales.reduce((n,l)=>n+l.amount,0),mg=ts-tc;
 let h='<div class="cy-month"><button type="button" data-cy="month" data-id="-1" aria-label="الشهر السابق">'+I('back',16,2.4)+'</button><b>'+E(monthLabel(month))+'</b><button type="button" data-cy="month" data-id="1" aria-label="الشهر التالي"'+(month>=cur?' disabled':'')+'>'+I('chev',16,2.4)+'</button></div>';
 h+='<div class="rc-stats cy-money"><div><span>التكاليف</span><b>'+E(f(tc))+'</b><span>ريال</span></div><div><span>المبيعات</span><b>'+E(f(ts))+'</b><span>ريال</span></div><div class="'+(mg>0?'ok':mg<0?'bad':'')+'"><span>الهامش</span><b>'+E(signed(mg))+'</b><span>ريال</span></div></div>';
 h+='<div class="cy-two"><a href="#" class="rc-big" data-cy="cost">'+I('plus',18,2.6)+'تكلفة</a><a href="#" class="rc-big ghost" data-cy="sale">'+I('plus',18,2.6)+'مبيعات</a></div>';
 const by={};costs.forEach(l=>{const c=catShort(l.category);by[c]=(by[c]||0)+l.amount;});
 const cats=Object.entries(by).sort((a,b)=>b[1]-a[1]),mx=cats.length?cats[0][1]:1,tone=c=>c==='ماء'?'t':c==='كهرباء'?'w':c==='أخرى'?'g':'';
 h+='<section class="bd-card"><div class="bd-h"><span class="bd-hic gold">'+I('coins',18)+'</span><h2 class="bd-title">أين ذهبت التكاليف</h2></div>'+(cats.length?'<div class="cy-fun cats">'+cats.map(([k,v])=>'<div><span>'+E(k)+'</span><i class="'+tone(k)+'" style="width:'+Math.max(2,Math.round(v/mx*100))+'%"></i><b>'+E(f(v))+'</b></div>').join('')+'</div>':'<p class="bd-empty">لا تكاليف مسجلة في هذا الشهر.</p>')+'</section>';
 /* نتيجة كل دفعة منذ بدايتها */
 const res=all().map(b=>Object.assign({b},money(b.id))).filter(x=>x.cost||x.sales).slice(0,8);
 h+='<section class="bd-card"><div class="bd-h"><span class="bd-hic">'+I('sprout',18)+'</span><h2 class="bd-title">نتيجة كل دفعة</h2></div><p class="muted cy-res-note">منذ بداية الدفعة · تكلفة الكيلو = التكلفة ÷ الوزن المحصود</p>'+
  (res.length?'<div class="cy-res"><div class="h"><span>الدفعة</span><span>التكلفة</span><span>المبيعات</span><span>تكلفة الكيلو</span></div>'+res.map(x=>{const [st]=status(x.b);
   return '<a href="#" data-cy="batch" data-id="'+E(x.b.id)+'"><span><b>'+E(x.b.crop.replace(/^خس\s+/,''))+'</b><small>'+E((x.b.zone||x.b.side||'')+' · '+st)+'</small></span><span>'+E(f(x.cost))+'</span><span>'+E(x.sales?f(x.sales):'—')+'</span><span class="'+(x.b.kg&&x.cost&&x.sales>x.cost?'ok':'')+'">'+E(x.b.kg&&x.cost?f(x.cost/x.b.kg,1):'—')+'</span></a>';}).join('')+'</div>':'<p class="bd-empty">لم تُحمَّل تكاليف على دفعات بعد.</p>')+'</section>';
 const list=L.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||(msOf(b.created)||0)-(msOf(a.created)||0));
 h+=head('قيود الشهر',list.length||null)+(list.length?'<div class="rc-box">'+list.map(l=>{const sale=SALE_KINDS.includes(l.kind),cap=!sale&&!COST_KINDS.includes(l.kind);
  return '<a href="#" class="rc-row" data-cy="edit" data-id="'+E(l.id)+'"><span class="bd-hic '+(sale?'ok':cap?'gray':l.category&&catShort(l.category)==='ماء'?'info':'gold')+'">'+I(catIcon(sale?'مبيعات':l.category),18)+'</span><span class="rc-row-t"><b>'+E(sale?('بيع'+(kgOf(l.kg)?' '+f(l.kg,1)+' كغ':'')+' · '+allocText(l)):(l.memo||l.category||l.kind))+'</b><small>'+E(DT(l.date)+' · '+(sale?(l.memo||'مبيعات'):cap?l.kind:allocText(l)))+'</small></span><span class="cy-amt '+(sale?'pos':'')+'">'+E(sale?signed(l.amount,l.amount%1?2:0):f(l.amount,l.amount%1?2:0))+'</span></a>';}).join('')+'</div>':'<p class="bd-empty">لا قيود في هذا الشهر.</p>');
 return h;
}

/* ================= النماذج ================= */
/* عدّ / نقل / حصاد: نموذج التسجيل العام في app.js (المراجعة والتصحيح وسجل التعديل كما هي) مع أجزاء الدورة */
function open(type,id,prefill){
 const b=get(id);
 if(id&&!b){toast('الدفعة غير موجودة');return;}
 const sec=type==='count'||type==='sow'?'n':'t';
 openForm(type,null,Object.assign(id?{batch:id}:{},prefill||{}),sec);
}
function avail(b,e){/* المتاح في المشتل لهذا النموذج (عند تصحيح نقل يُعاد عدده) */
 if(!b)return null;let n=b.nursery;
 if(e&&e.type==='xplant'&&e.v.batch===b.id&&!b.emptiedAt)n+=int(e.v.count)||0;
 return n;
}
function formSub(type,F,v){
 const b=get(v.batch);if(!b)return '';
 if(type==='harvest')return b.crop+(b.zone?' · '+b.zone:'')+(b.firstMove?' · نُقلت '+DT(b.firstMove):'');
 return b.crop+(b.side?' · '+b.side:'')+' · '+DT(b.date);
}
function formNote(type){return ['count','xplant','harvest'].includes(type)?'<p class="cy-note full" id="cyNote" aria-live="polite"></p>':'';}
function formInit(F){
 if(F.type!=='xplant')return;
 const w=$('w_count');if(!w||$('cyQuick'))return;
 w.insertAdjacentHTML('afterend','<div class="cy-quick full" id="cyQuick"></div><span class="hint cy-hint full" id="cyh_count" aria-live="polite"></span>');
 $('cyQuick').addEventListener('click',ev=>{const q=ev.target.closest('[data-q]');if(!q)return;const inp=$('f_count');inp.value=f(+q.dataset.q);inp.dispatchEvent(new Event('input',{bubbles:true}));});
}
function setNote(html){const n=$('cyNote');if(n){n.innerHTML=html;n.hidden=!html;}}
function hint(id,text,cls){
 const w=$('w_'+id);if(!w)return;let h=$('cyh_'+id);   /* لعدد النقل يُنشأ بعد أزرار «الكل/النصف» في formInit */
 if(!h){h=document.createElement('span');h.id='cyh_'+id;h.setAttribute('aria-live','polite');w.appendChild(h);}
 h.className='hint cy-hint '+(h.parentNode===w?'':'full ')+(cls||'');h.textContent=String(text||'').replace(/(-?\d[\d,.]*)(°|%)/g,'\u2066$1$2\u2069');
}
function formUpdate(F,v){
 if(!F||!['count','xplant','harvest'].includes(F.type))return;
 const b=get(v.batch),e=F.e;
 if(F.type==='count'){
  setNote(b?'بُذرت <b>'+E(f(b.seeds))+'</b> بذرة قبل '+E(dN(b.age))+(b.moved?' · نُقل منها <b>'+E(f(b.moved))+'</b>':''):'');
  const n=int(v.usable),movedBefore=b?(e?b.moves.filter(x=>order(x,e)<0):b.moves).reduce((s,x)=>s+(int(x.v.count)||0),0):0;
  hint('usable',b&&b.seeds&&n!=null?'نسبة الإنبات '+f((n+movedBefore)/b.seeds*100)+'%'+(n+movedBefore>b.seeds?' · أكبر من عدد البذور':''):'',b&&b.seeds&&n!=null&&n+movedBefore>b.seeds?'warn':'ok');
 }
 if(F.type==='xplant'){
  const a=avail(b,e),n=int(v.count),q=$('cyQuick');
  setNote(b?(b.known?'في المشتل الآن <b>'+E(f(a))+'</b> شتلة':'لم تُعدّ الشتلات · في المشتل تقديرياً <b>'+E(f(a))+'</b> من '+E(f(b.seeds))+' بذرة'):'');
  if(q)q.innerHTML=b&&b.known&&a>0?'<button type="button" data-q="'+a+'">'+E('الكل '+f(a))+'</button>'+(a>1?'<button type="button" data-q="'+Math.floor(a/2)+'">'+E('النصف '+f(Math.floor(a/2)))+'</button>':''):'';
  const emptied=v.emptied==='1';
  hint('count',!b||n==null?'':n>a?'أكثر من '+(b.known?'المتاح':'التقدير')+' ('+f(a)+')':emptied?'يُسجَّل أن المشتل فرغ من هذه الدفعة بعد النقل':'يبقى في المشتل بعد النقل '+f(a-n)+' شتلة'+(b.known?'':' تقديرياً'),n!=null&&n>a?'warn':'ok');
 }
 if(F.type==='harvest'){
  setNote(b?(b.towers?'في الأبراج <b>'+E(f(b.towers))+'</b> نبتة من هذه الدفعة':'لا توجد نباتات مسجلة في الأبراج لهذه الدفعة'):'');
  const c=int(v.count),r=int(v.rejected)||0,s=c!=null?c-r:int(F.e?.v.saleable),kg=kgOf(v.weight);
  const cv=$('cv_saleable'),ch=$('ch_saleable'),fs=$('f_saleable');
  if(fs)fs.value=s==null||s<0?'':String(s);
  if(cv)cv.innerHTML=s==null?'<b>—</b>':s<0?'<span class="warn">المستبعد أكبر</span>':'<b>'+E(f(s))+'</b> '+E(s===1?'رأس':s===2?'رأسان':s>=3&&s<=10?'رؤوس':'رأساً');
  if(ch)ch.textContent=kg&&c?'متوسط الرأس '+f(kg*1000/c)+' غ':'';
  const fw=$('w_final');if(fw)fw.hidden=!v.batch;
 }
}
/* التحقق قبل الحفظ + تحويل الحقول إلى أنواعها (القواعد تتحقق من نفس الشروط) */
function validate(type,v,miss,F){
 if(!['count','xplant','harvest'].includes(type))return;
 const e=F&&F.e,b=get(v.batch);
 const flag=k=>{if(v[k]==='1'||v[k]===true)v[k]=true;else if(e&&e.v[k]===true)v[k]=false;else delete v[k];};
 if(type==='count'){
  if(!v.batch)miss.push('الدفعة');else if(!b&&!e)miss.push('الدفعة غير موجودة');
  if(v.usable===''||v.usable==null)return;
  if(!Number.isSafeInteger(v.usable)||v.usable<0)miss.push('عدد الشتلات يجب أن يكون عدداً صحيحاً');
 }
 if(type==='xplant'){
  flag('emptied');
  if(!v.batch)miss.push('الدفعة');else if(!b&&!e)miss.push('الدفعة غير موجودة');
  if(!Number.isSafeInteger(v.count)||v.count<(e?0:1))miss.push('عدد الشتلات المنقولة يجب أن يكون عدداً صحيحاً موجباً');
  else if(b){const a=avail(b,e);if(a!=null&&v.count>a&&(!e||v.count>int(e.v.count)))miss.push((b.known?'المتاح في المشتل ':'المتاح تقديرياً ')+f(a)+' شتلة');}
 }
 if(type==='harvest'){
  flag('final');
  if(v.final===true&&!v.batch)miss.push('اختر الدفعة لتسجيل آخر حصاد');
  const c=int(v.count),r=v.rejected===''||v.rejected==null?null:int(v.rejected);
  if(v.rejected!==''&&v.rejected!=null&&r==null)miss.push('الرؤوس المستبعدة يجب أن تكون عدداً صحيحاً');
  if(v.count!==''&&v.count!=null&&c==null)miss.push('عدد الرؤوس يجب أن يكون عدداً صحيحاً');
  if(c!=null){if((r||0)>c)miss.push('المستبعد أكبر من عدد الرؤوس');else{v.saleable=c-(r||0);if(r==null)v.rejected=0;}}
  else if(v.saleable===''||v.saleable==null)delete v.saleable;else v.saleable=int(v.saleable);
  if(b&&!v.crop)v.crop=b.crop;
 }
 if(v.batch&&b&&b.date>(e?.date||S.date))miss.push('تاريخ العملية سابق للبذر');
}

/* ---------- G: تكلفة / مبيعات ---------- */
function batchChoices(sel,forSale){
 const L=all().filter(b=>b.id===sel||(forSale?(b.moved>0||b.harv.length)&&daysBetween(b.lastAct,todayStr())<=120:b.stage!=='done'||daysBetween(b.lastAct,todayStr())<=60));
 return '<option value="">اختر الدفعة</option>'+L.map(b=>'<option value="'+E(b.id)+'"'+(b.id===sel?' selected':'')+'>'+E(b.name+' · '+status(b)[0])+'</option>').join('');
}
function sheet(icon,tone,title,subt,body,save,del){
 openSheet('<div class="sheet-bg" data-close><div class="sheet form-sheet" role="dialog" aria-modal="true" aria-label="'+E(title)+'"><div class="fh"><span class="bd-hic '+tone+' md">'+I(icon,21)+'</span><div class="fh-t"><h2>'+E(title)+'</h2><span>'+E(subt)+'</span></div><button class="iconbtn" type="button" data-act="close" aria-label="إغلاق">✕</button></div>'+
  '<form class="fgrid" id="cyForm" novalidate>'+body+'</form><div id="formErrors" class="full form-errors" role="alert" hidden></div><div class="sheet-actions">'+(del?'<button class="btn danger" type="button" data-cy="ledger-del" data-id="'+E(del)+'">حذف</button>':'')+'<button class="btn pri" type="button" data-cy="ledger-save">'+E(save)+'</button></div></div></div>');
}
const amountField=(val)=>'<label class="f" for="cy_amount"><span>المبلغ <span class="req">*</span></span><div class="unitwrap"><input class="in num cy-bigin" id="cy_amount" inputmode="decimal" autocomplete="off" value="'+E(val??'')+'"><span class="u">ريال</span></div></label>';
const dateField=(val)=>'<label class="f" for="cy_date"><span>التاريخ</span><input class="in num" type="date" id="cy_date" max="'+todayStr()+'" value="'+E(val||todayStr())+'"></label>';
let LF=null;  /* حالة نموذج القيد المفتوح */
function costForm(o){
 if(!owner())return;o=o||{};
 const old=o.id?Farm.ledger().find(l=>l.id===o.id):null,water=o.source?(Farm.waterRows?Farm.waterRows():[]).find(w=>w.id===o.source):null;
 const legacyAlloc=old&&old.allocation.length&&old.basis!==AUTO&&!(old.allocation.length===1&&old.basis===ONE);
 const target=o.batch?'one':old?(legacyAlloc?'keep':old.basis===AUTO?'all':old.allocation.length===1?'one':'none'):'all';
 const cat=old?.category||(water?(water.tank==='الخزان الرئيسي لمياه الخلايا'?'ماء الخلايا':'ماء الري'):o.batch?'بذور':'ماء الري');
 LF={kind:'تكلفة',id:old?.id||'',source:old?.source||o.source||'',old,cat,target,batch:o.batch||(old&&old.allocation.length===1?old.allocation[0].batch:'')};
 const who=[['all','كل الدفعات القائمة','يوزَّع المبلغ تلقائياً بحسب عدد النباتات في كل دفعة'],['one','دفعة واحدة','مثل ثمن بذور دفعة بعينها'],['none','تكلفة عامة','لا توزَّع على الدفعات']];
 if(legacyAlloc)who.unshift(['keep','التوزيع السابق','كما سُجّل في الإصدار السابق ('+allocText(old)+')']);
 sheet('coins','gold',old?'تعديل تكلفة':'تكلفة جديدة',water?'حمولة ماء · '+DT(water.date)+' · '+f(water.tons,1)+' طن':'تكاليف الدورة',
  amountField(old?.amount)+dateField(old?.date||water?.date)+
  '<div class="f full"><span>البند</span><div class="cy-cats" role="group" aria-label="البند">'+CATS.map(c=>'<button type="button" data-cy="cat" data-id="'+E(c[1])+'" aria-pressed="'+(catShort(cat)===c[0])+'">'+I(c[2],18)+'<span>'+E(c[0])+'</span></button>').join('')+'</div></div>'+
  '<label class="f full" for="cy_memo"><span>الوصف</span><input class="in" id="cy_memo" maxlength="500" placeholder="مثال: حمولة ناقلة · فاتورة 1182" value="'+E(old?.memo||(water?'استلام حمولة ماء':''))+'"></label>'+
  '<div class="f full"><span>تخص هذه التكلفة</span><div class="cy-who" role="radiogroup">'+who.map(w=>'<label class="'+(w[0]===target?'on':'')+'"><input type="radio" name="cyWho" value="'+w[0]+'"'+(w[0]===target?' checked':'')+'><span><b>'+E(w[1])+'</b><small>'+E(w[2])+'</small></span></label>').join('')+'</div></div>'+
  '<label class="f full" id="cyOneW" for="cy_batch"'+(target==='one'?'':' hidden')+'><span>الدفعة</span><select class="in" id="cy_batch">'+batchChoices(LF.batch)+'</select></label>'+
  '<div class="cy-split full" id="cySplit" aria-live="polite"></div>','حفظ التكلفة',old?.id);
 wire();
}
function saleForm(o){
 if(!owner())return;o=o||{};
 const old=o.id?Farm.ledger().find(l=>l.id===o.id):null;
 LF={kind:'مبيعات',id:old?.id||'',old,batch:o.batch||(old&&old.allocation.length===1?old.allocation[0].batch:'')};
 sheet('basket','ok',old?'تعديل مبيعات':'مبيعات','تُربط بدفعة لحساب الهامش وتكلفة الكيلو',
  amountField(old?.amount)+dateField(old?.date)+
  '<label class="f full" for="cy_batch"><span>الدفعة <span class="req">*</span></span><select class="in" id="cy_batch">'+batchChoices(LF.batch,true)+'</select></label>'+
  '<label class="f" for="cy_kg"><span>الوزن المبيع</span><div class="unitwrap"><input class="in num" id="cy_kg" inputmode="decimal" autocomplete="off" value="'+E(old&&kgOf(old.kg)!=null?old.kg:'')+'"><span class="u">كغ</span></div></label>'+
  '<label class="f" for="cy_memo"><span>المشتري أو السوق</span><input class="in" id="cy_memo" maxlength="500" value="'+E(old?.memo||'')+'"></label><div class="cy-split full" id="cySplit" aria-live="polite"></div>','حفظ المبيعات',old?.id);
 wire();
}
function wire(){
 const f0=$('cyForm');if(!f0)return;
 f0.addEventListener('input',split);f0.addEventListener('change',ev=>{if(ev.target.name==='cyWho'){LF.target=ev.target.value;f0.querySelectorAll('.cy-who label').forEach(l=>l.classList.toggle('on',l.querySelector('input').checked));$('cyOneW').hidden=LF.target!=='one';}split();});
 f0.addEventListener('submit',ev=>ev.preventDefault());split();
}
function amountOf(){const n=num(String($('cy_amount')?.value||'').replace(/[,،]/g,''));return n;}
function plan(){
 if(LF.kind==='مبيعات'){const b=$('cy_batch').value;return {basis:ONE,allocation:b?[{batch:b,weight:1}]:[]};}
 switch(LF.target){
  case 'all':return {basis:AUTO,allocation:LF.old&&LF.old.basis===AUTO?LF.old.allocation:autoAlloc()};
  case 'one':{const b=$('cy_batch').value;return {basis:ONE,allocation:b?[{batch:b,weight:1}]:[]};}
  case 'keep':return {basis:LF.old.basis,allocation:LF.old.allocation};
  default:return {basis:NONE,allocation:[]};
 }
}
function split(){
 const el=$('cySplit');if(!el||!LF)return;
 const amt=amountOf(),p=plan(),sum=p.allocation.reduce((n,x)=>n+x.weight,0);
 if(LF.kind==='مبيعات'){const b=get(p.allocation[0]?.batch);el.innerHTML=b?'<span>الدفعة</span><b>'+E(b.name)+'</b>'+(b.kg?'<b>'+E('المحصود '+f(b.kg,1)+' كغ')+'</b>':''):'';return;}
 if(!p.allocation.length){el.innerHTML=LF.target==='none'?'<span>لا توزَّع · تظهر في إجمالي الشهر فقط</span>':LF.target==='all'?'<span class="warn">لا توجد دفعات قائمة بها نباتات</span>':'';return;}
 const items=p.allocation.slice().sort((a,b)=>b.weight-a.weight).map(a=>'<b>'+E(short(a.batch)+(amt>0?' '+f(amt*a.weight/sum)+' ريال':''))+'</b>');
 el.innerHTML='<span>التوزيع'+(LF.target==='all'?' بحسب عدد النباتات':'')+(LF.old&&LF.old.basis===AUTO&&LF.target==='all'?' (كما حُسب عند الحفظ الأول)':'')+'</span>'+items.slice(0,2).join('')+(items.length>2?'<b>'+E('+'+pl(items.length-2,'دفعة أخرى','دفعتان أخريان','دفعات','دفعة'))+'</b>':'');
}
function saveLedger(btn){
 if(!owner()||!LF||btn.disabled)return;
 const miss=[],amt=amountOf(),date=$('cy_date').value,memo=$('cy_memo').value.trim(),p=plan();
 if(!(amt>0))miss.push('المبلغ أكبر من صفر');
 if(!okDay(date)||date>todayStr())miss.push('تاريخ صحيح غير مستقبلي');
 if(LF.kind==='مبيعات'){if(!p.allocation.length)miss.push('الدفعة');}
 else if(LF.target==='one'&&!p.allocation.length)miss.push('الدفعة');
 else if(LF.target==='all'&&!p.allocation.length)miss.push('لا توجد دفعات قائمة: اختر «تكلفة عامة»');
 let kg=null;if(LF.kind==='مبيعات'){const raw=$('cy_kg').value.trim();if(raw){kg=num(raw);if(kg==null||kg<0)miss.push('الوزن المبيع رقم غير سالب');}}
 const box=$('formErrors');
 if(miss.length){box.hidden=false;box.textContent='لم يُحفظ. صحح التالي: '+miss.join('، ');return;}
 box.hidden=true;
 const col=S.db.collection('farmLedger'),ref=LF.id?col.doc(LF.id):LF.source?col.doc('water_'+LF.source):col.doc();
 const rec={kind:LF.kind,category:LF.kind==='مبيعات'?'مبيعات':LF.cat,amount:amt,date,by:S.uid,memo,source:LF.source||'',basis:p.basis,allocation:p.allocation,created:LF.old?.created||firebase.firestore.FieldValue.serverTimestamp()};
 if(kg!=null)rec.kg=kg;
 const done=LF;GSUI.commit(ref.set(rec),btn,()=>{if(LF===done)closeSheet();toast(done.kind==='مبيعات'?'حُفظت المبيعات':'حُفظت التكلفة');});
}
function delLedger(btn,id){
 if(!owner()||btn.disabled)return;
 if(btn.dataset.sure!=='1'){btn.dataset.sure='1';btn.textContent='تأكيد الحذف';return;}
 GSUI.commit(S.db.collection('farmLedger').doc(id).delete(),btn,()=>{closeSheet();toast('حُذف القيد');});
}
function editLedger(id){
 const l=Farm.ledger().find(x=>x.id===id);if(!l)return;
 if(SALE_KINDS.includes(l.kind))saleForm({id});
 else if(COST_KINDS.includes(l.kind))costForm({id});
 else Farm.legacyLedgerForm(id);    /* «شراء مخزون/أصل» من الإصدار السابق */
}

/* ================= التنقل والأحداث ================= */
function view(page){
 switch(page){
  case 'batch':return batchPage();
  case 'cropDone':return donePage();
  case 'finance':tab=owner()?'costs':'batches';return listPage();
  default:return listPage();
 }
}
function go(page){if(S.tab===page)render(true);else setTab(page);window.scrollTo(0,0);}
document.addEventListener('click',ev=>{
 const b=ev.target.closest&&ev.target.closest('[data-cy]');if(!b)return;
 ev.preventDefault();const a=b.dataset.cy,id=b.dataset.id||'',inSheet=!!b.closest('#sheetRoot');
 try{
 switch(a){
  case 'tab':tab=id==='costs'&&owner()?'costs':'batches';if(S.tab!=='crop')setTab('crop');else render(true);break;
  case 'month':{const [y,m]=(month||todayStr().slice(0,7)).split('-').map(Number),d=new Date(Date.UTC(y,m-1+(+id),15));month=d.toISOString().slice(0,7);render(true);break;}
  case 'batch':if(inSheet&&NAV.sheet)closeSheet();batchID=id;go('batch');break;
  case 'done':go('cropDone');break;
  case 'sow':open('sow');break;
  case 'count':open('count',id);break;
  case 'move':open('xplant',id);break;
  case 'harvest':open('harvest',id);break;
  case 'close':{const x=get(id);if(!x)break;if(x.moved)open('harvest',id,{final:'1'});else open('count',id,{usable:0});break;}
  case 'export':Farm.exportBatch(id);break;
  case 'cost':costForm({batch:id});break;
  case 'sale':saleForm({batch:id});break;
  case 'edit':editLedger(id);break;
  case 'cat':LF.cat=id;b.parentNode.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));break;
  case 'ledger-save':saveLedger(b);break;
  case 'ledger-del':delLedger(b,id);break;
 }
 }catch(err){toast(errMsg(err));}
});
return {view,now,get,all,active,autoAlloc,costForm,saleForm,open,formSub,formNote,formInit,formUpdate,validate,money,
 openBatch:id=>{batchID=id;go('batch');},setTab:t=>{tab=t;},
 _test:{build,batch,autoAlloc,money,allocText,status,stepState}};
})();
