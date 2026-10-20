const assert=require('node:assert/strict'),G=require('../dist/geometry.js');
const p={generator:'closedbox',x:180,y:120,h:90,outside:false,thickness:3,kerf:.05,finger:20,press:.05,sheetW:600,sheetH:400,gap:5};
const model=G.build(p);
assert.equal(model.parts.length,6,'ClosedBox has four walls, top and bottom');
assert.deepEqual(model.parts.map(q=>q.key).sort(),['back','bottom','front','left','lid','right']);
for(const key of ['front','back','left','right','bottom','lid'])assert(model.parts.find(q=>q.key===key).outline.length>4,`${key} must use finger joints`);
for(const part of model.parts){G.validatePart(part);G.validatePart(G.cutting(part,p.kerf));}
const packed=G.pack(model.parts.map(q=>G.cutting(q,p.kerf)),p);
assert.equal(packed.parts.length,6,'ClosedBox panels must use shared nesting');
const outside=G.build({...p,outside:true}),outsideFront=outside.parts.find(q=>q.key==='front'),insideFront=model.parts.find(q=>q.key==='front');
assert.equal(G.bounds(outsideFront.outline).maxX-G.bounds(outsideFront.outline).minX,p.x-2*p.thickness,'outside dimensions must reserve the source edge thickness adjustment');
assert.equal(G.bounds(insideFront.outline).maxX-G.bounds(insideFront.outline).minX,p.x,'inside dimensions must remain unchanged');
console.log('ClosedBox geometry, kerf, and nesting passed.');