/* The Great Siege: accessible presentation of live engine reports and dialogs.
   Coordinates identify engine controls; all simulation and command validation stay in C++. */
(()=>{
'use strict';
const el=(tag,text,parent)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(parent)parent.append(n);return n;};
const clean=SiegeCore.clean;
const call=(name,types=[],args=[])=>Module.ccall(name,null,types,args);
const titles=['World','Kingdoms','Villages','Economy','Trade','Military','Research','Espionage','Ranking','Kingdom activity'];
 // Per-report guidance: each page explains what its rows are and the one action worth taking.
 const HELP={1:'Diplomacy, relations and intelligence. Select a kingdom row to inspect it and open its diplomacy options; double-click a location to centre the map on it. Use a column heading to sort.',2:'Population, loyalty and structures. Select a village to centre the map and open its management panel. Use a column heading to sort.',3:'Yearly income and expenses. Select a line to see what drives your treasury. Use a column heading to sort.',4:'Caravans, ships and routes. A caravan needs a market and a destination settlement. Use a column heading to sort.',5:'Commanders, troops and units. Select one to inspect it; double-click to centre the map on it. Use a column heading to sort.',6:'Technology and discoveries. Research grows once a Tower of science is built and staffed. Use a column heading to sort.',7:'Agents, cover and assignments. Select an agent to review its location and task. Use a column heading to sort.',8:'Kingdom standings and victory progress. Compare score, population and territory. Use a column heading to sort.'};
 const DEFAULT_HELP='Select a row to inspect it.';
 // Empty states name the missing prerequisite and the next step instead of a generic notice.
 const EMPTY={1:'No kingdom records yet. Explore the map to meet your neighbours.',2:'No villages yet. Found a settlement to begin your kingdom.',3:'No economic records yet. Build markets and collect taxes so your treasury has income to report.',4:'No caravans or routes yet. Build a market, then send a caravan to trade with another kingdom.',5:'No soldiers or commanders yet. Train villagers in a settlement to raise a force.',6:'No research yet. Build a Tower of science and staff it to begin research.',7:'No agents yet. Hire a spy to gather intelligence on your rivals.',8:'No standings yet. Explore the map to meet the other kingdoms.'};

function clickAt(x,y){call('web_present_click',['number','number'],[Math.round(x),Math.round(y)]);}

const labels={PATROL:'Patrol',REWARD:'Reward',DEFENSE:'Defense',DEFEND:'Defend',SOLDIER:'Mobilize',WORKER:'Mobilize worker',SELL:'Sell building',DESTRUCT:'Demolish',DESTROY:'Demolish',REPAIR:'Repair',RETURN:'Return',MENU:'Menu',CANCEL:'Cancel',TRAIN:'Train',RECRUIT:'Recruit',BUILD:'Build',SPY:'Spy operations',HIRE:'Hire',SAIL:'Set sail',PREV:'Previous',NEXT:'Next',YES:'Yes',NO:'No',OK:'Confirm',PROMOTE:'Promote',DEMOTE:'Demote',INVOKE:'Invoke',RESEARCH:'Research',SURREND:'Surrender',STOP:'Stop',DETAIL:'Details'};
function buttonLabel(code){if(/[a-z ]/.test(code)&&code!=='Action')return clean(code);const normalized=clean(code).replace(/[-_][UD]$/,'');if(labels[normalized])return labels[normalized];for(const [key,label] of Object.entries(labels))if(normalized.startsWith(key))return label;return normalized==='Action'?'Select':normalized.replace(/[_-]/g,' ').toLowerCase().replace(/^./,s=>s.toUpperCase())||'Select';}
const panelBase=el('div','',document.body);panelBase.id='siege-panel-base';panelBase.setAttribute('aria-hidden','true');
const report=el('section','',document.body);report.id='siege-report';report.hidden=true;report.setAttribute('aria-label','Kingdom report');
const rh=el('header','',report),rt=el('div','',rh);el('small','THE KINGDOM COUNCIL',rt);const reportTitle=el('h1','Kingdoms',rt);const closeReport=el('button','← Return to world',rh);closeReport.onclick=()=>call('web_hud_action',['number'],[0]);
const hint=el('p','',report);hint.className='report-help';
 const reportStatus=el('p','',report);reportStatus.id='siege-report-status';reportStatus.className='report-status';reportStatus.setAttribute('role','status');reportStatus.setAttribute('aria-live','polite');reportStatus.hidden=true;
const reportScroll=el('div','',report);reportScroll.className='report-scroll';reportScroll.tabIndex=0;reportScroll.setAttribute('aria-label','Scrollable report data');
const reportBody=el('div','',reportScroll);const paging=el('nav','',report);paging.className='report-paging';paging.setAttribute('aria-label','Report record navigation');
const detail=el('aside','',document.body);detail.id='siege-detail';detail.hidden=true;detail.setAttribute('aria-label','Detailed management');
const dh=el('header','',detail);el('h2','Management',dh);const detailBack=el('button','← Overview',dh);detailBack.onclick=()=>document.getElementById('siege-return')?.click();const detailBody=el('div','',detail);
const ending=el('section','',document.body);ending.id='siege-ending';ending.hidden=true;ending.setAttribute('aria-label','Game results');
const eh=el('header','',ending);el('small','THE CHRONICLES OF YOUR REIGN',eh);const endTitle=el('h1','Your legacy',eh);const endBody=el('div','',ending);endBody.className='end-records';const continueEnd=el('button','Continue →',ending);continueEnd.className='primary';continueEnd.onclick=()=>call('web_page_choose',['number'],[1]);
let current=null;const snapshots={};const cache={};let lastSnapshot=null;
 // Kingdoms sub-view state survives simulation ticks and report rerenders.
 const kingdomView={tab:'information',selected:null};
 const newsLog=[];
 let reportLoadTimer=null,reportFailTimer=null;
 function beginReportLoad(mode){
  clearTimeout(reportLoadTimer);clearTimeout(reportFailTimer);
  report.dataset.state='loading';report.setAttribute('aria-busy','true');
  reportStatus.hidden=true;reportStatus.textContent='';
  // Only announce loading if the snapshot is genuinely slow; a synchronous render clears it at once.
  reportLoadTimer=setTimeout(()=>{if(report.dataset.state!=='loading')return;
   reportStatus.textContent='Loading '+(titles[mode]||'record')+' records…';reportStatus.hidden=false;},220);
  reportFailTimer=setTimeout(()=>{if(report.dataset.state!=='loading')return;
   report.dataset.state='error';reportStatus.hidden=false;reportStatus.textContent='';
   el('strong','Could not load '+(titles[mode]||'record')+' records.',reportStatus);
   el('span','The game did not respond. Retry, or return to the map and open the report again.',reportStatus).className='report-status-detail';
   const retry=el('button','Retry',reportStatus);retry.type='button';retry.className='report-retry';
   retry.onclick=()=>{beginReportLoad(mode);call('web_hud_action',['number'],[mode]);};},8000);
 }
 function endReportLoad(state){
  clearTimeout(reportLoadTimer);clearTimeout(reportFailTimer);
  report.removeAttribute('data-loading');report.setAttribute('aria-busy','false');
  report.dataset.state=state;reportStatus.hidden=true;reportStatus.textContent='';
 }
const rowsFrom=SiegeCore.rows;
// The engine always emits column headings, so an empty report is one whose headings carry no
 // records: a zero total, or (for research) no numeric progress anywhere on the page.
 function isEmptyReport(mode,texts){
  if(!texts.length)return true;
  const flat=texts.map(t=>t.text).join(' ');
  if(mode===4)return /Total Caravans:\s*0/i.test(flat);
  if(mode===6)return !/\d/.test(flat);
  if(mode===7)return /Total Spies:\s*0/i.test(flat);
  return false;
 }
 // Column schemas per report page, anchored to the engine draw positions (x in the 576px column).
// 'at' are the engine's header x positions; stacked two-line labels collapse into one row. 'band' widens
 // the rows treated as the header when the engine splits a group label across two blocks (Trade).
const SECTIONS={
 1:[{h:3,first:'Kingdom',endOn:/status with other kingdoms/i,filter:n=>/'s kingdom$/i.test(n)&&!/(\bof\b|\bto\b|\bfrom\b|^your |peace|duration|allow|status with other)/i.test(n),at:[15,216,290,360,420,480],cols:[['Kingdom','id'],['Reputation','num'],['Diplomatic status'],['Can attack'],['Trade treaty'],['Trade amount','num']]}],
 2:[{title:'Villages',h:1,first:'Village',at:[15,165,240,310,370],cols:[['Village','id'],['Villagers','num'],['Peasants','num'],['Loyalty','num'],['Race']]},
    {title:'Structures',h:1,first:'Structure',at:[15,155,232,355,465],cols:[['Structure','id'],['Unit cost','num'],['Structures','num'],['Yearly expense','num'],['Yearly income','num']]}],
 3:[{title:'Income',h:1,first:'Income Item',at:[15,365],cols:[['Income item','id'],['Yearly income','num']]},
    {title:'Expenses',h:1,first:'Expense Item',at:[15,365],cols:[['Expense item','id'],['Yearly expense','num']]}],
 4:[{title:'Caravans',h:1,first:'Caravan',at:[15,105,175,235,295,355],cols:[['Caravan','id'],['Hit points','num'],['Stop 1'],['Stop 2'],['Stop 3'],['Goods carried']]},
    {title:'Trading locations',h:2,band:26,first:'Location',at:[15,31,121,219,311,398,501],cols:[['Location','id'],['Market'],['Factory'],['Mine'],['Any'],['Caravan'],['Ship']],group:'Stock / sales / demand'}],
 5:[{title:'Commanders',h:3,first:'Commander',at:[15,227,300,363,442,516],cols:[['Commander','id'],['Leadership','num'],['Loyalty','num'],['Hit points'],['Commanded soldiers','num'],['Status']]},
    {title:'Units',h:1,first:'Unit Type',at:[15,315],cols:[['Unit type','id'],['Units','num']]}],
 6:[{title:'Research',h:3,first:'Technology',at:[15,175,245,335,475],cols:[['Technology','id'],['Present version','num'],['Researching version','num'],['Progress'],['Tower of science']]},
    {title:'Greater beings',h:1,first:'Greater Being',at:[15,315],cols:[['Greater being','id'],['Hit points','num']]}],
 7:[{h:1,first:'Spy Name',at:[15,170,220,345,385,450],cols:[['Spy name','id'],['Cloak / status'],['Location'],['Skill','num'],['Loyalty','num'],['Action']]}],
 8:[{title:'Standings',h:3,first:'Kingdom',at:[15,209,279,347,421,499],cols:[['Kingdom','id'],['Population'],['Military'],['Economy'],['Reputation'],['Fryhtan battling']]}]
 };
 // Lines the engine prints as summary/annotation rather than table records, per page.
 const NOTE_RX={1:/^(your food|your treasure|your continuous peace|information|diplomacy|diplomatic log)/i,2:/^total /i,
  3:/^(total |yearly balance)/i,4:/^(total |\*idle)/i,5:/^total /i,6:/^acquired scrolls/i,7:/^total /i,
  8:/(score|goal|final|difficulty|playing time)/i};
 const sortState={};
 function boundsOf(at){const b=[];for(let i=0;i<at.length-1;i++)b.push((at[i]+at[i+1])/2);return b}
 function colOf(x,b){let i=0;while(i<b.length&&x>=b[i])i++;return i}
 function sortKeyOf(text,numeric){
  if(!numeric)return String(text).toLowerCase();
  const m=String(text).replace(/,/g,'').match(/-?\d+(\.\d+)?/);
  return m?parseFloat(m[0]):Number.NEGATIVE_INFINITY;
 }
 function buildTable(mode,si,section,rows,emptyText){
  const b=boundsOf(section.at);
  const wrap=el('div','',document.createDocumentFragment());wrap.className='report-table-wrap';
  if(section.title){const h=el('h2',section.title,wrap);h.className='report-table-title';}
  const scroller=el('div','',wrap);scroller.className='report-table-scroll';scroller.tabIndex=0;scroller.setAttribute('role','group');scroller.setAttribute('aria-label',(section.title||'Records')+' table, scrollable');
  const table=el('table','',scroller);table.className='report-table';
  const head=el('thead','',table),hr=el('tr','',head);
  const sorted=sortState[mode+':'+si];
  const headerCells=[];
  const makeTh=(label,ci,extra)=>{
   const th=el('th','',extra||hr);th.scope='col';if(ci===0)th.classList.add('is-identity');if(section.cols[ci]&&section.cols[ci][1]==='num')th.classList.add('is-num');
   const btn=el('button','',th);btn.className='sort-button';btn.type='button';
   el('span',label,btn);const ind=el('span','',btn);ind.className='sort-ind';
   const state=sorted&&sorted.col===ci?sorted.dir:null;
   if(state)ind.textContent=state==='asc'?'▲':'▼';
   th.setAttribute('aria-sort',state==='asc'?'ascending':state==='desc'?'descending':'none');
   btn.setAttribute('aria-label',label+' — sort by this column'+(state?(state==='asc'?', currently ascending':', currently descending'):''));
   btn.onclick=()=>{
    const cur=sortState[mode+':'+si];
    sortState[mode+':'+si]=cur&&cur.col===ci?{col:ci,dir:cur.dir==='asc'?'desc':'asc'}:{col:ci,dir:'asc'};
    if(lastSnapshot)renderReport(lastSnapshot,true);
   };
   headerCells.push(th);return th;
  };
  if(section.group){
   const first=el('th','',hr);first.scope='col';first.rowSpan=2;first.classList.add('is-identity');
   first.textContent=section.cols[0][0];first.setAttribute('aria-sort','none');
   const group=el('th','',hr);group.scope='colgroup';group.colSpan=section.cols.length-1;group.textContent=section.group;group.className='is-group';
   const hr2=el('tr','',head);
   for(let ci=1;ci<section.cols.length;ci++)makeTh(section.cols[ci][0],ci,hr2);
   const btn=el('button','',first);btn.className='sort-button';btn.type='button';el('span',section.cols[0][0],btn);
   const ind=el('span','',btn);ind.className='sort-ind';first.replaceChildren(btn);
   first.setAttribute('aria-sort','none');headerCells.unshift(first);
  }else{
   section.cols.forEach((c,ci)=>makeTh(c[0],ci));
  }
  const body=el('tbody','',table);
  const records=rows.map(row=>{
   const cells=[];const used=new Set();
   for(const item of row.items){
    const ci=colOf(item.x,b);
    if(used.has(ci))continue;used.add(ci);
    cells[ci]=item;
   }
   return {cells,row};
  });
  const sort=sorted;
  if(sort){
   records.sort((a,b2)=>{
    const av=a.cells[sort.col]?.text??'',bv=b2.cells[sort.col]?.text??'';
    const numeric=section.cols[sort.col][1]==='num';
    const ka=sortKeyOf(av,numeric),kb=sortKeyOf(bv,numeric);
    const cmp=typeof ka==='number'&&typeof kb==='number'?ka-kb:String(ka).localeCompare(String(kb));
    return sort.dir==='asc'?cmp:-cmp;
   });
  }
  if(!records.length){const tr=el('tr','',body);tr.className='is-empty-row';const td=el('td','',tr);td.colSpan=section.cols.length;td.className='is-empty';
   td.textContent=emptyText||'No records yet.';tr.append(td);}
  for(const rec of records){
   const tr=el('tr','',body);tr.className='record-row';
   const isSelf=mode===1&&!rec.cells[2]&&!/^your /i.test(rec.cells[0]?.text||'');
   section.cols.forEach((c,ci)=>{
    const td=el('td','',tr);if(c[1]==='num')td.classList.add('is-num');if(ci===0)td.classList.add('is-identity');
    const item=rec.cells[ci];
    if(!item){td.classList.add('is-empty');el('span','—',td).setAttribute('aria-label','Not available');return;}
    const btn=el('button','',td);btn.className='record-cell';btn.type='button';btn.dataset.recordKey=item.x+':'+item.y;
    btn.textContent=item.text;btn.title=item.text;btn.onclick=()=>{clickAt(item.x+3,item.y+2);};
    btn.ondblclick=()=>{setTimeout(()=>clickAt(item.x+3,item.y+2),90);if([2,4,5,6].includes(mode))setTimeout(()=>call('web_hud_action',['number'],[0]),200);};
    if(mode===1&&/^(yes|no)$/i.test(item.text))btn.setAttribute('aria-label',c[0]+': '+item.text);
   });
   if(isSelf){const badge=el('span','You',tr.querySelector('td'));badge.className='you-badge';badge.title='Your kingdom';}
  }
  return wrap;
 }
 function kingdomRecords(){
  const table=reportBody.querySelector('table.report-table');
  if(!table)return [];
  const cols=['Reputation','Diplomatic status','Can attack','Trade treaty','Trade amount'];
  return [...table.querySelectorAll('tbody tr.record-row')].map(tr=>{
   const tds=[...tr.querySelectorAll('td')];
   const name=(tds[0]?.querySelector('.record-cell')?.textContent||tds[0]?.textContent||'').trim();
   const pair={};cols.forEach((c,i)=>{const td=tds[i+1];pair[c]=td&&!td.classList.contains('is-empty')?(td.textContent||'').trim():null;});
   return {name,pair,self:!!tds[0]?.querySelector('.you-badge')};
  }).filter(r=>r.name);
 }
 function kingdomTabPanel(panel,records){
  panel.replaceChildren();
  const sel=kingdomView.selected?records.find(r=>r.name===kingdomView.selected):null;
  const def=(list)=>{const dl=el('dl','',panel);dl.className='kingdom-facts';
   for(const [k,v] of list){const d=el('div','',dl);el('dt',k,d);el('dd',v==null||v===''?'Not recorded':v,d);}return dl;};
  if(kingdomView.tab==='information'){
   if(!sel){const p=el('p','Select a kingdom row above to see its summary.',panel);p.className='kingdom-hint';return;}
   el('h3',sel.name+(sel.self?' · your kingdom':''),panel).className='kingdom-panel-title';
   def([['Reputation',sel.pair['Reputation']],['Diplomatic status',sel.pair['Diplomatic status']],['Can attack',sel.pair['Can attack']],['Trade treaty',sel.pair['Trade treaty']],['Trade amount',sel.pair['Trade amount']]]);
   return;
  }
  if(kingdomView.tab==='diplomacy'){
   if(!sel){const p=el('p','Select a kingdom above to review diplomacy.',panel);p.className='kingdom-hint';return;}
   if(sel.self){const p=el('p','This is your own kingdom. Select a foreign kingdom to review diplomacy with it.',panel);p.className='kingdom-hint';return;}
   el('h3','Diplomacy with '+sel.name,panel).className='kingdom-panel-title';
   def([['Current status',sel.pair['Diplomatic status']],['Reputation',sel.pair['Reputation']],['Attack permission',sel.pair['Can attack']],['Trade treaty',sel.pair['Trade treaty']],['Trade amount',sel.pair['Trade amount']]]);
   const note=el('p','',panel);note.className='kingdom-hint';
   note.textContent='No diplomatic actions are available from this report. Treaty and war decisions are made through the game\u2019s own diplomacy screens; this page summarises the current relationship.';
   return;
  }
  const events=newsLog.filter(line=>!sel||line.includes(sel.name));
  if(!events.length){const p=el('p','No diplomatic events have occurred yet.',panel);p.className='empty-state';return;}
  const list=el('ol','',panel);list.className='kingdom-events';
  events.slice().reverse().forEach(line=>el('li',line,list));
 }
 function buildKingdomTabs(){
  const root=el('section','',document.createDocumentFragment());root.className='kingdom-tabs';
  const list=el('nav','',root);list.className='kingdom-tablist';list.setAttribute('role','tablist');list.setAttribute('aria-label','Kingdoms views');
  const panel=el('div','',root);panel.className='kingdom-tabpanel';panel.id='kingdom-panel';panel.setAttribute('role','tabpanel');panel.tabIndex=0;
  const defs=[['information','Information'],['diplomacy','Diplomacy'],['log','Diplomatic Log']];
  const buttons=defs.map(([id,label])=>{
   const b=el('button',label,list);b.type='button';b.className='kingdom-tab';b.id='kingdom-tab-'+id;
   b.setAttribute('role','tab');b.setAttribute('aria-controls','kingdom-panel');
   b.onclick=()=>{kingdomView.tab=id;paint();};
   b.onkeydown=e=>{
    const i=defs.findIndex(d=>d[0]===id);let n=null;
    if(e.key==='ArrowRight')n=(i+1)%defs.length;else if(e.key==='ArrowLeft')n=(i+defs.length-1)%defs.length;
    else if(e.key==='Home')n=0;else if(e.key==='End')n=defs.length-1;
    if(n===null)return;e.preventDefault();kingdomView.tab=defs[n][0];paint();buttons[n].focus();
   };
   return b;
  });
  function paint(){
   buttons.forEach((b,i)=>{const on=defs[i][0]===kingdomView.tab;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;b.classList.toggle('is-active',on);});
   panel.setAttribute('aria-labelledby','kingdom-tab-'+kingdomView.tab);
   kingdomTabPanel(panel,kingdomRecords());
  }
  paint();
  return {root,paint};
 }
 function decorateKingdomRows(ui){
  const table=reportBody.querySelector('table.report-table');
  if(!table)return;
  const trs=[...table.querySelectorAll('tbody tr.record-row')];
  const mark=()=>trs.forEach(tr=>{const on=tr.dataset.kingdom===kingdomView.selected;tr.classList.toggle('is-selected',on);tr.setAttribute('aria-current',on?'true':'false');});
  trs.forEach(tr=>{
   const rec=kingdomRecords().find(r=>tr.textContent.startsWith(r.name));
   if(!rec)return;
   tr.dataset.kingdom=rec.name;
   tr.addEventListener('click',()=>{kingdomView.selected=rec.name;mark();ui.paint();});
  });
  mark();
 }
 function renderNotes(row,frag){
  const line=el('p','',frag);line.className='report-note';
  const items=row.items.slice().sort((a,b)=>a.x-b.x);
  if(items.length===2){el('span',items[0].text,line).className='note-label';
   const v=el('span','',line);v.className='note-value';v.textContent=items[1].text;}
  else items.forEach((item,i)=>{const s=el('span',item.text,line);s.className=i===0&&items.length>2?'note-label':'note-value';});
  return line;
 }
 function renderReport(snapshot,force){
  lastSnapshot=snapshot;
  reportTitle.textContent=titles[snapshot.mode]||'Kingdom records';report.dataset.mode=snapshot.mode;hint.textContent=HELP[snapshot.mode]||DEFAULT_HELP;
  const texts=snapshot.texts.filter(t=>t.x<576&&t.y>=54&&t.y<600);
  const signature=JSON.stringify([snapshot.mode,texts,snapshot.buttons,snapshot.lists,sortState]);
  endReportLoad(isEmptyReport(snapshot.mode,texts)?'empty':'ready');
  if(!force&&cache.report===signature)return;cache.report=signature;
  const previousFocus=document.activeElement?.dataset?.recordKey;
  const frag=document.createDocumentFragment();
  const rows=rowsFrom(texts);
  const spec=SECTIONS[snapshot.mode];
  const tabLabels=['Information','Diplomacy','Diplomatic Log'];
  const tabRow=rows.find(r=>r.items.filter(i=>tabLabels.includes(i.text)).length>=2);
  if(tabRow&&snapshot.mode!==1){const tabs=el('nav','',frag);tabs.className='report-tabs';tabs.setAttribute('aria-label','Kingdom Council sections');
   tabRow.items.filter(i=>tabLabels.includes(i.text)).forEach(item=>{const tab=el('button',item.text,tabs);tab.className='report-tab';tab.onclick=()=>clickAt(item.x+3,item.y+2);});}
  const starts=[];
  if(spec)for(const [si,section] of spec.entries()){
   const match=rows.findIndex(r=>r.items.some(i=>i.text.trim().toLowerCase()===section.first.toLowerCase()));
   if(match>=0)starts.push({si,section,y:rows[match].y});
  }
  const inBand=(r)=>starts.some(s=>Math.abs(r.y-s.y)<=(s.section.band||20));
  let active=null,activeRows=[];
  const rendered=new Set();
 const pendingNotes=[];
 const flush=()=>{
  if(active&&activeRows.length){frag.append(buildTable(snapshot.mode,active.si,active.section,activeRows));rendered.add(active.si);activeRows=[];}
  while(pendingNotes.length)renderNotes(pendingNotes.shift(),frag);
 };
  for(const row of rows){
   if(tabRow&&row===tabRow)continue;
   if(inBand(row)){flush();active=starts.find(s=>Math.abs(row.y-s.y)<=(s.section.band||20));continue;}
   const firstText=(row.items.slice().sort((a,b)=>a.x-b.x)[0]?.text||'');
   const note=NOTE_RX[snapshot.mode]?.test(firstText)||row.items.length<2;
   if(note){if(active&&active.section.endOn&&active.section.endOn.test(firstText)){flush();active=null;}pendingNotes.push(row);continue;}
   if(!active||!spec){pendingNotes.push(row);continue;}
   if(active.section.filter&&!active.section.filter(firstText)){pendingNotes.push(row);continue;}
   activeRows.push(row);
  }
  flush();
  if(spec)for(const s of starts)if(!rendered.has(s.si)){
   const text=rendered.size===0?EMPTY[snapshot.mode]:null;
   frag.append(buildTable(snapshot.mode,s.si,s.section,[],text));
   rendered.add(s.si);
  }
  let kingdomUi=null;
  if(snapshot.mode===1){
   kingdomUi=buildKingdomTabs();
   frag.append(kingdomUi.root);
  }
  if(isEmptyReport(snapshot.mode,texts)&&!spec){const empty=el('p',EMPTY[snapshot.mode]||'No records to display for this kingdom.',frag);empty.className='empty-state';}
  const toolbar=el('div','',frag);toolbar.className='native-actions';
  for(const b of snapshot.buttons.filter(b=>b.x1<576&&b.y1>=54)){
   const label=buttonLabel(b.text);
   const button=el('button',label,toolbar);button.disabled=!b.enabled;button.setAttribute('aria-pressed',String(!!b.pushed));button.onclick=()=>clickAt((b.x1+b.x2)/2,(b.y1+b.y2)/2);
  }
  reportBody.replaceChildren(frag);paging.replaceChildren();
  if(kingdomUi){decorateKingdomRows(kingdomUi);kingdomUi.paint();}
  snapshot.lists.filter(l=>l.x1<576&&l.total>l.visible).forEach((l,index)=>{
   const box=el('div','',paging);el('span',(`List ${index+1} · ${l.selected} of ${l.total}`),box);
   for(const [label,y] of [['Previous records',l.y1+7],['Next records',l.y2-7]]){const b=el('button',label,box);b.onclick=()=>clickAt(l.x2-7,y);}
  });
  if(previousFocus){const m=[...reportBody.querySelectorAll('[data-record-key]')].find(n=>n.dataset.recordKey===previousFocus);m?.focus({preventScroll:true});}
 }
 
 function renderDetail(snapshot){
 const signature=JSON.stringify(snapshot);if(cache.detail===signature)return;cache.detail=signature;detailBody.replaceChildren();
 const texts=snapshot.texts.filter(t=>t.x>=576&&t.y>=258);for(const row of rowsFrom(texts)){const line=el('div','',detailBody);line.className='detail-record';for(const t of row.items){const cell=el('button',t.text,line);cell.className='detail-cell';cell.onclick=()=>clickAt(t.x+2,t.y+2);}}
 const actions=el('nav','',detailBody);actions.className='native-actions';
 for(const b of snapshot.buttons.filter(b=>b.x1>=576&&b.y1>=258)){const label=buttonLabel(b.text);const node=el('button',label,actions);node.disabled=!b.enabled;node.setAttribute('aria-pressed',String(!!b.pushed));node.onclick=()=>clickAt((b.x1+b.x2)/2,(b.y1+b.y2)/2);}
 if(!texts.length&&!actions.children.length)el('p','Select an item on the map to view its details.',detailBody).className='empty-state';
}
const news=el('aside','',document.body);news.id='siege-news';news.hidden=true;news.setAttribute('aria-label','Kingdom news');
const tooltip=el('aside','',document.body);tooltip.id='siege-tooltip';tooltip.hidden=true;tooltip.setAttribute('role','tooltip');let tooltipTimer;
window.siegePresentation={
 tooltip(title,description){tooltip.replaceChildren();el('strong',clean(title),tooltip);el('span',clean(description),tooltip);tooltip.hidden=false;clearTimeout(tooltipTimer);tooltipTimer=setTimeout(()=>tooltip.hidden=true,1800);},
 begin(kind,mode,reset=1){if(kind==='report')beginReportLoad(mode);current=!reset&&snapshots[kind]?{...snapshots[kind],texts:snapshots[kind].texts.map(t=>({...t})),buttons:snapshots[kind].buttons.map(b=>({...b})),lists:[]}:{kind,mode,texts:[],buttons:[],lists:[]};},
 text(x,y,h,text){if(!current)return;const value=clean(text);if(!value)return;const existing=current.texts.find(t=>t.x===x&&t.y===y);if(existing){existing.text=value;existing.h=h;}else current.texts.push({x,y,h,text:value});},
 button(x1,y1,x2,y2,text,enabled,pushed){if(!current)return;const b={x1,y1,x2,y2,text:clean(text),enabled,pushed};const idx=current.buttons.findIndex(v=>v.x1===x1&&v.y1===y1);if(idx<0)current.buttons.push(b);else current.buttons[idx]=b;},
 list(x1,y1,x2,y2,selected,total,visible){if(current)current.lists.push({x1,y1,x2,y2,selected,total,visible});},
 end(){if(!current)return;const snapshot=current;snapshots[snapshot.kind]=snapshot;current=null;if(snapshot.kind==='report')renderReport(snapshot);else if(snapshot.kind==='detail')renderDetail(snapshot);else if(snapshot.kind==='news'){const sig=JSON.stringify(snapshot.texts);if(cache.news!==sig){cache.news=sig;news.replaceChildren();for(const row of rowsFrom(snapshot.texts)){const line=row.items.map(t=>t.text).join(' ');const b=el('button',line,news);b.onclick=()=>clickAt(10,row.y+2);if(line&&!newsLog.includes(line))newsLog.push(line);}}news.hidden=!snapshot.texts.length;}else if(snapshot.kind==='ending'){ending.hidden=false;endTitle.textContent=({1:'Victory is yours',2:'A kingdom falls',3:'Your reign in review',4:'Hall of fame'})[snapshot.mode]||'Your legacy';endBody.replaceChildren();if(!snapshot.texts.length)el('p',snapshot.mode===1?'Your kingdom has achieved its victory goal. Review the story and final score of your reign.':'Your reign has ended. Review the chronicle, final statistics, and ranking of your kingdom.',endBody);for(const row of rowsFrom(snapshot.texts)){const line=el('div','',endBody);line.className='detail-record';row.items.forEach(t=>el('span',t.text,line));}continueEnd.focus();}},
 closeEnding(){ending.hidden=true;},
 inspect(){return {reportMode:Number(report.dataset.mode||0),reportVisible:!report.hidden,detailVisible:!detail.hidden};}
};
// Accessible, focus-contained engine confirmation dialogs.
const dialog=el('dialog','',document.body);dialog.id='siege-dialog';dialog.setAttribute('aria-labelledby','siege-dialog-title');
el('small','THE GREAT SIEGE',dialog);const dialogTitle=el('h2','Kingdom decision',dialog);dialogTitle.id='siege-dialog-title';const dialogText=el('p','',dialog);const dialogActions=el('nav','',dialog);let focusBefore;
window.siegeDialog={progress(message){dialogTitle.textContent='Preparing your kingdom';dialogText.textContent=clean(message);dialogActions.replaceChildren();dialog.dataset.progress='true';if(!dialog.open)dialog.showModal();},closeProgress(){if(dialog.dataset.progress==='true'){dialog.close();delete dialog.dataset.progress;}},show(message,yes='Confirm',no='Cancel'){delete dialog.dataset.progress;dialogTitle.textContent='Kingdom decision';focusBefore=document.activeElement;dialogText.textContent=clean(message);dialogActions.replaceChildren();if(no){const cancel=el('button',no,dialogActions);cancel.onclick=()=>call('web_page_choose',['number'],[0]);}const accept=el('button',yes,dialogActions);accept.className='primary';accept.onclick=()=>call('web_page_choose',['number'],[1]);if(!dialog.open)dialog.showModal();(dialogActions.firstElementChild||accept).focus();},close(){dialog.close();focusBefore?.focus?.();}};
dialog.addEventListener('cancel',e=>{e.preventDefault();call('web_page_choose',['number'],[0]);});
// Live pause state is read from the simulation, not inferred from the button label.
const activity=el('button','Activity',document.querySelector('#siege-hud .right'));activity.id='siege-activity';activity.onclick=()=>call('web_hud_action',['number'],[13]);
const full=el('button','⛶',document.querySelector('#siege-hud .right'));full.id='siege-fullscreen';full.setAttribute('aria-label','Enter fullscreen');full.title='Enter fullscreen';full.disabled=!document.fullscreenEnabled;
full.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(error){window.siegeHUD.notice('Fullscreen unavailable','This browser does not allow fullscreen. You can continue playing in this window.');}};
document.addEventListener('fullscreenchange',()=>{full.setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');full.title=document.fullscreenElement?'Exit fullscreen':'Enter fullscreen';});
const pause=el('button','Pause',document.querySelector('#siege-hud .right'));pause.id='siege-pause';pause.onclick=()=>call('web_toggle_pause');
const mobile=el('nav','',document.body);mobile.id='siege-mobile-tools';mobile.setAttribute('aria-label','Map controls');
for(const [label,nx,ny] of [['←',-.6,0],['↑',0,-.6],['↓',0,.6],['→',.6,0]]){const b=el('button',label,mobile);b.setAttribute('aria-label',({'←':'Scroll map left','↑':'Scroll map up','↓':'Scroll map down','→':'Scroll map right'})[label]);b.onclick=()=>{call('web_scroll_gesture',['number','number'],[nx,ny]);setTimeout(()=>call('web_scroll_end'),160);};}
const minimapToggle=el('button','Map',mobile);minimapToggle.setAttribute('aria-expanded','false');
const minimap=el('canvas','',document.body);minimap.id='siege-minimap';minimap.width=220;minimap.height=202;minimap.hidden=true;minimap.setAttribute('aria-label','World minimap');minimap.tabIndex=0;
minimapToggle.onclick=()=>{minimap.hidden=!minimap.hidden;minimapToggle.setAttribute('aria-expanded',String(!minimap.hidden));};
minimap.onclick=e=>{const rect=minimap.getBoundingClientRect();clickAt(578+(e.clientX-rect.left)*220/rect.width,55+(e.clientY-rect.top)*202/rect.height);};
const guide=el('aside','',document.body);guide.id='siege-map-guide';el('small','YOUR NEXT COMMAND',guide);el('h2','A kingdom awaits your orders',guide);el('p','Select a village, fort, or unit to manage it. Use the council above to review your kingdom.',guide);el('p','On touch screens: tap to select, hold to issue an order, and drag with two fingers to explore.',guide);
const panelToggle=el('button','Selection',mobile);panelToggle.onclick=()=>{document.body.classList.toggle('selection-expanded');panelToggle.setAttribute('aria-expanded',String(document.body.classList.contains('selection-expanded')));};
setInterval(()=>{
 const playing=document.body.classList.contains('siege-playing'),reporting=playing&&document.body.classList.contains('siege-reporting');
 report.hidden=!reporting;detail.hidden=!playing||reporting||document.getElementById('siege-return').hidden;mobile.hidden=!playing||reporting;news.style.display=playing&&!reporting?'':'none';
 if(!minimap.hidden&&playing){const ctx=minimap.getContext('2d');try{ctx.drawImage(Module.canvas,578*Module.canvas.width/800,55*Module.canvas.height/600,220*Module.canvas.width/800,202*Module.canvas.height/600,0,0,220,202);}catch(error){console.warn('Minimap awaiting frame',error);}}
 if(!playing){minimap.hidden=true;document.body.classList.remove('selection-expanded');return;}
 const speed=Module.ccall('web_game_speed','number',[],[]);pause.textContent=speed?'Pause':'Resume';pause.setAttribute('aria-pressed',String(!speed));pause.title=speed?'Pause simulation':'Resume simulation';
 const selection=document.querySelector('#siege-selection');guide.hidden=!playing||reporting||!selection?.hidden||!document.getElementById('siege-training')?.hidden;if(selection&&!selection.hidden&&selection.scrollHeight>selection.clientHeight)selection.classList.add('scrollable');
},150);
// Recoverable errors stay visible with a clear action instead of silently failing.
window.addEventListener('unhandledrejection',e=>{console.error(e.reason);if(window.siegeHUD)window.siegeHUD.notice('Unable to load game content','Check the connection and reload to try again.');});
})();
