/* Pure presentation helpers, shared by the live interface and regression tests. */
(function(root){
 const api={
  clean(value){return String(value??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x80-\x8f]/g,'').trim().replace(/Mughul/g,'Marathas');},
  rows(texts){const rows=[];for(const t of [...texts].sort((a,b)=>a.y-b.y||a.x-b.x)){let row=rows.find(r=>Math.abs(r.y-t.y)<4);if(!row)rows.push(row={y:t.y,items:[]});if(!row.items.some(i=>i.x===t.x&&i.text===t.text))row.items.push(t);}return rows;},
  validSpeed(value){return Number.isInteger(Number(value))&&String(value).trim()!==''&&((Number(value)>=0&&Number(value)<=30)||Number(value)===99);},
  point(px,py,rect){return {lx:Math.max(0,Math.min(799,(px-rect.left)*800/rect.width)),ly:Math.max(0,Math.min(599,(py-rect.top)*600/rect.height))};}
 };
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SiegeCore=api;
})(typeof window==='undefined'?globalThis:window);
