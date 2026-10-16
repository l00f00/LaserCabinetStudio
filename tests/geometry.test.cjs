const assert=require('node:assert/strict'),G=require('../dist/geometry.js');
const base={width:900,height:500,depth:150,thickness:5,kerf:.05,modules:1,split:44,shelves:1,lip:55,lipMode:'each',angleL:45,angleR:90,parachute:'none',parachuteDepth:35,joint:'finger',hinge:'none',hingeSize:3,hingeEdge:12,hingePitch:32,finger:24,press:.05,sheetW:1200,sheetH:900,gap:8};
let cases=0;
for(const angleL of [45,60,90,120,135])for(const angleR of [45,90,120])for(const thickness of [3,5,8])for(const joint of ['finger','tab']){
 const p={...base,angleL,angleR,thickness,joint};const model=G.build(p);assert.equal(model.parts.length,6);
 for(const part of model.parts){G.validatePart(part);G.validatePart(G.cutting(part,p.kerf));for(let i=0;i<part.outline.length;i++)assert(Math.hypot(...part.outline[i].map((v,j)=>v-part.outline[(i+1)%part.outline.length][j]))>1e-7)}
 for(const j of model.joints){const side=model.parts.find(p=>p.key===j.side),top=model.parts.find(p=>p.key==='top');assert(G.bounds(side.outline).maxX<=j.length+1e-6);
  // At each shared station, exactly one panel occupies the join, at both heights.
  for(let s=3*thickness+.137;s<j.length-3*thickness;s+=.71){const xyz=G.world(side,[s,thickness/2],thickness/2),inTop=G.contains(top.outline,xyz.slice(0,2)),inSide=G.contains(side.outline,[s,thickness/2]);assert.notEqual(inTop,inSide,`Overlap/gap ${angleL}/${angleR} ${j.side} ${s}`)}
 }
 const front=model.parts.find(p=>p.key==='front-1'),shelf=model.parts.find(p=>p.key==='shelf-1');
 for(let s=1.137;s<G.bounds(front.outline).maxX-1;s+=.71){const xyz=G.world(front,[s,thickness/2],thickness/2);assert.notEqual(G.contains(shelf.outline,xyz.slice(0,2)),G.contains(front.outline,[s,thickness/2]),'Front/shelf joint mismatch')}
 for(const side of model.parts.filter(p=>['left','right'].includes(p.key)))for(const q of front.outline){const v=G.world(front,q,thickness/2).map((x,i)=>x-side.o[i]),normal=v.reduce((s,x,i)=>s+x*side.n[i],0);if(normal>1e-6&&normal<thickness-1e-6){const uv=[v.reduce((s,x,i)=>s+x*side.u[i],0),v[2]];assert(!G.contains(side.outline,uv),'Front collides with side')}}
 const packed=G.pack(model.parts.map(p=>G.cutting(p,base.kerf)),{...p,sheetW:1800});assert.equal(packed.parts.length,model.parts.length);cases++;
}
for(const change of [{hinge:'left'},{hinge:'right'},{hinge:'both'},{parachute:'single'},{parachute:'double'},{shelves:0},{shelves:3,lip:25},{lipMode:'none'},{lipMode:'bottom'},{modules:2},{modules:3,angleL:90},{press:0},{kerf:.3}]){const p={...base,...change};G.build(p).parts.map(q=>G.cutting(q,p.kerf)).forEach(G.validatePart);cases++}
for(const modules of [2,3])for(const dovetailPolarity of ['positive','negative']){
 const p={...base,modules,moduleJoin:'dovetail',dovetailPolarity,dovetailCount:3,dovetailDepth:15};
 const model=G.build(p),sides=model.parts.filter(q=>['left','right'].includes(q.key)),horizontals=model.parts.filter(q=>['top','bottom','shelf-1'].includes(q.key));
 assert.equal(sides.length,2,'L’unione a rondine deve conservare solo i fianchi esterni');
 assert.equal(model.parts.length,modules*4+2,'Numero pezzi inatteso dopo la rimozione delle pareti mediane');
 assert(horizontals.every(q=>q.name.includes('RONDINE')),'Ogni tavola orizzontale deve avere un profilo a rondine');
 assert.equal(model.parts.find(q=>q.module===2&&q.key==='top').o[0],model.widths[0],'I moduli uniti non devono avere spazio tra loro');
 const m1=model.parts.find(q=>q.module===1&&q.key==='top'),m2=model.parts.find(q=>q.module===2&&q.key==='top');
 assert(m1.name.includes(dovetailPolarity==='positive'?'+':'−'),'Polarità errata sul primo modulo');
 assert(m2.name.includes(dovetailPolarity==='positive'?'−':'+'),'Il secondo modulo deve avere il profilo complementare');
 model.parts.map(q=>G.cutting(q,p.kerf)).forEach(G.validatePart);cases++;
}
{
 const p={...base,shelves:2,frontGap:2,drawerClearance:2,drawerHeight:80,frontConfig:JSON.stringify({'m1-b1':'door-left','m1-b2':'door-double','m1-b3':'drawer'})};
 const model=G.build(p),doors=model.parts.filter(q=>q.key.startsWith('door-b')),drawer=model.parts.filter(q=>q.key.startsWith('drawer-b3'));
 assert.equal(doors.length,3,'Sportello singolo e doppio devono produrre tre ante');
 assert.equal(drawer.length,5,'Il cassetto deve produrre frontale, fondo, due fianchi e schiena');
 assert.equal(model.parts.filter(q=>q.key.startsWith('front-')).length,0,'I frontalini anticaduta non devono sovrapporsi ai vani chiusi');
 model.parts.map(q=>G.cutting(q,p.kerf)).forEach(G.validatePart);cases++;
}
{
 const p={...base,modules:2,moduleJoin:'dovetail',dovetailPolarity:'positive',dovetailCount:3,dovetailDepth:15,frontGap:2,drawerClearance:2,drawerHeight:60,frontConfig:JSON.stringify({'m1-b1':'drawer','m2-b2':'door-right'})};
 const model=G.build(p);assert.equal(model.parts.filter(q=>['left','right'].includes(q.key)).length,2);assert.equal(model.parts.filter(q=>q.key.includes('drawer')).length,5);assert.equal(model.parts.filter(q=>q.key.includes('door-b2')).length,1);
 model.parts.map(q=>G.cutting(q,p.kerf)).forEach(G.validatePart);cases++;
}
assert.throws(()=>G.build({...base,width:200,angleR:45}));assert.throws(()=>G.pack(G.build(base).parts,{...base,sheetW:100}));
console.log(`${cases} geometry configurations passed: closed/simple contours, angled joints, positive/negative dovetails, kerf and sheet packing.`);
