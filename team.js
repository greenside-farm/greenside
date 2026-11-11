/* GREEN SIDE 3.4.1 — «الفريق»: محادثات مثل تطبيقات المراسلة (الفريق + محادثة لكل شخص) والمهام.
   الرسائل والمهام من مجموعات farmMessages و farmJobs الحالية. غير المقروء يُحفظ على الجهاز،
   وعلامة القراءة ✓✓ تعمل عند نشر قاعدة farmSeen (كل مستخدم يكتب وثيقته فقط). */
var Team=(()=>{
'use strict';
const I=(n,s,w)=>Board.icon(n,s,w);
const E=x=>esc(String(x??'')).replace(/(-?\d[\d,.]*)(°|%)/g,'⁦$1$2⁩');
const T={tab:null,room:null,q:'',draft:{},seen:null,seenUid:'',docs:{},seenOk:null,seenOff:null,pend:{},wt:0,more:{},stick:true,taskF:null};
const DT=d=>d?fmtDate(d,{day:'numeric',month:'long'}):'';
const first=id=>String(nameOf(id)||'').trim().split(/\s+/)[0]||'';
const ms=x=>x&&x.created&&x.created.seconds!=null?x.created.seconds*1000+Math.floor((x.created.nanoseconds||0)/1e6):Date.now();
const pending=x=>!(x&&x.created&&x.created.seconds!=null);
const roomOf=x=>x.audience==='team'?'team':(x.by===S.uid?x.audience:x.by);
const dayKey=t=>todayStr(new Date(t));
const PALETTE=6;
function color(id){let h=0;String(id).split('').forEach(c=>{h=(h*31+c.charCodeAt(0))>>>0;});return 'av-c'+(h%PALETTE);}
function avatar(room,size){return room==='team'?'<span class="tm-av team '+(size||'')+'">'+I('users',size==='lg'?24:20)+'</span>':'<span class="tm-av '+color(room)+' '+(size||'')+'">'+initials(room)+'</span>';}
function members(){return Object.keys(S.users).filter(id=>{const u=S.users[id];return id!==S.uid&&u&&!u.selftest&&(u.role==='worker'||u.role==='sup'||id===S.ownerUid);});}
function roleOf(id){return id===S.ownerUid?'المالك':S.users[id]&&S.users[id].role==='sup'?'مشرف':'عامل';}
function roomName(r){return r==='team'?'الفريق':nameOf(r);}
function whenLabel(t){const d=dayKey(t),td=todayStr();if(d===td)return tsTime(t);if(d===addDays(td,-1))return 'أمس';if(daysBetween(d,td)<7)return fmtDate(d,{weekday:'long'});return DT(d);}
function dayLabel(d){const td=todayStr();return d===td?'اليوم':d===addDays(td,-1)?'أمس':fmtDate(d,{weekday:'long',day:'numeric',month:'long'});}
const hm=t=>tsTime(t);

/* ---------- غير المقروء: آخر وقت قرأت فيه كل محادثة (على هذا الجهاز) ---------- */
function seenMap(){
 if(!T.seen||T.seenUid!==S.uid){let o=null;try{o=JSON.parse(lsGet('gs_seen_'+S.uid)||'null');}catch(e){}
  if(!o||typeof o!=='object')o={_init:Date.now()-864e5};T.seen=o;T.seenUid=S.uid;}
 return T.seen;
}
function seenAt(room){const m=seenMap();return m[room]!=null?m[room]:(m._init||0);}
let LR=null,LRu='';
function legacyRead(){if(LR&&LRu===S.uid)return LR;LR=new Set();LRu=S.uid;const p='gs_read_'+S.uid+'_';try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(p))LR.add(k.slice(p.length));}}catch(e){}return LR;}
function isUnread(x){return x.by!==S.uid&&ms(x)>seenAt(roomOf(x))&&!legacyRead().has(x.id);}
function all(){return window.Farm?Farm.messages():[];}
function unread(room){return all().filter(x=>(!room||roomOf(x)===room)&&isUnread(x)).length;}
function markSeen(room){
 const last=all().filter(x=>roomOf(x)===room&&!pending(x)).reduce((m,x)=>Math.max(m,ms(x)),0);if(!last)return;
 const m=seenMap();if((m[room]||0)>=last)return;m[room]=last;lsSet('gs_seen_'+S.uid,JSON.stringify(m));pushSeen(room,last);
 const t=$('tabs');if(t)t.__h='';renderTabsSoon();
}
let rt=0;function renderTabsSoon(){clearTimeout(rt);rt=setTimeout(()=>{if(typeof renderTabs==='function'&&S.role)renderTabs();},50);}

