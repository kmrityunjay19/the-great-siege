/* Pure presentation helpers, shared by the live interface and regression tests. */
(function(root){
 const api={
  clean(value){return String(value??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x80-\x8f]/g,'').trim().replace(/Mughul/g,'Marathas');},
  rows(texts){const rows=[];for(const t of [...texts].sort((a,b)=>a.y-b.y||a.x-b.x)){let row=rows.find(r=>Math.abs(r.y-t.y)<4);if(!row)rows.push(row={y:t.y,items:[]});if(!row.items.some(i=>i.x===t.x&&i.text===t.text))row.items.push(t);}return rows;},
  validSpeed(value){return Number.isInteger(Number(value))&&String(value).trim()!==''&&((Number(value)>=0&&Number(value)<=30)||Number(value)===99);},
  mobilizeBuilder(state){if(!state||!state.builderRecno)return {ok:false,state};return {ok:true,state:{...state,builderRecno:0,occupancy:Math.max(0,(state.occupancy||0)-1),builderStatus:'active'}};},
  garrisonBuilder(state,builderRecno){if(!state||!state.underConstruction||!builderRecno||state.builderRecno)return {ok:false,state};return {ok:true,state:{...state,builderRecno,occupancy:(state.occupancy||0)+1,builderStatus:'garrisoned'}};},
  transitionWorker(unit,action,target){if(!unit||typeof unit!=='object')return {ok:false,unit,reason:'Invalid unit'};const current=unit.state||'idle';const valid=['idle','moving','working','garrisoned'];if(!valid.includes(current))return {ok:false,unit,reason:'Invalid current state'};let next=current,targetId=unit.targetId||null;switch(action){case 'stop':next='idle';targetId=null;break;case 'move':if(!target)return {ok:false,unit,reason:'Missing move target'};next='moving';targetId=target;break;case 'enter_structure':if(!target)return {ok:false,unit,reason:'Missing structure target'};next='garrisoned';targetId=target;break;case 'start_work':if(!['garrisoned','moving','idle'].includes(current))return {ok:false,unit,reason:'Cannot start work from state: '+current};next='working';targetId=target||unit.targetId;break;case 'mobilize':if(!['garrisoned','working'].includes(current))return {ok:false,unit,reason:'Unit is not garrisoned or working'};next='idle';targetId=null;break;default:return {ok:false,unit,reason:'Unknown action: '+action};}return {ok:true,unit:{...unit,state:next,targetId}};},
  mapHotkey(key,isInputActive=false){if(isInputActive)return null;const f=String(key).match(/^F([1-8])$/);if(f)return {type:'report',id:Number(f[1])};if(key>='1'&&key<='8')return {type:'report',id:Number(key)};if(key===' '||key==='Spacebar')return {type:'pause'};if(key==='Escape'||key==='Esc')return {type:'escape'};return null;},
  trainingRemaining(queued,active){return Math.max(0,Number(queued)||0)+(active?1:0);},
  point(px,py,rect){return {lx:Math.max(0,Math.min(799,(px-rect.left)*800/rect.width)),ly:Math.max(0,Math.min(599,(py-rect.top)*600/rect.height))};}
 };
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SiegeCore=api;
})(typeof window==='undefined'?globalThis:window);
