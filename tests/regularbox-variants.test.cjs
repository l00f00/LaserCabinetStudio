const assert=require('node:assert/strict'),G=require('../dist/geometry.js');
const p={generator:'regularbox',radiusBottom:50,radiusTop:50,n:5,h:80,thickness:3,kerf:.05,finger:24,press:.05,sheetW:600,sheetH:400,gap:5,bottom:'none',top:'none',outside:false,alignmentPins:1};
assert.throws(()=>G.build({...p,top:'bayonet mount'}),/unsupported/i);
for(const bottom of ['none','closed','hole','angled hole','angled lid','angled lid2','round lid'])for(const top of ['none','hole','angled hole','angled lid','angled lid2','round lid','closed']){
 const m=G.build({...p,bottom,top});assert(m.parts.length>=5,`${bottom}/${top} walls`);for(const x of m.parts){G.validatePart(x);G.validatePart(G.cutting(x,p.kerf));}
}
const build=style=>G.build({...p,bottom:'none',top:style}),byKey=(m,key)=>m.parts.find(x=>x.key===key),isCircle=poly=>poly.length===32&&poly.every(q=>Math.abs(Math.hypot(...q)-Math.hypot(...poly[0]))<1e-6);
const polygon=r=>Array.from({length:p.n},(_,i)=>{const a=-Math.PI/2-Math.PI/p.n+i*2*Math.PI/p.n;return [r*Math.cos(a),r*Math.sin(a)];});
const distanceToLine=(a,b,q)=>Math.abs((b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0]))/Math.hypot(b[0]-a[0],b[1]-a[1]);
const assertOffset=(base,outer,d)=>{assert.equal(outer.length,base.length);for(let i=0;i<base.length;i++){const a=base[i],b=base[(i+1)%base.length];assert(Math.abs(distanceToLine(a,b,outer[i])-d)<1e-6,`edge ${i} offset ${d}mm`);assert(Math.abs(distanceToLine(a,b,outer[(i+1)%base.length])-d)<1e-6,`edge ${i} offset end ${d}mm`);}};
const assertCircleRadius=(poly,r)=>{assert(isCircle(poly));assert(Math.abs(Math.hypot(...poly[0])-r)<1e-6,`circle radius ${r}mm`);};
const closed=byKey(build('closed'),'top');assert.equal(closed.outline.length,45,'closed panel has two finger intervals on each of five polygon edges');
const angledHole=byKey(build('angled hole'),'top');assert.equal(angledHole.holes[0].length,5,'angled hole aperture follows pentagon');assert.equal(angledHole.outline.length,45);assertOffset(polygon(p.radiusTop),angledHole.holes[0],p.thickness);
const angledLid=build('angled lid'),angledLidPanels=angledLid.parts.filter(x=>x.key.startsWith('top-lid-'));assert.equal(angledLidPanels.length,2);assert(angledLidPanels.every(x=>x.outline.length===5&&!isCircle(x.outline)),'angled lid is exactly two plain polygon panels');assertOffset(angledLidPanels[0].outline,angledLidPanels[1].outline,p.thickness);
const angledLid2=build('angled lid2'),lid2panel=byKey(angledLid2,'top'),lid2=byKey(angledLid2,'top-lid');assert.equal(lid2panel.holes[0].length,5);assertOffset(polygon(p.radiusTop),lid2panel.holes[0],p.thickness);assert.equal(lid2.outline.length,5,'E-edge lid is a plain polygon outset, not a finger profile');assertOffset(polygon(p.radiusTop),lid2.outline,p.thickness);
const round=build('round lid'),topApo=p.radiusTop*Math.cos(Math.PI/p.n);assertCircleRadius(byKey(round,'top').holes[0],topApo-p.thickness);assertCircleRadius(byKey(round,'top-lid').outline,topApo);
const hole=byKey(build('hole'),'top');assertCircleRadius(hole.holes[0],topApo-p.thickness);
assert.equal(byKey(build('none'),'top'),undefined,'none omits panel');
const bottom=G.build({...p,bottom:'round lid',top:'none'}),bottomFloor=byKey(bottom,'bottom'),bottomDisc=byKey(bottom,'bottom-lid'),bottomApo=p.radiusBottom*Math.cos(Math.PI/p.n);assert(bottomFloor.outline.length>5,'bottom has fingered joint edge');assertCircleRadius(bottomFloor.holes[0],bottomApo-p.thickness);assertCircleRadius(bottomDisc.outline,bottomApo);
const closedBottom=byKey(G.build({...p,bottom:'closed',top:'none'}),'bottom');assert.equal(closedBottom.outline.length,45,'closed bottom has two finger intervals on each polygon edge');
const bottomAngledLid=G.build({...p,bottom:'angled lid',top:'none'}),bottomLids=bottomAngledLid.parts.filter(x=>x.key.startsWith('bottom-lid-'));assert.equal(byKey(bottomAngledLid,'bottom'),undefined,'angled bottom has no fingered ring');assert.equal(bottomLids.length,2);assert(bottomLids.every(x=>x.outline.length===5));assertOffset(bottomLids[0].outline,bottomLids[1].outline,p.thickness);
const bottomAngledLid2=G.build({...p,bottom:'angled lid2',top:'none'}),bottomPanel=byKey(bottomAngledLid2,'bottom'),bottomLid2=byKey(bottomAngledLid2,'bottom-lid');assert.equal(bottomPanel.holes[0].length,5);assertOffset(polygon(p.radiusBottom),bottomPanel.holes[0],p.thickness);assert.equal(bottomLid2.outline.length,5);assertOffset(polygon(p.radiusBottom),bottomLid2.outline,p.thickness);
// The planar part model cannot encode a tilted panel's out-of-plane angle; angled styles retain polygon geometry only.
assert.throws(()=>G.build({...p,top:'bayonet mount'}),/unsupported/i);
const outside=G.build({...p,outside:true,bottom:'hole',top:'hole'}),outsideApo=p.radiusBottom*Math.cos(Math.PI/p.n)-2*p.thickness;assertCircleRadius(byKey(outside,'bottom').holes[0],outsideApo);assertCircleRadius(byKey(outside,'top').holes[0],p.radiusTop*Math.cos(Math.PI/p.n)-2*p.thickness);assert.equal(byKey(outside,'top').o[2],p.h-2*p.thickness,'outside height subtracts both panel contributions');
const outsideRound=G.build({...p,outside:true,bottom:'none',top:'round lid'});assert.equal(byKey(outsideRound,'top').o[2],p.h-3*p.thickness,'outside round-lid height includes lid thickness');
console.log('RegularBox variant matrix passed');