/* ---------- علامة القراءة ✓✓ (وثيقة لكل مستخدم في farmSeen) ---------- */
function start(){
 if(T.seenOff||!S.db||!S.uid||!S.role)return;const uid=S.uid;
 T.seenOff=S.db.collection('farmSeen').onSnapshot(q=>{if(S.uid!==uid)return;const m={};q.forEach(d=>{const x=d.data()||{};m[d.id]={rooms:plain(x.rooms)?x.rooms:{}};});T.docs=m;T.seenOk=true;if(S.tab==='chat')render();},()=>{T.seenOk=false;});
}
function stop(){if(T.seenOff){T.seenOff();T.seenOff=null;}T.docs={};T.seenOk=null;T.seen=null;T.room=null;T.draft={};T.q='';T.tab=null;clearTimeout(T.wt);T.pend={};}
function pushSeen(room,t){if(T.seenOk===false||!S.db)return;T.pend[room]=Math.max(T.pend[room]||0,t);clearTimeout(T.wt);T.wt=setTimeout(flushSeen,1200);}
function flushSeen(){
 const rooms=T.pend;T.pend={};if(!Object.keys(rooms).length||!S.uid)return;
 S.db.collection('farmSeen').doc(S.uid).set({rooms,at:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).catch(()=>{T.seenOk=false;});
}
function readers(x){
 if(T.seenOk!==true)return null;
 const room=roomOf(x),t=ms(x),seen=(u,k)=>{const d=T.docs[u];return d&&d.rooms&&d.rooms[k]>=t;};
 if(room==='team'){const others=members();return {all:others.length&&others.every(u=>seen(u,'team')),who:others.filter(u=>seen(u,'team')),n:others.length};}
 return {all:seen(room,S.uid),who:seen(room,S.uid)?[room]:[],n:1};
}
function ticks(x){
 if(pending(x))return '<span class="tm-tk wait" aria-label="بانتظار الإرسال">'+I('clock',13,2.2)+'</span>';
 const r=readers(x);
 if(r&&r.all)return '<span class="tm-tk read" aria-label="قُرئت">'+tickSvg(true)+'</span>';
 return '<span class="tm-tk" aria-label="أُرسلت">'+tickSvg(false)+'</span>';
}
function tickSvg(two){return '<svg aria-hidden="true" width="'+(two?18:13)+'" height="13" viewBox="0 0 '+(two?30:20)+' 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10.5l5 5L18 4.5"/>'+(two?'<path d="M12 15.5l1 0L28 4.5"/>':'')+'</svg>';}

/* ---------- رأس «الفريق» ---------- */
function head(cur){
 const un=unread(),open=openJobs(),late=open.filter(j=>j.due<todayStr()).length;
 return '<header class="tm-head"><h1>الفريق</h1><div class="tm-tabs" role="tablist"><button type="button" role="tab" data-tm="tab" data-v="msg" aria-selected="'+(cur==='msg')+'">الرسائل'+(un?'<b class="tm-n">'+un+'</b>':'')+'</button><button type="button" role="tab" data-tm="tab" data-v="tasks" aria-selected="'+(cur==='tasks')+'">المهام'+(open.length?'<b class="tm-n '+(late?'bad':'mute')+'">'+open.length+'</b>':'')+'</button></div></header>';
}
function view(){
 const cur=T.tab||lsGet('gs_team_tab_'+S.uid)||'msg';
 return head(cur)+(cur==='tasks'?tasksView():listView());
}

/* ---------- قائمة المحادثات ---------- */
function preview(x){
 const who=x.by===S.uid?'أنت: ':roomOf(x)==='team'?first(x.by)+': ':'';
 if(x.task){const j=job(x.task);return who+'مهمة: '+(j?j.title:String(x.body||'').replace(/^مهمة جديدة: /,''));}
 return who+String(x.body||'').replace(/\s+/g,' ');
}
function listView(){
 const msgs=all(),rooms=['team'].concat(members());
 const info=rooms.map(r=>{const m=msgs.filter(x=>roomOf(x)===r);const last=m.reduce((a,x)=>!a||ms(x)>ms(a)?x:a,null);return {r,last,un:m.filter(isUnread).length};});
 info.sort((a,b)=>(b.last?ms(b.last):0)-(a.last?ms(a.last):0)||(a.r==='team'?-1:b.r==='team'?1:0)||String(roomName(a.r)).localeCompare(roomName(b.r),'ar'));
 const q=T.q.trim().toLowerCase();
 let h='<div class="tm-search"><label>'+I('search',18,2)+'<input type="search" id="tmSearch" value="'+E(T.q)+'" placeholder="بحث في الرسائل" aria-label="بحث في الرسائل" enterkeyhint="search"></label></div><div id="tmList">'+(q?searchResults(q,msgs):info.map(o=>roomRow(o)).join(''))+'</div>';
 const err=Farm.err?['messages','sent','received'].map(Farm.err).filter(Boolean)[0]:'';
 if(err)h+='<p class="bd-empty">'+E('تعذّر تحميل الرسائل: '+err)+'</p>';
 return h+'<button type="button" class="tm-fab" data-tm="new" aria-label="رسالة جديدة">'+I('edit',22)+'</button>';
}
function roomRow(o){
 const last=o.last;
 return '<a href="#" class="tm-row'+(o.un?' un':'')+'" data-tm="open" data-r="'+E(o.r)+'">'+avatar(o.r)+'<span class="tm-row-t"><span class="tm-row-a"><b>'+E(roomName(o.r))+'</b><small>'+(last?E(whenLabel(ms(last))):'')+'</small></span><span class="tm-row-b"><span>'+(last?E(preview(last)):o.r==='team'?'رسائل لكل الفريق':E(roleOf(o.r)+' · ابدأ محادثة'))+'</span>'+(o.un?'<i class="tm-badge">'+o.un+'</i>':'')+'</span></span></a>';
}
function searchResults(q,msgs){
 const hits=msgs.filter(x=>(String(x.body||'')+' '+nameOf(x.by)+' '+roomName(roomOf(x))).toLowerCase().includes(q)).slice(0,40);
 if(!hits.length)return '<p class="bd-empty">لا توجد رسائل مطابقة.</p>';
 return hits.map(x=>'<a href="#" class="tm-row" data-tm="open" data-r="'+E(roomOf(x))+'">'+avatar(roomOf(x))+'<span class="tm-row-t"><span class="tm-row-a"><b>'+E(roomName(roomOf(x)))+'</b><small>'+E(whenLabel(ms(x)))+'</small></span><span class="tm-row-b"><span>'+E(preview(x))+'</span></span></span></a>').join('');
}
function newSheet(){
 const rooms=['team'].concat(members());
 openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true" aria-label="رسالة جديدة">'+sheetHead('رسالة جديدة')+'<div class="tm-pick">'+rooms.map(r=>'<a href="#" class="tm-row" data-tm="open" data-r="'+E(r)+'">'+avatar(r)+'<span class="tm-row-t"><span class="tm-row-a"><b>'+E(roomName(r))+'</b></span><span class="tm-row-b"><span>'+(r==='team'?'كل الفريق':E(roleOf(r)))+'</span></span></span></a>').join('')+'</div><div style="height:12px"></div></div></div>');
}

/* ---------- غرفة المحادثة ---------- */
function job(id){return (Farm.jobs?Farm.jobs():[]).find(j=>j.id===id)||null;}
function taskCard(x,mine){
 const j=job(x.task);
 if(!j)return '<div class="tm-task gone">'+I('tasks',16,2)+'<span>'+E(String(x.body||'مهمة'))+'</span></div>';
 const done=j.status==='مكتملة',late=!done&&j.due<todayStr(),can=!done&&(isSup()||j.assignee===S.uid);
 const last=(j.history||[]).slice(-1)[0];
 return '<div class="tm-task'+(done?' done':late?' late':'')+'"><div class="tm-task-h">'+I('tasks',16,2)+'<span>'+(x.body&&/^(نفّذت|أجّلت)/.test(x.body)?E(x.body.split(':')[0]):'مهمة · لـ '+E(first(j.assignee)||nameOf(j.assignee)))+'</span></div><b>'+E(j.title)+'</b><small>'+E(done?'اكتملت'+(last?' · '+first(last.by)+' · '+DT(last.day):''):(late?'متأخرة · كان موعدها ':'الموعد ')+(j.due===todayStr()?'اليوم':DT(j.due))+(j.status==='مؤجلة'?' · مؤجلة':''))+'</small>'+(j.note?'<p>'+E(j.note)+'</p>':'')+
  (can?'<div class="tm-task-a"><button type="button" class="btn pri" data-farm="job-done" data-id="'+E(j.id)+'">تم</button><button type="button" class="btn" data-farm="job-defer" data-id="'+E(j.id)+'">تأجيل</button></div>':done?'<div class="tm-task-ok">'+I('check',14,2.6)+'نُفّذت</div>':'')+'</div>';
}
function bubble(x,prev,isTeam){
 const mine=x.by===S.uid,t=ms(x),showName=isTeam&&!mine&&(!prev||prev.by!==x.by||dayKey(ms(prev))!==dayKey(t));
 const body=x.task?taskCard(x,mine):'<div class="tm-txt">'+E(x.body||'').replace(/\n/g,'<br>')+'</div>';
 return '<div class="tm-msg '+(mine?'me':'them')+(x.task?' has-task':'')+(prev&&prev.by===x.by&&!showName?' cont':'')+'" data-id="'+E(x.id)+'">'+(showName?'<div class="tm-from '+color(x.by)+'">'+E(nameOf(x.by))+'</div>':'')+body+'<div class="tm-meta">'+E(pending(x)?'الآن':hm(t))+(mine?ticks(x):'')+'</div></div>';
}
function roomMsgs(room){return all().filter(x=>roomOf(x)===room).sort((a,b)=>ms(a)-ms(b));}
function msgsHTML(room){
 const list=roomMsgs(room),n=T.more[room]||80,shown=list.slice(-n),isTeam=room==='team';
 let h=list.length>shown.length?'<button type="button" class="tm-older" data-tm="older">'+I('up',14,2.2)+'رسائل أقدم</button>':'';
 if(!list.length)h+='<div class="tm-empty">'+I('chat',28,1.8)+'<b>'+(isTeam?'لا توجد رسائل للفريق بعد':'ابدأ المحادثة مع '+E(first(room)))+'</b><span>'+(isTeam?'ما تكتبه هنا يصل لكل الفريق.':'الرسالة تصل '+E(nameOf(room))+' فقط.')+'</span></div>';
 let prev=null,day='';
 shown.forEach(x=>{const d=dayKey(ms(x));if(d!==day){h+='<div class="tm-day"><span>'+E(dayLabel(d))+'</span></div>';day=d;prev=null;}h+=bubble(x,prev,isTeam);prev=x;});
 if(isTeam&&T.seenOk===true){const lastMine=shown.filter(x=>x.by===S.uid&&!pending(x)).slice(-1)[0];if(lastMine){const r=readers(lastMine);if(r&&r.who.length&&!r.all)h+='<div class="tm-readby">'+E('قرأها: '+r.who.map(first).join('، '))+'</div>';}}
 return h;
}
const QUICK=['تم ✓','في الطريق','حاضر','أحتاج مساعدة'];
function roomView(){
 const room=T.room;
 if(!room||(room!=='team'&&!S.users[room])){S.tab='team';return view();}
 const isTeam=room==='team',sub=isTeam?members().map(first).filter(Boolean).join('، '):roleOf(room);
 T.stick=!!T.firstPaint||nearBottom();
 return '<header class="tm-rh"><button type="button" class="tm-back" data-act="goBack" aria-label="رجوع إلى المحادثات">'+I('back',22,2.2)+'</button>'+avatar(room)+'<span class="tm-rh-t"><b>'+E(roomName(room))+'</b><small>'+E(sub)+'</small></span>'+(isSup()?'<button type="button" class="tm-rh-btn" data-tm="task" data-r="'+E(room)+'">'+I('tasks',18,2)+'مهمة</button>':'')+'</header>'+
  '<div class="tm-msgs" id="chatMsgs">'+msgsHTML(room)+'</div>'+
  '<div class="tm-compose"><div class="tm-quick">'+QUICK.map(q=>'<button type="button" data-tm="quick" data-t="'+E(q)+'">'+E(q)+'</button>').join('')+'</div><form class="tm-bar" id="tmForm"><textarea id="tmInput" rows="1" maxlength="2000" placeholder="اكتب رسالة" aria-label="اكتب رسالة" enterkeyhint="send">'+E(T.draft[room]||'')+'</textarea><button type="submit" class="tm-send" aria-label="إرسال">'+I('send',20,2.2)+'</button></form></div>';
}
function nearBottom(){return window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-140;}
function toBottom(){window.scrollTo(0,document.documentElement.scrollHeight);}
function after(){
 if(S.tab!=='chat')return;
 if(T.stick){setTimeout(toBottom,0);setTimeout(toBottom,250);}
 const ta=$('tmInput');if(ta)grow(ta);
 if(document.visibilityState==='visible')markSeen(T.room);
}
/* تحديث الرسائل فقط أثناء الكتابة (بدون إعادة رسم الصفحة كلها) */
function patch(){
 if(S.tab!=='chat'||!T.room)return false;const box=$('chatMsgs');if(!box)return false;
 const stick=nearBottom(),html=msgsHTML(T.room);if(box.__h!==html){box.innerHTML=html;box.__h=html;if(stick)toBottom();}
 if(document.visibilityState==='visible')markSeen(T.room);
 return true;
}
function grow(ta){ta.style.height='auto';ta.style.height=Math.min(140,ta.scrollHeight)+'px';}
function send(text){
 const room=T.room;text=String(text||'').trim();if(!room||!text)return;
 if(text.length>2000)text=text.slice(0,2000);
 S.db.collection('farmMessages').add({by:S.uid,audience:room==='team'?'team':room,task:'',body:text,created:firebase.firestore.FieldValue.serverTimestamp()}).catch(e=>toast('لم تُرسل الرسالة: '+errMsg(e)));
 T.draft[room]='';const ta=$('tmInput');if(ta){ta.value='';grow(ta);}
 T.stick=true;setTimeout(()=>{patch();toBottom();},30);
}

/* ---------- المهام ---------- */
function allJobs(){return Farm.jobs?Farm.jobs():[];}
function openJobs(){return allJobs().filter(j=>j.status!=='مكتملة'&&(isSup()||j.assignee===S.uid));}
function dueLabel(j){
 const t=todayStr();if(j.status==='مكتملة'){const last=(j.history||[]).slice(-1)[0];return 'اكتملت'+(last&&last.day?' · '+DT(last.day):'');}
 if(j.due<t)return 'متأخرة · كان موعدها '+DT(j.due);if(j.due===t)return 'اليوم';if(j.due===addDays(t,1))return 'غداً';return fmtDate(j.due,{weekday:'long',day:'numeric',month:'long'});
}
function taskItem(j){
 const t=todayStr(),done=j.status==='مكتملة',late=!done&&j.due<t,can=!done&&(isSup()||j.assignee===S.uid);
 const other=j.assignee===S.uid?j.by:j.assignee,status=done?'مكتملة':late?'متأخرة':j.status==='مؤجلة'?'مؤجلة':j.due===t?'اليوم':'معلقة';
 const hist=(j.history||[]).slice(-3).reverse();
 return '<article class="tm-job'+(late?' late':'')+(done?' done':'')+'"><div class="tm-job-h"><h2>'+E(j.title)+'</h2><span class="tm-st '+(done?'ok':late?'bad':j.due===t?'warn':'')+'">'+E(status)+'</span></div>'+
  '<div class="tm-job-m">'+avatar(j.assignee,'sm')+'<span>'+E(nameOf(j.assignee))+'</span><span>·</span><span class="'+(late?'bad':'')+'">'+E(dueLabel(j))+'</span></div>'+
  (j.note?'<p class="tm-job-n">'+E(j.note)+'</p>':'')+
  (hist.length?'<details class="tm-job-hist"><summary>سجل المهمة</summary>'+hist.map(h=>'<div>'+E(h.status+' · '+first(h.by)+' · '+DT(h.day)+(h.note?' · '+h.note:''))+'</div>').join('')+'</details>':'')+
  (can||other&&other!==S.uid?'<div class="tm-job-a">'+(can?'<button type="button" class="btn pri" data-farm="job-done" data-id="'+E(j.id)+'">تم التنفيذ</button><button type="button" class="btn" data-farm="job-defer" data-id="'+E(j.id)+'">تأجيل</button>':'')+(other&&other!==S.uid&&S.users[other]?'<button type="button" class="btn tm-job-chat" data-tm="open" data-r="'+E(other)+'" aria-label="'+E('مراسلة '+nameOf(other))+'">'+I('chat',18,2)+'</button>':'')+'</div>':'')+'</article>';
}
function tasksView(){
 const sup=isSup(),jobs=allJobs(),t=todayStr();
 const F=sup?[['mine','مطلوبة مني'],['given','كلّفت بها'],['open','كل المفتوحة'],['closed','مكتملة']]:[['mine','مطلوبة مني'],['closed','مكتملة']];
 const pickF=T.taskF&&F.some(x=>x[0]===T.taskF)?T.taskF:sup?'open':'mine';
 const sel={mine:j=>j.status!=='مكتملة'&&j.assignee===S.uid,given:j=>j.status!=='مكتملة'&&j.by===S.uid&&j.assignee!==S.uid,open:j=>j.status!=='مكتملة',closed:j=>j.status==='مكتملة'&&(sup||j.assignee===S.uid)};
 const count=k=>jobs.filter(sel[k]).length;
 let list=jobs.filter(sel[pickF]);
 list=pickF==='closed'?list.sort((a,b)=>((b.changedAt&&b.changedAt.seconds)||0)-((a.changedAt&&a.changedAt.seconds)||0)).slice(0,40):list.sort((a,b)=>String(a.due).localeCompare(String(b.due)));
 let h='<div class="tm-chips" role="group" aria-label="تصفية المهام">'+F.map(f=>'<button type="button" data-tm="tf" data-f="'+f[0]+'" aria-pressed="'+(pickF===f[0])+'">'+E(f[1])+' <span>'+count(f[0])+'</span></button>').join('')+'</div>';
 const err=Farm.err?Farm.err('jobs'):'';
 if(err)h+='<p class="bd-empty">'+E('تعذّر تحميل المهام: '+err)+'</p>';
 else if(!list.length)h+='<div class="tm-empty">'+I('tasks',28,1.8)+'<b>'+(pickF==='closed'?'لا توجد مهام مكتملة بعد':'لا توجد مهام هنا')+'</b>'+(sup&&pickF!=='closed'?'<span>أنشئ مهمة وأرسلها لأحد الفريق من الزر أدناه.</span>':'')+'</div>';
 else{
  if(pickF!=='closed'){const late=list.filter(j=>j.due<t),today=list.filter(j=>j.due===t),next=list.filter(j=>j.due>t);
   [['متأخرة',late,'bad'],['اليوم',today,''],['القادمة',next,'']].forEach(([lab,arr,c])=>{if(arr.length)h+='<h3 class="tm-sec '+c+'">'+E(lab+' · '+arr.length)+'</h3>'+arr.map(taskItem).join('');});}
  else h+=list.map(taskItem).join('');
 }
 if(sup)h+='<div class="tm-spacer"></div><button type="button" class="tm-fab wide" data-tm="task" data-r="">'+I('plus',20,2.6)+'مهمة جديدة</button>';
 return h;
}
function taskSheet(room){
 if(!isSup())return;
 const people=[[S.uid,nameOf(S.uid)+' (أنا)']].concat(members().map(id=>[id,nameOf(id)])),pre=room&&room!=='team'?room:'';
 openSheet('<div class="sheet-bg" data-close><div class="sheet" role="dialog" aria-modal="true" aria-label="مهمة جديدة">'+sheetHead('مهمة جديدة')+'<form class="fgrid" id="tmTask" novalidate>'+
  '<label class="f full">المطلوب<input class="in" id="tk_title" maxlength="200" required placeholder="مثال: تنظيف الفلتر الشبكي"></label>'+
  '<label class="f full">المسؤول<select class="in" id="tk_who" required><option value="">اختر</option>'+people.map(p=>'<option value="'+E(p[0])+'"'+(p[0]===pre?' selected':'')+'>'+E(p[1])+'</option>').join('')+'</select></label>'+
  '<label class="f full">الموعد<input class="in" type="date" id="tk_due" required value="'+todayStr()+'" min="'+todayStr()+'"></label>'+
  '<label class="f full">ملاحظة (اختياري)<input class="in" id="tk_note" maxlength="300" placeholder="تفاصيل تساعد على التنفيذ"></label>'+
  '<p class="full help" style="margin:0">تصل المهمة للمسؤول كرسالة في محادثته، ويستطيع إنهاءها أو تأجيلها من هناك.</p></form><div class="sheet-actions"><button type="button" class="btn pri" data-tm="saveTask">إنشاء المهمة وإرسالها</button></div></div></div>');
}
function saveTask(b){
 if(!isSup()||b.disabled)return;
 const title=($('tk_title').value||'').trim(),who=$('tk_who').value,due=$('tk_due').value,note=($('tk_note').value||'').trim();
 if(!title){toast('اكتب المطلوب');return;}if(!who){toast('اختر المسؤول');return;}if(!/^\d{4}-\d{2}-\d{2}$/.test(due)){toast('اختر الموعد');return;}
 const db=S.db,batch=db.batch(),ref=db.collection('farmJobs').doc(),ts=firebase.firestore.FieldValue.serverTimestamp();
 batch.set(ref,{title,by:S.uid,assignee:who,due,status:'معلقة',note,created:ts});
 if(who!==S.uid)batch.set(db.collection('farmMessages').doc(),{by:S.uid,audience:who,task:ref.id,body:'مهمة جديدة: '+title,created:ts});
 GSUI.commit(batch.commit(),b,()=>{closeSheet();toast(who===S.uid?'أُضيفت المهمة':'أُرسلت المهمة إلى '+first(who));});
}

/* ---------- التنقل والأحداث ---------- */
function openRoom(r){T.room=r;T.firstPaint=true;if(S.tab==='chat')render(true);else setTab('chat');setTimeout(()=>{T.firstPaint=false;},400);}
function openTasks(f){T.tab='tasks';lsSet('gs_team_tab_'+S.uid,'tasks');if(f)T.taskF=f;if(S.tab==='team')render(true);else setTab('team');}
document.addEventListener('click',ev=>{
 const b=ev.target.closest&&ev.target.closest('[data-tm]');if(!b)return;
 ev.preventDefault();const a=b.dataset.tm,inSheet=!!b.closest('#sheetRoot');
 switch(a){
  case 'tab':T.tab=b.dataset.v;lsSet('gs_team_tab_'+S.uid,T.tab);render(true);break;
  case 'open':if(inSheet&&NAV.sheet){closeSheet();setTimeout(()=>openRoom(b.dataset.r),40);}else openRoom(b.dataset.r);break;
  case 'new':newSheet();break;
  case 'older':T.more[T.room]=(T.more[T.room]||80)+80;T.stick=false;patch();break;
  case 'quick':send(b.dataset.t);break;
  case 'task':taskSheet(b.dataset.r);break;
  case 'saveTask':saveTask(b);break;
  case 'tf':T.taskF=b.dataset.f;render(true);break;
  case 'tasks':openTasks(b.dataset.f);break;
 }
});
document.addEventListener('submit',ev=>{if(ev.target&&ev.target.id==='tmForm'){ev.preventDefault();const ta=$('tmInput');if(ta)send(ta.value);}});
document.addEventListener('input',ev=>{
 const t=ev.target;if(!t)return;
 if(t.id==='tmInput'){T.draft[T.room]=t.value;grow(t);}
 else if(t.id==='tmSearch'){T.q=t.value;const l=$('tmList');if(l){const tmp=document.createElement('div');tmp.innerHTML=listView();const nl=tmp.querySelector('#tmList');if(nl)l.innerHTML=nl.innerHTML;}}
});
document.addEventListener('keydown',ev=>{
 const t=ev.target;if(!t)return;
 /* على الحاسوب: Enter يرسل و Shift+Enter سطر جديد. على الجوال زر الإرسال */
 if(t.id==='tmInput'&&ev.key==='Enter'&&!ev.shiftKey&&window.matchMedia&&matchMedia('(pointer:fine)').matches){ev.preventDefault();send(t.value);}
 if(t.id==='tmSearch'&&ev.key==='Enter'){ev.preventDefault();t.blur();}
});
document.addEventListener('focusin',ev=>{if(ev.target&&ev.target.id==='tmInput')setTimeout(toBottom,300);});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&S.tab==='chat'&&T.room)markSeen(T.room);});
return {view,roomView,after,patch,start,stop,unread:()=>unread(),openRoom,openTasks,flush:flushSeen,_test:{T,roomOf,readers,seenAt}};
})();
