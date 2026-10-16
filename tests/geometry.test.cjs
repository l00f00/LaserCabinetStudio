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
{
 const p={...base,modules:2,shelves:2,lipMode:'custom',lipConfig:JSON.stringify({'m1-p0':true,'m1-p2':true,'m1-p3':true,'m2-p1':true})};
 const model=G.build(p),fronts=model.parts.filter(q=>q.key.startsWith('front-'));
 assert.deepEqual(fronts.map(q=>`${q.module}:${q.key}`).sort(),['1:front-2','1:front-bottom','1:front-top','2:front-1'],'I frontalini devono seguire la selezione di ogni singolo livello');
 const top=model.parts.find(q=>q.module===1&&q.key==='front-top');assert(top.v[2]<0,'Il frontalino alto deve scendere dal piano superiore');
 model.parts.map(q=>G.cutting(q,p.kerf)).forEach(G.validatePart);cases++;
}
{
 const p={...base,shelves:1,lipMode:'custom',lipConfig:JSON.stringify({'m1-p0':true,'m1-p1':true,'m1-p2':true}),frontConfig:JSON.stringify({'m1-b1':'drawer','m1-b2':'door-left'})};
 assert.equal(G.build(p).parts.filter(q=>q.key.startsWith('front-')).length,0,'I frontalini non devono sovrapporsi a vani chiusi');cases++;
}
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
 const p={...base,angleL:45,angleR:120,shelves:1,frontConfig:JSON.stringify({'m1-b1':'drawer'})};
 const model=G.build(p),left=model.parts.find(q=>q.key==='drawer-b1-c1-side-l'),right=model.parts.find(q=>q.key==='drawer-b1-c1-side-r'),back=model.parts.find(q=>q.key==='drawer-b1-c1-back'),front=model.parts.find(q=>q.key==='drawer-b1-c1-front');
 assert(Math.abs(left.u[0])>.1,'Il fianco sinistro del cassetto deve seguire il lato inclinato del ripiano');
 assert(Math.abs(right.u[0])>.1,'Il fianco destro del cassetto deve seguire il lato inclinato del ripiano');
 assert.notEqual(Number(CabinetWidth(left).toFixed(3)),Number(CabinetWidth(right).toFixed(3)),'Le profondità laterali devono essere calcolate separatamente');
 assert(CabinetWidth(back)<CabinetWidth(front),'La schiena del cassetto rastremato deve seguire la larghezza posteriore del vano');
 model.parts.map(q=>G.cutting(q,p.kerf)).forEach(G.validatePart);cases++;
}
{
 const config={'m1-b1':{columns:2,partitions:true,items:[{type:'drawer',handle:'round',dividers:1},{type:'drawer',handle:'square',dividers:2}]},'m1-b2':{columns:2,partitions:true,items:[{type:'door',hinge:'left',dividers:1},{type:'door',hinge:'right',dividers:0}]}};
 const p={...base,angleL:90,angleR:90,frontConfig:JSON.stringify(config),handleSize:24},model=G.build(p),drawerFronts=model.parts.filter(q=>q.key.match(/^drawer-b1-c\d-front$/)),doors=model.parts.filter(q=>q.key.match(/^door-b2-c\d$/));
 assert.equal(drawerFronts.length,2,'Un vano deve poter contenere più cassetti affiancati');
 assert.equal(doors.length,2,'Un vano deve poter contenere più sportelli affiancati');
 assert.equal(drawerFronts[0].holes[0].length,32,'Il foro tondo deve essere esportato come cerchio');assert.equal(drawerFronts[1].holes[0].length,4,'Il foro quadrato deve avere quattro lati');
 assert.equal(model.parts.filter(q=>q.key.startsWith('wall-b')).length,2,'Le pareti interne devono essere generate per ogni vano configurato');
 assert.equal(model.parts.filter(q=>q.key.includes('drawer-b1')&&q.key.includes('divider')).length,3,'I divisori interni dei cassetti devono essere parametrici');
 assert.equal(model.parts.filter(q=>q.key.startsWith('divider-b2')).length,1,'I divisori verticali dietro gli sportelli devono essere generati');
 model.parts.map(q=>G.cutting(q,p.kerf)).forEach(G.validatePart);cases++;
}
{
 const p={...base,modules:2,moduleJoin:'dovetail',dovetailPolarity:'positive',dovetailCount:3,dovetailDepth:15,frontGap:2,drawerClearance:2,drawerHeight:60,frontConfig:JSON.stringify({'m1-b1':'drawer','m2-b2':'door-right'})};
 const model=G.build(p);assert.equal(model.parts.filter(q=>['left','right'].includes(q.key)).length,2);assert.equal(model.parts.filter(q=>q.key.includes('drawer')).length,5);assert.equal(model.parts.filter(q=>q.key.includes('door-b2')).length,1);
 model.parts.map(q=>G.cutting(q,p.kerf)).forEach(G.validatePart);cases++;
}
{
 const p={...base,width:1000,angleL:90,angleR:90,sheetW:850,sheetH:450},model=G.build(p),automatic=model.parts.filter(q=>q.name.includes('AUTO'));
 assert(automatic.length>=6,'I pannelli oltre 850 mm devono essere divisi automaticamente');
 assert(automatic.some(q=>q.name.endsWith('AUTO A'))&&automatic.some(q=>q.name.endsWith('AUTO B')),'La divisione deve creare una coppia complementare');
 const packed=G.pack(model.parts.map(q=>G.cutting(q,p.kerf)),p);assert(packed.sheets>=1);assert(packed.efficiency>0&&packed.efficiency<=1);
 for(const part of packed.parts){const b=G.bounds(part.outline.map(q=>G.placedPoint(part,q)));assert(b.minX>=0&&b.minY>=0&&b.maxX<=p.sheetW+1e-6&&b.maxY<=p.sheetH+1e-6,'Il nesting deve restare nell’area laser')}
 cases++;
}
assert.throws(()=>G.build({...base,width:200,angleR:45}));assert.throws(()=>G.pack(G.build(base).parts,{...base,sheetW:100}));
console.log(`${cases} geometry configurations passed: closed/simple contours, angled joints, positive/negative dovetails, kerf and sheet packing.`);

function CabinetWidth(part){const b=G.bounds(part.outline);return b.maxX-b.minX}
