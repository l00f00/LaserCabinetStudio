const assert=require('node:assert/strict'),G=require('../dist/geometry.js');
const p={generator:'openbox',x:180,y:120,h:90,outside:false,thickness:3,kerf:.05,finger:20,press:.05,sheetW:600,sheetH:400,gap:5};
const model=G.build(p);
assert.equal(model.parts.length,4,'OpenBox has a back, two sides and a floor; front and lid are open');
assert.deepEqual(model.parts.map(q=>q.key).sort(),['back','bottom','left','right']);
const byKey=Object.fromEntries(model.parts.map(q=>[q.key,q]));
assert(byKey.back.outline.length>4,'back wall must have finger-jointed floor edge');
assert(byKey.bottom.outline.length>4,'floor must have mating finger slots');
assert.equal(byKey.back.o[2],0);assert.equal(byKey.bottom.o[2],0);assert(!byKey.front&&!byKey.lid,'front and lid must remain open');
for(const part of model.parts){G.validatePart(part);G.validatePart(G.cutting(part,p.kerf));}
const packed=G.pack(model.parts.map(q=>G.cutting(q,p.kerf)),p);
assert.equal(packed.parts.length,4,'OpenBox panels must use shared nesting');
console.log('OpenBox geometry, kerf, and nesting passed.');
