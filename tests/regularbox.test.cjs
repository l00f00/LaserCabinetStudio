const assert=require('node:assert/strict'),G=require('../dist/geometry.js');
const p={generator:'regularbox',radiusBottom:50,radiusTop:50,n:5,h:80,thickness:3,kerf:.05,finger:24,press:.05,sheetW:600,sheetH:400,gap:5};
const model=G.build(p);
assert.equal(model.parts.length,6,'a pentagonal open box has one base and five walls');
assert.deepEqual(model.parts.map(q=>q.key),['bottom','wall-0','wall-1','wall-2','wall-3','wall-4']);
assert(model.parts[0].outline.length>5,'the base must be a polygon with real finger profiles');
assert(model.parts[1].outline.some(([,y])=>y< -2),'wall bottom edges must have positive male finger profiles');
for(const part of model.parts){G.validatePart(part);G.validatePart(G.cutting(part,p.kerf));}
const finer=G.build({...p,finger:12});
assert.notDeepEqual(finer.parts[1].outline,model.parts[1].outline,'the configured finger pitch changes the real joint profile');
const checkAssembly=(m,q)=>{
 const n=q.n,side0=2*q.radiusBottom*Math.sin(Math.PI/n),side1=2*q.radiusTop*Math.sin(Math.PI/n),offset=(side0-side1)/2,panelH=Math.hypot((q.radiusTop-q.radiusBottom)*Math.cos(Math.PI/n),q.h);
 const close=(a,b)=>assert(a.every((v,i)=>Math.abs(v-b[i])<1e-6),`world mismatch: ${a} != ${b}`);
 for(let i=0;i<n;i++){
  const wall=m.parts[i+1],a0=-Math.PI/2-Math.PI/n+i*2*Math.PI/n,a1=a0+2*Math.PI/n;
  const b0=[q.radiusBottom*Math.cos(a0),q.radiusBottom*Math.sin(a0),0],b1=[q.radiusBottom*Math.cos(a1),q.radiusBottom*Math.sin(a1),0];
  const t0=[q.radiusTop*Math.cos(a0),q.radiusTop*Math.sin(a0),q.h],t1=[q.radiusTop*Math.cos(a1),q.radiusTop*Math.sin(a1),q.h];
  close(G.world(wall,[0,0],0),b0);close(G.world(wall,[side0,0],0),b1);
  close(G.world(wall,[offset,panelH],0),t0);close(G.world(wall,[offset+side1,panelH],0),t1);
 }
};
checkAssembly(model,p);
assert.equal(G.pack(model.parts.map(q=>G.cutting(q,p.kerf)),p).parts.length,6);
const tapered=G.build({...p,n:6,radiusTop:35});
assert.equal(tapered.parts.length,7,'side count controls the number of wall panels');
checkAssembly(tapered,{...p,n:6,radiusTop:35});
assert.notDeepEqual(tapered.parts[1].outline,tapered.parts[2].outline,'even-sided boxes need the alternating source panel profiles');
assert.notDeepEqual(tapered.parts[1].outline,model.parts[1].outline,'top radius changes the wall panel taper');
assert.throws(()=>G.build({...p,n:2}),/RegularBox/);
console.log('RegularBox polygon, finger joints, taper, kerf, and nesting passed.');
