'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PlanArchive=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const encoder=new TextEncoder(),table=new Uint32Array(256);
 for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0}
 const crc32=data=>{let c=0xffffffff;for(const byte of data)c=table[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0};
 const u16=(view,offset,value)=>view.setUint16(offset,value,true),u32=(view,offset,value)=>view.setUint32(offset,value>>>0,true);
 const bytes=value=>value instanceof Uint8Array?value:encoder.encode(String(value));
 const dosDateTime=date=>{const d=date instanceof Date?date:new Date(date||Date.now()),year=Math.max(1980,d.getFullYear());return {time:(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),date:((year-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()}};
 function createZip(files){
  const locals=[],centrals=[];let offset=0;
  for(const file of files){const name=bytes(file.name.replace(/\\/g,'/')),data=bytes(file.data),crc=crc32(data),stamp=dosDateTime(file.date),local=new Uint8Array(30+name.length+data.length),lv=new DataView(local.buffer);u32(lv,0,0x04034b50);u16(lv,4,20);u16(lv,6,0x0800);u16(lv,8,0);u16(lv,10,stamp.time);u16(lv,12,stamp.date);u32(lv,14,crc);u32(lv,18,data.length);u32(lv,22,data.length);u16(lv,26,name.length);u16(lv,28,0);local.set(name,30);local.set(data,30+name.length);locals.push(local);
   const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,0x0800);u16(cv,10,0);u16(cv,12,stamp.time);u16(cv,14,stamp.date);u32(cv,16,crc);u32(cv,20,data.length);u32(cv,24,data.length);u16(cv,28,name.length);u16(cv,30,0);u16(cv,32,0);u16(cv,34,0);u16(cv,36,0);u32(cv,38,0);u32(cv,42,offset);central.set(name,46);centrals.push(central);offset+=local.length;
  }
  const centralSize=centrals.reduce((sum,item)=>sum+item.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);u32(ev,0,0x06054b50);u16(ev,4,0);u16(ev,6,0);u16(ev,8,files.length);u16(ev,10,files.length);u32(ev,12,centralSize);u32(ev,16,offset);u16(ev,20,0);
  const output=new Uint8Array(offset+centralSize+end.length);let cursor=0;for(const item of [...locals,...centrals,end]){output.set(item,cursor);cursor+=item.length}return output;
 }
 return Object.freeze({createZip,crc32});
});
