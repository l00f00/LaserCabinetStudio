/* All dimensions are millimetres. These planar parts drive BOTH views and exports. */
(function(root){
'use strict';
const EPS=1e-7;
const add=(a,b)=>a.map((v,i)=>v+b[i]), mul=(a,k)=>a.map(v=>v*k);
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dist=(a,b)=>Math.hypot(...sub(a,b));
const area=p=>p.reduce((s,a,i)=>s+cross(a,p[(i+1)%p.length]),0)/2;
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
function clean(p){return p.filter((q,i)=>dist(q,p[(i+p.length-1)%p.length])>EPS)}
function lineMeet(p,u,q,v){const den=cross(u,v);return Math.abs(den)<EPS?p:add(p,mul(u,cross(sub(q,p),v)/den))}
function bounds(p){return {minX:Math.min(...p.map(q=>q[0])),minY:Math.min(...p.map(q=>q[1])),maxX:Math.max(...p.map(q=>q[0])),maxY:Math.max(...p.map(q=>q[1]))}}
function offset(poly,amount){
 const sign=Math.sign(area(poly));
 const edges=poly.map((p,i)=>{const v=sub(poly[(i+1)%poly.length],p),l=Math.hypot(...v);return {v,p:add(p,mul([v[1],-v[0]],amount*sign/l))}});
 return clean(edges.map((e,i)=>{const prev=edges[(i+edges.length-1)%edges.length];return lineMeet(prev.p,prev.v,e.p,e.v)}));
}
// Notches follow the edge's tangent and inward NORMAL. No line crosses a tooth base.
function profile(poly,specs){
 const edges=poly.map((p,i)=>{const v=sub(poly[(i+1)%poly.length],p),len=Math.hypot(...v),u=mul(v,1/len);return {p,u,n:[-u[1],u[0]],len,s:specs[i]||{base:0,intervals:[]}}});
 const corners=edges.map((e,i)=>{const prev=edges[(i+edges.length-1)%edges.length];return lineMeet(add(prev.p,mul(prev.n,prev.s.base)),prev.u,add(e.p,mul(e.n,e.s.base)),e.u)});
 const out=[];
 edges.forEach((e,i)=>{out.push(corners[i]);const at=(s,d)=>add(add(e.p,mul(e.u,s)),mul(e.n,d));for(const interval of e.s.intervals){
  if(Array.isArray(interval)){const [a,b,depth]=interval;out.push(at(a,e.s.base),at(a,depth),at(b,depth),at(b,e.s.base))}
  else{const {c,head,neck,depth}=interval;out.push(at(c-neck/2,e.s.base),at(c-head/2,depth),at(c+head/2,depth),at(c+neck/2,e.s.base))}
 }});
 return clean(out);
}
function stations(len,pitch,margin,mode){
 const usable=len-2*margin;if(usable<8)throw Error('Bordo troppo corto per gli incastri: aumenta la profondità.');
 const n=mode==='tab'?3:Math.max(3,Math.floor(usable/pitch)|1),step=usable/n;
 return Array.from({length:Math.ceil(n/2)},(_,i)=>[margin+i*2*step,margin+(i*2+1)*step]);
}
function reverseIntervals(a,len){return a.map(([s,e])=>[len-e,len-s]).reverse()}
function dovetailIntervals(len,p,kind){
 const count=Math.max(1,Math.min(8,Math.round(p.dovetailCount))),margin=Math.min(18,Math.max(8,len*.1)),usable=len-2*margin;
 if(usable<20)throw Error('Bordo troppo corto per la coda di rondine: aumenta la profondità o riduci il numero di code.');
 const pitch=usable/count,nominalHead=Math.min(Math.max(9,p.finger),pitch*.62),fit=2*p.kerf+p.press,positive=kind==='male';
 const head=Math.max(5,nominalHead+(positive?fit:-fit)),neck=Math.max(3,nominalHead*.48+(positive?fit:-fit)),depth=Math.max(2,p.dovetailDepth+(positive?fit/2:-fit/2));
 return Array.from({length:count},(_,i)=>({c:margin+pitch*(i+.5),head,neck,depth:(positive?-1:1)*depth}));
}
function contains(poly,q){let inside=false;poly.forEach((a,i)=>{const b=poly[(i+1)%poly.length];if((a[1]>q[1])!==(b[1]>q[1])&&q[0]<(b[0]-a[0])*(q[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside});return inside}
function intersections(poly){
 for(let i=0;i<poly.length;i++)for(let j=i+1;j<poly.length;j++){
  if(j===i+1||(i===0&&j===poly.length-1))continue;
  const a=poly[i],b=poly[(i+1)%poly.length],c=poly[j],d=poly[(j+1)%poly.length],u=sub(b,a),v=sub(d,c),den=cross(u,v);
  if(Math.abs(den)<EPS)continue;
  const s=cross(sub(c,a),v)/den,t=cross(sub(c,a),u)/den;
  if(s>EPS&&s<1-EPS&&t>EPS&&t<1-EPS)return true;
 }return false;
}
function validatePart(p){
 if(p.outline.some(q=>q.some(x=>!Number.isFinite(x)))||area(p.outline)<=EPS||intersections(p.outline))throw Error(p.name+': contorno non valido.');
 for(const hole of p.holes)if(area(hole)<=EPS||intersections(hole)||hole.some(q=>!contains(p.outline,q)))throw Error(p.name+': foro fuori dal pannello; riduci i fori o modifica le quote.');
}
function build(p){
 p={moduleJoin:'wall',dovetailPolarity:'positive',dovetailCount:3,dovetailDepth:15,...p};
 for(const k of ['width','height','depth','thickness','kerf','modules','split','shelves','lip','angleL','angleR','parachuteDepth','hingeSize','hingeEdge','hingePitch','finger','press','dovetailCount','dovetailDepth','sheetW','sheetH','gap'])if(!Number.isFinite(p[k]))throw Error('Inserisci un numero valido: '+k);
 if(p.finger<8||p.finger>80||p.lip<0||p.hingeSize<=0||p.hingePitch<=0||p.hingeEdge<=0||p.parachuteDepth<=0)throw Error('Passo dente: 8–80 mm. Controlla le quote dei frontalini e dei fori.');
 if(!Number.isInteger(p.modules)||p.split<20||p.split>80)throw Error('Numero moduli o divisione non validi.');
 for(const k of ['width','height','depth','thickness','finger','sheetW','sheetH','gap'])if(!Number.isFinite(p[k])||p[k]<=0)throw Error('Quota non valida: '+k);
 if(p.kerf<0||p.kerf>1||p.press<0||p.press>0.5)throw Error('Kerf: 0–1 mm. Interferenza: 0–0,5 mm.');
 if(p.angleL<45||p.angleL>135||p.angleR<45||p.angleR>135)throw Error('Angoli ammessi: da 45° a 135°.');
 if(p.modules<1||p.modules>3||p.shelves<0||p.shelves>6||!Number.isInteger(p.shelves))throw Error('Controlla il numero di moduli e ripiani.');
 if(!Number.isInteger(p.dovetailCount)||p.dovetailCount<1||p.dovetailCount>8||p.dovetailDepth<4||p.dovetailDepth>50)throw Error('Coda di rondine: usa 1–8 code e profondità 4–50 mm.');
 const t=p.thickness,H=p.height,D=p.depth,parts=[],joints=[],joined=p.moduleJoin==='dovetail'&&p.modules>1;
 if(t*6>=Math.min(D,H))throw Error('Spessore eccessivo rispetto alle dimensioni.');
 const L=D/Math.tan(p.angleL*Math.PI/180),R=D/Math.tan(p.angleR*Math.PI/180);
 const widths=p.modules===1?[p.width]:p.modules===2?[p.width*p.split/100,p.width*(1-p.split/100)]:Array(3).fill(p.width/3);
 let originX=0;
 widths.forEach((W,mi)=>{
  const first=mi===0,last=mi===widths.length-1,leftOuter=!joined||first,rightOuter=!joined||last,leftBack=leftOuter?L:0,rightBack=rightOuter?R:0;
  if(W-leftBack-rightBack<8*t||W<8*t)throw Error('I fianchi si incrociano o lasciano troppo poco spazio: aumenta la larghezza o modifica gli angoli.');
  const base=[[0,0],[W,0],[W-rightBack,D],[leftBack,D]],lenL=Math.hypot(leftBack,D),lenR=Math.hypot(rightBack,D);
  const left=stations(lenL,p.finger,3*t,p.joint),right=stations(lenR,p.finger,3*t,p.joint);
  const lrev=reverseIntervals(left,lenL),withD=(a,d)=>a.map(([s,e])=>[s,e,d]);
  const x=originX,mid=mi+1,seams=p.dovetailPolarity==='positive'?{leftPiece:'male',rightPiece:'female'}:{leftPiece:'female',rightPiece:'male'};
  const make=(name,key,outline,holes,o,u,v,n)=>{const part={id:'M'+mid+'-'+key,module:mid,key,name:'M'+mid+' '+name,outline,holes,thickness:t,o,u,v,n};parts.push(part);return part};
  const horizontal=(name,key,z,shelf,front)=>{
   const rightKind=rightOuter?null:seams.leftPiece,leftKind=leftOuter?null:seams.rightPiece;
   const specs=[{base:0,intervals:[]},rightOuter?{base:shelf?t:0,intervals:withD(right,shelf?0:t)}:{base:0,intervals:dovetailIntervals(D,p,rightKind)},{base:0,intervals:[]},leftOuter?{base:shelf?t:0,intervals:withD(lrev,shelf?0:t)}:{base:0,intervals:dovetailIntervals(D,p,leftKind)}];
   if(front)specs[0]={base:0,intervals:withD(front,t)};
   const mark=[leftKind,rightKind].filter(Boolean).map(k=>k==='male'?'+':'−').join('/');
   return make(name+(mark?' · RONDINE '+mark:''),key,profile(base,specs),[],[x,0,z],[1,0,0],[0,1,0],[0,0,1]);
  };
  const frontStations=stations(W,p.finger,Math.max(4*t,Math.abs(leftBack)*t/D+4*t,Math.abs(rightBack)*t/D+4*t),p.joint);
  const bottomLip=p.lip>0&&p.lipMode==='bottom';
  const bottom=horizontal('BOTTOM','bottom',0,false,bottomLip?frontStations:null);
  horizontal('TOP','top',H-t,false,null);
  const sides={};
  const sideDefs=[];
  if(leftOuter)sideDefs.push(['left',lenL,left,[leftBack/lenL,D/lenL,0],[D/lenL,-leftBack/lenL,0],[x,0,0]]);
  if(rightOuter)sideDefs.push(['right',lenR,right,[-rightBack/lenR,D/lenR,0],[-D/lenR,-rightBack/lenR,0],[x+W,0,0]]);
  for(const [key,len,ss,u,n,o] of sideDefs){
   // Horizontal panel occupies full edge except its notches. Side occupies those notches.
   // Square laser-cut ends stay inside front/back planes even on oblique walls.
   const slope=key==='left'?leftBack:rightBack,start=t*Math.max(0,slope)/D,end=t*Math.max(0,-slope)/D,span=len-start-end;
   const shifted=ss.map(([a,b])=>[a-start,b-start]);
   const outline=profile(rect(start,0,span,H),[{base:t,intervals:withD(shifted,0)},null,{base:t,intervals:withD(reverseIntervals(shifted,span),0)},null]);
   sides[key]=make('SIDE '+key.toUpperCase(),key,outline,[],o,u,[0,0,1],n);
   joints.push({module:mid,side:key,length:len,stations:ss,depth:t});
  }
  function addFront(label,key,z){
   if(p.lip<3*t)throw Error('Frontalino troppo basso: usa almeno tre volte lo spessore.');
   // Clear the full thickness of both angled walls, not just their centre lines.
   const a=leftOuter?t*(lenL+Math.max(leftBack,0))/D:0,b=rightOuter?t*(lenR+Math.max(rightBack,0))/D:0,span=W-a-b;
   const outline=profile(rect(0,0,span,p.lip+t),[{base:t,intervals:withD(frontStations.map(([s,e])=>[s-a,e-a]),0)},null,null,null]);
   const front=make(label,key,outline,[],[x+a,0,z],[1,0,0],[0,0,1],[0,1,0]);
   if(p.parachute!=='none'){
    const cw=p.parachuteDepth,ch=Math.min(10,p.lip/3),yc=t+p.lip/2;
    for(const f of p.parachute==='double'?[.28,.72]:[.5])front.holes.push(rect(span*f-cw/2,yc-ch/2,cw,ch));
   }return front;
  }
  if(bottomLip)addFront('FRONT BOTTOM','front-bottom',0);
  for(let j=1;j<=p.shelves;j++){
   const z=H*j/(p.shelves+1)-t/2,lip=p.lip>0&&p.lipMode==='each';
   if(z<t*2||z+t>H-t*2||lip&&z+p.lip+t>=H-t)throw Error('Ripiani o frontalini troppo ravvicinati.');
   horizontal('SHELF '+j,'shelf-'+j,z,true,lip?frontStations:null);
   for(const [key,ss] of [['left',left],['right',right]].filter(([key])=>sides[key]))for(const [a,b] of ss){
    const fit=p.press/2;sides[key].holes.push(rect(a+fit,z+fit,b-a-p.press,t-p.press));
   }
   if(lip)addFront('FRONT '+j,'front-'+j,z);
  }
  // Explicit parametric drilling template for EXTERNAL hinges, never fake laser-cut mechanisms.
  if(p.hinge!=='none'){
   const clearance=2,door=make('DOOR · fori cerniere','door',rect(0,0,W-2*clearance,H-2*clearance),[],[x+clearance,-t-2,clearance],[1,0,0],[0,0,1],[0,1,0]);
   const radius=p.hingeSize/2,edge=p.hingeEdge,pitch=p.hingePitch;
   const circle=(cx,cy)=>Array.from({length:32},(_,i)=>[cx+radius*Math.cos(i*Math.PI/16),cy+radius*Math.sin(i*Math.PI/16)]);
   for(const key of (p.hinge==='both'?['left','right']:[p.hinge]).filter(key=>sides[key]))for(const z of [H*.22,H*.78])for(const zz of [z-pitch/2,z+pitch/2]){
    sides[key].holes.push(circle(edge,zz));door.holes.push(circle(key==='left'?edge:W-2*clearance-edge,zz-clearance));
   }
  }
  originX+=W+(joined?0:Math.max(25,-L,-R)+25);
 });
 parts.forEach(validatePart);
 return {parts,joints,L,R,widths};
}
function world(part,q,z=0){return add(add(add(part.o,mul(part.u,q[0])),mul(part.v,q[1])),mul(part.n,z))}
function cutting(part,kerf){return {...part,outline:offset(part.outline,kerf/2),holes:part.holes.map(h=>offset(h,-kerf/2))}}
function pack(parts,p){
 let x=p.gap,y=p.gap,row=0,sheet=0;
 const placed=[];
 for(const part of parts){const b=bounds(part.outline),w=b.maxX-b.minX,h=b.maxY-b.minY;
  if(w+2*p.gap>p.sheetW||h+2*p.gap>p.sheetH)throw Error(part.name+': non entra nel foglio '+p.sheetW+' × '+p.sheetH+' mm. Aumenta il foglio.');
  if(x+w+p.gap>p.sheetW){x=p.gap;y+=row+p.gap;row=0}
  if(y+h+p.gap>p.sheetH){sheet++;x=p.gap;y=p.gap;row=0}
  placed.push({...part,px:x-b.minX,py:y-b.minY,sheet});x+=w+p.gap;row=Math.max(row,h);
 }return {parts:placed,sheets:sheet+1};
}
const api={build,profile,stations,world,cutting,pack,bounds,area,intersections,contains,validatePart};
if(typeof module!=='undefined')module.exports=api;else root.Cabinet=api;
})(typeof window!=='undefined'?window:globalThis);
