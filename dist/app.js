const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const ids=['width','height','depth','thickness','kerf','modules','split','shelves','lip','lipMode','cornerPair','cornerAngle','joint','finger','press','dogbone','moduleJoin','dovetailPolarity','dovetailCount','dovetailDepth','sheetW','sheetH','gap','project'];
const state={angle:-.65,tilt:.48,zoom:1};
const num=id=>+$('#'+id).value;
const val=id=>$('#'+id).value;

function params(){return Object.fromEntries(ids.map(id=>{const el=$('#'+id);return[id,el.type==='checkbox'?el.checked:el.value]}))}
function load(){try{const h=location.hash.slice(1);if(!h)return;const p=JSON.parse(decodeURIComponent(atob(h)));ids.forEach(id=>{const el=$('#'+id);if(p[id]!=null)el.type==='checkbox'?el.checked=!!p[id]:el.value=p[id]})}catch(e){}}
function moduleWidths(){const n=num('modules'),w=num('width');if(n===1)return[w];if(n===2){const a=Math.round(w*num('split')/100);return[a,w-a]}return[Math.round(w/3),Math.round(w/3),w-2*Math.round(w/3)]}
function fitSlot(){return Math.max(.1,num('thickness')-2*num('kerf')-num('press'))}
function dovetailEnabled(){return num('modules')>1&&val('moduleJoin')==='dovetail'}
function frontTabs(span){return[[30,60],[span/2-15,span/2+15],[span-60,span-30]].filter(x=>x[0]>5&&x[1]<span-5)}
function edgeTabs(d){const f=Math.max(8,num('finger')),n=Math.max(2,Math.floor((d-20)/f)),gap=(d-20)/n;return Array.from({length:Math.ceil(n/2)},(_,i)=>[10+i*gap*2,Math.min(d-10,10+i*gap*2+gap)])}

function dovetailProfile(length,kind){
 const n=Math.max(1,Math.min(8,Math.round(num('dovetailCount')))),margin=Math.min(18,Math.max(8,length*.1)),usable=Math.max(20,length-2*margin),pitch=usable/n;
 const nominalHead=Math.min(Math.max(9,num('finger')),pitch*.62),fit=Math.max(0,2*num('kerf')+num('press')),positive=kind==='male';
 const head=Math.max(5,nominalHead+(positive?fit:-fit)),neck=Math.max(3,head*.48),depth=Math.max(2,num('dovetailDepth')+(positive?fit/2:-fit/2));
 return Array.from({length:n},(_,i)=>({c:margin+pitch*(i+.5),head,neck,depth}));
}

function verticalEdge(x,length,kind,side,tabs=[]){
 const p=[[x,0]];
 if(kind==='straight'){p.push([x,length]);return p}
 if(kind==='tabs'){
  const out=side==='right'?num('thickness'):-num('thickness');
  tabs.forEach(([a,b])=>p.push([x,a],[x+out,a],[x+out,b],[x,b]));p.push([x,length]);return p;
 }
 const outward=kind==='male',dir=side==='right'?(outward?1:-1):(outward?-1:1);
 dovetailProfile(length,kind).forEach(({c,head,neck,depth})=>p.push([x,c-neck/2],[x+dir*depth,c-head/2],[x+dir*depth,c+head/2],[x,c+neck/2]));
 p.push([x,length]);return p;
}

function panelPoly(leftX,rightX,d,leftKind='straight',rightKind='straight',tabs=[]){
 const right=verticalEdge(rightX,d,rightKind,'right',tabs),left=[...verticalEdge(leftX,d,leftKind,'left',tabs)].reverse();
 return[[leftX,0],...right,...left.slice(0,-1)];
}
function polyShelf(w,d,t,tabs){return panelPoly(t,w-t,d,'tabs','tabs',tabs)}
function polySide(d,h,t,tabs){const p=[[0,t]];tabs.forEach(([a,b])=>p.push([a,t],[a,0],[b,0],[b,t]));p.push([d,t],[d,h-t]);[...tabs].reverse().forEach(([a,b])=>p.push([b,h-t],[b,h],[a,h],[a,h-t]));return p}
function polyFront(w,h,t,tabs){const p=[[0,0],[w,0],[w,h]];[...tabs].reverse().forEach(([a,b])=>p.push([b,h],[b,h+t],[a,h+t],[a,h]));return p.concat([[0,h]])}
function makePoly(name,pts,holes=[]){
 const minX=Math.min(...pts.map(p=>p[0]),0),minY=Math.min(...pts.map(p=>p[1]),0),dx=-minX,dy=-minY;
 return{name,kind:'poly',pts:pts.map(([x,y])=>[x+dx,y+dy]),holes:holes.map(([x,y,w,h])=>[x+dx,y+dy,w,h])};
}
function seamKinds(){return val('dovetailPolarity')==='positive'?{leftPiece:'male',rightPiece:'female'}:{leftPiece:'female',rightPiece:'male'}}
function addSideSlots(holes,x,et,slot){et.forEach(([a,b])=>holes.push([x+(num('thickness')-slot)/2,a+num('kerf')+num('press')/2,slot,b-a-2*num('kerf')-num('press')]))}

