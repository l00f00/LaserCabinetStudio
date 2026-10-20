const assert=require('node:assert/strict'),G=require('../dist/geometry.js');
const p={generator:'halfbox',x:120,h:80,thickness:3,kerf:.05,finger:12,press:.05,sheetW:500,sheetH:300,gap:5,sy:'50:50'};
const model=G.build(p),byKey=Object.fromEntries(model.parts.map(q=>[q.key,q]));
assert.equal(model.parts.length,6);
assert.notDeepEqual(byKey.bottom.o,byKey.invisible.o);
assert(byKey.bottom.holes.length>0,'bottom panel needs real support slots');
assert(byKey.side.holes.length>0,'side panel needs real support slots');
assert.equal(G.bounds(byKey.bottom.outline).maxX,p.x+p.thickness,'bottom edge must carry the Boxes.py positive finger profile');
assert(byKey.side.outline.some(([x])=>Math.abs(x-p.thickness)<1e-8),'side edge must carry the complementary F profile');
assert.notDeepEqual(G.build({...p,press:0}).parts.find(q=>q.key==='side').outline,byKey.side.outline,'press-fit must open the female finger profile');
assert(byKey['support-0'].outline.length>3);
for(let i=0;i<3;i++){const s=byKey[`support-${i}`];assert(s,`missing support-${i}`);assert(Math.abs(G.bounds(s.outline).minX)<1e-8);assert.equal(G.bounds(s.outline).maxX,123);assert.equal(G.bounds(s.outline).minY,-3);assert.equal(G.bounds(s.outline).maxY,80)}
for(const part of model.parts){G.validatePart(part);G.validatePart(G.cutting(part,p.kerf));}
assert.equal(G.pack(model.parts.map(q=>G.cutting(q,p.kerf)),p).parts.length,6);
assert.throws(()=>G.build({...p,sy:''}),/Divisione sy non valida/);
const varied=G.build({...p,sy:'30:30:30'});assert.equal(varied.parts.filter(q=>q.key.startsWith('support-')).length,4);
console.log('HalfBox geometry, finger joints, sy supports, kerf, and nesting passed.');
