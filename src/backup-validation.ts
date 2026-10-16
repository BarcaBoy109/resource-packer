import {catalog,profiles} from './domain';
import {LIMITS,validateFile} from './validation';

const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function record(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Backup project data must be an object.');return value as Record<string,unknown>;}
function boundedText(value:unknown,label:string,max:number){if(typeof value!=='string'||value.length>max)throw Error(`Backup ${label} is invalid.`);return value;}
function safeSlot(value:unknown){return typeof value==='string'&&value.length<=256&&!value.startsWith('/')&&!value.includes('\\')&&!/^[a-z]:/i.test(value)&&!value.split('/').some(part=>part==='..'||part==='');}

export async function validateImportedProject(value:unknown):Promise<void>{
 const p=record(value);
 if(p.schema!==1||!['java','bedrock'].includes(String(p.edition))||typeof p.gameVersion!=='string'||!profiles.some(x=>x.edition===p.edition&&x.version===p.gameVersion))throw Error('Backup edition or version profile is unsupported.');
 if(typeof p.id!=='string'||!uuidPattern.test(p.id)||typeof p.headerUuid!=='string'||!uuidPattern.test(p.headerUuid)||typeof p.moduleUuid!=='string'||!uuidPattern.test(p.moduleUuid)||p.headerUuid===p.moduleUuid)throw Error('Backup contains invalid pack UUIDs.');
 boundedText(p.name,'pack name',64);boundedText(p.description,'description',255);
 if(!Array.isArray(p.packVersion)||p.packVersion.length!==3||!p.packVersion.every(v=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=2147483647))throw Error('Backup pack version must contain three non-negative integers.');
 if(typeof p.updated!=='number'||!Number.isFinite(p.updated)||p.updated<0)throw Error('Backup update timestamp is invalid.');
 if(!Array.isArray(p.edits)||p.edits.length>250)throw Error('Backup replacement list is invalid.');
 const edition=p.edition as 'java'|'bedrock',available=catalog(edition),seen=new Set<string>();let total=0;
 for(const raw of p.edits){const e=record(raw);if(typeof e.target!=='string'||!e.target||e.target.length>256||!safeSlot(e.slot)||typeof e.valid!=='boolean')throw Error('Backup contains an invalid replacement mapping.');const key=`${e.target}\0${e.slot}`;if(seen.has(key))throw Error('Backup contains duplicate replacement mappings.');seen.add(key);
  const fileName=boundedText(e.fileName,'replacement filename',255),message=boundedText(e.message,'replacement status',500);if(typeof e.type!=='string'||e.type.length>100||!(e.bytes instanceof ArrayBuffer)||!e.bytes.byteLength||e.bytes.byteLength>LIMITS.fileBytes)throw Error('Backup replacement file is invalid or exceeds 16 MiB.');total+=e.bytes.byteLength;
  const asset=available.find(a=>a.id===e.target&&a.path===e.slot);
  if(!asset){if(e.valid||!message.startsWith('Unresolved:'))throw Error('Backup replacement does not map to this edition’s catalog.');}
  else if(e.valid){const checked=await validateFile(new File([e.bytes],fileName,{type:e.type}),asset);if(!checked.valid)throw Error(`${fileName}: ${checked.message}`);}
 }
 if(p.packIcon!==undefined){const icon=record(p.packIcon),fileName=boundedText(icon.fileName,'icon filename',255);if(!(icon.bytes instanceof ArrayBuffer)||!icon.bytes.byteLength||icon.bytes.byteLength>LIMITS.fileBytes)throw Error('Backup pack icon is invalid or exceeds 16 MiB.');const checked=await validateFile(new File([icon.bytes],fileName,{type:'image/png'}),{id:'pack-icon',name:'Pack icon',kind:'texture',path:'pack.png',category:'Pack settings'});if(!checked.valid||new DataView(icon.bytes).getUint32(16)!==new DataView(icon.bytes).getUint32(20))throw Error(checked.valid?'Backup pack icon must be square.':checked.message);total+=icon.bytes.byteLength;}
 if(total>LIMITS.totalBytes)throw Error('Backup replacement and icon data exceed 100 MiB.');
}