function geometry(){
 const d=num('depth'),h=num('height'),t=num('thickness'),s=num('shelves'),lip=num('lip'),slot=fitSlot(),et=edgeTabs(d),widths=moduleWidths(),joined=dovetailEnabled(),seams=seamKinds();let parts=[];
 widths.forEach((mw,mi)=>{
  const first=mi===0,last=mi===widths.length-1,leftOuter=!joined||first,rightOuter=!joined||last;
  const leftKind=leftOuter?'straight':seams.rightPiece,rightKind=rightOuter?'straight':seams.leftPiece;
  for(const name of ['TOP','BOTTOM']){
   const holes=[];if(leftOuter)addSideSlots(holes,10,et,slot);if(rightOuter)addSideSlots(holes,mw-15,et,slot);
   if(joined)parts.push(makePoly(`M${mi+1} ${name} ${rightKind==='male'||leftKind==='male'?'RONDINE +':'RONDINE −'}`,panelPoly(0,mw,d,leftKind,rightKind),holes));
   else parts.push({name:`M${mi+1} ${name}`,kind:'rect',w:mw,h:d,holes});
  }
  const sideNames=joined?(first&&last?['LEFT','RIGHT']:first?['LEFT']:last?['RIGHT']:[]):['LEFT','RIGHT'];
  sideNames.forEach(side=>{const holes=[];for(let j=1;j<=s;j++){const y=h*j/(s+1)-slot/2;et.forEach(([a,b])=>holes.push([a+num('kerf')+num('press')/2,y,b-a-2*num('kerf')-num('press'),slot]))}parts.push(makePoly(`M${mi+1} SIDE ${side}`,polySide(d,h,t,et),holes))});
  if(joined){
   const leftInset=first?15:0,rightInset=last?15:0,bodyW=mw-leftInset-rightInset,leftBase=first?t:0,rightBase=leftBase+bodyW;
   const shelfLeft=first?'tabs':seams.rightPiece,shelfRight=last?'tabs':seams.leftPiece;
   for(let j=1;j<=s;j++){
    const holes=[];if(lip>0&&val('lipMode')==='each')frontTabs(bodyW).forEach(([a,b])=>holes.push([leftBase+a+num('kerf'),15-slot/2,b-a-2*num('kerf')-num('press'),slot]));
    parts.push(makePoly(`M${mi+1} SHELF ${j} ${shelfRight==='male'||shelfLeft==='male'?'RONDINE +':'RONDINE −'}`,panelPoly(leftBase,rightBase,d,shelfLeft,shelfRight,et),holes));
    if(lip>0&&val('lipMode')==='each')parts.push(makePoly(`M${mi+1} FRONT ${j}`,polyFront(bodyW,lip,t,frontTabs(bodyW))));
   }
  }else{
   const span=mw-30,sw=span+2*t;
   for(let j=1;j<=s;j++){const holes=[];if(lip>0&&val('lipMode')==='each')frontTabs(span).forEach(([a,b])=>holes.push([t+a+num('kerf'),15-slot/2,b-a-2*num('kerf')-num('press'),slot]));parts.push(makePoly(`M${mi+1} SHELF ${j}`,polyShelf(sw,d,t,et),holes));if(lip>0&&val('lipMode')==='each')parts.push(makePoly(`M${mi+1} FRONT ${j}`,polyFront(span,lip,t,frontTabs(span))))}
  }
 });return parts;
}

