/* GREEN SIDE 3.4.0 — تبويب «سجّل»: بطاقات الأنواع (الضغط يفتح النموذج)، كل التسجيلات، سجل النوع، تفاصيل التسجيل،
   وقائمة المراجعة السريعة للمشرف (خارج الحدود أولاً ثم «اعتماد الباقي»).
   يقرأ: تسجيلات اليوم المختار (محمّلة)، ويوماً سابقاً عند الطلب، وسجل نوع واحد لآخر 7 أيام. */
var Rec=(()=>{
'use strict';
const I=(n,s,w)=>Board.icon(n,s,w);
/* للعرض فقط: الرقم مع ° أو % يُعزل حتى لا ينقلب داخل النص العربي */
const E=x=>esc(String(x??'')).replace(/(-?\d[\d,.]*)(°|%)/g,'⁦$1$2⁩');
const R={view:null,filter:'all',q:'',more:1,days:{},type:null,tl:{},id:null,reg:{},sub:null,subId:null,gone:{},flags:[],flagsOff:null,from:''};
const DT=d=>d?fmtDate(d,{day:'numeric',month:'long'}):'';
const DW=d=>d?fmtDate(d,{weekday:'long',day:'numeric',month:'long'}):'';
const first=id=>String(nameOf(id)||'').trim().split(/\s+/)[0]||'';
const live=()=>S.date===todayStr();
const secView=e=>secOf(e)==='g'?S.sec:secOf(e);
const byT=(a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||''))||(a.ts||0)-(b.ts||0);

/* شكل كل نوع: الأيقونة واللون والمجموعة */
const TS={mix:['flask','purple'],refill:['flask','purple'],ecph:['flask','purple'],waterOnly:['drop','info'],irr:['drop','info'],temp:['therm','warn'],light:['sun','gold'],spray:['spray','teal'],note:['leaf','green'],photo:['camera','gray'],sow:['sprout','green'],count:['check','green'],xplant:['moveup','info'],harvest:['basket','green'],pump:['gauge','gray'],cal:['target','gray'],batt:['batt','gray'],svc:['wrench','gray']};
const CAT={mix:'sol',refill:'sol',ecph:'sol',waterOnly:'sol',irr:'irr',temp:'air',light:'air',spray:'spray',note:'note',photo:'note',sow:'crop',count:'crop',xplant:'crop',harvest:'crop',pump:'eq',cal:'eq',batt:'eq',svc:'eq'};
const CATS=[['all','الكل'],['sol','المحلول'],['irr','الري'],['air','الجو والضوء'],['spray','الرش'],['note','الملاحظات والصور'],['crop','الزراعة والحصاد'],['eq','المعدات والصيانة']];
const style=t=>TS[t]||['list','gray'];
function label(e){if(e.type==='svc')return e.kind||'صيانة';if(e.type==='cal'&&e.v&&e.v.careKind)return e.v.what||'صيانة حساس';const T=typeDef(e.type,secView(e));return T?T.label:'تسجيل';}
function dayTitle(d){const t=todayStr(),rel=d===t?'اليوم':d===addDays(t,-1)?'أمس':'';return (rel?rel+' · ':'')+DW(d);}
const cnt=n=>Board.pl(n,'تسجيل واحد','تسجيلان','تسجيلات','تسجيلاً');

/* ---------- قيم مختصرة لكل تسجيل (القيمة خارج الحدود مميزة) ---------- */
function gridBad(e,m){const v=e.v||{},sec=secView(e);return gridKeys(m).concat(NK[m]||[]).some(k=>{const x=num(v[k]);return x!=null&&isBad(chk(m,x,sec,e.time));});}
function vals(e){
 const v=e.v||{},sec=secView(e),tm=e.time,o=[],n=k=>num(v[k]);
 const bad=(c,x)=>x!=null&&isBad(chk(c,x,sec,tm)),add=(t,b)=>{if(t!=null&&t!=='')o.push({t:String(t),bad:!!b});};
 const ec=k=>{const x=n(k);if(x!=null)add('EC '+f(x),bad('ec',x));},ph=k=>{const x=n(k);if(x!=null)add('pH '+f(x,1),bad('ph',x));},wt=k=>{const x=n(k);if(x!=null)add('حرارة '+f(x,1)+'°',bad('wt',x));};
 switch(e.type){
  case 'irr':{wt('wt');ec('ec');ph('ph');const r=irrL(v,0),l=irrL(v,1);if(r!=null||l!=null)add([r!=null?'يمين '+f(r,1):'',l!=null?'يسار '+f(l,1):''].filter(Boolean).join(' · ')+' لتر');else if(n('liters')!=null)add(f(n('liters'),1)+' لتر');break;}
  case 'mix':ec('ec');ph('ph');wt('wt');if(n('mlA')!=null||n('mlB')!=null)add('A '+f(n('mlA'))+' · B '+f(n('mlB'))+' مل');if(n('water')!=null)add(f(n('water'))+' لتر ماء');break;
  case 'ecph':wt('wt');ec('ec');ph('ph');break;
  case 'refill':{const a=n('ec0'),b=n('ec');if(a!=null)add('قبل '+f(a),bad('ec',a));if(b!=null)add('بعد '+f(b),bad('ec',b));ph('ph');if(n('waterAdd')!=null)add('أُضيف '+f(n('waterAdd'))+' لتر');break;}
  case 'waterOnly':if(n('waterAdd')!=null)add('أُضيف '+f(n('waterAdd'))+' لتر');if(v.stockSource)add(v.stockSource);break;
  case 'temp':{const a=metric(v,'air'),h=metric(v,'rh');if(a!=null)add('متوسط '+f(a,1)+'°',gridBad(e,'air'));if(h!=null)add('رطوبة '+f(h)+'%',gridBad(e,'rh'));break;}
  case 'light':{const l=metric(v,'lux');if(l!=null)add('متوسط '+f(l)+' لوكس',gridBad(e,'lux'));if(v.sky)add(v.sky);break;}
  case 'note':if(v.cat)add(v.cat,v.cat!==NOTE_NONE);if(v.sev)add(v.sev,v.sev==='شديدة');if(v.loc)add(v.loc);if(v.pos)add(v.pos);break;
  case 'spray':if(v.product)add(v.product);if(v.dose)add(v.dose);if(v.zone)add(v.zone);if(num(v.phi)>0)add('فترة أمان '+Board.dN(num(v.phi)),true);break;
  case 'photo':if(v.side)add(v.side);if(v.loc)add(v.loc);if(n('height')!=null)add('ارتفاع '+f(n('height'))+' سم');break;
  case 'sow':if(v.crop)add(v.crop);if(n('seeds')!=null)add(f(n('seeds'))+' بذرة');if(v.side)add(v.side);break;
  case 'count':if(n('usable')!=null)add(f(n('usable'))+' شتلة صالحة');{const b=window.Cycle&&Cycle.get(v.batch);if(b)add(b.crop+(b.side?' · '+b.side:''));}break;
  case 'xplant':if(n('count')!=null)add(f(n('count'))+' شتلة');if(v.zone)add(v.zone);if(v.emptied===true)add('المشتل فارغ بعدها');break;
  case 'harvest':if(n('weight')!=null)add(f(n('weight'),1)+' كغ');if(n('count')!=null)add(f(n('count'))+' رأس');if(v.grade)add(v.grade);if(v.final===true)add('آخر حصاد');break;
  case 'pump':if(v.status)add(v.status,v.status!=='تعمل بشكل طبيعي');if(n('gauge1')!=null)add('عداد ١: '+f(n('gauge1'),1)+' بار');if(n('gauge2')!=null)add('عداد ٢: '+f(n('gauge2'),1)+' بار');if(v.flow&&v.flow!=='منتظم في كل الأبراج')add(v.flow,true);break;
  case 'cal':if(v.what)add(v.what);if(v.result)add(v.result,v.result!=='ناجحة');break;
  case 'batt':add(v.end?'شحن '+f((v.end-(v.start||e.ts))/36e5,1)+' ساعة':'جارٍ الشحن',!v.end);if(v.before)add('قبل الشحن: '+v.before);break;
  case 'svc':add(e.result||'تم');if(e.memo)add(e.memo);break;
 }
 return o;
}
const outOfRange=e=>vals(e).some(c=>c.bad);
const chipsHTML=(list,max)=>list.slice(0,max||4).map(c=>'<span class="rc-v'+(c.bad?' bad':'')+'">'+E(c.t)+'</span>').join('');

/* ---------- مصادر البيانات ---------- */
const HIST=['mix','refill'],META=['sow','count','xplant','batt','cal','harvest','spray'];
function inView(e){return e.type!=='selftest'&&(secOf(e)===S.sec||e.sec==='g');}
/* سجلات صيانة الحساسات ومعايرتها (من صفحة المراقبة) ليست معايرة جهاز EC/pH */
const meterCal=e=>!(e.type==='cal'&&e.v&&e.v.careKind);
function services(d){return (Farm.services?Farm.services():[]).filter(x=>x.date===d).map(x=>({id:'svc:'+x.id,type:'svc',sec:'g',date:x.date,time:x.time||(x.created&&x.created.seconds&&todayStr(new Date(x.created.seconds*1000))===x.date?tsHM(x.created.seconds*1000):''),ts:x.created&&x.created.seconds?x.created.seconds*1000:0,by:x.by,kind:x.kind,result:x.result,memo:x.memo,v:{}}));}
function loadDay(d){
 const c=R.days[d];if(c&&(c.loading||(c.rows&&Date.now()-c.at<600000)))return;
 R.days[d]={loading:true,rows:c&&c.rows};
 S.db.collection('entries').where('date','==',d).get().then(q=>{R.days[d]={rows:entriesOf(q),at:Date.now()};render();})
  .catch(e=>{R.days[d]={error:errMsg(e),at:Date.now()};render();});
}
function dayRows(d){
 if(d===S.date)return S.dayLoaded?S.entries:null;
 const c=R.days[d];return c&&c.rows?c.rows:null;
}
function fetchType(type,from,to,k){
 const prev=R.tl[k];R.tl[k]={loading:true,rows:prev&&prev.rows,at:prev&&prev.at};
 const col=S.db.collection('entries');
 col.where('type','==',type).where('date','>=',from).where('date','<=',to).get()
  .catch(e=>{if(e&&e.code==='failed-precondition')return col.where('date','>=',from).where('date','<=',to).get();throw e;})
  .then(q=>{R.tl[k]={rows:entriesOf(q).filter(e=>e.type===type),at:Date.now()};render();})
  .catch(e=>{R.tl[k]={error:errMsg(e),at:Date.now()};render();});
}
function typeData(type,sec,from,to){
 const ok=e=>e.type===type&&(secOf(e)===sec||e.sec==='g')&&e.date>=from&&e.date<=to&&meterCal(e);
 let rows=null,loading=false,error='';
 if(HIST.includes(type))rows=S.hist.filter(ok);
 else if(META.includes(type))rows=S.meta.filter(ok);
 else{const k=type+'|'+from+'|'+to,c=R.tl[k];if(!c||(!c.loading&&Date.now()-(c.at||0)>300000))fetchType(type,from,to,k);const c2=R.tl[k];rows=c2.rows?c2.rows.filter(ok):null;loading=!!c2.loading;error=c2.error||'';}
 if(rows){const m=new Map(rows.map(e=>[e.id,e]));if(S.date>=from&&S.date<=to)S.entries.filter(ok).forEach(e=>m.set(e.id,e));rows=[...m.values()];}
 return {rows,loading,error};
}
/* آخر تسجيل معروف لنوع (لبطاقة النوع) */
function lastOfType(type,sec){
 const ok=e=>e.type===type&&(secOf(e)===sec||e.sec==='g')&&e.date<=S.date&&meterCal(e);
 const pools=[S.entries,HIST.includes(type)?S.hist:[],META.includes(type)?S.meta:[]];
 Object.values(R.days).forEach(c=>{if(c.rows)pools.push(c.rows);});Object.values(R.tl).forEach(c=>{if(c.rows)pools.push(c.rows);});
 let best=null;pools.forEach(p=>p.forEach(e=>{if(ok(e)&&(!best||byT(e,best)>0))best=e;}));return best;
}
function findAny(id){
 if(R.reg[id])return R.reg[id];
 if(String(id).startsWith('svc:')){const d=(Farm.services?Farm.services():[]).find(x=>'svc:'+x.id===id);return d?services(d.date).find(x=>x.id===id):null;}
 const pools=[S.entries,S.hist,S.meta,S.openNotes,R.flags];Object.values(R.days).forEach(c=>{if(c.rows)pools.push(c.rows);});Object.values(R.tl).forEach(c=>{if(c.rows)pools.push(c.rows);});
 for(const p of pools){const e=p.find(x=>x.id===id);if(e)return e;}
 return null;
}

/* ---------- عناصر مشتركة ---------- */
function rowHTML(e,timeFirst){
 R.reg[e.id]=e;const [ic,tone]=style(e.type);
 if(timeFirst)return '<a href="#" class="rc-row tf" data-rc="detail" data-id="'+E(e.id)+'"><span class="rc-time">'+E(fmtTime(e.time)||'—')+'</span><span class="rc-row-t"><small>'+E(nameOf(e.by))+'</small><span class="rc-vals">'+chipsHTML(vals(e),4)+'</span></span>'+I('chev',16,2)+'</a>';
 return '<a href="#" class="rc-row" data-rc="detail" data-id="'+E(e.id)+'"><span class="bd-hic '+tone+'">'+I(ic,18)+'</span><span class="rc-row-t"><b>'+E(label(e))+'</b><small>'+E((fmtTime(e.time)||'بدون وقت')+' · '+nameOf(e.by))+'</small><span class="rc-vals">'+chipsHTML(vals(e),4)+'</span></span>'+I('chev',16,2)+'</a>';
}
function seg(cur){return '<div class="rc-seg" role="tablist"><button type="button" role="tab" data-rc="view" data-v="types" aria-selected="'+(cur==='types')+'">حسب النوع</button><button type="button" role="tab" data-rc="view" data-v="list" aria-selected="'+(cur==='list')+'">كل التسجيلات</button></div>';}
function pageHead(title,extra){return '<header class="rc-head"><div class="rc-head-r"><h1>'+E(title)+'</h1><span class="rc-sec s-'+S.sec+'"><i></i>'+E(SECS[S.sec].name)+'</span></div>'+(extra||'')+'</header>';}

/* ---------- «سجّل»: حسب النوع ---------- */
function typeCard(type,sec){
 const T=typeDef(type,sec);if(!T)return '';
 const [ic,tone]=style(type),rows=secEntries(S.entries,sec).filter(e=>e.type===type),x=TASKS[sec].find(t=>t[0]===type),need=x?needOf(sec,x):0,done=doneOf(rows,type);
 const sl=need?Board.slots(sec).filter(s=>s.type===type):[],late=sl.filter(s=>s.state==='late'),last=lastOfType(type,sec);
 const count=need?done+' / '+need:rows.length?String(rows.length):'—',cls=need?(done>=need?'ok':late.length?'bad':''):'';
 let sub;
 if(late.length&&live())sub='متأخر · موعده '+fmtTime(late[0].time);
 else if(last&&last.date===S.date)sub='آخرها '+fmtTime(last.time)+' · '+first(last.by);
 else if(last){const d=daysBetween(last.date,S.date);sub=(d===1?'أمس':d<=10?'قبل '+Board.dN(d):DT(last.date))+' · '+first(last.by);}
 else sub=live()?'لم يُسجَّل اليوم':'لا تسجيل في هذا اليوم';
 return '<div class="rc-card"><a href="#" class="rc-main" data-act="new" data-type="'+type+'" aria-label="'+E('تسجيل '+T.label)+'"><span class="rc-top"><span class="bd-hic '+tone+' md">'+I(ic,20)+'</span><span class="rc-cnt '+cls+'">'+E(count)+'</span></span><b>'+E(T.label)+'</b><small class="'+(late.length&&live()?'bad':'')+'">'+E(sub)+'</small><span class="rc-vals">'+(last?chipsHTML(vals(last),2):'')+'</span></a>'+
  '<div class="rc-acts"><a href="#" class="pri" data-act="new" data-type="'+type+'">'+I('plus',14,2.6)+'سجّل</a><a href="#" data-rc="type" data-type="'+type+'">'+I('history',14,2)+'السجل</a></div></div>';
}
function typesView(){
 const sec=S.sec;let h='';
 if(live()&&canAdd()&&S.dayLoaded){const nx=Board.next(sec);if(nx)h+='<a href="#" class="rc-next" '+(nx.act||'data-act="new" data-type="'+nx.type+'"')+'><span class="rc-next-ic">'+I(nx.icon||style(nx.type||'svc')[0],22)+'</span><span class="rc-next-t"><small>'+(nx.state==='late'?'متأخر · سجّله الآن':'المقترح الآن')+'</small><b>'+E(nx.label+(nx.time?' · '+fmtTime(nx.time):''))+'</b></span><span class="rc-next-b">ابدأ</span></a>';}
 h+='<a href="#" class="rc-calc" data-act="calc"><span class="bd-hic purple md">'+I('flask',20)+'</span><span><b>حاسبة المحلول</b><small>'+(sec==='t'?'تعويض الخزان أو تجهيز خزان جديد':'خلطة جديدة حسب الجرعة أو الأملاح المستهدفة')+'</small></span>'+I('chev',16,2)+'</a>';
 h+='<div class="rc-grid">'+ORDER[sec].map(t=>typeCard(t,sec)).join('')+'</div>';
 h+='<h2 class="rc-sub">المعدات</h2><div class="rc-grid">'+typeCard('cal',sec)+battCard()+'</div>';
 h+='<p class="rc-limits">'+E('المستهدف في '+SECS[sec].name+': الأملاح '+rangeTxt('ec')+' µS/cm · pH '+rangeTxt('ph')+' · حرارة الماء '+rangeTxt('wt')+'° · حرارة الجو '+dnTxt('air',sec,'°'))+'</p>';
 return h;
}
function battCard(){
 const bi=battInfo(),[ic,tone]=style('batt'),T=typeDef('batt','n');
 const sub=bi.state==='none'?'لم يُسجَّل شحن بعد':bi.state==='charging'?'على الشاحن منذ '+(bi.h<1?'أقل من ساعة':Board.pl(Math.round(bi.h),'ساعة','ساعتين','ساعات','ساعة')):'آخر شحن انتهى منذ '+(bi.h<1?'أقل من ساعة':bi.h<48?Board.pl(Math.round(bi.h),'ساعة','ساعتين','ساعات','ساعة'):Board.dN(Math.round(bi.h/24)));
 const main=bi.state==='charging'?'data-act="battEnd" data-id="'+E(bi.b.id)+'"':'data-act="battStart"';
 return '<div class="rc-card"><a href="#" class="rc-main" '+main+'><span class="rc-top"><span class="bd-hic '+tone+' md">'+I(ic,20)+'</span><span class="rc-cnt '+(bi.state==='charging'?'warn':'')+'">'+(bi.state==='charging'?'يشحن':'—')+'</span></span><b>'+E(T.label)+'</b><small>'+E(sub)+'</small></a>'+
  '<div class="rc-acts"><a href="#" class="pri" '+main+'>'+I(bi.state==='charging'?'check':'plus',14,2.6)+(bi.state==='charging'?'انتهى الشحن':'بدء الشحن')+'</a><a href="#" data-rc="type" data-type="batt">'+I('history',14,2)+'السجل</a></div></div>';
}

/* ---------- «سجّل»: كل التسجيلات ---------- */
function listDays(){const d=[S.date];for(let i=1;i<=R.more;i++)d.push(addDays(S.date,-i));return d;}
function matches(e){
 if(R.filter==='fix')return true;
 if(R.filter!=='all'&&CAT[e.type]!==R.filter)return false;
 const q=R.q.trim().toLowerCase();if(!q)return true;
 return (label(e)+' '+nameOf(e.by)+' '+vals(e).map(c=>c.t).join(' ')+' '+[e.v&&e.v.memo,e.v&&e.v.text,e.v&&e.v.action,e.memo].filter(Boolean).join(' ')).toLowerCase().includes(q);
}
function listBody(){
 if(R.filter==='fix'){
  const rows=R.flags.slice().sort((a,b)=>byT(b,a));
  return rows.length?'<div class="rc-day"><div class="rc-day-h"><b>تسجيلات تحتاج تصحيحاً</b><span>'+E(cnt(rows.length))+'</span></div><div class="rc-box">'+rows.map(e=>rowHTML(e)).join('')+'</div></div>':'<p class="bd-empty">لا توجد تسجيلات تحتاج تصحيحاً.</p>';
 }
 let h='',any=false;
 listDays().forEach(d=>{
  const base=dayRows(d),c=R.days[d];
  if(base==null){h+='<div class="rc-day"><div class="rc-day-h"><b>'+E(dayTitle(d))+'</b></div>'+(c&&c.error?'<p class="bd-empty">'+E('تعذّر التحميل: '+c.error)+'</p>':'<div class="bd-skel"></div>')+'</div>';return;}
  const rows=base.filter(inView).concat(services(d)).filter(matches).sort((a,b)=>byT(b,a));
  if(rows.length)any=true;
  h+='<div class="rc-day"><div class="rc-day-h"><b>'+E(dayTitle(d))+'</b><span>'+(rows.length?E(cnt(rows.length)):'')+'</span></div>'+(rows.length?'<div class="rc-box">'+rows.map(e=>rowHTML(e)).join('')+'</div>':'<p class="bd-empty">'+(R.q||R.filter!=='all'?'لا نتائج في هذا اليوم.':'لا توجد تسجيلات في هذا اليوم.')+'</p>')+'</div>';
 });
 return h+'<button type="button" class="rc-moreday" data-rc="more">'+I('history',16,2)+'عرض '+E(dayTitle(addDays(S.date,-R.more-1)))+'</button>';
}
function listView(){
 listDays().forEach(d=>{if(d!==S.date)loadDay(d);});
 const used=new Set();listDays().forEach(d=>{const b=dayRows(d);if(b)b.filter(inView).forEach(e=>used.add(CAT[e.type]));if(services(d).length)used.add('eq');});
 const chips=CATS.filter(c=>c[0]==='all'||used.has(c[0])||R.filter===c[0]);
 if(!isSup()&&R.flags.length)chips.push(['fix','تحتاج تصحيحاً · '+R.flags.length]);
 return '<div class="rc-tools"><label class="rc-search">'+I('search',18,2)+'<input type="search" id="rcSearch" value="'+E(R.q)+'" placeholder="بحث: عملية، عامل، ملاحظة" aria-label="بحث في التسجيلات" enterkeyhint="search"></label></div>'+
  '<div class="rc-chips" role="group" aria-label="تصفية">'+chips.map(c=>'<button type="button" data-rc="f" data-f="'+c[0]+'" aria-pressed="'+(R.filter===c[0])+'"'+(c[0]==='fix'?' class="fix"':'')+'>'+E(c[1])+'</button>').join('')+'</div><div id="rcList">'+listBody()+'</div>';
}
function view(){
 if(!canAdd())return '<p class="bd-empty">التسجيل متاح للمشرف والعامل فقط.</p>';
 if(S.date>todayStr()&&!isSup())return pageHead('سجّل')+'<div class="bd-past"><span>لا يمكن التسجيل بتاريخ مستقبلي.</span><button class="btn sm" data-act="gotoday">العودة إلى اليوم</button></div>';
 const v=R.view||(lsGet('gs_rec_view_'+S.uid)==='list'?'list':'types');
 return pageHead('سجّل',seg(v))+(live()?'':'<div class="bd-past"><span>'+E('التسجيل والعرض ليوم '+DW(S.date))+'</span><button class="btn sm" data-act="gotoday">اليوم</button></div>')+(v==='list'?listView():typesView());
}

/* ---------- سجل نوع واحد ---------- */
const KEY={irr:['ec','الأملاح في ماء الري','ec',0],mix:['ec','الأملاح بعد الخلط','ec',0],ecph:['ec','الأملاح','ec',0],refill:['ec','الأملاح بعد التعويض','ec',0],temp:['air','متوسط حرارة الجو','air',1],light:['lux','متوسط شدة الإضاءة','lux',0],harvest:['weight','الحصاد اليومي · كغ',null,1,'sum'],waterOnly:['waterAdd','الماء المضاف يومياً · لتر',null,0,'sum'],sow:['seeds','البذور المزروعة يومياً',null,0,'sum'],pump:['gauge1','عداد ١ · بار',null,1],xplant:['count','الشتلات المنقولة يومياً',null,0,'sum'],photo:['height','ارتفاع النبات · سم',null,0]};
const kv=(e,k)=>k==='air'||k==='lux'||k==='rh'?metric(e.v,k):num((e.v||{})[k]);
function series(rows,key,from){
 const out=[];for(let i=0;i<7;i++){const d=addDays(from,i),xs=rows.filter(e=>e.date===d).map(e=>kv(e,key[0])).filter(x=>x!=null);out.push({d,v:xs.length?(key[4]==='sum'?sum(xs):avg(xs)):null});}
 return out;
}
function miniChart(pts,key,sec){
 const vs=pts.map(p=>p.v).filter(v=>v!=null);if(vs.length<2)return '';
 const lm=key[2]?lim(key[2],sec,key[2]==='air'?'12:00':undefined):[null,null];
 const all=vs.concat([lm[0],lm[1]].filter(x=>x!=null)),mn=Math.min.apply(null,all),mx=Math.max.apply(null,all),pad_=(mx-mn)*0.15||1,lo=mn-pad_,hi=mx+pad_;
 const X=i=>8+i*(324/6),Y=v=>54-(v-lo)/(hi-lo)*46;
 let d='',prev=false;pts.forEach((p,i)=>{if(p.v==null){prev=false;return;}d+=(prev?'L':'M')+X(i).toFixed(1)+' '+Y(p.v).toFixed(1)+' ';prev=true;});
 const lastI=pts.map(p=>p.v!=null).lastIndexOf(true),bad=v=>key[2]&&isBad(chk(key[2],v,sec,key[2]==='air'?'12:00':undefined));
 const band=lm[0]!=null&&lm[1]!=null?'<rect x="0" y="'+Y(Math.min(hi,lm[1])).toFixed(1)+'" width="340" height="'+Math.max(0,Y(Math.max(lo,lm[0]))-Y(Math.min(hi,lm[1]))).toFixed(1)+'" rx="6" class="c-band"/>':'';
 return '<div class="rc-chart"><div class="rc-chart-h"><span>'+E(key[1]+' · آخر 7 أيام')+'</span>'+(lm[0]!=null&&lm[1]!=null?'<span>'+E('المستهدف '+f(lm[0],key[3])+' – '+f(lm[1],key[3]))+'</span>':'')+'</div><svg viewBox="0 0 340 62" role="img" aria-label="'+E(key[1]+' خلال آخر 7 أيام: '+pts.map(p=>p.v==null?'لا قراءة':f(p.v,key[3])).join('، '))+'">'+band+'<path d="'+d+'" class="rc-line"/>'+pts.map((p,i)=>p.v==null?'':'<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(p.v).toFixed(1)+'" r="'+(i===lastI?4.5:3)+'" class="rc-pt'+(bad(p.v)?' bad':'')+'"/>').join('')+'</svg><div class="rc-chart-x">'+pts.map(p=>'<span>'+E(+p.d.slice(8))+'</span>').join('')+'</div></div>';
}
function typeLog(){
 const type=R.type,sec=TYPES_G[type]?S.sec:S.sec,T=typeDef(type,sec);
 if(!T){S.tab='add';return view();}
 const [ic,tone]=style(type),to=S.date,from=addDays(to,-6),D=typeData(type,sec,from,to),key=KEY[type];
 const x=TASKS[sec].find(t=>t[0]===type),need=x?needOf(sec,x):0,times=schedOf(sec,type);
 const sub=(TYPES_G[type]?'المعدات':SECS[sec].name)+(need?' · '+(type==='irr'?Board.pl(need,'ريّة واحدة','ريّتان','ريّات','ريّة'):Board.pl(need,'مرة واحدة','مرتان','مرات','مرة'))+' يومياً'+(times.length?' · '+times.map(fmtTime).join('، '):''):T.desc?' · '+T.desc:'');
 let h='<header class="rc-th"><span class="bd-hic '+tone+' xl">'+I(ic,26)+'</span><div><h1>'+E(T.label)+'</h1><p>'+E(sub)+'</p></div></header>';
 const rows=D.rows?D.rows.slice().sort((a,b)=>byT(b,a)):null,today=rows?rows.filter(e=>e.date===S.date):[];
 if(rows){
  const tiles=[];
  tiles.push([live()?'اليوم':'هذا اليوم',need?doneOf(today,type)+' <small>من '+need+'</small>':String(today.length)]);
  if(type==='irr'){const l=sum(today.map(e=>irrL(e.v)));tiles.push(['لترات اليوم',today.length?f(l,1):'—']);}
  else if(key&&key[4]==='sum'){const s=sum(today.map(e=>kv(e,key[0])).filter(v=>v!=null));tiles.push([key[1].split(' · ')[1]||'اليوم',today.length?f(s,key[3]):'—']);}
  else if(key){const le=rows.find(e=>kv(e,key[0])!=null);tiles.push(['آخر قراءة',le?f(kv(le,key[0]),key[3])+(key[0]==='air'?'°':''):'—']);}
  else if(type==='note'){tiles.push(['مفتوحة الآن',String(S.openNotes.filter(e=>secOf(e)===sec).length)]);}
  else{const le=rows[0];tiles.push(['آخر تسجيل',le?(le.date===S.date?fmtTime(le.time):DT(le.date)):'—']);}
  if(key){const xs=rows.map(e=>kv(e,key[0])).filter(v=>v!=null);tiles.push([key[4]==='sum'?'مجموع الأسبوع':'متوسط الأسبوع',xs.length?f(key[4]==='sum'?sum(xs):avg(xs),key[3])+(key[0]==='air'?'°':''):'—']);}
  else tiles.push(['تسجيلات الأسبوع',String(rows.length)]);
  h+='<div class="rc-stats">'+tiles.map(t=>'<div><span>'+E(t[0])+'</span><b>'+(t[1].includes('<small>')?t[1]:E(t[1]))+'</b></div>').join('')+'</div>';
  if(key)h+=miniChart(series(rows,key,from),key,sec);
 }
 if(canAdd()&&!(S.date>todayStr()&&!isSup()))h+=type==='batt'?'':'<a href="#" class="rc-big" data-act="new" data-type="'+type+'">'+I('plus',20,2.4)+'سجّل '+E(T.short||T.label)+'</a>';
 if(D.error)h+='<p class="bd-empty">'+E('تعذّر تحميل السجل: '+D.error)+'</p>';
 else if(!rows)h+='<div class="bd-skel"></div>';
 else if(!rows.length)h+='<p class="bd-empty">لا تسجيلات خلال آخر 7 أيام.</p>';
 else{const days=[...new Set(rows.map(e=>e.date))];days.forEach(d=>{const r=rows.filter(e=>e.date===d),tot=type==='irr'?sum(r.map(e=>irrL(e.v))):null;h+='<div class="rc-day"><div class="rc-day-h"><b>'+E(dayTitle(d))+'</b><span>'+E(tot!=null&&tot?f(tot,1)+' لتر':cnt(r.length))+'</span></div><div class="rc-box">'+r.map(e=>rowHTML(e,true)).join('')+'</div></div>';});}
 return h;
}

/* ---------- تفاصيل التسجيل ---------- */
function watch(id){
 if(R.subId===id)return;
 if(R.sub){R.sub();R.sub=null;}R.subId=id;
 if(String(id).startsWith('svc:'))return;
 R.sub=S.db.collection('entries').doc(id).onSnapshot(s=>{if(!s.exists){R.gone[id]=true;delete R.reg[id];}else{R.reg[id]=entryOf(s);delete R.gone[id];}render();},e=>console.warn(e));
}
function leave(tab){if(tab!=='recDetail'&&R.sub){R.sub();R.sub=null;R.subId=null;}}
function readingsHTML(e,T,sec){
 const v=e.v||{};let rows='',grids='';
 T.fields.forEach(fd=>{
  if(fd.show&&!fd.show(v))return;
  if(fd.t==='grid'&&fd.c){
   const D=dimOf(fd),dec=fd.c==='lux'?0:1,keys=gridKeysD(fd.k,D),has=keys.some(k=>num(v[k])!=null),old=(NK[fd.k]||[]).some(k=>num(v[k])!=null);
   if(!has&&!old)return;
   const a=metric(v,fd.k),bad=gridBad(e,fd.k),u=fd.u==='°C'?'°':fd.u==='%'?'%':' '+fd.u;
   rows+='<div class="rc-r'+(bad?' bad':'')+'"><span class="rc-r-l">'+E(fd.l)+'<small>'+E('المستهدف '+rangeTxt(fd.c,sec,e.time))+'</small></span><b>'+E('متوسط '+f(a,dec)+(u.trim()==='lux'?' لوكس':u))+'</b><i>'+I(bad?'bang':'check',12,3)+'</i></div>';
   const cell=x=>x==null?'<td>—</td>':'<td class="'+(isBad(chk(fd.c,x,sec,e.time))?'bad':'')+'">'+f(x,dec)+'</td>';
   if(has)grids+='<div class="rc-grid-t"><b>'+E(fd.l+' · حسب الموقع')+'</b><table><thead><tr><th></th>'+D.colL.map(l=>'<th>'+E(l)+'</th>').join('')+'</tr></thead><tbody>'+D.rows.map((r,ri)=>'<tr><th>'+E(D.rowL[ri])+'</th>'+D.cols.map(c=>cell(num(v[gkey(fd.k,r,c)]))).join('')+'</tr>').join('')+'</tbody></table></div>';
   else grids+='<div class="rc-grid-t"><b>'+E(fd.l+' · البداية / الوسط / النهاية')+'</b><table><tbody><tr>'+NK[fd.k].map(k=>cell(num(v[k]))).join('')+'</tr></tbody></table></div>';
   return;
  }
  if(!fd.c||fd.t!=='n')return;
  const x=num(v[fd.k]);if(x==null)return;
  const st=chk(fd.c,x,sec,e.time),dec=fd.c==='ph'?2:fd.c==='ec'?0:1,u=unitOf(fd);
  rows+='<div class="rc-r'+(isBad(st)?' bad':'')+'"><span class="rc-r-l">'+E(fd.cl||fd.l)+'<small>'+E('المستهدف '+rangeTxt(fd.c,sec,e.time))+'</small></span><b>'+E(f(x,dec)+(u==='°C'?'°':u&&u!=='pH'?' '+u:''))+'</b><i>'+I(isBad(st)?'bang':'check',12,3)+'</i></div>';
 });
 return rows||grids?rows+grids:'';
}
function detailsHTML(e,T,sec){
 const v=e.v||{},skip=['time','memo','text','action','catX'],tiles=[];
 T.fields.forEach(fd=>{
  if(skip.includes(fd.k)||fd.t==='grid'||fd.t==='photo'||(fd.c&&fd.t==='n'))return;
  if(fd.show&&!fd.show(v))return;
  let val=v[fd.k];if(val==null||val==='')return;
  if(fd.t==='batch'){const b=(window.Farm&&Farm.cropReady()?Farm.crops():S.meta).find(x=>x.id===val);val=b?(b.v.crop||'')+' · '+DT(b.date):'دفعة غير معروفة';}
  else if(fd.t==='n'){const u=unitOf(fd);val=f(num(val),Math.abs(num(val))<20&&num(val)%1?1:0)+(u&&u!=='pH'?' '+u:'');}
  else if(fd.t==='t')val=fmtTime(val);
  else if(fd.t==='chk'){if(val!==true)return;val='نعم';}
  else if(fd.t==='calc')val=f(num(val));
  else if(typeof val==='object')return;
  tiles.push([fd.cl||fd.l,String(val)]);
 });
 if(e.type==='note'&&v.cat===NOTE_OTHER&&v.catX)tiles.push(['النوع',v.catX]);
 if(e.type==='batt'){if(v.start)tiles.push(['بدأ الشحن',tsTime(v.start)]);tiles.push(['انتهى الشحن',v.end?tsTime(v.end):'جارٍ الشحن']);}
 if((e.type==='refill'||e.type==='waterOnly')&&v.waterMethod)tiles.push(['حساب الماء',v.waterMethod+(v.waterEstimated?' · تقديري':'')]);
 return tiles.length?'<div class="rc-tiles">'+tiles.map(t=>'<div><span>'+E(t[0])+'</span><b>'+E(t[1])+'</b></div>').join('')+'</div>':'';
}
function historyHTML(e){
 const H=[],ts=e.ts?todayStr(new Date(e.ts)):'';
 H.push(['أُنشئ التسجيل',nameOf(e.by)+(e.ts?' · '+tsTime(e.ts)+(ts&&ts!==e.date?' · '+DT(ts):''):''),'ok']);
 const ch=Farm.changesFor?Farm.changesFor(e.id):[];
 ch.slice().sort((a,b)=>((a.created&&a.created.seconds)||0)-((b.created&&b.created.seconds)||0)).forEach(x=>{
  const T=typeDef(x.type,x.sec||secView(e))||{fields:[]},keys=Object.keys(x.after||{}).filter(k=>k!=='auditId'&&JSON.stringify(x.after[k])!==JSON.stringify((x.before||{})[k])&&typeof x.after[k]!=='object').slice(0,2);
  const diff=keys.map(k=>{const fd=T.fields.find(z=>z.k===k);return (fd?fd.cl||fd.l:k)+' من '+((x.before||{})[k]??'—')+' إلى '+x.after[k];}).join('، ');
  H.push([x.requested?'طلب تصحيح':x.before?'عُدّل':'أُضيف بتاريخ سابق',nameOf(x.by)+(x.created&&x.created.seconds?' · '+tsTime(x.created.seconds*1000):'')+(x.reason?' · السبب: '+x.reason:'')+(diff?' · '+diff:''),'gold']);
  if(x.resolution)H.push([x.resolution==='معتمد'?'قُبل التصحيح':'رُفض التصحيح',nameOf(x.reviewedBy)+(x.resolutionReason?' · '+x.resolutionReason:''),x.resolution==='معتمد'?'ok':'hot']);
 });
 if(e.review&&e.review.s==='flag')H.push(['أُعيد للتصحيح',nameOf(e.review.by)+(e.review.at?' · '+tsTime(e.review.at):'')+(e.review.c?' · '+e.review.c:''),'hot']);
 return '<section class="bd-card"><h2 class="rc-ct">سجل التسجيل</h2><div class="rc-hist">'+H.map((x,i)=>'<div class="rc-h '+x[2]+(i===H.length-1?' last':'')+'"><span class="rc-h-l"><i></i><em></em></span><span class="rc-h-t"><b>'+E(x[0])+'</b><small>'+E(x[1])+'</small></span></div>').join('')+'</div></section>';
}
function svcDetail(e){
 return '<header class="rc-th"><span class="bd-hic gray xl">'+I('wrench',26)+'</span><div><h1>'+E(e.kind)+'</h1><p>'+E('المعدات · '+DW(e.date)+(e.time?' · '+fmtTime(e.time):''))+'</p></div></header>'+
  '<div class="rc-people"><span class="rc-person"><i>'+initials(e.by)+'</i>'+E(nameOf(e.by))+'</span></div><section class="bd-card"><h2 class="rc-ct">التفاصيل</h2><div class="rc-tiles"><div><span>النتيجة</span><b>'+E(e.result||'تم')+'</b></div>'+(e.memo?'<div><span>الملاحظة أو الموقع</span><b>'+E(e.memo)+'</b></div>':'')+'</div></section><a href="#" class="rc-big ghost" data-farm="route" data-id="equipment">'+I('wrench',18)+'المعدات والصيانة</a>';
}
function detail(){
 const id=R.id;watch(id);
 const e=R.reg[id]||findAny(id);
 if(R.gone[id])return '<p class="bd-empty">حُذف هذا التسجيل.</p>';
 if(!e)return '<div class="bd-skel"></div><p class="bd-empty">جارٍ تحميل التسجيل…</p>';
 if(e.type==='svc')return svcDetail(e);
 const sec=secView(e),T=typeDef(e.type,sec)||{label:'تسجيل',fields:[]},v=e.v||{},[ic,tone]=style(e.type),pend=Farm.pendingChange(e.id);
 let h='<header class="rc-th"><span class="bd-hic '+tone+' xl">'+I(ic,26)+'</span><div><h1>'+E(T.label)+'</h1><p>'+E((e.sec==='g'?'المعدات':SECS[sec].name)+' · '+DW(e.date)+(e.time?' · '+fmtTime(e.time):''))+'</p></div></header>';
 h+='<div class="rc-people"><span class="rc-person"><i>'+initials(e.by)+'</i>'+E(nameOf(e.by))+'</span>'+(e.type==='note'&&v.cat!==NOTE_NONE?'<span class="rc-tag '+(e.open?'warn':'ok')+'">'+(e.open?'ملاحظة مفتوحة':'تم الحل')+'</span>':'')+'</div>';
 if(e.review&&e.review.s==='flag')h+='<div class="rc-flag">'+I('edit',18)+'<span><b>مطلوب تصحيح</b>'+E((e.review.c||'راجع القيم وصحّحها')+' · '+nameOf(e.review.by))+'</span></div>';
 if(pend)h+='<div class="rc-info">'+I('clock',18)+'<span>طلب تصحيح بانتظار قرار المشرف</span></div>';
 const rd=readingsHTML(e,T,sec);if(rd)h+='<section class="bd-card"><h2 class="rc-ct">القياسات</h2>'+rd+'</section>';
 const dt=detailsHTML(e,T,sec);if(dt)h+='<section class="bd-card"><h2 class="rc-ct">التفاصيل</h2>'+dt+'</section>';
 const txt=[['الوصف',v.text],['الإجراء المتخذ',v.action],['ملاحظة',v.memo]].filter(x=>x[1]);
 if(txt.length)h+='<section class="bd-card">'+txt.map(x=>'<div class="rc-memo">'+I('chat',18)+'<span><b>'+E(x[0])+':</b> '+E(x[1])+'</span></div>').join('')+'</section>';
 if(e.thumb||e.photo)h+='<section class="bd-card"><h2 class="rc-ct">الصورة</h2><img class="rc-photo" alt="صورة التسجيل" '+(e.thumb?'src="'+safeImg(e.thumb)+'"':'data-photo="'+esc(e.photo)+'"')+' data-act="lightbox" data-pid="'+esc(e.photo||'')+'"></section>';
 h+=historyHTML(e);
 const acts=[];
 if(canEditEntry(e))acts.push('<button type="button" class="btn pri" data-act="edit" data-id="'+E(e.id)+'">'+I('edit',18)+'تعديل التسجيل</button>');
 else if(isWorker()&&e.by===S.uid&&e.review&&!pend)acts.push('<button type="button" class="btn pri" data-farm="correct" data-id="'+E(e.id)+'">'+I('edit',18)+(e.review.s==='flag'?'صحّح التسجيل':'طلب تصحيح')+'</button>');
 if(isSup()){
  if(!e.review&&!pend)acts.push('<button type="button" class="btn ok" data-act="approve" data-id="'+E(e.id)+'">'+I('check',18,2.4)+'اعتماد</button>');
  if(!pend)acts.push('<button type="button" class="btn warn" data-act="flag" data-id="'+E(e.id)+'">إعادة للتصحيح</button>');
  else acts.push('<button type="button" class="btn" data-farm="route" data-id="changes">فتح طلب التصحيح</button>');
  if(e.type==='note'&&v.cat!==NOTE_NONE)acts.push('<button type="button" class="btn" data-act="toggleNote" data-id="'+E(e.id)+'">'+(e.open?'تم الحل':'إعادة فتح الملاحظة')+'</button>');
 }
 if(acts.length)h+='<div class="rc-foot">'+acts.join('')+'</div>';
 return h;
}

/* ---------- المراجعة السريعة (المشرف) ---------- */
function reviewItem(e){
 R.reg[e.id]=e;const [ic,tone]=style(e.type);
 return '<div class="rv-item"><a href="#" class="rv-main" data-rc="detail" data-id="'+E(e.id)+'"><span class="bd-hic '+tone+'">'+I(ic,18)+'</span><span class="rc-row-t"><b>'+E(label(e))+'</b><small>'+E((fmtTime(e.time)||'بدون وقت')+' · '+nameOf(e.by))+'</small><span class="rc-vals">'+chipsHTML(vals(e),4)+'</span></span></a><div class="rv-acts"><button type="button" class="rv-ok" data-act="approve" data-id="'+E(e.id)+'">'+I('check',16,2.6)+'اعتماد</button><button type="button" class="rv-fix" data-act="flag" data-id="'+E(e.id)+'">'+I('edit',16,2)+'تصحيح</button></div></div>';
}
function pendingOf(sec){return S.entries.filter(e=>e.type!=='selftest'&&(secOf(e)===sec||e.sec==='g')&&!e.review&&!Farm.pendingChange(e.id));}
function review(){
 if(!isSup()){S.tab='today';return Board.worker();}
 const sec=S.sec,all=S.entries.filter(e=>e.type!=='selftest'&&(secOf(e)===sec||e.sec==='g')),pend=pendingOf(sec).sort(byT);
 const bad=pend.filter(outOfRange),ok=pend.filter(e=>!outOfRange(e)),again=all.filter(e=>Farm.pendingChange(e.id)).length,done=all.filter(e=>e.review&&e.review.s==='ok').length;
 const other=sec==='n'?'t':'n',otherN=pendingOf(other).filter(e=>e.sec!=='g').length;
 let h='<header class="rc-head"><div class="rc-head-r"><h1>المراجعة</h1><span class="rc-sec s-'+sec+'"><i></i>'+E(SECS[sec].name)+'</span></div><p class="rc-head-p">'+E(dayTitle(S.date)+' · '+(pend.length?Board.pl(pend.length,'تسجيل بانتظار المراجعة','تسجيلان بانتظار المراجعة','تسجيلات بانتظار المراجعة','تسجيلاً بانتظار المراجعة'):'لا شيء بانتظار المراجعة')+(done?' · اعتُمد '+done:''))+'</p></header>';
 if(!S.dayLoaded)return h+'<div class="bd-skel"></div>';
 if(again)h+='<a href="#" class="rc-info link" data-farm="route" data-id="changes">'+I('edit',18)+'<span>'+E(Board.pl(again,'طلب تصحيح من الفريق بانتظار قرارك','طلبا تصحيح بانتظار قرارك','طلبات تصحيح بانتظار قرارك','طلب تصحيح بانتظار قرارك'))+'</span>'+I('chev',16,2)+'</a>';
 if(!pend.length){
  h+='<div class="rv-empty">'+I('check',30,2.4)+'<b>'+(all.length?'تمت مراجعة كل تسجيلات '+E(SECS[sec].name):'لا توجد تسجيلات في هذا اليوم')+'</b><span>'+(all.length?E(cnt(all.length)+' في '+dayTitle(S.date)):'')+'</span></div>';
 }else{
  if(bad.length)h+='<h2 class="rv-h bad">'+I('bang',16,2.6)+E('خارج الحدود · راجعها أولاً ('+bad.length+')')+'</h2>'+bad.map(reviewItem).join('');
  if(ok.length)h+='<h2 class="rv-h">'+I('check',16,2.6)+E('ضمن الحدود ('+ok.length+')')+'</h2>'+ok.map(reviewItem).join('');
  if(ok.length)h+='<div class="rc-foot rv-foot">'+(bad.length?'<p>'+E('اعتمد أو صحّح القراءات خارج الحدود أولاً؛ هذا الزر يعتمد القراءات التي ضمن الحدود فقط.')+'</p>':'')+'<button type="button" class="btn pri" data-rc="approveRest">'+I('check',18,2.6)+E(bad.length?'اعتماد '+Board.pl(ok.length,'تسجيل ضمن الحدود','تسجيلين ضمن الحدود','تسجيلات ضمن الحدود','تسجيلاً ضمن الحدود'):'اعتماد الباقي · '+ok.length)+'</button></div>';
 }
 if(otherN)h+='<a href="#" class="rc-info link" data-act="switchSec" data-s="'+other+'">'+I('clip',18)+'<span>'+E('في '+SECS[other].name+': '+Board.pl(otherN,'تسجيل بانتظار المراجعة','تسجيلان بانتظار المراجعة','تسجيلات بانتظار المراجعة','تسجيلاً بانتظار المراجعة'))+'</span>'+I('chev',16,2)+'</a>';
 return h;
}
function approveRest(b){
 if(!isSup()||b.disabled)return;
 const sec=S.sec,pend=pendingOf(sec),ok=pend.filter(e=>!outOfRange(e)),bad=pend.filter(outOfRange);if(!ok.length)return;
 const at=Date.now();
 const done=approveChunks(ok.map(e=>e.id)).then(()=>bad.length?null:S.db.collection('signoffs').doc(S.date+'_'+sec).set({by:S.uid,at,sec}));
 GSUI.commit(done,b,()=>toast(bad.length?'اعتُمد '+cnt(ok.length):'اكتملت مراجعة '+SECS[sec].name));
}

/* ---------- رأس نموذج التسجيل ---------- */
function formHead(T,sec,type,e,sub2){
 const vs=sec==='g'?S.sec:sec,[ic,tone]=style(type),x=TASKS[vs]&&TASKS[vs].find(t=>t[0]===type),need=x?needOf(vs,x):0,done=need?doneOf(secEntries(S.entries,vs),type):0;
 let sub=sec==='g'?'المعدات':SECS[vs].name;
 if(e)sub+=' · تعديل تسجيل '+(e.time?fmtTime(e.time)+' · ':'')+first(e.by);
 else if(need)sub+=done<need?' · الجولة '+(done+1)+' من '+need:' · جولة إضافية';
 if(!e&&S.date!==todayStr())sub+=' · '+DT(S.date);
 if(sub2)sub=sub2+(e?' · تعديل':'')+(!e&&S.date!==todayStr()?' · '+DT(S.date):'');
 return '<div class="fh"><span class="bd-hic '+tone+' md">'+I(ic,21)+'</span><div class="fh-t"><h2>'+E(T.label)+'</h2><span>'+E(sub)+'</span></div>'+(!e&&type!=='batt'?'<button type="button" class="fh-log" data-rc="type" data-type="'+type+'">'+I('history',15,2)+'السجل</button>':'')+'<button class="iconbtn" type="button" data-act="close" aria-label="إغلاق">✕</button></div>';
}

/* ---------- العامل: تسجيلاته التي تحتاج تصحيحاً (كل الأيام) ---------- */
function start(){
 if(R.flagsOff||!S.db||!S.uid||!S.role||isSup())return;
 const uid=S.uid;
 R.flagsOff=S.db.collection('entries').where('by','==',uid).where('review.s','==','flag').onSnapshot(q=>{if(S.uid!==uid)return;R.flags=entriesOf(q).filter(e=>e.type!=='selftest');render();},e=>console.warn(e));
}
function stop(){if(R.flagsOff){R.flagsOff();R.flagsOff=null;}R.flags=[];if(R.sub){R.sub();R.sub=null;R.subId=null;}R.days={};R.tl={};R.reg={};R.gone={};R.view=null;R.filter='all';R.q='';R.more=1;}

/* ---------- التنقل والأحداث ---------- */
function open(tab){if(S.tab===tab)render(true);else setTab(tab);}
function openList(filter){R.view='list';R.filter=filter||'all';R.q='';R.more=1;open('add');}
function openType(type){R.type=type;open('recType');}
function openDetail(id){R.id=id;open('recDetail');}
document.addEventListener('click',ev=>{
 const b=ev.target.closest&&ev.target.closest('[data-rc]');if(!b)return;
 ev.preventDefault();const a=b.dataset.rc,inSheet=!!b.closest('#sheetRoot');
 const go=fn=>{if(inSheet&&NAV.sheet){closeSheet();setTimeout(fn,30);}else fn();};
 switch(a){
  case 'view':R.view=b.dataset.v;lsSet('gs_rec_view_'+S.uid,R.view);if(R.view==='list'&&R.filter==='fix'&&!R.flags.length)R.filter='all';render(true);break;
  case 'f':R.filter=b.dataset.f;render(true);break;
  case 'more':R.more=Math.min(R.more+1,30);render(true);break;
  case 'type':go(()=>openType(b.dataset.type));break;
  case 'detail':go(()=>openDetail(b.dataset.id));break;
  case 'list':go(()=>openList(b.dataset.f));break;
  case 'approveRest':approveRest(b);break;
 }
});
document.addEventListener('input',ev=>{
 if(ev.target&&ev.target.id==='rcSearch'){R.q=ev.target.value;const l=$('rcList');if(l){l.innerHTML=listBody();}}
});
document.addEventListener('keydown',ev=>{if(ev.target&&ev.target.id==='rcSearch'&&ev.key==='Enter'){ev.preventDefault();ev.target.blur();}});
return {view,typeLog,detail,review,formHead,start,stop,leave,openList,openType,openDetail,find:findAny,flags:()=>R.flags,vals,outOfRange,_test:{R,listBody,typeData,lastOfType,series}};
})();
