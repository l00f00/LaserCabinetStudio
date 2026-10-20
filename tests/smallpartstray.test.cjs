const assert=require('node:assert/strict'),G=require('../dist/geometry.js'),EPS=1e-7;
const p={generator:'smallpartstray',x:180,y:120,h:50,thickness:3,kerf:.05,finger:20,press:.05,sheetW:600,sheetH:400,gap:5};
const model=G.build(p),byKey=Object.fromEntries(model.parts.map(q=>[q.key,q]));
assert.deepEqual(model.parts.map(q=>q.key).sort(),['back','bottom','divider','front','left','right']);
const t=p.thickness;
assert.deepEqual(byKey.bottom.o,[0,0,0]);
assert.deepEqual(byKey.front.o,[0,t,t]);assert.deepEqual(byKey.back.o,[p.x,p.y-t,t]);
assert.deepEqual(byKey.left.o,[t,t,t]);assert.deepEqual(byKey.right.o,[p.x-t,p.y-t,t]);
assert.deepEqual(byKey.front.n,[0,-1,0]);assert.deepEqual(byKey.back.n,[0,1,0]);
assert.deepEqual(byKey.left.n,[-1,0,0]);assert.deepEqual(byKey.right.n,[1,0,0]);
assert.deepEqual(G.world(byKey.front,[0,0]),[0,t,t]);assert.deepEqual(G.world(byKey.back,[0,0]),[p.x,p.y-t,t]);
assert.deepEqual(G.world(byKey.back,[p.x,0]),[0,p.y-t,t]);
assert.equal(byKey.divider.o[1],61.5);assert.equal(byKey.divider.o[2],t);
assert.deepEqual(byKey.divider.n,[0,-1,0]);
assert.deepEqual(byKey.divider.outline,[[0,0],[174,0],[174,47],[0,47]],'divider is a plain glued/butt joint, not a lock');
assert.deepEqual(G.world(byKey.divider,[0,0]),[t,61.5,t]);assert.deepEqual(G.world(byKey.divider,[174,0]),[p.x-t,61.5,t]);
assert.equal(G.world(byKey.divider,[87,0],t)[1],58.5);assert.equal(G.world(byKey.divider,[87,47])[2],p.h,'divider bottom rests on floor top and reaches the tray rim');
assert.ok(byKey.bottom.outline.length>4,'bottom keeps finger tabs');assert.ok(byKey.front.outline.length>4,'wall keeps mating slots');

const spansAt=(poly,axis,value)=>poly.flatMap((a,i)=>{const b=poly[(i+1)%poly.length];return Math.abs(a[axis]-value)<EPS&&Math.abs(b[axis]-value)<EPS&&Math.abs(a[1-axis]-b[1-axis])>EPS?[[Math.min(a[1-axis],b[1-axis]),Math.max(a[1-axis],b[1-axis])]]:[]});
const assertMates=(floorAxis,floorValue,wall,map)=>{const slots=spansAt(byKey.bottom.outline,floorAxis,floorValue),tabs=spansAt(wall.outline,1,-t).map(map);assert.equal(tabs.length,slots.length);for(const [a,b] of tabs)assert(slots.some(([lo,hi])=>lo<=a+EPS&&b<=hi+EPS),'wall tabs fit inside bottom slots');};
assertMates(1,t,byKey.front,([a,b])=>[a,b]);assertMates(1,p.y-t,byKey.back,([a,b])=>[p.x-b,p.x-a]);
assertMates(0,t,byKey.left,([a,b])=>[t+a,t+b]);assertMates(0,p.x-t,byKey.right,([a,b])=>[p.y-t-b,p.y-t-a]);
for(const [x,y,t] of [[36.01,48.01,6],[60.01,80.01,10],[180,120,3],[800,500,10]]){
 const q={...p,x,y,thickness:t,sheetW:Math.max(p.sheetW,x+100),sheetH:Math.max(p.sheetH,y+100)},parts=G.build(q).parts,d=parts.find(v=>v.key==='divider');
 for(const part of parts){G.validatePart(part);G.validatePart(G.cutting(part,q.kerf));}
 const corners=[[0,0],[x-2*t,0],[0,q.h-t],[x-2*t,q.h-t]].map(pt=>G.world(d,pt));
 assert(corners.every(pt=>pt[0]>=t-EPS&&pt[0]<=x-t+EPS&&pt[2]>=t-EPS&&pt[2]<=q.h+EPS),'divider fits between side walls, clears floor thickness, and reaches the rim');
 const lo=d.o[1]-t/2,hi=d.o[1]+t/2;assert(lo>t&&hi<y-t,'divider leaves positive clearance from both side walls');
 const packed=G.pack(parts.map(v=>G.cutting(v,q.kerf)),q);assert.equal(packed.parts.length,6,'all six parts fit nesting');assert(packed.sheets>=1&&packed.efficiency>0&&packed.efficiency<=1);
 const placed=packed.parts.map(v=>{const b=v.sourceBounds,w=b.maxX-b.minX,h=b.maxY-b.minY;return {...v,w:v.rotated?h:w,h:v.rotated?w:h};});
 for(let i=0;i<placed.length;i++){const a=placed[i];assert(a.placeX>=0&&a.placeY>=0&&a.placeX+a.w<=q.sheetW+EPS&&a.placeY+a.h<=q.sheetH+EPS,'nested part lies on sheet');for(let j=i+1;j<placed.length;j++){const b=placed[j];if(a.sheet===b.sheet)assert(a.placeX+a.w<=b.placeX+EPS||b.placeX+b.w<=a.placeX+EPS||a.placeY+a.h<=b.placeY+EPS||b.placeY+b.h<=a.placeY+EPS,'nested parts do not overlap');}}
}
assert.notDeepEqual(G.cutting(byKey.bottom,.4).outline,G.cutting(byKey.bottom,.05).outline);
for(const bad of [{x:5},{x:0},{y:0},{thickness:0},{y:12.01,thickness:3},{x:12.01,thickness:3}])assert.throws(()=>G.build({...p,...bad}),/dimensioni|posizione/i);
console.log('SmallPartsTray geometry edge cases, divider clearance/floor, finger joints, kerf, and nesting passed.');