function dims(p){if(p.kind==='rect')return[p.w,p.h];return[Math.max(...p.pts.map(x=>x[0])),Math.max(...p.pts.map(x=>x[1]))]}
function layout(parts){const sw=num('sheetW'),gap=num('gap');let x=gap,y=gap,row=0;return parts.map(p=>{const[w,h]=dims(p);if(x+w+gap>sw){x=gap;y+=row+gap;row=0}const q={...p,x,y};x+=w+gap;row=Math.max(row,h);return q})}
function pathD(pts,x=0,y=0){return'M'+pts.map(p=>`${(p[0]+x).toFixed(2)} ${(p[1]+y).toFixed(2)}`).join('L')+'Z'}
function svgString(){const parts=layout(geometry()),sw=num('sheetW'),sh=Math.max(num('sheetH'),...parts.map(p=>p.y+dims(p)[1]+num('gap')));let a=[`<svg xmlns="http://www.w3.org/2000/svg" width="${sw}mm" height="${sh}mm" viewBox="0 0 ${sw} ${sh}">`,`<g fill="none" stroke="#ff0000" stroke-width="0.1">`];parts.forEach(p=>{if(p.kind==='rect')a.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}"/>`);else a.push(`<path d="${pathD(p.pts,p.x,p.y)}"/>`);p.holes.forEach(h=>a.push(`<rect x="${(p.x+h[0]).toFixed(2)}" y="${(p.y+h[1]).toFixed(2)}" width="${h[2].toFixed(2)}" height="${h[3].toFixed(2)}"/>`))});a.push('</g><g fill="#1677ff" font-family="sans-serif" font-size="7">');parts.forEach(p=>a.push(`<text x="${p.x+4}" y="${p.y+11}">${p.name}</text>`));a.push('</g></svg>');return a.join('')}
function renderCut(){$('#cutPreview').innerHTML=svgString().replace(/^<svg[^>]*>|<\/svg>$/g,'');$('#cutPreview').setAttribute('viewBox',`0 0 ${num('sheetW')} ${num('sheetH')}`)}
function project3(x,y,z,cx,cy){const a=state.angle,t=state.tilt,s=.55*state.zoom,X=x*Math.cos(a)-y*Math.sin(a),Y=(x*Math.sin(a)+y*Math.cos(a))*Math.sin(t)-z*Math.cos(t);return[cx+X*s,cy+Y*s]}
function drawBox(ctx,x,y,z,w,d,h,cx,cy,color){const v=[[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z],[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]].map(p=>project3(...p,cx,cy)),faces=[[0,1,5,4],[1,2,6,5],[4,5,6,7]];faces.forEach((f,i)=>{ctx.beginPath();f.forEach((k,j)=>j?ctx.lineTo(...v[k]):ctx.moveTo(...v[k]));ctx.closePath();ctx.fillStyle=color+['55','3d','70'][i];ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1;ctx.stroke()})}
function render3D(){
 const c=$('#model'),r=c.getBoundingClientRect(),dpr=devicePixelRatio||1;c.width=r.width*dpr;c.height=r.height*dpr;const ctx=c.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,r.width,r.height);
 const t=num('thickness'),h=num('height'),dep=num('depth'),cx=r.width/2,cy=r.height*.6,widths=moduleWidths(),joined=dovetailEnabled();let off=-num('width')/2;
 widths.forEach((mw,mi)=>{const first=mi===0,last=mi===widths.length-1,col=mi%2?'#5fc0ff':'#ffb000';drawBox(ctx,off,0,0,mw,dep,t,cx,cy,col);drawBox(ctx,off,0,h-t,mw,dep,t,cx,cy,col);if(!joined||first)drawBox(ctx,off+10,0,t,t,dep,h-2*t,cx,cy,col);if(!joined||last)drawBox(ctx,off+mw-15,0,t,t,dep,h-2*t,cx,cy,col);for(let j=1;j<=num('shelves');j++){const z=h*j/(num('shelves')+1),sx=joined?off+(first?15:0):off+15,sw=joined?mw-(first?15:0)-(last?15:0):mw-30;drawBox(ctx,sx,0,z-t/2,sw,dep,t,cx,cy,col);if(num('lip')>0&&val('lipMode')==='each')drawBox(ctx,sx,12.5,z+t/2,sw,t,num('lip'),cx,cy,'#ff6b4a')}off+=mw+(joined?0:18)})
}
function download(name,type,data){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function dxf(){const parts=layout(geometry());let s='0\nSECTION\n2\nENTITIES\n';const line=(a,b)=>`0\nLINE\n8\nCUT\n10\n${a[0]}\n20\n${-a[1]}\n11\n${b[0]}\n21\n${-b[1]}\n`;parts.forEach(p=>{let pts=p.kind==='rect'?[[0,0],[p.w,0],[p.w,p.h],[0,p.h]]:p.pts;pts=pts.map(q=>[q[0]+p.x,q[1]+p.y]);pts.forEach((q,i)=>s+=line(q,pts[(i+1)%pts.length]));p.holes.forEach(h=>{const q=[[h[0],h[1]],[h[0]+h[2],h[1]],[h[0]+h[2],h[1]+h[3]],[h[0],h[1]+h[3]]].map(v=>[v[0]+p.x,v[1]+p.y]);q.forEach((v,i)=>s+=line(v,q[(i+1)%4]))})});return s+'0\nENDSEC\n0\nEOF\n'}
function perimeter(pts){return pts.reduce((sum,p,i)=>{const q=pts[(i+1)%pts.length];return sum+Math.hypot(q[0]-p[0],q[1]-p[1])},0)}
function updateJoinControls(){const selected=val('moduleJoin')==='dovetail',enabled=selected&&num('modules')>1;$('#dovetailOptions').classList.toggle('active',selected);$$('#dovetailOptions input,#dovetailOptions select').forEach(el=>el.disabled=!enabled);$('#dovetailNote').textContent=enabled?`Giunto complementare con compensazione ${(2*num('kerf')+num('press')).toFixed(2).replace('.',',')} mm. Le pareti interne vengono eliminate.`:'Servono almeno 2 moduli per attivare l’unione a coda di rondine.'}
function update(){updateJoinControls();const p=geometry(),cut=p.reduce((sum,x)=>{const outline=x.kind==='rect'?2*(x.w+x.h):perimeter(x.pts);return sum+outline+x.holes.reduce((a,q)=>a+2*(q[2]+q[3]),0)},0);$('#widthOut').textContent=num('width')+' mm';$('#heightOut').textContent=num('height')+' mm';$('#depthOut').textContent=num('depth')+' mm';$('#splitOut').textContent=num('split')+' / '+(100-num('split'))+' %';$('#slotValue').textContent=fitSlot().toFixed(2).replace('.',',')+' mm';$('#metricSize').textContent=`${num('width')} × ${num('height')} × ${num('depth')}`;$('#metricPieces').textContent=p.length;$('#metricModules').textContent=num('modules');$('#metricCut').textContent=(cut/1000).toFixed(1);$('#splitWrap').style.display=num('modules')===2?'block':'none';render3D();renderCut()}

$$('input,select').forEach(el=>el.addEventListener('input',()=>{if(el.dataset.for){$('#'+el.dataset.for).value=el.value}else{const mirror=$(`[data-for="${el.id}"]`);if(mirror)mirror.value=el.value}update()}));
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#modelView').classList.toggle('hidden',b.dataset.view!=='model');$('#cutView').classList.toggle('hidden',b.dataset.view!=='cut');update()});
$('#downloadSvg').onclick=()=>download(((val('project')||'progetto').replace(/\W+/g,'_'))+'.svg','image/svg+xml',svgString());
$('#downloadDxf').onclick=()=>download(((val('project')||'progetto').replace(/\W+/g,'_'))+'.dxf','application/dxf',dxf());
$('#saveJson').onclick=()=>download('laser-cabinet.json','application/json',JSON.stringify(params(),null,2));
$('#share').onclick=async()=>{const u=location.href.split('#')[0]+'#'+btoa(encodeURIComponent(JSON.stringify(params())));await navigator.clipboard.writeText(u);toast('Link parametrico copiato')};
$('#resetView').onclick=()=>{state.angle=-.65;state.tilt=.48;state.zoom=1;render3D()};
const c=$('#model');let drag=false,lx=0,ly=0;c.onpointerdown=e=>{drag=true;lx=e.clientX;ly=e.clientY;c.setPointerCapture(e.pointerId)};c.onpointermove=e=>{if(!drag)return;state.angle+=(e.clientX-lx)*.008;state.tilt=Math.max(.15,Math.min(1.2,state.tilt+(e.clientY-ly)*.006));lx=e.clientX;ly=e.clientY;render3D()};c.onpointerup=()=>drag=false;c.onwheel=e=>{e.preventDefault();state.zoom=Math.max(.35,Math.min(2,state.zoom*(e.deltaY>0?.9:1.1)));render3D()};
function toast(s){const t=$('#toast');t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
addEventListener('resize',render3D);load();update();
