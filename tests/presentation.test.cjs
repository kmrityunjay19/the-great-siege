const {test}=require('node:test');const assert=require('node:assert/strict');const core=require('../web/siege-core.js');
test('engine color/control codes are removed without losing numeric values',()=>{assert.equal(core.clean('\x80Council\x01 $1,200 (-60)'),'Council $1,200 (-60)');});
test('row grouping tolerates baseline shifts and preserves column order',()=>{const rows=core.rows([{x:300,y:21,text:'42'},{x:10,y:20,text:'Population'},{x:10,y:50,text:'Treasury'}]);assert.equal(rows.length,2);assert.deepEqual(rows[0].items.map(v=>v.text),['Population','42']);});
test('duplicate engine redraws do not create duplicate records',()=>{const r={x:10,y:20,text:'Fort'};assert.equal(core.rows([r,{...r}])[0].items.length,1);});
test('different values at the same baseline remain separate columns',()=>{assert.equal(core.rows([{x:10,y:20,text:'0'},{x:300,y:20,text:'0'}])[0].items.length,2);});
test('row grouping does not reorder source snapshot',()=>{const values=[{x:2,y:40},{x:1,y:10}];core.rows(values);assert.equal(values[0].y,40);});
test('speed validator accepts explicit pause and full speed',()=>{for(const value of ['0','1','30','99'])assert.ok(core.validSpeed(value));for(const value of ['',' ','31','98','100','-1','2.5','NaN'])assert.equal(core.validSpeed(value),false);});
test('touch coordinates follow responsive canvas crop rather than viewport',()=>{const p=core.point(288,250,{left:0,top:100,width:800,height:600});assert.deepEqual(p,{lx:288,ly:150});});
test('pointer outside canvas clamps to valid engine bounds',()=>{assert.deepEqual(core.point(-10,900,{left:0,top:0,width:800,height:600}),{lx:0,ly:599});});
