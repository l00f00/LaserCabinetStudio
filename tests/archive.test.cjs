const assert=require('node:assert/strict'),A=require('../dist/archive.js');
const files=[{name:'progetto.json',data:'{"ok":true}'},{name:'tavole/tavola-1.svg',data:'<svg></svg>'}],zip=A.createZip(files),text=new TextDecoder().decode(zip);
assert.equal(new DataView(zip.buffer).getUint32(0,true),0x04034b50,'L’archivio deve iniziare con una firma ZIP locale');
assert(text.includes('progetto.json')&&text.includes('tavole/tavola-1.svg'),'I nomi dei file devono essere presenti nella directory ZIP');
assert.equal(new DataView(zip.buffer).getUint32(zip.length-22,true),0x06054b50,'L’archivio deve terminare con la directory centrale');
assert.equal(A.crc32(new TextEncoder().encode('123456789')),0xcbf43926,'Il CRC32 deve corrispondere al vettore standard');
console.log('ZIP archive passed: UTF-8 names, file payloads, directory and CRC32.');
