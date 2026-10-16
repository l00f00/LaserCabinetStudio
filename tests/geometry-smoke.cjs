const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const values={width:'900',height:'500',depth:'150',thickness:'5',kerf:'0.05',modules:'2',split:'44',shelves:'1',lip:'55',lipMode:'each',cornerPair:'none',cornerAngle:'45',joint:'tab',finger:'24',press:'0.05',dogbone:false,moduleJoin:'wall',dovetailPolarity:'positive',dovetailCount:'3',dovetailDepth:'15',sheetW:'1200',sheetH:'900',gap:'8',project:'Test'};
const elements=Object.fromEntries(Object.entries(values).map(([id,value])=>[id,{id,value,checked:!!value,type:typeof value==='boolean'?'checkbox':'text'}]));
const document={querySelector(selector){if(selector.startsWith('#'))return elements[selector.slice(1)];throw new Error(`Unsupported selector ${selector}`)},querySelectorAll(){return[]}};
const context={document,console,Math,JSON,location:{hash:''},devicePixelRatio:1};
vm.createContext(context);
const source=fs.readFileSync('dist/app.js','utf8').split("\n$$('input,select')")[0];
vm.runInContext(`${source}\n;globalThis.api={geometry,svgString,dxf};`,context);

const base=context.api.geometry();
assert.equal(base.length,12,'La configurazione con pareti deve avere 12 pezzi');
assert.equal(base.filter(p=>p.name.includes('SIDE')).length,4,'Le pareti mediane devono essere presenti');

elements.moduleJoin.value='dovetail';
const joined=context.api.geometry();
assert.equal(joined.length,10,'La configurazione a rondine deve eliminare due pareti mediane');
assert.equal(joined.filter(p=>p.name.includes('SIDE')).length,2,'Devono restare solo i due fianchi esterni');
assert(joined.some(p=>p.name.includes('RONDINE +')),'Manca il profilo positivo');
assert(joined.some(p=>p.name.includes('RONDINE −')),'Manca il profilo negativo');
assert(joined.every(p=>(p.pts||[]).flat().every(Number.isFinite)),'La geometria contiene coordinate non valide');
assert(context.api.svgString().includes('<path'),'L’SVG non contiene i profili sagomati');
assert(context.api.dxf().includes('SECTION'),'Il DXF non è stato generato');

const positive=JSON.stringify(joined.find(p=>p.name.startsWith('M1 TOP')).pts);
elements.dovetailPolarity.value='negative';
const negative=JSON.stringify(context.api.geometry().find(p=>p.name.startsWith('M1 TOP')).pts);
assert.notEqual(positive,negative,'L’inversione positivo/negativo non cambia il profilo');
console.log('geometry smoke test: ok');
