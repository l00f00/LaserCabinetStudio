'use strict';
const $=id=>document.getElementById(id), $$=q=>[...document.querySelectorAll(q)];
const fields='project width height depth thickness kerf modules split shelves lip lipMode angleL angleR parachute parachuteDepth joint hinge hingeSize hingeEdge hingePitch finger press sheetW sheetH gap'.split(' ');
const words=new Set('project lipMode parachute joint hinge'.split(' '));
const view={angle:-.7,tilt:.6,zoom:1,pan:[0,0],mode:'model',selected:'M1-left',sheet:0,explode:0,wire:false,cutZoom:1,cutPan:[0,0]};
let current,packed,params,faces=[],revision=0;
const fmt=n=>Number(n.toFixed(3)),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const path=(p,x=0,y=0)=>p.map((q,i)=>(i?'L':'M')+fmt(q[0]+x)+' '+fmt(q[1]+y)).join(' ')+' Z';
const read=()=>Object.fromEntries(fields.map(k=>[k,words.has(k)?$(k).value:Number($(k).value)]));
function notice(s,error=false){$('validation').textContent=s;$('validation').classList.toggle('error',error)}
function select(id){view.selected=id;$('wallSelect').value=id;const p=current?.parts.find(p=>p.id===id);$('selectedWall').textContent=p?.name||'—';['angleL','angleR'].forEach((k,i)=>$(k).closest('label').classList.toggle('selected-field',p?.key===(i?'right':'left')));render3D();renderCut()}
function update(){
 revision++;params=read();let error='';
 ['width','height','depth','split'].forEach(k=>$(k+'Out').textContent=params[k]+(k==='split'?' %':' mm'));
 $('splitWrap').hidden=params.modules!==2;
 $('hingeFields').hidden=params.hinge==='none';
 $('parachuteDepth').disabled=params.parachute==='none';
 $('parachute').disabled=params.lipMode==='none'||params.lip===0;
 $('lip').disabled=params.lipMode==='none';
 $('finger').disabled=params.joint==='tab';$('press').disabled=params.shelves===0;
 try{
  current=Cabinet.build(params);
  try{const cut=current.parts.map(p=>Cabinet.cutting(p,params.kerf));cut.forEach(Cabinet.validatePart);packed=Cabinet.pack(cut,params)}catch(e){packed=null;error=e.message}
  $('wallSelect').innerHTML=current.parts.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  if(!current.parts.some(p=>p.id===view.selected))view.selected=current.parts[0].id;
  view.sheet=Math.min(view.sheet,(packed?.sheets||1)-1);
  $('sheetSelect').innerHTML=Array.from({length:packed?.sheets||0},(_,i)=>`<option value="${i}">Foglio ${i+1} / ${packed.sheets}</option>`).join('');$('sheetSelect').value=view.sheet;
  $('angleValue').textContent=fmt(current.L)+' / '+fmt(current.R)+' mm';
  $('slotValue').textContent=fmt(params.thickness-params.press)+' mm nominali';
  $('metricPieces').textContent=current.parts.length;$('metricModules').textContent=params.modules;
  $('metricSize').textContent=[params.width,params.height,params.depth].join(' × ');
  const length=current.parts.reduce((sum,p)=>sum+[p.outline,...p.holes].reduce((s,loop)=>s+loop.reduce((v,q,i)=>v+Math.hypot(q[0]-loop[(i+1)%loop.length][0],q[1]-loop[(i+1)%loop.length][1]),0),0),0);
  $('metricCut').textContent=(length/1000).toFixed(2);
  notice(error||`Revisione ${revision} · ${current.parts.length} pezzi · ${packed.sheets} fogli · geometria comune 3D / taglio. Mobile aperto sul retro.`,!!error);
  select(view.selected);
 }catch(e){current=packed=null;faces=[];notice(e.message,true);['metricPieces','metricCut'].forEach(k=>$(k).textContent='—');render3D();renderCut()}
 ['downloadSvg','downloadDxf'].forEach(k=>$(k).disabled=!packed);
}
function renderCut(){
 const svg=$('cutPreview');if(!packed){svg.innerHTML='<text x="20" y="40" fill="#b42318">Correggi le quote indicate sopra.</text>';svg.setAttribute('viewBox','0 0 900 600');return}
 const w=params.sheetW/view.cutZoom,h=params.sheetH/view.cutZoom;
 svg.setAttribute('viewBox',`${view.cutPan[0]} ${view.cutPan[1]} ${w} ${h}`);
 svg.innerHTML=`<rect width="${params.sheetW}" height="${params.sheetH}" fill="white" stroke="#aab3bf" stroke-dasharray="4 4"/>`+packed.parts.filter(p=>p.sheet===view.sheet).map(p=>`<g data-part="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)}"><path d="${[p.outline,...p.holes].map(q=>path(q,p.px,p.py)).join(' ')}" fill="${p.id===view.selected?'#ffdf85':'#f8eed8'}" fill-rule="evenodd" stroke="${p.id===view.selected?'#bd6200':'#b52b36'}" stroke-width="1.2" vector-effect="non-scaling-stroke"/><text x="${p.px+Cabinet.bounds(p.outline).minX+4}" y="${p.py+Cabinet.bounds(p.outline).minY+12}" font-size="10" fill="#27445e" pointer-events="none">${esc(p.name)}</text></g>`).join('');
 svg.querySelectorAll('[data-part]').forEach(g=>{g.onclick=()=>select(g.dataset.part);g.onkeydown=e=>{if(e.key==='Enter')select(g.dataset.part)}});
}
function rotate(q){const [x,y,z]=q,c=Math.cos(view.angle),s=Math.sin(view.angle),r=x*s+y*c;return [x*c-y*s,r*Math.sin(view.tilt)-z*Math.cos(view.tilt),r*Math.cos(view.tilt)+z*Math.sin(view.tilt)]}
function projected(p,q,z){const v=Cabinet.world(p,q,z),e=view.explode*2;if(p.key==='top')v[2]+=e;if(p.key==='bottom')v[2]-=e;if(p.key==='left')v[0]-=e;if(p.key==='right')v[0]+=e;if(p.key.startsWith('front')||p.key==='door')v[1]-=e;return rotate(v)}
function render3D(){
 const canvas=$('model'),r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
 const dpr=window.devicePixelRatio||1;canvas.width=r.width*dpr;canvas.height=r.height*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.fillStyle='#eae7df';ctx.fillRect(0,0,r.width,r.height);faces=[];
 if(!current){ctx.fillStyle='#a42620';ctx.fillText('Quote non valide: controlla il messaggio sopra.',24,35);return}
 const all=current.parts.flatMap(p=>p.outline.flatMap(q=>[projected(p,q,0),projected(p,q,p.thickness)])),b=Cabinet.bounds(all);
 const scale=Math.min((r.width-90)/(b.maxX-b.minX),(r.height-90)/(b.maxY-b.minY))*view.zoom;
 const screen=q=>[(q[0]-(b.maxX+b.minX)/2)*scale+r.width/2+view.pan[0],(q[1]-(b.maxY+b.minY)/2)*scale+r.height/2+view.pan[1]];
 const queue=[];
 for(const p of current.parts){
  const loops=[p.outline,...p.holes];
  for(const z of [0,p.thickness])queue.push({p,loops:loops.map(loop=>loop.map(q=>projected(p,q,z))),side:false});
  for(const loop of loops)loop.forEach((q,i)=>{const next=loop[(i+1)%loop.length];queue.push({p,loops:[[projected(p,q,0),projected(p,next,0),projected(p,next,p.thickness),projected(p,q,p.thickness)]],side:true})});
 }
 queue.forEach(f=>f.depth=f.loops[0].reduce((s,q)=>s+q[2],0)/f.loops[0].length);queue.sort((a,b)=>a.depth-b.depth);
 for(const f of queue){const shape=new Path2D();for(const loop of f.loops){loop.forEach((q,i)=>{const [x,y]=screen(q);if(i)shape.lineTo(x,y);else shape.moveTo(x,y)});shape.closePath()}
  const active=f.p.id===view.selected;ctx.globalAlpha=view.wire?.18:1;ctx.fillStyle=active?(f.side?'#bc7c26':'#e6b661'):(f.side?'#94734e':'#c8ab7c');ctx.fill(shape,'evenodd');ctx.globalAlpha=1;ctx.strokeStyle=active?'#b65700':'#66543c';ctx.lineWidth=active?1.25:.65;ctx.stroke(shape);faces.push({shape,id:f.p.id});
 }
 ctx.fillStyle='#334155';ctx.font='12px system-ui';ctx.fillText('Pannelli reali · spessore '+params.thickness+' mm · revisione '+revision,18,24);
}
function svgExport(){return `<svg xmlns="http://www.w3.org/2000/svg" width="${params.sheetW}mm" height="${params.sheetH}mm" viewBox="0 0 ${params.sheetW} ${params.sheetH}"><title>${esc(params.project)} — foglio ${view.sheet+1}</title><g id="CUT" fill="none" stroke="red" stroke-width="0.1">${packed.parts.filter(p=>p.sheet===view.sheet).map(p=>`<path id="${p.id}" d="${[p.outline,...p.holes].map(q=>path(q,p.px,p.py)).join(' ')}"/>`).join('')}</g></svg>`}
function dxfExport(){let s='0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';for(const p of packed.parts.filter(p=>p.sheet===view.sheet))for(const loop of [p.outline,...p.holes]){s+='0\nLWPOLYLINE\n100\nAcDbEntity\n8\nCUT\n100\nAcDbPolyline\n90\n'+loop.length+'\n70\n1\n';for(const q of loop)s+='10\n'+fmt(q[0]+p.px)+'\n20\n'+fmt(params.sheetH-q[1]-p.py)+'\n'}return s+'0\nENDSEC\n0\nEOF\n'}
function download(data,type,ext){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=(params.project||'cabinet')+'-foglio-'+(view.sheet+1)+'.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function switchView(mode){view.mode=mode;$('modelView').classList.toggle('hidden',mode!=='model');$('cutView').classList.toggle('hidden',mode!=='cut');$('sheetSelect').hidden=mode!=='cut';$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===mode));render3D();renderCut()}
fields.forEach(k=>{const fn=()=>{const mirror=document.querySelector(`[data-for="${k}"]`);if(mirror)mirror.value=$(k).value;update()};$(k).addEventListener('input',fn);$(k).addEventListener('change',fn)});
$$('[data-for]').forEach(el=>el.oninput=()=>{$(el.dataset.for).value=el.value;update()});
$$('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
$('wallSelect').onchange=()=>select($('wallSelect').value);
$('sheetSelect').onchange=()=>{view.sheet=Number($('sheetSelect').value);view.cutZoom=1;view.cutPan=[0,0];renderCut()};
$('explode').oninput=()=>{view.explode=Number($('explode').value);render3D()};$('wire').onchange=()=>{view.wire=$('wire').checked;render3D()};
$('resetView').onclick=()=>{view.zoom=view.cutZoom=1;view.pan=view.cutPan=[0,0];render3D();renderCut()};
$('topView').onclick=()=>{view.angle=0;view.tilt=Math.PI/2;switchView('model')};$('isoView').onclick=()=>{view.angle=-.7;view.tilt=.6;switchView('model')};
$('downloadSvg').onclick=()=>packed&&download(svgExport(),'image/svg+xml','svg');$('downloadDxf').onclick=()=>packed&&download(dxfExport(),'application/dxf','dxf');
$('saveJson').onclick=()=>download(JSON.stringify(read(),null,2),'application/json','json');
$('share').onclick=async()=>{try{const u=new URL(location.href);u.hash=encodeURIComponent(JSON.stringify(read()));await navigator.clipboard.writeText(u.href);$('toast').textContent='Link copiato';$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2500)}catch(e){notice('Impossibile accedere agli appunti.',true)}};
let drag=null;
$('model').onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};$('model').setPointerCapture(e.pointerId)};
$('model').onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(e.shiftKey){view.pan[0]+=dx;view.pan[1]+=dy}else{view.angle+=dx*.008;view.tilt=Math.max(-1.4,Math.min(1.55,view.tilt+dy*.008))}drag.x=e.clientX;drag.y=e.clientY;render3D()};
$('model').onpointerup=e=>{if(drag&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<4){const c=$('model'),r=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1,ctx=c.getContext('2d');const hit=[...faces].reverse().find(f=>ctx.isPointInPath(f.shape,(e.clientX-r.left)*dpr,(e.clientY-r.top)*dpr,'evenodd'));if(hit)select(hit.id)}drag=null};$('model').onpointercancel=()=>drag=null;
$('model').addEventListener('wheel',e=>{e.preventDefault();view.zoom=Math.max(.2,Math.min(6,view.zoom*Math.exp(-e.deltaY*.001)));render3D()},{passive:false});
$('cutPreview').addEventListener('wheel',e=>{e.preventDefault();view.cutZoom=Math.max(.3,Math.min(12,view.cutZoom*Math.exp(-e.deltaY*.001)));renderCut()},{passive:false});
let cutDrag=null;$('cutPreview').onpointerdown=e=>{if(e.shiftKey){cutDrag=[e.clientX,e.clientY];$('cutPreview').setPointerCapture(e.pointerId)}};$('cutPreview').onpointermove=e=>{if(!cutDrag)return;const r=$('cutPreview').getBoundingClientRect(),factor=Math.max(params.sheetW/r.width,params.sheetH/r.height)/view.cutZoom;view.cutPan[0]-=(e.clientX-cutDrag[0])*factor;view.cutPan[1]-=(e.clientY-cutDrag[1])*factor;cutDrag=[e.clientX,e.clientY];renderCut()};$('cutPreview').onpointerup=$('cutPreview').onpointercancel=()=>cutDrag=null;
try{if(location.hash){const saved=JSON.parse(decodeURIComponent(location.hash.slice(1)));fields.forEach(k=>{if(saved[k]!==undefined)$(k).value=saved[k]})}}catch(e){console.warn('Link progetto non valido')}
$$('[data-for]').forEach(el=>el.value=$(el.dataset.for).value);
new ResizeObserver(()=>render3D()).observe($('modelView'));update();
