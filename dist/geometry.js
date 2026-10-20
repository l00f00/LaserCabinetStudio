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
const circle=(cx,cy,r)=>Array.from({length:32},(_,i)=>[cx+r*Math.cos(i*Math.PI/16),cy+r*Math.sin(i*Math.PI/16)]);
const ellipse=(cx,cy,rx,ry)=>Array.from({length:40},(_,i)=>[cx+rx*Math.cos(i*Math.PI/20),cy+ry*Math.sin(i*Math.PI/20)]);
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function clean(p){return p.filter((q,i)=>dist(q,p[(i+p.length-1)%p.length])>EPS)}
function lineMeet(p,u,q,v){const den=cross(u,v);return Math.abs(den)<EPS?p:add(p,mul(u,cross(sub(q,p),v)/den))}
function bounds(p){return {minX:Math.min(...p.map(q=>q[0])),minY:Math.min(...p.map(q=>q[1])),maxX:Math.max(...p.map(q=>q[0])),maxY:Math.max(...p.map(q=>q[1]))}}
function offset(poly,amount){
 const sign=Math.sign(area(poly));
 const edges=poly.map((p,i)=>{const v=sub(poly[(i+1)%poly.length],p),l=Math.hypot(...v);return {v,p:add(p,mul([v[1],-v[0]],amount*sign/l))}});
 return clean(edges.map((e,i)=>{const prev=edges[(i+edges.length-1)%edges.length];return lineMeet(prev.p,prev.v,e.p,e.v)}));
}
// Inset each edge independently. This lets a drawer follow the shelf outline
// while keeping a different clearance at the front, sides and back.
function insetEdges(poly,amounts){
 const sign=Math.sign(area(poly));
 const edges=poly.map((p,i)=>{const v=sub(poly[(i+1)%poly.length],p),l=Math.hypot(...v),u=mul(v,1/l),n=mul([-u[1],u[0]],sign);return {v,p:add(p,mul(n,amounts[i]||0))}});
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
function baySetup(raw){
 const item=(type='open',extra={})=>({type,hinge:'left',handle:'none',dividers:0,...extra});
 if(typeof raw==='string'){
  if(raw==='door-left')return {columns:1,partitions:false,items:[item('door',{hinge:'left'})]};
  if(raw==='door-right')return {columns:1,partitions:false,items:[item('door',{hinge:'right'})]};
  if(raw==='door-double')return {columns:2,partitions:false,items:[item('door',{hinge:'left'}),item('door',{hinge:'right'})]};
  if(raw==='drawer')return {columns:1,partitions:false,items:[item('drawer')]};
  return {columns:1,partitions:false,items:[item()]};
 }
 const columns=Math.max(1,Math.min(4,Math.round(Number(raw?.columns)||1))),source=Array.isArray(raw?.items)?raw.items:[];
 const items=Array.from({length:columns},(_,i)=>{const v=source[i]||{},handle=v.handle==='square'?'rect':v.handle;return item(['door','drawer'].includes(v.type)?v.type:'open',{hinge:v.hinge==='right'?'right':'left',handle:['round','ellipse','rect'].includes(handle)?handle:'none',dividers:Math.max(0,Math.min(4,Math.round(Number(v.dividers)||0)))});});
 return {columns,partitions:!!raw?.partitions,items};
}
function clipHalf(poly,axis,cut,keepLow){
 const inside=q=>keepLow?q[axis]<=cut+EPS:q[axis]>=cut-EPS,out=[];
 poly.forEach((a,i)=>{const b=poly[(i+1)%poly.length],ain=inside(a),bin=inside(b);if(ain)out.push(a);if(ain!==bin){const t=(cut-a[axis])/(b[axis]-a[axis]),q=lerp(a,b,t);q[axis]=cut;out.push(q)}});
 return clean(out);
}
function seamProfile(poly,axis,cut,p,kind){
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];if(Math.abs(a[axis]-cut)>EPS||Math.abs(b[axis]-cut)>EPS)continue;
  const v=sub(b,a),len=Math.hypot(...v);if(len<20)continue;const u=mul(v,1/len),n=[-u[1],u[0]],teeth=dovetailIntervals(len,p,kind),insert=[];
  const at=(s,d)=>add(add(a,mul(u,s)),mul(n,d));for(const {c,head,neck,depth} of teeth)insert.push(at(c-neck/2,0),at(c-head/2,depth),at(c+head/2,depth),at(c+neck/2,0));
  return clean([...poly.slice(0,i+1),...insert,...poly.slice(i+1)]);
 }return poly;
}
function splitOversize(parts,p){
 const limit=Math.max(p.sheetW,p.sheetH),result=[];
 for(const part of parts){const b=bounds(part.outline),w=b.maxX-b.minX,h=b.maxY-b.minY,axis=w>=h?0:1,length=axis===0?w:h;if(length<=limit+EPS){result.push(part);continue}
  const min=axis===0?b.minX:b.minY,max=axis===0?b.maxX:b.maxY;let cut=(min+max)/2;
  const blocked=part.holes.map(hole=>{const hb=bounds(hole);return axis===0?[hb.minX-tolerance(p),hb.maxX+tolerance(p)]:[hb.minY-tolerance(p),hb.maxY+tolerance(p)]});
  for(const [a,z] of blocked)if(cut>a&&cut<z)cut=z;
  if(cut-min<length*.25||max-cut<length*.25)cut=(min+max)/2;
  const low=seamProfile(clipHalf(part.outline,axis,cut,true),axis,cut,p,'male'),high=seamProfile(clipHalf(part.outline,axis,cut,false),axis,cut,p,'female');
  const lowHoles=part.holes.filter(h=>h.every(q=>q[axis]<cut-EPS)),highHoles=part.holes.filter(h=>h.every(q=>q[axis]>cut+EPS));
  result.push({...part,id:part.id+'-A',key:part.key+'-auto-a',name:part.name+' · AUTO A',outline:low,holes:lowHoles},{...part,id:part.id+'-B',key:part.key+'-auto-b',name:part.name+' · AUTO B',outline:high,holes:highHoles});
 }return result;
}
function tolerance(p){return p.thickness*2}
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
function aboxIntervals(len,p,positive){
 const t=p.thickness,space=2*t,finger=2*t,n=Math.floor((len-space)/(space+finger));
 if(n<1)throw Error('Bordo ABox troppo corto per i denti.');
 const leftover=len-n*(space+finger)+space,start=leftover/2,play=p.press;
 return Array.from({length:n},(_,i)=>{const a=start+i*(space+finger),b=a+finger;return positive?[a-play,b+play,t]:[a,b,-t]});
}
function aboxProfile(w,h,p,key){
 const specs=Array.from({length:4},()=>({base:0,intervals:[]}));
 if(key==='wall')specs[0].intervals=aboxIntervals(w,p,false);
 if(key==='floor')for(let i=0;i<4;i++)specs[i].intervals=aboxIntervals(i%2?h:w,p,true);
 return profile(rect(0,0,w,h),specs);
}
function buildABox(p){
 const t=p.thickness,parts=[],make=(key,w,h,o,u,v,n,type)=>{const outline=type?aboxProfile(w,h,p,type):rect(0,0,w,h);parts.push({id:'A-'+key,module:1,key,name:'ABOX '+key.toUpperCase(),outline,holes:[],thickness:t,o,u,v,n})};
 make('front',p.x-2*t,p.h,[t,0,0],[1,0,0],[0,0,1],[0,1,0],'wall');make('back',p.x-2*t,p.h,[t,p.y-t,0],[1,0,0],[0,0,1],[0,-1,0],'wall');
 make('left',p.y-2*t,p.h,[t,t,0],[0,1,0],[0,0,1],[1,0,0],'wall');make('right',p.y-2*t,p.h,[p.x-t,p.y-t,0],[0,-1,0],[0,0,1],[-1,0,0],'wall');
 make('bottom',p.x-2*t,p.y-2*t,[t,t,0],[1,0,0],[0,1,0],[0,0,1],'floor');make('lid',p.x,p.y,[0,0,p.h],[1,0,0],[0,1,0],[0,0,1]);
 parts.forEach(validatePart);return {parts,joints:[],L:0,R:0,widths:[p.x]};
}
function buildOpenBox(p){
 const t=p.thickness,parts=[],intervals=(len,depth)=>{const n=Math.max(1,Math.floor((len-6*t)/(4*t))),step=len/n;return Array.from({length:n},(_,i)=>[i*step+step*.25,(i+1)*step-step*.25,depth])};
 const wall=(key,w,h,o,u,v,n)=>parts.push({id:'O-'+key,module:1,key,name:'OPENBOX '+key.toUpperCase(),outline:profile(rect(0,0,w,h),[{base:0,intervals:intervals(w,-t)},null,null,null]),holes:[],thickness:t,o,u,v,n});
 wall('back',p.x,p.h,[0,p.y-t,0],[1,0,0],[0,0,1],[0,-1,0]);wall('left',p.y-2*t,p.h,[t,t,0],[0,1,0],[0,0,1],[1,0,0]);wall('right',p.y-2*t,p.h,[p.x-t,p.y-t,0],[0,-1,0],[0,0,1],[-1,0,0]);
 const specs=Array.from({length:4},(_,i)=>i===0?{base:0,intervals:[]}:{base:0,intervals:intervals(i%2?p.y-2*t:p.x,t)});
 parts.push({id:'O-bottom',module:1,key:'bottom',name:'OPENBOX FLOOR',outline:profile(rect(0,0,p.x,p.y),specs),holes:[],thickness:t,o:[0,0,0],u:[1,0,0],v:[0,1,0],n:[0,0,1]});
 parts.forEach(validatePart);return {parts,joints:[],L:0,R:0,widths:[p.x]};
}
function closedBoxProfile(w,h,p,edges){
 const t=p.thickness,specs=edges.split('').map((edge,i)=>{
  const len=i%2===0?w:h,space=2*t,n=Math.floor((len-(2*t))/(space+p.finger));
  const count=n>0?n:(len>p.finger+t?1:0),width=n>0?p.finger:count?len/2:0,leftover=n>0?len-n*(space+width)+space:count?len/2:len,start=leftover/2;
  const intervals=Array.from({length:count},(_,j)=>{const a=start+j*(2*t+width),depth=edge===edge.toLowerCase()?-t:t;return [a,a+width,depth]});
  return {base:0,intervals};
 });
 return profile(rect(0,0,w,h),specs);
}
function buildClosedBox(p){
 const {x,y,h,thickness:t}=p,parts=[];
 const make=(key,w,height,edges,o,u,v,n)=>parts.push({id:'C-'+key,module:1,key,name:'CLOSEDBOX '+key.toUpperCase(),outline:closedBoxProfile(w,height,p,edges),holes:[],thickness:t,o,u,v,n});
 make('front',p.outside?x-2*t:x,p.outside?h-2*t:h,'FFFF',[0,0,0],[1,0,0],[0,0,1],[0,-1,0]);
 make('right',p.outside?y-2*t:y,p.outside?h-2*t:h,'FfFf',[x,0,0],[0,1,0],[0,0,1],[1,0,0]);
 make('back',p.outside?x-2*t:x,p.outside?h-2*t:h,'FFFF',[0,y,0],[-1,0,0],[0,0,1],[0,1,0]);
 make('left',p.outside?y-2*t:y,p.outside?h-2*t:h,'FfFf',[0,y,0],[0,-1,0],[0,0,1],[-1,0,0]);
 make('lid',p.outside?x-2*t:x,p.outside?y-2*t:y,'ffff',[0,0,h],[1,0,0],[0,1,0],[0,0,1]);
 make('bottom',p.outside?x-2*t:x,p.outside?y-2*t:y,'ffff',[0,0,0],[1,0,0],[0,1,0],[0,0,1]);
 parts.forEach(validatePart);return {parts,joints:[],L:0,R:0,widths:[x]};
}
function buildHalfBox(p){
 const {x,h,thickness:t}=p,parts=[],sy=String(p.sy??'50:50').split(':').map(Number);
 if(!sy.length||sy.some(v=>!Number.isFinite(v)||v<=0))throw Error('Divisione sy non valida.');
 const widths=[0,...sy,0],depth=widths.reduce((a,b)=>a+b,0)+(widths.length-1)*t;
 const make=(key,outline,o,u,v,n,holes=[],hidden3d=false)=>parts.push({id:'H-'+key,module:1,key,name:key==='invisible'?'HALFBOX INVISIBLE · SOLO TAGLIO':'HALFBOX '+key.toUpperCase(),outline,holes,thickness:t,o,u,v,n,hidden3d});
 const space=2*t,finger=2*t;
 const joint=(len,depth,play=0)=>{let count=Math.floor((len-space)/(space+finger));if(!finger)count=0;let width=finger+play;if(count===0&&len>finger+t){count=1;width=(len-space)/2+play}const leftover=count?len-count*(space+finger)+space-play:len,start=leftover/2;return Array.from({length:count},(_,i)=>[start+i*(space+finger),start+i*(space+finger)+width,depth])};
 const rows=[];let row=-t/2;for(const segment of widths.slice(0,-1)){row+=segment+t;rows.push(row)}
 const slots=(len,edge)=>{const edge0=[],edge2=[],holes=[];for(const y of rows){const fingers=joint(len,t,p.press);if(y<=t/2+EPS)edge0.push(...fingers);else if(y>=depth-t/2-EPS)edge2.push(...fingers.map(([a,b,d])=>[len-b,len-a,d]).reverse());else for(const [a,b] of joint(len,0,p.press))holes.push(rect(a,y-(t+p.press)/2,b-a,t+p.press))}const edge1=edge==='male'?joint(depth,-t):[],edge3=edge==='female'?joint(depth,t,p.press).map(([a,b,d])=>[depth-b,depth-a,d]).reverse():[];return {outline:profile(rect(0,0,len,depth),[{base:0,intervals:edge0},{base:0,intervals:edge1},{base:0,intervals:edge2},{base:0,intervals:edge3}]),holes};};
 const bottom=slots(x,'male'),side=slots(h,'female'),invisible=slots(x,'male');
 make('bottom',bottom.outline,[0,0,0],[1,0,0],[0,1,0],[0,0,-1],bottom.holes);
 make('side',side.outline,[x,0,0],[0,0,1],[0,1,0],[1,0,0],side.holes);
 // Boxes.py names this spare cut panel "invisible"; keep it in cut output, not the assembled preview.
 make('invisible',invisible.outline,[0,0,-t],[1,0,0],[0,1,0],[0,0,-1],invisible.holes,true);
 for(let i=0;i<rows.length;i++){
  const outline=profile([[0,0],[x,0],[x,h]],[{base:0,intervals:joint(x,-t)},{base:0,intervals:joint(h,-t)},{base:0,intervals:[]}]);
  make('support-'+i,outline,[0,rows[i]+t/2,0],[1,0,0],[0,0,1],[0,-1,0]);
 }
 parts.forEach(validatePart);return {parts,joints:[],L:0,R:0,widths:[x]};
}
function build(p){
 if(p.generator==='halfbox'){
  for(const k of ['x','h','thickness','kerf','finger','press','sheetW','sheetH','gap'])if(!Number.isFinite(p[k]))throw Error('Quota non valida: '+k);
  if(p.x<=0||p.h<=0||p.thickness<=0||p.x<=2*p.thickness||p.h<=2*p.thickness)throw Error('Dimensioni HalfBox non valide.');
  return buildHalfBox(p);
 }
 if(p.generator==='closedbox'){
  for(const k of ['x','y','h','thickness','kerf','finger','press','sheetW','sheetH','gap'])if(!Number.isFinite(p[k]))throw Error('Quota non valida: '+k);
  if(p.x<=0||p.y<=0||p.h<=0||p.thickness<=0||p.x<=2*p.thickness||p.y<=2*p.thickness||p.h<=2*p.thickness)throw Error('Dimensioni ClosedBox non valide.');
  return buildClosedBox(p);
 }
 if(p.generator==='abox'){
  for(const k of ['x','y','h','thickness','kerf','finger','press','sheetW','sheetH','gap'])if(!Number.isFinite(p[k]))throw Error('Quota non valida: '+k);
  if(p.x<=0||p.y<=0||p.h<=0||p.thickness<=0||p.x<=2*p.thickness||p.y<=2*p.thickness)throw Error('Dimensioni ABox non valide.');
  return buildABox(p);
 }
 if(p.generator==='openbox'){
  for(const k of ['x','y','h','thickness','kerf','finger','press','sheetW','sheetH','gap'])if(!Number.isFinite(p[k]))throw Error('Quota non valida: '+k);
  if(p.x<=0||p.y<=0||p.h<=0||p.thickness<=0||p.x<=2*p.thickness||p.y<=2*p.thickness)throw Error('Dimensioni OpenBox non valide.');
  return buildOpenBox(p);
 }
 p={moduleJoin:'wall',dovetailPolarity:'positive',dovetailCount:3,dovetailDepth:15,lipConfig:'{}',frontConfig:'{}',frontGap:2,drawerClearance:2,drawerHeight:80,handleSize:32,handleHeight:16,...p};
 for(const k of ['width','height','depth','thickness','kerf','modules','split','shelves','lip','angleL','angleR','parachuteDepth','hingeSize','hingeEdge','hingePitch','finger','press','dovetailCount','dovetailDepth','frontGap','drawerClearance','drawerHeight','handleSize','handleHeight','sheetW','sheetH','gap'])if(!Number.isFinite(p[k]))throw Error('Inserisci un numero valido: '+k);
 if(p.finger<8||p.finger>80||p.lip<0||p.hingeSize<=0||p.hingePitch<=0||p.hingeEdge<=0||p.parachuteDepth<=0)throw Error('Passo dente: 8–80 mm. Controlla le quote dei frontalini e dei fori.');
 if(!Number.isInteger(p.modules)||p.split<20||p.split>80)throw Error('Numero moduli o divisione non validi.');
 for(const k of ['width','height','depth','thickness','finger','sheetW','sheetH','gap'])if(!Number.isFinite(p[k])||p[k]<=0)throw Error('Quota non valida: '+k);
 if(p.kerf<0||p.kerf>1||p.press<0||p.press>0.5)throw Error('Kerf: 0–1 mm. Interferenza: 0–0,5 mm.');
 if(p.angleL<45||p.angleL>135||p.angleR<45||p.angleR>135)throw Error('Angoli ammessi: da 45° a 135°.');
 if(p.modules<1||p.modules>3||p.shelves<0||p.shelves>6||!Number.isInteger(p.shelves))throw Error('Controlla il numero di moduli e ripiani.');
 if(!Number.isInteger(p.dovetailCount)||p.dovetailCount<1||p.dovetailCount>8||p.dovetailDepth<4||p.dovetailDepth>50)throw Error('Coda di rondine: usa 1–8 code e profondità 4–50 mm.');
 if(p.frontGap<.5||p.frontGap>8||p.drawerClearance<.5||p.drawerClearance>10||p.drawerHeight<30||p.drawerHeight>250||p.handleSize<10||p.handleSize>120||p.handleHeight<6||p.handleHeight>80)throw Error('Controlla giochi frontali, maniglia e dimensioni del cassetto.');
 const t=p.thickness,H=p.height,D=p.depth,parts=[],joints=[],joined=p.moduleJoin==='dovetail'&&p.modules>1;
 let frontConfig={},lipConfig={};try{frontConfig=typeof p.frontConfig==='string'?JSON.parse(p.frontConfig):p.frontConfig||{}}catch{throw Error('Configurazione sportelli e cassetti non valida.')}
 try{lipConfig=typeof p.lipConfig==='string'?JSON.parse(p.lipConfig):p.lipConfig||{}}catch{throw Error('Configurazione frontalini non valida.')}
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
  const setup=bay=>baySetup(frontConfig[`m${mid}-b${bay}`]),closed=bay=>setup(bay).items.some(v=>v.type!=='open'),moduleHasClosures=Array.from({length:p.shelves+1},(_,i)=>closed(i+1)).some(Boolean);
  const lipAt=level=>p.lip>0&&(p.lipMode==='custom'?!!lipConfig[`m${mid}-p${level}`]:p.lipMode==='all'||p.lipMode==='bottom'&&level===0||p.lipMode==='each'&&level>0&&level<=p.shelves);
  const make=(name,key,outline,holes,o,u,v,n)=>{const part={id:'M'+mid+'-'+key,module:mid,key,name:'M'+mid+' '+name,outline,holes,thickness:t,o,u,v,n};parts.push(part);return part};
  const horizontal=(name,key,z,shelf,front)=>{
   const rightKind=rightOuter?null:seams.leftPiece,leftKind=leftOuter?null:seams.rightPiece;
   const specs=[{base:0,intervals:[]},rightOuter?{base:shelf?t:0,intervals:withD(right,shelf?0:t)}:{base:0,intervals:dovetailIntervals(D,p,rightKind)},{base:0,intervals:[]},leftOuter?{base:shelf?t:0,intervals:withD(lrev,shelf?0:t)}:{base:0,intervals:dovetailIntervals(D,p,leftKind)}];
   if(front)specs[0]={base:0,intervals:withD(front,t)};
   const mark=[leftKind,rightKind].filter(Boolean).map(k=>k==='male'?'+':'−').join('/');
   return make(name+(mark?' · RONDINE '+mark:''),key,profile(base,specs),[],[x,0,z],[1,0,0],[0,1,0],[0,0,1]);
  };
  const frontStations=stations(W,p.finger,Math.max(4*t,Math.abs(leftBack)*t/D+4*t,Math.abs(rightBack)*t/D+4*t),p.joint);
  const bottomLip=lipAt(0)&&!closed(1),topLip=lipAt(p.shelves+1)&&!closed(p.shelves+1);
  const planes=[],bottom=planes[0]=horizontal('BOTTOM','bottom',0,false,bottomLip?frontStations:null);
  planes[p.shelves+1]=horizontal('TOP','top',H-t,false,topLip?frontStations:null);
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
  function addFront(label,key,z,down=false){
   if(p.lip<3*t)throw Error('Frontalino troppo basso: usa almeno tre volte lo spessore.');
   // Clear the full thickness of both angled walls, not just their centre lines.
   const a=leftOuter?t*(lenL+Math.max(leftBack,0))/D:0,b=rightOuter?t*(lenR+Math.max(rightBack,0))/D:0,span=W-a-b;
   const outline=profile(rect(0,0,span,p.lip+t),[{base:t,intervals:withD(frontStations.map(([s,e])=>[s-a,e-a]),0)},null,null,null]);
   const front=make(label,key,outline,[],[x+a,0,z],[1,0,0],down?[0,0,-1]:[0,0,1],[0,1,0]);
   if(p.parachute!=='none'){
    const cw=p.parachuteDepth,ch=Math.min(10,p.lip/3),yc=t+p.lip/2;
    for(const f of p.parachute==='double'?[.28,.72]:[.5])front.holes.push(rect(span*f-cw/2,yc-ch/2,cw,ch));
   }return front;
  }
  if(bottomLip)addFront('FRONT BOTTOM','front-bottom',0);
  if(topLip)addFront('FRONT TOP','front-top',H,true);
  for(let j=1;j<=p.shelves;j++){
   const z=H*j/(p.shelves+1)-t/2,lip=lipAt(j)&&!closed(j+1);
   if(z<t*2||z+t>H-t*2||lip&&z+p.lip+t>=H-t)throw Error('Ripiani o frontalini troppo ravvicinati.');
   planes[j]=horizontal('SHELF '+j,'shelf-'+j,z,true,lip?frontStations:null);
   for(const [key,ss] of [['left',left],['right',right]].filter(([key])=>sides[key]))for(const [a,b] of ss){
    const fit=p.press/2;sides[key].holes.push(rect(a+fit,z+fit,b-a-p.press,t-p.press));
   }
   if(lip)addFront('FRONT '+j,'front-'+j,z);
  }
  const clearA=leftOuter?t*(lenL+Math.max(leftBack,0))/D:0,clearB=rightOuter?t*(lenR+Math.max(rightBack,0))/D:0;
  const shelfBottom=j=>H*j/(p.shelves+1)-t/2,shelfTop=j=>shelfBottom(j)+t;
  const handleHole=(kind,cx,cy)=>kind==='round'?circle(cx,cy,p.handleSize/2):kind==='ellipse'?ellipse(cx,cy,p.handleSize/2,p.handleHeight/2):kind==='rect'?rect(cx-p.handleSize/2,cy-p.handleHeight/2,p.handleSize,p.handleHeight):null;
  const handleHalfHeight=kind=>kind==='round'?p.handleSize/2:p.handleHeight/2;
  const checkHandle=(kind,w,h)=>{if(kind!=='none'&&(p.handleSize>w-4*p.frontGap||Math.max(p.handleSize,p.handleHeight)>h-4*p.frontGap))throw Error(`M${mid}: foro maniglia troppo grande.`)};
  const addDoor=(label,key,doorX,doorZ,doorW,doorH,hingeSide,handleType='none',mountOuter=true)=>{
   if(doorW<6*t||doorH<6*t)throw Error(`M${mid}: vano troppo piccolo per lo sportello.`);
   const holes=[],radius=p.hingeSize/2,edge=Math.min(p.hingeEdge,doorW/3),zInset=Math.min(Math.max(2*p.hingeSize,18),doorH/3);
   for(const z of [zInset,doorH-zInset])holes.push(circle(hingeSide==='left'?edge:doorW-edge,z,radius));
   checkHandle(handleType,doorW,doorH);const handleX=hingeSide==='left'?doorW-Math.max(p.handleSize*.75,18):Math.max(p.handleSize*.75,18),handle=handleHole(handleType,handleX,doorH/2);if(handle)holes.push(handle);
   const door=make(label,key,rect(0,0,doorW,doorH),holes,[doorX,-t-2,doorZ],[1,0,0],[0,0,1],[0,1,0]);
   const side=mountOuter?sides[hingeSide]:null;if(side)for(const z of [doorZ+zInset,doorZ+doorH-zInset])side.holes.push(circle(Math.min(p.hingeEdge,D/3),z,radius));
   return door;
  };
  const wd=(a,d)=>a.map(([s,e])=>[s,e,d]);
  const slotPolys=(start,u,ss)=>{const n=[-u[1],u[0]],fit=p.press/2,half=(t-p.press)/2;return ss.map(([a,b])=>{const q1=add(start,mul(u,a+fit)),q2=add(start,mul(u,b-fit));return [add(q1,mul(n,-half)),add(q2,mul(n,-half)),add(q2,mul(n,half)),add(q1,mul(n,half))]})};
  const dividerEnvelope=insetEdges(base,[2*t,t,2*t,t]);
  const addVerticalWall=(bay,fraction,key,label)=>{
   const [efl,efr,ebr,ebl]=dividerEnvelope,front=lerp(efl,efr,fraction),back=lerp(ebl,ebr,fraction),length=dist(front,back),u=mul(sub(back,front),1/length);
   const lowerZ=bay===1?0:shelfBottom(bay-1),upperZ=bay<=p.shelves?shelfBottom(bay):H-t,span=upperZ+t-lowerZ,ss=stations(length,p.finger,3*t,p.joint);
   const outline=profile(rect(0,0,length,span),[{base:t,intervals:wd(ss,0)},null,{base:t,intervals:wd(reverseIntervals(ss,length),0)},null]);
   const wall=make(label,key,outline,[],[x+front[0],front[1],lowerZ],[u[0],u[1],0],[0,0,1],[u[1],-u[0],0]);
   for(const plane of [planes[bay-1],planes[bay]])plane.holes.push(...slotPolys(front,u,ss));
   return wall;
  };
  for(let bay=1;bay<=p.shelves+1;bay++){
   const config=setup(bay),active=config.items.some(v=>v.type!=='open');if(!active&&!config.partitions)continue;
   const low=bay===1?t:shelfTop(bay-1),high=bay<=p.shelves?shelfBottom(bay):H-t,g=p.frontGap,doorX=x+clearA+g,doorZ=low+g,doorW=W-clearA-clearB-2*g,doorH=high-low-2*g;
   if(doorW<=0||doorH<=0)throw Error(`M${mid} vano ${bay}: gioco frontale eccessivo.`);
   const columnW=(doorW-g*(config.columns-1))/config.columns;if(columnW<6*t)throw Error(`M${mid} vano ${bay}: troppi elementi affiancati.`);
   if(config.partitions)for(let i=1;i<config.columns;i++)addVerticalWall(bay,i/config.columns,`wall-b${bay}-${i}`,`WALL VANO ${bay} · ${i}`);
   config.items.forEach((item,index)=>{
    if(item.type==='open')return;
    const itemX=doorX+index*(columnW+g),itemKey=`b${bay}-c${index+1}`;
    if(item.type==='door'){
     const outerHinge=item.hinge==='left'?index===0:index===config.columns-1;
     addDoor(`DOOR VANO ${bay}.${index+1} · ${item.hinge==='left'?'SX':'DX'}`,`door-${itemKey}`,itemX,doorZ,columnW,doorH,item.hinge,item.handle,outerHinge);
     for(let j=1;j<=item.dividers;j++)addVerticalWall(bay,(index+j/(item.dividers+1))/config.columns,`divider-${itemKey}-${j}`,`DIVIDER VANO ${bay}.${index+1} · ${j}`);
     return;
    }
    const sideInset=t+p.drawerClearance,rearInset=Math.max(10,2*t)+p.drawerClearance,wallH=Math.min(p.drawerHeight,doorH-t),boxZ=low+g;
    // Each drawer receives its proportional slice of the real tapered shelf.
    const envelope=insetEdges(base,[0,sideInset,rearInset,sideInset]),[afl,afr,abr,abl]=envelope,f0=index/config.columns,f1=(index+1)/config.columns;
    const padL=index?p.drawerClearance/2:0,padR=index<config.columns-1?p.drawerClearance/2:0,frontSpan=dist(afl,afr),backSpan=dist(abl,abr);
    const box=[lerp(afl,afr,f0+padL/frontSpan),lerp(afl,afr,f1-padR/frontSpan),lerp(abl,abr,f1-padR/backSpan),lerp(abl,abr,f0+padL/backSpan)],[fl,fr,br,bl]=box;
    const frontW=dist(fl,fr),rightD=dist(fr,br),backW=dist(bl,br),leftD=dist(fl,bl);
    if(Math.min(frontW,backW)<8*t||Math.min(leftD,rightD)<8*t||wallH<4*t||area(box)<=EPS)throw Error(`M${mid} vano ${bay}: spazio insufficiente per il cassetto sagomato.`);
    const alongRight=stations(rightD,p.finger,3*t,p.joint),alongBack=stations(backW,p.finger,3*t,p.joint),alongLeft=stations(leftD,p.finger,3*t,p.joint);
    const bottomOutline=profile(box,[{base:0,intervals:[]},{base:0,intervals:wd(alongRight,-t)},{base:0,intervals:wd(reverseIntervals(alongBack,backW),-t)},{base:0,intervals:wd(reverseIntervals(alongLeft,leftD),-t)}]);
    const leftOutline=profile(rect(0,0,leftD,wallH),[{base:t,intervals:wd(alongLeft,0)},null,null,null]);
    const rightOutline=profile(rect(0,0,rightD,wallH),[{base:t,intervals:wd(alongRight,0)},null,null,null]);
    const backOutline=profile(rect(0,0,backW,wallH),[{base:t,intervals:wd(alongBack,0)},null,null,null]);
    const leftU=mul(sub(bl,fl),1/leftD),rightU=mul(sub(br,fr),1/rightD),backU=mul(sub(br,bl),1/backW);
    const handleY=doorH-Math.max(handleHalfHeight(item.handle)+2*g,12);checkHandle(item.handle,columnW,doorH);const handle=handleHole(item.handle,columnW/2,handleY),frontHoles=handle?[handle]:[];
    make(`DRAWER VANO ${bay}.${index+1} · FRONT`,`drawer-${itemKey}-front`,rect(0,0,columnW,doorH),frontHoles,[itemX,-t-2,doorZ],[1,0,0],[0,0,1],[0,1,0]);
    const bottomPart=make(`DRAWER VANO ${bay}.${index+1} · BOTTOM SAGOMATO`,`drawer-${itemKey}-bottom`,bottomOutline,[],[x,0,boxZ],[1,0,0],[0,1,0],[0,0,1]);
    make(`DRAWER VANO ${bay}.${index+1} · SIDE L`,`drawer-${itemKey}-side-l`,leftOutline,[],[x+fl[0],fl[1],boxZ+t],[leftU[0],leftU[1],0],[0,0,1],[leftU[1],-leftU[0],0]);
    make(`DRAWER VANO ${bay}.${index+1} · SIDE R`,`drawer-${itemKey}-side-r`,rightOutline,[],[x+fr[0],fr[1],boxZ+t],[rightU[0],rightU[1],0],[0,0,1],[-rightU[1],rightU[0],0]);
    make(`DRAWER VANO ${bay}.${index+1} · BACK SAGOMATO`,`drawer-${itemKey}-back`,backOutline,[],[x+bl[0],bl[1],boxZ+t],[backU[0],backU[1],0],[0,0,1],[backU[1],-backU[0],0]);
    for(let j=1;j<=item.dividers;j++){
     const f=j/(item.dividers+1),lp=lerp(fl,bl,f),rp=lerp(fr,br,f),dividerW=dist(lp,rp),u=mul(sub(rp,lp),1/dividerW),ss=stations(dividerW,p.finger,3*t,p.joint);
     const outline=profile(rect(0,0,dividerW,wallH),[{base:t,intervals:wd(ss,0)},null,null,null]);
     make(`DRAWER VANO ${bay}.${index+1} · DIVIDER ${j}`,`drawer-${itemKey}-divider-${j}`,outline,[],[x+lp[0],lp[1],boxZ],[u[0],u[1],0],[0,0,1],[u[1],-u[0],0]);
     bottomPart.holes.push(...slotPolys(lp,u,ss));
    }
   });
  }
  // Explicit parametric drilling template for EXTERNAL hinges, never fake laser-cut mechanisms.
  if(p.hinge!=='none'&&!moduleHasClosures){
   const clearance=2,door=make('DOOR · fori cerniere','door',rect(0,0,W-2*clearance,H-2*clearance),[],[x+clearance,-t-2,clearance],[1,0,0],[0,0,1],[0,1,0]);
   const radius=p.hingeSize/2,edge=p.hingeEdge,pitch=p.hingePitch;
   for(const key of (p.hinge==='both'?['left','right']:[p.hinge]).filter(key=>sides[key]))for(const z of [H*.22,H*.78])for(const zz of [z-pitch/2,z+pitch/2]){
    sides[key].holes.push(circle(edge,zz,radius));door.holes.push(circle(key==='left'?edge:W-2*clearance-edge,zz-clearance,radius));
   }
  }
  originX+=W+(joined?0:Math.max(25,-L,-R)+25);
 });
 const finalParts=splitOversize(parts,p);finalParts.forEach(validatePart);
 return {parts:finalParts,joints,L,R,widths};
}
function world(part,q,z=0){return add(add(add(part.o,mul(part.u,q[0])),mul(part.v,q[1])),mul(part.n,z))}
function cutting(part,kerf){return {...part,outline:offset(part.outline,kerf/2),holes:part.holes.map(h=>offset(h,-kerf/2))}}
function placedPoint(part,q){const b=part.sourceBounds||bounds(part.outline),x=q[0]-b.minX,y=q[1]-b.minY;return part.rotated?[part.placeX+(b.maxY-b.minY)-y,part.placeY+x]:[part.placeX+x,part.placeY+y]}
function pack(parts,p){
 const items=parts.map(part=>{const b=bounds(part.outline);return {part,b,w:b.maxX-b.minX,h:b.maxY-b.minY}}).sort((a,b)=>Math.max(b.w,b.h)-Math.max(a.w,a.h)||b.w*b.h-a.w*a.h),sheets=[];
 const prune=free=>free.filter((a,i)=>a.w>EPS&&a.h>EPS&&!free.some((b,j)=>i!==j&&a.x>=b.x-EPS&&a.y>=b.y-EPS&&a.x+a.w<=b.x+b.w+EPS&&a.y+a.h<=b.y+b.h+EPS));
 const split=(free,u)=>prune(free.flatMap(r=>{if(u.x>=r.x+r.w||u.x+u.w<=r.x||u.y>=r.y+r.h||u.y+u.h<=r.y)return [r];const out=[];if(u.x>r.x)out.push({x:r.x,y:r.y,w:u.x-r.x,h:r.h});if(u.x+u.w<r.x+r.w)out.push({x:u.x+u.w,y:r.y,w:r.x+r.w-u.x-u.w,h:r.h});if(u.y>r.y)out.push({x:r.x,y:r.y,w:r.w,h:u.y-r.y});if(u.y+u.h<r.y+r.h)out.push({x:r.x,y:u.y+u.h,w:r.w,h:r.y+r.h-u.y-u.h});return out}));
 const fresh=()=>({free:[{x:0,y:0,w:p.sheetW,h:p.sheetH}],parts:[]});
 for(const item of items){let best=null;for(let si=0;si<sheets.length;si++)for(const r of sheets[si].free)for(const rotated of [false,true]){const w=rotated?item.h:item.w,h=rotated?item.w:item.h;if(w<=r.w+EPS&&h<=r.h+EPS){const score=[Math.min(r.w-w,r.h-h),r.w*r.h-w*h];if(!best||score[0]<best.score[0]||score[0]===best.score[0]&&score[1]<best.score[1])best={si,r,rotated,w,h,score}}}
  if(!best){sheets.push(fresh());const si=sheets.length-1,r=sheets[si].free[0];for(const rotated of [false,true]){const w=rotated?item.h:item.w,h=rotated?item.w:item.h;if(w<=r.w+EPS&&h<=r.h+EPS){best={si,r,rotated,w,h,score:[0,0]};break}}}
  if(!best)throw Error(item.part.name+': non entra nel foglio '+p.sheetW+' × '+p.sheetH+' mm, nemmeno ruotato.');
  const used={x:best.r.x,y:best.r.y,w:Math.min(best.r.w,best.w+p.gap),h:Math.min(best.r.h,best.h+p.gap)},placed={...item.part,sourceBounds:item.b,placeX:used.x,placeY:used.y,rotated:best.rotated,sheet:best.si};sheets[best.si].parts.push(placed);sheets[best.si].free=split(sheets[best.si].free,used);
 }
 const placed=sheets.flatMap(s=>s.parts),usedArea=items.reduce((sum,q)=>sum+q.w*q.h,0),efficiency=usedArea/(Math.max(1,sheets.length)*p.sheetW*p.sheetH);
 return {parts:placed,sheets:Math.max(1,sheets.length),efficiency};
}
const api={build,profile,stations,world,cutting,pack,placedPoint,bounds,area,intersections,contains,validatePart};
if(typeof module!=='undefined')module.exports=api;else root.Cabinet=api;
})(typeof window!=='undefined'?window:globalThis);
