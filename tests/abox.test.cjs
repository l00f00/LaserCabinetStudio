const assert=require('node:assert/strict'),G=require('../dist/geometry.js');
const p={generator:'abox',x:180,y:120,h:90,outside:false,thickness:3,kerf:.05,finger:20,press:.05,sheetW:600,sheetH:400,gap:5};
const model=G.build(p);
assert.equal(model.parts.length,6,'ABox must generate four walls, bottom and lid');
assert.deepEqual(model.parts.map(q=>q.key).sort(),['back','bottom','front','left','lid','right']);
const byKey=Object.fromEntries(model.parts.map(q=>[q.key,q]));
// Walls and bottom must expose complementary, thickness-deep finger geometry.
assert(byKey.front.outline.length>4,'front wall must have finger-jointed bottom edge');
assert(byKey.bottom.outline.length>4,'bottom must have complementary finger-jointed edges');
assert(byKey.front.outline.some(([x,y])=>y<0),'wall fingers must extend into floor slots');
assert.equal(byKey.left.o[1],p.thickness,'left wall must begin at the inner floor edge');
assert.equal(byKey.right.o[1],p.y-p.thickness,'right wall must begin at the far inner floor edge');
for(const part of model.parts){G.validatePart(part);G.validatePart(G.cutting(part,p.kerf));}
const packed=G.pack(model.parts.map(q=>G.cutting(q,p.kerf)),p);
assert.equal(packed.parts.length,6,'ABox panels must use the shared nesting path');
console.log('ABox geometry, kerf, and nesting passed.');
