'use strict';
const $=id=>document.getElementById(id), $$=q=>[...document.querySelectorAll(q)];
const fields='project width height depth thickness kerf modules split shelves lip lipMode lipConfig angleL angleR parachute parachuteDepth joint hinge hingeSize hingeEdge hingePitch finger press moduleJoin dovetailPolarity dovetailCount dovetailDepth frontConfig frontGap drawerClearance drawerHeight handleSize sheetW sheetH gap cutSpeed cutPower markSpeed markPower'.split(' ');
const words=new Set('project lipMode lipConfig parachute joint hinge moduleJoin dovetailPolarity frontConfig'.split(' '));
const view={angle:-.7,tilt:.6,zoom:1,pan:[0,0],mode:'model',selected:'M1-left',sheet:0,explode:0,wire:false,cutZoom:1,cutPan:[0,0]};
let current,packed,params,faces=[],revision=0;
let compartmentSignature='';
let lipSignature='';
const fmt=n=>Number(n.toFixed(3)),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const path=(p,x=0,y=0)=>p.map((q,i)=>(i?'L':'M')+fmt(q[0]+x)+' '+fmt(q[1]+y)).join(' ')+' Z';
const placedLoop=(part,loop)=>loop.map(q=>Cabinet.placedPoint(part,q));
const markLabel=p=>`${p.name} · MDF ${params.thickness} · K ${params.kerf} · CUT ${params.cutSpeed}/${params.cutPower}%`;
const markPosition=p=>{const b=Cabinet.bounds(placedLoop(p,p.outline)),x=(b.minX+b.maxX)/2,y=(b.minY+b.maxY)/2;return {x,y,vertical:b.maxY-b.minY>b.maxX-b.minX}};
const read=()=>Object.fromEntries(fields.map(k=>[k,words.has(k)?$(k).value:Number($(k).value)]));
function syncCompartments(p){
 const signature=`${p.modules}:${p.shelves}`;if(signature===compartmentSignature)return false;compartmentSignature=signature;
 let saved={};try{saved=JSON.parse(p.frontConfig||'{}')}catch{}
 const valid={},legacy=raw=>{if(typeof raw!=='string')return raw||{};if(raw==='door-left')return {columns:1,items:[{type:'door',hinge:'left'}]};if(raw==='door-right')return {columns:1,items:[{type:'door',hinge:'right'}]};if(raw==='door-double')return {columns:2,items:[{type:'door',hinge:'left'},{type:'door',hinge:'right'}]};if(raw==='drawer')return {columns:1,items:[{type:'drawer'}]};return {columns:1,items:[{type:'open'}]}};
 $('compartmentControls').innerHTML=Array.from({length:p.modules},(_,mi)=>{
  const rows=Array.from({length:p.shelves+1},(_,bi)=>{const key=`m${mi+1}-b${bi+1}`,raw=legacy(saved[key]),columns=Math.max(1,Math.min(4,Number(raw.columns)||1)),items=Array.from({length:columns},(_,i)=>({type:'open',hinge:'left',handle:'none',dividers:0,...raw.items?.[i]})),config={columns,partitions:!!raw.partitions,items};if(columns>1||items.some(v=>v.type!=='open')||config.partitions)valid[key]=config;
   const itemRows=items.map((item,i)=>`<div class="front-item"><span class="front-item-index">${i+1}</span><div class="front-item-fields"><label class="wide">Tipo<select data-front-field="type" data-key="${key}" data-index="${i}"><option value="open"${item.type==='open'?' selected':''}>Aperto</option><option value="door"${item.type==='door'?' selected':''}>Sportello</option><option value="drawer"${item.type==='drawer'?' selected':''}>Cassetto</option></select></label>${item.type==='door'?`<label>Apertura<select data-front-field="hinge" data-key="${key}" data-index="${i}"><option value="left"${item.hinge==='left'?' selected':''}>Sinistra</option><option value="right"${item.hinge==='right'?' selected':''}>Destra</option></select></label><label>Divisori verticali<input data-front-field="dividers" data-key="${key}" data-index="${i}" type="number" min="0" max="4" value="${Number(item.dividers)||0}"></label>`:''}${item.type==='drawer'?`<label>Foro apertura<select data-front-field="handle" data-key="${key}" data-index="${i}"><option value="none"${item.handle==='none'?' selected':''}>Nessuno</option><option value="round"${item.handle==='round'?' selected':''}>Tondo</option><option value="square"${item.handle==='square'?' selected':''}>Quadrato</option></select></label><label>Divisori orizzontali<input data-front-field="dividers" data-key="${key}" data-index="${i}" type="number" min="0" max="4" value="${Number(item.dividers)||0}"></label>`:''}</div></div>`).join('');
   return `<div class="bay-card"><div class="bay-head"><strong>VANO ${bi+1} · ${bi?'SOPRA RIPIANO '+bi:'SOPRA FONDO'}</strong><select class="bay-columns" data-bay-columns="${key}" aria-label="Elementi affiancati"><option value="1"${columns===1?' selected':''}>1 elem.</option><option value="2"${columns===2?' selected':''}>2 elem.</option><option value="3"${columns===3?' selected':''}>3 elem.</option><option value="4"${columns===4?' selected':''}>4 elem.</option></select></div><label class="bay-partition"><span>Pareti interne tra elementi</span><input data-bay-partitions="${key}" type="checkbox"${config.partitions?' checked':''}${columns<2?' disabled':''}></label>${itemRows}</div>`}).join('');
  return `<div class="compartment-module"><strong>MODULO ${mi+1}</strong>${rows}</div>`;
 }).join('');
 $('frontConfig').value=JSON.stringify(valid);
 const readConfig=()=>{try{return JSON.parse($('frontConfig').value||'{}')}catch{return {}}},ensure=(config,key)=>config[key]||{columns:1,partitions:false,items:[{type:'open',hinge:'left',handle:'none',dividers:0}]};
 $$('[data-bay-columns]').forEach(el=>el.onchange=()=>{const config=readConfig(),key=el.dataset.bayColumns,bay=ensure(config,key),columns=Number(el.value);bay.columns=columns;bay.items=Array.from({length:columns},(_,i)=>bay.items?.[i]||{type:'open',hinge:'left',handle:'none',dividers:0});if(columns<2)bay.partitions=false;config[key]=bay;$('frontConfig').value=JSON.stringify(config);compartmentSignature='';update()});
 $$('[data-bay-partitions]').forEach(el=>el.onchange=()=>{const config=readConfig(),key=el.dataset.bayPartitions,bay=ensure(config,key);bay.partitions=el.checked;config[key]=bay;$('frontConfig').value=JSON.stringify(config);update()});
 $$('[data-front-field]').forEach(el=>el.onchange=()=>{const config=readConfig(),key=el.dataset.key,bay=ensure(config,key),i=Number(el.dataset.index),item=bay.items[i]||{type:'open',hinge:'left',handle:'none',dividers:0};item[el.dataset.frontField]=el.type==='number'?Number(el.value):el.value;bay.items[i]=item;config[key]=bay;$('frontConfig').value=JSON.stringify(config);if(el.dataset.frontField==='type')compartmentSignature='';update()});
 return true;
}
function syncLips(p){
 const signature=`${p.modules}:${p.shelves}:${p.lipMode}:${p.frontConfig}`;if(signature===lipSignature)return false;lipSignature=signature;
 let saved={},fronts={};try{saved=JSON.parse(p.lipConfig||'{}')}catch{}try{fronts=JSON.parse(p.frontConfig||'{}')}catch{}
 const valid={},levels=Array.from({length:p.shelves+2},(_,level)=>({level,label:level===0?'Fondo':level===p.shelves+1?'Alto':`Ripiano ${level}`}));
 const preset=(level)=>p.lipMode==='all'||p.lipMode==='bottom'&&level===0||p.lipMode==='each'&&level>0&&level<=p.shelves;
 $('lipControls').innerHTML=Array.from({length:p.modules},(_,mi)=>{
  const rows=levels.map(({level,label})=>{const key=`m${mi+1}-p${level}`,bay=level===p.shelves+1?p.shelves+1:level+1,closed=!!fronts[`m${mi+1}-b${bay}`],checked=p.lipMode==='custom'?!!saved[key]:preset(level);if(checked)valid[key]=true;return `<label class="lip-switch${closed?' closed':''}" title="${closed?'Disattivato perché il vano ha una chiusura':''}"><span>${label}</span><input type="checkbox" data-lip="${key}"${checked?' checked':''}${closed?' disabled':''}></label>`}).join('');
  return `<div class="lip-module"><strong>MODULO ${mi+1}</strong>${rows}</div>`;
 }).join('');
 $('lipConfig').value=JSON.stringify(valid);
 $$('[data-lip]').forEach(el=>el.onchange=()=>{let config={};try{config=JSON.parse($('lipConfig').value||'{}')}catch{}if(el.checked)config[el.dataset.lip]=true;else delete config[el.dataset.lip];$('lipConfig').value=JSON.stringify(config);$('lipMode').value='custom';update()});
 return true;
}
function notice(s,error=false){$('validation').textContent=s;$('validation').classList.toggle('error',error)}
function select(id){view.selected=id;$('wallSelect').value=id;const p=current?.parts.find(p=>p.id===id);$('selectedWall').textContent=p?.name||'—';['angleL','angleR'].forEach((k,i)=>$(k).closest('label').classList.toggle('selected-field',p?.key===(i?'right':'left')));render3D();renderCut()}
function update(){
 revision++;params=read();if(syncCompartments(params))params=read();if(syncLips(params))params=read();let error='';
 ['width','height','depth','split'].forEach(k=>$(k+'Out').textContent=params[k]+(k==='split'?' %':' mm'));
 $('splitWrap').hidden=params.modules!==2;
 $('hingeFields').hidden=params.hinge==='none';
 $('parachuteDepth').disabled=params.parachute==='none';
 $('parachute').disabled=params.lipMode==='none'||params.lip===0;
 $('lip').disabled=params.lipMode==='none';
 const dovetailSelected=params.moduleJoin==='dovetail',dovetailEnabled=dovetailSelected&&params.modules>1;
 $('finger').disabled=params.joint==='tab';$('press').disabled=params.shelves===0&&!dovetailEnabled;
 $('dovetailOptions').classList.toggle('active',dovetailSelected);
 $$('#dovetailOptions input,#dovetailOptions select').forEach(el=>el.disabled=!dovetailEnabled);
 $('dovetailNote').textContent=dovetailEnabled?`Giunto complementare con compensazione ${(2*params.kerf+params.press).toFixed(2).replace('.',',')} mm. Le pareti interne vengono eliminate.`:'Servono almeno 2 moduli per attivare l’unione a coda di rondine.';
 try{
  current=Cabinet.build(params);
  try{const cut=current.parts.map(p=>Cabinet.cutting(p,params.kerf));cut.forEach(Cabinet.validatePart);packed=Cabinet.pack(cut,params)}catch(e){packed=null;error=e.message}
  $('wallSelect').innerHTML=current.parts.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  if(!current.parts.some(p=>p.id===view.selected))view.selected=current.parts[0].id;
  view.sheet=Math.min(view.sheet,(packed?.sheets||1)-1);
  $('sheetSelect').innerHTML=Array.from({length:packed?.sheets||0},(_,i)=>`<option value="${i}">Tavola ${i+1} / ${packed.sheets}</option>`).join('');$('sheetSelect').value=view.sheet;
  $('angleValue').textContent=fmt(current.L)+' / '+fmt(current.R)+' mm';
  $('slotValue').textContent=fmt(params.thickness-params.press)+' mm nominali';
  $('metricPieces').textContent=current.parts.length;$('metricModules').textContent=params.modules;
  $('metricModuleMode').textContent=dovetailEnabled?'uniti a rondine':'indipendenti';
  $('metricSize').textContent=[params.width,params.height,params.depth].join(' × ');
  const length=current.parts.reduce((sum,p)=>sum+[p.outline,...p.holes].reduce((s,loop)=>s+loop.reduce((v,q,i)=>v+Math.hypot(q[0]-loop[(i+1)%loop.length][0],q[1]-loop[(i+1)%loop.length][1]),0),0),0);
  $('metricCut').textContent=(length/1000).toFixed(2);
  let closureCount=0;try{closureCount=Object.keys(JSON.parse(params.frontConfig||'{}')).length}catch{}const autoJoins=current.parts.filter(p=>p.name.endsWith('AUTO A')).length;
  $('metricSheets').textContent=packed?.sheets||'—';$('metricSheetSize').textContent=`${params.sheetW} × ${params.sheetH} mm`;
  notice(error||`Revisione ${revision} · ${current.parts.length} pezzi · ${packed.sheets} tavole · nesting ${(packed.efficiency*100).toFixed(0)}% · ${autoJoins} giunti automatici · ${closureCount} vani attrezzati.`,!!error);
  select(view.selected);
 }catch(e){current=packed=null;faces=[];notice(e.message,true);['metricPieces','metricCut','metricSheets'].forEach(k=>$(k).textContent='—');render3D();renderCut()}
 ['downloadSvg','downloadDxf'].forEach(k=>$(k).disabled=!packed);
}
function renderCut(){
 const svg=$('cutPreview');if(!packed){svg.innerHTML='<text x="20" y="40" fill="#b42318">Correggi le quote indicate sopra.</text>';svg.setAttribute('viewBox','0 0 900 600');return}
 const w=params.sheetW/view.cutZoom,h=params.sheetH/view.cutZoom;
 svg.setAttribute('viewBox',`${view.cutPan[0]} ${view.cutPan[1]} ${w} ${h}`);
 svg.innerHTML=`<rect width="${params.sheetW}" height="${params.sheetH}" fill="white" stroke="#aab3bf" stroke-dasharray="4 4"/>`+packed.parts.filter(p=>p.sheet===view.sheet).map(p=>{const label=markPosition(p),turn=label.vertical?` transform="rotate(90 ${fmt(label.x)} ${fmt(label.y)})"`:'';return `<g data-part="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)}"><path d="${[p.outline,...p.holes].map(q=>path(placedLoop(p,q))).join(' ')}" fill="${p.id===view.selected?'#ffdf85':'#f8eed8'}" fill-rule="evenodd" stroke="${p.id===view.selected?'#bd6200':'#b52b36'}" stroke-width="1.2" vector-effect="non-scaling-stroke"/><text x="${fmt(label.x)}" y="${fmt(label.y)}" text-anchor="middle" font-size="7" fill="#1261a0" pointer-events="none"${turn}>${esc(markLabel(p))}</text></g>`}).join('');
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
function svgExport(){const parts=packed.parts.filter(p=>p.sheet===view.sheet),marks=parts.map(p=>{const q=markPosition(p),turn=q.vertical?` transform="rotate(90 ${fmt(q.x)} ${fmt(q.y)})"`:'';return `<text x="${fmt(q.x)}" y="${fmt(q.y)}" text-anchor="middle" font-size="7"${turn}>${esc(markLabel(p))}</text>`}).join('');return `<svg xmlns="http://www.w3.org/2000/svg" width="${params.sheetW}mm" height="${params.sheetH}mm" viewBox="0 0 ${params.sheetW} ${params.sheetH}"><title>${esc(params.project)} — tavola ${view.sheet+1}</title><g id="CUT" fill="none" stroke="red" stroke-width="0.1" data-speed="${params.cutSpeed}" data-power="${params.cutPower}">${parts.map(p=>`<path id="${p.id}" d="${[p.outline,...p.holes].map(q=>path(placedLoop(p,q))).join(' ')}"/>`).join('')}</g><g id="MARK" fill="#0057ff" stroke="none" data-operation="mark" data-speed="${params.markSpeed}" data-power="${params.markPower}">${marks}</g></svg>`}
function dxfExport(){let s='0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';for(const p of packed.parts.filter(p=>p.sheet===view.sheet)){for(const loop of [p.outline,...p.holes]){const placed=placedLoop(p,loop);s+='0\nLWPOLYLINE\n100\nAcDbEntity\n8\nCUT\n62\n1\n100\nAcDbPolyline\n90\n'+placed.length+'\n70\n1\n';for(const q of placed)s+='10\n'+fmt(q[0])+'\n20\n'+fmt(params.sheetH-q[1])+'\n'}const q=markPosition(p);s+='0\nTEXT\n8\nMARK\n62\n5\n10\n'+fmt(q.x)+'\n20\n'+fmt(params.sheetH-q.y)+'\n40\n7\n50\n'+(q.vertical?'90':'0')+'\n1\n'+markLabel(p).replace(/[^\x20-\x7E]/g,' ')+'\n'}return s+'0\nENDSEC\n0\nEOF\n'}
function download(data,type,ext){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=(params.project||'cabinet')+'-tavola-'+(view.sheet+1)+'.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
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
const presetBase={width:900,height:500,depth:150,modules:1,split:44,shelves:1,lip:55,lipMode:'each',lipConfig:'{}',angleL:45,angleR:90,moduleJoin:'wall',frontConfig:'{}',frontGap:2,drawerClearance:2,drawerHeight:80,handleSize:28};
const drawerPreset=JSON.stringify(Object.fromEntries(Array.from({length:6},(_,i)=>[`m1-b${i+1}`,{columns:1,partitions:false,items:[{type:'drawer',hinge:'left',handle:'round',dividers:0}]}])));
const examples={
 base:{...presetBase,project:'Mobiletto camper'},
 corner:{...presetBase,project:'Mobiletto angolare 45°',shelves:2,lipMode:'each'},
 drawers:{...presetBase,project:'Cassettiera 6 cassetti',width:250,height:600,depth:300,shelves:5,lip:0,lipMode:'none',angleL:90,angleR:90,frontConfig:drawerPreset,drawerHeight:55},
 kitchen:{...presetBase,project:'Pensile cucina',width:800,height:700,depth:320,shelves:0,lip:0,lipMode:'none',angleL:90,angleR:90,frontConfig:JSON.stringify({'m1-b1':{columns:2,partitions:true,items:[{type:'door',hinge:'left',handle:'none',dividers:0},{type:'door',hinge:'right',handle:'none',dividers:0}]}})}
};
$('examplePreset').onchange=()=>{const example=examples[$('examplePreset').value];if(!example)return;for(const [key,value] of Object.entries(example))if($(key))$(key).value=value;compartmentSignature=lipSignature='';$$('[data-for]').forEach(el=>el.value=$(el.dataset.for).value);view.selected='M1-left';update()};
try{if(location.hash){const saved=JSON.parse(decodeURIComponent(location.hash.slice(1)));fields.forEach(k=>{if(saved[k]!==undefined)$(k).value=saved[k]})}}catch(e){console.warn('Link progetto non valido')}
$$('[data-for]').forEach(el=>el.value=$(el.dataset.for).value);
new ResizeObserver(()=>render3D()).observe($('modelView'));update();
