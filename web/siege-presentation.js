/* The Great Siege: accessible presentation of live engine reports and dialogs.
   Coordinates identify engine controls; all simulation and command validation stay in C++. */
(()=>{
'use strict';
const el=(tag,text,parent)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(parent)parent.append(n);return n;};
const clean=SiegeCore.clean;
const call=(name,types=[],args=[])=>Module.ccall(name,null,types,args);
const titles=['World','Kingdoms','Villages','Economy','Trade','Military','Research','Espionage','Ranking','Kingdom activity'];

function clickAt(x,y){call('web_present_click',['number','number'],[Math.round(x),Math.round(y)]);}

const labels={PATROL:'Patrol',REWARD:'Reward',DEFENSE:'Defense',DEFEND:'Defend',SOLDIER:'Mobilize',WORKER:'Mobilize worker',SELL:'Sell building',DESTRUCT:'Demolish',DESTROY:'Demolish',REPAIR:'Repair',RETURN:'Return',MENU:'Menu',CANCEL:'Cancel',TRAIN:'Train',RECRUIT:'Recruit',BUILD:'Build',SPY:'Spy operations',HIRE:'Hire',SAIL:'Set sail',PREV:'Previous',NEXT:'Next',YES:'Yes',NO:'No',OK:'Confirm',PROMOTE:'Promote',DEMOTE:'Demote',INVOKE:'Invoke',RESEARCH:'Research',SURREND:'Surrender',STOP:'Stop',DETAIL:'Details'};
function buttonLabel(code){if(/[a-z ]/.test(code)&&code!=='Action')return clean(code);const normalized=clean(code).replace(/[-_][UD]$/,'');if(labels[normalized])return labels[normalized];for(const [key,label] of Object.entries(labels))if(normalized.startsWith(key))return label;return normalized==='Action'?'Select':normalized.replace(/[_-]/g,' ').toLowerCase().replace(/^./,s=>s.toUpperCase())||'Select';}
const panelBase=el('div','',document.body);panelBase.id='siege-panel-base';panelBase.setAttribute('aria-hidden','true');
const report=el('section','',document.body);report.id='siege-report';report.hidden=true;report.setAttribute('aria-label','Kingdom report');
const rh=el('header','',report),rt=el('div','',rh);el('small','THE KINGDOM COUNCIL',rt);const reportTitle=el('h1','Kingdoms',rt);const closeReport=el('button','← Return to world',rh);closeReport.onclick=()=>call('web_hud_action',['number'],[0]);
const hint=el('p','Live kingdom records. Select a row to inspect it; double-click a location to travel there.',report);hint.className='report-help';
const reportScroll=el('div','',report);reportScroll.className='report-scroll';reportScroll.tabIndex=0;reportScroll.setAttribute('aria-label','Scrollable report data');
const reportBody=el('div','',reportScroll);const paging=el('nav','',report);paging.className='report-paging';paging.setAttribute('aria-label','Report record navigation');
const detail=el('aside','',document.body);detail.id='siege-detail';detail.hidden=true;detail.setAttribute('aria-label','Detailed management');
const dh=el('header','',detail);el('h2','Management',dh);const detailBack=el('button','← Overview',dh);detailBack.onclick=()=>document.getElementById('siege-return')?.click();const detailBody=el('div','',detail);
const ending=el('section','',document.body);ending.id='siege-ending';ending.hidden=true;ending.setAttribute('aria-label','Game results');
const eh=el('header','',ending);el('small','THE CHRONICLES OF YOUR REIGN',eh);const endTitle=el('h1','Your legacy',eh);const endBody=el('div','',ending);endBody.className='end-records';const continueEnd=el('button','Continue →',ending);continueEnd.className='primary';continueEnd.onclick=()=>call('web_page_choose',['number'],[1]);
let current=null;const snapshots={};const cache={};
const rowsFrom=SiegeCore.rows;
function renderReport(snapshot){
 reportTitle.textContent=titles[snapshot.mode]||'Kingdom records';report.dataset.mode=snapshot.mode;
 const texts=snapshot.texts.filter(t=>t.x<576&&t.y>=54&&t.y<600);
 const signature=JSON.stringify([snapshot.mode,texts,snapshot.buttons,snapshot.lists]);if(cache.report===signature)return;cache.report=signature;
 const previousFocus=document.activeElement?.dataset?.recordKey;
 const frag=document.createDocumentFragment();let previousY=0;
 const kingdomColors=['#c95b51','#d49a43','#5aa6a0','#7e82d8','#b56db4','#76a85a','#d0c15b','#6c9bd2'];
 for(const [rowIndex,row] of rowsFrom(texts).entries()){
  const line=el('div','',frag);line.className='record-row';if(row.y-previousY>25)line.classList.add('section-start');previousY=row.y;
  const cells=row.items.sort((a,b)=>a.x-b.x);
  cells.forEach((t,i)=>{const b=el('button',t.text,line);b.className='record-cell';if(snapshot.mode===1&&i===0){b.classList.add('kingdom-name');b.style.setProperty('--kingdom-color',kingdomColors[rowIndex%kingdomColors.length]);}b.dataset.recordKey=t.x+':'+t.y;b.style.left=(Math.max(0,t.x-6)/566*100)+'%';const next=cells[i+1]?.x||568;b.style.width=(Math.max(28,next-t.x-4)/566*100)+'%';b.title=t.text;b.onclick=()=>clickAt(t.x+3,t.y+2);b.ondblclick=()=>{setTimeout(()=>clickAt(t.x+3,t.y+2),90);if([2,4,5,6,7].includes(snapshot.mode))setTimeout(()=>call('web_hud_action',['number'],[0]),200);};});
 }
 if(!texts.length)el('p','No records to display for this kingdom.',frag).className='empty-state';
 const toolbar=el('div','',frag);toolbar.className='native-actions';
 for(const b of snapshot.buttons.filter(b=>b.x1<576&&b.y1>=54)){
  const label=buttonLabel(b.text);
  const button=el('button',label,toolbar);button.disabled=!b.enabled;button.setAttribute('aria-pressed',String(!!b.pushed));button.onclick=()=>clickAt((b.x1+b.x2)/2,(b.y1+b.y2)/2);
 }
 reportBody.replaceChildren(frag);paging.replaceChildren();
 snapshot.lists.filter(l=>l.x1<576&&l.total>l.visible).forEach((l,index)=>{
  const box=el('div','',paging);el('span',`List ${index+1} · ${l.selected} of ${l.total}`,box);
  for(const [label,y] of [['Previous records',l.y1+7],['Next records',l.y2-7]]){const b=el('button',label,box);b.onclick=()=>clickAt(l.x2-7,y);}
 });
 if(previousFocus){const match=[...reportBody.querySelectorAll('[data-record-key]')].find(n=>n.dataset.recordKey===previousFocus);match?.focus({preventScroll:true});}
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
 begin(kind,mode,reset=1){current=!reset&&snapshots[kind]?{...snapshots[kind],texts:snapshots[kind].texts.map(t=>({...t})),buttons:snapshots[kind].buttons.map(b=>({...b})),lists:[]}:{kind,mode,texts:[],buttons:[],lists:[]};},
 text(x,y,h,text){if(!current)return;const value=clean(text);if(!value)return;const existing=current.texts.find(t=>t.x===x&&t.y===y);if(existing){existing.text=value;existing.h=h;}else current.texts.push({x,y,h,text:value});},
 button(x1,y1,x2,y2,text,enabled,pushed){if(!current)return;const b={x1,y1,x2,y2,text:clean(text),enabled,pushed};const idx=current.buttons.findIndex(v=>v.x1===x1&&v.y1===y1);if(idx<0)current.buttons.push(b);else current.buttons[idx]=b;},
 list(x1,y1,x2,y2,selected,total,visible){if(current)current.lists.push({x1,y1,x2,y2,selected,total,visible});},
 end(){if(!current)return;const snapshot=current;snapshots[snapshot.kind]=snapshot;current=null;if(snapshot.kind==='report')renderReport(snapshot);else if(snapshot.kind==='detail')renderDetail(snapshot);else if(snapshot.kind==='news'){const sig=JSON.stringify(snapshot.texts);if(cache.news!==sig){cache.news=sig;news.replaceChildren();for(const row of rowsFrom(snapshot.texts)){const b=el('button',row.items.map(t=>t.text).join(' '),news);b.onclick=()=>clickAt(10,row.y+2);}}news.hidden=!snapshot.texts.length;}else if(snapshot.kind==='ending'){ending.hidden=false;endTitle.textContent=({1:'Victory is yours',2:'A kingdom falls',3:'Your reign in review',4:'Hall of fame'})[snapshot.mode]||'Your legacy';endBody.replaceChildren();if(!snapshot.texts.length)el('p',snapshot.mode===1?'Your kingdom has achieved its victory goal. Review the story and final score of your reign.':'Your reign has ended. Review the chronicle, final statistics, and ranking of your kingdom.',endBody);for(const row of rowsFrom(snapshot.texts)){const line=el('div','',endBody);line.className='detail-record';row.items.forEach(t=>el('span',t.text,line));}continueEnd.focus();}},
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
